import assert from "node:assert/strict";
import fs from "node:fs";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { width } from "../../notify1/census.ts";
import { Documents, hash, pack, type Row } from "../../notify1/store.ts";
import { framePageKey, progressKey, valuesFrame, valuesProgress, type Progress } from "../join/archive.ts";
import { authoredSeed, expectedPolicy } from "../join/deep-reference.ts";
import { frameBoundUs, frameEstimate, settleCost, windowOf } from "../join/frames.ts";
import { largeRelease, parseShape } from "../join/large-release.ts";
import { evaluateRows } from "../join/material.ts";
import { noticeFrame, type Cursor, type NoticeCandidate } from "../join/recorded.ts";

// [DX-ACT7] Why: say exactly what closes a settlement frame and what its estimated service is made of, from the
// writers' own frame builders (no database): every frame of both writers for one release pair, with the estimate split
// into its three terms (`bulkUs`: 3,500 µs fixed, 45 µs per estimated row = 5 per op + 16, 70 µs per KiB of estimated
// wire = 4,096 + 3 × the ops' JSON bytes), the ops by kind and their JSON bytes, the subjects and units per frame, and
// why the frame ended (the next whole subject would break the service bound, the wire bound, or the census page or the
// release ended). Prints one JSON report.
// Usage: node --experimental-transform-types frames-account.ts SUBJECTS FORMS OUT.json
const [peopleArg, formsArg, outArg] = process.argv.slice(2);
const people = Number(peopleArg ?? 256), forms = Number(formsArg ?? 20);
assert(Number.isSafeInteger(people) && people >= 16 && people <= 4096 && Number.isSafeInteger(forms) && outArg);
const shape = parseShape(`forms=${forms},policies=${forms},permille=1000`);
const validTime = W0.POPULATION_VALID_TIME,
  tx = 9;
const worlds = Array.from({ length: people }, (_, i) => expectedPolicy(i, authoredSeed(i, 5)));
const db = new Documents({ scopeName: "frames-account" } as never, "settlement-values");
const fakeId = (k: string) => hash(["triple", k]).slice(0, 40);
const row = <T>(key: string, value: T, at: number): Row<T> => ({ key, id: fakeId(key + at), at, value });
const bytes = (x: unknown) => Buffer.byteLength(canonical(x));
// The base release (FRAMES_BASE=R1: the server runs' case, R1 then the large release on top; default R2 as frames-check).
const base = process.env.FRAMES_BASE === "R1" ? W0.R1.doc : W0.R2.doc;
const old = base, next = largeRelease(base, shape);
const basis = { tx, validTime };
const ts = evaluateRows({ worlds, basis }, W0.compileRelease(old), W0.compileRelease(next), false);
const changedBy = new Map(ts.rows.map((r) => [r.subject, r.rows.map(([k, , v]) => [k, v] as [string, string | null])]));
type Frame = { ops: number; rows: number; json: number; wire: number; us: number; fixedUs: number; rowsUs: number; bytesUs: number;
  subjects: number; units: number; split: boolean; end: string; parts: Record<string, number> };
const coef = settleCost() ?? { fixedUs: 3500, rowUs: 45, kibUs: 70 };
function split(ops: unknown[], kinds: string[]) {
  const e = frameEstimate(ops);
  const json = bytes(ops);
  const parts: Record<string, number> = {};
  ops.forEach((op, i) => (parts[kinds[i]!] = (parts[kinds[i]!] ?? 0) + bytes(op)));
  return { ops: ops.length, rows: ops.length * 5 + 16, json, wire: e.wire, us: e.us, fixedUs: coef.fixedUs,
    rowsUs: coef.rowUs * (ops.length * 5 + 16), bytesUs: e.us - coef.fixedUs - coef.rowUs * (ops.length * 5 + 16), parts };
}
// ---- values ----
const values: Frame[] = [];
{
  const key = progressKey(1);
  let current: Progress = valuesProgress(hash(["frames-account"])), prior: Row<Progress> | undefined;
  while (current.status === "pending") {
    const start = current.through, { end } = windowOf(start, people, width);
    const candidates = worlds.slice(start, end).map((w) => ({ subject: w.subject, units: changedBy.get(w.subject) ?? [], closing: false }));
    const f = valuesFrame(db, key, prior, current, framePageKey(1, current.frame! + 1), candidates, people);
    const kinds: string[] = f.ops.map((op) => ((op as { op: string }).op === "retract" ? "progress-retract" : "x"));
    kinds[kinds.length - 1] = "page";
    if (kinds.length === 3) kinds[1] = "progress";
    else kinds[0] = "progress";
    const s = split(f.ops, kinds);
    const nextIndex = f.filled.advance;
    const endReason = f.filled.split ? "split"
      : f.next.through === people ? "release end" : start + nextIndex >= end ? "census page end" : "next whole subject over a bound";
    values.push({ ...s, subjects: f.next.through - start, units: f.entries.reduce((n, e) => n + e.changes.length, 0),
      split: f.filled.split, end: endReason });
    prior = row(key, f.next, values.length);
    current = f.next;
  }
}
// ---- notices (ledgers as after R2's settlement) ----
const notices: Frame[] = [];
{
  const p = W0.compileRelease(old), n = W0.compileRelease(next);
  const published = worlds.map((w) => {
    const before = W0.publish({ items: [], subjects: [], pending: [] }, [{ subject: w.subject, release: p.hash,
      basis: { tx: BigInt(tx), validTime }, workItems: (W0.evaluateWorld(w, p, basis) as W0.Output).workItems }]).state.items as W0.ItemState[];
    const r = W0.publish({ items: before, subjects: [], pending: [] }, [{ subject: w.subject, release: n.hash,
      basis: { tx: BigInt(tx), validTime }, workItems: (W0.evaluateWorld(w, n, basis) as W0.Output).workItems }]);
    return { before, r };
  });
  const sha = "0".repeat(64);
  let cursor: Cursor = { epoch: sha, event: 1, start: 0, parent: sha, batch: 0, previous: sha, entries: 0 },
    cursorRow: Row<Cursor> | undefined;
  while (cursor.event === 1) {
    const { end } = windowOf(cursor.start, people, width);
    const ids = worlds.slice(cursor.start, end).map((w) => w.subject);
    const candidates = ids.map((subject, j): NoticeCandidate => {
      const { before, r } = published[cursor.start + j]!;
      // The real ledger change retracts the previous ledger row by ID and asserts the new packed ledger.
      const ledger = canonical(r.state.items) !== canonical(before)
        ? db.change("recorded-ledger:" + subject, before.length ? row("recorded-ledger:" + subject, pack(before), 1) : undefined, pack(r.state.items))
        : [];
      return { subject, units: r.deliveries, closing: ledger.length > 0, ledger };
    });
    const f = noticeFrame(db, cursorRow, cursor, candidates, { account: "notice:v1:" + sha + ":", position: tx, recipe: sha, next: sha, size: people });
    const kinds = f.ops.map((op) => {
      const o = op as { op: string; entityId?: string; id?: string };
      if (o.op === "retract") return "retract (ledger or cursor)";
      if (o.entityId?.includes("recorded-ledger:")) return "ledger";
      if (o.entityId?.endsWith("notice-progress") || o.entityId?.includes("progress")) return "cursor";
      return "packet";
    });
    const s = split(f.ops, kinds);
    const through = f.next.event === 1 ? f.next.start : people;
    const endReason = f.filled.split ? "split" : through === people ? "release end"
      : through >= end ? "census page end" : "next whole subject over a bound";
    notices.push({ ...s, subjects: through - cursor.start, units: f.packet?.deliveries.length ?? 0, split: f.filled.split, end: endReason });
    cursorRow = row("notice-progress", f.next, notices.length);
    cursor = f.next;
  }
}
const pct = (xs: number[], q: number) => xs.toSorted((a, b) => a - b)[Math.max(0, Math.ceil(xs.length * q) - 1)]!;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
function summary(fs: Frame[]) {
  const ends: Record<string, number> = {};
  for (const f of fs) ends[f.end] = (ends[f.end] ?? 0) + 1;
  const parts: Record<string, number> = {};
  for (const f of fs) for (const [k, v] of Object.entries(f.parts)) parts[k] = (parts[k] ?? 0) + v;
  const mean = (k: keyof Frame) => sum(fs.map((f) => f[k] as number)) / fs.length;
  return {
    frames: fs.length, units: sum(fs.map((f) => f.units)), subjectsPerFrameP50: pct(fs.map((f) => f.subjects), 0.5),
    unitsPerFrameMean: mean("units"), usMean: mean("us"), usP50: pct(fs.map((f) => f.us), 0.5),
    fixedShare: coef.fixedUs / mean("us"), rowsShare: mean("rowsUs") / mean("us"), bytesShare: mean("bytesUs") / mean("us"),
    opsMean: mean("ops"), estimatedRowsMean: mean("rows"), jsonBytesMean: mean("json"), wireMean: mean("wire"),
    wireMax: Math.max(...fs.map((f) => f.wire)), jsonBytesByKindPerFrame: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v / fs.length])),
    ends, bound: frameBoundUs,
  };
}
const report = { people, forms, cost: coef, pair: base.name + " -> " + base.name + "+" + forms + " forms and policies, every subject owes",
  changes: ts.rows.reduce((n, r) => n + r.rows.length, 0), values: summary(values), notices: summary(notices),
  perSubject: { changes: sum(values.map((f) => f.units)) / people, notices: sum(notices.map((f) => f.units)) / people,
    valueFrames: values.length / people, noticeFrames: notices.length / people } };
fs.writeFileSync(outArg, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
