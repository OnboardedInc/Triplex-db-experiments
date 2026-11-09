import { EntityId } from "../Branded.js";
import { CanonicalEncodingError } from "../content/CanonicalJson.js";
import { CommandAlreadyCommittedError, ConstraintViolationError, DatalogQueryError, ReadError, TransactionConflictError, WriteError } from "../errors/index.js";
import { TypeExpr } from "./TypeExpr.js";
import { ConfigNode, ConflictingClosureEntryError, DuplicateChildKeyError } from "./ConfigNode.js";
import { TransactionResult, Triples } from "../store/Triples.js";
import { CommitResult as CommitResult$1, ConfigSnapshot, DanglingRefError, DuplicateObjectError, InMemoryConfigStore, ObjectChange, ObjectKey, RecheckResult, Revision, StoredObject, UnknownSnapshotError } from "./InMemoryConfigStore.js";
import { Context, Effect, Layer } from "effect";
import * as _$effect_Brand0 from "effect/Brand";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/config/ConfigStore.d.ts
declare namespace ConfigStore_d_exports {
  export { CommitError, CommitInput, CommitResult, ConfigSnapshot, ConfigStore, ConfigStoreService, CorruptConfigStoreError, LoadError, ObjectChange, ObjectKey, RecheckResult, Revision, StoredObject, System, entityId, layer };
}
declare const System: {
  readonly prefix: "_triplex/config/";
  readonly entityType: {
    readonly object: "triplex.config-object";
    readonly type: "triplex.config-type";
    readonly logicalObject: "triplex.config-logical-object";
    readonly revision: "triplex.config-revision";
    readonly snapshot: "triplex.config-snapshot";
    readonly ref: "triplex.config-ref";
  };
  readonly attribute: {
    readonly data: ":triplex/config-data";
    readonly contentId: ":triplex/content-id";
    readonly kind: ":triplex/config-kind";
    readonly key: ":triplex/config-key";
    readonly validUnder: ":triplex/valid-under";
    readonly dependsOn: ":triplex/depends-on";
    readonly target: ":triplex/ref-target";
  };
};
declare const entityId: {
  object: (cid: string) => EntityId;
  type: (cid: string) => EntityId;
  logicalObject: (object: ObjectKey) => string & _$effect_Brand0.Brand<"EntityId">;
  revision: (id: string) => EntityId;
  snapshot: (id: string) => EntityId;
  ref: (name: string) => EntityId;
};
declare const CorruptConfigStoreError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "CorruptConfigStoreError";
} & Readonly<A>;
declare class CorruptConfigStoreError extends CorruptConfigStoreError_base<{
  readonly entityId: string;
  readonly message: string;
}> {}
type LoadError = ReadError | CorruptConfigStoreError;
type CommitError = LoadError | WriteError | TransactionConflictError | CommandAlreadyCommittedError | ConstraintViolationError | DanglingRefError | DuplicateObjectError | UnknownSnapshotError | DuplicateChildKeyError | ConflictingClosureEntryError | CanonicalEncodingError;
interface CommitInput {
  readonly label: string;
  readonly objects: ReadonlyArray<ConfigNode>;
  /** Move this ref in the same transaction that records the release. */
  readonly ref?: string;
}
interface CommitResult extends CommitResult$1 {
  readonly transaction: TransactionResult;
}
interface ConfigStoreService {
  readonly load: () => Effect.Effect<InMemoryConfigStore, LoadError>;
  readonly commit: (input: CommitInput) => Effect.Effect<CommitResult, CommitError>;
  readonly setRef: (name: string, snapshotId: ConfigSnapshot["id"]) => Effect.Effect<ConfigSnapshot, LoadError | WriteError | TransactionConflictError | CommandAlreadyCommittedError | ConstraintViolationError | UnknownSnapshotError>;
  readonly resolveRef: (name: string) => Effect.Effect<ConfigSnapshot | undefined, LoadError>;
  readonly snapshotById: (id: ConfigSnapshot["id"]) => Effect.Effect<ConfigSnapshot | undefined, LoadError>;
  /** Revisions transitively depending on a logical config object. */
  readonly reverseDependencies: (object: ObjectKey) => Effect.Effect<ReadonlyArray<Revision>, LoadError | DatalogQueryError>;
  /** Alias that names the deploy-preview use of the reverse dependency index. */
  readonly impactCandidates: (object: ObjectKey) => Effect.Effect<ReadonlyArray<Revision>, LoadError | DatalogQueryError>;
  readonly recheck: (input: {
    readonly kind: string;
    readonly type: TypeExpr;
  }) => Effect.Effect<RecheckResult, LoadError>;
}
declare const ConfigStore_base: Context.ServiceClass<ConfigStore, "triplex/ConfigStore", ConfigStoreService>;
declare class ConfigStore extends ConfigStore_base {}
declare const layer: Layer.Layer<ConfigStore, never, Triples>;
//#endregion
export { CommitError, CommitInput, CommitResult, type ConfigSnapshot, ConfigStore, ConfigStoreService, ConfigStore_d_exports, CorruptConfigStoreError, LoadError, type ObjectChange, type ObjectKey, type RecheckResult, type Revision, type StoredObject, System, entityId, layer };
//# sourceMappingURL=ConfigStore.d.ts.map