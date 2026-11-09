import { resolveXtdbBasis } from "./RecordCut.js";
import { Effect, Layer } from "effect";
import { readOnlyXtdbClient, readPathBase } from "./ReadOnlyClient.js";
import {
  QueryExecutor,
  ReadError,
  toReadError,
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
import { evaluateRules, placeholderRuleRelations } from "./query/recursion.js";
import { CurrentTransactions } from "./TransactionContext.js";
import { clientWithOverlay } from "./query/overlay.js";

const failure = (cause: unknown) =>
  cause instanceof DatalogValidationError || cause instanceof UnboundVariableError
    ? cause
    : toReadError(cause, `XTDB Datalog execution failed: ${String(cause)}`);

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
const queryExecutor = (
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
          const pending = [...transactions.values()].findLast(
            (state) => state.client === readPathBase(client) && state.scopeKey === scopeKey,
          );
          // [EXP-RT01] Why: named reads use the committed client and shared gate; latest reads retain read-your-writes. Rejected: clamping a provisional overlay to an unavailable T.
          const state =
            basis?.recordedAt !== undefined || basis?.recordedPosition !== undefined
              ? undefined
              : pending;
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
          if (!state) resolved = await resolveXtdbBasis(client, scopeKey, resolved, signal);
          const started = performance.now();
          // [EXP-C8] Rules are evaluated with reads only (recursion.ts); nothing is written.
          const ruleRelations = recursive
            ? await evaluateRules(source, logical, scopeKey, resolved, signal, maxRecursiveRows)
            : undefined;
          const nonIntegerProjectionVariables: string[] = [];
          const integerVariables = await resolveIntegerVariables(
            source,
            scopeKey,
            logical,
            resolved,
            {
              signal,
              ...(ruleRelations ? { ruleRelations } : {}),
              onNonIntegerProjection: (variable) => nonIntegerProjectionVariables.push(variable),
            },
          );
          const compiled = compileXtdb(input, scopeKey, {
            nonIntegerProjectionVariables,
            basis: resolved,
            ...(cursorValues ? { cursorValues } : {}),
            ...(ruleRelations ? { ruleRelations } : {}),
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
          const compiled = compileXtdb(query, scopeKey, {
            debug: true,
            ruleRelations: placeholderRuleRelations(query),
          });
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
            compileXtdb(query, scopeKey, {
              debug: true,
              ruleRelations: placeholderRuleRelations(query.inner),
            }),
            Boolean(query.inner.rules?.length),
          ),
        }),
        catch: failure,
      }),
  };
};

export const makeXtdbQueryExecutorLayer = (client: XtdbClient, scopeKey: string) =>
  Layer.succeed(QueryExecutor, makeXtdbQueryExecutor(client, scopeKey));

// [EXP-C8] Read entry point: the shared client is handed over as a write-refusing view
// (ReadOnlyClient.ts), so no read path can reach the engine with a write.
export const makeXtdbQueryExecutor = (
  client: XtdbClient,
  scopeKey: string,
  limits: XtdbQueryLimits = {},
): QueryExecutorService => queryExecutor(readOnlyXtdbClient(client), scopeKey, limits);
