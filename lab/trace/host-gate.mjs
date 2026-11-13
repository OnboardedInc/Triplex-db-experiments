// @ts-nocheck -- [DX-T1-3] Why: validate Linux/Docker wire shapes before deciding. Rejected: trusting inferred JSON types.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { percentile } from "./report.mjs";

const GiB = 1024 ** 3;
const digest = "aa8a7636ff027ab3";
const limits = { pg: 2 * GiB, tx: 4 * GiB, "gw-w": 3 * GiB, "gw-r": 3 * GiB, driver: 8 * GiB };
const cpus = { pg: "0", tx: "0,1", "gw-w": "1", "gw-r": "2,3", driver: "4,5,6,7" };
const assert = (condition, message) => {
  if (!condition) throw Error(message);
};
const envOf = (container) =>
  Object.fromEntries(
    container.Config.Env.map((s) => {
      const i = s.indexOf("=");
      return [s.slice(0, i), s.slice(i + 1)];
    }),
  );
const counters = (s) =>
  Object.fromEntries(
    [...String(s ?? "").matchAll(/^(\w+)\s+(\d+)$/gm)].map((m) => [m[1], Number(m[2])]),
  );
const memory = (row) =>
  Object.fromEntries(
    [
      ...String(row.vm?.["/proc/meminfo"] ?? "").matchAll(
        /^(MemTotal|MemAvailable|SwapTotal|SwapFree):\s+(\d+) kB$/gm,
      ),
    ].map((m) => [m[1], Number(m[2]) * 1024]),
  );
const cpu = (row) =>
  /^cpu\s+(.+)$/m
    .exec(row.vm?.["/proc/stat"] ?? "")?.[1]
    .trim()
    .split(/\s+/)
    .map(Number);

// [DX-T1-3] Why: a healthy-host decision must use complete attempt-bound bytes and every offered primary commit.
// Rejected: selecting the fastest band, trusting a directory name, or reusing an old capacity observation.
export function assessHostGate(runs, source) {
  assert(/^[0-9a-f]{40}$/.test(source), "Expected exact source commit");
  assert(
    runs.length >= 2 && runs.length <= 4,
    "Expected capacity probe and one to three off controls",
  );
  const [probe, ...controls] = runs;
  let prior;
  const summaries = [];
  for (const [index, run] of runs.entries()) {
    const {
      tag,
      manifest: m,
      bench: b,
      summary,
      stack,
      containers,
      driver,
      vm,
      host,
      writes,
    } = run;
    assert(/^tx2-dxt1-[a-z0-9-]+$/.test(tag), "Invalid owned tag");
    assert(
      m.tag === tag &&
        m.slot === tag &&
        m.source === source &&
        run.head === source &&
        summary.tag === tag &&
        summary.source === source,
      "Source/slot/tag mismatch",
    );
    assert(
      m.level === "off" &&
        m.session === tag &&
        m.requireSystem &&
        !m.components.length &&
        summary.disabled &&
        !summary.errors.length,
      "Expected off with common resource sampling",
    );
    assert(run.buildHashes === probe.buildHashes, "Source/build inputs changed during host gate");
    assert(
      b.status === "DONE" &&
        b.seed?.complete &&
        b.seed.seededSubjects === 10000 &&
        b.seed.failureCount === 0 &&
        b.seed.assertionsMatchClosedForm,
      "Incomplete 10k seed/run",
    );
    const c = b.config;
    assert(
      c.lane === "datomic" &&
        c.rung === "10k" &&
        c.readPath === "replica" &&
        c.strictRecordClocks &&
        c.readerLadderOnly &&
        c.levelS === 20 &&
        c.readerThreads === 3 &&
        !c.compactModel &&
        c.writerMaxInFlight === 32,
      "Wrong host-gate inputs",
    );
    assert(
      c.seed === "ns-v2" &&
        c.rateScale === 1 &&
        c.burstMultiplier === 50 &&
        b.trace.digest === digest,
      "Frozen trace mismatch",
    );
    const began = Date.parse(b.startedAt),
      ended = Date.parse(b.endedAt);
    assert(
      Number.isFinite(began) && ended > began && began >= m.startedAt - 1000,
      "Stale benchmark timestamps",
    );
    assert(!run.remaining.some((s) => s.trim()) && run.nohlt, "Cleanup/nohlt proof absent");
    assert(
      Date.parse(stack.createdAt) >= m.startedAt - 1000 &&
        Date.parse(stack.createdAt) <= began + 1000,
      "Stale stack receipt",
    );
    assert(
      stack.prefix === tag && containers.length === 4 && driver.Name === "/" + tag + "-driver",
      "Container binding absent",
    );
    for (const role of Object.keys(limits)) {
      const container =
        role === "driver" ? driver : containers.find((x) => x.Name === "/" + tag + "-" + role);
      const live = stack.containers.find((x) => x.name === tag + "-" + role);
      assert(
        container &&
          container.HostConfig.Memory === limits[role] &&
          container.HostConfig.CpusetCpus === cpus[role] &&
          !container.State.OOMKilled,
        "Unexpected limits/placement/OOM: " + role,
      );
      if (role !== "driver")
        assert(
          live?.id === container.Id && live.memory === limits[role] && live.cpuset === cpus[role],
          "Stack/container identity mismatch",
        );
      const env = envOf(container);
      assert(
        Date.parse(container.Created) >= m.startedAt - 1000 &&
          Date.parse(container.Created) <= began + 1000,
        "Stale container readback: " + role,
      );
      const javaOptions = role === "tx" ? env.JAVA_OPTS : env.DATOMIC_JAVA_OPTS;
      if (role !== "pg")
        assert(
          env.TRIPLEX_TRACE_RUN === tag &&
            env.TRIPLEX_TRACE_SLOT === tag &&
            env.TRIPLEX_TRACE_SOURCE === source,
          "Container source binding mismatch",
        );
      if (role === "driver")
        assert(
          env.TRIPLEX_TRACE_NODE === "0" &&
            env.TRIPLEX_TRACE_SYSTEM === "1" &&
            env.DX_READ_PATH === "replica" &&
            env.DX_STRICT_RECORD_CLOCKS === "1",
          "Driver effective configuration mismatch",
        );
      else if (role !== "pg")
        assert(
          env.TRIPLEX_TRACE_JFR === "0" &&
            env.TRIPLEX_TRACE_GATEWAY === "0" &&
            env.TRIPLEX_TRACE_NATIVE_LOGS === "0" &&
            typeof javaOptions === "string" &&
            !javaOptions.includes("StartFlightRecording") &&
            !javaOptions.includes("trace-logback.xml"),
          "JVM recorder enabled in off arm",
        );
    }
    assert(
      run.pgSettings.slice(0, 3).join(",") === "-1,off,off",
      "Postgres tracing enabled in off arm",
    );
    assert(vm.length > 2 && host.length > 2, "Resource samples absent");
    let previousAt = 0;
    const boots = new Set();
    for (const row of [...vm, ...host])
      assert(
        row.run === tag &&
          row.slot === tag &&
          row.source === source &&
          row.at >= m.startedAt - 1000,
        "Stale/foreign resource sample",
      );
    for (const row of vm) {
      assert(
        row.process === "system-linux" &&
          row.clock?.domain === "linux-monotonic" &&
          row.clock.bootId &&
          row.at >= previousAt,
        "VM clock/order binding absent",
      );
      previousAt = row.at;
      boots.add(row.clock.bootId);
      const mem = memory(row);
      assert(
        mem.MemTotal >= 15 * GiB &&
          mem.MemTotal <= 16.1 * GiB &&
          mem.MemAvailable > 0 &&
          Number.isFinite(mem.SwapFree),
        "Expected 16 GiB guest memory observations",
      );
      for (const role of Object.keys(limits)) {
        const group = row.cgroups?.[role === "driver" ? role : tag + "-" + role];
        const events = counters(group?.["memory.events"]);
        assert(
          group &&
            Number(group["memory.current"]) > 0 &&
            ["oom", "oom_kill", "oom_group_kill"].every((k) => events[k] === 0),
          "OOM counter missing/nonzero: " + role,
        );
      }
    }
    assert(
      boots.size === 1 && (index === 0 || [...boots][0] === summaries[0].guestBootId),
      "Guest boot changed during gate",
    );
    assert(
      vm[0].at <= b.phases[0].start && vm.at(-1).at >= ended - 2000,
      "VM sampling does not cover attempt",
    );
    const swaps = host
      .map((row) => /used\s*=\s*([\d.]+)M/.exec(row.swap ?? ""))
      .filter(Boolean)
      .map((m) => Number(m[1]) / 1024);
    assert(
      swaps.length === host.length &&
        host.every(
          (r) =>
            r.process === "system-darwin" &&
            Number.isFinite(r.cpu) &&
            Number.isFinite(r.otherCpu) &&
            Number.isFinite(r.callCpu),
        ),
      "Host swap/CPU samples incomplete",
    );
    const primary = writes.filter((w) => w.stream === "background" && !w.resend);
    assert(
      primary.length > 0 &&
        new Set(primary.map((w) => w.seq)).size === primary.length &&
        primary.every(
          (w) =>
            w.outcome === "committed" &&
            !w.expired &&
            Number.isFinite(w.latencyMs) &&
            w.latencyMs >= 0 &&
            Math.abs(w.latencyMs - (w.finishedAt - w.scheduledAt)) <= 0.001 &&
            w.transactReturnedAt >= w.transactCalledAt &&
            w.transactCalledAt >= w.scheduledAt &&
            w.finishedAt >= w.transactReturnedAt &&
            w.scheduledAt >= b.traceStartAbsMs &&
            w.finishedAt <= ended + 1000,
        ),
      "Primary command bytes incomplete/stale",
    );
    const item = {
      tag,
      level: "off",
      source,
      digest,
      commands: primary.length,
      p50Ms: percentile(
        primary.map((w) => w.latencyMs),
        0.5,
      ),
      p99Ms: percentile(
        primary.map((w) => w.latencyMs),
        0.99,
      ),
      transactP50Ms: percentile(
        primary.map((w) => w.transactReturnedAt - w.transactCalledAt),
        0.5,
      ),
      outsideTransactP50Ms: percentile(
        primary.map((w) => w.latencyMs - (w.transactReturnedAt - w.transactCalledAt)),
        0.5,
      ),
      swapGiB: { min: Math.min(...swaps), median: percentile(swaps, 0.5), max: Math.max(...swaps) },
      hostOtherCpuPercent: {
        median: percentile(
          host.map((r) => r.otherCpu),
          0.5,
        ),
        max: Math.max(...host.map((r) => r.otherCpu)),
      },
      hostSamples: host.length,
      hostSamplesAboveAdmission: host.filter((r) => r.otherCpu > 150 || r.callCpu > 20).length,
      guestBootId: [...boots][0],
      guestMemoryGiB: memory(vm[0]).MemTotal / GiB,
      guestMinAvailableGiB: Math.min(...vm.map((r) => memory(r).MemAvailable)) / GiB,
      guestMaxSwapUsedGiB:
        Math.max(
          ...vm.map((r) => {
            const m = memory(r);
            return m.SwapTotal - m.SwapFree;
          }),
        ) / GiB,
      oomKills: 0,
      inputFiles: run.inputFiles,
    };
    const firstCpu = cpu(vm[0]),
      lastCpu = cpu(vm.at(-1));
    assert(firstCpu?.length >= 8 && lastCpu?.length >= 8, "Guest CPU counters absent");
    const ticks = lastCpu.slice(0, 8).reduce((n, v, i) => n + v - firstCpu[i], 0);
    assert(ticks > 0, "Guest CPU interval empty");
    item.guestCpuBusyPercent =
      100 * (1 - (lastCpu[3] - firstCpu[3] + lastCpu[4] - firstCpu[4]) / ticks);
    if (index === 0) {
      assert(
        !c.zeroReaders && c.maxReaders === 256 && c.matchDurationS === null,
        "Wrong capacity probe",
      );
      const phase = b.phases.find((p) => p.name === "L256");
      assert(
        phase?.readers === 256 && phase.end - phase.start >= 19900,
        "256-reader capacity phase incomplete",
      );
      // [DX-T1-3] Why: memory capacity needs actual successful reader work. Rejected: a phase label with idle or failed readers.
      assert(
        phase.stats?.readers === 256 &&
          phase.stats.reads > 0 &&
          phase.stats.correct === phase.stats.reads &&
          phase.stats.errors === 0 &&
          phase.stats.violations === 0,
        "256-reader activity absent or incorrect",
      );
      const samples = vm.filter((r) => r.at >= phase.start && r.at <= phase.end);
      assert(
        samples.length >= 18 &&
          samples[0].at - phase.start <= 2000 &&
          phase.end - samples.at(-1).at <= 2000 &&
          samples.every((r, i) => !i || r.at - samples[i - 1].at <= 2500),
        "256-reader memory sampling has gaps",
      );
      assert(
        b.oracle?.status === "PASS" &&
          b.oracle.oracleVerdict === "PASS" &&
          b.oracle.exitCode === 0 &&
          b.oracle.mismatchCount === 0 &&
          b.oracle.reads > 0 &&
          b.oracle.entityQueries > 0 &&
          b.correctness?.violations === 0 &&
          b.correctness.errors === 0 &&
          b.correctness.reads > 0 &&
          b.correctness.correct === b.correctness.reads,
        "Capacity probe oracle/model report is not exact",
      );
      item.l256Reads = phase.stats.reads;
      item.l256MinAvailableGiB = Math.min(...samples.map((r) => memory(r).MemAvailable)) / GiB;
      item.oracleReported = {
        reads: b.oracle.reads,
        entityQueries: b.oracle.entityQueries,
        mismatches: 0,
      };
    } else {
      assert(m.startedAt >= Date.parse(probe.bench.endedAt), "Control predates capacity probe");
      assert(
        c.zeroReaders &&
          c.maxReaders === 0 &&
          c.matchDurationS === 200 &&
          primary.length === 3420 &&
          b.writer.pendingAtEnd === 0 &&
          b.writer.expired === 0,
        "Wrong/unfinished zero-reader control",
      );
      if (prior) {
        assert(prior.p50Ms > 12, "Control attempted after host gate passed");
        assert(
          m.startedAt >= prior.endedAt + 20 * 60 * 1000,
          "Retry began before the required 20-minute wait",
        );
      }
      prior = { ...item, endedAt: ended };
    }
    summaries.push(item);
  }
  const passed = summaries.at(-1).p50Ms <= 12;
  return {
    schema: "triplex.host-gate.v1",
    source,
    assessedAt: new Date().toISOString(),
    capacityFits: true,
    decision: passed ? "continue" : controls.length === 3 ? "stop" : "wait-20-minutes",
    thresholdP50Ms: 12,
    note: "Capacity covers a bounded 20-second L256 probe, not long-pair memory. Oracle status is copied from the bound run report; this gate does not promote P1/P2/P3 or independently rerun the oracle. Off arms have no per-layer trace.",
    runs: summaries,
  };
}

export async function loadGateRun(base, tag) {
  assert(/^tx2-dxt1-[a-z0-9-]+$/.test(tag), "Invalid owned tag");
  const dir = path.join(base, tag),
    inputFiles = [];
  const bytes = (name) => {
    const value = fs.readFileSync(path.join(dir, name));
    inputFiles.push({
      path: tag + "/" + name,
      bytes: value.length,
      sha256: createHash("sha256").update(value).digest("hex"),
    });
    return value;
  };
  const text = (name) => bytes(name).toString("utf8");
  const json = (name) => JSON.parse(text(name));
  const lines = async (name) => {
    // [DX-T1-3] Why: the digest and assessment must use the same observed bytes.
    // Rejected: hashing a file and reopening it to parse a potentially different stream.
    const raw = bytes(name),
      decoded = name.endsWith(".gz") ? gunzipSync(raw) : raw;
    return decoded.toString("utf8").split("\n").filter(Boolean).map(JSON.parse);
  };
  return {
    tag,
    inputFiles,
    manifest: json("trace-run.json"),
    bench: json("driver/ns-report.json"),
    summary: json("trace-summary.json"),
    stack: json("stack.json"),
    containers: json("containers.json"),
    driver: json("driver-container.json")[0],
    head: text("head.txt").trim(),
    buildHashes: text("source-build-hashes.json"),
    pgSettings: text("postgres-trace-settings.txt").trim().split("\n"),
    nohlt: text("guest-kernel.txt").split(/\s+/).includes("nohlt"),
    remaining: ["remaining-containers.txt", "remaining-networks.txt", "remaining-volumes.txt"].map(
      text,
    ),
    vm: await lines("trace/raw/system-linux.jsonl.gz"),
    host: await lines("trace/raw/system-darwin.jsonl.gz"),
    writes: await lines("driver/ns-writes.jsonl"),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [base, source, ...tags] = process.argv.slice(2);
  const runs = [];
  for (const tag of tags) runs.push(await loadGateRun(base, tag));
  console.log(JSON.stringify(assessHostGate(runs, source), null, 2));
}
