import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { EntityId, Triples, integer } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeXtdbRuntime } from "../src/index.js";

const fresh = () =>
  makeXtdbRuntime({
    url: process.env.XTDB_URL ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb",
  }).layer({
    scope: DatabaseScope.test(`computed-${randomUUID()}`),
    capabilities: Capabilities.none,
  });
describe.skipIf(process.env.XTDB_INTEGRATION !== "1")("XTDB computed Triplex bindings", () => {
  it("pushes arithmetic, dependency ordering, filters and aggregation into SQL", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.assertBatch(
          [2, 3].map((value) => ({
            entityId: EntityId.make(`n${value}`),
            attribute: ":n",
            value: { type: "number", value },
          })),
        );
        const computed = yield* triples.queryAll({
          find: ["?shift"],
          where: [
            ["?e", ":n", "?n"],
            [">", "?shift", 5],
          ],
          compute: [
            ["+", "?double", 1, "?shift"],
            ["*", "?n", 2, "?double"],
          ],
        });
        expect(computed.results).toEqual([{ "?shift": 7 }]);
        const summed = yield* triples.queryAll({
          find: ["?sum"],
          where: [["?e", ":n", "?n"]],
          compute: [["*", "?n", 2, "?double"]],
          aggregate: [["sum", "?double", "?sum"]],
        });
        expect(summed.results).toEqual([{ "?sum": 10 }]);
        const modulo = yield* triples.queryAll({
          find: ["?mod"],
          where: [["n3", ":n", "?n"]],
          compute: [["%", "?n", 2, "?mod"]],
        });
        expect(modulo.results).toEqual([{ "?mod": 1 }]);
        const zero = yield* triples
          .queryAll({
            find: ["?bad"],
            where: [["n3", ":n", "?n"]],
            compute: [["/", "?n", 0, "?bad"]],
          })
          .pipe(Effect.flip);
        expect(String(zero)).toMatch(/zero|represent|finite|division/i);
      }).pipe(Effect.provide(fresh()), Effect.scoped),
    );
  });

  it("checks exact arithmetic boundaries and truncates integer division toward zero", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.assertBatch([
          { entityId: EntityId.make("big"), attribute: ":i", value: integer("9007199254740993") },
          { entityId: EntityId.make("negative"), attribute: ":i", value: integer("-5") },
          {
            entityId: EntityId.make("max"),
            attribute: ":i",
            value: integer("9223372036854775807"),
          },
        ]);
        // [EXP-X02-R2] Why: Q79c permits typed refusal instead of rounded exact arithmetic.
        // Rejected: keeping the old success assertion (it accepted a DECIMAL -> BIGINT cast).
        for (const op of ["+", "-", "*", "/", "%"] as const) {
          const failure = yield* triples
            .queryAll({
              find: ["?next"],
              where: [["big", ":i", "?i"]],
              compute: [[op, "?i", integer("1"), "?next"]],
            })
            .pipe(Effect.flip);
          expect(failure._tag).toBe("DatalogValidationError");
          expect(String(failure)).toContain("Exact integer computation is not qualified");
        }
        const mixed = yield* triples
          .queryAll({
            find: ["?bad"],
            where: [["big", ":i", "?i"]],
            compute: [["+", "?i", 1, "?bad"]],
          })
          .pipe(Effect.flip);
        expect(String(mixed)).toMatch(/Mixed exact integer/);
      }).pipe(Effect.provide(fresh()), Effect.scoped),
    );
  });

  it("keeps ordinary number aggregates and computations in binary64 beyond native-i64", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        yield* triples.assertBatch([
          {
            entityId: EntityId.make("safe"),
            attribute: ":round",
            value: { type: "number", value: Number.MAX_SAFE_INTEGER },
          },
          {
            entityId: EntityId.make("one"),
            attribute: ":round",
            value: { type: "number", value: 1 },
          },
          {
            entityId: EntityId.make("large1"),
            attribute: ":large",
            value: { type: "number", value: 9e18 },
          },
          {
            entityId: EntityId.make("large2"),
            attribute: ":large",
            value: { type: "number", value: 9e18 },
          },
        ]);
        const sum = (attribute: string) =>
          ({
            find: ["?sum"],
            where: [["?e", attribute, "?n"]],
            aggregate: [["sum", "?n", "?sum"]],
          }) as const;
        expect((yield* triples.queryAll(sum(":round"))).results).toEqual([
          { "?sum": 9007199254740992 },
        ]);
        expect((yield* triples.queryAll(sum(":large"))).results).toEqual([{ "?sum": 1.8e19 }]);
        const doubled = yield* triples.queryAll({
          find: ["?double"],
          where: [["large1", ":large", "?n"]],
          compute: [["*", "?n", 2, "?double"]],
        });
        expect(doubled.results).toEqual([{ "?double": 1.8e19 }]);
      }).pipe(Effect.provide(fresh()), Effect.scoped),
    );
  });
});
