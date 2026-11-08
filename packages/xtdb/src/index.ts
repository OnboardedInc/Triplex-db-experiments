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
import { makeXtdbStorageAdapter, type XtdbCommitEncoding } from "./XtdbStorageAdapter.js";
import { makeXtdbQueryExecutor, type XtdbQueryLimits } from "./XtdbQueryExecutor.js";

export interface XtdbRuntimeOptions {
  readonly url: string;
  readonly maxRetries?: number;
  readonly resolutionTimeoutMs?: number;
  readonly admissionQueue?: boolean;
  /** Experimental SQL constraint strategies; portable remains the default. */
  readonly constraintStrategy?: "portable" | "inline" | "projection";
  /**
   * Experimental (EXP-J01). Default `a0`. When omitted, `TRIPLEX_COMMIT_ENCODING` may select
   * `compact`, so the unchanged lab gates (which build the runtime from this public factory) can run
   * the candidate; the gate note must record it.
   */
  readonly commitEncoding?: XtdbCommitEncoding;
  readonly queryLimits?: XtdbQueryLimits;
}

/** The commit encoding an option or `TRIPLEX_COMMIT_ENCODING` selects; unknown values fail loudly. */
export const commitEncodingOf = (requested: string | undefined): XtdbCommitEncoding | undefined => {
  const value = requested ?? process.env["TRIPLEX_COMMIT_ENCODING"];
  if (value === undefined || value === "") return undefined;
  if (value !== "a0" && value !== "compact")
    throw new TypeError("Unknown TRIPLEX_COMMIT_ENCODING; choose a0 or compact");
  return value;
};

class Connection extends Context.Service<Connection, XtdbClient>()("triplex/xtdb/Connection") {}

/**
 * An XTDB-backed Triplex runtime. Database identity is bound by `.layer({scope})`.
 * Explicitly pass Capabilities.none until optional providers are qualified.
 * Connections are acquired once per Effect scope and released by that scope.
 */
export const makeXtdbRuntime = (
  options: XtdbRuntimeOptions,
): RuntimeDefinition<MigrationError, never, StorageAdapter | QueryExecutor> => {
  const commitEncoding = commitEncodingOf(options.commitEncoding);
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
        ...(commitEncoding === undefined ? {} : { commitEncoding }),
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
export {
  makeXtdbStorageAdapter,
  compactGuards,
  type XtdbCommitEncoding,
} from "./XtdbStorageAdapter.js";
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
export { type XtdbNativeReachability, NativeWorkingOutcomeUnknown } from "./native/Reachability.js";
export { type XtdbNativeContext } from "./native/Sources.js";
