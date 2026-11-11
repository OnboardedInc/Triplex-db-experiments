// [DX-R3] Why: a worker-wide FIFO admits bounded batches independently of reader concurrency.
// Rejected: per-loop budgets and waking every blocked reader on one shared promise (work grows with concurrency).
export class ReaderTurn {
  private reads = 0;
  private start = performance.now();
  private queue: (() => void)[] = [];
  private head = 0;
  private scheduled = false;
  readonly diagnostics = { yields: 0, maxTurnMs: 0, maxTurnReads: 0, admissions: 0 };
  readonly maxReads: number;
  readonly maxMs: number;
  constructor(maxReads = 64, maxMs = 1) {
    this.maxReads = maxReads;
    this.maxMs = maxMs;
  }
  enter(): Promise<void> {
    this.diagnostics.admissions++;
    if (!this.scheduled && this.head === this.queue.length && this.reads < this.maxReads && performance.now() - this.start < this.maxMs) {
      this.reads++;
      return Promise.resolve();
    }
    return new Promise<void>(resolve => { this.queue.push(resolve); this.schedule(); });
  }
  private schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    this.diagnostics.yields++;
    setImmediate(() => {
      this.diagnostics.maxTurnMs = Math.max(this.diagnostics.maxTurnMs, performance.now() - this.start);
      this.diagnostics.maxTurnReads = Math.max(this.diagnostics.maxTurnReads, this.reads);
      this.start = performance.now();
      this.reads = 0;
      this.scheduled = false;
      while (this.head < this.queue.length && this.reads < this.maxReads) {
        this.reads++;
        this.queue[this.head++]!();
      }
      if (this.head === this.queue.length) { this.queue = []; this.head = 0; }
      else if (this.head > 4096) { this.queue = this.queue.slice(this.head); this.head = 0; }
      if (this.head < this.queue.length) this.schedule();
    });
  }
}
