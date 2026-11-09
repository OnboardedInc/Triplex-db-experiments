import { decodeValueColumns, storedValueDomain, ValueDomains, type TripleRow } from "@triplex-build/triplex/runtime";
import { assertionColumns } from "./rows.js";
import { decodeRow, encodeRow } from "./protocol.js";

// [EXP-DX1] Why: encode once at write time, preserving UTF-16 lengths and signed zero.
// Rejected: tagged maps per read (allocation and nine-datom reconstruction cost).
export const rowTextColumns = assertionColumns.filter(
  (c) => c !== "retracted_at" && c !== "retracted_position" && c !== "retract_tx_id",
);
const numeric = new Set([
  "value_number",
  "value_boolean",
  "value_datetime",
  "recorded_at",
  "recorded_position",
  "valid_from",
  "valid_to",
  "schema_version",
]);
const hex4 = (n: number) => {
  if (n > 65535) throw new RangeError("Row header string exceeds UTF-16 length limit");
  return n.toString(16).padStart(4, "0");
};
const bits = (n: number) => {
  if (!Number.isFinite(n)) throw new TypeError("Nonfinite row time");
  const bytes = Buffer.allocUnsafe(8);
  bytes.writeDoubleBE(n);
  return bytes.toString("hex");
};
export function encodeRowText(row: TripleRow): string {
  if (row.retracted_at !== null || row.retracted_position !== null || row.retract_tx_id !== null)
    throw new TypeError("Row text requires a live row");
  row = decodeRow(encodeRow(row));
  for (const c of ["recorded_position", "schema_version"] as const)
    if (!Number.isSafeInteger(row[c])) throw new RangeError(`Unsafe ${c}`);
  const ref = row.value_type === "ref" ? row.value_string! : "";
  return (
    "1" +
    hex4(row.id.length) +
    row.id +
    bits(row.valid_from) +
    (row.valid_to === null ? "----------------" : bits(row.valid_to)) +
    hex4(ref.length) +
    ref +
    JSON.stringify(rowTextColumns.map((c) => (Object.is(row[c], -0) ? "-0" : row[c])))
  );
}
export function decodeRowTextColumns(values: unknown): TripleRow {
  if (!Array.isArray(values) || values.length !== rowTextColumns.length)
    throw new TypeError("Invalid row text columns");
  const row: Record<string, unknown> = {
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
  };
  rowTextColumns.forEach((c, i) => {
    const v = values[i];
    if (numeric.has(c)) {
      if (v !== null && v !== "-0" && (typeof v !== "number" || !Number.isFinite(v)))
        throw new TypeError(`Invalid row text number ${c}`);
      row[c] = v === "-0" ? -0 : v;
    } else {
      if (v !== null && typeof v !== "string") throw new TypeError(`Invalid row text string ${c}`);
      row[c] = v;
    }
  });
  for (const c of ["recorded_position", "schema_version"])
    if (!Number.isSafeInteger(row[c])) throw new RangeError(`Unsafe ${c}`);
  for (const c of ["id", "entity_id", "attribute", "value_type"])
    if (typeof row[c] !== "string") throw new TypeError(`Missing ${c}`);
  for (const c of ["recorded_at", "valid_from"])
    if (typeof row[c] !== "number") throw new TypeError(`Missing ${c}`);
  return row as unknown as TripleRow;
}
export function decodeRowTextArray(values: unknown): TripleRow {
  const row = decodeRowTextColumns(values);
  decodeValueColumns(row, storedValueDomain(ValueDomains.datomic, row.attribute));
  return row;
}
export function decodeRowText(text: string): TripleRow {
  if (text[0] !== "1") throw new TypeError("Unknown row text version");
  const length = Number.parseInt(text.slice(1, 5), 16);
  const start = 5 + length;
  const refLength = Number.parseInt(text.slice(start + 32, start + 36), 16);
  const row = decodeRowTextArray(JSON.parse(text.slice(start + 36 + refLength)));
  if (encodeRowText(row) !== text) throw new TypeError("Noncanonical row text header");
  return row;
}
