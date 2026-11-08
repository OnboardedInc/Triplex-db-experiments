import { Context, Effect, Layer } from "effect";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  TripleStoreRuntime,
  type RuntimeDefinition,
  type MigrationError,
} from "@triplex-build/triplex/runtime";
import { makeXtdbClient, type XtdbClient } from "./XtdbClient.js";
import { makeXtdbStorageAdapter } from "./XtdbStorageAdapter.js";
import { makeXtdbQueryExecutor, type XtdbQueryLimits } from "./XtdbQueryExecutor.js";

export interface XtdbRuntimeOptions {
  readonly url: string;
  readonly maxRetries?: number;
  readonly resolutionTimeoutMs?: number;
  readonly admissionQueue?: boolean;
  /** Experimental SQL constraint strategies; portable remains the default. */
  readonly constraintStrategy?: "portable" | "inline" | "projection";
  readonly queryLimits?: XtdbQueryLimits;
}

class Connection extends Context.Service<Connection, XtdbClient>()("triplex/xtdb/Connection") {}

/**
 * An XTDB-backed Triplex runtime. Database identity is bound by `.layer({scope})`.
 * Explicitly pass Capabilities.none until optional providers are qualified.
 * Connections are acquired once per Effect scope and released by that scope.
 */
export const makeXtdbRuntime = (
  options: XtdbRuntimeOptions,
): RuntimeDefinition<MigrationError, never, StorageAdapter | QueryExecutor> => {
  const connection = Layer.effect(
    Connection,
    Effect.acquireRelease(
      Effect.sync(() => makeXtdbClient(options.url)),
      (client) => Effect.promise(() => client.close()).pipe(Effect.ignore),
    ),
  );
  const storage = Layer.effect(
    StorageAdapter,
    Effect.gen(function* () {
      const client = yield* Connection;
      const runtime = yield* TripleStoreRuntime;
      return makeXtdbStorageAdapter(client, runtime.scope, {
        ...(options.maxRetries === undefined ? {} : { maxRetries: options.maxRetries }),
        ...(options.resolutionTimeoutMs === undefined
          ? {}
          : { resolutionTimeoutMs: options.resolutionTimeoutMs }),
        ...(options.admissionQueue === undefined ? {} : { admissionQueue: options.admissionQueue }),
        ...(options.constraintStrategy === undefined
          ? {}
          : { constraintStrategy: options.constraintStrategy }),
      });
    }),
  ).pipe(Layer.provide(connection));
  const queries = Layer.effect(
    QueryExecutor,
    Effect.gen(function* () {
      const client = yield* Connection;
      const runtime = yield* TripleStoreRuntime;
      return makeXtdbQueryExecutor(client, runtime.scope, options.queryLimits);
    }),
  ).pipe(Layer.provide(connection));
  // Runtime.define binds TripleStoreRuntime before acquiring the backend layers.
  // Its pre-1.0 generic retains that requirement despite supplying it at runtime.
  return Runtime.define({ name: "xtdb", storage, queries }) as RuntimeDefinition<
    MigrationError,
    never,
    StorageAdapter | QueryExecutor
  >;
};

export { makeXtdbClient, type XtdbClient, type XtdbBasis } from "./XtdbClient.js";
export { makeXtdbStorageAdapter } from "./XtdbStorageAdapter.js";
export { makeXtdbQueryExecutor, type XtdbQueryLimits } from "./XtdbQueryExecutor.js";
export {
  makeXtdbTemporalQueries,
  type IntervalBinding,
  type IntervalQueryOptions,
} from "./TemporalQueries.js";
export {
  makeXtdbMaintainedQueries,
  type MaintainedQueryOptions,
  type MaintainedQueryResult,
} from "./MaintainedQueries.js";
export { resolveXtdbOperation, type OperationResolution } from "./Operations.js";
export {
  makeXtdbNativeQueries,
  XTDB_NATIVE_MAPPING_ID,
  type XtdbNativeQueries,
  type XtdbNativeBuilder,
  type XtdbNativeReachabilityContext,
  type XtdbNativeReachabilityOptions,
} from "./native/NativeQueries.js";
// [EXP-C8] NativeWorkingOutcomeUnknown is gone with the scratch writes it reported on.
export { type XtdbNativeReachability } from "./native/Reachability.js";
export { type XtdbNativeContext } from "./native/Sources.js";
