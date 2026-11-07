/**
 * Model typing: documents, inputs, patches, includes and filters derived from EntityType handles.
 *
 * [EXP-R01] Why: row and document types come from schema handles, never from caller-supplied
 * generics, so a caller cannot assert a shape the data need not have. Absent optional attributes
 * are missing properties (never `null`); cardinality-many is always an array (decision D5).
 * Property names are the handle aliases; physical names come from keys (ProjectionSpec).
 * Inspired by: lab/research/R3-artifacts/api-sketch.ts sections 1-4 and usage.ts.
 * Rejected: `null` for absent values (D5); `Doc<T>` over a caller-asserted `T` (unsound).
 */
import type { EntityId } from "../Branded.js";
import type * as Attribute from "../config/Attribute.js";
import type { AttributeHandle } from "../config/EntityType.js";

export type AnyHandle = AttributeHandle<Attribute.AnyDefinition, boolean, Attribute.Cardinality>;

/** Anything shaped like an `EntityType.make(...)` result. */
export interface Model {
  readonly entityType: string;
  readonly attributes: Readonly<Record<string, AnyHandle>>;
}

/** Models known to a repository set, keyed by entity type name; resolves `include` targets. */
export type Models = Readonly<Record<string, Model>>;

type Handles<M extends Model> = M["attributes"];

/** The decoded value of one attribute. Instants decode to epoch milliseconds (never `Date`). */
export type OutputOf<H> =
  H extends AttributeHandle<infer D, boolean, Attribute.Cardinality>
    ? Exclude<Attribute.ValueOf<D>, Date>
    : never;
/** The value accepted on write for one attribute. */
export type InputOf<H> =
  H extends AttributeHandle<infer D, boolean, Attribute.Cardinality> ? Attribute.ValueOf<D> : never;

type Many<H, V> = H extends { readonly cardinality: "many" } ? ReadonlyArray<V> : V;

/** Present on every document: required card-one (literal `true`) and every card-many. */
type AlwaysPresent<A> = {
  [P in keyof A]: A[P] extends { readonly required: true; readonly cardinality: "one" }
    ? P
    : A[P] extends { readonly cardinality: "many" }
      ? P
      : never;
}[keyof A];
type MaybeAbsent<A> = Exclude<keyof A, AlwaysPresent<A>>;

type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** A document of model `M` at a basis. */
export type Doc<M extends Model> = Simplify<
  { readonly $id: EntityId; readonly $type: M["entityType"] } & {
    readonly [P in AlwaysPresent<Handles<M>>]: Many<Handles<M>[P], OutputOf<Handles<M>[P]>>;
  } & {
    readonly [P in MaybeAbsent<Handles<M>>]?: Many<Handles<M>[P], OutputOf<Handles<M>[P]>>;
  }
>;

/** Target entity type of a ref handle, or `never`. */
export type RefTargetOf<H> = H extends { readonly definition: infer D }
  ? Attribute.RefTargetOf<D>
  : never;

/** Ref attributes that may be expanded; each names its declared target. */
export type Include<M extends Model> = {
  readonly [P in keyof Handles<M> as [RefTargetOf<Handles<M>[P]>] extends [never]
    ? never
    : P]?: true;
};

/** `Doc<M>` with the included ref attributes replaced by documents of their targets. */
export type Expanded<M extends Model, All extends Models, I> = Simplify<
  Omit<Doc<M>, keyof I & string> & {
    readonly [P in keyof I & keyof Handles<M>]: RefTargetOf<Handles<M>[P]> extends keyof All
      ? Handles<M>[P] extends { readonly cardinality: "many" }
        ? ReadonlyArray<Doc<All[RefTargetOf<Handles<M>[P]>]>>
        : Doc<All[RefTargetOf<Handles<M>[P]>]> | undefined
      : never;
  }
>;

/** Filter on one attribute value. Ranges only for numbers, `startsWith` only for strings. */
export type Predicate<V> =
  | V
  | { readonly in: ReadonlyArray<V> }
  | { readonly exists: boolean }
  | { readonly not: V }
  | (V extends number
      ? { readonly gt?: V; readonly gte?: V; readonly lt?: V; readonly lte?: V }
      : never)
  | (V extends string ? { readonly startsWith: string } : never);

export type Where<M extends Model> = {
  readonly [P in keyof Handles<M>]?: Predicate<OutputOf<Handles<M>[P]>>;
};

/** Must be supplied on create: required attributes (literal `true`). */
type MustSupply<A> = {
  [P in keyof A]: A[P] extends { readonly required: true } ? P : never;
}[keyof A];

export type Input<M extends Model> = Simplify<
  {
    readonly [P in MustSupply<Handles<M>>]: Many<Handles<M>[P], InputOf<Handles<M>[P]>>;
  } & {
    readonly [P in Exclude<keyof Handles<M>, MustSupply<Handles<M>>>]?: Many<
      Handles<M>[P],
      InputOf<Handles<M>[P]>
    >;
  }
>;

/**
 * `undefined` leaves an attribute alone. `null` retracts every live assertion of an optional
 * card-one attribute; card-many attributes change through `addValue` / `removeValue` or a full
 * replacement array.
 */
export type Patch<M extends Model> = {
  readonly [P in keyof Handles<M>]?:
    | Many<Handles<M>[P], InputOf<Handles<M>[P]>>
    | (Handles<M>[P] extends { readonly required: false; readonly cardinality: "one" }
        ? null
        : never);
};
