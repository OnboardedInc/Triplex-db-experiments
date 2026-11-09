import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { makeTyped } from "./ConfigNode.js";
import { Effect } from "effect";
//#region src/config/Entity.ts
/**
* Declarative projectors: what kinds of node exist, how each is keyed, and how
* they relate.
*
* `ConfigNode.makeTyped` is the mechanism, and calling it directly works, but
* it leaves the interesting parts stringly-typed. A projector written by hand
* says `kind: "attribute"` and takes `key: string`, so nothing stops a form key
* being passed where an attribute key belongs, or a `kind` drifting out of sync
* with the entity it names. Both mistakes produce a graph that hashes
* perfectly well and only fails later, at commit time, as a `DanglingRefError`.
*
* An `Entity` moves those decisions into one declaration and lets the compiler
* hold them. `kind` comes from the entity rather than a literal at each call
* site. Keys are branded per entity, so `EntityKey<"attribute">` and
* `EntityKey<"form">` are not interchangeable. Nodes are branded the same way,
* so nesting a policy where a page belongs does not compile.
*
* The field vocabulary is the important part, and it is deliberately two words
* rather than a general resolver:
*
* - `Entity.children(PageKind)` composes: the child is nested and its `cid`
*   flows into the parent's, so an edit anywhere beneath bubbles up.
* - `Entity.ref(AttributeKind)` depends: only the target's kind and key are
*   recorded, and whether the target itself moved is a question for
*   `closureId`.
*
* That is exactly the children/refs asymmetry `ConfigNode` already enforces;
* naming it as a field kind is what makes it visible at the point of
* declaration instead of buried in a call to `makeTyped`.
*
* Fields target a `Kind` token rather than the entity itself. The obvious
* design is a lazy `() => Automation`, but it does not survive contact with
* the cycle this graph actually has: inferring `Form` needs `Automation`, which
* needs `Action`, which needs `Form`, and TypeScript gives up with an implicit
* `any` no thunk can defer. Declaring kinds up front breaks that, and nothing
* is lost - the graph only ever records a target's kind and key, so the entity
* behind it is never needed to build a node. A `Kind` is also where the key
* brand lives, which means a key can be named without its entity in scope.
*
* There is no `Entity.effect` or `Entity.stream` here on purpose. Configuration
* is finite and a snapshot is immutable, so a field that resolves at read time
* or emits over time would contradict the thing being built. Fetching belongs
* upstream, in whatever reads the database to call these projectors.
*/
var Entity_exports = /* @__PURE__ */ __exportAll({
	children: () => children,
	kind: () => kind,
	make: () => make,
	ref: () => ref,
	withType: () => withType
});
const kind = (name) => ({
	name,
	key: (raw) => raw
});
/** Nested and hashed: the child's `cid` flows into the parent's. */
const children = (target) => ({
	_tag: "Child",
	target
});
/** Recorded by kind and key only; cycles are fine, `closureId` covers drift. */
const ref = (target) => ({
	_tag: "Ref",
	target
});
const make = (definition) => {
	const childFields = definition.children ?? {};
	const refFields = definition.refs ?? {};
	return {
		kind: definition.kind,
		attrs: definition.attrs,
		childFields,
		refFields,
		keyOf: (attrs) => definition.key(attrs),
		key: definition.kind.key,
		node: (input) => Effect.gen(function* () {
			const nested = Object.entries(childFields).flatMap(([rel]) => (input.children?.[rel] ?? []).map((node) => ({
				rel,
				node
			})));
			const edges = Object.entries(refFields).flatMap(([rel, field]) => (input.refs?.[rel] ?? []).map((key) => ({
				rel,
				kind: field.target.name,
				key
			})));
			return yield* makeTyped({
				kind: definition.kind.name,
				key: definition.key(input.attrs),
				type: definition.attrs,
				attrs: input.attrs,
				children: nested,
				refs: edges
			});
		})
	};
};
/**
* Build nodes with a different attrs type than the entity declares.
*
* Deploying a widened projection means running the same entity under a new
* shape, which is the case `TypeSubsumption` exists to make cheap. Rather than
* duplicating an entity per type generation, override the shape for one build
* and let the store decide whether that is news.
*/
const withType = (entity, attrs) => make({
	kind: entity.kind,
	attrs,
	key: (value) => entity.keyOf(value),
	children: entity.childFields,
	refs: entity.refFields
});
//#endregion
export { Entity_exports, children, kind, make, ref, withType };

//# sourceMappingURL=Entity.js.map