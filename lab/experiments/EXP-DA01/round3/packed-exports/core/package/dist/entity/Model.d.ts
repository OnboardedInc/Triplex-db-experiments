import { EntityId } from "../Branded.js";
import { AnyDefinition, Cardinality, RefTargetOf as RefTargetOf$1, ValueOf } from "../config/Attribute.js";
import { AttributeHandle } from "../config/EntityType.js";

//#region src/entity/Model.d.ts
type AnyHandle = AttributeHandle<AnyDefinition, boolean, Cardinality>;
/** Anything shaped like an `EntityType.make(...)` result. */
interface Model {
  readonly entityType: string;
  readonly attributes: Readonly<Record<string, AnyHandle>>;
}
/** Models known to a repository set, keyed by entity type name; resolves `include` targets. */
type Models = Readonly<Record<string, Model>>;
type Handles<M extends Model> = M["attributes"];
/** The decoded value of one attribute. Instants decode to epoch milliseconds (never `Date`). */
type OutputOf<H> = H extends AttributeHandle<infer D, boolean, Cardinality> ? Exclude<ValueOf<D>, Date> : never;
/** The value accepted on write for one attribute. */
type InputOf<H> = H extends AttributeHandle<infer D, boolean, Cardinality> ? ValueOf<D> : never;
/**
 * Literal `"many"` is an array, literal `"one"` a scalar; a widened cardinality (computed use
 * options) may be either at runtime, so it is typed as both (VERIFY F7).
 */
type Many<H, V> = H extends {
  readonly cardinality: "many";
} ? ReadonlyArray<V> : H extends {
  readonly cardinality: "one";
} ? V : V | ReadonlyArray<V>;
/** Present on every document: required card-one (literal `true`) and every card-many. */
type AlwaysPresent<A> = { [P in keyof A]: A[P] extends {
  readonly required: true;
  readonly cardinality: "one";
} ? P : A[P] extends {
  readonly cardinality: "many";
} ? P : never }[keyof A];
type MaybeAbsent<A> = Exclude<keyof A, AlwaysPresent<A>>;
type Simplify<T> = { [K in keyof T]: T[K] } & {};
/** A document of model `M` at a basis. */
type Doc<M extends Model> = Simplify<{
  readonly $id: EntityId;
  readonly $type: M["entityType"];
} & { readonly [P in AlwaysPresent<Handles<M>>]: Many<Handles<M>[P], OutputOf<Handles<M>[P]>> } & { readonly [P in MaybeAbsent<Handles<M>>]?: Many<Handles<M>[P], OutputOf<Handles<M>[P]>> }>;
/** Target entity type of a ref handle, or `never`. */
type RefTargetOf<H> = H extends {
  readonly definition: infer D;
} ? RefTargetOf$1<D> : never;
/** Ref attributes that may be expanded; each names its declared target. */
type Include<M extends Model> = { readonly [P in keyof Handles<M> as [RefTargetOf<Handles<M>[P]>] extends [never] ? never : P]?: true };
/** `Doc<M>` with the included ref attributes replaced by documents of their targets. */
type Expanded<M extends Model, All extends Models, I> = Simplify<Omit<Doc<M>, keyof I & string> & { readonly [P in keyof I & keyof Handles<M>]: RefTargetOf<Handles<M>[P]> extends keyof All ? Handles<M>[P] extends {
  readonly cardinality: "many";
} ? ReadonlyArray<Doc<All[RefTargetOf<Handles<M>[P]>]>> : Doc<All[RefTargetOf<Handles<M>[P]>]> | undefined : never }>;
/** Filter on one attribute value. Ranges only for numbers, `startsWith` only for strings. */
type Predicate<V> = V | {
  readonly in: ReadonlyArray<V>;
} | {
  readonly exists: boolean;
} | {
  readonly not: V;
} | (V extends number ? {
  readonly gt?: V;
  readonly gte?: V;
  readonly lt?: V;
  readonly lte?: V;
} : never) | ([V] extends [EntityId] ? never : V extends string ? {
  readonly startsWith: string;
} : never);
type Where<M extends Model> = { readonly [P in keyof Handles<M>]?: Predicate<OutputOf<Handles<M>[P]>> };
/** Must be supplied on create: required attributes (literal `true`). */
type MustSupply<A> = { [P in keyof A]: A[P] extends {
  readonly required: true;
} ? P : never }[keyof A];
type Input<M extends Model> = Simplify<{ readonly [P in MustSupply<Handles<M>>]: Many<Handles<M>[P], InputOf<Handles<M>[P]>> } & { readonly [P in Exclude<keyof Handles<M>, MustSupply<Handles<M>>>]?: Many<Handles<M>[P], InputOf<Handles<M>[P]>> }>;
/**
 * `undefined` leaves an attribute alone. `null` retracts every live assertion of an optional
 * card-one attribute; card-many attributes change through `addValue` / `removeValue` or a full
 * replacement array.
 */
type Patch<M extends Model> = { readonly [P in keyof Handles<M>]?: Many<Handles<M>[P], InputOf<Handles<M>[P]>> | (Handles<M>[P] extends {
  readonly required: false;
  readonly cardinality: "one";
} ? null : never) };
//#endregion
export { AnyHandle, Doc, Expanded, Include, Input, InputOf, Model, Models, OutputOf, Patch, Predicate, RefTargetOf, Where };
//# sourceMappingURL=Model.d.ts.map