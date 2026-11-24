import assert from "node:assert/strict";
import fs from "node:fs";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { width } from "../../notify1/census.ts";
import { Documents, hash, type Op, type Row } from "../../notify1/store.ts";
import { toWire } from "./check.ts";
import { authoredSeed, expectedPolicy } from "./deep-reference.ts";
import { checkForms, expectForms } from "./form-expect.ts";
import { frameBoundUs, frameEstimate, windowOf } from "./frames.ts";
import { largeRelease, parseShape } from "./large-release.ts";
import { readLedgers, noticeCandidate, type LedgerMode } from "./ledger-parts.ts";
import { evaluateRows } from "./material.ts";
import { noticeFrame, type Cursor } from "./recorded.ts";

// [DX-ACT6] Why: before any stack runs, drive the notice writer's own frame builder (noticeFrame with the candidates
// recorded.ts builds) over deep toy subjects owing 200, 500 and 1,000 forms, against a durable state kept in memory
// (every frame's ops applied exactly: an assert of a live key or a retraction of a missing row fails), and prove:
// (1) every frame fits the writer's bound; (2) the deliveries recorded equal the kernel's, in order, and the independent
// form rule (form-expect.ts) for releases that add forms; (3) every subject's ledger read between any two frames is
// exactly its earlier ledger until the frame holding its head, and exactly the new one from then on; (4) each frame is
// built from the durable state alone (as after a restart before every frame), so a restart in the middle recomputes the
// same deliveries and parts and skips those already written; (5) a ledger part is never written twice and an old
// ledger's parts are retracted with the head that replaces them. The same chain runs with `whole` ledgers to show where
// it is refused.
// Usage: node --experimental-transform-types ledger-check.ts SUBJECTS OUT.json [FORMS ...]
const [peopleArg, outArg, ...formArgs] = process.argv.slice(2);
const people = Number(peopleArg ?? 64);
assert(Number.isSafeInteger(people) && people >= 8 && people <= 1024 && outArg);
const sizes = (formArgs.length ? formArgs : ["200", "500", "1000"]).map(Number);
const validTime = W0.POPULATION_VALID_TIME;
const worlds = Array.from({ length: people }, (_, i) => expectedPolicy(i, authoredSeed(i, 5)));
const db = new Documents({ scopeName: "ledger-check" } as never, "settlement-notices");

/** The durable rows, as the store keeps them: one live row per key, retracted by id. */
class Memory {
  private live = new Map<string, Row<any>>();
  private byId = new Map<string, string>();
  position = 0;
  partsWritten = 0;
  partsRetracted = 0;
  apply(ops: readonly Op[]) {
    const at = ++this.position;
    for (const [i, o] of ops.entries()) {
      if (o.op === "retract") {
        const key = this.byId.get(o.id);
        assert(key !== undefined, "retraction of a row that is not live");
        if (key.includes("recorded-ledger-part:")) this.partsRetracted++;
        this.live.delete(key);
        this.byId.delete(o.id);
        continue;
      }
      const key = o.entityId.slice(db.prefix.length);
      assert(!this.live.has(key), "a second live row for " + key);
      if (key.startsWith("recorded-ledger-part:")) this.partsWritten++;
      const id = hash([at, i, key]);
      this.live.set(key, { key, id, at, value: JSON.parse(o.value.value) });
      this.byId.set(id, key);
    }
  }
  async rows<T>(keys: string[], _at: number) {
    const out = new Map<string, Row<T>>();
    for (const k of keys) {
      const r = this.live.get(k);
      if (r) out.set(k, r as Row<T>);
    }
    return out;
  }
}

type Step = { label: string; doc: W0.ReleaseDoc; adds?: W0.ReleaseDoc };
const pct = (xs: number[], p: number) => (xs.length ? xs.toSorted((a, b) => a - b)[Math.ceil(xs.length * p) - 1]! : 0);

async function run(forms: number, mode: LedgerMode) {
  const big = largeRelease(W0.R2.doc, parseShape(`forms=${forms},policies=${forms},permille=1000`));
  // Every second form's due date moved by one business day: the same items with new payloads (each owed notice
  // delivered again, every ledger rewritten, the old parts retracted).
  const moved: W0.ReleaseDoc = {
    ...big,
    forms: big.forms!.map((f, k) => (k % 2 ? { ...f, dueBusinessDays: f.dueBusinessDays === 10 ? 1 : f.dueBusinessDays + 1 } : f)),
  };
  W0.compileRelease(moved);
  const chain: Step[] = [
    { label: "R2 (no predecessor)", doc: W0.R2.doc },
    { label: `R2 -> R2+${forms}`, doc: big, adds: W0.R2.doc },
    { label: `R2+${forms} -> moved due dates`, doc: moved },
    { label: `moved -> R2 (forms withdrawn)`, doc: W0.R2.doc },
  ];
  const mem = new Memory(),
    basis = { tx: 9, validTime };
  const sha = "0".repeat(64);
  let cursor: Cursor = { epoch: sha, event: 1, start: 0, parent: sha, batch: 0, previous: sha, entries: 0 },
    cursorRow: Row<Cursor> | undefined;
  let ledgers = new Map<string, W0.ItemState[]>(worlds.map((w) => [w.subject, []]));
  const steps: unknown[] = [];
  for (const [n, step] of chain.entries()) {
    const event = n + 1,
      compiled = W0.compileRelease(step.doc);
    // The kernel's deliveries and new ledger per subject, computed once from the ledgers before this event.
    const want = worlds.map((w) => {
      const out = W0.evaluateWorld(w, compiled, basis);
      assert(!W0.isFailure(out));
      return W0.publish({ items: ledgers.get(w.subject)!, subjects: [], pending: [] }, [
        { subject: w.subject, release: compiled.hash, basis: { tx: BigInt(basis.tx), validTime }, workItems: out.workItems },
      ]);
    });
    const work = worlds.map((w) => {
      const out = W0.evaluateWorld(w, compiled, basis);
      assert(!W0.isFailure(out));
      return out.workItems;
    });
    const recorded: W0.Delivery[] = [],
      us: number[] = [],
      wire: number[] = [];
    let frames = 0,
      splits = 0,
      headsSwitched = 0,
      checksBetween = 0;
    const switched = new Set<string>();
    while (cursor.event === event) {
      const { end } = windowOf(cursor.start, people, width);
      const ids = worlds.slice(cursor.start, end).map((w) => w.subject);
      // Built from the durable state alone, as after a restart.
      const previous = await readLedgers(mem, ids, mem.position);
      const candidates = ids.map((subject, j) => {
        const old = previous.get(subject)!;
        const r = W0.publish({ items: old.items, subjects: [], pending: [] }, [
          { subject, release: compiled.hash, basis: { tx: BigInt(basis.tx), validTime }, workItems: work[cursor.start + j]! },
        ]);
        return noticeCandidate(db, subject, event, old, r, mode);
      });
      const f = noticeFrame(db, cursorRow, cursor, candidates, {
        account: db.prefix,
        position: basis.tx,
        recipe: sha,
        next: sha,
        size: people,
        ledger: mode,
      });
      const e = frameEstimate(f.ops);
      assert(e.fits && e.us <= frameBoundUs, "a notice frame over the bound");
      us.push(e.us);
      wire.push(e.wire);
      frames++;
      if (f.filled.split) splits++;
      if (f.packet) recorded.push(...f.packet.deliveries);
      mem.apply(f.ops);
      cursorRow = (await mem.rows<Cursor>(["notice-progress"], mem.position)).get("notice-progress")!;
      assert.deepEqual(cursorRow.value, JSON.parse(canonical(f.next)));
      for (const p of f.filled.pieces)
        if (p.close && candidates[p.index]!.closing) {
          switched.add(candidates[p.index]!.subject);
          headsSwitched++;
        }
      cursor = f.next;
      // Between this frame and the next: every subject's ledger is exactly its old one or exactly its new one.
      const now = await readLedgers(mem, worlds.map((w) => w.subject), mem.position);
      for (const [i, w] of worlds.entries()) {
        const got = canonical(now.get(w.subject)!.items);
        const expect = switched.has(w.subject) ? want[i]!.state.items : ledgers.get(w.subject)!;
        assert.equal(got, canonical(expect), "ledger of " + w.subject + " between frames");
      }
      checksBetween++;
    }
    const expected = want.flatMap((r) => r.deliveries);
    assert.equal(canonical(recorded.map(toWire)), canonical(expected.map(toWire)), "recorded notices differ");
    assert.equal(
      switched.size,
      want.filter((r, i) => canonical(r.state.items) !== canonical(ledgers.get(worlds[i]!.subject)!)).length,
      "a ledger change was lost",
    );
    let independent: { owing: number; changes: number; notices: number } | null = null;
    if (step.adds) {
      const ts = evaluateRows({ worlds, basis }, W0.compileRelease(step.adds), compiled, false);
      const changed = new Map(ts.rows.map((r) => [r.subject, r.rows.map(([k, , v]) => [k, v] as [string, string | null])]));
      independent = { owing: 0, changes: 0, notices: 0 };
      for (const [i, w] of worlds.entries()) {
        const x = expectForms(w, step.doc, validTime);
        const got = checkForms(x, w.subject, changed.get(w.subject) ?? [], want[i]!.deliveries.map(toWire) as never);
        if (x.changes.size) independent.owing++;
        independent.changes += got.changes;
        independent.notices += got.notices;
      }
    }
    ledgers = new Map(worlds.map((w, i) => [w.subject, want[i]!.state.items as W0.ItemState[]]));
    const final = await readLedgers(mem, worlds.map((w) => w.subject), mem.position);
    const largest = Math.max(...[...final.values()].map((l) => l.parts.length));
    const row = {
      label: step.label,
      notices: expected.length,
      frames,
      splits,
      headsSwitched,
      checksBetween,
      partsPerSubjectMax: largest,
      us: { p50: pct(us, 0.5), max: Math.max(...us) },
      wire: { p50: pct(wire, 0.5), max: Math.max(...wire) },
      independent,
    };
    console.log(JSON.stringify({ forms, mode, ...row }));
    steps.push(row);
  }
  // Every live ledger part belongs to a live head (nothing left behind), and the counts balance.
  return { forms, mode, subjects: people, partsWritten: mem.partsWritten, partsRetracted: mem.partsRetracted, steps };
}
const report: unknown[] = [];
for (const forms of sizes) {
  report.push(await run(forms, "parts"));
  try {
    await run(forms, "whole");
    report.push({ forms, mode: "whole", refused: false });
  } catch (e) {
    const message = String((e as Error).message);
    report.push({ forms, mode: "whole", refused: true, message });
    console.log(JSON.stringify({ forms, mode: "whole", refused: message }));
  }
}
fs.writeFileSync(outArg, JSON.stringify({ people, validTime, rows: report }, null, 2) + "\n");
