import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { TypeExprSchema, canonical, list } from "../config/TypeExpr.js";
import { compile as compile$1 } from "../config/TypeSchema.js";
import { walk } from "../config/ConfigNode.js";
import "../config/Attribute.js";
import { collect } from "../config/GraphConstraint.js";
import "../config/EntityValidation.js";
import { DescriptorCompileError } from "./Errors.js";
import { Effect, Result, Schema } from "effect";
//#region src/entity/Descriptors.ts
/**
* Release-to-descriptor compiler: the persisted entity-schema and attribute nodes of a config
* snapshot become engine-neutral entity descriptors.
*
* [EXP-R01] Why: moved verbatim from `packages/http/src/ConfigApi.ts` so the projection spec,
* the repository and the http package compile releases with one function (R9 section 5.2).
* The REST-only rules (collection paths, operations, "at least one attribute") stay in http and
* run through `ExposureHooks` at exactly the positions they ran before, so http reports the same
* first error for every snapshot. Inspired by: packages/http/src/ConfigApi.ts@00a300d:143-380.
* Rejected: a second copy in core (two compilers drift); moving the REST exposure rules into
* core (the default collection name rejects multi-word types such as `ProjectMember`, which
* would make the compiler unusable for projection specs).
*/
var Descriptors_exports = /* @__PURE__ */ __exportAll({
	compile: () => compile,
	referenceKinds: () => referenceKinds,
	storageFamily: () => storageFamily
});
const entityTypeName = /^[A-Z][A-Za-z0-9]*$/;
const attributeKey = /^:[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$/;
const unsupported = (path, message) => new DescriptorCompileError({
	kind: "unsupported",
	path,
	message
});
const conflict = (path, message) => new DescriptorCompileError({
	kind: "conflict",
	path,
	message
});
/** Map a type to the single `TripleValue` family it is stored as; throws when ambiguous. */
const storageFamily = (expr, path) => {
	switch (expr._tag) {
		case "Prim": switch (expr.prim) {
			case "text":
			case "date": return "string";
			case "number":
			case "integer": return "number";
			case "int64": return "integer";
			case "boolean": return "boolean";
			case "instant": return "datetime";
		}
		case "Enum": return "string";
		case "Ref": return "ref";
		case "List":
		case "Struct": return "json";
		case "Constrained": return storageFamily(expr.base, path);
		case "Union": {
			const families = new Set(expr.members.map((member) => storageFamily(member, path)));
			if (families.size !== 1) throw unsupported(path, "Union members have ambiguous storage encodings");
			return [...families][0];
		}
		case "Any": throw unsupported(path, "The Any type has no unambiguous REST storage encoding");
	}
};
const objectRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
const parseType = (value, path) => {
	const parsed = Schema.decodeUnknownResult(TypeExprSchema)(value);
	if (Result.isFailure(parsed)) return Effect.fail(unsupported(path, `Invalid TypeExpr: ${parsed.failure.message}`));
	return Effect.succeed(parsed.success);
};
/** Every entity type a type references, in occurrence order. */
const referenceKinds = (expr) => {
	switch (expr._tag) {
		case "Ref": return [expr.kind];
		case "List": return referenceKinds(expr.item);
		case "Struct": return Object.values(expr.fields).flatMap((field) => referenceKinds(field.type));
		case "Union": return expr.members.flatMap(referenceKinds);
		case "Constrained": return referenceKinds(expr.base);
		case "Any":
		case "Prim":
		case "Enum": return [];
	}
};
const noHook = Effect.void;
/** Compile only persisted release data; no DSL handles are retained or consulted. */
const compile = (snapshot, hooks = {}) => Effect.gen(function* () {
	const bySlot = /* @__PURE__ */ new Map();
	for (const { node } of walk(snapshot.root)) {
		const slot = `${node.kind}\u0000${node.key}`;
		const existing = bySlot.get(slot);
		if (existing !== void 0 && existing.cid !== node.cid) return yield* conflict(`config.${node.kind}.${node.key}`, `Configuration contains conflicting ${node.kind} definitions for ${node.key}`);
		bySlot.set(slot, node);
	}
	const attributeTypes = /* @__PURE__ */ new Map();
	for (const node of bySlot.values()) {
		if (node.kind !== "attribute") continue;
		if (!attributeKey.test(node.key)) return yield* unsupported(`attributes.${node.key}`, `Attribute identity must be a lowercase namespaced keyword`);
		if (node.key.startsWith(":triplex/") || node.key.startsWith(":_tx/")) return yield* conflict(`attributes.${node.key}`, `${node.key} is reserved by Triplex`);
		const attrs = objectRecord(node.attrs);
		if (attrs?.["key"] !== node.key || attrs["valueType"] === void 0) return yield* unsupported(`attributes.${node.key}`, `Attribute ${node.key} is missing complete Attribute metadata`);
		const type = yield* parseType(attrs["valueType"], `attributes.${node.key}.type`);
		try {
			compile$1(type);
		} catch (error) {
			return yield* unsupported(`attributes.${node.key}.type`, `Attribute type cannot be compiled: ${String(error)}`);
		}
		attributeTypes.set(node.key, type);
	}
	const entityTypes = /* @__PURE__ */ new Set();
	const entities = [];
	for (const node of bySlot.values()) {
		if (node.kind !== "entity-schema") continue;
		if (!entityTypeName.test(node.key)) return yield* unsupported(`entities.${node.key}`, `Entity type identity must be PascalCase`);
		if (node.key === "_Transaction" || node.key.startsWith("triplex.")) return yield* conflict(`entities.${node.key}`, `${node.key} is reserved by Triplex and cannot be exposed`);
		entityTypes.add(node.key);
		const attrs = objectRecord(node.attrs);
		const usages = objectRecord(attrs?.["attributes"]);
		if (attrs?.["entityType"] !== node.key || usages === void 0 || attrs["type"] === void 0) return yield* unsupported(`entities.${node.key}`, `Entity ${node.key} was defined without complete EntityType/Attribute usage metadata`);
		const entitySchema = yield* parseType(attrs["type"], `entities.${node.key}.type`);
		if (entitySchema._tag !== "Struct") return yield* unsupported(`entities.${node.key}.type`, "Entity type must be a closed struct");
		yield* hooks.beforeAttributes?.(node.key) ?? noHook;
		const descriptors = [];
		const seenAttributes = /* @__PURE__ */ new Set();
		for (const [alias, rawUsage] of Object.entries(usages).sort(([a], [b]) => a.localeCompare(b))) {
			const usage = objectRecord(rawUsage);
			const key = usage?.["attribute"];
			const required = usage?.["required"];
			const cardinality = usage?.["cardinality"];
			const unique = usage?.["unique"];
			if (typeof key !== "string" || typeof required !== "boolean" || cardinality !== "one" && cardinality !== "many" || typeof unique !== "boolean") return yield* unsupported(`entities.${node.key}.attributes.${alias}`, `Entity ${node.key} has invalid usage metadata for ${alias}`);
			if (seenAttributes.has(key)) return yield* conflict(`entities.${node.key}.attributes.${alias}`, `Entity ${node.key} uses ${key} more than once`);
			const type = attributeTypes.get(key);
			if (type === void 0) return yield* unsupported(`entities.${node.key}.attributes.${alias}`, `Entity ${node.key} references unresolved attribute ${key}`);
			const field = entitySchema.fields[key];
			const expectedFieldType = cardinality === "many" ? list(type) : type;
			if (field === void 0 || field.optional === required || field.fallback !== void 0 || canonical(field.type) !== canonical(expectedFieldType)) return yield* conflict(`entities.${node.key}.attributes.${alias}`, `Entity schema and usage metadata disagree about ${key}`);
			seenAttributes.add(key);
			let storage;
			try {
				storage = storageFamily(type, `entities.${node.key}.attributes.${alias}.type`);
			} catch (error) {
				return yield* error;
			}
			descriptors.push({
				key,
				alias,
				type,
				required,
				cardinality,
				unique,
				storage
			});
		}
		yield* hooks.afterAttributes?.(node.key, descriptors) ?? noHook;
		const schemaFields = Object.keys(entitySchema.fields).sort();
		const usageFields = [...seenAttributes].sort();
		if (schemaFields.length !== usageFields.length || schemaFields.some((key, index) => key !== usageFields[index])) return yield* conflict(`entities.${node.key}.type`, `Entity schema fields must exactly match its Attribute usage metadata`);
		yield* hooks.afterEntity?.(node.key) ?? noHook;
		entities.push({
			entityType: node.key,
			attributes: descriptors.sort((a, b) => a.key.localeCompare(b.key))
		});
	}
	yield* hooks.afterEntities?.(entityTypes) ?? noHook;
	for (const entity of entities) for (const attribute of entity.attributes) for (const target of referenceKinds(attribute.type)) if (!entityTypes.has(target)) return yield* unsupported(`entities.${entity.entityType}.attributes.${attribute.alias}.type`, `Reference target ${target} is not defined in this configuration snapshot`);
	const constraints = yield* collect(snapshot.root).pipe(Effect.map((items) => items.map((item) => item.rule)), Effect.mapError((error) => conflict("constraints", "message" in error ? error.message : String(error))));
	return {
		snapshotId: snapshot.id,
		label: snapshot.label,
		entities,
		constraints
	};
});
//#endregion
export { Descriptors_exports, compile, referenceKinds, storageFamily };

//# sourceMappingURL=Descriptors.js.map