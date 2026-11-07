import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Context, Effect } from "effect";
import { EntityId, Triples, integer, number } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope, StorageAdapter } from "@triplex-build/triplex/runtime";
import { makeXtdbRuntime } from "../src/index.js";

const fresh = () =>
  makeXtdbRuntime({
    url: process.env.XTDB_URL ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb",
  }).layer({
    scope: DatabaseScope.test(`integers-${randomUUID()}`),
    capabilities: Capabilities.none,
  });
describe.skipIf(process.env.XTDB_INTEGRATION !== "1")("XTDB exact signed integers", () => {
  it("keeps unhinted pending integers after an earlier non-integer overlay proof", async () => {
    const capabilities = { build: Effect.map(StorageAdapter, adapter => ({ capabilities: [], services: Context.make(StorageAdapter, adapter) })) };
    const layer = makeXtdbRuntime({ url: process.env.XTDB_URL ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb" }).layer({ scope: DatabaseScope.test(`overlay-integer-${randomUUID()}`), capabilities });
    await Effect.runPromise(Effect.gen(function* () {
      const triples = yield* Triples;
      const adapter = yield* StorageAdapter;
      yield* adapter.withTransaction(Effect.gen(function* () {
        const transaction = triples;
        yield* transaction.assert({ entityId: EntityId.make("number"), attribute: ":overlay/value", value: number(7) });
        const numbers = yield* transaction.queryAll({ find: ["?value"], where: [["?e", ":overlay/value", "?value"]] });
        expect(numbers.results).toEqual([{ "?value": 7 }]);
        yield* transaction.assert({ entityId: EntityId.make("integer"), attribute: ":overlay/exact", value: integer("9223372036854775807") });
        const exact = yield* transaction.queryAll({ find: ["?value"], where: [["?e", ":overlay/exact", "?value"]] });
        expect(exact.results).toEqual([{ "?value": integer("9223372036854775807") }]);
      }));
      const exact = yield* triples.queryAll({ find: ["?value"], where: [["?e", ":overlay/exact", "?value"]] });
      expect(exact.results).toEqual([{ "?value": integer("9223372036854775807") }]);
      const numbers = yield* triples.queryAll({ find: ["?value"], where: [["?e", ":overlay/value", "?value"], ["<=", "?value", 10]], orderBy: [{ variable: "?value", direction: "asc" }] });
      expect(numbers.results).toEqual([{ "?value": 7 }]);
    }).pipe(Effect.provide(layer), Effect.scoped));
  });
  it("preserves signed64 boundaries, exact comparisons, joins and cursor order", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const values = [
          "9223372036854775807",
          "-9223372036854775808",
          "9007199254740993",
          "-10",
          "-2",
          "0",
          "2",
          "10",
        ];
        yield* triples.assertBatch(
          values.map((value, index) => ({
            entityId: EntityId.make(`i${index}`),
            attribute: ":i",
            value: integer(value),
          })),
        );
        const query = {
          find: ["?i"],
          where: [["?e", ":i", "?i"]],
          orderBy: [{ variable: "?i" }],
        } as const;
        const actual: unknown[] = [];
        let cursor: string | undefined;
        do {
          const page = yield* triples.query(query, { pageSize: 2, ...(cursor ? { cursor } : {}) });
          actual.push(...page.results.map((row) => row["?i"]));
          cursor = page.nextCursor;
        } while (cursor);
        expect(actual).toEqual(
          [...values].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1)).map(integer),
        );
        const greater = yield* triples.queryAll({
          ...query,
          where: [
            ["?e", ":i", "?i"],
            [">", "?i", integer("9007199254740992")],
          ],
        });
        expect(greater.results.map((row) => row["?i"])).toEqual([
          integer("9007199254740993"),
          integer("9223372036854775807"),
        ]);
        const exact = yield* triples.queryAll({
          find: ["?e"],
          where: [["?e", ":i", integer("9007199254740993")]],
        });
        expect(exact.results).toEqual([{ "?e": "i2" }]);
        const joined = yield* triples.queryAll({
          find: ["?a", "?b"],
          where: [
            ["?a", ":i", "?i"],
            ["?b", ":i", "?i"],
            ["=", "?i", integer("9007199254740993")],
          ],
        });
        expect(joined.results).toEqual([{ "?a": "i2", "?b": "i2" }]);
      }).pipe(Effect.provide(fresh()), Effect.scoped),
    );
  });

  it("keeps exact sums and group identity, rejecting overflow and mixed numeric domains", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.assertBatch([
          { entityId: EntityId.make("a"), attribute: ":small", value: integer("2") },
          { entityId: EntityId.make("b"), attribute: ":small", value: integer("3") },
          {
            entityId: EntityId.make("a"),
            attribute: ":big",
            value: integer("9223372036854775807"),
          },
          { entityId: EntityId.make("b"), attribute: ":big", value: integer("1") },
          { entityId: EntityId.make("a"), attribute: ":mixed", value: integer("2") },
          {
            entityId: EntityId.make("b"),
            attribute: ":mixed",
            value: { type: "number", value: 2 },
          },
        ]);
        const sum = (attribute: string) =>
          ({
            find: ["?sum"],
            where: [["?e", attribute, "?v"]],
            aggregate: [["sum", "?v", "?sum"]],
          }) as const;
        expect((yield* triples.queryAll(sum(":small"))).results).toEqual([
          { "?sum": integer("5") },
        ]);
        const overflow = yield* triples.queryAll(sum(":big")).pipe(Effect.flip);
        expect(String(overflow)).toMatch(/integer|range|represent/i);
        const mixed = yield* triples.queryAll(sum(":mixed")).pipe(Effect.flip);
        expect(String(mixed)).toMatch(/Mixed exact integer/);
        const selected = yield* triples.queryAll({
          find: ["?sum"],
          where: [["a", ":mixed", "?v"]],
          aggregate: [["sum", "?v", "?sum"]],
        });
        expect(selected.results).toEqual([{ "?sum": integer("2") }]);
        yield* triples.assert({
          entityId: EntityId.make("a"),
          attribute: ":selected",
          value: { type: "boolean", value: true },
        });
        const joined = yield* triples.queryAll({
          find: ["?sum"],
          where: [
            ["?e", ":selected", true],
            ["?e", ":mixed", "?v"],
          ],
          aggregate: [["sum", "?v", "?sum"]],
        });
        expect(joined.results).toEqual([{ "?sum": integer("2") }]);
        const grouped = yield* triples.queryAll({
          find: ["?i", "?count"],
          where: [["?e", ":small", "?i"]],
          aggregate: [["count", "?e", "?count"]],
          orderBy: [{ variable: "?i" }],
        });
        expect(grouped.results).toEqual([
          { "?count": 1, "?i": integer("2") },
          { "?count": 1, "?i": integer("3") },
        ]);
      }).pipe(Effect.provide(fresh()), Effect.scoped),
    );
  });

  it("uses exact extrema and numeric wrapper/HAVING comparisons across signed64", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.assertBatch([
          {
            entityId: EntityId.make("low"),
            attribute: ":bounds",
            value: integer("-9223372036854775808"),
          },
          {
            entityId: EntityId.make("high"),
            attribute: ":bounds",
            value: integer("9223372036854775807"),
          },
          { entityId: EntityId.make("nine"), attribute: ":nine", value: integer("9") },
        ]);
        const extrema = yield* triples.queryAll({
          find: ["?min", "?max"],
          where: [["?e", ":bounds", "?i"]],
          aggregate: [
            ["min", "?i", "?min"],
            ["max", "?i", "?max"],
          ],
        });
        expect(extrema.results).toEqual([
          { "?min": integer("-9223372036854775808"), "?max": integer("9223372036854775807") },
        ]);
        const inner = {
          find: ["?sum"],
          where: [["?e", ":nine", "?i"]],
          aggregate: [["sum", "?i", "?sum"]],
        } as const;
        const greater = yield* triples.queryPage({
          inner,
          filters: [{ column: "?sum", op: ">", value: integer("10") }],
          includeCount: true,
        });
        expect(greater.results).toEqual([]);
        const smaller = yield* triples.queryPage({
          inner,
          filters: [{ column: "?sum", op: "<", value: integer("10") }],
        });
        expect(smaller.results).toEqual([{ "?sum": integer("9") }]);
        const stringFilter = yield* triples
          .queryPage({ inner, filters: [{ column: "?sum", op: "=", value: "9" }] })
          .pipe(Effect.flip);
        expect(String(stringFilter)).toMatch(/numeric/);
        const mixedFilter = yield* triples
          .queryPage({ inner, filters: [{ column: "?sum", op: ">", value: 1 }] })
          .pipe(Effect.flip);
        expect(String(mixedFilter)).toMatch(/Mixed exact integer/);
        expect(
          (yield* triples.queryAll({ ...inner, having: [[">", "?sum", integer("10")]] })).results,
        ).toEqual([]);
        expect((yield* triples.queryAll({ ...inner, having: [["=", "?sum", 9]] })).results).toEqual(
          [],
        );
        const mixedHaving = yield* triples
          .queryAll({ ...inner, having: [[">", "?sum", 1]] })
          .pipe(Effect.flip);
        expect(String(mixedHaving)).toMatch(/Mixed exact integer/);
        const computed = {
          find: ["?next"],
          where: [["?e", ":nine", "?i"]],
          compute: [["+", "?i", integer("1"), "?next"]],
        } as const;
        expect(
          (yield* triples.queryPage({
            inner: computed,
            filters: [{ column: "?next", op: ">", value: integer("9") }],
          })).results,
        ).toEqual([{ "?next": integer("10") }]);
      }).pipe(Effect.provide(fresh()), Effect.scoped),
    );
  });
});
