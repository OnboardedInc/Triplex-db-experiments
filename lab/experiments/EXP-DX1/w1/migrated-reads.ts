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
  current: ReturnType<Histogram["summary"]> & { hist: ReturnType<Histogram["toJSON"]> };
  pinned: ReturnType<Histogram["summary"]> & { hist: ReturnType<Histogram["toJSON"]> };
  currentRows: number[];
};

type Reader = Pick<DatomicClient, "rows" | "begin" | "release">;

/**
 * Sample current and pinned reads of people saved after `firstCut`, at a fixed low rate on its own client.
 * `candidates(nowMs)` returns entity ids, most recently saved first. A person counts as migrated-or-saved only when
 * the current read shows a row recorded after `firstCut`; the pinned read then uses a snapshot cut at or after that row.
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
  let attempted = 0, notYetSaved = 0, pinnedSkipped = 0, cursor = 0;
  let cut = opts.firstCut, cutAt = 0;
  const refreshCut = async () => {
    const snap = await reader.begin(db);
    await reader.release(db, snap.handle);
    cut = snap.position;
    cutAt = Date.now();
  };
  const end = opts.start + opts.seconds * 1000;
  for (let tick = opts.start; tick < end && !opts.stop?.(); tick += 1000 / rate) {
    const wait = tick - Date.now();
    if (wait > 0) await sleep(wait);
    if (Date.now() >= end) break;
    const pool = opts.candidates(Date.now());
    if (pool.length === 0) continue;
    const entity = pool[cursor++ % Math.min(pool.length, 64)]!;
    attempted++;
    try {
      if (Date.now() - cutAt >= 1000) await refreshCut();
      const t0 = performance.now();
      const rows = await reader.rows(db, { entityIds: [entity], basis: { validAt: opts.validAt } });
      const t1 = performance.now();
      const saved = Math.max(...rows.map((r) => Number(r.recorded_position)));
      if (!(saved > opts.firstCut)) { notYetSaved++; continue; }
      current.recordMs(t1 - t0);
      currentRows.push(rows.length);
      if (saved > cut) await refreshCut();
      if (saved > cut) { pinnedSkipped++; continue; }
      const t2 = performance.now();
      const held = await reader.rows(db, { entityIds: [entity], basis: { recordedPosition: cut, validAt: opts.validAt } });
      const t3 = performance.now();
      assert(held.length > 0 && held.some((r) => Number(r.recorded_position) === saved));
      pinned.recordMs(t3 - t2);
    } catch (error) {
      if (errors.length < 20) errors.push(String(error).slice(0, 300));
    }
  }
  return { phase: opts.phase, ratePerSecond: rate, seconds: opts.seconds, attempted, notYetSaved, pinnedSkipped, errors,
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
