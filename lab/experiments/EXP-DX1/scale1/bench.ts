import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { guardSeed } from "../act2/preflight-runner.ts";
import { deepPopulation } from "../../../bench/lib/deep-world.ts";
import { sealSeed, restoreSeed } from "./seed-image.ts";
import {
  campaignItem,
  tenantRung,
  tenantAccounts,
  tenantFacts,
  type TenantSpec,
  type Topology,
} from "./tenants.ts";
import { smallPeople, smallRung } from "./small-plan.ts";
import { deepSeed } from "../../../bench/lib/deep-trace.ts";
import {
  cohort,
  fileHash,
  readScope,
  type Quantities,
  type ScopeMeasurement,
} from "./measurements.ts";
import { compressTraces } from "./archive.ts";
import { resources } from "./resources.ts";
import {
  activeUnitArgs,
  dedicatedHost,
  stageReplay,
  sourceInventory,
  summaryFiles,
} from "./source.ts";
import { releaseDeepStart, type DeepIdentity } from "../../../bench/lib/deep-profile.ts";

const GiB = 1024 ** 3,
  script = fileURLToPath(import.meta.url),
  operatorRepo = path.resolve(path.dirname(script), "../../../.."),
  repo = process.env.DX_SCALE1_RUNTIME_REPO
    ? path.resolve(process.env.DX_SCALE1_RUNTIME_REPO)
    : operatorRepo,
  root = "/var/tmp/triplex-scale1";
const getopt = (key: string) => {
  const i = process.argv.indexOf(`--${key}`);
  return i < 0 ? undefined : process.argv[i + 1];
};
const call = (program: string, args: string[], timeout = 30000) =>
  execFileSync(program, args, {
    encoding: "utf8",
    timeout,
    maxBuffer: 16 * 1024 ** 2,
    cwd: repo,
    env: process.env,
  }).trim();
const docker = (...args: string[]) => call("docker", args);
const get = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
function write(p: string, data: unknown) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
}
function status(dir: string, stage: string, notes: unknown = {}) {
  const f = path.join(dir, "STATUS.json");
  fs.writeFileSync(
    f + ".tmp",
    JSON.stringify({ stage, at: new Date().toISOString(), notes }) + "\n",
  );
  fs.renameSync(f + ".tmp", f);
}
const roles = ["pg", "tx", "gw-w", "gw-r"];
const planCpus = {
  transactor: "0",
  postgres: "1",
  writerGateway: "2",
  readerGateway: "4,8",
  senders: "3",
  readers: "5,6,7,9,10,11",
};
function physical() {
  assert(process.platform === "linux" && process.getuid?.() === 0);
  assert.equal(spawnResult("systemd-detect-virt", []).trim(), "none");
  assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
}
function spawnResult(cmd: string, args: string[]) {
  try {
    return call(cmd, args);
  } catch (e: any) {
    return typeof e.stdout === "string" ? e.stdout : "";
  }
}
function released() {
  const platform = path.join(root, "platform"),
    base = "/sys/devices/system/cpu/cpufreq";
  const sum = (p: string) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  const governors = fs
    .readdirSync(base)
    .filter((n) => /^policy\d+$/.test(n))
    .map((n) => fs.readFileSync(path.join(base, n, "scaling_governor"), "utf8").trim());
  dedicatedHost(
    get(path.join(platform, "dedicated.json")),
    sum("/etc/machine-id"),
    sum(path.join(platform, "delivered.txt")),
    governors,
    fs.readFileSync("/sys/devices/system/cpu/smt/active", "utf8").trim(),
  );
  assert.equal(
    call("systemctl", [
      ...activeUnitArgs,
      "triplex-scale1-prepare-*.service",
      "triplex-scale1-arm-*.service",
    ]),
    "",
    "An earlier native arm is still active",
  );
  assert.equal(docker("ps", "-q"), "", "Another stack is running");
}
function memory() {
  return (
    Number(/^MemAvailable:\s+(\d+)/m.exec(fs.readFileSync("/proc/meminfo", "utf8"))![1]) * 1024
  );
}
function available(p: string) {
  const s = fs.statfsSync(p);
  return s.bavail * s.bsize;
}
export function capacity(
  people: number,
  scopes: number,
  host: { memory: number; disk: number },
  observation?: {
    people: number;
    facts: number;
    allocatedBytes: number;
    driverPeakBytes: number;
    seedDriverPeakBytes: number;
    sharedPeakBytes: number;
    spillBytes: number;
  },
  arm = "reader",
  physicalFacts?: number,
) {
  const small = arm === "small",
    facts =
      physicalFacts ??
      (small
        ? (90 * deepPopulation(100).facts + 10 * deepPopulation(2000).facts) / 100
        : deepPopulation(people).facts),
    scale = facts / (observation?.facts ?? 1_604_464);
  // [DX-SCALE1] Why: one shared engine allocation plus N separate senders, replicas and lossless spills must fit. Rejected: multiplying the whole stack by ten or treating installed NVMe capacity as free space.
  const diskPerFact = observation ? observation.allocatedBytes / observation.facts : 1200;
  const db = Math.ceil(diskPerFact * facts * scopes * 1.35);
  // [DX-SCALE1] Why: BM1 retained 57,229,420 L256 reads at 168 bytes per numeric tuple across only part of the run. Rejected: extrapolating the zero-reader receipt-only spill to the loaded arm, which caps a real measurement at 2 GiB.
  const readerFloor = scopes === 1 ? 64 * GiB : Math.max(16 * GiB, (64 * GiB) / scopes);
  const spillPer = small
    ? scopes === 1
      ? 32 * GiB
      : Math.ceil(0.4 * GiB)
    : Math.ceil(
        Math.max(
          arm === "zero" || arm === "seed" ? 2 * GiB : readerFloor,
          (observation?.spillBytes ?? 16 * GiB) * 1.35,
        ),
      );
  const sentinelSpill = small ? 32 * GiB : spillPer;
  const shared = Math.max(8 * GiB, (observation?.sharedPeakBytes ?? 14 * GiB) * 1.15),
    seedPer = Math.max(
      512 * 1024 ** 2,
      (observation?.seedDriverPeakBytes ?? 2 * GiB) * scale * 1.15,
    );
  const sharedReserve = Math.max(24 * GiB, shared);
  const driverPer = Math.max(seedPer, (observation?.driverPeakBytes ?? 14 * GiB) * scale * 1.15),
    seedDisk = db + 15 * GiB,
    liveDisk = seedDisk + spillPer * (scopes - 1) + sentinelSpill;
  const seedMemory = sharedReserve + seedPer * scopes + 5 * GiB,
    liveMemory = sharedReserve + driverPer * scopes + 5 * GiB;
  const fitsSeed = host.disk >= seedDisk && host.memory >= seedMemory,
    fitsLive = host.disk >= liveDisk && host.memory >= liveMemory;
  const seedParallelism = Math.max(
    0,
    Math.min(scopes, Math.floor((host.memory - sharedReserve - 5 * GiB) / seedPer)),
  );
  const seedScopeLimit = Math.max(
    0,
    Math.min(scopes, Math.floor((host.disk - 15 * GiB) / (db / scopes))),
  );
  // [DX-SCALE1] Why: even a single admissible scope exposes measured seed progress on a constrained host. Rejected: refusing every partial seed when the widest feasible wave has one member.
  const canSeed = Math.min(seedParallelism, seedScopeLimit) >= 1;
  const limits = [
    ...(host.disk < (arm === "seed" ? seedDisk : liveDisk) ? ["disk"] : []),
    ...(host.memory < (arm === "seed" ? seedMemory : liveMemory) ? ["memory"] : []),
  ];
  return {
    people,
    scopes,
    facts,
    host,
    observation,
    scale,
    diskPerFact,
    db,
    spillPer,
    sentinelSpill,
    shared,
    sharedReserve,
    driverPer,
    seedPer,
    seedDisk,
    liveDisk,
    seedMemory,
    liveMemory,
    fitsSeed: canSeed,
    allSeedsFitAtOnce: fitsSeed,
    seedParallelism,
    seedScopeLimit,
    fitsLive,
    limits,
  };
}
function snapshot(prefix: string) {
  const size = Number(
    docker(
      "exec",
      `${prefix}-pg`,
      "psql",
      "-U",
      "postgres",
      "-d",
      "datomic",
      "-Atc",
      "SELECT pg_database_size(current_database())",
    ),
  );
  assert(size > 0);
  const vol = docker("volume", "inspect", `${prefix}-pg-data`, "--format", "{{.Mountpoint}}");
  const physical = Number(call("du", ["-s", "-B1", vol]).split(/\s/)[0]);
  assert(physical > 0);
  const query =
    "SELECT row_to_json(s) FROM (SELECT blks_read,blks_hit,temp_bytes,xact_commit,xact_rollback,blk_read_time,blk_write_time FROM pg_stat_database WHERE datname=current_database()) s";
  const postgres = JSON.parse(
    docker("exec", `${prefix}-pg`, "psql", "-U", "postgres", "-d", "datomic", "-Atc", query),
  );
  return {
    at: Date.now(),
    databaseBytes: size,
    volumeBytes: physical,
    freeBytes: available(vol),
    postgres,
  };
}
function groupOf(pid: number) {
  const cg = fs.readFileSync(`/proc/${pid}/cgroup`, "utf8").match(/^0::(\/.*)$/m);
  assert(cg);
  return path.join("/sys/fs/cgroup", cg[1]!);
}
// [DX-SCALE1] Why: the frozen replay can compute for up to 90 minutes before it writes any output. Rejected: killing a working oracle at the idle timeout, or treating ordinary process existence as progress.
function replayCpu(oracleDir: string, scopes: readonly string[]) {
  const cli = path.join(oracleDir, "lab/oracles/replay/cli.py");
  const cases = new Set(scopes.map((dir) => path.join(dir, "oracle-case.json")));
  const samples = [];
  for (const pid of fs
    .readFileSync(path.join(groupOf(process.pid), "cgroup.procs"), "utf8")
    .trim()
    .split(/\s+/)) {
    try {
      const args = fs.readFileSync("/proc/" + pid + "/cmdline", "utf8").split("\0");
      const i = args.indexOf(cli);
      if (i < 1 || args[i - 1] !== "-I" || !cases.has(args[i + 1]!)) continue;
      const stat = fs.readFileSync("/proc/" + pid + "/stat", "utf8");
      const fields = stat
        .slice(stat.lastIndexOf(")") + 2)
        .trim()
        .split(/\s+/);
      samples.push([pid, fields[19], Number(fields[11]) + Number(fields[12])].join("/"));
    } catch (e: any) {
      if (e.code !== "ENOENT" && e.code !== "ESRCH") throw e;
    }
  }
  return samples.sort().join(",");
}
function placement(prefix: string) {
  return Object.fromEntries(
    roles.map((role) => {
      const [s] = JSON.parse(docker("inspect", `${prefix}-${role}`));
      const grp = groupOf(s.State.Pid);
      return [
        role,
        {
          id: s.Id,
          image: s.Image,
          cpus: s.HostConfig.CpusetCpus,
          memory: s.HostConfig.Memory,
          cgroup: grp,
          address: s.NetworkSettings.Networks[`${prefix}-net`].IPAddress,
        },
      ];
    }),
  );
}
function health(
  dir: string,
  prefix: string,
  engines: ReturnType<typeof placement>,
  pids: number[],
) {
  const members = Object.fromEntries(
    Object.entries(engines).map(([role, e]) => {
      const read = (name: string) => fs.readFileSync(path.join(e.cgroup, name), "utf8").trim();
      return [
        role,
        {
          current: Number(read("memory.current")),
          peak: Number(read("memory.peak")),
          cpu: read("cpu.stat"),
          events: read("memory.events"),
          io: read("io.stat"),
        },
      ];
    }),
  );
  const clients = pids.map((pid) => {
    try {
      return (
        Number(/^VmHWM:\s+(\d+)/m.exec(fs.readFileSync(`/proc/${pid}/status`, "utf8"))?.[1] ?? 0) *
        1024
      );
    } catch {
      return 0;
    }
  });
  return {
    at: Date.now(),
    prefix,
    members,
    clients,
    clientGroupBytes: Number(
      fs.readFileSync(path.join(groupOf(process.pid), "memory.current"), "utf8"),
    ),
    availableMemory: memory(),
    freeBytes: available(dir),
  };
}
function childrenInventory(prefix: string) {
  return {
    containers: docker("ps", "-a", "--format", "{{.Names}}")
      .split("\n")
      .filter((n) => n.startsWith(`${prefix}-`)),
    volumes: docker("volume", "ls", "--format", "{{.Name}}")
      .split("\n")
      .filter((n) => n.startsWith(`${prefix}-`)),
    networks: docker("network", "ls", "--format", "{{.Name}}")
      .split("\n")
      .filter((n) => n.startsWith(`${prefix}-`)),
  };
}
function clean(dir: string, prefix: string) {
  const id = get(path.join(dir, "attempt.json"));
  assert.equal(id.slot, prefix);
  assert.equal(id.tag, path.basename(dir));
  const before = childrenInventory(prefix);
  fs.mkdirSync(path.join(dir, "cleanup"), { recursive: true });
  for (const n of before.containers) {
    assert(
      [...roles, "extract", "health"].some((s) => n === `${prefix}-${s}`),
      `Unexpected owned container ${n}`,
    );
    fs.writeFileSync(
      path.join(dir, "cleanup", `${n}-state.json`),
      docker("inspect", "--format", "{{json .State}}", n),
    );
    const result = spawnResult("docker", ["logs", "--tail", "80", n]);
    fs.writeFileSync(path.join(dir, "cleanup", `${n}.log`), result);
    if (docker("inspect", "--format", "{{.State.Running}}", n) === "true")
      docker("stop", "--time", "15", n);
    docker("rm", n);
  }
  for (const n of before.networks) {
    assert.equal(n, `${prefix}-net`);
    docker("network", "rm", n);
  }
  for (const n of before.volumes) {
    assert.equal(n, `${prefix}-pg-data`);
    docker("volume", "rm", n);
  }
  const after = childrenInventory(prefix);
  assert(Object.values(after).every((xs) => !xs.length));
  fs.writeFileSync(
    path.join(dir, "cleanup", "inventory.json"),
    JSON.stringify({ at: Date.now(), before, after }),
  );
}
async function arm(item: number, tag: string, mode: DeepIdentity["arm"]) {
  const dir = path.join(root, tag),
    attempt = get(path.join(dir, "attempt.json"));
  const spec = campaignItem(item, attempt.layout);
  assert.deepEqual(attempt.spec, spec);
  const small = mode === "small",
    smallSeparate = small && attempt.layout !== "pooled";
  const prefix = attempt.slot,
    source = call("git", ["rev-parse", "HEAD"]);
  assert.equal(source, attempt.source);
  const rawRoot = path.join(repo, "runs", "DX-SCALE1", tag),
    barrier = path.join(dir, "barrier");
  fs.mkdirSync(rawRoot, { recursive: true });
  fs.mkdirSync(barrier);
  const oracleDir = path.join(dir, "oracle");
  write(path.join(dir, "replay-source.json"), stageReplay(repo, oracleDir));
  write(path.join(dir, "source.json"), sourceInventory(repo));
  const budget = attempt.capacity;
  assert(attempt.boundedTrial || (mode === "seed" ? budget.fitsSeed : budget.fitsLive));
  status(dir, "starting stack");
  const env = {
    ...process.env,
    DX_BARE_METAL: "1",
    DX_BARE_METAL_ROOT: dir,
    DX_STACK_EVIDENCE: path.join(dir, "engines"),
    DX_STACK_WAIT_FOR_TRANSACTOR: "1",
    DX_QUIET_LOGS: "1",
    DX_NATIVE_SETTINGS_READBACK: "1",
    TRIPLEX_TRACE_LEVEL: "summary",
    TRIPLEX_TRACE_RUN: prefix,
    TRIPLEX_TRACE_SLOT: prefix,
    TRIPLEX_TRACE_SOURCE: source,
    TRIPLEX_TRACE_NODE: "1",
    TRIPLEX_TRACE_GATEWAY: "1",
    DX_IDLE_SENTINEL: "0",
    DX_GW_WRITE_MEMORY: "6g",
    DX_GW_READ_MEMORY: "6g",
    DX_GW_WRITE_JAVA_OPTS:
      "-Xms256m -Xmx4g -Ddatomic.objectCacheMax=1536m -Xlog:gc=info:file=/trace/gw-w-gc.log",
    DX_GW_READ_JAVA_OPTS:
      "-Xms256m -Xmx4g -Ddatomic.objectCacheMax=1536m -Xlog:gc=info:file=/trace/gw-r-gc.log",
  };
  execFileSync(
    "bash",
    [
      "lab/experiments/EXP-DX1/stack/up.sh",
      prefix,
      "--no-publish",
      "--cpus-tx",
      planCpus.transactor,
      "--cpus-pg",
      planCpus.postgres,
      "--cpus-gw-write",
      planCpus.writerGateway,
      "--cpus-gw-read",
      planCpus.readerGateway,
      "--pg-memory",
      "6g",
      "--tx-memory",
      "6g",
      "--tx-java-opts",
      "-Xms256m -Xmx5g -XX:+UseG1GC -Xlog:gc=info:file=/trace/tx-gc.log",
      "--object-cache-max",
      "2560m",
      "--pg-settings",
      "-c shared_buffers=1GB -c max_wal_size=8GB -c synchronous_commit=on -c fsync=on -c full_page_writes=on -c track_io_timing=on -c track_wal_io_timing=on",
    ],
    { env, cwd: repo, stdio: "inherit", timeout: 480000 },
  );
  const engines = placement(prefix);
  let before = snapshot(prefix);
  for (const [role, cpus] of Object.entries({
    pg: planCpus.postgres,
    tx: planCpus.transactor,
    "gw-w": planCpus.writerGateway,
    "gw-r": planCpus.readerGateway,
  }))
    assert.equal(engines[role].cpus, cpus);
  write(path.join(dir, "placement.json"), engines);
  write(path.join(dir, "disk-before.json"), before);
  const binding = { source, slot: prefix, nonce: attempt.nonce };
  const imageTrial = attempt.layout === "pooled" && item === 5;
  const restoring = imageTrial && !!attempt.seedImageTag;
  if (spec.people * spec.scopes >= 100000) {
    status(dir, "checking 1000 subjects before the large seed");
    try {
      const proof = guardSeed(path.join(dir, "act2-preflight"), binding, {
        ...env,
        DATOMIC_URL: `http://${engines["gw-w"].address}:8080`,
        TRIPLEX_DATOMIC_LAYOUT: "lean",
        TX2_SWEEP_STRICT: "1",
        TRIPLEX_TRACE_DIR: path.join(dir, "act2-preflight-trace"),
      });
      write(path.join(dir, "preflight.json"), proof);
      // [DX-ACT2] Why: the probe writes a separate native database on the measured stack. Account for those bytes before a cold seed; restoration replaces the probe database. Rejected: attributing the probe to the deep population.
      const after = snapshot(prefix);
      write(path.join(dir, "preflight-disk.json"), { binding, before, after });
      if (!restoring) before = after;
    } catch (e) {
      const reason = String(e);
      write(path.join(dir, "preflight-stop.json"), { ...binding, reason });
      status(dir, "preflight stopped", { reason });
      throw e;
    }
  }
  if (restoring) {
    const dest: DeepIdentity = {
      ...binding,
      account: 0,
      people: spec.people,
      arm: mode,
      tenant: { study: "million", topology: "pooled", physical: 0 },
    };
    status(dir, "restoring the verified million-person seed", { tag: attempt.seedImageTag });
    await restoreSeed(dir, attempt.seedImageTag, dest, engines);
  }
  if (small) {
    status(dir, "measuring empty database opens");
    const { openSmallScopes } = await import("./small-host.ts");
    if (!(await openSmallScopes(dir, binding, engines, () => snapshot(prefix), attempt.layout))) {
      status(dir, "database open limit observed");
      return;
    }
  }
  const raw: string[] = [],
    pids: number[] = [],
    exit: (number | null)[] = [];
  const start = Date.now(),
    refs = attempt.baselineTag;
  status(dir, "parallel seed", { scopeCount: spec.scopes });
  const cgroups = Object.values(engines)
    .map((e: any) => `${prefix}-${Object.keys(engines).find((k) => engines[k] === e)}=${e.cgroup}`)
    .join(",");
  const scheduledScopes = mode === "seed" ? budget.seedScopeLimit : spec.scopes;
  const launchClient = (i: number) => {
    const out = path.join(rawRoot, `s${i}`);
    fs.mkdirSync(out);
    raw.push(out);
    const fd = fs.openSync(path.join(out, "driver.log"), "wx");
    exit.push(null);
    const tenant: TenantSpec | undefined = attempt.layout
      ? { study: attempt.spec.study, topology: attempt.layout, physical: i }
      : undefined;
    const identity: DeepIdentity = {
      ...(tenant ? { tenant } : {}),
      account: i,
      people: tenant
        ? tenantAccounts(tenant).reduce((n, a) => n + a.people, 0)
        : small
          ? smallPeople(i)
          : spec.people,
      source,
      slot: prefix,
      nonce: attempt.nonce,
      arm: mode,
    };
    write(path.join(out, "identity.json"), identity);
    const args = [
      "-c",
      [planCpus.senders, planCpus.readers].join(","),
      process.execPath,
      ...(mode === "activation" || tenant?.study === "interference"
        ? ["--import", path.join(repo, "lab/experiments/EXP-DX1/scale1/evaluator-placement.mjs")]
        : []),
      "--import",
      "tsx",
      "lab/bench/driver.ts",
      "--lane",
      "datomic",
      "--composition",
      "reach",
      "--profile",
      "deep",
      "--rung",
      tenant
        ? tenantRung(tenant)
        : small
          ? smallRung(i)
          : spec.people === 10000
            ? "deep-10k"
            : "deep-100k",
      "--output",
      path.join(out, "ns-report.json"),
      "--oracle-root",
      oracleDir,
      "--deep-account",
      String(i),
      "--deep-nonce",
      attempt.nonce,
      "--deep-barrier",
      barrier,
      "--seed",
      deepSeed(i),
      "--read-path",
      "replica",
      "--reader-threads",
      smallSeparate && i !== 0 ? "1" : "6",
      "--seed-batch-facts",
      "2000",
      "--replica-history-mib",
      small ? "8" : "192",
      "--replica-world-cache-mib",
      small ? "4" : "32",
      "--replica-fallback-thread",
      "worker",
      "--reader-basis-wire",
      "delta",
      "--seed-budget-s",
      String(attempt.ceiling),
      "--expected-state-retention",
      mode === "seed" ? "heap" : "worker-journal",
      "--receipt-capture",
      mode === "seed" ? "sender" : "replica-worker",
    ];
    if (restoring) args.push("--verified-seed-image", path.join(dir, "restored-seed.json"));
    if (tenant) args.push("--tenant-study", tenant.study, "--tenant-topology", tenant.topology);
    if (small)
      args.push(
        ...(tenant ? [] : ["--deep-small-scopes"]),
        "--oracle-rate",
        "0.15",
        "--reader-entity-cache-mib",
        "8",
      );
    if (mode === "zero") args.push("--zero-readers");
    if (mode === "activation") args.push("--deep-activation");
    if (mode === "interference" && !tenant) args.push("--deep-interference");
    if (mode === "seed") args.push("--deep-seed-only");
    if (mode === "reader")
      args.push(
        "--baseline-writes",
        path.join(repo, "runs", "DX-SCALE1", refs, `s${i}`, "ns-writes.jsonl"),
      );
    // [DX-SCALE1] Why: the sentinel must have the same per-isolate heap in its one- and ten-account arms. Rejected: shrinking only the loaded account and attributing its extra GC to neighbor traffic.
    const heapMiB = smallSeparate
      ? i === 0
        ? 1536
        : 768
      : mode === "seed"
        ? Math.min(
            6144,
            Math.floor(((attempt.clientBudget / budget.seedParallelism) * 0.75) / 1024 ** 2),
          )
        : spec.people === 10000
          ? 6144
          : 32768;
    write(path.join(out, "client-limits.json"), {
      heapMiB,
      sharedCgroupBytes: attempt.clientBudget,
      readerWorkers: smallSeparate && i !== 0 ? 1 : 6,
      cpus: planCpus,
    });
    const child = spawn("taskset", args, {
      cwd: repo,
      stdio: ["ignore", fd, fd],
      env: {
        ...env,
        ...(mode === "activation" || tenant?.study === "interference"
          ? { TX2_W0_OUTBOX_NAMESPACE: "page-v1~deep-" + attempt.nonce + "-s" + i }
          : {}),
        TRIPLEX_TRACE_DIR: path.join(out, "trace"),
        TRIPLEX_DATOMIC_LAYOUT: "lean",
        DATOMIC_URL: `http://${engines["gw-w"].address}:8080`,
        DATOMIC_READ_URLS: `http://${engines["gw-r"].address}:8080`,
        TX2_ENGINE_CGROUPS: cgroups,
        TX2_ENGINE_CPUS: "5",
        DX_MODEL_COMPACT: "1",
        DX_NATIVE_GATES: "0",
        DX_PUBLICATION_MODE: "worker",
        DX_SERVER_RECORD_TIME: "1",
        DX_PUBLICATION_WAIT_MS: "30000",
        DX_STRICT_RECORD_CLOCKS: "1",
        TRIPLEX_NODE_MAIN_CPUS: planCpus.senders,
        TRIPLEX_NODE_WORKER_CPUS: planCpus.readers,
        TRIPLEX_BENCH_SPILL_MAX_BYTES: String(
          Math.floor(i === 0 ? (budget.sentinelSpill ?? budget.spillPer) : budget.spillPer),
        ),
        NODE_OPTIONS: `--max-old-space-size=${heapMiB}`,
      },
    });
    fs.closeSync(fd);
    assert(child.pid);
    pids.push(child.pid);
    child.once("error", () => {
      exit[i] = 127;
    });
    child.once("exit", (code) => {
      exit[i] = code ?? 128;
    });
  };
  const launchWaiting = () => {
    const cap = mode === "seed" ? budget.seedParallelism : spec.scopes;
    const loading = () =>
      small
        ? raw.filter(
            (r, i) => exit[i] === null && !fs.existsSync(path.join(r, "seed-observed.json")),
          ).length
        : exit.filter((e) => e === null).length;
    while (raw.length < scheduledScopes && loading() < (small ? 4 : cap)) launchClient(raw.length);
  };
  launchWaiting();
  let commonStart = 0,
    disk: any,
    peak = 0,
    seedPeak = 0,
    sharedPeak = 0,
    clientGroupPeak = 0,
    simultaneousPeak = 0,
    lastAdvance = Date.now(),
    lastSignal = "";
  let sealing: Promise<void> | undefined,
    sealed = false,
    imageError: unknown;
  try {
    while (exit.some((e) => e === null) || raw.length < scheduledScopes) {
      launchWaiting();
      const sample = health(dir, prefix, engines, pids);
      fs.appendFileSync(path.join(dir, "resources.jsonl"), JSON.stringify(sample) + "\n");
      peak = Math.max(peak, ...sample.clients);
      clientGroupPeak = Math.max(clientGroupPeak, sample.clientGroupBytes);
      simultaneousPeak = Math.max(
        simultaneousPeak,
        sample.clientGroupBytes + Object.values(sample.members).reduce((n, m) => n + m.current, 0),
      );
      for (const [i, bytes] of sample.clients.entries())
        if (!fs.existsSync(path.join(raw[i]!, "seed-observed.json")))
          seedPeak = Math.max(seedPeak, bytes);
      sharedPeak = Math.max(
        sharedPeak,
        Object.values(sample.members).reduce((sum, e) => sum + e.current, 0),
      );
      const signal = raw
        .map((r) =>
          [
            "driver.log",
            "seed-progress.json",
            "ns-writes.jsonl",
            "ns-read-progress.json",
            "ns-report.json",
            "deep-R1-evaluations.jsonl",
            "deep-R2-evaluations.jsonl",
            "oracle-expected.json",
          ]
            .map((f) => fs.statSync(path.join(r, f), { throwIfNoEntry: false })?.mtimeMs ?? 0)
            .join("/"),
        )
        .join("|");
      if (imageError) throw imageError;
      const archiveProgress =
        imageTrial && mode === "zero"
          ? (fs.statSync(path.join(dir, "seed.pgdump.partial"), { throwIfNoEntry: false })?.size ??
            0)
          : 0;
      const observed = signal + "|" + replayCpu(oracleDir, raw) + "|" + archiveProgress;
      if (observed !== lastSignal) {
        lastSignal = observed;
        lastAdvance = Date.now();
      }
      if (Date.now() - lastAdvance > 15 * 60000)
        throw Error("15 minutes without seed, phase, verification or evidence progress");
      if (
        !disk &&
        raw.length === scheduledScopes &&
        raw.every((r) => fs.existsSync(path.join(r, "seed-observed.json")))
      ) {
        const now = snapshot(prefix),
          w = raw.map((r) => get(path.join(r, "seed-observed.json")));
        assert(
          w.every(
            (s, i) =>
              s.identity.nonce === attempt.nonce &&
              s.identity.source === source &&
              s.identity.slot === prefix &&
              s.identity.account === i,
          ),
        );
        const facts = w.reduce((n, s) => n + s.seed.facts, 0);
        disk = {
          before,
          after: now,
          facts,
          bytesPerFact: (now.databaseBytes - before.databaseBytes) / facts,
          volumeBytesPerFact: (now.volumeBytes - before.volumeBytes) / facts,
        };
        write(path.join(dir, "seed-disk.json"), disk);
        if (imageTrial && mode === "zero") {
          status(dir, "sealing the verified PostgreSQL seed", { position: w[0].seed.position });
          sealing = sealSeed(dir, prefix, w[0], engines.pg.id)
            .then(() => {
              sealed = true;
            })
            .catch((e) => {
              imageError = e;
            });
        }
      }
      if (
        !commonStart &&
        (!sealing || sealed) &&
        mode !== "seed" &&
        raw.length === scheduledScopes &&
        raw.every((_, i) => fs.existsSync(path.join(barrier, `s${i}.ready.json`)))
      ) {
        assert(disk);
        const scopes: Record<string, unknown> = {};
        for (let i = 0; i < spec.scopes; i++) {
          const { identity, ...ready } = get(path.join(barrier, `s${i}.ready.json`));
          assert.deepEqual(identity, get(path.join(raw[i]!, "identity.json")));
          assert.deepEqual({ ...ready, identity }, get(path.join(raw[i]!, "seed-observed.json")));
          scopes[`s${i}`] = ready;
        }
        commonStart = Date.now() + (small ? 180000 : 60000);
        write(path.join(barrier, "go.tmp"), {
          nonce: attempt.nonce,
          slot: prefix,
          source,
          scopes,
          start: commonStart,
        });
        fs.renameSync(path.join(barrier, "go.tmp"), path.join(barrier, "go.json"));
        status(dir, "simultaneous traffic", { commonStart, mode });
      }
      if (commonStart && !fs.existsSync(path.join(barrier, "release.json"))) {
        assert(
          Date.now() < commonStart - 200,
          "Not every deep scope armed before the shared start",
        );
        if (raw.every((_, i) => fs.existsSync(path.join(barrier, `s${i}.armed.json`))))
          releaseDeepStart(
            barrier,
            raw.map((r) => get(path.join(r, "identity.json"))),
            commonStart,
          );
      }
      if (!commonStart && mode !== "seed" && exit.some((e) => e !== null))
        throw Error("An account exited before the shared barrier");
      if (sample.freeBytes < 15 * GiB) throw Error("Disk reached the 15 GiB retention floor");
      await sleep(3000);
    }
  } finally {
    write(path.join(dir, "processes.json"), {
      started: start,
      ended: Date.now(),
      pids,
      exits: exit,
      peak,
      seedPeak,
      sharedPeak,
      commonStart,
      clientGroupPeak,
      simultaneousPeak,
    });
  }
  if (
    !disk &&
    mode === "seed" &&
    raw.every((r) => fs.existsSync(path.join(r, "seed-observed.json")))
  ) {
    const after = snapshot(prefix),
      facts = scheduledScopes * deepPopulation(spec.people).facts;
    disk = {
      before,
      after,
      facts,
      bytesPerFact: (after.databaseBytes - before.databaseBytes) / facts,
      volumeBytesPerFact: (after.volumeBytes - before.volumeBytes) / facts,
    };
    write(path.join(dir, "seed-disk.json"), disk);
  }
  write(path.join(dir, "disk-terminal.json"), snapshot(prefix));
  assert(disk, "No completed seed measurement");
  if (mode === "seed") {
    assert(exit.every((e) => e === 0));
    status(dir, "seed complete", {
      facts: disk.facts,
      target: spec.scopes,
      seeded: scheduledScopes,
    });
    return;
  }
  status(dir, "checking evidence");
  const found: ScopeMeasurement[] = [];
  for (let i = 0; i < raw.length; i++)
    found.push(
      await readScope(
        raw[i]!,
        get(path.join(raw[i]!, "identity.json")),
        commonStart,
        exit[i] ?? 128,
      ),
    );
  let previous: Quantities | undefined,
    baselineInvalid: string | null = null;
  if (mode === "reader") {
    const zeroDir = path.join(root, refs),
      zero = get(path.join(zeroDir, "attempt.json")),
      processes = get(path.join(zeroDir, "processes.json")),
      summary = get(path.join(zeroDir, "summary.json"));
    assert(zero.source === source && zero.nonce !== attempt.nonce && zero.mode === "zero");
    const rows: ScopeMeasurement[] = [];
    for (let i = 0; i < spec.scopes; i++) {
      const input = path.join(repo, "runs", "DX-SCALE1", refs, `s${i}`),
        expected = {
          account: i,
          people: spec.people,
          ...(found[i]!.id.tenant ? { tenant: found[i]!.id.tenant } : {}),
          source,
          nonce: zero.nonce,
          slot: zero.slot,
          arm: "zero" as const,
        };
      const row = await readScope(input, expected, processes.commonStart, processes.exits[i]);
      assert.deepEqual(row.hashes, summary.perScope[i].hashes);
      assert.equal(row.hashes.writes, found[i]!.report.matchedBaseline.sha256);
      rows.push(row);
    }
    const control = cohort(rows, spec.scopes);
    previous = control.values;
    baselineInvalid = control.summary.invalid.join(", ") || null;
  }
  if (small) {
    status(dir, "measuring recovery across 100 databases");
    await (
      await import("./small-host.ts")
    ).recoverSmallScopes(dir, binding, engines, attempt.layout);
  }
  const measured = cohort(found, spec.scopes, previous, baselineInvalid);
  const spillBytes = Math.max(
    ...found.map((s) =>
      Number(
        s.report.observationStorage?.diskBudget?.peakBytes ??
          s.report.observationStorage?.encodedBytes ??
          0,
      ),
    ),
  );
  write(path.join(dir, "summary.json"), measured.summary);
  write(
    path.join(dir, "anatomy.json"),
    measured.summary.perScope.map((s) => ({
      scope: s.scope,
      account: s.account,
      anatomy: s.anatomy,
      hashes: s.hashes,
    })),
  );
  write(path.join(dir, "sizing.json"), {
    people: spec.people,
    facts: disk.facts / spec.scopes,
    allocatedBytes:
      Math.max(
        disk.after.volumeBytes - disk.before.volumeBytes,
        disk.after.databaseBytes - disk.before.databaseBytes,
      ) / spec.scopes,
    driverPeakBytes: Math.max(peak, Math.ceil(clientGroupPeak / spec.scopes)),
    simultaneousPeakBytes: simultaneousPeak,
    seedDriverPeakBytes: seedPeak,
    sharedPeakBytes: sharedPeak,
    spillBytes,
  });
  status(dir, "measured", { invalid: measured.summary.invalid, exits: exit });
}

function partial(dir: string, tag: string) {
  const raw = path.join(repo, "runs", "DX-SCALE1", tag),
    scopes = [];
  if (fs.existsSync(raw))
    for (const name of fs.readdirSync(raw).filter((n) => /^s(?:0|[1-9][0-9]?)$/.test(n))) {
      const r = path.join(raw, name);
      const file = path.join(r, "ns-report.json"),
        log = path.join(r, "driver.log"),
        f = fs.existsSync(file) ? get(file) : {};
      let last = "";
      if (fs.existsSync(log)) {
        const fd = fs.openSync(log, "r"),
          size = fs.fstatSync(fd).size,
          b = Buffer.alloc(Math.min(size, 32768));
        try {
          fs.readSync(fd, b, 0, b.length, size - b.length);
          last = b.toString().split("\n").filter(Boolean).slice(-6).join("\n");
        } finally {
          fs.closeSync(fd);
        }
      }
      scopes.push({
        scope: name,
        identity: fs.existsSync(path.join(r, "identity.json"))
          ? get(path.join(r, "identity.json"))
          : null,
        progress: fs.existsSync(path.join(r, "seed-progress.json"))
          ? get(path.join(r, "seed-progress.json"))
          : null,
        status: f.status ?? "preparing",
        facts: f.seed?.assertions,
        people: f.seed?.seededSubjects,
        latest: last,
        error: f.error,
      });
    }
  return { tag, scopes };
}
function budgetFor(item: number, dir: string, mode: string, prior?: string) {
  const s = campaignItem(item, getopt("account-layout") as Topology | undefined);
  let observed;
  if (prior) {
    assert(/^[a-z0-9-]{3,42}$/.test(prior));
    const p = path.join(root, prior),
      a = get(path.join(p, "attempt.json"));
    observed = get(path.join(p, "sizing.json"));
    assert.equal(get(path.join(p, "summary.json")).profile, "deep/1");
    observed = { ...observed, referenceTag: prior, referenceSource: a.source };
    assert.equal(a.spec.scopes, 1);
    assert(["zero", "reader"].includes(a.mode));
    assert.equal(observed.people, a.spec.people);
    assert.equal(observed.facts, deepPopulation(a.spec.people).facts);
    assert(
      [observed.driverPeakBytes, observed.allocatedBytes, observed.sharedPeakBytes].every(
        (x) => Number.isFinite(x) && x > 0,
      ),
    );
    assert(get(path.join(p, "terminal.json")).cleanup === true);
  }
  const volumeRoot = docker("info", "--format", "{{.DockerRootDir}}");
  return capacity(
    s.people,
    s.scopes,
    { memory: memory(), disk: Math.min(available(dir), available(volumeRoot)) },
    observed,
    mode,
    typeof s.facts === "number" ? s.facts / s.scopes : undefined,
  );
}
async function terminal(dir: string, tag: string, prefix: string, refusal?: string) {
  const entry = get(path.join(dir, "attempt.json"));
  const service = refusal ?? process.env.SERVICE_RESULT ?? "unavailable";
  clean(dir, prefix);
  const seedDir = path.join(repo, "runs", "DX-SCALE1", tag, "s0");
  if (
    entry.item === 5 &&
    entry.layout === "pooled" &&
    entry.mode === "zero" &&
    fs.existsSync(path.join(seedDir, "identity.json"))
  ) {
    const identity = get(path.join(seedDir, "identity.json"));
    assert(
      identity.source === entry.source &&
        identity.nonce === entry.nonce &&
        identity.slot === prefix,
    );
    write(
      path.join(dir, "seed-anatomy.json"),
      await (await import("./seed-anatomy.ts")).seedAnatomy(dir, seedDir, identity),
    );
  }
  write(path.join(dir, "resource-summary.json"), await resources(dir, prefix, entry.source));
  const state = partial(dir, tag);
  write(path.join(dir, "partial.json"), state);
  const raw = path.join(repo, "runs", "DX-SCALE1", tag),
    compact = path.join(dir, "transfer");
  fs.mkdirSync(compact, { recursive: true });
  for (const file of [
    "attempt.json",
    "replay-source.json",
    "preflight.json",
    "preflight-stop.json",
    "preflight-disk.json",
    "source.json",
    "placement.json",
    "disk-before.json",
    "disk-terminal.json",
    "seed-disk.json",
    "processes.json",
    "summary.json",
    "anatomy.json",
    "sizing.json",
    "resource-summary.json",
    "database-limit.json",
    "open-scopes.json",
    "seed-anatomy.json",
    "seed-image.json",
    "restored-seed.json",
    "restart.json",
    "pre-restart.json",
    "partial.json",
    "STATUS.json",
  ]) {
    if (fs.existsSync(path.join(dir, file)))
      fs.copyFileSync(path.join(dir, file), path.join(compact, file));
  }
  fs.copyFileSync(path.join(dir, "cleanup/inventory.json"), path.join(compact, "cleanup.json"));
  const sources: string[] = [];
  if (fs.existsSync(path.join(dir, "scope-footprint"))) sources.push("-C", dir, "scope-footprint");
  if (fs.existsSync(raw)) {
    for (const name of fs.readdirSync(raw).filter((n) => /^s(?:0|[1-9][0-9]?)$/.test(n))) {
      const sub = path.join(compact, name);
      fs.mkdirSync(sub);
      for (const file of [
        "ns-report.json",
        "seed-observed.json",
        "identity.json",
        "client-limits.json",
        "tenant-observations.json",
      ])
        if (fs.existsSync(path.join(raw, name, file)))
          fs.copyFileSync(path.join(raw, name, file), path.join(sub, file));
    }
    sources.push("-C", path.dirname(raw), path.basename(raw));
  }
  const engineEvidence = path.join(dir, "engines", prefix, "trace");
  if (fs.existsSync(engineEvidence)) sources.push("-C", path.dirname(engineEvidence), "trace");
  if (fs.existsSync(path.join(dir, "resources.jsonl"))) sources.push("-C", dir, "resources.jsonl");
  let rawArchive = null,
    rawArchiveError: string | null = null;
  const seals: Record<string, Awaited<ReturnType<typeof compressTraces>>> = {};
  try {
    if (fs.existsSync(raw))
      for (const name of fs.readdirSync(raw).filter((n) => /^s(?:0|[1-9][0-9]?)$/.test(n)))
        seals[name] = await compressTraces(path.join(raw, name, "trace"));
    seals.engines = await compressTraces(path.join(engineEvidence, "raw"));
    if (sources.length) {
      const f = path.join(dir, "raw.tar.zst"),
        required = [raw, engineEvidence]
          .filter((p) => fs.existsSync(p))
          .reduce(
            (n, p) => n + Number(call("du", ["-s", "--apparent-size", "-B1", p]).split(/\s/)[0]),
            0,
          );
      assert(
        available(dir) > required * 1.02 + 15 * GiB,
        "Insufficient disk to duplicate the compressed raw data into a transfer archive",
      );
      call("tar", ["-I", "zstd -1 -T2", "-cf", f, ...sources], 3600000);
      call("zstd", ["-tq", f], 3600000);
      rawArchive = { name: "raw.tar.zst", bytes: fs.statSync(f).size, sha256: await fileHash(f) };
    }
  } catch (e) {
    rawArchiveError = String(e);
  }
  write(path.join(compact, "raw-retention.json"), {
    source: entry.source,
    nonce: entry.nonce,
    seals,
    rawArchive,
    rawArchiveError,
  });
  const summaryFile = path.join(dir, "summary.json"),
    sum = fs.existsSync(summaryFile) ? get(summaryFile) : null;
  const outcome = {
    tag,
    slot: prefix,
    source: entry.source,
    nonce: entry.nonce,
    mode: entry.mode,
    cleanup: true,
    ...(fs.existsSync(path.join(dir, "preflight-stop.json"))
      ? { stopReason: get(path.join(dir, "preflight-stop.json")).reason }
      : {}),
    service,
    endedAt: new Date().toISOString(),
    scopeReports: sum?.scopeCount ?? 0,
    invalid: sum?.invalid ?? null,
    rawArchive,
    rawArchiveError,
  };
  write(path.join(dir, "terminal.json"), outcome);
  write(path.join(compact, "terminal.json"), outcome);
  const summary = path.join(dir, "summaries.tar.zst");
  call("tar", ["-I", "zstd -3", "-cf", summary, "-C", compact, "."], 600000);
  call("zstd", ["-tq", summary], 600000);
  write(path.join(dir, "transfer.json"), {
    tag,
    source: entry.source,
    nonce: entry.nonce,
    summary: {
      name: "summaries.tar.zst",
      bytes: fs.statSync(summary).size,
      sha256: await fileHash(summary),
    },
    raw: rawArchive,
    summaryFiles: summaryFiles(compact),
  });
  status(dir, outcome.stopReason ? "preflight stopped" : "finished", outcome);
}
async function main() {
  const [op, n, tag, mode] = process.argv.slice(2);
  const item = Number(n);
  if (op === "plan") {
    console.log(
      JSON.stringify(
        {
          items: [
            { item: 1, layouts: [campaignItem(1)], arms: ["zero", "reader"] },
            { item: 2, layouts: [campaignItem(2)], arms: ["zero", "reader", "activation"] },
            ...([3, 4] as const).map((i) => ({
              item: i,
              layouts: [campaignItem(i, "pooled"), campaignItem(i, "separate")],
              arms: [i === 3 ? "interference" : "small"],
            })),
            {
              item: 5,
              layouts: [campaignItem(5, "pooled")],
              arms: ["zero", "reader", "activation"],
              seedImages: 1,
            },
          ],
          placement: planCpus,
          burst: "50x for 60 s at 120 + 600k",
          readersPerScope: [1, 4, 16, 64, 256, 1024],
          activationReadersPerScope: 64,
          offerSeconds: 5910,
        },
        null,
        2,
      ),
    );
    return;
  }
  physical();
  assert(
    Number.isSafeInteger(item) &&
      item >= 1 &&
      item <= 5 &&
      tag &&
      /^[a-z][a-z0-9-]{2,40}$/.test(tag) &&
      mode &&
      ["zero", "reader", "activation", "seed", "interference", "small"].includes(mode),
  );
  assert((item === 4) === (mode === "small"), "Item 4 measures the heterogeneous small population");
  assert(mode !== "interference" || item === 3);
  const prefix = `tx2-dxscale1-${tag}`,
    dir = path.join(root, tag),
    source = call("git", ["rev-parse", "HEAD"]);
  if (op === "run") {
    await arm(item, tag, mode as DeepIdentity["arm"]);
    return;
  }
  if (op === "cleanup") {
    await terminal(dir, tag, prefix);
    return;
  }
  assert.equal(op, "launch");
  released();
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  assert(!fs.existsSync(dir));
  if (process.env.DX_SCALE1_RUNTIME_REPO)
    assert.equal(fs.realpathSync(repo), path.join(root, "build-" + source, "repository"));
  const sourceGit = ["-c", "credential.helper=", "-c", "http.extraHeader="];
  // [DX-SCALE1] Why: a reader must execute the identical public revision as its zero arm even if the other bench publishes during the 5,910-second trace. Rejected: mixing sender or guard versions inside a pair, or silently ignoring upstream changes.
  const originHeads: Record<string, { head: string; changes: string[] }> = {};
  for (const ref of ["exp/DX-BM1-bare-metal", "exp/DX-ACT1-activation"]) {
    call("git", [...sourceGit, "fetch", "origin", "refs/heads/" + ref], 60000);
    const head = call("git", ["rev-parse", "FETCH_HEAD"]),
      ancestor = call("git", ["merge-base", head, source]);
    const changes =
      ancestor === head
        ? []
        : call("git", ["diff", "--name-only", ancestor, head]).split("\n").filter(Boolean);
    const paired =
      mode === "reader" &&
      getopt("baseline") &&
      /^[a-z][a-z0-9-]{2,40}$/.test(getopt("baseline")!) &&
      get(path.join(root, getopt("baseline")!, "attempt.json")).source === source;
    assert(
      paired || changes.every((n) => /\.md$|SHA256SUMS$|\.sha256$|\.test\.[cm]?ts$/.test(n)),
      "New upstream executable inputs require an integrated source revision: " + ref,
    );
    originHeads[ref] = { head, changes };
  }
  assert.equal(call("git", ["status", "--porcelain", "--untracked-files=no"]), "");
  for (const xs of Object.values(childrenInventory(prefix))) assert.equal(xs.length, 0);
  const topology = call("lscpu", ["-p=CPU,CORE,SOCKET"])
    .split("\n")
    .filter((l) => !l.startsWith("#"))
    .map((l) => l.split(","));
  const physicalCores = new Map(
    topology.map(([cpu, core, socket]) => [Number(cpu), `${socket}/${core}`]),
  );
  const selected = Array.from({ length: 12 }, (_, i) => physicalCores.get(i));
  assert(
    selected.every(Boolean) && new Set(selected).size === 12,
    "Placement needs 12 distinct physical cores",
  );
  const layout = (getopt("account-layout") ?? (item >= 3 ? "pooled" : undefined)) as
    | Topology
    | undefined;
  const spec = campaignItem(item, layout),
    capacity = budgetFor(item, root, mode, getopt("sizing"));
  const baselineTag = getopt("baseline"),
    seedImageTag = getopt("seed-image");
  // [DX-ACT2] Why: a standalone guarded activation can seed its own pooled account scope after preflight. Rejected: borrowing the image of a zero arm from another build.
  if (
    item === 5 &&
    layout === "pooled" &&
    mode !== "zero" &&
    (mode !== "activation" || seedImageTag)
  ) {
    assert(seedImageTag && /^[a-z][a-z0-9-]{2,40}$/.test(seedImageTag));
    const origin = get(path.join(root, seedImageTag, "attempt.json")),
      seal = get(path.join(root, seedImageTag, "seed-image.json"));
    assert(
      origin.item === 5 &&
        origin.mode === "zero" &&
        origin.layout === layout &&
        origin.source === source &&
        seal.identity.nonce === origin.nonce &&
        seal.identity.slot === origin.slot,
    );
  }
  const canAttempt = capacity.host.memory > capacity.sharedReserve + 8 * GiB;
  const diskFloor =
    capacity.db * (item === 5 && layout === "pooled" && mode === "zero" ? 1.65 : 1) +
    (capacity.liveDisk - capacity.seedDisk) +
    15 * GiB;
  const boundedTrial = mode !== "seed" && item >= 2 && canAttempt && capacity.host.disk > diskFloor;
  if (mode === "reader") {
    assert(baselineTag && /^[a-z][a-z0-9-]{2,40}$/.test(baselineTag));
    const prior = get(path.join(root, baselineTag, "attempt.json"));
    assert.equal(prior.mode, "zero");
    assert.deepEqual(prior.spec, spec);
    assert.equal(prior.source, source);
    assert(get(path.join(root, baselineTag, "terminal.json")).cleanup);
    assert(fs.existsSync(path.join(root, baselineTag, "summary.json")));
  }
  const ceiling =
    (item === 5 && layout === "pooled"
      ? 24
      : mode === "activation" || mode === "interference"
        ? 10
        : spec.people === 100000
          ? 8
          : 4) * 3600;
  const clientBudget = Math.floor(
    Math.max(1 * GiB, capacity.host.memory - capacity.sharedReserve - 5 * GiB),
  );
  fs.mkdirSync(dir, { mode: 0o700 });
  write(path.join(dir, "attempt.json"), {
    source,
    nonce: randomUUID(),
    slot: prefix,
    tag,
    mode,
    spec,
    item,
    ceiling,
    clientBudget,
    originHeads,
    capacity,
    baselineTag,
    layout,
    boundedTrial,
    seedImageTag,
    at: Date.now(),
    cpus: planCpus,
    topology,
  });
  if (!boundedTrial && !(mode === "seed" ? capacity.fitsSeed : capacity.fitsLive)) {
    status(dir, "capacity refused", { limits: capacity.limits, seedFits: capacity.fitsSeed });
    await terminal(dir, tag, prefix, "capacity-refused");
    console.log(JSON.stringify(capacity));
    process.exitCode = 75;
    return;
  }
  const loader = [
      process.execPath,
      "--import",
      "tsx",
      path.join(repo, "lab/experiments/EXP-DX1/scale1/bench.ts"),
    ],
    unit = `triplex-scale1-${tag}`;
  const post = [...loader, "cleanup", String(item), tag, mode].join(" ");
  assert(!repo.includes(" "));
  call("systemd-run", [
    "--no-block",
    `--unit=${unit}`,
    `--working-directory=${repo}`,
    "--property=KillMode=control-group",
    `--property=RuntimeMaxSec=${ceiling}s`,
    `--property=MemoryMax=${clientBudget}`,
    "--property=TimeoutStopSec=3650s",
    `--property=ExecStopPost=${post}`,
    "--setenv=DOCKER_HOST=unix:///var/run/docker.sock",
    `--setenv=PATH=${process.env.PATH}`,
    "flock",
    "-n",
    path.join(root, "exclusive.lock"),
    process.execPath,
    "lab/bin/heavy.mjs",
    "--label",
    "DX-SCALE1-native",
    "--",
    ...loader,
    "run",
    String(item),
    tag,
    mode,
  ]);
  console.log(JSON.stringify({ unit, tag, ceiling, capacity }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === script)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
