import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import {
  FRONTIER_DEFAULTS,
  memoryEdges,
  ruleClosure,
  type FrontierEdge,
  type RuleTail,
} from "@triplex-build/triplex/runtime";
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

/**
 * How the recursive call's tail relates to the body (`[head attr next] [R next tail]`). The old
 * rounds bound the tail variable, so `tail = head` and `tail = next` are equality conditions. A
 * tail equal to the attribute variable would need the attribute in the edge read; it is refused,
 * typed, rather than answered differently.
 */
export const ruleTail = (rule: Rule, pattern: Clause, call: Clause): RuleTail => {
  const tail = call[2];
  if (tail === pattern[0]) return "head";
  if (tail === pattern[2]) return "next";
  if (tail === pattern[1])
    throw new Error(`Rule ${rule.name}: a recursive tail bound to the attribute is not supported`);
  return "free";
};

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
  const conditions = basis.allValidTime
    ? []
    : [
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
 * binary-rule endpoint inference, unchanged from the old rounds).
 */
export const compileRuleSelection = (
  patterns: readonly Clause[],
  scopeKey: string,
  basis: QueryBasis,
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
  const sql = `SELECT DISTINCT ${a} AS arg1, ${b} AS arg2 FROM ${sources.join(" CROSS JOIN ")} WHERE ${conditions.join(" AND ")}`;
  return { sql: lowerSource(sql, parameter(scopeKey)), params };
};

/**
 * Evaluate the query's bounded binary rules with reads only (contract C8, R10 6.9).
 *
 * [EXP-C8] Why: the old evaluator materialized every rule in `tx_query_relations` with one
 * `INSERT ... SELECT` transaction per rule per round (each a `COMMIT SYNC`) from inside a
 * query call, so a Datalog read wrote and competed with the commits P1 and P2 measure. The
 * relations are now computed on the host by the shared `ruleClosure`: each non-recursive base is
 * read once (B), each recursive definition's edge pattern `[head attr next]` is read once (A; one
 * bounded read, because on the ledger a frontier round scans as much as the whole edge read,
 * memoryEdges in FrontierClosure.ts), and the semi-naive rounds run in memory with the call's
 * tail constraint. That is exactly the old depth-tagged relation (a row first inserted at round k
 * had k recursive steps; the old SQL bound the tail variable), checked against the naive rounds
 * in packages/core/test/native/frontier-closure.test.ts.
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
    // Recursive definitions are `[head, attr, next]` then `[name, next, tail]` (validation.ts).
    const steps = [];
    for (const rule of recursive) {
      const patterns = rule.body.filter((clause) => !isRuleCall(clause, names));
      const call = rule.body.find((clause) => isRuleCall(clause, names))!;
      const rows = await read(
        compileRuleSelection(patterns, scopeKey, basis),
        FRONTIER_DEFAULTS.maxRoundRows + 1,
      );
      steps.push({
        predecessors: memoryEdges(rows.map(([head, next]) => [next, head] as const)),
        tail: ruleTail(rule, patterns[0]!, call),
      });
    }
    const { pairs } = await ruleClosure({
      base,
      steps,
      maxDepth,
      maxPairs: Math.max(1, maxRows - total),
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
