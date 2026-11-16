// @ts-nocheck -- [DX-T1-12] Why: standalone probe wire records use runtime validation; checkjs still checks every binding. Rejected: omit tracked probes from the source inventory.
// [COLD-1] Why: a fixed arithmetic kernel that touches almost no memory shows how fast this virtual CPU is at each moment,
// which separates "the processor is slower" (frequency, efficiency core) from "the caches are cold".
// Rejected: timing the real stack for this (its spans mix compute speed, cache state and waits).
// usage: node speed.mjs SECONDS [LABEL]   prints one JSON line
import { performance } from "node:perf_hooks";
import fs from "node:fs";
const seconds = Number(process.argv[2] ?? 10), label = process.argv[3] ?? "";
const table = new Int32Array(1024).map((_, i) => (i * 2654435761) | 0);
function kernel(n) {
  let a = 0x9e3779b9 | 0, b = 0x7f4a7c15 | 0, c = 0x94d049bb | 0, d = 0x2545f491 | 0;
  for (let i = 0; i < n; i++) {
    a ^= a << 13; a ^= a >>> 17; a ^= a << 5;
    b ^= b << 13; b ^= b >>> 17; b ^= b << 5;
    c = (c + table[(a ^ i) & 1023]) | 0;
    d = (d * 31 + table[(b + i) & 1023]) | 0;
  }
  return a ^ b ^ c ^ d;
}
// calibrate to about 10 microseconds per sample on the fastest state seen during warm-up
let sink = 0, iter = 2000;
for (let i = 0; i < 20000; i++) sink ^= kernel(iter);
{
  let best = Infinity;
  for (let i = 0; i < 4000; i++) { const t = performance.now(); sink ^= kernel(iter); best = Math.min(best, performance.now() - t); }
  iter = Math.max(200, Math.round(iter * 0.010 / best));
}
const cap = Math.ceil(seconds * 1000 / 0.008);
const at = new Float64Array(cap), dt = new Float32Array(cap);
const mono0 = Number(process.hrtime.bigint()) / 1e6 - performance.now();
const end = performance.now() + seconds * 1000;
let n = 0, t0 = performance.now();
while (t0 < end && n < cap) {
  sink ^= kernel(iter);
  const t1 = performance.now();
  at[n] = t0; dt[n++] = t1 - t0; t0 = t1;
}
const sorted = Float32Array.from(dt.subarray(0, n)).sort();
const q = (p) => sorted[Math.min(n - 1, Math.floor(p * n))];
const base = q(0.05);
// classes: fast < 1.3 base; slow 1.3 to 3.5 base; stall above (the sample contained time off this kernel)
const cls = (x) => (x < 1.3 * base ? 0 : x < 3.5 * base ? 1 : 2);
const runs = []; let cur = cls(dt[0]), start = at[0], count = 1;
const share = [0, 0, 0], time = [0, 0, 0];
for (let i = 0; i < n; i++) { const c = cls(dt[i]); share[c]++; time[c] += dt[i]; }
for (let i = 1; i < n; i++) {
  const c = cls(dt[i]) === 2 ? cur : cls(dt[i]); // a stall does not end a speed run
  if (c !== cur) { runs.push([Math.round((start + mono0) * 1000) / 1000, Math.round((at[i] - start) * 1000) / 1000, cur]); cur = c; start = at[i]; }
}
runs.push([Math.round((start + mono0) * 1000) / 1000, Math.round((at[n - 1] + dt[n - 1] - start) * 1000) / 1000, cur]);
const lens = (c) => runs.filter((r) => r[2] === c).map((r) => r[1]).sort((a, b) => a - b);
const stat = (xs) => xs.length ? { n: xs.length, p10: xs[Math.floor(0.1 * xs.length)], p50: xs[Math.floor(0.5 * xs.length)], p90: xs[Math.floor(0.9 * xs.length)], max: xs.at(-1), mean: xs.reduce((a, b) => a + b, 0) / xs.length } : { n: 0 };
const stalls = []; for (let i = 0; i < n; i++) if (cls(dt[i]) === 2) stalls.push(dt[i] - base);
stalls.sort((a, b) => a - b);
const slowSamples = Float32Array.from(dt.subarray(0, n)).filter((x) => cls(x) === 1).sort();
const out = {
  label, cpu: fs.readFileSync("/proc/self/status", "utf8").match(/Cpus_allowed_list:\s*(\S+)/)?.[1], seconds, iter, samples: n,
  baseMs: base, p50Ms: q(0.5), p90Ms: q(0.9), p99Ms: q(0.99),
  slowRatioP50: slowSamples.length ? slowSamples[Math.floor(slowSamples.length / 2)] / base : null,
  timeShare: { fast: time[0] / (time[0] + time[1] + time[2]), slow: time[1] / (time[0] + time[1] + time[2]), stall: time[2] / (time[0] + time[1] + time[2]) },
  fastRunMs: stat(lens(0)), slowRunMs: stat(lens(1)),
  transitionsPerSecond: (runs.length - 1) / seconds,
  stalls: { ...stat(stalls), perSecond: stalls.length / seconds, totalMs: stalls.reduce((a, b) => a + b, 0) },
  monoStartMs: at[0] + mono0, sink,
  runs: process.env.COLD_RUNS === "1" ? runs : undefined,
};
console.log(JSON.stringify(out));
