// [DX-API1] Predictions at 1 billion records, written before any server run of this page, from the Mac counts and the
// unit costs measured on the server on 2026-11-23 (rd1/PINNED-1B.md; rd5/UNCACHED-READ.md section 1).
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/api1/predict.ts WARM_COUNTS COLD_COUNTS CALIBRATION
// The model (API-CALL-READS.md section 5):
//   f = 1.53 ms / the Mac's CPU for the same exchange under load (eight re-read subjects' field 0 in one pinned /read; on
//       the server 1,302.5 exchanges/s on 1.99 reader cores at 256 seats);
//   reader CPU per call, re-read subjects = the Mac's warm CPU per call at 16 callers x f;
//   random subjects: + storage loads x 0.86 ms (the 1 billion figure: 1.52 ms for 1.76 loads), loads per call = the
//       distinct subjects the call reads x 2.7 (EAVT 2.2: the measured 1.66 for one entity plus about half a leaf for a
//       whole subject's 30 to 45 entities; identity 0.11 per ID kind read), high case the Mac cold loads x 3.9 (1.76 per
//       random subject at 1 billion against 0.45 on the toy);
//   alone: today = CPU / 3 permits + one round trip (0.3 ms) per level + every load waited for (1.2 ms: 0.51 SQL + 0.69
//       decode), loader and batch = CPU (one request thread per round) + one round trip per request + one overlapped
//       load wave (1.2 ms) per level that reaches new subjects;
//   N callers on one 3-core reader: calls/s = 2.7 / CPU per call (90% of three cores), call p50 = max(alone, N / calls/s)
//       (Little's law, closed loop), p99 = 1.7 x p50 (the 1 billion windows' tail, 1.6 to 1.9); per read (today) p50 = the
//       requests in flight (N x the call's mean level width) x the read's CPU / 2.7, p99 = 1.7 x that.
import { readFileSync } from "node:fs";
import { shapes } from "./shapes.ts";

const [warmFile, coldFile, calibFile] = process.argv.slice(2);
const rows: any[] = [...JSON.parse(readFileSync(warmFile!, "utf8")), ...JSON.parse(readFileSync(coldFile!, "utf8"))];
const calib: any[] = JSON.parse(readFileSync(calibFile!, "utf8"));
const get = (shape: string, port: string, reader: string, callers: number) =>
  rows.find((r) => r.shape === shape && r.port === port && r.reader === reader && r.callers === callers);
const exWarm16 = calib.find((r) => r.reader === "warm" && r.callers === 16)!, exCold1 = calib.find((r) => r.reader === "cold" && r.callers === 1)!;
const f = 1.53 / exWarm16.cpuMsPerCall;
const toyLoadsPerSubject = exCold1.loads / 8, g = 1.76 / toyLoadsPerSubject;
const RTT = 0.3, LOAD = 1.2, PER_LOAD_CPU = 0.86, USABLE = 2.7, TAIL = 1.7;
// Distinct subjects and ID kinds each shape reads (definitions are shared and stay cached).
const reach: Record<string, { subjects: number; kinds: number }> = {
  "subject-page": { subjects: 1, kinds: 5 }, "task-page": { subjects: 1, kinds: 4 }, "subject-list": { subjects: 50, kinds: 4 },
  "form-submit": { subjects: 1, kinds: 4 }, "import-row": { subjects: 1, kinds: 3 }, "policy-eval": { subjects: 1, kinds: 3 },
  "check-webhook": { subjects: 1, kinds: 4 }, "placement-page": { subjects: 1, kinds: 4 }, "task-fields": { subjects: 1, kinds: 1 },
};
const r1 = (x: number) => Math.round(x * 10) / 10, r0 = (x: number) => Math.round(x);
const out: any[] = [];
for (const shape of shapes) {
  const levels = shape.levels.length + (shape.after?.length ?? 0);
  const { subjects, kinds } = reach[shape.name]!;
  const loadsCentral = subjects * (2.2 + 0.11 * kinds);
  for (const port of ["today", "loader", "batch1"]) {
    const w = get(shape.name, port, "warm", 16), c1 = get(shape.name, port, "cold", 1), w1 = get(shape.name, port, "warm", 1);
    if (!w || !c1 || !w1) continue;
    const reads = w1.reads, requests = w1.trips;
    const cpuWarm = w.cpuMsPerCall * f;
    const loadsHigh = Math.max(loadsCentral, (c1.loads ?? 0) * g);
    const cpuCold = cpuWarm + loadsCentral * PER_LOAD_CPU, cpuColdHigh = cpuWarm + loadsHigh * PER_LOAD_CPU;
    const waves = Math.min(levels, port === "batch1" ? Math.max(1, levels - 1) : levels);
    const aloneWarm = port === "today" ? cpuWarm / 3 + levels * RTT : cpuWarm + requests * RTT;
    const aloneCold = port === "today" ? aloneWarm + (cpuCold - cpuWarm) / 3 + loadsCentral * LOAD
      : aloneWarm + (cpuCold - cpuWarm) + Math.min(waves, Math.ceil(loadsCentral)) * LOAD;
    const loaded = (cpu: number, alone: number, n: number) => {
      const cps = (USABLE / cpu) * 1000, p50 = Math.max(alone, (n / cps) * 1000);
      return { callsPerSecond: r0(cps), p50: r0(p50), p99: r0(p50 * TAIL) };
    };
    const width = reads / levels, readCpu = cpuWarm / Math.max(1, requests);
    const perRead = (n: number, cold: boolean) => port !== "today" ? null
      : r1(Math.max(readCpu + RTT + (cold ? LOAD : 0), (n * width * (cold ? cpuCold / requests : readCpu)) / USABLE) * TAIL);
    // The Mac's own alone wall times scaled by f (they carry the client and round-trip structure; the Mac's round trip into
    // its lab VM is slower than a server's loopback, so this is the high end), the random case plus the 1 billion loads
    // the toy did not make, each waited for (today) or one wave per level (batches).
    const extra = Math.max(0, loadsCentral - (c1.loads ?? 0));
    const macAlone = { rereadP50: r1(w1.wallMsP50 * f), rereadP99: r1(w1.wallMsP99 * f),
      randomP50: r1(c1.wallMsP50 * f + (port === "today" ? extra : Math.min(levels, Math.ceil(extra))) * LOAD),
      randomP99: r1(c1.wallMsP99 * f + (port === "today" ? extra : Math.min(levels, Math.ceil(extra))) * LOAD) };
    out.push({ shape: shape.name, port, reads: r1(reads), requests: r1(requests), cpuMsReread: r1(cpuWarm), cpuMsRandom: r1(cpuCold), macAlone,
      cpuMsRandomHigh: r1(cpuColdHigh), loadsRandom: r1(loadsCentral), loadsRandomHigh: r1(loadsHigh),
      aloneMsReread: r1(aloneWarm), aloneMsRandom: r1(aloneCold),
      reread64: loaded(cpuWarm, aloneWarm, 64), reread256: loaded(cpuWarm, aloneWarm, 256),
      random64: loaded(cpuCold, aloneCold, 64), random256: loaded(cpuCold, aloneCold, 256),
      perReadP99: { alone: perRead(1, false), reread256: perRead(256, false), random256: perRead(256, true) } });
  }
}
console.log(JSON.stringify({ f: +f.toFixed(3), toyLoadsPerSubject: +toyLoadsPerSubject.toFixed(3), g: +g.toFixed(2), predictions: out }, null, 2));
