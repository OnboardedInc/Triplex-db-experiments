import { Worker, MessageChannel } from "node:worker_threads";
import { Histogram } from "./hist.ts";
import { ReplicaReader } from "./replica-reads.ts";
import type { ReadDelta, ReadImage } from "../../../packages/datomic/dist/index.js";

// [DX-R3] Why: inline decoding, packing and whole-fact contribution preparation must not delay commit offers.
// Rejected: moving only HTTP to a worker while preparing every changed entity on the writer thread.
export class ReplicaThread {
  readonly index: ReplicaReader["index"];
  readonly replica = { bytes: 0 };
  readonly applied: { position: number; at: number }[] = [];
  private worker: Worker;
  private listeners = new Set<(delta: ReadDelta) => void>();
  private closed = false;
  private fail: Error | undefined;
  private closeReply: (() => void) | undefined;
  private constructor(cfg: any, ready: (image: ReadImage) => void, reject: (error: Error) => void) {
    this.index = new ReplicaReader(cfg.historyBytes).index;
    this.worker = new Worker(new URL("./replica-worker.ts", import.meta.url), { workerData: cfg, env: process.env });
    this.worker.on("message", m => {
      if (m.type === "ready") { this.index.install(m.image); this.replica.bytes = m.bytes; ready(m.image); }
      if (m.type === "delta") {
        this.index.apply(m.delta);
        this.replica.bytes = m.bytes;
        if (m.delta.valid) this.applied.push({ position: m.delta.position, at: m.at });
        for (const listener of this.listeners) listener(m.delta);
      }
      if (m.type === "closed") { this.closed = true; this.closeReply?.(); }
      if (m.type === "error") { this.fail = Error(m.message); reject(this.fail); this.closeReply?.(); }
    });
    this.worker.on("error", (error: Error) => { this.fail = error; reject(error); this.closeReply?.(); });
    this.worker.on("exit", code => { if (!this.closed) { this.fail ??= Error(`replica worker exited without close acknowledgement: ${code}`); reject(this.fail); this.closeReply?.(); } });
  }
  static async open(cfg: any) {
    let resolve!: (image: ReadImage) => void, reject!: (error: Error) => void;
    const ready = new Promise<ReadImage>((r, j) => { resolve = r; reject = j; });
    const thread = new ReplicaThread(cfg, resolve, reject);
    try { await ready; return thread; } catch (e) { await thread.worker.terminate(); throw e; }
  }
  connect() {
    const { port1, port2 } = new MessageChannel();
    this.worker.postMessage({ type: "connect", port: port1 }, [port1]);
    return port2;
  }
  subscribe(listener: (delta: ReadDelta) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  async close() {
    try {
      if (!this.fail) await new Promise<void>(resolve => { this.closeReply = resolve; this.worker.postMessage({ type: "close" }); });
    } finally { await this.worker.terminate(); }
    if (this.fail) throw this.fail;
  }
}

// [DX-R3] Why: follow-delay percentiles must expose ACKed positions absent from the observed applied prefix.
// Rejected: silently treating a missing or invalidated application as a zero-delay success.
export function appliedDelay(applied: readonly { position: number; at: number }[], acked: ReadonlyMap<number, { at: number }>) {
  const h = new Histogram(), seen = new Set<number>();
  for (const x of applied) {
    const ack = acked.get(x.position);
    if (ack && !seen.has(x.position)) { seen.add(x.position); h.recordMs(Math.max(0, x.at - ack.at)); }
  }
  return { ...h.summary(), acknowledgedPositions: acked.size, unappliedAcknowledgedPositions: [...acked.keys()].filter(p => !seen.has(p)) };
}
