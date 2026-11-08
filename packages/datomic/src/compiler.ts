import { assertDatalogQuery } from "@triplex-build/triplex/runtime";
import {
  isVariable,
  isPatternClause,
  isPredicateClause,
  normalizeOrAlternatives,
  type DatalogQuery,
} from "@triplex-build/triplex/datalog";
import type { ResolvedTemporalBasis } from "@triplex-build/triplex";

// [EXP-DA01] Why: emit only closed EDN operators with escaped literals. Rejected: interpolating user-authored EDN (classpath execution).
export const literal = (value: unknown): string => {
  if (typeof value === "object" && value !== null && "type" in value && "value" in value)
    return value.type === "integer" ? String(value.value) : JSON.stringify(value.value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Nonfinite query constant");
    return Object.is(value, -0) ? "-0.0" : Number.isInteger(value) ? `${value}.0` : String(value);
  }
  if (value === undefined || value === null) return "nil";
  return JSON.stringify(value);
};
export function compileDatomic(input: DatalogQuery, basis: ResolvedTemporalBasis) {
  const query = assertDatalogQuery(input);
  let counter = 0;
  const variables = new Map<string, string>();
  const variable = (name: string) => {
    if (!variables.has(name)) variables.set(name, `?v${variables.size}`);
    return variables.get(name)!;
  };
  const term = (t: unknown) => (isVariable(t) ? variable(t) : literal(t));
  const witnesses: string[] = [];
  const computed = new Set(query.compute?.map(([, , , target]) => target));
  const rules = new Set(query.rules?.map((rule) => rule.name));
  const compile = (
    clauses: readonly (readonly unknown[])[],
    bound: Set<string>,
    top: boolean,
  ): string[] => {
    const output: string[] = [];
    // Establish conjunction bindings before filters, matching shared semantic preflight.
    const patterns = clauses.filter(
      (c) =>
        isPatternClause(c as never) || (rules.has(String(c[0])) && !String(c[1]).startsWith(":")),
    );
    const filters = clauses.filter((c) => !patterns.includes(c));
    for (const c of patterns) {
      const n = counter++;
      if (rules.has(String(c[0])) && !String(c[1]).startsWith(":")) {
        output.push(`[$rules ${literal(c[0])} ${term(c[1])} ${term(c[2])}]`);
        for (const t of c.slice(1)) if (isVariable(t)) bound.add(t);
      } else {
        const f = `?f${n}`,
          subject = `?s${n}`,
          attr = `?a${n}`,
          value = `?z${n}`;
        output.push(
          `[${f} :f/id ?id${n}]`,
          `[(triplex.gateway.query/visible $ ${f} ${literal(basis.validAt)} ${literal(basis.recordedAt)} ${literal(basis.recordedPosition)})]`,
          `[${f} :f/subject ${subject}]`,
          `[${subject} :triplex.entity/id ${term(c[0])}]`,
          `[${f} :f/attr ${attr}]`,
          `[${attr} :triplex.attr/key ${term(c[1])}]`,
          `[(triplex.gateway.query/scalar $ ${f}) ${isVariable(c[2]) ? term(c[2]) : value}]`,
        );
        if (!isVariable(c[2])) {
          output.push(`[(triplex.gateway.query/compare-op "=" ${value} ${term(c[2])})]`);
          if (typeof c[2] === "object" && c[2] !== null && "type" in c[2])
            output.push(`[${f} :f/type :${String(c[2].type)}]`);
        }
        if (c[3] !== undefined)
          output.push(`[(triplex.gateway.query/transaction-id $ ${f}) ${term(c[3])}]`);
        for (const t of c) if (isVariable(t)) bound.add(t);
        if (top) witnesses.push(`?id${n}`);
      }
    }
    for (const c of filters) {
      if (isPredicateClause(c as never)) {
        if (c.slice(1).some((t) => typeof t === "string" && computed.has(t))) continue;
        output.push(
          `[(triplex.gateway.query/compare-op ${literal(c[0])} ${term(c[1])} ${term(c[2])})]`,
        );
      } else if (c[0] === "not") {
        const inner = c.slice(1).filter(Boolean) as readonly (readonly unknown[])[];
        const used = new Set(inner.flat().filter(isVariable));
        const shared = [...bound].filter((v) => used.has(v)).map(variable);
        output.push(
          `(not-join [${shared.join(" ")}] ${compile(inner, new Set(bound), false).join(" ")})`,
        );
      } else if (c[0] === "or") {
        const alternatives = normalizeOrAlternatives(c as never);
        const used = new Set(alternatives.flat(2).filter(isVariable));
        const shared = [...bound].filter((v) => used.has(v)).map(variable);
        output.push(
          `(or-join [${shared.join(" ")}] ${alternatives.map((alt) => `(and ${compile([alt] as never, new Set(bound), false).join(" ")})`).join(" ")})`,
        );
      } else throw new TypeError(`Unsupported clause ${String(c[0])}`);
    }
    return output;
  };
  const bound = new Set<string>();
  const where = compile(query.where, bound, true);
  const projected = [...bound].map((v) => [v, variable(v)] as const);
  const find = [...projected.map(([, v]) => v), ...witnesses];
  if (!find.length) {
    find.push("?unit");
    where.push("[(ground true) ?unit]");
  }
  return {
    edn: `[:find ${find.join(" ")} :in $ $rules :where ${where.join(" ")}]`,
    variables: projected.map(([v]) => v),
    width: find.length,
  };
}
