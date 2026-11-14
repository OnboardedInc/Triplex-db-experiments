// @ts-nocheck -- [DX-T1-7] Why: heterogeneous recorded bytes are validated at this boundary. Rejected: unchecked source/slot/time or denominator assumptions.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { records, filesUnder, percentile } from "./report.mjs";
import { validateWriterBoundary, observedRunEnd } from "./anatomy.mjs";
const summarize = (xs) => ({
  n: xs.length,
  p50: percentile(xs, 0.5),
  p99: percentile(xs, 0.99),
  max: xs.length ? Math.max(...xs) : null,
});

// [DX-T1-7] Why: heap/GC and stall comparisons need complete primary bytes and this writer's own isolate clock.
// Rejected: process RSS as writer heap, post-run oracle GC as measured stalls, or a sampled subset as all-primary p99.
export function writerStats(manifest, bench, writes, events) {
  if (bench.status !== "DONE" || manifest.level === "off" || !writes.length)
    throw Error("Incomplete writer study");
  if (
    bench.writer?.pendingAtEnd !== 0 ||
    bench.correctness?.errors !== 0 ||
    bench.correctness?.violations !== 0 ||
    bench.priorities?.P2?.accounting?.byStreamAndOutcome?.["background:committed"] !==
      writes.length ||
    manifest.slot !== manifest.tag ||
    !/^[a-f0-9]{40}$/.test(manifest.source)
  )
    throw Error("Incomplete writer accounting");
  const sequences = new Set();
  for (const w of writes) {
    if (
      !Number.isSafeInteger(w.seq) ||
      sequences.has(w.seq) ||
      w.outcome !== "committed" ||
      w.expired ||
      !Number.isFinite(w.startedAt) ||
      w.startedAt < w.scheduledAt ||
      w.startedAt > w.finishedAt ||
      !/^[a-f0-9]{32}$/.test(w.traceId)
    )
      throw Error("Invalid primary writer content");
    sequences.add(w.seq);
  }
  const primary = new Map(
    writes.filter((w) => w.stream === "background" && !w.resend).map((w) => [w.traceId, w]),
  );
  if (primary.size !== writes.length || primary.has(undefined))
    throw Error("Duplicate/missing primary trace identity");
  const start = Math.min(...writes.map((w) => w.scheduledAt)),
    end = Math.max(...writes.map((w) => w.finishedAt));
  const roots = new Map(),
    gc = [],
    heaps = [],
    late = [],
    kinds = {};
  for (const e of events) {
    if (
      e.run !== manifest.tag ||
      e.source !== manifest.source ||
      e.slot !== manifest.slot ||
      e.thread !== 0
    )
      throw Error("Foreign writer telemetry");
    const at = e.start ?? e.at;
    if (Number.isFinite(at) && at < manifest.startedAt - 1) throw Error("Stale writer telemetry");
    if (e.type === "request" && primary.has(e.traceId)) {
      if (roots.has(e.traceId)) throw Error("Duplicate writer trace");
      const w = primary.get(e.traceId);
      if (e.kind !== "commit" || e.attributes?.seq !== w.seq || e.attributes?.stream !== w.stream)
        throw Error("Writer trace command mismatch");
      validateWriterBoundary(w, e);
      if (e.end > observedRunEnd(bench.endedAt) + 1) throw Error("Future writer boundary");
      roots.set(e.traceId, e);
      for (const s of e.spans)
        if (s.name === "driver.queue.scheduler-late" && s.end - s.start > 50) {
          if (s.start < e.start || s.end > e.end) throw Error("Stall outside commit");
          late.push({ start: s.start, end: s.end, traceId: e.traceId });
        }
    }
    if (e.name === "node.gc" && e.start >= start && e.start <= end) {
      if (!Number.isFinite(e.end) || e.end < e.start) throw Error("Invalid GC interval");
      gc.push(e.end - e.start);
      const k = String(e.kind ?? "unrecorded");
      kinds[k] = (kinds[k] ?? 0) + 1;
    }
    if (
      e.type === "resource" &&
      e.at >= start &&
      e.at <= end &&
      Number.isFinite(e.memory?.heapUsed)
    )
      heaps.push(e);
  }
  if (roots.size !== primary.size || !heaps.length)
    throw Error("Incomplete writer telemetry denominator");
  const unions = [];
  for (const v of late.toSorted((a, b) => a.start - b.start)) {
    const last = unions.at(-1);
    if (last && v.start <= last.end) last.end = Math.max(last.end, v.end);
    else unions.push({ start: v.start, end: v.end });
  }
  const over = writes.filter((w) => w.latencyMs > 50);
  return {
    source: manifest.source,
    tag: manifest.tag,
    level: manifest.level,
    commands: writes.length,
    start,
    end,
    latency: summarize(writes.map((w) => w.latencyMs)),
    over50: { count: over.length, totalMs: over.reduce((n, w) => n + w.latencyMs, 0) },
    schedulerLate50: {
      intervals: late.length,
      totalMs: late.reduce((n, v) => n + v.end - v.start, 0),
      episodes: unions.length,
      unionMs: unions.reduce((n, v) => n + v.end - v.start, 0),
      worst: late.toSorted((a, b) => b.end - b.start - (a.end - a.start)).slice(0, 5),
    },
    gc: { ...summarize(gc), totalMs: gc.reduce((n, v) => n + v, 0), kinds },
    heapUsed: summarize(heaps.map((e) => e.memory.heapUsed)),
    heapSpaces: heaps.at(-1).heapSpaces ?? null,
    note: "GC event durations and overlapping scheduler-lateness intervals are observations, not exclusive CPU or causal assignments. GC kinds absent in older recorders remain unrecorded.",
  };
}
export async function buildWriterStats(dir) {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const m = read("trace-run.json"),
    b = read("driver/ns-report.json"),
    ws = [],
    es = [];
  if (
    m.tag !== path.basename(path.resolve(dir)) ||
    m.source !== fs.readFileSync(path.join(dir, "head.txt"), "utf8").trim()
  )
    throw Error("Writer directory/source mismatch");
  for await (const w of records(path.join(dir, "driver/ns-writes.jsonl")))
    if (w.stream === "background" && !w.resend) ws.push(w);
  for (const f of filesUnder(path.join(dir, "trace/raw")).filter((f) =>
    /\/node-.*-0\.jsonl.gz$/.test(f),
  ))
    for await (const e of records(f)) es.push(e);
  const result = writerStats(m, b, ws, es);
  result.reporterSha256 = createHash("sha256")
    .update(fs.readFileSync(fileURLToPath(import.meta.url)))
    .digest("hex");
  return result;
}
export function writerStatsMarkdown(r) {
  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(3) : "n/a");
  return `\n## Writer heap, GC and scheduler stalls\n\nSource ${r.source}; ${r.commands} complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.\n\n| writer metric | observed |\n| --- | --- |\n| Heap used median / peak MiB | ${fmt(r.heapUsed.p50 / 1048576)} / ${fmt(r.heapUsed.max / 1048576)} |\n| GC events / total duration / maximum ms | ${r.gc.n} / ${fmt(r.gc.totalMs)} / ${fmt(r.gc.max)} |\n| GC kinds (1 minor, 4 major, 8 incremental) | ${JSON.stringify(r.gc.kinds)} |\n| Scheduler lateness >50 ms, per-command intervals / sum ms | ${r.schedulerLate50.intervals} / ${fmt(r.schedulerLate50.totalMs)} |\n| Union stall episodes / duration ms | ${r.schedulerLate50.episodes} / ${fmt(r.schedulerLate50.unionMs)} |\n| All-primary p99 / over-50-ms requests | ${fmt(r.latency.p99)} / ${r.over50.count} |\n\nFull heap-space samples and causing trace IDs are in WRITER-STATS.json and trace/raw.\n`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir, out] = process.argv.slice(2);
  if (!dir || !out) throw Error("writer-stats RUN NEW.json");
  const result = await buildWriterStats(dir);
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
}
