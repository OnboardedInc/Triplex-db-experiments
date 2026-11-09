import { TypeExpr } from "../config/TypeExpr.js";
import { ConfigSnapshot } from "../config/InMemoryConfigStore.js";
import { Rule } from "../config/GraphConstraint.js";
import { DescriptorCompileError } from "./Errors.js";
import { Effect } from "effect";

//#region src/entity/Descriptors.d.ts
declare namespace Descriptors_d_exports {
  export { AttributeDescriptor, CompiledDescriptors, EntityDescriptor, ExposureHooks, StorageFamily, compile, referenceKinds, storageFamily };
}
/** The `TripleValue` family an attribute's values are stored as. */
type StorageFamily = "string" | "number" | "integer" | "boolean" | "datetime" | "ref" | "json";
interface AttributeDescriptor {
  readonly key: string;
  readonly alias: string;
  readonly type: TypeExpr;
  readonly required: boolean;
  readonly cardinality: "one" | "many";
  readonly unique: boolean;
  readonly storage: StorageFamily;
}
interface EntityDescriptor {
  readonly entityType: string;
  readonly attributes: ReadonlyArray<AttributeDescriptor>;
}
interface CompiledDescriptors {
  readonly snapshotId: ConfigSnapshot["id"];
  readonly label: string;
  /** In snapshot walk order; callers sort for presentation. */
  readonly entities: ReadonlyArray<EntityDescriptor>;
  readonly constraints: ReadonlyArray<Rule>;
}
/**
 * Optional checks a caller adds at fixed points of the compile. Each hook may fail with its own
 * error type, which the compile propagates unchanged.
 */
interface ExposureHooks<E> {
  /** After the entity's struct schema is validated, before its attribute usages are read. */
  readonly beforeAttributes?: (entityType: string) => Effect.Effect<void, E>;
  /** After all usages are decoded, before the schema-fields-match-usages check. */
  readonly afterAttributes?: (entityType: string, attributes: ReadonlyArray<AttributeDescriptor>) => Effect.Effect<void, E>;
  /** After the entity passed every core check. */
  readonly afterEntity?: (entityType: string) => Effect.Effect<void, E>;
  /** After every entity, before reference targets and constraints are resolved. */
  readonly afterEntities?: (entityTypes: ReadonlySet<string>) => Effect.Effect<void, E>;
}
/** Map a type to the single `TripleValue` family it is stored as; throws when ambiguous. */
declare const storageFamily: (expr: TypeExpr, path: string) => StorageFamily;
/** Every entity type a type references, in occurrence order. */
declare const referenceKinds: (expr: TypeExpr) => ReadonlyArray<string>;
/** Compile only persisted release data; no DSL handles are retained or consulted. */
declare const compile: <E = never>(snapshot: ConfigSnapshot, hooks?: ExposureHooks<E>) => Effect.Effect<CompiledDescriptors, DescriptorCompileError | E>;
//#endregion
export { AttributeDescriptor, CompiledDescriptors, Descriptors_d_exports, EntityDescriptor, ExposureHooks, StorageFamily, compile, referenceKinds, storageFamily };
//# sourceMappingURL=Descriptors.d.ts.map