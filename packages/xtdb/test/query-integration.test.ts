import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { EntityId, Triples, ref } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeXtdbRuntime } from "../src/index.js";

const enabled = process.env.XTDB_INTEGRATION === "1";
const fresh = () =>
  makeXtdbRuntime({
    url: process.env.XTDB_URL ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb",
  }).layer({
    scope: DatabaseScope.test(`query-integration-${randomUUID()}`),
    capabilities: Capabilities.none,
    deterministic: { startTime: 1_000, seed: randomUUID() },
  });
const edge = (from: string, to: string) => ({
  entityId: EntityId.make(from),
  attribute: ":parent",
  value: ref(EntityId.make(to)),
});
const ancestor = (maxDepth = 100) =>
  [
    { name: "ancestor", maxDepth, body: [["?x", ":parent", "?y"]] },
    {
      name: "ancestor",
      maxDepth,
      body: [
        ["?x", ":parent", "?z"],
        ["ancestor", "?z", "?y"],
      ],
    },
  ] as const;

describe.skipIf(!enabled)("XTDB native query integration", () => {
  it("executes joins, duplicate-sensitive sums, scalar families and anti-joins", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.assertBatch([
          {
            entityId: EntityId.make("a"),
            attribute: ":score",
            value: { type: "number", value: 5 },
          },
          {
            entityId: EntityId.make("b"),
            attribute: ":score",
            value: { type: "number", value: 5 },
          },
          {
            entityId: EntityId.make("c"),
            attribute: ":score",
            value: { type: "string", value: "5" },
          },
          {
            entityId: EntityId.make("b"),
            attribute: ":blocked",
            value: { type: "boolean", value: true },
          },
          {
            entityId: EntityId.make("a"),
            attribute: ":name",
            value: { type: "string", value: "Ada" },
          },
          {
            entityId: EntityId.make("b"),
            attribute: ":name",
            value: { type: "string", value: "Bert" },
          },
        ]);
        const aggregate = yield* triples.queryAll({
          find: ["?count", "?sum"],
          where: [
            ["?e", ":score", "?score"],
            [">", "?score", 0],
          ],
          aggregate: [
            ["count", "?score", "?count"],
            ["sum", "?score", "?sum"],
          ],
        });
        expect(aggregate.results).toEqual([{ "?count": 1, "?sum": 10 }]);
        const joined = yield* triples.queryAll({
          find: ["?name"],
          where: [
            ["?e", ":name", "?name"],
            ["?e", ":score", 5],
            ["not", ["?e", ":blocked", true]],
          ],
        });
        expect(joined.results).toEqual([{ "?name": "Ada" }]);
        const conjunctive = yield* triples.queryAll({
          find: ["?name"],
          where: [
            ["?e", ":name", "?name"],
            ["not", ["?e", ":blocked", true], ["?e", ":score", 5]],
          ],
        });
        expect(conjunctive.results).toEqual([{ "?name": "Ada" }]);
        const page = yield* triples.queryPage({
          inner: { find: ["?name"], where: [["?e", ":name", "?name"]] },
          filters: [{ column: "?name", op: "ilike", value: "%AD%" }],
          includeCount: true,
          limit: 1,
        });
        expect(page.results).toEqual([{ "?name": "Ada" }]);
        expect(page.totalCount).toBe(1);
      }).pipe(Effect.provide(fresh()), Effect.scoped),
    );
  });

  it("completes cyclic rules in XTDB and keeps cursor results through corrections", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const rows = yield* triples.assertBatch([
          edge("a", "b"),
          edge("a", "c"),
          edge("b", "d"),
          edge("c", "d"),
          edge("d", "b"),
        ]);
        const inner = {
          find: ["?dest"],
          where: [["ancestor", "a", "?dest"]],
          rules: ancestor(),
        } as const;
        const first = yield* triples.queryPage({ inner, limit: 1, includeCount: true });
        expect(first.results).toEqual([{ "?dest": "b" }]);
        expect(first.totalCount).toBe(3);
        yield* triples.retract(rows[2]!.id);
        const continuation = yield* triples.queryPage({
          inner,
          limit: 1,
          includeCount: true,
          cursor: first.nextCursor!,
        });
        expect(continuation.results).toEqual([{ "?dest": "c" }]);
        expect(continuation.totalCount).toBe(3);
        const latest = yield* triples.queryAll(inner);
        expect(latest.results.map((row) => row["?dest"]).sort()).toEqual(["b", "c", "d"]);
        const removed = yield* triples.queryAll({ ...inner, where: [["ancestor", "b", "?dest"]] });
        expect(removed.results).toEqual([]);
        const count = yield* triples.queryAll({
          find: ["?count"],
          where: [["ancestor", "a", "?dest"]],
          rules: ancestor(),
          aggregate: [["count", "?dest", "?count"]],
        });
        expect(count.results).toEqual([{ "?count": 3 }]);
      }).pipe(Effect.provide(fresh()), Effect.scoped),
    );
  });

  it("respects bounded recursion depth on deep chains", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.assertBatch(
          Array.from({ length: 8 }, (_, index) => edge(`n${index}`, `n${index + 1}`)),
        );
        const result = yield* triples.queryAll({
          find: ["?dest"],
          where: [["ancestor", "n0", "?dest"]],
          rules: ancestor(1),
        });
        expect(result.results.map((row) => row["?dest"]).sort()).toEqual(["n1", "n2"]);
      }).pipe(Effect.provide(fresh()), Effect.scoped),
    );
  });
});
