// @ts-nocheck -- Recorded-run JSON is validated at this boundary.
import fs from "node:fs";
import path from "node:path";
import { records, filesUnder, percentile } from "./report.mjs";
const [base, prefix] = process.argv.slice(2),
  session = path.join(base, prefix + "-session");
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const source = fs.readFileSync(path.join(session, "head.txt"), "utf8").trim();
const rows = [];
let hashes;
// [DX-T1-2] Why: report the existing gate values only after rereading exact source-bound attempt data and common host samples.
// Rejected: claim PASS from controller exit or compare latency with historical off controls.
for (const arm of ["off-before", "zero", "ladder", "off-after"]) {
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
  if (b.config.zeroReaders !== (arm !== "ladder")) throw Error("Wrong reader arm");
  const swaps = [];
  let vm = 0;
  for (const f of filesUnder(path.join(dir, "trace/raw")).filter((f) =>
    /system-.*jsonl.gz$/.test(f),
  ))
    for await (const r of records(f)) {
      if (r.run !== tag || r.source !== source || r.slot !== tag || r.at < m.startedAt - 1000)
        throw Error("Stale/foreign resource sample");
      if (r.process === "system-darwin") {
        const v = /used\s*=\s*([\d.]+)M/.exec(r.swap ?? "");
        if (v) swaps.push(Number(v[1]) / 1024);
      }
      if (r.process === "system-linux" && Object.keys(r.cgroups ?? {}).length >= 4) vm++;
    }
  if (!swaps.length || !vm) throw Error("Missing host/VM observations");
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
  if (arm === "ladder") walk(b.priorities);
  rows.push({
    tag,
    arm,
    level: m.level,
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
  off50 = controls.reduce((s, r) => s + r.p50Ms, 0) / 2,
  off99 = controls.reduce((s, r) => s + r.p99Ms, 0) / 2;
for (const r of rows) {
  r.controlTags = controls.map((c) => c.tag);
  r.controlP50Ms = off50;
  r.controlP99Ms = off99;
}
const text = [
  "# " + prefix,
  "",
  `Source ${source}. One quiet hold, bookend 200-second off references and the unchanged full 900-second zero/ladder pair. Control and pair workloads differ in duration; off figures show host/session context, not a matched reader-load improvement claim.`,
  "",
  "| arm / tracing | primary p50 ms | primary p99 ms | off control p50 / p99 ms | swap GiB median (min-max) |",
  "| --- | ---: | ---: | --- | --- |",
  ...rows.map(
    (r) =>
      `| ${r.arm} / ${r.level} | ${r.p50Ms.toFixed(3)} | ${r.p99Ms.toFixed(3)} | ${off50.toFixed(3)} / ${off99.toFixed(3)} | ${r.swapGiB.median.toFixed(3)} (${r.swapGiB.min.toFixed(3)}-${r.swapGiB.max.toFixed(3)}) |`,
  ),
  "",
  `Controls: ${controls.map((r) => r.tag).join(", ")}. The following values/flags are copied from the existing benchmark gates, not independently certified.`,
  "",
  "| gate | observed value | bar | existing flag |",
  "| --- | --- | --- | --- |",
  ...rows
    .find((r) => r.arm === "ladder")
    .gates.map((g) => `| ${g.id} | ${JSON.stringify(g.value)} | ${g.bar} | ${g.pass} |`),
  "",
];
fs.writeFileSync(
  path.join(session, "MEASUREMENTS.json"),
  JSON.stringify({ source, session: prefix, rows }, null, 2) + "\n",
);
fs.writeFileSync(path.join(session, "MEASUREMENTS.md"), text.join("\n"));
