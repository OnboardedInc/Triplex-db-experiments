import { randomUUID } from "node:crypto";
import { Effect, Option } from "effect";
import { Runtime, TripleStoreRuntime } from "@triplex-build/triplex/runtime";
import { makeAdapterLayers } from "./query-executor-adapter.js";
import { DuckDBSqlStrategy } from "./SqlStrategy.js";
export { DuckDBSqlStrategy } from "./SqlStrategy.js";
import {
  acquireDuckDBBackend,
  readProjectionSchema,
  type DuckDBRuntimeOptions,
} from "./DuckDBClient.js";
export { makeDuckDBClient, type DuckDBClient, type DuckDBRuntimeOptions } from "./DuckDBClient.js";
export {
  makeDuckDBTemporalQueries,
  type DuckDBIntervalQueryOptions,
  type DuckDBIntervalBinding,
} from "./TemporalQueries.js";

export const makeDuckDBRuntime = async (options: DuckDBRuntimeOptions = {}) => {
  const schema = await readProjectionSchema();
  const memoryIdentity = randomUUID();
  const open = Effect.gen(function* () {
    const current = yield* Effect.serviceOption(TripleStoreRuntime);
    if (Option.isNone(current))
      return yield* Effect.fail(new Error("Triplex runtime scope is required"));
    return yield* Effect.tryPromise({
      try: () => acquireDuckDBBackend(options, current.value.scope, memoryIdentity),
      catch: (cause) => cause,
    });
  });
  const adapters = makeAdapterLayers(open, schema, DuckDBSqlStrategy, options);
  return Runtime.define({
    name: "duckdb-2.0-cpp-owner-bridge-v2",
    storage: adapters.storage,
    queries: adapters.queries,
  });
};
