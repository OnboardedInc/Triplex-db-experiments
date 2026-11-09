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
  type QueryExecutorService,
} from "../../../packages/core/src/runtime/index.js";
import { TriplesLive as MainTriplesLive } from "../../../packages/core/src/store/__rt01_main_TriplesLive.js";

import { makeXtdbStorageAdapter } from "../../../packages/xtdb/src/XtdbStorageAdapter.js";
import { makeXtdbStorageAdapter as makeMainXtdbStorageAdapter } from "../../../packages/xtdb/src/__rt01_main_XtdbStorageAdapter.js";
import { makeRecordTimeClient } from "../../../packages/xtdb/test/fixtures/record-time-client.js";

const run = async (base: boolean, size: number) => {
  const client = makeRecordTimeClient();
  const adapter = base
    ? makeMainXtdbStorageAdapter(client, "bench")
    : makeXtdbStorageAdapter(client, "bench");
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
      for (let i = 0; i < 800; i++) {
        const start = performance.now();
        const r = yield* t.transact(operations);
        if (
          r.triples.length !== size ||
          r.position !== i + 1 ||
          (!base && r.triples.some((f) => f.recordedAt !== r.instant))
        )
          throw new Error("Microbench receipt mismatch");
        if (i >= 200) samples.push(performance.now() - start);
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
      kind: "offline-actual-xtdb-a0-commit-microbench",
      engineIO: false,
      samplesPerArmPerPair: 600,
      warmup: 200,
      pairs,
    },
    null,
    2,
  ),
);
