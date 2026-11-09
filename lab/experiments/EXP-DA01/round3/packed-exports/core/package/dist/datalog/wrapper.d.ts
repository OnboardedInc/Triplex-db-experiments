import { WrappedQuery } from "./schema.js";
import { PaginationValue } from "../Pagination.js";
import { SqlDialect } from "../dialects/types.js";
import { CompileOptions, CompiledQuery, CompiledValueColumns, QueryMetrics } from "./compiler.js";

//#region src/datalog/wrapper.d.ts
/**
 * Result of compiling a wrapped query
 */
interface CompiledWrappedQuery {
  readonly metrics: QueryMetrics;
  /** SQL for fetching paginated results */
  sql: string;
  /** SQL for fetching total count (only if includeCount=true) */
  countSql: string | null;
  /** Parameters for the main query */
  params: readonly unknown[];
  /** Parameters for the count query */
  countParams: readonly unknown[];
  /** Column map from inner query */
  columnMap: Map<string, string>;
  /** Hidden canonical scalar-family columns used for value decoding. */
  valueColumnMap: Map<string, CompiledValueColumns>;
  /** Columns whose SQL representation must be decoded as a number. */
  numericColumns: Set<string>;
  /** Parameterized constant projections and their public scalar values. */
  constantColumns: CompiledQuery["constantColumns"];
  integerColumns?: Set<string>;
}
/**
 * Compile a wrapped query to SQL
 *
 * Strategy:
 * 1. Compile inner query to SQL using existing compiler
 * 2. Wrap in CTE: WITH inner_results AS (inner_sql)
 * 3. Generate outer SELECT with filters and pagination
 * 4. Generate count query if requested
 */
declare const compileWrapped: (input: WrappedQuery, dialect?: SqlDialect, options?: CompileOptions & {
  readonly cursorValues?: readonly PaginationValue[];
}) => CompiledWrappedQuery;
//#endregion
export { CompiledWrappedQuery, compileWrapped };
//# sourceMappingURL=wrapper.d.ts.map