import assert from "node:assert/strict";
type Point = {
  arm: string;
  rate: number;
  maxService: number;
  withinProvisional: boolean | null;
  scopes: { read: number | null; commit: number | null }[];
};
export function choose(points: readonly Point[]) {
  assert(points.length === 4 && new Set(points.map((p) => p.arm)).size === 4);
  const worst = (p: Point) =>
    Math.max(...p.scopes.map((s) => Math.max(s.read ?? Infinity, s.commit ?? Infinity)));
  const qualified = points.filter((p) => p.withinProvisional === true && worst(p) <= 1.5);
  // [DX-ACT1] Why: the speed choice should also protect saves inside the importing account. Rejected: silently relaxing the provisional other-account bar or describing an underfilled profile as qualified.
  const order = qualified.length
    ? qualified.toSorted((a, b) => b.rate - a.rate || a.maxService - b.maxService)
    : points.toSorted((a, b) => worst(a) - worst(b) || a.maxService - b.maxService);
  const p = order[0]!;
  return {
    index: Number(p.arm.slice(1)),
    selection: qualified.length ? "screened" : "exploratory",
    observedMaxHoldMs: p.maxService,
  };
}
