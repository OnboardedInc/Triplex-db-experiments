import { Worker } from "node:worker_threads";
import type { ReadRecord } from "./observe.ts";
import { ReadRecords } from "./read-records.ts";

// [DX-R3] Why: chunk encoding and atomic disk writes must not stall the commit-issuing event loop.
// Rejected: synchronous spill on each 4096th read, or dropping observations when the disk falls behind.
export class SpillThread {
  private worker: Worker;
  private batch: ReadRecord[] = [];
  private serial = 0;
  private pending = new Map<number, { resolve(): void; reject(error: Error): void }>();
  private error: Error | undefined;
  private delivered = 0;
  length = 0;
  readonly directory: string;
  constructor(directory: string) {
    this.directory = directory;
    this.worker = new Worker(new URL("../spill-worker.ts", import.meta.url), { workerData: { directory } });
    this.worker.on("message", m => {
      if (m.type === "progress") this.delivered = m.count;
      if (m.type === "reply") { const p = this.pending.get(m.id); this.pending.delete(m.id); if (m.error) p?.reject(Error(m.error)); else p?.resolve(); }
    });
    this.worker.on("error", (error: Error) => { this.error = error; for (const p of this.pending.values()) p.reject(error); });
  }
  push(row: ReadRecord) {
    if (this.error) throw this.error;
    if (this.length - this.delivered > 200_000) throw Error("Observation spill backlog exceeded 200000 exact rows");
    this.length++;
    this.batch.push(row);
    if (this.batch.length >= 512) this.flush();
  }
  private flush() {
    if (this.batch.length) { this.worker.postMessage({ type: "rows", rows: this.batch }); this.batch = []; }
  }
  async checkpoint() {
    if (this.error) throw this.error;
    this.flush();
    const id = ++this.serial;
    await new Promise<void>((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.worker.postMessage({ type: "checkpoint", id }); });
  }
  async finish() {
    await this.checkpoint();
    await this.worker.terminate();
    return new ReadRecords(this.directory, true);
  }
}
