import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import { ruleClosure, type FrontierEdge } from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "../XtdbClient.js";
import { lowerSource, type QueryBasis } from "./compiler.js";

type Rule = NonNullable<DatalogQuery["rules"]>[number];
type Clause = Rule["body"][number];
const isVariable = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("?");
const isRuleCall = (clause: readonly unknown[], names: Set<string>) =>
  typeof clause[0] === "string" &&
  names.has(clause[0]) &&
  !(typeof clause[1] === "string" && clause[1].startsWith(":"));

/** Evaluated rule relations, by rule name: the distinct `(arg1, arg2)` text pairs. */
export type RuleRelations = ReadonlyMap<string, readonly FrontierEdge[]>;

/** Empty relations with the right names, for compile-only callers (preflight, explain). */
export const placeholderRuleRelations = (query: DatalogQuery): RuleRelations =>
  new Map((query.rules ?? []).map(({ name }) => [name, []]));

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

/**
 * One read-only SELECT of a rule body's pattern clauses: `SELECT DISTINCT a AS arg1, b AS arg2`,
 * with `a` the first entity variable and `b` the last value variable (the pinned Triplex bounded
 * binary-rule endpoint inference, unchanged from the old rounds). With `frontier`, only rows whose
 * `b` is in the frontier are returned (`b IN (SELECT x FROM UNNEST($n) AS u(x))`).
 */
export const compileRuleSelection = (
  patterns: readonly Clause[],
  scopeKey: string,
  basis: QueryBasis,
  frontier?: readonly string[],
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
  patterns.forEach((clause, index) => {
    const alias = `b${index}`;
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
  });
  if (!first || !last) throw new Error("Datalog rules require identity endpoints");
  const a = bindings.get(first)!;
  const b = bindings.get(last)!;
  // [EXP-C8] Why the IN (SELECT ... UNNEST) form: `b = ANY($n) AND ...` returns zero or wrong
  // rows on XTDB 2.2.0 (R10 finding 7, R14 H05); this form was correct in every probe and is an
  // uncorrelated semi-join in WHERE, outside #6313 and #6345 (R14 H02, H03).
  if (frontier) conditions.push(`${b} IN (SELECT x FROM UNNEST(${parameter([...frontier])}) AS u(x))`);
  const sql = `SELECT DISTINCT ${a} AS arg1, ${b} AS arg2 FROM ${sources.join(" CROSS JOIN ")} WHERE ${conditions.join(" AND ")}`;
  return { sql: lowerSource(sql, parameter(scopeKey)), params };
};

/**
 * Evaluate the query's bounded binary rules with reads only (contract C8, R10 6.9).
 *
 * [EXP-C8] Why: the old evaluator materialized every rule in `tx_query_relations` with one
 * `INSERT ... SELECT` transaction per rule per round (each a `COMMIT SYNC`) from inside a
 * query call, so a Datalog read wrote and competed with the commits P1 and P2 measure. The
 * relations are now computed on the host by the shared `ruleClosure`: the non-recursive bases
 * are read once (B), and the recursive definitions' edges A are fetched backwards from the base
 * sources one frontier round per hop, then R = union of A^k composed with B for k = 0..maxDepth.
 * That is exactly the old depth-tagged relation (a row first inserted at round k had k recursive
 * steps), checked against the naive rounds in packages/core/test/native/frontier-closure.test.ts.
 * The main query receives each relation as one JSON-array parameter (compiler.ts lowerRules).
 * Every read carries the same basis, so commits during evaluation cannot change the answer
 * (R10 3.8). Budget: `maxRows` distinct pairs in total, as before; no partial answer.
 */
export const evaluateRules = async (
  client: XtdbClient,
  query: DatalogQuery,
  scopeKey: string,
  basis: QueryBasis,
  signal?: AbortSignal,
  maxRows = 100_000,
): Promise<RuleRelations> => {
  const rules = query.rules ?? [];
  const names = new Set(rules.map(({ name }) => name));
  const relations = new Map<string, readonly FrontierEdge[]>();
  const read = async (selection: { sql: string; params: unknown[] }, limit: number) => {
    signal?.throwIfAborted();
    const rows = await client.query<{ arg1: unknown; arg2: unknown }>(
      `${selection.sql} LIMIT ${limit}`,
      selection.params,
      undefined,
      signal ? { signal } : undefined,
    );
    return rows.map(({ arg1, arg2 }) => {
      if (typeof arg1 !== "string" || typeof arg2 !== "string")
        throw new TypeError("Datalog rule endpoints must be text identities");
      return [arg1, arg2] as const;
    });
  };
  let total = 0;
  for (const name of names) {
    const definitions = rules.filter((rule) => rule.name === name);
    const recursive = definitions.filter((rule) =>
      rule.body.some((clause) => isRuleCall(clause, names)),
    );
    const maxDepth = Math.max(...definitions.map((rule) => rule.maxDepth ?? 100));
    const base: FrontierEdge[] = [];
    for (const rule of definitions.filter((rule) => !recursive.includes(rule))) {
      const rows = await read(
        compileRuleSelection(rule.body, scopeKey, basis),
        maxRows - total + 1,
      );
      base.push(...rows);
    }
    const { pairs } = await ruleClosure({
      base,
      // Recursive definitions are `[head, attr, next]` then `[name, next, tail]` (validation.ts);
      // the edge read returns `(head, next)` with `next` in the frontier, reversed for the loop.
      ...(recursive.length
        ? {
            predecessors: async (batch: readonly string[], limit: number) => {
              const edges: FrontierEdge[] = [];
              for (const rule of recursive) {
                const patterns = rule.body.filter((clause) => !isRuleCall(clause, names));
                const rows = await read(
                  compileRuleSelection(patterns, scopeKey, basis, batch),
                  limit - edges.length,
                );
                edges.push(...rows.map(([head, next]) => [next, head] as const));
              }
              return edges;
            },
          }
        : {}),
      maxDepth,
      maxPairs: Math.max(1, maxRows - total),
      // XTDB rounds take large frontiers cheaply (R10 3.4, 10,000-id batches).
      budgets: { maxBatch: 10_000 },
      ...(signal ? { signal } : {}),
    });
    total += pairs.length;
    if (total > maxRows)
      throw new RangeError(
        `XTDB recursive relation exceeds maxRecursiveRows=${maxRows}; no partial answer returned`,
      );
    relations.set(name, pairs);
  }
  return relations;
};
