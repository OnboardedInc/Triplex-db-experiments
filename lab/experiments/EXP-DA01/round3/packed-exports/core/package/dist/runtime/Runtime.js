import { Triples } from "../store/Triples.js";
import { DeterministicTripleStoreRuntimeLive, TripleStoreRuntime, makeTripleStoreRuntimeLayer } from "../store/TripleStoreRuntime.js";
import { KvTriplesLive } from "../kv/layers/KvTriplesLive.js";
import { TriplesLive } from "../store/TriplesLive.js";
import { CapabilityError, composeStore, validateDependencies } from "../store/StoreCapability.js";
import { validateDatabaseScope } from "./DatabaseScope.js";
import { Capabilities } from "./Capabilities.js";
import { Context, Effect, Layer } from "effect";
//#region src/runtime/Runtime.ts
const definition = (name, base) => {
	if (name.trim().length === 0) throw new TypeError("Runtime.name must be nonempty");
	function layer(options) {
		validateDatabaseScope(options.scope);
		if (options.deterministic && !Number.isFinite(options.deterministic.startTime)) throw new TypeError("deterministic.startTime must be finite");
		const runtime = options.deterministic ? Layer.effect(TripleStoreRuntime, Effect.map(TripleStoreRuntime, (service) => ({
			...service,
			scope: options.scope
		}))).pipe(Layer.provide(DeterministicTripleStoreRuntimeLive({
			now: options.deterministic.startTime,
			idSeed: options.deterministic.seed
		}))) : makeTripleStoreRuntimeLayer(options.scope);
		const raw = base.pipe(Layer.provideMerge(runtime));
		const capabilities = options.capabilities ?? Capabilities.default;
		return Layer.effectContext(Effect.gen(function* () {
			const context = yield* Layer.build(raw);
			const installed = yield* capabilities.build.pipe(Effect.provideContext(context));
			yield* Effect.try({
				try: () => validateDependencies(installed.capabilities),
				catch: (error) => {
					if (error instanceof CapabilityError) return error;
					throw error;
				}
			});
			const triples = yield* Effect.sync(() => composeStore(Context.get(context, Triples), ...installed.capabilities));
			return Context.add(installed.services, Triples, triples);
		}));
	}
	return {
		name,
		layer
	};
};
const define = (options) => definition(options.name, TriplesLive.pipe(Layer.provideMerge(options.storage), Layer.provideMerge(options.queries)));
const fromKv = (options) => definition(options.name, KvTriplesLive.pipe(Layer.provideMerge(options.backend)));
const Runtime = {
	define,
	fromKv
};
//#endregion
export { Runtime };

//# sourceMappingURL=Runtime.js.map