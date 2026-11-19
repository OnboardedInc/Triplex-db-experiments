import type { Basis } from "./composition.ts";
import type { ReadRecord } from "./observe.ts";
import type { ReadObservation } from "./read-observation.ts";

export const PHASE_RYOW = -2;
export const MAX_RECEIPT_CAPTURES = 65_536;
export type ReceiptRead = {
  subject: number;
  basis: Basis & { recordedPosition: number };
  start: number;
  commitTraceId: string;
};

// [DX-DRV1] Why: both dispatch modes keep the same full digest, route and receipt-pinned observation tuple.
// Rejected: sending an abbreviated check to the spill worker.
export function receiptReadRow(
  subject: number,
  basis: Basis,
  position: number,
  start: number,
  latency: number,
  result: ReadObservation | { error: string },
): ReadRecord {
  if ("error" in result)
    return [
      PHASE_RYOW,
      subject,
      basis.recordedAt,
      basis.validAt,
      start,
      latency,
      -1,
      0,
      "",
      0,
      0,
      0,
      result.error,
      0,
      position,
      0,
      -1,
      0,
      "error",
      "",
      0,
    ];
  const o = result.observed;
  return [
    PHASE_RYOW,
    subject,
    basis.recordedAt,
    basis.validAt,
    start,
    latency,
    o.stamp,
    o.facts,
    o.digest,
    o.bytes,
    result.depth,
    result.roundTrips,
    null,
    0,
    position,
    0,
    -1,
    0,
    result.route,
    result.language,
    result.waitedMs,
  ];
}

export function countReceiptFallback(reasons: Record<string, number>, result: ReadObservation) {
  if (result.route !== "fallback") return;
  const reason = result.replicaFallbackReason ?? "gateway";
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}
