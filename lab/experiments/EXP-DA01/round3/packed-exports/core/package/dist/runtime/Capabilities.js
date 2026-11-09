import { ChangeEmitter } from "../store/ChangeEmitter.js";
import { SnapshotService, SnapshotWriter } from "../snapshots/SnapshotService.js";
import { TripleStoreRuntime } from "../store/TripleStoreRuntime.js";
import { makeChangeEmissionCapability } from "../store/ChangeEmissionCapability.js";
import { makeEntitySnapshotsCapability } from "../snapshots/EntitySnapshotsCapability.js";
import { Context, Effect, Layer } from "effect";
//#region src/runtime/Capabilities.ts
const ambientSnapshots = Layer.mergeAll(Layer.effect(SnapshotService, SnapshotService), Layer.effect(SnapshotWriter, SnapshotWriter));
function entitySnapshots(snapshots) {
	const persistence = snapshots ?? ambientSnapshots;
	return { build: Effect.gen(function* () {
		const services = yield* Layer.build(persistence);
		return {
			capabilities: [makeEntitySnapshotsCapability(Context.get(services, SnapshotWriter))],
			services
		};
	}) };
}
function changeEmission(emitter) {
	return { build: Effect.gen(function* () {
		return {
			capabilities: [makeChangeEmissionCapability(emitter ?? (yield* ChangeEmitter), (yield* TripleStoreRuntime).now)],
			services: Context.empty()
		};
	}) };
}
const of = (...sets) => ({ build: Effect.gen(function* () {
	const capabilities = [];
	let services = Context.empty();
	for (const set of sets) {
		const installed = yield* set.build;
		capabilities.push(...installed.capabilities);
		services = Context.merge(services, installed.services);
	}
	return {
		capabilities,
		services
	};
}) });
const Capabilities = {
	of,
	none: of(),
	default: of(entitySnapshots(), changeEmission()),
	custom: (...capabilities) => ({ build: Effect.succeed({
		capabilities,
		services: Context.empty()
	}) })
};
//#endregion
export { Capabilities, changeEmission, entitySnapshots };

//# sourceMappingURL=Capabilities.js.map