import type { PullResult } from "./composition.ts";
import { observe, type Observed } from "./observe.ts";

export type ReadObservation = Pick<PullResult,
  "entities" | "depth" | "roundTrips" | "route" | "language" | "waitedMs" | "replicaFallbackReason"
> & { readonly observed: Observed };
// [DX-R3-P8] Why: the benchmark retains complete checked contributions, not public worlds, for every RYOW read.
// Rejected: cloning hundreds of immutable Triples onto the commit issuer, or pretending an empty array is a public pull.
export function readObservation(result: PullResult): ReadObservation {
  return { observed: observe(result), entities: result.entities, depth: result.depth,
    roundTrips: result.roundTrips, route: result.route, language: result.language,
    waitedMs: result.waitedMs, replicaFallbackReason: result.replicaFallbackReason };
}
