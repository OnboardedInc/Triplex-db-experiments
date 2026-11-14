import {
  decodeValueColumns,
  storedValueDomain,
  ValueDomains,
  type TripleRow,
} from "@triplex-build/triplex/runtime";
import { assertionColumns } from "./rows.js";

// [EXP-DX1] Why: encode once at write time, preserving UTF-16 lengths and signed zero.
// Rejected: tagged maps per read (allocation and nine-datom reconstruction cost).
const legacyColumns = assertionColumns.filter(
  (c) => c !== "retracted_at" && c !== "retracted_position" && c !== "retract_tx_id",
);
export const rowTextColumns = [
  "recorded_position" as const,
  ...legacyColumns.filter((c) => c !== "recorded_position"),
];
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
export function encodeRowText(row: TripleRow, version: "1" | "2" = "2"): string {
  if (row.retracted_at !== null || row.retracted_position !== null || row.retract_tx_id !== null)
    throw new TypeError("Row text requires a live row");
  // [DX-B2-N3] Why: the warm probe attributes >1 ms to redundant tagged row reconstruction.
  // Rejected: skipping validation; check scalar types and the stored value domain directly once.
  for (const [column, value] of Object.entries(row)) {
    if (value === null) continue;
    if (numeric.has(column)) {
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new TypeError(`Invalid row number ${column}`);
    } else if (typeof value !== "string") throw new TypeError(`Invalid row string ${column}`);
  }
  decodeValueColumns(row, storedValueDomain(ValueDomains.datomic, row.attribute));
  // Tagged long columns canonicalized signed zero to +0 in the original encoder.
  row = {
    ...row,
    recorded_position: row.recorded_position === 0 ? 0 : row.recorded_position,
    schema_version: row.schema_version === 0 ? 0 : row.schema_version,
  };
  for (const c of ["recorded_position", "schema_version"] as const)
    if (!Number.isSafeInteger(row[c])) throw new RangeError(`Unsafe ${c}`);
  if (row.recorded_position < 0) throw new RangeError("Negative recorded position");
  if (
    version === "2" &&
    row.attribute === ":_tx/position" &&
    (row.value_type !== "number" || row.value_number !== row.recorded_position)
  )
    throw new TypeError("Journal position value must equal its recorded position");
  const ref = row.value_type === "ref" ? row.value_string! : "";
  return (
    version +
    hex4(row.id.length) +
    row.id +
    bits(row.valid_from) +
    (row.valid_to === null ? "----------------" : bits(row.valid_to)) +
    hex4(ref.length) +
    ref +
    (version === "2" && row.attribute === ":_tx/position" ? "P" : version === "2" ? "-" : "") +
    JSON.stringify(
      (version === "1" ? legacyColumns : rowTextColumns).map((c) =>
        version === "2" && c === "recorded_position"
          ? String(row[c]).padStart(16, "0")
          : version === "2" && row.attribute === ":_tx/position" && c === "value_number"
            ? null
            : Object.is(row[c], -0)
              ? "-0"
              : row[c],
      ),
    )
  );
}
export function decodeRowTextColumns(values: unknown, version?: "1" | "2"): TripleRow {
  if (!Array.isArray(values) || values.length !== rowTextColumns.length)
    throw new TypeError("Invalid row text columns");
  const modern =
    version === "2" ||
    (version === undefined && typeof values[0] === "string" && /^\d{16}$/.test(values[0]));
  if (modern && (typeof values[0] !== "string" || !/^\d{16}$/.test(values[0])))
    throw new TypeError("Invalid fixed-width row position");
  const columns = modern ? rowTextColumns : legacyColumns;
  const row: Record<string, unknown> = {
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
  };
  columns.forEach((c, i) => {
    const v = modern && c === "recorded_position" ? Number(values[i]) : values[i];
    if (numeric.has(c)) {
      if (v !== null && v !== "-0" && (typeof v !== "number" || !Number.isFinite(v)))
        throw new TypeError(`Invalid row text number ${c}`);
      row[c] = v === "-0" ? -0 : v;
    } else {
      if (v !== null && typeof v !== "string") throw new TypeError(`Invalid row text string ${c}`);
      row[c] = v;
    }
  });
  if (modern && row["attribute"] === ":_tx/position") {
    if (row["value_number"] !== null) throw new TypeError("Journal position payload must be null");
    row["value_number"] = row["recorded_position"];
  }
  for (const c of ["recorded_position", "schema_version"])
    if (!Number.isSafeInteger(row[c])) throw new RangeError(`Unsafe ${c}`);
  for (const c of ["id", "entity_id", "attribute", "value_type"])
    if (typeof row[c] !== "string") throw new TypeError(`Missing ${c}`);
  for (const c of ["recorded_at", "valid_from"])
    if (typeof row[c] !== "number") throw new TypeError(`Missing ${c}`);
  return row as unknown as TripleRow;
}
export function decodeRowTextArray(values: unknown, version?: "1" | "2"): TripleRow {
  const row = decodeRowTextColumns(values, version);
  decodeValueColumns(row, storedValueDomain(ValueDomains.datomic, row.attribute));
  return row;
}
export function decodeRowText(text: string): TripleRow {
  if (text[0] !== "1" && text[0] !== "2") throw new TypeError("Unknown row text version");
  const length = Number.parseInt(text.slice(1, 5), 16);
  const start = 5 + length;
  const refLength = Number.parseInt(text.slice(start + 32, start + 36), 16);
  const body = start + 36 + refLength + (text[0] === "2" ? 1 : 0);
  const row = decodeRowTextArray(JSON.parse(text.slice(body)), text[0]);
  // [DX-T1-5] Why: the server assigns record time using JVM JSON spelling; headers and typed values remain exact.
  // Rejected: comparing entire JSON bytes to Node's number/escape spelling (valid server rows fail bootstrap).
  if (encodeRowText(row, text[0]).slice(0, body) !== text.slice(0, body))
    throw new TypeError("Noncanonical row text header");
  return row;
}
