import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { unsafe } from "../Branded.js";
import { encode } from "../content/CanonicalJson.js";
import { RuleSchema as RuleSchema$1, keyOf as keyOf$1 } from "../Constraint.js";
import { enumOf, integer, optional, required as required$1, struct, text } from "./TypeExpr.js";
import { makeTyped, walk } from "./ConfigNode.js";
import { Data, Effect, Option, Result, Schema } from "effect";
//#region src/config/GraphConstraint.ts
/** Content-addressed constraints over relationships between Triplex facts. */
var GraphConstraint_exports = /* @__PURE__ */ __exportAll({
	DuplicateGraphConstraintError: () => DuplicateGraphConstraintError,
	InvalidGraphConstraintError: () => InvalidGraphConstraintError,
	KIND: () => KIND,
	cardinality: () => cardinality,
	collect: () => collect,
	enforcement: () => enforcement,
	evaluate: () => evaluate,
	parse: () => parse,
	referenceTarget: () => referenceTarget,
	required: () => required,
	unique: () => unique
});
const KIND = "graph-constraint";
var InvalidGraphConstraintError = class extends Data.TaggedError("InvalidGraphConstraintError") {};
var DuplicateGraphConstraintError = class extends Data.TaggedError("DuplicateGraphConstraintError") {};
const RuleSchema = RuleSchema$1;
const DefinitionType = struct({
	_tag: required$1(enumOf([
		"Required",
		"Cardinality",
		"Unique",
		"ReferenceTarget"
	])),
	v: required$1(integer),
	entityType: required$1(text),
	attribute: required$1(text),
	max: optional(integer),
	targetEntityType: optional(text)
});
const keyOf = keyOf$1;
const definition = (rule) => {
	const key = keyOf(rule);
	return {
		_tag: "GraphConstraint",
		key,
		rule,
		node: makeTyped({
			kind: KIND,
			key,
			type: DefinitionType,
			attrs: rule,
			refs: [
				{
					rel: "constrains-entity-type",
					kind: "entity-schema",
					key: rule.entityType
				},
				{
					rel: "constrains-attribute",
					kind: "attribute",
					key: rule.attribute
				},
				...rule._tag === "ReferenceTarget" ? [{
					rel: "requires-target-entity-type",
					kind: "entity-schema",
					key: rule.targetEntityType
				}] : []
			]
		})
	};
};
const required = (entityType, attribute) => definition({
	_tag: "Required",
	v: 1,
	entityType,
	attribute
});
const cardinality = (entityType, attribute, max) => {
	if (!Number.isSafeInteger(max) || max < 1) throw new TypeError("Graph constraint cardinality must be a positive safe integer");
	return definition({
		_tag: "Cardinality",
		v: 1,
		entityType,
		attribute,
		max
	});
};
const unique = (entityType, attribute) => definition({
	_tag: "Unique",
	v: 1,
	entityType,
	attribute
});
const referenceTarget = (entityType, attribute, targetEntityType) => definition({
	_tag: "ReferenceTarget",
	v: 1,
	entityType,
	attribute,
	targetEntityType
});
/** Build the plain transaction metadata payload for atomic enforcement. */
const enforcement = (definitions) => ({ constraints: definitions.map(({ rule }) => rule) });
const parse = (node) => {
	const decoded = Schema.decodeUnknownResult(RuleSchema)(node.attrs);
	if (Result.isFailure(decoded)) return Effect.fail(new InvalidGraphConstraintError({
		key: node.key,
		message: `Invalid graph constraint ${node.key}: ${decoded.failure.message}`
	}));
	if (keyOf(decoded.success) !== node.key) return Effect.fail(new InvalidGraphConstraintError({
		key: node.key,
		message: `Invalid graph constraint ${node.key}: key does not match its rule`
	}));
	if (decoded.success._tag === "Cardinality" && (!Number.isSafeInteger(decoded.success.max) || decoded.success.max < 1)) return Effect.fail(new InvalidGraphConstraintError({
		key: node.key,
		message: `Invalid graph constraint ${node.key}: max must be a positive safe integer`
	}));
	return Effect.succeed(decoded.success);
};
/** Load and validate every independently versioned graph constraint in a config tree. */
const collect = (root) => Effect.gen(function* () {
	const nodes = [...walk(root)].map(({ node }) => node);
	const slots = new Set(nodes.map((node) => `${node.kind}\u0000${node.key}`));
	const found = /* @__PURE__ */ new Map();
	for (const node of nodes) {
		if (node.kind !== "graph-constraint") continue;
		const rule = yield* parse(node);
		const missing = [
			`entity-schema\u0000${rule.entityType}`,
			`attribute\u0000${rule.attribute}`,
			...rule._tag === "ReferenceTarget" ? [`entity-schema\u0000${rule.targetEntityType}`] : []
		].find((slot) => !slots.has(slot));
		if (missing) {
			const [kind, key] = missing.split("\0");
			return yield* new InvalidGraphConstraintError({
				key: node.key,
				message: `Invalid graph constraint ${node.key}: missing ${kind} ${key}`
			});
		}
		const existing = found.get(node.key);
		if (existing && existing.cid !== node.cid) return yield* new DuplicateGraphConstraintError({
			key: node.key,
			message: `Configuration contains graph constraint ${node.key} more than once`
		});
		found.set(node.key, {
			cid: node.cid,
			definition: {
				_tag: "GraphConstraint",
				key: node.key,
				rule,
				node: Effect.succeed(node)
			}
		});
	}
	return [...found.values()].map(({ definition }) => definition).sort((left, right) => left.key.localeCompare(right.key));
});
const pathOf = (attribute) => `$[${JSON.stringify(attribute)}]`;
const tripleValueKey = (triple) => encode(triple.value.type === "blob" ? {
	type: triple.value.type,
	value: triple.value.value,
	mimeType: triple.value.mimeType,
	size: triple.value.size,
	...triple.value.filename === void 0 ? {} : { filename: triple.value.filename }
} : triple.value);
/** Evaluate graph constraints at one bitemporal basis without mutating the store. */
const evaluate = (triples, definitions, basis) => Effect.gen(function* () {
	const byType = /* @__PURE__ */ new Map();
	for (const item of definitions) {
		const current = byType.get(item.rule.entityType) ?? [];
		current.push(item);
		byType.set(item.rule.entityType, current);
	}
	const violations = [];
	for (const [entityType, constraints] of [...byType].sort(([a], [b]) => a.localeCompare(b))) {
		const typedFacts = yield* triples.match({ entityType }, basis);
		const subjects = [...new Set(typedFacts.map((fact) => fact.entityId))].sort();
		const facts = (yield* triples.entities(subjects.map(unsafe.entityId), basis)).flat();
		const bySubject = /* @__PURE__ */ new Map();
		for (const fact of facts) {
			const rows = bySubject.get(fact.entityId) ?? [];
			rows.push(fact);
			bySubject.set(fact.entityId, rows);
		}
		for (const item of constraints.sort((a, b) => a.key.localeCompare(b.key))) {
			const { rule } = item;
			if (rule._tag === "Required" || rule._tag === "Cardinality") {
				for (const subject of subjects) {
					const count = (bySubject.get(subject) ?? []).filter((fact) => fact.attribute === rule.attribute).length;
					if (rule._tag === "Required" && count === 0) violations.push({
						constraintKey: item.key,
						code: "required",
						subject,
						entityType,
						attribute: rule.attribute,
						path: pathOf(rule.attribute),
						message: `${entityType} requires ${rule.attribute}`
					});
					if (rule._tag === "Cardinality" && count > rule.max) violations.push({
						constraintKey: item.key,
						code: "cardinality",
						subject,
						entityType,
						attribute: rule.attribute,
						path: pathOf(rule.attribute),
						message: `${entityType}.${rule.attribute} has ${count} live values; maximum cardinality is ${rule.max}`
					});
				}
				continue;
			}
			if (rule._tag === "Unique") {
				const claims = /* @__PURE__ */ new Map();
				for (const fact of facts) {
					if (fact.attribute !== rule.attribute) continue;
					const valueKey = yield* tripleValueKey(fact);
					const subjectsForValue = claims.get(valueKey) ?? /* @__PURE__ */ new Set();
					subjectsForValue.add(fact.entityId);
					claims.set(valueKey, subjectsForValue);
				}
				for (const duplicateSubjects of claims.values()) {
					if (duplicateSubjects.size < 2) continue;
					const ordered = [...duplicateSubjects].sort();
					for (const subject of ordered) violations.push({
						constraintKey: item.key,
						code: "unique",
						subject,
						entityType,
						attribute: rule.attribute,
						path: pathOf(rule.attribute),
						message: `${entityType}.${rule.attribute} must be unique; the value is also used by ${ordered.filter((candidate) => candidate !== subject).join(", ")}`
					});
				}
				continue;
			}
			const sourceFacts = facts.filter((fact) => fact.attribute === rule.attribute);
			const sourceRefs = sourceFacts.filter((fact) => fact.attribute === rule.attribute && fact.value.type === "ref");
			const targetIds = [...new Set(sourceRefs.map((fact) => fact.value.value))].sort();
			const targetRows = yield* triples.entities(targetIds.map(unsafe.entityId), basis);
			const validTargets = new Set(targetIds.filter((_, index) => targetRows[index].some((fact) => Option.isSome(fact.entityType) && fact.entityType.value === rule.targetEntityType)));
			for (const fact of sourceFacts) {
				if (fact.value.type !== "ref") {
					violations.push({
						constraintKey: item.key,
						code: "reference-target",
						subject: fact.entityId,
						entityType,
						attribute: rule.attribute,
						path: pathOf(rule.attribute),
						message: `${entityType}.${rule.attribute} must contain a reference to a ${rule.targetEntityType}`
					});
					continue;
				}
				if (validTargets.has(fact.value.value)) continue;
				violations.push({
					constraintKey: item.key,
					code: "reference-target",
					subject: fact.entityId,
					entityType,
					attribute: rule.attribute,
					path: pathOf(rule.attribute),
					message: `${entityType}.${rule.attribute} references ${fact.value.value}, which is not a live ${rule.targetEntityType}`
				});
			}
		}
	}
	return violations.sort((left, right) => left.entityType.localeCompare(right.entityType) || left.subject.localeCompare(right.subject) || left.path.localeCompare(right.path) || left.code.localeCompare(right.code) || left.constraintKey.localeCompare(right.constraintKey));
});
//#endregion
export { DuplicateGraphConstraintError, GraphConstraint_exports, InvalidGraphConstraintError, KIND, cardinality, collect, enforcement, evaluate, parse, referenceTarget, required, unique };

//# sourceMappingURL=GraphConstraint.js.map