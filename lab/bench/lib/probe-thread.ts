import { Worker } from "node:worker_threads";
// [DX-H4] Why: probe HTTP/encoding/receipt work must not queue background writer offers.
// Rejected: disabling the 10-fact overlay or giving it an independent per-subject order.
export class ProbeThread {
  private worker: Worker;
  private serial = 0;
  private pending = new Map<number, any>();
  readonly ready: Promise<void>;
  constructor(cfg: any) {
    this.worker = new Worker(new URL("../probe-worker.ts", import.meta.url), {
      workerData: cfg,
      env: { ...process.env, DATOMIC_READ_URLS: process.env.DATOMIC_URL! },
    });
    let resolveReady: any, rejectReady: any;
    this.ready = new Promise((r, j) => {
      resolveReady = r;
      rejectReady = j;
    });
    this.worker.on("message", (m) => {
      if (m.ready) {
        resolveReady();
        return;
      }
      const p = this.pending.get(m.id);
      this.pending.delete(m.id);
      if (m.error) p?.reject(Error(m.error));
      else p?.resolve(m.value);
    });
    this.worker.on("error", (e) => {
      rejectReady(e);
      for (const p of this.pending.values()) p.reject(e);
    });
    this.worker.on("exit", (code) => {
      if (code)
        for (const p of this.pending.values()) p.reject(Error(`probe worker exited ${code}`));
    });
  }
  private rpc(type: string, args: any): Promise<any> {
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ type, id, ...args });
    });
  }
  transact(operations: any, meta: any) {
    return this.rpc("transact", { operations, meta });
  }
  async close() {
    await this.rpc("close", {});
    await this.worker.terminate();
  }
}
