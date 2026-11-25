import { Context, Effect, Layer } from "effect";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  TripleStoreRuntime,
  type RuntimeDefinition,
  type MigrationError,
} from "@triplex-build/triplex/runtime";
import { DatomicClient } from "./DatomicClient.js";
import { makeDatomicStorageAdapter } from "./DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "./DatomicQueryExecutor.js";
class Connection extends Context.Service<Connection, DatomicClient>()(
  "triplex/datomic/Connection",
) {}
// [EXP-DA01] Why: one scoped peer client is shared by writes and queries. Rejected: independent clients (lose callback overlay identity).
export function makeDatomicRuntime(options: {
  readonly url: string;
  readonly groupAccount?: string;
  readonly writeClass?: import("./DatomicClient.js").DatomicWriteClass;
  readonly layout?: "lean" | "legacy";
  readonly entityCacheBytes?: number;
  readonly rowCacheBytes?: number;
  readonly predecessorCacheBytes?: number;
  readonly predecessorAttributes?: readonly string[];
  readonly receiptPredecessorAttributes?: readonly string[];
  readonly admissionQueue?: boolean;
  readonly maxRetries?: number;
  readonly serverRecordTime?: boolean;
  readonly recordedJournalReads?: boolean;
  readonly boundedJournalPages?: boolean;
  readonly resolutionTimeoutMs?: number;
  readonly idLists?: import("./idLists.js").IdListOptions;
  /** [DX-RD4] A reader built from a receipt: every unpinned read answers at or after its position. */
  readonly readAtLeast?: import("./readAtLeast.js").ReadAtLeast;
  /** [DX-XQ7] The question reader's URL: ID lists, sweeps and find go there; everything else to `url` as before. */
  readonly questionReaderUrl?: string;
  /** [DX-S2] One ordered block of identities per subject's save (see the adapter option). Default off. */
  readonly orderedSaves?: boolean;
  /** [DX-S2] The save-size rule (see the adapter option). Default off. */
  readonly saveSizeRule?: boolean;
  /** [DX-S3] With orderedSaves, one ordered block for a save of two to four owners (see the adapter option). Default off. */
  readonly severalOwners?: boolean;
}): RuntimeDefinition<MigrationError, never, StorageAdapter | QueryExecutor> {
  const connection = Layer.effect(
    Connection,
    Effect.acquireRelease(
      Effect.sync(() => new DatomicClient(options.url, 35_000, 64 * 1024 ** 2, options)),
      (client) => Effect.sync(() => client.close()),
    ),
  );
  const storage = Layer.effect(
    StorageAdapter,
    Effect.gen(function* () {
      const client = yield* Connection;
      const runtime = yield* TripleStoreRuntime;
      return makeDatomicStorageAdapter(client, runtime.scope, options);
    }),
  ).pipe(Layer.provide(connection));
  const queries = Layer.effect(
    QueryExecutor,
    Effect.gen(function* () {
      const client = yield* Connection;
      const runtime = yield* TripleStoreRuntime;
      return makeDatomicQueryExecutor(client, runtime.scope, options);
    }),
  ).pipe(Layer.provide(connection));
  return Runtime.define({ name: "datomic", storage, queries }) as RuntimeDefinition<
    MigrationError,
    never,
    StorageAdapter | QueryExecutor
  >;
}
export * from "./codec.js";
export * from "./DatomicClient.js";
export { orderedSaveIdentity, wideOrderedSaveIdentity, type OrderedSaveIdentity } from "./orderedSaveIdentity.js";
export {
  makeDatomicStorageAdapter,
  DatomicSerializationConflict,
  DatomicCommitOrderError,
  SaveTooLarge,
  SaveRequestTooLarge,
  SAVE_LIMIT_FACTS,
  SUBJECT_SAVE_FACTS,
  SUBJECT_SAVE_OWNERS,
  orderedSaveShape,
} from "./DatomicStorageAdapter.js";
export { makeDatomicQueryExecutor } from "./DatomicQueryExecutor.js";

export { DatomicBasisNotAvailable, DatomicLayoutUnsupported, DatomicAtLeastTimeout } from "./readErrors.js";
export { ReadAtLeast, type ReadAtLeastRequest } from "./readAtLeast.js";
export {
  configStoreIdLists,
  DatomicMatchNeedsPaging,
  listIdsPage,
  type IdListOptions,
  type IdListSource,
} from "./idLists.js";
export {
  sweepAll,
  sweepCount,
  sweepPage,
  sweepPageWaiting,
  type SweepCondition,
  type SweepCount,
  type SweepPage,
  type SweepRequest,
  type SweepValue,
} from "./sweep.js";

export { sweepRows, decodeSweepRows, type SweepRow } from "./sweepRows.js";
export { acceptLoaderPositionRows, loaderPositionRowsAccepted } from "./loaderPositionRows.js";
export * from "./replica/index.js";

export { resumeCommitOrder } from "./CommitOrder.js";
export * from "./tracing.js";

export { requireDatomicSourcePosition, withDatomicImportClock } from "./TransactionContext.js";

export {
  withDatomicErasureSequence,
  type ErasureFrontier,
  type ErasureReceipt,
  type ErasureSelector,
} from "./erasure.js";
