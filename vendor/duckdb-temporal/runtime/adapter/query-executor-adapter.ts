/** Source-only until exact dependencies, selected SQL strategy and runtime tests are available. */
import { Context, Effect, Layer } from "effect";
import {
  QueryExecutor, StorageAdapter, ReadError, WriteError,
  type QueryExecutorService, type StorageAdapterService,
} from "@triplex-build/triplex/runtime";
import { makeSqlQueryExecutor, type SqlDialect, type SqlStatementRunner } from "@triplex-build/triplex-sql";
import { makeEffectStorage, type GranularBackend } from "./effect-storage.js";
import { ownExecuteResult, ownWrappedResult, ownExplainResult } from "./query-result-boundary.mjs";

export interface DuckDBAdapterServices {
  readonly storage: StorageAdapterService;
  readonly queries: QueryExecutorService;
}
class SharedAdapter extends Context.Service<SharedAdapter, DuckDBAdapterServices>()("Goal10/SharedDuckDBAdapter") {}
const boundaryFailure = (cause: unknown) => new ReadError({ message: "DuckDB query result admission failed", cause });
const closeFailure = (cause: unknown) => new WriteError({ message: "DuckDB adapter resource close failed", cause });

/**
 * The strategy is explicit and unchanged. No fabricated `duckdb` SqlDialect name,
 * unsafe dialect cast, SQL rewriting, driver substitution or default compatibility claim.
 */
export const makeAdapterServices = (backend: GranularBackend, schema: string, strategy: SqlDialect): DuckDBAdapterServices => {
  if (!["sqlite", "postgresql", "mysql"].includes(strategy.name)) throw new TypeError("Unknown pinned compiler SQL strategy");
  // Own the selected name and callback identities; the callbacks remain trusted pure functions.
  const selected: SqlDialect = Object.freeze({
    name: strategy.name,
    limitOffset: strategy.limitOffset.bind(strategy),
    castAsText: strategy.castAsText.bind(strategy),
    booleanLiteral: strategy.booleanLiteral.bind(strategy),
    paramPlaceholder: strategy.paramPlaceholder.bind(strategy),
    escapeLikePattern: strategy.escapeLikePattern.bind(strategy),
  });
  const bundle = makeEffectStorage(backend, schema);
  const runner: SqlStatementRunner = { run: bundle.runRecords };
  const delegate = makeSqlQueryExecutor(runner, selected);
  const physicalLabel = `duckdb (compiler SQL strategy: ${selected.name})`;

  const owned = <A, B, E>(work: Effect.Effect<A, E>, copy: (value: A) => B): Effect.Effect<B, E | ReadError> =>
    Effect.flatMap(work, value => Effect.try({ try: () => copy(value), catch: boundaryFailure }));

  const snapshot = <A, E>(work: Effect.Effect<A, E>): Effect.Effect<A, E | ReadError> =>
    bundle.storage.withTransaction(work).pipe(Effect.mapError(error =>
      error instanceof WriteError
        ? new ReadError({ message: "DuckDB query snapshot was not acknowledged", cause: error })
        : error));

  const queries: QueryExecutorService = {
    // Ownership conversion finishes before COMMIT; malformed rows cannot escape as a successful snapshot.
    execute: (query, debug, basis) => snapshot(owned(
      delegate.execute(query, debug, basis), value => ownExecuteResult(value, physicalLabel))),
    // One transaction surrounds BOTH the pinned executor's main and optional total-count calls.
    executePage: (query, debug, basis, cursorValues) => snapshot(owned(
      delegate.executePage(query, debug, basis, cursorValues), value => ownWrappedResult(value, physicalLabel))),
    // The pinned implementations compile only. Do not manufacture a physical read for EXPLAIN metadata.
    explain: query => owned(delegate.explain(query), value => ownExplainResult(value, physicalLabel)),
    explainPage: query => owned(delegate.explainPage(query), value => ownExplainResult(value, physicalLabel)),
  };
  // The query runner and storage MUST share this exact bundle and private transaction token.
  // Constraint queries inside a write then reuse its post-state rather than queueing behind themselves.
  return Object.freeze({ storage: bundle.storage, queries: Object.freeze(queries) });
};

/**
 * The same shared Layer object is provided to both projections. Default Effect
 * layer memoization is expected to acquire/close one backend per enclosing scope.
 * Resource count, initialization failure and cleanup behavior still need real tests.
 */
export const makeAdapterLayers = <E, R>(openBackend: Effect.Effect<GranularBackend, E, R>, schema: string, strategy: SqlDialect) => {
  const shared = Layer.effect(SharedAdapter, Effect.gen(function* () {
    const backend = yield* Effect.acquireRelease(openBackend, value =>
      Effect.orDie(Effect.tryPromise({ try: () => value.close(), catch: closeFailure })));
    return makeAdapterServices(backend, schema, strategy);
  }));
  return Object.freeze({
    storage: Layer.effect(StorageAdapter, Effect.map(SharedAdapter, services => services.storage)).pipe(Layer.provide(shared)),
    queries: Layer.effect(QueryExecutor, Effect.map(SharedAdapter, services => services.queries)).pipe(Layer.provide(shared)),
  });
};
