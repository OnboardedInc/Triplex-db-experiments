import { Triples } from "../store/Triples.js";
import { SnapshotError, SnapshotService, SnapshotWriter } from "./SnapshotService.js";
import { StorageAdapter } from "../storage/StorageAdapter.js";
import { Layer } from "effect";

//#region src/snapshots/SnapshotServiceLive.d.ts
declare const SnapshotWriterLive: Layer.Layer<SnapshotWriter, SnapshotError, Triples | StorageAdapter>;
declare const SnapshotServiceLive: Layer.Layer<SnapshotService, SnapshotError, StorageAdapter>;
//#endregion
export { SnapshotServiceLive, SnapshotWriterLive };
//# sourceMappingURL=SnapshotServiceLive.d.ts.map