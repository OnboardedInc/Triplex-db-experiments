import assert from "node:assert/strict";
import type { Admission } from "../prep1/rolling-credits.ts";
import type { Save } from "../scale1/decision/writes.ts";

export type CreditRow = Pick<Save, "account" | "dispatched" | "end" | "fairTurn" | "creditReleased" | "neighboursAhead">;

// [DX-V01] Why: rebuild actual admissions from this cell's grant and release clocks.
// Rejected: trusting a mode flag to prove that a rolling run bounded outstanding neighbours.
export function checkAdmission(rows: readonly CreditRow[], selection: Admission) {
  const dispatched = rows.filter(row => row.dispatched !== undefined);
  const turns = new Map<number, number>();
  for (const row of dispatched) {
    assert(Number.isSafeInteger(row.fairTurn) && row.fairTurn! > 0);
    assert(Number.isFinite(row.dispatched) && Number.isFinite(row.end) && Number.isFinite(row.creditReleased));
    assert(row.dispatched! < row.creditReleased! && row.dispatched! <= row.end! && row.end! <= row.creditReleased!);
    const members = (turns.get(row.fairTurn!) ?? 0) + 1;
    assert(members <= (selection.mode === "rolling" ? 1 : selection.credits));
    assert.equal(row.neighboursAhead === undefined, selection.mode === "barrier");
    turns.set(row.fairTurn!, members);
  }
  if (selection.mode === "barrier") return;

  const events = dispatched.flatMap(row => [
    { at: row.dispatched!, grant: 1, row },
    { at: row.creditReleased!, grant: 0, row },
  ]);
  events.sort((a, b) => a.at - b.at || a.grant - b.grant || a.row.fairTurn! - b.row.fairTurn!);
  let active = 0, neighbours = 0;
  for (const event of events) {
    const delta = event.grant ? 1 : -1;
    if (event.grant) assert.equal(event.row.neighboursAhead, neighbours);
    active += delta;
    if (event.row.account !== selection.quietAccount) neighbours += delta;
    assert(active >= 0 && active <= selection.credits);
    assert(neighbours >= 0 && neighbours < selection.credits);
  }
  assert.equal(active, 0);
  assert.equal(neighbours, 0);
}
