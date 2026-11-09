import { Schema } from "effect";
import { MIN_INTEGER, MAX_INTEGER, TripleValue, type ValueType } from "./Value.js";
import { InvalidTripleError } from "./errors/index.js";

export interface ValueDomain {
  readonly id: string;
  readonly kinds: readonly ValueType[];
  readonly integer: { readonly min: string; readonly max: string } | null;
  /** No decimal wire family exists: null explicitly means unsupported precision/scale. */
  readonly decimal: { readonly precision: number; readonly scale: number } | null;
  readonly string: { readonly maxUtf8Bytes: number; readonly allowNul: boolean };
  readonly number: { readonly min: number; readonly max: number; readonly negativeZero: boolean };
  readonly datetime: { readonly min: number; readonly max: number };
  readonly json: { readonly maxDepth: number };
  readonly blob: { readonly minSize: number; readonly maxSize: number };
}
const allKinds = [
  "string",
  "number",
  "integer",
  "boolean",
  "datetime",
  "ref",
  "json",
  "blob",
] as const;
const long = Object.freeze({ min: MIN_INTEGER.toString(), max: MAX_INTEGER.toString() });
const domain = (id: string, integer: ValueDomain["integer"], negativeZero = false): ValueDomain =>
  Object.freeze({
    id,
    kinds: Object.freeze(allKinds.filter((kind) => kind !== "integer" || integer !== null)),
    integer,
    decimal: null,
    // [EXP-GS12F-R3] Why: freeze a portable admission limit, not an inferred physical engine ceiling.
    // Rejected: unbounded strings (no finite boundary to verify; PostgreSQL cannot transport NUL).
    string: Object.freeze({ maxUtf8Bytes: 1048576, allowNul: false }),
    number: Object.freeze({ min: -Number.MAX_VALUE, max: Number.MAX_VALUE, negativeZero }),
    datetime: Object.freeze({ min: -8640000000000000, max: 8640000000000000 }),
    json: Object.freeze({ maxDepth: 128 }),
    blob: Object.freeze({ minSize: 0, maxSize: Number.MAX_SAFE_INTEGER }),
  });
/** One catalog consumed by transaction preflight and codecs, never by contract generation. */
export const ValueDomains = Object.freeze({
  memory: domain("memory/kv", long),
  foundationdb: domain("foundationdb/kv", long),
  xtdb: domain("xtdb", long),
  qlever: domain(
    "qlever",
    Object.freeze({ min: "-576460752303423488", max: "576460752303423487" }),
  ),
  sqlite: domain("sqlite", null),
  postgres: domain("postgres", null),
  cloudflare: domain("cloudflare", null),
  duckdb: domain("duckdb", long),
});
const shape = Schema.is(TripleValue);
const encoder = new TextEncoder();
const text = (s: string, d: ValueDomain): boolean =>
  s.isWellFormed() &&
  (d.string.allowNul || !s.includes("\0")) &&
  encoder.encode(s).length <= d.string.maxUtf8Bytes;

// [EXP-GS12F-R3] Why: JSON.stringify can drop fields, call toJSON, replace nonfinite numbers or -0,
// and normalize sparse arrays/prototypes. Rejected: stringify/parse equality (it erases the evidence).
const losslessJson = (root: unknown, d: ValueDomain): boolean => {
  const seen = new Set<object>();
  const visit = (v: unknown, depth: number): boolean => {
    if (depth > d.json.maxDepth) return false;
    if (v === null || typeof v === "boolean") return true;
    if (typeof v === "string") return text(v, d);
    if (typeof v === "number") return Number.isFinite(v) && !Object.is(v, -0);
    if (typeof v !== "object" || seen.has(v)) return false;
    const array = Array.isArray(v);
    if (Object.getPrototypeOf(v) !== (array ? Array.prototype : Object.prototype)) return false;
    seen.add(v);
    try {
      const keys = Reflect.ownKeys(v);
      if (array && keys.length !== v.length + 1) return false;
      for (const key of keys) {
        if (array && key === "length") continue;
        if (typeof key !== "string" || !text(key, d)) return false;
        if (array && !/^(?:0|[1-9]\d*)$/.test(key)) return false;
        const descriptor = Object.getOwnPropertyDescriptor(v, key)!;
        if (
          !descriptor.enumerable ||
          !("value" in descriptor) ||
          !visit(descriptor.value, depth + 1)
        )
          return false;
      }
      return true;
    } finally {
      seen.delete(v);
    }
  };
  return visit(root, 0);
};
export const invalidValue = (value: unknown, d: ValueDomain): InvalidTripleError | undefined => {
  const invalid = () =>
    new InvalidTripleError({
      field: "value",
      value,
      message: `Value is outside ${d.id}'s exact storage domain`,
    });
  try {
    if (
      typeof value !== "object" ||
      value === null ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return invalid();
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (
        typeof key !== "string" ||
        !["type", "value", "mimeType", "size", "filename"].includes(key)
      )
        return invalid();
      const descriptor = descriptors[key]!;
      if (!descriptor.enumerable || !("value" in descriptor)) return invalid();
    }
    if (!shape(value) || !d.kinds.includes(value.type)) return invalid();
    const allowed =
      value.type === "blob" ? ["type", "value", "mimeType", "size", "filename"] : ["type", "value"];
    if (Object.keys(descriptors).some((key) => !allowed.includes(key))) return invalid();
    if (value.type === "blob" && Object.hasOwn(value, "filename") && value.filename === undefined)
      return invalid();
    switch (value.type) {
      case "integer":
        if (
          !d.integer ||
          BigInt(value.value) < BigInt(d.integer.min) ||
          BigInt(value.value) > BigInt(d.integer.max)
        )
          return invalid();
        break;
      case "string":
      case "ref":
        if (!text(value.value, d)) return invalid();
        break;
      case "number":
        if (
          !Number.isFinite(value.value) ||
          value.value < d.number.min ||
          value.value > d.number.max ||
          (!d.number.negativeZero && Object.is(value.value, -0))
        )
          return invalid();
        break;
      case "datetime":
        if (
          !Number.isFinite(value.value) ||
          Object.is(value.value, -0) ||
          value.value < d.datetime.min ||
          value.value > d.datetime.max
        )
          return invalid();
        break;
      case "json":
        if (!losslessJson(value.value, d)) return invalid();
        break;
      case "blob":
        if (
          !text(value.value, d) ||
          !text(value.mimeType, d) ||
          (value.filename !== undefined && !text(value.filename, d)) ||
          !Number.isSafeInteger(value.size) ||
          Object.is(value.size, -0) ||
          value.size < d.blob.minSize ||
          value.size > d.blob.maxSize
        )
          return invalid();
        break;
    }
    return undefined;
  } catch {
    return invalid();
  }
};
/** Codec boundary: same typed rejection as preflight; no packing exception translation. */
export function assertValueInDomain(
  value: unknown,
  domain: ValueDomain,
): asserts value is TripleValue {
  const error = invalidValue(value, domain);
  if (error) throw error;
}

// [EXP-GS12F-R3] Why: journal envelopes add fixed nesting around a validated user JSON value.
// Rejected: rejecting a valid max-depth value late while encoding its generated change envelope.
export const storedValueDomain = (domain: ValueDomain, attribute: string): ValueDomain =>
  attribute.startsWith(":_tx/")
    ? { ...domain, json: { maxDepth: domain.json.maxDepth + 16 } }
    : domain;

/** Decode value columns without constructor normalization, then enforce the same storage domain. */
export const decodeValueColumns = (
  row: {
    readonly value_type: string;
    readonly value_string: unknown;
    readonly value_number: unknown;
    readonly value_boolean: unknown;
    readonly value_datetime: unknown;
    readonly value_json: unknown;
  },
  domain: ValueDomain,
): TripleValue => {
  let value: unknown;
  switch (row.value_type) {
    case "string":
    case "ref":
    case "integer":
      value = { type: row.value_type, value: row.value_string };
      break;
    case "number":
      value = { type: "number", value: row.value_number };
      break;
    case "datetime":
      value = { type: "datetime", value: row.value_datetime };
      break;
    case "boolean":
      value = {
        type: "boolean",
        value: row.value_boolean === 1 ? true : row.value_boolean === 0 ? false : undefined,
      };
      break;
    case "json":
      value = { type: "json", value: JSON.parse(row.value_json as string) };
      break;
    case "blob":
      value = { type: "blob", value: row.value_string, ...JSON.parse(row.value_json as string) };
      break;
    default:
      value = { type: row.value_type };
  }
  assertValueInDomain(value, domain);
  return value;
};
