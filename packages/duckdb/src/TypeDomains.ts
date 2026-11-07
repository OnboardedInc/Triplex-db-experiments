import { Effect } from "effect";
import { isPatternClause, type Clause, type DatalogQuery } from "@triplex-build/triplex/datalog";
import { compile, compileWithRules } from "@triplex-build/triplex/internal";
import { DatalogValidationError, ReadError } from "@triplex-build/triplex/runtime";
import type {
  SqlStatementRunner,
  SqlQueryCompilationOptions,
  SqlDialect,
} from "@triplex-build/triplex-sql";

/** Reuse the existing exported backend compiler SPI and inspect only canonical
 * type families of the engine's joined candidates at the same physical cut.
 * Ordered/computed filters are removed conservatively before type inference.
 * No source fact relation is transferred or evaluated in TypeScript.
 * Inspiration: XTDB query/domains.ts; actual Duck packet-v1 families05–10.
 */
export const resolveDuckDBTypeDomains = (
  runner: SqlStatementRunner,
  dialect: SqlDialect,
  query: DatalogQuery,
  compilation: SqlQueryCompilationOptions,
) =>
  Effect.gen(function* () {
    const operated = new Set<string>(),
      computedOperands = new Set<string>();
    const targets = new Set((query.compute ?? []).map((step) => step[3]));
    for (const [, left, right] of query.compute ?? [])
      for (const term of [left, right])
        if (typeof term === "string" && term.startsWith("?")) {
          operated.add(term);
          computedOperands.add(term);
        }
    for (const [operation, source] of query.aggregate ?? [])
      if (operation !== "count") operated.add(source);
    for (const clause of query.where)
      if ([">", ">=", "<", "<="].includes(String(clause[0])))
        for (const term of clause.slice(1))
          if (typeof term === "string" && term.startsWith("?")) operated.add(term);
    const hints: string[] = [],
      steps: Array<{ label: string; query: string; params: readonly unknown[] }> = [];
    const usesTarget = (value: unknown): boolean =>
      typeof value === "string"
        ? targets.has(value)
        : Array.isArray(value) && value.some(usesTarget);
    for (const variable of operated) {
      const positive = query.where.some(
        (clause) => isPatternClause(clause as Clause) && clause[2] === variable,
      );
      const optional = query.optionalProjection?.fields.filter(
        (field) => field.variable === variable,
      );
      if (!positive && !optional?.length) continue;
      const candidate: DatalogQuery = {
        find: [variable],
        where: query.where.filter(
          (clause) =>
            !usesTarget(clause) &&
            !(
              [">", ">=", "<", "<="].includes(String(clause[0])) &&
              clause.some((term) => term === variable)
            ),
        ),
        ...(query.rules ? { rules: query.rules } : {}),
        ...(optional?.length && query.optionalProjection
          ? { optionalProjection: { ...query.optionalProjection, fields: optional } }
          : {}),
      };
      const compiled = yield* Effect.try({
        try: () =>
          (candidate.rules?.length ? compileWithRules : compile)(
            candidate,
            dialect,
            false,
            compilation,
          ),
        catch: (cause) =>
          cause instanceof DatalogValidationError
            ? cause
            : new ReadError({ message: "DuckDB candidate type planning failed", cause }),
      });
      const column = compiled.valueColumnMap.get(variable);
      if (!column) continue;
      const sql = `SELECT DISTINCT "${column.type}" AS value_type FROM (${compiled.sql}) candidates LIMIT 9`;
      steps.push({ label: `type-domain:${variable}`, query: sql, params: compiled.params });
      const rows = yield* runner
        .run<{ value_type: unknown }>(sql, compiled.params)
        .pipe(
          Effect.mapError((cause) =>
            cause instanceof ReadError
              ? cause
              : new ReadError({ message: "DuckDB type-domain execution failed", cause }),
          ),
        );
      if (rows.length >= 9)
        return yield* Effect.fail(
          new ReadError({ message: "Type-domain budget exceeded; no partial proof accepted" }),
        );
      const types = new Set(rows.map((row) => row.value_type));
      const typedInteger = (term: unknown) =>
        typeof term === "object" && term !== null && "type" in term && term.type === "integer";
      const needsInteger =
        query.compute?.some(
          ([, left, right]) =>
            [left, right].some((term) => term === variable) && [left, right].some(typedInteger),
        ) ||
        query.where.some(
          (clause) =>
            [">", ">=", "<", "<="].includes(String(clause[0])) &&
            clause.some((term) => term === variable) &&
            clause.some(typedInteger),
        );
      if (needsInteger && types.has("number"))
        return yield* Effect.fail(
          new DatalogValidationError({
            query,
            message: `Mixed exact integer and number operation for ${variable} requires an explicit cast`,
          }),
        );
      if (
        computedOperands.has(variable) &&
        [...types].some((type) => type !== "integer" && type !== "number")
      )
        return yield* Effect.fail(
          new DatalogValidationError({
            query,
            message: `Computed operand ${variable} contains a nonnumeric or missing value`,
          }),
        );
      if (types.has("integer") && types.has("number"))
        return yield* Effect.fail(
          new DatalogValidationError({
            query,
            message: `Mixed exact integer and number values for ${variable} require an explicit cast`,
          }),
        );
      if (types.has("integer")) hints.push(variable);
    }
    return { compilation: { ...compilation, integerVariables: hints }, steps };
  });
