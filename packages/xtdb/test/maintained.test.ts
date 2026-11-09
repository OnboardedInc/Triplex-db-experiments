import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { EntityId, Triples, ref, integer } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import {
  makeXtdbClient,
  makeXtdbRuntime,
  makeXtdbMaintainedQueries,
} from "@triplex-build/triplex-xtdb";

describe.skipIf(process.env["XTDB_INTEGRATION"] !== "1")(
  "XTDB maintained complete generations",
  () => {
    it("reuses persisted generations and preserves alternate recursive support through deletion", async () => {
      const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb";
      const scope = DatabaseScope.test(`maintained-${randomUUID()}`);
      const client = makeXtdbClient(url);
      const query = {
        find: ["?a", "?b"],
        where: [["reachable", "?a", "?b"]],
        rules: [
          { name: "reachable", body: [["?a", ":graph/edge", "?b"]] },
          {
            name: "reachable",
            body: [
              ["?a", ":graph/edge", "?via"],
              ["reachable", "?via", "?b"],
            ],
            maxDepth: 10,
          },
        ],
      } as const;
      const maintained = makeXtdbMaintainedQueries(client, scope);
      const has = (rows: readonly Record<string, unknown>[], a: string, b: string) =>
        rows.some((row) => row["?a"] === a && row["?b"] === b);
      try {
        await Effect.runPromise(
          Effect.gen(function* () {
            const triples = yield* Triples;
            const facts = yield* triples.assertBatch(
              [
                ["a", "b"],
                ["a", "c"],
                ["b", "d"],
                ["c", "d"],
              ].map(([a, b]) => ({
                entityId: EntityId.make(a!),
                attribute: ":graph/edge",
                value: ref(EntityId.make(b!)),
                validFrom: 0,
              })),
            );
            const position = yield* triples.currentPosition();
            // [EXP-C8] query() is read-only: before publication it answers directly, unpublished.
            const direct = yield* maintained.query(query, { validAt: 1 });
            expect(direct.reused).toBe(false);
            expect(direct.results).toHaveLength(5);
            const first = yield* maintained.publish(query, { validAt: 1 });
            expect(first.reused).toBe(false);
            expect(first.generation).toBe(direct.generation);
            expect(first.results).toEqual(direct.results);
            const reused = yield* makeXtdbMaintainedQueries(client, scope).query(query, {
              validAt: 1,
            });
            expect(reused.reused).toBe(true);
            expect(reused.generation).toBe(first.generation);
            yield* triples.retract(facts[0]!.id);
            const alternate = yield* maintained.publish(query, { validAt: 1 });
            expect(alternate.reused).toBe(false);
            expect(alternate.results).toHaveLength(4);
            expect(has(alternate.results, "a", "d")).toBe(true);
            yield* triples.retract(facts[1]!.id);
            const removed = yield* maintained.query(query, { validAt: 1 });
            expect(removed.results).toHaveLength(2);
            expect(has(removed.results, "a", "d")).toBe(false);
            const historical = yield* maintained.query(query, {
              validAt: 1,
              recordedPosition: position,
            });
            expect(historical.reused).toBe(true);
            expect(historical.results).toHaveLength(5);
            const denied = yield* Effect.exit(maintained.query(query, { validAt: 1, maxRows: 1 }));
            expect(denied._tag).toBe("Failure");
          }).pipe(
            Effect.provide(
              makeXtdbRuntime({ url }).layer({ scope, capabilities: Capabilities.none }),
            ),
            Effect.scoped,
          ),
        );
      } finally {
        await client.close();
      }
    });

    it("retains exact sums and explicit result order in persisted generations", async () => {
      const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb";
      const scope = DatabaseScope.test(`maintained-int-${randomUUID()}`);
      const client = makeXtdbClient(url);
      try {
        await Effect.runPromise(
          Effect.gen(function* () {
            const triples = yield* Triples;
            yield* triples.assertBatch(
              ["1", "9223372036854775806"].map((value, index) => ({
                entityId: EntityId.make(`account:${index}`),
                attribute: ":account/balance",
                value: integer(value),
                validFrom: 0,
              })),
            );
            const maintained = makeXtdbMaintainedQueries(client, scope);
            const sumQuery = {
              find: ["?sum"],
              where: [["?account", ":account/balance", "?value"]],
              aggregate: [["sum", "?value", "?sum"]],
            } as const;
            const first = yield* maintained.publish(sumQuery, { validAt: 1 });
            expect(first.results).toEqual([{ "?sum": integer("9223372036854775807") }]);
            const cached = yield* maintained.query(sumQuery, { validAt: 1 });
            expect(cached.reused).toBe(true);
            expect(cached.results).toEqual(first.results);
            const ordered = yield* maintained.query(
              {
                find: ["?value"],
                where: [["?account", ":account/balance", "?value"]],
                orderBy: [{ variable: "?value", direction: "desc" }],
              },
              { validAt: 1 },
            );
            expect(ordered.results).toEqual([
              { "?value": integer("9223372036854775806") },
              { "?value": integer("1") },
            ]);
            yield* triples.assertBatch(
              ["2", "10"].map((value) => ({
                entityId: EntityId.make(`group:${value}`),
                attribute: ":group/balance",
                value: integer(value),
                validFrom: 0,
              })),
            );
            const grouped = {
              find: ["?group", "?sum"],
              where: [["?group", ":group/balance", "?value"]],
              aggregate: [["sum", "?value", "?sum"]],
              orderBy: [{ variable: "?sum", direction: "asc" }],
            } as const;
            const directGroups = yield* maintained.query(grouped, { validAt: 1 });
            expect(directGroups.reused).toBe(false);
            const orderedGroups = yield* maintained.publish(grouped, { validAt: 1 });
            expect(orderedGroups.results).toEqual(directGroups.results);
            expect(orderedGroups.results.map((row) => row["?sum"])).toEqual([
              integer("2"),
              integer("10"),
            ]);
            const reusedGroups = yield* maintained.query(grouped, { validAt: 1 });
            expect(reusedGroups.reused).toBe(true);
            expect(reusedGroups.results).toEqual(orderedGroups.results);
          }).pipe(
            Effect.provide(
              makeXtdbRuntime({ url }).layer({ scope, capabilities: Capabilities.none }),
            ),
            Effect.scoped,
          ),
        );
      } finally {
        await client.close();
      }
    });
  },
);
