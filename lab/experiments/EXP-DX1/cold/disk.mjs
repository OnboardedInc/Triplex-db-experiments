// [COLD-1] Why: time a durable write (O_DSYNC, as Postgres's open_datasync does) after a gap in which the disk saw nothing,
// then a second durable write at once. This reproduces the INSERT-then-UPDATE flush pair of one Datomic log write
// without Postgres, the JVMs or the network.
// Rejected: fsync after a buffered write (a different guest path from the one the WAL takes).
// usage: node disk.mjs FILE REPS [GAPS_CSV] [LABEL]   prints one JSON line
import { performance } from "node:perf_hooks";
import fs from "node:fs";
const file = process.argv[2], reps = Number(process.argv[3] ?? 30);
const gaps = (process.argv[4] ?? "0,5,10,20,30,40,50,60,70,80,100,150,250,500,1000,2000").split(",").map(Number), label = process.argv[5] ?? "";
const size = 64 * 1024 * 1024;
if (!fs.existsSync(file) || fs.statSync(file).size !== size) {
  const fd0 = fs.openSync(file, "w"); const zero = Buffer.alloc(1024 * 1024);
  for (let i = 0; i < 64; i++) fs.writeSync(fd0, zero); fs.fsyncSync(fd0); fs.closeSync(fd0);
}
const fd = fs.openSync(file, fs.constants.O_RDWR | fs.constants.O_DSYNC);
const first = Buffer.alloc(16384, 7), second = Buffer.alloc(8192, 9);
let pos = 0, seed = 0x2468ace1;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
const sab = new Int32Array(new SharedArrayBuffer(4));
for (let i = 0; i < 200; i++) { fs.writeSync(fd, second, 0, 8192, pos); pos = (pos + 8192) % size; }
const plan = [];
for (let r = 0; r < reps; r++) { const g = gaps.slice(); for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; } plan.push(...g); }
const rows = [];
const started = Date.now();
for (const gap of plan) {
  if (gap > 0) Atomics.wait(sab, 0, 0, gap);
  const t0 = performance.now();
  fs.writeSync(fd, first, 0, 16384, pos); pos = (pos + 16384) % size;
  const t1 = performance.now();
  fs.writeSync(fd, second, 0, 8192, pos); pos = (pos + 8192) % size;
  const t2 = performance.now();
  rows.push([gap, Math.round((t1 - t0) * 10000) / 10000, Math.round((t2 - t1) * 10000) / 10000]);
}
fs.closeSync(fd);
const q = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const summary = gaps.map((g) => { const a = rows.filter((r) => r[0] === g); return { gap: g, n: a.length, firstP10: q(a.map((r) => r[1]), 0.1), firstP50: q(a.map((r) => r[1]), 0.5), firstP90: q(a.map((r) => r[1]), 0.9), secondP50: q(a.map((r) => r[2]), 0.5), secondP90: q(a.map((r) => r[2]), 0.9) }; });
console.log(JSON.stringify({ label, reps, gaps, startedAt: started, endedAt: Date.now(), cpu: fs.readFileSync("/proc/self/status", "utf8").match(/Cpus_allowed_list:\s*(\S+)/)?.[1], summary, rows }));
