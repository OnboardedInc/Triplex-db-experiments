import { unsafe } from "../Branded.js";
import { loadRelevantFacts, newlyViolated } from "../Constraint.js";
import { resolveTemporalBasis } from "../Temporal.js";
import { CommandAlreadyCommittedError, ConstraintViolationError, DatalogError, DatalogValidationError, PaginationCursorError, ReadError, TransactionConflictError, UnboundVariableError, UnsupportedValueTypeError, WriteError } from "../errors/index.js";
import { encodeEntityPageCursor, prepareEntityPage } from "../EntityPage.js";
import { integer } from "../Value.js";
import { finishPagination, preparePagination, wrapDatalogQuery } from "../Pagination.js";
import { queryToPattern } from "../Triple.js";
import { Triples } from "./Triples.js";
import { validateDatalogQuery, validateWrappedQuery } from "../datalog/validation.js";
import { TxAttributes } from "../utils/id.js";
import { TripleStoreRuntime } from "./TripleStoreRuntime.js";
import { entityStatePreconditions, invalidCommandId, livePreconditionIds, metadataInputs, transactionChangeFromTriple, transactionRecordFromTriples, transactionRecordsFromTriples, validatePreconditions } from "./transactionMetadata.js";
import { isJournalSuppressed, isSystemWriteAuthorized, reservedAssertError, reservedWriteError } from "./systemNamespace.js";
import { transactionsForEntity } from "./entityTransactionHistory.js";
import { StorageAdapter } from "../storage/StorageAdapter.js";
import { QueryExecutor } from "../storage/QueryExecutor.js";
import { Effect, Layer, Option } from "effect";
//#region src/store/TriplesLive.ts
/**
* TriplesLive — the canonical `Triples` implementation over `StorageAdapter`
* plus `QueryExecutor`.
*
* Writes and triple-level reads go through the `StorageAdapter` abstraction so
* every SQL backend (SQLite, PostgreSQL, Cloudflare DO, …) can use its optimal
* primitives. Datalog reads go through the `QueryExecutor` SPI (compiles
* Datalog → SQL for SQL backends).
*
* The same service owns storage mutations and query execution.
*/
const rowToTriple = (row) => {
	let value;
	switch (row.value_type) {
		case "string":
			value = {
				type: "string",
				value: row.value_string ?? ""
			};
			break;
		case "number":
			value = {
				type: "number",
				value: Number(row.value_number ?? 0)
			};
			break;
		case "integer":
			value = integer(row.value_string);
			break;
		case "boolean":
			value = {
				type: "boolean",
				value: row.value_boolean === 1
			};
			break;
		case "datetime":
			value = {
				type: "datetime",
				value: Number(row.value_datetime ?? 0)
			};
			break;
		case "ref":
			value = {
				type: "ref",
				value: unsafe.entityId(row.value_string ?? "")
			};
			break;
		case "json":
			value = {
				type: "json",
				value: row.value_json ? JSON.parse(row.value_json) : null
			};
			break;
		case "blob": {
			const meta = row.value_json ? JSON.parse(row.value_json) : {};
			value = {
				type: "blob",
				value: row.value_string ?? "",
				mimeType: meta.mimeType ?? "application/octet-stream",
				size: meta.size ?? 0,
				...meta.filename !== void 0 && { filename: meta.filename }
			};
			break;
		}
		default: value = {
			type: "string",
			value: ""
		};
	}
	return {
		id: row.id,
		entityId: row.entity_id,
		attribute: row.attribute,
		value,
		recordedAt: Number(row.recorded_at),
		validFrom: Number(row.valid_from),
		validTo: row.valid_to !== null ? Option.some(Number(row.valid_to)) : Option.none(),
		createdBy: row.created_by ? Option.some(row.created_by) : Option.none(),
		retractedAt: row.retracted_at !== null ? Option.some(Number(row.retracted_at)) : Option.none(),
		entityType: row.entity_type ? Option.some(row.entity_type) : Option.none(),
		schemaVersion: row.schema_version ? Option.some(row.schema_version) : Option.none(),
		txId: row.tx_id ? Option.some(unsafe.transactionId(row.tx_id)) : Option.none(),
		retractTxId: row.retract_tx_id ? Option.some(unsafe.transactionId(row.retract_tx_id)) : Option.none()
	};
};
const TriplesLive = Layer.effect(Triples, Effect.gen(function* () {
	const adapter = yield* StorageAdapter;
	const executor = yield* QueryExecutor;
	const runtime = yield* TripleStoreRuntime;
	const now = runtime.now;
	const nextTripleId = runtime.nextTripleId;
	const nextTxId = runtime.nextTxId;
	yield* adapter.initialize();
	const assert_ = (input) => transact([{
		op: "assert",
		entityId: input.entityId,
		attribute: input.attribute,
		value: input.value,
		entityType: input.entityType,
		createdBy: input.createdBy,
		validFrom: input.validFrom,
		validTo: input.validTo
	}]).pipe(Effect.map((result) => result.triples[0]), Effect.mapError((cause) => cause instanceof WriteError ? cause : new WriteError({
		message: "Failed to assert triple",
		cause
	})));
	const assertBatch = (inputs) => {
		if (inputs.length === 0) return Effect.succeed([]);
		return transact(inputs.map((input) => ({
			op: "assert",
			entityId: input.entityId,
			attribute: input.attribute,
			value: input.value,
			entityType: input.entityType,
			createdBy: input.createdBy,
			validFrom: input.validFrom,
			validTo: input.validTo
		}))).pipe(Effect.map((result) => result.triples), Effect.mapError((cause) => cause instanceof WriteError ? cause : new WriteError({
			message: "Failed to assert triple batch",
			cause
		})));
	};
	/**
	* Flush a batch of consecutive assert ops using adapter.batchInsert().
	* Falls back to a single adapter.insert() for batches of 1.
	*/
	const flushAssertBatch = (assertOps, txId, timestamp, position, actor) => Effect.gen(function* () {
		if (assertOps.length === 0) return [];
		const inputs = assertOps.map((op) => {
			if (op.op !== "assert") throw new Error("unreachable");
			return {
				entityId: op.entityId,
				attribute: op.attribute,
				value: op.value,
				entityType: op.entityType,
				createdBy: op.createdBy ?? actor,
				validFrom: op.validFrom,
				validTo: op.validTo
			};
		});
		if (inputs.length === 1) return [rowToTriple(yield* adapter.insert(inputs[0], txId, timestamp, yield* nextTripleId, position))];
		return (yield* adapter.batchInsert(inputs, txId, timestamp, yield* Effect.all(inputs.map(() => nextTripleId)), position)).map(rowToTriple);
	});
	const transact = (operations, meta) => Effect.flatMap(Effect.try({
		try: () => ({
			operations: structuredClone(operations),
			meta: meta === void 0 ? void 0 : {
				...meta,
				...structuredClone(meta)
			}
		}),
		catch: (cause) => new WriteError({
			message: "Cannot snapshot transaction command",
			cause
		})
	}), ({ operations, meta }) => adapter.withTransaction(Effect.gen(function* () {
		const unsupportedValue = operations.find((operation) => operation.op === "assert" && !(adapter.supportedValueTypes?.includes(operation.value.type) ?? operation.value.type !== "integer"));
		if (unsupportedValue?.op === "assert") return yield* Effect.fail(new UnsupportedValueTypeError("storage adapter", unsupportedValue.value.type));
		if (!isSystemWriteAuthorized(meta)) {
			const reserved = reservedAssertError(operations);
			if (reserved) return yield* Effect.fail(reserved);
		}
		const invalidCondition = validatePreconditions(operations, meta);
		if (invalidCondition) return yield* Effect.fail(new WriteError({ message: `Transaction precondition ${invalidCondition} must have a matching retract operation` }));
		if (invalidCommandId(meta) !== void 0) return yield* Effect.fail(new WriteError({ message: "Command ID must contain between 1 and 1024 characters" }));
		const txId = yield* nextTxId;
		const timestamp = yield* now;
		if (meta?.commandId !== void 0) {
			const originalTransactionId = yield* adapter.claimCommand(meta.commandId, txId, timestamp);
			if (originalTransactionId !== null) return yield* Effect.fail(new CommandAlreadyCommittedError({
				commandId: meta.commandId,
				transactionId: unsafe.transactionId(originalTransactionId),
				message: `Command ${meta.commandId} already committed as ${originalTransactionId}`
			}));
		}
		const position = yield* adapter.nextCommitPosition();
		const actor = meta?.actor;
		const preconditionIds = livePreconditionIds(meta);
		for (const condition of entityStatePreconditions(meta)) {
			const actual = (yield* adapter.getByEntity(condition.entityId)).map((row) => row.id).sort();
			const expected = [...condition.tripleIds].sort();
			if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) return yield* Effect.fail(new TransactionConflictError({
				entityId: condition.entityId,
				message: `Expected entity ${condition.entityId} to have the observed fact set, but another transaction changed it`
			}));
		}
		if (meta?.enforce !== void 0) {
			const constraints = meta.enforce.constraints;
			const violations = (adapter.validateConstraints === void 0 ? void 0 : yield* adapter.validateConstraints({
				operations,
				constraints,
				instant: timestamp
			})) ?? (yield* Effect.gen(function* () {
				return yield* newlyViolated(yield* loadRelevantFacts(constraints, operations, {
					byEntityType: (entityType) => adapter.query({ entityType }).pipe(Effect.map((rows) => rows.map(rowToTriple))),
					byEntities: (entityIds) => adapter.getByEntities(entityIds).pipe(Effect.map((rows) => entityIds.flatMap((entityId) => (rows.get(entityId) ?? []).map(rowToTriple))))
				}), operations, constraints, timestamp).pipe(Effect.mapError((cause) => new WriteError({
					message: `Constraint evaluation failed: ${cause.message}`,
					cause
				})));
			}));
			if (violations.length > 0) return yield* Effect.fail(new ConstraintViolationError({
				violations,
				message: `Transaction would introduce or worsen ${violations.length} graph constraint violation${violations.length === 1 ? "" : "s"}`
			}));
		}
		const triples = [];
		const changes = [];
		let retractedCount = 0;
		let pendingAsserts = [];
		for (const op of operations) {
			if (op.op === "assert") {
				pendingAsserts.push(op);
				continue;
			}
			if (pendingAsserts.length > 0) {
				const batch = yield* flushAssertBatch(pendingAsserts, txId, timestamp, position, actor);
				triples.push(...batch);
				changes.push(...batch.map((triple) => transactionChangeFromTriple("assert", triple, txId, timestamp)));
				pendingAsserts = [];
			}
			switch (op.op) {
				case "retract": {
					const current = yield* adapter.getById(op.id);
					if (current && !isSystemWriteAuthorized(meta)) {
						const reserved = reservedWriteError({
							entityId: current.entity_id,
							attribute: current.attribute,
							entityType: current.entity_type ?? void 0
						});
						if (reserved) return yield* Effect.fail(reserved);
					}
					const didRetract = yield* adapter.retract(op.id, timestamp, txId, position);
					if (!didRetract && preconditionIds.has(op.id)) return yield* Effect.fail(new TransactionConflictError({
						tripleId: op.id,
						message: `Expected live triple ${op.id}, but another transaction changed it`
					}));
					if (didRetract) {
						retractedCount++;
						if (current) changes.push(transactionChangeFromTriple("retract", rowToTriple(current), txId, timestamp));
					}
					break;
				}
				case "retract-pattern": {
					const pattern = queryToPattern(op.pattern);
					const matched = yield* adapter.query(pattern);
					if (!isSystemWriteAuthorized(meta)) for (const row of matched) {
						const reserved = reservedWriteError({
							entityId: row.entity_id,
							attribute: row.attribute,
							entityType: row.entity_type ?? void 0
						});
						if (reserved) return yield* Effect.fail(reserved);
					}
					for (const row of matched) if (yield* adapter.retract(row.id, timestamp, txId, position)) {
						retractedCount++;
						changes.push(transactionChangeFromTriple("retract", rowToTriple(row), txId, timestamp));
					}
					break;
				}
			}
		}
		if (pendingAsserts.length > 0) {
			const batch = yield* flushAssertBatch(pendingAsserts, txId, timestamp, position, actor);
			triples.push(...batch);
			changes.push(...batch.map((triple) => transactionChangeFromTriple("assert", triple, txId, timestamp)));
		}
		if (!isJournalSuppressed(meta)) for (const input of metadataInputs(txId, position, timestamp, meta, changes)) yield* adapter.insert(input, txId, timestamp, yield* nextTripleId, position);
		return {
			txId,
			position,
			instant: timestamp,
			triples,
			retracted: retractedCount
		};
	}), { replaySafe: true }));
	const retract = (id) => transact([{
		op: "retract",
		id
	}]).pipe(Effect.flatMap((result) => result.retracted === 1 ? Effect.void : Effect.fail(new WriteError({ message: `Triple not found or already retracted: ${id}` }))), Effect.mapError((cause) => cause instanceof WriteError ? cause : new WriteError({
		message: `Failed to retract triple: ${id}`,
		cause
	})));
	const retractByPattern = (pattern) => transact([{
		op: "retract-pattern",
		pattern: {
			...typeof pattern.entityId === "string" ? { entityId: pattern.entityId } : {},
			...typeof pattern.attribute === "string" ? { attribute: pattern.attribute } : {},
			...pattern.value && !("_tag" in pattern.value) ? { value: pattern.value } : {},
			...pattern.entityType ? { entityType: pattern.entityType } : {}
		}
	}]).pipe(Effect.map((result) => result.retracted), Effect.mapError((cause) => cause instanceof WriteError || cause instanceof ReadError ? cause : new WriteError({
		message: "Failed to retract by pattern",
		cause
	})));
	const get = (id) => Effect.gen(function* () {
		const row = yield* adapter.getById(id);
		return row ? rowToTriple(row) : null;
	});
	const entity = (entityId, basis) => Effect.gen(function* () {
		const resolved = resolveTemporalBasis(basis, yield* now);
		return (yield* adapter.getByEntity(entityId, resolved)).map(rowToTriple);
	});
	const entities = (entityIds, basis) => Effect.gen(function* () {
		const resolved = resolveTemporalBasis(basis, yield* now);
		const rows = yield* adapter.getByEntities(entityIds, resolved);
		return entityIds.map((id) => (rows.get(id) ?? []).map(rowToTriple));
	});
	const entityPage = (request) => Effect.gen(function* () {
		const currentTime = yield* now;
		const recordedPosition = yield* adapter.currentCommitPosition();
		const prepared = yield* Effect.try({
			try: () => prepareEntityPage({
				request,
				now: currentTime,
				recordedPosition,
				scope: runtime.scope
			}),
			catch: (cause) => cause instanceof PaginationCursorError ? cause : new PaginationCursorError({
				reason: "malformed",
				message: `Failed to prepare entity page: ${String(cause)}`,
				cause
			})
		});
		const facts = yield* adapter.query({ entityType: request.entityType }, prepared.basis);
		const ids = [...new Set(facts.map((row) => row.entity_id))].sort().filter((id) => prepared.after === void 0 || id > prepared.after);
		const selected = ids.slice(0, prepared.limit);
		const rows = yield* adapter.getByEntities(selected, prepared.basis);
		return {
			entities: selected.map((id) => (rows.get(id) ?? []).map(rowToTriple)),
			snapshot: prepared.basis,
			...ids.length > prepared.limit ? { nextCursor: encodeEntityPageCursor(prepared, selected.at(-1)) } : {}
		};
	});
	const match = (pattern, basis) => Effect.gen(function* () {
		const resolved = resolveTemporalBasis(basis, yield* now);
		return (yield* adapter.query(pattern, resolved)).map(rowToTriple);
	});
	const history = (entityId) => Effect.gen(function* () {
		return (yield* adapter.history(entityId)).map(rowToTriple);
	});
	const transaction = (txId) => adapter.query({
		entityId: unsafe.entityId(txId),
		entityType: "_Transaction"
	}).pipe(Effect.map((rows) => transactionRecordFromTriples(txId, rows.map(rowToTriple))));
	const transactionByCommand = (commandId) => adapter.query({
		attribute: TxAttributes.COMMAND_ID,
		value: {
			type: "string",
			value: commandId
		}
	}).pipe(Effect.flatMap((rows) => rows[0] === void 0 ? Effect.succeed(null) : transaction(unsafe.transactionId(rows[0].entity_id))));
	const transactions = (request = {}) => {
		const after = request.after ?? 0;
		const limit = request.limit ?? 100;
		if (!Number.isSafeInteger(after) || after < 0) return Effect.fail(new ReadError({ message: "Transaction cursor must be a non-negative integer" }));
		if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1e3) return Effect.fail(new ReadError({ message: "Transaction page limit must be between 1 and 1000" }));
		return adapter.query({ entityType: "_Transaction" }).pipe(Effect.map((rows) => {
			const page = transactionRecordsFromTriples(rows.map(rowToTriple)).filter((record) => record.position > after).slice(0, limit);
			const last = page.at(-1);
			return {
				transactions: page,
				...last ? { next: last.position } : {}
			};
		}));
	};
	const entityTransactions = (entityId, request) => transactionsForEntity({
		currentPosition: adapter.currentCommitPosition,
		query: queryAll,
		transaction
	}, entityId, request);
	const queryAll = (q, options) => Effect.gen(function* () {
		const includeBasis = options?.includeBasis === true;
		const basis = {
			...resolveTemporalBasis(options?.basis, yield* now),
			...includeBasis ? { recordedPosition: yield* adapter.currentCommitPosition() } : {}
		};
		const result = yield* executor.execute(q, options?.debug ?? false, basis);
		return includeBasis ? {
			...result,
			basis: {
				...basis,
				scope: runtime.scope,
				recordedPosition: basis.recordedPosition
			}
		} : result;
	}).pipe(Effect.withSpan("triples.query"));
	const queryPage = (q, options) => Effect.gen(function* () {
		const query = yield* validateWrappedQuery(q);
		const currentTime = yield* now;
		const recordedPosition = yield* adapter.currentCommitPosition();
		const prepared = yield* Effect.try({
			try: () => preparePagination({
				query,
				...options?.basis === void 0 ? {} : { basis: options.basis },
				now: currentTime,
				recordedPosition,
				scope: runtime.scope
			}),
			catch: (cause) => cause instanceof PaginationCursorError ? cause : new PaginationCursorError({
				reason: "malformed",
				message: `Failed to prepare pagination: ${String(cause)}`,
				cause
			})
		});
		const answer = finishPagination(prepared, yield* executor.executePage(prepared.query, options?.debug ?? false, prepared.basis, prepared.cursorValues));
		return options?.includeBasis ? {
			...answer,
			basis: {
				...prepared.basis,
				scope: runtime.scope
			}
		} : answer;
	}).pipe(Effect.withSpan("triples.queryPage"));
	const query = (q, options) => validateDatalogQuery(q).pipe(Effect.flatMap((validated) => queryPage(wrapDatalogQuery(validated, options), options)));
	const explain = (q) => executor.explain(q).pipe(Effect.mapError((error) => error instanceof DatalogValidationError || error instanceof UnboundVariableError ? error : new DatalogError({
		message: error.message,
		cause: error.cause
	})), Effect.withSpan("triples.explain"));
	const explainPage = (q) => executor.explainPage(q).pipe(Effect.mapError((error) => error instanceof DatalogValidationError || error instanceof UnboundVariableError ? error : new DatalogError({
		message: error.message,
		cause: error.cause
	})), Effect.withSpan("triples.explainPage"));
	return {
		assert: assert_,
		assertBatch,
		retract,
		retractByPattern,
		transact,
		get,
		entity,
		entities,
		entityPage,
		match,
		history,
		transaction,
		transactionByCommand,
		transactions,
		transactionsForEntity: entityTransactions,
		currentPosition: adapter.currentCommitPosition,
		dependencyState: (attributes, basis) => Effect.gen(function* () {
			const resolved = resolveTemporalBasis(basis, yield* now);
			return yield* adapter.dependencyState(attributes, resolved);
		}),
		query,
		queryPage,
		queryAll,
		explain,
		explainPage
	};
}));
//#endregion
export { TriplesLive };

//# sourceMappingURL=TriplesLive.js.map