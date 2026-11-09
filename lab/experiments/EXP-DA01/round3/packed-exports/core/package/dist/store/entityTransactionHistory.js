import { TransactionId } from "../Branded.js";
import { ReadError } from "../errors/index.js";
import { ref } from "../Value.js";
import { TxAttributes } from "../utils/id.js";
import { Effect } from "effect";
//#region src/store/entityTransactionHistory.ts
const invalidPage = (message) => Effect.fail(new ReadError({ message }));
/** Indexed journal lookup shared by the KV and SQL `Triples` implementations. */
const transactionsForEntity = (reader, entityId, request = {}) => {
	const limit = request.limit ?? 100;
	if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1e3) return invalidPage("Entity transaction page limit must be between 1 and 1000");
	if (request.snapshotPosition !== void 0 && (!Number.isSafeInteger(request.snapshotPosition) || request.snapshotPosition < 0)) return invalidPage("Entity transaction snapshot position must be a non-negative integer");
	if (request.beforePosition !== void 0 && (!Number.isSafeInteger(request.beforePosition) || request.beforePosition < 0)) return invalidPage("Entity transaction page boundary must be a non-negative integer");
	return Effect.gen(function* () {
		const snapshotPosition = request.snapshotPosition ?? (yield* reader.currentPosition());
		const where = [
			[
				"?transaction",
				TxAttributes.CHANGED_ENTITY,
				ref(entityId)
			],
			[
				"?transaction",
				TxAttributes.POSITION,
				"?position"
			],
			[
				"<=",
				"?position",
				snapshotPosition
			],
			...request.beforePosition === void 0 ? [] : [[
				"<",
				"?position",
				request.beforePosition
			]]
		];
		const response = yield* reader.query({
			find: ["?transaction", "?position"],
			where,
			orderBy: [{
				variable: "?position",
				direction: "desc"
			}],
			limit: limit + 1
		}).pipe(Effect.mapError((cause) => new ReadError({
			message: `Failed to query entity transaction index: ${String(cause)}`,
			cause
		})));
		const indexed = yield* Effect.forEach(response.results, (row) => Effect.try({
			try: () => {
				const transaction = row["?transaction"];
				const position = row["?position"];
				if (typeof transaction !== "string" || typeof position !== "number" || !Number.isSafeInteger(position) || position < 1) throw new TypeError("invalid transaction journal index row");
				return {
					transactionId: TransactionId.make(transaction),
					position
				};
			},
			catch: (cause) => new ReadError({
				message: "Corrupt entity transaction journal index",
				cause
			})
		}));
		const selected = indexed.slice(0, limit);
		const records = yield* Effect.forEach(selected, ({ transactionId, position }) => reader.transaction(transactionId).pipe(Effect.flatMap((record) => record !== null && record.position === position ? Effect.succeed(record) : Effect.fail(new ReadError({ message: `Missing or inconsistent transaction envelope ${transactionId}` })))));
		const last = records.at(-1);
		return {
			transactions: records,
			snapshotPosition,
			...indexed.length > limit && last !== void 0 ? { nextBeforePosition: last.position } : {}
		};
	});
};
//#endregion
export { transactionsForEntity };

//# sourceMappingURL=entityTransactionHistory.js.map