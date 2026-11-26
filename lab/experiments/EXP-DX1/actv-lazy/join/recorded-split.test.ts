import assert from "node:assert/strict";
import test from "node:test";
import { Documents } from "../../notify1/store.ts";
import { FrameTooLarge, frameEstimate, frameMode } from "./frames.ts";
import { ledgerMode } from "./ledger-parts.ts";
import { noticeFrame, type Cursor, type NoticeCandidate } from "./recorded.ts";

// [DX-ERA4, fourth round T2] A subject split over frames whose ledger (its closing piece) alone cannot fit a frame: under
// subject stops the frame refuses that subject when its split begins, before any of its units is written, so the writer
// can stop it alone; without subject stops the frame is the same as before (the split goes ahead; its last frame fails).
const db = new Documents({ scopeName: "recorded-split" } as never, "notices");
const sha = "0".repeat(64);
const cursor: Cursor = { epoch: sha, event: 1, start: 0, parent: sha, batch: 0, previous: sha, entries: 0, frames: "bytes" };
const event = { account: "notice:v1:" + sha + ":", position: 1, recipe: sha, next: sha, size: 3 };
const candidate = (subject: string, units: number, ledgerChars: number): NoticeCandidate => ({
  subject,
  units: Array.from({ length: units }, (_, i) => db.put("unit:" + subject + ":" + i, "u".repeat(2000))),
  deliveries: 0,
  closing: true,
  ledger: [db.put("ledger:" + subject, "l".repeat(ledgerChars))],
});

test("the sizes: a frame holds a few units; a 20,000-character ledger alone does not fit, a 200-character one does", () => {
  assert.equal(frameEstimate([db.put("ledger:x", "l".repeat(20_000))]).fits, false);
  assert.equal(frameEstimate([db.put("ledger:x", "l".repeat(200))]).fits, true);
});
test("without subject stops: the split goes ahead as before", () => {
  const f = noticeFrame(db, undefined, cursor, [candidate("pl:a", 30, 20_000), candidate("pl:b", 1, 200)], event);
  assert.equal(f.filled.split, true);
  assert.equal(f.filled.advance, 0);
  assert.ok(f.filled.tail > 0);
});
test("with subject stops: the split subject whose ledger cannot fit is refused before its first unit, by name", () => {
  assert.throws(
    () => noticeFrame(db, undefined, cursor, [candidate("pl:a", 30, 20_000), candidate("pl:b", 1, 200)], { ...event, stops: true }),
    (e: unknown) => e instanceof FrameTooLarge && (e as { subject?: string }).subject === "pl:a" && /ledger needs/.test((e as Error).message),
  );
});
test("with subject stops: the subjects before it are written; the split subject is refused in its own frame", () => {
  // a frame that holds whole subjects ends before the one that does not fit (that one begins the next frame)
  const f = noticeFrame(db, undefined, cursor, [candidate("pl:b", 1, 200), candidate("pl:a", 30, 20_000)], { ...event, stops: true });
  assert.deepEqual([f.filled.advance, f.filled.split], [1, false]);
  assert.throws(
    () => noticeFrame(db, undefined, { ...cursor, start: 1 }, [candidate("pl:a", 30, 20_000)], { ...event, stops: true }),
    (e: unknown) => e instanceof FrameTooLarge && (e as { subject?: string }).subject === "pl:a",
  );
});
test("with subject stops: a split whose ledger fits goes ahead, and its continuation is not checked again", () => {
  const f = noticeFrame(db, undefined, cursor, [candidate("pl:a", 30, 200), candidate("pl:b", 1, 200)], { ...event, stops: true });
  assert.equal(f.filled.split, true);
  const next = noticeFrame(db, undefined, { ...cursor, part: f.filled.tail }, [candidate("pl:a", 30, 20_000)], { ...event, stops: true });
  assert.equal(next.filled.advance, 0);
});
test("the option selects ledgers in parts and byte frames by itself; whole can be named; without it, as before", () => {
  const before = process.env.TX2_DERIVED_SEAL;
  try {
    delete process.env.TX2_DERIVED_SEAL;
    assert.deepEqual([ledgerMode(undefined), ledgerMode(""), ledgerMode("parts"), ledgerMode("whole")], ["whole", "whole", "parts", "whole"]);
    assert.deepEqual([frameMode(undefined), frameMode("bytes")], ["count", "bytes"]);
    process.env.TX2_DERIVED_SEAL = "1";
    assert.deepEqual([ledgerMode(undefined), ledgerMode(""), ledgerMode("parts"), ledgerMode("whole")], ["parts", "parts", "parts", "whole"]);
    assert.deepEqual([frameMode(undefined), frameMode("bytes")], ["bytes", "bytes"]);
    assert.throws(() => ledgerMode("chunks"));
  } finally {
    if (before === undefined) delete process.env.TX2_DERIVED_SEAL;
    else process.env.TX2_DERIVED_SEAL = before;
  }
});
test("with subject stops: the split check refuses only what cannot fit, within the counters' growth (not a row's margin)", () => {
  const largest = (ok: (n: number) => boolean) => {
    let lo = 200, hi = 20_000;
    while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (ok(m)) lo = m; else hi = m - 1; }
    return lo;
  };
  const passes = (f: () => unknown) => { try { f(); return true; } catch (e) { if (e instanceof FrameTooLarge) return false; throw e; } };
  // the largest ledger whose closing piece fits a frame by itself (a subject with nothing else to write)
  const fit = largest((n) => passes(() => noticeFrame(db, undefined, cursor, [candidate("pl:a", 0, n)], event)));
  // the largest a split subject (30 units) may begin with under subject stops
  const accepted = largest((n) => passes(() => noticeFrame(db, undefined, cursor, [candidate("pl:a", 30, n)], { ...event, stops: true })));
  assert.ok(accepted <= fit && fit - accepted <= 64, `fit ${fit}, accepted ${accepted}`);
});
