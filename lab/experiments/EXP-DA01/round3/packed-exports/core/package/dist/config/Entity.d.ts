import { CanonicalEncodingError } from "../content/CanonicalJson.js";
import { TypeExpr } from "./TypeExpr.js";
import { ConfigNode, DuplicateChildKeyError } from "./ConfigNode.js";
import { Effect, Schema } from "effect";

//#region src/config/Entity.d.ts
declare namespace Entity_d_exports {
  export { ChildField, Entity, EntityKey, EntityNode, Kind, NodeInput, RefField, children, kind, make, ref, withType };
}
declare const KindBrand: unique symbol;
/**
 * A node's semantic key, branded by the kind it addresses.
 *
 * The brand is the point. `employee.ssn` and `i9` are both strings, and the
 * whole design rests on keys being semantic rather than row ids, so the type
 * system is the only thing that can keep the two apart at a call site.
 */
type EntityKey<Kind extends string> = string & {
  readonly [KindBrand]: Kind;
};
/** A `ConfigNode` known to have been produced by a particular entity. */
type EntityNode<Kind extends string> = ConfigNode & {
  readonly [KindBrand]: Kind;
};
/**
 * The name of a node kind, plus the brand for keys that address it. Declare
 * these before the entities so relations between them can be written in any
 * order, including circularly.
 */
interface Kind<K extends string> {
  readonly name: K;
  /** Brand a key that addresses this kind. */
  readonly key: (raw: string) => EntityKey<K>;
}
declare const kind: <K extends string>(name: K) => Kind<K>;
interface ChildField<K extends string> {
  readonly _tag: "Child";
  readonly target: Kind<K>;
}
interface RefField<K extends string> {
  readonly _tag: "Ref";
  readonly target: Kind<K>;
}
/** Nested and hashed: the child's `cid` flows into the parent's. */
declare const children: <K extends string>(target: Kind<K>) => ChildField<K>;
/** Recorded by kind and key only; cycles are fine, `closureId` covers drift. */
declare const ref: <K extends string>(target: Kind<K>) => RefField<K>;
type ChildFields = Record<string, ChildField<string>>;
type RefFields = Record<string, RefField<string>>;
type KindOf<F> = F extends ChildField<infer K> ? K : F extends RefField<infer K> ? K : never;
interface NodeInput<I, C extends ChildFields, R extends RefFields> {
  readonly attrs: I;
  readonly children?: { readonly [K in keyof C]?: ReadonlyArray<EntityNode<KindOf<C[K]>>> };
  readonly refs?: { readonly [K in keyof R]?: ReadonlyArray<EntityKey<KindOf<R[K]>>> };
}
interface Entity<K extends string, I, C extends ChildFields, R extends RefFields> {
  readonly kind: Kind<K>;
  readonly attrs: TypeExpr;
  readonly childFields: C;
  readonly refFields: R;
  /**
   * Derive this node's key from its own data. One home for the rule, so
   * "semantic, never a row id" is enforced rather than remembered.
   */
  readonly keyOf: (attrs: I) => EntityKey<K>;
  /** Brand a key that already exists, e.g. read back out of the store. */
  readonly key: (raw: string) => EntityKey<K>;
  readonly node: (input: NodeInput<I, C, R>) => Effect.Effect<EntityNode<K>, DuplicateChildKeyError | CanonicalEncodingError | Schema.SchemaError>;
}
declare const make: <K extends string, I, const C extends ChildFields = {}, const R extends RefFields = {}>(definition: {
  readonly kind: Kind<K>;
  readonly attrs: TypeExpr;
  readonly key: (attrs: I) => string;
  readonly children?: C;
  readonly refs?: R;
}) => Entity<K, I, C, R>;
/**
 * Build nodes with a different attrs type than the entity declares.
 *
 * Deploying a widened projection means running the same entity under a new
 * shape, which is the case `TypeSubsumption` exists to make cheap. Rather than
 * duplicating an entity per type generation, override the shape for one build
 * and let the store decide whether that is news.
 */
declare const withType: <K extends string, I, C extends ChildFields, R extends RefFields>(entity: Entity<K, I, C, R>, attrs: TypeExpr) => Entity<K, I, C, R>;
//#endregion
export { ChildField, Entity, EntityKey, EntityNode, Entity_d_exports, Kind, NodeInput, RefField, children, kind, make, ref, withType };
//# sourceMappingURL=Entity.d.ts.map