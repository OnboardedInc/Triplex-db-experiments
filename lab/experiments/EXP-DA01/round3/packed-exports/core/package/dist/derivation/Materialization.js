import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { EntityId, TransactionId, TripleId, unsafe } from "../Branded.js";
import { encode } from "../content/CanonicalJson.js";
import { ContentIdSchema, Domain, hash, isContentId } from "../content/ContentId.js";
import { Constant } from "../datalog/schema.js";
import { transactSystem } from "../store/systemNamespace.js";
import { candidateIdentityId, candidateRevisionId, evaluate, reconcile } from "./Derivation.js";
import { Data, Effect, Option, Schema } from "effect";
//#region src/derivation/Materialization.ts
/**
* Durable, rebuildable checkpoints for derivation candidates.
*
* Runs and candidate revisions are immutable. The logical head is selected by
* `(sourcePosition, materializationPosition)`, so concurrent writers cannot
* corrupt a mutable pointer or make an older source position current merely by
* committing later. A run is one atomic Triples transaction.
*/
var Materialization_exports = /* @__PURE__ */ __exportAll({
	CorruptMaterializationError: () => CorruptMaterializationError,
	System: () => System,
	current: () => current,
	currentSourcePosition: () => currentSourcePosition,
	entityId: () => entityId,
	materialize: () => materialize,
	runsQuery: () => runsQuery
});
const System = {
	prefix: "_triplex/derivation/",
	entityType: {
		candidate: "triplex.derivation-candidate",
		run: "triplex.derivation-run"
	},
	attribute: {
		contentId: ":triplex/content-id",
		name: ":triplex/derivation-name",
		definition: ":triplex/derivation-definition",
		configSnapshot: ":triplex/derivation-config-snapshot",
		candidateId: ":triplex/derivation-candidate-id",
		candidateBody: ":triplex/derivation-candidate-body",
		runCandidate: ":triplex/derivation-run-candidate",
		formatVersion: ":triplex/derivation-format-version",
		sourcePosition: ":triplex/derivation-source-position",
		validAt: ":triplex/derivation-valid-at",
		recordedAt: ":triplex/derivation-recorded-at",
		nextTemporalBoundary: ":triplex/derivation-next-temporal-boundary"
	}
};
const entityId = {
	candidate: (revision) => unsafe.entityId(`${System.prefix}candidate/${revision}`),
	run: (id) => unsafe.entityId(`${System.prefix}run/${id}`)
};
const SourceFactSchema = Schema.Struct({
	tripleId: TripleId,
	transactionId: Schema.optional(TransactionId),
	transactionPosition: Schema.optional(Schema.Number),
	entityId: EntityId,
	attribute: Schema.String,
	validFrom: Schema.Number,
	validTo: Schema.optional(Schema.Number),
	hypothetical: Schema.optional(Schema.Boolean),
	hypotheticalContentId: Schema.optional(ContentIdSchema)
});
const BindingSchema = Schema.Record(Schema.String, Schema.NullOr(Constant));
const StoredCandidateSchema = Schema.Struct({
	id: ContentIdSchema,
	revision: ContentIdSchema,
	definitionId: ContentIdSchema,
	configSnapshot: Schema.String,
	identity: BindingSchema,
	result: BindingSchema,
	sources: Schema.Array(SourceFactSchema),
	nextTemporalBoundary: Schema.optional(Schema.Number)
});
var CorruptMaterializationError = class extends Data.TaggedError("CorruptDerivationMaterializationError") {};
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
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
const rowsAt = (rows, attribute) => rows.filter((row) => row.attribute === attribute);
const stringValue = (row) => row?.value.type === "string" || row?.value.type === "ref" ? row.value.value : void 0;
const numberValue = (row) => row?.value.type === "number" ? row.value.value : void 0;
const basisEqual = (left, right) => left.validAt === right.validAt && left.recordedAt === right.recordedAt;
const runBody = (input) => ({
	v: input.version,
	definition: input.definitionId,
	configSnapshot: input.configSnapshot,
	sourcePosition: input.sourcePosition,
	basis: input.basis,
	candidates: [...input.candidateRevisions].sort(),
	...input.version === 2 ? { nextTemporalBoundary: input.nextTemporalBoundary ?? null } : {}
});
const transactionIsRelevant = (definition, transaction) => {
	if (transaction.actor === "triplex/derivation-materializer") return false;
	const attributes = new Set(definition.dependencies.attributes);
	return transaction.changes.some((change) => definition.dependencies.hasDynamicAttributes || attributes.has(change.attribute));
};
/** Latest transaction position capable of changing this definition's answer. */
const currentSourcePosition = (triples, definition, basis) => definition.dependencies.hasDynamicAttributes ? Effect.gen(function* () {
	let after = 0;
	let latest = 0;
	while (true) {
		const page = yield* triples.transactions({
			after,
			limit: 1e3
		});
		for (const transaction of page.transactions) {
			if (basis?.recordedAt !== void 0 && transaction.instant > basis.recordedAt) continue;
			if (transactionIsRelevant(definition, transaction)) latest = transaction.position;
		}
		if (page.next === void 0 || page.next <= after || page.transactions.length < 1e3) return latest;
		after = page.next;
	}
}) : triples.dependencyState(definition.dependencies.attributes, basis).pipe(Effect.map((state) => state.sourcePosition));
const storedCandidate = (candidate) => ({
	id: candidate.id,
	revision: candidate.revision,
	definitionId: candidate.definitionId,
	configSnapshot: candidate.configSnapshot,
	identity: candidate.identity,
	result: candidate.result,
	sources: candidate.sources,
	...candidate.nextTemporalBoundary === void 0 ? {} : { nextTemporalBoundary: candidate.nextTemporalBoundary }
});
const candidateOperations = (candidate) => {
	const id = entityId.candidate(candidate.revision);
	return [
		assertOp(id, System.entityType.candidate, System.attribute.contentId, {
			type: "string",
			value: candidate.revision
		}),
		assertOp(id, System.entityType.candidate, System.attribute.definition, {
			type: "string",
			value: candidate.definitionId
		}),
		assertOp(id, System.entityType.candidate, System.attribute.configSnapshot, {
			type: "string",
			value: candidate.configSnapshot
		}),
		assertOp(id, System.entityType.candidate, System.attribute.candidateId, {
			type: "string",
			value: candidate.id
		}),
		assertOp(id, System.entityType.candidate, System.attribute.candidateBody, {
			type: "json",
			value: storedCandidate(candidate)
		})
	];
};
const decodeCandidate = (rows, name, basis) => {
	const body = rowsAt(rows, System.attribute.candidateBody)[0];
	if (body?.value.type !== "json") return Effect.fail(new CorruptMaterializationError({
		entityId: rows[0]?.entityId ?? "<unknown>",
		message: `Stored derivation candidate ${rows[0]?.entityId ?? "<unknown>"} has no body`
	}));
	return Schema.decodeUnknownEffect(StoredCandidateSchema)(body.value.value).pipe(Effect.flatMap((stored) => {
		const candidate = stored;
		const expectedId = candidateIdentityId(name, candidate.identity);
		const expectedRevision = candidateRevisionId(candidate);
		if (candidate.id === expectedId && candidate.revision === expectedRevision) return Effect.succeed({
			...candidate,
			basis
		});
		return Effect.fail(new CorruptMaterializationError({
			entityId: rows[0]?.entityId ?? "<unknown>",
			message: `Stored derivation candidate ${candidate.revision} failed content verification`
		}));
	}));
};
const loadRuns = (triples, name) => Effect.gen(function* () {
	const namedRuns = yield* triples.match({
		entityType: System.entityType.run,
		attribute: System.attribute.name,
		value: {
			type: "string",
			value: name
		}
	});
	const runEntities = [...new Set(namedRuns.map((row) => row.entityId))];
	const runRows = yield* triples.entities(runEntities);
	const runs = [];
	for (const [index, runEntity] of runEntities.entries()) {
		const rows = runRows[index];
		const id = stringValue(rowsAt(rows, System.attribute.contentId)[0]);
		const definitionId = stringValue(rowsAt(rows, System.attribute.definition)[0]);
		const configSnapshot = stringValue(rowsAt(rows, System.attribute.configSnapshot)[0]);
		const sourcePosition = numberValue(rowsAt(rows, System.attribute.sourcePosition)[0]);
		const validAt = numberValue(rowsAt(rows, System.attribute.validAt)[0]);
		const recordedAt = numberValue(rowsAt(rows, System.attribute.recordedAt)[0]);
		const formatVersion = numberValue(rowsAt(rows, System.attribute.formatVersion)[0]) ?? 1;
		const nextTemporalBoundary = numberValue(rowsAt(rows, System.attribute.nextTemporalBoundary)[0]);
		if (!id || !isContentId(id) || !definitionId || !isContentId(definitionId) || configSnapshot === void 0 || sourcePosition === void 0 || validAt === void 0 || formatVersion !== 1 && formatVersion !== 2) return yield* new CorruptMaterializationError({
			entityId: runEntity,
			message: `Stored derivation run ${runEntity} is missing required metadata`
		});
		const basis = {
			validAt,
			...recordedAt === void 0 ? {} : { recordedAt }
		};
		const candidateEntities = [...new Set(rowsAt(rows, System.attribute.runCandidate).map(stringValue).filter((value) => value !== void 0))];
		const candidateRows = yield* triples.entities(candidateEntities.map(unsafe.entityId));
		const candidates = yield* Effect.forEach(candidateRows, (candidate) => decodeCandidate(candidate, name, basis));
		const runEncoding = yield* encode(runBody({
			version: formatVersion,
			definitionId,
			configSnapshot,
			sourcePosition,
			basis,
			candidateRevisions: candidates.map((candidate) => candidate.revision),
			...nextTemporalBoundary === void 0 ? {} : { nextTemporalBoundary }
		}));
		if (hash(Domain.derivationRun, runEncoding) !== id) return yield* new CorruptMaterializationError({
			entityId: runEntity,
			message: `Stored derivation run ${id} failed content verification`
		});
		const transactionId = Option.getOrUndefined(rows[0].txId);
		const transaction = transactionId ? yield* triples.transaction(transactionId) : void 0;
		runs.push({
			id,
			entityId: runEntity,
			name,
			definitionId,
			configSnapshot,
			sourcePosition,
			materializationPosition: transaction?.position ?? 0,
			basis,
			candidates: [...candidates].sort((left, right) => compare(left.id, right.id)),
			...nextTemporalBoundary === void 0 ? {} : { nextTemporalBoundary }
		});
	}
	return runs;
});
const latestRunForName = (triples, name) => loadRuns(triples, name).pipe(Effect.map((runs) => [...runs].sort((left, right) => right.materializationPosition - left.materializationPosition || compare(right.id, left.id))[0]));
const latestRunForDefinition = (runs, definitionId) => [...runs].filter((run) => run.definitionId === definitionId).sort((left, right) => right.sourcePosition - left.sourcePosition || right.materializationPosition - left.materializationPosition || compare(right.id, left.id))[0];
/**
* Persist one immutable evaluation checkpoint and return its diff from the
* previously selected run for the same logical definition name.
*/
const materialize = (triples, definition, options) => Effect.gen(function* () {
	const [sourcePosition, previous] = yield* Effect.all([currentSourcePosition(triples, definition, options.basis), latestRunForName(triples, definition.name)]);
	const evaluation = yield* evaluate(triples, definition, options);
	const reconciliation = reconcile(previous?.candidates ?? [], evaluation.candidates);
	const candidateRevisions = evaluation.candidates.map((candidate) => candidate.revision).sort();
	const encoded = yield* encode(runBody({
		version: 2,
		definitionId: definition.id,
		configSnapshot: definition.configSnapshot,
		sourcePosition,
		basis: options.basis,
		candidateRevisions,
		...evaluation.nextTemporalBoundary === void 0 ? {} : { nextTemporalBoundary: evaluation.nextTemporalBoundary }
	}));
	const id = hash(Domain.derivationRun, encoded);
	const runEntity = entityId.run(id);
	const [existingRun, existingCandidates] = yield* Effect.all([triples.match({ entityId: runEntity }), Effect.forEach(evaluation.candidates, (candidate) => triples.match({ entityId: entityId.candidate(candidate.revision) }))]);
	const operations = [];
	for (const [index, candidate] of evaluation.candidates.entries()) if (existingCandidates[index].length === 0) operations.push(...candidateOperations(candidate));
	if (existingRun.length === 0) operations.push(assertOp(runEntity, System.entityType.run, System.attribute.contentId, {
		type: "string",
		value: id
	}), assertOp(runEntity, System.entityType.run, System.attribute.name, {
		type: "string",
		value: definition.name
	}), assertOp(runEntity, System.entityType.run, System.attribute.definition, {
		type: "string",
		value: definition.id
	}), assertOp(runEntity, System.entityType.run, System.attribute.configSnapshot, {
		type: "string",
		value: definition.configSnapshot
	}), assertOp(runEntity, System.entityType.run, System.attribute.sourcePosition, {
		type: "number",
		value: sourcePosition
	}), assertOp(runEntity, System.entityType.run, System.attribute.formatVersion, {
		type: "number",
		value: 2
	}), assertOp(runEntity, System.entityType.run, System.attribute.validAt, {
		type: "number",
		value: options.basis.validAt
	}), ...options.basis.recordedAt === void 0 ? [] : [assertOp(runEntity, System.entityType.run, System.attribute.recordedAt, {
		type: "number",
		value: options.basis.recordedAt
	})], ...evaluation.nextTemporalBoundary === void 0 ? [] : [assertOp(runEntity, System.entityType.run, System.attribute.nextTemporalBoundary, {
		type: "number",
		value: evaluation.nextTemporalBoundary
	})], ...evaluation.candidates.map((candidate) => assertOp(runEntity, System.entityType.run, System.attribute.runCandidate, {
		type: "ref",
		value: entityId.candidate(candidate.revision)
	})));
	const transaction = operations.length === 0 ? void 0 : yield* transactSystem(triples, operations, {
		actor: "triplex/derivation-materializer",
		configSnapshot: definition.configSnapshot
	});
	return {
		id,
		definitionId: definition.id,
		configSnapshot: definition.configSnapshot,
		sourcePosition,
		basis: options.basis,
		candidates: evaluation.candidates,
		...evaluation.nextTemporalBoundary === void 0 ? {} : { nextTemporalBoundary: evaluation.nextTemporalBoundary },
		reconciliation,
		transaction
	};
});
/** Last durable candidates plus an explicit freshness verdict. */
const current = (triples, definition, options) => Effect.gen(function* () {
	const [runs, currentPosition] = yield* Effect.all([loadRuns(triples, definition.name), currentSourcePosition(triples, definition, options.basis)]);
	const run = latestRunForDefinition(runs, definition.id) ?? [...runs].sort((left, right) => right.materializationPosition - left.materializationPosition || compare(right.id, left.id))[0];
	if (!run) return {
		status: "unmaterialized",
		currentPosition,
		candidates: []
	};
	return {
		status: run.definitionId === definition.id && run.sourcePosition === currentPosition && basisEqual(run.basis, options.basis) ? "current" : "stale",
		currentPosition,
		sourcePosition: run.sourcePosition,
		definitionId: run.definitionId,
		configSnapshot: run.configSnapshot,
		basis: run.basis,
		candidates: run.candidates,
		...run.nextTemporalBoundary === void 0 ? {} : { nextTemporalBoundary: run.nextTemporalBoundary }
	};
});
/** Query all immutable run/candidate memberships for auditing or composition. */
const runsQuery = (name) => ({
	find: [
		"?run",
		"?definition",
		"?sourcePosition",
		"?candidate"
	],
	where: [
		[
			"?run",
			System.attribute.name,
			name
		],
		[
			"?run",
			System.attribute.definition,
			"?definition"
		],
		[
			"?run",
			System.attribute.sourcePosition,
			"?sourcePosition"
		],
		[
			"?run",
			System.attribute.runCandidate,
			"?candidate"
		]
	]
});
//#endregion
export { CorruptMaterializationError, Materialization_exports, System, current, currentSourcePosition, entityId, materialize, runsQuery };

//# sourceMappingURL=Materialization.js.map