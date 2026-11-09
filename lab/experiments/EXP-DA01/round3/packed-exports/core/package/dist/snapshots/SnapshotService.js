import { Context, Data } from "effect";
//#region src/snapshots/SnapshotService.ts
/**
* Entity Snapshot Service
*
* Provides content-addressed JSON snapshots of entities for:
* - O(1) entity reads (single row lookup vs N triple scans)
* - O(1) change detection (hash comparison)
* - Structural sharing (identical entity states share blobs)
* - Efficient checkpoints (entity→hash maps)
*/
var SnapshotError = class extends Data.TaggedError("SnapshotError") {};
var SnapshotService = class extends Context.Service()("triplex/SnapshotService") {};
var SnapshotWriter = class extends Context.Service()("triplex/SnapshotWriter") {};
//#endregion
export { SnapshotError, SnapshotService, SnapshotWriter };

//# sourceMappingURL=SnapshotService.js.map