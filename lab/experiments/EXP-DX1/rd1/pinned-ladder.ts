import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { now } from "../scale1/decision/observer.ts";
import { accounts, field, task } from "../scale1/decision/plan.ts";
import type { AdoptedSeed } from "../v01/adopt.ts";
import { pinnedFields } from "../v01/pinned-fields.ts";
import { isProduction } from "../v01/production-card.ts";
import type { Write } from "../scale1/decision/plan.ts";
import type { Sender } from "../scale1/decision/writes.ts";

// [DX-RD2] The short pinned ladder for TX2_PINNED_SHORTCUT on the aged 1 billion database: the scorecard's own read
// (one person's field 0 by client.rows at a pinned position, one exchange per read), at the old seed cut and near the
// head, 1, 16 and 256 seats for 60 s each; "on" means both pinned options. The old cut is checked against the seed's value on every read.
// Rejected: a new read path (the measured read must be the card's), and a second oracle for the near-head pin
// (AGE1 may have changed the field; that pin is checked for one row at or below the pin).
export const pinnedSeats = [1, 16, 256] as const;
export const pinnedStepSeconds = 60;
export const recentDistance = 1000;

// [DX-RD2] The tuned arm: three reader cores, client batches of eight (v01/pinned-fields.ts, the read study's cohort
// batching: calls already queued in one turn share an exchange at the same basis), at 64, 256 and 1,024 seats.
export const tunedSeats = [64, 256, 1024] as const;
export const tunedBatch = 8;

export async function pinnedLadder(out: string, read: string, seed: AdoptedSeed, head: number, shortcut: boolean, toy = false,
  shape: { seats?: readonly number[]; batch?: number; name?: string } = {}) {
  const seconds = toy ? 3 : pinnedStepSeconds, seats = shape.seats ?? (toy ? [1, 4] : [...pinnedSeats]);
  const batch = shape.batch ?? 1;
  const client = new DatomicClient(read, 35_000);
  const options = await client.request<any>("GET", "/v1/db/" + seed.scope.db + "/write-options");
  // [DX-RD2] "on" runs both pinned options: the cut lookup (TX2_PINNED_CUT_LOOKUP) and the short-cut (TX2_PINNED_SHORTCUT).
  assert.deepEqual([options.options.pinnedShortcut, options.options.pinnedCutLookup], [shortcut, shortcut],
    "the read gateway does not run the requested options");
  const stats = async () => (await client.request<any>("GET", "/v2/admin/scan-stats")).pinnedShortcut;
  const pins = [{ name: "seed-cut", position: seed.scope.cut }, { name: "near-head", position: Math.max(seed.scope.cut, head - (toy ? 5 : recentDistance)) }];
  const steps = [];
  try {
    for (const pin of pins) {
      const basis = { recordedPosition: pin.position, validAt: SEED_VALID_FROM };
      for (const n of seats) {
        let exchanges = 0, batched = 0;
        const fetch = pinnedFields(client, seed.scope.db, field(0), basis, batch, (send, size) => { exchanges++; batched += size; return send(); });
        const end = now() + seconds * 1000, delay = new Histogram(), before = await stats();
        const failures: Record<string, number> = {};
        let errors = 0, wrong = 0;
        await Promise.all(Array.from({ length: n }, async (_, seat) => {
          let k = seat;
          while (now() < end) {
            const subject = (7919 * ++k) % seed.image.people, a = seat % accounts.length, entity = task(a, subject);
            const issued = now();
            try {
              const rows = await fetch(entity);
              assert.equal(rows.length, 1);
              assert.deepEqual([rows[0]!.entity_id, rows[0]!.attribute], [entity, field(0)]);
              assert(rows[0]!.recorded_position <= pin.position);
              if (pin.position === seed.scope.cut && rows[0]!.value_string !== fieldValue(subject, 0, 0, 0).value) wrong++;
              if (now() <= end) delay.recordMs(now() - issued);
            } catch (error) {
              errors++;
              const key = error instanceof Error ? (error as any).code ?? error.name : "unknown";
              failures[key] = (failures[key] ?? 0) + 1;
            }
          }
        }));
        const after = await stats();
        const step = { pin: pin.name, position: pin.position, seats: n, seconds, goodput: delay.count / seconds,
          errors, failures, wrong, read: delay.summary(),
          shortcut: { current: after.currentAnswers - before.currentAnswers, asOf: after.asOfAnswers - before.asOfAnswers },
          batch, exchanges, meanBatch: exchanges ? batched / exchanges : 0 };
        console.log("[DX-RD2] " + JSON.stringify(step));
        steps.push(step);
        assert.equal(wrong, 0, "a pinned read returned a value other than the seed's");
      }
    }
  } finally {
    client.close();
  }
  const result = { shortcut, head, pins, steps, batch, seats };
  fs.writeFileSync(path.join(out, shape.name ?? "pinned-ladder.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return result;
}

// [DX-RD3] Why: P1's bar holds with the fixed save load running, so the tuned reader's 256-seat step runs inside a
// card cell's save window on the same stack (v01/adopted.ts `Alongside`). Three pin kinds: the old seed cut (each value
// checked against the seed's), near the head (head - 1,000 at the window's first cut, checked as the tuned arm checks
// it), and "tape": each seat reads a subject the window's own tape has just saved, pinned at the position of that
// subject's last acknowledged save, and every field the sender recorded for it must come back with the same row ID,
// value and position (production subjects must return no other field). This is how the product pins a read after a save.
// Rejected: batching the tape pins (each seat has its own pin, so an exchange carries one subject, as in the product),
// and checking the tape pins against a later read (the sender's record at acknowledgement is the oracle).
export const savesSeats = 256;
export type PinKind = "seed-cut" | "near-head" | "tape";
type Candidate = { owner: string; at: number; rows: () => readonly Row[] | undefined; production: boolean };
type Row = Awaited<ReturnType<DatomicClient["rows"]>>[number];
const fieldAttribute = (attribute: string) => /^:task\/field-\d+$/.test(attribute);
const rowKey = (r: Pick<Row, "attribute" | "id" | "value_string" | "recorded_position">) =>
  [r.attribute, r.id, r.value_string, r.recorded_position].join("\u0000");

export async function pinnedWindow(read: string, seed: AdoptedSeed, kind: PinKind, window: { start: number; seconds: number;
  startHead: number; candidates: Candidate[] }, opts: { seats?: number; batch?: number; distance?: number; plant?: (rows: Row[]) => Row[] } = {}) {
  const seats = opts.seats ?? savesSeats, batch = kind === "tape" ? 1 : (opts.batch ?? tunedBatch);
  const client = new DatomicClient(read, 35_000);
  const options = await client.request<any>("GET", "/v1/db/" + seed.scope.db + "/write-options");
  assert.deepEqual([options.options.pinnedShortcut, options.options.pinnedCutLookup], [true, true],
    "the read gateway does not run both pinned options");
  const stats = async () => (await client.request<any>("GET", "/v2/admin/scan-stats")).pinnedShortcut;
  const position = kind === "seed-cut" ? seed.scope.cut : kind === "near-head" ? Math.max(seed.scope.cut, window.startHead - (opts.distance ?? recentDistance)) : undefined;
  const basis = position === undefined ? undefined : { recordedPosition: position, validAt: SEED_VALID_FROM };
  let exchanges = 0, batched = 0;
  const fetch = basis && pinnedFields(client, seed.scope.db, field(0), basis, batch, (send, size) => { exchanges++; batched += size; return send(); });
  const delay = new Histogram(), failures: Record<string, number> = {};
  let errors = 0, wrong = 0, notYetSaved = 0, idle = 0, checkedRows = 0;
  const lag = new Histogram(), tapeSubjects = new Set<string>();
  const sorted = [...window.candidates].sort((a, b) => a.at - b.at);
  let cursor = 0;
  // Subjects offered between 20 s and 0.2 s ago; a seat takes them round robin and skips any not yet acknowledged.
  const below = (limit: number) => {
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid]!.at <= limit) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const recent = () => { const t = now(); return { from: below(t - 20_000), to: below(t - 200), t }; };
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, window.start - now())));
  const end = window.start + window.seconds * 1000, before = await stats();
  await Promise.all(Array.from({ length: seats }, async (_, seat) => {
    let k = seat;
    while (now() < end) {
      if (kind !== "tape") {
        const subject = (7919 * ++k) % seed.image.people, a = seat % accounts.length, entity = task(a, subject);
        const issued = now();
        try {
          const rows = await fetch!(entity);
          assert.equal(rows.length, 1);
          assert.deepEqual([rows[0]!.entity_id, rows[0]!.attribute], [entity, field(0)]);
          assert(rows[0]!.recorded_position <= position!);
          const value = opts.plant ? opts.plant([...rows])[0]!.value_string : rows[0]!.value_string;
          if (kind === "seed-cut" && value !== fieldValue(subject, 0, 0, 0).value) wrong++;
          if (now() <= end) delay.recordMs(now() - issued);
        } catch (error) {
          errors++;
          const key = error instanceof Error ? (error as any).code ?? error.name : "unknown";
          failures[key] = (failures[key] ?? 0) + 1;
        }
        continue;
      }
      const { from, to } = recent();
      let chosen: { c: Candidate; snapshot: Row[]; pin: number } | undefined;
      for (let tries = 0; tries < 64 && to > from && !chosen; tries++) {
        const c = sorted[from + (cursor++ % (to - from))]!;
        const rows = c.rows();
        const pin = rows?.length ? Math.max(...rows.map((r) => r.recorded_position)) : 0;
        if (!rows || pin <= window.startHead) { notYetSaved++; continue; }
        chosen = { c, snapshot: rows.map((r) => ({ ...r })), pin };
      }
      if (!chosen) { idle++; await new Promise((resolve) => setTimeout(resolve, 20)); continue; }
      const issued = now();
      try {
        exchanges++; batched++;
        const got = await client.rows(seed.scope.db, { entityIds: [chosen.c.owner], basis: { recordedPosition: chosen.pin, validAt: SEED_VALID_FROM } });
        const rows = opts.plant ? opts.plant(got.map((r) => ({ ...r }))) : got;
        const want = chosen.snapshot.map(rowKey).sort();
        const attributes = new Set(chosen.snapshot.map((r) => r.attribute));
        const mine = rows.filter((r) => r.entity_id === chosen!.c.owner && (attributes.has(r.attribute) ||
          (chosen!.c.production && fieldAttribute(r.attribute))));
        assert(rows.every((r) => r.recorded_position <= chosen!.pin));
        if (JSON.stringify(mine.map(rowKey).sort()) !== JSON.stringify(want)) wrong++;
        checkedRows += want.length;
        tapeSubjects.add(chosen.c.owner);
        if (now() <= end) { delay.recordMs(now() - issued); lag.recordMs(Math.max(0, issued - chosen.c.at)); }
      } catch (error) {
        errors++;
        const key = error instanceof Error ? (error as any).code ?? error.name : "unknown";
        failures[key] = (failures[key] ?? 0) + 1;
      }
    }
  }));
  const after = await stats();
  client.close();
  const step = { pin: kind, position: position ?? null, seats, seconds: window.seconds, goodput: delay.count / window.seconds,
    errors, failures, wrong, read: delay.summary(),
    shortcut: { current: after.currentAnswers - before.currentAnswers, asOf: after.asOfAnswers - before.asOfAnswers },
    batch, exchanges, meanBatch: exchanges ? batched / exchanges : 0,
    ...(kind === "tape" ? { tape: { subjects: tapeSubjects.size, checkedRows, notYetSaved, idle, sinceOffer: lag.summary() } } : {}) };
  console.log("[DX-RD3] " + JSON.stringify(step));
  return step;
}

/** The tape pins' candidates: every offer of the window's tape, with its offer time and the sender's live record. */
export function tapeCandidates(tape: readonly Write[], start: number, senders: readonly Sender[]): Candidate[] {
  return tape.map((e) => {
    const owner = (e as Write & { owner?: string }).owner ?? task(e.account, e.subject);
    return { owner, at: start + e.ms, production: isProduction(e), rows: () => senders[e.account]?.rows.get(owner) };
  });
}
