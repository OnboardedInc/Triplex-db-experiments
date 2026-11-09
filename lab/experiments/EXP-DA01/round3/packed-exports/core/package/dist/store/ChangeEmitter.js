import { Context, Effect, Layer } from "effect";
//#region src/store/ChangeEmitter.ts
/**
* ChangeEmitter — abstract interface for broadcasting storage-layer changes.
*
* The Triples capability calls `emit` after every write operation.
* Concrete implementations (Cloudflare WebSocket broadcast, Node.js ws broadcast)
* fan out the event to connected clients.
*/
var ChangeEmitter = class extends Context.Service()("ChangeEmitter") {};
/**
* No-op emitter for testing and non-realtime scenarios.
* Silently discards all events.
*/
const NoopChangeEmitter = { emit: () => Effect.void };
/**
* Layer that provides the no-op ChangeEmitter.
*/
const NoopChangeEmitterLive = Layer.succeed(ChangeEmitter, NoopChangeEmitter);
//#endregion
export { ChangeEmitter, NoopChangeEmitter, NoopChangeEmitterLive };

//# sourceMappingURL=ChangeEmitter.js.map