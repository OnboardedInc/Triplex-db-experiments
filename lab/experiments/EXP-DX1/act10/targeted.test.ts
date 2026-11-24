// [DX-ACT10] Targeted attacks on the narrowed guards, real code over memstore.ts (in process, diagnostic only).
// Run: node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/targeted.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { canonical, W0 } from "../../../bench/lib/w0-world.ts";
import { Documents } from "../notify1/store.ts";
import { worldsAt } from "../actv-lazy/decision.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { evaluateRows } from "../actv-lazy/join/material.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { setSettlementControl, SettlementControl } from "../actv-lazy/join/settlement-control.ts";
import { heldAccount, MemDb, memStore, Proc, rng, seedAccount } from "./memstore.ts";

const validTime = W0.POPULATION_VALID_TIME;
const people = 6;
const large = (permille: number, base = W0.R1.doc) => largeRelease(base, parseShape("forms=20,policies=20,permille=" + permille));
let serial = 0;
const fresh = (seed: number) => {
  const db = new MemDb("act10-t-" + seed + "-" + ++serial, seed);
  db.maxYield = 0;
  return db;
};
async function account(db: MemDb, name: string, namespace = true) {
  const cut = await seedAccount(db, name, people);
  const held = heldAccount(name, people, cut, namespace);
  const proc = new Proc(db, "main-" + name);
  const s = memStore(proc, held) as any;
  const a = new JoinedAccount(s);
  return { name, held, proc, s, a };
}
function settler(db: MemDb, x: { held: ReturnType<typeof heldAccount> }, label: string, precondition: "head" | "progress") {
  const proc = new Proc(db, "settle-" + label);
  const a = new JoinedAccount(memStore(proc, x.held) as any);
  const queue = new BulkQueue(1);
  const values = new (Archive as any)(a, memStore(proc, x.held, db.scope + "-" + label + "-v"), queue, "values", "bytes", precondition) as Archive;
  const notices = new (Archive as any)(a, memStore(proc, x.held, db.scope + "-" + label + "-n"), queue, "notices", "bytes", precondition) as Archive;
  return { proc, a, queue, values, notices, recorder: new RecordedNotices(notices, "whole") };
}
async function expectedChanges(x: { s: any }, q: number, old: W0.ReleaseDoc, doc: W0.ReleaseDoc) {
  const roster = Array.from({ length: people }, (_, i) => W0.placementId(i));
  const worlds = await worldsAt(x.s, "act2-deep", roster, { tx: q - 1, validTime });
  return evaluateRows({ worlds, basis: { tx: q, validTime } }, W0.compileRelease(old), W0.compileRelease(doc), false)
    .rows.filter((r) => r.rows.length).map((r) => ({ subject: r.subject, changes: r.rows.map(([k, , v]) => [k, v]) }));
}

// ---------------------------------------------------------------------------------------------- P1: pause in flight
for (const precondition of ["head", "progress"] as const)
  test("P1 (" + precondition + "): a pause that lands while a frame is in flight", async () => {
    process.env.TX2_PUBLISH_BESIDE = "1";
    const db = fresh(11);
    const A = await account(db, "acct-p");
    await A.a.installHeld(validTime);
    await A.a.publish("acct-p:R1", W0.R1.doc, validTime, "owed");
    const r = await A.a.publish("acct-p:large", large(1000), validTime, "owed");
    const seq = (await A.a.notices.observe()).value.sequence;
    const w = settler(db, A, "p1", precondition);
    const ctl = memStore(new Proc(db, "operator"), A.held, db.scope + "-operator") as any;
    w.values.control = w.notices.control = new SettlementControl(w.values.store, w.queue, w.values.turnKey());
    let pause: number | undefined;
    db.beforeCommit = async (id) => {
      // The operator's pause lands after the frame read its progress row, before the frame reaches the transactor.
      if (pause === undefined && id.startsWith("settled-values:")) {
        pause = (await setSettlementControl(ctl, { paused: true, by: "act10" })).position;
        // Every later gate reads the control afresh (the 250 ms cache is a separate question, P1b).
        (w.values.control as any).seen = undefined;
        (w.notices.control as any).seen = undefined;
      }
    };
    const running = Promise.allSettled([w.values.runValues(seq), w.recorder.record(seq)]);
    await new Promise((x) => setTimeout(x, 1200));
    const journal = (await db.comp.feedPage(0, 100000)).transactions as any[];
    const after = journal.filter((t) => t.position > pause! && /^settled-/.test(String(t.commandId)));
    console.log("[P1 " + precondition + "] " + JSON.stringify({ releaseAt: r.position, pauseAt: pause, framesAfterPause: after.length,
      kinds: after.map((t) => String(t.commandId).split(":")[0]) }));
    db.beforeCommit = undefined;
    await setSettlementControl(ctl, { paused: false, by: "act10" });
    (w.values.control as any).seen = (w.notices.control as any).seen = undefined;
    const done = await running;
    assert(done.every((x) => x.status === "fulfilled"));
    if (precondition === "head") assert.equal(after.length, 0);
    else assert(after.length >= 1, "under progress the frame in flight lands after the pause");
    delete process.env.TX2_PUBLISH_BESIDE;
  });

for (const precondition of ["head", "progress"] as const)
test("P1b (" + precondition + "): frames sent within the control cache after a pause landed", async () => {
  process.env.TX2_PUBLISH_BESIDE = "1";
  const db = fresh(12);
  const A = await account(db, "acct-q");
  await A.a.installHeld(validTime);
  await A.a.publish("acct-q:R1", W0.R1.doc, validTime, "owed");
  await A.a.publish("acct-q:large", large(1000), validTime, "owed");
  const seq = (await A.a.notices.observe()).value.sequence;
  const w = settler(db, A, "p1b", precondition);
  const ctl = memStore(new Proc(db, "operator"), A.held, db.scope + "-operator") as any;
  w.values.control = w.notices.control = new SettlementControl(w.values.store, w.queue, w.values.turnKey());
  // Each frame takes 40 ms in the transactor (a Mac-like frame turn), so the 250 ms cache spans several frames.
  db.stall = () => new Promise((x) => setTimeout(x, 40));
  let pause: number | undefined;
  db.beforeCommit = async (id) => {
    if (pause === undefined && id.startsWith("settled-values:")) pause = (await setSettlementControl(ctl, { paused: true, by: "act10" })).position;
  };
  const running = Promise.allSettled([w.values.runValues(seq), w.recorder.record(seq)]);
  await new Promise((x) => setTimeout(x, 1500));
  const journal = (await db.comp.feedPage(0, 100000)).transactions as any[];
  const after = journal.filter((t) => t.position > pause! && /^settled-/.test(String(t.commandId)));
  console.log("[P1b " + precondition + "] " + JSON.stringify({ pauseAt: pause, framesAfterPause: after.length }));
  db.beforeCommit = undefined;
  db.stall = undefined;
  await setSettlementControl(ctl, { paused: false, by: "act10" });
  await running;
  assert(after.length >= 1);
  delete process.env.TX2_PUBLISH_BESIDE;
});

// ---------------------------------------------------------------------------------------------- E1: enrolment races
test("E1: an enrolment racing its account's first saves, a rival enrolment of the same account, and another account", async () => {
  process.env.TX2_PUBLISH_BESIDE = "1";
  process.env.TX2_ENROL_BESIDE_SAVES = "1";
  const outcomes: Record<string, number> = {};
  let checked = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const db = fresh(1000 + seed);
    const r = rng(seed);
    db.maxYield = 1 + r.int(4);
    const A = await account(db, "acct-e");
    await A.a.installHeld(validTime);
    await A.a.publish("acct-e:R1", W0.R1.doc, validTime, "owed");
    const cut = await seedAccount(db, "acct-c", people);
    const hC = heldAccount("acct-c", people, cut);
    const enrol = async (k: number) => {
      const a = new JoinedAccount(memStore(new Proc(db, "enrol-" + k), hC) as any);
      try {
        await a.installHeld(validTime);
        return "ok";
      } catch (e: any) {
        return "refused: " + String(e?.message).split("\n")[0]!.slice(0, 60);
      }
    };
    const saves = async (acct: string, n: number) => {
      const comp = new Proc(db, "saver-" + acct).comp();
      for (let j = 0; j < n; j++) {
        const head = await comp.currentPosition();
        const rows = (await comp.sweepPage(["acct/" + acct + "/" + "pl:" + String(r.int(people)).padStart(8, "0")], { position: head, validAt: Date.parse(validTime) })).rows as any[];
        const t = rows.find((x) => x.attribute === ":placement/stamp")!;
        await comp.transact([{ op: "retract", id: t.id }, { op: "assert", entityId: t.entityId, attribute: t.attribute, value: { ...t.value, value: String(Number(t.value.value) + 1) }, validFrom: t.validFrom }],
          { commandId: "e1:" + seed + ":" + acct + ":" + j, actor: "act10/save", preconditions: [{ _tag: "TripleLive", id: t.id }] });
      }
    };
    const [e1, e2] = await Promise.all([enrol(1), r.next() < 0.7 ? enrol(2) : Promise.resolve("none"), saves("acct-c", 1 + r.int(6)), saves("acct-e", r.int(6)),
      A.a.publish("acct-e:" + seed, large(700), validTime, "owed").then(() => "published", (e) => "publish refused: " + e.message)]);
    const key = [e1, e2].sort().join(" | ");
    outcomes[key] = (outcomes[key] ?? 0) + 1;
    // Exactly one enrolment record of C; then C publishes and settles exactly.
    const journal = (await db.comp.feedPage(0, 100000)).transactions as any[];
    const records = journal.filter((t) => t.changes.some((c: any) => c.entityId === "lazy/account/origin/acct-c" && c.op === "assert"));
    assert.equal(records.length, 1, "enrolment records of C: " + records.length);
    const C = { held: hC, s: memStore(new Proc(db, "c"), hC) as any, a: undefined as any };
    C.a = new JoinedAccount(C.s);
    if (!e1.startsWith("ok") && !e2.startsWith("ok")) await C.a.installHeld(validTime); // a retry recovers by command ID
    await C.a.publish("acct-c:R1", W0.R1.doc, validTime, "owed");
    const pub = await C.a.publish("acct-c:large", large(1000), validTime, "owed");
    const seq = (await C.a.notices.observe()).value.sequence;
    const w = settler(db, C, "e1c", "progress");
    await w.values.runValues(seq);
    const got = (await w.values.stored(seq)).output.map((x: any) => ({ subject: x.subject, changes: x.changes }));
    assert.equal(canonical(got), canonical(await expectedChanges(C, pub.position, W0.R1.doc, large(1000))));
    checked++;
  }
  console.log("[E1] " + JSON.stringify({ schedules: 300, checked, outcomes }));
  delete process.env.TX2_PUBLISH_BESIDE;
  delete process.env.TX2_ENROL_BESIDE_SAVES;
});

// ---------------------------------------------------------------------------------------------- N1: account names
test("N1: account names that are prefixes of each other, look like metadata keys, or differ only in case", async () => {
  process.env.TX2_PUBLISH_BESIDE = "1";
  process.env.TX2_ENROL_BESIDE_SAVES = "1";
  const db = fresh(21);
  // The first account uses the single-account layout (unnamespaced names), as account 0 of the held toy does.
  const names = ["acct-0", "a-003", "a-0031", "definitions", "releases", "ACCT", "acct", "settlement", "values"];
  const xs = [];
  for (const [i, n] of names.entries()) {
    const x = await account(db, n, i > 0);
    await x.a.installHeld(validTime);
    xs.push(x);
  }
  const docs = names.map((_, i) => large(300 + 70 * i));
  for (const [i, x] of xs.entries()) {
    await x.a.publish(x.name + ":R1", W0.R1.doc, validTime, "owed", undefined, { docs: "inline" });
    await x.a.publish(x.name + ":large", docs[i]!, validTime, "owed", undefined, { docs: "inline" });
  }
  const out: Record<string, unknown> = {};
  for (const [i, x] of xs.entries()) {
    const rels = (await x.s.controls(await x.s.head())).releases;
    assert.equal(rels.length, 2, x.name + " sees " + rels.length + " releases");
    const seq = (await x.a.notices.observe()).value.sequence;
    assert.equal(seq, 2);
    const w = settler(db, x, "n1-" + i, "progress");
    await Promise.all([w.values.runValues(seq), w.recorder.record(seq)]);
    const got = (await w.values.stored(seq)).output.map((y: any) => ({ subject: y.subject, changes: y.changes }));
    assert.equal(canonical(got), canonical(await expectedChanges(x, rels[1].tx, W0.R1.doc, docs[i]!)), x.name + ": values");
    out[x.name] = { releases: rels.length, changes: got.reduce((n: number, y: any) => n + y.changes.length, 0) };
  }
  // Every account's settlement documents are distinct.
  const prefixes = names.map((n, i) => new Documents(db.comp as any, "settlement-values" + (i ? "-" + n : "")).prefix);
  assert.equal(new Set(prefixes).size, names.length);
  console.log("[N1] " + JSON.stringify(out));
  delete process.env.TX2_PUBLISH_BESIDE;
  delete process.env.TX2_ENROL_BESIDE_SAVES;
});

// ---------------------------------------------------------------------------------------------- Q1: queue fairness
test("Q1: one account with 2,000 frames queued and forty small accounts: no small account waits behind the large one", async () => {
  const q = new BulkQueue(1);
  const order: string[] = [];
  const work = (k: string) => async () => {
    order.push(k);
    await new Promise((x) => setImmediate(x));
  };
  const big = Array.from({ length: 2000 }, () => q.submit("big", work("big")));
  const r = rng(5);
  const small: Promise<unknown>[] = [];
  const waits: number[] = [];
  for (let k = 0; k < 40; k++) {
    await new Promise((x) => setTimeout(x, r.int(5)));
    const before = order.length;
    small.push(q.submit("s" + k, work("s" + k)).then(() => waits.push(order.lastIndexOf("s" + k) - before)));
  }
  await Promise.all([...big, ...small]);
  console.log("[Q1] " + JSON.stringify({ frames: order.length, maxTurnsWaitedBySmall: Math.max(...waits), meanWait: waits.reduce((a, b) => a + b, 0) / waits.length }));
  assert(Math.max(...waits) <= 41);
  // Pace on the large account, a pause on one small account: the others still go.
  const q2 = new BulkQueue(1);
  q2.pace("big", 5);
  q2.pause("s0");
  const o2: string[] = [];
  const w2 = (k: string) => async () => void o2.push(k);
  const b2 = Array.from({ length: 50 }, () => q2.submit("big", w2("big")));
  const s0 = q2.submit("s0", w2("s0"));
  const s1 = q2.submit("s1", w2("s1"));
  await s1;
  assert(!o2.includes("s0"));
  q2.resume("s0");
  await Promise.all([...b2, s0]);
  assert(o2.indexOf("s1") < 3, "a small account waited behind a paced large one");
});

// ---------------------------------------------------------------------------------------------- C1: the ledger cap
test("C1 (TX2_NOTICE_LEDGER=parts): a release whose ledger exceeds the part cap is acknowledged, then stops the account's notices", async () => {
  process.env.TX2_PUBLISH_BESIDE = "1";
  const db = fresh(31);
  const A = await account(db, "acct-cap");
  await A.a.installHeld(validTime);
  await A.a.publish("acct-cap:R1", W0.R1.doc, validTime, "owed");
  const big = largeRelease(W0.R1.doc, parseShape("forms=1750,policies=1750,permille=1000"));
  const r = await A.a.publish("acct-cap:big", big, validTime, "owed", undefined, { docs: "ref" });
  // A later, small release of the same account.
  const r2 = await A.a.publish("acct-cap:R2", W0.R2.doc, validTime, "owed", undefined, { docs: "ref" });
  const proc = new Proc(db, "settle");
  const a = new JoinedAccount(memStore(proc, A.held) as any);
  const notices = new (Archive as any)(a, memStore(proc, A.held, db.scope + "-n"), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
  const recorder = new RecordedNotices(notices, "parts");
  const tries: string[] = [];
  for (let k = 0; k < 3; k++)
    tries.push(await recorder.record(3).then(() => "recorded", (e) => String(e?.constructor?.name) + ": " + String(e?.message).slice(0, 110)));
  const cursor = (await notices.db.row<any>("notice-progress", await db.head()))?.value;
  console.log("[C1] " + JSON.stringify({ bigAt: r.position, laterAt: r2.position, tries, cursorEvent: cursor?.event ?? null }));
  assert(tries.every((t) => /FrameTooLarge/.test(t)));
  assert(cursor === undefined || cursor.event <= 2, "the later release's notices were recorded");
  delete process.env.TX2_PUBLISH_BESIDE;
});
