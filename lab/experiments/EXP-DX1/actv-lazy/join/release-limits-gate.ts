import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { Documents } from "../../notify1/store.ts";
import { seed, valid } from "../fixture.ts";
import { namesOf, openStore } from "../store.ts";
import { JoinedAccount, ReleaseTooLarge } from "./account.ts";
import { BulkQueue, bulkUs } from "./bulk.ts";
import { Reference, toWire } from "./check.ts";
import { loaded } from "./definitions.ts";
import { checkForms, expectForms } from "./form-expect.ts";
import { preconditionMode, type Precondition } from "./frames.ts";
import { largeRelease, parseShape } from "./large-release.ts";
import { readLedgers } from "./ledger-parts.ts";
import type { Cursor } from "./recorded.ts";
import { setSettlementControl } from "./settlement-control.ts";
import { Settlement } from "./settlement.ts";

// [DX-ACT6] The toy-stack gate for the two size limits of a large release.
// Part "ledger" (TX2_SETTLE_FRAMES=bytes, TX2_NOTICE_LEDGER=parts): for subjects owing 200, 500 and 1,000 forms and
// policies, a release settled with its notice writer killed after every frame through the first subject (so a restart
// lands inside its deliveries and inside its ledger parts), each stop checking every subject's ledger read is exactly its
// earlier or its new one and the packets so far an exact prefix of the oracle's notices; the values writer killed too; a
// second release published while the first is half settled; the account paused mid-ledger (TX2_SETTLE_CONTROL=1: nothing
// written while paused); then everything equal to the oracle and to the independent form rule, notices delivered once,
// ledgers the oracle's, every frame within the bound. Runs under TX2_SETTLE_PRECONDITION as set (head or progress).
// Part "definitions" (TX2_RELEASE_DOCS): two stores seeded alike, one with full documents and one by reference; each
// definition-set size (1,000 / 2,000 / 4,000 / 5,000 forms: 0.25 / 0.5 / 1.0 / 1.25 MiB) published first and then
// followed by a release adding 20 forms; every read of every subject equal to the oracle in both stores; the cost of
// each Publish measured (record bytes and changes, estimated writer service, storage WAL bytes, definitions staged,
// what a read loads); the full-document follow-on near the ceiling refused clearly; then a chain of 50 releases with
// both stores' answers compared at every release.
// Usage (toy stack, DATOMIC_URL set): node --experimental-transform-types release-limits-gate.ts OUT_DIR
// (DX_ACT6_PART=ledger|definitions|all, DX_ACT6_FORMS=200,500,1000)
export async function releaseLimitsGate(out: string, sql?: (q: string) => Promise<string>) {
  const part = process.env.DX_ACT6_PART ?? "all";
  assert(["ledger", "definitions", "all"].includes(part));
  const evidence: Record<string, unknown> = { startedAt: new Date().toISOString(), precondition: preconditionMode() };
  if (part !== "definitions") evidence.ledger = await ledgerPart();
  if (part !== "ledger") evidence.definitions = await definitionsPart(sql);
  evidence.finishedAt = new Date().toISOString();
  writeFileSync(join(out, "release-limits-gate-" + part + ".json"), JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(evidence).slice(0, 4000));
}

const point = (position: number) => ({ tx: position, validTime: valid });

// ---------------------------------------------------------------- ledger in parts
async function ledgerPart() {
  process.env.TX2_SETTLE_FRAMES = "bytes";
  process.env.TX2_NOTICE_LEDGER = "parts";
  process.env.TX2_SETTLE_CONTROL = "1";
  const sizes = (process.env.DX_ACT6_FORMS ?? "200,500,1000").split(",").map(Number);
  const results: unknown[] = [];
  for (const forms of sizes) results.push(await ledgerCase(forms, preconditionMode()));
  return results;
}
async function ledgerCase(forms: number, precondition: Precondition) {
  const n = forms <= 200 ? 72 : forms <= 500 ? 24 : 16;
  const store = await openStore("lazy-limits-ledger-" + forms + "-" + randomUUID(), "act2-deep");
  const account = new JoinedAccount(store),
    ref = new Reference();
  const f = await seed(store, n);
  await account.install(f.roster, valid);
  const holds: number[] = [];
  const worker = await Settlement.open(account, new BulkQueue(1, (ms) => holds.push(ms)), false, "bytes", precondition);
  assert.equal(worker.recorder.ledger, "parts");
  const big = largeRelease(W0.R2.doc, parseShape(`forms=${forms},policies=${forms},permille=1000`));
  const moved: W0.ReleaseDoc = {
    ...big,
    forms: big.forms!.map((x, k) => (k % 2 ? { ...x, dueBusinessDays: x.dueBusinessDays === 10 ? 1 : x.dueBusinessDays + 1 } : x)),
  };
  const nb = worker.recorder.archive.db;
  const kill = (sequence: number, path: "values" | "notices", after: number) => {
    const r = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", new URL("./settle-child.ts", import.meta.url).pathname], {
      input: JSON.stringify({ scope: store.scope, sequence, path, frames: "bytes", precondition, after }),
      encoding: "utf8",
      timeout: 300000,
      env: { ...process.env, TX2_SETTLE_CONTROL: "" },
    });
    assert.equal(r.signal, "SIGKILL", r.stderr || r.error?.message);
  };
  const cursor = async () => (await nb.row<Cursor>("notice-progress", await nb.head()))?.value;
  const packets = async () => worker.recorder.packets(await worker.recorder.archive.store.head());
  const ledgersNow = async () => readLedgers(nb, f.roster, await nb.head());
  try {
    const p1 = await account.publish("first", W0.R2.doc, valid, "owed");
    await ref.check(account, f.roster, f.world, W0.R2.doc, point(p1.position), null, 1);
    await worker.settle(1);
    const wire = (xs: readonly unknown[]) => canonical(xs.map(toWire));
    const before = new Map([...(await ledgersNow())].map(([s, l]) => [s, wire(l.items)]));
    const p2 = await account.publish("large", big, valid, "owed");
    await ref.check(account, f.roster, f.world, big, point(p2.position), W0.R2.doc, 2);
    const owed2 = ref.owed.slice(); // the oracle's notices through release 2
    const newItems = new Map(f.roster.map((s) => [s, canonical(ref.items.get(s) ?? [])]));
    kill(2, "values", 2);
    // Notices: one frame per process until the first subject's ledger head is written (stops inside its deliveries
    // and inside its parts), each stop checked.
    const stops: { part: number; start: number; ledgerOld: boolean }[] = [];
    let insideParts = 0;
    for (let k = 0; k < 64; k++) {
      kill(2, "notices", 1);
      const c = (await cursor())!;
      const ls = await ledgersNow();
      for (const s of f.roster) {
        const got = wire(ls.get(s)!.items);
        assert(got === before.get(s) || got === newItems.get(s), "ledger of " + s + " is neither old nor new");
      }
      const first = wire(ls.get(f.roster[0]!)!.items);
      const sofar = (await packets()).flatMap((p) => p.deliveries.map(toWire));
      assert.equal(canonical(sofar), canonical(owed2.slice(0, sofar.length)), "packets are not a prefix of the oracle's notices");
      stops.push({ part: c.part ?? 0, start: c.start, ledgerOld: first === before.get(f.roster[0]!) });
      if (c.start === 0 && (c.part ?? 0) > forms) insideParts++;
      if (c.start > 0 || c.event > 2) break;
    }
    assert(insideParts >= 1, "no stop fell inside a ledger's parts");
    // A second release while the first is half settled (values and notices), then a pause mid-subject.
    kill(2, "notices", 1);
    const p3 = await account.publish("moved", moved, valid, "owed");
    await ref.check(account, f.roster, f.world, moved, point(p3.position), big, 3);
    // The control is read from the values store (settlement.ts), where the SDK call writes it.
    await setSettlementControl(worker.archive.store, { paused: true, by: "gate" });
    const held = await cursor();
    const pending = worker.settle(3);
    pending.catch(() => undefined);
    await sleep(2500);
    const whilePaused = await cursor();
    await setSettlementControl(worker.archive.store, { paused: false, by: "gate" });
    assert.deepEqual(whilePaused, held, "a paused account wrote a frame");
    const t3 = await pending;
    assert.equal(t3.values.state.status, "stored");
    // Everything against the oracle and the independent rule.
    const all = await packets();
    const delivered = all.flatMap((p) => p.deliveries.map(toWire));
    assert.deepEqual(delivered, ref.owed, "recorded notices differ from the oracle");
    const ls = await ledgersNow();
    for (const s of f.roster) assert.deepEqual(ls.get(s)!.items.map(toWire), ref.items.get(s) ?? [], "ledger of " + s);
    const d2 = all.filter((p) => p.event === 2).flatMap((p) => p.deliveries.map(toWire));
    const changes2 = JSON.parse(
      await ref.oracle.call("check", { document: big, old: W0.R2.doc, basis: point(p2.position), worlds: f.roster.map((_, i) => f.world(i)), fold: false }),
    );
    const independent = { owing: 0, changes: 0, notices: 0 };
    for (const [i, s] of f.roster.entries()) {
      const e = expectForms(f.world(i), big, valid);
      const mine = changes2[i].rows.map(([k, , v]: [string, unknown, string | null]) => [k, v]);
      const got = checkForms(e, s, mine, d2.filter((d) => d.subject === s));
      if (e.changes.size) independent.owing++;
      independent.changes += got.changes;
      independent.notices += got.notices;
    }
    const s3 = await worker.archive.stored(3);
    const want3 = JSON.parse(
      await ref.oracle.call("check", { document: moved, old: big, basis: point(p3.position), worlds: f.roster.map((_, i) => f.world(i)), fold: false }),
    ).filter((x: any) => x.rows.length).map((x: any) => ({ subject: x.subject, changes: x.rows.map(([k, , v]: any) => [k, v]) }));
    assert.deepEqual(s3.output, want3, "stored changes of release 3 differ from the oracle");
    // Release 2's values writer, run again, marks its half-written copy superseded (its notices are all recorded).
    const sup = await worker.archive.runValues(2);
    assert.equal(sup.status, "superseded");
    const superseded = await worker.archive.values(2);
    const recipient = await openStore("lazy-limits-recipient-" + randomUUID());
    let once: number[];
    try {
      const sink = new Documents(recipient.comp, "receiver"),
        at = await worker.recorder.archive.store.head();
      once = [await worker.recorder.deliver(sink, at), await worker.recorder.deliver(sink, at)];
      assert.deepEqual(once, [delivered.length, 0]);
    } finally {
      await recipient.close();
    }
    const stats = { values: worker.archive.admitted, notices: worker.recorder.archive.admitted };
    assert(stats.values.usMax <= 8000 && stats.notices.usMax <= 8000, "a frame over the bound");
    const parts = Math.max(...[...ls.values()].map((l) => l.parts.length));
    const row = {
      forms,
      subjects: n,
      precondition,
      stops: stops.length,
      stopsInsideParts: insideParts,
      release2ValuesStatus: superseded?.value.status,
      notices: { release2: d2.length, release3: all.filter((p) => p.event === 3).reduce((k, p) => k + p.deliveries.length, 0), all: delivered.length },
      deliveredTwice: once!,
      ledgerPartsPerSubject: parts,
      changes3: s3.frontier.changes,
      independent,
      frames: {
        values: { frames: stats.values.frames, maxUs: stats.values.usMax, maxWire: stats.values.wireMax },
        notices: { frames: stats.notices.frames, maxUs: stats.notices.usMax, maxWire: stats.notices.wireMax },
      },
      turnMsDiagnosticMax: Math.max(0, ...holds),
    };
    console.log(JSON.stringify(row));
    return row;
  } finally {
    ref.close();
    await worker.close().catch(() => undefined);
    await store.close();
  }
}

// ---------------------------------------------------------------- definitions by reference
async function definitionsPart(sql?: (q: string) => Promise<string>) {
  const n = Number(process.env.DX_ACT6_DEF_SUBJECTS ?? 8);
  const open = async (docs: "inline" | "ref") => {
    const store = await openStore("lazy-limits-docs-" + docs + "-" + randomUUID(), "act2-deep");
    const account = new JoinedAccount(store),
      ref = new Reference();
    const f = await seed(store, n);
    await account.install(f.roster, valid);
    return { docs, store, account, ref, f, seq: 0, last: null as W0.ReleaseDoc | null };
  };
  const sides = [await open("inline"), await open("ref")];
  const wal = async () => (sql ? Number(await sql("SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')::bigint")) : NaN);
  type Side = (typeof sides)[number];
  const publish = async (side: Side, id: string, doc: W0.ReleaseDoc) => {
    const w0 = await wal(),
      t = performance.now(),
      l0 = { ...side.account.lastDefinitions };
    const p = await side.account.publish(id, doc, valid, "owed", undefined, { docs: side.docs });
    const ms = performance.now() - t,
      w1 = await wal();
    side.seq++;
    const ops = side.store.counters.lastOps;
    // What a read before settlement loads and evaluates (one subject, a cold reader process-wide cache aside).
    const markers = await side.store.rows([namesOf(side.store).RELEASE], p.position);
    const before = { ...loaded };
    const rt = performance.now();
    const read = await side.account.reader().readAt(side.f.roster[0]!, point(p.position));
    const readMs = performance.now() - rt;
    await side.ref.check(side.account, side.f.roster, side.f.world, doc, point(p.position), side.last, side.seq);
    side.last = doc;
    return {
      position: p.position,
      recordBytes: ops.bytes,
      recordChanges: ops.changes,
      estimatedWriterUs: bulkUs(ops.changes * 5 + 16, 4096 + 3 * ops.bytes),
      walBytesDiagnostic: w1 - w0,
      publishMsDiagnostic: +ms.toFixed(1),
      definitions: side.docs === "ref" ? side.account.lastDefinitions : null,
      changedDefinitions: side.docs === "ref" ? canonical(l0) !== canonical(side.account.lastDefinitions) : null,
      read: {
        markers: markers.length,
        markerBytes: markers.reduce((k, r) => k + Buffer.byteLength(r.value.value), 0),
        definitionsRowsLoaded: loaded.rows - before.rows,
        definitionsBytesLoaded: loaded.bytes - before.bytes,
        answerBytes: Buffer.byteLength(read.json),
        policies: doc.policies?.length ?? 0,
        readMsDiagnostic: +readMs.toFixed(1),
      },
      json: read.json,
    };
  };
  const table: unknown[] = [];
  try {
    for (const forms of [1000, 2000, 4000, 5000]) {
      const first = largeRelease(W0.R2.doc, parseShape(`forms=${forms},policies=${forms},permille=100`));
      const follow = largeRelease(W0.R2.doc, parseShape(`forms=${forms + 20},policies=${forms + 20},permille=100`));
      const row: Record<string, unknown> = { forms, mib: +(Buffer.byteLength(canonical(first)) / 1048576).toFixed(3) };
      for (const side of sides) {
        await publish(side, "base-" + forms, W0.R2.doc);
        // Full documents may be refused (ReleaseTooLarge, before any write); references never are here.
        const attempt = async (id: string, doc: W0.ReleaseDoc) => {
          try {
            return await publish(side, id, doc);
          } catch (e) {
            assert(side.docs === "inline" && e instanceof ReleaseTooLarge, String(e));
            return { refused: e.message, json: undefined };
          }
        };
        const a: any = await attempt("first-" + forms, first);
        const b: any = a.refused ? { refused: "not attempted: the first release of the set was refused" } : await attempt("follow-" + forms, follow);
        row[side.docs] = { first: strip(a), follow: strip(b) };
      }
      const i = row.inline as any,
        r = row.ref as any;
      assert(!r.first.refused && !r.follow.refused, "a release by reference was refused");
      if (!i.first.refused) assert.equal(sameAnswer(i.first.json), sameAnswer(r.first.json), "first release: answers differ between full documents and references");
      if (!i.follow.refused) assert.equal(sameAnswer(i.follow.json), sameAnswer(r.follow.json));
      delete i.first.json, delete r.first.json, delete i.follow.json, delete r.follow.json;
      table.push(row);
      console.log(JSON.stringify(row));
    }
    // A chain of 50 releases (each edits a few forms and adds one), both stores, answers compared at every release.
    let cur = largeRelease(W0.R2.doc, parseShape("forms=40,policies=40,permille=500"));
    let compared = 0;
    for (let k = 0; k < 50; k++) {
      const jsons: string[][] = [];
      for (const side of sides) {
        const p = await side.account.publish("chain-" + k, cur, valid, "owed", undefined, { docs: side.docs });
        side.seq++;
        await side.ref.check(side.account, side.f.roster, side.f.world, cur, point(p.position), side.last, side.seq);
        side.last = cur;
        const reader = side.account.reader();
        jsons.push(await Promise.all(side.f.roster.map(async (s) => (await reader.readAt(s, point(p.position))).json)));
      }
      assert.deepEqual(jsons[0]!.map(sameAnswer), jsons[1]!.map(sameAnswer), "chain release " + k + ": answers differ");
      compared += jsons[0]!.length;
      const forms = cur.forms!.map((x, j) => ((j + k) % 9 === 0 ? { ...x, dueBusinessDays: (x.dueBusinessDays % 30) + 1 } : x));
      const id = "form:y" + String(k).padStart(3, "0");
      cur = {
        ...cur,
        forms: [...forms, { dueBusinessDays: 1 + (k % 5), fields: ["field-001"], id }].sort((a, b) => (a.id < b.id ? -1 : 1)),
        policies: [...cur.policies!, { form: id, id: "pol:y" + String(k).padStart(3, "0"), notice: true, permille: 500 }].sort((a, b) => (a.id < b.id ? -1 : 1)),
      };
    }
    return { subjects: n, table, chain: { releases: 50, answersCompared: compared } };
  } finally {
    for (const side of sides) {
      side.ref.close();
      await side.store.close();
    }
  }
}
const strip = (x: any) => (x && typeof x === "object" ? { ...x } : x);
/** The two stores hold the same releases at different positions (the reference store also has its definitions
 * writes), so an answer is compared without its `basis` (each store's answers are checked against the oracle at their
 * own basis by Reference.check). */
const sameAnswer = (json: string) => {
  const { basis: _basis, ...rest } = JSON.parse(json);
  return canonical(rest);
};

if (import.meta.url === "file://" + process.argv[1]) await releaseLimitsGate(process.argv[2]!);
