/** Globally identified runtime attribute definitions and usage-local constraints. */

import { Effect, type Schema } from "effect";

import type { TripleValue } from "../Value.js";
import type { EntityId } from "../Branded.js";
import * as Values from "../Value.js";
import * as ConfigNode from "./ConfigNode.js";
import * as TypeExpr from "./TypeExpr.js";

export const KIND = "attribute";

const ATTRIBUTE_KEY = /^:[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$/;

export interface AssertionOptions {
  /** Domain-valid time carried by the assertion descriptor. */
  readonly validFrom?: number;
}

export interface Assertion<K extends string = string> {
  readonly attribute: K;
  readonly value: TripleValue;
  readonly validFrom?: number;
}

export interface Definition<K extends string, V> {
  readonly _tag: "Attribute";
  readonly key: K;
  readonly type: TypeExpr.TypeExpr;
  readonly node: Effect.Effect<
    ConfigNode.ConfigNode,
    | ConfigNode.DuplicateChildKeyError
    | import("../content/CanonicalJson.js").CanonicalEncodingError
    | Schema.SchemaError
  >;
  readonly encode: (value: V) => TripleValue;
}

export interface UseOptions {
  readonly required?: boolean;
  readonly cardinality?: "one" | "many";
  /** Values of this attribute may occur on at most one entity of this type. */
  readonly unique?: boolean;
}

export type Cardinality = "one" | "many";

/**
 * [EXP-R01] Why: the typed repository derives document, input and include types from
 * handles, so the usage flags must stay literal (`true`, `"many"`) instead of widening to
 * `boolean` / `"one" | "many"`. The defaults keep every existing `Use<D>` annotation valid.
 * Inspired by: lab/research/R3-orm-prior-art.md section 5.1 and R9 change 6.
 * Rejected: caller-asserted model generics (unsound; a caller could claim any shape).
 */
export interface Use<
  D extends Definition<string, unknown>,
  Req extends boolean = boolean,
  Card extends Cardinality = Cardinality,
> {
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
export type RequiredOf<O> = "required" extends keyof O
  ? LiteralRequired<O["required" & keyof O]>
  : false;
type LiteralRequired<R> = R extends true ? true : R extends false | undefined ? false : boolean;
/** Literal cardinality of a `use` call; a widened option stays `"one" | "many"`. */
export type CardinalityOf<O> = "cardinality" extends keyof O
  ? LiteralCardinality<O["cardinality" & keyof O]>
  : "one";
type LiteralCardinality<C> = C extends "many" ? "many" : "one";

export type AnyDefinition = Definition<string, any>;
export type ValueOf<D> = D extends Definition<string, infer V> ? V : never;

/**
 * A ref definition remembers its target entity type at the type level and at runtime.
 * [EXP-R01] Why: `include` may only expand ref attributes, and only to the declared target.
 */
export type RefDefinition<K extends string, Target extends string> = Definition<K, EntityId> & {
  readonly refTarget: Target;
};
/** Target entity type of a ref definition, or `never` for non-ref definitions. */
export type RefTargetOf<D> = D extends { readonly refTarget: infer T extends string } ? T : never;

const DefinitionType = TypeExpr.struct({
  key: TypeExpr.required(TypeExpr.text),
  valueType: TypeExpr.required(TypeExpr.any),
});

const validateKey = <const K extends string>(key: K): K => {
  if (!ATTRIBUTE_KEY.test(key)) {
    throw new TypeError(
      `Attribute identity must be a lowercase namespaced keyword such as :employer/name; received ${key}`,
    );
  }
  return key;
};

const make = <const K extends string, V>(
  keyInput: K,
  type: TypeExpr.TypeExpr,
  encode: (value: V) => TripleValue,
  refs: ReadonlyArray<ConfigNode.ConfigRef> = [],
): Definition<K, V> => {
  const key = validateKey(keyInput);
  return {
    _tag: "Attribute",
    key,
    type,
    encode,
    node: ConfigNode.makeTyped({
      kind: KIND,
      key,
      type: DefinitionType,
      attrs: { key, valueType: type },
      refs,
    }),
  };
};

export const text = <const K extends string>(key: K): Definition<K, string> =>
  make(key, TypeExpr.text, Values.string);

export const number = <const K extends string>(key: K): Definition<K, number> =>
  make(key, TypeExpr.number, Values.number);

export const integer = <const K extends string>(key: K): Definition<K, number> =>
  make(key, TypeExpr.integer, Values.number);

/** Exact integers use their tagged lossless public value, separately from legacy JS integers. */
export const int64 = <const K extends string>(key: K): Definition<K, Values.IntegerValue> =>
  make(key, TypeExpr.int64, (value) => Values.integer(value.value));

export const boolean = <const K extends string>(key: K): Definition<K, boolean> =>
  make(key, TypeExpr.boolean, Values.boolean);

export const date = <const K extends string>(key: K): Definition<K, string> =>
  make(key, TypeExpr.date, Values.string);

export const instant = <const K extends string>(key: K): Definition<K, number | Date> =>
  make(key, TypeExpr.instant, Values.datetime);

export const enumOf = <const K extends string, const V extends string>(
  key: K,
  values: ReadonlyArray<V>,
): Definition<K, V> => make(key, TypeExpr.enumOf(values), (value) => Values.string(value));

/** A relation attribute whose values are entity ids of `target`. */
export const ref = <const K extends string, const Target extends { readonly entityType: string }>(
  key: K,
  target: Target,
): RefDefinition<K, Target["entityType"]> => ({
  ...make<K, EntityId>(key, TypeExpr.ref(target.entityType), Values.ref, [
    {
      rel: "references-entity-type",
      kind: "entity-schema",
      key: target.entityType,
    },
  ]),
  refTarget: target.entityType,
});

/** Requiredness and cardinality belong to an entity's use, not the global attribute. */
export const use = <D extends AnyDefinition, const O extends UseOptions = {}>(
  attribute: D,
  options?: O,
): Use<D, RequiredOf<O>, CardinalityOf<O>> => ({
  _tag: "AttributeUse",
  attribute,
  required: (options?.required ?? false) as RequiredOf<O>,
  cardinality: (options?.cardinality ?? "one") as CardinalityOf<O>,
  unique: options?.unique ?? false,
});

export const assertion = <D extends AnyDefinition>(
  definition: D,
  value: ValueOf<D>,
  options: AssertionOptions = {},
): Assertion<D["key"]> => {
  if (options.validFrom !== undefined && !Number.isFinite(options.validFrom)) {
    throw new TypeError("validFrom must be a finite epoch-millisecond value");
  }
  return {
    attribute: definition.key,
    value: definition.encode(value),
    ...(options.validFrom !== undefined && { validFrom: options.validFrom }),
  };
};
