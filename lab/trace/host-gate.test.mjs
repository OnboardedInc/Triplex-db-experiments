import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { assessHostGate, loadGateRun } from "./host-gate.mjs";

const source = "a".repeat(40),
  GiB = 1024 ** 3;
/** @param {string} tag @param {boolean} probe */
function fixture(tag, probe, start = 1_000_000, latency = 11) {
  const identity = { run: tag, slot: tag, source };
  const common = Object.entries({
    TRIPLEX_TRACE_RUN: tag,
    TRIPLEX_TRACE_SLOT: tag,
    TRIPLEX_TRACE_SOURCE: source,
    TRIPLEX_TRACE_JFR: "0",
    TRIPLEX_TRACE_GATEWAY: "0",
    TRIPLEX_TRACE_NATIVE_LOGS: "0",
    JAVA_OPTS: "-Xmx3g",
    DATOMIC_JAVA_OPTS: "-Xmx2g",
  }).map(([k, v]) => `${k}=${v}`);
  const roles = /** @type {Array<[string, number, string]>} */ ([
    ["pg", 2, "0"],
    ["tx", 4, "0,1"],
    ["gw-w", 3, "1"],
    ["gw-r", 3, "2,3"],
    ["driver", 8, "4,5,6,7"],
  ]);
  const containers = roles.map(([role, limit, cpus]) => ({
    Id: role + "-id",
    Name: "/" + tag + "-" + role,
    Created: new Date(start + 500).toISOString(),
    HostConfig: { Memory: limit * GiB, CpusetCpus: cpus },
    State: { OOMKilled: false },
    Config: {
      Env:
        role === "pg"
          ? []
          : [
              ...common,
              "TRIPLEX_TRACE_NODE=0",
              "TRIPLEX_TRACE_SYSTEM=1",
              "DX_READ_PATH=replica",
              "DX_STRICT_RECORD_CLOCKS=1",
            ],
    },
  }));
  const vm = Array.from({ length: 25 }, (_, i) => ({
    ...identity,
    type: "resource",
    process: "system-linux",
    at: start + (i + 1) * 1000,
    clock: { domain: "linux-monotonic", bootId: "fixture-boot" },
    vm: {
      "/proc/meminfo":
        "MemTotal: 16340828 kB\nMemAvailable: 8000000 kB\nSwapTotal: 0 kB\nSwapFree: 0 kB\n",
      "/proc/stat": `cpu ${i * 5} 0 0 ${i * 10} 0 0 0 0\n`,
    },
    cgroups: Object.fromEntries(
      roles.map(([role]) => [
        role === "driver" ? role : tag + "-" + role,
        { "memory.current": "1000000", "memory.events": "oom 0\noom_kill 0\noom_group_kill 0\n" },
      ]),
    ),
  }));
  return {
    tag,
    head: source,
    buildHashes: "fixture source and build hashes",
    inputFiles: [],
    manifest: {
      tag,
      slot: tag,
      source,
      startedAt: start,
      level: "off",
      session: tag,
      requireSystem: true,
      components: [],
    },
    summary: { tag, source, disabled: true, errors: [] },
    stack: {
      prefix: tag,
      createdAt: new Date(start + 1000).toISOString(),
      containers: containers.slice(0, 4).map((c) => ({
        id: c.Id,
        name: c.Name.slice(1),
        memory: c.HostConfig.Memory,
        cpuset: c.HostConfig.CpusetCpus,
      })),
    },
    driver: containers[4],
    containers: containers.slice(0, 4),
    pgSettings: ["-1", "off", "off"],
    nohlt: true,
    remaining: ["", "", ""],
    vm,
    host: vm.map((r) => ({
      ...identity,
      at: r.at,
      process: "system-darwin",
      swap: "used = 10000.00M",
      cpu: 150,
      otherCpu: 40,
      callCpu: 0,
    })),
    bench: {
      status: "DONE",
      startedAt: new Date(start + 1000).toISOString(),
      endedAt: new Date(start + 25000).toISOString(),
      traceStartAbsMs: start + 1000,
      seed: {
        complete: true,
        seededSubjects: 10000,
        failureCount: 0,
        assertionsMatchClosedForm: true,
      },
      trace: { digest: "aa8a7636ff027ab3" },
      config: {
        lane: "datomic",
        rung: "10k",
        readPath: "replica",
        strictRecordClocks: true,
        readerLadderOnly: true,
        levelS: 20,
        readerThreads: 3,
        compactModel: false,
        writerMaxInFlight: 32,
        seed: "ns-v2",
        rateScale: 1,
        burstMultiplier: 50,
        zeroReaders: !probe,
        maxReaders: probe ? 256 : 0,
        matchDurationS: probe ? null : 200,
      },
      phases: [
        {
          name: "warmup",
          start: start + 1000,
          stats: { readers: 16, reads: 1000, correct: 1000, errors: 0, violations: 0 },
        },
        {
          name: "L256",
          readers: probe ? 256 : 0,
          start: start + 2000,
          end: start + 22000,
          stats: { readers: 256, reads: 1000, correct: 1000, errors: 0, violations: 0 },
        },
      ],
      oracle: {
        status: "PASS",
        oracleVerdict: "PASS",
        exitCode: 0,
        mismatchCount: 0,
        reads: 5,
        entityQueries: 10,
      },
      correctness: { reads: 1000, correct: 1000, violations: 0, errors: 0 },
      writer: { expired: 0, pendingAtEnd: 0 },
    },
    writes: Array.from({ length: probe ? 20 : 3420 }, (_, seq) => ({
      stream: "background",
      seq,
      resend: false,
      outcome: "committed",
      expired: false,
      latencyMs: latency,
      scheduledAt: start + 2000,
      finishedAt: start + 2000 + latency,
      transactCalledAt: start + 2001,
      transactReturnedAt: start + 2000 + latency,
    })),
  };
}
const pair = (latency = 11) => [
  fixture("tx2-dxt1-fixture-capacity", true),
  fixture("tx2-dxt1-fixture-off-a", false, 2_000_000, latency),
];

test("host gate uses all primary commits and preserves off/swap context", () => {
  const runs = pair(12);
  const result = assessHostGate(runs, source);
  assert.equal(result.decision, "continue");
  assert.equal(result.runs[1].commands, 3420);
  assert.equal(result.runs[1].p50Ms, 12);
  assert.equal(result.runs[1].level, "off");
  assert.equal(result.runs[1].swapGiB.median, 10000 / 1024);
  runs[1].writes.forEach((w, i) => {
    w.latencyMs = i < 1800 ? 13 : 1;
    w.finishedAt = w.scheduledAt + w.latencyMs;
    w.transactReturnedAt = w.finishedAt;
  });
  assert.equal(assessHostGate(runs, source).decision, "wait-20-minutes");
});

test("host gate stops after three misses and enforces elapsed retry time", () => {
  const runs = pair(13);
  runs.push(fixture("tx2-dxt1-fixture-off-b", false, 3_300_000, 13));
  runs.push(fixture("tx2-dxt1-fixture-off-c", false, 4_600_000, 13));
  assert.equal(assessHostGate(runs, source).decision, "stop");
  runs[2].manifest.startedAt = 3_100_000;
  assert.throws(() => assessHostGate(runs, source), /20-minute wait/);
  const passed = pair(11);
  passed.push(fixture("tx2-dxt1-fixture-off-b", false, 3_300_000, 11));
  assert.throws(() => assessHostGate(passed, source), /after host gate passed/);
});

test("host gate rejects foreign, stale, incomplete or semantically wrong evidence", () => {
  const cases = /** @type {Array<[(r: ReturnType<typeof fixture>) => void, RegExp]>} */ ([
    [
      (r) => {
        r.manifest.source = "b".repeat(40);
      },
      /Source\/slot\/tag/,
    ],
    [
      (r) => {
        r.vm[0].run = "tx2-dxt1-other";
      },
      /Stale\/foreign/,
    ],
    [
      (r) => {
        r.vm[0].at = r.manifest.startedAt - 2000;
      },
      /Stale\/foreign/,
    ],
    [
      (r) => {
        r.buildHashes = "different build";
      },
      /Source\/build/,
    ],
    [
      (r) => {
        r.driver.Config.Env.push("TRIPLEX_TRACE_NODE=1");
      },
      /effective configuration/,
    ],
    [
      (r) => {
        r.containers[1].Config.Env.push("JAVA_OPTS=-XX:StartFlightRecording=filename=fixture.jfr");
      },
      /JVM recorder/,
    ],
    [
      (r) => {
        r.containers[1].State.OOMKilled = true;
      },
      /limits\/placement\/OOM/,
    ],
    [
      (r) => {
        r.vm[3].cgroups.driver["memory.events"] = "oom 1\noom_kill 1\noom_group_kill 0\n";
      },
      /OOM counter/,
    ],
    [
      (r) => {
        r.vm[3].cgroups.driver["memory.events"] = "";
      },
      /OOM counter/,
    ],
    [
      (r) => {
        r.vm[3].clock.bootId = "old-boot";
      },
      /Guest boot/,
    ],
    [
      (r) => {
        r.writes.pop();
      },
      /zero-reader control/,
    ],
    [
      (r) => {
        r.writes[0].seq = r.writes[1].seq;
      },
      /Primary command/,
    ],
    [
      (r) => {
        r.writes[0].outcome = "expired";
      },
      /Primary command/,
    ],
    [
      (r) => {
        r.writes[0].latencyMs = 0;
      },
      /Primary command/,
    ],
    [
      (r) => {
        r.bench.trace.digest = "different";
      },
      /Frozen trace/,
    ],
    [
      (r) => {
        r.remaining[0] = "owned-container";
      },
      /Cleanup\/nohlt/,
    ],
  ]);
  for (const [change, expected] of cases) {
    const runs = pair();
    change(runs[1]);
    assert.throws(() => assessHostGate(runs, source), expected);
  }
  const capacityFailures = /** @type {Array<(r: ReturnType<typeof fixture>) => void>} */ ([
    (r) => {
      r.bench.phases[1].stats.reads = 0;
      r.bench.phases[1].stats.correct = 0;
    },
    (r) => {
      r.bench.correctness.correct = 999;
    },
    (r) => {
      r.containers[1].Created = new Date(0).toISOString();
    },
    (r) => {
      r.stack.createdAt = new Date(0).toISOString();
    },
    (r) => {
      r.vm.splice(3, 10);
    },
    (r) => {
      r.bench.oracle.mismatchCount = 1;
    },
    (r) => {
      r.bench.phases[1].readers = 64;
    },
  ]);
  for (const change of capacityFailures) {
    const runs = pair();
    change(runs[0]);
    assert.throws(() => assessHostGate(runs, source));
  }
});

test("compressed evidence manifest hashes the exact observed input bytes", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "triplex-host-gate-"));
  const run = fixture("tx2-dxt1-fixture-files", true),
    dir = path.join(root, run.tag);
  try {
    fs.mkdirSync(path.join(dir, "trace/raw"), { recursive: true });
    fs.mkdirSync(path.join(dir, "driver"));
    for (const [file, value] of Object.entries({
      "trace-run.json": run.manifest,
      "trace-summary.json": run.summary,
      "driver/ns-report.json": run.bench,
      "stack.json": run.stack,
      "containers.json": run.containers,
      "driver-container.json": [run.driver],
    }))
      fs.writeFileSync(path.join(dir, file), JSON.stringify(value));
    for (const [file, value] of Object.entries({
      "head.txt": source,
      "source-build-hashes.json": run.buildHashes,
      "postgres-trace-settings.txt": run.pgSettings.join("\n"),
      "guest-kernel.txt": "BOOT_IMAGE=fixture nohlt",
      "remaining-containers.txt": "",
      "remaining-networks.txt": "",
      "remaining-volumes.txt": "",
      "driver/ns-writes.jsonl": run.writes.map((r) => JSON.stringify(r)).join("\n"),
    }))
      fs.writeFileSync(path.join(dir, file), value);
    const raw = gzipSync(run.vm.map((r) => JSON.stringify(r)).join("\n"));
    fs.writeFileSync(path.join(dir, "trace/raw/system-linux.jsonl.gz"), raw);
    fs.writeFileSync(
      path.join(dir, "trace/raw/system-darwin.jsonl.gz"),
      gzipSync(run.host.map((r) => JSON.stringify(r)).join("\n")),
    );
    const loaded = await loadGateRun(root, run.tag);
    assert.deepEqual(loaded.vm, run.vm);
    assert.deepEqual(loaded.writes, run.writes);
    const entry = loaded.inputFiles.find((f) => f.path.endsWith("system-linux.jsonl.gz"));
    assert.equal(entry?.bytes, raw.length);
    assert.equal(entry?.sha256, createHash("sha256").update(raw).digest("hex"));
    fs.writeFileSync(path.join(dir, "trace/raw/system-linux.jsonl.gz"), raw.subarray(0, -8));
    await assert.rejects(() => loadGateRun(root, run.tag), /unexpected end|buffer error/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
