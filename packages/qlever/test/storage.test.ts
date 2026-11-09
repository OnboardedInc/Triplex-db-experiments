import { randomUUID } from "node:crypto";
import { Effect, Fiber } from "effect";
import { describe, expect, it } from "vitest";
import {
  EntityId,
  Triples,
  integer,
  number,
  string,
  json,
  blob,
  CommandAlreadyCommittedError,
} from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  StorageAdapter,
  WriteError,
} from "@triplex-build/triplex/runtime";
import { makeQleverRuntime } from "../src/index.js";
import { makeQleverClient } from "../src/QleverClient.js";
import { makeQleverStorageAdapter } from "../src/QleverStorageAdapter.js";
import { triplesConformanceCases } from "@triplex-build/triplex-testkit";
import { numericOrderKey, numericFromOrderKey, numericShadowIsExact } from "../src/rdf.js";

const url = process.env["QLEVER_URL"] ?? "http://127.0.0.1:7019";
const run = <A, E>(effect: Effect.Effect<A, E, Triples>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        makeQleverRuntime({ url, maxRetries: 32 }).layer({
          scope: DatabaseScope.test(`qlever-storage:${randomUUID()}`),
          capabilities: Capabilities.none,
        }),
      ),
      Effect.scoped,
    ),
  );
describe("QLever full precision order channels", () => {
  it("preserves binary64 comparison keys independently of native rounded numbers", () => {
    const values = [
      -Number.MAX_VALUE,
      -1.0000000000000002,
      -1,
      -Number.MIN_VALUE,
      0,
      Number.MIN_VALUE,
      1,
      1.0000000000000002,
      Number.MAX_VALUE,
    ];
    expect(values.map(numericOrderKey)).toEqual(values.map(numericOrderKey).toSorted());
    for (const value of values) expect(numericFromOrderKey(numericOrderKey(value))).toBe(value);
    expect(numericShadowIsExact(1.0000000000000002)).toBe(false);
  });
});
describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")(
  "QLever native storage public boundary",
  () => {
    it("preserves full values, corrections, history, command receipts and replay", async () => {
      await run(
        Effect.gen(function* () {
          const t = yield* Triples,
            entityId = EntityId.make("qlever:values"),
            commandId = `values:${randomUUID()}`;
          const values = [
            number(1.0000000000000002),
            integer("576460752303423487"),
            integer("-576460752303423488"),
            string("576460752303423487"),
            json({ b: 2, a: 1 }),
            blob("sha256:fixture", "text/plain", 0, ""),
          ];
          const original = yield* t.transact(
            values.map((value, index) => ({
              op: "assert" as const,
              entityId,
              attribute: `:value/${index}`,
              value,
              validFrom: 1,
            })),
            { commandId },
          );
          expect((yield* t.entity(entityId, { validAt: 100 })).map((row) => row.value)).toEqual(
            expect.arrayContaining(values),
          );
          expect(
            (yield* t.transactionByCommand(commandId))?.changes.map((change) => change.value),
          ).toEqual(expect.arrayContaining(values));
          expect(yield* t.transact([], { commandId }).pipe(Effect.flip)).toBeInstanceOf(
            CommandAlreadyCommittedError,
          );
          yield* Effect.sleep("2 millis");
          yield* t.transact([
            { op: "retract", id: original.triples[0]!.id },
            {
              op: "assert",
              entityId,
              attribute: ":value/0",
              value: number(1.0000000000000004),
              validFrom: 1,
            },
          ]);
          expect(
            (yield* t.entity(entityId, { validAt: 100, recordedAt: original.instant })).find(
              (row) => row.attribute === ":value/0",
            )?.value,
          ).toEqual(values[0]);
          expect(
            (yield* t.entity(entityId, { validAt: 100 })).find(
              (row) => row.attribute === ":value/0",
            )?.value,
          ).toEqual(number(1.0000000000000004));
          expect(
            (yield* t.history(entityId)).filter((row) => row.attribute === ":value/0"),
          ).toHaveLength(2);
        }),
      );
    }, 60000);
    it("serializes sixteen concurrent public commands with complete receipts", async () => {
      await run(
        Effect.gen(function* () {
          const t = yield* Triples;
          const results = yield* Effect.all(
            Array.from({ length: 16 }, (_, index) =>
              t.transact(
                [
                  {
                    op: "assert",
                    entityId: EntityId.make(`qlever:writer:${index}`),
                    attribute: ":writer/value",
                    value: string(String(index)),
                    validFrom: 1,
                  },
                ],
                { commandId: `writer:${index}` },
              ),
            ),
            { concurrency: "unbounded" },
          );
          expect(results.map((result) => result.position).sort((a, b) => a - b)).toEqual(
            Array.from({ length: 16 }, (_, index) => index + 1),
          );
          for (let index = 0; index < 16; index++)
            expect((yield* t.transactionByCommand(`writer:${index}`))?.changes).toHaveLength(1);
        }),
      );
    }, 60000);
    it("retains immutable assertion identity across commands and confirms lost acknowledgements", async () => {
      const real = makeQleverClient(url);
      let lose = false;
      const client = {
        ...real,
        update: async (...args: Parameters<typeof real.update>) => {
          const result = await real.update(...args);
          if (lose) {
            lose = false;
            throw new Error("injected lost acknowledgement");
          }
          return result;
        },
      };
      const adapter = makeQleverStorageAdapter(client, `qlever-direct:${randomUUID()}`);
      const input = {
        entityId: EntityId.make("direct:e"),
        attribute: ":direct/value",
        value: string("original"),
      };
      lose = true;
      await Effect.runPromise(
        adapter.withTransaction(
          Effect.gen(function* () {
            const position = yield* adapter.nextCommitPosition();
            yield* adapter.insert(input, "tx:one", 100, "same-id", position);
            expect(yield* adapter.getByEntity(input.entityId)).toHaveLength(1);
          }),
        ),
      );
      const failure = await Effect.runPromise(
        adapter
          .withTransaction(
            Effect.gen(function* () {
              const position = yield* adapter.nextCommitPosition();
              yield* adapter.insert(
                { ...input, value: string("overwritten") },
                "tx:two",
                101,
                "same-id",
                position,
              );
            }),
          )
          .pipe(Effect.flip),
      );
      expect(failure).toBeInstanceOf(WriteError);
      expect((await Effect.runPromise(adapter.getById("same-id")))?.value_string).toBe("original");
      expect(await Effect.runPromise(adapter.currentCommitPosition())).toBe(1);
      await real.close();
    }, 60000);
    it("keeps a successful parallel sibling when another nested callback rolls back", async () => {
      const client = makeQleverClient(url),
        adapter = makeQleverStorageAdapter(client, `nested:${randomUUID()}`);
      const insert = (id: string) =>
        Effect.gen(function* () {
          const position = yield* adapter.nextCommitPosition();
          yield* adapter.insert(
            { entityId: EntityId.make("nested:e"), attribute: ":nested/value", value: string(id) },
            `tx:${id}`,
            100,
            id,
            position,
          );
        });
      let staged!: () => void, resume!: () => void;
      const started = new Promise<void>((resolve) => {
          staged = resolve;
        }),
        continueA = new Promise<void>((resolve) => {
          resume = resolve;
        });
      await Effect.runPromise(
        adapter.withTransaction(
          Effect.gen(function* () {
            yield* insert("outer");
            const failed = yield* Effect.forkChild(
              adapter
                .withTransaction(
                  Effect.gen(function* () {
                    yield* insert("failed");
                    staged();
                    yield* Effect.promise(() => continueA);
                    return yield* Effect.fail("rollback");
                  }),
                )
                .pipe(Effect.catch(() => Effect.void)),
            );
            yield* Effect.promise(() => started);
            yield* adapter.withTransaction(insert("successful"));
            resume();
            yield* Fiber.join(failed);
            expect(
              (yield* adapter.history(EntityId.make("nested:e"))).map((row) => row.id).sort(),
            ).toEqual(["outer", "successful"]);
          }),
        ),
      );
      expect(
        (await Effect.runPromise(adapter.history(EntityId.make("nested:e"))))
          .map((row) => row.id)
          .sort(),
      ).toEqual(["outer", "successful"]);
    }, 60000);
    it("pins entity pagination across fresh connections while a correction is committed", async () => {
      const scope = DatabaseScope.test(`snapshot:${randomUUID()}`);
      const atScope = <A, E>(effect: Effect.Effect<A, E, Triples>) =>
        Effect.runPromise(
          effect.pipe(
            Effect.provide(
              makeQleverRuntime({ url }).layer({ scope, capabilities: Capabilities.none }),
            ),
            Effect.scoped,
          ),
        );
      const seed = await atScope(
        Effect.gen(function* () {
          const t = yield* Triples;
          return yield* t.transact(
            ["a", "b"].map((name) => ({
              op: "assert" as const,
              entityId: EntityId.make(`snapshot:${name}`),
              attribute: ":snapshot/name",
              value: string(`old-${name}`),
              entityType: "Person",
              validFrom: 1,
            })),
          );
        }),
      );
      const first = await atScope(
        Effect.gen(function* () {
          const t = yield* Triples;
          return yield* t.entityPage({ entityType: "Person", limit: 1, basis: { validAt: 100 } });
        }),
      );
      expect(first.nextCursor).toBeDefined();
      await atScope(
        Effect.gen(function* () {
          const t = yield* Triples;
          yield* t.transact([
            { op: "retract", id: seed.triples.find((row) => row.entityId === "snapshot:b")!.id },
            {
              op: "assert",
              entityId: EntityId.make("snapshot:b"),
              attribute: ":snapshot/name",
              value: string("new-b"),
              entityType: "Person",
              validFrom: 1,
            },
          ]);
        }),
      );
      const second = await atScope(
        Effect.gen(function* () {
          const t = yield* Triples;
          return yield* t.entityPage({ entityType: "Person", limit: 1, cursor: first.nextCursor! });
        }),
      );
      expect(second.snapshot).toEqual(first.snapshot);
      expect(second.entities.flatMap((entity) => entity.map((row) => row.value))).toContainEqual(
        string("old-b"),
      );
    }, 60000);
  },
);

describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")("QLever dependency regressions", () => {
  for (const entry of triplesConformanceCases.filter(
    (entry) =>
      entry.name.includes("dependency state") || entry.name.includes("derivation materialization"),
  ))
    it(
      entry.name,
      async () => {
        await run(entry.run);
      },
      60000,
    );
});
