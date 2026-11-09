import { Context, Effect, Layer } from "effect";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  TripleStoreRuntime,
  type RuntimeDefinition,
  type MigrationError,
} from "@triplex-build/triplex/runtime";
import { makeQleverClient, type QleverClient, type QleverConnectionMode } from "./QleverClient.js";
import { makeQleverStorageAdapter } from "./QleverStorageAdapter.js";
import type { QleverCommitEncoding } from "./rdf.js";
import { makeQleverQueryExecutor, type QleverQueryOptions } from "./QleverQueryExecutor.js";

export interface QleverRuntimeOptions {
  readonly url: string;
  readonly accessToken?: string;
  readonly connectionMode?: QleverConnectionMode;
  readonly maxRetries?: number;
  readonly resolutionTimeoutMs?: number;
  readonly admissionQueue?: boolean;
  /**
   * Experimental (EXP-J01). Default `a0`. When omitted, `TRIPLEX_COMMIT_ENCODING` may select
   * `compact`, so the unchanged lab gates (which build the runtime from this public factory) can run
   * the candidate; the gate note must record it.
   */
  readonly commitEncoding?: QleverCommitEncoding;
  readonly queryLimits?: Omit<QleverQueryOptions, "sourceView">;
}

/** The commit encoding an option or `TRIPLEX_COMMIT_ENCODING` selects; unknown values fail loudly. */
export const commitEncodingOf = (
  requested: string | undefined,
): QleverCommitEncoding | undefined => {
  const value = requested ?? process.env["TRIPLEX_COMMIT_ENCODING"];
  if (value === undefined || value === "") return undefined;
  if (value !== "a0" && value !== "compact")
    throw new TypeError("Unknown TRIPLEX_COMMIT_ENCODING; choose a0 or compact");
  return value;
};
class Connection extends Context.Service<Connection, QleverClient>()("triplex/qlever/Connection") {}
class Backend extends Context.Service<Backend, ReturnType<typeof makeQleverStorageAdapter>>()(
  "triplex/qlever/Backend",
) {}
export const makeQleverRuntime = (
  options: QleverRuntimeOptions,
): RuntimeDefinition<MigrationError, never, StorageAdapter | QueryExecutor> => {
  const commitEncoding = commitEncodingOf(options.commitEncoding);
  const connection = Layer.effect(
    Connection,
    Effect.acquireRelease(
      Effect.sync(() =>
        makeQleverClient(options.url, {
          ...(options.accessToken === undefined ? {} : { accessToken: options.accessToken }),
          ...(options.connectionMode === undefined
            ? {}
            : { connectionMode: options.connectionMode }),
        }),
      ),
      (client) => Effect.promise(() => client.close()).pipe(Effect.ignore),
    ),
  );
  const backend = Layer.effect(
    Backend,
    Effect.gen(function* () {
      const client = yield* Connection;
      const runtime = yield* TripleStoreRuntime;
      return makeQleverStorageAdapter(client, runtime.scope, {
        ...options,
        ...(commitEncoding === undefined ? {} : { commitEncoding }),
      });
    }),
  ).pipe(Layer.provide(connection));
  const storage = Layer.effect(
    StorageAdapter,
    Effect.map(Backend, (service) => service),
  ).pipe(Layer.provide(backend));
  const queries = Layer.effect(
    QueryExecutor,
    Effect.gen(function* () {
      const client = yield* Connection;
      const runtime = yield* TripleStoreRuntime;
      const storage = yield* Backend;
      return makeQleverQueryExecutor(client, runtime.scope, {
        ...options.queryLimits,
        sourceView: storage.sourceView,
      });
    }),
  ).pipe(Layer.provide(backend), Layer.provide(connection));
  return Runtime.define({ name: "qlever", storage, queries }) as RuntimeDefinition<
    MigrationError,
    never,
    StorageAdapter | QueryExecutor
  >;
};
export {
  makeQleverClient,
  qleverConnectionModeOf,
  type QleverConnectionMode,
  type QleverClient,
  type SparqlBinding,
  type SparqlTerm,
  type QleverRequestOptions,
  QleverHttpError,
} from "./QleverClient.js";
export { encodedRowFields, UNREAD_CHANNELS, type QleverCommitEncoding } from "./rdf.js";
export {
  makeQleverStorageAdapter,
  type QleverSourceView,
  type QleverStorageAdapterService,
} from "./QleverStorageAdapter.js";
export { makeQleverQueryExecutor, type QleverQueryOptions } from "./QleverQueryExecutor.js";
export {
  makeQleverTemporalQueries,
  type QleverIntervalBinding,
  type QleverIntervalQueryOptions,
} from "./TemporalQueries.js";
export { resolveQleverOperation, type QleverOperationResolution } from "./Operations.js";
export {
  makeQleverNativeQueries,
  type QleverNativeQueries,
  type QleverNativeQueryOptions,
  type QleverNativeRelationContext,
  type QleverNativeRelationOptions,
} from "./native/NativeQueries.js";
export {
  makeQleverNativeContext,
  QLEVER_NATIVE_MAPPING_ID,
  type QleverNativeContext,
  type QleverNativeBuilder,
  type QleverNativeAttribute,
  type QleverNativeFactOptions,
  type QleverNativeEntity,
} from "./native/NativeContext.js";
// [EXP-C8] QleverNativeWorkingOutcomeUnknown is gone with the scratch-graph updates it reported on.
export { type QleverNativeRelation } from "./native/BasisRelations.js";
