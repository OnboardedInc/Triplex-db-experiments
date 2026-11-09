import { generateId, generateTransactionId } from "../utils/id.js";
import { DeterministicRuntimeServicesLive, IdGenerator, IdGeneratorLive, RuntimeClock, RuntimeClockLive } from "./RuntimeServices.js";
import { Context, Effect, Layer } from "effect";
//#region src/store/TripleStoreRuntime.ts
var TripleStoreRuntime = class extends Context.Service()("TripleStoreRuntime") {};
const TripleStoreRuntimeLive = Layer.succeed(TripleStoreRuntime, {
	scope: "default",
	now: Effect.sync(() => Date.now()),
	nextTripleId: Effect.sync(() => generateId()),
	nextTxId: Effect.sync(() => generateTransactionId())
});
const TripleStoreRuntimeFromServicesLive = Layer.effect(TripleStoreRuntime, Effect.gen(function* () {
	const clock = yield* RuntimeClock;
	const ids = yield* IdGenerator;
	return {
		scope: "default",
		now: clock.now,
		nextTripleId: ids.nextTripleId,
		nextTxId: ids.nextTxId
	};
}));
const TripleStoreRuntimeLayer = TripleStoreRuntimeFromServicesLive.pipe(Layer.provide(RuntimeClockLive), Layer.provide(IdGeneratorLive));
/** Construct the standard runtime with a stable database cursor scope. */
const makeTripleStoreRuntimeLayer = (scope) => Layer.effect(TripleStoreRuntime, Effect.gen(function* () {
	const clock = yield* RuntimeClock;
	const ids = yield* IdGenerator;
	return {
		scope,
		now: clock.now,
		nextTripleId: ids.nextTripleId,
		nextTxId: ids.nextTxId
	};
})).pipe(Layer.provide(RuntimeClockLive), Layer.provide(IdGeneratorLive));
const getTripleStoreRuntime = TripleStoreRuntime;
const DeterministicTripleStoreRuntimeLive = (options) => TripleStoreRuntimeFromServicesLive.pipe(Layer.provide(DeterministicRuntimeServicesLive(options)));
//#endregion
export { DeterministicTripleStoreRuntimeLive, TripleStoreRuntime, TripleStoreRuntimeFromServicesLive, TripleStoreRuntimeLayer, TripleStoreRuntimeLive, getTripleStoreRuntime, makeTripleStoreRuntimeLayer };

//# sourceMappingURL=TripleStoreRuntime.js.map