/**
 * SqlQueryExecutor - SQL-based implementation of QueryExecutor
 *
 * Compiles Datalog queries to SQL and executes them via SqlClient.
 * This is the default executor for SQL backends (SQLite, PostgreSQL).
 *
 * Non-SQL backends (e.g., FoundationDB via kv-store) implement
 * QueryExecutor directly using index scans.
 */

import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";
import {
  QueryExecutor,
  type QueryExecutorService,
  type SqlDialect,
  type QueryContext,
  type QueryExecutorMetrics,
  CurrentDialect,
  ReadError,
  DatalogValidationError,
  UnboundVariableError,
  compile,
  compileWithRules,
  compileWrapped,
  type CompiledQuery,
  type CompiledWrappedQuery,
  SqliteDialect,
  integer,
} from "@triplex-build/triplex/internal";

// =============================================================================
// Result Row Type
// =============================================================================

type ResultRow = Record<string, unknown>;
type CompiledValueColumns =
  CompiledQuery["valueColumnMap"] extends Map<string, infer Columns> ? Columns : never;

const compilationFailure = (error: unknown, message: string) =>
  error instanceof DatalogValidationError || error instanceof UnboundVariableError
    ? error
    : new ReadError({ message: `${message}: ${String(error)}`, cause: error });

// =============================================================================
// Result Conversion
// =============================================================================

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
  }
  return null;
};

// The core compiler's exactIntegers capability already emits lossless text or
// BIGINT carriers. Preserve that family at this shared boundary; Number(value)
// would silently round endpoints. Inspired by XTDB's typed decoder and the
// DuckDB native i64 carrier; see wiki/research.md. Legacy dialect admission is
// unchanged: a decoder does not enable unsupported integer writes/expressions.
const exactIntegerResult = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "bigint")
    throw new TypeError("Exact integer results require decimal text or bigint");
  const decimal = String(value);
  if (!/^(0|-[1-9]\d*|[1-9]\d*)$/.test(decimal))
    throw new TypeError("Exact integer result is not canonical decimal text");
  return integer(decimal);
};

const decodeProjectedValue = (
  row: ResultRow,
  columns: CompiledValueColumns,
): QueryContext[string] => {
  const type = row[columns.type];
  switch (type) {
    case "string": {
      const value = row[columns.string];
      return value === null || value === undefined ? null : String(value);
    }
    case "number":
      return toNumber(row[columns.number]);
    case "integer":
      return row[columns.string] == null ? null : exactIntegerResult(row[columns.string]);
    case "boolean": {
      const value = row[columns.boolean];
      return value === true || value === 1 || value === 1n || value === "1";
    }
    default:
      return null;
  }
};

const rowToContext = (
  row: ResultRow,
  columnMap: Map<string, string>,
  valueColumnMap: Map<string, CompiledValueColumns>,
  numericColumns: Set<string>,
  constantColumns: CompiledQuery["constantColumns"],
  integerColumns?: ReadonlySet<string>,
): QueryContext => {
  const context: Record<string, QueryContext[string]> = {};

  for (const [colName, varName] of columnMap) {
    if (constantColumns.has(colName)) {
      context[varName] = constantColumns.get(colName)!;
      continue;
    }
    if (integerColumns?.has(colName)) {
      context[varName] = row[colName] == null ? null : exactIntegerResult(row[colName]);
      continue;
    }
    const valueColumns = valueColumnMap.get(colName);
    if (valueColumns) {
      context[varName] = decodeProjectedValue(row, valueColumns);
      continue;
    }

    const value = row[colName];

    if (value === null || value === undefined) {
      context[varName] = null;
      continue;
    }

    if (numericColumns.has(colName)) {
      context[varName] = toNumber(value);
    } else if (typeof value === "string") {
      context[varName] = value;
    } else if (typeof value === "number") {
      context[varName] = value;
    } else if (typeof value === "boolean") {
      context[varName] = value;
    } else if (typeof value === "bigint") {
      context[varName] = Number(value);
    } else {
      context[varName] = String(value);
    }
  }

  return context;
};

// =============================================================================
// Query Plan Builder
// =============================================================================

interface QueryPlan {
  readonly backend: string;
  readonly steps: ReadonlyArray<{
    readonly label: string;
    readonly query: string;
    readonly params?: readonly unknown[];
  }>;
}

interface QueryDebugInfo {
  readonly metrics: QueryExecutorMetrics;
  readonly executionTimeMs: number;
  readonly countExecutionTimeMs?: number;
  readonly resultCount: number;
  readonly queryPlan?: QueryPlan;
  readonly generatedSql?: string;
  readonly params?: readonly unknown[];
}

type QueryResult = readonly QueryContext[];

/**
 * Minimal SQL execution contract used by the shared Datalog executor.
 *
 * Keeping this smaller than Effect SQL's `SqlClient` lets edge backends such
 * as Cloudflare Durable Object SQLite reuse the compiler and row decoder
 * without pretending their synchronous native handle is a full SqlClient.
 */
export interface SqlStatementRunner {
  readonly run: <Row extends ResultRow>(
    sql: string,
    params: readonly unknown[],
  ) => Effect.Effect<readonly Row[], unknown>;
}
/** Adapter-supplied fixed-cut/type/execution evidence; no application DSL. */
export type SqlQueryCompilationOptions = NonNullable<Parameters<typeof compile>[3]>;

const buildQueryPlan = (
  dialectName: string,
  mainSql: string,
  mainParams: readonly unknown[],
  countSql?: string | null,
  countParams?: readonly unknown[],
): QueryPlan => {
  const steps: Array<{ label: string; query: string; params?: readonly unknown[] }> = [
    { label: "main", query: mainSql, params: [...mainParams] },
  ];
  if (countSql) {
    steps.push({ label: "count", query: countSql, params: countParams ? [...countParams] : [] });
  }
  return { backend: dialectName, steps };
};

// =============================================================================
// Service and layer implementations
// =============================================================================

/**
 * Construct the SQL-backed query service from a minimal statement runner.
 * Backend packages can use this directly when they do not expose an Effect
 * SQL client (for example Durable Object SQLite).
 */
export const makeSqlQueryExecutor = (
  runner: SqlStatementRunner,
  dialect = SqliteDialect,
  compilation: SqlQueryCompilationOptions = {},
): QueryExecutorService => {
  const execute: QueryExecutorService["execute"] = (q, debug = false, basis) =>
    Effect.gen(function* () {
      // 1. Compile to SQL. Recursive rules go through the CTE compiler.
      let compiled: CompiledQuery;
      try {
        compiled = q.rules?.length
          ? compileWithRules(q, dialect, debug, {
              ...compilation,
              ...(basis === undefined ? {} : { basis }),
            })
          : compile(q, dialect, debug, {
              ...compilation,
              ...(basis === undefined ? {} : { basis }),
            });
      } catch (error) {
        return yield* Effect.fail(compilationFailure(error, "Failed to compile Datalog query"));
      }

      // 2. Execute SQL
      const execStart = performance.now();
      const rows = yield* runner.run<ResultRow>(compiled.sql, compiled.params).pipe(
        Effect.mapError(
          (error) =>
            new ReadError({
              message: `Failed to execute Datalog query SQL: ${String(error)}`,
              cause: error,
            }),
        ),
      );
      const execTime = performance.now() - execStart;

      // 3. Convert rows to QueryContext objects
      const results: QueryContext[] = yield* Effect.try({
        try: () =>
          rows.map((row) =>
            rowToContext(
              row,
              compiled.columnMap,
              compiled.valueColumnMap,
              compiled.numericColumns,
              compiled.constantColumns,
              compiled.integerColumns,
            ),
          ),
        catch: (cause) =>
          new ReadError({ message: "Failed to decode Datalog query results", cause }),
      });

      // 4. Return with optional debug info
      if (debug && compiled.metrics) {
        const debugInfo: QueryDebugInfo = {
          metrics: compiled.metrics as QueryExecutorMetrics,
          executionTimeMs: execTime,
          resultCount: results.length,
          generatedSql: compiled.sql,
          params: compiled.params,
          queryPlan: buildQueryPlan(dialect.name, compiled.sql, compiled.params),
        };
        return { results: results as QueryResult, debug: debugInfo };
      }

      return { results: results as QueryResult };
    });

  const executePage: QueryExecutorService["executePage"] = (
    q,
    debug = false,
    basis,
    cursorValues,
  ) =>
    Effect.gen(function* () {
      // 1. Compile to SQL with CTE wrapper
      let compiled: CompiledWrappedQuery;
      try {
        compiled = compileWrapped(q, dialect, {
          ...compilation,
          ...(basis === undefined ? {} : { basis }),
          ...(cursorValues === undefined ? {} : { cursorValues }),
        });
      } catch (error) {
        return yield* Effect.fail(compilationFailure(error, "Failed to compile wrapped query"));
      }

      // 2. Execute main query
      const execStart = performance.now();
      const rows = yield* runner.run<ResultRow>(compiled.sql, compiled.params).pipe(
        Effect.mapError(
          (error) =>
            new ReadError({
              message: `Failed to execute wrapped query SQL: ${String(error)}`,
              cause: error,
            }),
        ),
      );
      const execTime = performance.now() - execStart;

      // 3. Execute count query if requested
      let totalCount: number | undefined;
      let countExecutionTimeMs: number | undefined;
      if (compiled.countSql) {
        const countStart = performance.now();
        const countRows = yield* runner
          .run<{ total: number }>(compiled.countSql, compiled.countParams)
          .pipe(
            Effect.mapError(
              (error) =>
                new ReadError({
                  message: `Failed to execute count query SQL: ${String(error)}`,
                  cause: error,
                }),
            ),
          );
        // PostgreSQL returns COUNT(*) as int8 text while SQLite returns a
        // number. Keep the public result identical across both backends.
        totalCount = toNumber(countRows[0]?.total) ?? 0;
        countExecutionTimeMs = performance.now() - countStart;
      }

      // 4. Convert rows to QueryContext objects
      const results: QueryContext[] = yield* Effect.try({
        try: () =>
          rows.map((row) =>
            rowToContext(
              row,
              compiled.columnMap,
              compiled.valueColumnMap,
              compiled.numericColumns,
              compiled.constantColumns,
              compiled.integerColumns,
            ),
          ),
        catch: (cause) =>
          new ReadError({ message: "Failed to decode wrapped query results", cause }),
      });

      // 5. Build result. The Triples boundary owns the opaque cursor envelope.
      const debugInfo: QueryDebugInfo | undefined = debug
        ? {
            metrics: compiled.metrics,
            executionTimeMs: execTime + (countExecutionTimeMs ?? 0),
            ...(countExecutionTimeMs === undefined ? {} : { countExecutionTimeMs }),
            resultCount: results.length,
            generatedSql: compiled.sql,
            params: [...compiled.params],
            queryPlan: buildQueryPlan(
              dialect.name,
              compiled.sql,
              compiled.params,
              compiled.countSql,
              compiled.countParams,
            ),
          }
        : undefined;

      return {
        results: results as QueryResult,
        ...(totalCount !== undefined && { totalCount }),
        ...(debugInfo !== undefined && { debug: debugInfo }),
      };
    });

  const explain: QueryExecutorService["explain"] = (q) =>
    Effect.gen(function* () {
      let compiled: CompiledQuery;
      try {
        compiled = q.rules?.length
          ? compileWithRules(q, dialect, true, compilation)
          : compile(q, dialect, true, compilation);
      } catch (error) {
        return yield* Effect.fail(compilationFailure(error, "Failed to compile Datalog query"));
      }

      return {
        queryPlan: buildQueryPlan(dialect.name, compiled.sql, compiled.params),
        ...(compiled.metrics && { metrics: compiled.metrics as QueryExecutorMetrics }),
      };
    });

  const explainPage: QueryExecutorService["explainPage"] = (q) =>
    Effect.gen(function* () {
      let compiled: CompiledWrappedQuery;
      try {
        compiled = compileWrapped(q, dialect, compilation);
      } catch (error) {
        return yield* Effect.fail(compilationFailure(error, "Failed to compile wrapped query"));
      }

      return {
        queryPlan: buildQueryPlan(
          dialect.name,
          compiled.sql,
          compiled.params,
          compiled.countSql,
          compiled.countParams,
        ),
      };
    });

  return {
    execute,
    executePage,
    explain,
    explainPage,
  } satisfies QueryExecutorService;
};

/**
 * SQL-based QueryExecutor implementation.
 * Compiles Datalog -> SQL and executes via SqlClient.
 */
/** Capture dialect selection at construction; no ambient CurrentDialect dependency. */
export const makeSqlQueryExecutorLayer = (runner: SqlStatementRunner, dialect: SqlDialect) =>
  Layer.succeed(QueryExecutor, makeSqlQueryExecutor(runner, dialect));

export const SqlQueryExecutorLive = Layer.effect(
  QueryExecutor,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const dialectOpt = yield* Effect.serviceOption(CurrentDialect);
    const dialect = dialectOpt._tag === "Some" ? dialectOpt.value : SqliteDialect;
    return makeSqlQueryExecutor(
      {
        run: <Row extends ResultRow>(statement: string, params: readonly unknown[]) =>
          sql.unsafe<Row>(statement, [...params]),
      },
      dialect,
    );
  }),
);
