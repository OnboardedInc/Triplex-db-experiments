import { ContentId } from "../content/ContentId.js";
import { EntityDiff, EntitySnapshot } from "./canonical.js";
import { Context, Effect } from "effect";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/snapshots/SnapshotService.d.ts
declare const SnapshotError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "SnapshotError";
} & Readonly<A>;
declare class SnapshotError extends SnapshotError_base<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
interface SnapshotServiceShape {
  readonly current: (entityId: string) => Effect.Effect<EntitySnapshot | null, SnapshotError>;
  readonly at: (entityId: string, txId: string) => Effect.Effect<EntitySnapshot | null, SnapshotError>;
  readonly asOf: (entityId: string, asOf: number) => Effect.Effect<EntitySnapshot | null, SnapshotError>;
  readonly hashAt: (entityId: string, txId: string) => Effect.Effect<ContentId | null, SnapshotError>;
  readonly batchCurrent: (entityIds: readonly string[]) => Effect.Effect<ReadonlyMap<string, EntitySnapshot>, SnapshotError>;
  readonly hashes: (entityId: string) => Effect.Effect<ReadonlyArray<{
    txId: string;
    txTime: number;
    hash: ContentId;
  }>, SnapshotError>;
  readonly diff: (entityId: string, fromTxId: string, toTxId: string) => Effect.Effect<EntityDiff, SnapshotError>;
  readonly findByHash: (hash: ContentId) => Effect.Effect<ReadonlyArray<string>, SnapshotError>;
  readonly findChanged: (sinceTxId: string) => Effect.Effect<ReadonlyArray<{
    entityId: string;
    hash: ContentId;
  }>, SnapshotError>;
  readonly checkpoint: (asOf: number) => Effect.Effect<ReadonlyMap<string, string>, SnapshotError>;
}
interface SnapshotWriterShape {
  /**
   * Materialize a derived snapshot at the supplied transaction time.
   *
   * This is a post-commit projection. Implementations must reconstruct the
   * entity at `txId`'s ordered commit position (falling back to `txTime` only
   * for an unjournaled source), so a later writer cannot be mislabeled as part
   * of this snapshot.
   */
  readonly materialize: (txId: string, txTime: number, changedEntityIds: readonly string[]) => Effect.Effect<ReadonlyArray<EntitySnapshot>, SnapshotError>;
  /**
   * Backfill snapshots for all entities that don't have one yet.
   */
  readonly backfill: () => Effect.Effect<number, SnapshotError>;
}
declare const SnapshotService_base: Context.ServiceClass<SnapshotService, "triplex/SnapshotService", SnapshotServiceShape>;
declare class SnapshotService extends SnapshotService_base {}
declare const SnapshotWriter_base: Context.ServiceClass<SnapshotWriter, "triplex/SnapshotWriter", SnapshotWriterShape>;
declare class SnapshotWriter extends SnapshotWriter_base {}
//#endregion
export { SnapshotError, SnapshotService, SnapshotServiceShape, SnapshotWriter, SnapshotWriterShape };
//# sourceMappingURL=SnapshotService.d.ts.map