import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { timelineBlocks } from "./render-output.mjs";
const marker = "triplex-packed-html-v1";
// [DX-T1-4] Why: repeated 50-MB self-contained viewers exhausted the measurement disk; gzip keeps every byte in one offline file.
// Rejected: deleting raw traces or requiring a server/network to load a saved timeline.
/** @param {string} html */
export function packHtml(html) {
  if (html.includes(`id="${marker}"`)) throw Error("Already packed HTML");
  const bytes = Buffer.from(html),
    hash = createHash("sha256").update(bytes).digest("hex");
  const packed = gzipSync(bytes, { level: 6 }).toString("base64");
  return `<!doctype html><meta charset="utf-8"><title>Saved trace</title><p id="state">Opening saved trace…</p><script type="application/octet-stream" id="${marker}" data-sha256="${hash}">${packed}</script><script type="module">
try {
 const saved=document.getElementById('${marker}'),bytes=Uint8Array.from(atob(saved.textContent),c=>c.charCodeAt(0));
 const decoded=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',decoded)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==saved.dataset.sha256)throw Error('Saved trace checksum mismatch');
 const html=new TextDecoder().decode(decoded);document.open();document.write(html);document.close();
} catch(error) { document.getElementById('state').textContent='Cannot open saved trace: '+error.message; }
</script>`;
}
/** @param {string} html */
export function unpackHtml(html) {
  const match = html.match(
    /id="triplex-packed-html-v1" data-sha256="([0-9a-f]{64})">([A-Za-z0-9+/=]+)<\/script>/,
  );
  if (!match) {
    if (html.includes(`id="${marker}"`)) throw Error("Invalid packed HTML");
    return html;
  }
  const bytes = gunzipSync(Buffer.from(match[2], "base64"));
  if (createHash("sha256").update(bytes).digest("hex") !== match[1])
    throw Error("Packed HTML checksum mismatch");
  return bytes.toString("utf8");
}

/** @param {unknown} value */
const escape = (value) =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

/** @param {{tag: string, finding: string, cards: readonly any[], context: (row: any) => Iterable<unknown>, resources: (row: any) => Iterable<unknown>}} options */
export function* timelineDocument({ tag, finding, cards, context, resources }) {
  yield `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Triplex trace ${escape(tag)}</title>
<style>
body{margin:24px;background:#111822;color:#dde9f5;font:14px system-ui}h1{font-size:24px}
p{max-width:1000px;line-height:1.5}select{background:#23364c;color:white;padding:7px;border:1px solid #567;border-radius:5px}
.card{background:#1a2635;margin:18px 0;padding:16px;overflow:auto;border-radius:8px}
.lane{position:relative;height:26px;min-width:920px;border-bottom:1px solid #314057}
.label{display:inline-block;width:240px;overflow:hidden;font-size:11px;white-space:nowrap}
.bar{position:absolute;top:3px;height:19px;min-width:1px;background:#69c8a0;border-radius:3px}
.gateway{background:#9bb4ff}.peer-wait,.peer-call{background:#dfb878}.driver-queue{background:#e88b82}
.typescript-gc,.gateway-gc{background:#f38ace}.network{background:#86d7ed}.event-loop{background:#f9de66}
.jvm-event{background:#8392a5}.jvm-safepoint{background:#dc9ee2}.throttling{background:#e8a161}
.muted{color:#91a5bd}pre{white-space:pre-wrap}#tip{position:sticky;bottom:0;background:#07101c;padding:12px;max-height:180px;overflow:auto}
</style>
<h1>Triplex request timeline · ${escape(tag)}</h1><p>${escape(finding)}</p>
<p class="muted">Offline evidence. Choose a request and hover for the span, thread and timestamp. Orange is peer wait, which includes network, transactor and storage. Overlapping samples show timing and do not establish causation.</p>
<label>Request <select id="request">`;
  for (const [i, row] of cards.entries())
    yield `<option value="${i}">${escape(row.priority + " / " + row.name + " / " + row.root.kind + " · " + row.wallMs.toFixed(3) + " ms · " + row.traceId)}</option>\n`;
  yield `</select></label> <label>Context <select id="context"></select></label>
<div id="view"></div><pre id="tip">Hover over a span to inspect it.</pre>\n`;
  for (const [i, row] of cards.entries()) {
    const { root, ...details } = row;
    const { spans: unusedRootSpans, ...rootDetails } = root;
    yield* timelineBlocks(i, [{ type: "request", row: { ...details, root: rootDetails } }]);
    function* observations() {
      for (const event of context(row)) yield { type: "event", event };
      for (const sample of resources(row)) yield { type: "resource", sample };
    }
    yield* timelineBlocks(i, observations());
  }
  yield viewerScript;
}

const viewerScript = `<script type="module">
const request = document.getElementById("request");
const context = document.getElementById("context");
const view = document.getElementById("view");
const tip = document.getElementById("tip");
let blocks = [], generation = 0;

async function decode(block) {
  const bytes = Uint8Array.from(atob(block.textContent), character => character.charCodeAt(0));
  const decoded = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", decoded);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== block.dataset.sha256) throw Error("Timeline block checksum mismatch");
  return new TextDecoder().decode(decoded).trimEnd().split("\\n").map(line => JSON.parse(line));
}

function lane(details, name, left, width, style) {
  const line = document.createElement("div");
  line.className = "lane";
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = label.title = name;
  const bar = document.createElement("span");
  bar.className = "bar " + style;
  bar.style.left = left + "px";
  bar.style.width = Math.max(1, width) + "px";
  bar.onmouseenter = () => tip.textContent = JSON.stringify(details, null, 2);
  line.append(label, bar);
  return line;
}

async function draw() {
  const current = ++generation;
  view.textContent = blocks.length ? "Opening request…" : "No retained requests.";
  if (!blocks.length) return;
  try {
    const [{ row }] = await decode(blocks[0]);
    const observations = context.value ? await decode(blocks[Number(context.value)]) : [];
    if (current !== generation) return;
    const card = document.createElement("div");
    card.className = "card";
    const title = document.createElement("h2");
    title.textContent = [row.priority, row.name, row.root.kind].join(" / ") + " · " + row.wallMs.toFixed(3) + " ms";
    const desc = document.createElement("p");
    desc.textContent = row.traceId + " · TypeScript " + (100 * row.typescriptShare).toFixed(1) + "% · unexplained " + row.unexplainedMs.toFixed(3) + " ms";
    card.append(title, desc);
    const scale = 680 / Math.max(.001, row.wallMs);
    for (const point of row.cpuProfile?.points ?? [])
      card.append(lane(point, "Writer CPU sample", 240 + (point.at - row.root.start) * scale, 2, "peer-wait"));
    const spans = [...row.spans, ...observations.filter(value => value.type === "event").map(value => value.event)];
    spans.sort((left, right) => left.start - right.start);
    for (const span of spans) {
      const start = Math.max(span.start, row.root.start);
      const end = Math.min(span.end, row.root.end);
      const label = (span.process ?? row.root.process) + "/t" + (span.thread ?? row.root.thread) + " · " + span.name;
      card.append(lane({ ...span, traceId: row.traceId, durationMs: span.end - span.start },
        label, 240 + (start - row.root.start) * scale, (end - start) * scale, span.layer));
    }
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const pre = document.createElement("pre");
    summary.textContent = "Layers and overlapping samples";
    pre.textContent = JSON.stringify({
      layers: row.layers, cpuProfile: row.cpuProfile, schedulerLateProfile: row.schedulerLateProfile,
      nativeTransactions: row.nativeTransactions, replicaPublication: row.replicaPublication,
      resources: observations.filter(value => value.type === "resource").map(value => value.sample)
    }, null, 2);
    details.append(summary, pre);
    card.append(details);
    view.replaceChildren(card);
  } catch (error) {
    if (current === generation) view.textContent = "Cannot open request: " + error.message;
  }
}

function selectRequest() {
  blocks = Array.from(document.querySelectorAll('script[data-card="' + request.value + '"]'));
  context.replaceChildren(new Option("Spans only", ""));
  for (let i = 1; i < blocks.length; i++) context.add(new Option("Block " + i + " of " + (blocks.length - 1), i));
  if (blocks.length > 1) context.selectedIndex = 1;
  draw();
}
request.onchange = selectRequest;
context.onchange = draw;
const preferred = Array.from(request.options).find(option => option.textContent.startsWith("P2 / L256 / commit"));
if (preferred) request.value = preferred.value;
selectRequest();
</script>`;
