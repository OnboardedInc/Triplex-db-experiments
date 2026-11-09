// [EXP-QH1-R2] Why: function-level self-time attribution from V8 CPU profiles (one per thread) restricted to the measured window,
// as the cross-check for the thread-counter decomposition. Sampling measures on-thread time between samples, so it is shares of
// CPU, rescaled to the window's thread CPU counters; it never replaces them. Rejected: wall-clock profile of the whole process life
// (broker open and module load dominate it).
// usage: node profile.mjs <profileDir> <armResult.json> [top=25]
import fs from "node:fs";
import path from "node:path";
const [dir, resultFile, topArg = "25"] = process.argv.slice(2);
const result = JSON.parse(fs.readFileSync(resultFile));
const [w0, w1] = result.windowUs;
const pulls = result.segments.reduce((s, x) => s + x.pulls, 0);
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".cpuprofile"));
const cat = (n) => {
  const f = n.callFrame, name = f.functionName || "(anonymous)", url = f.url || "";
  if (name === "(idle)") return "idle";
  if (name === "(garbage collector)") return "gc";
  if (name === "(program)") return "program (native, unattributed)";
  if (name === "(root)") return "root";
  if (/ValueDomain\.js/.test(url)) return /decodedPrimitiveValue|decodeValueColumns/.test(name) ? "domain: fast path (decodedPrimitiveValue)" : "domain: full check (assertValueInDomain/invalidValue)";
  if (/broker\/h1\.js/.test(url)) return "h1 decode (h1Rows/idFromHex/optional)";
  if (/BrokerStorageAdapter\.js/.test(url)) return "adapter (BrokerStorageAdapter)";
  if (/TriplesLive|packages\/core\/dist/.test(url) || /arms\/[a-z]+\/packages\/core/.test(url)) return "kernel (core: TriplesLive/read policy/etc)";
  if (/\/effect\//.test(url)) return "Effect runtime";
  if (/broker\/log\.js/.test(url)) return "log (Connection.request/MessageChannel)";
  if (/g0\/arm\.ts|arm\.ts/.test(url)) return "bench loop (arm.ts)";
  if (/node:internal\/(worker|per_context\/messageport|process)/.test(url) || /MessagePort|postMessage|receiveMessage/.test(name)) return "worker messaging (node internals)";
  if (/^node:/.test(url)) return "node internals";
  if (name === "parse" || name === "JSON.parse") return "JSON.parse";
  if (/^(get|all|run|iterate|pluck|raw|exec|prepare)$/.test(name) && !url) return "sqlite native (better-sqlite3 call)";
  return url ? "other js: " + path.basename(url) : "other native: " + name;
};
const threads = [];
for (const f of files) {
  const p = JSON.parse(fs.readFileSync(path.join(dir, f)));
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  let t = p.startTime;
  const self = new Map(); let inWindow = 0, total = 0;
  for (let i = 0; i < p.samples.length; i++) {
    t += p.timeDeltas[i];
    const n = byId.get(p.samples[i]);
    total += p.timeDeltas[i];
    if (t < w0 || t > w1) continue;
    const key = `${n.callFrame.functionName || "(anon)"} ${path.basename(n.callFrame.url || "")}:${n.callFrame.lineNumber + 1}`;
    const c = cat(n);
    const e = self.get(key) ?? { key, cat: c, us: 0, n: 0 }; e.us += p.timeDeltas[i]; e.n++; self.set(key, e);
    inWindow += p.timeDeltas[i];
  }
  const tid = Number(f.split(".").slice(-4)[0]) || f;
  const rows = [...self.values()].sort((a, b) => b.us - a.us);
  const busy = rows.filter((r) => r.cat !== "idle").reduce((s, r) => s + r.us, 0);
  const cats = {};
  for (const r of rows) cats[r.cat] = (cats[r.cat] ?? 0) + r.us;
  threads.push({ file: f, startOffsetS: ((p.startTime - w0) / 1e6).toFixed(1), windowSamplesUs: inWindow, busyUsPerPull: busy / pulls, cats: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, +(v / pulls).toFixed(1)]).sort((a, b) => b[1] - a[1])), top: rows.filter((r) => r.cat !== "idle").slice(0, Number(topArg)).map((r) => ({ fn: r.key, cat: r.cat, usPerPull: +(r.us / pulls).toFixed(2) })) });
}
threads.sort((a, b) => b.busyUsPerPull - a.busyUsPerPull);
console.log(JSON.stringify({ pulls, windowSeconds: (w1 - w0) / 1e6, threads }, null, 1));
