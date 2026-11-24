import assert from "node:assert/strict";
import { Histogram } from "../../../bench/lib/hist.ts";
import type { Save } from "../scale1/decision/writes.ts";

/**
 * One offered row. `offset` is the row's scheduled time on the cell's tape, in milliseconds from the cell start;
 * callers that hold the tape pass it, and the runner sets `due` to exactly `start + offset`.
 */
export type WindowWrite = Pick<Save, "due" | "end" | "status" | "receipt" | "dispatched"> & { offset?: number };

// [DX-V01] Why: rate belongs to the ACK clock, but latency belongs to the originally scheduled offer.
// Rejected: using the ACK clock for both and moving slow first-half offers into the warm cohort.
// [DX-CARD1] Why: a row belongs to the cell and to a half by its tape offset, not by `due`. `due` is the offset added
// to a fractional epoch-millisecond start, and at these epochs (about 1.8e12 ms) one floating-point step is 2.4e-4 ms,
// so an offset within half a step of the cell end gives `due === end`. The production tape's calibration puts one save
// per neighbour account at about 89,999.99999 ms of a 90 s cell (production.ts `calibrated`), so every production-S
// cell has nine such rows. The rule: count each in the cell and half its offset names (here the second half), and
// report how many there were (`edge`). A row whose offset lies outside the cell, or whose `due` is not exactly
// `start + offset`, still fails, as does any row without an offset whose `due` lies outside [start, end).
// Rejected: accepting `due === end` without the tape (it cannot tell a rounded row from one truly offered at the end),
// dropping the rows (the card would undercount offers silently), and changing the tape (the campaign is bound to it).
export function windowStats(rows: readonly WindowWrite[], start: number, seconds: number) {
  const span = seconds * 1000, midpoint = span / 2;
  // Without an offset, the row is placed by `due` against the epoch bounds exactly as before this rule.
  const inside = (row: WindowWrite, from: number, until: number) => row.offset === undefined
    ? row.due >= start + from && row.due < start + until : row.offset >= from && row.offset < until;
  for (const row of rows) {
    if (row.offset === undefined) {
      assert(Number.isFinite(row.due) && row.due >= start && row.due < start + span, "a row's due lies outside its cell");
      continue;
    }
    assert(Number.isFinite(row.offset) && row.offset >= 0 && row.offset < span, "a row's tape offset lies outside its cell");
    assert.equal(row.due, start + row.offset, "a row's due differs from its tape offset");
  }
  const ranges = [["whole", 0, span], ["first", 0, midpoint], ["second", midpoint, span]] as const;
  return ranges.map(([name, from, until]) => {
    const latency = new Histogram(), wait = new Histogram();
    let acked = 0, offered = 0, expired = 0, edge = 0;
    for (const row of rows) {
      if (row.receipt) assert(row.end !== undefined && Number.isFinite(row.end) && row.end >= row.due &&
        (row.status === "acked" || row.status === "recovered"));
      if (row.status === "acked" && row.receipt && row.end! >= start + from && row.end! < start + until) acked++;
      if (!inside(row, from, until)) continue;
      offered++;
      if (row.due >= start + span) edge++;
      if (row.status === "expired-before-dispatch") expired++;
      if (row.receipt) latency.recordMs(row.end! - row.due);
      if (row.dispatched !== undefined) {
        assert(Number.isFinite(row.dispatched) && row.dispatched >= row.due);
        wait.recordMs(row.dispatched - row.due);
      }
    }
    return { name, storedPerSecond: acked / ((until - from) / 1000), acked, offered, expired, edge,
      latency: latency.summary(), senderWait: wait.summary() };
  });
}
