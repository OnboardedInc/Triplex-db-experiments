import { expect, it } from "vitest";
import {
  generateRouteHistory,
  makeOfflineRouteFixture,
  runRouteEquivalence,
} from "@triplex-build/triplex-testkit";

// [EXP-RQ01] Why: main at 908ebada has no broker directory; expose the model gate
// from the lane now. Rejected: importing unmerged SQL01 source across worktrees
// (violates package boundaries and gives an unpinned route qualification claim).
it("QLever broker route models: replica, overlay, source eviction, outage and H1 disabled", async () => {
  const result = await runRouteEquivalence({
    fixture: makeOfflineRouteFixture("qlever"),
    history: generateRouteHistory(89, 8),
  });
  expect(result.violations).toEqual([]);
  expect(result.reference).toBe("offline-fold-not-independent");
  expect(new Set(result.observations.map((o) => o.route))).toEqual(
    new Set([
      "Q1-replica",
      "Q2-overlay",
      "Q3-source-after-eviction",
      "Q5-outage-source",
      "Q5-h1-disabled",
    ]),
  );
}, 30_000);
