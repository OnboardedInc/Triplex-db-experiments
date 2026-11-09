/**
 * PAIR-0 statistics: paired rounds, pooled-quantile ratios, the window gate and the round planner.
 *
 * [EXP-M01] Why (R22 sections 2, 4.2, 7, 8; RULINGS Q60a, Q60b, Q60d, Q60e): on this host single runs of the same
 * thing moved 2x to 3x, and only simultaneous pairing shares the host's slow noise (R22 section 1: concurrent 5 s
 * window medians correlate 0.985, 60 s apart 0.08). So a comparison is a set of paired rounds (blocks); both arms
 * of a round see the same trace window at the same time, and only whole rounds are independent. Every statistic
 * here resamples or permutes whole rounds, never single commands.
 *
 * Conventions:
 * - Arm A is the baseline (A0), arm B the candidate. ratio r = q_A / q_B: r > 1 means the candidate is faster.
 * - A quantile is the nearest-rank percentile of the arm's histograms merged over the chosen rounds, computed
 *   exactly as `Histogram.merge(...).percentileUs(q * 100)` so a reader can recompute every number from the
 *   receipt's histograms with lib/hist.ts alone (tested).
 * - Censoring (Q60d): `all` holds every offered command; expired, failed and rejected ones are recorded at their
 *   censor time, which is a lower bound on a latency that never happened. `censored` holds that subset. A quantile
 *   is IDENTIFIED when it lands in the same bucket whether the censored values are taken at their censor time or
 *   at +infinity; otherwise it is only a lower bound and no ratio or interval is reported for it.
 * - Interval: percentile bootstrap over rounds (R22 section 8 sketch), `at(p) = sorted[floor(p * n)]`. The
 *   percentile bootstrap is too narrow at small round counts (Hesterberg 2015), hence `minBlocks = 8` and the A/A
 *   procedure check `aaFalsePositiveRate`, which measures this procedure's false-positive rate on the window's own
 *   rounds.
 * Rejected: per-command bootstrap (commands inside a round share the round's noise, so it is anti-conservative);
 * the mean of per-round p99 (about 130 commands per round makes it the second-largest value, R22 section 2).
 */
import { Histogram, bucketHigh } from "./hist.ts";
import { Rng } from "./rng.ts";

/** One arm in one round. */
export interface ArmRound {
  /** Every offered command; censored ones at their censor time. */
  readonly all: Histogram;
  /** The censored subset of `all` (lower bounds). Absent or empty = nothing censored. */
  readonly censored?: Histogram | null;
}
export interface PairBlock {
  readonly id: string;
  /** "aa": both arms run the same configuration (A/A control); "ab": baseline versus candidate. */
  readonly kind?: "aa" | "ab";
  readonly a: ArmRound;
  readonly b: ArmRound;
  /** Rule ids that excluded this round. Set only by pre-registered noise rules, never by looking at latency. */
  readonly excluded?: readonly string[] | null;
}

export const usable = (blocks: readonly PairBlock[]) => blocks.filter((b) => !(b.excluded && b.excluded.length) && b.a.all.count > 0 && b.b.all.count > 0);

// ---------------------------------------------------------------- compact pooled quantiles

/**
 * Dense per-round counts over the union of occupied buckets, so a bootstrap resample is a weighted sum of a few
 * hundred numbers instead of a merge of 4,992-bucket histograms. Results are identical to Histogram.merge.
 */
interface CompactArm { all: Float64Array; cens: Float64Array | null; count: number; censCount: number; minUs: number; maxUs: number }
interface Compact { buckets: Int32Array; a: CompactArm[]; b: CompactArm[]; anyCensored: boolean }

function compact(blocks: readonly PairBlock[]): Compact {
  const occupied = new Set<number>();
  const visit = (h: Histogram | null | undefined) => { if (h) for (let i = 0; i < h.counts.length; i++) if (h.counts[i]) occupied.add(i); };
  for (const b of blocks) { visit(b.a.all); visit(b.b.all); }
  const buckets = Int32Array.from([...occupied].sort((x, y) => x - y));
  const pos = new Map<number, number>();
  buckets.forEach((idx, k) => pos.set(idx, k));
  let anyCensored = false;
  const arm = (r: ArmRound): CompactArm => {
    const all = new Float64Array(buckets.length);
    for (let i = 0; i < r.all.counts.length; i++) if (r.all.counts[i]) all[pos.get(i)!] = r.all.counts[i]!;
    let cens: Float64Array | null = null;
    const c = r.censored;
    if (c && c.count > 0) {
      anyCensored = true;
      cens = new Float64Array(buckets.length);
      for (let i = 0; i < c.counts.length; i++) if (c.counts[i]) {
        const k = pos.get(i);
        if (k === undefined) throw new Error("censored histogram has a value that `all` does not hold (censored must be a subset of all)");
        cens[k] = c.counts[i]!;
      }
    }
    return { all, cens, count: r.all.count, censCount: c?.count ?? 0, minUs: r.all.minUs, maxUs: r.all.maxUs };
  };
  return { buckets, a: blocks.map((b) => arm(b.a)), b: blocks.map((b) => arm(b.b)), anyCensored };
}

export interface PooledQuantile {
  /** The quantile with censored values at their censor time (a lower bound when not identified). */
  readonly us: number;
  readonly identified: boolean;
  readonly count: number;
  readonly censored: number;
}

/** Same rank rule as Histogram.percentileUs (nearest rank), written the same way so results are bit-identical. */
const rankOf = (q: number, total: number) => Math.max(1, Math.ceil((((q * 100) / 100)) * total));

/** Pooled quantiles for one arm over rounds with multiplicities `w` (bootstrap weights; 1 = once). */
function pooled(c: Compact, arms: CompactArm[], w: Float64Array, qs: readonly number[], scratch: Float64Array, scratchC: Float64Array): PooledQuantile[] {
  const n = c.buckets.length;
  scratch.fill(0, 0, n);
  let total = 0, censTotal = 0, minUs = Infinity, maxUs = -Infinity;
  let withCens = false;
  for (let r = 0; r < arms.length; r++) {
    const k = w[r]!;
    if (!k) continue;
    const a = arms[r]!;
    const src = a.all;
    for (let i = 0; i < n; i++) if (src[i]) scratch[i] += k * src[i]!;
    total += k * a.count;
    if (a.cens) {
      if (!withCens) { scratchC.fill(0, 0, n); withCens = true; }
      const cs = a.cens;
      for (let i = 0; i < n; i++) if (cs[i]) scratchC[i] += k * cs[i]!;
      censTotal += k * a.censCount;
    }
    if (a.minUs < minUs) minUs = a.minUs;
    if (a.maxUs > maxUs) maxUs = a.maxUs;
  }
  return qs.map((q) => {
    if (total === 0) return { us: NaN, identified: false, count: 0, censored: 0 };
    const rank = rankOf(q, total);
    let seen = 0, j = n - 1;
    for (let i = 0; i < n; i++) { seen += scratch[i]!; if (seen >= rank) { j = i; break; } }
    const us = Math.min(Math.max(bucketHigh(c.buckets[j]!), minUs), maxUs);
    let identified = true;
    if (withCens && censTotal > 0) {
      // Worst case: every censored value is +infinity. Identified iff uncensored mass alone reaches the rank by bucket j.
      let unc = 0;
      for (let i = 0; i <= j; i++) unc += scratch[i]! - scratchC[i]!;
      identified = unc >= rank;
    }
    return { us, identified, count: total, censored: censTotal };
  });
}

/** Pooled quantile of one arm over the given rounds (all once). Exposed for tests and per-round summaries. */
export function pooledQuantiles(blocks: readonly PairBlock[], arm: "a" | "b", qs: readonly number[]): PooledQuantile[] {
  const c = compact(blocks);
  const w = new Float64Array(blocks.length).fill(1);
  return pooled(c, arm === "a" ? c.a : c.b, w, qs, new Float64Array(c.buckets.length), new Float64Array(c.buckets.length));
}

// ---------------------------------------------------------------- paired ratio with a cluster bootstrap

export interface RatioCI {
  readonly q: number;
  /** q_A / q_B over all usable rounds (null when not identified). */
  readonly ratio: number | null;
  readonly lo: number | null;
  readonly hi: number | null;
  /** Half-width factor sqrt(hi / lo): the ratio is known to within x/÷ mdr. */
  readonly mdr: number | null;
  readonly blocks: number;
  readonly level: number;
  readonly boots: number;
  readonly seed: number;
  readonly aUs: number | null;
  readonly bUs: number | null;
  readonly countA: number;
  readonly countB: number;
  readonly censoredA: number;
  readonly censoredB: number;
  /** Why lo/hi are null, if they are. */
  readonly why?: string;
}
export interface RatioOptions { boots?: number; level?: number; seed?: number; minBlocks?: number }

/**
 * Pooled-quantile ratios A/B for several quantiles, sharing one set of round resamples (R22 section 8).
 * Never throws for data reasons: a result with null lo/hi carries `why`.
 */
export function pairedRatios(blocksIn: readonly PairBlock[], qs: readonly number[], opts: RatioOptions = {}): RatioCI[] {
  const { boots = 2000, level = 0.95, seed = 1, minBlocks = 8 } = opts;
  const blocks = usable(blocksIn);
  const m = blocks.length;
  const c = compact(blocks);
  const n = c.buckets.length;
  const sA = new Float64Array(n), sAC = new Float64Array(n), sB = new Float64Array(n), sBC = new Float64Array(n);
  const ones = new Float64Array(m).fill(1);
  const pa = m ? pooled(c, c.a, ones, qs, sA, sAC) : qs.map(() => ({ us: NaN, identified: false, count: 0, censored: 0 }));
  const pb = m ? pooled(c, c.b, ones, qs, sB, sBC) : qs.map(() => ({ us: NaN, identified: false, count: 0, censored: 0 }));
  const base = qs.map((q, k) => ({
    q, blocks: m, level, boots, seed,
    aUs: m && pa[k]!.identified ? pa[k]!.us : null, bUs: m && pb[k]!.identified ? pb[k]!.us : null,
    countA: pa[k]!.count, countB: pb[k]!.count, censoredA: pa[k]!.censored, censoredB: pb[k]!.censored,
    ratio: m && pa[k]!.identified && pb[k]!.identified ? pa[k]!.us / pb[k]!.us : null,
  }));
  if (m < minBlocks) return base.map((r) => ({ ...r, lo: null, hi: null, mdr: null, why: `${m} usable rounds, fewer than minBlocks ${minBlocks}` }));
  const logs = qs.map(() => new Float64Array(boots));
  const unidentified = qs.map(() => 0);
  const rng = new Rng(seed);
  const w = new Float64Array(m);
  for (let t = 0; t < boots; t++) {
    w.fill(0);
    for (let i = 0; i < m; i++) w[rng.int(m)]++;
    const ra = pooled(c, c.a, w, qs, sA, sAC), rb = pooled(c, c.b, w, qs, sB, sBC);
    for (let k = 0; k < qs.length; k++) {
      if (!ra[k]!.identified || !rb[k]!.identified) unidentified[k]++;
      logs[k]![t] = Math.log(ra[k]!.us / rb[k]!.us);
    }
  }
  return base.map((r, k) => {
    if (r.ratio === null) return { ...r, lo: null, hi: null, mdr: null, why: `quantile ${r.q} not identified: censored values reach it (A ${r.censoredA} censored of ${r.countA}, B ${r.censoredB} of ${r.countB})` };
    if (unidentified[k]) return { ...r, lo: null, hi: null, mdr: null, why: `quantile ${r.q} not identified in ${unidentified[k]} of ${boots} resamples (censoring)` };
    const sorted = Array.from(logs[k]!).sort((x, y) => x - y);
    const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))]!;
    const lo = Math.exp(at((1 - level) / 2)), hi = Math.exp(at(1 - (1 - level) / 2));
    return { ...r, lo, hi, mdr: Math.sqrt(hi / lo) };
  });
}

/** One quantile; R22 section 8's `pairedQuantileRatio` with censoring and a `why` instead of null. */
export function pairedQuantileRatio(blocks: readonly PairBlock[], q: number, opts: RatioOptions = {}): RatioCI {
  return pairedRatios(blocks, [q], opts)[0]!;
}

// ---------------------------------------------------------------- per-round log ratios, s_d, slot bias, sign flip

export interface RoundRatio { id: string; kind?: string; aUs: number | null; bUs: number | null; d: number | null; why?: string }

/** d_k = ln(q_A,k / q_B,k) per usable round (R22 section 4.2); null where a quantile is not identified. */
export function roundLogRatios(blocks: readonly PairBlock[], q: number): RoundRatio[] {
  return usable(blocks).map((b) => {
    const [a] = pooledQuantiles([b], "a", [q]);
    const [bb] = pooledQuantiles([b], "b", [q]);
    if (!a!.identified || !bb!.identified) return { id: b.id, kind: b.kind, aUs: a!.identified ? a!.us : null, bUs: bb!.identified ? bb!.us : null, d: null, why: "censored" };
    return { id: b.id, kind: b.kind, aUs: a!.us, bUs: bb!.us, d: Math.log(a!.us / bb!.us) };
  });
}

export const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
/** Sample standard deviation (n - 1); NaN below 2 values. */
export function sd(xs: readonly number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Two-sided 97.5% Student t quantiles, df 1..30 (standard table); Cornish-Fisher above. */
const T975 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
export function t975(df: number): number {
  if (df < 1) return NaN;
  if (df <= 30) return T975[df - 1]!;
  const z = 1.959964;
  return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df);
}

export interface SlotBias { n: number; meanLog: number | null; sdLog: number | null; lo: number | null; hi: number | null; ratio: number | null; ratioLo: number | null; ratioHi: number | null; excludesZero: boolean | null }
/**
 * Slot bias from A/A rounds (R22 section 4.2): the mean of d_k with a 95% t interval. If the interval excludes 0
 * the two slots differ systematically: swap roles with a restart or correct for it.
 */
export function slotBias(d: readonly number[]): SlotBias {
  const n = d.length;
  if (n < 2) return { n, meanLog: n ? d[0]! : null, sdLog: null, lo: null, hi: null, ratio: n ? Math.exp(d[0]!) : null, ratioLo: null, ratioHi: null, excludesZero: null };
  const m = mean(d), s = sd(d), h = t975(n - 1) * s / Math.sqrt(n);
  return { n, meanLog: m, sdLog: s, lo: m - h, hi: m + h, ratio: Math.exp(m), ratioLo: Math.exp(m - h), ratioHi: Math.exp(m + h), excludesZero: m - h > 0 || m + h < 0 };
}

/**
 * Sign-flip test on per-round log ratios: exact over all 2^m sign patterns for m <= 16, seeded Monte Carlo above
 * (R22 section 8). Under "no difference" (and exchangeable arms inside a round) every d_k is symmetric about 0.
 * In a duet the arms' roles are fixed per container, so slot bias also counts as a difference: for A/A rounds this
 * is a test of "the two slots are the same".
 */
export function signFlipP(d: readonly number[], { seed = 7, mc = 20000 } = {}): number | null {
  const m = d.length;
  if (!m) return null;
  const obs = Math.abs(mean(d));
  const rng = new Rng(seed), exact = m <= 16, n = exact ? 1 << m : mc;
  let ge = 0;
  for (let t = 0; t < n; t++) {
    let s = 0;
    for (let i = 0; i < m; i++) s += (exact ? (t >> i) & 1 : rng.int(2)) ? d[i]! : -d[i]!;
    if (Math.abs(s / m) >= obs - 1e-12) ge++;
  }
  return ge / n;
}

/**
 * The A/A procedure check: how often would this bootstrap interval exclude 1 on this window's own rounds if the
 * arms were exchangeable? Each trial swaps A and B in a random subset of rounds (which removes any slot bias and
 * keeps the round-level noise), runs the full cluster bootstrap and counts an exclusion of 1 as a false positive.
 * R22's simulation found 5 to 15% at 8 rounds and 6 to 11% at 12; this measures it instead of assuming it.
 */
export function aaFalsePositiveRate(blocksIn: readonly PairBlock[], q: number, { trials = 200, boots = 500, level = 0.95, seed = 11, minBlocks = 8 } = {}) {
  const blocks = usable(blocksIn);
  if (blocks.length < minBlocks) return { q, trials: 0, falsePositives: 0, rate: null, mcSe: null, why: `${blocks.length} usable rounds, fewer than ${minBlocks}` };
  const rng = new Rng(seed);
  let fp = 0, done = 0, skipped = 0;
  for (let t = 0; t < trials; t++) {
    const swapped = blocks.map((b) => (rng.int(2) ? { ...b, a: b.b, b: b.a } : b));
    const ci = pairedQuantileRatio(swapped, q, { boots, level, seed: seed * 1000 + t, minBlocks });
    if (ci.lo === null || ci.hi === null) { skipped++; continue; }
    done++;
    if (ci.lo > 1 || ci.hi < 1) fp++;
  }
  const rate = done ? fp / done : null;
  return { q, trials: done, skipped, falsePositives: fp, rate, mcSe: rate === null ? null : Math.sqrt((rate * (1 - rate)) / done), boots, level };
}

// ---------------------------------------------------------------- decisions

export type Claim = { readonly kind: "superiority"; readonly target: number } | { readonly kind: "hold"; readonly margin: number };
export type Verdict =
  | "FASTER_BY_TARGET" | "FASTER" | "SLOWER" | "EQUIVALENT_WITHIN_TARGET" | "HOLDS_WITHIN_MARGIN"
  | "INCONCLUSIVE_NEED_MORE_ROUNDS" | "INCONCLUSIVE_TOO_NOISY" | "NOT_ESTIMABLE";
export const DECISIVE: readonly Verdict[] = ["FASTER_BY_TARGET", "FASTER", "SLOWER", "EQUIVALENT_WITHIN_TARGET", "HOLDS_WITHIN_MARGIN"];

/**
 * R22 section 7 verdicts on a ratio interval (A/B, so > 1 = candidate faster).
 * Superiority (Q60b): lower bound >= target. Hold (Q60b): upper bound of B/A <= margin, i.e. lo(A/B) >= 1 / margin.
 * Too noisy: R22's sketch multiplied mdr by sqrt(blocks / maxBlocks); the half-width shrinks in LOG space, so the
 * projection here is exp(ln(mdr) * sqrt(blocks / maxBlocks)). If even at maxBlocks the interval would be wider than
 * the target (or margin), more rounds cannot decide: INCONCLUSIVE_TOO_NOISY.
 */
export function decide(ci: RatioCI, claim: Claim = { kind: "superiority", target: 1.25 }, maxBlocks = 24): Verdict {
  if (ci.ratio === null) return "NOT_ESTIMABLE";
  if (ci.lo === null || ci.hi === null || ci.mdr === null) return ci.why?.includes("not identified") ? "NOT_ESTIMABLE" : "INCONCLUSIVE_NEED_MORE_ROUNDS";
  const bound = claim.kind === "superiority" ? claim.target : claim.margin;
  if (claim.kind === "superiority") {
    if (ci.lo >= claim.target) return "FASTER_BY_TARGET";
    if (ci.lo > 1) return "FASTER";
    if (ci.hi < 1) return "SLOWER";
    if (ci.lo > 1 / claim.target && ci.hi < claim.target) return "EQUIVALENT_WITHIN_TARGET";
  } else {
    if (1 / ci.lo <= claim.margin) return "HOLDS_WITHIN_MARGIN";
    if (ci.hi < 1 / claim.margin) return "SLOWER";
  }
  const projected = Math.exp(Math.log(ci.mdr) * Math.sqrt(ci.blocks / maxBlocks));
  return ci.blocks >= maxBlocks || projected >= bound ? "INCONCLUSIVE_TOO_NOISY" : "INCONCLUSIVE_NEED_MORE_ROUNDS";
}

// ---------------------------------------------------------------- planner and window gate

/** Inverse standard normal CDF (Acklam's rational approximation, |error| < 1.2e-9). */
export function zOf(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p <= 0 || p >= 1) return NaN;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1); }
  if (p > 1 - lo) return -zOf(1 - p);
  const q = p - 0.5, r = q * q;
  return ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

/** R22 section 2 planning formula K = ((z_(1-alpha/2) + z_power) * s_d / ln R)^2, rounded up. */
export function roundsNeeded({ sd, ratio, power = 0.8, level = 0.95 }: { sd: number; ratio: number; power?: number; level?: number }): number {
  const z = zOf(1 - (1 - level) / 2) + zOf(power);
  return Math.ceil(((z * sd) / Math.log(ratio)) ** 2);
}
/** The largest s_d at which `rounds` rounds resolve `ratio` (the inverse of roundsNeeded; R22 section 4.2 table). */
export function sdLimit({ ratio, rounds, power = 0.8, level = 0.95 }: { ratio: number; rounds: number; power?: number; level?: number }): number {
  return (Math.log(ratio) * Math.sqrt(rounds)) / (zOf(1 - (1 - level) / 2) + zOf(power));
}
/** Power planner: rounds to plan for a claim at a measured (or assumed) s_d, clamped to the protocol's budget. */
export function planRounds({ sd, ratio, minRounds = 8, maxRounds = 24, power = 0.8, level = 0.95 }: { sd: number; ratio: number; minRounds?: number; maxRounds?: number; power?: number; level?: number }) {
  const needed = roundsNeeded({ sd, ratio, power, level });
  return { sd, ratio, power, level, needed, rounds: Math.min(maxRounds, Math.max(minRounds, needed)), feasible: needed <= maxRounds, sdLimitAtMin: sdLimit({ ratio, rounds: minRounds, power, level }), sdLimitAtMax: sdLimit({ ratio, rounds: maxRounds, power, level }) };
}

export type Grade = "GREEN" | "AMBER" | "RED" | "INVALID" | "UNGRADED";
export interface GradeInput {
  /** s_d of per-round log p50 ratios over the A/A rounds the grade is based on. */
  readonly sdP50: number | null;
  readonly sdRounds: number;
  /** Where s_d came from ("aa" rounds, or "all" rounds of an A/B run, which also holds effect variance). */
  readonly sdSource: "aa" | "all" | "preflight";
  readonly rounds: number;
  readonly excluded: number;
  readonly amberRounds: number;
  readonly partitioned: boolean;
  readonly target?: number;
  readonly defaultRounds?: number;
  readonly maxRounds?: number;
  readonly maxExcludedShare?: number;
  readonly preflightSafety?: number;
}
/**
 * Window grade (R22 section 4.2; Q60e). INVALID: more than a third of rounds excluded by pre-registered rules.
 * RED: s_d above the limit at which `target` (1.25) resolves within maxRounds (24): 0.39. AMBER: above the
 * default-rounds (12) limit, 0.28, or any usable round carried a soft (amber) signal, or the VM is not partitioned
 * (R22 section 3: a neighbour shares an arm's vCPUs, so the "neighbor CPU" rule, hard only after partition, could
 * not be applied). GREEN otherwise. Absolute bars are judged only in GREEN windows; paired decisions in GREEN or
 * AMBER. A pre-flight s_d is multiplied by the safety factor 1.5 (3 rounds catch only gross noise).
 */
export function windowGrade(g: GradeInput): { grade: Grade; reasons: string[]; limits: { defaultRounds: number; maxRounds: number }; sdUsed: number | null } {
  const target = g.target ?? 1.25, def = g.defaultRounds ?? 12, max = g.maxRounds ?? 24;
  const limits = { defaultRounds: sdLimit({ ratio: target, rounds: def }), maxRounds: sdLimit({ ratio: target, rounds: max }) };
  const reasons: string[] = [];
  const share = g.rounds ? g.excluded / g.rounds : 1;
  if (!g.rounds || share > (g.maxExcludedShare ?? 1 / 3)) return { grade: "INVALID", reasons: [`${g.excluded} of ${g.rounds} rounds excluded (more than a third)`], limits, sdUsed: null };
  if (g.sdP50 === null || !Number.isFinite(g.sdP50) || g.sdRounds < 3) return { grade: "UNGRADED", reasons: [`s_d needs at least 3 usable rounds with identified p50 (${g.sdRounds})`], limits, sdUsed: null };
  const sdUsed = g.sdSource === "preflight" ? g.sdP50 * (g.preflightSafety ?? 1.5) : g.sdP50;
  if (sdUsed > limits.maxRounds) return { grade: "RED", reasons: [`s_d ${sdUsed.toFixed(3)} > ${limits.maxRounds.toFixed(3)}: ${target}x cannot be resolved within ${max} rounds`], limits, sdUsed };
  if (sdUsed > limits.defaultRounds) reasons.push(`s_d ${sdUsed.toFixed(3)} > ${limits.defaultRounds.toFixed(3)}: ${target}x needs up to ${max} rounds instead of ${def}`);
  if (g.amberRounds > 0) reasons.push(`${g.amberRounds} usable rounds carried a soft (amber) noise signal`);
  if (!g.partitioned) reasons.push("VM not partitioned: a non-arm container shares an arm's vCPUs, so the neighbour rule (hard after partition) was recorded, not applied");
  if (g.sdSource === "all") reasons.push("s_d from all rounds of an A/B run (includes effect variance; conservative)");
  return { grade: reasons.some((r) => !r.startsWith("s_d from all")) ? "AMBER" : "GREEN", reasons, limits, sdUsed };
}

// ---------------------------------------------------------------- synthetic rounds (tests and planning)

/**
 * R22's power-sim model (R22 section 2 "Monte Carlo"): per round a shared log slowdown with between-arm
 * correlation rho, per command a lognormal body (sigma 0.5, base 12 ms) plus a 3% stall (exponential, mean 40 ms),
 * all scaled by the round's slowdown; arm B divided by the true ratio. Deterministic for a seed.
 */
export function syntheticBlocks({ rounds, perRound, ratio = 1, rho = 0.8, sigmaB = 0.3, sigmaW = 0.5, baseMs = 12, stallP = 0.03, stallMs = 40, seed = 1, censorMs = Infinity }: { rounds: number; perRound: number; ratio?: number; rho?: number; sigmaB?: number; sigmaW?: number; baseMs?: number; stallP?: number; stallMs?: number; seed?: number; censorMs?: number }): PairBlock[] {
  const rng = new Rng(seed);
  const normal = () => Math.sqrt(-2 * Math.log(1 - rng.next())) * Math.cos(2 * Math.PI * rng.next());
  const out: PairBlock[] = [];
  for (let k = 0; k < rounds; k++) {
    const z = normal();
    const arms = [0, 1].map((arm) => {
      const S = Math.exp(sigmaB * (Math.sqrt(rho) * z + Math.sqrt(1 - rho) * normal()));
      const all = new Histogram(), censored = new Histogram();
      for (let i = 0; i < perRound; i++) {
        let x = baseMs * S * Math.exp(sigmaW * normal());
        if (rng.next() < stallP) x += -stallMs * Math.log(1 - rng.next()) * S;
        if (arm === 1) x /= ratio;
        if (x >= censorMs) { all.recordMs(censorMs); censored.recordMs(censorMs); } else all.recordMs(x);
      }
      return { all, censored };
    });
    out.push({ id: `R${String(k + 1).padStart(2, "0")}`, kind: ratio === 1 ? "aa" : "ab", a: arms[0]!, b: arms[1]! });
  }
  return out;
}
