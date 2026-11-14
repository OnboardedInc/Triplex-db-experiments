import { expect, it } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Triples } from "../src/store/Triples.js";
import { TriplesLive } from "../src/store/TriplesLive.js";
import { StorageAdapter } from "../src/storage/StorageAdapter.js";
import { QueryExecutor } from "../src/storage/QueryExecutor.js";
import { TripleStoreRuntimeLive } from "../src/store/TripleStoreRuntime.js";
import { ValueDomains } from "../src/ValueDomain.js";
import { EntityId } from "../src/Branded.js";

// [DX-T1-5] Why: exercise the public receipt after a backend assigns clocks at the outer durable boundary.
// Rejected: testing a helper alone, or changing valid time when record time is settled.
it("settles top-level and escaped nested receipts without retiming validity", async () => {
  let depth = 0,
    position = 0;
  const times = new Map<string, number>(),
    positions = new Map<string, number>(),
    staged = new Map<string, number>();
  const insert = (input: any, tx: string, t: number, id: string, p: number) =>
    Effect.sync(() => {
      staged.set(tx, p);
      return {
        id,
        entity_id: input.entityId,
        attribute: input.attribute,
        value_type: input.value.type,
        value_string: input.value.value,
        value_number: null,
        value_datetime: null,
        value_boolean: null,
        value_json: null,
        recorded_at: t,
        recorded_position: p,
        valid_from: input.validFrom ?? t,
        valid_to: input.validTo ?? null,
        created_by: null,
        entity_type: input.entityType ?? null,
        schema_version: 1,
        tx_id: tx,
        retracted_at: null,
        retracted_position: null,
        retract_tx_id: null,
      };
    });
  const adapter = {
    valueDomain: ValueDomains.memory,
    initialize: () => Effect.void,
    transactionInstant: () => Effect.succeed(100),
    committedInstant: (id: string) => times.get(id),
    committedPosition: (id: string) => positions.get(id),
    withTransaction: <A, E>(effect: Effect.Effect<A, E>) =>
      Effect.gen(function* () {
        depth++;
        try {
          return yield* effect;
        } finally {
          if (--depth === 0)
            for (const [id, p] of staged) {
              times.set(id, 200);
              positions.set(id, p + 100);
            }
        }
      }),
    claimCommand: () => Effect.succeed(null),
    nextCommitPosition: () => Effect.sync(() => ++position),
    insert,
    batchInsert: (xs: any[], tx: string, t: number, ids: string[], p: number) =>
      Effect.forEach(xs, (x, i) => insert(x, tx, t, ids[i]!, p)),
  };
  const runtime = ManagedRuntime.make(
    TriplesLive.pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.succeed(StorageAdapter, adapter as never),
          Layer.succeed(QueryExecutor, {} as never),
          TripleStoreRuntimeLive,
        ),
      ),
    ),
  );
  try {
    const triples = await runtime.runPromise(Triples);
    const input = {
      entityId: EntityId.make("root"),
      attribute: ":clock/value",
      value: { type: "string" as const, value: "v" },
    };
    const result = await runtime.runPromise(
      triples.transact([
        { op: "assert", ...input, validFrom: 7, validTo: 300 },
        { op: "assert", ...input },
      ]),
    );
    expect(result.instant).toBe(200);
    expect(result.position).toBe(101);
    expect(result.triples.map((t) => t.recordedAt)).toEqual([200, 200]);
    expect(result.triples.map((t) => t.validFrom)).toEqual([7, 100]);
    let escaped: any;
    await runtime.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          escaped = yield* triples.assert(input);
          expect(escaped.recordedAt).toBe(100);
        }),
      ),
    );
    expect(escaped.recordedAt).toBe(200);
    expect(escaped.validFrom).toBe(100);
  } finally {
    await runtime.dispose();
  }
});
