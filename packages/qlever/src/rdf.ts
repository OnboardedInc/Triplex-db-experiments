import { integer, type TripleValue } from "@triplex-build/triplex";
import type { TripleRow } from "@triplex-build/triplex/runtime";

export const columns = [
  "id",
  "entity_id",
  "attribute",
  "value_type",
  "value_string",
  "value_number",
  "value_boolean",
  "value_datetime",
  "value_json",
  "recorded_at",
  "recorded_position",
  "valid_from",
  "valid_to",
  "created_by",
  "retracted_at",
  "retracted_position",
  "retract_tx_id",
  "entity_type",
  "schema_version",
  "tx_id",
] as const;
export const numericColumns = new Set<string>([
  "value_number",
  "value_boolean",
  "value_datetime",
  "recorded_at",
  "recorded_position",
  "valid_from",
  "valid_to",
  "retracted_at",
  "retracted_position",
  "schema_version",
]);
const wellFormed = (value: string): string => {
  if (!value.isWellFormed())
    throw new TypeError(
      "QLever text and identifiers require well-formed Unicode; isolated UTF-16 surrogates are not representable",
    );
  return value;
};
const encoded = (value: string) => Buffer.from(wellFormed(value)).toString("base64url");
export const graphIri = (scope: string) => `<urn:triplex:scope:${encoded(scope)}>`;
export const assertionIri = (id: string) => `<urn:triplex:assertion:${encoded(id)}>`;
export const claimIri = (id: string) => `<urn:triplex:claim:${encoded(id)}>`;
export const operationIri = (id: string) => `<urn:triplex:operation:${encoded(id)}>`;
export const fieldIri = (column: string) => `<urn:triplex:field:${column}>`;
export const metaIri = "<urn:triplex:meta>";
export const literal = (value: string) =>
  JSON.stringify(wellFormed(value))
    // QLever applies Unicode escapes before lexical backslash unescaping.
    // Escape the letter after a literal backslash so JSON's text `\ud800`
    // remains six ASCII characters rather than an invalid Unicode scalar.
    .replace(
      /\\\\([uU])/g,
      (_match, letter: string) => `\\\\\\u${letter === "u" ? "0075" : "0055"}`,
    )
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
export const numericLexical = (value: number) => (Object.is(value, -0) ? "-0" : String(value));
/** Order-preserving binary64 key; comparison never uses QLever's lossy numeric IDs. */
export const numericOrderKey = (value: number): string => {
  if (!Number.isFinite(value)) throw new TypeError("Nonfinite numeric key");
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value === 0 ? 0 : value);
  const bits = view.getBigUint64(0);
  return (bits & (1n << 63n) ? ~bits & ((1n << 64n) - 1n) : bits ^ (1n << 63n))
    .toString(16)
    .padStart(16, "0");
};
export const integerOrderKey = (value: string): string =>
  (BigInt(integer(value).value) + (1n << 63n)).toString(16).padStart(16, "0");
export const numericFromOrderKey = (key: string): number => {
  const keyBits = BigInt(`0x${key}`);
  const bits = keyBits & (1n << 63n) ? keyBits ^ (1n << 63n) : ~keyBits & ((1n << 64n) - 1n);
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
};
export const numericShadowIsExact = (value: number): boolean => {
  if (!Number.isFinite(value)) return false;
  if (Number.isInteger(value) && value >= -(2 ** 59) && value < 2 ** 59) return true;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  return (view.getUint32(4) & 15) === 0;
};
export const nativeNumeric = (value: number): string =>
  Number.isInteger(value) && value >= -(2 ** 59) && value < 2 ** 59
    ? numericLexical(value)
    : `${literal(numericLexical(value))}^^<http://www.w3.org/2001/XMLSchema#double>`;
export const canonicalJson = (value: unknown): string => {
  const seen = new Set<object>();
  const go = (input: unknown): string => {
    if (input === null || typeof input === "string" || typeof input === "boolean")
      return JSON.stringify(input);
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw new TypeError("JSON numbers must be finite");
      return JSON.stringify(input);
    }
    if (typeof input !== "object" || seen.has(input))
      throw new TypeError("Unsupported or cyclic JSON value");
    if (
      !Array.isArray(input) &&
      Object.getPrototypeOf(input) !== Object.prototype &&
      Object.getPrototypeOf(input) !== null
    )
      throw new TypeError("JSON objects must be plain records");
    seen.add(input);
    try {
      if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i++)
          if (!(i in input)) throw new TypeError("Sparse JSON arrays are unsupported");
        return `[${input.map(go).join(",")}]`;
      }
      if (Object.getOwnPropertySymbols(input).length)
        throw new TypeError("JSON symbol keys are unsupported");
      return `{${Object.keys(input)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${go((input as Record<string, unknown>)[key])}`)
        .join(",")}}`;
    } finally {
      seen.delete(input);
    }
  };
  return go(value);
};
export const packValue = (value: TripleValue) => {
  const row = {
    value_type: value.type,
    value_string: null as string | null,
    value_number: null as number | null,
    value_boolean: null as number | null,
    value_datetime: null as number | null,
    value_json: null as string | null,
  };
  switch (value.type) {
    case "string":
    case "ref":
      row.value_string = value.value;
      break;
    case "integer":
      if (integer(value.value).value !== value.value) throw new TypeError("Noncanonical integer");
      row.value_string = value.value;
      break;
    case "number":
    case "datetime":
      if (!Number.isFinite(value.value)) throw new TypeError("Numeric values must be finite");
      if (value.type === "number") row.value_number = value.value;
      else row.value_datetime = value.value;
      break;
    case "boolean":
      row.value_boolean = value.value ? 1 : 0;
      break;
    case "json":
      canonicalJson(value.value);
      row.value_json = JSON.stringify(value.value);
      break;
    case "blob":
      if (!Number.isSafeInteger(value.size) || value.size < 0)
        throw new TypeError("Unsafe blob size");
      row.value_string = value.value;
      row.value_json = canonicalJson({
        mimeType: value.mimeType,
        size: value.size,
        ...(value.filename === undefined ? {} : { filename: value.filename }),
      });
      break;
  }
  return row;
};
export const encodeRow = (row: TripleRow): string =>
  JSON.stringify(
    Object.fromEntries(
      columns.map((column) => [
        column,
        row[column] === null
          ? null
          : numericColumns.has(column)
            ? numericLexical(row[column] as number)
            : row[column],
      ]),
    ),
  );
export const decodeRow = (json: string): TripleRow => {
  const parsed: Record<string, unknown> = JSON.parse(json);
  for (const column of numericColumns)
    if (parsed[column] !== null && parsed[column] !== undefined) {
      const value = Number(parsed[column]);
      if (!Number.isFinite(value)) throw new TypeError(`Invalid ${column}`);
      parsed[column] = value;
    }
  for (const column of ["recorded_position", "retracted_position"])
    if (parsed[column] !== null && !Number.isSafeInteger(parsed[column]))
      throw new TypeError(`Unsafe ${column}`);
  if (parsed["value_type"] === "integer") integer(String(parsed["value_string"]));
  return parsed as unknown as TripleRow;
};
/**
 * How assertion subjects are written (EXP-J01). `a0` is the unchanged default; `compact` omits the
 * channels in `UNREAD_CHANNELS`.
 */
export type QleverCommitEncoding = "a0" | "compact";

/**
 * [EXP-J01] Channels `compact` does not write. Why: every assertion subject is 27 to 30 triples, so a
 * 10-fact command is 663 inserted triples (10 data facts and 14 journal facts at 27 or 30 each, plus
 * 9 for claim, operation and position; EXP-J01 qlever-attribution). Nine channels per fact are
 * written but never read by any query in this repository (the adapter, the Datalog compiler, the
 * native and temporal sources, the qualification workloads): the lexical, exactness and native
 * shadows of `recorded_at` and the lexical and exactness shadows of `recorded_position`, the four
 * `schema_version` channels, and on a retraction the same shadows of `retracted_at` and
 * `retracted_position`. Every one of them stays recoverable from `_row`, which `decodeRow` reads, so
 * no read loses information. The `_order` channels, `recorded_position_native` and
 * `retracted_position_native` (dependencyState), `valid_from` and `valid_to` with all their shadows
 * (native interval sources and qualification recursion read them) and the scalar channels (the
 * persisted source profile) are kept. Rows written by either encoding read the same, and a row
 * written by one and retracted by the other is still correct, because a retraction rewrites only
 * channels it lists and the omitted ones never change after the assertion.
 * Per fact: 18 triples for a string, ref or json value and 21 for a number or datetime, against 27
 * and 30; a 10-fact command: 663 -> 447 inserted triples.
 * Rejected: dropping the journal's own facts (they are logical facts: match and Datalog read them),
 * dropping `_row` (every adapter read decodes it) and pruning `valid_from` shadows on journal facts
 * only (a native mapping may name a `:_tx/` attribute).
 */
export const UNREAD_CHANNELS: ReadonlySet<string> = new Set([
  "recorded_at",
  "recorded_at_exact",
  "recorded_at_native",
  "recorded_position",
  "recorded_position_exact",
  "schema_version",
  "schema_version_order",
  "schema_version_exact",
  "schema_version_native",
  "retracted_at",
  "retracted_at_exact",
  "retracted_at_native",
  "retracted_position",
  "retracted_position_exact",
]);

/** The channels one assertion subject is written with under `encoding`. */
export const encodedRowFields = (
  row: TripleRow,
  encoding: QleverCommitEncoding = "a0",
): readonly [string, string][] =>
  encoding === "compact"
    ? rowFields(row).filter(([column]) => !UNREAD_CHANNELS.has(column))
    : rowFields(row);

/** Each canonical channel is lexical. Native shadows are explicitly admitted. */
export const rowFields = (row: TripleRow): readonly [string, string][] => {
  const fields: [string, string][] = [["_row", literal(encodeRow(row))]];
  const scalarFamily =
    row.value_type === "number" || row.value_type === "datetime"
      ? "number"
      : row.value_type === "integer"
        ? "integer"
        : row.value_type === "boolean"
          ? "boolean"
          : "string";
  const scalarLexical =
    scalarFamily === "number"
      ? (row.value_number ?? row.value_datetime) === 0
        ? "0"
        : numericLexical((row.value_number ?? row.value_datetime)!)
      : scalarFamily === "boolean"
        ? String(row.value_boolean)
        : (row.value_string ?? row.value_json)!;
  const scalarOrder =
    scalarFamily === "number"
      ? numericOrderKey((row.value_number ?? row.value_datetime)!)
      : scalarFamily === "integer"
        ? integerOrderKey(row.value_string!)
        : scalarLexical;
  fields.push(
    ["scalar_family", literal(scalarFamily)],
    ["scalar_lexical", literal(scalarLexical)],
    ["scalar_order", literal(scalarOrder)],
  );
  for (const column of columns) {
    const value = row[column];
    if (value === null) continue;
    fields.push([
      column,
      literal(numericColumns.has(column) ? numericLexical(value as number) : String(value)),
    ]);
    if (numericColumns.has(column)) {
      const exact = numericShadowIsExact(value as number);
      fields.push(
        [`${column}_order`, literal(numericOrderKey(value as number))],
        [`${column}_exact`, literal(String(exact))],
      );
      if (exact) fields.push([`${column}_native`, nativeNumeric(value as number)]);
    }
  }
  if (row.value_type === "integer") {
    const value = BigInt(row.value_string!);
    const exact = value >= -(1n << 59n) && value < 1n << 59n;
    fields.push(
      ["value_integer_order", literal(integerOrderKey(row.value_string!))],
      ["value_integer_exact", literal(String(exact))],
      ["value_integer_sum_hi", (value >> 32n).toString()],
      ["value_integer_sum_lo", (value & ((1n << 32n) - 1n)).toString()],
    );
    if (exact) fields.push(["value_integer_native", value.toString()]);
  }
  return fields;
};
