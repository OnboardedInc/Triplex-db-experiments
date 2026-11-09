import { ResolvedTemporalBasis } from "../../Temporal.js";
import { DatalogQuery, Rule, WrappedQuery } from "../../datalog/schema.js";
import { PaginationValue } from "../../Pagination.js";
import { DatalogQueryValidationError } from "../../datalog/validation.js";
import { KvTripleStore } from "../hexastore/KvTripleStore.js";
import { Context as Context$1 } from "./types.js";
import { Effect } from "effect";

//#region src/kv/datalog/executor.d.ts
/**
 * Result of executing a Datalog query.
 */
interface QueryResult {
  readonly results: readonly Context$1[];
}
/**
 * Execute a Datalog query against the KvTripleStore.
 *
 * Processing pipeline:
 * 1. WHERE → join contexts via pattern scans
 * 2. Find/actualize → extract result columns
 * 3. Aggregate → group + compute aggregates (if specified)
 * 4. HAVING → filter aggregated results (if specified)
 * 5. ORDER BY → sort results (if specified)
 * 6. LIMIT/OFFSET → paginate results (if specified)
 */
declare const executeQuery: (store: KvTripleStore, input: DatalogQuery, rules?: readonly Rule[], options?: {
  readonly basis?: ResolvedTemporalBasis;
}) => Effect.Effect<QueryResult, DatalogQueryValidationError>;
/**
 * Result of executing a wrapped query.
 */
interface WrappedQueryResult {
  readonly results: readonly Context$1[];
  readonly totalCount?: number;
  readonly nextCursor?: string;
}
/**
 * Execute a wrapped query with filtering, pagination, and optional count.
 *
 * Pipeline:
 * 1. Execute inner query
 * 2. Apply wrapper filters
 * 3. Compute total count (if requested, before pagination)
 * 4. Apply wrapper ORDER BY
 * 5. Apply cursor-based keyset pagination
 * 6. Apply wrapper LIMIT
 */
declare const executeWrappedQuery: (store: KvTripleStore, input: WrappedQuery, rules?: readonly Rule[], options?: {
  readonly basis?: ResolvedTemporalBasis;
  readonly cursorValues?: readonly PaginationValue[];
}) => Effect.Effect<WrappedQueryResult, DatalogQueryValidationError>;
//#endregion
export { QueryResult, WrappedQueryResult, executeQuery, executeWrappedQuery };
//# sourceMappingURL=executor.d.ts.map