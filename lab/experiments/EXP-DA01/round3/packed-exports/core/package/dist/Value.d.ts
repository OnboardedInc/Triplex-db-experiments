import { EntityId } from "./Branded.js";
import { Schema } from "effect";
import * as _$effect_Brand0 from "effect/Brand";
import * as _$effect_Effect0 from "effect/Effect";

//#region src/Value.d.ts
declare const ValueType: Schema.Literals<readonly ["string", "number", "integer", "boolean", "datetime", "ref", "json", "blob"]>;
type ValueType = typeof ValueType.Type;
declare const StringValue: Schema.Struct<{
  readonly type: Schema.Literal<"string">;
  readonly value: Schema.String;
}>;
type StringValue = typeof StringValue.Type;
declare const NumberValue: Schema.Struct<{
  readonly type: Schema.Literal<"number">;
  readonly value: Schema.Number;
}>;
type NumberValue = typeof NumberValue.Type;
declare const MIN_INTEGER = -9223372036854775808n;
declare const MAX_INTEGER = 9223372036854775807n;
/** Exact signed 64-bit integer. Decimal text is the lossless wire payload. */
declare const Int64Decimal: Schema.String;
declare const IntegerValue: Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>;
type IntegerValue = typeof IntegerValue.Type;
declare const BooleanValue: Schema.Struct<{
  readonly type: Schema.Literal<"boolean">;
  readonly value: Schema.Boolean;
}>;
type BooleanValue = typeof BooleanValue.Type;
declare const DateTimeValue: Schema.Struct<{
  readonly type: Schema.Literal<"datetime">;
  readonly value: Schema.Number;
}>;
type DateTimeValue = typeof DateTimeValue.Type;
declare const RefValue: Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  };
}>;
type RefValue = typeof RefValue.Type;
declare const JsonValue: Schema.Struct<{
  readonly type: Schema.Literal<"json">;
  readonly value: Schema.Unknown;
}>;
type JsonValue = typeof JsonValue.Type;
declare const BlobValue: Schema.Struct<{
  readonly type: Schema.Literal<"blob">;
  readonly value: Schema.String;
  readonly mimeType: Schema.String;
  readonly size: Schema.Number;
  readonly filename: Schema.optional<Schema.String>;
}>;
type BlobValue = typeof BlobValue.Type;
declare const TripleValue: Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"string">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"number">;
  readonly value: Schema.Number;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"boolean">;
  readonly value: Schema.Boolean;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"datetime">;
  readonly value: Schema.Number;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  };
}>, Schema.Struct<{
  readonly type: Schema.Literal<"json">;
  readonly value: Schema.Unknown;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"blob">;
  readonly value: Schema.String;
  readonly mimeType: Schema.String;
  readonly size: Schema.Number;
  readonly filename: Schema.optional<Schema.String>;
}>]>;
type TripleValue = typeof TripleValue.Type;
declare const string: (value: string) => StringValue;
declare const number: (value: number) => NumberValue;
/** Numbers are excluded: their original integer may already be rounded. */
declare const integer: (value: bigint | string) => IntegerValue;
declare const boolean: (value: boolean) => BooleanValue;
declare const datetime: (value: number | Date) => DateTimeValue;
declare const ref: (entityId: EntityId) => RefValue;
declare const json: (value: unknown) => JsonValue;
declare const blob: (hash: string, mimeType: string, size: number, filename?: string) => BlobValue;
//#endregion
export { BlobValue, BooleanValue, DateTimeValue, Int64Decimal, IntegerValue, JsonValue, MAX_INTEGER, MIN_INTEGER, NumberValue, RefValue, StringValue, TripleValue, ValueType, blob, boolean, datetime, integer, json, number, ref, string };
//# sourceMappingURL=Value.d.ts.map