import { captureTraceContext, continueTrace, traceAsync } from "./tracing.ts";
import { GatewayObserver } from "./gateway-observer.ts";
import { Worker, MessageChannel, type MessagePort } from "node:worker_threads";
import { readObservation, type ReadObservation } from "./read-observation.ts";
import { Histogram } from "./hist.ts";
import { replicaEndpoint, restoreReplicaReply } from "./replica-reads.ts";
import type { Basis, PullResult, CompositionHandle } from "./composition.ts";
import type { ReaderConfig } from "../reader-worker.ts";
import { MAX_RECEIPT_CAPTURES, type ReceiptRead } from "./receipt-read.ts";

// [DX-R3] Why: all follower application and RYOW index work stays off the commit issuer, including metadata allocation.
// Rejected: a parent-side mirror that still validates/applies every changed entity and contributes GC stalls.
export class ReplicaThread {
  readonly index = { floor: 0, position: 0, historyBytes: 0, positions: 20_000, maxBytes: 0 };
  readonly replica = { bytes: 0 };
  readonly applied: { position: number; at: number; availableAt?: number; receivedAt?: number }[] = [];
  onApply?: (position: number, at: number) => void;
  readonly endpoint: string;
  private worker: Worker;
  private head: () => Promise<number>;
  private gateway: CompositionHandle["pull"];
  private gatewayObserver?: GatewayObserver;
  gatewayObserverStats: any;
  private closed = false;
  private fail: Error | undefined;
  private closeReply: (() => void) | undefined;
  private following?: { resolve(): void; reject(error: Error): void };
  private serial = 0;
  private readonly receiptProgress?: Int32Array;
  private receiptSubmitted = 0;
  private receiptPeak = 0;
  private receiptDrain?: {
    resolve(value: { retained: number; fallbackReasons: Record<string, number> }): void;
    reject(error: Error): void;
  };
  private pending = new Map<number, { root: string; basis: Basis; observation?: boolean; trace?: ReturnType<typeof captureTraceContext>; resolve(value: any): void; reject(error: Error): void }>();
  private constructor(cfg: any, comp: CompositionHandle, ready: () => void, reject: (error: Error) => void) {
    this.head = comp.currentPosition.bind(comp);
    this.gateway = comp.pull.bind(comp);
    this.endpoint = replicaEndpoint(process.env, cfg.peer);
    const receiptSpill: MessagePort | undefined = cfg.receiptSpill;
    if (receiptSpill) this.receiptProgress = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
    this.worker = new Worker(new URL("./replica-worker.ts", import.meta.url), {
      workerData: { ...cfg, sourceEndpoint: this.endpoint, receiptProgress: this.receiptProgress,
        receiptEndpoint: receiptSpill ? replicaEndpoint(process.env, "reader") : undefined },
      transferList: receiptSpill ? [receiptSpill] : [],
      // [DX-T1-15] Why: a shared reader retains the same read peer as a dedicated reader.
      // RYOW fallback still runs in the parent or its observer. SourceEndpoint separately binds the feed.
      // Rejected: silently sending logical readers to the writer's gateway in the memory trial.
      env: cfg.sharedReaderIndex ? process.env : replicaThreadEnvironment(process.env),
    });
    const failed = (error: Error) => {
      this.fail = error; reject(error); this.closeReply?.();
      this.following?.reject(error);
      this.receiptDrain?.reject(error);
      for (const p of this.pending.values()) p.reject(error);
      this.pending.clear();
    };
    this.worker.on("message", m => {
      if (m.type === "ready" || m.type === "progress") { Object.assign(this.index, m.index); this.replica.bytes = m.bytes; }
      if (m.type === "ready") ready();
      if (m.type === "following-after-images") this.following?.resolve();
      if (m.type === "progress" && m.valid) {
        this.applied.push(m.timing ?? { position: m.index.position, at: m.at });
        this.onApply?.(m.index.position, m.at);
      }
      if (m.type === "head") void this.head().then(value => this.worker.postMessage({ type: "head-reply", id: m.id, value }), error => this.worker.postMessage({ type: "head-reply", id: m.id, error: String(error) }));
      if (m.type === "reply") {
        const p = this.pending.get(m.id); this.pending.delete(m.id);
        if (m.error) p?.reject(Error(m.error));
        else if (m.fallback && p?.observation && this.gatewayObserver && p.basis.recordedPosition !== undefined)
          void continueTrace(p.trace,"worker.replica.fallback",()=>this.gatewayObserver!.observe(p.root,p.basis,m.waitedMs,m.reason)).then(p.resolve,p.reject);
        else if (m.fallback && p) void continueTrace(p.trace,"worker.replica.fallback",()=>this.gateway(p.root, p.basis)).then((value: any) => p.resolve(p.observation ? readObservation({ ...value, route: "fallback", waitedMs: m.waitedMs, replicaFallbackReason: m.reason }) : { ...value, route: "fallback", waitedMs: m.waitedMs, replicaFallbackReason: m.reason }), p.reject);
        else p?.resolve(p.observation ? m.value : restoreReplicaReply(m.value));
      }
      if (m.type === "receipt-drained") this.receiptDrain?.resolve(m.value);
      if (m.type === "closed") {
        this.closed = true;
        if (this.receiptProgress) this.gatewayObserverStats = m.gatewayObserverStats;
        this.closeReply?.();
      }
      if (m.type === "error") failed(Error(m.message));
    });
    this.worker.on("error", failed);
    this.worker.on("exit", code => { if (!this.closed) failed(this.fail ?? Error(`replica worker exited without close acknowledgement: ${code}`)); });
  }
  static async open(cfg: any, comp: CompositionHandle) {
    let resolve!: () => void, reject!: (error: Error) => void;
    const ready = new Promise<void>((r, j) => { resolve = r; reject = j; });
    const thread = new ReplicaThread(cfg, comp, resolve, reject);
    try {
      if (cfg.fallbackThread === "worker" && !cfg.receiptSpill) {
        thread.gatewayObserver = new GatewayObserver(cfg.scope, replicaEndpoint(process.env,"reader"));
        await Promise.all([ready,thread.gatewayObserver.ready]);
      } else await ready;
      return thread;
    } catch (e) { await thread.worker.terminate(); await thread.gatewayObserver?.close().catch(()=>{}); throw e; }
  }
  connect() {
    const { port1, port2 } = new MessageChannel();
    this.worker.postMessage({ type: "connect", port: port1 }, [port1]);
    return port2;
  }
  async followAfterImages(readers: number) {
    if (this.fail) throw this.fail;
    if (this.following) throw Error("Follower was already released");
    await new Promise<void>((resolve, reject) => {
      this.following = { resolve, reject };
      this.worker.postMessage({ type: "follow-after-images", readers });
    });
  }
  startSharedReader(reader: ReaderConfig, observationPort?: MessagePort) {
    const { port1, port2 } = new MessageChannel();
    const control = port1 as MessagePort & { terminate(): Promise<void> };
    const error = (cause: Error) => control.emit("error", cause);
    const exit = () => control.close();
    this.worker.on("error", error);
    this.worker.once("exit", exit);
    control.once("close", () => {
      this.worker.off("error", error);
      this.worker.off("exit", exit);
      control.emit("exit", 0);
    });
    control.terminate = async () => control.close();
    this.worker.postMessage({
      type: "start-shared-reader", control: port2, reader: { ...reader, observationPort },
    }, observationPort ? [port2, observationPort] : [port2]);
    return control;
  }
  pull(root: string, basis: Basis): Promise<PullResult> {
    if (this.fail) return Promise.reject(this.fail);
    const id = ++this.serial;
    return traceAsync("rpc.replica.pull",()=>new Promise((resolve,reject)=>{const trace=captureTraceContext();this.pending.set(id,{root,basis,trace,resolve,reject});this.worker.postMessage({type:"pull",id,root,basis,trace});}),"event-loop");
  }
  observe(root: string, basis: Basis): Promise<ReadObservation> {
    if (this.fail) return Promise.reject(this.fail);
    const id = ++this.serial;
    return traceAsync("rpc.replica.observe",()=>new Promise((resolve,reject)=>{
      const trace=captureTraceContext();this.pending.set(id,{root,basis,observation:true,trace,resolve,reject});
      this.worker.postMessage({type:"observe",id,root,basis,trace});
    }),"event-loop");
  }
  // [DX-DRV1] Why: each post owns only a receipt coordinate; capture and persistence never add sender promises.
  // Rejected: an unbounded main-thread map or skipping any scheduled receipt when its observer falls behind.
  captureReceipt(input: ReceiptRead) {
    if (this.fail) throw this.fail;
    if (!this.receiptProgress || this.receiptDrain) throw Error("Receipt capture is unavailable");
    const outstanding = this.receiptSubmitted - Atomics.load(this.receiptProgress, 0);
    if (outstanding >= MAX_RECEIPT_CAPTURES) throw Error("Receipt capture capacity exceeded");
    this.worker.postMessage({ type: "capture-receipt", id: this.receiptSubmitted + 1, input });
    this.receiptSubmitted++;
    this.receiptPeak = Math.max(this.receiptPeak, outstanding + 1);
  }
  async drainReceiptCaptures() {
    const progress = this.receiptProgress;
    if (this.fail) throw this.fail;
    if (!progress || this.receiptDrain) throw Error("Receipt capture is unavailable");
    // [DX-DRV1] Why: the legacy fallback worker already drains its submitted reads after offers end.
    // Rejected: a new 30-second deadline on exact spill acknowledgements (the ten-burst Mac attempt hit it).
    const start = performance.now();
    const value = await new Promise<{ retained: number; fallbackReasons: Record<string, number> }>((resolve, reject) => {
      this.receiptDrain = { resolve, reject };
      this.worker.postMessage({ type: "drain-receipts", count: this.receiptSubmitted });
    });
    if (value.retained !== this.receiptSubmitted || Atomics.load(progress, 0) !== this.receiptSubmitted)
      throw Error("Receipt capture acknowledgement mismatch");
    return { ...value, submitted: this.receiptSubmitted, capacity: MAX_RECEIPT_CAPTURES,
      peakOutstanding: this.receiptPeak, drainMs: performance.now() - start };
  }
  async close() {
    try {
      if (!this.fail) await new Promise<void>(resolve => { this.closeReply = resolve; this.worker.postMessage({ type: "close" }); });
    } finally {
      await this.worker.terminate();
      if (this.gatewayObserver) this.gatewayObserverStats = await this.gatewayObserver.close();
    }
    if (this.fail) throw this.fail;
  }
}

// [DX-R3] Why: follow-delay percentiles must expose ACKed positions absent from the observed applied prefix.
// Rejected: silently treating a missing or invalidated application as a zero-delay success.
export function appliedDelay(applied: readonly { position: number; at: number; availableAt?: number; receivedAt?: number }[], acked: ReadonlyMap<number, { at: number }>) {
  const h = new Histogram(), availability = new Histogram(), transport = new Histogram(), apply = new Histogram(), seen = new Set<number>();
  for (const x of applied) {
    const ack = acked.get(x.position);
    if (ack && !seen.has(x.position)) { seen.add(x.position); h.recordMs(Math.max(0, x.at - ack.at));
      if (x.availableAt !== undefined) availability.recordMs(Math.max(0, x.availableAt - ack.at));
      if (x.availableAt !== undefined && x.receivedAt !== undefined) transport.recordMs(Math.max(0, x.receivedAt - x.availableAt));
      if (x.receivedAt !== undefined) apply.recordMs(Math.max(0, x.at - x.receivedAt)); }
  }
  return { ...h.summary(), stages: { acknowledgedToAvailable: availability.summary(), availableToReceived: transport.summary(), receivedToApplied: apply.summary() }, acknowledgedPositions: acked.size, unappliedAcknowledgedPositions: [...acked.keys()].filter(p => !seen.has(p)) };
}

export function replicaThreadEnvironment(env: NodeJS.ProcessEnv) {
  return { ...env, DATOMIC_READ_URLS: env.DATOMIC_URL };
}
