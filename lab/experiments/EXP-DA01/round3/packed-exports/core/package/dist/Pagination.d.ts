import { IntegerValue } from "./Value.js";
import { ResolvedTemporalBasis, TemporalBasis } from "./Temporal.js";
import { DatalogQuery, OrderBySpec, WrappedQuery } from "./datalog/schema.js";
import { WrappedQueryResult } from "./storage/QueryExecutor.js";

//#region src/Pagination.d.ts
/** Public reads default to 100 rows and never exceed 1,000 rows per page. */
declare const DEFAULT_QUERY_PAGE_SIZE = 100;
declare const MAX_QUERY_PAGE_SIZE = 1000;
/** Preserve the raw query's limit/offset as a logical subquery boundary. */
declare const wrapDatalogQuery: (query: DatalogQuery, options?: {
  readonly pageSize?: number;
  readonly cursor?: string;
}) => WrappedQuery;
type PaginationValue = string | number | boolean | typeof IntegerValue.Type | null;
type PaginationCursor = string & {
  readonly PaginationCursor: unique symbol;
};
interface PreparedPagination {
  readonly query: WrappedQuery;
  readonly logicalQuery: WrappedQuery;
  readonly basis: ResolvedTemporalBasis & {
    readonly recordedAt: number;
    readonly recordedPosition: number;
  };
  readonly orderBy: readonly OrderBySpec[];
  readonly cursorValues?: readonly PaginationValue[];
  readonly queryFingerprint: string;
  readonly scopeFingerprint: string;
  readonly pageSize: number;
}
/**
 * Complete a caller's ordering with every projected variable. Datalog results
 * are set-valued, so the complete projected row is a deterministic unique
 * tie-breaker even when the caller's primary sort values are equal.
 */
declare const normalizePaginationOrder: (query: WrappedQuery) => readonly OrderBySpec[];
declare const preparePagination: (input: {
  readonly query: WrappedQuery;
  readonly basis?: TemporalBasis;
  readonly now: number;
  readonly recordedPosition: number;
  readonly scope: string;
}) => PreparedPagination;
declare const finishPagination: (prepared: PreparedPagination, result: WrappedQueryResult) => WrappedQueryResult;
//#endregion
export { DEFAULT_QUERY_PAGE_SIZE, MAX_QUERY_PAGE_SIZE, PaginationCursor, PaginationValue, PreparedPagination, finishPagination, normalizePaginationOrder, preparePagination, wrapDatalogQuery };
//# sourceMappingURL=Pagination.d.ts.map