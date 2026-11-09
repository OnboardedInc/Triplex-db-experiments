import { TransactionId, TripleId } from "../Branded.js";
import { generateId, generateTransactionId } from "../utils/id.js";
import { Context, Effect, Layer } from "effect";
//#region src/store/RuntimeServices.ts
var RuntimeClock = class extends Context.Service()("RuntimeClock") {};
const RuntimeClockLive = Layer.succeed(RuntimeClock, { now: Effect.sync(() => Date.now()) });
var IdGenerator = class extends Context.Service()("IdGenerator") {};
const IdGeneratorLive = Layer.succeed(IdGenerator, {
	generate: (scope) => Effect.sync(() => `${scope}/${generateId()}`),
	nextId: (scope) => Effect.sync(() => `${scope}/${generateId()}`),
	nextTripleId: Effect.sync(() => generateId()),
	nextTxId: Effect.sync(() => generateTransactionId())
});
const DeterministicRuntimeClockLive = ({ now }) => Layer.succeed(RuntimeClock, { now: Effect.succeed(now) });
const DeterministicIdGeneratorLive = ({ idSeed = "e2e" }) => Layer.sync(IdGenerator, () => {
	const seed = idSeed.replaceAll(/[^a-zA-Z0-9_-]/g, "-");
	const counters = /* @__PURE__ */ new Map();
	const next = (scope) => Effect.sync(() => {
		const nextValue = (counters.get(scope) ?? 0) + 1;
		counters.set(scope, nextValue);
		return `${scope}/${seed}-${String(nextValue).padStart(6, "0")}`;
	});
	const deterministicUlid = (scope, value) => {
		let hash = 2166136261;
		for (const character of `${seed}:${scope}`) {
			hash ^= character.charCodeAt(0);
			hash = Math.imul(hash, 16777619);
		}
		return `${(hash >>> 0).toString(36).toUpperCase().padStart(8, "0")}${value.toString(36).toUpperCase().padStart(18, "0")}`;
	};
	let tripleCounter = 0;
	let transactionCounter = 0;
	return {
		generate: next,
		nextId: next,
		nextTripleId: Effect.sync(() => TripleId.make(deterministicUlid("triple", ++tripleCounter))),
		nextTxId: Effect.sync(() => TransactionId.make(`_tx/${deterministicUlid("transaction", ++transactionCounter)}`))
	};
});
const RuntimeServicesLive = Layer.mergeAll(RuntimeClockLive, IdGeneratorLive);
const DeterministicRuntimeServicesLive = (options) => Layer.mergeAll(DeterministicRuntimeClockLive(options), DeterministicIdGeneratorLive(options));
//#endregion
export { DeterministicIdGeneratorLive, DeterministicRuntimeClockLive, DeterministicRuntimeServicesLive, IdGenerator, IdGeneratorLive, RuntimeClock, RuntimeClockLive, RuntimeServicesLive };

//# sourceMappingURL=RuntimeServices.js.map