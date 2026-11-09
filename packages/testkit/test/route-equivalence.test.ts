import { describe, expect, it } from "vitest";
import {
  canonicalRouteRows,
  canonicalRouteValue,
  foldRouteHistory,
  generateRouteBases,
  generateRouteHistory,
  makeRouteEquivalenceCases,
  replayRouteAnswer,
  routeRow,
  routeShape,
  runRouteEquivalence,
  type RouteFixture,
  type RouteHistory,
  type RouteRequest,
} from "../src/route-equivalence.js";
import { makeOfflineRouteFixture, pendingRouteAdapters } from "../src/offline-route-fixtures.js";

const f1: RouteHistory = {
  seed: 89,
  now: 3000,
  commits: [
    {
      position: 2048,
      instant: 1000,
      writes: Array.from({ length: 40 }, (_, i) => ({
        op: "assert",
        row: routeRow(`f:${i}`, "subject", `${i}`),
      })),
    },
    {
      position: 3072,
      instant: 2000,
      writes: Array.from({ length: 10 }, (_, i) => ({ op: "retract", id: `f:${i}` })),
    },
  ],
};
const f1Request = { basis: { validAt: 3000, recordedAt: 1000, recordedPosition: 3072 } };

const mutate = (
  fixture: RouteFixture,
  read: RouteFixture["routes"][number]["read"],
): RouteFixture => ({
  ...fixture,
  routes: fixture.routes.map((route) => ({ ...route, read })),
});

describe("EXP-RQ01 route-equivalence gate (offline only)", () => {
  it("generates deterministically and covers every basis family and history operation", () => {
    const history = generateRouteHistory(42);
    expect(history).toEqual(generateRouteHistory(42));
    expect(history).not.toEqual(generateRouteHistory(43));
    expect(history.commits).toHaveLength(40);
    expect(new Set(generateRouteBases(history).map(routeShape))).toEqual(
      new Set(["L", "V", "P", "T", "TP", "H"]),
    );
    expect(history.commits[0]!.instant).toBe(history.commits[1]!.instant);
    expect(
      foldRouteHistory(history).some((r) => r.retracted_position === r.recorded_position),
    ).toBe(true);
    expect(generateRouteBases(history).some((r) => r.basis.recordedPosition === 40961)).toBe(true);
  });
  for (const lane of ["xtdb", "qlever"] as const)
    for (const seed of [1, 42, 890])
      it(`${lane} semantic models seed ${seed}: HE-1 through HE-7`, async () => {
        for (const entry of makeRouteEquivalenceCases({
          fixture: makeOfflineRouteFixture(lane),
          history: generateRouteHistory(seed),
        })) {
          const result = await entry.run();
          expect(result.violations).toEqual([]);
          expect(new Set(result.observations.map((o) => o.phase))).toEqual(
            new Set([
              "initial",
              "append",
              "purge-pinned",
              "purge",
              "evict-overlay",
              "catch-up",
              "cold-cache",
            ]),
          );
        }
      }, 30_000);
  it("reproduces SQL01 F1: 30 before purge, 40 after, identical TP request", async () => {
    const fixture = makeOfflineRouteFixture("qlever", { preFixH1: true });
    const result = await runRouteEquivalence({
      fixture,
      history: f1,
      scope: { shapes: ["TP"] },
      requests: [f1Request],
    });
    expect(replayRouteAnswer(f1, f1Request)).toHaveLength(40);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: "Q4-pre-fix-H1", rule: "HE-1", phase: "initial" }),
        expect.objectContaining({ rule: "HE-2", phase: "initial" }),
        expect.objectContaining({ route: "Q4-pre-fix-H1", rule: "HE-5", phase: "purge" }),
      ]),
    );
    await fixture.reset(f1);
    const route = fixture.routes.at(-1)!;
    await route.force();
    expect((await route.read(f1Request)).rows).toHaveLength(30);
    await fixture.append({ position: 4096, instant: 4000, writes: [] });
    await fixture.event("purge");
    expect((await route.read(f1Request)).rows).toHaveLength(40);
  });
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
      scope: { shapes: ["T"] },
      requests: [{ entityId: "X", basis: { validAt: 2000, recordedAt: 1001 } }],
      extension: {
        position: 2048,
        instant: 1000,
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
  it("canonicalizes all columns without losing exact strings, -0, duplicates or key order", () => {
    const row = routeRow("a", "s", "9007199254740993");
    expect(canonicalRouteRows([row])).toBe(canonicalRouteRows([{ ...row }]));
    expect(canonicalRouteRows([row, row])).not.toBe(canonicalRouteRows([row]));
    expect(canonicalRouteValue({ a: -0, b: "1" })).toBe(canonicalRouteValue({ b: "1", a: -0 }));
    expect(canonicalRouteValue(-0)).not.toBe(canonicalRouteValue(0));
    expect(() => canonicalRouteValue(NaN)).toThrow();
  });
  it("rejects unanimous wrong answers (HE-1), flags (HE-6), bad forcing and basis echoes", async () => {
    const fixture = makeOfflineRouteFixture("qlever");
    const broken = mutate(fixture, async () => ({
      rows: [],
      taken: "wrong",
      basis: { recordedPosition: 123 },
      eligible: false,
    }));
    const result = await runRouteEquivalence({
      fixture: broken,
      history: f1,
      scope: { shapes: ["TP"] },
      requests: [f1Request],
    });
    for (const rule of ["HE-1", "HE-6", "HE-7", "forcing"])
      expect(result.violations.some((v) => v.rule === rule)).toBe(true);
  });
  it("rejects untyped refusal, eligible refusal and total unavailability", async () => {
    const fixture = mutate(makeOfflineRouteFixture("qlever"), async () => {
      throw new Error("offline");
    });
    const result = await runRouteEquivalence({
      fixture,
      history: f1,
      scope: { shapes: ["TP"] },
      requests: [f1Request],
    });
    expect(new Set(result.violations.map((v) => v.rule))).toEqual(new Set(["HE-3", "HE-4"]));
  });
  it("rejects future-position answers even if every route agrees", async () => {
    const fixture = makeOfflineRouteFixture("xtdb");
    const request: RouteRequest = { basis: { validAt: 3000, recordedPosition: 99999 } };
    const broken = mutate(fixture, async () => ({ rows: [], taken: "X1-all-valid-time" }));
    const result = await runRouteEquivalence({
      fixture: broken,
      history: f1,
      scope: { shapes: ["P"] },
      requests: [request],
    });
    expect(result.violations.some((v) => v.rule === "HE-3")).toBe(true);
  });
  it("keeps the unmerged SQL01 H1 and lane D adapters explicitly unimplemented", () => {
    expect(pendingRouteAdapters.map((a) => a.status)).toEqual(["unimplemented", "unimplemented"]);
  });
});
