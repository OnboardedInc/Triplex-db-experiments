/** Experiment composition only; no production backend or dist files are changed. */
import { Context, Effect, Layer } from "effect";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  TripleStoreRuntime,
  DatalogValidationError,
  ReadError,
  type MigrationError,
  type QueryExecutorService,
  type RuntimeDefinition,
} from "../../packages/core/dist/runtime/index.js";
import type { DatalogQuery } from "../../packages/core/dist/datalog/index.js";
import {
  makeQleverStorageAdapter,
  type QleverClient,
  type SparqlBinding,
} from "../../packages/qlever/dist/index.js";
import type { CandidateBasis, CandidateQuery } from "./candidates.js";

export const makeWideCandidateRuntime = (
  client: QleverClient,
  compile: (query: DatalogQuery, scope: string, basis: CandidateBasis) => CandidateQuery,
  nativeQuery: (label: string, sparql: string) => Promise<SparqlBinding[]>,
  fixedPosition = 1,
): RuntimeDefinition<MigrationError, never, StorageAdapter | QueryExecutor> => {
  if (!Number.isSafeInteger(fixedPosition) || fixedPosition < 0)
    throw new RangeError("Invalid fixed experiment source cut");
  class Backend extends Context.Service<Backend, ReturnType<typeof makeQleverStorageAdapter>>()(
    "triplex/experiment/qlever-wide/Backend",
  ) {}
  const backend = Layer.effect(
    Backend,
    Effect.map(TripleStoreRuntime, (runtime) => makeQleverStorageAdapter(client, runtime.scope)),
  );
  const storage = Layer.effect(
    StorageAdapter,
    Effect.map(Backend, (service) => service),
  ).pipe(Layer.provide(backend));
  const queries = Layer.effect(
    QueryExecutor,
    Effect.gen(function* () {
      const runtime = yield* TripleStoreRuntime,
        adapter = yield* Backend;
      const invalid = (query: unknown, message: string) =>
        new DatalogValidationError({ query, message: `Wide experiment: ${message}` });
      const plan = (compiled: CandidateQuery) => ({
        backend: `qlever-wide-${compiled.strategy}`,
        steps: [
          ...(compiled.layoutGuardSparql
            ? [{ label: "layout", query: compiled.layoutGuardSparql }]
            : []),
          ...(compiled.domainSparql ? [{ label: "domain", query: compiled.domainSparql }] : []),
          { label: "main", query: compiled.sparql },
        ],
      });
      const executor: QueryExecutorService = {
        execute: (query, debug = false, basis) =>
          Effect.gen(function* () {
            if (yield* adapter.sourceView)
              return yield* Effect.fail(
                invalid(query, "pending overlays are outside this candidate gate"),
              );
            const latest = yield* adapter.currentCommitPosition();
            if (
              fixedPosition > latest ||
              (basis?.recordedPosition !== undefined && basis.recordedPosition !== fixedPosition)
            )
              return yield* Effect.fail(
                invalid(query, "query must use the declared existing fixed source cut"),
              );
            const resolved: CandidateBasis = {
              validAt: basis?.validAt ?? Date.now(),
              recordedPosition: fixedPosition,
              ...(basis?.recordedAt === undefined ? {} : { recordedAt: basis.recordedAt }),
            };
            return yield* Effect.tryPromise({
              try: async (signal) => {
                signal.throwIfAborted();
                const compilationStarted = performance.now(),
                  compiled = compile(query, runtime.scope, resolved);
                const compilationTimeMs = performance.now() - compilationStarted;
                if (
                  compiled.layoutGuardSparql &&
                  (await nativeQuery("layout", compiled.layoutGuardSparql)).length
                )
                  throw invalid(
                    query,
                    "scope contains assertions without persisted scalar channels; explicit migration is required",
                  );
                signal.throwIfAborted();
                if (compiled.domainSparql) {
                  const rows = await nativeQuery("domain", compiled.domainSparql),
                    families = new Set<string>();
                  if (rows.length > 1000)
                    throw new RangeError("Candidate numeric-domain result exceeds1000 rows");
                  for (const row of rows)
                    for (const term of Object.values(row)) {
                      if (term.value !== "number" && term.value !== "integer")
                        throw invalid(
                          query,
                          "ordered predicates require exclusively numeric scalar families",
                        );
                      families.add(term.value);
                    }
                  if (families.size > 1)
                    throw invalid(
                      query,
                      "mixed integer/number ordered domains require explicit conversion",
                    );
                }
                signal.throwIfAborted();
                const started = performance.now(),
                  raw = await nativeQuery("main", compiled.sparql),
                  executionTimeMs = performance.now() - started;
                signal.throwIfAborted();
                if (raw.length > 1000)
                  throw new RangeError(
                    "Candidate final answer exceeds1000 rows; no partial answer",
                  );
                const results = raw.map(compiled.decode);
                return {
                  results,
                  ...(debug
                    ? {
                        debug: {
                          metrics: {
                            patternCount: compiled.patternCount,
                            predicateCount: query.where.length - compiled.patternCount,
                            notClauseCount: 0,
                            orClauseCount: 0,
                            hasAggregation: false,
                            isRecursive: false,
                            aggregateOps: [],
                            compilationTimeMs,
                          },
                          executionTimeMs,
                          resultCount: results.length,
                          queryPlan: plan(compiled),
                        },
                      }
                    : {}),
                };
              },
              catch: (cause) =>
                cause instanceof DatalogValidationError || cause instanceof ReadError
                  ? cause
                  : new ReadError({ message: "QLever wide candidate failed", cause }),
            });
          }),
        executePage: (query) =>
          Effect.fail(
            invalid(query, "pagination is not qualified by the positive-query experiment"),
          ),
        explain: (query) =>
          Effect.try({
            try: () => ({
              queryPlan: plan(
                compile(query, runtime.scope, {
                  validAt: Date.now(),
                  recordedPosition: fixedPosition,
                }),
              ),
            }),
            catch: (cause) =>
              cause instanceof DatalogValidationError ? cause : invalid(query, String(cause)),
          }),
        explainPage: (query) =>
          Effect.fail(invalid(query, "wrapped query explanations are outside this gate")),
      };
      return executor;
    }),
  ).pipe(Layer.provide(backend));
  return Runtime.define({ name: "qlever-wide-experiment", storage, queries }) as RuntimeDefinition<
    MigrationError,
    never,
    StorageAdapter | QueryExecutor
  >;
};
