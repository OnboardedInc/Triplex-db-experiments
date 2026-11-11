import { Worker, MessageChannel } from "node:worker_threads";
import { Histogram } from "./hist.ts";
import { replicaEndpoint } from "./replica-reads.ts";
import type { Basis, PullResult } from "./composition.ts";

// [DX-R3] Why: all follower application and RYOW index work stays off the commit issuer, including metadata allocation.
// Rejected: a parent-side mirror that still validates/applies every changed entity and contributes GC stalls.
export class ReplicaThread {
  readonly index = { floor: 0, position: 0, historyBytes: 0, positions: 20_000, maxBytes: 0 };
  readonly replica = { bytes: 0 };
  readonly applied: { position: number; at: number }[] = [];
  readonly endpoint: string;
  private worker: Worker;
  private closed = false;
  private fail: Error | undefined;
  private closeReply: (() => void) | undefined;
  private serial = 0;
  private pending = new Map<number, { resolve(value: PullResult): void; reject(error: Error): void }>();
  private constructor(cfg: any, ready: () => void, reject: (error: Error) => void) {
    this.endpoint = replicaEndpoint(process.env, cfg.peer);
    this.worker = new Worker(new URL("./replica-worker.ts", import.meta.url), {
      workerData: { ...cfg, sourceEndpoint: this.endpoint },
      // [DX-R3] Why: an exact receipt fallback must use W, even while the independent follower is served by R.
      // Rejected: a stale read-peer RYOW fallback; sourceEndpoint binds the follower's actual peer separately.
      env: replicaThreadEnvironment(process.env),
    });
    const failed = (error: Error) => {
      this.fail = error; reject(error); this.closeReply?.();
      for (const p of this.pending.values()) p.reject(error);
      this.pending.clear();
    };
    this.worker.on("message", m => {
      if (m.type === "ready" || m.type === "progress") { Object.assign(this.index, m.index); this.replica.bytes = m.bytes; }
      if (m.type === "ready") ready();
      if (m.type === "progress" && m.valid) this.applied.push({ position: m.index.position, at: m.at });
      if (m.type === "reply") { const p = this.pending.get(m.id); this.pending.delete(m.id); if (m.error) p?.reject(Error(m.error)); else p?.resolve(m.value); }
      if (m.type === "closed") { this.closed = true; this.closeReply?.(); }
      if (m.type === "error") failed(Error(m.message));
    });
    this.worker.on("error", failed);
    this.worker.on("exit", code => { if (!this.closed) failed(this.fail ?? Error(`replica worker exited without close acknowledgement: ${code}`)); });
  }
  static async open(cfg: any) {
    let resolve!: () => void, reject!: (error: Error) => void;
    const ready = new Promise<void>((r, j) => { resolve = r; reject = j; });
    const thread = new ReplicaThread(cfg, resolve, reject);
    try { await ready; return thread; } catch (e) { await thread.worker.terminate(); throw e; }
  }
  connect() {
    const { port1, port2 } = new MessageChannel();
    this.worker.postMessage({ type: "connect", port: port1 }, [port1]);
    return port2;
  }
  pull(root: string, basis: Basis): Promise<PullResult> {
    if (this.fail) return Promise.reject(this.fail);
    const id = ++this.serial;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.worker.postMessage({ type: "pull", id, root, basis }); });
  }
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

export function replicaThreadEnvironment(env: NodeJS.ProcessEnv) {
  return { ...env, DATOMIC_READ_URLS: env.DATOMIC_URL };
}
