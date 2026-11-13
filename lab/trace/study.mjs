// @ts-nocheck -- Recorded-run JSON is validated at this boundary.
import fs from "node:fs";
import path from "node:path";
import { records, filesUnder, percentile } from "./report.mjs";
const [base, prefix] = process.argv.slice(2),
  session = path.join(base, prefix + "-session");
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const source = fs.readFileSync(path.join(session, "head.txt"), "utf8").trim();
const placements = process.argv.includes("--placements");
const modelExperiment = process.argv.includes("--experiment=model");
const partial = process.argv.includes("--partial");
const plannedArms = placements
  ? [
      "off-before",
      "baseline-zero",
      "baseline-ladder",
      "candidate-zero",
      "candidate-ladder",
      "off-after",
    ]
  : ["off-before", "zero", "ladder", "off-after"];
const arms = partial ? plannedArms.filter((a) => a !== "off-after") : plannedArms;
if (partial) {
  const refused = fs.readFileSync(path.join(session, "off-after-controller.log"), "utf8");
  const expected = fs.readFileSync(path.join(base, prefix + "-off-after/head.txt"), "utf8").trim();
  if (
    !refused.includes("less than 15 GiB host disk free") ||
    expected !== source ||
    fs.readFileSync(path.join(session, "remaining.txt"), "utf8").trim()
  )
    throw Error("Missing validated disk-refusal/cleanup evidence");
}
const rows = [];
let hashes;
// [DX-T1-2] Why: report the existing gate values only after rereading exact source-bound attempt data and common host samples.
// Rejected: claim PASS from controller exit or compare latency with historical off controls.
for (const arm of arms) {
  const tag = prefix + "-" + arm,
    dir = path.join(base, tag),
    b = read(path.join(dir, "driver/ns-report.json")),
    m = read(path.join(dir, "trace-run.json")),
    t = read(path.join(dir, "trace-summary.json"));
  const h = fs.readFileSync(path.join(dir, "source-build-hashes.json"), "utf8");
  if (hashes && hashes !== h) throw Error("Source/build bytes changed");
  hashes = h;
  if (
    b.status !== "DONE" ||
    b.seed?.seededSubjects !== 10000 ||
    b.config.readPath !== "replica" ||
    !b.config.strictRecordClocks ||
    m.tag !== tag ||
    m.slot !== tag ||
    m.source !== source ||
    m.session !== prefix ||
    t.source !== source
  )
    throw Error("Unfinished or foreign attempt " + tag);
  const off = arm.startsWith("off");
  if (m.level !== (off ? "off" : "summary") || (off ? !t.disabled : !t.complete))
    throw Error("Wrong/incomplete trace level");
  if (!off && (b.config.matchDurationS !== 900 || b.config.readerLadderOnly))
    throw Error("Full pair was shortened/changed");
  if (b.config.zeroReaders !== !arm.endsWith("ladder")) throw Error("Wrong reader arm");
  let placement;
  if (placements && !off) {
    const candidate = arm.startsWith("candidate"),
      cpuCandidate = candidate && !modelExperiment,
      driver = read(path.join(dir, "driver-container.json"))[0],
      containers = read(path.join(dir, "containers.json"));
    const g = containers.find((c) => c.Name === "/" + tag + "-gw-r");
    const expectedDriver = cpuCandidate ? "3,4,5,6,7" : "4,5,6,7",
      expectedGateway = cpuCandidate ? "2" : "2,3";
    if (
      driver.HostConfig.CpusetCpus !== expectedDriver ||
      g?.HostConfig.CpusetCpus !== expectedGateway
    )
      throw Error("Effective CPU placement mismatch");
    const threadRows = fs
      .readFileSync(path.join(dir, "driver.log"), "utf8")
      .split("\n")
      .filter((l) => l.startsWith('{"type":"node-thread-placement"'))
      .map((l) => JSON.parse(l));
    const expand = (v) =>
      v
        .split(",")
        .flatMap((x) => {
          const [a, b] = x.split("-").map(Number);
          return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i);
        })
        .sort((a, b) => a - b)
        .join(",");
    if (cpuCandidate) {
      if (
        !threadRows.some((r) => r.thread === 0) ||
        threadRows.filter((r) => r.thread !== 0).length < 4
      )
        throw Error("Missing actual main/worker affinity readback");
      for (const r of threadRows) {
        if (
          r.main !== "3" ||
          r.workers !== "4,5,6,7" ||
          expand(r.allowed) !== (r.thread === 0 ? "3" : "4,5,6,7")
        )
          throw Error("Wrong thread affinity");
        for (const b of r.background ?? [])
          if (expand(b.allowed) !== "4,5,6,7") throw Error("Runtime thread shares writer core");
      }
    } else if (threadRows.length) throw Error("Baseline unexpectedly uses thread affinity");
    if (modelExperiment) {
      const env = Object.fromEntries(
        driver.Config.Env.map((e) => {
          const at = e.indexOf("=");
          return [e.slice(0, at), e.slice(at + 1)];
        }),
      );
      if (env.DX_MODEL_COMPACT !== (candidate ? "1" : "0") || b.config.compactModel !== candidate)
        throw Error("Wrong expected-model mode");
    }
    placement = {
      compactModel: modelExperiment && candidate,
      driver: expectedDriver,
      readGateway: expectedGateway,
      threads: threadRows,
    };
  }
  const swaps = [],
    macCpu = [];
  let vm = 0;
  for (const f of filesUnder(path.join(dir, "trace/raw")).filter((f) =>
    /system-.*jsonl.gz$/.test(f),
  ))
    for await (const r of records(f)) {
      if (r.run !== tag || r.source !== source || r.slot !== tag || r.at < m.startedAt - 1000)
        throw Error("Stale/foreign resource sample");
      if (r.process === "system-darwin") {
        if (Number.isFinite(r.otherCpu)) macCpu.push(r.otherCpu);
        const v = /used\s*=\s*([\d.]+)M/.exec(r.swap ?? "");
        if (v) swaps.push(Number(v[1]) / 1024);
      }
      if (r.process === "system-linux" && Object.keys(r.cgroups ?? {}).length >= 4) vm++;
    }
  if (!swaps.length || !macCpu.length || !vm) throw Error("Missing host/VM observations");
  const writes = [];
  for await (const w of records(path.join(dir, "driver/ns-writes.jsonl")))
    if (w.stream === "background" && !w.resend) writes.push(w);
  if (!writes.length) throw Error("No primary commands");
  const gates = [];
  function walk(v) {
    if (!v || typeof v !== "object") return;
    if (v.id && /^NS-P[123]\b/.test(v.id) && "pass" in v) {
      gates.push(v);
      return;
    }
    for (const x of Object.values(v)) walk(x);
  }
  if (arm.endsWith("ladder")) walk(b.priorities);
  rows.push({
    tag,
    arm,
    level: m.level,
    placement,
    source,
    digest: b.trace.digest,
    commands: writes.length,
    p50Ms: percentile(
      writes.map((w) => w.latencyMs),
      0.5,
    ),
    p99Ms: percentile(
      writes.map((w) => w.latencyMs),
      0.99,
    ),
    swapGiB: { min: Math.min(...swaps), median: percentile(swaps, 0.5), max: Math.max(...swaps) },
    macCpu: { median: percentile(macCpu, 0.5), p99: percentile(macCpu, 0.99) },
    oracle: b.oracle,
    gates,
    coverage: t.coverage,
    scheduler: t.schedulerByPhase,
    slowest: t.slowest,
    rawBytes: t.rawBytes,
  });
}
if (new Set(rows.map((r) => r.digest)).size !== 1) throw Error("Workload digest changed");
const controls = rows.filter((r) => r.arm.startsWith("off")),
  off50 = controls.reduce((s, r) => s + r.p50Ms, 0) / controls.length,
  off99 = controls.reduce((s, r) => s + r.p99Ms, 0) / controls.length;
for (const r of rows) {
  r.controlTags = controls.map((c) => c.tag);
  r.controlP50Ms = off50;
  r.controlP99Ms = off99;
}
const text = [
  "# " + prefix,
  "",
  `Source ${source}. ${partial ? "PARTIAL SESSION: closing off control refused for disk; opening control only. " : ""}One measurement hold, 200-second off references and the unchanged full 900-second zero/ladder pair. Control and pair workloads differ in duration; off figures show host/session context, not a matched reader-load improvement claim.`,
  "",
  "| arm / tracing | primary p50 ms | primary p99 ms | off control p50 / p99 ms | swap GiB median (min-max) | Mac non-VM CPU median / p99 % |",
  "| --- | ---: | ---: | --- | --- | --- |",
  ...rows.map(
    (r) =>
      `| ${r.arm} / ${r.level} | ${r.p50Ms.toFixed(3)} | ${r.p99Ms.toFixed(3)} | ${off50.toFixed(3)} / ${off99.toFixed(3)} | ${r.swapGiB.median.toFixed(3)} (${r.swapGiB.min.toFixed(3)}-${r.swapGiB.max.toFixed(3)}) | ${r.macCpu.median.toFixed(1)} / ${r.macCpu.p99.toFixed(1)} |`,
  ),
  "",
  `Controls: ${controls.map((r) => r.tag).join(", ")}. The following values/flags are copied from the existing benchmark gates, not independently certified.`,
  "",
  "| gate | observed value | bar | existing flag |",
  "| --- | --- | --- | --- |",
  ...rows
    .filter((r) => r.arm.endsWith("ladder"))
    .flatMap((r) =>
      r.gates.map(
        (g) => `| ${r.arm}: ${g.id} | ${JSON.stringify(g.value)} | ${g.bar} | ${g.pass} |`,
      ),
    ),
  "",
];
text.push(
  "## Writer CPU versus run-queue wait",
  "",
  "| arm | readers | observed ms | on CPU ms | waiting for CPU ms | tracing | swap GiB median | off p50 ms |",
  "| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |",
);
for (const r of rows.filter((r) => r.arm.endsWith("ladder")))
  for (const phase of ["baseline", "L64", "L256", "L1024"]) {
    const p = r.scheduler?.[phase];
    if (p)
      text.push(
        `| ${r.arm} | ${p.readers} | ${p.spanMs?.toFixed(3)} | ${p.runtimeMs?.toFixed(3)} | ${p.runqueueMs?.toFixed(3) ?? "n/a"} | ${r.level} | ${r.swapGiB.median.toFixed(3)} | ${off50.toFixed(3)} |`,
      );
  }
text.push("");
fs.writeFileSync(
  path.join(session, partial ? "MEASUREMENTS-PARTIAL.json" : "MEASUREMENTS.json"),
  JSON.stringify(
    {
      source,
      session: prefix,
      sessionComplete: !partial,
      missingControl: partial ? "off-after" : null,
      rows,
    },
    null,
    2,
  ) + "\n",
);
fs.writeFileSync(
  path.join(session, partial ? "MEASUREMENTS-PARTIAL.md" : "MEASUREMENTS.md"),
  text.join("\n"),
);
