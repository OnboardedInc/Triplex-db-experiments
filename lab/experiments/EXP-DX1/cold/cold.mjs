// @ts-nocheck -- [DX-T1-12] Why: standalone probe wire records use runtime validation; checkjs still checks every binding. Rejected: omit tracked probes from the source inventory.
// [COLD-1] Why: time the first touch of a fixed set of cache lines after a gap, then the same lines again at once.
// The difference is what the gap cost in cache and TLB state, with no JVM, socket or disk involved. Four footprints
// separate core-private state (32 KB) from the cluster's shared cache (512 KB, 4 MB) and from the TLB (one line per page).
// Rejected: a single footprint (cannot tell a private-cache loss from a shared-cache loss).
// usage: node cold.mjs REPS MODE(sleep|spin) [GAPS_CSV] [LABEL]   prints one JSON line
import { performance } from "node:perf_hooks";
import fs from "node:fs";
const reps = Number(process.argv[2] ?? 30), mode = process.argv[3] ?? "sleep";
const gaps = (process.argv[4] ?? "0,2,5,10,25,50,100,250,500,1000,2000").split(",").map(Number), label = process.argv[5] ?? "";
let seed = 0x12345678;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
function config(name, lines, stride) {
  const buf = new Uint8Array(lines * stride + 64).fill(1);
  const order = new Int32Array(lines).map((_, i) => i);
  for (let i = lines - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
  for (let i = 0; i < lines; i++) order[i] *= stride;
  return { name, lines, stride, buf, order };
}
// order after each gap: largest first, smallest last, so the smallest set is the last thing in the private caches
const configs = [config("4MB-dense", 65536, 64), config("2048-pages", 2048, 4096), config("512KB-dense", 8192, 64), config("32KB-dense", 512, 64)];
function pass(buf, order, n) { let s = 0; for (let i = 0; i < n; i++) s += buf[order[i]]; return s; }
const table = new Int32Array(1024).map((_, i) => (i * 2654435761) | 0);
function kernel(n) {
  let a = 0x9e3779b9 | 0, b = 0x7f4a7c15 | 0, c = 0x94d049bb | 0, d = 0x2545f491 | 0;
  for (let i = 0; i < n; i++) { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; b ^= b << 13; b ^= b >>> 17; b ^= b << 5; c = (c + table[(a ^ i) & 1023]) | 0; d = (d * 31 + table[(b + i) & 1023]) | 0; }
  return a ^ b ^ c ^ d;
}
let sink = 0;
for (let w = 0; w < 300; w++) for (const c of configs) sink += pass(c.buf, c.order, c.lines);
for (let i = 0; i < 20000; i++) sink ^= kernel(2000);
let kbase = Infinity;
for (let i = 0; i < 4000; i++) { const t = performance.now(); sink ^= kernel(2000); kbase = Math.min(kbase, performance.now() - t); }
const sab = new Int32Array(new SharedArrayBuffer(4));
function idle(ms) {
  if (ms <= 0) return 0;
  const t = performance.now();
  if (mode === "sleep") Atomics.wait(sab, 0, 0, ms);
  else { const end = t + ms; while (performance.now() < end) sink ^= kernel(200); }
  return performance.now() - t - ms;
}
const rows = [];
const plan = [];
for (let r = 0; r < reps; r++) { const g = gaps.slice(); for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; } plan.push(...g); }
const started = Date.now();
for (const gap of plan) {
  const over = idle(gap);
  const row = { gap, over, p: [] };
  for (const c of configs) {
    const t0 = performance.now(); sink += pass(c.buf, c.order, c.lines);
    const t1 = performance.now(); sink += pass(c.buf, c.order, c.lines);
    const t2 = performance.now(); sink += pass(c.buf, c.order, c.lines);
    const t3 = performance.now();
    row.p.push([t1 - t0, t2 - t1, t3 - t2]);
  }
  let k = Infinity;
  for (let i = 0; i < 3; i++) { const t = performance.now(); sink ^= kernel(2000); k = Math.min(k, performance.now() - t); }
  row.speed = k / kbase;
  rows.push(row);
}
const q = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const round = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
const summary = [];
for (const [ci, c] of configs.entries()) for (const gap of gaps) for (const cls of ["all", "fast", "slow"]) {
  const sel = rows.filter((r) => r.gap === gap && (cls === "all" || (cls === "fast") === (r.speed < 1.3)));
  if (!sel.length) continue;
  const first = sel.map((r) => r.p[ci][0]), third = sel.map((r) => r.p[ci][2]), diff = sel.map((r) => r.p[ci][0] - r.p[ci][2]);
  summary.push({ config: c.name, gap, cls, n: sel.length, firstP50: round(q(first, 0.5)), firstP10: round(q(first, 0.1)), firstP90: round(q(first, 0.9)), warmP50: round(q(third, 0.5)), coldP50: round(q(diff, 0.5)), coldP10: round(q(diff, 0.1)), coldP90: round(q(diff, 0.9)) });
}
const overs = gaps.filter((g) => g > 0).map((g) => ({ gap: g, overP50: round(q(rows.filter((r) => r.gap === g).map((r) => r.over), 0.5)), overP90: round(q(rows.filter((r) => r.gap === g).map((r) => r.over), 0.9)) }));
console.log(JSON.stringify({ label, mode, reps, gaps, cpu: fs.readFileSync("/proc/self/status", "utf8").match(/Cpus_allowed_list:\s*(\S+)/)?.[1], startedAt: started, endedAt: Date.now(), kernelBaseMs: kbase,
  slowShare: rows.filter((r) => r.speed >= 1.3).length / rows.length, summary, overshoot: overs,
  rows: rows.map((r) => [r.gap, round(r.over), round(r.speed), ...r.p.map((p) => p.map(round))]), sink }));
