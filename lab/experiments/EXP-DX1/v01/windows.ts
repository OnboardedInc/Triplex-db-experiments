import assert from "node:assert/strict";
import { Histogram } from "../../../bench/lib/hist.ts";
import type { Save } from "../scale1/decision/writes.ts";

export type WindowWrite = Pick<Save, "due" | "end" | "status" | "receipt" | "dispatched">;

// [DX-V01] Why: rate belongs to the ACK clock, but latency belongs to the originally scheduled offer.
// Rejected: using the ACK clock for both and moving slow first-half offers into the warm cohort.
export function windowStats(rows: readonly WindowWrite[], start: number, seconds: number) {
  const midpoint = start + seconds * 500, end = start + seconds * 1000;
  const ranges = [["whole", start, end], ["first", start, midpoint], ["second", midpoint, end]] as const;
  return ranges.map(([name, from, until]) => {
    const latency = new Histogram(), wait = new Histogram();
    let acked = 0, offered = 0, expired = 0;
    for (const row of rows) {
      assert(Number.isFinite(row.due) && row.due >= start && row.due < end);
      if (row.receipt) assert(row.end !== undefined && Number.isFinite(row.end) && row.end >= row.due &&
        (row.status === "acked" || row.status === "recovered"));
      if (row.status === "acked" && row.receipt && row.end! >= from && row.end! < until) acked++;
      if (row.due < from || row.due >= until) continue;
      offered++;
      if (row.status === "expired-before-dispatch") expired++;
      if (row.receipt) latency.recordMs(row.end! - row.due);
      if (row.dispatched !== undefined) {
        assert(Number.isFinite(row.dispatched) && row.dispatched >= row.due);
        wait.recordMs(row.dispatched - row.due);
      }
    }
    return { name, storedPerSecond: acked / ((until - from) / 1000), acked, offered, expired,
      latency: latency.summary(), senderWait: wait.summary() };
  });
}
