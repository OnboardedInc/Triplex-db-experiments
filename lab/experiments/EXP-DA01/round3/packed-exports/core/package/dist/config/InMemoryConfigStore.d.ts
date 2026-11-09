import { CanonicalEncodingError, CanonicalValue } from "../content/CanonicalJson.js";
import { ContentId } from "../content/ContentId.js";
import { TypeExpr } from "./TypeExpr.js";
import { ConfigNode, ConflictingClosureEntryError, DuplicateChildKeyError } from "./ConfigNode.js";
import { Effect } from "effect";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/config/InMemoryConfigStore.d.ts
declare namespace InMemoryConfigStore_d_exports {
  export { CommitResult, ConfigSnapshot, DanglingRefError, DuplicateObjectError, InMemoryConfigStore, ObjectChange, ObjectKey, RecheckResult, Revision, StoredObject, UnknownSnapshotError, changesBetween, commit, empty, historyOf, recheck, resolveRef, revisionById, setRef, snapshotById, tipOf, validityOf };
}
interface StoredObject {
  readonly cid: ContentId;
  readonly kind: string;
  /** Exactly the value that was hashed. */
  readonly body: CanonicalValue;
  /**
   * Every schema this exact body is known to satisfy, not just the one that
   * wrote it. Grows monotonically: when a new shape is deployed and proven to
   * subsume one already in this set, the body is revalidated for free.
   *
   * Content addressing makes this cheap in the way that matters. Two hundred
   * forms sharing an identical field body share one entry, so the set is
   * maintained per distinct configuration rather than per occurrence of it.
   */
  readonly validUnder: ReadonlyArray<ContentId>;
}
interface ObjectKey {
  readonly kind: string;
  readonly key: string;
}
interface Revision {
  readonly id: ContentId;
  readonly seq: number;
  readonly kind: string;
  readonly key: string;
  /** Identity of the data alone. */
  readonly cid: ContentId;
  /** Every distinct projection schema used in the subtree, sorted. */
  readonly schemaCids: ReadonlyArray<ContentId>;
  /** `cid` + `schemaCids`: what a snapshot pins. */
  readonly stamp: ContentId;
  /** `cid` + the content ids of everything it transitively depends on. */
  readonly closureCid: ContentId;
  readonly deps: ReadonlyArray<ObjectKey>;
  /** The revision this one superseded, or null for the first. */
  readonly parentId: ContentId | null;
}
interface ConfigSnapshot {
  readonly id: ContentId;
  readonly seq: number;
  readonly label: string;
  readonly rootCid: ContentId;
  /** Retained so `ConfigNode.diff` can walk two snapshots directly. */
  readonly root: ConfigNode;
  readonly revisionIds: ReadonlyArray<ContentId>;
  readonly parentId: ContentId | null;
}
interface InMemoryConfigStore {
  readonly objects: ReadonlyMap<ContentId, StoredObject>;
  /** Append-only log of every projection shape ever used. */
  readonly schemas: ReadonlyMap<ContentId, TypeExpr>;
  readonly revisions: ReadonlyArray<Revision>;
  readonly snapshots: ReadonlyArray<ConfigSnapshot>;
  /** Ref name (`live`, `test`) to snapshot id. */
  readonly refs: ReadonlyMap<string, ContentId>;
  readonly seq: number;
}
declare const DanglingRefError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "DanglingRefError";
} & Readonly<A>;
declare class DanglingRefError extends DanglingRefError_base<{
  readonly from: ObjectKey;
  readonly to: ObjectKey;
  readonly message: string;
}> {}
declare const DuplicateObjectError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "DuplicateObjectError";
} & Readonly<A>;
declare class DuplicateObjectError extends DuplicateObjectError_base<{
  readonly object: ObjectKey;
  readonly message: string;
}> {}
declare const UnknownSnapshotError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "UnknownSnapshotError";
} & Readonly<A>;
declare class UnknownSnapshotError extends UnknownSnapshotError_base<{
  readonly id: string;
  readonly message: string;
}> {}
declare const empty: () => InMemoryConfigStore;
/** Newest-first revision chain for one logical object. */
declare const historyOf: (store: InMemoryConfigStore, object: ObjectKey) => ReadonlyArray<Revision>;
declare const tipOf: (store: InMemoryConfigStore, object: ObjectKey) => Revision | undefined;
declare const revisionById: (store: InMemoryConfigStore, id: string) => Revision | undefined;
declare const snapshotById: (store: InMemoryConfigStore, id: string) => ConfigSnapshot | undefined;
declare const resolveRef: (store: InMemoryConfigStore, name: string) => ConfigSnapshot | undefined;
/**
 * Point a ref at a snapshot. This is the entire deploy primitive: promoting a
 * snapshot to live and rolling back to the previous one are the same operation
 * in opposite directions, and neither copies or rewrites any configuration.
 */
declare const setRef: (store: InMemoryConfigStore, name: string, snapshotId: ContentId) => Effect.Effect<InMemoryConfigStore, UnknownSnapshotError>;
interface CommitResult {
  readonly store: InMemoryConfigStore;
  readonly snapshot: ConfigSnapshot;
  /** Revisions minted by this commit; unchanged objects are absent. */
  readonly created: ReadonlyArray<Revision>;
}
/**
 * Record a complete set of objects as one snapshot.
 *
 * The whole set is required, not a delta. That is the point of the exercise:
 * a form is only meaningful alongside the attributes it reads, the policy that
 * distributes it and the automations it triggers, so the unit that gets
 * versioned and deployed is the graph, not the form.
 */
declare const commit: (store: InMemoryConfigStore, input: {
  readonly label: string;
  readonly objects: ReadonlyArray<ConfigNode>;
}) => Effect.Effect<CommitResult, DanglingRefError | DuplicateObjectError | DuplicateChildKeyError | ConflictingClosureEntryError | CanonicalEncodingError>;
type ObjectChange = {
  readonly _tag: "ObjectAdded";
  readonly kind: string;
  readonly key: string;
  readonly to: Revision;
} | {
  readonly _tag: "ObjectRemoved";
  readonly kind: string;
  readonly key: string;
  readonly from: Revision;
} | {
  readonly _tag: "ObjectChanged";
  readonly kind: string;
  readonly key: string;
  readonly from: Revision;
  readonly to: Revision; /** The object's own configuration moved. */
  readonly dataChanged: boolean; /** A different projection schema wrote it. */
  readonly schemaChanged: boolean;
  /**
   * Something it depends on moved. True with `dataChanged` false is the
   * interesting case: this object would behave differently despite nobody
   * having edited it.
   */
  readonly closureChanged: boolean;
};
/**
 * Object-level summary of what moved between two snapshots.
 *
 * Pair it with `ConfigNode.diff(from.root, to.root)` when you need the
 * field-level detail; this answers the deploy-screen question of which objects
 * a release touches and, crucially, which it touches only indirectly.
 */
declare const changesBetween: (store: InMemoryConfigStore, from: ConfigSnapshot, to: ConfigSnapshot) => ReadonlyArray<ObjectChange>;
interface RecheckResult {
  /** Bodies already known valid, or proven valid by subsumption alone. */
  readonly compatible: ReadonlyArray<ContentId>;
  /** Bodies that needed validating and passed. */
  readonly revalidated: ReadonlyArray<ContentId>;
  /** Bodies the candidate schema rejects. Each is config that would break. */
  readonly violations: ReadonlyArray<{
    readonly cid: ContentId;
    readonly key: string;
  }>;
}
/**
 * Would every stored body of `kind` still parse under a candidate schema?
 *
 * This is the question worth asking in CI, before the code that narrows a
 * projection merges. Today the equivalent failure is discovered when a
 * customer's form fails to load, because nothing records which shapes the
 * stored configuration was ever known to satisfy.
 *
 * Synchronous, which it was not before: with `TypeSubsumption` total there is
 * no schema-projection step that can fail, so the only remaining work is
 * comparison and, for the last tier, decoding.
 *
 * It answers in three tiers, cheapest first. A body already listing the
 * candidate in `validUnder` costs nothing. A body whose known schema is proven
 * to subsume the candidate costs one structural comparison, amortised across
 * every body sharing that schema. Only what is left gets decoded, which is why
 * `TypeSubsumption` being total is what keeps that last tier rare.
 */
declare const recheck: (store: InMemoryConfigStore, input: {
  readonly kind: string;
  readonly type: TypeExpr;
}) => RecheckResult;
/** Schemas this exact body is known to satisfy. */
declare const validityOf: (store: InMemoryConfigStore, cid: ContentId) => ReadonlyArray<ContentId>;
//#endregion
export { CommitResult, ConfigSnapshot, DanglingRefError, DuplicateObjectError, InMemoryConfigStore, InMemoryConfigStore_d_exports, ObjectChange, ObjectKey, RecheckResult, Revision, StoredObject, UnknownSnapshotError, changesBetween, commit, empty, historyOf, recheck, resolveRef, revisionById, setRef, snapshotById, tipOf, validityOf };
//# sourceMappingURL=InMemoryConfigStore.d.ts.map