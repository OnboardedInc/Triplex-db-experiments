import { Option } from "effect";
// [DX-R3] Why: tagged structure preserves field boundaries, absent fields, Options and signed zero.
// Rejected: JSON.stringify of business E/A/V (drops identity, metadata and -0).
export class CanonicalValueError extends Error {
  readonly _tag = "CanonicalValueError";
}
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
export function dataDescriptors(value: object): PropertyDescriptorMap {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    const d = (descriptors as any)[key] as PropertyDescriptor;
    if (typeof key !== "string" || !("value" in d))
      throw new CanonicalValueError("Unsupported canonical object property");
  }
  return descriptors;
}
function plain(value: object, array = false): PropertyDescriptorMap {
  const proto = Object.getPrototypeOf(value);
  if (array ? proto !== Array.prototype : proto !== null && proto !== Object.prototype)
    throw new CanonicalValueError("Unsupported canonical object prototype");
  const descriptors = dataDescriptors(value),
    keys = Object.keys(descriptors);
  if (array) {
    const length = descriptors.length;
    if (
      !length ||
      length.enumerable ||
      !Number.isSafeInteger(length.value) ||
      length.value < 0 ||
      keys.length !== length.value + 1
    )
      throw new CanonicalValueError("Unsupported canonical array shape");
    for (let i = 0; i < length.value; i++)
      if (!Object.hasOwn(descriptors, String(i)) || !descriptors[String(i)]!.enumerable)
        throw new CanonicalValueError("Unsupported canonical array index");
  } else if (keys.some((k) => !descriptors[k]!.enumerable))
    throw new CanonicalValueError("Unsupported canonical hidden property");
  return descriptors;
}
const SOME = Object.getPrototypeOf(Option.some(undefined));
const NONE = Object.getPrototypeOf(Option.none());
// [DX-R3] Why: real Option prototypes do not make an own getter or hidden/symbol field immutable data.
// Rejected: reading Option.value before inspecting its descriptors (can cache a changing public field).
export function optionData(
  value: unknown,
): { tag: "Some" | "None"; descriptors: PropertyDescriptorMap } | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== SOME && prototype !== NONE) return undefined;
  const tag = prototype === SOME ? "Some" : "None";
  const descriptors = dataDescriptors(value);
  if (
    Object.values(descriptors).some((d) => !d.enumerable) ||
    (tag === "Some" && !Object.hasOwn(descriptors, "value")) ||
    (Object.hasOwn(descriptors, "_tag") && descriptors._tag!.value !== tag)
  )
    throw new CanonicalValueError("Unsupported canonical Option shape");
  return { tag, descriptors };
}
// [DX-R3] Why: cache admission uses the same shape checks as canonicalization, without invoking getters.
// Rejected: a special Option fast branch that bypasses descriptor validation.
export function supportedDescriptors(value: object): PropertyDescriptorMap {
  const option = optionData(value);
  if (option) return option.descriptors;
  return plain(value, Array.isArray(value));
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
// [DX-R3-P7] Why: an immutable row's complete typed text recurs in source comparisons and observations.
// Rejected: ID/revision caches (could certify changed fields) or caching merely frozen containers.
const immutable = new WeakSet<object>();
const rowText = new WeakMap<object, string>();
export function frozenData(value: unknown): boolean {
  if (value === null || typeof value !== "object") return typeof value !== "function";
  if (immutable.has(value)) return true;
  if (!Object.isFrozen(value)) return false;
  const descriptors = supportedDescriptors(value);
  if (!Object.values(descriptors).every((d) => frozenData(d.value))) return false;
  immutable.add(value);
  return true;
}
export const canonicalRow = (row: any): string => {
  const cached = rowText.get(row);
  if (cached !== undefined) return cached;
  plain(row);
  const text = JSON.stringify([
    "row",
    Object.keys(row)
      .sort()
      .map((key) => {
        const v = row[key];
        // [DX-R3] Why: a plain tagged wire object is not the public Effect Option type.
        // Rejected: normalizing lookalikes (would hide a wrong result type).
        const option = OPTION_FIELDS.has(key) ? optionData(v) : undefined;
        const value = option
          ? [
              "option",
              option.tag,
              ...(option.tag === "Some" ? [typed(option.descriptors.value!.value)] : []),
              Object.keys(option.descriptors)
                .filter((k) => k !== "value" || option.tag === "None")
                .sort()
                .map((k) => [k, typed(option.descriptors[k]!.value)]),
            ]
          : typed(v);
        return [key, value];
      }),
  ]);
  if (frozenData(row)) rowText.set(row, text);
  return text;
};
export const canonicalWorld = (rows: readonly any[]): string =>
  JSON.stringify(rows.map(canonicalRow).sort());
