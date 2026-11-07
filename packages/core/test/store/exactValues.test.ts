// [EXP-F02b] RULINGS Q30a, Q30b, Q23: the Triplex writer rejects a value the lanes would change,
// with InvalidTripleError / invalid-value, before any mutation; a number -0 keeps its sign
// (RULINGS Q21 AMB-04). EXP-F02 records fixed: `ledger json neg-zero-in-object` and
// `ledger json neg-zero-in-list` on xtdb and qlever.
import { Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  EntityId,
  InvalidTripleError,
  Triples,
  blob,
  datetime,
  json,
  number,
  type TransactOp,
  type TripleValue,
} from "../../src/index.js";
import {
  Capabilities,
  DatabaseScope,
  KvBackend,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "../../src/runtime/index.js";
import { makeTestKvBackend } from "../../src/kv/kv/InMemoryKvBackend.js";
import { inexactAssertError } from "../../src/store/exactValues.js";
import { transactSystem } from "../../src/store/systemNamespace.js";

const entityId = EntityId.make("f02b:guard");
const valueOp = (value: TripleValue): TransactOp => ({
  op: "assert",
  entityId,
  attribute: ":f02b/v",
  value,
  validFrom: 1,
});
const op = (value: unknown): TransactOp => valueOp(json(value));

describe("inexactAssertError", () => {
  it("rejects -0 or a non-finite number inside JSON with detail inexact-json-number (Q30a)", () => {
    for (const value of [{ amount: -0 }, [0, -0, 1], { a: [{ b: Number.NaN }] }, [Infinity]]) {
      const error = inexactAssertError([op(value)]);
      expect(error).toBeInstanceOf(InvalidTripleError);
      expect(error?._tag).toBe("InvalidTripleError");
      expect(error?.reason).toBe("invalid-value");
      expect(error?.detail).toBe("inexact-json-number");
      expect(error?.field).toBe("operations[0].value");
    }
    expect(inexactAssertError([op({ amount: -0 })])?.value).toBe("$.amount = -0");
  });

  it("rejects an instant of -0 (Q30b) and a blob size of -0", () => {
    expect(inexactAssertError([valueOp(datetime(-0))])?.detail).toBe("negative-zero-instant");
    const blobOp = valueOp(blob("sha256:00", "x/y", -0));
    expect(inexactAssertError([blobOp])?.field).toBe("operations[0].value.size");
  });

  it("accepts exact values, number -0 included (AMB-04), and names the failing operation index", () => {
    expect(
      inexactAssertError([
        { op: "assert", entityId, attribute: ":f02b/n", value: number(-0) },
        op({ v: 1.0000000000000002, w: 2 ** 53 + 2, x: 5e-324 }),
        valueOp(datetime(0)),
      ]),
    ).toBeUndefined();
    expect(inexactAssertError([op({ ok: 1 }), op({ bad: -0 })])?.field).toBe("operations[1].value");
  });
});

describe("the writer refuses before any mutation", () => {
  it("KV runtime: typed InvalidTripleError, nothing written; number -0 round-trips", async () => {
    const scope = DatabaseScope.test("f02b-guard-kv");
    const runtime = Runtime.fromKv({
      name: "f02b-guard",
      backend: Layer.sync(KvBackend, makeTestKvBackend),
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const rejected = yield* Effect.exit(
          triples.transact([
            { op: "assert", entityId, attribute: ":f02b/ok", value: number(1) },
            op({ amount: -0 }),
          ]),
        );
        expect(Exit.isFailure(rejected)).toBe(true);
        if (Exit.isFailure(rejected)) {
          const error = rejected.cause.reasons[0];
          expect(error?._tag).toBe("Fail");
          if (error?._tag === "Fail") {
            expect(error.error._tag).toBe("InvalidTripleError");
            expect((error.error as InvalidTripleError).detail).toBe("inexact-json-number");
          }
        }
        expect(yield* triples.entity(entityId)).toEqual([]);
        yield* triples.transact([
          { op: "assert", entityId, attribute: ":f02b/n", value: number(-0) },
        ]);
        const [fact] = yield* triples.entity(entityId);
        expect(Object.is(fact?.value.value, -0)).toBe(true);
      }).pipe(
        Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
        Effect.scoped,
      ),
    );
  });

  it("Q34c: JSON Triplex itself writes (system writes) is not checked", async () => {
    const runtime = Runtime.fromKv({
      name: "f02b-guard-system",
      backend: Layer.sync(KvBackend, makeTestKvBackend),
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        const result = yield* transactSystem(triples, [op({ amount: -0 })]);
        expect(result.triples).toHaveLength(1);
      }).pipe(
        Effect.provide(
          runtime.layer({
            scope: DatabaseScope.test("f02b-guard-system"),
            capabilities: Capabilities.none,
          }),
        ),
        Effect.scoped,
      ),
    );
  });

  it("TriplesLive (the XTDB and QLever writer): fails before the storage transaction opens", async () => {
    const calls: string[] = [];
    const adapter = new Proxy(
      {},
      {
        get: (_target, name) =>
          name === "initialize"
            ? () => Effect.void
            : name === "supportedValueTypes"
              ? undefined
              : () => {
                  calls.push(String(name));
                  return Effect.die(`unexpected storage call ${String(name)}`);
                },
      },
    );
    const runtime = Runtime.define({
      name: "f02b-guard-adapter",
      storage: Layer.succeed(StorageAdapter, adapter as never),
      queries: Layer.succeed(QueryExecutor, {} as never),
    });
    const exit = await Effect.runPromise(
      Effect.gen(function* () {
        const triples = yield* Triples;
        return yield* Effect.exit(triples.transact([op([0, -0, 1])]));
      }).pipe(
        Effect.provide(
          runtime.layer({
            scope: DatabaseScope.test("f02b-guard"),
            capabilities: Capabilities.none,
          }),
        ),
        Effect.scoped,
      ),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const reason = exit.cause.reasons[0];
      expect(reason?._tag === "Fail" && reason.error._tag).toBe("InvalidTripleError");
    }
    expect(calls).toEqual([]);
  });
});
