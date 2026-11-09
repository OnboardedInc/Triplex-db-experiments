import { EntityId } from "../Branded.js";
import { IntegerValue, TripleValue } from "../Value.js";
import { CanonicalEncodingError } from "../content/CanonicalJson.js";
import { TypeExpr } from "./TypeExpr.js";
import { ConfigNode, DuplicateChildKeyError } from "./ConfigNode.js";
import { Effect, Schema } from "effect";

//#region src/config/Attribute.d.ts
declare namespace Attribute_d_exports {
  export { AnyDefinition, Assertion, AssertionOptions, Cardinality, CardinalityOf, Definition, KIND, RefDefinition, RefTargetOf, RequiredOf, Use, UseOptions, ValueOf, assertion, boolean, date, enumOf, instant, int64, integer, number, ref, text, use };
}
declare const KIND = "attribute";
interface AssertionOptions {
  /** Domain-valid time carried by the assertion descriptor. */
  readonly validFrom?: number;
}
interface Assertion<K extends string = string> {
  readonly attribute: K;
  readonly value: TripleValue;
  readonly validFrom?: number;
}
interface Definition<K extends string, V> {
  readonly _tag: "Attribute";
  readonly key: K;
  readonly type: TypeExpr;
  readonly node: Effect.Effect<ConfigNode, DuplicateChildKeyError | CanonicalEncodingError | Schema.SchemaError>;
  readonly encode: (value: V) => TripleValue;
}
interface UseOptions {
  readonly required?: boolean;
  readonly cardinality?: "one" | "many";
  /** Values of this attribute may occur on at most one entity of this type. */
  readonly unique?: boolean;
}
type Cardinality = "one" | "many";
/**
 * [EXP-R01] Why: the typed repository derives document, input and include types from
 * handles, so the usage flags must stay literal (`true`, `"many"`) instead of widening to
 * `boolean` / `"one" | "many"`. The defaults keep every existing `Use<D>` annotation valid.
 * Inspired by: lab/research/R3-orm-prior-art.md section 5.1 and R9 change 6.
 * Rejected: caller-asserted model generics (unsound; a caller could claim any shape).
 */
interface Use<D extends Definition<string, unknown>, Req extends boolean = boolean, Card extends Cardinality = Cardinality> {
  readonly _tag: "AttributeUse";
  readonly attribute: D;
  readonly required: Req;
  readonly cardinality: Card;
  readonly unique: boolean;
}
/**
 * Literal requiredness of a `use` call. A literal `true`/`false` stays literal; a widened
 * `boolean` stays `boolean`, so a computed option can never be typed narrower than runtime.
 */
type RequiredOf<O> = "required" extends keyof O ? LiteralRequired<O["required" & keyof O]> : false;
type LiteralRequired<R> = R extends true ? true : R extends false | undefined ? false : boolean;
/** Literal cardinality of a `use` call; a widened option stays `"one" | "many"`. */
type CardinalityOf<O> = "cardinality" extends keyof O ? LiteralCardinality<O["cardinality" & keyof O]> : "one";
type LiteralCardinality<C> = C extends "many" ? "many" : "one";
type AnyDefinition = Definition<string, any>;
type ValueOf<D> = D extends Definition<string, infer V> ? V : never;
/**
 * A ref definition remembers its target entity type at the type level and at runtime.
 * [EXP-R01] Why: `include` may only expand ref attributes, and only to the declared target.
 */
type RefDefinition<K extends string, Target extends string> = Definition<K, EntityId> & {
  readonly refTarget: Target;
};
/** Target entity type of a ref definition, or `never` for non-ref definitions. */
type RefTargetOf<D> = D extends {
  readonly refTarget: infer T extends string;
} ? T : never;
declare const text: <const K extends string>(key: K) => Definition<K, string>;
declare const number: <const K extends string>(key: K) => Definition<K, number>;
declare const integer: <const K extends string>(key: K) => Definition<K, number>;
/** Exact integers use their tagged lossless public value, separately from legacy JS integers. */
declare const int64: <const K extends string>(key: K) => Definition<K, IntegerValue>;
declare const boolean: <const K extends string>(key: K) => Definition<K, boolean>;
declare const date: <const K extends string>(key: K) => Definition<K, string>;
declare const instant: <const K extends string>(key: K) => Definition<K, number | Date>;
declare const enumOf: <const K extends string, const V extends string>(key: K, values: ReadonlyArray<V>) => Definition<K, V>;
/** A relation attribute whose values are entity ids of `target`. */
declare const ref: <const K extends string, const Target extends {
  readonly entityType: string;
}>(key: K, target: Target) => RefDefinition<K, Target["entityType"]>;
/** Requiredness and cardinality belong to an entity's use, not the global attribute. */
declare const use: <D extends AnyDefinition, const O extends UseOptions = {}>(attribute: D, options?: O) => Use<D, RequiredOf<O>, CardinalityOf<O>>;
declare const assertion: <D extends AnyDefinition>(definition: D, value: ValueOf<D>, options?: AssertionOptions) => Assertion<D["key"]>;
//#endregion
export { AnyDefinition, Assertion, AssertionOptions, Attribute_d_exports, Cardinality, CardinalityOf, Definition, KIND, RefDefinition, RefTargetOf, RequiredOf, Use, UseOptions, ValueOf, assertion, boolean, date, enumOf, instant, int64, integer, number, ref, text, use };
//# sourceMappingURL=Attribute.d.ts.map