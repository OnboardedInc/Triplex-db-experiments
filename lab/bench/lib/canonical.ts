// [DX-R3] Why: tagged structure preserves field boundaries, absent fields, Options and signed zero.
// Rejected: JSON.stringify of business E/A/V (drops identity, metadata and -0).
export function typed(value: any): any {
  if (typeof value === "number") return ["number", Object.is(value, -0) ? "-0" : String(value)];
  if (value === undefined) return ["undefined"];
  if (value === null) return ["null"];
  if (Array.isArray(value)) return ["array", value.map(typed)];
  if (typeof value === "object")
    return [
      "object",
      Object.keys(value)
        .sort()
        .map((k) => [k, typed(value[k])]),
    ];
  if (typeof value === "string" || typeof value === "boolean") return [typeof value, value];
  throw Error(`Unsupported canonical value: ${typeof value}`);
}
const OPTION_FIELDS = new Set([
  "validTo",
  "createdBy",
  "entityType",
  "schemaVersion",
  "txId",
  "retractedAt",
  "retractTxId",
]);
export const canonicalRow = (row: any): string =>
  JSON.stringify([
    "row",
    Object.keys(row)
      .sort()
      .map((key) => {
        const v = row[key];
        const value =
          OPTION_FIELDS.has(key) &&
          v &&
          typeof v === "object" &&
          (v._tag === "Some" || v._tag === "None")
            ? [
                "option",
                v._tag,
                ...(v._tag === "Some" ? [typed(v.value)] : []),
                Object.keys(v)
                  .filter((k) => k !== "_tag" && (k !== "value" || v._tag === "None"))
                  .sort()
                  .map((k) => [k, typed(v[k])]),
              ]
            : typed(v);
        return [key, value];
      }),
  ]);
export const canonicalWorld = (rows: readonly any[]): string =>
  JSON.stringify(rows.map(canonicalRow).sort());
