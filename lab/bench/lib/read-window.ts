import { Histogram } from "./hist.ts";
import { R, type ReadRecord } from "./observe.ts";
import { VERDICTS } from "./read-judgment.ts";

export type ReadWindowBounds = { name: string; from: number; to: number };

// [DX-RD1] Why: retain the same per-window counts, histograms and exact boundary checks after each row is judged.
// Rejected: sampling the rows or reconstructing window membership from rounded timestamps.
export class ReadWindow {
  reads = 0;
  correct = 0;
  violations = 0;
  errors = 0;
  hotReads = 0;
  splitReads = 0;
  splitForced = 0;
  splitCorrect = 0;
  waited = 0;
  readonly read = new Histogram();
  readonly watermarkWait = new Histogram();
  readonly byBasis = [0, 0, 0];
  readonly routes: Record<string, number> = {};
  readonly languages: Record<string, number> = {};
  readonly buckets: Record<string, Histogram> = {};
  readonly bytesBy: Record<string, { sum: number; count: number }> = {};
  readonly goodputBySecond: { correct: number; seconds: number }[];
  readonly bounds: ReadWindowBounds;

  constructor(bounds: ReadWindowBounds) {
    this.bounds = bounds;
    const seconds = Math.max(0, (bounds.to - bounds.from) / 1000);
    this.goodputBySecond = Array.from({ length: Math.ceil(seconds) }, (_, i) => ({
      correct: 0,
      seconds: Math.min(1, seconds - i),
    }));
  }

  add(r: ReadRecord, code: number, hot: boolean, bucket: string, hops: string) {
    const end = r[R.start] + r[R.latency];
    if (this.bounds.to <= this.bounds.from || r[R.start] < this.bounds.from || end > this.bounds.to)
      return;
    const ok = VERDICTS[code]!.ok;
    this.reads++;
    if (ok) {
      this.correct++;
      this.read.recordMs(r[R.latency]);
      const bin = Math.min(
        this.goodputBySecond.length - 1,
        Math.floor((end - this.bounds.from) / 1000),
      );
      this.goodputBySecond[bin]!.correct++;
      this.recordBucket(bucket, r);
      this.recordBucket(hops, r);
    } else if (code === 1) this.errors++;
    else this.violations++;
    if (hot) this.hotReads++;
    this.byBasis[r[R.basisKind]]!++;
    this.routes[r[R.route]] = (this.routes[r[R.route]] ?? 0) + 1;
    this.languages[r[R.language]] = (this.languages[r[R.language]] ?? 0) + 1;
    if (r[R.waitedMs] > 0) this.waited++;
    this.watermarkWait.recordMs(r[R.waitedMs]);
    if (r[R.split] > 0) this.splitReads++;
    if (r[R.split] === 2) {
      this.splitForced++;
      if (ok) this.splitCorrect++;
    }
  }

  private recordBucket(key: string, r: ReadRecord) {
    (this.buckets[key] ??= new Histogram()).recordMs(r[R.latency]);
    const bytes = (this.bytesBy[key] ??= { sum: 0, count: 0 });
    bytes.sum += r[R.bytes];
    bytes.count++;
  }

  static restore(value: ReadWindow, bounds: ReadWindowBounds) {
    if (
      value.bounds.name !== bounds.name ||
      value.bounds.from !== bounds.from ||
      value.bounds.to !== bounds.to
    )
      throw Error(`Checked read window differs from scoring window ${bounds.name}`);
    const restore = (h: Histogram) => Object.assign(new Histogram(), h);
    return Object.assign(new ReadWindow(bounds), value, {
      read: restore(value.read),
      watermarkWait: restore(value.watermarkWait),
      buckets: Object.fromEntries(Object.entries(value.buckets).map(([k, h]) => [k, restore(h)])),
    });
  }
}
