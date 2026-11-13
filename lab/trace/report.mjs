// @ts-nocheck -- JSON wire records are validated on ingestion; checkjs still checks all bindings.
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
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
  "gateway-queue": 7,
  "driver-queue": 8,
  "event-loop": 9,
  "typescript-gc": 10,
  "gateway-gc": 11,
};
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
  const input = file.endsWith(".gz") ? stream.pipe(createGunzip()) : stream;
  for await (const line of createInterface({ input, crlfDelay: Infinity }))
    if (line.trim()) yield JSON.parse(line);
}
// [DX-T1-2] Why: JVM nanoTime and Node hrtime use the same Linux boot clock even when startup wall anchors differ.
// Rejected: infer network time from a gateway clipped away by clock skew, or silently guess an offset from a request duration.
export function alignClockRecord(row, reference) {
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
// [DX-T1] Why: integrate the union of intervals, choosing the innermost named work, never summing nested wall times.
// Rejected: adding independent p99s or treating an unrelated storage/JFR event as a causal child.
function intervalIndex(rows) {
  const sorted = [...rows].sort((a, b) => a.start - b.start),
    ends = [];
  let max = -Infinity;
  for (const e of sorted) {
    max = Math.max(max, e.end);
    ends.push(max);
  }
  return {
    overlap(start, end) {
      let lo = 0,
        hi = sorted.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (sorted[mid].start < end) lo = mid + 1;
        else hi = mid;
      }
      const out = [];
      for (let i = lo - 1; i >= 0 && ends[i] > start; i--)
        if (sorted[i].end > start) out.push(sorted[i]);
      return out;
    },
  };
}
function groupedIndex(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const k = key(r),
      list = map.get(k) ?? [];
    list.push(r);
    map.set(k, list);
  }
  return new Map([...map].map(([k, v]) => [k, intervalIndex(v)]));
}
function contextEvents(row, indexes) {
  const events = indexes.general.overlap(row.root.start, row.root.end),
    keys = new Set(row.spans.map((s) => `${s.process}:${s.thread}`));
  for (const key of keys)
    events.push(...(indexes.threads.get(key)?.overlap(row.root.start, row.root.end) ?? []));
  return events.filter((e) => !e.traceId || e.traceId !== row.traceId);
}
function pressureEvents(resources) {
  const events = [],
    previous = new Map();
  for (const sample of [...resources].sort((a, b) => a.at - b.at))
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
        events.push({
          type: "event",
          name: `${container} CPU throttled ${(counters.throttled_usec - old.throttled) / 1000}ms in sample`,
          layer: "throttling",
          process: container,
          thread: 0,
          start: old.at,
          end: sample.at,
          estimated: true,
        });
      previous.set(container, { at: sample.at, throttled: counters.throttled_usec });
    }
  return events;
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
  const pauses = events.filter(
    (e) =>
      !e.estimated &&
      ["typescript-gc", "gateway-gc"].includes(e.layer) &&
      e.start < root.end &&
      e.end > root.start,
  );
  const points = [
    ...new Set([
      root.start,
      root.end,
      ...[...spans, ...pauses].flatMap((s) => [
        Math.max(root.start, s.start),
        Math.min(root.end, s.end),
      ]),
    ]),
  ].sort((a, b) => a - b);
  // [DX-T1] Why: sort once per request; never sort all candidates at every boundary or charge an ambient pause to a remote wait.
  // Rejected: GC overlap as causal latency, and scanning every run event for every request.
  const ordered = [...spans].sort(
    (x, y) =>
      depth(y) - depth(x) ||
      (rank[y.layer] ?? 0) - (rank[x.layer] ?? 0) ||
      duration(x) - duration(y),
  );
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
function table(rows, label) {
  const columns = [
    "wallMs",
    "cpuRuntimeMs",
    "cpuRunqueueMs",
    "cpuScopeWallMs",
    ...LAYERS,
    "typescriptMs",
    "typescriptShare",
    "unexplainedMs",
  ];
  const get = (r, k) => r.layers[k] ?? r[k];
  const lines = [
    `| ${label} | ${columns.join(" | ")} |`,
    `| --- | ${columns.map(() => "---:").join(" | ")} |`,
  ];
  for (const p of [0.5, 0.99])
    lines.push(
      `| p${p * 100} | ${columns
        .map((k) =>
          n(
            percentile(
              rows.map((r) => get(r, k)),
              p,
            ),
          ),
        )
        .join(" | ")} |`,
    );
  return lines.join("\n");
}
export async function buildReport(runDir, { copyTo } = {}) {
  const rootDir = path.resolve(runDir),
    tag = path.basename(rootDir);
  const reportFile = path.join(rootDir, "driver/ns-report.json");
  const bench = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, "utf8")) : {};
  const manifestFile = path.join(rootDir, "trace-run.json");
  const manifest = fs.existsSync(manifestFile)
    ? JSON.parse(fs.readFileSync(manifestFile, "utf8"))
    : null;
  if (manifest?.level === "off") {
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
      rawBytes: filesUnder(path.join(rootDir, "trace/raw")).reduce(
        (n, f) => n + fs.statSync(f).size,
        0,
      ),
    };
    const outputs = {
      "TRACE-REPORT.md": `# Trace report\n\n${finding}\n\nRun ${tag}; source ${manifest.source}; subjects ${bench.seed?.seededSubjects ?? "unknown"}. No collection completeness or semantic verdict is asserted.\n`,
      "trace.html": `<!doctype html><meta charset="utf-8"><title>Tracing off</title><h1>Tracing off</h1><p>${esc(finding)}</p>`,
      "trace.chrome.json": JSON.stringify({ traceEvents: [] }),
      "trace-summary.json": JSON.stringify(summary, null, 2) + "\n",
    };
    for (const [name, bytes] of Object.entries(outputs))
      fs.writeFileSync(path.join(rootDir, name), bytes);
    if (copyTo) {
      fs.mkdirSync(copyTo, { recursive: true });
      for (const name of Object.keys(outputs))
        fs.copyFileSync(path.join(rootDir, name), path.join(copyTo, name));
    }
    return summary;
  }
  const nodeEnabled = manifest?.nodeEnabled ?? manifest?.level !== "off";
  const input = filesUnder(path.join(rootDir, "trace/raw")).filter((f) =>
    /\.jsonl(\.gz)?$/.test(f),
  );
  const requests = [],
    events = [],
    resources = [],
    histograms = [],
    metadata = [],
    completions = [],
    jfrCounts = new Map();
  const errors = [];
  for (const file of input) {
    let footer = false;
    try {
      for await (const r of records(file)) {
        if (
          manifest &&
          (r.run !== manifest.tag || r.source !== manifest.source || r.slot !== manifest.slot)
        ) {
          errors.push(`Binding mismatch in ${path.basename(file)}`);
          continue;
        }
        if (r.type === "request") {
          if (manifest && r.start < manifest.startedAt - 1000)
            errors.push(`Stale request in ${path.basename(file)}`);
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
          requests.push(r);
        } else if (r.type === "event") {
          if (validSpan(r)) {
            events.push(r);
            if (r.name.startsWith("jdk."))
              jfrCounts.set(r.process, (jfrCounts.get(r.process) ?? 0) + 1);
          }
        } else if (r.type === "jfr-complete") completions.push(r);
        else if (r.type === "resource" || r.type === "metrics") resources.push(r);
        else if (r.type === "metadata") metadata.push(r);
        else if (r.type === "histograms") {
          footer = true;
          histograms.push(r);
          if (r.failure) errors.push("Recorder reported failure");
        }
      }
      if (path.basename(file).startsWith("node-") && !footer)
        errors.push(`Missing drain footer in ${path.basename(file)}`);
    } catch (error) {
      errors.push(`${path.basename(file)}: ${error.message}`);
    }
  }
  const clockReference = requests.find(
    (r) => r.name === "driver.commit" && r.thread === 0 && r.clock?.domain === "linux-monotonic",
  )?.clock;
  const clockSources = [];
  if (manifest?.requireClockBinding && !clockReference)
    errors.push("Writer Linux boot-clock binding missing");
  for (const rows of [requests, events, resources])
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (manifest?.requireClockBinding && r.type === "request" && !r.clock)
        errors.push("Request clock binding missing: " + r.traceId);
      try {
        rows[i] = alignClockRecord(r, clockReference);
        if (
          r.clock &&
          clockReference &&
          !clockSources.some((x) => x.process === r.process && x.offsetMs === r.clock.offsetMs)
        )
          clockSources.push({
            process: r.process,
            offsetMs: r.clock.offsetMs,
            shiftMs: rows[i].clockAlignmentMs,
            uncertaintyMs: r.clock.uncertaintyMs,
          });
      } catch (error) {
        errors.push(String(error));
      }
    }
  let invalidSpanParents = 0;
  if (manifest?.requireClockBinding)
    for (const r of requests) {
      const ids = new Set([r.root, ...r.spans.map((s) => s.id)]);
      for (const span of r.spans) if (!ids.has(span.parent)) invalidSpanParents++;
    }
  if (invalidSpanParents)
    errors.push(
      `${invalidSpanParents} spans have a missing local parent (context or retention bug)`,
    );
  const replicaPublications = new Map();
  // [DX-T1] Why: asynchronous replica work links by the validated logical position within this one benchmark scope.
  // Rejected: assigning a feed poll's unrelated trace ID to the original writer, or adding post-ACK work to commit latency.
  for (const request of requests)
    if (request.name === "replica.follow")
      for (const span of request.spans)
        if (span.name === "replica.publish" && Number.isSafeInteger(span.attributes?.position)) {
          const event = {
            ...span,
            process: request.process,
            thread: request.thread,
            traceId: request.traceId,
            type: "event",
          };
          replicaPublications.set(span.attributes.position, event);
        }
  events.push(...pressureEvents(resources));
  const gateways = new Map();
  for (const r of requests)
    if (r.name.startsWith("gateway ")) {
      const list = gateways.get(r.traceId) ?? [];
      list.push(r);
      gateways.set(r.traceId, list);
    }
  let roots = requests.filter(
    (r) =>
      r.name === "driver.commit" ||
      r.name === "driver.expired" ||
      r.name === "reader.pull" ||
      r.name === "driver.ryow",
  );
  const ownedIds = new Set(roots.map((r) => r.traceId));
  roots.push(
    ...requests.filter(
      (r) =>
        !ownedIds.has(r.traceId) &&
        (r.name === "replica.follow" || /^http .*\/(transactions|journal)$/.test(r.name)),
    ),
  );
  if (!roots.length) roots = requests.filter((r) => r.name.startsWith("http "));
  const byTrace = new Map();
  for (const request of requests) {
    const list = byTrace.get(request.traceId) ?? [];
    list.push(request);
    byTrace.set(request.traceId, list);
  }
  const linked = (r) => traceChildren(r, byTrace.get(r.traceId) ?? []);
  const pauseIndex = intervalIndex(
    events.filter((e) => ["typescript-gc", "gateway-gc"].includes(e.layer)),
  );
  const workIndex = groupedIndex(
    events.filter((e) => e.layer === "typescript"),
    (e) => `${e.process}:${e.thread}`,
  );
  const contextIndexes = {
    general: intervalIndex(events.filter((e) => e.layer !== "jvm-event")),
    threads: groupedIndex(
      events.filter((e) => e.layer === "jvm-event"),
      (e) => `${e.process}:${e.thread}`,
    ),
  };
  let missingReceivers = 0;
  const evaluated = roots.map((r) => {
    const children = linked(r),
      nodes = [r, ...children];
    for (const node of nodes)
      for (const span of node.spans)
        if (span.name.startsWith("rpc.") && !children.some((child) => child.parent === span.id))
          missingReceivers++;
    return {
      root: r,
      allTruncated: nodes.reduce((n, node) => n + (node.truncated ?? 0), 0),
      ...attribute(
        r,
        children.filter((c) => c.name.startsWith("gateway ")),
        pauseIndex.overlap(r.start, r.end),
        children.filter((c) => !c.name.startsWith("gateway ")),
      ),
      ...phaseOf(r, bench.phases ?? []),
    };
  });
  if (missingReceivers)
    errors.push(`${missingReceivers} worker RPC spans have no bound receiver trace`);
  const commits = evaluated.filter((r) => r.root.kind === "commit");
  const denom = commits;
  const explained = denom.filter((r) => r.explained >= 0.95 && !r.allTruncated).length;
  // Content/freshness/binding: compare the observed per-command trace against this run's actual writer rows.
  const writesFile = path.join(rootDir, "driver/ns-writes.jsonl");
  let writes = 0,
    missingCommits = 0;
  const byId = new Map(commits.map((r) => [r.traceId, r]));
  const ids = new Set(byId.keys());
  if (fs.existsSync(writesFile))
    for await (const w of records(writesFile)) {
      writes++;
      if (!nodeEnabled) continue;
      if (!w.traceId || !ids.has(w.traceId)) missingCommits++;
      else {
        const trace = byId.get(w.traceId);
        if (Number.isFinite(w.scheduledAt) && Math.abs(trace.root.start - w.scheduledAt) > 1)
          errors.push("Writer/trace offer timestamp mismatch");
        if (manifest?.queueExpected) {
          const queue = w.queue;
          if (!Array.isArray(queue)) errors.push("Writer queue partition absent");
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
                (q.cause !== "subject" || ids.has(q.behindTraceId)),
            );
            const total = queue.reduce((n, q) => n + q.end - q.start, 0);
            if (!valid || Math.abs(total - w.waitMs) > 0.5)
              errors.push("Writer queue partition content/binding mismatch");
          }
        }
        trace.writer = {
          facts: w.facts,
          stream: w.stream,
          seq: w.seq,
          burst: w.burst,
          position: w.position,
          queue: w.queue ?? null,
        };
        if (
          Number.isFinite(trace.root.attributes.position) &&
          Number.isFinite(w.position) &&
          trace.root.attributes.position !== w.position
        )
          errors.push("Writer/trace position mismatch");
        const publication = replicaPublications.get(w.position);
        if (publication)
          trace.replicaPublication = {
            ...publication,
            msAfterRootEnd: publication.end - trace.root.end,
          };
      }
    }
  else errors.push("Writer file absent: cannot establish complete commit denominator");
  if (missingCommits)
    errors.push(`${missingCommits}/${writes} writer observations lack a matching trace`);
  if (!manifest) errors.push("Run binding manifest absent");
  if (nodeEnabled && !histograms.length)
    errors.push("No final Node histograms: recorder drain not proven");
  if (nodeEnabled && !denom.length) errors.push("No commit traces");
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
      errors.push(`Missing/stale/inconsistent JFR export for ${role}`);
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
        errors.push(`JFR bytes mismatch for ${role}`);
    } catch (error) {
      errors.push(`JFR verification failed for ${role}: ${error.message}`);
    }
  }
  if (manifest?.requireSystem) {
    if (!resources.some((r) => r.process === "system-darwin" && r.swap !== null && r.cpu !== null))
      errors.push("Mac CPU/swap collector missing");
    if (
      !resources.some(
        (r) => r.process === "system-linux" && Object.keys(r.cgroups ?? {}).length >= 4,
      )
    )
      errors.push("VM/cgroup collector missing");
    if (
      (manifest.requirePostgres ?? true) &&
      !resources.some((r) => r.process === "postgres" && r.activity)
    )
      errors.push("Postgres wait/WAL/IO collector missing");
  }

  for (const r of evaluated)
    r.overlappingWork = (
      workIndex.get(`${r.root.process}:${r.root.thread}`)?.overlap(r.root.start, r.root.end) ?? []
    )
      .filter((e) => !e.traceId || e.traceId !== r.traceId)
      .map((e) => ({
        name: e.name,
        overlapMs: Math.min(e.end, r.root.end) - Math.max(e.start, r.root.start),
      }))
      .sort((a, b) => b.overlapMs - a.overlapMs)
      .slice(0, 5);
  const groups = new Map();
  for (const r of evaluated) {
    const key = `${r.priority} / ${r.name} / ${r.root.kind}`;
    const group = groups.get(key) ?? [];
    group.push(r);
    groups.set(key, group);
    if (
      r.root.kind === "commit" &&
      r.writer?.stream === "background" &&
      r.writer.facts >= 5 &&
      r.writer.facts <= 10
    ) {
      const bandKey = `${r.priority} / ${r.name} / commit / 5-10 facts`,
        band = groups.get(bandKey) ?? [];
      band.push(r);
      groups.set(bandKey, band);
    }
  }
  if (manifest?.requiredJfr && !manifest.requiredJfr.includes("gw-w")) {
    for (const rows of groups.values()) for (const r of rows) r.layers["gateway-gc"] = null;
  }
  const selected = [];
  const selectedIds = new Set();
  for (const group of groups.values())
    for (const r of [...group].sort((a, b) => b.wallMs - a.wallMs).slice(0, 20))
      if (!selectedIds.has(r.traceId)) {
        selectedIds.add(r.traceId);
        selected.push(r);
      }
  const slow = [...commits].sort((a, b) => b.wallMs - a.wallMs).slice(0, 5);
  for (const r of slow) {
    r.queueDetails = r.root.spans
      .filter((s) => s.name.startsWith("driver.queue."))
      .map((s) => ({ cause: s.name, ms: s.end - s.start, ...s.attributes }))
      .sort((a, b) => b.ms - a.ms);
    const executing = r.root.spans.find((s) => s.name === "driver.execute")?.start ?? r.root.end;
    r.queueContexts = resources
      .filter(
        (x) =>
          x.name === "writer.queue-context" &&
          x.process === r.root.process &&
          x.at >= r.root.start &&
          x.at <= executing,
      )
      .map((x) => ({ at: x.at, inFlight: x.inFlight, capacity: x.capacity, active: x.active }))
      .slice(0, 40);
  }
  const schedulerByPhase = Object.fromEntries(
    (bench.phases ?? []).map((p) => {
      const samples = commits
          .flatMap((r) => [
            r.root.schedulerStart,
            r.root.schedulerEnd,
            ...r.root.spans.flatMap((s) => [s.schedulerStart, s.schedulerEnd]),
          ])
          .filter((x) => x && x.at >= p.start && x.at <= p.end)
          .sort((a, b) => a.at - b.at),
        first = samples[0],
        last = samples.at(-1);
      return [
        p.name,
        {
          readers: p.readers,
          samples: samples.length,
          spanMs: first && last ? last.at - first.at : null,
          runtimeMs: first && last ? (last.runtimeNs - first.runtimeNs) / 1e6 : null,
          runqueueMs:
            first && last && first.waitEnabled && last.waitEnabled
              ? (last.runqueueNs - first.runqueueNs) / 1e6
              : null,
          waitEnabled: !!first?.waitEnabled,
        },
      ];
    }),
  );
  const finding = slow.length
    ? `The slowest observed commits spent their largest exclusive interval in ${slow.map((r) => `\`${r.steps[0]?.[0] ?? "unknown"}\` (${n(r.steps[0]?.[1])} ms, trace \`${r.traceId}\`)`).join("; ")}. These are observed spans, not proof of the closed-source transactor's internal cause.`
    : "No commit traces were observed; the cause of slow commits is not established.";
  const hostByPhase = Object.fromEntries(
    (bench.phases ?? []).map((p) => {
      const samples = resources.filter(
        (r) => r.process === "system-darwin" && r.at >= p.start && r.at <= p.end,
      );
      const cpu = samples.map((r) => r.otherCpu).filter(Number.isFinite);
      return [
        p.name,
        {
          samples: samples.length,
          otherCpuP50: percentile(cpu, 0.5),
          otherCpuP99: percentile(cpu, 0.99),
          otherCpuMax: cpu.length ? Math.max(...cpu) : null,
          busySamples: cpu.filter((v) => v > 150).length,
          rule: "diagnostic host-quiet heuristic; not a performance acceptance gate",
        },
      ];
    }),
  );
  const rawBytes = filesUnder(path.join(rootDir, "trace/raw")).reduce(
    (sum, f) => sum + fs.statSync(f).size,
    0,
  );
  const summary = {
    schema: "triplex.trace-report.v1",
    tag,
    source: manifest?.source ?? null,
    components: manifest?.components ?? null,
    session: manifest?.session ?? null,
    nodeEnabled,
    clockAlignment: {
      reference: clockReference ?? null,
      sources: clockSources,
      invalidSpanParents,
    },
    reporterSha256: createHash("sha256")
      .update(fs.readFileSync(new URL(import.meta.url)))
      .digest("hex"),
    finding,
    schedulerByPhase,
    requests: roots.length,
    commits: commits.length,
    writerRows: writes,
    missingCommits,
    missingReceivers,
    coverage: {
      denominator: denom.length,
      atLeast95Percent: explained,
      fraction: denom.length ? explained / denom.length : null,
      target: 0.99,
    },
    rawBytes,
    errors,
    complete: errors.length === 0,
    histograms,
    readRetention: {
      slowMs: 50,
      sample: 1024,
      exactTop20: metadata.length > 0 && metadata.every((r) => r.topReadsPerPhase === 20),
    },
    collectors: { jfr: completions, resources: resources.length },
    hostByPhase,
    groups: Object.fromEntries(
      [...groups].map(([k, rows]) => [
        k,
        {
          count: rows.length,
          p50Ms: percentile(
            rows.map((r) => r.wallMs),
            0.5,
          ),
          p99Ms: percentile(
            rows.map((r) => r.wallMs),
            0.99,
          ),
        },
      ]),
    ),
    slowest: slow.map(({ root: _root, spans: _spans, ...rest }) => rest),
  };
  const lines = [
    "# Trace report",
    "",
    finding,
    "",
    `Run \`${tag}\`; source \`${summary.source}\`; subjects ${bench.seed?.seededSubjects ?? "unknown"}; tracing ${manifest?.level ?? "unknown"}.`,
    "",
    `Recorders: ${(manifest?.components ?? ["legacy configuration"]).join(", ")}. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.`,
    "",
    `Commit coverage: ${explained}/${denom.length} (${n(denom.length ? (100 * explained) / denom.length : NaN)}%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: ${nodeEnabled ? `${writes - missingCommits}/${writes}` : "n/a (Node recorder ablated)"}. Raw trace bytes: ${rawBytes}.`,
    "",
    "Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.",
    "",
    `Linux clock alignment: ${clockReference ? `shared boot monotonic clock; ${clockSources.length} source calibrations, offsets preserved in raw traces and trace-summary.json` : "legacy wall anchors; cross-process timing may be skewed"}.`,
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
  for (const [key, rows] of groups) {
    lines.push(
      `## ${key} (${rows.length} retained requests)`,
      "",
      table(rows, "quantile"),
      "",
      `| slowest trace | wall ms | ${LAYERS.join(" | ")} | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |`,
      `| --- | ---: | ${LAYERS.map(() => "---:").join(" | ")} | ---: | ---: | ---: | --- | --- |`,
    );
    for (const r of [...rows].sort((a, b) => b.wallMs - a.wallMs).slice(0, 20))
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
    "JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.",
    "",
  );
  fs.writeFileSync(path.join(rootDir, "TRACE-REPORT.md"), lines.join("\n"));
  fs.writeFileSync(
    path.join(rootDir, "trace-summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  const chrome = [];
  const processIds = new Map();
  const pidFor = (name) => {
    if (!processIds.has(name)) {
      const id = processIds.size + 1;
      processIds.set(name, id);
      chrome.push({ name: "process_name", ph: "M", pid: id, tid: 0, args: { name } });
    }
    return processIds.get(name);
  };
  const start = Math.min(...selected.map((r) => r.root.start));
  for (const r of selected) {
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
      chrome.push({
        name: s.name,
        cat: s.layer,
        ph: "X",
        ts: (s.start - start) * 1000,
        dur: duration(s) * 1000,
        pid: pidFor(s.process ?? r.root.process),
        tid: s.thread ?? r.root.thread,
        args: { traceId: r.traceId, phase: r.name, priority: r.priority },
      });
    if (r.replicaPublication) {
      const p = r.replicaPublication,
        flowId = "position-" + r.traceId;
      chrome.push({
        name: "replica publication (position link)",
        cat: "replica",
        ph: "X",
        ts: (p.start - start) * 1000,
        dur: duration(p) * 1000,
        pid: pidFor(p.process),
        tid: p.thread,
        args: { traceId: r.traceId, feedTraceId: p.traceId, position: r.writer.position },
      });
      chrome.push({
        name: "commit to replica position link",
        cat: "replica",
        ph: "s",
        ts: (r.root.start - start) * 1000,
        pid: pidFor(r.root.process),
        tid: r.root.thread,
        id: flowId,
      });
      chrome.push({
        name: "commit to replica position link",
        cat: "replica",
        ph: "f",
        ts: (p.start - start) * 1000,
        pid: pidFor(p.process),
        tid: p.thread,
        id: flowId,
        bp: "e",
      });
    }
    for (const e of contextEvents(r, contextIndexes))
      chrome.push({
        name: e.name,
        cat: e.layer,
        ph: "X",
        ts: (e.start - start) * 1000,
        dur: duration(e) * 1000,
        pid: pidFor(e.process),
        tid: e.thread ?? 0,
        args: {
          overlapsTrace: r.traceId,
          estimated: !!e.estimated,
          originalStartMs: e.start,
          originalEndMs: e.end,
        },
      });
  }
  fs.writeFileSync(
    path.join(rootDir, "trace.chrome.json"),
    JSON.stringify({
      traceEvents: chrome,
      displayTimeUnit: "ms",
      metadata: { tag, source: summary.source },
    }) + "\n",
  );
  const relevantEvents = [...new Set(selected.flatMap((r) => contextEvents(r, contextIndexes)))];
  const relevantResources = resources
    .filter((e) => selected.some((r) => e.at >= r.root.start - 1000 && e.at <= r.root.end + 1000))
    .map((e) => (e.vm ? { ...e, vm: undefined } : e));
  const data = JSON.stringify({
    selected: selected.map((r) => ({ ...r, root: { ...r.root, spans: undefined } })),
    events: relevantEvents,
    resources: relevantResources,
  }).replaceAll("<", "\\u003c");
  fs.writeFileSync(path.join(rootDir, "trace.html"), html(finding, data, tag));
  if (copyTo) {
    fs.mkdirSync(copyTo, { recursive: true });
    for (const f of ["TRACE-REPORT.md", "trace.html", "trace.chrome.json", "trace-summary.json"])
      fs.copyFileSync(path.join(rootDir, f), path.join(copyTo, f));
  }
  return summary;
}
function html(finding, data, tag) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Triplex trace ${esc(tag)}</title>
<style>body{margin:24px;background:#111822;color:#dde9f5;font:14px system-ui}h1{font-size:24px}p{max-width:1200px;line-height:1.5}select,input,button{background:#23364c;color:white;padding:8px;border:1px solid #567;border-radius:5px}.card{background:#1a2635;margin:18px 0;padding:16px;overflow:auto;border-radius:8px}.lane{position:relative;height:26px;min-width:920px;border-bottom:1px solid #314057}.label{display:inline-block;width:240px;overflow:hidden;font-size:11px;white-space:nowrap}.bar{position:absolute;top:3px;height:19px;border-radius:3px;min-width:1px;background:#69c8a0;cursor:crosshair}.typescript{background:#69c8a0}.gateway{background:#9bb4ff}.peer-wait,.peer-call{background:#dfb878}.driver-queue{background:#e88b82}.typescript-gc,.gateway-gc{background:#f38ace}.network{background:#86d7ed}.event-loop{background:#f9de66}.jvm-event{background:#8392a5}.jvm-safepoint{background:#dc9ee2}.throttling{background:#e8a161}.context-label{color:#c4a3e5}.muted{color:#91a5bd}pre{white-space:pre-wrap}#tip{position:fixed;bottom:0;background:#07101c;padding:12px;left:0;right:0;max-height:180px;overflow:auto}summary{cursor:pointer}svg{background:#122030}</style>
<h1>Triplex request timeline · ${esc(tag)}</h1><p>${esc(finding)}</p><p class="muted">Offline evidence. Each row has its own wall-time scale. Hover for span, thread, timestamp and trace ID. Orange is peer wait (network + transactor + storage); it is not a claim about internal transactor CPU. Pink GC and yellow estimated timer drift are overlapping observations.</p>
<label>Phase <select id="phase"><option value="">All</option></select></label> <label>Kind <select id="kind"><option value="">All</option><option>commit</option><option>read</option></select></label> <label><input type="checkbox" id="events" checked>Overlapping pauses and work</label><div id="view"></div><pre id="tip">Hover over a span to inspect it.</pre><script type="application/json" id="data">${data}</script><script>
const data=JSON.parse(document.getElementById('data').textContent),phase=document.getElementById('phase'),kind=document.getElementById('kind'),show=document.getElementById('events'),view=document.getElementById('view'),tip=document.getElementById('tip');
for(const name of [...new Set(data.selected.map(r=>r.priority+' / '+r.name))]) {const o=document.createElement('option');o.textContent=o.value=name;phase.append(o);}
function render(){view.replaceChildren();for(const r of data.selected.filter(r=>(!phase.value||r.priority+' / '+r.name===phase.value)&&(!kind.value||r.root.kind===kind.value))){const c=document.createElement('div');c.className='card';const title=document.createElement('h3');title.textContent=r.priority+' / '+r.name+' / '+r.root.kind+' · '+r.wallMs.toFixed(3)+' ms';c.append(title);const desc=document.createElement('p');desc.textContent=r.traceId+' · TypeScript '+(100*r.typescriptShare).toFixed(1)+'% · unexplained '+r.unexplainedMs.toFixed(3)+' ms'+(r.replicaPublication?' · replica publication '+r.replicaPublication.msAfterRootEnd.toFixed(3)+' ms relative to end':'');c.append(desc);const spans=[...r.spans].sort((a,b)=>a.start-b.start);if(show.checked)spans.push(...data.events.filter(e=>e.start<r.root.end&&e.end>r.root.start&&(e.layer!=="jvm-event"||r.spans.some(s=>s.process===e.process&&s.thread===e.thread))).sort((a,b)=>a.start-b.start));for(const s of spans){const line=document.createElement('div');line.className='lane';const label=document.createElement('span');label.className='label';label.title=s.name;label.textContent=(s.process||r.root.process)+'/t'+(s.thread??r.root.thread)+' · '+s.name;line.append(label);const bar=document.createElement('div');bar.className='bar '+s.layer;const a=Math.max(s.start,r.root.start),b=Math.min(s.end,r.root.end);bar.style.left=(240+680*(a-r.root.start)/Math.max(.001,r.wallMs))+'px';bar.style.width=Math.max(1,680*(b-a)/Math.max(.001,r.wallMs))+'px';bar.onmouseenter=()=>tip.textContent=JSON.stringify({...s,traceId:r.traceId,durationMs:s.end-s.start},null,2);line.append(bar);c.append(line);}const d=document.createElement('details'),su=document.createElement('summary'),pre=document.createElement('pre');su.textContent='Layer breakdown and overlapping system samples';pre.textContent=JSON.stringify({layers:r.layers,replicaPublication:r.replicaPublication,resources:data.resources.filter(x=>x.at>=r.root.start-1000&&x.at<=r.root.end+1000)},null,2);d.append(su,pre);c.append(d);view.append(c);}}
phase.onchange=kind.onchange=show.onchange=render;kind.value="commit";const preferred=[...phase.options].find(o=>o.value==="P2 / L256");if(preferred)phase.value=preferred.value;render();</script>`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dir = process.argv[2];
  if (!dir) throw Error("usage: report.mjs RUN_DIR [--copy-to DIR]");
  const i = process.argv.indexOf("--copy-to");
  console.log(
    JSON.stringify(await buildReport(dir, { copyTo: i >= 0 ? process.argv[i + 1] : undefined })),
  );
}
