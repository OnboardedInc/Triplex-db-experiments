import {
  compile,
  compileWithRules,
  compileWrapped,
  type CompiledQuery,
  type CompiledWrappedQuery,
  type SqlDialect,
  type PaginationValue,
} from "@triplex-build/triplex/internal";
import type { DatalogQuery, WrappedQuery } from "@triplex-build/triplex/datalog";
import { lowerFalseHaving, lowerGrouping } from "./grouping.js";
import type { RuleRelations } from "./recursion.js";

export type QueryBasis = {
  readonly recordedAt?: number;
  readonly recordedPosition?: number;
  readonly validAt: number;
};

/** XTDB has PostgreSQL parameter identity and its own (non-recursive) SQL executor. */
export const XtdbDialect: SqlDialect & {
  readonly exactIntegers: true;
  readonly rejectExactCompute: true;
} = {
  exactIntegers: true,
  // [EXP-X02-R2] Why: Q79c forbids rounded exact computations and their downstream uses.
  // Rejected: permitting only small operands (intermediate results can exceed int64).
  rejectExactCompute: true,
  name: "sqlite", // Triplex's physical boolean columns are integers, including keyset keys.
  paramPlaceholder: (index) => `$${index + 1}`,
  castAsText: (expression) => `CAST(${expression} AS TEXT)`,
  booleanLiteral: (value) => (value ? "1" : "0"),
  escapeLikePattern: (value) => value.replace(/[%_\\]/g, "\\$&"),
  limitOffset: (limit, offset) =>
    [limit === undefined ? "" : `LIMIT ${limit}`, offset ? `OFFSET ${offset}` : ""]
      .filter(Boolean)
      .join(" "),
};

export const sourceSql = (scopeParameter: string): string =>
  `(SELECT * FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ${scopeParameter})`;

/** Rewrite generated SQL code while preserving quoted identifiers/literals and comments. */
export const rewriteSqlCode = (sql: string, rewrite: (code: string) => string): string => {
  let result = "";
  let start = 0;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]!;
    const comment =
      char === "-" && sql[i + 1] === "-"
        ? "line"
        : char === "/" && sql[i + 1] === "*"
          ? "block"
          : undefined;
    if (char !== "'" && char !== '"' && !comment) continue;
    result += rewrite(sql.slice(start, i));
    const quoted = i;
    if (comment === "line") {
      while (i < sql.length && sql[i] !== "\n") i++;
    } else if (comment === "block") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i++;
    } else {
      const quote = char;
      for (i++; i < sql.length; i++)
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) i++;
          else break;
        }
    }
    result += sql.slice(quoted, i + 1);
    start = i + 1;
  }
  return result + rewrite(sql.slice(start));
};

export const lowerSource = (sql: string, scopeParameter: string): string =>
  rewriteSqlCode(sql, (code) =>
    code
      // The shared compiler emits comma-separated relations inside conjunctive negation.
      .replace(
        /\b(FROM|JOIN)\s+triples\b|,\s*triples\b/g,
        (_match, keyword: string | undefined) => `${keyword ?? ","} ${sourceSql(scopeParameter)}`,
      ),
  )
    // XTDB has native ILIKE. Preserve the shared compiler's SQLite boolean policy.
    .replace(/(\S+) NOT LIKE (\$\d+) COLLATE NOCASE/g, "$1 NOT ILIKE $2")
    .replace(/(\S+) LIKE (\$\d+) COLLATE NOCASE/g, "$1 ILIKE $2");

/** Triplex number/datetime scalars use binary64, including legacy native-i64 rows. */
const lowerNumberCarriers = (sql: string): string =>
  rewriteSqlCode(sql, (code) =>
    code.replace(
      /\b([A-Za-z_][A-Za-z0-9_]*)\.(value_number|value_datetime)\b/g,
      (_match, alias: string, column: string) => `CAST(${alias}.${column} AS DOUBLE PRECISION)`,
    ),
  );

/** Find a generated CTE's closing parenthesis, respecting quoted SQL text. */
const closingParenthesis = (sql: string, start: number): number => {
  let depth = 0;
  let quote: string | undefined;
  for (let i = start; i < sql.length; i++) {
    const char = sql[i]!;
    if (quote) {
      if (char === quote) {
        if (sql[i + 1] === quote) i++;
        else quote = undefined;
      }
    } else if (char === "'" || char === '"') quote = char;
    else if (char === "(") depth++;
    else if (char === ")" && --depth === 0) return i;
  }
  throw new Error("Unbalanced generated SQL CTE");
};

/**
 * Replace each generated recursive CTE with its evaluated relation, inline.
 *
 * [EXP-C8] Why: XTDB 2.2.0 rejects `WITH RECURSIVE` (sql.clj:264-265, R10 3.6), and the old
 * replacement read a scratch table that the query call itself had written (`tx_query_relations`,
 * one commit per round). The relation is now evaluated read-only on the host (recursion.ts
 * evaluateRules) and enters the query as ONE JSON-array parameter of `[arg1, arg2]` pairs,
 * unnested in place: `UNNEST($n) AS u(p)` with `p[1]`/`p[2]` (probed on 2.2.0, empty array
 * included). The original CTE body is dropped with its parameters (renumbered by the caller).
 */
export const lowerRules = (
  sql: string,
  names: readonly string[],
  relationParameter: (name: string) => string,
): string => {
  let result = sql.replace(/\bWITH RECURSIVE\b/g, "WITH");
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`"${escaped}"(?:\\(arg1, arg2, depth\\))? AS \\(`);
    const match = pattern.exec(result);
    if (!match) throw new Error(`Missing generated CTE for rule ${name}`);
    const open = match.index + match[0].length - 1;
    const close = closingParenthesis(result, open);
    result =
      result.slice(0, match.index) +
      `"${name}" AS (SELECT p[1] AS arg1, p[2] AS arg2, 0 AS depth FROM UNNEST(${relationParameter(name)}) AS u(p))` +
      result.slice(close + 1);
  }
  return result;
};

export interface XtdbCompiledQuery extends CompiledQuery {
  readonly countSql?: string | null;
  readonly countParams?: readonly unknown[];
}

export const compileXtdb = (
  query: DatalogQuery | WrappedQuery,
  scopeKey: string,
  options: {
    readonly basis?: QueryBasis;
    readonly cursorValues?: readonly PaginationValue[];
    /** [EXP-C8] Evaluated rule relations (recursion.ts evaluateRules), inlined as parameters. */
    readonly ruleRelations?: RuleRelations;
    readonly debug?: boolean;
    readonly integerVariables?: readonly string[];
    readonly nonIntegerProjectionVariables?: readonly string[];
    readonly temporalInWhere?: boolean;
  } = {},
): XtdbCompiledQuery => {
  const started = performance.now();
  const wrapped = "inner" in query;
  const logical = wrapped ? query.inner : query;
  const compiled: CompiledQuery | CompiledWrappedQuery = wrapped
    ? compileWrapped(query, XtdbDialect, options)
    : (logical.rules?.length ? compileWithRules : compile)(
        logical,
        XtdbDialect,
        options.debug ?? false,
        options,
      );
  const lower = (sql: string, input: readonly unknown[]) => {
    const params = [...input, scopeKey];
    const scope = `$${params.length}`;
    let result = lowerNumberCarriers(lowerSource(lowerFalseHaving(lowerGrouping(sql)), scope));
    if (logical.rules?.length) {
      const relations = options.ruleRelations;
      if (!relations) throw new Error("Recursive queries require evaluated rule relations");
      result = lowerRules(result, [...new Set(logical.rules.map(({ name }) => name))], (name) => {
        const pairs = relations.get(name);
        if (!pairs) throw new Error(`Rule ${name} has no evaluated relation`);
        params.push(pairs.map(([arg1, arg2]) => [arg1, arg2]));
        return `$${params.length}`;
      });
    }
    // Removing recursive CTE bodies also removes some parameter references.
    // Renumber by textual occurrence so sparse/unused bind positions never reach XTDB.
    const used: unknown[] = [];
    result = result.replace(/\$(\d+)/g, (_placeholder, index: string) => {
      used.push(params[Number(index) - 1]);
      return `$${used.length}`;
    });
    return { sql: result, params: used };
  };
  const main = lower(compiled.sql, compiled.params);
  const count =
    "countSql" in compiled && compiled.countSql
      ? lower(compiled.countSql, compiled.countParams)
      : undefined;
  return {
    ...compiled,
    ...main,
    ...(count ? { countSql: count.sql, countParams: count.params } : {}),
    ...(compiled.metrics
      ? {
          metrics: {
            ...compiled.metrics,
            sqlLength: main.sql.length,
            paramCount: main.params.length,
            compilationTimeMs: performance.now() - started,
          },
        }
      : {}),
  };
};
