import { Schema } from "effect";
import { EntityId } from "./Branded.js";

export const ValueType = Schema.Literals([
  "string",
  "number",
  "integer",
  "boolean",
  "datetime",
  "ref",
  "json",
  "blob",
]);
export type ValueType = typeof ValueType.Type;

export const StringValue = Schema.Struct({ type: Schema.Literal("string"), value: Schema.String });
export type StringValue = typeof StringValue.Type;

export const NumberValue = Schema.Struct({ type: Schema.Literal("number"), value: Schema.Number });
export type NumberValue = typeof NumberValue.Type;

export const MIN_INTEGER = -9_223_372_036_854_775_808n;
export const MAX_INTEGER = 9_223_372_036_854_775_807n;
const canonicalInt64 = (value: string): boolean => {
  if (!/^(?:0|-[1-9]\d*|[1-9]\d*)$/.test(value)) return false;
  const parsed = BigInt(value);
  return parsed >= MIN_INTEGER && parsed <= MAX_INTEGER;
};
/** Exact signed 64-bit integer. Decimal text is the lossless wire payload. */
export const Int64Decimal = Schema.String.check(
  Schema.makeFilter(canonicalInt64, {
    expected: "a canonical signed 64-bit decimal integer",
  }),
);
export const IntegerValue = Schema.Struct({ type: Schema.Literal("integer"), value: Int64Decimal });
export type IntegerValue = typeof IntegerValue.Type;

export const BooleanValue = Schema.Struct({
  type: Schema.Literal("boolean"),
  value: Schema.Boolean,
});
export type BooleanValue = typeof BooleanValue.Type;

export const DateTimeValue = Schema.Struct({
  type: Schema.Literal("datetime"),
  value: Schema.Number,
});
export type DateTimeValue = typeof DateTimeValue.Type;

export const RefValue = Schema.Struct({ type: Schema.Literal("ref"), value: EntityId });
export type RefValue = typeof RefValue.Type;

export const JsonValue = Schema.Struct({ type: Schema.Literal("json"), value: Schema.Unknown });
export type JsonValue = typeof JsonValue.Type;

export const BlobValue = Schema.Struct({
  type: Schema.Literal("blob"),
  value: Schema.String,
  mimeType: Schema.String,
  size: Schema.Number,
  filename: Schema.optional(Schema.String),
});
export type BlobValue = typeof BlobValue.Type;

export const TripleValue = Schema.Union([
  StringValue,
  NumberValue,
  IntegerValue,
  BooleanValue,
  DateTimeValue,
  RefValue,
  JsonValue,
  BlobValue,
]);
export type TripleValue = typeof TripleValue.Type;

export const string = (value: string): StringValue => ({ type: "string", value });
export const number = (value: number): NumberValue => ({ type: "number", value });
/** Numbers are excluded: their original integer may already be rounded. */
export const integer = (value: bigint | string): IntegerValue => {
  if (typeof value !== "bigint" && (typeof value !== "string" || !/^[+-]?\d+$/.test(value))) {
    throw new TypeError("Exact integers require bigint or decimal text");
  }
  const parsed = BigInt(value);
  if (parsed < MIN_INTEGER || parsed > MAX_INTEGER)
    throw new RangeError("Signed 64-bit integer overflow");
  return { type: "integer", value: parsed.toString() };
};
export const boolean = (value: boolean): BooleanValue => ({ type: "boolean", value });
export const datetime = (value: number | Date): DateTimeValue => ({
  type: "datetime",
  value: typeof value === "number" ? value : value.getTime(),
});
export const ref = (entityId: EntityId): RefValue => ({ type: "ref", value: entityId });
export const json = (value: unknown): JsonValue => ({ type: "json", value });
export const blob = (
  hash: string,
  mimeType: string,
  size: number,
  filename?: string,
): BlobValue => ({
  type: "blob",
  value: hash,
  mimeType,
  size,
  ...(filename !== undefined && { filename }),
});
