import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { withStack } from "../w1/bench.ts";
import { fieldPlan, validateArm } from "../w1/field/bench-check.ts";
import { fieldPhase, scopeKey } from "../w1/field/traffic.ts";
import { pooledDigest } from "../w1/group/population.ts";
import { seedPooled } from "../w1/group/workload.ts";
import { verifyPopulation } from "../w1/group/seed-readback.ts";
import { fileHash } from "../scale1/measurements.ts";
import { jvmPolicy, serverArms } from "./policy.mjs";

const [, , command, output, seedBase] = process.argv;
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file: string, value: unknown) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const call = (program: string, args: string[]) =>
  execFileSync(program, args, { encoding: "utf8", timeout: 15_000 }).trim();

async function worker() {
  assert(output);
  const request = read(path.join(output, "request.json"));
  const { seed, arm } = request;
  assert.equal(process.env.TRIPLEX_TRACE_SOURCE, arm.source);
  assert.equal(process.env.TRIPLEX_TRACE_SLOT, arm.slot);
  assert.equal(seed.scope, scopeKey(seed.nonce + "-load"));
  const client = new DatomicClient(process.env.DATOMIC_URL!, 35_000);
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
      const phase = await fieldPhase(
        client, seed.db, head, seed.nonce, window.label, window.schedule, true, senders, false,
      );
      write(path.join(output, window.label + ".json"), phase);
      assert.deepEqual(phase.failures, []);
      head += phase.offered;
      phases.push(phase);
    }
    const raw = { nonce: seed.nonce, scope: seed.scope, db: seed.db, seeds: seed.seeds, phases };
    const summary = validateArm(raw, "individual", "rates", seed.nonce);
    write(path.join(output, "field-summary.json"), { arm, summary });
  } finally {
    client.close();
  }
}

function requirePhysical() {
  assert.equal(process.platform, "linux");
  assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
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

async function campaign(base: string, source: string, seedDirectory: string) {
  const dump = path.join(seedDirectory, "seed.pgdump");
  const seed = read(path.join(seedDirectory, "seed.json"));
  assert.deepEqual(read(path.join(seedDirectory, "results", "seed", "cleanup.json")),
    { containers: [], volumes: [], networks: [] });
  assert.equal(seed.source, source);
  assert.equal(seed.digest, pooledDigest);
  assert.equal(seed.facts, 16_245_050);
  assert.equal(seed.scope, scopeKey(seed.nonce + "-load"));
  assert.equal(seed.db, "s2-" + Buffer.from(seed.scope).toString("base64url"));
  assert.equal(seed.dumpBytes, fs.statSync(dump).size);
  assert.equal(seed.dumpSha256, await fileHash(dump));
  fs.mkdirSync(base);
  const root = path.join(base, "results");
  fs.mkdirSync(root);
  const predictions = path.join(import.meta.dirname, "PREDICTIONS.md");
  fs.copyFileSync(predictions, path.join(root, "PREDICTIONS.md"), fs.constants.COPYFILE_EXCL);
  const results = [];
  for (const name of serverArms) {
    // [DX-JVM1] Why: keep setup, all offer windows, readback and cleanup bounded within one arm.
    // Rejected: a timer around offers that leaves seed restore or a stalled verifier unbounded.
    const startedAt = Date.now(), deadline = startedAt + 26 * 60_000;
    const arm = makeArm(source);
    const policy = jvmPolicy("server", name);
    const dir = path.join(root, name);
    fs.mkdirSync(dir);
    const predictionHash = await fileHash(predictions);
    write(path.join(dir, "request.json"), { arm, policy, seed, predictionHash, startedAt, deadline });
    const result = await withStack(dir, arm, async (env) => {
      const remaining = deadline - Date.now();
      assert(remaining > 0 && policy.cpus.sender);
      execFileSync("taskset", ["-c", policy.cpus.sender, process.execPath, "--import", "tsx",
        import.meta.filename, "worker", dir], { env, timeout: remaining, stdio: "inherit" });
      const file = path.join(dir, "field-summary.json");
      const result = read(file);
      assert.deepEqual(result.arm, arm);
      const roles = read(path.join(dir, "placements.json")).engines;
      for (const role of roles) {
        const current = call("docker", ["inspect", "--format", "{{.Id}} {{.State.Running}} {{.State.StartedAt}} {{.RestartCount}}", role.id]);
        assert.equal(current, [role.id, true, role.startedAt, role.restarts].join(" "));
      }
      return { name, arm, predictionHash, dumpSha256: seed.dumpSha256,
        evidenceSha256: await fileHash(file), summary: result.summary };
    }, false, "individual", false, { policy, deadline, dump });
    assert(Date.now() - startedAt < 29 * 60_000, "Arm exceeded 29 minutes");
    assert.equal(await fileHash(dump), seed.dumpSha256, "The prepared seed changed");
    write(path.join(dir, "result.json"), result);
    results.push(result);
  }
  write(path.join(root, "comparison.json"), { source, results });
}

if (command === "worker") await worker();
else {
  requirePhysical();
  assert(output && (command === "prepare" || command === "run"));
  call("git", ["diff", "--quiet", "HEAD", "--"]);
  const source = call("git", ["rev-parse", "HEAD"]);
  if (command === "prepare") await prepare(path.resolve(output), source);
  else {
    assert(seedBase, "Supply the prepared seed directory");
    await campaign(path.resolve(output), source, path.resolve(seedBase));
  }
}
