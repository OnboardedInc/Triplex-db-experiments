import { readerDiagnostics } from "./lib/reader-diagnostics.ts";
import { httpCounts } from "./lib/http-counts.ts";
/**
 * Reader worker thread: closed-loop subject pulls at a named basis, plus the P5 sweep.
 *
 * [EXP-N01] Why worker threads: load generation must not be the bottleneck. Each worker opens its own
 * composition (its own connection pool) and reports event-loop utilization so the driver can mark a
 * level INVALID when a client thread saturates. Correctness is judged in the main thread after the run
 * against the expected-state model at the basis the driver requested; workers only observe.
 *
 * Basis (TARGETS section 2 read basis mix, RULINGS Q16): 80% at the latest acknowledged receipt (named
 * by its txId, position and instant, taken from receipts the driver observed, never from an engine
 * echo), 15% at a receipt from the last hour, 5% at the latest receipt with valid time up to 90 days back.
 * Subjects (TARGETS 1.1 P1 item 1), mode "mixed": 60% from subjects acknowledged in the last 60 s (the
 * hot set the main thread broadcasts), 40% uniform. Mode "weighted": the frozen P4 bucket x hop mix.
 * Mode "sample": uniform over the matched history sample.
 * Split reads (P1 item 2, RULINGS Q31b): `splitShare` of reads ask the main thread for a subject that has a
 * frozen-trace command queued or in flight, run the first query, wait for that command's ACK, then finish the
 * pull at the same basis. The driver adds no writes of its own for them.
 *
 * Messages in:  {type:'level', phase, readers, mode} | {type:'basis', acked[], hot[]} |
 *               {type:'split', token, subject, seq} | {type:'acked', token, position, ackAt} |
 *               {type:'sweep', phase, subjects[], basis, concurrency} | {type:'stop'}
 * Messages out: {type:'ready'} | {type:'reads', records[], samples[]} | {type:'elu', t, elu} |
 *               {type:'split-request', token} | {type:'straddle', token, seq} | {type:'sweep-done', phase, wallMs} | {type:'error', message}
 */
import { isMainThread, parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { openComposition, type Basis, type CompositionHandle } from "./lib/composition.ts";
import { Rng, seedOf } from "./lib/rng.ts";
import { BUCKETS, HOP_SHARE, ids, subjectInCell, type Bucket, type Hop } from "./lib/world.ts";
import { observe, type ReadRecord } from "./lib/observe.ts";

type ReaderConfig = {
  readPath?: "gateway" | "replica";
  rawSampleLimit?: number;
  replicaImage?: import("../../packages/datomic/dist/index.js").ReadImage;
  entityCacheBytes?: number;
  subjectShards?: number;
  lane: "xtdb" | "qlever" | "datomic";
  scope: string;
  composition: string;
  seed: string;
  worker: number;
  subjects: number;
  accounts: number;
  historySample: number[];
  sampleSubjects: number[];
  oracleRate: number;
  splitShare: number;
};

/** Run one reader "thread" on a message port: a worker's parentPort, or a MessageChannel port in-thread
 * (the `memory` composition keeps its store in one thread). */
export async function startReader(port: any, cfg: ReaderConfig) {
  const nowAbs = () => performance.timeOrigin + performance.now();
  const DAY = 86_400_000;

  let comp: CompositionHandle;
  const replica = cfg.readPath === "replica" ? new (await import("./lib/replica-reads.ts")).ReplicaReader() : undefined;
  if (replica && cfg.replicaImage) replica.install(cfg.replicaImage);
  let phase = -1;
  let mode = "mixed";
  let wanted = 0;
  let running = 0;
  let acked: { instant: number; position: number; txId: string; at: number }[] = [];
  let hot: number[] = [];
  let records: ReadRecord[] = [];
  let samples: any[] = [];
  let rawSamples = 0;
  let stopping = false;
  let tokenSeq = 0;
  const waiting = new Map<number, (msg: any) => void>();
  const ask = (msg: any, timeoutMs: number) => {
    const token = ++tokenSeq;
    const p = new Promise<any>((resolve) => waiting.set(token, resolve));
    port.postMessage({ ...msg, token });
    return Promise.race([p, new Promise<any>((r) => setTimeout(() => r(null), timeoutMs))]).finally(() => waiting.delete(token));
  };

  function pickSubject(rng: Rng): { subject: number; hotPick: boolean } {
    if (mode === "sample" && cfg.historySample.length) return { subject: cfg.historySample[rng.int(cfg.historySample.length)]!, hotPick: false };
    if (mode === "weighted") {
      const u = rng.next();
      const bucket: Bucket = u < BUCKETS.small.share ? "small" : u < BUCKETS.small.share + BUCKETS.medium.share ? "medium" : "large";
      const w = rng.next();
      const hop: Hop = w < HOP_SHARE[3] ? 3 : w < HOP_SHARE[3] + HOP_SHARE[4] ? 4 : 6;
      const i = subjectInCell(cfg.subjects, cfg.accounts, bucket, hop, rng.next(), rng.next(), rng.next());
      return { subject: i ?? rng.int(cfg.subjects), hotPick: false };
    }
    if (hot.length && rng.next() < 0.6) return { subject: hot[rng.int(hot.length)]!, hotPick: true };
    // [DX-H7] Why: give uniform reads a stable per-worker hot set instead of decoding it in every isolate.
    // Rejected: sharding hot picks (would change their distribution across recently written subjects).
    const shards = cfg.subjectShards ?? 1;
    const offset = cfg.worker < shards ? cfg.worker : 0;
    const count = Math.ceil((cfg.subjects - offset) / shards);
    return { subject: count > 0 ? offset + shards * rng.int(count) : rng.int(cfg.subjects), hotPick: false };
  }

  /** Returns [basis, kind (0 latest, 1 last hour, 2 past valid time), receipt position, txId]. */
  function pickBasis(rng: Rng): [Basis, number, number, string] {
    const latest = acked[acked.length - 1]!;
    const u = rng.next();
    const now = Math.floor(nowAbs());
    if (u < 0.8 || acked.length < 2) return [{ recordedAt: latest.instant, validAt: now }, 0, latest.position, latest.txId];
    if (u < 0.95) {
      const hourAgo = nowAbs() - 3_600_000;
      let lo = 0;
      while (lo < acked.length - 1 && acked[lo]!.at < hourAgo) lo++;
      const r = acked[lo + rng.int(acked.length - lo)]!;
      return [{ recordedAt: r.instant, validAt: now }, 1, r.position, r.txId];
    }
    return [{ recordedAt: latest.instant, validAt: now - Math.floor(rng.next() * 90 * DAY) }, 2, latest.position, latest.txId];
  }

  async function readOnce(subject: number, basis: Basis, kind: number, position: number, ph: number, opts: { keepRows: boolean; sweep?: boolean; straddleSeq?: number; hotPick?: boolean }) {
    const start = nowAbs();
    const t0 = performance.now();
    let split = 0, forcedPosition = -1, straddleWaitMs = 0;
    const between = opts.straddleSeq !== undefined
      ? async () => {
          split = 1;
          const step1End = nowAbs();
          const reply = await ask({ type: "straddle", seq: opts.straddleSeq }, 10_000);
          straddleWaitMs = nowAbs() - step1End;
          if (reply && reply.position >= 0 && reply.ackAt > step1End) { split = 2; forcedPosition = reply.position; }
        }
      : undefined;
    try {
      const gateway = () => opts.sweep ? comp.sweepPull(ids.placement(subject), basis) : comp.pull(ids.placement(subject), basis, replica ? undefined : between);
      const pr = replica
        ? opts.keepRows ? { ...await gateway(), route: "fallback" }
          : await replica.pullAt(ids.placement(subject), { ...basis, recordedPosition: position }, gateway, between)
        : await gateway();
      // The wait for the straddled command's ACK is the driver's scheduling, not the store's service time.
      const latency = performance.now() - t0 - straddleWaitMs;
      const o = observe(pr);
      records.push([ph, subject, basis.recordedAt, basis.validAt, start, latency, o.stamp, o.facts, o.digest, o.bytes, pr.depth, pr.roundTrips, null, kind, position, split, forcedPosition, opts.hotPick ? 1 : 0, pr.route, pr.language, pr.waitedMs]);
      if (opts.keepRows)
        samples.push({ phase: ph, subject, basis, position, start, rows: pr.triples.map((t) => [t.entityId, t.attribute, t.value, t.validFrom ?? null, t.validTo ?? null, t.id]) });
    } catch (error: any) {
      records.push([ph, subject, basis.recordedAt, basis.validAt, start, performance.now() - t0, -1, 0, "", 0, 0, 0, String(error?._tag ?? error?.name ?? "Error"), kind, position, split, forcedPosition, opts.hotPick ? 1 : 0, "error", "", 0]);
    }
  }

  async function loop(id: number) {
    let localReads = 0;
    const rng = new Rng(seedOf(`reader:${cfg.seed}:${cfg.worker}:${id}`));
    running++;
    try {
      while (!stopping && id < wanted && acked.length > 0) {
        const oracle = cfg.sampleSubjects.length > 0 && rng.next() < cfg.oracleRate;
        let picked = oracle ? { subject: cfg.sampleSubjects[rng.int(cfg.sampleSubjects.length)]!, hotPick: false } : pickSubject(rng);
        const [basis, kind, position] = pickBasis(rng);
        let straddleSeq: number | undefined;
        if (!oracle && mode === "mixed" && rng.next() < cfg.splitShare) {
          const assignment = await ask({ type: "split-request" }, 2_000);
          if (assignment && assignment.subject >= 0) { picked = { subject: assignment.subject, hotPick: true }; straddleSeq = assignment.seq; }
        }
        // [DX-R3] Why: the driver consumes at most its raw oracle budget; every other read still checks stamp + complete digest.
        // Rejected: retaining thousands of unused raw worlds when local reads become fast.
        const keepRows = oracle && rawSamples < (cfg.rawSampleLimit ?? Infinity);
        if (keepRows) rawSamples++;
        await readOnce(picked.subject, basis, kind, position, phase, { keepRows, straddleSeq, hotPick: picked.hotPick });
        // [DX-R3] Why: pure local promises must yield for feed deltas, stop messages and phase changes.
        // Rejected: an uninterrupted microtask chain (starves the very follower it waits for).
        if (replica && ++localReads % 8 === 0) await new Promise<void>(resolve => setImmediate(resolve));
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

  // [DX-H7] Why: Linux per-thread CPU excludes the writer and sibling reader isolates.
  // Rejected: process.cpuUsage in each worker (counts every worker repeatedly).
  const threadCpuMs = () => {
    if (process.platform !== "linux") return null;
    const stat = readFileSync("/proc/thread-self/stat", "utf8");
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    return (Number(fields[11]) + Number(fields[12])) * 10;
  };
  let elu = performance.eventLoopUtilization();
  const flush = setInterval(() => {
    const next = performance.eventLoopUtilization();
    port.postMessage({ type: "elu", t: nowAbs(), elu: performance.eventLoopUtilization(next, elu).utilization, activeMs: performance.eventLoopUtilization(next, elu).active, threadCpuMs: threadCpuMs(), httpCounts: httpCounts(), diagnostics: readerDiagnostics(), memory: process.memoryUsage(), running });
    elu = next;
    if (records.length || samples.length) {
      port.postMessage({ type: "reads", records, samples });
      records = [];
      samples = [];
    }
  }, 500);

  port.on("message", async (msg: any) => {
    if (msg.type === "replica-delta") {
      replica?.apply(msg.delta);
    } else if (msg.type === "level") {
      phase = msg.phase;
      mode = msg.mode ?? "mixed";
      setLevel(msg.readers);
    } else if (msg.type === "basis") {
      acked = msg.acked;
      hot = msg.hot;
      if (wanted > loops.size) setLevel(wanted);
    } else if (msg.type === "split" || msg.type === "acked") {
      waiting.get(msg.token)?.(msg);
    } else if (msg.type === "sweep") {
      const started = performance.now();
      let next = 0;
      const list: number[] = msg.subjects;
      await Promise.all(
        Array.from({ length: msg.concurrency }, async () => {
          while (!stopping && next < list.length) {
            const subject = list[next++]!;
            await readOnce(subject, msg.basis, 0, msg.position, msg.phase, { keepRows: false, sweep: true });
          }
        }),
      );
      port.postMessage({ type: "sweep-done", phase: msg.phase, wallMs: performance.now() - started, done: next });
    } else if (msg.type === "stop") {
      stopping = true;
      wanted = 0;
      for (const resolve of waiting.values()) resolve(null);
      const deadline = Date.now() + 30_000;
      while (running > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
      clearInterval(flush);
      port.postMessage({ type: "reads", records, samples });
      records = [];
      samples = [];
      const diagnostics = readerDiagnostics();
      await comp.close().catch(() => {});
      port.postMessage({ type: "stopped", httpCounts: httpCounts(), diagnostics });
    }
  });

  try {
    comp = await openComposition(cfg.composition, cfg.lane, cfg.scope);
    port.postMessage({ type: "ready" });
  } catch (error: any) {
    port.postMessage({ type: "error", message: String(error?.stack ?? error) });
  }

}

if (!isMainThread && parentPort) void startReader(parentPort, workerData as ReaderConfig);
