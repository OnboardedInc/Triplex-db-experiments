import { __exportAll } from "./_virtual/_rolldown/runtime.js";
import { encode } from "./content/CanonicalJson.js";
import { Effect, Option, Schema } from "effect";
//#region src/Constraint.ts
/** Portable graph-constraint rules and transaction-time enforcement. */
var Constraint_exports = /* @__PURE__ */ __exportAll({
	RuleSchema: () => RuleSchema,
	evaluateFacts: () => evaluateFacts,
	keyOf: () => keyOf,
	loadRelevantFacts: () => loadRelevantFacts,
	newlyViolated: () => newlyViolated,
	project: () => project,
	sameMutationValue: () => sameMutationValue
});
const RuleSchema = Schema.Union([
	Schema.Struct({
		_tag: Schema.Literal("Required"),
		v: Schema.Literal(1),
		entityType: Schema.String,
		attribute: Schema.String
	}),
	Schema.Struct({
		_tag: Schema.Literal("Cardinality"),
		v: Schema.Literal(1),
		entityType: Schema.String,
		attribute: Schema.String,
		max: Schema.Number
	}),
	Schema.Struct({
		_tag: Schema.Literal("Unique"),
		v: Schema.Literal(1),
		entityType: Schema.String,
		attribute: Schema.String
	}),
	Schema.Struct({
		_tag: Schema.Literal("ReferenceTarget"),
		v: Schema.Literal(1),
		entityType: Schema.String,
		attribute: Schema.String,
		targetEntityType: Schema.String
	})
]);
const keyOf = (rule) => {
	const suffix = rule._tag === "Cardinality" ? `cardinality-${rule.max}` : rule._tag === "ReferenceTarget" ? `reference-target-${rule.targetEntityType}` : rule._tag.toLowerCase();
	return `${rule.entityType}:${rule.attribute}:${suffix}`;
};
/**
* Load only the current-recorded facts that can influence a rule set.
*
* Source type scans discover existing subjects, one batch expands those
* subjects to their constrained attributes, and target type scans provide the
* existence intervals needed by reference constraints. Assertions that create
* a new source subject are included in the expansion before projection.
*/
const loadRelevantFacts = (rules, operations, loader) => Effect.gen(function* () {
	const sourceTypes = [...new Set(rules.map((rule) => rule.entityType))].sort();
	const targetTypes = [...new Set(rules.flatMap((rule) => rule._tag === "ReferenceTarget" ? [rule.targetEntityType] : []))].sort();
	const sourceTypeFacts = (yield* Effect.forEach(sourceTypes, loader.byEntityType)).flat();
	const sourceIds = [...new Set([...sourceTypeFacts.map((fact) => fact.entityId), ...operations.flatMap((operation) => operation.op === "assert" && operation.entityType !== void 0 && sourceTypes.includes(operation.entityType) ? [operation.entityId] : [])])].sort();
	const [sourceFacts, targetTypeFacts] = yield* Effect.all([loader.byEntities(sourceIds), Effect.forEach(targetTypes, loader.byEntityType).pipe(Effect.map((rows) => rows.flat()))]);
	return [...new Map([
		...sourceTypeFacts,
		...sourceFacts,
		...targetTypeFacts
	].map((fact) => [fact.id, fact])).values()];
});
const pathOf = (attribute) => `$[${JSON.stringify(attribute)}]`;
const valueKey = (triple) => encode(triple.value.type === "blob" ? {
	type: triple.value.type,
	value: triple.value.value,
	mimeType: triple.value.mimeType,
	size: triple.value.size,
	...triple.value.filename === void 0 ? {} : { filename: triple.value.filename }
} : triple.value);
const visibleAt = (triple, validAt) => triple.validFrom <= validAt && (Option.isNone(triple.validTo) || triple.validTo.value > validAt);
/** Evaluate portable rules over one current-recorded fact set at a valid-time instant. */
const evaluateFacts = (facts, rules, validAt) => Effect.gen(function* () {
	const visible = facts.filter((fact) => visibleAt(fact, validAt));
	const violations = [];
	for (const rule of [...rules].sort((left, right) => keyOf(left).localeCompare(keyOf(right)))) {
		const constraintKey = keyOf(rule);
		const subjects = [...new Set(visible.filter((fact) => Option.isSome(fact.entityType) && fact.entityType.value === rule.entityType).map((fact) => fact.entityId))].sort();
		const subjectSet = new Set(subjects);
		const typedFacts = visible.filter((fact) => subjectSet.has(fact.entityId));
		if (rule._tag === "Required" || rule._tag === "Cardinality") {
			for (const subject of subjects) {
				const count = typedFacts.filter((fact) => fact.entityId === subject && fact.attribute === rule.attribute).length;
				if (rule._tag === "Required" && count === 0) violations.push({
					constraintKey,
					code: "required",
					subject,
					entityType: rule.entityType,
					attribute: rule.attribute,
					path: pathOf(rule.attribute),
					message: `${rule.entityType} requires ${rule.attribute}`,
					actual: 0
				});
				if (rule._tag === "Cardinality" && count > rule.max) violations.push({
					constraintKey,
					code: "cardinality",
					subject,
					entityType: rule.entityType,
					attribute: rule.attribute,
					path: pathOf(rule.attribute),
					message: `${rule.entityType}.${rule.attribute} has ${count} live values; maximum cardinality is ${rule.max}`,
					actual: count
				});
			}
			continue;
		}
		if (rule._tag === "Unique") {
			const claims = /* @__PURE__ */ new Map();
			for (const fact of typedFacts) {
				if (fact.attribute !== rule.attribute) continue;
				const identity = yield* valueKey(fact);
				const claimants = claims.get(identity) ?? /* @__PURE__ */ new Set();
				claimants.add(fact.entityId);
				claims.set(identity, claimants);
			}
			for (const [identity, claimants] of claims) {
				if (claimants.size < 2) continue;
				const ordered = [...claimants].sort();
				for (const subject of ordered) violations.push({
					constraintKey,
					code: "unique",
					subject,
					entityType: rule.entityType,
					attribute: rule.attribute,
					path: pathOf(rule.attribute),
					message: `${rule.entityType}.${rule.attribute} must be unique; the value is also used by ${ordered.filter((candidate) => candidate !== subject).join(", ")}`,
					actual: claimants.size,
					valueIdentity: identity
				});
			}
			continue;
		}
		for (const fact of typedFacts) {
			if (fact.attribute !== rule.attribute) continue;
			const identity = yield* valueKey(fact);
			if (fact.value.type === "ref" && visible.some((candidate) => candidate.entityId === fact.value.value && Option.isSome(candidate.entityType) && candidate.entityType.value === rule.targetEntityType)) continue;
			violations.push({
				constraintKey,
				code: "reference-target",
				subject: fact.entityId,
				entityType: rule.entityType,
				attribute: rule.attribute,
				path: pathOf(rule.attribute),
				message: fact.value.type === "ref" ? `${rule.entityType}.${rule.attribute} references ${fact.value.value}, which is not a live ${rule.targetEntityType}` : `${rule.entityType}.${rule.attribute} must contain a reference to a ${rule.targetEntityType}`,
				actual: 1,
				valueIdentity: identity
			});
		}
	}
	return violations.sort((left, right) => left.entityType.localeCompare(right.entityType) || left.subject.localeCompare(right.subject) || left.path.localeCompare(right.path) || left.code.localeCompare(right.code) || left.constraintKey.localeCompare(right.constraintKey) || (left.valueIdentity ?? "").localeCompare(right.valueIdentity ?? ""));
});
const identityOf = (violation) => [
	violation.constraintKey,
	violation.code,
	violation.subject,
	violation.attribute,
	violation.valueIdentity ?? ""
].join("\0");
const patternMatches = (triple, op) => Effect.gen(function* () {
	const pattern = op.pattern;
	if (pattern.entityId !== void 0 && triple.entityId !== pattern.entityId) return false;
	if (pattern.attribute !== void 0 && triple.attribute !== pattern.attribute) return false;
	if (pattern.entityType !== void 0 && (!Option.isSome(triple.entityType) || triple.entityType.value !== pattern.entityType)) return false;
	if (pattern.value !== void 0) return sameMutationValue(triple.value, pattern.value);
	return true;
});
/** Retraction uses stored value spelling; canonical uniqueness is a separate contract. */
const sameMutationValue = (left, right) => {
	if (left.type !== right.type) return false;
	if (left.type === "json" && right.type === "json") return JSON.stringify(left.value) === JSON.stringify(right.value);
	if (left.type === "blob" && right.type === "blob") return left.value === right.value && left.mimeType === right.mimeType && left.size === right.size && left.filename === right.filename;
	return left.value === right.value;
};
/** Project a transaction onto live-recorded facts without mutating a backend. */
const project = (current, operations, instant) => Effect.gen(function* () {
	let projected = [...current];
	for (const [index, op] of operations.entries()) {
		if (op.op === "retract") {
			projected = projected.filter((fact) => fact.id !== op.id);
			continue;
		}
		if (op.op === "retract-pattern") {
			const matches = yield* Effect.forEach(projected, (fact) => patternMatches(fact, op));
			projected = projected.filter((_, factIndex) => !matches[factIndex]);
			continue;
		}
		projected.push({
			id: `constraint-pending-${index}`,
			entityId: op.entityId,
			attribute: op.attribute,
			value: op.value,
			recordedAt: instant,
			validFrom: op.validFrom ?? instant,
			validTo: op.validTo === void 0 ? Option.none() : Option.some(op.validTo),
			createdBy: op.createdBy === void 0 ? Option.none() : Option.some(op.createdBy),
			retractedAt: Option.none(),
			entityType: op.entityType === void 0 ? Option.none() : Option.some(op.entityType),
			schemaVersion: Option.none(),
			txId: Option.none(),
			retractTxId: Option.none()
		});
	}
	return projected;
});
/**
* Find constraints newly violated or worsened by a transaction at every
* valid-time boundary represented by its post-state.
*/
const newlyViolated = (current, operations, rules, instant) => Effect.gen(function* () {
	if (rules.length === 0) return [];
	const projected = yield* project(current, operations, instant);
	const boundaries = [...new Set([...current, ...projected].flatMap((fact) => [fact.validFrom, ...Option.isSome(fact.validTo) ? [fact.validTo.value] : []]))].sort((left, right) => left - right);
	const result = [];
	for (const validAt of boundaries) {
		const before = yield* evaluateFacts(current, rules, validAt);
		const after = yield* evaluateFacts(projected, rules, validAt);
		const prior = new Map(before.map((violation) => [identityOf(violation), violation.actual]));
		for (const violation of after) {
			const previousActual = prior.get(identityOf(violation));
			if (previousActual === void 0 || violation.actual > previousActual) result.push({
				...violation,
				validAt
			});
		}
	}
	return result;
});
//#endregion
export { Constraint_exports, RuleSchema, evaluateFacts, keyOf, loadRelevantFacts, newlyViolated, project, sameMutationValue };

//# sourceMappingURL=Constraint.js.map