import { EntityId } from "./Branded.js";
import { Schema } from "effect";
//#region src/Value.ts
const ValueType = Schema.Literals([
	"string",
	"number",
	"integer",
	"boolean",
	"datetime",
	"ref",
	"json",
	"blob"
]);
const StringValue = Schema.Struct({
	type: Schema.Literal("string"),
	value: Schema.String
});
const NumberValue = Schema.Struct({
	type: Schema.Literal("number"),
	value: Schema.Number
});
const MIN_INTEGER = -9223372036854775808n;
const MAX_INTEGER = 9223372036854775807n;
const canonicalInt64 = (value) => {
	if (!/^(?:0|-[1-9]\d*|[1-9]\d*)$/.test(value)) return false;
	const parsed = BigInt(value);
	return parsed >= -9223372036854775808n && parsed <= 9223372036854775807n;
};
/** Exact signed 64-bit integer. Decimal text is the lossless wire payload. */
const Int64Decimal = Schema.String.check(Schema.makeFilter(canonicalInt64, { expected: "a canonical signed 64-bit decimal integer" }));
const IntegerValue = Schema.Struct({
	type: Schema.Literal("integer"),
	value: Int64Decimal
});
const BooleanValue = Schema.Struct({
	type: Schema.Literal("boolean"),
	value: Schema.Boolean
});
const DateTimeValue = Schema.Struct({
	type: Schema.Literal("datetime"),
	value: Schema.Number
});
const RefValue = Schema.Struct({
	type: Schema.Literal("ref"),
	value: EntityId
});
const JsonValue = Schema.Struct({
	type: Schema.Literal("json"),
	value: Schema.Unknown
});
const BlobValue = Schema.Struct({
	type: Schema.Literal("blob"),
	value: Schema.String,
	mimeType: Schema.String,
	size: Schema.Number,
	filename: Schema.optional(Schema.String)
});
const TripleValue = Schema.Union([
	StringValue,
	NumberValue,
	IntegerValue,
	BooleanValue,
	DateTimeValue,
	RefValue,
	JsonValue,
	BlobValue
]);
const string = (value) => ({
	type: "string",
	value
});
const number = (value) => ({
	type: "number",
	value
});
/** Numbers are excluded: their original integer may already be rounded. */
const integer = (value) => {
	if (typeof value !== "bigint" && (typeof value !== "string" || !/^[+-]?\d+$/.test(value))) throw new TypeError("Exact integers require bigint or decimal text");
	const parsed = BigInt(value);
	if (parsed < -9223372036854775808n || parsed > 9223372036854775807n) throw new RangeError("Signed 64-bit integer overflow");
	return {
		type: "integer",
		value: parsed.toString()
	};
};
const boolean = (value) => ({
	type: "boolean",
	value
});
const datetime = (value) => ({
	type: "datetime",
	value: typeof value === "number" ? value : value.getTime()
});
const ref = (entityId) => ({
	type: "ref",
	value: entityId
});
const json = (value) => ({
	type: "json",
	value
});
const blob = (hash, mimeType, size, filename) => ({
	type: "blob",
	value: hash,
	mimeType,
	size,
	...filename !== void 0 && { filename }
});
//#endregion
export { BlobValue, BooleanValue, DateTimeValue, Int64Decimal, IntegerValue, JsonValue, MAX_INTEGER, MIN_INTEGER, NumberValue, RefValue, StringValue, TripleValue, ValueType, blob, boolean, datetime, integer, json, number, ref, string };

//# sourceMappingURL=Value.js.map