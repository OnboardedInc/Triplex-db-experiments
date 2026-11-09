import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { encode } from "../content/CanonicalJson.js";
import { Domain, hash } from "../content/ContentId.js";
import { id } from "./TypeExpr.js";
import { is } from "./TypeSchema.js";
import { body, closureId, make, stamp, typeIds, walk } from "./ConfigNode.js";
import { isCompatible, subsumes } from "./TypeSubsumption.js";
import { Data, Effect } from "effect";
//#region src/config/InMemoryConfigStore.ts
/**
* An in-memory content-addressed store, revision log and snapshot history.
*
* This is the reference implementation of the semantics the Postgres tables
* will have to honour, kept in memory so the whole model can be exercised and
* argued about before any migration is written. The mapping is one-to-one:
* `objects` is `config_objects`, `schemas` is `config_schemas`, `revisions` is
* `config_revisions`, `snapshots` is `config_snapshots`, and `refs` is
* `config_refs` - git-style pointers where deploying is moving a ref and
* rolling back is moving it back.
*
* Everything here is pure. `commit` returns a new store rather than mutating
* one, and immutable ids are derived from canonical contents rather than a
* sequence or a clock. The sequence remains ordering metadata only. This is
* not a testing convenience: concurrent writers must never be able to assign
* the same entity id to different revision or release bodies.
*
* Three behaviours are worth knowing before reading the code.
*
* **Revisions are reused, not rewritten.** Committing a snapshot where only one
* form changed does not mint new revisions for the untouched policy and
* automation - it points the new snapshot at the revisions they already had.
* A revision is only superseded when its data, its schema, or its closure moved.
*
* **Dangling refs fail the commit.** If a form references `employee.ssn` and
* that attribute is not in the snapshot, the commit fails rather than recording
* a configuration that cannot run. This is the check that catches a deleted
* attribute still referenced by a live automation, which today surfaces as a
* runtime error against a real employee.
*
* **A snapshot is itself a `ConfigNode`.** Its children are the objects, so
* `ConfigNode.diff` works on two snapshots unchanged and the merkle shape means
* comparing two large snapshots costs work proportional to what differs. Its
* key is a constant and its label lives outside the hash, so a snapshot's id is
* the identity of the configuration and nothing else: two releases that ship
* identical config share a root id whatever they were named, and whichever
* version of the projector code happened to read them.
*/
var InMemoryConfigStore_exports = /* @__PURE__ */ __exportAll({
	DanglingRefError: () => DanglingRefError,
	DuplicateObjectError: () => DuplicateObjectError,
	UnknownSnapshotError: () => UnknownSnapshotError,
	changesBetween: () => changesBetween,
	commit: () => commit,
	empty: () => empty,
	historyOf: () => historyOf,
	recheck: () => recheck,
	resolveRef: () => resolveRef,
	revisionById: () => revisionById,
	setRef: () => setRef,
	snapshotById: () => snapshotById,
	tipOf: () => tipOf,
	validityOf: () => validityOf
});
var DanglingRefError = class extends Data.TaggedError("DanglingRefError") {};
var DuplicateObjectError = class extends Data.TaggedError("DuplicateObjectError") {};
var UnknownSnapshotError = class extends Data.TaggedError("UnknownSnapshotError") {};
const SNAPSHOT_KIND = "snapshot";
/** Constant: the release label must not leak into the configuration's id. */
const SNAPSHOT_ROOT_KEY = "config";
const slotOf = (object) => `${object.kind} ${object.key}`;
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const empty = () => ({
	objects: /* @__PURE__ */ new Map(),
	schemas: /* @__PURE__ */ new Map(),
	revisions: [],
	snapshots: [],
	refs: /* @__PURE__ */ new Map(),
	seq: 0
});
/** Newest-first revision chain for one logical object. */
const historyOf = (store, object) => store.revisions.filter((rev) => rev.kind === object.kind && rev.key === object.key).sort((a, b) => b.seq - a.seq || cmp(b.id, a.id));
const tipOf = (store, object) => historyOf(store, object)[0];
const revisionById = (store, id) => store.revisions.find((rev) => rev.id === id);
const snapshotById = (store, id) => store.snapshots.find((snap) => snap.id === id);
const resolveRef = (store, name) => {
	const id = store.refs.get(name);
	return id === void 0 ? void 0 : snapshotById(store, id);
};
/**
* Point a ref at a snapshot. This is the entire deploy primitive: promoting a
* snapshot to live and rolling back to the previous one are the same operation
* in opposite directions, and neither copies or rewrites any configuration.
*/
const setRef = (store, name, snapshotId) => Effect.gen(function* () {
	if (!snapshotById(store, snapshotId)) return yield* new UnknownSnapshotError({
		id: snapshotId,
		message: `Cannot point ref "${name}" at unknown snapshot ${snapshotId}`
	});
	return {
		...store,
		refs: new Map(store.refs).set(name, snapshotId)
	};
});
/**
* Every object reachable from `start` by following refs, excluding itself.
* Cycle-safe: a form that scopes an automation which creates a task from that
* same form yields each exactly once.
*/
const transitiveDeps = (start, bySlot) => Effect.gen(function* () {
	const found = /* @__PURE__ */ new Map();
	const queue = [start];
	const visited = new Set([slotOf(start)]);
	while (queue.length > 0) {
		const current = queue.shift();
		for (const { node } of walk(current)) for (const ref of node.refs) {
			const slot = slotOf(ref);
			const target = bySlot.get(slot);
			if (!target) return yield* new DanglingRefError({
				from: {
					kind: current.kind,
					key: current.key
				},
				to: {
					kind: ref.kind,
					key: ref.key
				},
				message: `${current.kind} "${current.key}" references ${ref.kind} "${ref.key}", which is not in this snapshot`
			});
			if (slot !== slotOf(start)) found.set(slot, {
				kind: ref.kind,
				key: ref.key
			});
			if (visited.has(slot)) continue;
			visited.add(slot);
			queue.push(target);
		}
	}
	return [...found.values()].sort((a, b) => cmp(a.kind, b.kind) || cmp(a.key, b.key));
});
/**
* Record a complete set of objects as one snapshot.
*
* The whole set is required, not a delta. That is the point of the exercise:
* a form is only meaningful alongside the attributes it reads, the policy that
* distributes it and the automations it triggers, so the unit that gets
* versioned and deployed is the graph, not the form.
*/
const commit = (store, input) => Effect.gen(function* () {
	const bySlot = /* @__PURE__ */ new Map();
	for (const object of input.objects) {
		const slot = slotOf(object);
		if (bySlot.has(slot)) return yield* new DuplicateObjectError({
			object: {
				kind: object.kind,
				key: object.key
			},
			message: `ConfigSnapshot "${input.label}" contains ${object.kind} "${object.key}" twice`
		});
		bySlot.set(slot, object);
	}
	const ordered = [...input.objects].sort((a, b) => cmp(a.kind, b.kind) || cmp(a.key, b.key));
	const objects = new Map(store.objects);
	const schemas = new Map(store.schemas);
	const revisions = [...store.revisions];
	const created = [];
	let seq = store.seq;
	const revisionIds = [];
	for (const object of ordered) {
		let schemasCompatible = true;
		for (const { node } of walk(object)) {
			const existing = objects.get(node.cid);
			const stored = existing ?? {
				cid: node.cid,
				kind: node.kind,
				body: body(node),
				validUnder: []
			};
			if (node.type) {
				const typeId = id(node.type);
				if (!schemas.has(typeId)) schemas.set(typeId, node.type);
				if (!stored.validUnder.includes(typeId)) {
					const known = stored.validUnder.map((cid) => schemas.get(cid)).filter((t) => t !== void 0);
					const provenCompatible = known.some((from) => isCompatible(subsumes(from, node.type)));
					if (known.length > 0 && !provenCompatible) schemasCompatible = false;
					objects.set(node.cid, {
						...stored,
						validUnder: [...stored.validUnder, typeId].sort(cmp)
					});
					continue;
				}
			}
			if (!existing) objects.set(node.cid, stored);
		}
		const deps = yield* transitiveDeps(object, bySlot);
		const closureCid = yield* closureId(object, deps.map((dep) => ({
			...dep,
			cid: bySlot.get(slotOf(dep)).cid
		})));
		const stamp$1 = yield* stamp(object);
		const schemaCids = typeIds(object);
		const tip = tipOf({
			...store,
			revisions
		}, object);
		if (tip !== void 0 && tip.cid === object.cid && tip.closureCid === closureCid && (tip.stamp === stamp$1 || schemasCompatible)) revisionIds.push(tip.id);
		else {
			seq += 1;
			const parentId = tip?.id ?? null;
			const revision = {
				id: hash(Domain.configRevision, yield* encode({
					v: 1,
					kind: object.kind,
					key: object.key,
					cid: object.cid,
					schemaCids,
					stamp: stamp$1,
					closureCid,
					deps: deps.map(({ kind, key }) => ({
						kind,
						key
					})),
					parentId
				})),
				seq,
				kind: object.kind,
				key: object.key,
				cid: object.cid,
				schemaCids,
				stamp: stamp$1,
				closureCid,
				deps,
				parentId
			};
			revisions.push(revision);
			created.push(revision);
			revisionIds.push(revision.id);
		}
	}
	const root = yield* make({
		kind: SNAPSHOT_KIND,
		key: SNAPSHOT_ROOT_KEY,
		children: ordered.map((node) => ({
			rel: node.kind,
			node
		}))
	});
	objects.set(root.cid, {
		cid: root.cid,
		kind: root.kind,
		body: body(root),
		validUnder: []
	});
	const parentId = store.snapshots[store.snapshots.length - 1]?.id ?? null;
	const snapshotId = hash(Domain.configSnapshot, yield* encode({
		v: 1,
		label: input.label,
		rootCid: root.cid,
		revisionIds,
		parentId
	}));
	seq += 1;
	const snapshot = {
		id: snapshotId,
		seq,
		label: input.label,
		rootCid: root.cid,
		root,
		revisionIds,
		parentId
	};
	return {
		store: {
			objects,
			schemas,
			revisions,
			snapshots: [...store.snapshots, snapshot],
			refs: store.refs,
			seq
		},
		snapshot,
		created
	};
});
/**
* Object-level summary of what moved between two snapshots.
*
* Pair it with `ConfigNode.diff(from.root, to.root)` when you need the
* field-level detail; this answers the deploy-screen question of which objects
* a release touches and, crucially, which it touches only indirectly.
*/
const changesBetween = (store, from, to) => {
	const revisionsOf = (snapshot) => new Map(snapshot.revisionIds.map((id) => revisionById(store, id)).filter((rev) => rev !== void 0).map((rev) => [slotOf(rev), rev]));
	const before = revisionsOf(from);
	const after = revisionsOf(to);
	const changes = [];
	for (const [slot, next] of after) {
		const previous = before.get(slot);
		if (!previous) {
			changes.push({
				_tag: "ObjectAdded",
				kind: next.kind,
				key: next.key,
				to: next
			});
			continue;
		}
		if (previous.id === next.id) continue;
		changes.push({
			_tag: "ObjectChanged",
			kind: next.kind,
			key: next.key,
			from: previous,
			to: next,
			dataChanged: previous.cid !== next.cid,
			schemaChanged: previous.schemaCids.join() !== next.schemaCids.join(),
			closureChanged: previous.closureCid !== next.closureCid
		});
	}
	for (const [slot, previous] of before) {
		if (after.has(slot)) continue;
		changes.push({
			_tag: "ObjectRemoved",
			kind: previous.kind,
			key: previous.key,
			from: previous
		});
	}
	return changes.sort((a, b) => cmp(a.kind, b.kind) || cmp(a.key, b.key));
};
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
const recheck = (store, input) => {
	const candidateId = id(input.type);
	const compatible = [];
	const revalidated = [];
	const violations = [];
	const verdicts = /* @__PURE__ */ new Map();
	const subsumesCandidate = (from) => {
		const cached = verdicts.get(from);
		if (cached !== void 0) return cached;
		const known = store.schemas.get(from);
		const proven = known !== void 0 && isCompatible(subsumes(known, input.type));
		verdicts.set(from, proven);
		return proven;
	};
	for (const stored of store.objects.values()) {
		if (stored.kind !== input.kind) continue;
		if (stored.validUnder.includes(candidateId) || stored.validUnder.some(subsumesCandidate)) {
			compatible.push(stored.cid);
			continue;
		}
		const body = stored.body;
		if (is(input.type, body.attrs)) revalidated.push(stored.cid);
		else violations.push({
			cid: stored.cid,
			key: typeof body.key === "string" ? body.key : "<unknown>"
		});
	}
	return {
		compatible,
		revalidated,
		violations
	};
};
/** Schemas this exact body is known to satisfy. */
const validityOf = (store, cid) => store.objects.get(cid)?.validUnder ?? [];
//#endregion
export { DanglingRefError, DuplicateObjectError, InMemoryConfigStore_exports, UnknownSnapshotError, changesBetween, commit, empty, historyOf, recheck, resolveRef, revisionById, setRef, snapshotById, tipOf, validityOf };

//# sourceMappingURL=InMemoryConfigStore.js.map