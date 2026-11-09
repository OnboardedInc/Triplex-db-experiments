// [EXP-QH1-R2] Why: show that process.cpuUsage() already contains worker-thread CPU, once, so per-pull efficiency uses it alone.
// Method: burn a known amount of CPU on the main thread and on worker threads in turn, compare process.cpuUsage with the sum of
// per-thread counters. Rejected: trusting documentation alone (R46 4.2 cites it; round 1's brief double counted).
import { Worker } from "node:worker_threads";
const burn = (ms) => { const t = process.threadCpuUsage(); let x = 1; for (;;) { for (let i = 0; i < 1e5; i++) x = (Math.imul(x, 1664525) + 1013904223) >>> 0; const c = process.threadCpuUsage(t); if ((c.user + c.system) / 1000 >= ms) return x; } };
const code = `const { parentPort } = require('node:worker_threads');
parentPort.on('message', ms => { const t = process.threadCpuUsage(); let x = 1; for (;;) { for (let i = 0; i < 1e5; i++) x = (Math.imul(x, 1664525) + 1013904223) >>> 0; const c = process.threadCpuUsage(t); if ((c.user + c.system) / 1000 >= ms) break; } const c = process.threadCpuUsage(); parentPort.postMessage({ total: c.user + c.system, since: process.threadCpuUsage(t) }); });`;
const workers = Array.from({ length: 3 }, () => new Worker(code, { eval: true }));
const ask = (w, ms) => new Promise((res) => { w.once("message", res); w.postMessage(ms); });
const us = (c) => c.user + c.system;
const out = [];
for (const [label, mainMs, workerMs] of [["main only 500 ms", 500, 0], ["3 workers x 500 ms, main idle", 0, 500], ["main 500 ms + 3 workers x 500 ms", 500, 500]]) {
  const p0 = process.cpuUsage(), m0 = process.threadCpuUsage();
  const ws = workerMs ? Promise.all(workers.map((w) => ask(w, workerMs))) : Promise.resolve([]);
  if (mainMs) burn(mainMs);
  const w = await ws;
  const p = process.cpuUsage(p0), m = process.threadCpuUsage(m0);
  const workerUs = w.reduce((s, x) => s + us(x.since), 0);
  out.push({ label, processCpuUs: us(p), mainThreadUs: us(m), workerThreadsUs: workerUs, mainPlusWorkersUs: us(m) + workerUs, processMinusNamedUs: us(p) - us(m) - workerUs, countedOnce: Math.abs(us(p) - (us(m) + workerUs)) < 0.05 * (us(m) + workerUs) });
}
console.log(JSON.stringify(out, null, 1));
for (const w of workers) await w.terminate();
