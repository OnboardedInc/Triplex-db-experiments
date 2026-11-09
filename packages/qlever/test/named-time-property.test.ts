import { Effect } from "effect";
import { it, expect } from "vitest";
import { stampOf } from "@triplex-build/triplex";
import {
  canonicalRouteValue,
  foldRouteHistory,
  generateRouteHistory,
  routeFuture,
  routeHead,
  routeWatermark,
  runNamedTimeSchedule,
  type RouteFixture,
  type RouteHistory,
} from "@triplex-build/triplex-testkit/route";
import { makeQleverStorageAdapter } from "../src/QleverStorageAdapter.js";
import { integerOrderKey, metaIri, assertionIri } from "../src/rdf.js";
import { makeRecordTimeClient } from "./fixtures/record-time-client.js";

it("all served named-T bytes remain stable on actual QLever committed and pending routes across random schedules", async () => {
  for (let seed = 1; seed <= 8; seed++) {
    const transport = makeRecordTimeClient();
    const adapter = makeQleverStorageAdapter(transport.client, "rq01-r3");
    let history: RouteHistory = { seed, now: 2000, commits: [] };
    let taken = "";
    const load = (next: RouteHistory) => {
      history = next;
      transport.records.clear();
      transport.records.set(
        metaIri,
        new Map([
          ["position", String(routeHead(history))],
          ["stamp", integerOrderKey(String(stampOf(routeWatermark(history))))],
        ]),
      );
      for (const row of foldRouteHistory(history))
        transport.records.set(
          assertionIri(row.id),
          new Map([
            ["_row", JSON.stringify(row)],
            ["entity_id", row.entity_id],
            ["attribute", row.attribute],
          ]),
        );
    };
    const fixture: RouteFixture = {
      lane: "qlever-actual-adapter-offline-client",
      reset: load,
      append: (commit) =>
        load({
          ...history,
          commits: [...history.commits, commit],
          ...(commit.receipt
            ? {
                attempts: [
                  ...(history.attempts ?? []),
                  {
                    id: commit.receipt.attemptId,
                    status: "committed" as const,
                    position: commit.position,
                    stagedAt: commit.stagedAt ?? commit.instant,
                    stagedOrder:
                      Math.max(0, ...(history.attempts ?? []).map((a) => a.stagedOrder)) + 1,
                    decidedOrder:
                      Math.max(0, ...(history.attempts ?? []).map((a) => a.decidedOrder)) + 1,
                  },
                ],
              }
            : {}),
        }),
      event: () => {},
      routes: [false, true].map((pending) => ({
        id: pending ? "pending" : "committed",
        contract: "snapshot",
        retention: { kind: "complete", plan: () => [] },
        refusals: ["BasisNotAvailable"],
        eligible: (r, h) => !routeFuture(r, h),
        force: () => {
          taken = pending ? "pending" : "committed";
        },
        read: async (request) => {
          const effect = adapter.query(
            {},
            { ...request.basis, validAt: request.basis.validAt ?? history.now },
          );
          const rows = await Effect.runPromise(pending ? adapter.withTransaction(effect) : effect);
          return { rows, taken, basis: { ...request.basis, recordedPosition: routeHead(history) } };
        },
      })),
    };
    const result = await runNamedTimeSchedule({
      fixture,
      history: generateRouteHistory(seed, 16 + seed),
      seed,
      availableOnly: true,
    });
    expect(canonicalRouteValue(result.violations)).toBe("[]");
    expect(result.comparisons).toBeGreaterThan(40);
  }
}, 30000);
