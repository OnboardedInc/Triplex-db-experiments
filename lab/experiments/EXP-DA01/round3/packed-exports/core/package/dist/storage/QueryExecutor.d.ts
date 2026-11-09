import { IntegerValue } from "../Value.js";
import { ReadBasis, ResolvedTemporalBasis } from "../Temporal.js";
import { DatalogQueryError, ReadError } from "../errors/index.js";
import { DatalogQuery, WrappedQuery } from "../datalog/schema.js";
import { PaginationValue } from "../Pagination.js";
import { Context, Effect } from "effect";

//#region src/storage/QueryExecutor.d.ts
/**
 * Variable-to-value binding from query execution
 */
type Constant = string | number | boolean | IntegerValue | null;
/**
 * A single row of query results: variable names mapped to their bound values
 */
interface QueryContext {
  readonly [variable: string]: Constant;
}
/**
 * Query result is an array of variable bindings
 */
type QueryResult = readonly QueryContext[];
/**
 * Backend-agnostic query plan for debugging
 */
interface QueryPlan {
  readonly backend: string;
  readonly steps: ReadonlyArray<{
    readonly label: string;
    readonly query: string;
    readonly params?: readonly unknown[];
  }>;
}
/**
 * Metrics about query compilation/execution.
 *
 * Core metrics (patternCount, predicateCount, etc.) are always present.
 * SQL-specific metrics (sqlLength, paramCount, cteCount, joinCount) are
 * optional — KV backends that don't generate SQL can omit them.
 */
interface QueryMetrics {
  readonly patternCount: number;
  readonly predicateCount: number;
  readonly notClauseCount: number;
  readonly orClauseCount: number;
  readonly hasAggregation: boolean;
  readonly isRecursive: boolean;
  readonly aggregateOps: readonly string[];
  readonly compilationTimeMs: number;
  readonly joinCount?: number;
  readonly whereConditionCount?: number;
  readonly subqueryCount?: number;
  readonly cteCount?: number;
  readonly sqlLength?: number;
  readonly paramCount?: number;
}
/**
 * Debug information for query execution.
 *
 * SQL-specific fields (generatedSql, params) are optional — KV backends
 * that don't generate SQL can omit them.
 */
interface QueryDebugInfo {
  readonly metrics: QueryMetrics;
  /** Main SQL plus optional count execution; excludes compilation and decoding. */
  readonly executionTimeMs: number;
  readonly countExecutionTimeMs?: number;
  readonly resultCount: number;
  readonly queryPlan?: QueryPlan;
  readonly generatedSql?: string;
  readonly params?: readonly unknown[];
}
/**
 * Wrapped query result with pagination
 */
interface WrappedQueryResult {
  readonly results: QueryResult;
  readonly totalCount?: number;
  readonly nextCursor?: string;
  readonly debug?: QueryDebugInfo;
  readonly basis?: ReadBasis;
}
/**
 * QueryExecutorService - Execute Datalog queries against storage
 *
 * SQL backends (SQLite, PostgreSQL):
 *   Compile Datalog → SQL, execute via SqlClient, convert rows to QueryContext
 *
 * KV backends (FoundationDB, in-memory):
 *   Execute Datalog directly using hexastore index scans + nested loop joins
 */
interface QueryExecutorService {
  /**
   * Execute a Datalog query, returning variable bindings.
   *
   * Implementations run the shared runtime and semantic preflight before
   * selecting their backend execution strategy.
   *
   * @param query - The (pre-validated) Datalog query
   * @param debug - Whether to include debug metrics
   * @returns Query results and optional debug info
   */
  readonly execute: (query: DatalogQuery, debug?: boolean, basis?: ResolvedTemporalBasis) => Effect.Effect<{
    results: QueryResult;
    debug?: QueryDebugInfo;
  }, ReadError | DatalogQueryError>;
  /**
   * Execute a wrapped query with pagination support.
   *
   * @param query - The wrapped query specification
   * @param debug - Whether to include debug metrics
   * @returns Results with optional total count and cursor
   */
  readonly executePage: (query: WrappedQuery, debug?: boolean, basis?: ResolvedTemporalBasis, cursorValues?: readonly PaginationValue[]) => Effect.Effect<WrappedQueryResult, ReadError | DatalogQueryError>;
  /**
   * Explain a query plan without executing.
   *
   * @param query - The query to explain
   * @returns The query plan
   */
  readonly explain: (query: DatalogQuery) => Effect.Effect<{
    queryPlan: QueryPlan;
    metrics?: QueryMetrics;
  }, ReadError | DatalogQueryError>;
  /**
   * Explain a wrapped query plan without executing.
   *
   * @param query - The wrapped query to explain
   * @returns The query plan (may include multiple steps for main + count)
   */
  readonly explainPage: (query: WrappedQuery) => Effect.Effect<{
    queryPlan: QueryPlan;
  }, ReadError | DatalogQueryError>;
}
declare const QueryExecutor_base: Context.ServiceClass<QueryExecutor, "QueryExecutor", QueryExecutorService>;
/**
 * QueryExecutor service tag for dependency injection
 */
declare class QueryExecutor extends QueryExecutor_base {}
//#endregion
export { Constant, QueryContext, QueryDebugInfo, QueryExecutor, QueryExecutorService, QueryMetrics, QueryPlan, QueryResult, WrappedQueryResult };
//# sourceMappingURL=QueryExecutor.d.ts.map