import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { unsafe } from "../Branded.js";
import { encode } from "../content/CanonicalJson.js";
import { Domain, hash, isContentId } from "../content/ContentId.js";
import { Triples } from "../store/Triples.js";
import { transactSystem } from "../store/systemNamespace.js";
import { TypeExprSchema, id } from "./TypeExpr.js";
import { compile } from "./TypeSchema.js";
import { make, walk } from "./ConfigNode.js";
import { ConfigStore, System as System$1, entityId as entityId$1 } from "./ConfigStore.js";
import { collect, evaluate } from "./GraphConstraint.js";
import { Context, Data, Effect, Layer, Result, Schema, SchemaIssue } from "effect";
//#region src/config/EntityValidation.ts
/**
* Validation of ordinary Triple entities against deployed runtime types.
*
* A validation is an observation, not a mutable flag on the entity. Results
* and individual violations are immutable, content-addressed facts. A small
* head entity identifies the latest result for `(ref, entity type, subject)`;
* moving that head is atomic, while the old result remains queryable forever.
*/
var EntityValidation_exports = /* @__PURE__ */ __exportAll({
	ENTITY_SCHEMA_KIND: () => ENTITY_SCHEMA_KIND,
	EntityValidation: () => EntityValidation,
	InvalidEntitySchemaError: () => InvalidEntitySchemaError,
	System: () => System,
	UnknownValidationRefError: () => UnknownValidationRefError,
	currentInvalidQuery: () => currentInvalidQuery,
	define: () => define,
	entityId: () => entityId,
	everInvalidQuery: () => everInvalidQuery,
	lastInvalidQuery: () => lastInvalidQuery,
	layer: () => layer,
	violationsQuery: () => violationsQuery
});
const ENTITY_SCHEMA_KIND = "entity-schema";
const System = {
	prefix: "_triplex/validation/",
	entityType: {
		result: "triplex.validation-result",
		violation: "triplex.validation-violation",
		head: "triplex.validation-head",
		run: "triplex.validation-run",
		checkpoint: "triplex.validation-checkpoint"
	},
	attribute: {
		contentId: ":triplex/content-id",
		ref: ":triplex/validation-ref",
		result: ":triplex/validation-result",
		runRef: ":triplex/validation-run-ref",
		runResult: ":triplex/validation-run-result",
		subject: ":triplex/validation-subject",
		entityType: ":triplex/validation-entity-type",
		schema: ":triplex/validation-schema",
		snapshot: ":triplex/validation-snapshot",
		snapshotRoot: ":triplex/validation-snapshot-root",
		valid: ":triplex/validation-valid",
		stateContentId: ":triplex/validation-state-content-id",
		sourcePosition: ":triplex/validation-source-position",
		code: ":triplex/validation-code",
		path: ":triplex/validation-path",
		message: ":triplex/validation-message",
		constraint: ":triplex/validation-constraint"
	}
};
const encodePart = (value) => encodeURIComponent(value);
const entityId = {
	result: (cid) => unsafe.entityId(`${System.prefix}result/${cid}`),
	violation: (cid) => unsafe.entityId(`${System.prefix}violation/${cid}`),
	run: (cid) => unsafe.entityId(`${System.prefix}run/${cid}`),
	checkpoint: (ref) => unsafe.entityId(`${System.prefix}checkpoint/${encodePart(ref)}`),
	head: (ref, entityType, subject) => unsafe.entityId(`${System.prefix}head/${encodePart(ref)}/${encodePart(entityType)}/${encodePart(subject)}`)
};
/** Define the runtime shape of entities carrying `entityType`. */
const define = (entityType, type) => make({
	kind: ENTITY_SCHEMA_KIND,
	key: entityType,
	attrs: {
		entityType,
		type
	}
});
const isViolationCode = (value) => value === "schema" || value === "required" || value === "cardinality" || value === "unique" || value === "reference-target";
var UnknownValidationRefError = class extends Data.TaggedError("UnknownValidationRefError") {};
var InvalidEntitySchemaError = class extends Data.TaggedError("InvalidEntitySchemaError") {};
var EntityValidation = class extends Context.Service()("triplex/EntityValidation") {};
const DefinitionSchema = Schema.Struct({
	entityType: Schema.String,
	type: TypeExprSchema
});
const parseDefinition = (node) => {
	const result = Schema.decodeUnknownResult(DefinitionSchema)(node.attrs);
	if (Result.isSuccess(result) && result.success.entityType === node.key) return Effect.succeed(result.success);
	return Effect.fail(new InvalidEntitySchemaError({
		key: node.key,
		message: Result.isFailure(result) ? `Invalid entity schema ${node.key}: ${result.failure.message}` : `Invalid entity schema ${node.key}: key and entityType must match`
	}));
};
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
const nativeValue = (value) => {
	if (value.type === "integer") return value;
	if (value.type === "blob") return {
		hash: value.value,
		mimeType: value.mimeType,
		size: value.size,
		...value.filename !== void 0 && { filename: value.filename }
	};
	return value.value;
};
const materialize = (triples, type) => Effect.gen(function* () {
	const byAttribute = /* @__PURE__ */ new Map();
	for (const triple of triples) {
		const values = byAttribute.get(triple.attribute) ?? [];
		values.push(nativeValue(triple.value));
		byAttribute.set(triple.attribute, values);
	}
	const state = {};
	for (const [attribute, unsorted] of [...byAttribute].sort(([a], [b]) => a.localeCompare(b))) {
		const values = [...yield* Effect.forEach(unsorted, (value) => encode(value).pipe(Effect.map((canonical) => ({
			canonical,
			value
		}))))].sort((a, b) => a.canonical.localeCompare(b.canonical)).map(({ value }) => value);
		const fieldType = type._tag === "Struct" ? type.fields[attribute]?.type : void 0;
		const expectsList = (expr) => {
			if (!expr) return false;
			if (expr._tag === "List") return true;
			if (expr._tag === "Constrained") return expectsList(expr.base);
			if (expr._tag === "Union") return expr.members.some(expectsList);
			return false;
		};
		state[attribute] = expectsList(fieldType) || values.length !== 1 ? values : values[0];
	}
	return state;
});
const formatPath = (path) => {
	if (!path || path.length === 0) return "$";
	return path.reduce((out, part) => {
		const key = typeof part === "object" ? part.key : part;
		if (typeof key === "number") return `${out}[${key}]`;
		const name = String(key);
		return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? `${out}.${name}` : `${out}[${JSON.stringify(name)}]`;
	}, "$");
};
const validationIssues = (type, state) => {
	const decoded = Schema.decodeUnknownResult(compile(type))(state);
	if (Result.isSuccess(decoded)) return [];
	return SchemaIssue.makeFormatterStandardSchemaV1()(decoded.failure.issue).issues.map((issue) => ({
		code: "schema",
		path: formatPath(issue.path),
		message: issue.message
	}));
};
const grouped = (triples) => {
	const out = /* @__PURE__ */ new Map();
	for (const triple of triples) {
		const rows = out.get(triple.entityId) ?? [];
		rows.push(triple);
		out.set(triple.entityId, rows);
	}
	return out;
};
const stringValue = (triple) => triple?.value.type === "string" || triple?.value.type === "ref" ? triple.value.value : void 0;
const rowsAt = (rows, attribute) => rows.filter((row) => row.attribute === attribute);
const numberValue = (triple) => triple?.value.type === "number" ? triple.value.value : void 0;
const currentInvalidQuery = (ref) => ({
	find: [
		"?subject",
		"?result",
		"?schema",
		"?snapshot"
	],
	where: [
		[
			entityId$1.ref(ref),
			System$1.attribute.target,
			"?snapshot"
		],
		[
			"?head",
			System.attribute.ref,
			ref
		],
		[
			"?head",
			System.attribute.result,
			"?result"
		],
		[
			"?result",
			System.attribute.snapshot,
			"?snapshot"
		],
		[
			"?result",
			System.attribute.valid,
			false
		],
		[
			"?result",
			System.attribute.subject,
			"?subject"
		],
		[
			"?result",
			System.attribute.schema,
			"?schema"
		]
	]
});
/** Last materialized invalid observations for a ref, even when now stale. */
const lastInvalidQuery = (ref) => ({
	find: [
		"?subject",
		"?result",
		"?schema",
		"?snapshot"
	],
	where: [
		[
			"?head",
			System.attribute.ref,
			ref
		],
		[
			"?head",
			System.attribute.result,
			"?result"
		],
		[
			"?result",
			System.attribute.snapshot,
			"?snapshot"
		],
		[
			"?result",
			System.attribute.valid,
			false
		],
		[
			"?result",
			System.attribute.subject,
			"?subject"
		],
		[
			"?result",
			System.attribute.schema,
			"?schema"
		]
	]
});
const everInvalidQuery = () => ({
	find: ["?subject"],
	where: [[
		"?result",
		System.attribute.valid,
		false
	], [
		"?result",
		System.attribute.subject,
		"?subject"
	]]
});
const violationsQuery = (input = {}) => {
	return {
		find: [
			"?violation",
			"?result",
			"?subject",
			"?entityType",
			"?code",
			"?path",
			"?message"
		],
		where: [
			...[
				[
					"?violation",
					System.attribute.result,
					"?result"
				],
				[
					"?violation",
					System.attribute.subject,
					"?subject"
				],
				[
					"?violation",
					System.attribute.code,
					"?code"
				],
				[
					"?violation",
					System.attribute.path,
					"?path"
				],
				[
					"?violation",
					System.attribute.message,
					"?message"
				],
				[
					"?result",
					System.attribute.entityType,
					"?entityType"
				]
			],
			...input.resultEntityId === void 0 ? [] : [[
				"?violation",
				System.attribute.result,
				{
					type: "ref",
					value: input.resultEntityId
				}
			]],
			...input.subject === void 0 ? [] : [[
				"?violation",
				System.attribute.subject,
				{
					type: "ref",
					value: input.subject
				}
			]]
		]
	};
};
const invalidFromRows = (rows) => rows.flatMap((row) => {
	const subject = row["?subject"];
	const resultEntityId = row["?result"];
	const schemaId = row["?schema"];
	const snapshotEntityId = row["?snapshot"];
	return typeof subject === "string" && typeof resultEntityId === "string" && typeof schemaId === "string" && isContentId(schemaId) && typeof snapshotEntityId === "string" ? [{
		subject,
		resultEntityId,
		schemaId,
		snapshotEntityId
	}] : [];
});
const makeService = Effect.gen(function* () {
	const triples = yield* Triples;
	const config = yield* ConfigStore;
	const latestSourcePosition = Effect.gen(function* () {
		let after = 0;
		let latest = 0;
		while (true) {
			const page = yield* triples.transactions({
				after,
				limit: 1e3
			});
			for (const transaction of page.transactions) if (transaction.actor !== "triplex/entity-validation") latest = transaction.position;
			if (page.next === void 0 || page.next <= after || page.transactions.length < 1e3) return latest;
			after = page.next;
		}
	});
	const revalidate = ({ ref }) => Effect.gen(function* () {
		const snapshot = yield* config.resolveRef(ref);
		if (!snapshot) return yield* new UnknownValidationRefError({
			ref,
			message: `Cannot validate entities because config ref ${ref} does not exist`
		});
		const sourcePosition = yield* latestSourcePosition;
		const definitions = [];
		const definedEntityTypes = /* @__PURE__ */ new Set();
		for (const { node } of walk(snapshot.root)) {
			if (node.kind !== "entity-schema") continue;
			const definition = yield* parseDefinition(node);
			if (definedEntityTypes.has(definition.entityType)) return yield* new InvalidEntitySchemaError({
				key: definition.entityType,
				message: `Config snapshot ${snapshot.id} contains more than one schema for ${definition.entityType}`
			});
			definedEntityTypes.add(definition.entityType);
			definitions.push(definition);
		}
		const graphViolations = yield* evaluate(triples, yield* collect(snapshot.root));
		const graphIssuesBySubject = /* @__PURE__ */ new Map();
		for (const violation of graphViolations) {
			const key = `${violation.entityType}\u0000${violation.subject}`;
			const current = graphIssuesBySubject.get(key) ?? [];
			current.push(violation);
			graphIssuesBySubject.set(key, current);
		}
		const checkpointEntity = entityId.checkpoint(ref);
		const [resultRows, violationRows, headRows, runRows, checkpointRows] = yield* Effect.all([
			triples.match({ entityType: System.entityType.result }),
			triples.match({ entityType: System.entityType.violation }),
			triples.match({ entityType: System.entityType.head }),
			triples.match({ entityType: System.entityType.run }),
			triples.match({ entityId: checkpointEntity })
		]);
		const knownResults = new Set(resultRows.map((row) => row.entityId));
		const knownViolations = new Set(violationRows.map((row) => row.entityId));
		const knownRuns = new Set(runRows.map((row) => row.entityId));
		const heads = grouped(headRows);
		const refHeads = new Map([...heads].filter(([, rows]) => rowsAt(rows, System.attribute.ref).some((row) => stringValue(row) === ref)));
		const operations = [];
		const preconditions = [];
		const results = [];
		const activeHeads = /* @__PURE__ */ new Set();
		const snapshotEntity = entityId$1.snapshot(snapshot.id);
		for (const definition of definitions.sort((a, b) => a.entityType.localeCompare(b.entityType))) {
			const schemaId = id(definition.type);
			const matching = yield* triples.match({ entityType: definition.entityType });
			const subjects = [...new Set(matching.map((row) => row.entityId))].sort();
			for (const subject of subjects) {
				const state = yield* materialize(yield* triples.entity(subject), definition.type);
				const stateCid = hash(Domain.validationState, yield* encode(state));
				const graphIssues = graphIssuesBySubject.get(`${definition.entityType}\u0000${subject}`) ?? [];
				const graphOwnedPaths = new Set(graphIssues.filter((issue) => issue.code === "required" || issue.code === "cardinality").map((issue) => issue.path));
				const issues = [...validationIssues(definition.type, state).filter((issue) => !graphOwnedPaths.has(issue.path)), ...graphIssues.map((issue) => ({
					code: issue.code,
					path: issue.path,
					message: issue.message,
					constraintKey: issue.constraintKey
				}))].sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code) || left.message.localeCompare(right.message));
				const resultEncoded = yield* encode({
					v: 1,
					subject,
					entityType: definition.entityType,
					schemaId,
					snapshotId: snapshot.id,
					snapshotRootCid: snapshot.rootCid,
					stateCid,
					issues: issues.map((issue) => ({
						code: issue.code,
						path: issue.path,
						message: issue.message,
						...issue.constraintKey === void 0 ? {} : { constraintKey: issue.constraintKey }
					}))
				});
				const resultId = hash(Domain.validationResult, resultEncoded);
				const resultEntity = entityId.result(resultId);
				const violations = [];
				for (const [index, issue] of issues.entries()) {
					const violationEncoded = yield* encode({
						v: 1,
						resultId,
						index,
						code: issue.code,
						path: issue.path,
						message: issue.message,
						...issue.constraintKey === void 0 ? {} : { constraintKey: issue.constraintKey }
					});
					const id = hash(Domain.validationViolation, violationEncoded);
					const violation = {
						id,
						resultId,
						subject,
						entityType: definition.entityType,
						schemaId,
						snapshotId: snapshot.id,
						code: issue.code,
						path: issue.path,
						message: issue.message,
						...issue.constraintKey === void 0 ? {} : { constraintKey: issue.constraintKey }
					};
					violations.push(violation);
					const violationEntity = entityId.violation(id);
					if (!knownViolations.has(violationEntity)) {
						operations.push(assertOp(violationEntity, System.entityType.violation, System.attribute.contentId, {
							type: "string",
							value: id
						}), assertOp(violationEntity, System.entityType.violation, System.attribute.result, {
							type: "ref",
							value: resultEntity
						}), assertOp(violationEntity, System.entityType.violation, System.attribute.subject, {
							type: "ref",
							value: subject
						}), assertOp(violationEntity, System.entityType.violation, System.attribute.code, {
							type: "string",
							value: violation.code
						}), assertOp(violationEntity, System.entityType.violation, System.attribute.path, {
							type: "string",
							value: violation.path
						}), assertOp(violationEntity, System.entityType.violation, System.attribute.message, {
							type: "string",
							value: violation.message
						}), ...violation.constraintKey === void 0 ? [] : [assertOp(violationEntity, System.entityType.violation, System.attribute.constraint, {
							type: "string",
							value: violation.constraintKey
						})]);
						knownViolations.add(violationEntity);
					}
				}
				const result = {
					id: resultId,
					subject,
					entityType: definition.entityType,
					schemaId,
					snapshotId: snapshot.id,
					snapshotRootCid: snapshot.rootCid,
					valid: issues.length === 0,
					stateCid,
					state,
					violations
				};
				results.push(result);
				if (!knownResults.has(resultEntity)) {
					operations.push(assertOp(resultEntity, System.entityType.result, System.attribute.contentId, {
						type: "string",
						value: resultId
					}), assertOp(resultEntity, System.entityType.result, System.attribute.subject, {
						type: "ref",
						value: subject
					}), assertOp(resultEntity, System.entityType.result, System.attribute.entityType, {
						type: "string",
						value: definition.entityType
					}), assertOp(resultEntity, System.entityType.result, System.attribute.schema, {
						type: "string",
						value: schemaId
					}), assertOp(resultEntity, System.entityType.result, System.attribute.snapshot, {
						type: "ref",
						value: snapshotEntity
					}), assertOp(resultEntity, System.entityType.result, System.attribute.snapshotRoot, {
						type: "string",
						value: snapshot.rootCid
					}), assertOp(resultEntity, System.entityType.result, System.attribute.valid, {
						type: "boolean",
						value: result.valid
					}), assertOp(resultEntity, System.entityType.result, System.attribute.stateContentId, {
						type: "string",
						value: stateCid
					}));
					knownResults.add(resultEntity);
				}
				const head = entityId.head(ref, definition.entityType, subject);
				activeHeads.add(head);
				const oldTargets = rowsAt(refHeads.get(head) ?? [], System.attribute.result);
				if (!oldTargets.some((row) => stringValue(row) === resultEntity)) {
					preconditions.push(...oldTargets.map((row) => ({
						_tag: "TripleLive",
						id: row.id
					})));
					operations.push(...oldTargets.map((row) => ({
						op: "retract",
						id: row.id
					})));
					if (!refHeads.has(head)) operations.push(assertOp(head, System.entityType.head, System.attribute.ref, {
						type: "string",
						value: ref
					}), assertOp(head, System.entityType.head, System.attribute.subject, {
						type: "ref",
						value: subject
					}), assertOp(head, System.entityType.head, System.attribute.entityType, {
						type: "string",
						value: definition.entityType
					}));
					operations.push(assertOp(head, System.entityType.head, System.attribute.result, {
						type: "ref",
						value: resultEntity
					}));
				}
			}
		}
		for (const [head, rows] of refHeads) {
			if (activeHeads.has(head)) continue;
			preconditions.push(...rowsAt(rows, System.attribute.result).map((row) => ({
				_tag: "TripleLive",
				id: row.id
			})));
			operations.push(...rowsAt(rows, System.attribute.result).map((row) => ({
				op: "retract",
				id: row.id
			})));
		}
		results.sort((a, b) => a.entityType.localeCompare(b.entityType) || a.subject.localeCompare(b.subject));
		const runEncoded = yield* encode({
			v: 1,
			ref,
			snapshotRootCid: snapshot.rootCid,
			sourcePosition,
			results: results.map((result) => result.id)
		});
		const runId = hash(Domain.validationRun, runEncoded);
		const runEntity = entityId.run(runId);
		if (!knownRuns.has(runEntity)) operations.push(assertOp(runEntity, System.entityType.run, System.attribute.contentId, {
			type: "string",
			value: runId
		}), assertOp(runEntity, System.entityType.run, System.attribute.runRef, {
			type: "string",
			value: ref
		}), assertOp(runEntity, System.entityType.run, System.attribute.snapshot, {
			type: "ref",
			value: snapshotEntity
		}), assertOp(runEntity, System.entityType.run, System.attribute.sourcePosition, {
			type: "number",
			value: sourcePosition
		}), ...results.map((result) => assertOp(runEntity, System.entityType.run, System.attribute.runResult, {
			type: "ref",
			value: entityId.result(result.id)
		})));
		const oldCheckpointRun = rowsAt(checkpointRows, System.attribute.result);
		const oldCheckpointSnapshot = rowsAt(checkpointRows, System.attribute.snapshot);
		const oldCheckpointPosition = rowsAt(checkpointRows, System.attribute.sourcePosition);
		if (!(oldCheckpointRun.some((row) => stringValue(row) === runEntity) && oldCheckpointSnapshot.some((row) => stringValue(row) === snapshotEntity) && oldCheckpointPosition.some((row) => numberValue(row) === sourcePosition))) {
			const movingCheckpointFacts = [
				...oldCheckpointRun,
				...oldCheckpointSnapshot,
				...oldCheckpointPosition
			];
			preconditions.push(...movingCheckpointFacts.map((row) => ({
				_tag: "TripleLive",
				id: row.id
			})));
			operations.push(...movingCheckpointFacts.map((row) => ({
				op: "retract",
				id: row.id
			})));
			if (checkpointRows.length === 0) operations.push(assertOp(checkpointEntity, System.entityType.checkpoint, System.attribute.ref, {
				type: "string",
				value: ref
			}));
			operations.push(assertOp(checkpointEntity, System.entityType.checkpoint, System.attribute.result, {
				type: "ref",
				value: runEntity
			}), assertOp(checkpointEntity, System.entityType.checkpoint, System.attribute.snapshot, {
				type: "ref",
				value: snapshotEntity
			}), assertOp(checkpointEntity, System.entityType.checkpoint, System.attribute.sourcePosition, {
				type: "number",
				value: sourcePosition
			}));
		}
		const transaction = operations.length === 0 ? void 0 : yield* transactSystem(triples, operations, {
			actor: "triplex/entity-validation",
			configSnapshot: snapshot.id,
			preconditions
		});
		return {
			id: runId,
			ref,
			snapshotId: snapshot.id,
			snapshotRootCid: snapshot.rootCid,
			sourcePosition,
			results,
			transaction
		};
	});
	return {
		revalidate,
		currentInvalid: (ref) => Effect.gen(function* () {
			const checkpointEntity = entityId.checkpoint(ref);
			const [checkpointRows, refRows, invalidResponse, currentPosition] = yield* Effect.all([
				triples.match({ entityId: checkpointEntity }),
				triples.match({ entityId: entityId$1.ref(ref) }),
				triples.queryAll(lastInvalidQuery(ref)),
				latestSourcePosition
			]);
			const sourcePosition = numberValue(rowsAt(checkpointRows, System.attribute.sourcePosition)[0]);
			const checkpointSnapshot = stringValue(rowsAt(checkpointRows, System.attribute.snapshot)[0]);
			const currentSnapshot = stringValue(rowsAt(refRows, System$1.attribute.target)[0]);
			const invalid = [...invalidFromRows(invalidResponse.results)].sort((a, b) => a.subject.localeCompare(b.subject) || a.resultEntityId.localeCompare(b.resultEntityId));
			if (sourcePosition === void 0 || checkpointSnapshot === void 0) return {
				status: "unvalidated",
				currentPosition,
				invalid: []
			};
			return {
				status: checkpointSnapshot === currentSnapshot && sourcePosition === currentPosition ? "current" : "stale",
				sourcePosition,
				currentPosition,
				invalid
			};
		}),
		everInvalid: () => triples.queryAll(everInvalidQuery()).pipe(Effect.map((response) => response.results.map((row) => row["?subject"]).filter((subject) => typeof subject === "string").sort())),
		violations: (input) => triples.queryAll(violationsQuery(input)).pipe(Effect.map((response) => response.results.flatMap((row) => {
			const violationEntityId = row["?violation"];
			const resultEntityId = row["?result"];
			const subject = row["?subject"];
			const entityType = row["?entityType"];
			const code = row["?code"];
			const path = row["?path"];
			const message = row["?message"];
			return typeof violationEntityId === "string" && typeof resultEntityId === "string" && typeof subject === "string" && typeof entityType === "string" && isViolationCode(code) && typeof path === "string" && typeof message === "string" ? [{
				violationEntityId,
				resultEntityId,
				subject,
				entityType,
				code,
				path,
				message
			}] : [];
		}).sort((a, b) => a.subject.localeCompare(b.subject) || a.path.localeCompare(b.path) || a.violationEntityId.localeCompare(b.violationEntityId))))
	};
});
const layer = Layer.effect(EntityValidation, makeService);
//#endregion
export { ENTITY_SCHEMA_KIND, EntityValidation, EntityValidation_exports, InvalidEntitySchemaError, System, UnknownValidationRefError, currentInvalidQuery, define, entityId, everInvalidQuery, lastInvalidQuery, layer, violationsQuery };

//# sourceMappingURL=EntityValidation.js.map