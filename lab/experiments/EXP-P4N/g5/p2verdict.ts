// [EXP-P4N-R2] Why (review F1, F2): one pure place turns raw matched commit latencies into a P2 verdict under Q104a, so the verdict can be recomputed
// from the retained raw rounds alone (`p2-recompute.ts`) and tested with negative cases. Method = M01's PAIR-0 (vendored, `pair0/`): rounds are the
// independent units; the B/A p99 ratio and its 95% interval come from `pairedRatios` (bootstrap over whole rounds, minBlocks 8); the A/A control
// (arm A against its own twin) gives s_d, the standard deviation of the per-round log p99 ratios; the A/A band is exp(1.96 s_d) - 1 (one comparison's
// noise at 95%); the window is RESOLVABLE only when s_d <= sdLimit(1.1, rounds), PAIR-0's own planning limit for resolving a 1.1x ratio with the
// rounds run. Rules (fixed here, before any B run): FAIL when the pooled p50 delta exceeds the bar (0.5 ms) or when the lower bound of the p99 B/A
// interval exceeds 1 + the A/A band; INCONCLUSIVE (never a pass) when the sample is too small (< 1,000 commits per arm, < 8 rounds, < 3 A/A rounds)
// or the A/A noise is too wide to resolve 1.1x; PASS otherwise. Rejected: round 1's rule (p99 only, a band from the largest twin departure, a
// bootstrap over pooled commits, no minimum resolution), which passed a +1 ms p50 regression and an unresolvable window.
import { Histogram } from "./pair0/hist.ts";
import { pairedRatios, roundLogRatios, sd, sdLimit, type PairBlock } from "./pair0/paired.ts";

export interface P2Round {
  readonly id: string;
  /** Matched commit latencies in ms, post-warmup, same commit index across the three arms. */
  readonly off: readonly number[];
  readonly on: readonly number[];
  readonly twin: readonly number[];
}
export interface P2Rule {
  readonly p50BarMs: number;
  readonly p99Ratio: number;
  readonly minCommitsPerArm: number;
  readonly minRounds: number;
  readonly minAARounds: number;
}
export const Q104A: P2Rule = {
  p50BarMs: 0.5,
  p99Ratio: 1.1,
  minCommitsPerArm: 1000,
  minRounds: 8,
  minAARounds: 3,
};
const hist = (xs: readonly number[]) => {
  const h = new Histogram();
  for (const x of xs) h.recordMs(x);
  return h;
};
const block = (
  id: string,
  kind: "aa" | "ab",
  a: readonly number[],
  b: readonly number[],
): PairBlock => ({
  id,
  kind,
  a: { all: hist(a), censored: null },
  b: { all: hist(b), censored: null },
});
const quantile = (xs: readonly number[], p: number) =>
  [...xs].sort((x, y) => x - y)[Math.floor((xs.length - 1) * p)]!;
export type Verdict = "PASS" | "FAIL" | "INCONCLUSIVE";
export interface P2Result {
  readonly verdict: Verdict;
  readonly reasons: readonly string[];
  readonly rule: P2Rule;
  readonly rounds: number;
  readonly commitsPerArm: number;
  readonly p50: {
    readonly offMs: number;
    readonly onMs: number;
    readonly deltaMs: number;
    readonly twinDeltaMs: number;
    readonly roundDeltaMs: readonly number[];
  };
  readonly p99: {
    readonly offMs: number;
    readonly onMs: number;
    readonly ratioBA: number;
    readonly lo: number | null;
    readonly hi: number | null;
    readonly why?: string;
  };
  readonly aa: {
    readonly sdLog99: number;
    readonly sdLog50: number;
    readonly band: number;
    readonly sdLimitFor1p1: number;
    readonly resolvable: boolean;
    readonly twinRatioBA: number;
  };
}
export function p2Verdict(rounds: readonly P2Round[], rule: P2Rule = Q104A): P2Result {
  const reasons: string[] = [];
  const all = (k: "off" | "on" | "twin") => rounds.flatMap((r) => r[k]);
  const commitsPerArm = all("off").length;
  const ab = rounds.map((r) => block(r.id, "ab", r.off, r.on));
  const aa = rounds.map((r) => block(r.id, "aa", r.off, r.twin));
  const p99ab = pairedRatios(ab, [0.99], { level: 0.95, minBlocks: rule.minRounds })[0]!;
  const d99 = roundLogRatios(aa, 0.99)
    .map((x) => x.d)
    .filter((x): x is number => x !== null);
  const d50 = roundLogRatios(aa, 0.5)
    .map((x) => x.d)
    .filter((x): x is number => x !== null);
  const s99 = sd(d99),
    s50 = sd(d50);
  const limit = sdLimit({ ratio: rule.p99Ratio, rounds: rounds.length });
  const band = Number.isFinite(s99) ? Math.exp(1.96 * s99) - 1 : Infinity;
  const resolvable = Number.isFinite(s99) && s99 <= limit;
  // Ratios from PAIR-0 are A/B = off/on; the B/A ratio and its interval are their inverses.
  const ratioBA = p99ab.ratio === null ? NaN : 1 / p99ab.ratio;
  const lo = p99ab.hi === null ? null : 1 / p99ab.hi,
    hi = p99ab.lo === null ? null : 1 / p99ab.lo;
  const offP50 = quantile(all("off"), 0.5),
    onP50 = quantile(all("on"), 0.5),
    twinP50 = quantile(all("twin"), 0.5);
  const roundDeltas = rounds.map((r) => quantile(r.on, 0.5) - quantile(r.off, 0.5));
  const delta = onP50 - offP50;
  // 1. Sample requirements (INCONCLUSIVE, never a pass).
  if (commitsPerArm < rule.minCommitsPerArm)
    reasons.push(`only ${commitsPerArm} commits per arm (< ${rule.minCommitsPerArm})`);
  if (rounds.length < rule.minRounds)
    reasons.push(`only ${rounds.length} rounds (< ${rule.minRounds}, PAIR-0 minBlocks)`);
  if (rounds.length < rule.minAARounds)
    reasons.push(`only ${rounds.length} A/A rounds (< ${rule.minAARounds})`);
  if (!resolvable)
    reasons.push(
      `A/A noise too wide to resolve ${rule.p99Ratio}x: s_d ${s99.toFixed(4)} > limit ${limit.toFixed(4)} at ${rounds.length} rounds`,
    );
  if (p99ab.lo === null) reasons.push(`p99 interval not reported: ${p99ab.why ?? "unknown"}`);
  const inconclusive = reasons.length > 0;
  // 2. Failures (judged even when the window is inconclusive: a violated bar is a violated bar).
  const failures: string[] = [];
  if (delta > rule.p50BarMs)
    failures.push(`p50 delta ${delta.toFixed(3)} ms exceeds the ${rule.p50BarMs} ms bar`);
  if (lo !== null && lo > 1 + (Number.isFinite(band) ? band : 0))
    failures.push(`p99 B/A lower bound ${lo.toFixed(4)} exceeds 1 + A/A band ${band.toFixed(4)}`);
  const verdict: Verdict = failures.length ? "FAIL" : inconclusive ? "INCONCLUSIVE" : "PASS";
  return {
    verdict,
    reasons: [...failures, ...reasons],
    rule,
    rounds: rounds.length,
    commitsPerArm,
    p50: {
      offMs: offP50,
      onMs: onP50,
      deltaMs: delta,
      twinDeltaMs: twinP50 - offP50,
      roundDeltaMs: roundDeltas,
    },
    p99: {
      offMs: quantile(all("off"), 0.99),
      onMs: quantile(all("on"), 0.99),
      ratioBA,
      lo,
      hi,
      ...(p99ab.why ? { why: p99ab.why } : {}),
    },
    aa: {
      sdLog99: s99,
      sdLog50: s50,
      band,
      sdLimitFor1p1: limit,
      resolvable,
      twinRatioBA: quantile(all("twin"), 0.99) / quantile(all("off"), 0.99),
    },
  };
}
