import { CanonicalEncodingError, CanonicalValue } from "../content/CanonicalJson.js";
import { ContentId } from "../content/ContentId.js";
import { TypeExpr } from "./TypeExpr.js";
import { Effect, Schema } from "effect";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/config/ConfigNode.d.ts
declare namespace ConfigNode_d_exports {
  export { ClosureEntry, ConfigChange, ConfigChild, ConfigNode, ConfigRef, ConflictingClosureEntryError, DuplicateChildKeyError, ENVELOPE_VERSION, body, closureId, diff, flatten, make, makeTyped, stamp, typeIds, walk };
}
declare const ENVELOPE_VERSION = 1;
interface ConfigRef {
  /** Why the edge exists: `uses_attribute`, `scopes_form`, `creates_task`. */
  readonly rel: string;
  readonly kind: string;
  readonly key: string;
}
interface ConfigChild {
  readonly rel: string;
  readonly node: ConfigNode;
}
interface ConfigNode {
  readonly kind: string;
  readonly key: string;
  readonly attrs: CanonicalValue;
  readonly children: ReadonlyArray<ConfigChild>;
  readonly refs: ReadonlyArray<ConfigRef>;
  readonly cid: ContentId;
  /**
   * The type `attrs` was validated and normalised through, when the node came
   * from `makeTyped`. Deliberately NOT part of `cid` - see `stamp`.
   */
  readonly type?: TypeExpr;
}
declare const DuplicateChildKeyError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "DuplicateChildKeyError";
} & Readonly<A>;
declare class DuplicateChildKeyError extends DuplicateChildKeyError_base<{
  readonly kind: string;
  readonly key: string;
  readonly duplicate: string;
  readonly message: string;
}> {}
declare const ConflictingClosureEntryError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "ConflictingClosureEntryError";
} & Readonly<A>;
declare class ConflictingClosureEntryError extends ConflictingClosureEntryError_base<{
  readonly kind: string;
  readonly key: string;
  readonly message: string;
}> {}
/**
 * The exact value hashed to produce `node.cid`. Persist this, not a re-derived
 * shape: the store's job is to hold the bytes the id was computed over.
 */
declare const body: (node: {
  readonly kind: string;
  readonly key: string;
  readonly attrs: CanonicalValue;
  readonly children: ReadonlyArray<ConfigChild>;
  readonly refs: ReadonlyArray<ConfigRef>;
}) => CanonicalValue;
declare const make: (input: {
  readonly kind: string;
  readonly key: string;
  readonly attrs?: CanonicalValue;
  readonly children?: ReadonlyArray<ConfigChild>;
  readonly refs?: ReadonlyArray<ConfigRef>;
}) => Effect.Effect<ConfigNode, DuplicateChildKeyError | CanonicalEncodingError>;
/**
 * `make`, with `attrs` validated and normalised through an Effect Schema.
 *
 * This is the intended way to build every projection. The type does three
 * jobs at once: it rejects a projector that drifts from the shape it claims to
 * emit, it normalises the data so irrelevant differences cannot move the hash
 * (see `TypeSchema.normalize`), and it records the type itself, so the store
 * can log which shape wrote which object.
 */
declare const makeTyped: (input: {
  readonly kind: string;
  readonly key: string;
  readonly type: TypeExpr;
  readonly attrs: unknown;
  readonly children?: ReadonlyArray<ConfigChild>;
  readonly refs?: ReadonlyArray<ConfigRef>;
}) => Effect.Effect<ConfigNode, DuplicateChildKeyError | CanonicalEncodingError | Schema.SchemaError>;
/**
 * The id of a node *as produced by a particular set of projectors*: its data id
 * combined with every schema used anywhere in its subtree.
 *
 * Snapshots pin stamps, not bare `cid`s, so a snapshot is reproducible - it
 * records both what the config said and how it was read. But `cid` itself stays
 * schema-free on purpose. Adding one optional field to a projection schema
 * would otherwise change the id of every object of that kind, and the deploy UI
 * would show ten thousand forms as "changed" when none of them were. Keeping
 * the two apart lets that render as what it is: no data changes, one new
 * projector shape.
 *
 * The subtree matters rather than just the root: a form's own attrs are written
 * by one schema, but its pages and fields are written by others, and a widened
 * *field* schema has to be visible on the form that contains it. Distinct
 * schemas are collected as a sorted set, so two fields sharing a shape count
 * once and reordering them does not move the stamp.
 */
declare const stamp: (node: ConfigNode) => Effect.Effect<ContentId, CanonicalEncodingError>;
/**
 * Every distinct projection type used anywhere in the subtree, sorted.
 *
 * Stored alongside a revision so "a projector changed" is answerable on its own
 * rather than only as a stamp that differs for some unstated reason.
 */
declare const typeIds: (node: ConfigNode) => ReadonlyArray<ContentId>;
interface ClosureEntry {
  readonly kind: string;
  readonly key: string;
  readonly cid: ContentId;
}
/**
 * The id of a node *together with everything it depends on*.
 *
 * `node.cid` answers "did this form change?". `closureId` answers "would this
 * form behave differently?" - it changes when a referenced attribute is
 * retyped or a referenced policy is edited, even though the form's own bytes
 * are untouched. That is the question the current per-object version numbers
 * cannot answer at all.
 *
 * Deps carry their *content* ids, not their closure ids. That keeps the
 * computation a single pass over a set instead of a fixpoint over a graph, and
 * it terminates on cycles. The cost is that a change two hops away only moves
 * the closure id if the intermediate object is also in `deps`, so callers must
 * pass the transitive dependency set, not the direct one.
 */
declare const closureId: (node: ConfigNode, deps: Iterable<ClosureEntry>) => Effect.Effect<ContentId, ConflictingClosureEntryError | CanonicalEncodingError>;
/** Depth-first walk, parents before children. */
declare function walk(node: ConfigNode, path?: string): Generator<{
  readonly node: ConfigNode;
  readonly path: string;
}>;
/**
 * Every distinct node in the subtree, keyed by cid. Identical subtrees collapse
 * to one entry - two forms sharing a page, or the same form in live and test
 * mode, store those bytes once.
 */
declare const flatten: (node: ConfigNode) => ReadonlyMap<ContentId, ConfigNode>;
type ConfigChange = {
  readonly _tag: "Added";
  readonly path: string;
  readonly kind: string;
  readonly cid: ContentId;
} | {
  readonly _tag: "Removed";
  readonly path: string;
  readonly kind: string;
  readonly cid: ContentId;
} | {
  readonly _tag: "Changed";
  readonly path: string;
  readonly kind: string;
  readonly from: ContentId;
  readonly to: ContentId;
  readonly attrsChanged: boolean;
  readonly refsChanged: boolean; /** True when children kept their keys but moved position. */
  readonly reordered: boolean;
};
/**
 * Structural diff of two subtrees.
 *
 * This is the whole point of the merkle shape: an unchanged subtree is
 * recognised by one string comparison, so diffing an account with a hundred
 * thousand config nodes costs work proportional to what actually changed. The
 * current whole-export SHA-256 on `task_templates.hash_digest` can only say
 * "different" - it cannot say where.
 */
declare const diff: (before: ConfigNode, after: ConfigNode, path?: string) => ReadonlyArray<ConfigChange>;
//#endregion
export { ClosureEntry, ConfigChange, ConfigChild, ConfigNode, ConfigNode_d_exports, ConfigRef, ConflictingClosureEntryError, DuplicateChildKeyError, ENVELOPE_VERSION, body, closureId, diff, flatten, make, makeTyped, stamp, typeIds, walk };
//# sourceMappingURL=ConfigNode.d.ts.map