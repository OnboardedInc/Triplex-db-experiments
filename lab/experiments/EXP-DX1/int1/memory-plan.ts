import assert from "node:assert/strict";

export function memoryPlan(spec: string | undefined, mode: string, size: number) {
  if (spec === undefined) return undefined;
  const scopes = mode === "int1-idle";
  assert(scopes || mode === "int1-thin" || mode === "int1-deep");
  assert(/^\d+(,\d+){2,7}$/.test(spec));
  const points = spec.split(",").map(Number);
  assert.equal(points.at(-1), size);
  assert(points.every((n, i) => Number.isSafeInteger(n) && n > (points[i - 1] ?? 0)));
  assert(scopes ? points[0] === 1 && size <= 128 : points[0]! >= 100 && points[0]! % 50 === 0);
  return { points, scopes, activityPopulation: scopes ? 0 : points[0]! };
}
