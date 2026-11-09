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
  readonly admissionQueue?: boolean;
  readonly maxRetries?: number;
  readonly resolutionTimeoutMs?: number;
}): RuntimeDefinition<MigrationError, never, StorageAdapter | QueryExecutor> {
  const connection = Layer.effect(
    Connection,
    Effect.acquireRelease(
      Effect.sync(() => new DatomicClient(options.url, 35_000)),
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
      return makeDatomicQueryExecutor(client, runtime.scope);
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
export {
  makeDatomicStorageAdapter,
  DatomicSerializationConflict,
} from "./DatomicStorageAdapter.js";
export { makeDatomicQueryExecutor } from "./DatomicQueryExecutor.js";

export { DatomicBasisNotAvailable } from "./readErrors.js";
