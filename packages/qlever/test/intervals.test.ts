import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { EntityId, Triples, string, boolean, integer } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope, ReadError } from "@triplex-build/triplex/runtime";
import { makeQleverClient, makeQleverRuntime, makeQleverTemporalQueries } from "../src/index.js";

const url = process.env["QLEVER_URL"] ?? "http://127.0.0.1:7019";
describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")(
  "QLever bounded public interval provider",
  () => {
    it("coalesces adjacent support, preserves gaps, and pins historical corrections", async () => {
      const scope = DatabaseScope.test(`interval-history:${randomUUID()}`),
        client = makeQleverClient(url),
        temporal = makeQleverTemporalQueries(client, scope);
      await Effect.runPromise(
        Effect.gen(function* () {
          const t = yield* Triples,
            e = EntityId.make("machine:one");
          const original = yield* t.transact([
            {
              op: "assert",
              entityId: e,
              attribute: ":status",
              value: string("up"),
              validFrom: 0,
              validTo: 4,
            },
            {
              op: "assert",
              entityId: e,
              attribute: ":status",
              value: string("up"),
              validFrom: 4,
              validTo: 6,
            },
            {
              op: "assert",
              entityId: e,
              attribute: ":status",
              value: string("up"),
              validFrom: 8,
              validTo: 10,
            },
          ]);
          const query = { find: ["?e"], where: [["?e", ":status", "up"]] } as const;
          expect(yield* temporal.queryIntervals(query, { from: 0, to: 10 })).toEqual([
            { bindings: { "?e": "machine:one" }, validFrom: 0, validTo: 6 },
            { bindings: { "?e": "machine:one" }, validFrom: 8, validTo: 10 },
          ]);
          yield* Effect.sleep("2 millis");
          yield* t.transact([
            { op: "retract", id: original.triples[1]!.id },
            {
              op: "assert",
              entityId: e,
              attribute: ":status",
              value: string("down"),
              validFrom: 4,
              validTo: 6,
            },
          ]);
          expect(
            yield* temporal.queryIntervals(query, {
              from: 0,
              to: 10,
              recordedPosition: original.position,
            }),
          ).toEqual([
            { bindings: { "?e": "machine:one" }, validFrom: 0, validTo: 6 },
            { bindings: { "?e": "machine:one" }, validFrom: 8, validTo: 10 },
          ]);
          expect(yield* temporal.queryIntervals(query, { from: 0, to: 10 })).toEqual([
            { bindings: { "?e": "machine:one" }, validFrom: 0, validTo: 4 },
            { bindings: { "?e": "machine:one" }, validFrom: 8, validTo: 10 },
          ]);
          expect(
            yield* temporal
              .queryIntervals(query, { from: 0, to: 10, maxSpans: 1 })
              .pipe(Effect.flip),
          ).toBeInstanceOf(ReadError);
        }).pipe(
          Effect.provide(
            makeQleverRuntime({ url }).layer({ scope, capabilities: Capabilities.none }),
          ),
          Effect.scoped,
        ),
      );
    }, 60000);
    it("discovers dynamic and negated boundaries without changing variable names", async () => {
      const scope = DatabaseScope.test(`interval-negation:${randomUUID()}`),
        client = makeQleverClient(url),
        temporal = makeQleverTemporalQueries(client, scope);
      await Effect.runPromise(
        Effect.gen(function* () {
          const t = yield* Triples,
            e = EntityId.make("e");
          yield* t.assertBatch([
            { entityId: e, attribute: ":name", value: string("NaN"), validFrom: 0, validTo: 10 },
            { entityId: e, attribute: ":state", value: string("x"), validFrom: 0, validTo: 5 },
            { entityId: e, attribute: ":state", value: string("y"), validFrom: 5, validTo: 10 },
            { entityId: e, attribute: ":down", value: boolean(true), validFrom: 3, validTo: 4 },
          ]);
          const dynamic = yield* temporal.queryIntervals(
            {
              find: ["?NaN", "?a", "?v"],
              where: [
                ["?e", ":name", "?NaN"],
                ["?e", "?a", "?v"],
              ],
            },
            { from: 0, to: 10 },
          );
          expect(dynamic).toEqual(
            expect.arrayContaining([
              {
                bindings: { "?NaN": "NaN", "?a": ":name", "?v": "NaN" },
                validFrom: 0,
                validTo: 10,
              },
              { bindings: { "?NaN": "NaN", "?a": ":state", "?v": "x" }, validFrom: 0, validTo: 5 },
              { bindings: { "?NaN": "NaN", "?a": ":state", "?v": "y" }, validFrom: 5, validTo: 10 },
            ]),
          );
          const absent = yield* temporal.queryIntervals(
            {
              find: ["?e"],
              where: [
                ["?e", ":name", "NaN"],
                ["not", ["?e", ":down", true]],
              ],
            },
            { from: 0, to: 10 },
          );
          expect(absent).toEqual([
            { bindings: { "?e": "e" }, validFrom: 0, validTo: 3 },
            { bindings: { "?e": "e" }, validFrom: 4, validTo: 10 },
          ]);
        }).pipe(
          Effect.provide(
            makeQleverRuntime({ url }).layer({ scope, capabilities: Capabilities.none }),
          ),
          Effect.scoped,
        ),
      );
    }, 60000);
    it("retains integer aggregate values and empty-result meaning across spans", async () => {
      const scope = DatabaseScope.test(`interval-integer:${randomUUID()}`),
        client = makeQleverClient(url),
        temporal = makeQleverTemporalQueries(client, scope);
      await Effect.runPromise(
        Effect.gen(function* () {
          const t = yield* Triples;
          yield* t.assert({
            entityId: EntityId.make("ledger"),
            attribute: ":amount",
            value: integer("9007199254740993"),
            validFrom: 5,
            validTo: 10,
          });
          const result = yield* temporal.queryIntervals(
            {
              find: ["?sum"],
              where: [["?e", ":amount", "?v"]],
              aggregate: [["sum", "?v", "?sum"]],
            },
            { from: 0, to: 10 },
          );
          expect(result).toEqual([
            { bindings: { "?sum": null }, validFrom: 0, validTo: 5 },
            { bindings: { "?sum": integer("9007199254740993") }, validFrom: 5, validTo: 10 },
          ]);
        }).pipe(
          Effect.provide(
            makeQleverRuntime({ url }).layer({ scope, capabilities: Capabilities.none }),
          ),
          Effect.scoped,
        ),
      );
    }, 60000);
    it("discovers boundaries used only by optional projection fields", async () => {
      const scope = DatabaseScope.test(`interval-optional:${randomUUID()}`),
        client = makeQleverClient(url),
        temporal = makeQleverTemporalQueries(client, scope);
      await Effect.runPromise(
        Effect.gen(function* () {
          const t = yield* Triples,
            e = EntityId.make("optional");
          yield* t.assertBatch([
            { entityId: e, attribute: ":name", value: string("base"), validFrom: 0, validTo: 10 },
            { entityId: e, attribute: ":state", value: string("x"), validFrom: 0, validTo: 5 },
            { entityId: e, attribute: ":state", value: string("y"), validFrom: 5, validTo: 10 },
          ]);
          const result = yield* temporal.queryIntervals(
            {
              find: ["?e", "?state"],
              where: [["?e", ":name", "base"]],
              optionalProjection: {
                rowBinding: "?e",
                fields: [{ attribute: ":state", variable: "?state" }],
              },
            },
            { from: 0, to: 10 },
          );
          expect(result).toEqual([
            { bindings: { "?e": "optional", "?state": "x" }, validFrom: 0, validTo: 5 },
            { bindings: { "?e": "optional", "?state": "y" }, validFrom: 5, validTo: 10 },
          ]);
        }).pipe(
          Effect.provide(
            makeQleverRuntime({ url }).layer({ scope, capabilities: Capabilities.none }),
          ),
          Effect.scoped,
        ),
      );
    }, 60000);
  },
);
