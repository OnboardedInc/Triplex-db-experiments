import { assertDatalogQuery, DatalogValidationError } from "@triplex-build/triplex/runtime";
import { ruleClosure, type FrontierEdge } from "@triplex-build/triplex/runtime";
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
import { literal } from "./rdf.js";

type Rule = NonNullable<DatalogQuery["rules"]>[number];
type Clause = Rule["body"][number];
const isVariable = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("?");
const isRuleCall = (clause: readonly unknown[], names: ReadonlySet<string>) =>
  typeof clause[0] === "string" && names.has(clause[0]) && !String(clause[1]).startsWith(":");

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
 * SELECT (B), and the recursive definitions' edges A (`[head, attr, next]`) are read backwards
 * from the base sources, one frontier round per hop, with the frontier as one `VALUES` block;
 * R = union of A^k composed with B for k = 0..maxDepth, exactly the relation the old depth-tagged
 * rounds produced (checked in packages/core/test/native/frontier-closure.test.ts). The main query
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
  const selection = (patterns: readonly Clause[], frontier?: readonly string[]) => {
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
    // The frontier joins the compiled body on the second endpoint as ONE VALUES block (R10 3.3).
    const values = frontier ? `VALUES ?v1_value { ${frontier.map(literal).join(" ")} } ` : "";
    return `SELECT DISTINCT ?v0_value ?v1_value WHERE { ${values}{ ${body.sparql} } ${headAliases} FILTER(?v0_type = "string" && ?v1_type = "string") }`;
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
    const { pairs } = await ruleClosure({
      base,
      // Recursive definitions are `[head, attr, next]` then `[name, next, tail]` (validation.ts).
      ...(recursive.length
        ? {
            predecessors: async (batch: readonly string[], limit: number) => {
              const edges: FrontierEdge[] = [];
              for (const rule of recursive) {
                const patterns = rule.body.filter((clause) => !isRuleCall(clause, names));
                const rows = await read(selection(patterns, batch), limit - edges.length);
                edges.push(...rows.map(([head, next]) => [next, head] as const));
              }
              return edges;
            },
          }
        : {}),
      maxDepth,
      maxPairs: Math.max(1, maxRows - total),
      // QLever plans each VALUES literal in about 0.23 ms; 1,000 is the measured knee (R10 3.3).
      budgets: { maxBatch: 1_000 },
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
