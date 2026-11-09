/**
 * Query Wrapper Compiler
 *
 * Wraps a Datalog query in a CTE to enable:
 * - Additional filtering on result columns
 * - Separate pagination from inner query
 * - Total count retrieval for pagination UI
 */

import {
  compile,
  compileWithRules,
  type CompileOptions,
  type CompiledQuery,
  type CompiledValueColumns,
  type QueryMetrics,
} from "./compiler.js";
import { isTypedConstant } from "./schema.js";
import type { SqlDialect } from "../dialects/index.js";
import { SqliteDialect } from "../dialects/sqlite.js";
import { createParamCollector, type ParamCollector } from "../params.js";
import type { WrappedQuery, WrapperFilter, WrapperFilterOp, OrderBySpec } from "./types.js";
import type { PaginationValue } from "../Pagination.js";
import { assertWrappedQuery } from "./validation.js";
import { DatalogValidationError } from "../errors/index.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of compiling a wrapped query
 */
export interface CompiledWrappedQuery {
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

// =============================================================================
// Filter Compilation
// =============================================================================

/**
 * Compile a wrapper filter operator to SQL
 */
const compileFilterOp = (
  colName: string,
  op: WrapperFilterOp,
  value: unknown,
  collector: ParamCollector,
  dialect: SqlDialect,
): string => {
  switch (op) {
    case "=":
      return `${colName} = ${collector.add(value)}`;
    case "!=":
      return `${colName} <> ${collector.add(value)}`;
    case ">":
      return `${colName} > ${collector.add(value)}`;
    case ">=":
      return `${colName} >= ${collector.add(value)}`;
    case "<":
      return `${colName} < ${collector.add(value)}`;
    case "<=":
      return `${colName} <= ${collector.add(value)}`;
    case "like":
      return `${colName} LIKE ${collector.add(value)}`;
    case "not-like":
      return `${colName} NOT LIKE ${collector.add(value)}`;
    case "ilike":
      // SQLite: use LIKE with COLLATE NOCASE
      // PostgreSQL: use native ILIKE
      if (dialect.name === "postgresql") {
        return `${colName} ILIKE ${collector.add(value)}`;
      }
      return `${colName} LIKE ${collector.add(value)} COLLATE NOCASE`;
    case "not-ilike":
      if (dialect.name === "postgresql") {
        return `${colName} NOT ILIKE ${collector.add(value)}`;
      }
      return `${colName} NOT LIKE ${collector.add(value)} COLLATE NOCASE`;
    case "is-null":
      return `${colName} IS NULL`;
    case "is-not-null":
      return `${colName} IS NOT NULL`;
    default: {
      const _exhaustive: never = op;
      throw new Error(`Unknown filter operator: ${_exhaustive}`);
    }
  }
};

/**
 * Compile a wrapper filter to SQL condition
 */
const compileFilter = (
  filter: WrapperFilter,
  compiled: CompiledQuery,
  collector: ParamCollector,
  dialect: SqlDialect,
): string => {
  const colName = `"${filter.column}"`;
  const value = isTypedConstant(filter.value) ? filter.value.value : filter.value;
  const columns = compiled.valueColumnMap.get(filter.column);
  if (columns === undefined) {
    if (filter.op === "is-null" || filter.op === "is-not-null")
      return compileFilterOp(colName, filter.op, value, collector, dialect);
    const integer = compiled.integerColumns?.has(filter.column) === true;
    const integerConstant = isTypedConstant(filter.value) && filter.value.type === "integer";
    if ((integer || compiled.numericColumns.has(filter.column)) && integer !== integerConstant) {
      throw new DatalogValidationError({
        query: filter,
        message: "Mixed exact integer and number wrapper filters require an explicit cast",
      });
    }
    if (integer) {
      if (!["=", "!=", ">", ">=", "<", "<="].includes(filter.op))
        throw new DatalogValidationError({
          query: filter,
          message: "Exact integers support equality and ordered wrapper filters",
        });
      return `CAST(${colName} AS DECIMAL(32, 0)) ${filter.op === "!=" ? "<>" : filter.op} CAST(${collector.add(value)} AS DECIMAL(32, 0))`;
    }
    return compileFilterOp(colName, filter.op, value, collector, dialect);
  }

  const type = quoted(columns.type);
  if (isTypedConstant(filter.value) && filter.value.type === "integer") {
    if (!columns.orderInteger)
      throw new Error("Exact integer filters are unsupported by this backend");
    if (!["=", "!=", ">", ">=", "<", "<="].includes(filter.op))
      throw new Error("Exact integers support equality and ordered wrapper filters");
    const operator = filter.op === "!=" ? "<>" : filter.op;
    return `(${type} = 'integer' AND ${quoted(columns.orderInteger)} ${operator} CAST(${collector.add(filter.value.value)} AS DECIMAL(32, 0)))`;
  }
  if (filter.op === "is-null" || filter.op === "is-not-null") {
    return compileFilterOp(type, filter.op, value, collector, dialect);
  }

  let scalar: string;
  let typeCondition: string;
  let storedValue: unknown = value;
  if (typeof value === "number") {
    scalar = quoted(columns.orderNumber);
    typeCondition = `${type} = 'number'`;
  } else if (typeof value === "boolean") {
    scalar = quoted(columns.boolean);
    typeCondition = `${type} = 'boolean'`;
    storedValue = dialect.name === "sqlite" ? (value ? 1 : 0) : value;
  } else {
    scalar = quoted(columns.orderText);
    typeCondition = `${type} = 'string'`;
  }
  return `(${typeCondition} AND ${compileFilterOp(scalar, filter.op, storedValue, collector, dialect)})`;
};

/**
 * Compile wrapper filters to WHERE clause
 */
const compileFilters = (
  filters: readonly WrapperFilter[] | undefined,
  compiled: CompiledQuery,
  collector: ParamCollector,
  dialect: SqlDialect,
): string => {
  if (!filters || filters.length === 0) {
    return "";
  }
  const conditions = filters.map((f) => compileFilter(f, compiled, collector, dialect));
  return `WHERE ${conditions.join(" AND ")}`;
};

// =============================================================================
// Order By Compilation
// =============================================================================

/**
 * Compile wrapper order by to SQL clause
 */
interface SortComponent {
  readonly integer?: boolean;
  readonly expression: string;
  readonly direction: "asc" | "desc";
  readonly value: PaginationValue | undefined;
}

const quoted = (name: string): string => `"${name}"`;

const valueCategory = (value: PaginationValue): number => {
  if (value === null) return 3;
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return 1;
  if (typeof value === "object" && value.type === "integer") return 0.5;
  return 2;
};

const sortComponents = (
  orderBy: readonly OrderBySpec[],
  compiled: CompiledQuery,
  cursor?: readonly PaginationValue[],
): readonly SortComponent[] =>
  orderBy.flatMap<SortComponent>(({ variable, direction = "asc" }, index) => {
    const value = cursor?.[index];
    const columns = compiled.valueColumnMap.get(variable);
    if (!columns) {
      const integer = compiled.integerColumns?.has(variable) === true;
      return [
        {
          expression: `CASE WHEN ${quoted(variable)} IS NULL THEN 1 ELSE 0 END`,
          direction: "asc" as const,
          value: cursor === undefined ? undefined : value === null ? 1 : 0,
        },
        {
          expression: integer ? `CAST(${quoted(variable)} AS DECIMAL(32, 0))` : quoted(variable),
          direction,
          value: integer && value !== null && typeof value === "object" ? value.value : value,
          ...(integer ? { integer: true } : {}),
        },
      ];
    }

    const numeric = quoted(columns.orderNumber);
    const boolean = quoted(columns.boolean);
    const text = quoted(columns.orderText);
    const category = quoted(columns.category);
    return [
      {
        expression: category,
        direction: "asc" as const,
        value: cursor === undefined ? undefined : valueCategory(value ?? null),
      },
      {
        expression: numeric,
        direction,
        value: cursor === undefined ? undefined : typeof value === "number" ? value : null,
      },
      ...(columns.orderInteger
        ? [
            {
              expression: quoted(columns.orderInteger),
              direction,
              value:
                cursor === undefined
                  ? undefined
                  : typeof value === "object" && value !== null && value.type === "integer"
                    ? value.value
                    : null,
              integer: true,
            },
          ]
        : []),
      {
        expression: boolean,
        direction,
        value:
          cursor === undefined ? undefined : typeof value === "boolean" ? (value ? 1 : 0) : null,
      },
      {
        expression: text,
        direction,
        value: cursor === undefined ? undefined : typeof value === "string" ? value : null,
      },
    ];
  });

const compileOrderBy = (
  orderBy: readonly OrderBySpec[] | undefined,
  compiled: CompiledQuery,
): string => {
  if (!orderBy || orderBy.length === 0) {
    return "";
  }
  const parts = sortComponents(orderBy, compiled).map(
    ({ expression, direction }) => `${expression} ${direction.toUpperCase()}`,
  );
  return `ORDER BY ${parts.join(", ")}`;
};

// =============================================================================
// Cursor/Keyset Pagination
// =============================================================================

/**
 * Generate keyset WHERE clause for cursor pagination
 *
 * For single column orderBy (simple case):
 *   WHERE "?name" > ?
 *
 * For multi-column orderBy with mixed directions:
 *   orderBy: [{?dept, asc}, {?age, desc}]  cursor: {?dept: "Eng", ?age: 30}
 *   WHERE (
 *     "?dept" > ?                              -- dept after cursor
 *     OR ("?dept" = ? AND "?age" < ?)          -- same dept, younger (desc)
 *   )
 *
 * This generates a compound OR condition that correctly handles
 * multi-column sort orders with mixed directions.
 */
const compileKeysetClause = (
  components: readonly SortComponent[],
  collector: ParamCollector,
): string => {
  if (components.length === 0) return "";

  // Multi-column: compound OR conditions
  // For [{a, asc}, {b, desc}]: (a > ?) OR (a = ? AND b < ?)
  const conditions: string[] = [];
  const parameter = (component: SortComponent, value: unknown) =>
    component.integer ? `CAST(${collector.add(value)} AS DECIMAL(32, 0))` : collector.add(value);
  for (let i = 0; i < components.length; i++) {
    const current = components[i]!;
    const currentValue = current.value;
    // A null storage component has no strict successor of its own. Skip the
    // branch before collecting equality parameters for earlier components so
    // the parameter list remains aligned with the generated SQL.
    if (currentValue === null || currentValue === undefined) continue;

    const parts: string[] = [];
    // Equality for all previous columns
    for (let j = 0; j < i; j++) {
      const prev = components[j]!;
      const previousValue = prev.value;
      parts.push(
        previousValue === null
          ? `${prev.expression} IS NULL`
          : `${prev.expression} = ${parameter(prev, previousValue)}`,
      );
    }
    // Comparison for current column
    const { expression, direction } = current;
    const op = direction === "asc" ? ">" : "<";
    parts.push(`${expression} ${op} ${parameter(current, currentValue)}`);
    conditions.push(`(${parts.join(" AND ")})`);
  }
  return conditions.length === 0 ? "0 = 1" : `(${conditions.join(" OR ")})`;
};

// =============================================================================
// Main Compilation
// =============================================================================

/**
 * Compile a wrapped query to SQL
 *
 * Strategy:
 * 1. Compile inner query to SQL using existing compiler
 * 2. Wrap in CTE: WITH inner_results AS (inner_sql)
 * 3. Generate outer SELECT with filters and pagination
 * 4. Generate count query if requested
 */
export const compileWrapped = (
  input: WrappedQuery,
  dialect: SqlDialect = SqliteDialect,
  options: CompileOptions & { readonly cursorValues?: readonly PaginationValue[] } = {},
): CompiledWrappedQuery => {
  const started = performance.now();
  const query = assertWrappedQuery(input);
  const { inner, filters, orderBy, limit, includeCount } = query;

  // 1. Compile inner query (without wrapper's orderBy/limit/cursor)
  // Ordering without a subquery boundary cannot affect membership. Avoid
  // sorting twice; the complete outer keyset order owns page ordering.
  const { orderBy: _innerOrder, ...unordered } = inner;
  const logicalInner = inner.limit === undefined && inner.offset === undefined ? unordered : inner;
  const innerCompiled: CompiledQuery = (inner.rules?.length ? compileWithRules : compile)(
    logicalInner,
    dialect,
    true,
    options,
  );

  // 2. Build CTE
  const cteName = "inner_results";
  const cte = `WITH ${cteName} AS (\n${innerCompiled.sql}\n)`;

  // 3. Build SELECT columns from inner query's find clause
  const selectColumns = new Set([...innerCompiled.columnMap.keys()].map((column) => `"${column}"`));
  for (const columns of innerCompiled.valueColumnMap.values()) {
    for (const column of [
      `"${columns.category}"`,
      `"${columns.orderNumber}"`,
      `"${columns.orderText}"`,
      `"${columns.type}"`,
      `"${columns.string}"`,
      `"${columns.number}"`,
      `"${columns.boolean}"`,
      ...(columns.orderInteger ? [`"${columns.orderInteger}"`] : []),
    ]) {
      selectColumns.add(column);
    }
  }

  // 4. Build wrapper WHERE clause from filters + cursor (main query)
  const mainCollector = createParamCollector(dialect);

  // First, add all inner query params to maintain parameter order
  for (const p of innerCompiled.params) {
    mainCollector.add(p);
  }

  // Collect WHERE conditions: filters + cursor keyset clause
  const whereConditions: string[] = [];

  // Add filter conditions
  if (filters && filters.length > 0) {
    const filterConditions = filters.map((f) =>
      compileFilter(f, innerCompiled, mainCollector, dialect),
    );
    whereConditions.push(...filterConditions);
  }

  // Add cursor keyset condition (requires orderBy to be specified)
  if (options.cursorValues && orderBy && orderBy.length > 0) {
    const keysetCondition = compileKeysetClause(
      sortComponents(orderBy, innerCompiled, options.cursorValues),
      mainCollector,
    );
    if (keysetCondition) {
      whereConditions.push(keysetCondition);
    }
  }

  // Build WHERE clause
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // 5. Build wrapper ORDER BY
  const orderByClause = compileOrderBy(orderBy, innerCompiled);

  // 6. Build wrapper LIMIT (no offset - cursor pagination uses keyset)
  const limitClause = limit ? dialect.limitOffset(limit, undefined) : "";

  // 7. Assemble main query
  const sqlParts = [
    cte,
    `SELECT ${[...selectColumns].join(", ") || "*"}`,
    `FROM ${cteName}`,
    whereClause,
    orderByClause,
    limitClause,
  ];
  const sql = sqlParts.filter(Boolean).join("\n");

  // 8. Build count query if requested
  // Note: Count query does NOT include cursor keyset clause - it counts total filtered results
  let countSql: string | null = null;
  let countParams: readonly unknown[] = [];

  if (includeCount) {
    const countCollector = createParamCollector(dialect);

    // Add inner query params
    for (const p of innerCompiled.params) {
      countCollector.add(p);
    }

    // Only apply filters to count, not cursor (we want total count of all matching rows)
    const countWhereClause = compileFilters(filters, innerCompiled, countCollector, dialect);

    const countSqlParts = [cte, `SELECT COUNT(*) AS total`, `FROM ${cteName}`, countWhereClause];
    countSql = countSqlParts.filter(Boolean).join("\n");
    countParams = countCollector.params;
  }

  return {
    metrics: {
      ...innerCompiled.metrics!,
      cteCount: (innerCompiled.metrics?.cteCount ?? 0) + 1,
      sqlLength: sql.length,
      paramCount: mainCollector.params.length,
      compilationTimeMs: performance.now() - started,
    },
    sql,
    countSql,
    params: mainCollector.params,
    countParams,
    columnMap: innerCompiled.columnMap,
    valueColumnMap: innerCompiled.valueColumnMap,
    numericColumns: innerCompiled.numericColumns,
    constantColumns: innerCompiled.constantColumns,
    ...(innerCompiled.integerColumns ? { integerColumns: innerCompiled.integerColumns } : {}),
  };
};
