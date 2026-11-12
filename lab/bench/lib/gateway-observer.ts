import { captureTraceContext, traceAsync } from "./tracing.ts";
import { Worker } from "node:worker_threads";
import type { Basis } from "./composition.ts";
import type { ReadObservation } from "./read-observation.ts";
// [DX-R3-P9] Why: a replica miss must not move full-world decoding and canonical checking back onto the commit issuer.
// Rejected: the parent-side fallback (253 ms blocked in C), or waiting for the copy inside the commit acknowledgement.
export class GatewayObserver {
  private worker: Worker;
  private serial = 0;
  private pending = new Map<number, { resolve(value: any): void; reject(error: Error): void }>();
  private fail?: Error;
  private closing=false;
  readonly ready: Promise<void>;
  constructor(scope: string, endpoint: string) {
    this.worker = new Worker(new URL("./gateway-observer-worker.ts", import.meta.url), { workerData: { scope, endpoint } });
    let ready!: () => void, reject!: (error: Error) => void;
    this.ready = new Promise((r,j) => { ready=r; reject=j; });
    const failed = (error: Error) => { this.fail=error; reject(error); for (const p of this.pending.values()) p.reject(error); this.pending.clear(); };
    this.worker.on("message", m => {
      if (m.type === "ready") { ready(); return; }
      if (m.type === "error") { failed(Error(m.error)); return; }
      const p=this.pending.get(m.id); this.pending.delete(m.id);
      if (m.error) p?.reject(Error(m.error)); else p?.resolve(m.value);
    });
    this.worker.on("error", failed);
    this.worker.on("exit", code => { if (code || !this.closing || this.pending.size) failed(Error(`gateway observer exited ${code}`)); });
  }
  private rpc(type: string, args: any): Promise<any> {
    if (this.fail) return Promise.reject(this.fail);
    const id=++this.serial;
    return new Promise((resolve,reject) => { this.pending.set(id,{resolve,reject}); this.worker.postMessage({type,id,...args,trace:captureTraceContext()}); });
  }
  observe(root: string, basis: Basis, waitedMs: number, reason: string): Promise<ReadObservation> {
    return traceAsync("rpc.gateway-observer.observe", () => this.rpc("observe", {root,basis,waitedMs,reason}), "event-loop");
  }
  async close() {
    this.closing=true;
    try { return await this.rpc("close", {}); }
    finally { await this.worker.terminate(); }
  }
}
