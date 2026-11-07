/**
 * R3 API sketch. Types only. Checked with tsc against packages/core/dist declarations.
 * Anything marked CORE-CHANGE needs an edit in packages/core before it can type-check there.
 */
import type { Effect } from "effect";
import type { EntityId, TemporalBasis, TransactOp, TransactionMeta, TransactionResult } from "@triplex-build/triplex";
import type { Attribute, TypeExpr } from "@triplex-build/triplex/config";
import type { NativeQueryContract, NativeReadOptions, NativeQueryTrace, ReadError } from "@triplex-build/triplex/runtime";

// ---------------------------------------------------------------------------
// 1. Models keep the literal usage flags. CORE-CHANGE (Attribute.use / EntityType.make
//    currently widen `required` to boolean and `cardinality` to "one" | "many").
// ---------------------------------------------------------------------------
export type Cardinality = "one" | "many";

export interface Handle<
  D extends Attribute.AnyDefinition = Attribute.AnyDefinition,
  Req extends boolean = boolean,
  Card extends Cardinality = Cardinality,
  RefTo extends string = never, // CORE-CHANGE: Attribute.ref records the target entity type name
> {
  readonly key: D["key"];
  readonly definition: D;
  readonly required: Req;
  readonly cardinality: Card;
  readonly refTarget?: RefTo;
}

export interface Model<N extends string = string, H extends Readonly<Record<string, Handle<any, boolean, Cardinality, any>>> = Readonly<Record<string, Handle<any, boolean, Cardinality, any>>>> {
  readonly entityType: N;
  readonly attributes: H;
}
export type AnyModel = Model<string, Readonly<Record<string, Handle<any, boolean, Cardinality, any>>>>;
/** Models known to a repository set, keyed by entity type name; resolves `include` targets. */
export type Models = Readonly<Record<string, AnyModel>>;

// ---------------------------------------------------------------------------
// 2. Documents. Absent optional attribute = property missing (never null). Many = always an array.
// ---------------------------------------------------------------------------
type ValueOfHandle<H> = H extends Handle<infer D, any, infer C, any>
  ? C extends "many" ? ReadonlyArray<Attribute.ValueOf<D>> : Attribute.ValueOf<D>
  : never;
type AlwaysPresent<A> = {
  [P in keyof A]: A[P] extends Handle<any, true, "one", any> ? P : A[P] extends Handle<any, boolean, "many", any> ? P : never;
}[keyof A];
type MaybeAbsent<A> = Exclude<keyof A, AlwaysPresent<A>>;

export type Doc<M extends AnyModel> = {
  readonly $id: EntityId;
  readonly $type: M["entityType"];
} & { readonly [P in AlwaysPresent<M["attributes"]>]: ValueOfHandle<M["attributes"][P]> }
  & { readonly [P in MaybeAbsent<M["attributes"]>]?: ValueOfHandle<M["attributes"][P]> };

/** Doc with ref attributes replaced by nested docs for the keys named in `I`. */
type RefTargetName<H> = H extends Handle<any, any, any, infer T> ? ([T] extends [never] ? never : T) : never;
export type Include<M extends AnyModel> = {
  readonly [P in keyof M["attributes"] as [RefTargetName<M["attributes"][P]>] extends [never] ? never : P]?:
    true | { readonly limit?: number };
};
export type Expanded<M extends AnyModel, All extends Models, I> = Omit<Doc<M>, keyof I & string> & {
  readonly [P in keyof I & keyof M["attributes"]]: RefTargetName<M["attributes"][P]> extends keyof All
    ? M["attributes"][P] extends Handle<any, any, "many", any>
      ? ReadonlyArray<Doc<All[RefTargetName<M["attributes"][P]>]>>
      : Doc<All[RefTargetName<M["attributes"][P]>]> | undefined
    : never;
};

// ---------------------------------------------------------------------------
// 3. Reads. A repository is a view: the basis is closed over, like a Datomic db value.
// ---------------------------------------------------------------------------
export interface Basis {
  readonly recordedAt?: number;
  readonly recordedPosition: number; // exact commit cut, shared by every page and every include
  readonly validAt: number;
}
export type Predicate<V> =
  | V
  | { readonly in: ReadonlyArray<V> }
  | { readonly exists: boolean }
  | (V extends number ? { readonly gt?: V; readonly gte?: V; readonly lt?: V; readonly lte?: V } : never)
  | (V extends string ? { readonly startsWith: string } : never);
export type Where<M extends AnyModel> = {
  readonly [P in keyof M["attributes"]]?: Predicate<Attribute.ValueOf<M["attributes"][P]["definition"]>>;
};
export interface FindArgs<M extends AnyModel, I extends Include<M>> {
  readonly where?: Where<M>;
  readonly include?: I;
  readonly orderBy?: keyof M["attributes"] | "$id";
  readonly limit?: number;   // default 100, max 1000, as Triples.query
  readonly cursor?: string;  // opaque, binds scope + basis + commit position
}
export interface Page<T> {
  readonly items: ReadonlyArray<T>;
  readonly nextCursor?: string;
  readonly basis: Basis;
}
export interface Assertion<V = unknown> {
  readonly id: string; readonly attribute: string; readonly value: V;
  readonly validFrom: number; readonly validTo?: number;
  readonly recordedAt: number; readonly retractedAt?: number; readonly txId?: string;
}

export interface Repository<M extends AnyModel, All extends Models> {
  readonly model: M;
  /** Closed view. `at({ recordedAt, validAt })` returns a repository that cannot drift to "now". */
  readonly at: (basis: TemporalBasis) => Repository<M, All>;
  readonly get: <const I extends Include<M> = {}>(id: EntityId | string, opts?: { include?: I }) =>
    Effect.Effect<Expanded<M, All, I> | undefined, ReadError>;
  /** One batched read; preserves input order and missing entries (Triples.entities). */
  readonly getMany: (ids: ReadonlyArray<EntityId | string>) => Effect.Effect<ReadonlyArray<Doc<M> | undefined>, ReadError>;
  readonly find: <const I extends Include<M> = {}>(args?: FindArgs<M, I>) => Effect.Effect<Page<Expanded<M, All, I>>, ReadError>;
  readonly count: (where?: Where<M>) => Effect.Effect<number, ReadError>;
  /** All assertions for one attribute, with both time axes. The only way to see intervals. */
  readonly timeline: <K extends keyof M["attributes"]>(id: EntityId | string, attribute: K) =>
    Effect.Effect<ReadonlyArray<Assertion<Attribute.ValueOf<M["attributes"][K]["definition"]>>>, ReadError>;
}

// ---------------------------------------------------------------------------
// 4. Writes build ops. One application command = one transact (docs/agents.md rule 1).
// ---------------------------------------------------------------------------
export interface ValidTime { readonly validFrom?: number; readonly validTo?: number }
export interface WritePlan {
  readonly ops: ReadonlyArray<TransactOp>;
  readonly preconditions: NonNullable<TransactionMeta["preconditions"]>;
}
type MustSupply<A> = { [P in keyof A]: A[P] extends Handle<any, true, Cardinality, any> ? P : never }[keyof A];
export type Input<M extends AnyModel> = {
  readonly [P in MustSupply<M["attributes"]>]: ValueOfHandle<M["attributes"][P]>;
} & { readonly [P in Exclude<keyof M["attributes"], MustSupply<M["attributes"]>>]?: ValueOfHandle<M["attributes"][P]> };
/** `undefined` leaves the attribute alone. `null` retracts live assertions of an optional attribute. */
export type Patch<M extends AnyModel> = {
  readonly [P in keyof M["attributes"]]?: ValueOfHandle<M["attributes"][P]> | (M["attributes"][P] extends Handle<any, false, "one", any> ? null : never);
};
export interface Writer<M extends AnyModel> {
  readonly create: (id: EntityId | string, input: Input<M>, time?: ValidTime) => WritePlan;           // pure
  readonly patch: (id: EntityId | string, patch: Patch<M>, time?: ValidTime) => Effect.Effect<WritePlan, ReadError>; // reads live fact ids
  readonly addValue: <K extends keyof M["attributes"]>(id: EntityId | string, key: K, value: Attribute.ValueOf<M["attributes"][K]["definition"]>, time?: ValidTime) => WritePlan;
  readonly removeValue: <K extends keyof M["attributes"]>(id: EntityId | string, key: K, value: Attribute.ValueOf<M["attributes"][K]["definition"]>) => Effect.Effect<WritePlan, ReadError>;
}
/** Merges plans, pins configSnapshot, derives `enforce` from the same release, then calls Triples.transact once. */
export declare const commit: (
  plans: ReadonlyArray<WritePlan>,
  meta: { readonly actor: string; readonly commandId: string; readonly correlationId?: string; readonly causationId?: string },
) => Effect.Effect<TransactionResult, ReadError>;

// ---------------------------------------------------------------------------
// 5. Native escape hatches. Builds on NativeQueryContract; tags compile to the existing
//    (ctx, params) => string builders, so run(), basis, budgets and traces are unchanged.
// ---------------------------------------------------------------------------
export interface Codec<T> { readonly type: TypeExpr.TypeExpr; readonly optional: boolean; readonly _T?: T }
export interface TypedContract<P, R> extends NativeQueryContract { readonly _P?: P; readonly _R?: R }
type CodecValue<C> = C extends Codec<infer T> ? T : never;
type OptionalKeys<S> = { [K in keyof S]: S[K] extends { readonly optional: true } ? K : never }[keyof S];
type FromCodecs<S> = { readonly [K in Exclude<keyof S, OptionalKeys<S>>]: CodecValue<S[K]> } & { readonly [K in OptionalKeys<S>]?: CodecValue<S[K]> };

export declare const T: {
  readonly text: Codec<string>;
  readonly number: Codec<number>;
  readonly int64: Codec<{ readonly type: "integer"; readonly value: string }>;
  readonly boolean: Codec<boolean>;
  readonly instant: Codec<number>;
  readonly entityId: Codec<EntityId>;
  readonly optional: <A>(c: Codec<A>) => Codec<A> & { readonly optional: true };
  /** Row type derived from the schema handle, never asserted by the caller. */
  readonly attr: <H extends Handle>(h: H) => Codec<ValueOfHandle<H>>;
};
export declare const contract: <const PS extends Readonly<Record<string, Codec<any>>>, const RS extends Readonly<Record<string, Codec<any>>>>(spec: {
  readonly name: string; readonly params: PS; readonly row: RS;
}) => TypedContract<FromCodecs<PS>, FromCodecs<RS>>;

export type Lang = "xtql" | "xtdb-sql" | "sparql";
/** Splicing is only possible through a Fragment. Plain JS values are always bound. */
export interface Fragment<L extends Lang> { readonly _tag: "Fragment"; readonly lang: L; readonly render: (ctx: unknown) => string }
export type Part<L extends Lang> = Fragment<L> | string | number | bigint | boolean | Date | { readonly type: "integer"; readonly value: string } | null;

export interface NativeResult<R> { readonly rows: ReadonlyArray<R>; readonly basis: Basis & { readonly scope: string }; readonly trace: NativeQueryTrace }
export type Tag<L extends Lang, R> = (strings: TemplateStringsArray, ...parts: ReadonlyArray<Part<L>>) => Effect.Effect<NativeResult<R>, ReadError>;

export interface FragmentsFor<L extends Lang> {
  readonly facts: () => Fragment<L>;           // existing ctx.facts()
  readonly recordedFacts: () => Fragment<L>;   // existing ctx.recordedFacts()
  readonly history: () => Fragment<L>;         // existing ctx.history()
  readonly entity: (m: AnyModel, opts?: { readonly counts?: boolean }) => Fragment<L>; // NEW wide relation, one row per entity
  readonly values: (h: Handle) => Fragment<L>;                             // NEW narrow relation, one row per value
  readonly col: (h: Handle) => Fragment<L>;                                // physical column or predicate for a handle
  readonly raw: (trustedText: string) => Fragment<L>;                      // explicit opt-out, visible in review
}
export interface NativeEngine<L extends Lang> extends FragmentsFor<L> {
  readonly query: <P, R>(c: TypedContract<P, R>, input: P, opts?: NativeReadOptions) => Tag<L, R>;
}
export interface Native {
  readonly xtql: NativeEngine<"xtql">;
  readonly sql: NativeEngine<"xtdb-sql">;
  readonly sparql: NativeEngine<"sparql">;
}
