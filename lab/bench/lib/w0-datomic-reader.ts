import type { TriplesHandle } from "./triplex.ts";
import { portableSweep } from "./w0-public.ts";
import { requirePosition, type PositionBasis } from "./w0-world.ts";
import { DatomicClient, sweepRows } from "../../../packages/datomic/dist/index.js";
// [DX-H6] Why: a full inline page bypasses entity caches while preserving physical positions and temporal guards.
// Rejected: changing getReachRowsMany, which is a cached public API used outside this sweep.
export function datomicW0Sweep(
  handle: TriplesHandle,
  feedPage?: (after: number, limit: number) => Promise<{ transactions: readonly any[] }>,
) {
  const portable = portableSweep(handle, feedPage);
  const client = new DatomicClient(handle.backend.url, 35000, 64 * 1024 ** 2, {
    entityCacheBytes: 1,
    rowCacheBytes: 1,
  });
  const db = "s2-" + Buffer.from(String(handle.scope)).toString("base64url");
  return {
    ...portable,
    page: async (subjects: readonly string[], basis: PositionBasis) => {
      requirePosition(basis, Number.MAX_SAFE_INTEGER);
      try {
        const rows = await sweepRows(client, db, subjects, {
          recordedPosition: basis.position,
          validAt: basis.validAt,
        });
        if (rows)
          return {
            rows,
            reportedBasis: { ...basis },
            position: basis.position,
            epoch: String(handle.scope),
            roundTrips: 1,
          };
      } catch (e) {
        // [DX-H6] Why: malformed or unsupported optimized responses decline to the guarded portable path.
        // Rejected: returning partial worlds after a decode failure.
        if (process.env.TX2_SWEEP_STRICT === "1") throw e;
      }
      return portable.page(subjects, basis);
    },
    close: async () => {
      client.close();
      await portable.close();
    },
  };
}
