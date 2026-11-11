// [DX-R3] Why: a worker-wide budget bounds time between I/O turns independently of reader concurrency.
// Rejected: eight reads per closed loop (256 loops collectively starve feed messages and expiry timers).
export class ReaderTurn {
  private reads = 0;
  private start = performance.now();
  private pending: Promise<void> | undefined;
  readonly diagnostics = { yields: 0, maxTurnMs: 0, maxTurnReads: 0 };
  readonly maxReads: number;
  readonly maxMs: number;
  constructor(maxReads = 64, maxMs = 1) {
    this.maxReads = maxReads;
    this.maxMs = maxMs;
  }
  async enter(): Promise<void> {
    // [DX-R3] Why: recheck the shared budget after waking; many readers can share the same yield promise.
    // Rejected: releasing every waiting loop straight into another unbounded batch.
    for (;;) {
      const pause = this.checkpoint();
      if (!pause) return;
      await pause;
    }
  }
  checkpoint(): Promise<void> | undefined {
    if (this.pending) return this.pending;
    const elapsed = performance.now() - this.start;
    if (++this.reads < this.maxReads && elapsed < this.maxMs) return;
    this.diagnostics.yields++;
    this.diagnostics.maxTurnMs = Math.max(this.diagnostics.maxTurnMs, elapsed);
    this.diagnostics.maxTurnReads = Math.max(this.diagnostics.maxTurnReads, this.reads);
    this.pending = new Promise<void>(resolve => setImmediate(() => {
      this.reads = 0;
      this.start = performance.now();
      this.pending = undefined;
      resolve();
    }));
    return this.pending;
  }
}
