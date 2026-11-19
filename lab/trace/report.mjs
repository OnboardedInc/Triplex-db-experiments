// @ts-nocheck -- JSON wire records are validated on ingestion; checkjs still checks all bindings.
import fs from "node:fs";
import { loadCpuProfile } from "./cpu-profile.mjs";
import { bindNativeTransaction } from "./native-transactions.mjs";
import {
  writeAnatomy,
  validateDeferredOrder,
  validateCommandTrace,
  validateWriterBoundary,
} from "./anatomy.mjs";
import { timelineDocument } from "./viewer.mjs";
import { writeChromeTrace, writeStreamedFile } from "./render-output.mjs";
import { TraceReportIndex } from "./report-index.mjs";
import { instrumentMarkdown, idleAndPhaseMetrics, idleMarkdown } from "./instrument.mjs";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { createGunzip } from "node:zlib";
import { StringDecoder } from "node:string_decoder";
import { pathToFileURL } from "node:url";

export const LAYERS = [
  "typescript",
  "event-loop",
  "typescript-gc",
  "driver-queue",
  "network",
  "gateway",
  "gateway-queue",
  "gateway-gc",
  "peer-call",
  "peer-wait",
  "transactor",
  "postgres",
  "unknown",
];
const rank = {
  unknown: 0,
  typescript: 1,
  "gateway-wait": 2,
  network: 3,
  gateway: 4,
  "peer-call": 5,
  "peer-wait": 6,
  transactor: 6,
  "gateway-queue": 7,
  "driver-queue": 8,
  "event-loop": 9,
  "typescript-gc": 10,
  "gateway-gc": 11,
};
// [DX-BM1] Why: bind the renderer sources when the process loads them.
// Rejected: hashing a later checkout after a long derivation has already run.
const reporterSha256 = createHash("sha256")
  .update(
    [
      "report.mjs",
      "instrument.mjs",
      "anatomy.mjs",
      "native-transactions.mjs",
      "cpu-profile.mjs",
      "viewer.mjs",
      "render-output.mjs",
      "report-index.mjs",
    ]
      .map((name) => name + "\0" + fs.readFileSync(new URL(name, import.meta.url), "utf8"))
      .join("\0"),
  )
  .digest("hex");
export const percentile = (xs, p) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.max(0, Math.ceil(xs.length * p) - 1)] : null;
const n = (x) => (Number.isFinite(x) ? x.toFixed(3) : "n/a");
const duration = (r) => r.end - r.start;
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isSymbolicLink()
        ? []
        : e.isDirectory()
          ? filesUnder(path.join(dir, e.name))
          : [path.join(dir, e.name)],
    );
}

export async function* records(file) {
  const stream = fs.createReadStream(file);
  const input = file.endsWith(".gz") ? createGunzip() : stream;
  let pumpError;
  const pump =
    input === stream
      ? null
      : pipeline(stream, input).catch((error) => {
          pumpError = error;
        });
  const decoder = new StringDecoder("utf8");
  let remainder = "";
  // [DX-BM1] Why: a killed recorder can leave complete rows followed by an incomplete gzip member.
  // Rejected: readline's detached input error, or allowing a truncated member to qualify as complete.
  try {
    for await (const chunk of input) {
      const text = remainder + decoder.write(chunk);
      let start = 0,
        end;
      while ((end = text.indexOf("\n", start)) >= 0) {
        const line = text.slice(start, end);
        if (line.trim()) yield JSON.parse(line);
        start = end + 1;
      }
      remainder = text.slice(start);
    }
    await pump;
    if (pumpError) throw pumpError;
    remainder += decoder.end();
    if (remainder.trim()) yield JSON.parse(remainder);
  } finally {
    input.destroy();
    await pump;
  }
}
// [DX-T1-2] Why: JVM nanoTime and Node hrtime use the same Linux boot clock even when startup wall anchors differ.
// Rejected: infer network time from a gateway clipped away by clock skew, or silently guess an offset from a request duration.
export function alignClockRecord(row, reference) {
  // [DX-T1-12] Why: Mac wall samples and stepped JFR epoch anchors have no measured bridge to the writer's boot clock.
  // Rejected: display a guessed 100-ms overlap as evidence that host I/O or a JVM pause caused one commit.
  const jfr = row.type === "event" && (row.nativeType || /^jdk\./.test(row.name ?? ""));
  if (
    row.process === "system-darwin" ||
    row.clock?.crossProcessQualified === false ||
    (jfr && row.clock?.crossProcessQualified !== true)
  )
    return { ...row, clockAlignmentQualified: false };
  if (!row.clock || row.clock.domain !== "linux-monotonic" || !reference) return row;
  if (
    row.clock.bootId !== reference.bootId ||
    !Number.isFinite(row.clock.offsetMs) ||
    !Number.isFinite(reference.offsetMs)
  )
    throw Error("Foreign/invalid monotonic clock binding");
  const shift = reference.offsetMs - row.clock.offsetMs;
  const point = (p) => (p ? { ...p, at: p.at + shift } : p);
  return {
    ...row,
    clock: reference,
    rawClockOffsetMs: row.clock.offsetMs,
    clockAlignmentMs: shift,
    ...(Number.isFinite(row.start) ? { start: row.start + shift, end: row.end + shift } : {}),
    ...(Number.isFinite(row.at) ? { at: row.at + shift } : {}),
    ...(row.schedulerStart
      ? { schedulerStart: point(row.schedulerStart), schedulerEnd: point(row.schedulerEnd) }
      : {}),
    ...(row.attributes
      ? {
          attributes: {
            ...row.attributes,
            ...(Number.isFinite(row.attributes.submittedAt)
              ? { submittedAt: row.attributes.submittedAt + shift }
              : {}),
          },
        }
      : {}),
    ...(row.spans
      ? {
          spans: row.spans.map((s) => ({
            ...s,
            start: s.start + shift,
            end: s.end + shift,
            ...(s.schedulerStart
              ? { schedulerStart: point(s.schedulerStart), schedulerEnd: point(s.schedulerEnd) }
              : {}),
          })),
        }
      : {}),
  };
}
function validSpan(s) {
  return (
    typeof s.name === "string" &&
    typeof s.layer === "string" &&
    Number.isFinite(s.start) &&
    Number.isFinite(s.end) &&
    s.end >= s.start
  );
}
function* contextEvents(row, index) {
  const { start, end } = row.root;
  for (const event of index.overlap(start, end, "event", "e.layer != 'jvm-event'"))
    if (!event.traceId || event.traceId !== row.traceId) yield event;
  const threads = new Map(
    row.spans.map((span) => [`${span.process}:${span.thread}`, [span.process, span.thread]]),
  );
  for (const [process, thread] of threads.values())
    for (const event of index.overlap(
      start,
      end,
      "event",
      "e.layer = 'jvm-event' AND e.process IS ? AND e.thread IS ?",
      process ?? null,
      thread ?? null,
    ))
      if (!event.traceId || event.traceId !== row.traceId) yield event;
}
function* chromeEvents(selected, index) {
  const processIds = new Map();
  function* onProcess(name, event) {
    if (!processIds.has(name)) {
      const id = processIds.size + 1;
      processIds.set(name, id);
      yield { name: "process_name", ph: "M", pid: id, tid: 0, args: { name } };
    }
    yield { ...event, pid: processIds.get(name) };
  }
  const start = Math.min(...selected.map((r) => r.root.start));
  for (const r of selected) {
    for (const p of r.cpuProfile?.points ?? [])
      yield* onProcess(r.root.process, {
        name: "CPU sample " + p.stack[0],
        cat: "cpu-sample",
        ph: "i",
        s: "t",
        ts: (p.at - start) * 1000,
        tid: r.root.thread,
        args: { traceId: r.traceId, stack: p.stack, sampled: true },
      });
    const spanRows = [
      {
        name: r.root.name,
        layer: r.root.kind,
        start: r.root.start,
        end: r.root.end,
        process: r.root.process,
        thread: r.root.thread,
      },
      ...r.spans,
    ];
    for (const s of spanRows)
      yield* onProcess(s.process ?? r.root.process, {
        name: s.name,
        cat: s.layer,
        ph: "X",
        ts: (s.start - start) * 1000,
        dur: duration(s) * 1000,
        tid: s.thread ?? r.root.thread,
        args: { traceId: r.traceId, phase: r.name, priority: r.priority },
      });
    if (r.replicaPublication) {
      const p = r.replicaPublication,
        flowId = "position-" + r.traceId;
      yield* onProcess(p.process, {
        name: "replica publication (position link)",
        cat: "replica",
        ph: "X",
        ts: (p.start - start) * 1000,
        dur: duration(p) * 1000,
        tid: p.thread,
        args: { traceId: r.traceId, feedTraceId: p.traceId, position: r.writer.position },
      });
      yield* onProcess(r.root.process, {
        name: "commit to replica position link",
        cat: "replica",
        ph: "s",
        ts: (r.root.start - start) * 1000,
        tid: r.root.thread,
        id: flowId,
      });
      yield* onProcess(p.process, {
        name: "commit to replica position link",
        cat: "replica",
        ph: "f",
        ts: (p.start - start) * 1000,
        tid: p.thread,
        id: flowId,
        bp: "e",
      });
    }
    for (const e of contextEvents(r, index))
      yield* onProcess(e.process, {
        name: e.name,
        cat: e.layer,
        ph: "X",
        ts: (e.start - start) * 1000,
        dur: duration(e) * 1000,
        tid: e.thread ?? 0,
        args: {
          overlapsTrace: r.traceId,
          estimated: !!e.estimated,
          originalStartMs: e.start,
          originalEndMs: e.end,
        },
      });
  }
}
function* pressureEvents(resources) {
  const previous = new Map();
  for (const sample of resources)
    for (const [container, stats] of Object.entries(sample.cgroups ?? {})) {
      const counters = Object.fromEntries(
        (stats["cpu.stat"] ?? "")
          .trim()
          .split("\n")
          .map((s) => s.split(" "))
          .filter((s) => s.length === 2)
          .map(([k, v]) => [k, Number(v)]),
      );
      const old = previous.get(container);
      if (old && counters.throttled_usec > old.throttled)
        yield {
          type: "event",
          name: `${container} CPU throttled ${(counters.throttled_usec - old.throttled) / 1000}ms in sample`,
          layer: "throttling",
          process: container,
          thread: 0,
          start: old.at,
          end: sample.at,
          estimated: true,
        };
      previous.set(container, { at: sample.at, throttled: counters.throttled_usec });
    }
}
// [DX-T1] Why: wire propagation must bind both the trace and the exact sending span, including multi-hop fallback.
// Rejected: joining requests by trace ID alone or treating a missing worker as TypeScript own work.
export function traceChildren(root, candidates) {
  const found = [],
    pending = candidates.filter(
      (r) =>
        r !== root &&
        r.traceId === root.traceId &&
        r.run === root.run &&
        r.source === root.source &&
        r.slot === root.slot,
    );
  const ids = new Set([root.root, ...root.spans.map((s) => s.id)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = pending.length - 1; i >= 0; i--) {
      const r = pending[i];
      if (!r.parent || !ids.has(r.parent)) continue;
      found.push(r);
      pending.splice(i, 1);
      ids.add(r.root);
      for (const s of r.spans) ids.add(s.id);
      changed = true;
    }
  }
  return found;
}
// [DX-T1-2] Why: synchronous scopes cannot overlap another JS request on the same isolate; nested counters are unioned.
// Rejected: assigning an async request's whole-thread CPU delta exclusively to that request.
export function synchronousCpu(root) {
  const scopes = root.spans.filter((s) => s.synchronous && s.schedulerStart && s.schedulerEnd);
  const samples = scopes
    .flatMap((s) => [s.schedulerStart, s.schedulerEnd])
    .sort((a, b) => a.at - b.at);
  let runtime = 0,
    wait = 0,
    wall = 0,
    waitEnabled = true;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1],
      b = samples[i];
    if (b.at <= a.at) continue;
    if (!scopes.some((s) => s.schedulerStart.at <= a.at && s.schedulerEnd.at >= b.at)) continue;
    if (b.runtimeNs < a.runtimeNs || b.runqueueNs < a.runqueueNs) continue;
    runtime += (b.runtimeNs - a.runtimeNs) / 1e6;
    wait += (b.runqueueNs - a.runqueueNs) / 1e6;
    wall += b.at - a.at;
    waitEnabled &&= a.waitEnabled && b.waitEnabled;
  }
  return {
    cpuRuntimeMs: wall ? runtime : null,
    cpuRunqueueMs: wall && waitEnabled ? wait : null,
    cpuScopeWallMs: wall || null,
  };
}
export function attribute(root, gateways = [], events = [], remotes = []) {
  const all = root.spans.map((s) => ({ ...s, process: root.process, thread: root.thread }));
  for (const r of remotes) {
    all.push({
      id: r.root,
      parent: r.parent,
      name: r.name,
      layer: "typescript",
      start: r.start,
      end: r.end,
      process: r.process,
      thread: r.thread,
      attributes: r.attributes,
    });
    all.push(...r.spans.map((s) => ({ ...s, process: r.process, thread: r.thread })));
  }
  for (const g of gateways) {
    all.push({
      id: g.root,
      parent: g.parent,
      name: g.name,
      layer: "gateway",
      start: g.start,
      end: g.end,
      process: g.process,
      thread: g.thread,
      attributes: { ...g.attributes, counters: JSON.stringify(g.counters ?? {}) },
    });
    all.push(...g.spans.map((s) => ({ ...s, process: g.process, thread: s.thread ?? g.thread })));
    const awaitSpan = g.spans.find((s) => s.name.startsWith("peer.transact-await"));
    const submitted = g.attributes?.submittedAt;
    if (
      awaitSpan &&
      Number.isFinite(submitted) &&
      submitted >= awaitSpan.start &&
      submitted <= awaitSpan.end
    )
      all.push({
        id: `${awaitSpan.id}-order`,
        parent: awaitSpan.id,
        name: "gateway.commit-order-wait",
        layer: "gateway-queue",
        start: awaitSpan.start,
        end: submitted,
        process: g.process,
        thread: g.thread,
      });
  }
  // [DX-T1-4] Why: only the exact submitted peer span owns this native transaction-function event.
  // Rejected: assigning a coincident JVM event to whichever commit has the nearest timestamp.
  const parents = new Set(all.map((s) => s.id));
  all.push(
    ...events.filter(
      (e) =>
        e.nativeType === "triplex.TransactionFunction" &&
        e.process === "tx" &&
        e.traceId === root.traceId &&
        e.run === root.run &&
        e.source === root.source &&
        e.slot === root.slot &&
        parents.has(e.parent),
    ),
  );
  const byId = new Map(all.filter((s) => s.id).map((s) => [s.id, s]));
  const depths = new Map([[root.root, 0]]);
  function depth(s, seen = new Set()) {
    if (depths.has(s.id)) return depths.get(s.id);
    if (seen.has(s.id)) return 0;
    seen.add(s.id);
    const parent = byId.get(s.parent),
      value = parent ? 1 + depth(parent, seen) : 1;
    depths.set(s.id, value);
    return value;
  }
  // Clip receiver finalization to its sending wait for exclusive latency; raw observations remain in the trace store.
  const spans = all
    .filter(validSpan)
    .map((s) => {
      let start = Math.max(root.start, s.start),
        end = Math.min(root.end, s.end),
        parent = byId.get(s.parent);
      const seen = new Set([s.id]);
      while (parent && !seen.has(parent.id)) {
        seen.add(parent.id);
        start = Math.max(start, parent.start);
        end = Math.min(end, parent.end);
        parent = byId.get(parent.parent);
      }
      return { ...s, start, end };
    })
    .filter((s) => s.end > s.start);
  // [DX-T1] Why: sort once per request; never sort all candidates at every boundary or charge an ambient pause to a remote wait.
  // Rejected: GC overlap as causal latency, and scanning every run event for every request.
  const ordered = [...spans].sort(
    (x, y) =>
      depth(y) - depth(x) ||
      (rank[y.layer] ?? 0) - (rank[x.layer] ?? 0) ||
      duration(x) - duration(y),
  );
  // [DX-T1-12] Why: a long async wait can overlap thousands of unrelated pauses; only a pause that could replace an exclusive code segment needs an attribution boundary.
  // Rejected: split every request at every ambient GC event (quadratic work); all ambient events remain in the timeline and raw evidence.
  const basePoints = [
    ...new Set([root.start, root.end, ...spans.flatMap((s) => [s.start, s.end])]),
  ].sort((a, b) => a - b);
  const eligible = [];
  for (let i = 1; i < basePoints.length; i++) {
    const start = basePoints[i - 1],
      end = basePoints[i],
      selected = ordered.find((s) => s.start <= start && s.end >= end);
    if (selected && ["typescript", "gateway", "peer-call"].includes(selected.layer))
      eligible.push({ start, end, selected });
  }
  const pauses = events.filter(
    (e) =>
      !e.estimated &&
      ["typescript-gc", "gateway-gc"].includes(e.layer) &&
      e.start < root.end &&
      e.end > root.start &&
      eligible.some(
        ({ start, end, selected: s }) =>
          e.start < end &&
          e.end > start &&
          e.process === (s.process ?? root.process) &&
          ((e.layer === "typescript-gc" &&
            s.layer === "typescript" &&
            e.thread === (s.thread ?? root.thread)) ||
            (e.layer === "gateway-gc" && ["gateway", "peer-call"].includes(s.layer))),
      ),
  );
  const points = [
    ...new Set([
      ...basePoints,
      ...pauses.flatMap((e) => [Math.max(root.start, e.start), Math.min(root.end, e.end)]),
    ]),
  ].sort((a, b) => a - b);
  const layers = Object.fromEntries(LAYERS.map((k) => [k, 0])),
    steps = {};
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    let selected = ordered.find((s) => s.start <= a && s.end >= b);
    const pause = pauses.find(
      (e) =>
        e.start <= a &&
        e.end >= b &&
        e.process === (selected?.process ?? root.process) &&
        ((e.layer === "typescript-gc" &&
          selected?.layer === "typescript" &&
          e.thread === (selected.thread ?? root.thread)) ||
          (e.layer === "gateway-gc" && ["gateway", "peer-call"].includes(selected?.layer))),
    );
    if (pause) selected = pause;
    const layer =
      selected?.layer === "gateway-wait"
        ? gateways.some((g) => g.parent === selected.id || g.parent === selected.parent)
          ? "network"
          : "unknown"
        : LAYERS.includes(selected?.layer)
          ? selected.layer
          : "unknown";
    layers[layer] += b - a;
    const step = selected
      ? `${selected.process ?? root.process}/thread-${selected.thread ?? root.thread}/${selected.name}`
      : "uncovered";
    steps[step] = (steps[step] ?? 0) + b - a;
  }
  if (!spans.some((s) => s.layer === "event-loop")) layers["event-loop"] = null;
  if (!spans.some((s) => s.layer === "transactor")) layers.transactor = null;
  if (!spans.some((s) => s.layer === "postgres")) layers.postgres = null;
  const wall = duration(root),
    ts =
      layers.typescript + layers["event-loop"] + layers["typescript-gc"] + layers["driver-queue"];
  return {
    traceId: root.traceId,
    ...synchronousCpu(root),
    wallMs: wall,
    layers,
    typescriptMs: ts,
    typescriptShare: wall ? ts / wall : 0,
    unexplainedMs: layers.unknown,
    explained: wall ? 1 - layers.unknown / wall : 0,
    steps: Object.entries(steps).sort((a, b) => b[1] - a[1]),
    spans,
  };
}
function phaseOf(r, phases) {
  const specified = r.attributes?.phase;
  if (specified === -2) return { name: "read-your-own-write", priority: "P2/P4" };
  const phase =
    specified !== undefined
      ? phases.find((p) => p.idx === specified || p.idx + 1000 === specified)
      : phases.find((p) => r.start >= p.start && r.start < p.end);
  const name = phase?.name ?? "outside-phases";
  const priority =
    r.name === "replica.follow" || /^http .*\/(transactions|journal)$/.test(r.name)
      ? "P3"
      : /sweep|activation|impact/.test(name)
        ? "P5"
        : /p4|history|current|weighted|depth/.test(name)
          ? "P4"
          : r.kind === "commit"
            ? "P2"
            : "P1";
  return { name, priority, readers: phase?.readers ?? null };
}
const measures = [
  "wallMs",
  "cpuRuntimeMs",
  "cpuRunqueueMs",
  "cpuScopeWallMs",
  ...LAYERS,
  "typescriptMs",
  "typescriptShare",
  "unexplainedMs",
];

function table(quantiles) {
  const lines = [
    `| quantile | ${measures.join(" | ")} |`,
    `| --- | ${measures.map(() => "---:").join(" | ")} |`,
  ];
  for (const [i, label] of ["p50", "p99"].entries())
    lines.push(`| ${label} | ${quantiles.map((pair) => n(pair[i])).join(" | ")} |`);
  return lines.join("\n");
}

async function findWriterClock(input, manifest) {
  for (const file of input) {
    try {
      for await (const row of records(file))
        if (
          row.type === "request" &&
          row.name === "driver.commit" &&
          row.thread === 0 &&
          row.clock?.domain === "linux-monotonic" &&
          (!manifest ||
            (row.run === manifest.tag &&
              row.source === manifest.source &&
              row.slot === manifest.slot))
        )
          return row;
    } catch {
      // Full ingestion records source and corruption diagnostics.
    }
  }
  return null;
}

export async function buildReport(runDir, { copyTo, anatomyTo, outputTo } = {}) {
  const rootDir = path.resolve(runDir),
    tag = path.basename(rootDir);
  const outputDir = outputTo ? path.resolve(outputTo) : rootDir;
  if (outputTo) {
    if (anatomyTo) throw Error("Choose one derivation output directory");
    fs.mkdirSync(outputDir, { mode: 0o700 });
  }
  const reportFile = path.join(rootDir, "driver/ns-report.json");
  const bench = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, "utf8")) : {};
  const manifestFile = path.join(rootDir, "trace-run.json");
  const manifest = fs.existsSync(manifestFile)
    ? JSON.parse(fs.readFileSync(manifestFile, "utf8"))
    : null;
  if (manifest?.level === "off") {
    if (anatomyTo) throw Error("Tracing-off controls have no recorded anatomy");
    const offRows = [];
    const offWrites = path.join(rootDir, "driver/ns-writes.jsonl");
    if (fs.existsSync(offWrites)) for await (const row of records(offWrites)) offRows.push(row);
    const finding =
      "Tracing was intentionally off for this control arm; latency is in ns-report.json and layer attribution is unavailable.";
    const summary = {
      schema: "triplex.trace-report.v1",
      tag,
      source: manifest.source,
      disabled: true,
      complete: false,
      errors: [],
      finding,
      commits: null,
      coverage: null,
      instrumentIdle: idleAndPhaseMetrics(offRows, bench.phases ?? []),
      rawBytes: filesUnder(path.join(rootDir, "trace/raw")).reduce(
        (n, f) => n + fs.statSync(f).size,
        0,
      ),
    };
    const outputs = {
      "TRACE-REPORT.md": `# Trace report\n\n${finding}\n\nRun ${tag}; source ${manifest.source}; subjects ${bench.seed?.seededSubjects ?? "unknown"}. No collection completeness or semantic verdict is asserted.\n${instrumentMarkdown(bench.instrument)}${idleMarkdown(summary.instrumentIdle)}`,
      "trace.html": `<!doctype html><meta charset="utf-8"><title>Tracing off</title><h1>Tracing off</h1><p>${esc(finding)}</p>`,
      "trace.chrome.json": JSON.stringify({ traceEvents: [] }),
      "trace-summary.json": JSON.stringify(summary, null, 2) + "\n",
    };
    for (const [name, bytes] of Object.entries(outputs))
      fs.writeFileSync(path.join(outputDir, name), bytes);
    if (copyTo) {
      fs.mkdirSync(copyTo, { recursive: true });
      for (const name of Object.keys(outputs))
        fs.copyFileSync(
          path.join(outputDir, name),
          path.join(copyTo, name),
          fs.constants.COPYFILE_FICLONE,
        );
    }
    return summary;
  }
  const nodeEnabled = manifest?.nodeEnabled ?? manifest?.level !== "off";
  const input = filesUnder(path.join(rootDir, "trace/raw")).filter((f) =>
    /\.jsonl(\.gz)?$/.test(f),
  );
  const index = new TraceReportIndex(outputDir, manifest?.startedAt ?? 0, measures);
  try {
    return await buildIndexedReport(rootDir, outputDir, bench, manifest, index, input, {
      nodeEnabled,
      copyTo,
      anatomyTo,
    });
  } finally {
    index.close();
  }
}

async function buildIndexedReport(
  rootDir,
  outputDir,
  bench,
  manifest,
  index,
  input,
  { nodeEnabled, copyTo, anatomyTo },
) {
  const tag = path.basename(rootDir);
  const writerClock = await findWriterClock(input, manifest);
  const clockReference = writerClock?.clock;
  const clockSources = [];
  const histograms = [],
    completions = [],
    profileClocks = [];
  const errors = [],
    jfrCounts = new Map();
  let errorCount = 0;
  function recordError(message) {
    errorCount++;
    if (errors.length < 100) errors.push(message);
  }
  let invalidSpanParents = 0,
    unqualifiedEventCount = 0,
    resourceCount = 0;
  let metadataCount = 0,
    exactTop20 = true;
  if (manifest?.requireClockBinding && !clockReference)
    recordError("Writer Linux boot-clock binding missing");
  function align(row) {
    try {
      const aligned = alignClockRecord(row, clockReference);
      if (
        row.clock &&
        clockReference &&
        !clockSources.some((x) => x.process === row.process && x.offsetMs === row.clock.offsetMs)
      )
        clockSources.push({
          process: row.process,
          offsetMs: row.clock.offsetMs,
          shiftMs: aligned.clockAlignmentMs,
          uncertaintyMs: row.clock.uncertaintyMs,
        });
      return aligned;
    } catch (error) {
      recordError(String(error));
      return row;
    }
  }
  function addEvent(row) {
    const aligned = align(row);
    if (aligned.clockAlignmentQualified !== false) index.addEvent(aligned);
    else unqualifiedEventCount++;
  }
  for (const file of input) {
    let footer = false;
    try {
      for await (const r of records(file)) {
        if (
          manifest &&
          (r.run !== manifest.tag || r.source !== manifest.source || r.slot !== manifest.slot)
        ) {
          recordError(`Binding mismatch in ${path.basename(file)}`);
          continue;
        }
        if (r.type === "cpu-profile-clock") profileClocks.push(r);
        else if (r.type === "request") {
          if (manifest && r.start < manifest.startedAt - 1000)
            recordError(`Stale request in ${path.basename(file)}`);
          if (
            r.schema !== "triplex.trace.v1" ||
            !/^[0-9a-f]{32}$/.test(r.traceId) ||
            !Number.isFinite(r.start) ||
            !Number.isFinite(r.end) ||
            r.end < r.start ||
            !Array.isArray(r.spans) ||
            !r.spans.every(validSpan)
          )
            throw Error("invalid request record");
          if (manifest?.requireClockBinding) {
            if (!r.clock) recordError("Request clock binding missing: " + r.traceId);
            const ids = new Set([r.root, ...r.spans.map((s) => s.id)]);
            for (const span of r.spans) if (!ids.has(span.parent)) invalidSpanParents++;
          }
          const aligned = align(r);
          index.addRequest(aligned);
          // [DX-T1] Why: link asynchronous replica work by its validated logical position.
          // Rejected: using the feed poll's unrelated trace ID or including its work in commit latency.
          if (aligned.name === "replica.follow")
            for (const span of aligned.spans)
              if (
                span.name === "replica.publish" &&
                Number.isSafeInteger(span.attributes?.position)
              )
                index.setPublication(span.attributes.position, {
                  ...span,
                  process: aligned.process,
                  thread: aligned.thread,
                  traceId: aligned.traceId,
                  type: "event",
                });
        } else if (r.type === "event") {
          if (validSpan(r)) {
            addEvent(r);
            if (r.name.startsWith("jdk.") || r.nativeType?.startsWith("triplex."))
              jfrCounts.set(r.process, (jfrCounts.get(r.process) ?? 0) + 1);
          }
        } else if (r.type === "index-adoption") {
          // [DX-T1-13] Why: place actual processor adoptions on the boot clock without attributing causality.
          // Rejected: labelling direct nanoTime intervals as JFR events.
          if (!validSpan(r) || r.process !== "tx" || r.clock?.domain !== "linux-monotonic")
            throw Error("Invalid processor adoption event");
          addEvent({ ...r, type: "event", causal: false });
        } else if (r.type === "jfr-complete") completions.push(r);
        else if (r.type === "resource" || r.type === "metrics") {
          index.addResource(align(r));
          resourceCount++;
          // [DX-T1-9] Why: the producer forwards the measured witness interval on the process clock.
          // Rejected: assigning off-thread SQLite time to the writer or using the RPC round trip.
          if (r.name === "driver.publication.persist-worker") {
            if (
              !Number.isSafeInteger(r.workerThread) ||
              r.workerThread <= 0 ||
              !validSpan(r) ||
              !r.attributes?.operationId ||
              !r.attributes?.position
            )
              throw Error("Invalid publication worker interval");
            addEvent({ ...r, type: "event", thread: r.workerThread });
          }
        } else if (r.type === "metadata") {
          metadataCount++;
          exactTop20 &&= r.topReadsPerPhase === 20;
        } else if (r.type === "histograms") {
          footer = true;
          histograms.push(r);
          if (r.failure) recordError("Recorder reported failure");
        }
      }
      if (path.basename(file).startsWith("node-") && !footer)
        recordError(`Missing drain footer in ${path.basename(file)}`);
    } catch (error) {
      if (error.code === "ERR_SQLITE_ERROR") throw error;
      recordError(`${path.basename(file)}: ${error.message}`);
    }
  }
  index.finishInputs();
  if (invalidSpanParents)
    recordError(
      `${invalidSpanParents} spans have a missing local parent (context or retention bug)`,
    );
  for (const event of pressureEvents(index.pressureSamples())) index.addEvent(event);

  const linked = (root) =>
    traceChildren(
      root,
      [...index.requests(root.traceId)].filter((request) => request.root !== root.root),
    );
  const functionFilter = "native_type = 'triplex.TransactionFunction'";
  const statsFilter = "native_type = 'triplex.NativeTransaction'";
  for (const e of index.events(functionFilter)) {
    const candidates = [...index.requests(e.traceId ?? "")];
    const parent = candidates
      .flatMap((r) => r.spans)
      .find((s) => s.id === e.parent && s.layer === "peer-wait");
    if (
      e.process !== "tx" ||
      !/^[0-9a-f]{16}$/.test(e.id ?? "") ||
      !parent ||
      e.start < parent.start - 0.1 ||
      e.end > parent.end + 0.1
    )
      recordError("Unbound or out-of-window native transaction function event");
  }
  // Content, freshness and binding come from this run's actual writer rows and matched roots.
  const writesFile = path.join(rootDir, "driver/ns-writes.jsonl");
  const deferredWriters = [];
  const allWriterRows = [];
  let writes = 0,
    missingCommits = 0;
  if (fs.existsSync(writesFile))
    for await (const w of records(writesFile)) {
      const {
        traceId,
        startedAt,
        finishedAt,
        expired,
        stream,
        resend,
        outcome,
        facts,
        ackPublishedAt,
        transactCalledAt,
        transactReturnedAt,
        scheduledAt,
        latencyMs,
        verdictClock,
        verdictMs,
      } = w;
      allWriterRows.push({
        traceId,
        startedAt,
        finishedAt,
        expired,
        stream,
        resend,
        outcome,
        facts,
        ackPublishedAt,
        transactCalledAt,
        transactReturnedAt,
        scheduledAt,
        latencyMs,
        verdictClock,
        verdictMs,
      });
      writes++;
      if (!nodeEnabled) continue;
      if (
        w.outcome === "committed" &&
        ((w.stream === "background" && !w.resend) || w.publicationDeferred)
      )
        deferredWriters.push(w);
      const root = w.traceId ? index.commit(w.traceId) : null;
      if (!root) missingCommits++;
      else {
        if (manifest?.writerBoundary) {
          try {
            validateWriterBoundary(w, root);
          } catch (error) {
            recordError(String(error));
          }
        }
        if (
          manifest?.nativeCommandBinding &&
          w.outcome === "committed" &&
          w.stream === "background" &&
          !w.resend
        ) {
          try {
            validateCommandTrace(w, [root, ...linked(root)]);
          } catch (error) {
            recordError(String(error));
          }
        }
        if (Number.isFinite(w.scheduledAt) && Math.abs(root.start - w.scheduledAt) > 1)
          recordError("Writer/trace offer timestamp mismatch");
        if (manifest?.queueExpected) {
          const queue = w.queue;
          if (!Array.isArray(queue)) recordError("Writer queue partition absent");
          else {
            const valid = queue.every(
              (q) =>
                Number.isFinite(q.start) &&
                Number.isFinite(q.end) &&
                q.end >= q.start &&
                ["scheduler-late", "scheduler-dispatch", "subject", "slot"].includes(q.cause) &&
                q.inFlight >= 0 &&
                q.capacity > 0 &&
                (q.cause !== "slot" || q.inFlight >= q.capacity) &&
                (q.cause !== "subject" || (q.behindTraceId && index.commit(q.behindTraceId))),
            );
            const total = queue.reduce((n, q) => n + q.end - q.start, 0);
            if (!valid || Math.abs(total - w.waitMs) > 0.5)
              recordError("Writer queue partition content/binding mismatch");
          }
        }
        index.setWriter(w.traceId, {
          facts: w.facts,
          resend: !!w.resend,
          outcome: w.outcome,
          stream: w.stream,
          seq: w.seq,
          burst: w.burst,
          position: w.position,
          queue: w.queue ?? null,
        });
        if (
          Number.isFinite(root.attributes?.position) &&
          Number.isFinite(w.position) &&
          root.attributes.position !== w.position
        )
          recordError("Writer/trace position mismatch");
      }
    }
  else recordError("Writer file absent: cannot establish complete commit denominator");
  if (missingCommits)
    recordError(`${missingCommits}/${writes} writer observations lack a matching trace`);
  if (!manifest) recordError("Run binding manifest absent");
  if (nodeEnabled && !histograms.length)
    recordError("No final Node histograms: recorder drain not proven");
  for (const role of manifest?.requiredJfr ?? []) {
    const c = completions.find((r) => r.role === role);
    const file = path.join(rootDir, "trace/raw", role + ".jfr.gz");
    if (
      !c ||
      !fs.existsSync(file) ||
      !(c.events > 0) ||
      c.events !== jfrCounts.get(role) ||
      c.recordingStart < manifest.startedAt - 1000 ||
      c.at < Date.parse(bench.endedAt ?? "") - 1000
    ) {
      recordError(`Missing/stale/inconsistent JFR export for ${role}`);
      continue;
    }
    try {
      const hash = createHash("sha256");
      let header,
        bytes = 0;
      const stream = fs.createReadStream(file).pipe(createGunzip());
      for await (const chunk of stream) {
        if (!header) header = chunk.subarray(0, 4).toString("hex");
        bytes += chunk.length;
        hash.update(chunk);
      }
      if (header !== "464c5200" || bytes < 68 || hash.digest("hex") !== c.fileSha256)
        recordError(`JFR bytes mismatch for ${role}`);
    } catch (error) {
      recordError(`JFR verification failed for ${role}: ${error.message}`);
    }
  }
  function hasResource(process, predicate) {
    for (const sample of index.resources("process = ?", process))
      if (predicate(sample)) return true;
    return false;
  }
  if (manifest?.requireSystem) {
    if (
      manifest.hostPlatform !== "linux-bare-metal" &&
      !hasResource("system-darwin", (r) => r.swap !== null && r.cpu !== null)
    )
      recordError("Mac CPU/swap collector missing");
    if (!hasResource("system-linux", (r) => Object.keys(r.cgroups ?? {}).length >= 4))
      recordError("VM/cgroup collector missing");
    if ((manifest.requirePostgres ?? true) && !hasResource("postgres", (r) => r.activity))
      recordError("Postgres wait/WAL/IO collector missing");
  }

  let cpuProfile = null;
  try {
    cpuProfile = await loadCpuProfile(
      rootDir,
      manifest,
      profileClocks,
      clockReference,
      writerClock?.process,
      Date.parse(bench.endedAt ?? ""),
    );
  } catch (error) {
    recordError(String(error));
  }
  const groups = new Map(),
    phases = bench.phases ?? [],
    slow = [],
    commits = [];
  const phaseCounters = phases.map((phase) => ({ phase, samples: 0, first: null, last: null }));
  const keepSlow = (list, row, capacity) => {
    const before = list.findIndex((existing) => existing.wallMs < row.wallMs);
    if (before >= 0) list.splice(before, 0, row);
    else if (list.length < capacity) list.push(row);
    if (list.length > capacity) list.pop();
  };
  function addGroup(key, row) {
    let group = groups.get(key);
    if (!group) {
      group = { id: groups.size, count: 0, slow: [] };
      groups.set(key, group);
    }
    group.count++;
    keepSlow(group.slow, row, 20);
    index.addMetrics(group.id, row);
  }
  let requestCount = 0,
    explained = 0,
    missingReceivers = 0,
    missingStats = 0,
    missingFunctions = 0;
  const schedulerProfiles = [];
  for (const root of index.roots()) {
    requestCount++;
    const children = linked(root);
    const nodes = [root, ...children];
    for (const node of nodes)
      for (const span of node.spans)
        if (span.name.startsWith("rpc.") && !children.some((child) => child.parent === span.id))
          missingReceivers++;
    const gateways = children.filter((child) => child.name.startsWith("gateway "));
    const row = {
      root,
      allTruncated: nodes.reduce((sum, node) => sum + (node.truncated ?? 0), 0),
      ...attribute(
        root,
        gateways,
        [...index.overlap(root.start, root.end, "pause", "1")],
        children.filter((child) => !child.name.startsWith("gateway ")),
      ),
      ...phaseOf(root, phases),
      nativeTransactions: [],
    };
    for (const gateway of gateways) {
      const hash = gateway.attributes?.databaseHash,
        t = gateway.attributes?.datomicT;
      if (!hash || t === undefined) continue;
      try {
        const native = bindNativeTransaction(gateway, [
          ...index.events(statsFilter + " AND database_hash = ? AND native_t = ?", hash, String(t)),
        ]);
        if (
          native &&
          !row.nativeTransactions.some(
            (old) => old.databaseHash === native.databaseHash && old.datomicT === native.datomicT,
          )
        )
          row.nativeTransactions.push(native);
      } catch (error) {
        recordError(String(error));
      }
    }
    if (cpuProfile && root.process === cpuProfile.process && root.thread === cpuProfile.thread) {
      row.cpuProfile = cpuProfile.window(root.start, root.end);
      const late = root.spans
        .filter((span) => span.name === "driver.queue.scheduler-late")
        .sort((left, right) => duration(right) - duration(left))[0];
      if (late)
        row.schedulerLateProfile = {
          start: late.start,
          end: late.end,
          ...cpuProfile.window(late.start, late.end),
        };
    }
    const sameThread = [];
    for (const event of index.overlap(
      root.start,
      root.end,
      "work",
      "e.process IS ? AND e.thread IS ?",
      root.process ?? null,
      root.thread ?? null,
    )) {
      if (event.traceId && event.traceId === row.traceId) continue;
      const wallMs = Math.min(event.end, root.end) - Math.max(event.start, root.start);
      keepSlow(sameThread, { name: event.name, wallMs }, 5);
    }
    row.overlappingWork = sameThread.map(({ name, wallMs }) => ({ name, overlapMs: wallMs }));
    if (manifest?.requiredJfr && !manifest.requiredJfr.includes("gw-w"))
      row.layers["gateway-gc"] = null;
    if (root.kind === "commit") {
      if (row.explained >= 0.95 && !row.allTruncated) explained++;
      const writer = index.writer(root.traceId);
      if (writer) {
        row.writer = writer;
        const publication = index.publication(writer.position);
        if (publication)
          row.replicaPublication = { ...publication, msAfterRootEnd: publication.end - root.end };
        if (writer.stream === "background" && !writer.resend && writer.outcome === "committed") {
          if (!row.nativeTransactions.length) missingStats++;
          if (!row.spans.some((span) => span.nativeType === "triplex.TransactionFunction"))
            missingFunctions++;
        }
      }
      for (const sample of [
        root.schedulerStart,
        root.schedulerEnd,
        ...root.spans.flatMap((span) => [span.schedulerStart, span.schedulerEnd]),
      ]) {
        if (!sample) continue;
        for (const counter of phaseCounters)
          if (sample.at >= counter.phase.start && sample.at <= counter.phase.end) {
            counter.samples++;
            if (!counter.first || sample.at < counter.first.at) counter.first = sample;
            if (!counter.last || sample.at >= counter.last.at) counter.last = sample;
          }
      }
      const late = row.schedulerLateProfile;
      if (late && late.end - late.start >= 20)
        keepSlow(
          schedulerProfiles,
          { traceId: row.traceId, name: row.name, late, wallMs: duration(late) },
          20,
        );
      keepSlow(slow, row, 5);
      // [DX-BM1] Why: anatomy consumes the commit cohort's exact scalars and looks up spans only when needed.
      // Rejected: keeping a second in-heap copy of spans derived from every request.
      const detailId = index.retainCommit(row);
      const {
        root: _root,
        spans: _spans,
        cpuProfile: _cpu,
        schedulerLateProfile: _late,
        ...compact
      } = row;
      commits.push({
        ...compact,
        get root() {
          return index.commitDetails(detailId).root;
        },
        get spans() {
          return index.commitDetails(detailId).spans;
        },
      });
    }
    const key = `${row.priority} / ${row.name} / ${root.kind}`;
    addGroup(key, row);
    if (
      root.kind === "commit" &&
      row.writer?.stream === "background" &&
      row.writer.facts >= 5 &&
      row.writer.facts <= 10
    )
      addGroup(key + " / 5-10 facts", row);
  }
  if (missingReceivers)
    recordError(`${missingReceivers} worker RPC spans have no bound receiver trace`);
  if (manifest?.requireTransactorStats && missingStats)
    recordError(`${missingStats} committed commands lack exact database/t native stats`);
  if (manifest?.requireTransactorFunction && missingFunctions)
    recordError(
      `${missingFunctions} committed commands lack a bound native transaction-function interval`,
    );
  if (nodeEnabled && !commits.length) recordError("No commit traces");
  const selected = [],
    selectedIds = new Set();
  for (const group of groups.values())
    for (const row of group.slow)
      if (!selectedIds.has(row.traceId)) {
        selectedIds.add(row.traceId);
        selected.push(row);
      }
  for (const row of slow) {
    row.queueDetails = row.root.spans
      .filter((span) => span.name.startsWith("driver.queue."))
      .map((span) => ({ cause: span.name, ms: duration(span), ...span.attributes }))
      .sort((left, right) => right.ms - left.ms);
    const executing =
      row.root.spans.find((span) => span.name === "driver.execute")?.start ?? row.root.end;
    row.queueContexts = [];
    for (const sample of index.resources(
      "name = 'writer.queue-context' AND process = ? AND at BETWEEN ? AND ?",
      row.root.process,
      row.root.start,
      executing,
    )) {
      const { at, inFlight, capacity, active } = sample;
      row.queueContexts.push({ at, inFlight, capacity, active });
      if (row.queueContexts.length === 40) break;
    }
  }
  const schedulerByPhase = Object.fromEntries(
    phaseCounters.map(({ phase, samples, first, last }) => [
      phase.name,
      {
        readers: phase.readers,
        samples,
        spanMs: first && last ? last.at - first.at : null,
        runtimeMs: first && last ? (last.runtimeNs - first.runtimeNs) / 1e6 : null,
        runqueueMs:
          first?.waitEnabled && last?.waitEnabled
            ? (last.runqueueNs - first.runqueueNs) / 1e6
            : null,
        waitEnabled: !!first?.waitEnabled,
      },
    ]),
  );
  for (const group of groups.values()) group.quantiles = index.quantiles(group.id);
  const finding = slow.length
    ? `The slowest observed commits spent their largest exclusive interval in ${slow.map((r) => `\`${r.steps[0]?.[0] ?? "unknown"}\` (${n(r.steps[0]?.[1])} ms, trace \`${r.traceId}\`)`).join("; ")}. These are observed spans, not proof of the transactor's internal cause.`
    : "No commit traces were observed; the cause of slow commits is not established.";
  const hostByPhase = Object.fromEntries(
    (bench.phases ?? []).map((p) => {
      const samples = [
        ...index.resources(
          "process = 'system-darwin' AND qualified = 1 AND at BETWEEN ? AND ?",
          p.start,
          p.end,
        ),
      ];
      const cpu = samples.map((r) => r.otherCpu).filter(Number.isFinite);
      return [
        p.name,
        {
          samples: samples.length,
          otherCpuP50: percentile(cpu, 0.5),
          otherCpuP99: percentile(cpu, 0.99),
          otherCpuMax: cpu.length ? Math.max(...cpu) : null,
          busySamples: cpu.filter((v) => v > 150).length,
          rule: "Mac samples require a measured cross-clock bridge for phase attribution; whole-run host context remains in raw samples and the session study",
        },
      ];
    }),
  );
  let deferredOrder = null;
  if (bench.publicationMode === "deferred" && nodeEnabled) {
    try {
      if (
        !bench.deferredPublication ||
        bench.deferredPublication.captured !== bench.deferredPublication.persisted ||
        bench.deferredPublication.pending !== 0
      )
        throw Error("Deferred witness drain unproven");
      deferredOrder = validateDeferredOrder(
        deferredWriters,
        index.events("name = ?", "driver.publication.persist-deferred"),
        manifest,
        Date.parse(bench.endedAt),
      );
    } catch (error) {
      recordError("Deferred witness order: " + error.message);
    }
  }
  const rawBytes = filesUnder(path.join(rootDir, "trace/raw")).reduce(
    (sum, f) => sum + fs.statSync(f).size,
    0,
  );
  if (errorCount > errors.length)
    errors.push(`${errorCount - errors.length} further trace validation errors`);
  const summary = {
    schema: "triplex.trace-report.v1",
    tag,
    source: manifest?.source ?? null,
    components: manifest?.components ?? null,
    session: manifest?.session ?? null,
    nodeEnabled,
    deferredOrder,
    clockAlignment: {
      reference: clockReference ?? null,
      sources: clockSources,
      invalidSpanParents,
      unqualifiedEventCount,
      hostCrossClockQualified: false,
    },
    reporterSha256,
    finding,
    schedulerByPhase,
    requests: requestCount,
    commits: commits.length,
    writerRows: writes,
    missingCommits,
    missingReceivers,
    coverage: {
      denominator: commits.length,
      atLeast95Percent: explained,
      fraction: commits.length ? explained / commits.length : null,
      target: 0.99,
    },
    rawBytes,
    errors,
    complete: errors.length === 0,
    histograms,
    readRetention: {
      slowMs: 50,
      sample: 1024,
      exactTop20: metadataCount > 0 && exactTop20,
    },
    collectors: {
      jfr: completions,
      resources: resourceCount,
      writerCpuProfile: cpuProfile
        ? { samples: cpuProfile.samples, backsteps: cpuProfile.backsteps, clockBound: true }
        : null,
      transactorFunctionEvents: index.eventCount(functionFilter),
      nativeTransactionStats: index.eventCount(statsFilter),
    },
    hostByPhase,
    groups: Object.fromEntries(
      [...groups].map(([key, { count, quantiles }]) => [
        key,
        { count, p50Ms: quantiles[0][0], p99Ms: quantiles[0][1] },
      ]),
    ),
    slowest: slow.map(({ root: _root, spans: _spans, ...rest }) => rest),
  };
  // [DX-T1-6] Why: new phase summaries can be derived from immutable old bytes without rewriting a cited report or duplicating raw traces.
  // Rejected: overwriting the original source-bound report during analysis or calling a new derivation a fresh benchmark.
  if (anatomyTo) {
    const outputDir = path.resolve(anatomyTo);
    if (outputDir === rootDir) throw Error("Anatomy derivation needs a separate output directory");
    // [DX-T1-6] Why: a reused destination or symlink must not redirect a derivation into existing cited reports.
    // Rejected: checking only the destination's spelling (aliases can name the same directory).
    if (fs.existsSync(outputDir)) throw Error("Anatomy derivation requires a new output directory");
    fs.mkdirSync(path.dirname(outputDir), { recursive: true });
    fs.mkdirSync(outputDir, { mode: 0o700 });
    await writeAnatomy(rootDir, {
      bench,
      manifest,
      commits,
      resources: index.resources("process = ?", "postgres"),
      childrenOf: linked,
      outputDir,
      reporterSha256: summary.reporterSha256,
      complete: summary.complete,
    });
    return summary;
  }
  const lines = [
    "# Trace report",
    "",
    finding,
    "",
    `Run \`${tag}\`; source \`${summary.source}\`; subjects ${bench.seed?.seededSubjects ?? "unknown"}; tracing ${manifest?.level ?? "unknown"}.`,
    "",
    `Recorders: ${(manifest?.components ?? ["legacy configuration"]).join(", ")}. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.`,
    "",
    `Commit coverage: ${explained}/${commits.length} (${n(commits.length ? (100 * explained) / commits.length : NaN)}%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: ${nodeEnabled ? `${writes - missingCommits}/${writes}` : "n/a (Node recorder ablated)"}. Raw trace bytes: ${rawBytes}.`,
    "",
    "Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.",
    "",
    `Linux clock alignment: ${clockReference ? `shared boot monotonic clock; ${clockSources.length} source calibrations, offsets preserved in raw traces and trace-summary.json` : "legacy wall anchors; cross-process timing may be skewed"}. ${unqualifiedEventCount} JFR events without continuous-anchor proof are retained raw but not overlaid; Mac wall samples are whole-run context, not per-commit overlap evidence.`,
    "",
    "Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.",
    "",
    `Evidence checks: ${errors.length ? errors.join("; ") : "source/run/slot binding, final histograms, writer trace IDs and interval content checked"}. Oracle: ${bench.oracle?.status ?? bench.independentOracle?.status ?? "see ns-report.json; not certified by tracing"}.`,
    "",
  ];
  lines.push(
    "## Writer thread scheduler accounting",
    "",
    "Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.",
    "",
    "| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const [name, cpu] of Object.entries(schedulerByPhase))
    lines.push(
      `| ${name} | ${cpu.readers} | ${n(cpu.spanMs)} | ${n(cpu.runtimeMs)} | ${n(cpu.runqueueMs)} | ${cpu.samples} |`,
    );
  lines.push(
    "",
    "## Queue wait dependencies",
    "",
    "| trace | cause | ms | behind trace | in-flight at boundary / capacity |",
    "| --- | --- | ---: | --- | --- |",
  );
  for (const r of slow) {
    for (const q of r.queueDetails)
      lines.push(
        `| ${r.traceId} | ${q.cause} | ${n(q.ms)} | ${q.behindTraceId ?? "none"} | ${q.inFlight} / ${q.capacity} |`,
      );
    lines.push(
      "",
      `Observed active steps while trace ${r.traceId} waited: ${JSON.stringify(r.queueContexts)}`,
      "",
    );
  }
  if (cpuProfile) {
    lines.push(
      "## Writer stacks during late scheduler offers",
      "",
      "Sample points are verified against two guest boot-clock brackets. Counts are samples, not continuous CPU time. Gaps over 3 ms are unknown execution state; they are not charged to the sampled function.",
      "",
      "| trace | phase | late ms | samples | top sampled functions | long gaps |",
      "| --- | --- | ---: | ---: | --- | ---: |",
    );
    for (const r of schedulerProfiles) {
      const p = r.late;
      lines.push(
        `| ${r.traceId} | ${r.name} | ${n(p.end - p.start)} | ${p.samples} | ${p.top.map(([f, c]) => f + " (" + c + ")").join("; ")} | ${p.longGaps} |`,
      );
    }
    lines.push("");
  }
  for (const [key, group] of groups) {
    lines.push(
      `## ${key} (${group.count} retained requests)`,
      "",
      table(group.quantiles),
      "",
      `| slowest trace | wall ms | ${LAYERS.join(" | ")} | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |`,
      `| --- | ---: | ${LAYERS.map(() => "---:").join(" | ")} | ---: | ---: | ---: | --- | --- |`,
    );
    for (const r of group.slow)
      lines.push(
        `| ${r.traceId} | ${n(r.wallMs)} | ${LAYERS.map((k) => n(r.layers[k])).join(" | ")} | ${n(r.typescriptMs)} | ${n(r.typescriptShare)} | ${n(r.unexplainedMs)} | ${r.steps[0]?.[0] ?? "unknown"} | ${r.overlappingWork.map((e) => e.name + " " + n(e.overlapMs) + "ms").join("; ") || "none observed"} |`,
      );
    lines.push("");
  }
  lines.push(
    "## Visibility limits",
    "",
    "Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.",
    "",
    "JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.",
    "",
  );
  summary.instrumentIdle = idleAndPhaseMetrics(allWriterRows, phases, (traceId) =>
    index.requests(traceId),
  );
  lines.push(instrumentMarkdown(bench.instrument), idleMarkdown(summary.instrumentIdle));
  fs.writeFileSync(path.join(outputDir, "TRACE-REPORT.md"), lines.join("\n"));
  fs.writeFileSync(
    path.join(outputDir, "trace-summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  await writeChromeTrace(path.join(outputDir, "trace.chrome.json"), chromeEvents(selected, index), {
    tag,
    source: summary.source,
  });
  function* nearbyResources(row) {
    for (const resource of index.resources(
      "qualified = 1 AND at BETWEEN ? AND ?",
      row.root.start - 1000,
      row.root.end + 1000,
    ))
      yield resource.vm ? { ...resource, vm: undefined } : resource;
  }
  await writeStreamedFile(
    path.join(outputDir, "trace.html"),
    timelineDocument({
      tag,
      finding,
      cards: selected,
      context: (row) => contextEvents(row, index),
      resources: nearbyResources,
    }),
  );
  if (copyTo) {
    fs.mkdirSync(copyTo, { recursive: true });
    for (const f of ["TRACE-REPORT.md", "trace.html", "trace.chrome.json", "trace-summary.json"])
      fs.copyFileSync(path.join(outputDir, f), path.join(copyTo, f), fs.constants.COPYFILE_FICLONE);
  }
  await writeAnatomy(rootDir, {
    bench,
    manifest,
    commits,
    resources: index.resources("process = ?", "postgres"),
    childrenOf: linked,
    copyTo,
    outputDir,
    reporterSha256: summary.reporterSha256,
    complete: summary.complete,
  });
  return summary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dir = process.argv[2];
  if (!dir)
    throw Error(
      "usage: report.mjs RUN_DIR [--copy-to DIR] [--anatomy-to DIR] [--output-to NEW_DIR]",
    );
  const i = process.argv.indexOf("--copy-to"),
    a = process.argv.indexOf("--anatomy-to"),
    o = process.argv.indexOf("--output-to");
  // [DX-T1-6] Why: malformed analysis arguments must not fall through to rewriting the original reports.
  // Rejected: treating a missing output argument as the normal mutable render mode.
  if (a >= 0 && (!process.argv[a + 1] || process.argv[a + 1].startsWith("--")))
    throw Error("Missing anatomy output directory");
  if (o >= 0 && (!process.argv[o + 1] || process.argv[o + 1].startsWith("--")))
    throw Error("Missing report output directory");
  console.log(
    JSON.stringify(
      await buildReport(dir, {
        copyTo: i >= 0 ? process.argv[i + 1] : undefined,
        anatomyTo: a >= 0 ? process.argv[a + 1] : undefined,
        outputTo: o >= 0 ? process.argv[o + 1] : undefined,
      }),
    ),
  );
}
