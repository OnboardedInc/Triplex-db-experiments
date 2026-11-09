import { SnapshotWriterShape } from "./SnapshotService.js";
import { StoreCapability } from "../store/StoreCapability.js";

//#region src/snapshots/EntitySnapshotsCapability.d.ts
/**
 * Create an EntitySnapshots capability.
 *
 * @param writer - Snapshot writer for materializing snapshots on writes
 */
declare const makeEntitySnapshotsCapability: (writer: SnapshotWriterShape) => StoreCapability;
//#endregion
export { makeEntitySnapshotsCapability };
//# sourceMappingURL=EntitySnapshotsCapability.d.ts.map