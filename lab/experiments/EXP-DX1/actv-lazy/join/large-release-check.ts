import assert from "node:assert/strict";
import fs from "node:fs";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { DomainOraclePool } from "../../../../bench/lib/w0-gates.ts";
import { pack } from "../../notify1/store.ts";
import { bulkUs, bulkWireLimit } from "./bulk.ts";
import { Archive } from "./archive.ts";
import { authoredSeed, expectedPolicy } from "./deep-reference.ts";
import { evaluateRows } from "./material.ts";
import { largeRelease, parseShape, shapeName } from "./large-release.ts";
import { toWire } from "./check.ts";

// [DX-ACT3] Why: before any stack runs, prove the TypeScript kernel and the independent Python oracle agree on the
// synthetic release, and price what the background writers would put in one frame, with the writers' own limits.
// Rejected: trusting the full-size run to find a frame that cannot be written (it would stop 40 minutes in).
// Usage: node --experimental-transform-types large-release-check.ts PEOPLE OUT.json [SHAPE ...]
const [peopleArg, outArg, ...shapes] = process.argv.slice(2);
const people = Number(peopleArg ?? 64);
assert(Number.isSafeInteger(people) && people >= 16 && people <= 4096 && outArg);
const shapeList = (shapes.length ? shapes : ["forms=20,policies=20,permille=1000", "forms=20,policies=20,permille=100"]).map(parseShape);
const validTime = W0.POPULATION_VALID_TIME,
  seedAt = 5,
  tx = 9;
const worlds = Array.from({ length: people }, (_, i) => expectedPolicy(i, authoredSeed(i, seedAt)));
const prefix = "notice:v1:" + "0".repeat(64) + ":";
const put = (k: string, v: unknown) => ({
  op: "assert",
  entityId: prefix + k,
  attribute: "notice/value",
  value: { type: "string", value: canonical(v) },
  validFrom: 0,
});
const retract = { op: "retract", id: "t".repeat(40) };
const sha = "0".repeat(64);
// The background writer's own admission: Archive.write checks the frame before it queues anything. A stub queue
// accepts a frame that passes, so nothing reaches a database.
// [DX-INT4] Since ACT5 (c1579ee50) write() also reads the archive's precondition, its frame counts and its queue key; the
// stub carries the defaults every real Archive has (precondition "head" when TX2_SETTLE_PRECONDITION is unset).
const stub = { queue: { submit: async () => "queued" }, source: { s: { scope: "x" } }, store: { scope: "y" },
  precondition: "head", contest: { offered: 0, turn() {}, done() {} }, turnKey: () => "x" };
const admitted = async (kind: "activation" | "notice", ops: unknown[]) => {
  try {
    await Archive.prototype.write.call(stub as never, kind, "frame", ops as never, 0, null, undefined);
    return true;
  } catch (e) {
    if (!String(e).includes("Bulk batch exceeds W1 service estimate")) throw e;
    return false;
  }
};
const frame = async (kind: "activation" | "notice", ops: unknown[]) => {
  const wire = 4096 + 3 * Buffer.byteLength(canonical(ops));
  const us = bulkUs(ops.length * 5 + 16, wire);
  const fits = wire < bulkWireLimit && us <= 8000;
  assert.equal(await admitted(kind, ops), fits, "The writer's admission and this estimate disagree");
  return { wireEstimate: wire, serviceUs: us, fits };
};
const pct = (xs: number[], p: number) => xs.toSorted((a, b) => a - b)[Math.ceil(xs.length * p) - 1]!;

type Pair = { label: string; old: W0.ReleaseDoc | null; next: W0.ReleaseDoc; prior?: W0.ReleaseDoc };
const pairs: Pair[] = [
  { label: "baseline R1 (no predecessor)", old: null, next: W0.R1.doc },
  { label: "burst default R2 -> R3", old: W0.R2.doc, next: W0.R3.doc, prior: W0.R2.doc },
  ...shapeList.flatMap((s) => [
    { label: "R1 -> R1+" + shapeName(s), old: W0.R1.doc, next: largeRelease(W0.R1.doc, s), prior: W0.R1.doc },
    { label: "burst R2 -> R3+" + shapeName(s), old: W0.R2.doc, next: largeRelease(W0.R3.doc, s), prior: W0.R2.doc },
    { label: "burst R3+" + shapeName(s) + " -> R2", old: largeRelease(W0.R3.doc, s), next: W0.R2.doc, prior: largeRelease(W0.R3.doc, s) },
  ]),
];
const report: unknown[] = [];
for (const pair of pairs) {
  const oracle = new DomainOraclePool(new URL("./oracle.py", import.meta.url).pathname, 1);
  try {
    const basis = { tx, validTime };
    // Ledger state: the predecessor's notices are already recorded, as after its settlement.
    const ledgers = new Map<string, W0.ItemState[]>();
    if (pair.prior) {
      await oracle.call("check", { document: pair.prior, old: null, basis, worlds, fold: true });
      const prior = W0.compileRelease(pair.prior);
      for (const w of worlds) {
        const out = W0.evaluateWorld(w, prior, basis);
        assert(!W0.isFailure(out));
        const r = W0.publish({ items: [], subjects: [], pending: [] }, [
          { subject: w.subject, release: prior.hash, basis: { tx: BigInt(tx), validTime }, workItems: out.workItems },
        ]);
        ledgers.set(w.subject, r.state.items as W0.ItemState[]);
      }
    }
    const next = W0.compileRelease(pair.next),
      old = pair.old ? W0.compileRelease(pair.old) : undefined;
    const ts = evaluateRows({ worlds, basis }, old, next, true);
    const py = JSON.parse(
      await oracle.call("check", { document: pair.next, old: pair.old, basis, worlds, fold: true }),
    ) as { subject: string; json: string; rows: [string, string | null, string | null][]; deliveries: unknown[] }[];
    assert.equal(py.length, worlds.length);
    const changes: number[] = [], json: number[] = [], notices: number[] = [], answers: unknown[] = [];
    const noticeOps: unknown[] = [];
    type Frame = Awaited<ReturnType<typeof frame>>;
    const valuesFrames = { worst: null as null | Frame, refused: 0, frames: 0 },
      noticeFrames = { worst: null as null | Frame, refused: 0, frames: 0 };
    for (const [i, w] of worlds.entries()) {
      const mine = ts.rows[i]!;
      assert.equal(mine.subject, w.subject);
      assert.equal(mine.json, py[i]!.json, "Kernel and oracle answers differ for " + w.subject);
      assert.deepEqual(mine.rows, py[i]!.rows, "Kernel and oracle changes differ for " + w.subject);
      const out = W0.evaluateWorld(w, next, basis);
      assert(!W0.isFailure(out));
      const before = ledgers.get(w.subject) ?? [];
      const r = W0.publish({ items: before, subjects: [], pending: [] }, [
        { subject: w.subject, release: next.hash, basis: { tx: BigInt(tx), validTime }, workItems: out.workItems },
      ]);
      assert.deepEqual(r.deliveries.map(toWire), py[i]!.deliveries, "Kernel and oracle notices differ for " + w.subject);
      changes.push(mine.rows.length);
      json.push(Buffer.byteLength(mine.json!));
      notices.push(r.deliveries.length);
      if (mine.rows.length)
        answers.push({ subject: w.subject, changes: mine.rows.map(([k, , v]) => [k, v]), json: mine.json });
      // Notice recorder: four subjects per frame (recorded.ts step), ledger change per subject, cursor, one packet.
      if (canonical(r.state.items) !== canonical(before)) noticeOps.push(retract, put("recorded-ledger:" + w.subject, pack(r.state.items)));
      noticeOps.push({ deliveries: r.deliveries.map(toWire) });
      if ((i + 1) % 4 === 0 || i === worlds.length - 1) {
        const deliveries = noticeOps.flatMap((x: any) => (x.deliveries ? x.deliveries : []));
        const ops = noticeOps.filter((x: any) => !x.deliveries);
        const cursor = { epoch: sha, batch: 1, previous: sha, event: 1, start: 0, parent: sha, entries: 0 };
        ops.push(retract, put("recorded-cursor", cursor));
        if (deliveries.length)
          ops.push(put("recorded-notices:1", pack({ account: prefix, epoch: sha, batch: 1, previous: sha, event: 1,
            position: tx, recipe: sha, start: 0, through: 4, deliveries })));
        const f = await frame("notice", ops);
        noticeFrames.frames++;
        if (!f.fits) noticeFrames.refused++;
        if (!noticeFrames.worst || f.wireEstimate > noticeFrames.worst.wireEstimate) noticeFrames.worst = f;
        noticeOps.length = 0;
      }
      // Values archive: sixteen subjects per frame (archive.ts step): progress change and one page of changed answers.
      if ((i + 1) % 16 === 0 || i === worlds.length - 1) {
        const page = { identity: sha, start: 0, through: 16, previous: sha, bytes: pack(answers) };
        const progress = { identity: sha, through: 16, status: "pending", hash: sha, changes: 0 };
        const f = await frame("activation", [retract, put("values:1", progress), put("answer:1:0", page)]);
        valuesFrames.frames++;
        if (!f.fits) valuesFrames.refused++;
        if (!valuesFrames.worst || f.wireEstimate > valuesFrames.worst.wireEstimate) valuesFrames.worst = f;
        answers.length = 0;
      }
    }
    // Diagnostic Mac clock: evaluation of one subject under the new release, the step a read before settlement adds.
    const index = worlds.map((w) => W0.indexWorld(w, tx) as W0.WorldIndex);
    const t0 = performance.now();
    let n = 0;
    while (performance.now() - t0 < 400) for (const ix of index) (W0.evaluateIndexed(ix, next, basis), n++);
    const evalUs = ((performance.now() - t0) * 1000) / n;
    const doc = Buffer.byteLength(canonical(pair.next));
    const row = {
      label: pair.label,
      releaseHash: next.hash,
      documentBytes: doc,
      policies: next.policies.length,
      subjects: people,
      subjectsChanged: changes.filter((x) => x > 0).length,
      changedValues: changes.reduce((a, b) => a + b, 0),
      changedValuesPerSubjectMax: Math.max(...changes),
      notices: notices.reduce((a, b) => a + b, 0),
      noticesPerSubjectMax: Math.max(...notices),
      answerJsonBytesP50: pct(json, 0.5),
      answerJsonBytesMax: Math.max(...json),
      valuesFrames,
      noticeFrames,
      evaluateMicrosecondsPerSubjectDiagnostic: Math.round(evalUs * 10) / 10,
      oracleAgrees: true,
    };
    console.log(JSON.stringify(row));
    report.push(row);
  } finally {
    oracle.close();
  }
}
fs.writeFileSync(outArg, JSON.stringify({ people, validTime, basisTx: tx, seedAt, rows: report }, null, 2) + "\n");
