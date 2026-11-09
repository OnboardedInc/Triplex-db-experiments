import { Effect, Option, pipe } from "effect";
//#region src/store/writeEventUtils.ts
/**
* writeEventUtils — shared helpers for building ChangeEvents from write operations.
*
* ChangeEmissionCapability uses these helpers to intercept writes, build
* ChangeEvent objects, and invoke its emitter.
*/
/**
* Create write-side methods for a TriplesService that intercept every
* mutation, delegate to the inner store, build a ChangeEvent, and invoke
* the callback. Read operations are NOT included — callers should spread
* the inner store's read methods directly.
*
* Pre-fetches triple info for retract-by-ID operations so the ChangeEvent
* includes correct entityId/attribute even after the triple is removed.
*/
const makeWriteInterceptors = (inner, onEvent, now) => ({
	assert: (input) => pipe(inner.assert(input), Effect.tap((triple) => onEvent({
		txId: Option.getOrElse(triple.txId, () => ""),
		timestamp: triple.recordedAt,
		changes: [{
			operation: "assert",
			entityId: input.entityId,
			attribute: input.attribute
		}]
	}))),
	assertBatch: (inputs) => pipe(inner.assertBatch(inputs), Effect.tap((triples) => {
		return Effect.gen(function* () {
			const changes = inputs.map((input) => ({
				operation: "assert",
				entityId: input.entityId,
				attribute: input.attribute
			}));
			const first = triples[0];
			return yield* onEvent({
				txId: first ? Option.getOrElse(first.txId, () => "") : "",
				timestamp: first?.recordedAt ?? (yield* now),
				changes
			});
		});
	})),
	retract: (id) => pipe(inner.get(id), Effect.catch(() => Effect.succeed(null)), Effect.flatMap((triple) => pipe(inner.retract(id), Effect.tap(() => Effect.gen(function* () {
		return yield* onEvent({
			txId: "",
			timestamp: yield* now,
			changes: triple ? [{
				operation: "retract",
				entityId: triple.entityId,
				attribute: triple.attribute
			}] : []
		});
	}))))),
	retractByPattern: (pattern) => Effect.gen(function* () {
		const matched = yield* inner.match(pattern);
		const count = yield* inner.retractByPattern(pattern);
		if (count > 0) yield* onEvent({
			txId: "",
			timestamp: yield* now,
			changes: matched.map((triple) => ({
				operation: "retract",
				entityId: triple.entityId,
				attribute: triple.attribute
			}))
		});
		return count;
	}),
	transact: (operations, meta) => Effect.gen(function* () {
		const tripleMap = /* @__PURE__ */ new Map();
		for (const op of operations) if (op.op === "retract") {
			const triple = yield* inner.get(op.id).pipe(Effect.catch(() => Effect.succeed(null)));
			if (triple) tripleMap.set(op.id, {
				entityId: triple.entityId,
				attribute: triple.attribute
			});
		}
		const result = yield* inner.transact(operations, meta);
		const record = yield* inner.transaction(result.txId);
		const changes = record ? record.changes.map((change) => ({
			operation: change.op,
			entityId: change.entityId,
			attribute: change.attribute
		})) : operations.flatMap((op) => {
			if (op.op === "assert") return [{
				operation: "assert",
				entityId: op.entityId,
				attribute: op.attribute
			}];
			if (op.op === "retract") {
				const info = tripleMap.get(op.id);
				return info ? [{
					operation: "retract",
					...info
				}] : [];
			}
			return [];
		});
		yield* onEvent({
			txId: result.txId,
			timestamp: yield* now,
			changes
		});
		return result;
	})
});
//#endregion
export { makeWriteInterceptors };

//# sourceMappingURL=writeEventUtils.js.map