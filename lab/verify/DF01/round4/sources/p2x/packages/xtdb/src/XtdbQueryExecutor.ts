import { Effect, Layer } from "effect";
import {
  QueryExecutor,
  ReadError,
  DatalogValidationError,
  UnboundVariableError,
  type QueryExecutorService,
  type QueryContext,
  type QueryMetrics,
  type QueryPlan,
  assertDatalogQuery,
  assertWrappedQuery,
} from "@triplex-build/triplex/runtime";
import { integer } from "@triplex-build/triplex";
import type { PaginationValue } from "@triplex-build/triplex/internal";
import { resolveIntegerVariables } from "./query/domains.js";
import type { DatalogQuery, WrappedQuery } from "@triplex-build/triplex/datalog";
import type { XtdbClient } from "./XtdbClient.js";
import { compileXtdb, type XtdbCompiledQuery, type QueryBasis } from "./query/compiler.js";
import { materializeRules } from "./query/recursion.js";
import { CurrentTransactions } from "./TransactionContext.js";
import { clientWithOverlay } from "./query/overlay.js";

const failure = (cause: unknown) =>
  cause instanceof DatalogValidationError || cause instanceof UnboundVariableError
    ? cause
    : new ReadError({ message: `XTDB Datalog execution failed: ${String(cause)}`, cause });

const numeric = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const result = typeof value === "number" ? value : Number(value);
  const exactInteger =
    typeof value === "bigint" || (typeof value === "string" && /^[+-]?\d+$/.test(value));
  if (!Number.isFinite(result) || (exactInteger && !Number.isSafeInteger(result)))
    throw new Error(`XTDB returned an unrepresentable Triplex number: ${String(value)}`);
  return result;
};
const exactInteger = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "bigint")
    throw new TypeError("Exact integer result must arrive through a lossless text carrier");
  return integer(String(value).replace(/\.0+$/, ""));
};

export const decodeQueryRow = (
  row: Record<string, unknown>,
  compiled: XtdbCompiledQuery,
): QueryContext => {
  const result: Record<string, QueryContext[string]> = {};
  for (const [column, variable] of compiled.columnMap) {
    if (compiled.constantColumns.has(column)) {
      result[variable] = compiled.constantColumns.get(column)!;
      continue;
    }
    if (compiled.integerColumns?.has(column)) {
      result[variable] = row[column] == null ? null : exactInteger(row[column]);
      continue;
    }
    const columns = compiled.valueColumnMap.get(column);
    if (columns) {
      switch (row[columns.type]) {
        case "string":
          result[variable] = row[columns.string] == null ? null : String(row[columns.string]);
          break;
        case "number":
          result[variable] = numeric(row[columns.number]);
          break;
        case "integer":
          result[variable] = exactInteger(row[columns.string]);
          break;
        case "boolean":
          result[variable] = [true, 1, 1n, "1"].includes(row[columns.boolean] as never);
          break;
        default:
          result[variable] = null;
      }
    } else {
      const value = row[column];
      result[variable] =
        value == null
          ? null
          : compiled.numericColumns.has(column) || typeof value === "bigint"
            ? numeric(value)
            : typeof value === "boolean" || typeof value === "number" || typeof value === "string"
              ? value
              : String(value);
    }
  }
  return result;
};

const plan = (compiled: XtdbCompiledQuery, recursive: boolean): QueryPlan => ({
  backend: "xtdb-2.2-sql",
  steps: [
    ...(recursive
      ? [
          {
            label: "recursive relations",
            query:
              "XTDB SQL fixed-point rounds over run-scoped relations; source commit position fixed; no intermediate rows transferred to host",
          },
        ]
      : []),
    { label: "main", query: compiled.sql, params: compiled.params },
    ...(compiled.countSql
      ? [{ label: "count", query: compiled.countSql, params: compiled.countParams ?? [] }]
      : []),
  ],
});

const emptyMetrics: QueryMetrics = {
  patternCount: 0,
  predicateCount: 0,
  notClauseCount: 0,
  orClauseCount: 0,
  hasAggregation: false,
  isRecursive: false,
  aggregateOps: [],
  compilationTimeMs: 0,
};

export interface XtdbQueryLimits {
  readonly timeoutMs?: number;
  readonly maxResultRows?: number;
  readonly maxRecursiveRows?: number;
}

/** Dedicated public Triplex executor. XTDB runs all relational operators. */
export const makeXtdbQueryExecutor = (
  client: XtdbClient,
  scopeKey: string,
  limits: XtdbQueryLimits = {},
): QueryExecutorService => {
  const maxResultRows = limits.maxResultRows ?? 100_000;
  const maxRecursiveRows = limits.maxRecursiveRows ?? 100_000;
  const timeoutMs = limits.timeoutMs ?? 30_000;
  if (
    ![maxResultRows, maxRecursiveRows, timeoutMs].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    )
  )
    throw new RangeError("XTDB query limits must be positive safe integers");
  const run = (
    input: DatalogQuery | WrappedQuery,
    debug: boolean,
    basis?: QueryBasis,
    cursorValues?: readonly PaginationValue[],
  ) =>
    Effect.flatMap(CurrentTransactions, (transactions) =>
      Effect.tryPromise({
        try: async (effectSignal) => {
          const signal = AbortSignal.any([effectSignal, AbortSignal.timeout(timeoutMs)]);
          const logical = "inner" in input ? input.inner : input;
          const recursive = Boolean(logical.rules?.length);
          // Preflight must fail before source reads or working-relation writes.
          if ("inner" in input) assertWrappedQuery(input);
          else assertDatalogQuery(input);
          const state = [...transactions.values()].findLast(
            (state) => state.client === client && state.scopeKey === scopeKey,
          );
          if (state && state.rows.size > maxResultRows)
            throw new ReadError({
              message: `Transaction query overlay exceeds maxResultRows=${maxResultRows}; no partial result returned`,
            });
          const source = state ? clientWithOverlay(client, scopeKey, state) : client;
          let resolved: QueryBasis = basis ?? { validAt: Date.now() };
          if (state)
            resolved = {
              ...resolved,
              recordedPosition: Math.min(
                state.position,
                resolved.recordedPosition ?? state.position,
              ),
            };
          if (resolved.recordedPosition === undefined) {
            const rows = await client.query<{ position: unknown }>(
              "SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
              [scopeKey],
              undefined,
              { signal },
            );
            resolved = { ...resolved, recordedPosition: numeric(rows[0]?.position) ?? 0 };
          }
          const started = performance.now();
          const runId = recursive
            ? await materializeRules(source, logical, scopeKey, resolved, signal, maxRecursiveRows)
            : undefined;
          const nonIntegerProjectionVariables: string[] = [];
          const integerVariables = await resolveIntegerVariables(
            source,
            scopeKey,
            logical,
            resolved,
            { signal, ...(runId ? { runId } : {}), onNonIntegerProjection: variable => nonIntegerProjectionVariables.push(variable) },
          );
          const compiled = compileXtdb(input, scopeKey, {
            nonIntegerProjectionVariables,
            basis: resolved,
            ...(cursorValues ? { cursorValues } : {}),
            ...(runId ? { runId } : {}),
            debug,
            integerVariables,
          });
          const requestedLimit = "inner" in input ? input.limit : input.limit;
          if (requestedLimit === undefined || requestedLimit > maxResultRows)
            compiled.sql = `SELECT * FROM (${compiled.sql}) bounded_answer LIMIT ${maxResultRows + 1}`;
          const rows = await source.query(compiled.sql, compiled.params, undefined, { signal });
          if (rows.length > maxResultRows)
            throw new ReadError({
              message: `XTDB query exceeds maxResultRows=${maxResultRows}; no partial answer returned`,
            });
          const results = rows.map((row) => decodeQueryRow(row, compiled));
          let totalCount: number | undefined;
          let countExecutionTimeMs: number | undefined;
          if (compiled.countSql) {
            const countStarted = performance.now();
            const counts = await source.query<{ total: unknown }>(
              compiled.countSql,
              compiled.countParams,
              undefined,
              { signal },
            );
            totalCount = numeric(counts[0]?.total) ?? 0;
            countExecutionTimeMs = performance.now() - countStarted;
          }
          return {
            results,
            ...(totalCount === undefined ? {} : { totalCount }),
            ...(debug
              ? {
                  debug: {
                    metrics: compiled.metrics ?? emptyMetrics,
                    executionTimeMs: performance.now() - started,
                    ...(countExecutionTimeMs === undefined ? {} : { countExecutionTimeMs }),
                    resultCount: results.length,
                    generatedSql: compiled.sql,
                    params: compiled.params,
                    queryPlan: plan(compiled, recursive),
                  },
                }
              : {}),
          };
        },
        catch: failure,
      }),
    );

  return {
    execute: (query, debug = false, basis) => run(query, debug, basis),
    executePage: (query, debug = false, basis, cursorValues) =>
      run(query, debug, basis, cursorValues),
    explain: (query) =>
      Effect.try({
        try: () => {
          const compiled = compileXtdb(query, scopeKey, { debug: true, runId: "<query-run>" });
          return {
            queryPlan: plan(compiled, Boolean(query.rules?.length)),
            metrics: compiled.metrics ?? emptyMetrics,
          };
        },
        catch: failure,
      }),
    explainPage: (query) =>
      Effect.try({
        try: () => ({
          queryPlan: plan(
            compileXtdb(query, scopeKey, { debug: true, runId: "<query-run>" }),
            Boolean(query.inner.rules?.length),
          ),
        }),
        catch: failure,
      }),
  };
};

export const makeXtdbQueryExecutorLayer = (client: XtdbClient, scopeKey: string) =>
  Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(client, scopeKey));
