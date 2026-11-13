// @ts-nocheck -- Validated recorded-run boundary; no acceptance contract is changed here.
import fs from "node:fs";
import path from "node:path";
import { records, percentile, filesUnder } from "./report.mjs";
import { configuration } from "./components.mjs";
import { bookendComparison } from "./anatomy.mjs";
const [base, prefix, kind] = process.argv.slice(2);
if (!["ablation", "cost", "anatomy", "cpu-floor", "fallback-floor", "history-256"].includes(kind))
  throw Error("Expected ablation or cost");
const session = path.join(base, prefix + "-session"),
  source = fs.readFileSync(path.join(session, "head.txt"), "utf8").trim();
const arms =
  kind === "ablation"
    ? ["off", "tx-jfr", "gw-jfr", "postgres", "gateway", "node", "native-logs", "full", "off"]
    : kind === "anatomy"
      ? ["off", "anatomy", "anatomy", "off"]
      : kind === "history-256"
        ? ["baseline", "history-192", "history-192", "baseline"]
        : kind === "fallback-floor"
          ? ["baseline", "fallback-worker", "fallback-worker", "baseline"]
          : kind === "cpu-floor"
            ? ["baseline", "engine-isolated", "engine-isolated", "baseline"]
            : ["off", "summary", "summary", "off"];
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const rows = [];
let buildHashes;
// [DX-T1-2] Why: inspect the actual container environment/JVM options, PG readback and fresh raw resource bytes.
// Rejected: treating a directory name or successful process exit as proof that its requested recorder was measured.
for (const [i, arm] of arms.entries()) {
  const tag = `${prefix}-${i + 1}-${arm}`,
    dir = path.join(base, tag),
    bench = read(path.join(dir, "driver/ns-report.json")),
    manifest = read(path.join(dir, "trace-run.json")),
    summary = read(path.join(dir, "trace-summary.json"));
  const actualHashes = fs.readFileSync(path.join(dir, "source-build-hashes.json"), "utf8");
  if (buildHashes !== undefined && actualHashes !== buildHashes)
    throw Error("Source/build bytes changed inside session");
  buildHashes = actualHashes;
  const effective = configuration({
    TRIPLEX_TRACE_LEVEL:
      arm === "off"
        ? "off"
        : arm === "summary" || ["fallback-floor", "history-256"].includes(kind)
          ? "summary"
          : "full",
    TRIPLEX_TRACE_SESSION: prefix,
    ...(!["full", "summary"].includes(arm) && !["fallback-floor", "history-256"].includes(kind)
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
    bench.config?.zeroReaders !== (kind !== "history-256") ||
    bench.config.matchDurationS !== (kind === "history-256" ? 300 : 200) ||
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
  if (kind === "history-256") {
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
  const envOf = (c) =>
    Object.fromEntries(
      c.Config.Env.map((s) => {
        const i = s.indexOf("=");
        return [s.slice(0, i), s.slice(i + 1)];
      }),
    );
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
    macCpu = [];
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
        !Number.isFinite(bench.endedAt) ||
        w.finishedAt > bench.endedAt ||
        Math.abs(w.latencyMs - (w.finishedAt - w.scheduledAt)) > 0.01
      )
        throw Error("Writer content/freshness mismatch");
      sequences.add(w.seq);
      writes.push(w);
    }
  if (
    writes.length !== (kind === "history-256" ? 3530 : 3420) ||
    bench.trace.digest !== "aa8a7636ff027ab3" ||
    bench.writer.pendingAtEnd !== 0 ||
    bench.writer.expired !== 0
  )
    throw Error("Incomplete or changed frozen 200-second trace");
  rows.push({
    tag,
    arm,
    level: manifest.level,
    components: manifest.components,
    source,
    digest: bench.trace.digest,
    commands: writes.length,
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
    swapGiB: { min: Math.min(...swaps), median: percentile(swaps, 0.5), max: Math.max(...swaps) },
    macCpu: {
      median: percentile(macCpu, 0.5),
      p99: percentile(macCpu, 0.99),
      max: macCpu.length ? Math.max(...macCpu) : null,
    },
    gatewayRequests,
    nativeMetrics,
    hostSamples: host,
    vmSamples: vm,
    replicaHistoryMiB: bench.config.replicaHistoryMiB,
    ladder256: bench.priorities?.P1?.ladder?.find((r) => r.readers === 256) ?? null,
    bandsAtL256: bench.priorities?.P2?.bandsAtL256 ?? null,
    scheduler256: summary.schedulerByPhase?.L256 ?? null,
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
      (["cpu-floor", "fallback-floor", "history-256"].includes(kind) ? "baseline" : "off"),
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
  `Source ${source}; one session, common host/VM sampling, 10,000 subjects, ${kind === "history-256" ? "frozen 300-second reader-ladder diagnostic (normal 45-second levels, not a full verdict)" : "frozen 200-second zero-reader segment"}. Control is mean bookend control-arm quantiles; no pooled-percentile claim.`,
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
const candidates = rows.filter((r) => r.arm !== "baseline" && r.arm !== "off");
const result = {
  comparison: ["cpu-floor", "fallback-floor", "history-256"].includes(kind)
    ? {
        p50Ms: bookendComparison(
          controls.map((r) => r.p50Ms),
          candidates.map((r) => r.p50Ms),
        ),
        p99Ms: bookendComparison(
          controls.map((r) => r.p99Ms),
          candidates.map((r) => r.p99Ms),
        ),
      }
    : null,
  bookendDriftP50Ms: Math.abs(controls[0].p50Ms - controls.at(-1).p50Ms),
  source,
  session: prefix,
  kind,
  controls: controls.map((r) => r.tag),
  rows,
};
fs.writeFileSync(path.join(session, "MEASUREMENTS.json"), JSON.stringify(result, null, 2) + "\n");
fs.writeFileSync(path.join(session, "MEASUREMENTS.md"), text.join("\n"));
console.log(JSON.stringify(result));
