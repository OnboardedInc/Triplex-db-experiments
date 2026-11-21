import assert from "node:assert/strict";
import { bucketHigh, type Histogram } from "../../../../bench/lib/hist.ts";
import { Rng, seedOf } from "../../../../bench/lib/rng.ts";

const draws = 10_000;
const orderStatistic = (sorted: number[], quantile: number) =>
  sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)]!;
const cumulative = (h: Histogram) => {
  let total = 0;
  return Float64Array.from(h.counts, (n) => (total += n));
};

// [DX-SCALE1] Why: a shared pause can inflate many consecutive saves, and both
// sides of a matched pair share its tape. Rejected: resampling individual ACKs.
export function pairedP99(loaded: Histogram[], alone: Histogram[], label: string) {
  const n = loaded.length;
  assert(n === alone.length && n >= 4 && n % 2 === 0);
  if ([...loaded, ...alone].some((h) => h.count === 0 || h.percentileMs(99)! <= 0)) return null;
  const cohorts = [loaded, alone].map((hs) => hs.map((h) => ({ h, cumulative: cumulative(h) })));
  const estimate = (weights: number[]) =>
    cohorts.map((rows) => {
      const total = rows.reduce((sum, { h }, i) => sum + weights[i]! * h.count, 0);
      const high = Math.max(...rows.filter((_, i) => weights[i]).map(({ h }) => h.maxUs));
      const rank = Math.ceil(total * 0.99);
      let lo = 0,
        hi = rows[0]!.cumulative.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        const included = rows.reduce((sum, row, i) => sum + weights[i]! * row.cumulative[mid]!, 0);
        if (included >= rank) hi = mid;
        else lo = mid + 1;
      }
      return Math.min(high, bucketHigh(lo)) / 1000;
    }) as [number, number];
  const full = estimate(Array<number>(n).fill(1));
  if (full[1] <= 0) return null;
  const resample = (span: 1 | 2) => {
    const seed = seedOf("paired-p99/1/" + span + "/" + label);
    const rng = new Rng(seed);
    const logs = Array.from({ length: draws }, () => {
      const weights = Array<number>(n).fill(0);
      for (let i = 0; i < n; i += span) {
        const first = Math.floor(rng.next() * n);
        for (let j = 0; j < span; j++) weights[(first + j) % n]!++;
      }
      const [num, den] = estimate(weights);
      return Math.log(num / den);
    }).sort((a, b) => a - b);
    const mean = logs.reduce((sum, x) => sum + x, 0) / draws;
    return {
      blocks: n,
      matchedPairsPerBlock: span,
      draws,
      seed,
      logSE: Math.sqrt(logs.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (draws - 1)),
      low: Math.exp(orderStatistic(logs, 0.05)),
      high: Math.exp(orderStatistic(logs, 0.95)),
      upperFamily95: Math.exp(orderStatistic(logs, 1 - 0.05 / 3)),
    };
  };
  const primary = resample(1);
  const longer = resample(2);
  const omission = loaded.map((_, missing) => {
    const [num, den] = estimate(loaded.map((_, i) => Number(i !== missing)));
    return num / den;
  });
  const threshold = 1.25 * full[1];
  const above = loaded.reduce((count, h) => {
    for (let i = 0; i < h.counts.length; i++) {
      if (Math.min(h.maxUs, bucketHigh(i)) > threshold * 1000) count += h.counts[i]!;
    }
    return count;
  }, 0);
  const contains = (x: number) => {
    const low = Math.min(primary.low, longer.low),
      high = Math.max(primary.high, longer.high);
    return x >= low && x <= high;
  };
  return {
    loadedP99: full[0],
    aloneP99: full[1],
    primary,
    longer,
    leaveOnePairOut: [Math.min(...omission), Math.max(...omission)],
    valuesPerPair: loaded.map((h, i) => [h.percentileMs(99), alone[i]!.percentileMs(99)]),
    shareAboveAloneBudget: above / loaded.reduce((count, h) => count + h.count, 0),
    compatibleWith125: contains(1.25),
    compatibleWith200: contains(2),
    discriminate: !(contains(1.25) && contains(2)),
    // Three separate endpoints are reported. This upper limit is per metric.
    upper95Within125: Math.max(primary.high, longer.high) <= 1.25,
    family95Within125: Math.max(primary.upperFamily95, longer.upperFamily95) <= 1.25,
  };
}
