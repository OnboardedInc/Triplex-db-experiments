// @ts-nocheck -- Validated recorded-run boundary; no acceptance contract is changed here.
import fs from "node:fs";
import path from "node:path";
import { records, percentile, filesUnder } from "./report.mjs";
import { configuration } from "./components.mjs";
import { bookendComparison, observedRunEnd } from "./anatomy.mjs";
import {
  validateNativeSettings,
  nativeBookendComparison,
  validateNativeAffinity,
  validateNativeBands,
} from "./native-settings.mjs";
const [base, prefix, kind] = process.argv.slice(2);
const nativeKind = /^(quiet|channel|isolated|index)-(floor|256)$/.exec(kind);
const readerDiagnostic =
  ["history-256", "writer-256", "record-clock-256"].includes(kind) || nativeKind?.[2] === "256";
const summaryKind =
  [
    "record-clock-floor",
    "record-clock-256",
    "publication-floor",
    "fallback-floor",
    "history-256",
    "seed-floor",
    "writer-256",
  ].includes(kind) || !!nativeKind;
if (
  ![
    "ablation",
    "cost",
    "anatomy",
    "cpu-floor",
    "publication-floor",
    "record-clock-floor",
    "record-clock-256",
    "fallback-floor",
    "history-256",
    "seed-floor",
    "writer-256",
  ].includes(kind) &&
  !nativeKind
)
  throw Error("Expected ablation or cost");
const session = path.join(base, prefix + "-session"),
  source = fs.readFileSync(path.join(session, "head.txt"), "utf8").trim();
const nativeRequest = nativeKind
  ? JSON.parse(fs.readFileSync(path.join(session, "native-request.json"), "utf8"))
  : null;
const nativeRepeats = nativeRequest?.candidateRepeats ?? 2;
if (nativeKind && (nativeRequest.kind !== kind || ![1, 2].includes(nativeRepeats)))
  throw Error("Invalid native comparison plan");
const compare = nativeKind ? nativeBookendComparison : bookendComparison;
const arms = nativeKind
  ? nativeRepeats === 1
    ? ["baseline", "candidate", "baseline"]
    : ["baseline", "candidate", "candidate", "baseline"]
  : kind === "ablation"
    ? ["off", "tx-jfr", "gw-jfr", "postgres", "gateway", "node", "native-logs", "full", "off"]
    : kind.startsWith("record-clock-")
      ? ["baseline", "server", "server", "baseline"]
      : kind === "publication-floor"
        ? ["baseline", "insert", "insert", "baseline"]
        : kind === "anatomy"
          ? ["off", "anatomy", "anatomy", "off"]
          : kind === "seed-floor"
            ? ["baseline", "seed-2000", "seed-2000", "baseline"]
            : kind === "writer-256"
              ? ["baseline", "writer-core", "writer-core", "baseline"]
              : kind === "history-256"
                ? ["baseline", "history-192", "history-192", "baseline"]
                : kind === "fallback-floor"
                  ? ["baseline", "fallback-worker", "fallback-worker", "baseline"]
                  : kind === "cpu-floor"
                    ? ["baseline", "engine-isolated", "engine-isolated", "baseline"]
                    : ["off", "summary", "summary", "off"];
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const rows = [];
let buildHashes, commonInputs;
// [DX-T1-2] Why: inspect the actual container environment/JVM options, PG readback and fresh raw resource bytes.
// Rejected: treating a directory name or successful process exit as proof that its requested recorder was measured.
for (const [i, arm] of arms.entries()) {
  const tag = `${prefix}-${i + 1}-${arm}`,
    dir = path.join(base, tag),
    bench = read(path.join(dir, "driver/ns-report.json")),
    manifest = read(path.join(dir, "trace-run.json")),
    summary = read(path.join(dir, "trace-summary.json"));
  const endedAt = observedRunEnd(bench.endedAt);
  // [DX-T1-4] Why: every comparison changes one declared input while the remaining workload stays byte-identical.
  // Rejected: silently inheriting a different seed batch or read policy between placement arms.
  const variable =
    kind === "history-256"
      ? "replicaHistoryMiB"
      : kind === "fallback-floor"
        ? "replicaFallbackThread"
        : kind === "seed-floor"
          ? "seedBatchFacts"
          : null;
  const inputs = JSON.stringify(
    Object.fromEntries(Object.entries(bench.config).filter(([k]) => k !== variable)),
  );
  if (commonInputs !== undefined && commonInputs !== inputs)
    throw Error("Uncontrolled workload input changed");
  commonInputs = inputs;
  const actualHashes = fs.readFileSync(path.join(dir, "source-build-hashes.json"), "utf8");
  if (buildHashes !== undefined && actualHashes !== buildHashes)
    throw Error("Source/build bytes changed inside session");
  buildHashes = actualHashes;
  const effective = configuration({
    TRIPLEX_TRACE_LEVEL:
      arm === "off" ? "off" : arm === "summary" || summaryKind ? "summary" : "full",
    TRIPLEX_TRACE_SESSION: prefix,
    ...(!["full", "summary"].includes(arm) && !summaryKind
      ? {
          TRIPLEX_TRACE_COMPONENTS:
            arm === "off"
              ? ""
              : arm === "anatomy" || kind === "cpu-floor"
                ? "node,gateway,tx-jfr,gw-jfr,postgres"
                : arm,
        }
      : {}),
  });
  if (
    bench.status !== "DONE" ||
    bench.seed?.seededSubjects !== 10000 ||
    bench.config?.zeroReaders !== !readerDiagnostic ||
    bench.config.matchDurationS !== (readerDiagnostic ? 300 : 200) ||
    bench.config.readPath !== "replica" ||
    !bench.config.strictRecordClocks ||
    typeof bench.trace?.digest !== "string"
  )
    throw Error("Wrong/unfinished workload " + tag);
  if (
    manifest.tag !== tag ||
    manifest.slot !== tag ||
    manifest.source !== source ||
    manifest.session !== prefix ||
    JSON.stringify(manifest.components) !== JSON.stringify(effective.components) ||
    summary.source !== source
  )
    throw Error("Run/source/component/session binding mismatch " + tag);
  if (
    kind === "fallback-floor" &&
    bench.config.replicaFallbackThread !== (arm === "fallback-worker" ? "worker" : "main")
  )
    throw Error("Fallback placement readback mismatch");
  if (
    kind === "history-256" &&
    (bench.config.replicaHistoryMiB !== (arm === "history-192" ? 192 : 64) ||
      bench.config.replicaFallbackThread !== "worker" ||
      bench.config.maxReaders !== 256)
  )
    throw Error("Replica history readback mismatch");
  if (readerDiagnostic) {
    // [DX-T1-4] Why: a retained-history trial needs reads after the first burst, not a pre-burst cache hit test.
    // Rejected: 20-second ladder levels (readers stop at 115 seconds, before the frozen burst starts).
    const phase = bench.phases.find((p) => p.name === "L256");
    if (
      bench.config.levelS !== 45 ||
      !bench.config.readerLadderOnly ||
      !phase ||
      phase.start - bench.traceStartAbsMs < 180000 ||
      phase.end - phase.start < 44900 ||
      bench.replica.historyBudgetBytes !== bench.config.replicaHistoryMiB * 1024 ** 2 ||
      bench.correctness?.errors !== 0 ||
      bench.correctness?.violations !== 0 ||
      bench.oracle?.status !== "PASS" ||
      bench.oracle?.mismatchCount !== 0
    )
      throw Error("History pressure, exactness, or real capacity observation absent");
  }
  if (
    kind === "seed-floor" &&
    (bench.config.seedBatchFacts !== (arm === "seed-2000" ? 2000 : 400) ||
      bench.config.replicaHistoryMiB !== 192 ||
      bench.config.replicaFallbackThread !== "worker")
  )
    throw Error("Seed batching readback mismatch");
  if (
    kind === "writer-256" &&
    (bench.config.replicaHistoryMiB !== 192 ||
      bench.config.replicaFallbackThread !== "worker" ||
      bench.config.maxReaders !== 256)
  )
    throw Error("Writer study input mismatch");
  const containers = read(path.join(dir, "containers.json")),
    driver = read(path.join(dir, "driver-container.json"))[0];
  if (kind === "cpu-floor") {
    const expected = {
      pg: arm === "engine-isolated" ? "2" : "0",
      tx: "0,1",
      "gw-w": arm === "engine-isolated" ? "3" : "1",
      "gw-r": "2,3",
    };
    for (const [role, cpus] of Object.entries(expected))
      if (containers.find((c) => c.Name === "/" + tag + "-" + role)?.HostConfig.CpusetCpus !== cpus)
        throw Error("CPU placement readback mismatch");
    if (driver.HostConfig.CpusetCpus !== "4,5,6,7") throw Error("Driver CPU control changed");
  }
  if (kind === "writer-256") {
    const candidate = arm === "writer-core";
    if (
      driver.HostConfig.CpusetCpus !== (candidate ? "3,4,5,6,7" : "4,5,6,7") ||
      containers.find((c) => c.Name === "/" + tag + "-gw-r")?.HostConfig.CpusetCpus !==
        (candidate ? "2" : "2,3")
    )
      throw Error("Writer/container CPU mask mismatch");
    const masks = fs
      .readFileSync(path.join(dir, "driver.log"), "utf8")
      .split("\n")
      .filter((l) => l.startsWith('{"type":"node-thread-placement"'))
      .map((l) => JSON.parse(l));
    const expand = (v) =>
      v
        .split(",")
        .flatMap((r) => {
          const [a, b] = r.split("-").map(Number);
          return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i);
        })
        .sort((a, b) => a - b)
        .join(",");
    if (candidate) {
      if (!masks.some((r) => r.thread === 0) || masks.filter((r) => r.thread !== 0).length < 4)
        throw Error("Missing writer/worker masks");
      for (const r of masks) {
        if (
          r.main !== "3" ||
          r.workers !== "4,5,6,7" ||
          expand(r.allowed) !== (r.thread === 0 ? "3" : "4,5,6,7")
        )
          throw Error("Wrong thread affinity");
        for (const b of r.background ?? [])
          if (expand(b.allowed) !== "4,5,6,7") throw Error("Runtime thread shares writer core");
      }
    } else if (masks.length) throw Error("Baseline unexpectedly pinned");
  }
  if (nativeKind) {
    const request = read(path.join(session, "native-request.json"));
    const expected = { ...request.baseline };
    if (arm === "candidate") {
      if (nativeKind[1] === "quiet") expected.DX_QUIET_LOGS = "1";
      if (nativeKind[1] === "channel") expected.DX_ENCRYPT_CHANNEL = "false";
      if (nativeKind[1] === "index") expected.DX_INDEX_THRESHOLD = "512m";
    }
    const props = fs.readFileSync(path.join(dir, "config/sql.properties"), "utf8");
    validateNativeSettings({
      manifest,
      rows: ["tx", "gw-w", "gw-r"].map((role) =>
        read(path.join(dir, `config/${role}-native-settings.json`)),
      ),
      expected,
      properties: props,
    });
    const channelStart = fs.readFileSync(path.join(dir, "config/tx-startup.log"), "utf8");
    const channels = [...channelStart.matchAll(/:encrypt-channel\s+(true|false)/g)].map(
      (m) => m[1],
    );
    if (!channels.length || channels.some((v) => v !== expected.DX_ENCRYPT_CHANNEL))
      throw Error("Unconfirmed published channel mode");
    const isolated = nativeKind[1] === "isolated" && arm === "candidate";
    const masks = {
      tx: isolated ? "0" : "0,1",
      pg: isolated ? "1" : "0",
      "gw-w": isolated ? "2" : "1",
      "gw-r": isolated ? "4" : "2,3",
    };
    for (const [role, cpus] of Object.entries(masks))
      if (containers.find((c) => c.Name === `/${tag}-${role}`)?.HostConfig.CpusetCpus !== cpus)
        throw Error("Native CPU placement mismatch");
    if (driver.HostConfig.CpusetCpus !== (isolated ? "3,4,5,6,7" : "4,5,6,7"))
      throw Error("Native driver CPU placement mismatch");
    const placements = fs
      .readFileSync(path.join(dir, "driver.log"), "utf8")
      .split("\n")
      .filter((l) => l.startsWith('{"type":"node-thread-placement"'))
      .map((l) => JSON.parse(l));
    if (isolated) validateNativeAffinity(placements, manifest, endedAt);
    else if (placements.length) throw Error("Native baseline unexpectedly pinned");
    for (const role of ["tx", "gw-w", "gw-r"]) {
      const c = containers.find((c) => c.Name === `/${tag}-${role}`);
      const opts = c.Config.Env.find((v) =>
        v.startsWith(role === "tx" ? "JAVA_OPTS=" : "DATOMIC_JAVA_OPTS="),
      );
      if (
        nativeKind[1] === "isolated" &&
        role === "tx" &&
        (!opts.includes("-XX:+UseG1GC") || !opts.includes("-XX:MaxGCPauseMillis=200"))
      )
        throw Error("Placement changed collector policy");
      if (opts.includes("/dxh1/quiet-logback.xml") !== (expected.DX_QUIET_LOGS === "1"))
        throw Error("Native JVM logback argument mismatch");
    }
  }
  const envOf = (c) =>
    Object.fromEntries(
      c.Config.Env.map((s) => {
        const i = s.indexOf("=");
        return [s.slice(0, i), s.slice(i + 1)];
      }),
    );
  if (kind.startsWith("record-clock-")) {
    const enabled = arm === "server";
    if (
      bench.serverRecordTime !== enabled ||
      envOf(driver).DX_SERVER_RECORD_TIME !== (enabled ? "1" : "0")
    )
      throw Error("Record-clock assignment mode mismatch");
    const a = bench.writerSourceDiagnostics?.start?.counters,
      b = bench.writerSourceDiagnostics?.end?.counters;
    if (
      !a ||
      !b ||
      !Number.isFinite(b.serverAssignedSubmissions) ||
      !Number.isFinite(b.clientOrderedSubmissions)
    )
      throw Error("Missing actual clock-path counters");
    const count = (k) => (b[k] ?? 0) - (a[k] ?? 0);
    if (
      enabled
        ? count("serverAssignedSubmissions") <= 0 ||
          count("clientOrderedSubmissions") !== 0 ||
          count("clockReplays") !== 0 ||
          count("ticketWaitMicros") !== 0
        : count("clientOrderedSubmissions") <= 0 || count("serverAssignedSubmissions") !== 0
    )
      throw Error("Wrong clock path or nonzero server replay/ticket wait");
  }
  if (kind === "publication-floor") {
    const mode = arm === "insert" ? "insert" : "legacy";
    if (bench.publicationMode !== mode || envOf(driver).DX_PUBLICATION_MODE !== mode)
      throw Error("Publication strategy runtime/readback mismatch");
    const masks = { tx: "0", pg: "1", "gw-w": "2", "gw-r": "4" };
    for (const [role, mask] of Object.entries(masks))
      if (containers.find((c) => c.Name === `/${tag}-${role}`)?.HostConfig.CpusetCpus !== mask)
        throw Error("Publication comparison placement changed");
    if (driver.HostConfig.CpusetCpus !== "3,4,5,6,7")
      throw Error("Publication driver placement changed");
  }
  if (envOf(driver).TRIPLEX_TRACE_NODE !== effective.flags.TRIPLEX_TRACE_NODE)
    throw Error("Node effective flag mismatch");
  for (const role of ["tx", "gw-w", "gw-r"]) {
    const c = containers.find((c) => c.Name === "/" + tag + "-" + role);
    if (!c) throw Error("Owned container missing");
    const env = envOf(c),
      jfr = effective.requiredJfr.includes(role),
      opts = role === "tx" ? env.JAVA_OPTS : env.DATOMIC_JAVA_OPTS;
    if (
      env.TRIPLEX_TRACE_GATEWAY !== effective.flags.TRIPLEX_TRACE_GATEWAY ||
      env.TRIPLEX_TRACE_NATIVE_LOGS !== effective.flags.TRIPLEX_TRACE_NATIVE_LOGS ||
      opts.includes("trace-logback.xml") !== effective.components.includes("native-logs") ||
      env.TRIPLEX_TRACE_JFR !== (jfr ? "1" : "0") ||
      opts.includes("StartFlightRecording") !== jfr
    )
      throw Error("JVM effective flag mismatch");
  }
  const pg = fs
    .readFileSync(path.join(dir, "postgres-trace-settings.txt"), "utf8")
    .trim()
    .split("\n");
  if (
    pg[0] !== (effective.requirePostgres ? "0" : "-1") ||
    pg[1] !== (effective.requirePostgres ? "on" : "off") ||
    pg[2] !== (effective.requirePostgres ? "on" : "off")
  )
    throw Error("Postgres readback mismatch");
  if (
    effective.nodeEnabled ||
    effective.requiredJfr.length ||
    effective.gatewayEnabled ||
    effective.requirePostgres ||
    effective.components.includes("native-logs")
  ) {
    if (!summary.complete) throw Error("Enabled collection incomplete " + tag);
  } else if (arm === "off" && !summary.disabled) throw Error("Off not disabled");
  const gatewayRequests = { "gw-w": 0, "gw-r": 0 };
  let nativeMetrics = 0;
  for (const file of filesUnder(path.join(dir, "trace/raw")).filter((f) =>
    /\/(gw-w|gw-r|tx)\.jsonl.gz$/.test(f),
  ))
    for await (const r of records(file)) {
      if (
        r.source !== source ||
        r.run !== tag ||
        r.slot !== tag ||
        (r.start ?? r.at) < manifest.startedAt - 1000
      )
        throw Error("Stale/foreign JVM span or metric");
      if (r.type === "request" && r.process in gatewayRequests) gatewayRequests[r.process]++;
      if (r.type === "metrics") nativeMetrics++;
    }
  if (effective.gatewayEnabled && (!gatewayRequests["gw-w"] || !gatewayRequests["gw-r"]))
    throw Error("Requested gateway spans absent");
  const swaps = [],
    macCpu = [],
    hostRows = [];
  let host = 0,
    vm = 0;
  for (const file of filesUnder(path.join(dir, "trace/raw")).filter((f) =>
    /system-.*jsonl.gz$/.test(f),
  ))
    for await (const r of records(file)) {
      if (
        r.source !== source ||
        r.run !== tag ||
        r.slot !== tag ||
        r.at < manifest.startedAt - 1000
      )
        throw Error("Stale/foreign host sample");
      if (r.process === "system-darwin") {
        hostRows.push(r);
        if (Number.isFinite(r.otherCpu)) macCpu.push(r.otherCpu);
        const used = /used\s*=\s*([\d.]+)M/.exec(r.swap ?? "");
        if (used) {
          swaps.push(Number(used[1]) / 1024);
          host++;
        }
      }
      if (r.process === "system-linux" && Object.keys(r.cgroups ?? {}).length >= 4) vm++;
    }
  if (!host || !vm) throw Error("Common host/VM observations absent");
  const writes = [],
    sequences = new Set();
  for await (const w of records(path.join(dir, "driver/ns-writes.jsonl")))
    if (w.stream === "background" && !w.resend) {
      if (w.outcome !== "committed" || w.expired) throw Error("Incomplete command trace");
      if (
        sequences.has(w.seq) ||
        !Number.isFinite(w.scheduledAt) ||
        w.scheduledAt < manifest.startedAt - 1000 ||
        !(w.finishedAt >= w.startedAt && w.startedAt >= w.scheduledAt) ||
        !Number.isFinite(endedAt) ||
        w.finishedAt > endedAt ||
        Math.abs(w.latencyMs - (w.finishedAt - w.scheduledAt)) > 0.01
      )
        throw Error("Writer content/freshness mismatch");
      sequences.add(w.seq);
      writes.push(w);
    }
  if (
    writes.length !== (readerDiagnostic ? 3530 : 3420) ||
    bench.trace.digest !== "aa8a7636ff027ab3" ||
    bench.writer.pendingAtEnd !== 0 ||
    bench.writer.expired !== 0
  )
    throw Error("Incomplete or changed frozen 200-second trace");
  if (readerDiagnostic) validateNativeBands(bench, writes);
  // [DX-T1-4] Why: host context belongs to the measured requests; post-run oracle CPU is not latency interference.
  // Rejected: reporting a whole-arm CPU median dominated by independent validation after the timed work.
  const hostContext = (start, end) => {
    const observed = hostRows.filter((r) => r.at >= start && r.at <= end);
    const cpu = observed.map((r) => r.otherCpu).filter(Number.isFinite);
    const swap = observed
      .map((r) => /used\s*=\s*([\d.]+)M/.exec(r.swap ?? ""))
      .filter(Boolean)
      .map((m) => Number(m[1]) / 1024);
    if (!cpu.length || !swap.length) throw Error("Timed host context missing");
    return {
      start,
      end,
      samples: observed.length,
      swapGiB: { min: Math.min(...swap), median: percentile(swap, 0.5), max: Math.max(...swap) },
      macCpu: { median: percentile(cpu, 0.5), p99: percentile(cpu, 0.99), max: Math.max(...cpu) },
    };
  };
  const timedHost = hostContext(
    Math.min(...writes.map((w) => w.scheduledAt)),
    Math.max(...writes.map((w) => w.finishedAt)),
  );
  const phase256 = bench.phases.find((p) => p.name === "L256");
  rows.push({
    tag,
    arm,
    level: manifest.level,
    components: manifest.components,
    source,
    digest: bench.trace.digest,
    commands: writes.length,
    writerCountersDelta: Object.fromEntries(
      [
        "optimisticAttempts",
        "optimisticFallbacks",
        "conflicts",
        "replays",
        "clockReplays",
        "serverAssignedSubmissions",
        "clientOrderedSubmissions",
        "ticketWaitMicros",
      ].map((k) => [
        k,
        (bench.writerSourceDiagnostics?.end?.counters?.[k] ?? 0) -
          (bench.writerSourceDiagnostics?.start?.counters?.[k] ?? 0),
      ]),
    ),
    p50Ms: percentile(
      writes.map((w) => w.latencyMs),
      0.5,
    ),
    p99Ms: percentile(
      writes.map((w) => w.latencyMs),
      0.99,
    ),
    transactP50Ms: percentile(
      writes.map((w) => w.transactReturnedAt - w.transactCalledAt),
      0.5,
    ),
    swapGiB: timedHost.swapGiB,
    macCpu: timedHost.macCpu,
    timedHost,
    hostAtL256: readerDiagnostic ? hostContext(phase256.start, phase256.end) : null,
    wholeArmContext: {
      swapGiB: { min: Math.min(...swaps), median: percentile(swaps, 0.5), max: Math.max(...swaps) },
      macCpu: { median: percentile(macCpu, 0.5), p99: percentile(macCpu, 0.99) },
    },
    gatewayRequests,
    nativeMetrics,
    hostSamples: host,
    vmSamples: vm,
    replicaHistoryMiB: bench.config.replicaHistoryMiB,
    seedBatchFacts: bench.config.seedBatchFacts,
    ladder256: bench.priorities?.P1?.ladder?.find((r) => r.readers === 256) ?? null,
    bandsAtL256: bench.priorities?.P2?.bandsAtL256 ?? null,
    scheduler256: summary.schedulerByPhase?.L256 ?? null,
    nativeSettings: nativeKind ? read(path.join(dir, "config/tx-native-settings.json")) : null,
  });
}
if (
  new Set(rows.map((r) => r.digest)).size !== 1 ||
  new Set(rows.map((r) => r.commands)).size !== 1
)
  throw Error("Workload/denominator changed inside session");
const controls = rows.filter(
    (r) =>
      r.arm ===
      ([
        "publication-floor",
        "record-clock-floor",
        "record-clock-256",
        "cpu-floor",
        "fallback-floor",
        "history-256",
        "seed-floor",
        "writer-256",
      ].includes(kind) || !!nativeKind
        ? "baseline"
        : "off"),
  ),
  off50 = controls.reduce((s, r) => s + r.p50Ms, 0) / controls.length,
  off99 = controls.reduce((s, r) => s + r.p99Ms, 0) / controls.length;
for (const r of rows) {
  r.controlTags = controls.map((c) => c.tag);
  r.controlP50Ms = off50;
  r.controlP99Ms = off99;
  r.deltaP50Ms = r.p50Ms - off50;
  r.deltaP50Percent = 100 * (r.p50Ms / off50 - 1);
}
const text = [
  "# " + prefix,
  "",
  `Source ${source}; one session, common host/VM sampling, 10,000 subjects, ${readerDiagnostic ? "frozen 300-second reader-ladder diagnostic (normal 45-second levels, not a full verdict)" : "frozen 200-second zero-reader segment"}. Control is mean bookend control-arm quantiles; no pooled-percentile claim. Host context spans first scheduled to last finished primary commit; post-run oracle CPU is excluded.`,
  "",
  "| arm / level | p50 ms | p99 ms | control p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |",
  "| --- | ---: | ---: | --- | --- | --- | --- |",
  ...rows.map(
    (r) =>
      `| ${r.arm} / ${r.level} | ${r.p50Ms.toFixed(3)} | ${r.p99Ms.toFixed(3)} | ${off50.toFixed(3)} / ${off99.toFixed(3)} | ${r.deltaP50Ms.toFixed(3)} / ${r.deltaP50Percent.toFixed(2)}% | ${r.swapGiB.median.toFixed(3)} (${r.swapGiB.min.toFixed(3)}-${r.swapGiB.max.toFixed(3)}) | ${r.macCpu.median?.toFixed(1)} / ${r.macCpu.p99?.toFixed(1)} |`,
  ),
  "",
  `Controls: ${controls.map((r) => r.tag).join(", ")}. Each arm: ${rows[0].commands} completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.`,
  "",
];
if (kind.startsWith("record-clock-"))
  text.push(
    "| arm | server submissions | ordered submissions | clock replays | ticket wait total ms |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (r) =>
        `| ${r.arm} | ${r.writerCountersDelta.serverAssignedSubmissions} | ${r.writerCountersDelta.clientOrderedSubmissions} | ${r.writerCountersDelta.clockReplays} | ${(r.writerCountersDelta.ticketWaitMicros / 1000).toFixed(3)} |`,
    ),
    "",
  );
const candidates = rows.filter((r) => r.arm !== "baseline" && r.arm !== "off");
if (readerDiagnostic)
  text.push(
    "| arm | L256 small commit p50 / p99 ms | L256 read p99 ms | correct pulls/s | phase swap GiB / Mac CPU % |",
    "| --- | --- | ---: | ---: | --- |",
    ...rows.map(
      (r) =>
        `| ${r.arm} | ${r.bandsAtL256["5-10"].p50Ms.toFixed(3)} / ${r.bandsAtL256["5-10"].p99Ms.toFixed(3)} | ${r.ladder256.read.p99Ms.toFixed(3)} | ${r.ladder256.goodputPerS.toFixed(1)} | ${r.hostAtL256.swapGiB.median.toFixed(3)} / ${r.hostAtL256.macCpu.median.toFixed(1)} |`,
    ),
    "",
  );
const result = {
  comparisonAtL256: readerDiagnostic
    ? {
        smallP50Ms: compare(
          controls.map((r) => r.bandsAtL256["5-10"].p50Ms),
          candidates.map((r) => r.bandsAtL256["5-10"].p50Ms),
        ),
        smallP99Ms: compare(
          controls.map((r) => r.bandsAtL256["5-10"].p99Ms),
          candidates.map((r) => r.bandsAtL256["5-10"].p99Ms),
        ),
        readP99Ms: compare(
          controls.map((r) => r.ladder256.read.p99Ms),
          candidates.map((r) => r.ladder256.read.p99Ms),
        ),
      }
    : null,
  comparison:
    [
      "publication-floor",
      "record-clock-floor",
      "record-clock-256",
      "cpu-floor",
      "fallback-floor",
      "history-256",
      "seed-floor",
      "writer-256",
    ].includes(kind) || !!nativeKind
      ? {
          p50Ms: compare(
            controls.map((r) => r.p50Ms),
            candidates.map((r) => r.p50Ms),
          ),
          p99Ms: compare(
            controls.map((r) => r.p99Ms),
            candidates.map((r) => r.p99Ms),
          ),
        }
      : null,
  bookendDriftP50Ms: Math.abs(controls[0].p50Ms - controls.at(-1).p50Ms),
  source,
  session: prefix,
  kind,
  candidateRuns: candidates.length,
  controls: controls.map((r) => r.tag),
  rows,
};
fs.writeFileSync(path.join(session, "MEASUREMENTS.json"), JSON.stringify(result, null, 2) + "\n");
fs.writeFileSync(path.join(session, "MEASUREMENTS.md"), text.join("\n"));
console.log(JSON.stringify(result));
