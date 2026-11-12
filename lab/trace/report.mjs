// @ts-nocheck -- JSON wire records are validated on ingestion; checkjs still checks all bindings.
import fs from "node:fs";
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
export function attribute(root, gateways = [], events = []) {
  const all = root.spans.map((s) => ({ ...s, process: root.process, thread: root.thread }));
  for (const g of gateways) {
    all.push({
      id: g.root,
      name: g.name,
      layer: "gateway",
      start: g.start,
      end: g.end,
      process: g.process,
      thread: g.thread,
    });
    all.push(...g.spans.map((s) => ({ ...s, process: g.process, thread: s.thread ?? g.thread })));
  }
  // GC pauses have process/isolate identity; timer drift is an overlay estimate and never causal attribution.
  for (const e of events)
    if (
      !e.estimated &&
      ["typescript-gc", "gateway-gc"].includes(e.layer) &&
      ((e.process === root.process && e.thread === root.thread) ||
        gateways.some((g) => g.process === e.process))
    )
      all.push(e);
  const spans = all.filter(validSpan).filter((s) => s.start < root.end && s.end > root.start);
  const points = [
    ...new Set([
      root.start,
      root.end,
      ...spans.flatMap((s) => [Math.max(root.start, s.start), Math.min(root.end, s.end)]),
    ]),
  ].sort((a, b) => a - b);
  const layers = Object.fromEntries(LAYERS.map((k) => [k, 0]));
  const steps = {};
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    const candidates = spans
      .filter((s) => s.start <= a && s.end >= b)
      .sort((x, y) => (rank[y.layer] ?? 0) - (rank[x.layer] ?? 0) || duration(x) - duration(y));
    const s = candidates[0];
    // Until the server's spans are received, socket wait is unobserved gateway/network time, not measured network.
    const layer =
      s?.layer === "gateway-wait"
        ? gateways.length
          ? "network"
          : "unknown"
        : LAYERS.includes(s?.layer)
          ? s.layer
          : "unknown";
    layers[layer] += b - a;
    const step = s
      ? `${s.process ?? root.process}/thread-${s.thread ?? root.thread}/${s.name}`
      : "uncovered";
    steps[step] = (steps[step] ?? 0) + b - a;
  }
  const wall = duration(root),
    ts =
      layers.typescript + layers["event-loop"] + layers["typescript-gc"] + layers["driver-queue"];
  return {
    traceId: root.traceId,
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
  const priority = /sweep|activation|impact/.test(name)
    ? "P5"
    : /history|current|weighted|depth/.test(name)
      ? "P4"
      : r.kind === "commit"
        ? "P2"
        : "P1";
  return { name, priority, readers: phase?.readers ?? null };
}
function table(rows, label) {
  const columns = ["wallMs", ...LAYERS, "typescriptMs", "typescriptShare", "unexplainedMs"];
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
  const input = filesUnder(path.join(rootDir, "trace/raw")).filter((f) =>
    /\.jsonl(\.gz)?$/.test(f),
  );
  const requests = [],
    events = [],
    resources = [],
    histograms = [];
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
          if (validSpan(r)) events.push(r);
        } else if (r.type === "resource" || r.type === "metrics") resources.push(r);
        else if (r.type === "histograms") {
          footer = true;
          histograms.push(r);
          if (r.failure) errors.push("Recorder reported failure");
        }
      }
      if (/^node-/.test(path.basename(file)) && !footer)
        errors.push(`Missing drain footer in ${path.basename(file)}`);
    } catch (error) {
      errors.push(`${path.basename(file)}: ${error.message}`);
    }
  }
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
  if (!roots.length) roots = requests.filter((r) => r.name.startsWith("http "));
  // Only exact trace and parent-span matches qualify gateway children; same trace alone is insufficient for retries.
  const linked = (r) =>
    (gateways.get(r.traceId) ?? []).filter((g) =>
      r.spans.some((s) => s.id === g.parent && s.name === "client.http"),
    );
  const evaluated = roots.map((r) => ({
    root: r,
    ...attribute(r, linked(r), events),
    ...phaseOf(r, bench.phases ?? []),
  }));
  const commits = evaluated.filter((r) => r.root.kind === "commit");
  const measured = commits.filter((r) => r.name !== "outside-phases");
  const denom = measured.length ? measured : commits;
  const explained = denom.filter((r) => r.explained >= 0.95 && !r.root.truncated).length;
  // Content/freshness/binding: compare the observed per-command trace against this run's actual writer rows.
  const writesFile = path.join(rootDir, "driver/ns-writes.jsonl");
  let writes = 0,
    missingCommits = 0;
  const ids = new Set(commits.map((r) => r.traceId));
  if (fs.existsSync(writesFile))
    for await (const w of records(writesFile)) {
      writes++;
      if (!w.traceId || !ids.has(w.traceId)) missingCommits++;
    }
  else errors.push("Writer file absent: cannot establish complete commit denominator");
  if (missingCommits)
    errors.push(`${missingCommits}/${writes} writer observations lack a matching trace`);
  if (!manifest) errors.push("Run binding manifest absent");
  if (!histograms.length) errors.push("No final Node histograms: recorder drain not proven");
  if (!denom.length) errors.push("No commit traces");
  const groups = new Map();
  for (const r of evaluated) {
    const key = `${r.priority} / ${r.name} / ${r.root.kind}`;
    const group = groups.get(key) ?? [];
    group.push(r);
    groups.set(key, group);
  }
  const selected = [];
  for (const group of groups.values())
    selected.push(...[...group].sort((a, b) => b.wallMs - a.wallMs).slice(0, 20));
  const slow = [...commits].sort((a, b) => b.wallMs - a.wallMs).slice(0, 5);
  const finding = slow.length
    ? `The slowest observed commits spent their largest exclusive interval in ${slow.map((r) => `\`${r.steps[0]?.[0] ?? "unknown"}\` (${n(r.steps[0]?.[1])} ms, trace \`${r.traceId}\`)`).join("; ")}. These are observed spans, not proof of the closed-source transactor's internal cause.`
    : "No commit traces were observed; the cause of slow commits is not established.";
  const rawBytes = filesUnder(path.join(rootDir, "trace/raw")).reduce(
    (sum, f) => sum + fs.statSync(f).size,
    0,
  );
  const summary = {
    schema: "triplex.trace-report.v1",
    tag,
    source: manifest?.source ?? null,
    finding,
    requests: roots.length,
    commits: commits.length,
    writerRows: writes,
    missingCommits,
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
    slowest: slow.map(({ root, spans, ...rest }) => rest),
  };
  const lines = [
    "# Trace report",
    "",
    finding,
    "",
    `Run \`${tag}\`; source \`${summary.source}\`; subjects ${bench.seed?.seededSubjects ?? "unknown"}; tracing ${manifest?.level ?? "unknown"}.`,
    "",
    `Commit coverage: ${explained}/${denom.length} (${n(denom.length ? (100 * explained) / denom.length : NaN)}%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: ${writes - missingCommits}/${writes}. Raw trace bytes: ${rawBytes}.`,
    "",
    "Units: ms; TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node wall time excluding observed waits/GC, not on-CPU time. Driver queue is separate; timer drift is a bounded estimate shown only as an overlay. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.",
    "",
    "Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.",
    "",
    `Evidence checks: ${errors.length ? errors.join("; ") : "source/run/slot binding, final histograms, writer trace IDs and interval content checked"}. Oracle: ${bench.oracle?.status ?? bench.independentOracle?.status ?? "see ns-report.json; not certified by tracing"}.`,
    "",
  ];
  for (const [key, rows] of groups) {
    lines.push(
      `## ${key} (${rows.length} retained requests)`,
      "",
      table(rows, "quantile"),
      "",
      "| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |",
      "| --- | ---: | ---: | ---: | ---: | --- |",
    );
    for (const r of [...rows].sort((a, b) => b.wallMs - a.wallMs).slice(0, 20))
      lines.push(
        `| ${r.traceId} | ${n(r.wallMs)} | ${n(r.typescriptMs)} | ${n(r.typescriptShare)} | ${n(r.unexplainedMs)} | ${r.steps[0]?.[0] ?? "unknown"} |`,
      );
    lines.push("");
  }
  lines.push(
    "## Visibility limits",
    "",
    "Logical read histograms include every finished read; retained fast reads are a fixed 1/1024 FNV sample, and reads at least 50 ms are retained. Slowest read selection is among the retained sample plus every observed slow read. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC overlaps and independent thread work are pictured, not inferred from percentiles.",
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
        pid: s.process ?? r.root.process,
        tid: s.thread ?? r.root.thread,
        args: { traceId: r.traceId, phase: r.name, priority: r.priority },
      });
    for (const e of events)
      if (e.start < r.root.end && e.end > r.root.start)
        chrome.push({
          name: e.name,
          cat: e.layer,
          ph: "X",
          ts: (e.start - start) * 1000,
          dur: duration(e) * 1000,
          pid: e.process,
          tid: e.thread ?? 0,
          args: { overlapsTrace: r.traceId, estimated: !!e.estimated },
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
  const relevantEvents = events.filter((e) =>
    selected.some((r) => e.start < r.root.end && e.end > r.root.start),
  );
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
<style>body{margin:24px;background:#111822;color:#dde9f5;font:14px system-ui}h1{font-size:24px}p{max-width:1200px;line-height:1.5}select,input,button{background:#23364c;color:white;padding:8px;border:1px solid #567;border-radius:5px}.card{background:#1a2635;margin:18px 0;padding:16px;overflow:auto;border-radius:8px}.lane{position:relative;height:26px;min-width:920px;border-bottom:1px solid #314057}.label{display:inline-block;width:240px;overflow:hidden;font-size:11px;white-space:nowrap}.bar{position:absolute;top:3px;height:19px;border-radius:3px;min-width:1px;background:#69c8a0;cursor:crosshair}.typescript{background:#69c8a0}.gateway{background:#9bb4ff}.peer-wait,.peer-call{background:#dfb878}.driver-queue{background:#e88b82}.typescript-gc,.gateway-gc{background:#f38ace}.network{background:#86d7ed}.event-loop{background:#f9de66}.muted{color:#91a5bd}pre{white-space:pre-wrap}#tip{position:fixed;bottom:0;background:#07101c;padding:12px;left:0;right:0;max-height:180px;overflow:auto}summary{cursor:pointer}svg{background:#122030}</style>
<h1>Triplex request timeline · ${esc(tag)}</h1><p>${esc(finding)}</p><p class="muted">Offline evidence. Each row has its own wall-time scale. Hover for span, thread, timestamp and trace ID. Orange is peer wait (network + transactor + storage); it is not a claim about internal transactor CPU. Pink GC and yellow estimated timer drift are overlapping observations.</p>
<label>Phase <select id="phase"><option value="">All</option></select></label> <label>Kind <select id="kind"><option value="">All</option><option>commit</option><option>read</option></select></label> <label><input type="checkbox" id="events" checked>Overlapping pauses and work</label><div id="view"></div><pre id="tip">Hover over a span to inspect it.</pre><script type="application/json" id="data">${data}</script><script>
const data=JSON.parse(document.getElementById('data').textContent),phase=document.getElementById('phase'),kind=document.getElementById('kind'),show=document.getElementById('events'),view=document.getElementById('view'),tip=document.getElementById('tip');
for(const name of [...new Set(data.selected.map(r=>r.priority+' / '+r.name))]) {const o=document.createElement('option');o.textContent=o.value=name;phase.append(o);}
function render(){view.replaceChildren();for(const r of data.selected.filter(r=>(!phase.value||r.priority+' / '+r.name===phase.value)&&(!kind.value||r.root.kind===kind.value))){const c=document.createElement('div');c.className='card';const title=document.createElement('h3');title.textContent=r.priority+' / '+r.name+' / '+r.root.kind+' · '+r.wallMs.toFixed(3)+' ms';c.append(title);const desc=document.createElement('p');desc.textContent=r.traceId+' · TypeScript '+(100*r.typescriptShare).toFixed(1)+'% · unexplained '+r.unexplainedMs.toFixed(3)+' ms';c.append(desc);const spans=[...r.spans];if(show.checked)spans.push(...data.events.filter(e=>e.start<r.root.end&&e.end>r.root.start));for(const s of spans.sort((a,b)=>a.start-b.start)){const line=document.createElement('div');line.className='lane';const label=document.createElement('span');label.className='label';label.textContent=(s.process||r.root.process)+'/t'+(s.thread??r.root.thread)+' · '+s.name;line.append(label);const bar=document.createElement('div');bar.className='bar '+s.layer;const a=Math.max(s.start,r.root.start),b=Math.min(s.end,r.root.end);bar.style.left=(240+680*(a-r.root.start)/Math.max(.001,r.wallMs))+'px';bar.style.width=Math.max(1,680*(b-a)/Math.max(.001,r.wallMs))+'px';bar.onmouseenter=()=>tip.textContent=JSON.stringify({...s,traceId:r.traceId,durationMs:s.end-s.start},null,2);line.append(bar);c.append(line);}const d=document.createElement('details'),su=document.createElement('summary'),pre=document.createElement('pre');su.textContent='Layer breakdown and overlapping system samples';pre.textContent=JSON.stringify({layers:r.layers,resources:data.resources.filter(x=>x.at>=r.root.start-1000&&x.at<=r.root.end+1000)},null,2);d.append(su,pre);c.append(d);view.append(c);}}
phase.onchange=kind.onchange=show.onchange=render;render();</script>`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dir = process.argv[2];
  if (!dir) throw Error("usage: report.mjs RUN_DIR [--copy-to DIR]");
  const i = process.argv.indexOf("--copy-to");
  console.log(
    JSON.stringify(await buildReport(dir, { copyTo: i >= 0 ? process.argv[i + 1] : undefined })),
  );
}
