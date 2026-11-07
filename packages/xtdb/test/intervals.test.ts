import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { EntityId, Triples, string, integer, number } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import {
  makeXtdbClient,
  makeXtdbRuntime,
  makeXtdbTemporalQueries,
} from "@triplex-build/triplex-xtdb";

describe.skipIf(process.env["XTDB_INTEGRATION"] !== "1")("XTDB interval public extension", () => {
  it("includes boundaries of optional projected facts", async () => {
    const scope = DatabaseScope.test(`interval-optional-${randomUUID()}`);
    const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb";
    const client = makeXtdbClient(url);
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const triples = yield* Triples;
          yield* triples.assertBatch([
            {
              entityId: EntityId.make("optional:e"),
              attribute: ":name",
              value: string("Name"),
              validFrom: 0,
              validTo: 10,
            },
            {
              entityId: EntityId.make("optional:e"),
              attribute: ":status",
              value: string("x"),
              validFrom: 0,
              validTo: 5,
            },
            {
              entityId: EntityId.make("optional:e"),
              attribute: ":status",
              value: string("y"),
              validFrom: 5,
              validTo: 10,
            },
          ]);
          const result = yield* makeXtdbTemporalQueries(client, scope).queryIntervals(
            {
              find: ["?name", "?status"],
              where: [["?e", ":name", "?name"]],
              optionalProjection: {
                rowBinding: "?e",
                fields: [{ variable: "?status", attribute: ":status" }],
              },
            },
            { from: 0, to: 10 },
          );
          expect(result).toEqual([
            { bindings: { "?name": "Name", "?status": "x" }, validFrom: 0, validTo: 5 },
            { bindings: { "?name": "Name", "?status": "y" }, validFrom: 5, validTo: 10 },
          ]);
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
  it("includes dynamic attribute boundaries, preserves variable names, and checks numeric domains over all spans", async () => {
    const scope = DatabaseScope.test(`interval-dynamic-${randomUUID()}`);
    const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb";
    const client = makeXtdbClient(url);
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const triples = yield* Triples;
          yield* triples.assertBatch([
            {
              entityId: EntityId.make("e"),
              attribute: ":name",
              value: string("NaN"),
              validFrom: 0,
              validTo: 10,
            },
            {
              entityId: EntityId.make("e"),
              attribute: ":status",
              value: string("x"),
              validFrom: 0,
              validTo: 5,
            },
            {
              entityId: EntityId.make("e"),
              attribute: ":status",
              value: string("y"),
              validFrom: 5,
              validTo: 10,
            },
            {
              entityId: EntityId.make("i"),
              attribute: ":amount",
              value: integer("9007199254740993"),
              validFrom: 5,
              validTo: 10,
            },
          ]);
          const temporal = makeXtdbTemporalQueries(client, scope);
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
              { bindings: { "?NaN": "NaN", "?a": ":status", "?v": "x" }, validFrom: 0, validTo: 5 },
              {
                bindings: { "?NaN": "NaN", "?a": ":status", "?v": "y" },
                validFrom: 5,
                validTo: 10,
              },
            ]),
          );
          const query = {
            find: ["?sum"],
            where: [["?e", ":amount", "?v"]],
            aggregate: [["sum", "?v", "?sum"]],
          } as const;
          const summed = yield* temporal.queryIntervals(query, { from: 0, to: 10 });
          expect(summed).toEqual(
            expect.arrayContaining([
              { bindings: { "?sum": integer("9007199254740993") }, validFrom: 5, validTo: 10 },
            ]),
          );
          yield* triples.assert({
            entityId: EntityId.make("f"),
            attribute: ":amount",
            value: number(2),
            validFrom: 0,
            validTo: 5,
          });
          const mixed = yield* Effect.exit(temporal.queryIntervals(query, { from: 0, to: 10 }));
          expect(mixed._tag).toBe("Failure");
          const bounded = yield* Effect.exit(
            temporal.queryIntervals(
              { find: ["?v"], where: [["e", ":status", "?v"]] },
              { from: 0, to: 10, maxSpans: 1 },
            ),
          );
          expect(bounded._tag).toBe("Failure");
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
  it("coalesces adjacent answers and computes absence gaps at fixed knowledge", async () => {
    const scope = DatabaseScope.test(`interval-${randomUUID()}`);
    const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb";
    const client = makeXtdbClient(url);
    try {
      const layer = makeXtdbRuntime({ url }).layer({ scope, capabilities: Capabilities.none });
      const { before, after } = await Effect.runPromise(
        Effect.gen(function* () {
          const triples = yield* Triples;
          const entityId = EntityId.make("worker:alice");
          yield* triples.assertBatch([
            {
              entityId,
              attribute: ":worker/name",
              value: string("Alice"),
              validFrom: 0,
              validTo: 100,
            },
            {
              entityId,
              attribute: ":worker/license",
              value: string("A"),
              validFrom: 0,
              validTo: 20,
            },
            {
              entityId,
              attribute: ":worker/license",
              value: string("A"),
              validFrom: 30,
              validTo: 40,
            },
            {
              entityId,
              attribute: ":worker/license",
              value: string("A"),
              validFrom: 40,
              validTo: 50,
            },
          ]);
          const temporal = makeXtdbTemporalQueries(client, scope);
          const licensed = yield* temporal.queryIntervals(
            { find: ["?license"], where: [["worker:alice", ":worker/license", "?license"]] },
            { from: 0, to: 100 },
          );
          expect(licensed).toEqual([
            { bindings: { "?license": "A" }, validFrom: 0, validTo: 20 },
            { bindings: { "?license": "A" }, validFrom: 30, validTo: 50 },
          ]);
          const before = yield* triples.currentPosition();
          yield* triples.retractByPattern({
            entityId,
            attribute: ":worker/license",
            value: string("A"),
          });
          return { before, after: yield* triples.currentPosition() };
        }).pipe(Effect.provide(layer), Effect.scoped),
      );
      const query = {
        find: ["?name"],
        where: [
          ["?worker", ":worker/name", "?name"],
          ["not", ["?worker", ":worker/license", "A"]],
        ],
      };
      const temporal = makeXtdbTemporalQueries(client, scope);
      const old = await Effect.runPromise(
        temporal.queryIntervals(query as never, { from: 0, to: 100, recordedPosition: before }),
      );
      expect(old).toEqual([
        { bindings: { "?name": "Alice" }, validFrom: 20, validTo: 30 },
        { bindings: { "?name": "Alice" }, validFrom: 50, validTo: 100 },
      ]);
      const current = await Effect.runPromise(
        temporal.queryIntervals(query as never, { from: 0, to: 100, recordedPosition: after }),
      );
      expect(current).toEqual([{ bindings: { "?name": "Alice" }, validFrom: 0, validTo: 100 }]);
    } finally {
      await client.close();
    }
  });
});
