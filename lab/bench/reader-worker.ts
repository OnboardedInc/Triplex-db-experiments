import { deepCells } from "./lib/deep-world.ts";
import { BasisWindow } from "./lib/basis-window.ts";
import { beginTrace, withTrace, finishTrace, traceSync, traceAsync, flushTracing, currentTrace, traceResource, traceLevel } from "./lib/tracing.ts";
import { describeReadError } from "./lib/read-error.ts";
import { canonicalWorld } from "./lib/canonical.ts";
import { requireDrained } from "./lib/reader-lifecycle.ts";
import { ReaderTurn } from "./lib/reader-turn.ts";
import { Histogram } from "./lib/hist.ts";
import { readerDiagnostics } from "./lib/reader-diagnostics.ts";
import { httpCounts } from "./lib/http-counts.ts";
import { ReadBatch, READ_BATCH_SIZE } from "./lib/read-batch.ts";
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
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { openComposition, type Basis, type CompositionHandle } from "./lib/composition.ts";
import { Rng, seedOf } from "./lib/rng.ts";
import { BUCKETS, HOP_SHARE, ids, subjectInCell, type Bucket, type Hop } from "./lib/world.ts";
import { observe, type ReadRecord } from "./lib/observe.ts";

export type ReaderConfig = {
  deep?: boolean;
  replicaWorldCacheBytes?: number;
  replicaPort?: import("node:worker_threads").MessagePort;
  observationPort?: import("node:worker_threads").MessagePort;
  readPath?: "gateway" | "replica";
  splitTarget?: "pending" | "mixed";
  replicaHistoryMiB?: number;
  replicaYield?: "loop" | "fair";
  traceEvery?: number;
  rawSampleLimit?: number;
  rawLocalMinimum?: number;
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

type SharedReplica = {
  index: import("../../packages/datomic/dist/index.js").RecentReads;
  subscribe(notify: () => void): () => void;
};

/** Run one reader "thread" on a message port: a worker's parentPort, or a MessageChannel port in-thread
 * (the `memory` composition keeps its store in one thread). */
export async function startReader(port: any, cfg: ReaderConfig, shared?: SharedReplica) {
  if (shared && (cfg.readPath !== "replica" || cfg.replicaImage || cfg.replicaPort))
    throw Error("A shared reader must use the live replica index");
  const nowAbs = () => performance.timeOrigin + performance.now();
  const traceEvery = cfg.traceEvery ?? 1;
  if (!Number.isSafeInteger(traceEvery) || traceEvery < 1) throw Error("Invalid reader tracing interval");
  let traceSequence = 0;
  const DAY = 86_400_000;
  const cells = cfg.deep ? deepCells(cfg.subjects) : undefined;

  let comp: CompositionHandle;
  const replica = cfg.readPath === "replica" ? new (await import("./lib/replica-reads.ts")).ReplicaReader((cfg.replicaHistoryMiB ?? 64) * 1024 ** 2, shared?.index, cfg.replicaWorldCacheBytes ?? 32 * 1024 ** 2) : undefined;
  if (replica && cfg.replicaImage) replica.install(cfg.replicaImage);
  const turn = new ReaderTurn();
  const loopDelay = monitorEventLoopDelay({ resolution: 1 });
  loopDelay.enable();
  const deltaLag = new Histogram();
  let deltas = 0;
  // [DX-T1-15] Why: the bounded ladder reads the already validated live index on its owning isolate.
  // Rejected: cloning the million-entry index beside the follower or falling back to a different basis to fit.
  const unsubscribe = shared?.subscribe(() => {
    deltas++;
    replica!.notify();
  });
  let replicaReadyResolve: (() => void) | undefined;
  const replicaReady = cfg.replicaPort ? new Promise<void>(resolve => { replicaReadyResolve = resolve; }) : Promise.resolve();
  cfg.replicaPort?.on("message", msg => {
    if (msg.type === "replica-image") { replica!.install(msg.image); replicaReadyResolve!(); }
    if (msg.type === "replica-delta") {
      deltas++; if (msg.sentAt !== undefined) deltaLag.recordMs(nowAbs() - msg.sentAt);
      replica!.apply(msg.delta);
    }
  });
  const phases = new Map<number, { reads: number; reasons: Record<string, number>; straddleWait: Histogram; rawLocalSamples: number; rawFallbackSamples: number; timeOnlyReads: number; timeOnlyLocal: number }>();
  let activeReads = 0, attemptedReads = 0, completedReads = 0;
  let readErrorCount = 0;
  const readErrors: any[] = [];
  const finalDiagnostics = () => ({ strictRecordClocks: replica?.index.strictRecordClocks, readAttempts: { attempted: attemptedReads, completed: completedReads, active: activeReads }, readErrors: { count: readErrorCount, retained: readErrors }, gateway: readerDiagnostics(), replica: replica?.diagnostics, turn: turn.diagnostics,
    phases: Object.fromEntries([...phases].map(([p, s]) => [p, { reads: s.reads, rawLocalSamples: s.rawLocalSamples, rawFallbackSamples: s.rawFallbackSamples, timeOnlyReads: s.timeOnlyReads, timeOnlyLocal: s.timeOnlyLocal, fallbackReasons: s.reasons, straddleWait: s.straddleWait.toJSON() }])) });
  let phase = -1;
  let mode = "mixed";
  let wanted = 0;
  let running = 0;
  let acked: { instant: number; position: number; txId: string; at: number }[] = [];
  const basisWindow = new BasisWindow<(typeof acked)[number]>();
  let hot: number[] = [];
  let records: ReadRecord[] = [];
  const packed = cfg.observationPort && process.env.DX_READ_BATCH_WIRE !== "tuples" ? new ReadBatch() : undefined;
  let samples: any[] = [];
  let splitEvents: any[] = [];
  let observationSerial = 0;
  const observationPending = new Map<number, () => void>();
  let credit: Promise<void> | undefined;
  let releaseCredit: (() => void) | undefined;
  let issued = 0;
  const costs = { sampled: 0, issueSamples: 0, issueMs: 0, observeMs: 0, recordMs: 0, creditWaitMs: 0, creditWaits: 0, batches: 0 };
  cfg.observationPort?.on("message", m => {
    const done = observationPending.get(m.id);
    if (!done) throw Error("Unexpected observation batch acknowledgement");
    observationPending.delete(m.id);
    if (m.buffer) packed!.recycle(m.buffer);
    done();
    releaseCredit?.();
    credit = undefined; releaseCredit = undefined;
  });
  const hasReads = () => (packed?.length ?? records.length) || samples.length || splitEvents.length;
  function sendReads() {
    if (!hasReads()) return Promise.resolve();
    if (!cfg.observationPort) { port.postMessage({ type: "reads", records, samples, splitEvents }); records = []; samples = []; splitEvents = []; return Promise.resolve(); }
    if (observationPending.size >= 2) throw Error("No observation credit");
    const id = ++observationSerial;
    const done = new Promise<void>(resolve => observationPending.set(id, resolve));
    if (packed) {
      const batch = packed.take();
      cfg.observationPort.postMessage({ id, packed: batch, samples, splitEvents }, [batch.values.buffer]);
    } else cfg.observationPort.postMessage({ id, records, samples, splitEvents });
    records = []; samples = []; splitEvents = []; costs.batches++;
    return done;
  }
  async function observationCredit() {
    // [DX-RD1] Why: credits wake on the collector's real acknowledgement, including for in-flight reads.
    // Rejected: one polling timer per blocked logical reader or unbounded structured-clone queues.
    const start = performance.now();
    costs.creditWaits++;
    while (observationPending.size >= 2) await (credit ??= new Promise<void>(resolve => { releaseCredit = resolve; }));
    costs.creditWaitMs += performance.now() - start;
  }
  function record(row: ReadRecord): void | Promise<void> {
    if ((packed?.length ?? records.length) >= READ_BATCH_SIZE) return recordAfterCredit(row);
    if (packed) packed.push(row);
    else records.push(row);
    if (cfg.observationPort && observationPending.size < 2 && (packed?.length ?? records.length) === READ_BATCH_SIZE) void sendReads();
  }
  async function recordAfterCredit(row: ReadRecord): Promise<void> {
    while ((packed?.length ?? records.length) >= READ_BATCH_SIZE) {
      if (observationPending.size < 2) { void sendReads(); break; }
      await observationCredit();
    }
    await record(row);
  }
  let rawSamples = 0;
  const rawPending = new Set<number>();
  let stopping = false;
  let tokenSeq = 0;
  const waiting = new Map<number, (msg: any) => void>();
  const ask = (msg: any, timeoutMs: number) => {
    const token = ++tokenSeq;
    // [DX-R3] Why: completed split requests must not retain 2/10-second timeout promises during fast local reads.
    // Rejected: racing a live timeout that still fires after its reply has already arrived.
    return new Promise<any>(resolve => {
      const done = (reply: any) => { clearTimeout(timer); waiting.delete(token); resolve(reply); };
      const timer = setTimeout(() => done(null), timeoutMs);
      waiting.set(token, done);
      port.postMessage({ ...msg, token });
    });
  };

  type TenantReader = {first:number;people:number;interReadMs:number;key:string};
  let tenantSeats: TenantReader[] = [];
  let tenantHot = new Map<string,number[]>();
  const tenantSamples = new Map<string,number[]>();
  const within = (s:number,a:TenantReader) => s >= a.first && s < a.first + a.people;
  function pickSubject(rng: Rng, seat?: TenantReader): { subject: number; hotPick: boolean } {
    if (seat) {
      let choices = tenantHot.get(seat.key);
      if (!choices) { choices=hot.filter(s => within(s,seat)); tenantHot.set(seat.key,choices); }
      if (choices.length && rng.next()<0.6) return {subject:choices[rng.int(choices.length)]!,hotPick:true};
      return {subject:seat.first+rng.int(seat.people),hotPick:false};
    }
    if (mode === "sample" && cfg.historySample.length) return { subject: cfg.historySample[rng.int(cfg.historySample.length)]!, hotPick: false };
    if (mode === "weighted") {
      const u = rng.next();
      const bucket: Bucket = u < BUCKETS.small.share ? "small" : u < BUCKETS.small.share + BUCKETS.medium.share ? "medium" : "large";
      const w = rng.next();
      const hop: Hop = w < HOP_SHARE[3] ? 3 : w < HOP_SHARE[3] + HOP_SHARE[4] ? 4 : 6;
      const i = cells ? cells.pick(bucket, hop, rng.next()) : subjectInCell(cfg.subjects, cfg.accounts, bucket, hop, rng.next(), rng.next(), rng.next());
      if (cells && i === null) throw Error(`Deep P4 sample cell is empty: ${bucket}/${hop}`);
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

  function readOnce(subject: number, basis: Basis, kind: number, position: number, ph: number, opts: { keepRows: boolean; sweep?: boolean; straddleSeq?: number; assignedAt?: number; hotPick?: boolean }) {
    // [DX-RD1] Why: the trace recorder can be sampled independently of the exact observation and oracle streams.
    // Rejected: sampling correctness checks or writer traces to shrink reader overhead.
    if (traceLevel === "off" || (++traceSequence % traceEvery !== 0 && !opts.keepRows))
      return readOnceTraced(subject, basis, kind, position, ph, opts);
    const trace = beginTrace("read", "reader.pull", { phase: ph, worker: cfg.worker, oracle: opts.keepRows, position });
    return withTrace(trace, () => traceAsync("reader.execute", () => readOnceTraced(subject, basis, kind, position, ph, opts))).finally(() => finishTrace(trace));
  }
  async function readOnceTraced(subject: number, basis: Basis, kind: number, position: number, ph: number, opts: { keepRows: boolean; sweep?: boolean; straddleSeq?: number; assignedAt?: number; hotPick?: boolean }) {
    activeReads++; attemptedReads++;
    const timed = (attemptedReads & 255) === 1;
    const start = nowAbs();
    const t0 = performance.now();
    const stats = phases.get(ph) ?? { reads: 0, reasons: {}, straddleWait: new Histogram(), rawLocalSamples: 0, rawFallbackSamples: 0, timeOnlyReads: 0, timeOnlyLocal: 0 };
    phases.set(ph, stats);
    const timeOnly = basis.recordedAt !== undefined && basis.recordedPosition === undefined;
    if (timeOnly) stats.timeOnlyReads++;
    let split = 0, forcedPosition = -1, straddleWaitMs = 0;
    const evidence = opts.straddleSeq === undefined ? undefined : { phase: ph, worker: cfg.worker,
      rule: cfg.splitTarget, basis: { ...basis }, route: null as string | null, subject, seq: opts.straddleSeq, assignedAt: opts.assignedAt,
      firstStepEnd: null as number | null, acknowledgedAt: null as number | null,
      position: null as number | null, secondStepStart: null as number | null, secondStepEnd: null as number | null };
    const between = opts.straddleSeq !== undefined
      ? async () => {
          split = 1;
          const step1End = nowAbs();
          if (evidence) evidence.firstStepEnd = step1End;
          const reply = await traceAsync("reader.straddle-await-ack", () => ask({ type: "straddle", seq: opts.straddleSeq }, 10_000), "driver-queue");
          straddleWaitMs = nowAbs() - step1End;
          if (evidence) { evidence.acknowledgedAt = reply?.ackAt ?? null; evidence.position = reply?.position ?? null; evidence.secondStepStart = nowAbs(); }
          if (reply && reply.position >= 0 && reply.ackAt > step1End) { split = 2; forcedPosition = reply.position; }
        }
      : undefined;
    try {
      const gateway = () => opts.sweep ? comp.sweepPull(ids.placement(subject), basis) : comp.pull(ids.placement(subject), basis, replica ? undefined : between);
      const pr = replica
        ? await replica.pullAt(ids.placement(subject), basis, gateway, between, false, position)
        : await gateway();
      if (timeOnly && pr.route === "replica") stats.timeOnlyLocal++;
      // The wait for the straddled command's ACK is the driver's scheduling, not the store's service time.
      const latency = performance.now() - t0 - straddleWaitMs;
      if (evidence) { evidence.secondStepEnd = nowAbs(); evidence.route = pr.route; }
      const observeStart = timed ? performance.now() : 0;
      const o = traceSync("reader.observe", () => observe(pr));
      if (timed) costs.observeMs += performance.now() - observeStart;
      let gatewayCanonical: string | undefined;
      if (opts.keepRows && replica) {
        const reference = await traceAsync("reader.oracle-gateway", gateway);
        gatewayCanonical = canonicalWorld(reference.triples);
        if (canonicalWorld(pr.triples) !== canonicalWorld(reference.triples)) throw Error("oracle route full-row mismatch");
        if (JSON.stringify(o) !== JSON.stringify(observe({ ...pr, observation: undefined })))
          throw Error("prepared full-row observation mismatch");
      }
      stats.reads++;
      if (opts.keepRows) { if (pr.route === "replica") { stats.rawLocalSamples++; rawSamples++; } else stats.rawFallbackSamples++; }
      if (pr.route === "fallback") { const reason = pr.replicaFallbackReason ?? (opts.keepRows ? "oracle-raw" : "gateway"); stats.reasons[reason] = (stats.reasons[reason] ?? 0) + 1; }
      if (split > 0) stats.straddleWait.recordMs(straddleWaitMs);
      const recordStart = timed ? performance.now() : 0;
      const pending = record([ph, subject, basis.recordedAt, basis.validAt, start, latency, o.stamp, o.facts, o.digest, o.bytes, pr.depth, pr.roundTrips, null, kind, position, split, forcedPosition, opts.hotPick ? 1 : 0, pr.route, pr.language, pr.waitedMs]);
      if (pending) await pending;
      if (timed) { costs.recordMs += performance.now() - recordStart; costs.sampled++; }
      if (opts.keepRows && (pr.route === "replica" || !replica || stats.rawFallbackSamples === 1))
        samples.push({ phase: ph, subject, basis, position, start, route: pr.route, fullCanonical: canonicalWorld(pr.triples), gatewayCanonical, rows: pr.triples.map((t) => [t.entityId, t.attribute, t.value, t.validFrom ?? null, (t.validTo?._tag === "Some" ? t.validTo.value : null), t.id]) });
    } catch (error: any) {
      const pending = record([ph, subject, basis.recordedAt, basis.validAt, start, performance.now() - t0, -1, 0, "", 0, 0, 0, String(error?._tag ?? error?.name ?? "Error"), kind, position, split, forcedPosition, opts.hotPick ? 1 : 0, "error", "", 0]);
      if (pending) await pending;
      const detail = { worker: cfg.worker, phase: ph, subject, basis: { ...basis }, position, start, end: nowAbs(), traceId: currentTrace()?.traceId ?? null, error: describeReadError(error) };
      readErrorCount++;
      if (readErrors.length < 16) readErrors.push(detail);
      traceResource("reader.error", detail);
    } finally { if (evidence) splitEvents.push(evidence); activeReads--; completedReads++; }
  }

  async function loop(id: number) {
    let localReads = 0;
    const rng = new Rng(seedOf(`reader:${cfg.seed}:${cfg.worker}:${id}`));
    running++;
    try {
      while (!stopping && id < wanted && acked.length > 0) {
        if (observationPending.size >= 2) await observationCredit();
        const queued = replica && cfg.replicaYield !== "loop" ? turn.enter() : undefined;
        if (queued) await queued;
        if (stopping || id >= wanted) break;
        const issueStart = (issued++ & 255) === 0 ? performance.now() : undefined;
        const readPhase = phase, seat=tenantSeats[id];
        let candidates = seat ? tenantSamples.get(seat.key) : cfg.sampleSubjects;
        if (!candidates) { candidates=cfg.sampleSubjects.filter(s=>within(s,seat!)); tenantSamples.set(seat!.key,candidates); }
        const oracle = candidates.length > 0 && rng.next() < cfg.oracleRate;
        let picked = oracle ? { subject: candidates[rng.int(candidates.length)]!, hotPick: false } : pickSubject(rng, seat);
        const [basis, kind, position] = pickBasis(rng);
        if (issueStart !== undefined) { costs.issueSamples++; costs.issueMs += performance.now() - issueStart; }
        let straddleSeq: number | undefined, assignedAt: number | undefined;
        if (!oracle && mode === "mixed" && rng.next() < cfg.splitShare) {
          const assignment = await ask({ type: "split-request", range:seat }, 2_000);
          if (assignment && assignment.subject >= 0) { picked = { subject: assignment.subject, hotPick: true }; straddleSeq = assignment.seq; assignedAt = assignment.assignedAt; }
        }
        // [DX-R3] Why: each phase owes local raw comparisons even after the global extra-sample budget is spent.
        // Rejected: charging open-clock fallbacks against the local quota (never exercises the copy).
        let keepRows = false;
        if (oracle) {
          const owesLocal = replica !== undefined && (phases.get(readPhase)?.rawLocalSamples ?? 0) < (cfg.rawLocalMinimum ?? 1);
          keepRows = (owesLocal || rawSamples < (cfg.rawSampleLimit ?? Infinity)) &&
            (!replica || (!rawPending.has(readPhase) && replica.index.resolve(basis) !== undefined));
        }
        if (keepRows) { rawPending.add(readPhase); if (!replica) rawSamples++; }
        try { await readOnce(picked.subject, basis, kind, position, readPhase, { keepRows, straddleSeq, assignedAt, hotPick: picked.hotPick }); }
        finally { if (keepRows) rawPending.delete(readPhase); }
        // [DX-SCALE1] Why: low-traffic accounts have a real reader without turning each small scope into a saturated read loop. Rejected: zero readers in active accounts or sleeping on the sentinel's comparison windows.
        const pace=seat?.interReadMs??interReadMs;
        if(pace) {const next=performance.now()+pace;while(!stopping&&id<wanted&&phase===readPhase&&performance.now()<next) await new Promise<void>(resolve=>setTimeout(resolve,Math.min(250,next-performance.now())));}
        // [DX-R3] Why: pure local promises must yield for feed deltas, stop messages and phase changes.
        // Rejected: an uninterrupted microtask chain (starves the very follower it waits for).
        if (replica) {
          if (cfg.replicaYield === "loop") {
            if (++localReads % 8 === 0) await new Promise<void>(resolve => setImmediate(resolve));
          }
        }
      }
    } finally {
      running--;
    }
  }

  let interReadMs=0;
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
    if (typeof process.threadCpuUsage === "function") {
      const cpu = process.threadCpuUsage();
      return (cpu.user + cpu.system) / 1000;
    }
    if (process.platform !== "linux") return null;
    const stat = readFileSync("/proc/thread-self/stat", "utf8");
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    return (Number(fields[11]) + Number(fields[12])) * 10;
  };
  let elu = performance.eventLoopUtilization();
  const flush = setInterval(() => {
    const next = performance.eventLoopUtilization();
    const interval = performance.eventLoopUtilization(next, elu);
    port.postMessage({ type: "elu", t: nowAbs(), elu: interval.utilization, activeMs: interval.active, idleMs: interval.idle, threadCpuMs: threadCpuMs(), httpCounts: httpCounts(), diagnostics: { gateway: readerDiagnostics(), replica: replica?.diagnostics, turn: turn.diagnostics, loopDelay: { p99Ms: loopDelay.percentile(99) / 1e6, maxMs: loopDelay.max / 1e6 }, deltas, deltaLag: deltaLag.summary() }, memory: process.memoryUsage(), running });
    elu = next;
    loopDelay.reset();
    if (hasReads() && observationPending.size < 2) {
      void sendReads();
    }
  }, 500);

  if (shared) port.once("close", () => {
    if (stopping) return;
    stopping = true;
    wanted = 0;
    for (const resolve of waiting.values()) resolve(null);
    clearInterval(flush);
    loopDelay.disable();
    unsubscribe?.();
    cfg.observationPort?.close();
    void comp?.close().catch(() => {});
  });

  port.on("message", async (msg: any) => {
    if (msg.type === "replica-delta") {
      deltas++;
      if (msg.sentAt !== undefined) deltaLag.recordMs(nowAbs() - msg.sentAt);
      replica?.apply(msg.delta);
    } else if (msg.type === "level") {
      phase = msg.phase;
      tenantSeats=msg.tenants??[];
      interReadMs=msg.interReadMs??0;
      mode = msg.mode ?? "mixed";
      setLevel(msg.readers);
    } else if (msg.type === "basis" || msg.type === "basis-delta") {
      acked = msg.type === "basis-delta" ? basisWindow.apply(msg.delta) : msg.acked;
      hot = msg.hot; tenantHot.clear();
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
            // [DX-R3] Why: sweep reads must yield to the same feed/traffic budget as live readers.
            // Rejected: a 10k-subject local microtask chain that stalls every worker message.
            if (observationPending.size >= 2) await observationCredit();
            const queued = replica && cfg.replicaYield !== "loop" ? turn.enter() : undefined;
            if (queued) await queued;
            if (stopping) break;
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
      while ((running > 0 || activeReads > 0) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
      requireDrained(running, activeReads);
      clearInterval(flush);
      loopDelay.disable();
      if (observationPending.size >= 2) await observationCredit();
      await sendReads();
      await Promise.all([...observationPending.keys()].map(id => new Promise<void>(resolve => {
        const done = observationPending.get(id)!;
        observationPending.set(id, () => { done(); resolve(); });
      })));
      cfg.observationPort?.close();
      cfg.replicaPort?.close();
      unsubscribe?.();
      const diagnostics = { ...finalDiagnostics(), costs, threadCpuMs: threadCpuMs() };
      await comp.close().catch(() => {});
      if (!shared) await flushTracing();
      port.postMessage({ type: "stopped", httpCounts: httpCounts(), diagnostics });
    }
  });

  try {
    comp = await openComposition(cfg.composition, cfg.lane, cfg.scope);
    if (stopping) { await comp.close(); return; }
    await replicaReady;
    port.postMessage({ type: "ready", memory:process.memoryUsage() });
  } catch (error: any) {
    clearInterval(flush);
    loopDelay.disable();
    unsubscribe?.();
    cfg.observationPort?.close();
    port.postMessage({ type: "error", message: String(error?.stack ?? error) });
  }

}

// [DX-T1-15] Why: the replica isolate imports the same reader loop without starting it on its own control port.
// Rejected: treating every non-main import as the dedicated reader entrypoint.
if (!isMainThread && parentPort && workerData?.readerEntrypoint === true)
  void startReader(parentPort, workerData as ReaderConfig);
