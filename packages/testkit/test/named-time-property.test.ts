import { it, expect } from "vitest";
import {
  generateRouteHistory,
  makeOfflineRouteFixture,
  runNamedTimeSchedule,
} from "@triplex-build/triplex-testkit/route";

for (const lane of ["xtdb", "qlever"] as const)
  it(`${lane}: every repeated named-T read is byte-identical across random decision/read schedules on every RQ01 route`, async () => {
    let comparisons = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const result = await runNamedTimeSchedule({
        fixture: makeOfflineRouteFixture(lane),
        history: generateRouteHistory(seed, 32),
        seed: seed * 7919,
      });
      expect(result.violations, `seed ${seed}`).toEqual([]);
      comparisons += result.comparisons;
    }
    expect(comparisons).toBeGreaterThan(1000);
  }, 30000);

it("the property rejects the staged-stamp mutable-answer control", async () => {
  const { routeRow } = await import("@triplex-build/triplex-testkit/route");
  const history = {
    seed: 17,
    now: 2000,
    commits: [
      { position: 1, stagedAt: 1001, instant: 1001, writes: [] },
      {
        position: 2,
        stagedAt: 1000,
        instant: 1000,
        writes: [{ op: "assert" as const, row: routeRow("late", "subject", "late") }],
      },
    ],
  };
  const result = await runNamedTimeSchedule({
    fixture: makeOfflineRouteFixture("xtdb"),
    history,
    seed: 1,
  });
  expect(result.violations.some((v) => v.rule === "HE-5")).toBe(true);
});
