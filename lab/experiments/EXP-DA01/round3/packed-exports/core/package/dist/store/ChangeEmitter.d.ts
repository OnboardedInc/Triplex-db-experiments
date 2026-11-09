import { Context, Effect, Layer } from "effect";

//#region src/store/ChangeEmitter.d.ts
/**
 * A single triple change within a transaction.
 * Values are intentionally omitted to reduce bandwidth.
 */
interface TripleChange {
  readonly operation: "assert" | "retract";
  readonly entityId: string;
  readonly attribute: string;
}
/**
 * A batch of changes emitted after a write operation.
 */
interface ChangeEvent {
  /** Transaction ID from Triples (matches `txId` in TransactionResult) */
  readonly txId: string;
  /** Unix timestamp (milliseconds) */
  readonly timestamp: number;
  /** Individual triple changes in this transaction */
  readonly changes: readonly TripleChange[];
}
/**
 * Service for emitting change events from the storage layer.
 *
 * Implementations should be fire-and-forget: failures in emission
 * must never break the underlying mutation.
 */
interface ChangeEmitterService {
  readonly emit: (event: ChangeEvent) => Effect.Effect<void>;
}
declare const ChangeEmitter_base: Context.ServiceClass<ChangeEmitter, "ChangeEmitter", ChangeEmitterService>;
declare class ChangeEmitter extends ChangeEmitter_base {}
/**
 * No-op emitter for testing and non-realtime scenarios.
 * Silently discards all events.
 */
declare const NoopChangeEmitter: ChangeEmitterService;
/**
 * Layer that provides the no-op ChangeEmitter.
 */
declare const NoopChangeEmitterLive: Layer.Layer<ChangeEmitter, never, never>;
//#endregion
export { ChangeEmitter, ChangeEmitterService, ChangeEvent, NoopChangeEmitter, NoopChangeEmitterLive, TripleChange };
//# sourceMappingURL=ChangeEmitter.d.ts.map