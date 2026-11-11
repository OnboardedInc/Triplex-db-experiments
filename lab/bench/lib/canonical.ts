import { Option } from "effect";
// [DX-R3] Why: tagged structure preserves field boundaries, absent fields, Options and signed zero.
// Rejected: JSON.stringify of business E/A/V (drops identity, metadata and -0).
export class CanonicalValueError extends Error { readonly _tag = "CanonicalValueError"; }
export function typed(value: any): any {
  if (typeof value === "number") return ["number", Object.is(value, -0) ? "-0" : String(value)];
  if (value === undefined) return ["undefined"];
  if (value === null) return ["null"];
  if (Array.isArray(value)) {
    plain(value, true);
    return ["array", value.map(typed)];
  }
  if (typeof value === "object") {
    plain(value);
    return [
      "object",
      Object.keys(value)
        .sort()
        .map((k) => [k, typed(value[k])]),
    ];
  }
  if (typeof value === "string" || typeof value === "boolean") return [typeof value, value];
  throw new CanonicalValueError(`Unsupported canonical value: ${typeof value}`);
}
// [DX-R3] Why: enumeration must not erase prototypes, accessors, symbols or sparse array slots.
// Rejected: JSON coercion (Date and an empty object would certify the same bytes).
function plain(value: object, array = false): void {
  const proto = Object.getPrototypeOf(value);
  if (array ? proto !== Array.prototype : proto !== null && proto !== Object.prototype)
    throw new CanonicalValueError("Unsupported canonical object prototype");
  const keys = Reflect.ownKeys(value);
  if (
    keys.some(
      (k) => typeof k !== "string" || !("value" in Object.getOwnPropertyDescriptor(value, k)!),
    )
  )
    throw new CanonicalValueError("Unsupported canonical object property");
  if (array) {
    const xs = value as unknown[];
    if (
      keys.length !== xs.length + 1 ||
      keys.some((k) => k !== "length" && !/^(0|[1-9][0-9]*)$/.test(String(k)))
    )
      throw new CanonicalValueError("Unsupported canonical array shape");
  } else if (keys.some((k) => !Object.prototype.propertyIsEnumerable.call(value, k)))
    throw new CanonicalValueError("Unsupported canonical hidden property");
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
export const canonicalRow = (row: any): string => {
  plain(row);
  return JSON.stringify([
    "row",
    Object.keys(row)
      .sort()
      .map((key) => {
        const v = row[key];
        // [DX-R3] Why: a plain tagged wire object is not the public Effect Option type.
        // Rejected: normalizing lookalikes (would hide a wrong result type).
        const value =
          OPTION_FIELDS.has(key) && Option.isOption(v)
            ? [
                "option",
                v._tag,
                ...(v._tag === "Some" ? [typed(v.value)] : []),
                Object.keys(v)
                  .filter((k) => k !== "_tag" && (k !== "value" || v._tag === "None"))
                  .sort()
                  .map((k) => [k, typed((v as any)[k])]),
              ]
            : typed(v);
        return [key, value];
      }),
  ]);
};
export const canonicalWorld = (rows: readonly any[]): string =>
  JSON.stringify(rows.map(canonicalRow).sort());
