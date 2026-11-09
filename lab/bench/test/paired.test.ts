/** PAIR-0 statistics tests (EXP-M01; R22 sections 2, 4.2, 8): exact pooled quantiles, censoring, the planner and
 * window gate against R22's tables, and coverage / A/A false-positive rates on synthetic rounds with known ratios. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { Histogram } from "../lib/hist.ts";
import { Rng } from "../lib/rng.ts";
import {
  aaFalsePositiveRate, decide, pairedQuantileRatio, pairedRatios, planRounds, pooledQuantiles, roundLogRatios, roundsNeeded, sd,
  sdLimit, signFlipP, slotBias, syntheticBlocks, t975, windowGrade, zOf, type PairBlock, type RatioCI,
} from "../lib/paired.ts";

const roundTrip = (h: Histogram) => Histogram.fromJSON(JSON.parse(JSON.stringify(h.toJSON())));

test("pooled quantiles equal Histogram.merge percentiles exactly (recomputable from receipt histograms)", () => {
  const rng = new Rng(3);
  const blocks: PairBlock[] = Array.from({ length: 9 }, (_, k) => {
    const a = new Histogram(), b = new Histogram();
    for (let i = 0; i < 400 + k * 37; i++) { a.recordMs(Math.exp(rng.next() * 9)); b.recordMs(Math.exp(rng.next() * 8.5)); }
    return { id: `R${k}`, a: { all: roundTrip(a) }, b: { all: roundTrip(b) } };
  });
  for (const q of [0.5, 0.9, 0.99, 0.999]) {
    const merged = blocks.reduce((acc, x) => acc.merge(x.a.all), new Histogram());
    assert.equal(pooledQuantiles(blocks, "a", [q])[0]!.us, merged.percentileUs(q * 100));
    const mergedB = blocks.reduce((acc, x) => acc.merge(x.b.all), new Histogram());
    assert.equal(pooledQuantiles(blocks, "b", [q])[0]!.us, mergedB.percentileUs(q * 100));
  }
  // Same inputs and seed give bit-identical intervals (a reader recomputes the receipt).
  const r1 = pairedRatios(blocks, [0.5, 0.99], { boots: 300, seed: 5 });
  const r2 = pairedRatios(blocks.map((b) => ({ ...b, a: { all: roundTrip(b.a.all) }, b: { all: roundTrip(b.b.all) } })), [0.5, 0.99], { boots: 300, seed: 5 });
  assert.deepEqual(r1, r2);
});

test("censoring: a quantile below the censored mass is identified; one inside it is a lower bound only", () => {
  const all = new Histogram(), censored = new Histogram();
  for (let i = 0; i < 950; i++) all.recordMs(10 + (i % 50));
  for (let i = 0; i < 50; i++) { all.recordMs(30_000); censored.recordMs(30_000); } // 5% expired at the 30 s deadline
  const blocks: PairBlock[] = Array.from({ length: 8 }, (_, k) => ({ id: `R${k}`, a: { all, censored }, b: { all, censored } }));
  const [p50, p99] = pooledQuantiles(blocks, "a", [0.5, 0.99]);
  assert.equal(p50!.identified, true);
  assert.equal(p99!.identified, false, "p99 falls in the censored 5%");
  const ci = pairedRatios(blocks, [0.5, 0.99], { boots: 100 });
  assert.equal(ci[0]!.ratio, 1);
  assert.equal(ci[1]!.ratio, null);
  assert.match(ci[1]!.why!, /not identified/);
  assert.equal(decide(ci[1]!), "NOT_ESTIMABLE");
  // A censored value below the quantile does not break identification if uncensored mass still reaches the rank.
  const all2 = new Histogram(), cens2 = new Histogram();
  for (let i = 0; i < 99; i++) all2.recordMs(5);
  all2.recordMs(1); cens2.recordMs(1); // failed fast: censored at 1 ms, below everything
  const one: PairBlock[] = [{ id: "x", a: { all: all2, censored: cens2 }, b: { all: all2, censored: cens2 } }];
  assert.equal(pooledQuantiles(one, "a", [0.5])[0]!.identified, true);
  assert.equal(pooledQuantiles(one, "a", [0.999])[0]!.identified, false);
});

test("planner reproduces R22's s_d limits (1.25x: 0.28 at 12 rounds, 0.39 at 24; 1.10x: 0.17 at 24)", () => {
  assert.ok(Math.abs(zOf(0.975) - 1.959964) < 1e-5 && Math.abs(zOf(0.8) - 0.841621) < 1e-5 && Math.abs(zOf(0.01) + 2.326348) < 1e-5);
  assert.equal(sdLimit({ ratio: 1.25, rounds: 12 }).toFixed(2), "0.28");
  assert.equal(sdLimit({ ratio: 1.25, rounds: 24 }).toFixed(2), "0.39");
  assert.equal(sdLimit({ ratio: 1.1, rounds: 24 }).toFixed(2), "0.17");
  assert.equal(roundsNeeded({ sd: 0.1, ratio: 1.25 }), 2); // R22 prediction: s_d 0.10 resolves 1.25x easily
  assert.equal(roundsNeeded({ sd: sdLimit({ ratio: 1.25, rounds: 12 }) - 1e-9, ratio: 1.25 }), 12);
  const p = planRounds({ sd: 0.5, ratio: 1.25 });
  assert.equal(p.feasible, false);
  assert.equal(p.rounds, 24);
  assert.equal(planRounds({ sd: 0.05, ratio: 1.25 }).rounds, 8, "never below the 8-round minimum");
  assert.ok(Math.abs(t975(9) - 2.262) < 1e-9 && Math.abs(t975(60) - 2.0003) < 0.002);
});

test("window grade: INVALID over a third excluded, RED above 0.39, AMBER above 0.28 or amber signal or no partition", () => {
  const base = { sdRounds: 8, sdSource: "aa" as const, rounds: 9, excluded: 0, amberRounds: 0, partitioned: true };
  assert.equal(windowGrade({ ...base, sdP50: 0.1 }).grade, "GREEN");
  assert.equal(windowGrade({ ...base, sdP50: 0.3 }).grade, "AMBER");
  assert.equal(windowGrade({ ...base, sdP50: 0.45 }).grade, "RED");
  assert.equal(windowGrade({ ...base, sdP50: 0.1, excluded: 4 }).grade, "INVALID");
  assert.equal(windowGrade({ ...base, sdP50: 0.1, excluded: 3 }).grade, "GREEN");
  assert.equal(windowGrade({ ...base, sdP50: 0.1, amberRounds: 1 }).grade, "AMBER");
  assert.equal(windowGrade({ ...base, sdP50: 0.1, partitioned: false }).grade, "AMBER");
  assert.equal(windowGrade({ ...base, sdP50: 0.27, sdSource: "preflight" }).grade, "RED", "pre-flight s_d x 1.5 = 0.405");
  assert.equal(windowGrade({ ...base, sdP50: null, sdRounds: 2 }).grade, "UNGRADED");
});

test("sign flip is exact for small m; slot bias t interval; decide covers every verdict", () => {
  assert.equal(signFlipP([0.1, 0.1, 0.1, 0.1]), 2 / 16);
  assert.equal(signFlipP([0.1, -0.1, 0.1, -0.1]), 1);
  const bias = slotBias([0.1, 0.12, 0.08, 0.11, 0.09]);
  assert.ok(bias.excludesZero && Math.abs(bias.meanLog! - 0.1) < 1e-12);
  assert.ok(Math.abs(bias.hi! - bias.meanLog! - (2.776 * sd([0.1, 0.12, 0.08, 0.11, 0.09])) / Math.sqrt(5)) < 1e-12);
  assert.equal(slotBias([0.1, -0.1, 0.05, -0.05]).excludesZero, false);
  const ci = (lo: number, hi: number, blocks = 12): RatioCI => ({ q: 0.5, ratio: Math.sqrt(lo * hi), lo, hi, mdr: Math.sqrt(hi / lo), blocks, level: 0.95, boots: 1, seed: 1, aUs: 1, bUs: 1, countA: 1, countB: 1, censoredA: 0, censoredB: 0 });
  assert.equal(decide(ci(1.3, 1.6)), "FASTER_BY_TARGET");
  assert.equal(decide(ci(1.05, 1.4)), "FASTER");
  assert.equal(decide(ci(0.7, 0.95)), "SLOWER");
  assert.equal(decide(ci(0.9, 1.1)), "EQUIVALENT_WITHIN_TARGET");
  assert.equal(decide(ci(0.75, 1.2, 8)), "INCONCLUSIVE_NEED_MORE_ROUNDS");
  assert.equal(decide(ci(0.5, 2.0, 8)), "INCONCLUSIVE_TOO_NOISY");
  assert.equal(decide(ci(0.75, 1.2, 24)), "INCONCLUSIVE_TOO_NOISY", "no rounds left");
  assert.equal(decide(ci(0.95, 1.1), { kind: "hold", margin: 1.1 }), "HOLDS_WITHIN_MARGIN");
  assert.equal(decide(ci(0.8, 0.88), { kind: "hold", margin: 1.1 }), "SLOWER");
  assert.equal(decide({ ...ci(1, 1), lo: null, hi: null, mdr: null, why: "3 usable rounds, fewer than minBlocks 8" }), "INCONCLUSIVE_NEED_MORE_ROUNDS");
});

test("synthetic rounds (R22 model, rho 0.8, 660 per round, 12 rounds): coverage at 1.0, 1.25, 1.6 and A/A false positives", () => {
  const reps = 40;
  for (const ratio of [1.0, 1.25, 1.6]) {
    let covered50 = 0, covered99 = 0, excludes1 = 0, byTarget = 0;
    for (let rep = 0; rep < reps; rep++) {
      const blocks = syntheticBlocks({ rounds: 12, perRound: 660, ratio, rho: 0.8, seed: 1000 * ratio + rep });
      const [c50, c99] = pairedRatios(blocks, [0.5, 0.99], { boots: 400, seed: rep + 1 });
      if (c50!.lo! <= ratio && ratio <= c50!.hi!) covered50++;
      if (c99!.lo! <= ratio && ratio <= c99!.hi!) covered99++;
      if (c50!.lo! > 1 || c50!.hi! < 1) excludes1++;
      if (decide(c50!) === "FASTER_BY_TARGET") byTarget++;
    }
    // The percentile bootstrap over 12 rounds under-covers a little (R22: A/A false positives 6 to 11% at 12 rounds).
    assert.ok(covered50 / reps >= 0.8, `p50 coverage at ${ratio}: ${covered50}/${reps}`);
    assert.ok(covered99 / reps >= 0.75, `p99 coverage at ${ratio}: ${covered99}/${reps}`);
    if (ratio === 1.0) assert.ok(excludes1 / reps <= 0.2, `A/A false positives ${excludes1}/${reps}`);
    if (ratio === 1.6) {
      assert.ok(excludes1 / reps >= 0.95, `1.6x detected ${excludes1}/${reps}`);
      assert.ok(byTarget / reps >= 0.6, `1.6x certified >= 1.25 in ${byTarget}/${reps}`);
    }
  }
});

test("A/A procedure check and per-round s_d on synthetic A/A rounds", () => {
  const blocks = syntheticBlocks({ rounds: 12, perRound: 660, ratio: 1, rho: 0.8, seed: 77 });
  const fp = aaFalsePositiveRate(blocks, 0.5, { trials: 60, boots: 300 });
  assert.ok(fp.rate !== null && fp.rate <= 0.25, `procedure false-positive rate ${fp.rate}`);
  const d = roundLogRatios(blocks, 0.5).map((r) => r.d!);
  assert.equal(d.length, 12);
  // Model: per-arm independent log noise sigmaB * sqrt(1 - rho) = 0.134, so sd(d) is about 0.19 plus sampling noise.
  assert.ok(sd(d) > 0.08 && sd(d) < 0.32, `s_d ${sd(d)}`);
  const excluded = blocks.map((b, k) => (k < 4 ? { ...b, excluded: ["vm-psi-cpu-some"] } : b));
  assert.equal(pairedQuantileRatio(excluded, 0.5, { boots: 50 }).blocks, 8, "excluded rounds never enter the statistics");
});

test("recordCorrectedUs adds the samples a stalled closed loop never issued", () => {
  const h = new Histogram();
  h.recordCorrectedUs(100_000, 10_000);
  assert.equal(h.count, 10);
  assert.equal(h.minUs, 10_000);
  const g = new Histogram();
  g.recordCorrectedUs(5_000, 10_000);
  assert.equal(g.count, 1);
});
