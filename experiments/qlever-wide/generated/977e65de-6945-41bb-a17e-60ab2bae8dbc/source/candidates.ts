/** Source-only competing emitters. Importing this file performs no I/O. */
import { integer } from "../../packages/core/dist/index.js";
import { assertDatalogQuery, type QueryContext } from "../../packages/core/dist/runtime/index.js";
import type { DatalogQuery } from "../../packages/core/dist/datalog/index.js";
import type { SparqlBinding } from "../../packages/qlever/src/QleverClient.js";
import {
  fieldIri as f,
  graphIri,
  integerOrderKey,
  literal,
  numericOrderKey,
} from "../../packages/qlever/src/rdf.js";

export type Strategy = "projected" | "persisted";
type Scalar = { family: string; lexical: string; order: string };
export type CandidateBasis = { validAt: number; recordedAt?: number; recordedPosition: number };
export interface CandidateQuery {
  strategy: Strategy;
  query: DatalogQuery;
  scope: string;
  basis: CandidateBasis;
  sparql: string;
  domainSparql?: string;
  layoutGuardSparql?: string;
  patternCount: number;
  decode(row: SparqlBinding): QueryContext;
}
const isVariable = (term: unknown): term is string =>
  typeof term === "string" && term.startsWith("?");
const isPredicate = (clause: readonly unknown[]) =>
  ["=", "!=", ">", ">=", "<", "<="].includes(String(clause[0]));
const scalar = (term: unknown): Scalar => {
  if (typeof term === "number")
    return {
      family: "number",
      lexical: term === 0 ? "0" : String(term),
      order: numericOrderKey(term),
    };
  if (typeof term === "boolean")
    return { family: "boolean", lexical: term ? "1" : "0", order: term ? "1" : "0" };
  if (
    typeof term === "object" &&
    term !== null &&
    "type" in term &&
    term.type === "integer" &&
    "value" in term
  ) {
    const value = integer(String(term.value)).value;
    return { family: "integer", lexical: value, order: integerOrderKey(value) };
  }
  const text =
    typeof term === "object" && term !== null && "value" in term
      ? String(term.value)
      : String(term);
  return { family: "string", lexical: text, order: text };
};
const constant = (term: unknown): Scalar => {
  const s = scalar(term);
  return { family: literal(s.family), lexical: literal(s.lexical), order: literal(s.order) };
};
const shared = (name: string): Scalar => ({
  family: `?q_${name.slice(1)}_type`,
  lexical: `?q_${name.slice(1)}_value`,
  order: `?q_${name.slice(1)}_order`,
});

/** Same validated frontend, deliberately restricted experiment surface. */
export const compileWideCandidate = (
  input: DatalogQuery,
  scope: string,
  basis: CandidateBasis,
  strategy: Strategy,
): CandidateQuery => {
  const query = assertDatalogQuery(input);
  if (
    query.rules?.length ||
    query.compute?.length ||
    query.aggregate?.length ||
    query.optionalProjection ||
    query.orderBy?.length ||
    query.where.some((clause) => clause[0] === "not" || clause[0] === "or")
  )
    throw new TypeError("Wide experiment supports positive patterns and comparisons only");
  const graph = graphIri(scope);
  const patterns = query.where.filter((clause) => !isPredicate(clause));
  const predicates = query.where.filter(isPredicate);
  const identities = new Set<string>();
  const values = new Set<string>();
  for (const p of patterns) {
    for (const index of [0, 1, 3]) if (isVariable(p[index])) identities.add(p[index] as string);
    if (isVariable(p[2])) values.add(p[2]);
    const variables = p.filter(isVariable);
    if (new Set(variables).size !== variables.length)
      throw new TypeError("Repeated variables inside one pattern are outside this experiment");
  }
  const known = new Map<string, unknown>();
  for (const [, left, right] of predicates.filter((p) => p[0] === "=")) {
    if (isVariable(left) && !isVariable(right)) known.set(left, right);
    else if (isVariable(right) && !isVariable(left)) known.set(right, left);
  }
  const binding = (term: unknown): Scalar =>
    isVariable(term)
      ? known.has(term)
        ? constant(known.get(term))
        : shared(term)
      : constant(term);
  const equal = (a: Scalar, b: Scalar) =>
    `(${a.family} = ${b.family} && ${a.lexical} = ${b.lexical})`;
  const filter = (clause: readonly unknown[]): string => {
    const [op, left, right] = clause;
    const a = binding(left);
    const b = binding(right);
    return op === "=" || op === "!="
      ? `${op === "!=" ? "!" : ""}${equal(a, b)}`
      : `(${a.family} IN ("number","integer") && ${a.family} = ${b.family} && ${a.order} ${op} ${b.order})`;
  };
  const temporal = (prefix: string) => {
    const v = (column: string) => `?${prefix}_${column}`;
    const triples = `?${prefix} ${f("valid_from_order")} ${v("vf")} ; ${f("recorded_position_order")} ${v("rp")} . ${basis.recordedAt === undefined ? "" : `?${prefix} ${f("recorded_at_order")} ${v("ra")} .`}
OPTIONAL { ?${prefix} ${f("valid_to_order")} ${v("vt")} }
OPTIONAL { ?${prefix} ${f("retracted_position_order")} ${v("xp")} }
${basis.recordedAt === undefined ? "" : `OPTIONAL { ?${prefix} ${f("retracted_at_order")} ${v("xa")} }`}`;
    const conditions = [
      `${v("vf")} <= ${literal(numericOrderKey(basis.validAt))}`,
      `(!BOUND(${v("vt")}) || ${v("vt")} > ${literal(numericOrderKey(basis.validAt))})`,
      `${v("rp")} <= ${literal(numericOrderKey(basis.recordedPosition))}`,
      `(!BOUND(${v("xp")}) || ${v("xp")} > ${literal(numericOrderKey(basis.recordedPosition))}${basis.recordedAt === undefined ? "" : ` || ${v("xa")} > ${literal(numericOrderKey(basis.recordedAt))}`})`,
      ...(basis.recordedAt === undefined
        ? []
        : [`${v("ra")} <= ${literal(numericOrderKey(basis.recordedAt))}`]),
    ];
    return { triples, conditions };
  };
  const nativeBodies: string[] = [];
  const outerConditions: string[] = [];
  for (const [index, p] of patterns.entries()) {
    const prefix = `w${index}`;
    const subject = `?${prefix}`;
    const time = temporal(prefix);
    const body: string[] = [time.triples];
    const localConditions = [...time.conditions];
    const projection = new Map<string, string>();
    for (const [position, field] of [
      [0, "entity_id"],
      [1, "attribute"],
      [3, "tx_id"],
    ] as const) {
      const term = p[position];
      if (term === undefined) continue;
      if (isVariable(term) && !known.has(term)) {
        const b = shared(term);
        body.push(`${subject} ${f(field)} ${b.lexical} .`);
        if (strategy === "projected") {
          projection.set(b.lexical, b.lexical);
          projection.set(b.family, `("string" AS ${b.family})`);
          projection.set(b.order, `(${b.lexical} AS ${b.order})`);
        } else if (values.has(term)) outerConditions.push(`${b.family} = "string"`);
      } else {
        const s = scalar(isVariable(term) ? known.get(term) : term);
        if (s.family !== "string")
          throw new TypeError("An identity constant must belong to the string family");
        body.push(`${subject} ${f(field)} ${literal(s.lexical)} .`);
      }
    }
    const value = p[2];
    if (strategy === "persisted") {
      const b = binding(value);
      body.push(
        `${subject} ${f("scalar_family")} ${b.family} ; ${f("scalar_lexical")} ${b.lexical} ; ${f("scalar_order")} ${b.order} .`,
      );
    } else {
      const type = `?${prefix}_storage_type`;
      const payload = `?${prefix}_payload`;
      const payloadProperty = `?${prefix}_payload_property`;
      const numberOrder = `?${prefix}_number_order`;
      const datetimeOrder = `?${prefix}_datetime_order`;
      const integerOrder = `?${prefix}_integer_order`;
      body.push(`${subject} ${f("value_type")} ${type} ; ${payloadProperty} ${payload} .`);
      localConditions.push(
        `((${type} IN ("string","ref","integer","blob") && ${payloadProperty} = ${f("value_string")}) || (${type} = "number" && ${payloadProperty} = ${f("value_number")}) || (${type} = "datetime" && ${payloadProperty} = ${f("value_datetime")}) || (${type} = "boolean" && ${payloadProperty} = ${f("value_boolean")}) || (${type} = "json" && ${payloadProperty} = ${f("value_json")}))`,
      );
      body.push(
        `OPTIONAL { ${subject} ${f("value_number_order")} ${numberOrder} . }`,
        `OPTIONAL { ${subject} ${f("value_datetime_order")} ${datetimeOrder} . }`,
        `OPTIONAL { ${subject} ${f("value_integer_order")} ${integerOrder} . }`,
      );
      const family = `IF(${type} IN ("number","datetime"),"number",IF(${type}="integer","integer",IF(${type}="boolean","boolean","string")))`;
      const lexical = `IF(${type} IN ("number","datetime") && ${payload}="-0","0",${payload})`;
      const scalarOrder = `IF(${type} IN ("number","datetime","integer"),COALESCE(${numberOrder},${datetimeOrder},${integerOrder}),${lexical})`;
      if (isVariable(value) && !known.has(value)) {
        const b = shared(value);
        projection.set(b.family, `(${family} AS ${b.family})`);
        projection.set(b.lexical, `(${lexical} AS ${b.lexical})`);
        projection.set(b.order, `(${scalarOrder} AS ${b.order})`);
      } else localConditions.push(equal({ family, lexical, order: scalarOrder }, binding(value)));
    }
    const effectiveValue = value;
    if (
      typeof effectiveValue === "object" &&
      effectiveValue !== null &&
      "type" in effectiveValue &&
      effectiveValue.type === "ref"
    )
      body.push(`${subject} ${f("value_type")} "ref" .`);
    if (strategy === "projected")
      nativeBodies.push(
        `{ SELECT ${[...projection.values()].join(" ") || `(1 AS ?${prefix}_exists)`} WHERE { GRAPH ${graph} { ${body.join("\n")} FILTER(${localConditions.join(" && ")}) } } }`,
      );
    else {
      nativeBodies.push(body.join("\n"));
      outerConditions.push(...localConditions);
    }
  }
  if (strategy === "persisted")
    for (const name of identities)
      if (!values.has(name) && !known.has(name)) {
        const b = shared(name);
        nativeBodies.push(`BIND("string" AS ${b.family}) BIND(${b.lexical} AS ${b.order})`);
      }
  const source =
    strategy === "persisted"
      ? `GRAPH ${graph} { ${nativeBodies.join("\n")} }`
      : nativeBodies.join("\n");
  const where = (omitOrdered: boolean) =>
    `${source}\n${outerConditions.map((condition) => `FILTER(${condition})`).join("\n")}\n${predicates
      .filter((p) => !omitOrdered || p[0] === "=" || p[0] === "!=")
      .map((p) => `FILTER(${filter(p)})`)
      .join("\n")}`;
  const projections = query.find.map((term, index) => {
    const b = binding(term);
    return [
      `(${b.family} AS ?v${index}_type)`,
      `(${b.lexical} AS ?v${index}_value)`,
      `(${b.order} AS ?v${index}_order)`,
    ].join(" ");
  });
  const numericVariables = [
    ...new Set(
      predicates
        .filter((p) => p[0] !== "=" && p[0] !== "!=")
        .flatMap((p) => p.slice(1).filter(isVariable)),
    ),
  ];
  return {
    strategy,
    query,
    scope,
    basis,
    patternCount: patterns.length,
    sparql: `SELECT DISTINCT ${projections.join(" ")} WHERE { ${where(false)} } LIMIT 1001`,
    ...(numericVariables.length
      ? {
          domainSparql: `SELECT DISTINCT ${numericVariables.map((name, index) => `(${binding(name).family} AS ?domain${index})`).join(" ")} WHERE { ${where(true)} } LIMIT 1001`,
        }
      : {}),
    ...(strategy === "persisted"
      ? {
          layoutGuardSparql: `SELECT ?s WHERE { GRAPH ${graph} { ?s ${f("id")} ?id FILTER NOT EXISTS { ?s ${f("scalar_family")} ?family ; ${f("scalar_lexical")} ?lexical ; ${f("scalar_order")} ?order } } } LIMIT 1`,
        }
      : {}),
    decode: (row) =>
      Object.fromEntries(
        query.find.map((term, index) => {
          const type = row[`v${index}_type`]?.value;
          const text = row[`v${index}_value`]?.value;
          const value: QueryContext[string] =
            text === undefined
              ? null
              : type === "integer"
                ? integer(text)
                : type === "number"
                  ? Number(text)
                  : type === "boolean"
                    ? text === "1"
                    : text;
          if (typeof value === "number" && !Number.isFinite(value))
            throw new TypeError("Candidate returned nonfinite number");
          return [isVariable(term) ? term : String(term), value];
        }),
      ),
  };
};
