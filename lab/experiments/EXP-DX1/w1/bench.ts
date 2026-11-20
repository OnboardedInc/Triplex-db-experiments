import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { availableParallelism } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { deepSeed } from "../../../bench/lib/deep-trace.ts";
import { releaseDeepStart, type DeepIdentity } from "../../../bench/lib/deep-profile.ts";
import { sourceInventory, stageReplay } from "../scale1/source.ts";
import { fileHash } from "../scale1/measurements.ts";
import { measure, type Arm } from "./measure.ts";
import { fieldPolicy, type Mode } from "./field/bench-check.ts";

const repo = path.resolve(import.meta.dirname, "../../../.."),
  GiB = 1024 ** 3;
const get = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const write = (f: string, o: unknown) =>
  fs.writeFileSync(f, JSON.stringify(o, null, 2) + "\n", { flag: "wx" });
const call = (program: string, args: string[]) =>
  execFileSync(program, args, { cwd: repo, encoding: "utf8", timeout: 60000 }).trim();
const docker = (...args: string[]) => call("docker", args);
const stack = (name: string) => path.join(repo, "lab/experiments/EXP-DX1/stack", name + ".sh");
const workerCpus = availableParallelism() >= 12 ? "5,6,7,9,10,11" : "5,6,7";
const roles = ["pg", "tx", "gw-w", "gw-r"] as const;
export function matrix() {
  return (["thin", "deep"] as const).flatMap((population) =>
    (
      [
        ["individual", false],
        ["range", false],
        ["range", true],
        ["individual", true],
      ] as const
    ).map(([lookup, readers]) => ({ population, lookup, readers })),
  );
}
function stopReason() {
  if (
    process.platform !== "linux" ||
    process.getuid?.() !== 0 ||
    process.env.DOCKER_HOST !== "unix:///var/run/docker.sock"
  )
    return "requires the assigned native Linux daemon";
  const virt = spawnSync("systemd-detect-virt", [], { encoding: "utf8" });
  if (virt.status !== 1 || virt.stdout.trim() !== "none") return "requires a physical host";
}
// [DX-W1] Why: the thin 100k diagnostic retains the archived BM1 window; the v3 validator intentionally accepts only its 10k trace.
export function driverArgs(
  arm: Arm,
  out: string,
  oracle: string,
  barrier: string,
  baseline?: string,
) {
  const args = [
    "-c",
    "3," + workerCpus,
    process.execPath,
    "--import",
    "tsx",
    "lab/bench/driver.ts",
    "--lane",
    "datomic",
    "--composition",
    "reach",
    "--output",
    path.join(out, "ns-report.json"),
    "--oracle-root",
    oracle,
    "--read-path",
    "replica",
    "--reader-threads",
    "6",
    "--seed-batch-facts",
    "2000",
    "--replica-history-mib",
    "192",
    "--replica-world-cache-mib",
    "32",
    "--replica-fallback-thread",
    "worker",
    "--reader-basis-wire",
    "delta",
    "--seed-budget-s",
    "14400",
    "--receipt-capture",
    "replica-worker",
    "--expected-state-retention",
    "worker-journal",
  ];
  if (arm.readers) {
    assert(baseline);
    args.push("--baseline-writes", baseline);
  } else args.push("--zero-readers");
  if (arm.population === "thin")
    args.push(
      "--profile",
      "smoke",
      "--rung",
      "100k",
      "--seed",
      "ns-v2",
      "--match-duration-s",
      "900",
      "--writer-deadline-ms",
      "600000",
    );
  else
    args.push(
      "--profile",
      "deep",
      "--rung",
      "deep-100k",
      "--deep-account",
      "0",
      "--deep-nonce",
      arm.nonce,
      "--deep-barrier",
      barrier,
      "--seed",
      deepSeed(0),
    );
  return args;
}
let stopping = false;
let active: ChildProcess | undefined;
async function runDriver(dir: string, arm: Arm, env: NodeJS.ProcessEnv, baseline?: string) {
  const out = path.join(repo, "runs", "DX-W1", arm.slot),
    barrier = path.join(dir, "barrier"),
    oracle = path.join(dir, "oracle");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.mkdirSync(out);
  fs.symlinkSync(out, path.join(dir, "driver"), "dir");
  fs.mkdirSync(barrier);
  write(path.join(dir, "oracle-source.json"), stageReplay(repo, oracle));
  const args = driverArgs(arm, out, oracle, barrier, baseline);
  const fd = fs.openSync(path.join(out, "driver.log"), "wx");
  const child = spawn("taskset", args, {
    cwd: repo,
    env: { ...env, TRIPLEX_TRACE_DIR: path.join(out, "trace") },
    stdio: ["ignore", fd, fd],
  });
  fs.closeSync(fd);
  active = child;
  const done = new Promise<number>((resolve) => {
    child.once("error", () => resolve(127));
    child.once("close", (c) => resolve(c ?? 128));
  });
  let start = 0,
    released = false;
  const deadline = Date.now() + 8 * 3600_000;
  try {
    while (true) {
      const exit = await Promise.race([done, sleep(1000).then(() => null)]);
      if (exit !== null) {
        write(path.join(dir, "driver-exit.json"), { exit });
        assert.equal(exit, 0);
        break;
      }
      if (stopping || Date.now() > deadline)
        throw Error("Driver interrupted or exceeded eight hours");
      const disk = fs.statfsSync(dir);
      assert(disk.bavail * disk.bsize >= 8 * GiB, "Stopping before disk reserve");
      if (arm.population !== "deep") continue;
      const identity: DeepIdentity = {
        account: 0,
        people: 100000,
        source: arm.source,
        slot: arm.slot,
        nonce: arm.nonce,
        arm: arm.readers ? "reader" : "zero",
      };
      if (!start && fs.existsSync(path.join(barrier, "s0.ready.json"))) {
        const row = get(path.join(barrier, "s0.ready.json"));
        assert.deepEqual(row.identity, identity);
        assert.deepEqual(row, get(path.join(out, "seed-observed.json")));
        const { identity: _id, ...ready } = row;
        start = Date.now() + 60000;
        write(path.join(barrier, "go.tmp"), {
          source: arm.source,
          slot: arm.slot,
          nonce: arm.nonce,
          scopes: { s0: ready },
          start,
        });
        fs.renameSync(path.join(barrier, "go.tmp"), path.join(barrier, "go.json"));
      }
      if (start && !released && fs.existsSync(path.join(barrier, "s0.armed.json"))) {
        releaseDeepStart(barrier, [identity], start);
        released = true;
      }
    }
    if (arm.population === "deep") assert(released);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      if ((await Promise.race([done, sleep(15000).then(() => null)])) === null)
        child.kill("SIGKILL");
      await done;
    }
    active = undefined;
  }
}
export async function withStack<T>(
  dir: string,
  arm: Arm,
  run: (env: NodeJS.ProcessEnv) => Promise<T>,
  grouped?: boolean,
  fieldMode?: Mode,
  enhanced = false,
  readerGatewayCpus?: "4,8",
) {
  const why = stopReason();
  assert(!why, why);
  assert(!stopping && !docker("ps", "-q"), "Bench is busy");
  const stat = fs.statfsSync(dir);
  assert(
    stat.bavail * stat.bsize >= 160 * GiB,
    "Insufficient scratch for a fresh seed and raw traces",
  );
  assert.equal(call("git", ["rev-parse", "HEAD"]), arm.source);
  const slot = arm.slot,
    engines = path.join(dir, "engines", slot);
  const resources = () => ({
    containers: docker("ps", "-a", "--format", "{{.Names}}")
      .split("\n")
      .filter((n) => n.startsWith(slot + "-")),
    volumes: docker("volume", "ls", "--format", "{{.Name}}")
      .split("\n")
      .filter((n) => n.startsWith(slot + "-")),
    networks: docker("network", "ls", "--format", "{{.Name}}")
      .split("\n")
      .filter((n) => n.startsWith(slot + "-")),
  });
  const empty = { containers: [], volumes: [], networks: [] };
  assert.deepEqual(resources(), empty);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DX_BARE_METAL: "1",
    DX_BARE_METAL_ROOT: dir,
    DX_STACK_EVIDENCE: path.join(dir, "engines"),
    DX_STACK_WAIT_FOR_TRANSACTOR: "1",
    DX_QUIET_LOGS: "1",
    DX_NATIVE_SETTINGS_READBACK: "1",
    DX_TX_NATIVE_JFR: "1",
    DX_IDLE_SENTINEL: "0",
    DX_IDLE_REFUSAL_PROBE: "0",
    DX_IDLE_TCP: "default",
    TX2_COMMIT_HINTS: "false",
    DX_COMMIT_HINTS: "false",
    TRIPLEX_TRACE_LEVEL: "full",
    TRIPLEX_TRACE_COMPONENTS: "node,gateway,tx-jfr",
    TRIPLEX_TRACE_RUN: slot,
    TRIPLEX_TRACE_SLOT: slot,
    TRIPLEX_TRACE_SOURCE: arm.source,
    TRIPLEX_TRACE_NODE: "1",
    TRIPLEX_TRACE_GATEWAY: "1",
    TRIPLEX_TRACE_TX_JFR: "1",
    TRIPLEX_DATOMIC_LAYOUT: "lean",
    TRIPLEX_DATOMIC_FAST_PATHS: arm.lookup === "range" ? "history-range" : "",
    DX_SERVER_RECORD_TIME: "1",
    DX_STRICT_RECORD_CLOCKS: "1",
    DX_MODEL_COMPACT: "1",
    DX_NATIVE_GATES: "0",
    DX_PUBLICATION_MODE: "worker",
    DX_PUBLICATION_WAIT_MS: "30000",
    TRIPLEX_NODE_MAIN_CPUS: "3",
    TRIPLEX_NODE_WORKER_CPUS: workerCpus,
    TRIPLEX_BENCH_SPILL_MAX_BYTES: String(32 * GiB),
    NODE_OPTIONS: "--max-old-space-size=32768",
    DX_GW_WRITE_MEMORY: "4g",
    DX_GW_READ_MEMORY: "4g",
    DX_GW_WRITE_JAVA_OPTS: "-Xms256m -Xmx3g",
    DX_GW_READ_JAVA_OPTS: "-Xms256m -Xmx3g",
  };
  if (grouped !== undefined)
    Object.assign(env, {
      DX_GROUP_COMMIT: grouped ? "1" : "0",
      DX_GROUP_QUEUE_CLOCK: "1",
      TRIPLEX_TRACE_LEVEL: "off",
      TRIPLEX_TRACE_COMPONENTS: "",
      TRIPLEX_TRACE_NODE: "0",
      TRIPLEX_TRACE_GATEWAY: "0",
      TRIPLEX_TRACE_TX_JFR: "0",
      DX_TX_NATIVE_JFR: "0",
      DX_NATIVE_SETTINGS_READBACK: "0",
    });
  const policy = fieldMode ? fieldPolicy(fieldMode, enhanced) : undefined;
  if (policy) {
    assert.equal(grouped, policy.grouping);
    Object.assign(env, {
      DX_LIVE_PRIORITY: String(Number(policy.priority)),
      DX_FIELD_COALESCE: String(Number(policy.subjectOnly)),
      DX_W1_EXTRA: String(Number(enhanced)),
      DX_SMALL_ROWS: String(Number(policy.compact)),
      DX_GROUP_REUSE_PREPARED: String(Number(policy.prepared)),
      DX_GROUP_MAX_MEMBERS: String(policy.maxMembers),
      DX_WRITE_BUDGET_US: policy.budgetMicros === null ? "" : String(policy.budgetMicros),
    });
  }
  write(path.join(dir, "identity.json"), arm);
  const args = [
    stack("up"),
    slot,
    "--no-publish",
    "--cpus-tx",
    "0",
    "--cpus-pg",
    "1",
    "--cpus-gw-write",
    "2",
    "--cpus-gw-read",
    readerGatewayCpus ?? "4",
    "--pg-memory",
    "6g",
    "--tx-memory",
    "6g",
    "--tx-java-opts",
    "-Xms256m -Xmx5g -XX:+UseG1GC",
    "--object-cache-max",
    "1280m",
    "--pg-settings",
    "-c shared_buffers=1GB -c synchronous_commit=on -c fsync=on -c full_page_writes=on -c track_io_timing=on",
  ];
  const activeSlot = path.resolve(dir, "../../active-slot");
  fs.writeFileSync(activeSlot, slot + "\n", { flag: "wx" });
  try {
    execFileSync("bash", args, { cwd: repo, env, timeout: 600000, stdio: "inherit" });
    // [DX-SCALE1] Why: the decision controller is already pinned to one CPU during stack startup. Rejected: using its own process affinity to infer the assigned host's reader gateway placement.
    if (!readerGatewayCpus && availableParallelism() >= 12)
      docker("update", "--cpuset-cpus", "4,8", slot + "-gw-r");
    const buildResults = path.resolve(repo, "../results"),
      images = get(path.join(buildResults, "images.json"));
    const imageFor = (tag: string) => {
      const image = images.find((i: any) => i.RepoTags?.includes(tag));
      assert(image?.Id);
      return image;
    };
    const peer = imageFor("tx2-datomic:1.0.7745-da00"),
      pg = imageFor("postgres:17-alpine");
    assert.equal(
      peer.Config.Labels["tx2.build-inputs-sha256"],
      await fileHash(path.join(buildResults, "IMAGE-INPUTS.SHA256SUMS")),
    );
    const staged = path.join(engines, "gateway-files.json"),
      expectedGateway: Record<string, string> = {};
    for (const name of call("git", ["ls-files", "packages/datomic/gateway"]).split("\n"))
      expectedGateway[path.relative("packages/datomic/gateway", name)] = await fileHash(name);
    expectedGateway["codec-spec.json"] = await fileHash("packages/datomic/src/codec-spec.json");
    assert.deepEqual(get(staged), expectedGateway);
    const gatewayHash = await fileHash(staged);
    assert.equal(get(path.join(engines, "stack.json")).gatewaySourceSha256, gatewayHash);
    for (const role of ["w", "r"])
      assert.equal(
        get(path.join(engines, "health-" + role + ".json")).gatewaySourceHash,
        gatewayHash,
      );
    const groups: string[] = [];
    const roleInfo = roles.map((role) => {
      const info = JSON.parse(docker("inspect", slot + "-" + role))[0];
      assert.equal(info.Image, role === "pg" ? pg.Id : peer.Id);
      const group = fs
        .readFileSync(`/proc/${info.State.Pid}/cgroup`, "utf8")
        .trim()
        .split("\n")
        .find((s) => s.startsWith("0::"));
      assert(group);
      const cgroup = path.join("/sys/fs/cgroup", group.slice(3));
      groups.push(slot + "-" + role + "=" + cgroup);
      const address = info.NetworkSettings.Networks[slot + "-net"].IPAddress;
      if (role === "gw-w" || role === "gw-r")
        env[role === "gw-w" ? "DATOMIC_URL" : "DATOMIC_READ_URLS"] = "http://" + address + ":8080";
      return {
        role,
        id: info.Id,
        image: info.Image,
        cpus: info.HostConfig.CpusetCpus,
        bytes: info.HostConfig.Memory,
      };
    });
    if (grouped !== undefined) {
      const writer = JSON.parse(docker("inspect", slot + "-gw-w"))[0];
      assert(writer.Config.Env.includes("TX2_GROUP_COMMIT=" + Number(grouped)));
      assert(writer.Config.Env.includes("TX2_GROUP_QUEUE_CLOCK=1"));
      if (fieldMode) {
        assert(
          writer.Config.Env.includes("TX2_LIVE_PRIORITY=" + Number(fieldMode !== "individual")),
        );
        assert(writer.Config.Env.includes("TX2_FIELD_COALESCE=" + Number(fieldMode === "subject")));
        if (enhanced && policy) {
          assert(writer.Config.Env.includes("TX2_GROUP_STAGE_CLOCK=1"));
          assert(writer.Config.Env.includes("TX2_SMALL_ROWS=" + Number(policy.compact)));
          assert(writer.Config.Env.includes("TX2_GROUP_REUSE_PREPARED=" + Number(policy.prepared)));
          assert(writer.Config.Env.includes("TX2_GROUP_MAX_MEMBERS=" + policy.maxMembers));
          const budget = writer.Config.Env.find((s: string) =>
            s.startsWith("TX2_WRITE_BUDGET_US="),
          );
          assert.equal(
            budget,
            policy.budgetMicros === null ? undefined : "TX2_WRITE_BUDGET_US=" + policy.budgetMicros,
          );
          write(path.join(dir, "field-options.json"), policy);
        }
      }
    }
    env.TX2_ENGINE_CGROUPS = groups.join(",");
    env.TX2_ENGINE_CPUS = "5";
    write(path.join(dir, "placements.json"), { engines: roleInfo, sender: "3", workerCpus });
    const durable = docker(
      "exec",
      slot + "-pg",
      "psql",
      "-U",
      "postgres",
      "-Atc",
      "SELECT current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes')",
    );
    assert.equal(durable, "on|on|on");
    write(path.join(dir, "durability.json"), { settings: durable });
    return await run(env);
  } finally {
    execFileSync("bash", [stack("down"), slot, "--volumes"], {
      cwd: repo,
      env,
      stdio: "inherit",
      timeout: 120000,
    });
    const remaining = resources();
    write(path.join(dir, "cleanup.json"), remaining);
    assert.deepEqual(remaining, empty);
    assert.equal(fs.readFileSync(activeSlot, "utf8").trim(), slot);
    fs.unlinkSync(activeSlot);
  }
}
async function runArm(dir: string, arm: Arm, baseline?: string) {
  const raw = path.join(dir, "engines", arm.slot, "trace/raw");
  return withStack(dir, arm, async (env) => {
    await runDriver(dir, arm, env, baseline);
    fs.writeFileSync(path.join(raw, ".finish"), "", { flag: "wx" });
    const done = path.join(raw, "tx.jfr-complete.jsonl"),
      deadline = Date.now() + 30 * 60000;
    while (!fs.existsSync(done)) {
      assert(
        !stopping && Date.now() < deadline && !fs.existsSync(path.join(raw, "tx-jfr-error.txt")),
        "JFR collection incomplete",
      );
      await sleep(1000);
    }
    // [DX-W1] Why: flush the writer before hashing and decoding its JSONL, and verify exact resource cleanup on any exit.
    // Rejected: a successful child exit as evidence that the last receipts or metrics reached disk.
    docker("stop", "--time", "30", arm.slot + "-gw-w");
    return await measure(dir, arm);
  });
}
export async function campaign(root: string, source: string, batch: string) {
  assert.match(batch, /^[a-z][a-z0-9]{2,14}$/);
  assert.match(source, /^[a-f0-9]{40}$/);
  const why = stopReason();
  assert(!why, why);
  assert.equal(call("git", ["rev-parse", "HEAD"]), source);
  assert.equal(call("git", ["diff", "--name-only", "HEAD"]), "");
  const mem = fs.readFileSync("/proc/meminfo", "utf8").match(/MemAvailable:\s+(\d+)/);
  assert(
    mem && Number(mem[1]) * 1024 >= 64 * GiB,
    "Need room for the 32 GiB sender plus isolated engines",
  );
  const dir = path.join(root, "results");
  fs.mkdirSync(dir);
  const inventory = sourceInventory(repo);
  for (const file of call("git", [
    "ls-files",
    "lab/experiments/EXP-DX1/w1",
    "packages/datomic/src",
  ]).split("\n"))
    inventory.files[file] = await fileHash(file);
  write(path.join(dir, "source.json"), inventory);
  const baselines = new Map<string, string>(),
    metrics: Awaited<ReturnType<typeof measure>>[] = [];
  for (const row of matrix()) {
    const i = metrics.length + 1,
      arm = { ...row, source, slot: `tx2-dxscale1-w1-${batch}-${i}`, nonce: randomUUID() };
    const attempt = path.join(dir, "arm-" + i),
      key = row.population + "/" + row.lookup;
    fs.mkdirSync(attempt);
    const result = await runArm(attempt, arm, baselines.get(key));
    if (!row.readers) baselines.set(key, path.join(attempt, "driver/ns-writes.jsonl"));
    for (const previous of metrics.filter((r) => r.arm.population === row.population)) {
      assert.equal(previous.trace, result.trace);
      assert.equal(previous.seedFacts, result.seedFacts);
      assert.equal(previous.denominator, result.denominator);
    }
    write(path.join(attempt, "measurements.json"), result);
    metrics.push(result);
  }
  const pairs = metrics
    .filter((m) => m.arm.lookup === "range")
    .map((candidate) => {
      const baseline = metrics.find(
        (m) =>
          m.arm.population === candidate.arm.population &&
          m.arm.readers === candidate.arm.readers &&
          m.arm.lookup === "individual",
      )!;
      return {
        population: candidate.arm.population,
        readers: candidate.arm.readers,
        individual: baseline.arm.slot,
        range: candidate.arm.slot,
        rangeMinusIndividual: {
          sqlReadsPerCommit: candidate.sqlReadsPerCommit - baseline.sqlReadsPerCommit,
          applyP50Ms: candidate.applyMs.p50! - baseline.applyMs.p50!,
          applyP99Ms: candidate.applyMs.p99! - baseline.applyMs.p99!,
          ackP50Ms: candidate.ackMs.p50! - baseline.ackMs.p50!,
          ackP99Ms: candidate.ackMs.p99! - baseline.ackMs.p99!,
        },
      };
    });
  write(path.join(dir, "comparison.json"), { arms: metrics, pairs });
  console.table(
    metrics.map((m) => ({
      population: m.arm.population,
      load: m.arm.readers ? "loaded" : "zero",
      mode: m.arm.lookup,
      n: m.denominator,
      sqlPerCommit: m.sqlReadsPerCommit,
      applyP50: m.applyMs.p50,
      applyP99: m.applyMs.p99,
      ackP50: m.ackMs.p50,
      ackP99: m.ackMs.p99,
    })),
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.on("SIGTERM", () => {
    stopping = true;
    active?.kill("SIGTERM");
  });
  process.on("SIGINT", () => {
    stopping = true;
    active?.kill("SIGTERM");
  });
  await campaign(process.argv[2]!, process.argv[3]!, process.argv[4]!);
}
