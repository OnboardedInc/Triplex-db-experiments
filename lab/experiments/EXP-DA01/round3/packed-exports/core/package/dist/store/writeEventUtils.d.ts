import { TriplesService } from "./Triples.js";
import { ChangeEvent } from "./ChangeEmitter.js";
import { Effect } from "effect";

//#region src/store/writeEventUtils.d.ts
/**
 * Callback invoked after each successful write operation.
 * Receives the ChangeEvent describing what changed.
 * The callback's return value is awaited but errors should be handled
 * by the caller (typically caught and swallowed).
 */
type WriteEventCallback = (event: ChangeEvent) => Effect.Effect<void>;
/**
 * Create write-side methods for a TriplesService that intercept every
 * mutation, delegate to the inner store, build a ChangeEvent, and invoke
 * the callback. Read operations are NOT included — callers should spread
 * the inner store's read methods directly.
 *
 * Pre-fetches triple info for retract-by-ID operations so the ChangeEvent
 * includes correct entityId/attribute even after the triple is removed.
 */
declare const makeWriteInterceptors: (inner: TriplesService, onEvent: WriteEventCallback, now: Effect.Effect<number>) => Pick<TriplesService, "assert" | "assertBatch" | "retract" | "retractByPattern" | "transact">;
//#endregion
export { WriteEventCallback, makeWriteInterceptors };
//# sourceMappingURL=writeEventUtils.d.ts.map