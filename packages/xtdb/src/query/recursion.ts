import { randomUUID } from "node:crypto";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import type { XtdbClient } from "../XtdbClient.js";
import { lowerSource, type QueryBasis } from "./compiler.js";

type Rule = NonNullable<DatalogQuery["rules"]>[number];
const isVariable = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("?");
const isRuleCall = (clause: readonly unknown[], names: Set<string>) =>
  typeof clause[0] === "string" &&
  names.has(clause[0]) &&
  !(typeof clause[1] === "string" && clause[1].startsWith(":"));

const temporal = (alias: string, basis: QueryBasis, params: unknown[]): string => {
  const parameter = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const conditions = [
    `${alias}.valid_from <= ${parameter(basis.validAt)}`,
    `(${alias}.valid_to IS NULL OR ${alias}.valid_to > ${parameter(basis.validAt)})`,
  ];
  if (basis.recordedPosition !== undefined) {
    conditions.push(`${alias}.recorded_position <= ${parameter(basis.recordedPosition)}`);
    conditions.push(
      `(${alias}.retracted_position IS NULL OR ${alias}.retracted_position > ${parameter(basis.recordedPosition)}${basis.recordedAt === undefined ? "" : ` OR ${alias}.retracted_at > ${parameter(basis.recordedAt)}`})`,
    );
  } else if (basis.recordedAt === undefined) conditions.push(`${alias}.retracted_at IS NULL`);
  else
    conditions.push(
      `(${alias}.retracted_at IS NULL OR ${alias}.retracted_at > ${parameter(basis.recordedAt)})`,
    );
  if (basis.recordedAt !== undefined)
    conditions.push(`${alias}.recorded_at <= ${parameter(basis.recordedAt)}`);
  return conditions.join(" AND ");
};

/** SQL-only relational round: the host never receives intermediate row sets. */
export const compileRuleRound = (
  rule: Rule,
  names: Set<string>,
  scopeKey: string,
  runId: string,
  basis: QueryBasis,
  round: number,
  maxRows = 100_000,
) => {
  const params: unknown[] = [];
  const parameter = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const bindings = new Map<string, string>();
  const conditions: string[] = [];
  const sources: string[] = [];
  let first: string | undefined;
  let last: string | undefined;
  const bind = (term: unknown, expression: string) => {
    if (isVariable(term)) {
      const existing = bindings.get(term);
      if (existing) conditions.push(`${expression} = ${existing}`);
      else bindings.set(term, expression);
    } else
      conditions.push(
        `${expression} = ${parameter(typeof term === "object" && term !== null && "value" in term ? term.value : term)}`,
      );
  };
  rule.body.forEach((clause, index) => {
    const alias = `b${index}`;
    if (isRuleCall(clause, names)) {
      sources.push(`tx_query_relations FOR ALL VALID_TIME ${alias}`);
      conditions.push(
        `${alias}.scope_key = ${parameter(scopeKey)}`,
        `${alias}.run_id = ${parameter(runId)}`,
        `${alias}.rule_name = ${parameter(clause[0])}`,
      );
      // Each round consumes only previously completed depths.
      conditions.push(`${alias}.depth < ${parameter(round)}`);
      bind(clause[1], `${alias}.arg1`);
      bind(clause[2], `${alias}.arg2`);
    } else {
      sources.push(`triples ${alias}`);
      conditions.push(
        temporal(alias, basis, params),
        `${alias}.value_type IN ('string', 'ref', 'blob', 'json')`,
      );
      bind(clause[0], `${alias}.entity_id`);
      bind(clause[1], `${alias}.attribute`);
      bind(clause[2], `COALESCE(${alias}.value_string, ${alias}.value_json)`);
      if (isVariable(clause[0]) && first === undefined) first = clause[0];
      if (isVariable(clause[2])) last = clause[2];
    }
  });
  // Same endpoint inference as the pinned Triplex bounded binary-rule contract.
  if (!first || !last) throw new Error(`Rule ${rule.name} requires identity endpoints`);
  const a = bindings.get(first)!;
  const b = bindings.get(last)!;
  // Recursive rule's final endpoint is the recursive application's second argument.
  const recursiveCall = rule.body.find((clause) => isRuleCall(clause, names));
  const end = recursiveCall
    ? isVariable(recursiveCall[2])
      ? bindings.get(recursiveCall[2])!
      : parameter(recursiveCall[2])
    : b;
  const selection = `SELECT DISTINCT ${a} AS arg1, ${end} AS arg2 FROM ${sources.join(" CROSS JOIN ")} WHERE ${conditions.join(" AND ")}`;
  const scope = parameter(scopeKey);
  const run = parameter(runId);
  const name = parameter(rule.name);
  const depth = parameter(round);
  const idPrefix = parameter(`${runId}/${rule.name}/`);
  const sql = `INSERT INTO tx_query_relations (_id, scope_key, run_id, rule_name, arg1, arg2, depth)
SELECT ${idPrefix} || CAST(CHARACTER_LENGTH(c.arg1) AS TEXT) || ':' || c.arg1 || c.arg2, ${scope}, ${run}, ${name}, c.arg1, c.arg2, ${depth}
FROM (${selection}) c
WHERE NOT EXISTS (SELECT 1 FROM tx_query_relations FOR ALL VALID_TIME seen WHERE seen.scope_key = ${scope} AND seen.run_id = ${run} AND seen.rule_name = ${name} AND seen.arg1 = c.arg1 AND seen.arg2 = c.arg2)
LIMIT ${maxRows + 1}`;
  return { sql: lowerSource(sql, scope), params };
};

export const materializeRules = async (
  client: XtdbClient,
  query: DatalogQuery,
  scopeKey: string,
  basis: QueryBasis,
  signal?: AbortSignal,
  maxRows = 100_000,
): Promise<string> => {
  const runId = randomUUID();
  const rules = query.rules ?? [];
  const names = new Set(rules.map(({ name }) => name));
  const recursive = rules.filter((rule) => rule.body.some((clause) => isRuleCall(clause, names)));
  const base = rules.filter((rule) => !recursive.includes(rule));
  const depths = new Map<string, number>();
  for (const rule of rules)
    depths.set(rule.name, Math.max(depths.get(rule.name) ?? 0, rule.maxDepth ?? 100));
  const checkedCount = async () => {
    const countRows = await client.query<{ total: unknown }>(
      "SELECT COUNT(*) AS total FROM tx_query_relations FOR ALL VALID_TIME WHERE scope_key = ? AND run_id = ?",
      [scopeKey, runId],
      undefined,
      signal ? { signal } : undefined,
    );
    const count = Number(countRows[0]?.total ?? 0);
    if (!Number.isSafeInteger(count) || count > maxRows)
      throw new RangeError(
        `XTDB recursive relation exceeds maxRecursiveRows=${maxRows}; no partial answer returned`,
      );
    return count;
  };
  for (const rule of base) {
    signal?.throwIfAborted();
    await client.submit([compileRuleRound(rule, names, scopeKey, runId, basis, 0, maxRows)]);
    await checkedCount();
  }
  let previous = -1;
  const maxDepth = Math.max(0, ...recursive.map((rule) => depths.get(rule.name) ?? 100));
  for (let round = 1; recursive.length && round <= maxDepth; round++) {
    signal?.throwIfAborted();
    const count = await checkedCount();
    if (count === previous) break;
    previous = count;
    for (const rule of recursive) {
      if (round > (depths.get(rule.name) ?? 100)) continue;
      signal?.throwIfAborted();
      await client.submit([compileRuleRound(rule, names, scopeKey, runId, basis, round, maxRows)]);
      await checkedCount();
    }
  }
  return runId;
};
