import { stampOf } from "@triplex-build/triplex";
import { Effect } from "effect";
import { expect, it } from "vitest";
import {
  foldRouteHistory,
  generateRouteBases,
  generateRouteHistory,
  replayRouteAnswer,
  routeHead,
  routeFuture,
  routeWatermark,
  RouteRefusal,
  runRouteEquivalence,
  type RouteFixture,
  type RouteHistory,
  type RouteRequest,
} from "@triplex-build/triplex-testkit/route";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { makeXtdbStorageAdapter } from "../src/XtdbStorageAdapter.js";
import type { XtdbClient } from "../src/XtdbClient.js";

// [EXP-RQ01] Why: evaluate the actual adapter's emitted predicates against rows offline.
// Rejected: return replayRouteAnswer from the client (would hide predicate regressions).
const fixture = (guardFuture = true): RouteFixture => {
  let history: RouteHistory = generateRouteHistory(1, 16);
  let rows: readonly TripleRow[] = [],
    taken = "";
  const client: XtdbClient = {
    query: async <T extends Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ) => {
      if (sql.includes("FROM tx_meta")) return [{ position: routeHead(history), stamp: stampOf(routeWatermark(history)) }] as unknown as T[];
      if (!sql.includes("FROM tx_assertions FOR ALL VALID_TIME"))
        throw new Error(`Unexpected SQL ${sql}`);
      taken = "X1-adapter";
      let index = 1;
      const entity = sql.includes("entity_id = ?") ? String(params[index++]) : undefined;
      const position = sql.includes("recorded_position <= ?") ? Number(params[index++]) : Infinity;
      const time = sql.includes("recorded_at <= ?") ? Number(params[index++]) : Infinity;
      const active = sql.includes("retracted_at IS NULL");
      const retiredAfterPosition = sql.includes("retracted_position > ?")
        ? Number(params[index++])
        : Infinity;
      const retiredAfterTime = sql.includes("retracted_at > ?")
        ? Number(params[index++])
        : Infinity;
      const valid = sql.includes("valid_from <= ?") ? Number(params[index++]) : undefined;
      if (valid !== undefined) {
        expect(Number(params[index++])).toBe(valid);
        expect(sql).toContain("(valid_to IS NULL OR valid_to > ?)");
      }
      expect(index).toBe(params.length);
      const result = rows.filter(
        (row) =>
          (entity === undefined || row.entity_id === entity) &&
          row.recorded_position <= position &&
          row.recorded_at <= time &&
          (!active ||
            row.retracted_at === null ||
            row.retracted_position! > retiredAfterPosition ||
            row.retracted_at > retiredAfterTime) &&
          (valid === undefined ||
            (row.valid_from <= valid && (row.valid_to === null || row.valid_to > valid))),
      );
      return result as unknown as T[];
    },
    submit: async () => {
      throw new Error("Offline read driver cannot submit");
    },
    close: async () => {},
  };
  const adapter = makeXtdbStorageAdapter(client, "route-equivalence", { basisWaitMs: 0 });
  return {
    lane: "xtdb-actual-adapter-offline-client",
    reset: (next) => {
      history = next;
      rows = foldRouteHistory(history);
    },
    append: (commit) => {
      history = {
        ...history,
        commits: [...history.commits, commit],
        ...(history.attempts && commit.receipt
          ? {
              attempts: [
                ...history.attempts,
                {
                  id: commit.receipt.attemptId,
                  status: "committed" as const,
                  position: commit.position,
                  stagedAt: commit.instant,
                  stagedOrder: Math.max(...history.attempts.map((a) => a.stagedOrder)) + 1,
                  decidedOrder: Math.max(...history.attempts.map((a) => a.decidedOrder)) + 1,
                },
              ],
            }
          : {}),
      };
      rows = foldRouteHistory(history);
    },
    event: () => {},
    routes: [
      {
        id: "X1-adapter",
        contract: "snapshot",
        retention: { kind: "complete", plan: () => [] },
        refusals: ["BasisNotAvailable"],
        eligible: (request, current) => !routeFuture(request, current),
        force: () => {
          taken = "";
        },
        read: async (request: RouteRequest) => {
          // The offline guard is explicit: A0 itself does not yet reject future positions (R31 D-X1).
          // It is tested unguarded below; this guard is not evidence that Q89c is implemented in XTDB.
          if (guardFuture && routeFuture(request, history))
            throw new RouteRefusal("BasisNotAvailable", "Offline driver refuses future cut");
          const basis = { ...request.basis, validAt: request.basis.validAt ?? history.now };
          const answer = await Effect.runPromise(
            adapter.query(
              request.entityId === undefined ? {} : { entityId: request.entityId },
              basis,
            ),
          );
          return { rows: answer, taken, basis: { ...request.basis, ...(request.basis.recordedAt === undefined ? {} : { recordedPosition: request.basis.recordedPosition ?? routeHead(history) }) } };
        },
      },
    ],
  };
};

it("XTDB A0 actual adapter agrees with replay across generated cuts (offline SQL client)", async () => {
  const history = generateRouteHistory(89, 16);
  const result = await runRouteEquivalence({
    fixture: fixture(),
    history,
    scope: { shapes: ["L", "V", "P", "T", "TP"] },
    requests: generateRouteBases(history).filter((request) => !request.history),
  });
  expect(result.violations).toEqual([]);
  expect(result.observations.length).toBeGreaterThan(1000);
}, 30_000);

it("documents that the offline reference refuses a future cut", () => {
  expect(() =>
    replayRouteAnswer(generateRouteHistory(), { basis: { recordedPosition: 999999 } }),
  ).toThrow(RouteRefusal);
});

it("Q89c / R31 D-X1: A0 itself refuses a future position", async () => {
  const history = generateRouteHistory(89, 16);
  const result = await runRouteEquivalence({
    fixture: fixture(false),
    history,
    scope: { shapes: ["P"] },
    requests: [{ basis: { validAt: 2000, recordedPosition: 999999 } }],
  });
  expect(result.violations).toEqual([]);
});
