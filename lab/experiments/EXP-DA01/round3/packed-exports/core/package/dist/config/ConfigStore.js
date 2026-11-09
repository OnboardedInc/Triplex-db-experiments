import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { unsafe } from "../Branded.js";
import { Triples } from "../store/Triples.js";
import { transactSystem } from "../store/systemNamespace.js";
import { commit, recheck, resolveRef, setRef, snapshotById } from "./InMemoryConfigStore.js";
import { Context, Data, Effect, Layer } from "effect";
//#region src/config/ConfigStore.ts
/**
* Effect-native persistence for typed configuration over the Triples service.
*
* Config bodies, types, revisions, and release snapshots are immutable facts.
* Git-style refs are the only moving records. The pure InMemoryConfigStore is
* used to calculate and validate each transition, keeping one semantic model
* for dangling refs, duplicate objects, revision reuse, and `validUnder`.
*/
var ConfigStore_exports = /* @__PURE__ */ __exportAll({
	ConfigStore: () => ConfigStore,
	CorruptConfigStoreError: () => CorruptConfigStoreError,
	System: () => System,
	entityId: () => entityId,
	layer: () => layer
});
const System = {
	prefix: "_triplex/config/",
	entityType: {
		object: "triplex.config-object",
		type: "triplex.config-type",
		logicalObject: "triplex.config-logical-object",
		revision: "triplex.config-revision",
		snapshot: "triplex.config-snapshot",
		ref: "triplex.config-ref"
	},
	attribute: {
		data: ":triplex/config-data",
		contentId: ":triplex/content-id",
		kind: ":triplex/config-kind",
		key: ":triplex/config-key",
		validUnder: ":triplex/valid-under",
		dependsOn: ":triplex/depends-on",
		target: ":triplex/ref-target"
	}
};
const encodePart = (value) => encodeURIComponent(value);
const entityId = {
	object: (cid) => unsafe.entityId(`${System.prefix}object/${cid}`),
	type: (cid) => unsafe.entityId(`${System.prefix}type/${cid}`),
	logicalObject: (object) => unsafe.entityId(`${System.prefix}logical/${encodePart(object.kind)}/${encodePart(object.key)}`),
	revision: (id) => unsafe.entityId(`${System.prefix}revision/${encodePart(id)}`),
	snapshot: (id) => unsafe.entityId(`${System.prefix}snapshot/${encodePart(id)}`),
	ref: (name) => unsafe.entityId(`${System.prefix}ref/${encodePart(name)}`)
};
var CorruptConfigStoreError = class extends Data.TaggedError("CorruptConfigStoreError") {};
var ConfigStore = class extends Context.Service()("triplex/ConfigStore") {};
const groupByEntity = (triples) => {
	const grouped = /* @__PURE__ */ new Map();
	for (const triple of triples) {
		const current = grouped.get(triple.entityId) ?? [];
		current.push(triple);
		grouped.set(triple.entityId, current);
	}
	return grouped;
};
const latest = (triples, attribute) => triples.filter((triple) => triple.attribute === attribute).sort((a, b) => b.recordedAt - a.recordedAt || b.id.localeCompare(a.id))[0];
const stringValue = (triple) => {
	if (!triple) return void 0;
	return triple.value.type === "string" || triple.value.type === "ref" ? triple.value.value : void 0;
};
const jsonValue = (triple) => triple?.value.type === "json" ? triple.value.value : void 0;
const corrupt = (id, reason) => new CorruptConfigStoreError({
	entityId: id,
	message: `Invalid Triplex configuration record ${id}: ${reason}`
});
const assertOp = (id, entityType, attribute, value) => ({
	op: "assert",
	entityId: unsafe.entityId(id),
	entityType,
	attribute,
	value: value.type === "ref" ? {
		...value,
		value: unsafe.entityId(value.value)
	} : value
});
const makeService = Effect.gen(function* () {
	const triples = yield* Triples;
	const records = (entityType) => triples.match({ entityType });
	const load = () => Effect.gen(function* () {
		const [objectRows, typeRows, revisionRows, snapshotRows, refRows] = yield* Effect.all([
			records(System.entityType.object),
			records(System.entityType.type),
			records(System.entityType.revision),
			records(System.entityType.snapshot),
			records(System.entityType.ref)
		]);
		const objects = /* @__PURE__ */ new Map();
		for (const [id, rows] of groupByEntity(objectRows)) {
			const cid = stringValue(latest(rows, System.attribute.contentId));
			const kind = stringValue(latest(rows, System.attribute.kind));
			const body = jsonValue(latest(rows, System.attribute.data));
			if (!cid || !kind || body === void 0) return yield* corrupt(id, "missing object data");
			const validUnder = rows.filter((row) => row.attribute === System.attribute.validUnder).map((row) => stringValue(row)).filter((value) => value !== void 0).sort();
			objects.set(cid, {
				cid,
				kind,
				body,
				validUnder
			});
		}
		const schemas = /* @__PURE__ */ new Map();
		for (const [id, rows] of groupByEntity(typeRows)) {
			const cid = stringValue(latest(rows, System.attribute.contentId));
			const type = jsonValue(latest(rows, System.attribute.data));
			if (!cid || type === void 0) return yield* corrupt(id, "missing type data");
			schemas.set(cid, type);
		}
		const revisions = [];
		for (const [id, rows] of groupByEntity(revisionRows)) {
			const revision = jsonValue(latest(rows, System.attribute.data));
			if (!revision) return yield* corrupt(id, "missing revision data");
			revisions.push(revision);
		}
		revisions.sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));
		const buildNode = (cid, visiting = /* @__PURE__ */ new Set()) => {
			const stored = objects.get(cid);
			if (!stored) throw corrupt(entityId.object(cid), "snapshot references a missing node");
			if (visiting.has(cid)) throw corrupt(entityId.object(cid), "child graph contains a cycle");
			const body = stored.body;
			const nested = new Set(visiting).add(cid);
			const type = stored.validUnder.map((id) => schemas.get(id)).find((value) => value !== void 0);
			return {
				kind: body.kind,
				key: body.key,
				attrs: body.attrs,
				children: body.children.map((child) => ({
					rel: child.rel,
					node: buildNode(child.cid, nested)
				})),
				refs: body.refs,
				cid,
				...type !== void 0 && { type }
			};
		};
		const snapshots = [];
		try {
			for (const [id, rows] of groupByEntity(snapshotRows)) {
				const record = jsonValue(latest(rows, System.attribute.data));
				if (!record) return yield* corrupt(id, "missing snapshot data");
				snapshots.push({
					...record,
					root: buildNode(record.rootCid)
				});
			}
		} catch (error) {
			if (error instanceof CorruptConfigStoreError) return yield* error;
			return yield* corrupt("<snapshot>", String(error));
		}
		snapshots.sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));
		const refs = /* @__PURE__ */ new Map();
		for (const [id, rows] of groupByEntity(refRows)) {
			const name = stringValue(latest(rows, System.attribute.key));
			const target = stringValue(latest(rows, System.attribute.target));
			if (!name || !target) return yield* corrupt(id, "missing ref target");
			const snapshot = snapshots.find((candidate) => entityId.snapshot(candidate.id) === target);
			if (!snapshot) return yield* corrupt(id, `points to unknown snapshot ${target}`);
			refs.set(name, snapshot.id);
		}
		return {
			objects,
			schemas,
			revisions,
			snapshots,
			refs,
			seq: Math.max(0, ...revisions.map((revision) => revision.seq), ...snapshots.map((snapshot) => snapshot.seq))
		};
	});
	const currentRefTriple = (name) => triples.match({ entityId: entityId.ref(name) }).pipe(Effect.map((rows) => latest(rows, System.attribute.target)));
	const refOps = (name, snapshotId, current) => [
		...current ? [{
			op: "retract",
			id: current.id
		}] : [],
		assertOp(entityId.ref(name), System.entityType.ref, System.attribute.key, {
			type: "string",
			value: name
		}),
		assertOp(entityId.ref(name), System.entityType.ref, System.attribute.target, {
			type: "ref",
			value: entityId.snapshot(snapshotId)
		})
	];
	const commit$1 = (input) => Effect.gen(function* () {
		const before = yield* load();
		const committed = yield* commit(before, input);
		const operations = [];
		for (const [cid, stored] of committed.store.objects) {
			const previous = before.objects.get(cid);
			if (!previous) operations.push(assertOp(entityId.object(cid), System.entityType.object, System.attribute.contentId, {
				type: "string",
				value: cid
			}), assertOp(entityId.object(cid), System.entityType.object, System.attribute.kind, {
				type: "string",
				value: stored.kind
			}), assertOp(entityId.object(cid), System.entityType.object, System.attribute.data, {
				type: "json",
				value: stored.body
			}));
			for (const typeId of stored.validUnder) {
				if (previous?.validUnder.includes(typeId)) continue;
				operations.push(assertOp(entityId.object(cid), System.entityType.object, System.attribute.validUnder, {
					type: "string",
					value: typeId
				}));
			}
		}
		for (const [cid, type] of committed.store.schemas) {
			if (before.schemas.has(cid)) continue;
			operations.push(assertOp(entityId.type(cid), System.entityType.type, System.attribute.contentId, {
				type: "string",
				value: cid
			}), assertOp(entityId.type(cid), System.entityType.type, System.attribute.data, {
				type: "json",
				value: type
			}));
		}
		for (const revision of committed.created) {
			const id = entityId.revision(revision.id);
			operations.push(assertOp(id, System.entityType.revision, System.attribute.data, {
				type: "json",
				value: revision
			}), assertOp(id, System.entityType.revision, System.attribute.kind, {
				type: "string",
				value: revision.kind
			}), assertOp(id, System.entityType.revision, System.attribute.key, {
				type: "string",
				value: revision.key
			}), assertOp(id, System.entityType.revision, System.attribute.contentId, {
				type: "string",
				value: revision.cid
			}));
			for (const dep of revision.deps) operations.push(assertOp(id, System.entityType.revision, System.attribute.dependsOn, {
				type: "ref",
				value: entityId.logicalObject(dep)
			}));
		}
		const { root: _root, ...snapshotRecord } = committed.snapshot;
		operations.push(assertOp(entityId.snapshot(committed.snapshot.id), System.entityType.snapshot, System.attribute.data, {
			type: "json",
			value: snapshotRecord
		}));
		if (input.ref) {
			const current = yield* currentRefTriple(input.ref);
			operations.push(...refOps(input.ref, committed.snapshot.id, current));
			const transaction = yield* transactSystem(triples, operations, {
				actor: "triplex/config-store",
				configSnapshot: committed.snapshot.id,
				...current ? { preconditions: [{
					_tag: "TripleLive",
					id: current.id
				}] } : {}
			});
			const store = yield* setRef(committed.store, input.ref, committed.snapshot.id);
			return {
				...committed,
				store,
				transaction
			};
		}
		const transaction = yield* transactSystem(triples, operations, {
			actor: "triplex/config-store",
			configSnapshot: committed.snapshot.id
		});
		return {
			...committed,
			store: committed.store,
			transaction
		};
	});
	const setRef$1 = (name, snapshotId) => Effect.gen(function* () {
		const next = yield* setRef(yield* load(), name, snapshotId);
		const current = yield* currentRefTriple(name);
		yield* transactSystem(triples, refOps(name, snapshotId, current), {
			actor: "triplex/config-store",
			configSnapshot: snapshotId,
			...current ? { preconditions: [{
				_tag: "TripleLive",
				id: current.id
			}] } : {}
		});
		return resolveRef(next, name);
	});
	const reverseDependencies = (object) => Effect.gen(function* () {
		const response = yield* triples.queryAll({
			find: ["?revision"],
			where: [[
				"?revision",
				System.attribute.dependsOn,
				{
					type: "ref",
					value: entityId.logicalObject(object)
				}
			]]
		});
		const ids = new Set(response.results.map((row) => row["?revision"]).filter((value) => typeof value === "string"));
		return (yield* load()).revisions.filter((revision) => ids.has(entityId.revision(revision.id)));
	});
	return {
		load,
		commit: commit$1,
		setRef: setRef$1,
		resolveRef: (name) => load().pipe(Effect.map((store) => resolveRef(store, name))),
		snapshotById: (id) => load().pipe(Effect.map((store) => snapshotById(store, id))),
		reverseDependencies,
		impactCandidates: reverseDependencies,
		recheck: (input) => load().pipe(Effect.map((store) => recheck(store, input)))
	};
});
const layer = Layer.effect(ConfigStore, makeService);
//#endregion
export { ConfigStore, ConfigStore_exports, CorruptConfigStoreError, System, entityId, layer };

//# sourceMappingURL=ConfigStore.js.map