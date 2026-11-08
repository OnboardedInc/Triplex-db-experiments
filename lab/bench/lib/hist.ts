/**
 * Log-linear latency histogram (HdrHistogram-style), values in microseconds.
 *
 * [EXP-N01] Why: no dependency is added to the repo. Values 0..255 us are exact; above that each power
 * of two is split into 128 linear sub-buckets, so a reported percentile is the upper edge of a bucket
 * whose width is at most 1/128 (0.79%) of its value. Range 0 .. 2^44 us (about 203 days).
 * Percentiles use the nearest-rank definition (the smallest recorded value with at least p of the
 * mass at or below it), reported as the bucket's highest equivalent value, clamped to the exact max.
 */
const SUB_BITS = 7;
const SUB = 1 << SUB_BITS; // 128
const LINEAR = SUB * 2; // 256 exact buckets
const MAX_MSB = 44;
const SIZE = LINEAR + (MAX_MSB - 8 + 1) * SUB;

const msbOf = (v: number) => (v < 2 ** 32 ? 31 - Math.clz32(v) : Math.floor(Math.log2(v)));

export function bucketIndex(us: number): number {
  const v = Math.max(0, Math.floor(us));
  if (v < LINEAR) return v;
  const msb = Math.min(msbOf(v), MAX_MSB);
  const shift = msb - SUB_BITS;
  const sub = Math.min(Math.floor(v / 2 ** shift), 2 * SUB - 1); // in [128, 255]
  return LINEAR + (msb - 8) * SUB + (sub - SUB);
}

/** Highest value (us) that maps to the bucket. */
export function bucketHigh(index: number): number {
  if (index < LINEAR) return index;
  const k = index - LINEAR;
  const msb = 8 + Math.floor(k / SUB);
  const sub = SUB + (k % SUB);
  const shift = msb - SUB_BITS;
  return (sub + 1) * 2 ** shift - 1;
}

export interface HistogramSummary {
  count: number;
  minMs: number | null;
  maxMs: number | null;
  meanMs: number | null;
  p50Ms: number | null;
  p90Ms: number | null;
  p99Ms: number | null;
  p999Ms: number | null;
}

export class Histogram {
  counts = new Float64Array(SIZE);
  count = 0;
  sumUs = 0;
  minUs = Infinity;
  maxUs = -Infinity;

  recordUs(us: number): void {
    const v = Math.max(0, us);
    this.counts[bucketIndex(v)]++;
    this.count++;
    this.sumUs += v;
    if (v < this.minUs) this.minUs = v;
    if (v > this.maxUs) this.maxUs = v;
  }
  recordMs(ms: number): void {
    this.recordUs(ms * 1000);
  }
  merge(other: Histogram): this {
    for (let i = 0; i < SIZE; i++) if (other.counts[i]) this.counts[i] += other.counts[i];
    this.count += other.count;
    this.sumUs += other.sumUs;
    this.minUs = Math.min(this.minUs, other.minUs);
    this.maxUs = Math.max(this.maxUs, other.maxUs);
    return this;
  }
  /** Nearest-rank percentile in microseconds (p in [0, 100]). */
  percentileUs(p: number): number | null {
    if (this.count === 0) return null;
    const rank = Math.max(1, Math.ceil((p / 100) * this.count));
    let seen = 0;
    for (let i = 0; i < SIZE; i++) {
      seen += this.counts[i]!;
      if (seen >= rank) return Math.min(Math.max(bucketHigh(i), this.minUs), this.maxUs);
    }
    return this.maxUs;
  }
  percentileMs(p: number): number | null {
    const us = this.percentileUs(p);
    return us === null ? null : us / 1000;
  }
  summary(): HistogramSummary {
    const r = (v: number | null) => (v === null ? null : Math.round(v * 1000) / 1000);
    return {
      count: this.count,
      minMs: this.count ? r(this.minUs / 1000) : null,
      maxMs: this.count ? r(this.maxUs / 1000) : null,
      meanMs: this.count ? r(this.sumUs / this.count / 1000) : null,
      p50Ms: r(this.percentileMs(50)),
      p90Ms: r(this.percentileMs(90)),
      p99Ms: r(this.percentileMs(99)),
      p999Ms: r(this.percentileMs(99.9)),
    };
  }
  /** Sparse serialization: summary plus [bucketIndex, count] pairs, so receipts can be re-merged. */
  toJSON() {
    const buckets: [number, number][] = [];
    for (let i = 0; i < SIZE; i++) if (this.counts[i]) buckets.push([i, this.counts[i]!]);
    return { format: "tx2-loglinear-hist/1", unit: "us", subBucketBits: SUB_BITS, ...this.summary(), sumUs: this.sumUs, buckets };
  }
  static fromJSON(json: { buckets: [number, number][]; sumUs: number; minMs: number | null; maxMs: number | null }): Histogram {
    const h = new Histogram();
    for (const [i, c] of json.buckets) {
      h.counts[i] = c;
      h.count += c;
    }
    h.sumUs = json.sumUs;
    h.minUs = json.minMs === null ? Infinity : json.minMs * 1000;
    h.maxUs = json.maxMs === null ? -Infinity : json.maxMs * 1000;
    return h;
  }
}
