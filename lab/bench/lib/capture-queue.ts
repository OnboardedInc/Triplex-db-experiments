// [DX-R3-P9] Why: unbounded receipt fan-out exposed 112/131 failed HTTP captures under burst load.
// Rejected: moving the queue back onto commit acknowledgement, or skipping captures after overload.
export class CaptureQueue {
  private readonly lanes: Promise<void>[];
  private next = 0;
  readonly stats = { outstanding: 0, peakOutstanding: 0, active: 0, peakActive: 0 };
  constructor(limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw RangeError("Invalid capture concurrency");
    this.lanes = Array.from({ length: limit }, () => Promise.resolve());
  }
  run<T>(capture: () => Promise<T>): Promise<T> {
    const lane = this.next++ % this.lanes.length;
    this.stats.peakOutstanding = Math.max(this.stats.peakOutstanding, ++this.stats.outstanding);
    const result = this.lanes[lane]!.then(async () => {
      this.stats.peakActive = Math.max(this.stats.peakActive, ++this.stats.active);
      try { return await capture(); }
      finally { this.stats.active--; this.stats.outstanding--; }
    });
    this.lanes[lane] = result.then(() => {}, () => {});
    return result;
  }
  async drain() { await Promise.all(this.lanes); }
}
