import { TransactionId, TripleId } from "../Branded.js";
import { DeterministicRuntimeOptions, IdGenerator, RuntimeClock } from "./RuntimeServices.js";
import { Context, Effect, Layer } from "effect";

//#region src/store/TripleStoreRuntime.d.ts
interface TripleStoreRuntimeService {
  /** Stable identity used to prevent opaque cursors crossing database boundaries. */
  readonly scope: string;
  readonly now: Effect.Effect<number>;
  readonly nextTripleId: Effect.Effect<TripleId>;
  readonly nextTxId: Effect.Effect<TransactionId>;
}
declare const TripleStoreRuntime_base: Context.ServiceClass<TripleStoreRuntime, "TripleStoreRuntime", TripleStoreRuntimeService>;
declare class TripleStoreRuntime extends TripleStoreRuntime_base {}
declare const TripleStoreRuntimeLive: Layer.Layer<TripleStoreRuntime, never, never>;
declare const TripleStoreRuntimeFromServicesLive: Layer.Layer<TripleStoreRuntime, never, RuntimeClock | IdGenerator>;
declare const TripleStoreRuntimeLayer: Layer.Layer<TripleStoreRuntime, never, never>;
/** Construct the standard runtime with a stable database cursor scope. */
declare const makeTripleStoreRuntimeLayer: (scope: string) => Layer.Layer<TripleStoreRuntime, never, never>;
declare const getTripleStoreRuntime: typeof TripleStoreRuntime;
type DeterministicTripleStoreRuntimeOptions = DeterministicRuntimeOptions;
declare const DeterministicTripleStoreRuntimeLive: (options: DeterministicRuntimeOptions) => Layer.Layer<TripleStoreRuntime, never, never>;
//#endregion
export { DeterministicTripleStoreRuntimeLive, DeterministicTripleStoreRuntimeOptions, TripleStoreRuntime, TripleStoreRuntimeFromServicesLive, TripleStoreRuntimeLayer, TripleStoreRuntimeLive, TripleStoreRuntimeService, getTripleStoreRuntime, makeTripleStoreRuntimeLayer };
//# sourceMappingURL=TripleStoreRuntime.d.ts.map