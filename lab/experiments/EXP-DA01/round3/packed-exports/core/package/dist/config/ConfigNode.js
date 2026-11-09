import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { encode, encodeOrThrow } from "../content/CanonicalJson.js";
import { Domain, hash } from "../content/ContentId.js";
import { id } from "./TypeExpr.js";
import { normalize } from "./TypeSchema.js";
import { Data, Effect } from "effect";
//#region src/config/ConfigNode.ts
/**
* The merkle node. A `ConfigNode` is one addressable piece of configuration -
* a form, one of its pages, one field on that page, an automation, a policy
* rule, an attribute definition - and its `cid` covers that node plus its
* entire subtree.
*
* Three properties do the work:
*
* 1. **Children are hashed, refs are not.** A child (`page` inside `form`) is
*    nested and contributes its `cid`, so a changed field bubbles up to the
*    form. A ref (a field pointing at attribute `employee.ssn`) contributes
*    only the target's kind and key. That asymmetry is what lets the graph
*    contain real cycles - a form-scoped automation points back at the form
*    that owns it - without the fixpoint problem a pure merkle DAG would hit.
*    Whether a ref's *target* changed is answered by the closure id (see
*    `closureId`), not by the node's own `cid`.
*
* 2. **Identity is semantic, never a row id.** `key` must be derived from
*    meaning - a field's `path`, an automation node's `name`, an attribute's
*    `entityType:path` - never from `id`, `uid`, or a `position` float. The
*    same config copied from an org blueprint into an account, or from live
*    mode into test mode, produces new rows with new uids; keyed by uid those
*    would hash differently and the whole scheme would report drift where
*    there is none. Keyed semantically they hash identically, which is what
*    makes "is test in sync with live" a single `cid` comparison.
*
* 3. **Order is content, but only as ordinal.** Children keep their given
*    order, so reordering two pages changes the form's `cid`. The `position`
*    float that produced that order must NOT be in `attrs`: dragging a field
*    between two others rewrites positions across the page and would otherwise
*    dirty every sibling.
*
* `ENVELOPE_VERSION` is mixed into every hash. It versions the body layout
* below - the `kind` / `key` / `attrs` / `children` / `refs` frame itself - not
* the shape of any particular projection, and it should move roughly never.
* The shape of a projection is versioned automatically by its `TypeExpr` id;
* `makeTyped` and `stamp` for why the two are kept apart.
*/
var ConfigNode_exports = /* @__PURE__ */ __exportAll({
	ConflictingClosureEntryError: () => ConflictingClosureEntryError,
	DuplicateChildKeyError: () => DuplicateChildKeyError,
	ENVELOPE_VERSION: () => 1,
	body: () => body,
	closureId: () => closureId,
	diff: () => diff,
	flatten: () => flatten,
	make: () => make,
	makeTyped: () => makeTyped,
	stamp: () => stamp,
	typeIds: () => typeIds,
	walk: () => walk
});
const ENVELOPE_VERSION = 1;
const NODE_DOMAIN = Domain.configNode;
const CLOSURE_DOMAIN = Domain.configClosure;
const STAMP_DOMAIN = Domain.configStamp;
var DuplicateChildKeyError = class extends Data.TaggedError("DuplicateChildKeyError") {};
var ConflictingClosureEntryError = class extends Data.TaggedError("ConflictingClosureEntryError") {};
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sortRefs = (refs) => [...refs].sort((a, b) => cmp(a.rel, b.rel) || cmp(a.kind, b.kind) || cmp(a.key, b.key)).filter((ref, index, all) => {
	const previous = all[index - 1];
	return previous === void 0 || ref.rel !== previous.rel || ref.kind !== previous.kind || ref.key !== previous.key;
});
const refsValue = (refs) => refs.map((ref) => ({
	rel: ref.rel,
	kind: ref.kind,
	key: ref.key
}));
/**
* The exact value hashed to produce `node.cid`. Persist this, not a re-derived
* shape: the store's job is to hold the bytes the id was computed over.
*/
const body = (node) => ({
	v: 1,
	kind: node.kind,
	key: node.key,
	attrs: node.attrs,
	children: node.children.map((child) => ({
		rel: child.rel,
		cid: child.node.cid
	})),
	refs: refsValue(node.refs)
});
const make = (input) => Effect.gen(function* () {
	const children = input.children ?? [];
	const refs = sortRefs(input.refs ?? []);
	const seen = /* @__PURE__ */ new Set();
	for (const child of children) {
		const slot = `${child.rel} ${child.node.key}`;
		if (seen.has(slot)) return yield* new DuplicateChildKeyError({
			kind: input.kind,
			key: input.key,
			duplicate: `${child.rel}:${child.node.key}`,
			message: `${input.kind} "${input.key}" has two children at ${child.rel}:${child.node.key}; child keys must be unique within a relation`
		});
		seen.add(slot);
	}
	const draft = {
		kind: input.kind,
		key: input.key,
		attrs: input.attrs ?? {},
		children,
		refs
	};
	const encoded = yield* encode(body(draft));
	return {
		...draft,
		cid: hash(NODE_DOMAIN, encoded)
	};
});
/**
* `make`, with `attrs` validated and normalised through an Effect Schema.
*
* This is the intended way to build every projection. The type does three
* jobs at once: it rejects a projector that drifts from the shape it claims to
* emit, it normalises the data so irrelevant differences cannot move the hash
* (see `TypeSchema.normalize`), and it records the type itself, so the store
* can log which shape wrote which object.
*/
const makeTyped = (input) => Effect.gen(function* () {
	const attrs = yield* normalize(input.type, input.attrs);
	return {
		...yield* make({
			...input,
			attrs
		}),
		type: input.type
	};
});
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
const stamp = (node) => Effect.gen(function* () {
	return hash(STAMP_DOMAIN, yield* encode({
		v: 1,
		cid: node.cid,
		schemas: typeIds(node)
	}));
});
/**
* Every distinct projection type used anywhere in the subtree, sorted.
*
* Stored alongside a revision so "a projector changed" is answerable on its own
* rather than only as a stamp that differs for some unstated reason.
*/
const typeIds = (node) => {
	const found = /* @__PURE__ */ new Set();
	for (const { node: nested } of walk(node)) if (nested.type) found.add(id(nested.type));
	return [...found].sort(cmp);
};
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
const closureId = (node, deps) => Effect.gen(function* () {
	const byKey = /* @__PURE__ */ new Map();
	for (const dep of deps) {
		const slot = `${dep.kind} ${dep.key}`;
		const existing = byKey.get(slot);
		if (existing && existing.cid !== dep.cid) return yield* new ConflictingClosureEntryError({
			kind: dep.kind,
			key: dep.key,
			message: `closure for ${node.kind} "${node.key}" got two content ids for ${dep.kind}:${dep.key}`
		});
		byKey.set(slot, dep);
	}
	const sorted = [...byKey.values()].sort((a, b) => cmp(a.kind, b.kind) || cmp(a.key, b.key));
	return hash(CLOSURE_DOMAIN, yield* encode({
		v: 1,
		root: node.cid,
		deps: sorted.map((dep) => ({
			kind: dep.kind,
			key: dep.key,
			cid: dep.cid
		}))
	}));
});
/** Depth-first walk, parents before children. */
function* walk(node, path = "") {
	const here = path === "" ? node.key : path;
	yield {
		node,
		path: here
	};
	for (const child of node.children) yield* walk(child.node, `${here}/${child.rel}:${child.node.key}`);
}
/**
* Every distinct node in the subtree, keyed by cid. Identical subtrees collapse
* to one entry - two forms sharing a page, or the same form in live and test
* mode, store those bytes once.
*/
const flatten = (node) => {
	const out = /* @__PURE__ */ new Map();
	const visit = (current) => {
		if (out.has(current.cid)) return;
		out.set(current.cid, current);
		current.children.forEach((child) => visit(child.node));
	};
	visit(node);
	return out;
};
const encodedOf = (value) => encodeOrThrow(value);
/**
* Structural diff of two subtrees.
*
* This is the whole point of the merkle shape: an unchanged subtree is
* recognised by one string comparison, so diffing an account with a hundred
* thousand config nodes costs work proportional to what actually changed. The
* current whole-export SHA-256 on `task_templates.hash_digest` can only say
* "different" - it cannot say where.
*/
const diff = (before, after, path = "") => {
	const here = path === "" ? after.key : path;
	if (before.cid === after.cid) return [];
	const beforeChildren = new Map(before.children.map((child, index) => [`${child.rel} ${child.node.key}`, {
		child,
		index
	}]));
	const afterChildren = new Map(after.children.map((child, index) => [`${child.rel} ${child.node.key}`, {
		child,
		index
	}]));
	const changes = [];
	let reordered = false;
	for (const [slot, { child, index }] of afterChildren) {
		const previous = beforeChildren.get(slot);
		const childPath = `${here}/${child.rel}:${child.node.key}`;
		if (!previous) {
			changes.push({
				_tag: "Added",
				path: childPath,
				kind: child.node.kind,
				cid: child.node.cid
			});
			continue;
		}
		if (previous.index !== index) reordered = true;
		changes.push(...diff(previous.child.node, child.node, childPath));
	}
	for (const [slot, { child }] of beforeChildren) {
		if (afterChildren.has(slot)) continue;
		changes.push({
			_tag: "Removed",
			path: `${here}/${child.rel}:${child.node.key}`,
			kind: child.node.kind,
			cid: child.node.cid
		});
	}
	changes.unshift({
		_tag: "Changed",
		path: here,
		kind: after.kind,
		from: before.cid,
		to: after.cid,
		attrsChanged: encodedOf(before.attrs) !== encodedOf(after.attrs),
		refsChanged: encodedOf(refsValue(before.refs)) !== encodedOf(refsValue(after.refs)),
		reordered
	});
	return changes;
};
//#endregion
export { ConfigNode_exports, ConflictingClosureEntryError, DuplicateChildKeyError, ENVELOPE_VERSION, body, closureId, diff, flatten, make, makeTyped, stamp, typeIds, walk };

//# sourceMappingURL=ConfigNode.js.map