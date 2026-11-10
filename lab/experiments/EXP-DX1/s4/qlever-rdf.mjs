// [DX-S4] Why: adapted packages/qlever/src/rdf.ts rowFields(a0), retaining lexical/order/native shadows and _row. Rejected: bypassing lane mapping with an opaque blob. Original source hash is bound by prepare-qlever.mjs.
const canonicalInteger=(value)=>{const n=BigInt(value);if(String(n)!==value||n<-(1n<<63n)||n>=(1n<<63n))throw Error('noncanonical/out-of-range integer');return value;};
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
]         ;
export const numericColumns = new Set        ([
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
const wellFormed = (value        )         => {
  if (!value.isWellFormed())
    throw new TypeError(
      "QLever text and identifiers require well-formed Unicode; isolated UTF-16 surrogates are not representable",
    );
  return value;
};
const encoded = (value        ) => Buffer.from(wellFormed(value)).toString("base64url");
export const graphIri = (scope        ) => `<urn:triplex:scope:${encoded(scope)}>`;
export const assertionIri = (id        ) => `<urn:triplex:assertion:${encoded(id)}>`;
export const claimIri = (id        ) => `<urn:triplex:claim:${encoded(id)}>`;
export const operationIri = (id        ) => `<urn:triplex:operation:${encoded(id)}>`;
export const fieldIri = (column        ) => `<urn:triplex:field:${column}>`;
export const metaIri = "<urn:triplex:meta>";
export const literal = (value        ) =>
  JSON.stringify(wellFormed(value))
    // QLever applies Unicode escapes before lexical backslash unescaping.
    // Escape the letter after a literal backslash so JSON's text `\ud800`
    // remains six ASCII characters rather than an invalid Unicode scalar.
    .replace(
      /\\\\([uU])/g,
      (_match, letter        ) => `\\\\\\u${letter === "u" ? "0075" : "0055"}`,
    )
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
export const numericLexical = (value        ) => (Object.is(value, -0) ? "-0" : String(value));
/** Order-preserving binary64 key; comparison never uses QLever's lossy numeric IDs. */
export const numericOrderKey = (value        )         => {
  if (!Number.isFinite(value)) throw new TypeError("Nonfinite numeric key");
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value === 0 ? 0 : value);
  const bits = view.getBigUint64(0);
  return (bits & (1n << 63n) ? ~bits & ((1n << 64n) - 1n) : bits ^ (1n << 63n))
    .toString(16)
    .padStart(16, "0");
};
export const integerOrderKey = (value        )         =>
  (BigInt(canonicalInteger(value)) + (1n << 63n)).toString(16).padStart(16, "0");
export const numericFromOrderKey = (key        )         => {
  const keyBits = BigInt(`0x${key}`);
  const bits = keyBits & (1n << 63n) ? keyBits ^ (1n << 63n) : ~keyBits & ((1n << 64n) - 1n);
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
};
export const numericShadowIsExact = (value        )          => {
  if (!Number.isFinite(value)) return false;
  if (Number.isInteger(value) && value >= -(2 ** 59) && value < 2 ** 59) return true;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  return (view.getUint32(4) & 15) === 0;
};
export const nativeNumeric = (value        )         =>
  Number.isInteger(value) && value >= -(2 ** 59) && value < 2 ** 59
    ? numericLexical(value)
    : `${literal(numericLexical(value))}^^<http://www.w3.org/2001/XMLSchema#double>`;
export const encodeRow = (row           )         =>
  JSON.stringify(
    Object.fromEntries(
      columns.map((column) => [
        column,
        row[column] === null
          ? null
          : numericColumns.has(column)
            ? numericLexical(row[column]          )
            : row[column],
      ]),
    ),
  );
export const rowFields = (row           )                              => {
  const fields                     = [["_row", literal(encodeRow(row))]];
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
        : numericLexical((row.value_number ?? row.value_datetime) )
      : scalarFamily === "boolean"
        ? String(row.value_boolean)
        : (row.value_string ?? row.value_json) ;
  const scalarOrder =
    scalarFamily === "number"
      ? numericOrderKey((row.value_number ?? row.value_datetime) )
      : scalarFamily === "integer"
        ? integerOrderKey(row.value_string )
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
      literal(numericColumns.has(column) ? numericLexical(value          ) : String(value)),
    ]);
    if (numericColumns.has(column)) {
      const exact = numericShadowIsExact(value          );
      fields.push(
        [`${column}_order`, literal(numericOrderKey(value          ))],
        [`${column}_exact`, literal(String(exact))],
      );
      if (exact) fields.push([`${column}_native`, nativeNumeric(value          )]);
    }
  }
  if (row.value_type === "integer") {
    const value = BigInt(row.value_string );
    const exact = value >= -(1n << 59n) && value < 1n << 59n;
    fields.push(
      ["value_integer_order", literal(integerOrderKey(row.value_string ))],
      ["value_integer_exact", literal(String(exact))],
      ["value_integer_sum_hi", (value >> 32n).toString()],
      ["value_integer_sum_lo", (value & ((1n << 32n) - 1n)).toString()],
    );
    if (exact) fields.push(["value_integer_native", value.toString()]);
  }
  return fields;
};
