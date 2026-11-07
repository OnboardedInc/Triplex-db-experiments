import { Effect } from "effect";
import { isPatternClause, type Clause, type DatalogQuery } from "@triplex-build/triplex/datalog";
import {
  assertDatalogQuery,
  DatalogValidationError,
  ReadError,
  type QueryContext,
} from "@triplex-build/triplex/runtime";
import { makeSqlQueryExecutor, type SqlStatementRunner } from "@triplex-build/triplex-sql";
import { withDuckDBClientBackend, type DuckDBClient } from "./DuckDBClient.js";
import { DuckDBSqlStrategy } from "./SqlStrategy.js";
import { resolveDuckDBTypeDomains } from "./TypeDomains.js";

export interface DuckDBIntervalQueryOptions {
  readonly from: number;
  readonly to: number;
  readonly recordedPosition?: number;
  readonly recordedAt?: number;
  readonly maxRows?: number;
  readonly maxSpans?: number;
  readonly maxSpanAnswerRows?: number;
  readonly timeoutMs?: number;
}
export interface DuckDBIntervalBinding {
  readonly bindings: QueryContext;
  readonly validFrom: number;
  readonly validTo: number;
}
const time = (value: number, name: string) => {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${name} must be a finite nonnegative Triplex instant`);
};
const dependencies = (input: unknown) => {
  const attributes = new Set<string>();
  let dynamic = false;
  const walk = (item: unknown) => {
    if (!Array.isArray(item)) return;
    if (isPatternClause(item as unknown as Clause) && typeof item[1] === "string") {
      if (item[1].startsWith(":")) attributes.add(item[1]);
      else if (item[1].startsWith("?")) dynamic = true;
    }
    item.forEach(walk);
  };
  walk(input);
  return { attributes, dynamic };
};

/** Bounded interval baseline inspired by QLever's boundary/point path. DuckDB
 * discovers only endpoints and evaluates the unchanged AST in the engine at
 * each elementary span under one physical transaction and captured commit cut.
 * Host work coalesces bounded final bindings; it never evaluates source facts.
 * Source/rationale: packages/qlever/src/TemporalQueries.ts and wiki/research.md.
 */
export const makeDuckDBTemporalQueries = (client: DuckDBClient, scope: string) => ({
  queryIntervals: (
    query: DatalogQuery,
    options: DuckDBIntervalQueryOptions,
  ): Effect.Effect<readonly DuckDBIntervalBinding[], ReadError | DatalogValidationError> =>
    Effect.tryPromise({
      try: async (effectSignal) => {
        assertDatalogQuery(query);
        time(options.from, "from");
        time(options.to, "to");
        if (options.from >= options.to) throw new RangeError("Interval window must have from < to");
        if (options.recordedAt !== undefined) time(options.recordedAt, "recordedAt");
        if (
          query.rules?.length ||
          query.limit !== undefined ||
          query.offset !== undefined ||
          !query.find.length
        )
          throw new DatalogValidationError({
            query,
            message:
              "Interval bridge requires an unbounded nonrecursive relation with at least one projected binding",
          });
        const maxRows = options.maxRows ?? 1000,
          maxSpans = options.maxSpans ?? 1000,
          maxSpanRows = options.maxSpanAnswerRows ?? 100000,
          timeoutMs = options.timeoutMs ?? 30000;
        if (
          ![maxRows, maxSpans, maxSpanRows].every(
            (value) => Number.isSafeInteger(value) && value > 0 && value <= 100000,
          ) ||
          !Number.isSafeInteger(timeoutMs) ||
          timeoutMs < 1
        )
          throw new RangeError("Invalid interval row/span/deadline budget");
        const signal = AbortSignal.any([effectSignal, AbortSignal.timeout(timeoutMs)]);
        return withDuckDBClientBackend(client, scope, (backend) =>
          backend.withTransaction(async (session) => {
            const latest = await session.currentCommitPosition(),
              recordedPosition = options.recordedPosition ?? latest;
            if (
              !Number.isSafeInteger(recordedPosition) ||
              recordedPosition < 0 ||
              recordedPosition > latest
            )
              throw new RangeError(
                "recordedPosition must identify an existing committed source cut",
              );
            const deps = dependencies(query.where);
            for (const field of query.optionalProjection?.fields ?? [])
              deps.attributes.add(field.attribute);
            const params: unknown[] = [BigInt(recordedPosition), BigInt(recordedPosition)];
            const conditions = [
              "recorded_position <= ?",
              "(retracted_position IS NULL OR retracted_position > ?" +
                (options.recordedAt === undefined ? "" : " OR retracted_at > ?") +
                ")",
            ];
            if (options.recordedAt !== undefined) {
              params.push(options.recordedAt);
              conditions.push("recorded_at <= ?");
              params.push(options.recordedAt);
            }
            conditions.push("valid_from < ?", "(valid_to IS NULL OR valid_to > ?)");
            params.push(options.to, options.from);
            if (!deps.dynamic && deps.attributes.size) {
              conditions.push(
                "attribute IN (" + [...deps.attributes].map(() => "?").join(",") + ")",
              );
              params.push(...deps.attributes);
            }
            params.push(options.from, options.to);
            signal.throwIfAborted();
            const rows = await session.runRecords<{ cut: number }>(
              `WITH relevant AS MATERIALIZED (SELECT valid_from,valid_to FROM td_triplex_public_v2.triples WHERE ${conditions.join(" AND ")}), cuts AS (SELECT valid_from cut FROM relevant UNION SELECT valid_to cut FROM relevant) SELECT cut FROM cuts WHERE cut > ? AND cut < ? ORDER BY cut LIMIT ${maxSpans + 1}`,
              params,
              signal,
            );
            const instants = [options.from, ...rows.map((row) => row.cut), options.to];
            if (instants.length - 1 > maxSpans)
              throw new ReadError({
                message: `Interval query exceeds maxSpans=${maxSpans}; no partial answer returned`,
              });
            const runner: SqlStatementRunner = {
              run: <Row extends Record<string, unknown>>(sql: string, values: readonly unknown[]) =>
                Effect.tryPromise({
                  try: (readSignal) => session.runRecords<Row>(sql, values, readSignal),
                  catch: (cause) =>
                    new ReadError({ message: "DuckDB interval point execution failed", cause }),
                }),
            };
            const intervals: Array<{ bindings: QueryContext; validFrom: number; validTo: number }> =
                [],
              last = new Map<
                string,
                { bindings: QueryContext; validFrom: number; validTo: number }
              >();
            let decoded = 0;
            for (let index = 0; index < instants.length - 1; index++) {
              signal.throwIfAborted();
              const from = instants[index]!,
                to = instants[index + 1]!;
              const basis = {
                validAt: from,
                recordedPosition,
                ...(options.recordedAt === undefined ? {} : { recordedAt: options.recordedAt }),
              };
              const domains = await Effect.runPromise(
                resolveDuckDBTypeDomains(runner, DuckDBSqlStrategy, query, { basis }),
                { signal },
              );
              const result = await Effect.runPromise(
                makeSqlQueryExecutor(runner, DuckDBSqlStrategy, domains.compilation).execute(
                  query,
                  false,
                  basis,
                ),
                { signal },
              );
              decoded += result.results.length;
              if (decoded > maxSpanRows)
                throw new ReadError({
                  message: `Interval point answers exceed maxSpanAnswerRows=${maxSpanRows}; no partial answer returned`,
                });
              for (const bindings of result.results) {
                const key = JSON.stringify(
                    Object.keys(bindings)
                      .sort()
                      .map((name) => [name, bindings[name]]),
                  ),
                  prior = last.get(key);
                if (prior && prior.validTo === from) prior.validTo = to;
                else {
                  const span = { bindings, validFrom: from, validTo: to };
                  intervals.push(span);
                  last.set(key, span);
                }
                if (intervals.length > maxRows)
                  throw new ReadError({
                    message: `Interval answer exceeds maxRows=${maxRows}; no partial answer returned`,
                  });
              }
            }
            signal.throwIfAborted();
            return Object.freeze(intervals.map((span) => Object.freeze(span)));
          }, { signal }),
        );
      },
      catch: (cause) =>
        cause instanceof ReadError || cause instanceof DatalogValidationError
          ? cause
          : new ReadError({ message: "DuckDB interval query failed", cause }),
    }),
});
