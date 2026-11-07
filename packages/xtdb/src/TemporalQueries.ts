import { Effect } from "effect";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import {
  DatalogValidationError,
  ReadError,
  type QueryContext,
} from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "./XtdbClient.js";
import { compileXtdb, rewriteSqlCode } from "./query/compiler.js";
import { resolveIntegerVariables } from "./query/domains.js";
import { decodeQueryRow } from "./XtdbQueryExecutor.js";

export interface IntervalQueryOptions {
  readonly from: number;
  readonly to: number;
  readonly recordedPosition?: number;
  readonly recordedAt?: number;
  readonly maxRows?: number;
  readonly maxSpans?: number;
  readonly timeoutMs?: number;
}

export interface IntervalBinding {
  readonly bindings: QueryContext;
  readonly validFrom: number;
  readonly validTo: number;
}

/** Discover dependencies from the existing Triplex AST, without a second language. */
const attributesIn = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const own =
    input.length >= 3 && typeof input[1] === "string" && input[1].startsWith(":") ? [input[1]] : [];
  return [...own, ...input.flatMap(attributesIn)];
};
const hasDynamicAttribute = (input: unknown): boolean =>
  Array.isArray(input) &&
  ((input.length >= 3 && typeof input[1] === "string" && input[1].startsWith("?")) ||
    input.some(hasDynamicAttribute));

const checkedTime = (value: number, name: string) => {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${name} must be a nonnegative finite Triplex epoch-millisecond instant`);
};

/**
 * Evaluate one Triplex Datalog query at all relevant business-time boundaries.
 * XTDB constructs spans, evaluates the correlated query and coalesces answers.
 * Only final bounded answers are transferred to the client.
 */
export const makeXtdbTemporalQueries = (client: XtdbClient, scopeKey: string) => ({
  queryIntervals: (
    query: DatalogQuery,
    options: IntervalQueryOptions,
  ): Effect.Effect<readonly IntervalBinding[], ReadError | DatalogValidationError> =>
    Effect.tryPromise({
      try: async (signal) => {
        checkedTime(options.from, "from");
        checkedTime(options.to, "to");
        if (options.from >= options.to) throw new RangeError("Interval window must have from < to");
        if (query.rules?.length)
          throw new DatalogValidationError({
            query,
            message:
              "Interval queries over rules are not yet qualified; point-in-time recursive queries remain available",
          });
        if (query.limit !== undefined || query.offset !== undefined)
          throw new DatalogValidationError({
            query,
            message:
              "Interval queries require an unbounded logical relation; use maxRows for the complete interval answer limit",
          });
        const maxRows = options.maxRows ?? 1000;
        if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 100_000)
          throw new RangeError("maxRows must be between 1 and 100000");
        const maxSpans = options.maxSpans ?? 1000;
        if (!Number.isSafeInteger(maxSpans) || maxSpans < 1 || maxSpans > 100_000)
          throw new RangeError("maxSpans must be between 1 and 100000");
        const cuts = await client.query<{ position: unknown }>(
          "SELECT MAX(position) AS position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
          [scopeKey],
          undefined,
          { signal },
        );
        const recordedPosition = options.recordedPosition ?? Number(cuts[0]?.position ?? 0);
        if (
          !Number.isSafeInteger(recordedPosition) ||
          recordedPosition < 0 ||
          recordedPosition > Number(cuts[0]?.position ?? 0)
        )
          throw new RangeError("recordedPosition must identify an existing committed source cut");
        const basis = {
          recordedPosition,
          validAt: Number.NaN,
          ...(options.recordedAt === undefined ? {} : { recordedAt: options.recordedAt }),
        };
        const params: unknown[] = [];
        const p = (value: unknown) => {
          params.push(value);
          return `$${params.length}`;
        };
        const sourceConditions = [
          `scope_key = ${p(scopeKey)}`,
          `recorded_position <= ${p(recordedPosition)}`,
          `(retracted_position IS NULL OR retracted_position > ${p(recordedPosition)}${options.recordedAt === undefined ? "" : ` OR retracted_at > ${p(options.recordedAt)}`})`,
          `valid_from < ${p(options.to)}`,
          `(valid_to IS NULL OR valid_to > ${p(options.from)})`,
        ];
        if (options.recordedAt !== undefined) {
          checkedTime(options.recordedAt, "recordedAt");
          sourceConditions.push(`recorded_at <= ${p(options.recordedAt)}`);
        }
        const attributes = [
          ...new Set([
            ...attributesIn(query.where),
            ...(query.optionalProjection?.fields.map((field) => field.attribute) ?? []),
          ]),
        ];
        if (attributes.length && !hasDynamicAttribute(query.where))
          sourceConditions.push(`attribute IN (${attributes.map(p).join(", ")})`);
        const start = p(options.from),
          end = p(options.to);
        const spanSql = `WITH relevant AS (
        SELECT valid_from, valid_to FROM tx_assertions FOR ALL VALID_TIME WHERE ${sourceConditions.join(" AND ")}
      ), boundaries AS (
        SELECT ${start} AS cut UNION SELECT ${end} AS cut
        UNION SELECT valid_from AS cut FROM relevant WHERE valid_from > ${start}
        UNION SELECT valid_to AS cut FROM relevant WHERE valid_to < ${end}
      ), spans AS (
        SELECT cut AS span_from, LEAD(cut) OVER (ORDER BY cut) AS span_to FROM boundaries
      )`;
        const deadline = { signal, timeoutMs: options.timeoutMs ?? 30_000 };
        const spans = await client.query<{ total: unknown }>(
          `${spanSql} SELECT COUNT(*) AS total FROM spans WHERE span_to IS NOT NULL`,
          params,
          undefined,
          deadline,
        );
        if (Number(spans[0]?.total ?? 0) > maxSpans)
          throw new ReadError({
            message: `Interval evaluation exceeds maxSpans=${maxSpans}; no partial result returned`,
          });
        const spanParams = [...params];
        // Rewrite SQL code only. Legal names such as "?NaN" and literal strings
        // must survive substitution of the compiler's temporal sentinel.
        const rebase = (
          sql: string,
          values: readonly unknown[],
          append: (value: unknown) => string,
        ) =>
          rewriteSqlCode(sql, (code) =>
            code.replace(/\bNaN\b/g, "s.span_from").replace(/\$(\d+)/g, (_match, index: string) => {
              const value = values[Number(index) - 1];
              return typeof value === "number" && Number.isNaN(value)
                ? "s.span_from"
                : append(value);
            }),
          );
        const nonIntegerProjectionVariables: string[] = [];
        const integerVariables = await resolveIntegerVariables(client, scopeKey, query, basis, {
          signal,
          onNonIntegerProjection: variable => nonIntegerProjectionVariables.push(variable),
          wrapDomainQuery: (sql, values) => {
            const domainParams = [...spanParams];
            const inner = rebase(sql, values, (value) => {
              domainParams.push(value);
              return `$${domainParams.length}`;
            });
            return {
              sql: `${spanSql} SELECT DISTINCT q.value_type FROM spans s CROSS JOIN LATERAL (${inner}) q WHERE s.span_to IS NOT NULL`,
              params: domainParams,
            };
          },
        });
        const compiled = compileXtdb(query, scopeKey, {
          nonIntegerProjectionVariables,
          basis,
          integerVariables,
          temporalInWhere: true,
        });
        const inner = rebase(compiled.sql, compiled.params, p);
        const columns = [
          ...new Set(
            [...compiled.columnMap.keys()].flatMap((column) => {
              const typed = compiled.valueColumnMap.get(column);
              return typed
                ? [column, typed.type, typed.string, typed.number, typed.boolean]
                : [column];
            }),
          ),
        ];
        if (!columns.length)
          throw new DatalogValidationError({
            query,
            message: "An interval query must project at least one binding",
          });
        const keys = columns.map((column) => `"${column.replaceAll('"', '""')}"`);
        const partition = keys.join(", ");
        const sql = `${spanSql}, answers AS (
        SELECT q.*, s.span_from, s.span_to FROM spans s CROSS JOIN LATERAL (${inner}) q
        WHERE s.span_to IS NOT NULL
      ), marked AS (
        SELECT *, CASE WHEN LAG(span_to) OVER (PARTITION BY ${partition} ORDER BY span_from) = span_from THEN 0 ELSE 1 END AS starts_group FROM answers
      ), islands AS (
        SELECT a.*, (SELECT MAX(g.span_from) FROM marked g
          WHERE g.starts_group = 1 AND g.span_from <= a.span_from AND ${keys.map((key) => `g.${key} IS NOT DISTINCT FROM a.${key}`).join(" AND ")}) AS island
        FROM marked a
      ) SELECT ${partition}, MIN(span_from) AS interval_from, MAX(span_to) AS interval_to
        FROM islands GROUP BY ${partition}, island ORDER BY interval_from, interval_to LIMIT ${maxRows + 1}`;
        const rows = await client.query(sql, params, undefined, deadline);
        if (rows.length > maxRows)
          throw new ReadError({
            message: `Interval answer exceeds maxRows=${maxRows}; no partial result returned`,
          });
        return rows.map((row) => ({
          bindings: decodeQueryRow(row, compiled),
          validFrom: Number(row["interval_from"]),
          validTo: Number(row["interval_to"]),
        }));
      },
      catch: (cause) =>
        cause instanceof DatalogValidationError || cause instanceof ReadError
          ? cause
          : new ReadError({ message: "XTDB interval query failed", cause }),
    }),
});
