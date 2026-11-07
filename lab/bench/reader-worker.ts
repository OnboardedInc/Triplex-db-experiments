/**
 * Reader worker thread: closed-loop subject pulls at a named basis, plus the P5 sweep.
 *
 * [EXP-N01] Why worker threads: the brief requires load generation not to be the bottleneck. Each
 * worker opens its own composition (its own connection pool) and reports event-loop utilization so
 * the driver can mark a level INVALID when a client thread saturates. Correctness is judged in the
 * main thread after the run, against the expected-state model; workers only observe.
 *
 * Messages in:  {type:'level', phase, readers} | {type:'basis', latest, recent[]} |
 *               {type:'sweep', phase, subjects[], basis, concurrency} | {type:'stop'}
 * Messages out: {type:'ready'} | {type:'reads', records[], samples[]} | {type:'elu', t, elu} |
 *               {type:'sweep-done', phase, wallMs} | {type:'error', message}
 * Read record: [phase, subject, R, V, startAbsMs, latencyMs, stamp, facts, digest, bytes, depth, roundTrips, errorTag]
 */
import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { openComposition, type Basis, type CompositionHandle } from "./lib/composition.ts";
import { Rng, seedOf } from "./lib/rng.ts";
import { ids } from "./lib/world.ts";
import { observe } from "./lib/observe.ts";

const cfg = workerData as {
  lane: "xtdb" | "qlever";
  scope: string;
  composition: string;
  seed: string;
  worker: number;
  subjects: number;
  panels: { depth1: number; depth3: number; depth10: number };
  sampleSubjects: number[];
  oracleRate: number;
  asOfShare: number;
};
const port = parentPort!;
const nowAbs = () => performance.timeOrigin + performance.now();

let comp: CompositionHandle;
let phase = -1;
let mode: "mixed" | "panels" = "mixed";
let panelTurn = 0;
let wanted = 0;
let running = 0;
let latest = 0;
let recent: number[] = [];
let records: any[] = [];
let samples: any[] = [];
let stopping = false;
let loopSeq = 0;

function pickSubject(rng: Rng): number {
  const panel = (r: number, n: number) => (n > 0 ? 30 * rng.int(n) + r : rng.int(cfg.subjects));
  if (mode === "panels") {
    const r = panelTurn++ % 3;
    return panel(r, [cfg.panels.depth1, cfg.panels.depth3, cfg.panels.depth10][r]!);
  }
  const u = rng.next();
  if (u < 0.1) return panel(0, cfg.panels.depth1);
  if (u < 0.2) return panel(1, cfg.panels.depth3);
  if (u < 0.3) return panel(2, cfg.panels.depth10);
  return rng.int(cfg.subjects);
}

async function readOnce(subject: number, basis: Basis, ph: number, keepRows: boolean, sweep = false) {
  const start = nowAbs();
  const t0 = performance.now();
  try {
    const pr = await (sweep ? comp.sweepPull(ids.placement(subject), basis) : comp.pull(ids.placement(subject), basis));
    const latency = performance.now() - t0;
    const o = observe(pr);
    records.push([ph, subject, basis.recordedAt, basis.validAt, start, latency, o.stamp, o.facts, o.digest, o.bytes, pr.depth, pr.roundTrips, null]);
    if (keepRows)
      samples.push({ phase: ph, subject, basis, start, rows: pr.triples.map((t) => [t.entityId, t.attribute, t.value, t.validFrom ?? null, t.validTo ?? null, t.id]) });
  } catch (error: any) {
    records.push([ph, subject, basis.recordedAt, basis.validAt, start, performance.now() - t0, -1, 0, "", 0, 0, 0, String(error?._tag ?? error?.name ?? "Error")]);
  }
}

async function loop(id: number) {
  const rng = new Rng(seedOf(`reader:${cfg.seed}:${cfg.worker}:${id}`));
  running++;
  try {
    while (!stopping && id < wanted && latest > 0) {
      const oracle = cfg.sampleSubjects.length > 0 && rng.next() < cfg.oracleRate;
      const subject = oracle ? cfg.sampleSubjects[rng.int(cfg.sampleSubjects.length)]! : pickSubject(rng);
      const asOf = recent.length > 1 && rng.next() < cfg.asOfShare;
      const recordedAt = asOf ? recent[rng.int(recent.length)]! : latest;
      await readOnce(subject, { recordedAt, validAt: Math.floor(nowAbs()) }, phase, oracle);
    }
  } finally {
    running--;
  }
}

const loops = new Set<number>();
function setLevel(n: number) {
  wanted = n;
  for (let id = 0; id < n; id++) {
    if (loops.has(id)) continue;
    loops.add(id);
    void loop(id).finally(() => loops.delete(id));
  }
}

let elu = performance.eventLoopUtilization();
const flush = setInterval(() => {
  const next = performance.eventLoopUtilization();
  port.postMessage({ type: "elu", t: nowAbs(), elu: performance.eventLoopUtilization(next, elu).utilization, running });
  elu = next;
  if (records.length || samples.length) {
    port.postMessage({ type: "reads", records, samples });
    records = [];
    samples = [];
  }
}, 500);

port.on("message", async (msg: any) => {
  if (msg.type === "level") {
    phase = msg.phase;
    mode = msg.mode ?? "mixed";
    setLevel(msg.readers);
  } else if (msg.type === "basis") {
    latest = msg.latest;
    recent = msg.recent;
    if (wanted > loops.size) setLevel(wanted);
  } else if (msg.type === "sweep") {
    const started = performance.now();
    let next = 0;
    const list: number[] = msg.subjects;
    await Promise.all(
      Array.from({ length: msg.concurrency }, async () => {
        while (!stopping && next < list.length) {
          const subject = list[next++]!;
          await readOnce(subject, msg.basis, msg.phase, false, true);
        }
      }),
    );
    port.postMessage({ type: "sweep-done", phase: msg.phase, wallMs: performance.now() - started, done: next });
  } else if (msg.type === "stop") {
    stopping = true;
    wanted = 0;
    const deadline = Date.now() + 30_000;
    while (running > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
    clearInterval(flush);
    port.postMessage({ type: "reads", records, samples });
    records = [];
    samples = [];
    await comp.close().catch(() => {});
    port.postMessage({ type: "stopped" });
  }
});

try {
  comp = await openComposition(cfg.composition, cfg.lane, cfg.scope);
  port.postMessage({ type: "ready" });
} catch (error: any) {
  port.postMessage({ type: "error", message: String(error?.stack ?? error) });
}
