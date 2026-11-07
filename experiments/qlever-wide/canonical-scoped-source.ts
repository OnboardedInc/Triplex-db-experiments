/** Candidate B2: scoped canonical projections with local temporal filtering. */
import { integer } from "../../packages/core/dist/index.js";
import { assertDatalogQuery, type QueryContext } from "../../packages/core/dist/runtime/index.js";
import type { DatalogQuery } from "../../packages/core/dist/datalog/index.js";
import type { SparqlBinding } from "../../packages/qlever/src/QleverClient.js";
import {
  fieldIri as field,
  graphIri,
  integerOrderKey,
  literal,
  numericOrderKey,
} from "../../packages/qlever/src/rdf.js";
import type { CandidateBasis, CandidateQuery } from "./candidates.js";

type Scalar = { family: string; lexical: string; order: string };
const variable = (input: unknown): input is string =>
  typeof input === "string" && input.startsWith("?");
const predicate = (clause: readonly unknown[]) =>
  ["=", "!=", ">", ">=", "<", "<="].includes(String(clause[0]));
const scalar = (input: unknown): Scalar => {
  if (typeof input === "number")
    return {
      family: "number",
      lexical: input === 0 ? "0" : String(input),
      order: numericOrderKey(input),
    };
  if (typeof input === "boolean")
    return { family: "boolean", lexical: input ? "1" : "0", order: input ? "1" : "0" };
  if (
    typeof input === "object" &&
    input !== null &&
    "type" in input &&
    input.type === "integer" &&
    "value" in input
  ) {
    const value = integer(String(input.value)).value;
    return { family: "integer", lexical: value, order: integerOrderKey(value) };
  }
  const text =
    typeof input === "object" && input !== null && "value" in input
      ? String(input.value)
      : String(input);
  return { family: "string", lexical: text, order: text };
};
const quoted = (input: unknown): Scalar => {
  const value = scalar(input);
  return {
    family: literal(value.family),
    lexical: literal(value.lexical),
    order: literal(value.order),
  };
};
const equality = (a: Scalar, b: Scalar) =>
  `(${a.family} = ${b.family} && ${a.lexical} = ${b.lexical})`;

export const compilePersistedScopedCandidate = (
  input: DatalogQuery,
  scope: string,
  basis: CandidateBasis,
): CandidateQuery => {
  const query = assertDatalogQuery(input);
  if (
    query.rules?.length ||
    query.compute?.length ||
    query.aggregate?.length ||
    query.having?.length ||
    query.optionalProjection ||
    query.orderBy?.length ||
    query.limit !== undefined ||
    query.offset !== undefined ||
    query.where.some((clause) => clause[0] === "not" || clause[0] === "or")
  )
    throw new TypeError(
      "Persisted-channel experiment supports complete positive patterns and comparisons only",
    );
  if (
    !Number.isFinite(basis.validAt) ||
    basis.validAt < 0 ||
    !Number.isSafeInteger(basis.recordedPosition) ||
    basis.recordedPosition < 0 ||
    (basis.recordedAt !== undefined && (!Number.isFinite(basis.recordedAt) || basis.recordedAt < 0))
  )
    throw new RangeError("Invalid candidate temporal source cut");
  const patterns = query.where.filter((clause) => !predicate(clause));
  const predicates = query.where.filter(predicate);
  const parent = new Map<string, string>();
  const root = (name: string): string => {
    const previous = parent.get(name);
    if (previous === undefined) {
      parent.set(name, name);
      return name;
    }
    if (previous === name) return name;
    const result = root(previous);
    parent.set(name, result);
    return result;
  };
  for (const clause of patterns) for (const term of clause) if (variable(term)) root(term);
  for (const [op, left, right] of predicates)
    if (op === "=" && variable(left) && variable(right)) parent.set(root(right), root(left));
  const identities = new Set<string>();
  for (const clause of patterns)
    for (const index of [0, 1, 3])
      if (variable(clause[index])) identities.add(root(clause[index] as string));
  const known = new Map<string, unknown>();
  let contradictory = false;
  const remember = (name: string, value: unknown) => {
    const key = root(name),
      normalized = scalar(value),
      previous = known.get(key);
    if (known.has(key)) {
      const old = scalar(previous);
      if (old.family !== normalized.family || old.lexical !== normalized.lexical)
        contradictory = true;
    } else known.set(key, value);
    if (identities.has(key) && normalized.family !== "string") contradictory = true;
  };
  for (const [op, left, right] of predicates) {
    if (op !== "=") continue;
    if (variable(left) && !variable(right)) remember(left, right);
    if (variable(right) && !variable(left)) remember(right, left);
  }
  const names = new Map<string, number>();
  const binding = (term: unknown): Scalar => {
    if (!variable(term)) return quoted(term);
    const key = root(term);
    if (known.has(key)) return quoted(known.get(key));
    if (!names.has(key)) names.set(key, names.size);
    const index = names.get(key)!;
    if (identities.has(key))
      return { family: '"string"', lexical: `?b${index}_value`, order: `?b${index}_value` };
    return { family: `?b${index}_type`, lexical: `?b${index}_value`, order: `?b${index}_order` };
  };
  const graph = graphIri(scope),
    scopedBodies: string[] = [];
  const instant = literal(numericOrderKey(basis.validAt)),
    source = literal(numericOrderKey(basis.recordedPosition));
  for (const [index, clause] of patterns.entries()) {
    const subject = `?assertion${index}`,
      bodies: string[] = [];
    for (const [position, column] of [
      [0, "entity_id"],
      [1, "attribute"],
      [3, "tx_id"],
    ] as const) {
      const term = clause[position];
      if (term === undefined) continue;
      bodies.push(`${subject} ${field(column)} ${binding(term).lexical} .`);
    }
    const value = binding(clause[2]);
    bodies.push(
      `${subject} ${field("scalar_family")} ${value.family} ; ${field("scalar_lexical")} ${value.lexical} ; ${field("scalar_order")} ${value.order} .`,
    );
    // Typed refs in pattern syntax are exact. An equality-propagated ref remains
    // scalar equality, matching the frontend's string/ref equality contract.
    if (
      typeof clause[2] === "object" &&
      clause[2] !== null &&
      "type" in clause[2] &&
      clause[2].type === "ref"
    )
      bodies.push(`${subject} ${field("value_type")} "ref" .`);
    const from = `?validFrom${index}`,
      recorded = `?recorded${index}`;
    bodies.push(
      `${subject} ${field("valid_from_order")} ${from} ; ${field("recorded_position_order")} ${recorded} .`,
    );
    bodies.push(`FILTER(${from} <= ${instant} && ${recorded} <= ${source})`);
    if (basis.recordedAt !== undefined) {
      const recordedTime = `?recordedTime${index}`;
      bodies.push(
        `${subject} ${field("recorded_at_order")} ${recordedTime} . FILTER(${recordedTime} <= ${literal(numericOrderKey(basis.recordedAt))})`,
      );
    }
    // Project one locally filtered assertion relation before joining patterns.
    // Only the temporal end/tombstone channels are nullable; payload channels
    // are persisted and mandatory. There is no cross-pattern anti-join.
    bodies.push(`OPTIONAL { ${subject} ${field("valid_to_order")} ?validTo${index} . }`);
    bodies.push(
      `OPTIONAL { ${subject} ${field("retracted_position_order")} ?retracted${index} . ${basis.recordedAt === undefined ? "" : `${subject} ${field("retracted_at_order")} ?retractedTime${index} .`} }`,
    );
    bodies.push(`FILTER(!BOUND(?validTo${index}) || ?validTo${index} > ${instant})`);
    bodies.push(
      `FILTER(!BOUND(?retracted${index}) || ?retracted${index} > ${source}${basis.recordedAt === undefined ? "" : ` || ?retractedTime${index} > ${literal(numericOrderKey(basis.recordedAt))}`})`,
    );
    // Retain assertion identity and the leaf bag; a future aggregate strategy
    // must not collapse separate assertions that share one public scalar.
    const projected = new Set<string>([subject]);
    for (const term of clause)
      if (variable(term)) {
        const value = binding(term);
        for (const token of [value.family, value.lexical, value.order])
          if (token.startsWith("?")) projected.add(token);
      }
    scopedBodies.push(
      `{ SELECT ${[...projected].join(" ") || `(1 AS ?exists${index})`} WHERE { GRAPH ${graph} {\n${bodies.join("\n")}\n} } }`,
    );
  }
  const filter = (clause: readonly unknown[]) => {
    const [op, left, right] = clause,
      a = binding(left),
      b = binding(right);
    return op === "=" || op === "!="
      ? `${op === "!=" ? "!" : ""}${equality(a, b)}`
      : `(${a.family} IN ("number","integer") && ${a.family} = ${b.family} && ${a.order} ${String(op)} ${b.order})`;
  };
  const where = (omitOrdered: boolean) =>
    contradictory
      ? "FILTER(false)"
      : `${scopedBodies.join("\n")}\n${predicates
          .filter((clause) => !omitOrdered || clause[0] === "=" || clause[0] === "!=")
          .map((clause) => `FILTER(${filter(clause)})`)
          .join("\n")}`;
  const projection = query.find
    .map((term, index) => {
      const value = binding(term);
      return `(${value.family} AS ?v${index}_type) (${value.lexical} AS ?v${index}_value) (${value.order} AS ?v${index}_order)`;
    })
    .join(" ");
  const ordered = [
    ...new Set(
      predicates
        .filter((clause) => clause[0] !== "=" && clause[0] !== "!=")
        .flatMap((clause) => clause.slice(1).filter(variable)),
    ),
  ];
  return {
    strategy: "persisted",
    query,
    scope,
    basis,
    patternCount: patterns.length,
    sparql: `SELECT DISTINCT ${projection} WHERE { ${where(false)} } LIMIT 1001`,
    ...(ordered.length
      ? {
          domainSparql: `SELECT DISTINCT ${ordered.map((name, index) => `(${binding(name).family} AS ?domain${index})`).join(" ")} WHERE { ${where(true)} } LIMIT 1001`,
        }
      : {}),
    layoutGuardSparql: `SELECT ?s WHERE { GRAPH ${graph} { ?s ${field("id")} ?id . FILTER NOT EXISTS { ?s ${field("scalar_family")} ?family ; ${field("scalar_lexical")} ?lexical ; ${field("scalar_order")} ?order } } } LIMIT 1`,
    decode: (row: SparqlBinding): QueryContext =>
      Object.fromEntries(
        query.find.map((term, index) => {
          const family = row[`v${index}_type`]?.value,
            text = row[`v${index}_value`]?.value;
          if (text === undefined || !family)
            throw new TypeError("Persisted candidate returned an unbound required projection");
          const value =
            family === "integer"
              ? integer(text)
              : family === "number"
                ? Number(text)
                : family === "boolean"
                  ? text === "1"
                  : text;
          if (typeof value === "number" && !Number.isFinite(value))
            throw new TypeError("Persisted candidate returned a nonfinite number");
          if (family === "boolean" && text !== "0" && text !== "1")
            throw new TypeError("Persisted candidate returned an invalid boolean");
          return [variable(term) ? term : String(term), value];
        }),
      ),
  };
};
