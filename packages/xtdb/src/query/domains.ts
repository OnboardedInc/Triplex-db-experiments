import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import { DatalogValidationError, assertDatalogQuery } from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "../XtdbClient.js";
import { compileXtdb, type QueryBasis } from "./compiler.js";
import { evaluateRules, type RuleRelations } from "./recursion.js";

const integerPresence = new WeakMap<XtdbClient, Map<string, boolean>>();
const containsIntegerConstant = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  (("type" in value && value.type === "integer") ||
    Object.values(value).some(containsIntegerConstant));

/** Inspect only type families of the actual joined candidate relation in XTDB. */
export const resolveIntegerVariables = async (
  client: XtdbClient,
  scopeKey: string,
  query: DatalogQuery,
  basis: QueryBasis,
  options: {
    readonly signal?: AbortSignal;
    readonly ruleRelations?: RuleRelations;
    /** Receives only complete non-integer domain proofs, never an unknown hint. */
    readonly onNonIntegerProjection?: (variable: string) => void;
    /** Evaluate candidate domains at every server-generated interval span. */
    readonly wrapDomainQuery?: (
      sql: string,
      params: readonly unknown[],
    ) => { readonly sql: string; readonly params: readonly unknown[] };
  } = {},
): Promise<string[]> => {
  assertDatalogQuery(query);
  // Most Triplex databases use the original seven types. Reuse an exact-position
  // negative presence proof rather than adding type planning to every query.
  if (!containsIntegerConstant(query) && !query.compute?.length) {
    let cache = integerPresence.get(client);
    if (!cache) {
      cache = new Map();
      integerPresence.set(client, cache);
    }
    const key =
      basis.recordedPosition === undefined ? undefined : `${scopeKey}/${basis.recordedPosition}`;
    let present = key === undefined ? undefined : cache.get(key);
    if (present === undefined) {
      const rows = await client.query(
        "SELECT 1 AS present FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND value_type = 'integer'" +
          (basis.recordedPosition === undefined ? "" : " AND recorded_position <= ?") +
          " LIMIT 1",
        [scopeKey, ...(basis.recordedPosition === undefined ? [] : [basis.recordedPosition])],
        undefined,
        options.signal ? { signal: options.signal } : undefined,
      );
      present = rows.length > 0;
      if (key !== undefined) {
        if (cache.size >= 1000) cache.delete(cache.keys().next().value!);
        cache.set(key, present);
      }
    }
    if (!present) {
      // The scoped position probe includes every persisted/overlay assertion
      // family, so this absence proof is valid through OR/NOT/optional routes.
      // Unknown or computed routes are never narrowed merely by a missing hint.
      const visit = (value: unknown): void => {
        if (typeof value === "string" && value.startsWith("?")) options.onNonIntegerProjection?.(value);
        else if (Array.isArray(value)) value.forEach(visit);
        else if (typeof value === "object" && value !== null) Object.values(value).forEach(visit);
      };
      visit(query);
      return [];
    }
  }
  const operated = new Set<string>();
  const computedOperands = new Set<string>();
  const computedTargets = new Set((query.compute ?? []).map((computation) => computation[3]));
  for (const [, left, right] of query.compute ?? [])
    for (const term of [left, right]) {
      if (typeof term === "string" && term.startsWith("?")) {
        operated.add(term);
        computedOperands.add(term);
      }
    }
  for (const [operation, source] of query.aggregate ?? [])
    if (operation !== "count") operated.add(source);
  for (const clause of query.where)
    if ([">", ">=", "<", "<="].includes(String(clause[0]))) {
      for (const term of clause.slice(1))
        if (typeof term === "string" && term.startsWith("?")) operated.add(term);
    }
  const projected = query.find.filter(
    (term): term is string => typeof term === "string" && term.startsWith("?"),
  );
  const variables = new Set([...operated, ...projected]);
  const hints: string[] = [];
  let ruleRelations = options.ruleRelations;
  if (query.rules?.length && !ruleRelations)
    ruleRelations = await evaluateRules(client, query, scopeKey, basis, options.signal);
  for (const variable of variables) {
    options.signal?.throwIfAborted();
    const positive = query.where.some(
      (clause) =>
        clause.length >= 3 &&
        clause[2] === variable &&
        typeof clause[1] === "string" &&
        (clause[1].startsWith(":") || clause[1].startsWith("?")),
    );
    const optional = query.optionalProjection?.fields.filter(
      (field) => field.variable === variable,
    );
    if (!positive && !optional?.length) continue;
    // Domain-dependent ordered predicates are checked once the domain is known.
    // Keep identities, joins, equality filters, negation and unrelated predicates.
    const dependsOnComputed = (value: unknown): boolean =>
      typeof value === "string"
        ? computedTargets.has(value)
        : Array.isArray(value) && value.some(dependsOnComputed);
    const where = query.where.filter(
      (clause) =>
        !dependsOnComputed(clause) &&
        !(
          [">", ">=", "<", "<="].includes(String(clause[0])) &&
          clause.some((term) => term === variable)
        ),
    );
    const candidate: DatalogQuery = {
      find: [variable],
      where,
      ...(query.rules ? { rules: query.rules } : {}),
      ...(optional?.length && query.optionalProjection
        ? { optionalProjection: { ...query.optionalProjection, fields: optional } }
        : {}),
    };
    const compiled = compileXtdb(candidate, scopeKey, {
      basis,
      integerVariables: optional?.length ? [variable] : [],
      ...(ruleRelations ? { ruleRelations } : {}),
      ...(options.wrapDomainQuery ? { temporalInWhere: true } : {}),
    });
    const columns = compiled.valueColumnMap.get(variable);
    if (!columns) continue;
    const from = compiled.sql.indexOf("\nFROM ");
    const alias = /CASE WHEN (t\d+)\.value_type/.exec(compiled.sql.slice(0, from))?.[1];
    const domainSql =
      alias && !query.rules?.length
        ? `SELECT DISTINCT ${alias}.value_type AS value_type${compiled.sql.slice(from)}`
        : `SELECT DISTINCT "${columns.type}" AS value_type FROM (${compiled.sql}) candidates`;
    const domain = options.wrapDomainQuery?.(domainSql, compiled.params) ?? {
      sql: domainSql,
      params: compiled.params,
    };
    const rows = await client.query<{ value_type: string }>(
      domain.sql,
      domain.params,
      undefined,
      options.signal ? { signal: options.signal } : undefined,
    );
    const types = new Set(
      rows.map(({ value_type }) => (value_type === "datetime" ? "number" : value_type)),
    );
    if (!types.has("integer")) options.onNonIntegerProjection?.(variable);
    if (
      computedOperands.has(variable) &&
      [...types].some((type) => type !== "integer" && type !== "number")
    )
      throw new DatalogValidationError({
        query,
        message: `Computed operand ${variable} contains a nonnumeric or missing value`,
      });
    const integerComputation = query.compute?.some(
      ([, left, right]) =>
        [left, right].includes(variable as never) &&
        [left, right].some(
          (term) => typeof term === "object" && term !== null && term.type === "integer",
        ),
    );
    if (integerComputation && types.has("number"))
      throw new DatalogValidationError({
        query,
        message: `Mixed exact integer and number arithmetic for ${variable} requires an explicit cast`,
      });
    const integerComparison = query.where.some(
      (clause) =>
        [">", ">=", "<", "<="].includes(String(clause[0])) &&
        clause.some((term) => term === variable) &&
        clause.some(
          (term) =>
            typeof term === "object" && term !== null && "type" in term && term.type === "integer",
        ),
    );
    if (integerComparison && types.has("number"))
      throw new DatalogValidationError({
        query,
        message: `Mixed exact integer and number comparison for ${variable} requires an explicit cast`,
      });
    if (types.has("integer")) {
      if (operated.has(variable) && types.has("number"))
        throw new DatalogValidationError({
          query,
          message: `Mixed exact integer and number values for ${variable} require an explicit cast`,
        });
      hints.push(variable);
    }
  }
  return hints;
};
