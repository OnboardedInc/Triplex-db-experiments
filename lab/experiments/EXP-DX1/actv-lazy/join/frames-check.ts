import assert from "node:assert/strict";
import fs from "node:fs";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { width } from "../../notify1/census.ts";
import { Documents, hash, pack, unpack, type Row } from "../../notify1/store.ts";
import { framePageKey, progressKey, valuesFrame, valuesProgress, type Changes, type Progress } from "./archive.ts";
import { toWire } from "./check.ts";
import { authoredSeed, expectedPolicy } from "./deep-reference.ts";
import { checkForms, expectForms } from "./form-expect.ts";
import { frameEstimate, windowOf } from "./frames.ts";
import { largeRelease, parseShape, shapeName } from "./large-release.ts";
import { evaluateRows } from "./material.ts";
import { noticeFrame, type Cursor, type NoticeCandidate } from "./recorded.ts";

// [DX-ACT4] Why: before any stack runs, drive both byte-framed writers' own frame builders (valuesFrame, noticeFrame:
// the functions the writers call) over deep toy subjects for each release pair, with the writers' own bound, and prove
// (1) every frame fits, (2) the frames joined in order give back exactly the kernel's changed values and notices,
// (3) split subjects rejoin exactly, and (4) a release that only adds forms matches the independent rule statement
// (form-expect.ts). It also prices the frames per subject for the 100,000-subject forecast.
// Rejected: trusting the toy stack alone (it runs 72 subjects; this runs hundreds in seconds without a database).
// Usage: node --experimental-transform-types frames-check.ts SUBJECTS OUT.json [SHAPE ...]
const [peopleArg, outArg, ...shapeArgs] = process.argv.slice(2);
const people = Number(peopleArg ?? 256);
assert(Number.isSafeInteger(people) && people >= 16 && people <= 4096 && outArg);
const shapes = (shapeArgs.length
  ? shapeArgs
  : ["forms=20,policies=20,permille=1000", "forms=20,policies=20,permille=100", "forms=150,policies=150,permille=1000"]
).map(parseShape);
const validTime = W0.POPULATION_VALID_TIME,
  tx = 9;
const worlds = Array.from({ length: people }, (_, i) => expectedPolicy(i, authoredSeed(i, 5)));
const db = new Documents({ scopeName: "frames-check" } as never, "settlement-values");
const fakeId = (k: string) => hash(["triple", k]).slice(0, 40);
const row = <T>(key: string, value: T, at: number): Row<T> => ({ key, id: fakeId(key + at), at, value });
const pct = (xs: number[], p: number) => (xs.length ? xs.toSorted((a, b) => a - b)[Math.ceil(xs.length * p) - 1]! : 0);
const stats = (xs: number[]) => ({ n: xs.length, p50: pct(xs, 0.5), p99: pct(xs, 0.99), max: Math.max(0, ...xs) });

type Pair = { label: string; old: W0.ReleaseDoc | null; next: W0.ReleaseDoc; prior: W0.ReleaseDoc | null; adds?: boolean };
const pairs: Pair[] = [
  { label: "baseline R1 (no predecessor)", old: null, next: W0.R1.doc, prior: null },
  { label: "small R1 -> R2", old: W0.R1.doc, next: W0.R2.doc, prior: W0.R1.doc },
  ...shapes.flatMap((s) => [
    // The server forecast's case: the first release is R1 plus the forms (DX_ACT4_INITIAL=large).
    { label: "R1+" + shapeName(s) + " (no predecessor)", old: null, next: largeRelease(W0.R1.doc, s), prior: null },
    { label: "R2 -> R2+" + shapeName(s), old: W0.R2.doc, next: largeRelease(W0.R2.doc, s), prior: W0.R2.doc, adds: true },
    { label: "R2+" + shapeName(s) + " -> R2", old: largeRelease(W0.R2.doc, s), next: W0.R2.doc, prior: largeRelease(W0.R2.doc, s) },
  ]),
];
const report: unknown[] = [];
for (const pair of pairs) {
  const basis = { tx, validTime };
  const next = W0.compileRelease(pair.next),
    old = pair.old ? W0.compileRelease(pair.old) : undefined;
  const ts = evaluateRows({ worlds, basis }, old, next, false);
  const changedBy = new Map(ts.rows.map((r) => [r.subject, r.rows.map(([k, , v]) => [k, v] as [string, string | null])]));
  // ---- values: drive valuesFrame until the release is stored ----
  const identity = hash(["frames-check", pair.label]),
    key = progressKey(1);
  let current: Progress = valuesProgress(identity),
    prior: Row<Progress> | undefined;
  const pages: string[] = [],
    valueUs: number[] = [],
    valueWire: number[] = [],
    perFrame: number[] = [];
  let valueSplits = 0;
  while (current.status === "pending") {
    const start = current.through,
      { end } = windowOf(start, people, width);
    const candidates = worlds
      .slice(start, end)
      .map((w) => ({ subject: w.subject, units: changedBy.get(w.subject) ?? [], closing: false }));
    const f = valuesFrame(db, key, prior, current, framePageKey(1, current.frame! + 1), candidates, people);
    const e = frameEstimate(f.ops);
    assert(e.fits && e.us <= 8000, "a values frame over the bound");
    valueUs.push(e.us);
    valueWire.push(e.wire);
    perFrame.push(f.next.through - start);
    if (f.filled.split) valueSplits++;
    const page = (f.ops.at(-1) as { value: { value: string } }).value.value;
    pages.push(JSON.parse(page).bytes);
    prior = row(key, f.next, pages.length);
    current = f.next;
  }
  const joined: Changes[] = [];
  for (const bytes of pages)
    for (const piece of unpack<Changes[]>(bytes)) {
      if (piece.part) {
        const last = joined.at(-1)!;
        assert(last.subject === piece.subject && last.changes.length === piece.part);
        last.changes.push(...piece.changes);
      } else joined.push({ subject: piece.subject, changes: [...piece.changes] });
    }
  assert.deepEqual(
    joined,
    ts.rows.map((r) => ({ subject: r.subject, changes: r.rows.map(([k, , v]) => [k, v]) })),
    "joined frames differ from the kernel's changed values",
  );
  // ---- notices: drive noticeFrame with ledgers as after the predecessor's settlement ----
  const ledgers = new Map<string, W0.ItemState[]>();
  if (pair.prior) {
    const p = W0.compileRelease(pair.prior);
    for (const w of worlds) {
      const out = W0.evaluateWorld(w, p, basis);
      assert(!W0.isFailure(out));
      const r = W0.publish({ items: [], subjects: [], pending: [] }, [
        { subject: w.subject, release: p.hash, basis: { tx: BigInt(tx), validTime }, workItems: out.workItems },
      ]);
      ledgers.set(w.subject, r.state.items as W0.ItemState[]);
    }
  }
  const expectedDeliveries: W0.Delivery[] = [];
  const published = worlds.map((w) => {
    const out = W0.evaluateWorld(w, next, basis);
    assert(!W0.isFailure(out));
    const before = ledgers.get(w.subject) ?? [];
    const r = W0.publish({ items: before, subjects: [], pending: [] }, [
      { subject: w.subject, release: next.hash, basis: { tx: BigInt(tx), validTime }, workItems: out.workItems },
    ]);
    expectedDeliveries.push(...r.deliveries);
    return { before, r };
  });
  const sha = "0".repeat(64);
  let cursor: Cursor = { epoch: sha, event: 1, start: 0, parent: sha, batch: 0, previous: sha, entries: 0 },
    cursorRow: Row<Cursor> | undefined;
  const recorded: W0.Delivery[] = [],
    noticeUs: number[] = [],
    noticeWire: number[] = [],
    noticePerFrame: number[] = [];
  let noticeSplits = 0,
    noticeFrames = 0;
  const ledgerWritten = new Map<string, string>();
  while (cursor.event === 1) {
    const { end } = windowOf(cursor.start, people, width);
    const ids = worlds.slice(cursor.start, end).map((w) => w.subject);
    const candidates = ids.map((subject, j): NoticeCandidate => {
      const { before, r } = published[cursor.start + j]!;
      const ledger =
        canonical(r.state.items) !== canonical(before)
          ? db.change("recorded-ledger:" + subject, before.length ? row("x", "", 0) : undefined, pack(r.state.items))
          : [];
      return { subject, units: r.deliveries, deliveries: r.deliveries.length, closing: ledger.length > 0, ledger };
    });
    const f = noticeFrame(db, cursorRow, cursor, candidates, {
      account: "notice:v1:" + sha + ":",
      position: tx,
      recipe: sha,
      next: sha,
      size: people,
    });
    const e = frameEstimate(f.ops);
    assert(e.fits, "a notice frame over the bound");
    noticeUs.push(e.us);
    noticeWire.push(e.wire);
    noticePerFrame.push((f.next.event === 1 ? f.next.start : people) - cursor.start);
    noticeFrames++;
    if (f.filled.split) noticeSplits++;
    if (f.packet) recorded.push(...f.packet.deliveries);
    for (const p of f.filled.pieces) if (p.close && candidates[p.index]!.closing) ledgerWritten.set(candidates[p.index]!.subject, "w");
    cursorRow = row("notice-progress", f.next, noticeFrames);
    cursor = f.next;
  }
  assert.equal(canonical(recorded.map(toWire)), canonical(expectedDeliveries.map(toWire)), "recorded notices differ");
  assert.equal(
    ledgerWritten.size,
    published.filter(({ before, r }) => canonical(r.state.items) !== canonical(before)).length,
    "a ledger change was lost or doubled",
  );
  // ---- the independent statement of the form rule, for a release that only adds forms and policies ----
  let independent: { subjects: number; owing: number; changes: number; notices: number } | null = null;
  if (pair.adds) {
    independent = { subjects: 0, owing: 0, changes: 0, notices: 0 };
    const bySubject = new Map(joined.map((j) => [j.subject, j.changes]));
    for (const [i, w] of worlds.entries()) {
      const exp = expectForms(w, pair.next, validTime);
      const got = checkForms(
        exp,
        w.subject,
        bySubject.get(w.subject) ?? [],
        published[i]!.r.deliveries.map(toWire) as never,
      );
      independent.subjects++;
      if (exp.changes.size) independent.owing++;
      independent.changes += got.changes;
      independent.notices += got.notices;
    }
  }
  const result = {
    label: pair.label,
    subjects: people,
    changedValues: joined.reduce((n, j) => n + j.changes.length, 0),
    notices: expectedDeliveries.length,
    values: { frames: pages.length, splits: valueSplits, subjectsPerFrame: stats(perFrame), us: stats(valueUs), wire: stats(valueWire) },
    noticesFrames: {
      frames: noticeFrames,
      splits: noticeSplits,
      subjectsPerFrame: stats(noticePerFrame),
      us: stats(noticeUs),
      wire: stats(noticeWire),
    },
    independent,
  };
  console.log(JSON.stringify(result));
  report.push(result);
}
fs.writeFileSync(outArg, JSON.stringify({ people, validTime, basisTx: tx, rows: report }, null, 2) + "\n");
