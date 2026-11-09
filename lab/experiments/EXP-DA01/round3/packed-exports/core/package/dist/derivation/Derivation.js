import { unsafe } from "../Branded.js";
import { encode, encodeOrThrow } from "../content/CanonicalJson.js";
import { Domain, hash } from "../content/ContentId.js";
import { isNotClause, isPatternClause, isPredicateClause, isVariable } from "../datalog/schema.js";
import { extractDependencies } from "../subscriptions/extract-dependencies.js";
import { id } from "../config/TypeExpr.js";
import { normalize } from "../config/TypeSchema.js";
import { Data, Effect, Option } from "effect";
//#region src/derivation/Derivation.ts
var DefinitionError = class extends Data.TaggedError("DerivationDefinitionError") {};
var CandidateConflictError = class extends Data.TaggedError("DerivationCandidateConflictError") {};
const unique = (values) => [...new Set(values)];
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const definitionBody = (input, output, dependencies) => ({
	version: 1,
	name: input.name,
	query: input.query,
	identity: input.identity,
	output,
	configSnapshot: input.configSnapshot,
	resultType: input.resultType ? id(input.resultType) : null,
	dependencies
});
const make = (input) => Effect.gen(function* () {
	const output = input.output ?? input.query.find.filter(isVariable);
	if (input.name.length === 0) return yield* new DefinitionError({ message: "A derivation name must not be empty" });
	if (input.identity.length === 0 || input.identity.some((term) => !isVariable(term))) return yield* new DefinitionError({ message: "Derivation identity must contain at least one Datalog variable" });
	if (output.some((term) => !isVariable(term))) return yield* new DefinitionError({ message: "Derivation output entries must be variables" });
	if (input.identity.some((variable) => !output.includes(variable))) return yield* new DefinitionError({ message: "Every derivation identity variable must be part of its public output" });
	if (input.query.aggregate?.length || input.query.rules?.length || input.query.limit !== void 0 || input.query.offset !== void 0 || input.query.where.some((clause) => !isPatternClause(clause) && !isPredicateClause(clause) && !isNotClause(clause))) return yield* new DefinitionError({ message: "Provenance derivations currently support complete structural Datalog queries without rules, disjunction, aggregation, limit, or offset" });
	const discovered = extractDependencies(input.query);
	const dependencies = {
		attributes: [...discovered.attributes].sort(compare),
		entityTypes: [...discovered.entityTypes].sort(compare),
		boundEntityIds: [...discovered.boundEntityIds].sort(compare),
		hasDynamicAttributes: discovered.hasDynamicAttributes
	};
	const encoded = yield* encode(definitionBody(input, output, dependencies));
	return {
		...input,
		output,
		dependencies,
		id: hash(Domain.derivationDefinition, encoded)
	};
});
const positivePatterns = (query) => query.where.filter(isPatternClause);
const variablesInPatterns = (patterns) => unique(patterns.flatMap((pattern) => pattern.filter(isVariable)));
const tripleValueConstant = (value) => {
	switch (value.type) {
		case "integer": return value;
		case "json": return JSON.stringify(value.value);
		default: return value.value;
	}
};
const termValue = (term, row) => isVariable(term) ? row[term] ?? null : term;
const normalizedConstant = (value) => typeof value === "object" && value !== null && "type" in value && value.type !== "integer" ? value.value : value;
const termMatches = (term, actual, row) => {
	const expected = normalizedConstant(termValue(term, row));
	const observed = normalizedConstant(actual);
	if (typeof expected === "object" && expected !== null && expected.type === "integer") return typeof observed === "object" && observed !== null && observed.type === "integer" && expected.value === observed.value;
	return expected === observed;
};
const tripleMatches = (triple, clause, row) => termMatches(clause[0], triple.entityId, row) && termMatches(clause[1], triple.attribute, row) && termMatches(clause[2], tripleValueConstant(triple.value), row) && (clause.length === 3 || termMatches(clause[3], Option.getOrNull(triple.txId), row));
const transactionIsRelevant = (definition, transaction) => {
	if (transaction.actor === "triplex/derivation-materializer") return false;
	const attributes = new Set(definition.dependencies.attributes);
	return transaction.changes.some((change) => definition.dependencies.hasDynamicAttributes || attributes.has(change.attribute));
};
/**
* Find the earliest future valid-time edge in the current recorded view.
*
* Full Triples stores use their indexed dependency state. Restricted readers
* may provide a private schedule; dynamic-attribute readers fall back to the
* portable journal. All paths are conservative for query relevance: an
* unrelated entity may cause an extra wakeup, but cannot cause a missed one.
*/
const temporalBoundaryFromJournal = (triples, definition, basis) => Effect.gen(function* () {
	if (triples.temporalBoundary) return yield* triples.temporalBoundary(definition, basis);
	if (triples.dependencyState && !definition.dependencies.hasDynamicAttributes) return (yield* triples.dependencyState(definition.dependencies.attributes, basis)).nextTemporalBoundary;
	if (!triples.transactions) return void 0;
	const attributes = new Set(definition.dependencies.attributes);
	const live = /* @__PURE__ */ new Map();
	let after = 0;
	while (true) {
		const page = yield* triples.transactions({
			after,
			limit: 1e3
		});
		for (const transaction of page.transactions) {
			if (basis.recordedAt !== void 0 && transaction.instant > basis.recordedAt) continue;
			if (!transactionIsRelevant(definition, transaction)) continue;
			for (const change of transaction.changes) {
				if (!definition.dependencies.hasDynamicAttributes && !attributes.has(change.attribute)) continue;
				if (change.op === "retract") live.delete(change.tripleId);
				else live.set(change.tripleId, {
					...change.validFrom === void 0 ? {} : { validFrom: change.validFrom },
					...change.validTo === void 0 ? {} : { validTo: change.validTo }
				});
			}
		}
		if (page.next === void 0 || page.next <= after || page.transactions.length < 1e3) break;
		after = page.next;
	}
	const boundaries = [...live.values()].flatMap((fact) => [fact.validFrom, fact.validTo].filter((value) => value !== void 0 && value > basis.validAt));
	return boundaries.length === 0 ? void 0 : Math.min(...boundaries);
});
const sourcesForRow = (triples, patterns, row, basis, transactionPositions) => Effect.gen(function* () {
	const found = /* @__PURE__ */ new Map();
	for (const clause of patterns) {
		const entity = normalizedConstant(termValue(clause[0], row));
		const attribute = normalizedConstant(termValue(clause[1], row));
		const matches = yield* triples.match({
			...typeof entity === "string" ? { entityId: unsafe.entityId(entity) } : {},
			...typeof attribute === "string" ? { attribute } : {}
		}, basis);
		for (const triple of matches) if (tripleMatches(triple, clause, row)) found.set(triple.id, triple);
	}
	return yield* Effect.forEach([...found.values()].sort((left, right) => compare(left.id, right.id)), (triple) => Effect.gen(function* () {
		const transactionId = Option.getOrUndefined(triple.txId);
		const sourceMetadata = triples.sourceMetadata?.(triple);
		let transactionPosition;
		if (transactionId) {
			if (!transactionPositions.has(transactionId)) {
				const transaction = yield* triples.transaction(transactionId);
				transactionPositions.set(transactionId, transaction?.position);
			}
			transactionPosition = transactionPositions.get(transactionId);
		}
		return {
			tripleId: triple.id,
			...transactionId ? { transactionId } : {},
			...transactionPosition !== void 0 ? { transactionPosition } : {},
			entityId: triple.entityId,
			attribute: triple.attribute,
			validFrom: triple.validFrom,
			...Option.isSome(triple.validTo) ? { validTo: triple.validTo.value } : {},
			...sourceMetadata
		};
	}), { concurrency: 16 });
});
const binding = (variables, row) => Object.fromEntries(variables.map((variable) => [variable, row[variable] ?? null]));
const candidateIdentityId = (definitionName, identity) => {
	const encoded = encodeOrThrow({
		derivation: definitionName,
		identity
	});
	return hash(Domain.derivationIdentity, encoded);
};
const candidateRevisionId = (input) => {
	const encoded = encodeOrThrow({
		id: input.id,
		definition: input.definitionId,
		configSnapshot: input.configSnapshot,
		result: input.result,
		sources: input.sources
	});
	return hash(Domain.derivationCandidate, encoded);
};
const candidateFrom = (definition, basis, identity, result, sources) => {
	const id = candidateIdentityId(definition.name, identity);
	const revision = candidateRevisionId({
		id,
		definitionId: definition.id,
		configSnapshot: definition.configSnapshot,
		result,
		sources
	});
	const boundaries = sources.map((source) => source.validTo).filter((value) => value !== void 0 && value > basis.validAt);
	return {
		id,
		revision,
		definitionId: definition.id,
		configSnapshot: definition.configSnapshot,
		identity,
		result,
		basis,
		sources,
		...boundaries.length > 0 ? { nextTemporalBoundary: Math.min(...boundaries) } : {}
	};
};
const evaluate = (triples, definition, options) => Effect.gen(function* () {
	const patterns = positivePatterns(definition.query);
	const internalVariables = variablesInPatterns(patterns);
	const augmentedQuery = {
		...definition.query,
		find: unique([...definition.query.find, ...internalVariables])
	};
	const [response, nextTemporalBoundary] = yield* Effect.all([triples.queryAll(augmentedQuery, { basis: options.basis }), temporalBoundaryFromJournal(triples, definition, options.basis)]);
	const grouped = /* @__PURE__ */ new Map();
	const transactionPositions = /* @__PURE__ */ new Map();
	for (const row of response.results) {
		const publicResult = binding(definition.output, row);
		const normalizedResult = definition.resultType ? yield* normalize(definition.resultType, publicResult) : publicResult;
		const identity = binding(definition.identity, normalizedResult);
		const sources = yield* sourcesForRow(triples, patterns, row, options.basis, transactionPositions);
		const candidate = candidateFrom(definition, options.basis, identity, normalizedResult, sources);
		const previous = grouped.get(candidate.id);
		if (!previous) {
			grouped.set(candidate.id, candidate);
			continue;
		}
		if (encodeOrThrow(previous.result) !== encodeOrThrow(candidate.result)) return yield* new CandidateConflictError({
			definition: definition.id,
			candidate: candidate.id,
			message: `Derivation ${definition.name} produced different results for the same identity`
		});
		const mergedSources = [...new Map([...previous.sources, ...candidate.sources].map((source) => [source.tripleId, source])).values()].sort((left, right) => compare(left.tripleId, right.tripleId));
		grouped.set(candidate.id, candidateFrom(definition, options.basis, identity, normalizedResult, mergedSources));
	}
	return {
		definition,
		basis: options.basis,
		candidates: [...grouped.values()].sort((left, right) => compare(left.id, right.id)),
		...nextTemporalBoundary === void 0 ? {} : { nextTemporalBoundary }
	};
});
const reconcile = (previous, current) => {
	const before = new Map(previous.map((candidate) => [candidate.id, candidate]));
	const after = new Map(current.map((candidate) => [candidate.id, candidate]));
	const added = [];
	const removed = [];
	const changed = [];
	const unchanged = [];
	for (const candidate of current) {
		const prior = before.get(candidate.id);
		if (!prior) added.push(candidate);
		else if (prior.revision !== candidate.revision) changed.push({
			before: prior,
			after: candidate
		});
		else unchanged.push(candidate);
	}
	for (const candidate of previous) if (!after.has(candidate.id)) removed.push(candidate);
	added.sort((left, right) => compare(left.id, right.id));
	removed.sort((left, right) => compare(left.id, right.id));
	changed.sort((left, right) => compare(left.after.id, right.after.id));
	unchanged.sort((left, right) => compare(left.id, right.id));
	return {
		added,
		removed,
		changed,
		unchanged
	};
};
//#endregion
export { CandidateConflictError, DefinitionError, candidateIdentityId, candidateRevisionId, evaluate, make, reconcile };

//# sourceMappingURL=Derivation.js.map