import { EntityId } from "../Branded.js";
import { CommandAlreadyCommittedError, ConstraintViolationError, ReadError, TransactionConflictError, WriteError } from "../errors/index.js";
import { TransactionMeta, TriplesService } from "../store/Triples.js";
import { Effect } from "effect";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/operational/ConsumerCheckpoint.d.ts
declare namespace ConsumerCheckpoint_d_exports {
  export { AdvanceRequest, ConsumerCheckpoint, ConsumerCheckpointConflictError, ConsumerCheckpointError, CorruptConsumerCheckpointError, InvalidConsumerCheckpointError, System, advance, entityId, get };
}
declare const System: {
  readonly prefix: "_triplex/consumer-checkpoint/";
  readonly entityType: "triplex.consumer-checkpoint";
  readonly attribute: {
    readonly consumer: ":triplex/consumer-checkpoint-name";
    readonly position: ":triplex/consumer-checkpoint-position";
  };
};
interface ConsumerCheckpoint {
  readonly consumer: string;
  readonly position: number;
}
interface AdvanceRequest {
  readonly consumer: string;
  /** Position read before processing the page. Use zero for a new consumer. */
  readonly expectedPosition: number;
  /** Last transaction position whose effects have durably completed. */
  readonly nextPosition: number;
  readonly meta?: Omit<TransactionMeta, "commandId" | "preconditions">;
}
declare const InvalidConsumerCheckpointError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "InvalidConsumerCheckpointError";
} & Readonly<A>;
declare class InvalidConsumerCheckpointError extends InvalidConsumerCheckpointError_base<{
  readonly message: string;
}> {}
declare const ConsumerCheckpointConflictError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "ConsumerCheckpointConflictError";
} & Readonly<A>;
declare class ConsumerCheckpointConflictError extends ConsumerCheckpointConflictError_base<{
  readonly consumer: string;
  readonly expectedPosition: number;
  readonly actualPosition?: number;
  readonly message: string;
}> {}
declare const CorruptConsumerCheckpointError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "CorruptConsumerCheckpointError";
} & Readonly<A>;
declare class CorruptConsumerCheckpointError extends CorruptConsumerCheckpointError_base<{
  readonly consumer: string;
  readonly message: string;
}> {}
type ConsumerCheckpointError = InvalidConsumerCheckpointError | ConsumerCheckpointConflictError | CorruptConsumerCheckpointError | ReadError | WriteError | TransactionConflictError | CommandAlreadyCommittedError | ConstraintViolationError;
declare const entityId: (consumer: string) => EntityId;
/** Read the current durable position for a named consumer. */
declare const get: (triples: TriplesService, consumer: string) => Effect.Effect<ConsumerCheckpoint | null, InvalidConsumerCheckpointError | ReadError | CorruptConsumerCheckpointError>;
/**
 * Advance one consumer checkpoint with optimistic concurrency.
 *
 * Repeating an already-successful `(expectedPosition, nextPosition)` movement
 * returns the stored checkpoint. A stale or out-of-order movement fails with a
 * typed conflict and never moves the position backwards.
 */
declare const advance: (triples: TriplesService, request: AdvanceRequest) => Effect.Effect<ConsumerCheckpoint, ConsumerCheckpointError>;
//#endregion
export { AdvanceRequest, ConsumerCheckpoint, ConsumerCheckpointConflictError, ConsumerCheckpointError, ConsumerCheckpoint_d_exports, CorruptConsumerCheckpointError, InvalidConsumerCheckpointError, System, advance, entityId, get };
//# sourceMappingURL=ConsumerCheckpoint.d.ts.map