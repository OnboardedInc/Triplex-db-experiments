import { randomUUID } from "node:crypto";
import { assertDatalogQuery, DatalogValidationError } from "@triplex-build/triplex/runtime";
import type { DatalogQuery } from "@triplex-build/triplex/datalog";
import type { QleverClient } from "./QleverClient.js";
import {
  compileQlever,
  relationGraphIri,
  type QleverBasis,
  type QleverSourceView,
} from "./compiler.js";
import type { QleverDomainPlan } from "./FamilyDomains.js";
import type { QleverSourcePlan } from "./ScalarSource.js";
import { fieldIri, literal } from "./rdf.js";

type Rule = NonNullable<DatalogQuery["rules"]>[number];
const isVariable = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("?");
const isRuleCall = (clause: readonly unknown[], names: ReadonlySet<string>) =>
  typeof clause[0] === "string" && names.has(clause[0]) && !String(clause[1]).startsWith(":");

/** Legacy bounded binary rules: all relational intermediates remain in QLever. */
export const materializeQleverRules = async (
  client: QleverClient,
  query: DatalogQuery,
  scopeKey: string,
  options: {
    readonly basis: QleverBasis;
    readonly sourceView?: QleverSourceView;
    readonly sourcePlan?: QleverSourcePlan;
    readonly domainPlan?: QleverDomainPlan;
    readonly signal: AbortSignal;
    readonly maxRows?: number;
    readonly nativeTimeoutMs?: number;
    readonly maxResponseBytes?: number;
  },
): Promise<string> => {
  assertDatalogQuery(query);
  const maxRows = options.maxRows ?? 100_000;
  const runId = randomUUID();
  const graph = relationGraphIri(scopeKey, runId);
  const rules = query.rules ?? [];
  const names = new Set(rules.map(({ name }) => name));
  const recursive = rules.filter((rule) => rule.body.some((clause) => isRuleCall(clause, names)));
  const bases = rules.filter((rule) => !recursive.includes(rule));
  const depths = new Map<string, number>();
  for (const rule of rules)
    depths.set(rule.name, Math.max(depths.get(rule.name) ?? 0, rule.maxDepth ?? 100));
  const count = async () => {
    const rows = await client.query(
      `SELECT (COUNT(*) AS ?total) WHERE { GRAPH ${graph} { ?row ${fieldIri("rule_name")} ?name } }`,
      {
        signal: options.signal,
        ...(options.nativeTimeoutMs === undefined ? {} : { timeoutMs: options.nativeTimeoutMs }),
        ...(options.maxResponseBytes === undefined
          ? {}
          : { maxResponseBytes: options.maxResponseBytes }),
      },
    );
    const n = Number(rows[0]?.["total"]?.value ?? 0);
    if (!Number.isSafeInteger(n) || n > maxRows)
      throw new RangeError(
        `QLever recursive relation exceeds maxRecursiveRows=${maxRows}; no partial public answer`,
      );
    return n;
  };
  const round = async (rule: Rule, depth: number) => {
    options.signal.throwIfAborted();
    const patterns = rule.body.filter((clause) => !isRuleCall(clause, names));
    const first = patterns.find((clause) => isVariable(clause[0]))?.[0];
    const last = patterns.toReversed().find((clause) => isVariable(clause[2]))?.[2];
    const call = rule.body.find((clause) => isRuleCall(clause, names));
    const end = call?.[2] ?? last;
    if (!first || !end)
      throw new DatalogValidationError({
        query,
        message: "QLever legacy rules require identity endpoints",
      });
    const body = compileQlever({ find: [first, end], where: rule.body, rules }, scopeKey, {
      basis: options.basis,
      ...(options.sourcePlan ? { sourcePlan: options.sourcePlan } : {}),
      ...(options.domainPlan ? { domainPlan: options.domainPlan } : {}),
      ...(options.sourceView ? { sourceView: options.sourceView } : {}),
      runId,
      ruleRound: depth,
      unboundedIntermediate: true,
    });
    const prefix = literal(`urn:triplex:derived:${runId}:${rule.name}:`);
    const sparql = `INSERT { GRAPH ${graph} { ?newRow ${fieldIri("rule_name")} ${literal(rule.name)} ; ${fieldIri("arg1")} ?v0_value ; ${fieldIri("arg2")} ?v1_value ; ${fieldIri("depth")} ${depth} . } } WHERE { { SELECT DISTINCT ?v0_value ?v1_value WHERE { { ${body.sparql} } FILTER(?v0_type = "string" && ?v1_type = "string") FILTER NOT EXISTS { GRAPH ${graph} { ?seen ${fieldIri("rule_name")} ${literal(rule.name)} ; ${fieldIri("arg1")} ?v0_value ; ${fieldIri("arg2")} ?v1_value } } } LIMIT ${maxRows + 1} } BIND(IRI(CONCAT(${prefix}, ENCODE_FOR_URI(CONCAT(STR(STRLEN(?v0_value)), ":", ?v0_value, ?v1_value)))) AS ?newRow) }`;
    await client.update(sparql, {
      signal: options.signal,
      ...(options.nativeTimeoutMs === undefined ? {} : { timeoutMs: options.nativeTimeoutMs }),
      ...(options.maxResponseBytes === undefined
        ? {}
        : { maxResponseBytes: options.maxResponseBytes }),
    });
    await count();
  };
  for (const rule of bases) await round(rule, 0);
  let previous = -1;
  const maximum = Math.max(0, ...recursive.map((rule) => depths.get(rule.name) ?? 100));
  for (let depth = 1; recursive.length && depth <= maximum; depth++) {
    const current = await count();
    if (current === previous) break;
    previous = current;
    for (const rule of recursive)
      if (depth <= (depths.get(rule.name) ?? 100)) await round(rule, depth);
  }
  return runId;
};
