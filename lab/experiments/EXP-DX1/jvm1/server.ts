import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { withStack } from "../w1/bench.ts";
import { fieldPlan, validateArm } from "../w1/field/bench-check.ts";
import { quantile } from "../w1/field/schedule.ts";
import { fieldPhase, scopeKey } from "../w1/field/traffic.ts";
import { accounts, pooledDigest, tenantRows } from "../w1/group/population.ts";
import { seedPooled } from "../w1/group/workload.ts";
import { verifyPopulation } from "../w1/group/seed-readback.ts";
import { fileHash } from "../scale1/measurements.ts";
import { jvmPolicy, serverArms } from "./policy.mjs";
import { part2Arms, part2Policy, roles } from "./launch.mjs";

const part1Source = "46880aa47d7c580c400b457df0c8baf9e971e78a";

const [, , command, output, seedBase] = process.argv;
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file: string, value: unknown) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const call = (program: string, args: string[]) =>
  execFileSync(program, args, { encoding: "utf8", timeout: 15_000 }).trim();

async function pinnedReads(client: DatomicClient, db: string, cut: number, label: string) {
  // [DX-JVM1] Why: price the reader with verified untouched facts at the same historic cut in every window.
  // Rejected: a second write workload or a latest-head read whose rows change with the winning arm.
  const start = performance.now(), account = accounts[9]!;
  const samples: { entity: string; ms: number; rows: number }[] = [];
  for (let i = 0; i < 60; i++) {
    await wait(Math.max(0, start + i * 1000 - performance.now()));
    const local = 9000 + i;
    const root = ids.placement(account.first + local);
    const expected = tenantRows(account, local).filter((fact) => fact.e === root)
      .map((fact) => [fact.a, fact.v.value]).sort();
    const due = performance.now();
    const observed = await client.rows(db, {
      entityIds: [root], basis: { recordedPosition: cut, validAt: SEED_VALID_FROM }, pattern: {},
    });
    const ms = performance.now() - due;
    assert(observed.every((row) => row.entity_id === root && Number(row.recorded_position) <= cut));
    assert.deepEqual(observed.map((row) => [row.attribute, row.value_string]).sort(), expected);
    samples.push({ entity: root, ms, rows: observed.length });
  }
  return { label, cut, samples, p99Ms: quantile(samples.map((sample) => sample.ms), 0.99) };
}

async function worker() {
  assert(output);
  const request = read(path.join(output, "request.json"));
  const { seed, arm } = request;
  assert.equal(process.env.TRIPLEX_TRACE_SOURCE, arm.source);
  assert.equal(process.env.TRIPLEX_TRACE_SLOT, arm.slot);
  assert.equal(seed.scope, scopeKey(seed.nonce + "-load"));
  const client = new DatomicClient(process.env.DATOMIC_URL!, 35_000);
  const reader = request.part2 ? new DatomicClient(process.env.DATOMIC_READ_URLS!, 2_500) : undefined;
  try {
    const open = await client.create(seed.scope, "lean", true, 35_000);
    assert.equal(open.created, false);
    assert.equal(open.db, seed.db);
    assert(open.strictRecordClocks);
    const at = await client.begin(seed.db);
    assert.equal(at.position, seed.seedCut);
    await client.release(seed.db, at.handle);
    const phases = [];
    const senders = new Map<string, number>();
    let head = seed.seedCut;
    for (const window of fieldPlan()) {
      const [phase, reads] = await Promise.all([
        fieldPhase(client, seed.db, head, seed.nonce, window.label, window.schedule, true, senders, false),
        reader && pinnedReads(reader, seed.db, seed.seedCut, window.label),
      ]);
      write(path.join(output, window.label + ".json"), phase);
      if (reads) write(path.join(output, window.label + "-reads.json"), reads);
      assert.deepEqual(phase.failures, []);
      head += phase.offered;
      phases.push(phase);
    }
    const raw = { nonce: seed.nonce, scope: seed.scope, db: seed.db, seeds: seed.seeds, phases };
    const summary = validateArm(raw, "individual", "rates", seed.nonce);
    write(path.join(output, "field-summary.json"), { arm, summary });
  } finally {
    reader?.close();
    client.close();
  }
}

function requirePhysical() {
  assert.equal(process.platform, "linux");
  assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
  const virt = spawnSync("systemd-detect-virt", [], { encoding: "utf8", timeout: 5_000 });
  assert(virt.status === 1 && virt.stdout.trim() === "none", "A physical host is required");
  const cpuIds = new Set<string>();
  for (let id = 0; id < 12; id++) {
    const topology = "/sys/devices/system/cpu/cpu" + id + "/topology";
    const identity = ["physical_package_id", "core_id"].map((name) =>
      fs.readFileSync(path.join(topology, name), "utf8").trim()).join("/");
    assert(!cpuIds.has(identity), "Select twelve distinct physical cores");
    cpuIds.add(identity);
  }
}

const makeArm = (source: string) => ({
  source, slot: "tx2-dxt1-jvm1-" + randomUUID(), nonce: randomUUID(),
  population: "deep" as const, lookup: "individual" as const, readers: false,
});

async function prepare(base: string, source: string) {
  fs.mkdirSync(base);
  const dir = path.join(base, "results", "seed");
  fs.mkdirSync(dir, { recursive: true });
  const arm = makeArm(source);
  const policy = jvmPolicy("server", "present");
  await withStack(dir, arm, async (env) => {
    const client = new DatomicClient(env.DATOMIC_READ_URLS!, 35_000);
    try {
      const scope = scopeKey(arm.nonce + "-load");
      const opened = await client.create(scope, "lean", true, 35_000);
      assert(opened.created && opened.strictRecordClocks);
      const { head, seeds } = await seedPooled(client, opened.db);
      const observed = await verifyPopulation(env.DATOMIC_URL!, {
        scope, db: opened.db, phases: [{ firstPosition: head + 1 }],
      });
      assert.equal(observed.digest, pooledDigest);
      assert.equal(observed.seedCut, head);
      const dump = path.join(base, "seed.pgdump");
      const handle = fs.openSync(dump, "wx");
      try {
        execFileSync("docker", ["exec", arm.slot + "-pg", "pg_dump", "-U", "postgres",
          "-Fc", "-Z1", "-d", "datomic"], { timeout: 600_000, stdio: ["ignore", handle, "inherit"] });
      } finally { fs.closeSync(handle); }
      write(path.join(base, "seed.json"), {
        ...arm, ...observed, scope, db: opened.db, seeds,
        dumpBytes: fs.statSync(dump).size, dumpSha256: await fileHash(dump),
      });
    } finally { client.close(); }
  }, false, "individual", false, { policy, deadline: Date.now() + 5 * 60_000 });
}

function cgroupSample(env: NodeJS.ProcessEnv) {
  const entries = env.TX2_ENGINE_CGROUPS!.split(",").map((entry) => entry.split("=") as [string, string]);
  return Object.fromEntries(entries.map(([name, directory]) => {
    const get = (file: string) => fs.readFileSync(path.join(directory, file), "utf8").trim();
    const usageMicros = Number(/^usage_usec (\d+)$/m.exec(get("cpu.stat"))?.[1]);
    assert(Number.isFinite(usageMicros));
    return [name, { usageMicros, residentBytes: Number(get("memory.current")), peakBytes: Number(get("memory.peak")) }];
  }));
}

async function gcEvidence(dir: string, slot: string, started: number, ended: number, placements: { role: string; id: string; startedAt: string }[], collector: string) {
  const stack = path.join(dir, "engines", slot);
  const summary = [];
  for (const role of roles) {
    const placement = placements.find((candidate) => candidate.role === role);
    assert(placement);
    const file = path.join(stack, "trace", "raw", role + ".log");
    // [DX-JVM1] Why: hash the same bytes used to count pauses, retaining the sampled prefix while the JVM is live.
    // Rejected: hashing the eventual shutdown log and calling it the input to the workload statistics.
    const bytes = fs.readFileSync(file);
    fs.writeFileSync(path.join(dir, role + "-gc-observed.log"), bytes, { flag: "wx" });
    const lines = bytes.toString("utf8").trimEnd().split("\n");
    const timestamp = (line: string) => {
      const match = /^\[(\d{4}-\d\d-\d\dT[^\]]+)\]\[\d+ms\]/.exec(line);
      assert(match, role + " GC log must include wall clock and uptime");
      const time = Date.parse(match[1]!);
      assert(Number.isFinite(time));
      return time;
    };
    assert(timestamp(lines[0]!) >= Date.parse(placement.startedAt) - 1);
    assert(timestamp(lines[0]!) <= started && timestamp(lines.at(-1)!) <= ended + 1_000);
    assert(lines.some((line) => collector === "G1" ? /Using G1\b/.test(line) : /(?:Initializing|Using) (?:The Z Garbage Collector|ZGC)\b/.test(line)));
    const pauses: number[] = [];
    let allocationStalls = 0;
    const pauseTags = collector === "G1" ? /\[gc\s*\]/ : /\[gc,phases\s*\]/;
    for (const line of lines) {
      const time = timestamp(line);
      if (time < started || time > ended) continue;
      if (/\bAllocation Stall\b/.test(line)) allocationStalls++;
      const pause = pauseTags.test(line) && /\]\s+GC\(\d+\)\s+(?:[YO]:\s+)?Pause .+? (\d+(?:\.\d+)?)(ms|us|s)$/.exec(line);
      if (pause) pauses.push(Number(pause[1]) * (pause[2] === "ms" ? 1 : pause[2] === "s" ? 1000 : 0.001));
    }
    summary.push({ role, containerId: placement.id, collector, bytes: bytes.length,
      sha256: await fileHash(path.join(dir, role + "-gc-observed.log")), allocationStalls,
      pauseCount: pauses.length, p50Ms: pauses.length ? quantile(pauses, 0.50) : null,
      p99Ms: pauses.length ? quantile(pauses, 0.99) : null,
      maxMs: pauses.reduce<number | null>((maximum, value) => Math.max(maximum ?? 0, value), null) });
  }
  return summary;
}

async function campaign(base: string, source: string, seedDirectory: string, part2: boolean, coreOnly: boolean) {
  if (part2) {
    const availableKiB = Number(/^MemAvailable:\s*(\d+) kB$/m.exec(fs.readFileSync("/proc/meminfo", "utf8"))?.[1]);
    assert(availableKiB >= 42 * 2 ** 20, "Java 25 ZGC campaign needs 42 GiB available RAM before launch");
  }
  const dump = path.join(seedDirectory, "seed.pgdump");
  const seedFile = path.join(seedDirectory, "seed.json"), seed = read(seedFile);
  assert.deepEqual(read(path.join(seedDirectory, "results", "seed", "cleanup.json")),
    { containers: [], volumes: [], networks: [] });
  assert(seed.source === source || (part2 && seed.source === part1Source));
  assert.deepEqual(read(path.join(seedDirectory, "results", "seed", "identity.json")),
    { source: seed.source, slot: seed.slot, nonce: seed.nonce, population: seed.population,
      lookup: seed.lookup, readers: seed.readers });
  assert.equal(seed.seedCommits, seed.seedCut);
  assert.deepEqual(seed.seeds.map((item: {account: number; subjects: number}) => [item.account, item.subjects]),
    accounts.map((account) => [account.index, account.people]));
  assert.equal(seed.digest, pooledDigest);
  assert.equal(seed.facts, 16_245_050);
  assert.equal(seed.scope, scopeKey(seed.nonce + "-load"));
  assert.equal(seed.db, "s2-" + Buffer.from(seed.scope).toString("base64url"));
  assert.equal(seed.dumpBytes, fs.statSync(dump).size);
  assert.equal(seed.dumpSha256, await fileHash(dump));
  fs.mkdirSync(base);
  const root = path.join(base, "results");
  fs.mkdirSync(root);
  const predictionName = part2 ? "PREDICTIONS-PART2.md" : "PREDICTIONS.md";
  const predictions = path.join(import.meta.dirname, predictionName);
  fs.copyFileSync(predictions, path.join(root, predictionName), fs.constants.COPYFILE_EXCL);
  const seedReceiptSha256 = await fileHash(seedFile);
  const results = [];
  for (const name of part2 ? part2Arms.slice(0, coreOnly ? 3 : 4) : serverArms) {
    // [DX-JVM1] Why: keep setup, all offer windows, readback and cleanup bounded within one arm.
    // Rejected: a timer around offers that leaves seed restore or a stalled verifier unbounded.
    const startedAt = Date.now(), deadline = startedAt + (part2 ? 23 : 26) * 60_000;
    const arm = makeArm(source);
    const activePart2 = part2 ? part2Policy(name) : undefined;
    const policy = activePart2 ?? jvmPolicy("server", name);
    const dir = path.join(root, name);
    fs.mkdirSync(dir);
    const predictionHash = await fileHash(predictions);
    write(path.join(dir, "request.json"), { part2, arm, policy, seed, seedReceiptSha256, predictionHash, startedAt, deadline });
    const result = await withStack(dir, arm, async (env) => {
      assert.equal(fs.readFileSync(path.join(dir, "engines", arm.slot, "restore.sha256"), "utf8").trim(), seed.dumpSha256);
      const started = Date.now();
      const before = activePart2 ? cgroupSample(env) : undefined;
      const remaining = deadline - started - (activePart2 ? 45_000 : 0);
      assert(remaining > 0 && policy.cpus.sender);
      execFileSync("taskset", ["-c", policy.cpus.sender, process.execPath, "--import", "tsx",
        import.meta.filename, "worker", dir], { env, timeout: remaining, killSignal: "SIGKILL", stdio: "inherit" });
      const after = activePart2 ? cgroupSample(env) : undefined;
      const ended = Date.now();
      const file = path.join(dir, "field-summary.json");
      const result = read(file);
      assert.deepEqual(result.arm, arm);
      const roles = read(path.join(dir, "placements.json")).engines;
      for (const role of roles) {
        const current = call("docker", ["inspect", "--format", "{{.Id}} {{.State.Running}} {{.State.StartedAt}} {{.RestartCount}}", role.id]);
        assert.equal(current, [role.id, true, role.startedAt, role.restarts].join(" "));
        if (activePart2 && role.role !== "pg") {
          const post = path.join(dir, "post-jvm");
          call("bash", [path.join(import.meta.dirname, "readback.sh"), role.id, post, role.role]);
          const file = role.role + ".process.txt";
          assert.deepEqual(fs.readFileSync(path.join(post, file)),
            fs.readFileSync(path.join(dir, "engines", arm.slot, "config", file)));
        }
      }
      const jvm = activePart2 && before && after && {
        started, ended, before, after, gc: await gcEvidence(dir, arm.slot, started, ended, roles, activePart2.collector),
        meanJvmCpuCores: roles.filter((placement: {role: string}) => placement.role !== "pg").reduce((sum: number, placement: {role: string}) => {
          const name = arm.slot + "-" + placement.role;
          return sum + (after[name]!.usageMicros - before[name]!.usageMicros) / ((ended - started) * 1000);
        }, 0),
        reads: await Promise.all(fieldPlan().map(async ({ label }) => {
          const readFile = path.join(dir, label + "-reads.json"), data = read(readFile);
          assert.equal(data.label, label);
          assert.equal(data.cut, seed.seedCut);
          assert.equal(data.samples.length, 60);
          return { label, count: data.samples.length, p99Ms: data.p99Ms, sha256: await fileHash(readFile) };
        })),
      };
      assert(Date.now() <= deadline, "Work and evidence exceeded the arm deadline");
      return { name, arm, predictionHash, dumpSha256: seed.dumpSha256, seedReceiptSha256,
        evidenceSha256: await fileHash(file), summary: result.summary, jvm };
    }, false, "individual", false, { policy, deadline, seed: { dump, sha256: seed.dumpSha256 }, javaMajor: activePart2?.javaMajor });
    assert.equal(await fileHash(dump), seed.dumpSha256, "The prepared seed changed");
    assert.equal(await fileHash(seedFile), seedReceiptSha256, "The seed receipt changed");
    const durationMs = Date.now() - startedAt;
    assert(durationMs < (part2 ? 26 : 29) * 60_000, "Arm exceeded its wall-clock budget");
    write(path.join(dir, "result.json"), { ...result, durationMs });
    results.push({ ...result, durationMs });
  }
  write(path.join(root, "comparison.json"), { source, results });
}

if (command === "worker") await worker();
else {
  requirePhysical();
  assert(output && (command === "prepare" || command === "run" || command === "run-part2" || command === "run-part2-three"));
  call("git", ["diff", "--quiet", "HEAD", "--"]);
  const source = call("git", ["rev-parse", "HEAD"]);
  if (command === "prepare") await prepare(path.resolve(output), source);
  else {
    assert(seedBase, "Supply the prepared seed directory");
    await campaign(path.resolve(output), source, path.resolve(seedBase), command !== "run", command === "run-part2-three");
  }
}
