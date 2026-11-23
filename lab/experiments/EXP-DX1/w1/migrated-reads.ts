import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import type { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { Histogram } from "../../../bench/lib/hist.ts";

// [Opus W1] Why: the owner-head pair must time reads of the people its own tape has just saved, in both arms.
// Rejected: timing reads on the save client or inside the save window's clock (they would slow the writer under test),
// and the quiet-account read alone (those people are never saved, so never migrated).

export const migratedReadRate = 5; // people per second; each person gets one current and one pinned read, in sequence

export type MigratedReadPhase = {
  phase: "loaded" | "settled";
  ratePerSecond: number;
  seconds: number;
  attempted: number;
  notYetSaved: number;
  pinnedSkipped: number;
  errors: string[];
  errorCount: number;
  current: ReturnType<Histogram["summary"]> & { hist: ReturnType<Histogram["toJSON"]> };
  pinned: ReturnType<Histogram["summary"]> & { hist: ReturnType<Histogram["toJSON"]> };
  currentRows: number[];
};

type Reader = Pick<DatomicClient, "rows">;

/**
 * Sample current and pinned reads of people saved after `firstCut`, at a fixed low rate on its own client.
 * `candidates(nowMs)` returns entity ids, most recently saved first. A person counts as migrated-or-saved only when
 * the current read shows a row recorded after `firstCut`; the pinned read then asks for the subject at the recorded
 * position of that newest row (`saved`), which the same reader has already shown.
 *
 * [Opus W1] Why: bench 4 (2026-11-23) pinned at a snapshot cut taken after the current read. Under load the tape saves
 * the same subject again within milliseconds (394/s: 48,625 repeat gaps under 1 s among 14,299 subjects), so that cut
 * could include a newer save that replaced the rows recorded at `saved`, and a correct store could fail the check
 * (bench 4 logged 3 and 11 such errors without the subject or positions, so which case they were is not known).
 * At `saved` nothing later can appear, so every check below is exact: a row at that basis is recorded at `saved`,
 * and every row the current read returned is still there (a row alive later was alive at `saved`).
 * The basis maps to the physical transaction holding `saved` (storage.clj at-position); the same reader showed it.
 * Rejected: skipping the check, waiting for a quieter cut, or counting a mismatch as anything but an error.
 */
export async function sampleMigratedReads(reader: Reader, db: string, opts: {
  phase: "loaded" | "settled"; start: number; seconds: number; firstCut: number; validAt: number;
  candidates: (nowMs: number) => readonly string[]; rate?: number; stop?: () => boolean;
}): Promise<MigratedReadPhase> {
  const rate = opts.rate ?? migratedReadRate;
  assert(rate > 0 && rate <= 20 && opts.seconds > 0);
  const current = new Histogram(), pinned = new Histogram();
  const currentRows: number[] = [];
  const errors: string[] = [];
  let attempted = 0, notYetSaved = 0, pinnedSkipped = 0, errorCount = 0, cursor = 0;
  const end = opts.start + opts.seconds * 1000;
  for (let tick = opts.start; tick < end && !opts.stop?.(); tick += 1000 / rate) {
    const wait = tick - Date.now();
    if (wait > 0) await sleep(wait);
    if (Date.now() >= end) break;
    const pool = opts.candidates(Date.now());
    if (pool.length === 0) continue;
    const entity = pool[cursor++ % Math.min(pool.length, 64)]!;
    attempted++;
    let saved = Number.NaN, rows: Awaited<ReturnType<Reader["rows"]>> = [], held: typeof rows = [];
    try {
      const t0 = performance.now();
      rows = await reader.rows(db, { entityIds: [entity], basis: { validAt: opts.validAt } });
      const t1 = performance.now();
      saved = Math.max(...rows.map((r) => Number(r.recorded_position)));
      if (!(saved > opts.firstCut)) { notYetSaved++; continue; }
      current.recordMs(t1 - t0);
      currentRows.push(rows.length);
      const t2 = performance.now();
      held = await reader.rows(db, { entityIds: [entity], basis: { recordedPosition: saved, validAt: opts.validAt } });
      const t3 = performance.now();
      const heldIds = new Set(held.map((r) => r.id));
      assert(held.some((r) => Number(r.recorded_position) === saved) && held.length >= rows.length
        && rows.every((r) => heldIds.has(r.id)), "pinned read at the saved position lacks the current rows");
      pinned.recordMs(t3 - t2);
    } catch (error) {
      errorCount++;
      // Every error names the subject and both reads' positions, so it can be judged from the evidence alone.
      if (errors.length < 20) errors.push(JSON.stringify({ error: String(error).slice(0, 200), entity, saved,
        current: rows.map((r) => [r.id, Number(r.recorded_position)]),
        held: held.map((r) => [r.id, Number(r.recorded_position)]) }).slice(0, 4000));
    }
  }
  return { phase: opts.phase, ratePerSecond: rate, seconds: opts.seconds, attempted, notYetSaved, pinnedSkipped, errors, errorCount,
    current: { ...current.summary(), hist: current.toJSON() }, pinned: { ...pinned.summary(), hist: pinned.toJSON() },
    currentRows: [...new Set(currentRows)].sort((a, b) => a - b) };
}

/** People in a tape whose offers are due at least `lagMs` before `nowMs`, most recent first. */
export function recentlyOffered<T extends { ms: number }>(tape: readonly T[], start: number, nowMs: number, lagMs: number,
  entity: (e: T) => string): string[] {
  const out: string[] = [], seen = new Set<string>();
  for (let i = tape.length - 1; i >= 0 && out.length < 64; i--) {
    const e = tape[i]!;
    if (start + e.ms > nowMs - lagMs) continue;
    const id = entity(e);
    if (!seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}
