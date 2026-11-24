import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { Documents, unpack } from "../../notify1/store.ts";
import { seed, valid } from "../fixture.ts";
import { openStore } from "../store.ts";
import { JoinedAccount } from "./account.ts";
import { framePageKey } from "./archive.ts";
import { BulkQueue } from "./bulk.ts";
import { Reference, toWire } from "./check.ts";
import { checkForms, expectForms } from "./form-expect.ts";
import type { FrameMode } from "./frames.ts";
import { largeRelease, parseShape } from "./large-release.ts";
import { Settlement } from "./settlement.ts";

// [DX-ACT4] Why: the toy-stack gate for byte-sized settlement frames (TX2_SETTLE_FRAMES=bytes). On real stores it shows:
// A. the small release settles to the same changed values, notices and ledgers with either framing (and to the oracle);
//    the old framing refuses the 20-forms release (the fault being fixed);
// B. the 20 forms and 20 policies release settles completely, equal to the oracle and to the independent rule
//    statement, after its values and notice writers are each killed between durable frames and resumed;
// C. a second release published while the first is half settled supersedes its values and still records its notices;
// D. a release whose subjects each exceed one frame (150 forms) settles through split frames, killed mid-split, exact.
// Usage (toy stack, DATOMIC_URL set): node --experimental-transform-types settle-frames-gate.ts OUT_DIR
const out = process.argv[2]!;
const n = Number(process.env.DX_ACT4_SUBJECTS ?? 72);
assert(out && Number.isSafeInteger(n) && n >= 8 && n <= 256);
const large = largeRelease(W0.R2.doc, parseShape("forms=20,policies=20,permille=1000"));
const other = largeRelease(W0.R2.doc, parseShape("forms=24,policies=24,permille=500"));
const huge = largeRelease(W0.R2.doc, parseShape("forms=150,policies=150,permille=1000"));
const point = (position: number) => ({ tx: position, validTime: valid });
const evidence: Record<string, unknown> = { subjects: n, startedAt: new Date().toISOString() };

type Side = Awaited<ReturnType<typeof open>>;
async function open(frames: FrameMode) {
  const store = await openStore("lazy-frames-gate-" + frames + "-" + randomUUID(), "act2-deep");
  const account = new JoinedAccount(store),
    ref = new Reference();
  const f = await seed(store, n);
  await account.install(f.roster, valid);
  const holds: number[] = [];
  const worker = await Settlement.open(account, new BulkQueue(1, (ms) => holds.push(ms)), false, frames);
  return { frames, store, account, ref, f, worker, holds };
}
function kill(side: Side, sequence: number, path: "values" | "notices", after: number) {
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", new URL("./settle-child.ts", import.meta.url).pathname],
    {
      input: JSON.stringify({ scope: side.store.scope, sequence, path, frames: side.frames, after }),
      encoding: "utf8",
      timeout: 300000,
    },
  );
  assert.equal(r.signal, "SIGKILL", r.stderr || r.error?.message);
}
async function publish(side: Side, id: string, doc: W0.ReleaseDoc, old: W0.ReleaseDoc | null, seq: number) {
  const p = await side.account.publish(id, doc, valid, "owed");
  await side.ref.check(side.account, side.f.roster, side.f.world, doc, point(p.position), old, seq);
  return p;
}
/** The oracle's changed values for a release pair, as the archive stores them (json only with the old framing). */
async function expected(side: Side, doc: W0.ReleaseDoc, old: W0.ReleaseDoc | null, position: number) {
  const rows = JSON.parse(
    await side.ref.oracle.call("check", {
      document: doc,
      old,
      basis: point(position),
      worlds: side.f.roster.map((_, i) => side.f.world(i)),
      fold: false,
    }),
  );
  return rows
    .filter((x: any) => x.rows.length)
    .map((x: any) => ({
      subject: x.subject,
      ...(side.frames === "count" ? { json: x.json } : {}),
      changes: x.rows.map(([k, , v]: any) => [k, v]),
    }));
}
const strip = (rows: any[]) => rows.map((r) => ({ subject: r.subject, changes: r.changes }));
async function packets(side: Side) {
  const at = await side.worker.recorder.archive.store.head();
  return side.worker.recorder.packets(at);
}
async function ledgers(side: Side) {
  const db = side.worker.recorder.archive.db,
    at = await db.head();
  const rows = await db.rows<string>(side.f.roster.map((s) => "recorded-ledger:" + s), at);
  return side.f.roster.map((s) => {
    const r = rows.get("recorded-ledger:" + s);
    return [s, r ? r.value : null] as const;
  });
}
function ledgersMatchOracle(side: Side, rows: Awaited<ReturnType<typeof ledgers>>) {
  for (const [s, v] of rows)
    assert.deepEqual(v === null ? [] : unpack<any[]>(v).map(toWire), side.ref.items.get(s) ?? [], "ledger of " + s);
}
function independent(side: Side, doc: W0.ReleaseDoc, output: any[], deliveries: any[]) {
  const by = new Map(output.map((o) => [o.subject, o.changes])),
    notices = new Map<string, any[]>();
  for (const d of deliveries) notices.set(d.subject, [...(notices.get(d.subject) ?? []), d]);
  const total = { owing: 0, changes: 0, notices: 0 };
  for (const [i, s] of side.f.roster.entries()) {
    const e = expectForms(side.f.world(i), doc, valid);
    const got = checkForms(e, s, by.get(s) ?? [], notices.get(s) ?? []);
    if (e.changes.size) total.owing++;
    total.changes += got.changes;
    total.notices += got.notices;
  }
  return total;
}
const frameStats = (side: Side) => {
  const summary = (x: typeof side.worker.archive.admitted) => ({
    frames: x.frames,
    maxUs: x.usMax,
    maxWire: x.wireMax,
    maxRows: x.rowsMax,
  });
  return {
    values: summary(side.worker.archive.admitted),
    notices: summary(side.worker.recorder.archive.admitted),
    turnMsDiagnosticMax: Math.max(0, ...side.holds),
  };
};

const count = await open("count"),
  bytes = await open("bytes");
try {
  // ---- A. the small release with both framings ----
  const sides = [count, bytes];
  const small: Record<string, unknown> = {};
  for (const side of sides) {
    const p1 = await publish(side, "first", W0.R1.doc, null, 1);
    await side.worker.settle(1);
    const p2 = await publish(side, "second", W0.R2.doc, W0.R1.doc, 2);
    await side.worker.settle(2);
    for (const [seq, doc, old, p] of [
      [1, W0.R1.doc, null, p1],
      [2, W0.R2.doc, W0.R1.doc, p2],
    ] as const) {
      const stored = await side.worker.archive.stored(seq);
      assert.equal(stored.frontier.status, "stored");
      assert.equal(stored.frames, side.frames);
      assert.deepEqual(stored.output, await expected(side, doc, old, p.position));
      // A read at the release's own basis: from the archive with the old framing, worked out from the record with the
      // new one; the same answer either way, and the oracle's.
      const subject = side.f.roster[n - 1]!,
        read = await side.worker.archive.reader().readAt(subject, { position: p.position, validTime: valid });
      const want = (await expected({ ...side, frames: "count" } as Side, doc, old, p.position)).find(
        (x: any) => x.subject === subject,
      );
      if (want) assert.equal(read.json, want.json);
      assert.equal(read.route, side.frames === "count" && want ? "receipt-archive" : "authoritative-source");
      small[side.frames + ":" + seq] = { output: sha256(canonical(strip(stored.output))), frames: stored.frontier.frame ?? null };
    }
    const owed = (await packets(side)).flatMap((p) => p.deliveries.map(toWire));
    assert.deepEqual(owed, side.ref.owed);
    const ls = await ledgers(side);
    ledgersMatchOracle(side, ls);
    small[side.frames + ":notices"] = sha256(canonical(owed));
    small[side.frames + ":ledgers"] = sha256(canonical(ls));
    small[side.frames + ":frameStats"] = frameStats(side);
  }
  for (const k of ["1", "2", "notices", "ledgers"]) {
    const a = small["count:" + k] as any,
      b = small["bytes:" + k] as any;
    assert.equal(a.output ?? a, b.output ?? b, "small release differs between framings: " + k);
  }
  evidence.small = small;
  // The old framing refuses the 20-forms release at its first values frame (the fault this change removes).
  await count.account.publish("large", large, valid, "owed");
  await assert.rejects(count.worker.archive.runValues(3), /Bulk batch exceeds W1 service estimate/);
  evidence.countRefusesLarge = true;

  // ---- B. 20 forms and 20 policies, killed between frames in both writers, resumed ----
  const p3 = await publish(bytes, "large", large, W0.R2.doc, 3);
  kill(bytes, 3, "values", 2);
  kill(bytes, 3, "notices", 3);
  const partial = await bytes.worker.archive.stored(3);
  assert(partial.frontier.status === "pending" && partial.frontier.frame === 2 && partial.frontier.through < n);
  for (const subject of [bytes.f.roster[0]!, bytes.f.roster[n - 1]!]) {
    const read = await bytes.worker.archive.reader().readAt(subject, { position: p3.position, validTime: valid });
    const want = (await expected({ ...bytes, frames: "count" } as Side, large, W0.R2.doc, p3.position)).find(
      (x: any) => x.subject === subject,
    );
    assert.equal(read.json, want.json, "a read during settlement differs from the oracle");
  }
  const t3 = await bytes.worker.settle(3);
  assert.equal(t3.values.state.status, "stored");
  const s3 = await bytes.worker.archive.stored(3);
  assert.deepEqual(s3.output, await expected(bytes, large, W0.R2.doc, p3.position));
  const d3 = (await packets(bytes)).filter((p) => p.event === 3).flatMap((p) => p.deliveries.map(toWire));
  evidence.large = {
    killedAfter: { values: partial.frontier.through, valueFrames: partial.frontier.frame },
    frames: s3.frontier.frame,
    changes: s3.frontier.changes,
    notices: d3.length,
    independent: independent(bytes, large, s3.output, d3),
  };

  // ---- C. a second release while the first is half settled ----
  const p4 = await publish(bytes, "other", other, large, 4);
  kill(bytes, 4, "values", 1);
  const half = await bytes.worker.archive.values(4);
  assert(half?.value.status === "pending" && half.value.frame === 1);
  const p5 = await publish(bytes, "back", W0.R2.doc, other, 5);
  const superseded = await bytes.worker.archive.runValues(4);
  assert(superseded.status === "superseded" && superseded.through === half.value.through);
  const t5 = await bytes.worker.settle(5);
  assert.equal(t5.values.state.status, "stored");
  assert.deepEqual((await bytes.worker.archive.stored(5)).output, await expected(bytes, W0.R2.doc, other, p5.position));
  const all5 = await packets(bytes);
  evidence.supersede = {
    supersededAt: superseded.through,
    notices4: all5.filter((p) => p.event === 4).reduce((k, p) => k + p.deliveries.length, 0),
    notices5: all5.filter((p) => p.event === 5).reduce((k, p) => k + p.deliveries.length, 0),
    position4: p4.position,
  };

  // ---- D. every subject larger than one frame: split frames, killed mid-split ----
  const p6 = await publish(bytes, "huge", huge, W0.R2.doc, 6);
  kill(bytes, 6, "values", 1);
  const mid = await bytes.worker.archive.values(6);
  assert(mid?.value.frame === 1 && mid.value.through === 0 && mid.value.part! > 0, "first frame did not split");
  kill(bytes, 6, "notices", 2);
  const t6 = await bytes.worker.settle(6);
  assert.equal(t6.values.state.status, "stored");
  const s6 = await bytes.worker.archive.stored(6);
  assert.deepEqual(s6.output, await expected(bytes, huge, W0.R2.doc, p6.position));
  const pages = await bytes.worker.archive.db.rows<any>(
    Array.from({ length: s6.frontier.frame! }, (_, i) => framePageKey(6, i + 1)),
    await bytes.worker.archive.store.head(),
  );
  const all6 = await packets(bytes),
    d6 = all6.filter((p) => p.event === 6);
  evidence.split = {
    valueFrames: s6.frontier.frame,
    valueFramesEndingMidSubject: [...pages.values()].filter((p) => p.value.tail > 0).length,
    noticePackets: d6.length,
    noticePacketsEndingMidSubject: d6.filter((p: any) => (p.tail ?? 0) > 0).length,
    independent: independent(bytes, huge, s6.output, d6.flatMap((p) => p.deliveries.map(toWire))),
  };
  assert((evidence.split as any).valueFramesEndingMidSubject > 0 && (evidence.split as any).noticePacketsEndingMidSubject > 0);

  // ---- every notice of every release, in order, the oracle's; delivered once; ledgers the oracle's ----
  const owed = all6.flatMap((p) => p.deliveries.map(toWire));
  assert.deepEqual(owed, bytes.ref.owed);
  ledgersMatchOracle(bytes, await ledgers(bytes));
  const recipient = await openStore("lazy-frames-recipient-" + randomUUID());
  try {
    const sink = new Documents(recipient.comp, "receiver"),
      at = await bytes.worker.recorder.archive.store.head();
    assert.equal(await bytes.worker.recorder.deliver(sink, at), owed.length);
    assert.equal(await bytes.worker.recorder.deliver(sink, at), 0);
  } finally {
    await recipient.close();
  }
  const stats = frameStats(bytes);
  assert(stats.values.maxUs <= 8000 && stats.notices.maxUs <= 8000);
  evidence.notices = owed.length;
  evidence.frameStats = stats;
  evidence.finishedAt = new Date().toISOString();
  writeFileSync(join(out, "settle-frames-gate.json"), JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(evidence));
} finally {
  for (const side of [count, bytes]) {
    side.ref.close();
    await side.worker.close().catch(() => undefined);
    await side.store.close();
  }
}
