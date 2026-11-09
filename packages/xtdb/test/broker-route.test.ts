import { Effect } from "effect";
import { expect, it } from "vitest";
import {
  makeBrokerStorageAdapter,
  BasisNotAvailable,
  type HostBroker,
} from "@triplex-build/triplex-broker";
import {
  foldRouteHistory,
  generateRouteBases,
  generateRouteHistory,
  runRouteEquivalence,
  routeHead,
  RouteRefusal,
  type RouteFixture,
  type RouteHistory,
} from "@triplex-build/triplex-testkit/route";
import { makeXtdbBrokerReplica } from "../src/BrokerReplica.js";
import { ModelXtdbClient } from "./p2b/model.js";

// [EXP-P2B] Why: exercise the actual XTDB read driver and broker adapter against /route's generated oracle.
// Rejected: passing model rows straight to the harness (would skip query selection and cut masking).
const fixture = (): RouteFixture => {
  let history: RouteHistory = generateRouteHistory(89, 16),
    forced = "replica",
    taken = "";
  const client = new ModelXtdbClient();
  const broker = {
    head: () => routeHead(history),
    recordInstant: () => Math.max(0, ...history.commits.map((commit) => commit.instant)),
    awaitResolved: async (b: number) => {
      if (b > routeHead(history))
        throw new BasisNotAvailable({
          required: b,
          observed: routeHead(history),
          replica: "offline source",
          surface: "repository",
          waitedMs: 0,
        });
    },
    overlayAsync: async (_marker: number, _selection: unknown, select: (row: any) => boolean) =>
      forced === "log" ? undefined : foldRouteHistory(history).filter(select),
    fromLogAsync: async (_marker: number, _selection: unknown, select: (row: any) => boolean) =>
      foldRouteHistory(history).filter(select),
    pullAt: async () => ({ eligible: false, rows: [] }),
  } as unknown as HostBroker;
  const adapter = makeBrokerStorageAdapter(
    makeXtdbBrokerReplica(client, "scope"),
    "scope",
    broker,
    {
      basisWaitMs: 0,
      onRead: (event) => {
        taken = event.route;
      },
    },
  );
  return {
    lane: "xtdb-behind-broker-actual-driver-offline",
    reset: (next) => {
      history = next;
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
    },
    event: () => {},
    routes: ["replica", "overlay", "log", "outage"].map((route) => ({
      id: route,
      contract: "snapshot",
      retention: { kind: "complete", plan: () => [] },
      refusals: ["BasisNotAvailable"],
      eligible: (request) =>
        (route === "replica" || (request.basis.recordedPosition ?? routeHead(history)) > 0) &&
        (request.basis.recordedPosition ?? 0) <= routeHead(history) &&
        (request.basis.recordedAt ?? 0) <= broker.recordInstant()!,
      force: () => {
        forced = route;
        taken = "";
        client.unavailable = route === "outage";
        client.rows =
          route === "replica"
            ? new Map(foldRouteHistory(history).map((row) => [row.id, row]))
            : new Map();
        client.marker = {
          position: route === "replica" ? routeHead(history) : 0,
          epoch: 1,
          incarnation: "offline",
        };
      },
      read: async (request) => {
        try {
          if (route !== "replica" && (request.basis.recordedPosition ?? routeHead(history)) === 0)
            throw new RouteRefusal(
              "BasisNotAvailable",
              "Forced non-replica arm requires a nonzero basis",
            );
          const rows = await Effect.runPromise(
            adapter.query(request.entityId === undefined ? {} : { entityId: request.entityId }, {
              ...request.basis,
              validAt: request.basis.validAt ?? history.now,
            }),
          );
          // Before any overlay is needed, the adapter correctly uses its already-eligible replica.
          return {
            rows,
            taken: route === "outage" && taken === "log" ? "outage" : taken,
            basis: request.basis,
          };
        } catch (cause) {
          if ((cause as { reason?: string }).reason === "basis-not-reached")
            throw new RouteRefusal("BasisNotAvailable", "offline basis gate refused");
          throw cause;
        }
      },
    })),
  };
};
it("broker XTDB routes agree with replay for pinned L/V/P/T/TP reads, including after retirement and outage", async () => {
  const history = generateRouteHistory(89, 16);
  // Q90 future record-time watermark semantics are tested separately; /route at this base models T > head as readable.
  const requests = generateRouteBases(history).filter(
    (request) =>
      !request.history &&
      (request.basis.recordedAt ?? 0) <=
        Math.max(...history.commits.map((commit) => commit.instant)),
  );
  const result = await runRouteEquivalence({
    fixture: fixture(),
    history,
    requests,
    scope: { shapes: ["L", "V", "P", "T", "TP"] },
  });
  expect(result.violations).toEqual([]);
  expect(result.observations.length).toBeGreaterThan(1000);
}, 30000);
