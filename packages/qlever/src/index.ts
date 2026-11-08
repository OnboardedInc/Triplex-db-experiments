import { Context, Effect, Layer } from "effect";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  TripleStoreRuntime,
  type RuntimeDefinition,
  MigrationError,
} from "@triplex-build/triplex/runtime";
import { makeQleverClient, type QleverClient } from "./QleverClient.js";
import { makeQleverStorageAdapter } from "./QleverStorageAdapter.js";
import { makeQleverQueryExecutor, type QleverQueryOptions } from "./QleverQueryExecutor.js";
import { createHash } from "node:crypto";
import path from "node:path";
import { HostBroker } from "./broker/broker.js";
import { makeFreshConnectionClient } from "./broker/http.js";
import type {
  BrokerAdapterOptions,
  QleverBrokerStorageAdapterService,
} from "./broker/BrokerStorageAdapter.js";

export interface QleverRuntimeOptions {
  readonly url: string;
  readonly accessToken?: string;
  readonly maxRetries?: number;
  readonly resolutionTimeoutMs?: number;
  readonly admissionQueue?: boolean;
  readonly queryLimits?: Omit<QleverQueryOptions, "sourceView" | "resolveBasis">;
  /**
   * EXP-P2Q candidate, default off: open the host broker for the runtime's scope. The broker becomes the
   * source of truth (ACK after its durable frame), reads route through its overlay, and every request uses
   * a fresh TCP connection (R17 0.2 item 1). The runtime closes the broker when the layer is released.
   */
  readonly broker?: (scopeKey: string, replica: QleverClient) => Promise<HostBroker>;
  readonly brokerOptions?: BrokerAdapterOptions;
}
/**
 * EXP-P2Q, as EXP-P2X did with XTDB_COMMIT_PATH: when no broker option is given, `QLEVER_COMMIT_PATH=broker`
 * selects the candidate so the unchanged lab gates (which build the runtime from this factory) can run it;
 * the gate note must record it. The log root must be named explicitly (`QLEVER_BROKER_DIR`, a host
 * directory, never /tmp); each scope gets its own stream directory under it.
 */
const brokerFromEnvironment = (): QleverRuntimeOptions["broker"] => {
  const requested = process.env["QLEVER_COMMIT_PATH"];
  if (requested === undefined || requested === "" || requested === "marker") return undefined;
  if (requested !== "broker") throw new TypeError("Unknown QLEVER_COMMIT_PATH; choose marker or broker");
  const root = process.env["QLEVER_BROKER_DIR"];
  if (!root) throw new TypeError("QLEVER_COMMIT_PATH=broker requires QLEVER_BROKER_DIR");
  return (scopeKey, replica) =>
    HostBroker.open({
      dir: path.join(root, createHash("sha256").update(scopeKey).digest("hex").slice(0, 32)),
      scopeKey,
      replica,
    });
};
class Connection extends Context.Service<Connection, QleverClient>()("triplex/qlever/Connection") {}
class Backend extends Context.Service<Backend, ReturnType<typeof makeQleverStorageAdapter>>()(
  "triplex/qlever/Backend",
) {}
export const makeQleverRuntime = (
  input: QleverRuntimeOptions,
): RuntimeDefinition<MigrationError, never, StorageAdapter | QueryExecutor> => {
  const envBroker = input.broker ? undefined : brokerFromEnvironment();
  const options: QleverRuntimeOptions = envBroker ? { ...input, broker: envBroker } : input;
  const clientOptions = options.accessToken ? { accessToken: options.accessToken } : {};
  const connection = Layer.effect(
    Connection,
    Effect.acquireRelease(
      Effect.sync(() =>
        options.broker
          ? makeFreshConnectionClient(options.url, clientOptions)
          : makeQleverClient(options.url, clientOptions),
      ),
      (client) => Effect.promise(() => client.close()).pipe(Effect.ignore),
    ),
  );
  const { broker: openBroker, ...adapterOptions } = options;
  const backend = Layer.effect(
    Backend,
    Effect.gen(function* () {
      const client = yield* Connection;
      const runtime = yield* TripleStoreRuntime;
      if (!openBroker) return makeQleverStorageAdapter(client, runtime.scope, adapterOptions);
      const broker = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => openBroker(runtime.scope, client),
          catch: (cause) =>
            new MigrationError({ version: 1, name: "qlever-broker", message: "Cannot open the QLever host broker", cause }),
        }),
        (opened) => Effect.promise(() => opened.close()).pipe(Effect.ignore),
      );
      return makeQleverStorageAdapter(client, runtime.scope, { ...adapterOptions, broker });
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
        ...("resolveQueryBasis" in storage
          ? { resolveBasis: (storage as QleverBrokerStorageAdapterService).resolveQueryBasis }
          : {}),
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
  type QleverClient,
  type SparqlBinding,
  type SparqlTerm,
  type QleverRequestOptions,
  QleverHttpError,
} from "./QleverClient.js";
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
  BROKER_NATIVE_AWAIT_BASIS_MS,
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
export { type QleverNativeRelation, QleverNativeWorkingOutcomeUnknown } from "./native/BasisRelations.js";
// EXP-P2Q host log plus broker (experimental, default off).
export {
  HostBroker,
  BrokerFailed,
  BrokerInvalidTransaction,
  type BrokerDecision,
  type BrokerEvent,
  type BrokerStats,
  type BrokerTransaction,
  type HostBrokerOptions,
  type ReplicaSnapshot,
} from "./broker/broker.js";
export {
  makeQleverBrokerStorageAdapter,
  QleverBrokerConflict,
  type BrokerAdapterOptions,
  type BrokerReadEvent,
  type BrokerReadRoute,
  type QleverBrokerStorageAdapterService,
  type BasisGate,
} from "./broker/BrokerStorageAdapter.js";
export { makeFreshConnectionClient } from "./broker/http.js";
export { HostLog, BrokerLogError, readWatermark, readFramesFrom, segmentStart, type LogFrame, type Watermark } from "./broker/log.js";
export { FrameKind, scanSegment, encodeFrame, encodeSegmentHeader } from "./broker/frame.js";
export { crc32c } from "./broker/crc32c.js";
export { ORDINALS, packPosition, lsnOf, ordinalOf, lastPositionOf } from "./broker/position.js";
export { decodeCommitGroup, encodeCommitGroup, type CommitGroupPayload, type FrameMember } from "./broker/frames.js";
export { buildPublication, markerQuery, type ReplicaMarker } from "./broker/sparql.js";
export * from "./broker/feed.js";
