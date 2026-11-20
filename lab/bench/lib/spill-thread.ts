import { Worker, MessageChannel } from "node:worker_threads";
import type { ReadRecord } from "./observe.ts";
import { ReadRecords } from "./read-records.ts";
import { journalReceipt, type JournalEntry } from "./model-journal.ts";
import type { Receipt } from "./composition.ts";
import type { Commit } from "./model.ts";
import type { ReadWindowPlan, StreamReadConfig, StreamReadSummary } from "./stream-reads.ts";

// [DX-R3] Why: chunk encoding and atomic disk writes must not stall the commit-issuing event loop.
// Rejected: synchronous spill on each 4096th read, or dropping observations when the disk falls behind.
export class SpillThread {
  private worker: Worker;
  private batch: ReadRecord[] = [];
  private serial = 0;
  private pending = new Map<number, { resolve(value: any): void; reject(error: Error): void }>();
  private closing = false;
  private error: Error | undefined;
  private delivered = 0;
  private deliveredRows = 0;
  private readonly modelProgress = new Int32Array(new SharedArrayBuffer(4));
  private modelFrames = 0;
  private modelPeak = 0;
  readonly streaming: boolean;
  checked?: StreamReadSummary;
  length = 0;
  progress: Record<string, any> = {};
  diskBudget: Record<string, any> | undefined;
  onProgress: ((message: any) => void) | undefined;
  readonly directory: string;
  constructor(directory: string, maxBytes?: number, stream?: Omit<StreamReadConfig, "progress">) {
    this.directory = directory;
    this.streaming = Boolean(stream);
    this.worker = new Worker(new URL("./spill-worker.ts", import.meta.url), {
      workerData: { directory, maxBytes, stream: stream && { ...stream, progress: this.modelProgress } },
    });
    this.worker.on("message", m => {
      if (m.type === "progress") {
        this.delivered = m.count;
        this.deliveredRows = m.senderRows;
        this.length = Math.max(this.length, m.count);
        Object.assign(this.progress, m.phases);
        this.diskBudget = m.diskBudget;
        this.onProgress?.(m);
      }
      if (m.type === "reply") { const p = this.pending.get(m.id); this.pending.delete(m.id); if (m.error) p?.reject(Error(m.error)); else p?.resolve(m.value); }
    });
    this.worker.on("error", (error: Error) => { this.error = error; for (const p of this.pending.values()) p.reject(error); });
    this.worker.on("exit", code => {
      if (!this.closing) { this.error ??= Error(`spill worker exited unexpectedly: ${code}`); for (const p of this.pending.values()) p.reject(this.error); }
    });
  }
  private senderRows = 0;
  push(row: ReadRecord) {
    if (this.error) throw this.error;
    if (this.senderRows - this.deliveredRows > 200_000) throw Error("Observation spill backlog exceeded 200000 exact rows");
    this.senderRows++;
    this.length++;
    this.batch.push(row);
    if (this.batch.length >= 512) this.flush();
  }
  connect() {
    const { port1, port2 } = new MessageChannel();
    this.worker.postMessage({ type: "connect", port: port1 }, [port1]);
    return port2;
  }
  async beginPhase(phase: number, start: number, settleMs: number, plan?: ReadWindowPlan) {
    await this.rpc("phase", { phase, start, settleMs, plan });
  }
  private async rpc<T = void>(type: string, args: any = {}) {
    if (this.error) throw this.error;
    const id = ++this.serial;
    return new Promise<T>((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.worker.postMessage({ type, id, ...args }); });
  }
  private model(entry: JournalEntry) {
    if (this.error) throw this.error;
    const outstanding = this.modelFrames - Atomics.load(this.modelProgress, 0);
    if (outstanding >= 256) throw Error("Streaming expectation model exceeded 256 pending frames");
    this.worker.postMessage({ type: "model", entry, seq: this.modelFrames++ });
    this.modelPeak = Math.max(this.modelPeak, outstanding + 1);
  }
  bindReceipt(operations: readonly any[], receipt: Receipt, actor?: string) { this.model(journalReceipt(operations, receipt, actor)); }
  addCommit(subject: number, commit: Commit) { this.model({ kind: "commit", subject, commit }); }
  frontier(through: number, at: number, applied: readonly { position: number; at: number }[]) {
    if (!this.error) this.worker.postMessage({ type: "frontier", through, at, applied });
  }
  get modelQueue() { return { frames: this.modelFrames, peakOutstanding: this.modelPeak, capacity: 256 }; }
  private flush() {
    if (this.batch.length) { this.worker.postMessage({ type: "rows", rows: this.batch }); this.batch = []; }
  }
  async checkpoint() {
    if (this.error) throw this.error;
    this.flush();
    await this.rpc("checkpoint");
  }
  async finish(frontier?: { through: number; at: number }) {
    try {
      await this.checkpoint();
      if (this.streaming) {
        if (!frontier) throw Error("Missing terminal model frontier");
        this.checked = await this.rpc<StreamReadSummary>("seal", { ...frontier, frames: this.modelFrames });
        if (this.checked.journal.frames !== this.modelFrames || Atomics.load(this.modelProgress, 0) !== this.modelFrames ||
            this.checked.captured + new ReadRecords(this.directory, true).length !== this.delivered)
          throw Error("Terminal streaming model or observation count differs from the collector");
      }
      await this.rpc("trace-close");
    } finally { this.closing = true; await this.worker.terminate(); }
    return new ReadRecords(this.directory, true);
  }
}
