import { makeWriteInterceptors } from "./writeEventUtils.js";
import { Effect } from "effect";
//#region src/store/ChangeEmissionCapability.ts
/**
* ChangeEmission capability — emits ChangeEvents after every write operation.
*
* Responsibility: broadcast change events to the ChangeEmitter (e.g., for
* WebSocket fanout to connected clients).
*
* Priority: 50 (inside EntitySnapshots at 60)
* Requires: none
*/
/**
* Create a ChangeEmission capability.
*
* The capability is parameterized by the emitter at creation time (resolved
* from the Effect context in DatabaseManagerLayer), rather than requiring it
* in the `StoreCapability.wrap` signature. This keeps the `StoreCapability`
* interface simple and synchronous.
*/
const makeChangeEmissionCapability = (emitter, now) => ({
	name: "ChangeEmission",
	priority: 50,
	requires: [],
	wrap: (store) => {
		const safeEmit = makeWriteInterceptors(store, (event) => emitter.emit(event).pipe(Effect.catchCause(() => Effect.void)), now);
		return {
			...store,
			...safeEmit
		};
	}
});
//#endregion
export { makeChangeEmissionCapability };

//# sourceMappingURL=ChangeEmissionCapability.js.map