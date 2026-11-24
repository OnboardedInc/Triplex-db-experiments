// [DX-API1] Predictions at 1 billion records from the Mac counts (counts.json) and the unit costs measured on the server
// on 2026-11-23 (rd1/PINNED-1B.md, rd5/UNCACHED-READ.md section 1). Written before any server run of this page.
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/api1/predict.ts COUNTS_JSON > predictions.json
// The model (API-CALL-READS.md section 5):
//   reader CPU per call, re-read subjects = Mac warm CPU per call x f, where f = 1.53 ms / Mac CPU of the same exchange
//     (eight subjects' field 0 in one pinned /read: 1,302.5 exchanges/s on 1.99 reader cores at 1 billion);
//   random subjects: + storage loads x 0.86 ms, loads = Mac cold loads per call x g, g = 1.76 / Mac cold loads per subject
//     of the same exchange (1.76 loads per random subject at 1 billion);
//   alone, wall per call = the sum over the call's request rounds of (round trip 0.25 ms + the round's service time),
//     a round's service = its reads' CPU spread over 3 permits for single reads, or one request's CPU for a batch, plus
//     storage waits: serial inside each single read (1.2 ms per load: 0.51 SQL + 0.69 decode), overlapped 16 wide in a batch;
//   with N callers on one 3-core reader the reader is saturated: calls/s = 3 x 0.9 / CPU per call, call p50 = N / calls/s
//     (Little's law), p99 = 1.7 x p50 (the 1 billion windows' tail ratio, 1.6 to 1.9).
import { readFileSync } from "node:fs";
import { shapes } from "./shapes.ts";

const rows: any[] = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
const get = (shape: string, port: string, reader: string, callers = 1) => rows.find((r) => r.shape === shape && r.port === port && r.reader === reader && r.callers === callers);
const exWarm = get("exchange-of-8", "single", "warm"), exCold = get("exchange-of-8", "single", "cold");
const f = 1.53 / exWarm.cpuMsPerCall;
const g = 1.76 / Math.max(0.05, exCold.loads / 8);
const CORES = 3, UTIL = 0.9, RTT = 0.25, PERMITS = 3, LOAD_WAIT = 1.2, PREFETCH = 16, TAIL = 1.7;
const out: any[] = [];
for (const shape of shapes) {
  const levels = shape.levels.length + (shape.after?.length ?? 0);
  for (const port of ["today", "loader", "batch1"]) {
    const w = get(shape.name, port, "warm"), c = get(shape.name, port, "cold");
    if (!w || !c) continue;
    const cpuWarm = w.cpuMsPerCall * f;
    const loads = c.loads * g;
    const cpuCold = c.cpuMsPerCall * f > cpuWarm ? cpuWarm + loads * 0.86 : cpuWarm + loads * 0.86;
    const rounds = port === "today" ? levels : port === "loader" ? w.trips : w.trips;
    const reads = w.reads;
    // Alone: for single reads a round's reads share 3 permits; a batch is one request per round.
    const serviceWarm = port === "today" ? cpuWarm / PERMITS + rounds * RTT : cpuWarm + rounds * RTT;
    const waitsCold = port === "today" ? (loads / PERMITS) * LOAD_WAIT : Math.max(rounds, loads / PREFETCH) * LOAD_WAIT;
    const aloneWarm = serviceWarm, aloneCold = serviceWarm + (cpuCold - cpuWarm) / (port === "today" ? PERMITS : 1) + waitsCold;
    const loaded = (cpu: number, n: number) => { const cps = (CORES * UTIL) / cpu * 1000; const p50 = Math.max(n / cps * 1000, 0); return { callsPerSecond: Math.round(cps), p50: Math.round(p50), p99: Math.round(p50 * TAIL) }; };
    out.push({ shape: shape.name, port, reads: Math.round(reads * 10) / 10, requests: Math.round(w.trips * 10) / 10,
      cpuMsWarm: +cpuWarm.toFixed(2), cpuMsCold: +cpuCold.toFixed(2), loadsCold: +loads.toFixed(1),
      aloneWarmMs: +aloneWarm.toFixed(1), aloneColdMs: +aloneCold.toFixed(1),
      warm64: loaded(cpuWarm, 64), warm256: loaded(cpuWarm, 256), cold64: loaded(cpuCold, 64), cold256: loaded(cpuCold, 256) });
  }
}
console.log(JSON.stringify({ f: +f.toFixed(3), g: +g.toFixed(2), exchange: { warm: exWarm, cold: exCold }, predictions: out }, null, 2));
