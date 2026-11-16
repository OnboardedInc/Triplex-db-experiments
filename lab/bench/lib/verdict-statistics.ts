import { Histogram, bucketHigh, bucketIndex } from "./hist.ts";
import { Rng, seedOf } from "./rng.ts";

export const MIN_COMMITS = 500;
export type Estimator = "histogram" | "exact";
export interface Distribution {
  readonly n: number;
  readonly clock: string;
  readonly estimator: Estimator;
  quantile(p: number): number | null;
}
export function distribution(values: readonly number[], clock: string, estimator: Estimator = "histogram"): Distribution {
  if (values.some(x => !Number.isFinite(x) || x < 0)) throw Error("Invalid verdict latency");
  const sorted = [...values].sort((a, b) => a - b);
  const raw = (p: number) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? null;
  return { n: sorted.length, clock, estimator, quantile: raw };
}
export function histogramDistribution(h: Histogram, clock = "read/1"): Distribution {
  return { n: h.count, clock, estimator: "histogram", quantile: p => !h.count ? null : p <= 0 ? h.minUs / 1000 : p >= 1 ? h.maxUs / 1000 : h.percentileMs(p * 100) };
}
function point(d: Distribution, p: number, min = d.quantile(0), max = d.quantile(1)): number | null {
  const value = d.quantile(p);
  if (value === null || min === null || max === null) return null;
  return d.estimator === "exact" ? value : Math.min(Math.max(bucketHigh(bucketIndex(value * 1000)) / 1000, min), max);
}
function gamma(shape: number, rng: Rng): number {
  if (shape < 1) return gamma(shape + 1, rng) * Math.pow(Math.max(Number.MIN_VALUE, rng.next()), 1 / shape);
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    const x = Math.sqrt(-2 * Math.log(Math.max(Number.MIN_VALUE, rng.next()))) * Math.cos(2 * Math.PI * rng.next());
    const a = 1 + c * x;
    if (a <= 0) continue;
    const v = a ** 3, u = Math.max(Number.MIN_VALUE, rng.next());
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
const beta = (a: number, b: number, rng: Rng) => { const x = gamma(a, rng), y = gamma(b, rng); return x / (x + y); };
// [DX-T1-12] Why: an empirical bootstrap kth order statistic is Q(Beta(k,n+1-k)); conditional extremes preserve histogram clipping.
// Rejected: resample millions of read rows per replicate, or smooth the p99 and change the bar's estimator.
function bootstrapPoint(d: Distribution, p: number, rng: Rng): number | null {
  if (!d.n) return null;
  const k = Math.max(1, Math.ceil(p * d.n));
  const u = beta(k, d.n + 1 - k, rng);
  const lo = k === 1 ? u : u * beta(1, k - 1, rng);
  const hi = k === d.n ? u : u + (1 - u) * beta(d.n - k, 1, rng);
  return point(d, u, d.quantile(lo), d.quantile(hi));
}
export function percentile(d: Distribution, p: number): number | null { return point(d, p); }
export function bootstrap90(a: Distribution, p: number, label: string, b?: Distribution) {
  if (!a.n || (b && !b.n)) return null;
  const seed = seedOf(`verdict-v3:7:${label}`), rng = new Rng(seed), values: number[] = [];
  for (let i = 0; i < 512; i++) {
    const num = bootstrapPoint(a, p, rng), den = b ? bootstrapPoint(b, p, rng) : 1;
    if (num !== null && den !== null && den > 0) values.push(num / den);
  }
  if (values.length !== 512) return null;
  values.sort((x, y) => x - y);
  return { confidence: 0.9, low: values[25]!, high: values[486]!, seed, replicates: 512,
    method: "iid empirical percentile bootstrap via order-statistic ranks; ratio cohorts independent; interval reported, point estimate judged" };
}
export function commitBar(id: string, values: readonly number[], p: number, limit: number, clock: string,
  options: { minimum?: number; estimator?: Estimator; invalid?: string | null; max?: boolean } = {}) {
  const d = distribution(values, clock, options.estimator), n = d.n, minimum = options.minimum ?? MIN_COMMITS;
  const value = percentile(d, options.max ? 1 : p), invalid = options.invalid || (n < minimum ? `UNJUDGED (n<${minimum})` : null);
  const reduced = [...values].sort((a, b) => a - b).slice(0, -1);
  const withoutSlowest = percentile(distribution(reduced, clock, options.estimator), options.max ? 1 : p);
  return { id, value, bar: `<= ${limit}`, pass: invalid || value === null ? null : value <= limit,
    n, sampleUnit: "committed primary", minimum, verdictClock: clock, estimator: d.estimator,
    status: invalid ?? (value !== null && value <= limit ? "MET" : "MISS"),
    interval90: bootstrap90(d, options.max ? 1 : p, id),
    leaveSlowestOut: { n: reduced.length, value: withoutSlowest, pointPass: withoutSlowest !== null && withoutSlowest <= limit,
      judged: reduced.length >= minimum && !options.invalid } };
}
export function ratioBar(id: string, a: Distribution, b: Distribution, limit: number,
  options: { minimum?: number; invalid?: string | null } = {}) {
  if (a.clock !== b.clock) throw Error("Mixed clocks in a writer ratio");
  const num = percentile(a, 0.99), den = percentile(b, 0.99), minimum = options.minimum ?? MIN_COMMITS;
  const value = num !== null && den !== null && den > 0 ? num / den : null;
  const invalid = options.invalid || (a.n < minimum || b.n < minimum ? `UNJUDGED (n<${minimum} on one or both sides)` : null);
  // [DX-T1-12] Why: use the centre of an empirical rank so floating-point division/multiplication cannot select its neighbour.
  // Rejected: pass rank/n back through ceil(p*n), which is one rank too high for some cohort sizes.
  const withoutMaximum = (d: Distribution): Distribution => ({ ...d, n: Math.max(0, d.n - 1),
    quantile: p => d.n <= 1 ? null : d.quantile((Math.max(1, Math.ceil(p * (d.n - 1))) - 0.5) / d.n) });
  const leave = (x: Distribution, y: Distribution) => {
    const num = percentile(x, 0.99), den = percentile(y, 0.99), v = num !== null && den !== null && den > 0 ? num / den : null;
    return { value: v, pointPass: v !== null && v <= limit, judged: x.n >= minimum && y.n >= minimum && !options.invalid };
  };
  return { id, value, bar: `<= ${limit}`, pass: invalid || value === null ? null : value <= limit,
    n: a.n, denominatorN: b.n, sampleUnit: "committed primary on each side", minimum, verdictClock: a.clock,
    numeratorP99Ms: num, denominatorP99Ms: den,
    status: invalid ?? (value !== null && value <= limit ? "MET" : "MISS"), interval90: bootstrap90(a, 0.99, id, b),
    leaveSlowestOut: { numerator: leave(withoutMaximum(a), b), denominator: leave(a, withoutMaximum(b)) } };
}

// [DX-T1-12] Why: preserve observed goodput variability with one-second blocks, not synthetic per-read Bernoulli trials.
// Rejected: invent intervals from old summary-only records or assume millions of concurrent reads are independent.
export function rateBootstrap90(a: readonly { correct: number; seconds: number }[], label: string,
  b?: readonly { correct: number; seconds: number }[]) {
  if (!a.length || (b && !b.length)) return null;
  const seed = seedOf(`verdict-v3:7:rate:${label}`), rng = new Rng(seed), values: number[] = [];
  const sample = (xs: typeof a) => {
    let count = 0, seconds = 0;
    for (let j = 0; j < xs.length; j++) { const x = xs[Math.floor(rng.next() * xs.length)]!; count += x.correct; seconds += x.seconds; }
    return seconds > 0 ? count / seconds : null;
  };
  for (let i = 0; i < 512; i++) {
    const num = sample(a), den = b ? sample(b) : 1;
    if (num === null || den === null || den <= 0) return null;
    values.push(num / den);
  }
  values.sort((x, y) => x - y);
  return { confidence: 0.9, low: values[25]!, high: values[486]!, seed, replicates: 512,
    method: "one-second block empirical bootstrap; intervals reported, point estimate judged" };
}
export function requiredBarsMet(bars: readonly { pass: boolean | null; bar: string }[]) {
  const required = bars.filter(b => b.bar !== "reported");
  return required.length > 0 && required.every(b => b.pass === true);
}
