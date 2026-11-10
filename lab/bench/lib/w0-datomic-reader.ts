import type { TriplesHandle } from "./triplex.ts";
import { portableSweep } from "./w0-public.ts";
// [DX-H2] Why: WorldRow.position becomes the oracle fact's tx in worldOf, not just a guard.
// Rejected: assigning the requested basis to Triple values (changes fingerprint/evaluation inputs).
// getReachTriples/Many currently erase recorded_position. Keep the exact portable reader until
// the public adapter returns rows with their recorded position; method presence alone is insufficient.
export function datomicW0Sweep(
  handle: TriplesHandle,
  feedPage?: (after: number, limit: number) => Promise<{ transactions: readonly any[] }>,
) {
  return portableSweep(handle, feedPage);
}
