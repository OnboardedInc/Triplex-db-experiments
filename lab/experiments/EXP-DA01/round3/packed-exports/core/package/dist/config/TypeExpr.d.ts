import { ContentId } from "../content/ContentId.js";
import { Schema } from "effect";

//#region src/config/TypeExpr.d.ts
declare namespace TypeExpr_d_exports {
  export { Any, Constrained, Constraint, Enum, List, Prim, PrimName, Ref, Struct, StructField, TypeExpr, TypeExprSchema, Union, Value, any, boolean, canonical, constrained, date, enumOf, id, instant, int64, integer, list, max, maxLength, min, minLength, number, optional, pattern, prim, ref, required, struct, text, union };
}
/**
 * Scalars. `instant` is a point in time; `date` is a calendar date with no zone.
 * That distinction cannot be recovered after both collapse to one `datetime`.
 */
/** A literal usable as a struct field's fallback. */
type Value = string | number | boolean | {
  readonly type: "integer";
  readonly value: string;
};
type PrimName = "text" | "number" | "integer" | "int64" | "boolean" | "date" | "instant";
interface Any {
  readonly _tag: "Any";
  readonly v: 1;
}
interface Prim {
  readonly _tag: "Prim";
  readonly v: 1;
  readonly prim: PrimName;
}
interface Enum {
  readonly _tag: "Enum";
  readonly v: 1;
  readonly values: ReadonlyArray<string>;
}
interface Ref {
  readonly _tag: "Ref";
  readonly v: 1;
  readonly kind: string;
}
interface List {
  readonly _tag: "List";
  readonly v: 1;
  readonly item: TypeExpr;
}
interface StructField {
  readonly type: TypeExpr;
  readonly optional: boolean;
  /**
   * Filled in when the field is absent, before hashing.
   *
   * Normalisation, not validation: a fallback changes what bytes a value
   * canonicalises to, so it participates in identity, but it does not change
   * which values are accepted and therefore does not affect subsumption. That
   * split is what lets a config spelling a default out explicitly and one
   * omitting it share a content id.
   */
  readonly fallback?: Value;
}
interface Struct {
  readonly _tag: "Struct";
  readonly v: 1;
  /** Closed: a value carrying a field not named here is invalid. */
  readonly fields: Readonly<Record<string, StructField>>;
}
interface Union {
  readonly _tag: "Union";
  readonly v: 1;
  readonly members: ReadonlyArray<TypeExpr>;
}
interface Constrained {
  readonly _tag: "Constrained";
  readonly v: 1;
  readonly base: TypeExpr;
  readonly constraints: ReadonlyArray<Constraint>;
}
type TypeExpr = Any | Prim | Enum | Ref | List | Struct | Union | Constrained;
type Constraint = {
  readonly _tag: "Pattern";
  readonly regex: string;
} | {
  readonly _tag: "MinLength";
  readonly value: number;
} | {
  readonly _tag: "MaxLength";
  readonly value: number;
} | {
  readonly _tag: "Min";
  readonly value: number;
} | {
  readonly _tag: "Max";
  readonly value: number;
};
declare const any: Any;
declare const prim: (name: PrimName) => Prim;
declare const text: Prim;
declare const number: Prim;
declare const integer: Prim;
/** Tagged exact integer; legacy integer/number keep their JS-number contract and IDs. */
declare const int64: Prim;
declare const boolean: Prim;
declare const date: Prim;
declare const instant: Prim;
/** Values are a set: order is not content and duplicates are not information. */
declare const enumOf: (values: ReadonlyArray<string>) => Enum;
declare const ref: (kind: string) => Ref;
declare const list: (item: TypeExpr) => List;
declare const struct: (fields: Readonly<Record<string, StructField>>) => Struct;
declare const required: (type: TypeExpr) => StructField;
declare const optional: (type: TypeExpr, fallback?: Value) => StructField;
/** Members are a set, ordered canonically so `A | B` and `B | A` are one type. */
declare const union: (members: ReadonlyArray<TypeExpr>) => TypeExpr;
declare const constrained: (base: TypeExpr, constraints: ReadonlyArray<Constraint>) => TypeExpr;
declare const pattern: (regex: string) => Constraint;
declare const minLength: (value: number) => Constraint;
declare const maxLength: (value: number) => Constraint;
declare const min: (value: number) => Constraint;
declare const max: (value: number) => Constraint;
/**
 * Canonical bytes for a type. Constructors already normalise sets on the way
 * in, so this is a straight canonical encoding - the two halves together are
 * what make `A | B` and `B | A` a single id.
 */
declare const canonical: (expr: TypeExpr) => string;
/** The type's content id. Owned end to end: no third-party serializer. */
declare const id: (expr: TypeExpr) => ContentId;
/**
 * A schema for `TypeExpr` itself, so a type read back out of a store or off the
 * wire can be validated like anything else. Note the direction: this describes
 * the *language*, and is written once by us. The types customers create are
 * values of it.
 */
declare const TypeExprSchema: Schema.Codec<TypeExpr>;
//#endregion
export { Any, Constrained, Constraint, Enum, List, Prim, PrimName, Ref, Struct, StructField, TypeExpr, TypeExprSchema, TypeExpr_d_exports, Union, Value, any, boolean, canonical, constrained, date, enumOf, id, instant, int64, integer, list, max, maxLength, min, minLength, number, optional, pattern, prim, ref, required, struct, text, union };
//# sourceMappingURL=TypeExpr.d.ts.map