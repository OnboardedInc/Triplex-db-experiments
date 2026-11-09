import { expect, it } from "vitest";
import { runRouteEquivalence, routeRow, type RouteHistory } from "../../../../packages/testkit/src/route-equivalence.js";
import { makeOfflineRouteFixture } from "../../../../packages/testkit/src/offline-route-fixtures.js";
  it("known-failing Q89a / R31 D-C1: the same T answer changes after a late staged commit", async () => {
    const history: RouteHistory = {
      seed: 891,
      now: 2000,
      commits: [
        { position: 1024, instant: 1001, writes: [{ op: "assert", row: routeRow("B", "Y", "B") }] },
      ],
    };
    const result = await runRouteEquivalence({
      fixture: makeOfflineRouteFixture("qlever"),
      history,
      requests: [{ entityId: "X", basis: { validAt: 2000, recordedAt: 1001 } }],
      extension: {
        position: 2048,
        instant: 1002,
        writes: [{ op: "assert", row: routeRow("A", "X", "A") }],
      },
    });
    // [EXP-RQ01] Why: assert the defect is observed until Q89a; unexpected repair requires review.
    // Rejected: it.skip/it.fails (could hide harness failure or unrelated exceptions).
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.every((v) => v.rule === "HE-5")).toBe(true);
    expect(new Set(result.violations.map((v) => v.route))).toEqual(
      new Set(makeOfflineRouteFixture("qlever").routes.map((r) => r.id)),
    );
  });
