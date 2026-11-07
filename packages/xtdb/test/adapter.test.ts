import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Effect, Fiber, Layer } from "effect";
import { EntityId, Triples, string, json } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
  TransactionOutcomeUnknown,
  WriteError,
  type StorageAdapterService,
} from "@triplex-build/triplex/runtime";
import { makeXtdbClient, postgresPlaceholders, type XtdbClient } from "../src/XtdbClient.js";
import { makeXtdbStorageAdapter, XtdbSerializationConflict } from "../src/XtdbStorageAdapter.js";
import { canonicalJson, packValue } from "../src/codecs.js";
import { makeXtdbQueryExecutor } from "../src/XtdbQueryExecutor.js";
import { resolveXtdbOperation } from "../src/Operations.js";

const enabled = process.env["XTDB_INTEGRATION"] === "1";
const url = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb";
const input = {
  entityId: "adapter:test" as never,
  attribute: ":adapter/value",
  value: { type: "string" as const, value: "kept" },
};
const insert = (adapter: StorageAdapterService, id: string) =>
  Effect.gen(function* () {
    const position = yield* adapter.nextCommitPosition();
    return yield* adapter.insert(input, `tx:${id}`, 100, id, position);
  });

describe("XTDB lossless baseline codecs", () => {
  it("retains descriptors and rejects silently discarded JSON values", () => {
    expect(
      packValue({
        type: "blob",
        value: "sha256:abc",
        mimeType: "text/plain",
        size: 3,
        filename: "",
      }).value_json,
    ).toBe('{"filename":"","mimeType":"text/plain","size":3}');
    expect(canonicalJson({ b: [true, null], a: "x" })).toBe('{"a":"x","b":[true,null]}');
    expect(() => canonicalJson({ value: undefined })).toThrow();
    expect(() => canonicalJson({ value: 1n })).toThrow();
    expect(() => canonicalJson(Number.NaN)).toThrow();
  });
  it("does not replace question marks in quoted SQL or comments", () => {
    expect(postgresPlaceholders("SELECT '?' AS x, ? AS y -- ?\n WHERE \"?\" = ? /* ? */")).toBe(
      "SELECT '?' AS x, $1 AS y -- ?\n WHERE \"?\" = $2 /* ? */",
    );
  });
});

describe.skipIf(!enabled)("XTDB storage transaction boundary", () => {
  let client: XtdbClient;
  beforeAll(async () => {
    client = makeXtdbClient(url);
    await Effect.runPromise(
      makeXtdbStorageAdapter(client, `initialize:${randomUUID()}`).initialize(),
    );
  });
  afterAll(async () => {
    await client?.close();
  });
  const fresh = (
    wrapped: XtdbClient = client,
    options?: Parameters<typeof makeXtdbStorageAdapter>[2],
  ) => makeXtdbStorageAdapter(wrapped, `adapter:${randomUUID()}`, options);

  it("reads staged inserts and retractions and retains one original identity", async () => {
    const adapter = fresh();
    await Effect.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          const row = yield* insert(adapter, "pending");
          expect((yield* adapter.getByEntity(input.entityId)).map((fact) => fact.id)).toEqual([
            row.id,
          ]);
          expect(yield* adapter.retract(row.id, 101, "tx:retract", row.recorded_position)).toBe(
            true,
          );
          expect(yield* adapter.getById(row.id)).toBeNull();
        }),
      ),
    );
    expect(await Effect.runPromise(adapter.getByEntity(input.entityId))).toEqual([]);
    expect(await Effect.runPromise(adapter.history(input.entityId))).toHaveLength(1);
    expect(await Effect.runPromise(adapter.currentCommitPosition())).toBe(1);
  });

  it("rolls back typed errors, defects and interruption before submission", async () => {
    for (const failure of [Effect.fail("typed"), Effect.die("defect"), Effect.interrupt]) {
      const adapter = fresh();
      await Effect.runPromiseExit(
        adapter.withTransaction(insert(adapter, "aborted").pipe(Effect.andThen(failure))),
      );
      expect(await Effect.runPromise(adapter.getByEntity(input.entityId))).toEqual([]);
      expect(await Effect.runPromise(adapter.currentCommitPosition())).toBe(0);
    }
  });

  it("restores a nested savepoint even when the outer callback catches failure", async () => {
    const adapter = fresh();
    await Effect.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          yield* insert(adapter, "outer");
          yield* adapter
            .withTransaction(
              insert(adapter, "inner").pipe(Effect.andThen(Effect.fail("inner-failure"))),
            )
            .pipe(Effect.catch(() => Effect.void));
          expect(yield* adapter.currentCommitPosition()).toBe(1);
          expect(yield* adapter.getById("inner")).toBeNull();
        }),
      ),
    );
    expect(
      (await Effect.runPromise(adapter.history(input.entityId))).map((fact) => fact.id),
    ).toEqual(["outer"]);
  });

  it("keeps a successful sibling when a parallel nested callback rolls back", async () => {
    const adapter = fresh();
    let staged!: () => void, resume!: () => void;
    const started = new Promise<void>((resolve) => {
      staged = resolve;
    });
    const continueA = new Promise<void>((resolve) => {
      resume = resolve;
    });
    await Effect.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          yield* insert(adapter, "outer");
          const failing = yield* Effect.forkChild(
            adapter
              .withTransaction(
                Effect.gen(function* () {
                  yield* insert(adapter, "failed-child");
                  staged();
                  yield* Effect.promise(() => continueA);
                  return yield* Effect.fail("rollback");
                }),
              )
              .pipe(Effect.catch(() => Effect.void)),
          );
          yield* Effect.promise(() => started);
          yield* adapter.withTransaction(insert(adapter, "successful-child"));
          resume();
          yield* Fiber.join(failing);
          expect((yield* adapter.history(input.entityId)).map((row) => row.id).sort()).toEqual([
            "outer",
            "successful-child",
          ]);
        }),
      ),
    );
    expect(
      (await Effect.runPromise(adapter.history(input.entityId))).map((row) => row.id).sort(),
    ).toEqual(["outer", "successful-child"]);
  });

  it("queries staged facts, staged retractions and a stable source through public Datalog", async () => {
    const scope = DatabaseScope.test(`query-overlay:${randomUUID()}`);
    const adapter = makeXtdbStorageAdapter(client, scope);
    const competitor = makeXtdbStorageAdapter(client, scope);
    const runtime = Runtime.define({
      name: "query-overlay",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(client, scope)),
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const query = {
          find: ["?value"],
          where: [["?entity", ":adapter/value", "?value"]],
        } as const;
        yield* adapter.withTransaction(
          Effect.gen(function* () {
            const asserted = yield* triples.assert({
              ...input,
              entityId: EntityId.make("pending"),
              validFrom: 0,
            });
            expect((yield* triples.queryAll(query)).results).toEqual([{ "?value": "kept" }]);
            yield* triples.retract(asserted.id);
            expect((yield* triples.queryAll(query)).results).toEqual([]);
          }),
        );
        yield* triples.assert({ ...input, entityId: EntityId.make("seed"), validFrom: 0 });
        yield* adapter.withTransaction(
          Effect.gen(function* () {
            expect((yield* triples.queryAll(query)).results).toEqual([{ "?value": "kept" }]);
            yield* competitor.withTransaction(insert(competitor, "concurrent"));
            expect((yield* triples.queryAll(query)).results).toEqual([{ "?value": "kept" }]);
            expect(
              (yield* triples.queryAll({
                find: ["?n"],
                where: [["?e", ":adapter/value", "?v"]],
                aggregate: [["count", "?e", "?n"]],
              })).results,
            ).toEqual([{ "?n": 1 }]);
          }),
        );
        expect((yield* triples.queryAll(query)).results).toEqual([{ "?value": "kept" }]);
        // Projected relation is a set; a native count exposes both distinct subjects.
        expect(
          (yield* triples.queryAll({
            find: ["?n"],
            where: [["?e", ":adapter/value", "?v"]],
            aggregate: [["count", "?e", "?n"]],
          })).results,
        ).toEqual([{ "?n": 2 }]);
      }).pipe(
        Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
        Effect.scoped,
      ),
    );
  });

  it("rejects identity reuse without replacing the original assertion", async () => {
    const adapter = fresh();
    await Effect.runPromise(adapter.withTransaction(insert(adapter, "same-id")));
    await expect(
      Effect.runPromise(adapter.withTransaction(insert(adapter, "same-id"))),
    ).rejects.toBeInstanceOf(WriteError);
    expect(await Effect.runPromise(adapter.history(input.entityId))).toHaveLength(1);
  });

  it("rejects unrepresentable Unicode atomically and preserves escaped JSON text", async () => {
    const scope = DatabaseScope.test(`unicode-boundary:${randomUUID()}`);
    const adapter = makeXtdbStorageAdapter(client, scope);
    const runtime = Runtime.define({
      name: "unicode-boundary",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(client, scope)),
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const failure = yield* triples
          .transact(
            [
              {
                op: "assert",
                entityId: EntityId.make("good"),
                attribute: ":value",
                value: string("valid"),
              },
              {
                op: "assert",
                entityId: EntityId.make("bad"),
                attribute: ":value",
                value: string("\ud800"),
              },
            ],
            { commandId: "unrepresentable-text" },
          )
          .pipe(Effect.flip);
        expect(failure).toBeInstanceOf(WriteError);
        expect(yield* triples.currentPosition()).toBe(0);
        expect(yield* triples.entity(EntityId.make("good"))).toEqual([]);
        expect(yield* triples.transactionByCommand("unrepresentable-text")).toBeNull();
        yield* triples.assert({
          entityId: EntityId.make("json"),
          attribute: ":value",
          value: json({ text: "\ud800" }),
        });
        expect((yield* triples.entity(EntityId.make("json")))[0]?.value).toEqual(
          json({ text: "\ud800" }),
        );
      }).pipe(
        Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
        Effect.scoped,
      ),
    );
  });

  it("resolves an acknowledgement lost after commit through the operation marker", async () => {
    let loseAck = true;
    const wrapped: XtdbClient = {
      ...client,
      submit: async (statements) => {
        const result = await client.submit(statements);
        if (loseAck) {
          loseAck = false;
          throw new Error("injected lost acknowledgement");
        }
        return result;
      },
    };
    const adapter = fresh(wrapped, { resolutionTimeoutMs: 1000 });
    const row = await Effect.runPromise(adapter.withTransaction(insert(adapter, "ack-lost")));
    expect(row.id).toBe("ack-lost");
    expect(await Effect.runPromise(adapter.currentCommitPosition())).toBe(1);
  });

  it("returns an identifiable unknown outcome within its budget when transport hangs", async () => {
    const wrapped: XtdbClient = {
      ...client,
      submit: () => new Promise(() => {}),
      query: (sql, params, basis, options) =>
        /tx_attempts/.test(sql) ? new Promise(() => {}) : client.query(sql, params, basis, options),
    };
    const adapter = fresh(wrapped, { resolutionTimeoutMs: 50 });
    const started = performance.now();
    const error = await Effect.runPromise(
      adapter.withTransaction(insert(adapter, "unknown")).pipe(Effect.flip),
    );
    expect(error).toBeInstanceOf(TransactionOutcomeUnknown);
    expect(error).toMatchObject({
      reason: "outcome-unknown",
      operationId: expect.any(String),
      attemptId: expect.any(String),
    });
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("resolves a durable anonymous operation after its acknowledgement lookup failed", async () => {
    const scope = `resolve:${randomUUID()}`;
    let acknowledge!: () => void;
    const committed = new Promise<void>((resolve) => {
      acknowledge = resolve;
    });
    const wrapped: XtdbClient = {
      ...client,
      submit: async (statements) => {
        await client.submit(statements);
        acknowledge();
        throw new Error("ack lost");
      },
      query: (sql, params, basis, options) =>
        /tx_attempts/.test(sql)
          ? Promise.reject(new Error("injected lookup partition"))
          : client.query(sql, params, basis, options),
    };
    const adapter = makeXtdbStorageAdapter(wrapped, scope, { resolutionTimeoutMs: 50 });
    const error = await Effect.runPromise(
      adapter.withTransaction(insert(adapter, "resolved-later")).pipe(Effect.flip),
    );
    expect(error).toBeInstanceOf(TransactionOutcomeUnknown);
    await committed;
    const resolution = await Effect.runPromise(
      resolveXtdbOperation(client, scope, (error as TransactionOutcomeUnknown).operationId),
    );
    expect(resolution).toMatchObject({ status: "committed", position: 1 });
  });

  it("interruption after accepted submission cannot roll back the durable public command", async () => {
    let signalAccepted!: () => void;
    let resume!: () => void;
    const accepted = new Promise<void>((resolve) => {
      signalAccepted = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const wrapped: XtdbClient = {
      ...client,
      submit: async (statements) => {
        const result = await client.submit(statements);
        if (statements.some(({ sql }) => sql.includes("INSERT INTO tx_attempts"))) {
          signalAccepted();
          await gate;
        }
        return result;
      },
    };
    const scope = DatabaseScope.test(`interrupt-after-submit:${randomUUID()}`);
    const adapter = makeXtdbStorageAdapter(wrapped, scope);
    const runtime = Runtime.define({
      name: "accepted-interruption",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(wrapped, scope)),
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const fiber = yield* Effect.forkChild(
          triples.transact(
            [
              {
                op: "assert",
                entityId: EntityId.make("accepted"),
                attribute: ":value",
                value: string("committed"),
              },
            ],
            { commandId: "recoverable-command" },
          ),
        );
        yield* Effect.promise(() => accepted);
        const interrupt = Effect.runPromise(Fiber.interrupt(fiber));
        resume();
        yield* Effect.promise(() => interrupt);
        expect((yield* triples.transactionByCommand("recoverable-command"))?.changes).toHaveLength(
          1,
        );
        expect(yield* triples.entity(EntityId.make("accepted"))).toHaveLength(1);
        expect(yield* triples.currentPosition()).toBe(1);
      }).pipe(
        Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
        Effect.scoped,
      ),
    );
  });

  it("retries explicitly safe effects and executes arbitrary effects only once", async () => {
    for (const replaySafe of [false, true]) {
      const scope = `conflict:${randomUUID()}`;
      const adapter = makeXtdbStorageAdapter(client, scope);
      const competitor = makeXtdbStorageAdapter(client, scope);
      let evaluations = 0;
      const command = Effect.gen(function* () {
        evaluations++;
        yield* insert(adapter, "original");
        if (evaluations === 1) yield* competitor.withTransaction(insert(competitor, "competitor"));
        return "ok";
      });
      const result = await Effect.runPromise(
        adapter.withTransaction(command, { replaySafe }).pipe(Effect.result),
      );
      expect(evaluations).toBe(replaySafe ? 2 : 1);
      if (replaySafe) expect(result).toMatchObject({ _tag: "Success", success: "ok" });
      else
        expect(result).toMatchObject({
          _tag: "Failure",
          failure: expect.any(XtdbSerializationConflict),
        });
      expect(await Effect.runPromise(adapter.currentCommitPosition())).toBe(replaySafe ? 2 : 1);
    }
  });
});
