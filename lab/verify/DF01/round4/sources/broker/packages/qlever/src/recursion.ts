import { assertDatalogQuery, DatalogValidationError } from "@triplex-build/triplex/runtime";
import {
  FRONTIER_DEFAULTS,
  memoryEdges,
  ruleClosure,
  type FrontierEdge,
  type RuleTail,
} from "@triplex-build/triplex/runtime";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import type { QleverClient } from "./QleverClient.js";
import {
  compileQlever,
  type QleverBasis,
  type QleverSourceView,
  type QleverNegationPlan,
} from "./compiler.js";
import type { QleverDomainPlan } from "./FamilyDomains.js";
import type { QleverSourcePlan } from "./ScalarSource.js";

type Rule = NonNullable<DatalogQuery["rules"]>[number];
type Clause = Rule["body"][number];
const isVariable = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("?");
const isRuleCall = (clause: readonly unknown[], names: ReadonlySet<string>) =>
  typeof clause[0] === "string" && names.has(clause[0]) && !String(clause[1]).startsWith(":");

/**
 * How the recursive call's tail relates to the body (`[head attr next] [R next tail]`). The old
 * rounds compiled the whole body with the tail projected, so `tail = head` and `tail = next` are
 * equality conditions. A tail bound to the attribute variable is refused, typed.
 */
const ruleTail = (query: DatalogQuery, rule: Rule, pattern: Clause, call: Clause): RuleTail => {
  const tail = call[2];
  if (tail === pattern[0]) return "head";
  if (tail === pattern[2]) return "next";
  if (tail === pattern[1])
    throw new DatalogValidationError({
      query,
      message: `QLever rule ${rule.name}: a recursive tail bound to the attribute is not supported`,
    });
  return "free";
};

/** Evaluated rule relations, by rule name: the distinct `(arg1, arg2)` string pairs. */
export type QleverRuleRelations = ReadonlyMap<string, readonly FrontierEdge[]>;

/** Empty relations with the right names, for compile-only callers (explain). */
export const placeholderQleverRuleRelations = (query: DatalogQuery): QleverRuleRelations =>
  new Map((query.rules ?? []).map(({ name }) => [name, []]));

/**
 * Evaluate the query's bounded binary rules with SPARQL reads only (contract C8, R10 6.9).
 *
 * [EXP-C8] Why: the old evaluator INSERTed every rule round into a per-run derived graph from
 * inside a query call and never removed it: one SPARQL update per rule per round, each emptying
 * QLever's whole result cache (R17 finding 2) and growing the delta (EXP-002). The relations are
 * now computed on the host by the shared `ruleClosure`: each non-recursive base body is one
 * SELECT (B), each recursive definition's edge pattern `[head attr next]` is one SELECT (A; one
 * bounded read, cheaper than a VALUES round per hop on this mapping, memoryEdges in
 * FrontierClosure.ts), and the semi-naive rounds run in memory with the call's tail constraint:
 * exactly the relation the old depth-tagged rounds produced (the old body compile bound the tail
 * variable; checked in packages/core/test/native/frontier-closure.test.ts). The main query
 * receives each relation as an inline `VALUES` block (compiler.ts). Bodies are compiled by the
 * same compiler and plans as before, so endpoint families and basis filters are unchanged; only
 * string-family endpoints enter a relation, as before.
 */
export const evaluateQleverRules = async (
  client: QleverClient,
  query: DatalogQuery,
  scopeKey: string,
  options: {
    readonly basis: QleverBasis;
    readonly sourceView?: QleverSourceView;
    readonly sourcePlan?: QleverSourcePlan;
    readonly domainPlan?: QleverDomainPlan;
    readonly negationPlan?: QleverNegationPlan;
    readonly retirementPlan?: "paired";
    readonly scalarOrderPlan?: "live";
    readonly signal: AbortSignal;
    readonly maxRows?: number;
    readonly nativeTimeoutMs?: number;
    readonly maxResponseBytes?: number;
    readonly onCompilation?: (durationMs: number) => void;
  },
): Promise<QleverRuleRelations> => {
  assertDatalogQuery(query);
  const maxRows = options.maxRows ?? 100_000;
  const rules = query.rules ?? [];
  const names = new Set(rules.map(({ name }) => name));
  const request = {
    signal: options.signal,
    ...(options.nativeTimeoutMs === undefined ? {} : { timeoutMs: options.nativeTimeoutMs }),
    ...(options.maxResponseBytes === undefined ? {} : { maxResponseBytes: options.maxResponseBytes }),
  };
  /** One pattern-only rule body as `SELECT DISTINCT ?v0_value ?v1_value` over string endpoints. */
  const selection = (patterns: readonly Clause[]) => {
    const first = patterns.find((clause) => isVariable(clause[0]))?.[0];
    const last = patterns.toReversed().find((clause) => isVariable(clause[2]))?.[2];
    if (!isVariable(first) || !isVariable(last))
      throw new DatalogValidationError({
        query,
        message: "QLever legacy rules require identity endpoints",
      });
    const compileStarted = performance.now();
    // A repeated rule endpoint is an equality constraint, not a duplicate public projection.
    // Preserve that body constraint, then restore both head channels (the exported runtime44
    // self-rule exposed this boundary).
    const sameEndpoint = first === last;
    const body = compileQlever({ find: sameEndpoint ? [first] : [first, last], where: patterns }, scopeKey, {
      basis: options.basis,
      ...(options.sourcePlan ? { sourcePlan: options.sourcePlan } : {}),
      ...(options.domainPlan ? { domainPlan: options.domainPlan } : {}),
      ...(options.negationPlan ? { negationPlan: options.negationPlan } : {}),
      ...(options.retirementPlan ? { retirementPlan: options.retirementPlan } : {}),
      ...(options.scalarOrderPlan ? { scalarOrderPlan: options.scalarOrderPlan } : {}),
      ...(options.sourceView ? { sourceView: options.sourceView } : {}),
      unboundedIntermediate: true,
    });
    options.onCompilation?.(performance.now() - compileStarted);
    const headAliases = sameEndpoint ? "BIND(?v0_value AS ?v1_value) BIND(?v0_type AS ?v1_type)" : "";
    return `SELECT DISTINCT ?v0_value ?v1_value WHERE { { ${body.sparql} } ${headAliases} FILTER(?v0_type = "string" && ?v1_type = "string") }`;
  };
  const read = async (sparql: string, limit: number) => {
    options.signal.throwIfAborted();
    const rows = await client.query(`${sparql} LIMIT ${limit}`, request);
    return rows.map((row) => {
      const arg1 = row["v0_value"]?.value,
        arg2 = row["v1_value"]?.value;
      if (typeof arg1 !== "string" || typeof arg2 !== "string")
        throw new TypeError("QLever rule endpoints must be string identities");
      return [arg1, arg2] as const;
    });
  };
  const relations = new Map<string, readonly FrontierEdge[]>();
  let total = 0;
  for (const name of names) {
    const definitions = rules.filter((rule) => rule.name === name);
    const recursive = definitions.filter((rule) =>
      rule.body.some((clause) => isRuleCall(clause, names)),
    );
    const maxDepth = Math.max(...definitions.map((rule) => rule.maxDepth ?? 100));
    const base: FrontierEdge[] = [];
    for (const rule of definitions.filter((rule) => !recursive.includes(rule)))
      base.push(...(await read(selection(rule.body), maxRows - total + 1)));
    // Recursive definitions are `[head, attr, next]` then `[name, next, tail]` (validation.ts).
    const steps = [];
    for (const rule of recursive) {
      const patterns = rule.body.filter((clause) => !isRuleCall(clause, names));
      const call = rule.body.find((clause) => isRuleCall(clause, names))!;
      const rows = await read(selection(patterns), FRONTIER_DEFAULTS.maxRoundRows + 1);
      steps.push({
        predecessors: memoryEdges(rows.map(([head, next]) => [next, head] as const)),
        tail: ruleTail(query, rule, patterns[0]!, call),
      });
    }
    const { pairs } = await ruleClosure({
      base,
      steps,
      maxDepth,
      maxPairs: Math.max(1, maxRows - total),
      signal: options.signal,
    });
    total += pairs.length;
    if (total > maxRows)
      throw new RangeError(
        `QLever recursive relation exceeds maxRecursiveRows=${maxRows}; no partial public answer`,
      );
    relations.set(name, pairs);
  }
  return relations;
};
