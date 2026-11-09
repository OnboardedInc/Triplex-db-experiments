import { Triples } from "../store/Triples.js";
import { ChangeEmitter, ChangeEmitterService } from "../store/ChangeEmitter.js";
import { SnapshotService, SnapshotWriter } from "../snapshots/SnapshotService.js";
import { TripleStoreRuntime } from "../store/TripleStoreRuntime.js";
import { StoreCapability } from "../store/StoreCapability.js";
import { Context, Effect, Layer, Scope } from "effect";

//#region src/runtime/Capabilities.d.ts
/** A capability bundle preserves both its service outputs and its dependencies. */
interface CapabilitySet<Out, E = never, R = never> {
  readonly build: Effect.Effect<{
    readonly capabilities: readonly StoreCapability[];
    readonly services: Context.Context<Out>;
  }, E, R | Triples | TripleStoreRuntime | Scope.Scope>;
}
declare function entitySnapshots(): CapabilitySet<SnapshotService | SnapshotWriter, never, SnapshotService | SnapshotWriter>;
declare function entitySnapshots<E, R>(snapshots: Layer.Layer<SnapshotService | SnapshotWriter, E, R>): CapabilitySet<SnapshotService | SnapshotWriter, E, Exclude<R, Triples | TripleStoreRuntime>>;
declare function changeEmission(): CapabilitySet<never, never, ChangeEmitter>;
declare function changeEmission(emitter: ChangeEmitterService): CapabilitySet<never>;
type AnySet = CapabilitySet<never, unknown, unknown>;
type Output<S> = S extends CapabilitySet<infer O, infer _E, infer _R> ? O : never;
type Error<S> = S extends CapabilitySet<infer _O, infer E, infer _R> ? E : never;
type Requirements<S> = S extends CapabilitySet<infer _O, infer _E, infer R> ? R : never;
declare const Capabilities: {
  readonly of: <const Sets extends readonly AnySet[]>(...sets: Sets) => CapabilitySet<Output<Sets[number]>, Error<Sets[number]>, Requirements<Sets[number]>>;
  readonly none: CapabilitySet<never, never, never>; /** Missing persistence and emission services remain explicit Effect requirements. */
  readonly default: CapabilitySet<SnapshotWriter | SnapshotService, never, SnapshotWriter | SnapshotService | ChangeEmitter>;
  readonly custom: (...capabilities: readonly StoreCapability[]) => CapabilitySet<never>;
};
//#endregion
export { Capabilities, CapabilitySet, changeEmission, entitySnapshots };
//# sourceMappingURL=Capabilities.d.ts.map