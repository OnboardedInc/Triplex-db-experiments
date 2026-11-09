import { performance } from "node:perf_hooks";
import { Effect, Layer } from "effect";
import { Triples } from "../../../packages/core/src/index.js";
import {
  TriplesLive,
  DeterministicTripleStoreRuntimeLive,
} from "../../../packages/core/src/internal.js";
import {
  StorageAdapter,
  QueryExecutor,
  instantOf,
  nextStamp,
  type StorageAdapterService,
  type QueryExecutorService,
} from "../../../packages/core/src/runtime/index.js";
import { TriplesLive as MainTriplesLive } from "../../../packages/core/src/store/__rt01_main_TriplesLive.js";

const run = async (base: boolean, size: number) => {
  let position = 0,
    stamp = 0;
  const insert: StorageAdapterService["insert"] = (input, txId, timestamp, id, position) =>
    Effect.sync(() => ({
      id,
      entity_id: input.entityId,
      attribute: input.attribute,
      value_type: "string",
      value_string: String(input.value.value),
      value_number: null,
      value_boolean: null,
      value_datetime: null,
      value_json: input.value.type === "json" ? JSON.stringify(input.value.value) : null,
      recorded_at: timestamp,
      recorded_position: position,
      valid_from: input.validFrom ?? timestamp,
      valid_to: null,
      created_by: null,
      retracted_at: null,
      retracted_position: null,
      retract_tx_id: null,
      entity_type: null,
      schema_version: 1,
      tx_id: txId,
    }));
  const adapter = {
    withTransaction: (effect) => effect,
    initialize: () => Effect.void,
    ...(base
      ? {}
      : {
          commitStamp: (time: number) =>
            Effect.sync(() => {
              stamp = nextStamp(stamp, time);
              return { instant: instantOf(stamp), decided: true };
            }),
        }),
    nextCommitPosition: () => Effect.sync(() => ++position),
    insert,
    batchInsert: (inputs, txId, timestamp, ids, p) =>
      Effect.forEach(inputs, (input, i) => insert(input, txId, timestamp, ids[i]!, p)),
  } as StorageAdapterService;
  const layer = (base ? MainTriplesLive : TriplesLive).pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(StorageAdapter, adapter),
        Layer.succeed(QueryExecutor, {} as QueryExecutorService),
        DeterministicTripleStoreRuntimeLive({ now: 100000, idSeed: "bench" }),
      ),
    ),
  );
  return Effect.runPromise(
    Effect.gen(function* () {
      const t = yield* Triples;
      const samples: number[] = [];
      const operations = Array.from({ length: size }, (_, i) => ({
        op: "assert" as const,
        entityId: "bench" as never,
        attribute: `:bench/${i}`,
        value: { type: "string" as const, value: "value" },
      }));
      for (let i = 0; i < 2500; i++) {
        const start = performance.now();
        const r = yield* t.transact(operations);
        if (
          r.triples.length !== size ||
          r.position !== i + 1 ||
          (!base && r.triples.some((f) => f.recordedAt !== r.instant))
        )
          throw new Error("Microbench receipt mismatch");
        if (i >= 500) samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      return {
        p50Ms: samples[Math.floor(samples.length * 0.5)],
        p99Ms: samples[Math.floor(samples.length * 0.99)],
      };
    }).pipe(Effect.provide(layer)),
  );
};
const pairs = [];
for (const size of [5, 10])
  for (let pair = 0; pair < 6; pair++) {
    const order = pair % 2 ? [false, true] : [true, false];
    const values: Record<string, unknown> = {};
    for (const base of order) values[base ? "main" : "rt01"] = await run(base, size);
    pairs.push({ size, pair, order: order.map((base) => (base ? "main" : "rt01")), ...values });
  }
console.log(
  JSON.stringify(
    {
      kind: "offline-core-commit-microbench",
      engineIO: false,
      samplesPerArmPerPair: 2000,
      warmup: 500,
      pairs,
    },
    null,
    2,
  ),
);
