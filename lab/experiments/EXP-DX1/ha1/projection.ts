import assert from "node:assert/strict";
export type MovePoint = {
  seedFacts: number;
  finalBytes: number;
  pauseMs: number;
  setupThroughCutoverMs: number;
};
export function projection(raw: MovePoint[]) {
  const points = [...raw].sort((a, b) => a.seedFacts - b.seedFacts);
  for (const p of points) for (const n of Object.values(p)) assert(Number.isFinite(n) && n >= 0);
  const target = 16000000;
  const exact = points.find((p) => p.seedFacts === target);
  if (exact) return { target, measured: exact };
  if (points.length < 3) return { target, reason: "Need three distinct size rungs", points };
  const first = points[0]!,
    mid = points[Math.floor((points.length - 1) / 2)]!,
    last = points.at(-1)!;
  assert(first.seedFacts < mid.seedFacts && mid.seedFacts < last.seedFacts);
  const slopes: Record<string, unknown> = {};
  for (const metric of ["finalBytes", "pauseMs", "setupThroughCutoverMs"] as const) {
    const slope = (a: MovePoint, b: MovePoint) =>
      (b[metric] - a[metric]) / (b.seedFacts - a.seedFacts);
    const left = slope(first, mid),
      right = slope(mid, last),
      observedGrowth = last[metric] - mid[metric],
      predictedGrowth = left * (last.seedFacts - mid.seedFacts);
    const relativeGrowthError =
      observedGrowth > 0 ? Math.abs(predictedGrowth - observedGrowth) / observedGrowth : null;
    // [DX-HA1] Why: a tiny fixed startup cost multiplied by 16M produces a fictitious outage. Rejected: projecting from a single small restore with no held-out growth check.
    slopes[metric] = {
      left,
      right,
      relativeGrowthError,
      conditionalRange:
        left > 0 && right > 0 && relativeGrowthError !== null && relativeGrowthError <= 0.2
          ? [left, right]
              .sort((a, b) => a - b)
              .map((rate) => last[metric] + (target - last.seedFacts) * rate)
          : null,
    };
  }
  return { target, points, slopes };
}
