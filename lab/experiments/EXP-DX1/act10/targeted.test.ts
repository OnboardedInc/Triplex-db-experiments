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
for (const guardsOn of ["0", "1"])
for (const precondition of ["head", "progress"] as const)
  test("P1 (" + precondition + ", TX2_SETTLE_FRAME_GUARDS=" + guardsOn + "): a pause that lands while a frame is in flight", async () => {
    process.env.TX2_PUBLISH_BESIDE = "1";
    if (guardsOn === "1") process.env.TX2_SETTLE_FRAME_GUARDS = "1";
    else delete process.env.TX2_SETTLE_FRAME_GUARDS;
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
    console.log("[P1 " + precondition + " guards=" + guardsOn + "] " + JSON.stringify({ releaseAt: r.position, pauseAt: pause, framesAfterPause: after.length,
      kinds: after.map((t) => String(t.commandId).split(":")[0]) }));
    db.beforeCommit = undefined;
    await setSettlementControl(ctl, { paused: false, by: "act10" });
    (w.values.control as any).seen = (w.notices.control as any).seen = undefined;
    const done = await running;
    assert(done.every((x) => x.status === "fulfilled"));
    // [DX-ACT8, review F4] With TX2_SETTLE_FRAME_GUARDS no frame lands after the pause under either precondition.
    if (precondition === "head" || guardsOn === "1") assert.equal(after.length, 0);
    else assert(after.length >= 1, "under progress the frame in flight lands after the pause");
    delete process.env.TX2_PUBLISH_BESIDE;
    delete process.env.TX2_SETTLE_FRAME_GUARDS;
  });

for (const guardsOn of ["0", "1"])
for (const precondition of ["head", "progress"] as const)
test("P1b (" + precondition + ", TX2_SETTLE_FRAME_GUARDS=" + guardsOn + "): frames sent within the control cache after a pause landed", async () => {
  process.env.TX2_PUBLISH_BESIDE = "1";
  if (guardsOn === "1") process.env.TX2_SETTLE_FRAME_GUARDS = "1";
  else delete process.env.TX2_SETTLE_FRAME_GUARDS;
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
  console.log("[P1b " + precondition + " guards=" + guardsOn + "] " + JSON.stringify({ pauseAt: pause, framesAfterPause: after.length }));
  db.beforeCommit = undefined;
  db.stall = undefined;
  await setSettlementControl(ctl, { paused: false, by: "act10" });
  await running;
  // [DX-ACT8, review F4] With TX2_SETTLE_FRAME_GUARDS the 250 ms cache no longer lets a frame through: 0 after the pause.
  if (guardsOn === "1") assert.equal(after.length, 0);
  else assert(after.length >= 1);
  delete process.env.TX2_PUBLISH_BESIDE;
  delete process.env.TX2_SETTLE_FRAME_GUARDS;
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
  // [DX-ACT8, review F6] Under TX2_ENROL_BESIDE_SAVES a rival enrolment of the same account is recovered, not refused.
  assert(Object.keys(outcomes).every((k) => !k.includes("refused")), "an enrolment was refused by its rival: " + JSON.stringify(outcomes));
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
  // [DX-ACT8] The control: the Publish-time refusal off, whatever the caller's environment (the gate phase also runs
  // these tests with every option on).
  const cap = process.env.TX2_LEDGER_CAP_AT_PUBLISH;
  delete process.env.TX2_LEDGER_CAP_AT_PUBLISH;
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
  if (cap !== undefined) process.env.TX2_LEDGER_CAP_AT_PUBLISH = cap;
});

// [DX-ACT8, review F3] C1 with TX2_LEDGER_CAP_AT_PUBLISH=1: the same release is refused at Publish, with the limit and
// the count, before anything is written; the account's next release then publishes and its notices are recorded.
test("C1 (TX2_LEDGER_CAP_AT_PUBLISH=1): the release over the ledger cap is refused at Publish; the account goes on", async () => {
  process.env.TX2_PUBLISH_BESIDE = "1";
  process.env.TX2_LEDGER_CAP_AT_PUBLISH = "1";
  process.env.TX2_NOTICE_LEDGER = "parts";
  try {
    const db = fresh(32);
    const A = await account(db, "acct-cap2");
    await A.a.installHeld(validTime);
    await A.a.publish("acct-cap2:R1", W0.R1.doc, validTime, "owed");
    const before = await db.head();
    const big = largeRelease(W0.R1.doc, parseShape("forms=1750,policies=1750,permille=1000"));
    const e = await A.a.publish("acct-cap2:big", big, validTime, "owed", undefined, { docs: "ref" }).then(() => null, (x) => x);
    const wrote = (await db.head()) - before;
    // 1,000 owed forms (ACT6's largest ledger in parts, 6 parts) still publish.
    const k = await A.a.publish("acct-cap2:1000", largeRelease(W0.R1.doc, parseShape("forms=1000,policies=1000,permille=1000")),
      validTime, "owed", undefined, { docs: "ref" });
    const r2 = await A.a.publish("acct-cap2:R2", W0.R2.doc, validTime, "owed", undefined, { docs: "ref" });
    const proc = new Proc(db, "settle");
    const a = new JoinedAccount(memStore(proc, A.held) as any);
    const notices = new (Archive as any)(a, memStore(proc, A.held, db.scope + "-n"), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
    await new RecordedNotices(notices, "parts").record(3);
    const cursor = (await notices.db.row<any>("notice-progress", await db.head()))?.value;
    console.log("[C1 cap] " + JSON.stringify({ refused: String(e?.message).slice(0, 400), definitionsWritten: wrote, thousandAt: k.position,
      laterAt: r2.position, cursorEvent: cursor?.event ?? null }));
    assert(e && e.constructor.name === "ReleaseTooLarge", "the over-cap release was accepted: " + String(e));
    assert.match(String(e.message), /could owe \d+ notice items across this account's releases \(1750 notice policies/);
    assert.equal(wrote, 0, "the refused Publish wrote something");
    assert.equal(cursor.event, 4, "the later releases' notices were not all recorded");
  } finally {
    delete process.env.TX2_PUBLISH_BESIDE;
    delete process.env.TX2_LEDGER_CAP_AT_PUBLISH;
    delete process.env.TX2_NOTICE_LEDGER;
  }
});

// ---------------------------------------------------------------------------------------------- R1: reads around q
for (const frames of ["bytes", "count"] as const)
  test("R1 (" + frames + " frames): reads pinned at q - 1, q and q + 1, before and after settlement, with saves between p and q", async () => {
    process.env.TX2_PUBLISH_BESIDE = "1";
    const { LazyReader } = await import("../actv-lazy/read.ts");
    let reads = 0;
    const routes: Record<string, number> = {};
    for (let seed = 1; seed <= 40; seed++) {
      const db = fresh(500 + seed);
      const r = rng(seed);
      const A = await account(db, "acct-r");
      await A.a.installHeld(validTime);
      await A.a.publish("acct-r:R1", W0.R1.doc, validTime, "owed");
      const saveOne = async (tag: string) => {
        const comp = new Proc(db, "saver").comp();
        const head = await comp.currentPosition();
        const i = r.int(people);
        const rows = (await comp.sweepPage(["acct/acct-r/pl:" + String(i).padStart(8, "0")], { position: head, validAt: Date.parse(validTime) })).rows as any[];
        const t = r.pick(rows.filter((x) => /custom-(start|pay-cents|weekly-minutes|background)|:task\/progress|:file\/expiresOn/.test(x.attribute)));
        const v = t.value.type === "integer" ? { ...t.value, value: String(Number(t.value.value) + 1 + r.int(500)) }
          : /^\d{4}-\d{2}-\d{2}$/.test(t.value.value) ? { ...t.value, value: r.pick(["2026-02-01", "2026-11-03", "2027-09-30"]) }
          : { ...t.value, value: r.pick(["clear", "pending", "consider"]) };
        await comp.transact([{ op: "retract", id: t.id }, { op: "assert", entityId: t.entityId, attribute: t.attribute, value: v, validFrom: t.validFrom }],
          { commandId: "r1:" + seed + ":" + tag, actor: "act10/save", preconditions: [{ _tag: "TripleLive", id: t.id }] });
      };
      // Count frames cannot carry a 20-form release (the writer's bound; ACT4 built byte frames for it): R2 there.
      const doc = frames === "count" ? W0.R2.doc : large(r.pick([1000, 600, 300]));
      const pub = await A.a.publish("acct-r:large", doc, validTime, "owed", undefined, {
        afterRead: async () => { for (let k = r.int(3); k >= 0; k--) await saveOne("read" + k); },
        inside: async () => { if (r.next() < 0.5) await saveOne("inside"); },
      } as never);
      const q = pub.position;
      await saveOne("after"); // q + 1
      const seq = (await A.a.notices.observe()).value.sequence;
      const w = settler(db, A, "r1-" + frames, "progress");
      const values = new (Archive as any)(w.a, memStore(new Proc(db, "rv"), A.held, db.scope + "-rv"), new BulkQueue(1), "values", frames, "progress") as Archive;
      const check = async (when: string) => {
        const reader = values.reader();
        for (const x of [q - 1, q, q + 1]) {
          const c = await A.s.controls(x);
          const inForce = c.releases.filter((y: any) => y.tx <= x).sort((l: any, m: any) => m.tx - l.tx)[0];
          const compiled = W0.compileRelease(inForce.tx === q ? doc : W0.R1.doc);
          for (let i = 0; i < people; i++) {
            const subject = W0.placementId(i);
            const got = await reader.readAt(subject, { position: x, validTime });
            const [world] = await worldsAt(A.s, "act2-deep", [subject], { tx: x, validTime });
            const want = W0.RELEASES_BY_HASH.has(compiled.hash)
              ? W0.reconcileWorld(world!, c.releases.filter((y: any) => y.tx <= x).map((y: any) => ({ from: y.from, tx: y.tx, release: y.release })), { tx: x, validTime })
              : W0.evaluateWorld(world!, compiled, { tx: x, validTime });
            assert.equal(got.json, W0.outputJson(want as never), when + ": read of " + subject + " at " + x + " (q " + q + ")");
            reads++;
            const k = when + " " + (x === q ? "q" : x < q ? "q-1" : "q+1") + " " + got.route;
            routes[k] = (routes[k] ?? 0) + 1;
          }
        }
      };
      await check("before settlement");
      await values.runValues(seq);
      await check("after settlement");
      void w;
    }
    console.log("[R1 " + frames + "] " + JSON.stringify({ publishes: 40, reads, routes }));
    delete process.env.TX2_PUBLISH_BESIDE;
  });

// ---------------------------------------------------------------------------------------------- D1: stored records
test("D1: the same history under the account guard and under the whole-head rule: which stored fields differ", async () => {
  const { dropMemoryScope } = await import("../../../bench/lib/memory.ts");
  const { unpack } = await import("../notify1/store.ts");
  const scope = "act10-d1-history";
  const run = async (guard: boolean) => {
    dropMemoryScope(scope);
    const db = new MemDb(scope, 7);
    db.maxYield = 0;
    const A = await account(db, "acct-d");
    await A.a.installHeld(validTime);
    process.env.TX2_PUBLISH_BESIDE = "1";
    await A.a.publish("acct-d:R1", W0.R1.doc, validTime, "owed");
    const w0 = settler(db, A, "d1-0", "progress");
    await Promise.all([w0.values.runValues(1), w0.recorder.record(1)]);
    // Two saves of subject 2's start date and subject 4's pay rate (the same values in both runs).
    const saves = async () => {
      const comp = new Proc(db, "saver").comp();
      for (const [i, attr, v] of [[2, ":person/custom-start", "2026-11-09"], [4, ":person/custom-pay-cents", "2099"]] as const) {
        const head = await comp.currentPosition();
        const rows = (await comp.sweepPage(["acct/acct-d/pl:" + String(i).padStart(8, "0")], { position: head, validAt: Date.parse(validTime) })).rows as any[];
        const t = rows.find((x) => x.attribute === attr)!;
        const r = await comp.transact([{ op: "retract", id: t.id }, { op: "assert", entityId: t.entityId, attribute: attr, value: { ...t.value, value: v }, validFrom: t.validFrom }],
          { commandId: "d1:" + i, actor: "act10/save", preconditions: [{ _tag: "TripleLive", id: t.id }] });
        assert(r.ok);
      }
    };
    if (guard) await A.a.publish("acct-d:large", large(1000), validTime, "owed", undefined, { afterRead: saves } as never);
    else {
      process.env.TX2_PUBLISH_BESIDE = "0";
      await saves();
      await A.a.publish("acct-d:large", large(1000), validTime, "owed");
    }
    const w = settler(db, A, "d1-1", "progress");
    await Promise.all([w.values.runValues(2), w.recorder.record(2)]);
    delete process.env.TX2_PUBLISH_BESIDE;
    return (await db.comp.feedPage(0, 100000)).transactions as any[];
  };
  const g = await run(true), h = await run(false);
  // Every stored value, by commit position and entity, parsed (packed values unpacked) and flattened to paths.
  const flatten = (v: unknown, path: string, out: Map<string, string>) => {
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) flatten(x, path + "." + k, out);
    else out.set(path, typeof v === "bigint" ? v.toString() + "n" : JSON.stringify(v));
  };
  const parse = (s: string) => {
    try { const v = JSON.parse(s); if (typeof v === "string" && /^[A-Za-z0-9+/=]{16,}$/.test(v)) { try { return unpack(v); } catch { return v; } } return v; } catch { return s; }
  };
  const fields = (txs: any[]) => {
    const out = new Map<string, string>();
    for (const t of txs) for (const [k, c] of t.changes.entries())
      if (c.op === "assert") flatten(parse(c.value.value), t.position + ":" + k + ":" + c.attribute, out);
    return out;
  };
  assert.deepEqual(g.map((t) => [t.position, t.actor, t.changes.length]), h.map((t) => [t.position, t.actor, t.changes.length]), "the two histories differ in shape");
  const fg = fields(g), fh = fields(h);
  const differ = new Map<string, number>();
  for (const k of new Set([...fg.keys(), ...fh.keys()])) if (fg.get(k) !== fh.get(k)) {
    const [pos, , ...rest] = k.split(":");
    const t = g.find((x) => String(x.position) === pos);
    const name = (t?.actor ?? "?") + " " + rest.join(":").replace(/\.\d+(?=\.|$)/g, "[]");
    differ.set(name, (differ.get(name) ?? 0) + 1);
  }
  // Command IDs that differ (the frames' claims are hashes of their content).
  const ids = g.filter((t, i) => t.commandId !== h[i]!.commandId).map((t) => t.actor);
  console.log("[D1] " + JSON.stringify({ commits: g.length, fieldsCompared: fg.size, differingFields: Object.fromEntries(differ), commandIdsDiffer: ids }));
});
