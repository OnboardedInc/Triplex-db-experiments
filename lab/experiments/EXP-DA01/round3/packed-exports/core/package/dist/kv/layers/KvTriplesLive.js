import { unsafe } from "../../Branded.js";
import { loadRelevantFacts, newlyViolated } from "../../Constraint.js";
import { resolveTemporalBasis } from "../../Temporal.js";
import { CommandAlreadyCommittedError, ConstraintViolationError, DatalogValidationError, PaginationCursorError, ReadError, TransactionConflictError, UnboundVariableError, UnsupportedValueTypeError, WriteError } from "../../errors/index.js";
import { Domain, hash } from "../../content/ContentId.js";
import { encodeEntityPageCursor, prepareEntityPage } from "../../EntityPage.js";
import { finishPagination, preparePagination, wrapDatalogQuery } from "../../Pagination.js";
import { Triples } from "../../store/Triples.js";
import { validateDatalogQuery, validateWrappedQuery } from "../../datalog/validation.js";
import { KvBackend } from "../kv/KvBackend.js";
import { makeTestKvBackend } from "../kv/InMemoryKvBackend.js";
import { createKvTripleStore } from "../hexastore/KvTripleStore.js";
import { executeQuery, executeWrappedQuery } from "../datalog/executor.js";
import { TxAttributes } from "../../utils/id.js";
import { TripleStoreRuntime, TripleStoreRuntimeLayer, makeTripleStoreRuntimeLayer } from "../../store/TripleStoreRuntime.js";
import { entityStatePreconditions, invalidCommandId, livePreconditionIds, metadataInputs, transactionChangeFromTriple, transactionRecordFromTriples, transactionRecordsFromTriples, validatePreconditions } from "../../store/transactionMetadata.js";
import { isJournalSuppressed, isSystemWriteAuthorized, reservedAssertError, reservedWriteError } from "../../store/systemNamespace.js";
import { transactionsForEntity } from "../../store/entityTransactionHistory.js";
import { Effect, Layer, Option, Stream } from "effect";
//#region src/kv/layers/KvTriplesLive.ts
/**
* KV-backed implementation of the merged `Triples` service.
*
* It calls `createKvTripleStore(kvBackend)` **once** and builds both the
* write/triple-read path and the Datalog path over that single hexastore
* handle, keeping their in-memory datom cache coherent.
*/
const COMMIT_POSITION_KEY = new Uint8Array([33]);
const COMMAND_RECEIPT_PREFIX = 34;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const commandReceiptKey = (commandId) => {
	const digest = textEncoder.encode(hash(Domain.commandReceipt, commandId));
	const key = new Uint8Array(digest.length + 1);
	key[0] = COMMAND_RECEIPT_PREFIX;
	key.set(digest, 1);
	return key;
};
const claimKvCommand = (tx, commandId, transactionId) => Effect.gen(function* () {
	const key = commandReceiptKey(commandId);
	const existing = yield* tx.get(key);
	if (existing !== null) return textDecoder.decode(existing);
	yield* tx.set(key, textEncoder.encode(transactionId));
	return null;
});
const nextKvCommitPosition = (tx) => Effect.gen(function* () {
	const stored = yield* tx.get(COMMIT_POSITION_KEY);
	const current = stored === null ? 0 : Number(textDecoder.decode(stored));
	if (!Number.isSafeInteger(current) || current < 0 || current >= Number.MAX_SAFE_INTEGER) return yield* Effect.fail(new WriteError({ message: "Invalid or exhausted KV commit-position counter" }));
	const next = current + 1;
	yield* tx.set(COMMIT_POSITION_KEY, textEncoder.encode(String(next)));
	return next;
});
const currentKvCommitPosition = (backend) => backend.get(COMMIT_POSITION_KEY).pipe(Effect.flatMap((stored) => {
	const position = stored === null ? 0 : Number(textDecoder.decode(stored));
	return Number.isSafeInteger(position) && position >= 0 ? Effect.succeed(position) : Effect.fail(new ReadError({ message: "Invalid KV commit-position counter" }));
}), Effect.mapError((cause) => cause instanceof ReadError ? cause : new ReadError({
	message: `Failed to read KV commit position: ${String(cause)}`,
	cause
})));
const dependencyStateFromDatoms = (datoms, basis) => {
	let sourcePosition = 0;
	let nextTemporalBoundary;
	for (const datom of datoms) {
		if (!(basis.recordedPosition !== void 0 ? datom.recordedPosition <= basis.recordedPosition : basis.recordedAt === void 0 || datom.recordedAt <= basis.recordedAt)) continue;
		sourcePosition = Math.max(sourcePosition, datom.recordedPosition);
		if (datom.retractedPosition !== null && (basis.recordedPosition !== void 0 ? datom.retractedPosition <= basis.recordedPosition : basis.recordedAt === void 0 || datom.retractedAt !== null && datom.retractedAt <= basis.recordedAt)) {
			sourcePosition = Math.max(sourcePosition, datom.retractedPosition);
			continue;
		}
		for (const boundary of [datom.validFrom, datom.validTo]) if (boundary !== null && boundary > basis.validAt && (nextTemporalBoundary === void 0 || boundary < nextTemporalBoundary)) nextTemporalBoundary = boundary;
	}
	return {
		sourcePosition,
		...nextTemporalBoundary === void 0 ? {} : { nextTemporalBoundary }
	};
};
const datomToTriple = (datom) => ({
	id: datom.tripleId,
	entityId: datom.entity,
	attribute: datom.attribute,
	value: datom.value,
	recordedAt: datom.recordedAt,
	validFrom: datom.validFrom,
	validTo: datom.validTo !== null ? Option.some(datom.validTo) : Option.none(),
	createdBy: datom.createdBy !== null ? Option.some(datom.createdBy) : Option.none(),
	retractedAt: datom.retractedAt !== null ? Option.some(datom.retractedAt) : Option.none(),
	entityType: datom.entityType !== null ? Option.some(datom.entityType) : Option.none(),
	schemaVersion: Option.none(),
	txId: Option.some(unsafe.transactionId(datom.txId)),
	retractTxId: datom.retractTxId !== null ? Option.some(unsafe.transactionId(datom.retractTxId)) : Option.none()
});
const tripleInputToDatom = (input, tripleId, txId, recordedAt, recordedPosition) => ({
	tripleId,
	entity: input.entityId,
	attribute: input.attribute,
	value: input.value,
	txId,
	recordedAt,
	recordedPosition,
	validFrom: input.validFrom ?? recordedAt,
	validTo: input.validTo ?? null,
	createdBy: input.createdBy ?? null,
	retractedAt: null,
	retractedPosition: null,
	retractTxId: null,
	entityType: input.entityType ?? null
});
const patternToScan = (pattern) => {
	const result = {};
	if (pattern.entityId !== void 0 && typeof pattern.entityId === "string") result.entity = pattern.entityId;
	if (pattern.attribute !== void 0 && typeof pattern.attribute === "string") result.attribute = pattern.attribute;
	if (pattern.value !== void 0 && typeof pattern.value === "object" && pattern.value !== null && !("_tag" in pattern.value)) result.value = pattern.value;
	return result;
};
const makeKvMetrics = (query) => ({
	joinCount: 0,
	whereConditionCount: query.where.length,
	subqueryCount: 0,
	cteCount: 0,
	sqlLength: 0,
	paramCount: 0,
	patternCount: query.where.filter((c) => Array.isArray(c) && c.length >= 3 && c.length <= 4).length,
	predicateCount: query.where.filter((c) => Array.isArray(c) && [
		">",
		">=",
		"<",
		"<=",
		"=",
		"!="
	].includes(c[0])).length,
	notClauseCount: query.where.filter((c) => Array.isArray(c) && c[0] === "not").length,
	orClauseCount: query.where.filter((c) => Array.isArray(c) && c[0] === "or").length,
	hasAggregation: (query.aggregate?.length ?? 0) > 0,
	isRecursive: (query.rules?.length ?? 0) > 0,
	aggregateOps: (query.aggregate ?? []).map((a) => a[0]),
	compilationTimeMs: 0
});
/** Adapt a backend transaction to the interface consumed by KvTripleStore. */
const transactionBackend = (tx) => ({
	get: tx.get,
	set: tx.set,
	delete: tx.delete,
	getRange: tx.getRange,
	transact: (effect) => effect(tx),
	setAll: (entries) => Effect.forEach(entries, ([key, value]) => tx.set(key, value), { discard: true }),
	getMany: (keys) => Effect.forEach(keys, (key) => tx.get(key).pipe(Effect.map((value) => [key, value]))),
	clear: () => Effect.die("KvTripleStore.clear is not supported inside a transaction")
});
const makeKvTriplesService = Effect.gen(function* () {
	const kvBackend = yield* KvBackend;
	const runtime = yield* TripleStoreRuntime;
	const hexaStore = createKvTripleStore(kvBackend);
	const match = (pattern, basis) => Effect.gen(function* () {
		if (pattern.entityType && !pattern.entityId && !pattern.attribute && !pattern.value) {
			const datoms = basis === void 0 ? hexaStore.getByEntityType(pattern.entityType) : null;
			if (datoms !== null) return datoms.map(datomToTriple);
			return (basis === void 0 ? yield* hexaStore.getByEntityTypeAsync(pattern.entityType) : yield* hexaStore.scanCollectTemporalAsync({}, basis)).filter((datom) => datom.entityType === pattern.entityType).map(datomToTriple);
		}
		const scanPat = patternToScan(pattern);
		const syncDatoms = basis === void 0 ? hexaStore.scanCollect(scanPat) : hexaStore.scanCollectTemporal(scanPat, basis);
		let results;
		if (syncDatoms !== null) {
			if (pattern.entityType) {
				results = [];
				for (let i = 0; i < syncDatoms.length; i++) {
					const d = syncDatoms[i];
					if (d.entityType === pattern.entityType) results.push(datomToTriple(d));
				}
				return results;
			}
			results = syncDatoms.map(datomToTriple);
		} else results = (yield* basis === void 0 ? hexaStore.scanCollectAsync(scanPat) : hexaStore.scanCollectTemporalAsync(scanPat, basis)).map(datomToTriple);
		if (pattern.entityType) results = results.filter((t) => Option.isSome(t.entityType) && t.entityType.value === pattern.entityType);
		return results;
	}).pipe(Effect.catch((e) => Effect.fail(new ReadError({
		message: `Query failed: ${String(e)}`,
		cause: e
	}))));
	let transactService;
	const service = {
		assert: (input) => transactService([{
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
		}))),
		assertBatch: (inputs) => {
			if (inputs.length === 0) return Effect.succeed([]);
			return transactService(inputs.map((input) => ({
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
		},
		retract: (id) => transactService([{
			op: "retract",
			id
		}]).pipe(Effect.flatMap((result) => result.retracted === 1 ? Effect.void : Effect.fail(new WriteError({ message: `Triple not found or already retracted: ${id}` }))), Effect.mapError((cause) => cause instanceof WriteError ? cause : new WriteError({
			message: `Failed to retract triple: ${id}`,
			cause
		}))),
		retractByPattern: (pattern) => transactService([{
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
		}))),
		transact: transactService = (operations, meta) => kvBackend.transact((tx) => {
			const transactionStore = createKvTripleStore(transactionBackend(tx));
			return Effect.gen(function* () {
				if (operations.some((operation) => operation.op === "assert" && operation.value.type === "integer")) return yield* Effect.fail(new UnsupportedValueTypeError("KV runtime", "integer"));
				if (!isSystemWriteAuthorized(meta)) {
					const reserved = reservedAssertError(operations);
					if (reserved) return yield* Effect.fail(reserved);
				}
				const invalidCondition = validatePreconditions(operations, meta);
				if (invalidCondition) return yield* Effect.fail(new WriteError({ message: `Transaction precondition ${invalidCondition} must have a matching retract operation` }));
				if (invalidCommandId(meta) !== void 0) return yield* Effect.fail(new WriteError({ message: "Command ID must contain between 1 and 1024 characters" }));
				const txId = yield* runtime.nextTxId;
				const now = yield* runtime.now;
				if (meta?.commandId !== void 0) {
					const originalTransactionId = yield* claimKvCommand(tx, meta.commandId, txId);
					if (originalTransactionId !== null) return yield* Effect.fail(new CommandAlreadyCommittedError({
						commandId: meta.commandId,
						transactionId: unsafe.transactionId(originalTransactionId),
						message: `Command ${meta.commandId} already committed as ${originalTransactionId}`
					}));
				}
				const position = yield* nextKvCommitPosition(tx);
				const actor = meta?.actor;
				const preconditionIds = livePreconditionIds(meta);
				for (const condition of entityStatePreconditions(meta)) {
					const actual = (yield* transactionStore.scanCollectAsync({ entity: condition.entityId })).map((datom) => datom.tripleId).sort();
					const expected = [...condition.tripleIds].sort();
					if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) return yield* Effect.fail(new TransactionConflictError({
						entityId: condition.entityId,
						message: `Expected entity ${condition.entityId} to have the observed fact set, but another transaction changed it`
					}));
				}
				if (meta?.enforce !== void 0) {
					const violations = yield* newlyViolated(yield* loadRelevantFacts(meta.enforce.constraints, operations, {
						byEntityType: (entityType) => transactionStore.getByEntityTypeAsync(entityType).pipe(Effect.map((datoms) => datoms.map(datomToTriple))),
						byEntities: (entityIds) => Effect.forEach(entityIds, (entityId) => transactionStore.scanCollectAsync({ entity: entityId }).pipe(Effect.map((datoms) => datoms.map(datomToTriple)))).pipe(Effect.map((rows) => rows.flat()))
					}), operations, meta.enforce.constraints, now).pipe(Effect.mapError((cause) => new WriteError({
						message: `Constraint evaluation failed: ${cause.message}`,
						cause
					})));
					if (violations.length > 0) return yield* Effect.fail(new ConstraintViolationError({
						violations,
						message: `Transaction would introduce or worsen ${violations.length} graph constraint violation${violations.length === 1 ? "" : "s"}`
					}));
				}
				const asserted = [];
				const changes = [];
				let retractedCount = 0;
				for (const op of operations) switch (op.op) {
					case "assert": {
						const datom = tripleInputToDatom({
							entityId: op.entityId,
							attribute: op.attribute,
							value: op.value,
							entityType: op.entityType,
							createdBy: op.createdBy ?? actor,
							validFrom: op.validFrom,
							validTo: op.validTo
						}, yield* runtime.nextTripleId, txId, now, position);
						yield* transactionStore.assert(datom);
						const triple = datomToTriple(datom);
						asserted.push(triple);
						changes.push(transactionChangeFromTriple("assert", triple, txId, now));
						break;
					}
					case "retract": {
						const current = yield* transactionStore.getById(op.id);
						if (current && !isSystemWriteAuthorized(meta)) {
							const reserved = reservedWriteError({
								entityId: current.entity,
								attribute: current.attribute,
								entityType: current.entityType ?? void 0
							});
							if (reserved) return yield* Effect.fail(reserved);
						}
						const ok = yield* transactionStore.retract(op.id, now, txId, position);
						if (!ok && preconditionIds.has(op.id)) return yield* Effect.fail(new TransactionConflictError({
							tripleId: op.id,
							message: `Expected live triple ${op.id}, but another transaction changed it`
						}));
						if (ok) {
							retractedCount++;
							if (current) changes.push(transactionChangeFromTriple("retract", datomToTriple(current), txId, now));
						}
						break;
					}
					case "retract-pattern": {
						const pat = patternToScan(op.pattern);
						const scanned = yield* transactionStore.scanCollectAsync(pat);
						const datoms = op.pattern.entityType ? scanned.filter((datom) => datom.entityType === op.pattern.entityType) : scanned;
						if (!isSystemWriteAuthorized(meta)) for (const datom of datoms) {
							const reserved = reservedWriteError({
								entityId: datom.entity,
								attribute: datom.attribute,
								entityType: datom.entityType ?? void 0
							});
							if (reserved) return yield* Effect.fail(reserved);
						}
						for (const datom of datoms) if (yield* transactionStore.retract(datom.tripleId, now, txId, position)) {
							retractedCount++;
							changes.push(transactionChangeFromTriple("retract", datomToTriple(datom), txId, now));
						}
						break;
					}
				}
				if (!isJournalSuppressed(meta)) for (const input of metadataInputs(txId, position, now, meta, changes)) yield* transactionStore.assert(tripleInputToDatom(input, yield* runtime.nextTripleId, txId, now, position));
				return {
					txId,
					position,
					instant: now,
					triples: asserted,
					retracted: retractedCount
				};
			});
		}).pipe(Effect.ensuring(Effect.sync(() => hexaStore.clearCache())), Effect.catch((e) => e instanceof WriteError || e instanceof TransactionConflictError || e instanceof CommandAlreadyCommittedError || e instanceof ConstraintViolationError ? Effect.fail(e) : Effect.fail(new WriteError({
			message: `Transact failed: ${String(e)}`,
			cause: e
		})))),
		get: (id) => Effect.gen(function* () {
			const datom = yield* hexaStore.getById(id);
			return datom !== null ? datomToTriple(datom) : null;
		}).pipe(Effect.catch((e) => Effect.fail(new ReadError({
			message: `Get failed: ${String(e)}`,
			cause: e
		})))),
		entity: (entityId, basis) => Effect.gen(function* () {
			const resolved = resolveTemporalBasis(basis, yield* runtime.now);
			const syncDatoms = hexaStore.scanCollectTemporal({ entity: entityId }, resolved);
			if (syncDatoms !== null) return syncDatoms.map(datomToTriple);
			return (yield* hexaStore.scanCollectTemporalAsync({ entity: entityId }, resolved)).map(datomToTriple);
		}).pipe(Effect.catch((e) => Effect.fail(new ReadError({
			message: `Entity failed: ${String(e)}`,
			cause: e
		})))),
		entities: (entityIds, basis) => Effect.gen(function* () {
			const resolved = resolveTemporalBasis(basis, yield* runtime.now);
			return yield* Effect.forEach(entityIds, (entityId) => hexaStore.scanCollectTemporalAsync({ entity: entityId }, resolved).pipe(Effect.map((datoms) => datoms.map(datomToTriple))));
		}).pipe(Effect.catch((e) => Effect.fail(new ReadError({
			message: `Batch entity read failed: ${String(e)}`,
			cause: e
		})))),
		entityPage: (request) => Effect.gen(function* () {
			const currentTime = yield* runtime.now;
			const recordedPosition = yield* currentKvCommitPosition(kvBackend);
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
			const facts = yield* match({ entityType: request.entityType }, prepared.basis);
			const ids = [...new Set(facts.map((triple) => triple.entityId))].sort().filter((id) => prepared.after === void 0 || id > prepared.after);
			const selected = ids.slice(0, prepared.limit);
			return {
				entities: yield* Effect.forEach(selected, (entityId) => hexaStore.scanCollectTemporalAsync({ entity: entityId }, prepared.basis).pipe(Effect.map((datoms) => datoms.map(datomToTriple)))),
				snapshot: prepared.basis,
				...ids.length > prepared.limit ? { nextCursor: encodeEntityPageCursor(prepared, selected.at(-1)) } : {}
			};
		}).pipe(Effect.mapError((cause) => cause instanceof PaginationCursorError ? cause : new ReadError({
			message: `Entity page failed: ${String(cause)}`,
			cause
		}))),
		match: (pattern, basis) => Effect.gen(function* () {
			return yield* match(pattern, resolveTemporalBasis(basis, yield* runtime.now));
		}),
		history: (entityId) => Effect.gen(function* () {
			const datoms = yield* Stream.runCollect(hexaStore.entityHistory(entityId));
			return Array.from(datoms).map(datomToTriple);
		}).pipe(Effect.catch((e) => Effect.fail(new ReadError({
			message: `History failed: ${String(e)}`,
			cause: e
		})))),
		transaction: (txId) => Effect.gen(function* () {
			return transactionRecordFromTriples(txId, (yield* hexaStore.scanCollectAsync({ entity: txId })).map(datomToTriple));
		}).pipe(Effect.catch((e) => Effect.fail(new ReadError({
			message: `Transaction read failed: ${String(e)}`,
			cause: e
		})))),
		transactionByCommand: (commandId) => Effect.gen(function* () {
			const fact = (yield* match({
				attribute: TxAttributes.COMMAND_ID,
				value: {
					type: "string",
					value: commandId
				}
			}))[0];
			if (fact === void 0) return null;
			const datoms = yield* hexaStore.scanCollectAsync({ entity: fact.entityId });
			return transactionRecordFromTriples(unsafe.transactionId(fact.entityId), datoms.map(datomToTriple));
		}).pipe(Effect.catch((e) => Effect.fail(new ReadError({
			message: `Command transaction lookup failed: ${String(e)}`,
			cause: e
		})))),
		transactions: (request = {}) => {
			const after = request.after ?? 0;
			const limit = request.limit ?? 100;
			if (!Number.isSafeInteger(after) || after < 0) return Effect.fail(new ReadError({ message: "Transaction cursor must be a non-negative integer" }));
			if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1e3) return Effect.fail(new ReadError({ message: "Transaction page limit must be between 1 and 1000" }));
			return match({ entityType: "_Transaction" }).pipe(Effect.map((triples) => {
				const page = transactionRecordsFromTriples(triples).filter((record) => record.position > after).slice(0, limit);
				const last = page.at(-1);
				return {
					transactions: page,
					...last ? { next: last.position } : {}
				};
			}));
		},
		transactionsForEntity: (entityId, request) => transactionsForEntity({
			...service,
			query: service.queryAll
		}, entityId, request),
		currentPosition: () => currentKvCommitPosition(kvBackend),
		dependencyState: (attributes, basis) => Effect.gen(function* () {
			const unique = [...new Set(attributes)];
			if (unique.length === 0) return { sourcePosition: 0 };
			const resolved = resolveTemporalBasis(basis, yield* runtime.now);
			return dependencyStateFromDatoms((yield* Effect.forEach(unique, (attribute) => hexaStore.scanCollectAsync({ attribute }, { includeRetracted: true }), { concurrency: 16 })).flat(), resolved);
		}),
		queryAll: (q, options) => Effect.gen(function* () {
			const includeBasis = options?.includeBasis === true;
			const basis = {
				...resolveTemporalBasis(options?.basis, yield* runtime.now),
				...includeBasis ? { recordedPosition: yield* currentKvCommitPosition(kvBackend) } : {}
			};
			const result = yield* executeQuery(hexaStore, q, q.rules ?? [], { basis });
			const results = result.results;
			const metadata = includeBasis ? { basis: {
				...basis,
				scope: runtime.scope,
				recordedPosition: basis.recordedPosition
			} } : {};
			if (options?.debug) return {
				results,
				debug: {
					metrics: makeKvMetrics(q),
					executionTimeMs: 0,
					resultCount: result.results.length
				},
				...metadata
			};
			return {
				results,
				...metadata
			};
		}).pipe(Effect.mapError((e) => e instanceof DatalogValidationError || e instanceof UnboundVariableError ? e : new ReadError({
			message: `Query execution failed: ${String(e)}`,
			cause: e
		}))),
		query: (q, options) => validateDatalogQuery(q).pipe(Effect.flatMap((validated) => service.queryPage(wrapDatalogQuery(validated, options), options))),
		queryPage: (q, options) => Effect.gen(function* () {
			const query = yield* validateWrappedQuery(q);
			const currentTime = yield* runtime.now;
			const recordedPosition = yield* currentKvCommitPosition(kvBackend);
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
			const started = performance.now();
			const result = yield* executeWrappedQuery(hexaStore, prepared.query, prepared.query.inner.rules ?? [], {
				basis: prepared.basis,
				...prepared.cursorValues === void 0 ? {} : { cursorValues: prepared.cursorValues }
			});
			const answer = finishPagination(prepared, {
				results: result.results,
				...result.totalCount !== void 0 ? { totalCount: result.totalCount } : {},
				...options?.debug ? { debug: {
					metrics: makeKvMetrics(query.inner),
					executionTimeMs: performance.now() - started,
					resultCount: result.results.length
				} } : {}
			});
			return options?.includeBasis ? {
				...answer,
				basis: {
					...prepared.basis,
					scope: runtime.scope
				}
			} : answer;
		}).pipe(Effect.mapError((e) => e instanceof PaginationCursorError ? e : e instanceof DatalogValidationError || e instanceof UnboundVariableError ? e : new ReadError({
			message: `Wrapped query failed: ${String(e)}`,
			cause: e
		}))),
		explain: (q) => validateDatalogQuery(q).pipe(Effect.map((query) => ({
			queryPlan: {
				backend: "kv-store",
				steps: [{
					label: "main",
					query: JSON.stringify(query, null, 2)
				}]
			},
			metrics: makeKvMetrics(query)
		}))),
		explainPage: (q) => validateWrappedQuery(q).pipe(Effect.map((query) => ({ queryPlan: {
			backend: "kv-store",
			steps: [{
				label: "main",
				query: JSON.stringify(query, null, 2)
			}]
		} })))
	};
	return service;
});
/**
* Layer providing the merged `Triples` service backed by the KV hexastore.
* Requires a `KvBackend` (in-memory, FoundationDB, Cloudflare, …) and a
* `TripleStoreRuntime` (clock + id generation).
*/
const KvTriplesLive = Layer.effect(Triples, makeKvTriplesService);
/**
* Convenience namespace for wiring KV-backed `Triples`.
*/
const KvTriples = {
	layerBackend: KvTriplesLive,
	layer: KvTriplesLive.pipe(Layer.provide(Layer.sync(KvBackend, makeTestKvBackend)), Layer.provide(TripleStoreRuntimeLayer)),
	layerWithScope: (scope) => KvTriplesLive.pipe(Layer.provide(Layer.sync(KvBackend, makeTestKvBackend)), Layer.provide(makeTripleStoreRuntimeLayer(`kv:memory:${scope}`)))
};
//#endregion
export { KvTriples, KvTriplesLive };

//# sourceMappingURL=KvTriplesLive.js.map