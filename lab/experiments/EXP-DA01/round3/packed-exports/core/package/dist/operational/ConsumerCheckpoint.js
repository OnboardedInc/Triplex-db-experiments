import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { unsafe } from "../Branded.js";
import { Domain, hash } from "../content/ContentId.js";
import { transactSystemUnjournaled } from "../store/systemNamespace.js";
import { Data, Effect } from "effect";
//#region src/operational/ConsumerCheckpoint.ts
/**
* Durable resume positions for at-least-once transaction-feed consumers.
*
* A checkpoint is an ordinary reserved Triplex entity. Its position is moved
* with compare-and-retract, so two workers cannot silently overwrite one
* another. The feed remains the source of truth; this module only records how
* far one named consumer has durably processed it.
*/
var ConsumerCheckpoint_exports = /* @__PURE__ */ __exportAll({
	ConsumerCheckpointConflictError: () => ConsumerCheckpointConflictError,
	CorruptConsumerCheckpointError: () => CorruptConsumerCheckpointError,
	InvalidConsumerCheckpointError: () => InvalidConsumerCheckpointError,
	System: () => System,
	advance: () => advance,
	entityId: () => entityId,
	get: () => get
});
const System = {
	prefix: "_triplex/consumer-checkpoint/",
	entityType: "triplex.consumer-checkpoint",
	attribute: {
		consumer: ":triplex/consumer-checkpoint-name",
		position: ":triplex/consumer-checkpoint-position"
	}
};
var InvalidConsumerCheckpointError = class extends Data.TaggedError("InvalidConsumerCheckpointError") {};
var ConsumerCheckpointConflictError = class extends Data.TaggedError("ConsumerCheckpointConflictError") {};
var CorruptConsumerCheckpointError = class extends Data.TaggedError("CorruptConsumerCheckpointError") {};
const validateConsumer = (consumer) => {
	if (consumer.length === 0 || consumer.length > 1024) return new InvalidConsumerCheckpointError({ message: "Consumer checkpoint name must contain between 1 and 1024 characters" });
};
const validatePosition = (label, position) => Number.isSafeInteger(position) && position >= 0 ? void 0 : new InvalidConsumerCheckpointError({ message: `${label} must be a non-negative safe integer` });
const entityId = (consumer) => unsafe.entityId(`${System.prefix}${hash(Domain.consumerCheckpoint, consumer)}`);
const readLoaded = (triples, consumer) => triples.match({ entityId: entityId(consumer) }).pipe(Effect.flatMap((rows) => {
	if (rows.length === 0) return Effect.succeed(null);
	const names = rows.filter((row) => row.attribute === System.attribute.consumer);
	const positions = rows.filter((row) => row.attribute === System.attribute.position);
	const name = names[0]?.value;
	const position = positions[0]?.value;
	if (names.length !== 1 || positions.length !== 1 || name?.type !== "string" || name.value !== consumer || position?.type !== "number" || !Number.isSafeInteger(position.value) || position.value < 0) return Effect.fail(new CorruptConsumerCheckpointError({
		consumer,
		message: `Consumer checkpoint ${consumer} has an invalid persisted shape`
	}));
	return Effect.succeed({
		consumer,
		position: position.value,
		positionTripleId: positions[0].id
	});
}));
/** Read the current durable position for a named consumer. */
const get = (triples, consumer) => {
	const invalid = validateConsumer(consumer);
	if (invalid !== void 0) return Effect.fail(invalid);
	return readLoaded(triples, consumer);
};
const conflict = (consumer, expectedPosition, actualPosition) => new ConsumerCheckpointConflictError({
	consumer,
	expectedPosition,
	...actualPosition === void 0 ? {} : { actualPosition },
	message: `Consumer ${consumer} expected checkpoint ${expectedPosition}, but found ${actualPosition ?? "no checkpoint"}`
});
const assertPosition = (consumer, position) => ({
	op: "assert",
	entityId: entityId(consumer),
	entityType: System.entityType,
	attribute: System.attribute.position,
	value: {
		type: "number",
		value: position
	}
});
/**
* Advance one consumer checkpoint with optimistic concurrency.
*
* Repeating an already-successful `(expectedPosition, nextPosition)` movement
* returns the stored checkpoint. A stale or out-of-order movement fails with a
* typed conflict and never moves the position backwards.
*/
const advance = (triples, request) => Effect.gen(function* () {
	const invalidConsumer = validateConsumer(request.consumer);
	if (invalidConsumer !== void 0) return yield* Effect.fail(invalidConsumer);
	const invalidExpected = validatePosition("expectedPosition", request.expectedPosition);
	if (invalidExpected !== void 0) return yield* Effect.fail(invalidExpected);
	const invalidNext = validatePosition("nextPosition", request.nextPosition);
	if (invalidNext !== void 0) return yield* Effect.fail(invalidNext);
	if (request.nextPosition < request.expectedPosition) return yield* Effect.fail(new InvalidConsumerCheckpointError({ message: "nextPosition must not be less than expectedPosition" }));
	const latestPosition = yield* triples.currentPosition();
	if (request.nextPosition > latestPosition) return yield* Effect.fail(new InvalidConsumerCheckpointError({ message: `nextPosition ${request.nextPosition} is ahead of the latest committed position ${latestPosition}` }));
	const current = yield* readLoaded(triples, request.consumer);
	if (current?.position === request.nextPosition) return current;
	if ((current?.position ?? 0) !== request.expectedPosition) return yield* Effect.fail(conflict(request.consumer, request.expectedPosition, current?.position));
	if (current === null) {
		yield* transactSystemUnjournaled(triples, [{
			op: "assert",
			entityId: entityId(request.consumer),
			entityType: System.entityType,
			attribute: System.attribute.consumer,
			value: {
				type: "string",
				value: request.consumer
			}
		}, assertPosition(request.consumer, request.nextPosition)], {
			...request.meta,
			commandId: `triplex/consumer-checkpoint/init/${hash(Domain.consumerCheckpoint, request.consumer)}`
		}).pipe(Effect.catchTag("CommandAlreadyCommittedError", () => readLoaded(triples, request.consumer).pipe(Effect.flatMap((winner) => winner?.position === request.nextPosition ? Effect.succeed(void 0) : Effect.fail(conflict(request.consumer, request.expectedPosition, winner?.position))))));
		const stored = yield* readLoaded(triples, request.consumer);
		if (stored === null) return yield* Effect.fail(new CorruptConsumerCheckpointError({
			consumer: request.consumer,
			message: `Consumer checkpoint ${request.consumer} was not visible after commit`
		}));
		return stored;
	}
	yield* transactSystemUnjournaled(triples, [{
		op: "retract",
		id: current.positionTripleId
	}, assertPosition(request.consumer, request.nextPosition)], {
		...request.meta,
		preconditions: [{
			_tag: "TripleLive",
			id: current.positionTripleId
		}]
	}).pipe(Effect.catchTag("TransactionConflictError", () => readLoaded(triples, request.consumer).pipe(Effect.flatMap((winner) => winner?.position === request.nextPosition ? Effect.void : Effect.fail(conflict(request.consumer, request.expectedPosition, winner?.position))))));
	const stored = yield* readLoaded(triples, request.consumer);
	if (stored === null) return yield* Effect.fail(new CorruptConsumerCheckpointError({
		consumer: request.consumer,
		message: `Consumer checkpoint ${request.consumer} disappeared after commit`
	}));
	return stored;
});
//#endregion
export { ConsumerCheckpointConflictError, ConsumerCheckpoint_exports, CorruptConsumerCheckpointError, InvalidConsumerCheckpointError, System, advance, entityId, get };

//# sourceMappingURL=ConsumerCheckpoint.js.map