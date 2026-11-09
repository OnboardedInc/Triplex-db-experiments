// [EXP-P4N-R2] Why (review F1, F2): the P2 verdict function must refuse what round 1's guard passed. Every case below is synthetic, seeded and
// labelled as such; none is a performance result. Negative cases: a +1 ms p50 regression (round 1 passed it), an A/A window too noisy to resolve
// 1.1x, too few rounds, too few commits, a real p99 regression. Positive control: identical arms with a quiet A/A pass.
import { it, expect } from "vitest";
import { p2Verdict, type P2Round } from "../../experiments/EXP-P4N/g5/p2verdict.ts";
const lcg = (s0: number) => {
  let s = s0 >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
};
const normal = (u: () => number) =>
  Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
const make = (opts: {
  rounds: number;
  commits: number;
  onShift?: number;
  onTail?: number;
  twinRoundSigma?: number;
  seed?: number;
}): P2Round[] => {
  const u = lcg(opts.seed ?? 1);
  return Array.from({ length: opts.rounds }, (_, r) => {
    const roundFactor = Math.exp(0.03 * normal(u));
    const twinFactor = Math.exp((opts.twinRoundSigma ?? 0) * normal(u));
    const off: number[] = [],
      on: number[] = [],
      twin: number[] = [];
    for (let i = 0; i < opts.commits; i++) {
      const shared = 3.5 * Math.exp(0.12 * normal(u)) * roundFactor + (u() < 0.04 ? 3 : 0);
      const own = () => Math.exp(0.02 * normal(u));
      off.push(shared * own());
      on.push(shared * own() + (opts.onShift ?? 0) + (u() < (opts.onTail ?? 0) ? 25 : 0));
      twin.push(shared * own() * twinFactor);
    }
    return { id: "R" + r, off, on, twin };
  });
};
it("positive control: identical arms and a quiet A/A pass", () => {
  const v = p2Verdict(make({ rounds: 12, commits: 1000 }));
  expect(v.reasons).toEqual([]);
  expect(v.verdict).toBe("PASS");
  expect(v.aa.resolvable).toBe(true);
});
it("a +1 ms p50 regression fails even when p99 is unchanged (round 1's guard passed this)", () => {
  const v = p2Verdict(make({ rounds: 12, commits: 1000, onShift: 1.0 }));
  expect(v.verdict).toBe("FAIL");
  expect(v.reasons.join(" ")).toContain("p50 delta");
  expect(v.p50.deltaMs).toBeGreaterThan(0.5);
});
it("an A/A window too noisy to resolve 1.1x is INCONCLUSIVE, never a pass", () => {
  const v = p2Verdict(make({ rounds: 12, commits: 1000, twinRoundSigma: 0.5 }));
  expect(v.verdict).toBe("INCONCLUSIVE");
  expect(v.aa.resolvable).toBe(false);
  expect(v.reasons.join(" ")).toContain("A/A noise too wide");
});
it("too few rounds or too few commits is INCONCLUSIVE", () => {
  const few = p2Verdict(make({ rounds: 5, commits: 1000 }));
  expect(few.verdict).toBe("INCONCLUSIVE");
  expect(few.reasons.join(" ")).toContain("rounds");
  const small = p2Verdict(make({ rounds: 12, commits: 60 }));
  expect(small.verdict).toBe("INCONCLUSIVE");
  expect(small.reasons.join(" ")).toContain("commits per arm");
});
it("a real p99 regression with a quiet A/A fails", () => {
  const v = p2Verdict(make({ rounds: 12, commits: 1000, onTail: 0.03 }));
  expect(v.verdict).toBe("FAIL");
  expect(v.reasons.join(" ")).toContain("p99");
  expect(v.p99.lo).not.toBeNull();
  expect(v.p99.lo!).toBeGreaterThan(1 + v.aa.band);
});
it("the verdict is a pure function of the raw rounds (recompute equals first run)", () => {
  const rounds = make({ rounds: 10, commits: 1000, seed: 9 });
  expect(JSON.stringify(p2Verdict(rounds))).toBe(JSON.stringify(p2Verdict(rounds)));
});
