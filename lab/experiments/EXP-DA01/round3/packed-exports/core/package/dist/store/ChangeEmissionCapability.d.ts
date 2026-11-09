import { ChangeEmitterService } from "./ChangeEmitter.js";
import { StoreCapability } from "./StoreCapability.js";
import { Effect } from "effect";

//#region src/store/ChangeEmissionCapability.d.ts
/**
 * Create a ChangeEmission capability.
 *
 * The capability is parameterized by the emitter at creation time (resolved
 * from the Effect context in DatabaseManagerLayer), rather than requiring it
 * in the `StoreCapability.wrap` signature. This keeps the `StoreCapability`
 * interface simple and synchronous.
 */
declare const makeChangeEmissionCapability: (emitter: ChangeEmitterService, now: Effect.Effect<number>) => StoreCapability;
//#endregion
export { makeChangeEmissionCapability };
//# sourceMappingURL=ChangeEmissionCapability.d.ts.map