import { integer } from "@triplex-build/triplex";
import {
  assertDatalogQuery,
  assertWrappedQuery,
  DatalogValidationError,
  type QueryContext,
  type TripleRow,
} from "@triplex-build/triplex/runtime";
import type { DatalogQuery, WrappedQuery } from "@triplex-build/triplex/datalog";
import type { PaginationValue } from "@triplex-build/triplex/internal";
import {
  fieldIri,
  graphIri,
  integerOrderKey,
  literal,
  numericFromOrderKey,
  numericOrderKey,
  rowFields,
} from "./rdf.js";
import type { SparqlBinding } from "./QleverClient.js";
import type { QleverSourcePlan, QleverScalarSource } from "./ScalarSource.js";
import { persistedScalarSource } from "./PersistedScalarSource.js";
import { compileFamilyDomainDistinct } from "./FamilyDomainDistinct.js";
import { compileFamilyDomainMask } from "./FamilyDomainMask.js";
import type { QleverDomainPlan, QleverFamilyDomainQuery } from "./FamilyDomains.js";

export type QleverBasis = {
  readonly validAt: number;
  readonly recordedAt?: number;
  readonly recordedPosition: number;
};
export type QleverSourceView = {
  readonly sourcePosition: number;
  readonly rows: readonly TripleRow[];
};
type Binding = {
  family: string;
  lexical: string;
  order: string;
  nativeOrder?: boolean;
  native?: string;
  exact?: string;
  hi?: string;
  lo?: string;
  integerSum?: boolean;
  average?: boolean;
};
type Output = {
  variable: string;
  type: string;
  value: string;
  order: string;
  kind: "scalar" | "order" | "integer-sum" | "average";
  count?: boolean;
  hi?: string;
  lo?: string;
  present?: string;
};
export type NumericDomain = "number" | "integer";
export const relationGraphIri = (scopeKey: string, runId: string): string =>
  graphIri(`${scopeKey}\u0000derived\u0000${runId}`);
export interface QleverCompiled {
  readonly sparql: string;
  readonly countSparql?: string;
  readonly outputs: readonly Output[];
  readonly domains: readonly { variable: string; sparql: string; sum: boolean }[];
  readonly familyDomain?: QleverFamilyDomainQuery;
  readonly checks: readonly { label: string; sparql: string }[];
  readonly decode: (row: SparqlBinding) => QueryContext;
}
const variable = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("?");
const typedInteger = (value: unknown): value is { type: "integer"; value: string } =>
  typeof value === "object" && value !== null && "type" in value && value.type === "integer";
const unsupported = (query: unknown, message: string): never => {
  throw new DatalogValidationError({ query, message: `QLever compatibility: ${message}` });
};
const scalar = (value: unknown): { family: string; lexical: string; order: string } => {
  if (typedInteger(value))
    return {
      family: "integer",
      lexical: integer(value.value).value,
      order: integerOrderKey(value.value),
    };
  if (typeof value === "number")
    return {
      family: "number",
      lexical: value === 0 ? "0" : String(value),
      order: numericOrderKey(value),
    };
  if (typeof value === "boolean")
    return { family: "boolean", lexical: value ? "1" : "0", order: value ? "1" : "0" };
  const text =
    typeof value === "object" && value !== null && "value" in value
      ? String(value.value)
      : String(value);
  return { family: "string", lexical: text, order: text };
};
const fixed = (value: unknown): Binding => {
  const s = scalar(value);
  return { family: literal(s.family), lexical: literal(s.lexical), order: literal(s.order) };
};
const category = (binding: Binding) =>
  `COALESCE(IF(${binding.family} = "number", "0", IF(${binding.family} = "integer", "1", IF(${binding.family} = "boolean", "2", "3"))), "4")`;
const constantSortKey = (value: PaginationValue) =>
  value === null
    ? "4:"
    : `${typeof value === "number" ? "0" : typedInteger(value) ? "1" : typeof value === "boolean" ? "2" : "3"}:${scalar(value).order}`;

/** Shared Triplex AST directly to SPARQL; physical RDF is never loaded for host evaluation. */
export const compileQlever = (
  input: DatalogQuery | WrappedQuery,
  scopeKey: string,
  options: {
    readonly basis: QleverBasis;
    readonly sourceView?: QleverSourceView;
    readonly sourcePlan?: QleverSourcePlan;
    readonly domainPlan?: QleverDomainPlan;
    readonly cursorValues?: readonly PaginationValue[];
    readonly numericDomains?: ReadonlyMap<string, NumericDomain>;
    readonly maxResultRows?: number;
    readonly runId?: string;
    readonly ruleRound?: number;
    readonly unboundedIntermediate?: boolean;
    /** Trusted internal SPARQL expression for a server-resident temporal span. */
    readonly validAtOrderExpression?: string;
  },
): QleverCompiled => {
  const wrapped = "inner" in input;
  const query = wrapped ? assertWrappedQuery(input).inner : assertDatalogQuery(input);
  if (query.rules?.length && !options.runId)
    unsupported(query, "recursive rule execution is not implemented; no host fallback");
  if (query.compute?.length)
    unsupported(query, "arithmetic requires native precision qualification; no lossy computation");
  const env = new Map<string, Binding>();
  let sequence = 0;
  const numericUsed = new Set<string>();
  const sumUsed = new Set<string>();
  const ruleNames = new Set(query.rules?.map(({ name }) => name) ?? []);
  const equality = (a: Binding, b: Binding) =>
    `(${a.family} = ${b.family} && ${a.lexical} = ${b.lexical})`;
  const bind = (
    term: unknown,
    binding: Binding,
    bindings: Map<string, Binding>,
    conditions: string[],
    joins: string[],
  ) => {
    if (!variable(term)) {
      conditions.push(equality(binding, fixed(term)));
      return;
    }
    const previous = bindings.get(term);
    if (previous) joins.push(equality(binding, previous));
    else bindings.set(term, binding);
  };
  const pattern = (
    clause: readonly unknown[],
    bindings: Map<string, Binding>,
    joins: string[],
  ): string => {
    const prefix = `a${sequence++}`;
    const v = (column: string) => `?${prefix}_${column}`;
    if (
      typeof clause[0] === "string" &&
      ruleNames.has(clause[0]) &&
      !String(clause[1]).startsWith(":")
    ) {
      if (!options.runId) unsupported(query, "rule relation has no completed run");
      const conditions = [
        `${v("rule_name")} = ${literal(clause[0])}`,
        ...(options.ruleRound === undefined ? [] : [`${v("depth")} < ${options.ruleRound}`]),
      ];
      bind(
        clause[1],
        { family: '"string"', lexical: v("arg1"), order: v("arg1") },
        bindings,
        conditions,
        joins,
      );
      bind(
        clause[2],
        { family: '"string"', lexical: v("arg2"), order: v("arg2") },
        bindings,
        conditions,
        joins,
      );
      return `{ GRAPH ${relationGraphIri(scopeKey, options.runId!)} { ?${prefix} ${fieldIri("rule_name")} ${v("rule_name")} ; ${fieldIri("arg1")} ${v("arg1")} ; ${fieldIri("arg2")} ${v("arg2")} ; ${fieldIri("depth")} ${v("depth")} . } FILTER(${conditions.join(" && ")}) }`;
    }
    // One compact assertion relation is used by every logical operator. Payload
    // reconstruction stays inside the leaf; only canonical channels escape it.
    const wantsSum =
      variable(clause[2]) &&
      query.aggregate?.some(
        ([op, source]) => (op === "sum" || op === "avg") && source === clause[2],
      );
    const staged = options.sourceView?.rows ?? [];
    const identities = [
      ...(staged.length ? ["id"] : []),
      "entity_id",
      "attribute",
      ...(clause.length === 4 ? ["tx_id"] : []),
    ];
    const timeFields = [
      "valid_from_order",
      "recorded_position_order",
      ...(options.basis.recordedAt === undefined ? [] : ["recorded_at_order"]),
      "valid_to_order",
      "retracted_position_order",
      ...(options.basis.recordedAt === undefined ? [] : ["retracted_at_order"]),
    ];
    const type = v("value_type"),
      payload = v("payload"),
      property = v("payload_property");
    const compactFamily = `IF(${type} IN ("number","datetime"),"number",IF(${type}="integer","integer",IF(${type}="boolean","boolean","string")))`;
    const compactLexical = `IF(${type} IN ("number","datetime") && ${payload}="-0","0",${payload})`;
    const scalarSource: QleverScalarSource =
      options.sourcePlan === "persisted"
        ? persistedScalarSource({ prefix, subject: `?${prefix}`, term: clause[2] })
        : {
            body: [
              `?${prefix} ${fieldIri("value_type")} ${type} ; ${property} ${payload} .`,
              `FILTER((${type} IN ("string","ref","integer","blob") && ${property}=${fieldIri("value_string")}) || (${type}="number" && ${property}=${fieldIri("value_number")}) || (${type}="datetime" && ${property}=${fieldIri("value_datetime")}) || (${type}="boolean" && ${property}=${fieldIri("value_boolean")}) || (${type}="json" && ${property}=${fieldIri("value_json")}))`,
            ],
            family: compactFamily,
            lexical: compactLexical,
            order: `IF(${type} IN ("number","datetime","integer"),COALESCE(${v("value_number_order")},${v("value_datetime_order")},${v("value_integer_order")}),${compactLexical})`,
            payload,
            numericOrderFields: [
              "value_number_order",
              "value_datetime_order",
              "value_integer_order",
            ],
          };
    const familyExpr = scalarSource.family,
      lexicalExpr = scalarSource.lexical,
      orderExpr = scalarSource.order;
    const scalarFields = [
      "value_family",
      "value_lexical",
      "value_order",
      ...(wantsSum ? ["value_native", "value_exact", "value_hi", "value_lo"] : []),
    ];
    const fields = [...identities, "value_type", ...timeFields, ...scalarFields];
    const local: string[] = [];
    for (const column of identities) {
      const position =
        column === "entity_id"
          ? 0
          : column === "attribute"
            ? 1
            : column === "tx_id"
              ? 3
              : undefined;
      const inputTerm = position === undefined ? undefined : clause[position];
      const literalTerm = inputTerm !== undefined && !variable(inputTerm);
      local.push(
        `?${prefix} ${fieldIri(column)} ${literalTerm ? fixed(inputTerm).lexical : v(column)} .`,
      );
    }
    local.push(...scalarSource.body);
    local.push(
      `?${prefix} ${fieldIri("valid_from_order")} ${v("valid_from_order")} ; ${fieldIri("recorded_position_order")} ${v("recorded_position_order")} .`,
    );
    if (options.basis.recordedAt !== undefined)
      local.push(`?${prefix} ${fieldIri("recorded_at_order")} ${v("recorded_at_order")} .`);
    if (scalarSource.payload && !variable(clause[2]) && scalar(clause[2]).family !== "number")
      local.push(`FILTER(${scalarSource.payload}=${fixed(clause[2]).lexical})`);
    if (!variable(clause[2])) {
      const expected = fixed(clause[2]);
      local.push(`FILTER(${familyExpr}=${expected.family} && ${lexicalExpr}=${expected.lexical})`);
    }
    if (
      typeof clause[2] === "object" &&
      clause[2] !== null &&
      "type" in clause[2] &&
      clause[2].type === "ref"
    )
      local.push(`FILTER(${type}="ref")`);
    const optional = [
      "valid_to_order",
      "retracted_position_order",
      ...(options.basis.recordedAt === undefined ? [] : ["retracted_at_order"]),
      ...scalarSource.numericOrderFields,
      ...(wantsSum
        ? [
            "value_number_native",
            "value_datetime_native",
            "value_integer_native",
            "value_number_exact",
            "value_datetime_exact",
            "value_integer_exact",
            "value_integer_sum_hi",
            "value_integer_sum_lo",
          ]
        : []),
    ];
    for (const column of optional)
      local.push(`OPTIONAL { ?${prefix} ${fieldIri(column)} ${v(column)} . }`);
    const visibleAt =
      options.validAtOrderExpression ?? literal(numericOrderKey(options.basis.validAt));
    const sourceCut = literal(numericOrderKey(options.basis.recordedPosition));
    const visibility = (pending: boolean) => [
      `${v("valid_from_order")} <= ${visibleAt}`,
      `(!BOUND(${v("valid_to_order")}) || ${v("valid_to_order")} > ${visibleAt})`,
      pending
        ? `(${v("recorded_position_order")} <= ${sourceCut} || BOUND(${v("pending")}))`
        : `${v("recorded_position_order")} <= ${sourceCut}`,
      `(!BOUND(${v("retracted_position_order")}) || (${pending ? `!BOUND(${v("pending")}) && ` : ""}(${v("retracted_position_order")} > ${sourceCut}${options.basis.recordedAt === undefined ? "" : ` || ${v("retracted_at_order")} > ${literal(numericOrderKey(options.basis.recordedAt))}`})))`,
      ...(options.basis.recordedAt === undefined
        ? []
        : [`${v("recorded_at_order")} <= ${literal(numericOrderKey(options.basis.recordedAt))}`]),
    ];
    local.push(`FILTER(${visibility(false).join(" && ")})`);
    if (staged.length)
      local.push(`FILTER(${v("id")} NOT IN (${staged.map((row) => literal(row.id)).join(",")}))`);
    const identityOutputs = ([0, 1, 3] as const)
      .filter((position) => variable(clause[position]))
      .map((position) => v(position === 0 ? "entity_id" : position === 1 ? "attribute" : "tx_id"));
    const scalarOutputs = variable(clause[2]) ? scalarFields.map(v) : [];
    const outputFields = [...identityOutputs, ...scalarOutputs];
    const projection = [
      ...identityOutputs,
      ...(variable(clause[2])
        ? [
            `(${familyExpr} AS ${v("value_family")})`,
            `(${lexicalExpr} AS ${v("value_lexical")})`,
            `(${orderExpr} AS ${v("value_order")})`,
            ...(wantsSum
              ? [
                  `(COALESCE(${v("value_number_native")},${v("value_datetime_native")},${v("value_integer_native")}) AS ${v("value_native")})`,
                  `(COALESCE(${v("value_number_exact")},${v("value_datetime_exact")},${v("value_integer_exact")},"false") AS ${v("value_exact")})`,
                  `(${v("value_integer_sum_hi")} AS ${v("value_hi")})`,
                  `(${v("value_integer_sum_lo")} AS ${v("value_lo")})`,
                ]
              : []),
          ]
        : []),
    ];
    // SELECT without DISTINCT preserves assertion multiplicity without leaking
    // assertion IDs or temporal metadata into cross-pattern join planning.
    const base = `{ SELECT ${projection.join(" ") || `(1 AS ${v("exists")})`} WHERE { GRAPH ${graphIri(scopeKey)} { ${local.join("\n")} } } }`;
    const stagedValues = staged.map((row) => {
      const values = new Map(rowFields(row));
      const aliases = new Map(values);
      for (const [target, source] of [
        ["value_family", "scalar_family"],
        ["value_lexical", "scalar_lexical"],
        ["value_order", "scalar_order"],
        ["value_hi", "value_integer_sum_hi"],
        ["value_lo", "value_integer_sum_lo"],
      ])
        aliases.set(target!, values.get(source!) ?? "UNDEF");
      aliases.set(
        "value_native",
        values.get("value_number_native") ??
          values.get("value_datetime_native") ??
          values.get("value_integer_native") ??
          "UNDEF",
      );
      aliases.set(
        "value_exact",
        values.get("value_number_exact") ??
          values.get("value_datetime_exact") ??
          values.get("value_integer_exact") ??
          '"false"',
      );
      return `(${fields.map((column) => aliases.get(column) ?? "UNDEF").join(" ")} "true")`;
    });
    const stageConditions = visibility(true);
    for (const [position, column] of [
      [0, "entity_id"],
      [1, "attribute"],
      [3, "tx_id"],
    ] as const)
      if (clause[position] !== undefined && !variable(clause[position]))
        stageConditions.push(`${v(column)}=${fixed(clause[position]).lexical}`);
    if (!variable(clause[2])) {
      const expected = fixed(clause[2]);
      stageConditions.push(
        `${v("value_family")}=${expected.family} && ${v("value_lexical")}=${expected.lexical}`,
      );
      if (
        typeof clause[2] === "object" &&
        clause[2] !== null &&
        "type" in clause[2] &&
        clause[2].type === "ref"
      )
        stageConditions.push(`${type}="ref"`);
    }
    const source = staged.length
      ? `{ ${base} } UNION { SELECT ${outputFields.join(" ") || `(1 AS ${v("exists")})`} WHERE { VALUES (${fields.map(v).join(" ")} ${v("pending")}) { ${stagedValues.join("\n")} } FILTER(${stageConditions.join(" && ")}) } }`
      : base;
    const value: Binding = variable(clause[2])
      ? {
          family: v("value_family"),
          lexical: v("value_lexical"),
          order: v("value_order"),
          ...(wantsSum
            ? {
                native: v("value_native"),
                exact: v("value_exact"),
                hi: v("value_hi"),
                lo: v("value_lo"),
              }
            : {}),
        }
      : fixed(clause[2]);
    const identity = (column: string): Binding => {
      const position = column === "entity_id" ? 0 : column === "attribute" ? 1 : 3;
      return variable(clause[position])
        ? { family: '"string"', lexical: v(column), order: v(column) }
        : fixed(clause[position]);
    };
    const identityRewrites = new Map<string, string>();
    for (const [position, column] of [
      [0, "entity_id"],
      [1, "attribute"],
      [3, "tx_id"],
    ] as const) {
      const inputTerm = clause[position];
      const existing = variable(inputTerm) ? bindings.get(inputTerm) : undefined;
      if (existing?.family === '"string"' && /^\?[A-Za-z_][A-Za-z0-9_]*$/.test(existing.lexical))
        identityRewrites.set(v(column), existing.lexical);
    }
    const priorValue = variable(clause[2]) ? bindings.get(clause[2]) : undefined;
    if (priorValue)
      for (const channel of ["family", "lexical"] as const)
        if (/^\?[A-Za-z_][A-Za-z0-9_]*$/.test(priorValue[channel]))
          identityRewrites.set(value[channel], priorValue[channel]);
    const conditions: string[] = [];
    bind(clause[0], identity("entity_id"), bindings, conditions, joins);
    bind(clause[1], identity("attribute"), bindings, conditions, joins);
    bind(clause[2], value, bindings, conditions, joins);
    if (clause.length === 4) bind(clause[3], identity("tx_id"), bindings, conditions, joins);
    let result = `{ ${source}${conditions.length ? `\nFILTER(${conditions.join(" && ")})` : ""} }`;
    const rewrite = (text: string) =>
      text.replace(
        /("(?:[^"\\]|\\.)*")|(\?[A-Za-z_][A-Za-z0-9_]*)/g,
        (token, quoted: string | undefined) =>
          quoted ? token : (identityRewrites.get(token) ?? token),
      );
    result = rewrite(result);
    for (let i = 0; i < joins.length; i++) joins[i] = rewrite(joins[i]!);
    return result;
  };
  const term = (value: unknown, bindings: Map<string, Binding>): Binding =>
    variable(value)
      ? (bindings.get(value) ?? unsupported(query, `unbound ${value}`))
      : fixed(value);
  const predicate = (
    clause: readonly unknown[],
    bindings: Map<string, Binding>,
    domains = false,
  ): string => {
    const [op, left, right] = clause;
    const a = term(left, bindings);
    const b = term(right, bindings);
    if (a.integerSum || b.integerSum || a.average || b.average)
      unsupported(
        query,
        "filters/HAVING over exact integer SUM or decoded AVG require a server result key; no lexical fallback",
      );
    if (a.nativeOrder || b.nativeOrder) {
      const native = (value: unknown, binding: Binding): string => {
        if (binding.nativeOrder) return binding.order;
        if (typeof value === "number" && Number.isInteger(value) && Math.abs(value) <= 2 ** 49)
          return String(value);
        return unsupported(
          query,
          "aggregate-result comparisons currently require bounded integral numeric operands",
        );
      };
      return `(${native(left, a)} ${op === "=" ? "=" : op === "!=" ? "!=" : String(op)} ${native(right, b)})`;
    }
    if (op === "=" || op === "!=") return `${op === "!=" ? "!" : ""}${equality(a, b)}`;
    if (domains) return "true";
    if (variable(left)) numericUsed.add(left);
    if (variable(right)) numericUsed.add(right);
    return `(${a.family} IN ("number", "integer") && ${a.family} = ${b.family} && ${a.order} ${String(op)} ${b.order})`;
  };
  const isPredicate = (clause: readonly unknown[]) =>
    ["=", "!=", ">", ">=", "<", "<="].includes(String(clause[0]));
  const clauses = (
    body: readonly (readonly unknown[])[],
    bindings: Map<string, Binding>,
    domains = false,
  ): string => {
    const positives = body.filter(
      (clause) => !isPredicate(clause) && clause[0] !== "not" && clause[0] !== "or",
    );
    const joins: string[] = [];
    const result = positives.map((clause) => pattern(clause, bindings, joins));
    result.push(...joins.map((condition) => `FILTER(${condition})`));
    for (const clause of body) {
      if (isPredicate(clause)) result.push(`FILTER(${predicate(clause, bindings, domains)})`);
      else if (clause[0] === "not")
        result.push(
          `FILTER NOT EXISTS { ${clauses(clause.slice(1).filter(Boolean) as readonly (readonly unknown[])[], new Map(bindings), domains)} }`,
        );
      else if (clause[0] === "or") {
        const alternatives = clause[1] as readonly (readonly unknown[])[];
        result.push(
          `FILTER(${
            alternatives
              .map((alternative) =>
                isPredicate(alternative)
                  ? predicate(alternative, bindings, domains)
                  : alternative[0] === "not"
                    ? `NOT EXISTS { ${clauses(alternative.slice(1).filter(Boolean) as readonly (readonly unknown[])[], new Map(bindings), domains)} }`
                    : (() => {
                        const localJoins: string[] = [];
                        const source = pattern(alternative, new Map(bindings), localJoins);
                        return `EXISTS { ${source} ${localJoins.map((condition) => `FILTER(${condition})`).join(" ")} }`;
                      })(),
              )
              .join(" || ") || "false"
          })`,
        );
      }
    }
    return result.join("\n");
  };
  const baseWhere = clauses(query.where, env);
  const whereParts = [baseWhere];
  const checks: { label: string; sparql: string }[] = [];
  if (options.sourcePlan === "persisted")
    checks.push({
      label: "persisted scalar channels are missing; explicit migration is required",
      sparql: `SELECT ?s WHERE { GRAPH ${graphIri(scopeKey)} { ?s ${fieldIri("id")} ?id . FILTER NOT EXISTS { ?s ${fieldIri("scalar_family")} ?family ; ${fieldIri("scalar_lexical")} ?lexical ; ${fieldIri("scalar_order")} ?order } } } LIMIT 1`,
    });
  if (query.optionalProjection) {
    const row = env.get(query.optionalProjection.rowBinding)!;
    if (row.family !== '"string"' || !/^\?[A-Za-z_][A-Za-z0-9_]*$/.test(row.lexical))
      unsupported(query, "optionalProjection currently requires an identity row binding");
    for (const field of query.optionalProjection.fields) {
      const local = new Map(env);
      const joins: string[] = [];
      const source = pattern(
        [query.optionalProjection.rowBinding, field.attribute, field.variable],
        local,
        joins,
      );
      const joinFilters = joins.map((condition) => `FILTER(${condition})`).join("\n");
      const value = local.get(field.variable)!;
      whereParts.push(`OPTIONAL { ${source} ${joinFilters} }`);
      checks.push({
        label: `optional projection ${field.variable} must have one scalar value`,
        sparql: `SELECT ${row.lexical} WHERE { ${baseWhere} ${source} ${joinFilters} } GROUP BY ${row.lexical} HAVING(COUNT(DISTINCT CONCAT(${value.family}, ":", ${value.lexical})) > 1) LIMIT 1`,
      });
      env.set(field.variable, value);
    }
  }
  const where = whereParts.join("\n");
  const aggregateTargets = new Map<
    string,
    { binding: Binding; kind: Output["kind"]; present?: string }
  >();
  for (const [op, source, target] of query.aggregate ?? []) {
    const binding = env.get(source) ?? unsupported(query, `aggregate source ${source} is unbound`);
    const domain = options.numericDomains?.get(source) ?? "number";
    if (op !== "count") numericUsed.add(source);
    let result!: Binding;
    let kind: Output["kind"] = "scalar";
    if (op === "count")
      result = {
        family: '"number"',
        lexical: `STR(COUNT(DISTINCT CONCAT(${binding.family}, ":", ${binding.lexical})))`,
        order: `COUNT(DISTINCT CONCAT(${binding.family}, ":", ${binding.lexical}))`,
        nativeOrder: true,
      };
    else if (op === "min" || op === "max") {
      const expr = `${op.toUpperCase()}(IF(${binding.family} = ${literal(domain)}, ${binding.order}, ${literal(op === "min" ? "ffffffffffffffff" : "0000000000000000")}))`;
      result = { family: literal(domain), lexical: expr, order: expr };
      kind = "order";
    } else if (op === "sum" || op === "avg") {
      sumUsed.add(source);
      if (domain === "integer") {
        if (op === "avg")
          unsupported(query, "exact integer AVG requires an explicit conversion to number");
        if (!binding.hi || !binding.lo)
          unsupported(query, "exact integer SUM requires assertion payload channels");
        result = {
          family: '"integer"',
          lexical: '""',
          order: '""',
          hi: `SUM(${binding.hi})`,
          lo: `SUM(${binding.lo})`,
          integerSum: true,
        };
        kind = "integer-sum";
      } else {
        result = {
          family: '"number"',
          lexical: `STR(SUM(${binding.native ?? "0"}))`,
          order: `SUM(${binding.native ?? "0"})`,
          nativeOrder: true,
        };
        if (op === "avg") {
          result.average = true;
          result.lo = `COUNT(${binding.native ?? "0"})`;
          kind = "average";
        }
      }
    } else unsupported(query, "AVG is not yet qualified for native reduced precision");
    aggregateTargets.set(target, {
      binding: result,
      kind,
      ...(op === "count" ? {} : { present: `SUM(IF(${binding.family} = ${literal(domain)},1,0))` }),
    });
  }
  const outputs: Output[] = [];
  const projections: string[] = [];
  const groups: string[] = [];
  const groupBinds: string[] = [];
  const groupKeyBindings = new Map<string, Binding>();
  const resultBindings = new Map<string, Binding>();
  const hasAggregation = Boolean(query.aggregate?.length);
  for (const [index, find] of query.find.entries()) {
    const aggregate = variable(find) ? aggregateTargets.get(find) : undefined;
    let binding = aggregate?.binding ?? term(find, env);
    if (hasAggregation && !aggregate) {
      const grouped = {
        family: `?g${index}_type`,
        lexical: `?g${index}_value`,
        order: `?g${index}_order`,
      };
      for (const column of ["family", "lexical", "order"] as const) {
        groupBinds.push(`BIND(${binding[column]} AS ${grouped[column]})`);
        groups.push(grouped[column]);
      }
      binding = grouped;
      if (variable(find)) groupKeyBindings.set(find, grouped);
    }
    const output: Output = {
      variable: variable(find) ? find : String(find),
      type: `v${index}_type`,
      value: `v${index}_value`,
      order: `v${index}_order`,
      kind: aggregate?.kind ?? "scalar",
      ...(query.aggregate?.some(([op, , target]) => op === "count" && target === find)
        ? { count: true }
        : {}),
      ...(aggregate?.kind === "integer-sum"
        ? { hi: `v${index}_hi`, lo: `v${index}_lo` }
        : aggregate?.kind === "average"
          ? { lo: `v${index}_denominator` }
          : {}),
      ...(aggregate?.present ? { present: `v${index}_present` } : {}),
    };
    projections.push(
      `(${binding.family} AS ?${output.type})`,
      `(${binding.lexical} AS ?${output.value})`,
      `(${binding.order} AS ?${output.order})`,
    );
    if (output.hi && output.lo)
      projections.push(`(${binding.hi} AS ?${output.hi})`, `(${binding.lo} AS ?${output.lo})`);
    else if (output.lo) projections.push(`(${binding.lo} AS ?${output.lo})`);
    if (output.present) projections.push(`(${aggregate!.present} AS ?${output.present})`);
    outputs.push(output);
    if (variable(find))
      resultBindings.set(find, {
        family: `?${output.type}`,
        lexical: `?${output.value}`,
        order: `?${output.order}`,
        ...(binding.nativeOrder ? { nativeOrder: true } : {}),
        ...(binding.integerSum ? { integerSum: true } : {}),
        ...(binding.average ? { average: true } : {}),
      });
  }
  const groupedBindings = new Map(env);
  for (const [name, binding] of groupKeyBindings) groupedBindings.set(name, binding);
  for (const [name, result] of aggregateTargets) groupedBindings.set(name, result.binding);
  const having = (query.having ?? []).map((clause) => predicate(clause, groupedBindings));
  const querySort = (
    spec:
      | readonly { readonly variable: string; readonly direction?: string | undefined }[]
      | undefined,
    bindings: Map<string, Binding>,
    aggregate = false,
  ) =>
    (spec ?? []).flatMap(({ variable: name, direction }) => {
      if (aggregate && ["integer-sum", "average"].includes(aggregateTargets.get(name)?.kind ?? ""))
        unsupported(
          query,
          "ordering exact integer SUM or decoded AVG requires a server result key",
        );
      const b = bindings.get(name) ?? unsupported(query, `sort ${name} is unbound`);
      return b.nativeOrder
        ? [`${direction === "desc" ? "DESC" : "ASC"}(${b.order})`]
        : [
            `ASC(${category(b)})`,
            `${direction === "desc" ? "DESC" : "ASC"}(COALESCE(${b.order},""))`,
          ];
    });
  const innerOrder = querySort(
    query.orderBy,
    new Map([
      ...env,
      ...groupKeyBindings,
      ...[...aggregateTargets].map(([name, result]) => [name, result.binding] as const),
    ]),
    true,
  );
  const cap = options.maxResultRows ?? 100_000;
  let sparql = `SELECT DISTINCT ${projections.join(" ")} WHERE {\n${where}\n${groupBinds.join("\n")}\n}${groups.length ? ` GROUP BY ${groups.join(" ")}` : ""}${having.length ? ` HAVING (${having.join(" && ")})` : ""}${innerOrder.length ? ` ORDER BY ${innerOrder.join(" ")}` : ""}${options.unboundedIntermediate ? "" : wrapped ? (query.limit === undefined ? "" : ` LIMIT ${query.limit}`) : ` LIMIT ${Math.min(query.limit ?? cap + 1, cap + 1)}`}${query.offset ? ` OFFSET ${query.offset}` : ""}`;
  const domainEnv = new Map<string, Binding>();
  const domainWhere = numericUsed.size ? clauses(query.where, domainEnv, true) : "";
  const domains = [...numericUsed]
    .filter((name) => domainEnv.has(name) && sumUsed.has(name))
    .map((name) => {
      const b = domainEnv.get(name)!;
      const sum = sumUsed.has(name);
      return {
        variable: name,
        sum,
        sparql: `SELECT (?domain_family AS ?family) (COUNT(*) AS ?total) (MAX(ABS(COALESCE(${b.native ?? "0"},0))) AS ?max_abs) (SUM(IF(?domain_family = "number" && (${b.exact ?? '"false"'} != "true" || !REGEX(${b.lexical}, "^-?[0-9]+$")),1,0)) AS ?invalid) WHERE { ${domainWhere} BIND(${b.family} AS ?domain_family) } GROUP BY ?domain_family`,
      };
    });
  let countSparql: string | undefined;
  const familyBindings = [...numericUsed]
    .filter((name) => domainEnv.has(name) && !sumUsed.has(name))
    .map((variable) => ({ variable, family: domainEnv.get(variable)!.family }));
  const familyDomain = familyBindings.length
    ? (options.domainPlan === "mask" ? compileFamilyDomainMask : compileFamilyDomainDistinct)({
        where: domainWhere,
        bindings: familyBindings,
        maxSummaryRows: options.maxResultRows ?? 1000,
      })
    : undefined;
  if (wrapped) {
    const filters: string[] = [];
    for (const filter of input.filters ?? []) {
      const b =
        resultBindings.get(filter.column) ??
        unsupported(input, `filter ${filter.column} is unbound`);
      if (filter.op === "is-null" || filter.op === "is-not-null")
        filters.push(`${filter.op === "is-null" ? "!" : ""}BOUND(${b.lexical})`);
      else if (["like", "not-like", "ilike", "not-ilike"].includes(filter.op)) {
        const pattern_ = String(filter.value)
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replaceAll("%", ".*")
          .replaceAll("_", ".");
        filters.push(
          `(${b.family} = "string" && ${filter.op.startsWith("not-") ? "!" : ""}REGEX(${b.lexical}, ${literal(`^${pattern_}$`)}, ${literal(filter.op.includes("ilike") ? "i" : "")}))`,
        );
      } else if (filter.op === "!=") {
        if (b.integerSum || b.average)
          unsupported(input, "decoded aggregate filters require a server result key");
        const value = fixed(filter.value);
        filters.push(`(${b.family} = ${value.family} && ${b.lexical} != ${value.lexical})`);
      } else filters.push(predicate([filter.op, filter.column, filter.value], resultBindings));
    }
    const filtered = `{ ${sparql} }${filters.map((condition) => `\nFILTER(${condition})`).join("")}`;
    if (input.includeCount) countSparql = `SELECT (COUNT(*) AS ?total) WHERE { ${filtered} }`;
    const orderBy = input.orderBy?.length
      ? input.orderBy
      : query.find.filter(variable).map((name) => ({ variable: name, direction: "asc" as const }));
    const order = querySort(orderBy, resultBindings, true);
    const cursor = options.cursorValues;
    const cursorComponent = (name: string, index: number) => {
      const b = resultBindings.get(name)!;
      const value = cursor?.[index] ?? null;
      if (b.nativeOrder) {
        if (typeof value !== "number" || !Number.isSafeInteger(value))
          unsupported(input, "numeric aggregate cursors require safe integer values");
        return {
          equal: `${b.order} = ${String(value)}`,
          beyond: (direction?: string) =>
            `${b.order} ${direction === "desc" ? "<" : ">"} ${String(value)}`,
        };
      }
      const key = constantSortKey(value);
      const c = literal(key.slice(0, 1));
      const raw = literal(key.slice(2));
      const orderExpression = `COALESCE(${b.order},"")`;
      return {
        equal: `(${category(b)} = ${c} && ${orderExpression} = ${raw})`,
        beyond: (direction?: string) =>
          `(${category(b)} > ${c} || (${category(b)} = ${c} && ${orderExpression} ${direction === "desc" ? "<" : ">"} ${raw}))`,
      };
    };
    const cursorFilter = cursor
      ? `\nFILTER(${
          orderBy
            .map((spec, index) => {
              const before = orderBy.slice(0, index).map((previous, i) => {
                const c = cursorComponent(previous.variable, i);
                return c.equal;
              });
              const c = cursorComponent(spec.variable, index);
              return `(${[...before, c.beyond(spec.direction)].join(" && ")})`;
            })
            .join(" || ") || "false"
        })`
      : "";
    sparql = `SELECT * WHERE { ${filtered}${cursorFilter} }${order.length ? ` ORDER BY ${order.join(" ")}` : ""} LIMIT ${Math.min(input.limit ?? cap + 1, cap + 1)}`;
  }
  return {
    sparql,
    ...(countSparql ? { countSparql } : {}),
    outputs,
    domains,
    ...(familyDomain ? { familyDomain } : {}),
    checks,
    decode: (row) => {
      const result: Record<string, QueryContext[string]> = {};
      for (const output of outputs) {
        const family = row[output.type]?.value;
        const raw = row[output.value]?.value;
        if (output.present && Number(row[output.present]?.value ?? 0) === 0)
          result[output.variable] = null;
        else if (output.kind === "average") {
          const denominator = Number(row[output.lo!]?.value ?? 0);
          result[output.variable] = denominator === 0 ? null : Number(raw) / denominator;
        } else if (output.kind === "integer-sum") {
          const hi = row[output.hi!]?.value;
          const lo = row[output.lo!]?.value;
          result[output.variable] =
            hi === undefined || lo === undefined
              ? null
              : integer((BigInt(hi) * (1n << 32n) + BigInt(lo)).toString());
        } else if (raw === undefined) result[output.variable] = null;
        else if (output.kind === "order")
          result[output.variable] =
            family === "integer"
              ? integer((BigInt(`0x${raw}`) - (1n << 63n)).toString())
              : numericFromOrderKey(raw);
        else if (family === "integer") result[output.variable] = integer(raw);
        else if (family === "number") {
          const n = Number(raw);
          if (!Number.isFinite(n) || (output.count && !Number.isSafeInteger(n)))
            throw new TypeError("Unrepresentable QLever number");
          result[output.variable] = n;
        } else if (family === "boolean") result[output.variable] = raw === "1";
        else result[output.variable] = raw;
      }
      return result;
    },
  };
};
