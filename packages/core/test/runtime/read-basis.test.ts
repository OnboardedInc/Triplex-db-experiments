import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { EntityId, Triples, string } from "../../src/index.js";
import { Runtime, DatabaseScope, Capabilities, KvBackend } from "../../src/runtime/index.js";
import { makeTestKvBackend } from "../../src/kv/kv/InMemoryKvBackend.js";

const scope = DatabaseScope.make({ env: "test", tenant: "basis", database: "read", generation: 3 });
const runtime = () =>
  Runtime.fromKv({ name: "basis-memory", backend: Layer.sync(KvBackend, makeTestKvBackend) });
const query = {
  find: ["?entity", "?name"],
  where: [["?entity", ":basis/name", "?name"]],
  orderBy: [{ variable: "?entity", direction: "asc" }],
} as const;

describe("opt-in resolved read basis", () => {
  it("preserves default shapes, returns actual scope/P/V, and does not invent latest recorded time", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const write = yield* triples.transact([
          {
            op: "assert",
            entityId: EntityId.make("a"),
            attribute: ":basis/name",
            value: string("before"),
            validFrom: 0,
          },
        ]);
        expect(yield* triples.queryAll(query, { basis: { validAt: 1.25 } })).not.toHaveProperty(
          "basis",
        );
        const result = yield* triples.queryAll(query, {
          includeBasis: true,
          basis: { validAt: 1.25 },
        });
        expect(result.basis).toEqual({ scope, recordedPosition: write.position, validAt: 1.25 });
        expect(result.basis).not.toHaveProperty("recordedAt");
        const historical = yield* triples.queryAll(query, {
          includeBasis: true,
          basis: { validAt: 1.25, recordedAt: write.instant },
        });
        expect(historical.basis?.recordedAt).toBe(write.instant);
      }).pipe(
        Effect.provide(
          runtime().layer({
            scope,
            capabilities: Capabilities.none,
            deterministic: { startTime: 1000.5, seed: "basis" },
          }),
        ),
        Effect.scoped,
      ),
    );
  });

  it("returns a continuation's original cut after a writer advances the current position", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const write = yield* triples.transact(
          ["a", "b", "c"].map((name) => ({
            op: "assert" as const,
            entityId: EntityId.make(name),
            attribute: ":basis/name",
            value: string(name),
            validFrom: 0,
          })),
        );
        const first = yield* triples.query(query, {
          pageSize: 1,
          includeBasis: true,
          basis: { validAt: 1.25 },
        });
        expect(first.nextCursor).toBeDefined();
        yield* triples.transact([
          { op: "retract", id: write.triples[1]!.id },
          {
            op: "assert",
            entityId: EntityId.make("later"),
            attribute: ":basis/name",
            value: string("later"),
            validFrom: 0,
          },
        ]);
        const continued = yield* triples.query(query, {
          pageSize: 1,
          cursor: first.nextCursor!,
          includeBasis: true,
        });
        expect(continued.basis).toEqual(first.basis);
        expect(continued.basis?.recordedPosition).toBe(write.position);
        expect(continued.results).toEqual([{ "?entity": "b", "?name": "b" }]);
      }).pipe(
        Effect.provide(
          runtime().layer({
            scope,
            capabilities: Capabilities.none,
            deterministic: { startTime: 1000.5, seed: "basis-cursor" },
          }),
        ),
        Effect.scoped,
      ),
    );
  });
});
