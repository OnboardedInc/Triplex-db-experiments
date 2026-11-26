// [DX-ACT8, sixth round] The compiler stamp across a build change (the fifth review's Y2 and its section 3): the typed
// refusal, the re-stamp route for an account that owes nothing, and what an operator sees. Real code over memstore.ts
// (in process, diagnostic only). R6-1 to R6-3 need two other builds of this checkout (`act10/stamp-trees.sh`):
//   STAMP_A=<out>/comment/lab/experiments/EXP-DX1 STAMP_B=<out>/behaviour/lab/experiments/EXP-DX1 \
//     node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/round6.test.ts
// R6-4 and R6-5 run without them (another build's stamp written into the account directly, as a restore would).
import assert from "node:assert/strict";
import { test } from "node:test";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { worldsAt } from "../actv-lazy/decision.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import type { Permits } from "../actv-lazy/join/account-settings.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { toWire } from "../actv-lazy/join/check.ts";
import { selector } from "../actv-lazy/join/index.ts";
import { comparable, readFullLedgers, readLedgers } from "../actv-lazy/join/ledger-parts.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { fact, namesOf } from "../actv-lazy/store.ts";
import { Documents } from "../notify1/store.ts";
import { heldAccount, MemDb, memStore, Proc, seedAccount } from "./memstore.ts";

const validTime = W0.POPULATION_VALID_TIME;
const NONE: Permits = { accountKeys: false, frameGuards: false, ledgerCap: false };
let serial = 0;
process.env.TX2_PUBLISH_BESIDE = "1";
process.env.TX2_ENROL_BESIDE_SAVES = "1";
for (const k of ["TX2_ACCOUNT_KEYS", "TX2_SETTLE_FRAME_GUARDS", "TX2_LEDGER_CAP_AT_PUBLISH", "TX2_NOTICE_LEDGER", "TX2_RELEASE_DOCS"]) delete process.env[k];

/** One build's classes: this checkout's, or another tree's (`root` = its lab/experiments/EXP-DX1). */
type Build = { name: string; JoinedAccount: any; Archive: any; BulkQueue: any; RecordedNotices: any; selector: string };
const here: Build = { name: "this", JoinedAccount, Archive, BulkQueue, RecordedNotices, selector };
async function build(name: string, root: string): Promise<Build> {
  return {
    name,
    JoinedAccount: (await import(root + "/actv-lazy/join/account.ts")).JoinedAccount,
    Archive: (await import(root + "/actv-lazy/join/archive.ts")).Archive,
    BulkQueue: (await import(root + "/actv-lazy/join/bulk.ts")).BulkQueue,
    RecordedNotices: (await import(root + "/actv-lazy/join/recorded.ts")).RecordedNotices,
    selector: (await import(root + "/actv-lazy/join/index.ts")).selector,
  };
}

/** A fresh database with one held, namespaced account of `people` subjects (not enrolled). */
async function world(people = 2, maxYield = 0) {
  const db = new MemDb("act8-r6-" + ++serial + "-" + process.pid, 6600 + serial);
  db.maxYield = maxYield;
  const cut = await seedAccount(db, "acct-u", people);
  const held = heldAccount("acct-u", people, cut);
  const proc = (name: string) => { const p = new Proc(db, name); p.permits = NONE; return p; };
  const docs = new Map<number, W0.ReleaseDoc>();
  const account = (b: Build, name: string) => new b.JoinedAccount(memStore(proc(name), held) as any);
  return { db, held, proc, docs, people, account };
}
type World = Awaited<ReturnType<typeof world>>;
const journal = async (db: MemDb) => (await db.comp.feedPage(0, 1_000_000)).transactions as any[];
/** An outcome as the caller sees it: the value, or the error's class, stamps and first line. */
const outcome = (p: Promise<any>) => p.then((v) => ({ ok: true as const, value: v }), (e: any) => ({ ok: false as const, error: String(e?.constructor?.name),
  stored: e?.stored as string | undefined, running: e?.running as string | undefined, owes: e?.owes, message: String(e?.message).split("\n")[0]!.slice(0, 200) }));
async function publish(w: World, b: Build, label: string, id: string, doc: W0.ReleaseDoc) {
  const r = await outcome(w.account(b, label).publish(id, doc, validTime, "owed"));
  if (r.ok) w.docs.set(r.value.position, doc);
  return r;
}
/** Settles with build `b`: the values of every owed release not settled yet, then the notices to the tail. */
async function settle(w: World, b: Build, label: string) {
  const p = w.proc(label), a = new b.JoinedAccount(memStore(p, w.held) as any);
  const s = memStore(w.proc(label + "-peek"), w.held) as any;
  const owed = ((await s.controls(await s.head())).releases as any[]).filter((r) => r.storage === "owed").map((r) => r.seq as number);
  const out: string[] = [];
  for (const seq of owed) {
    const v = new b.Archive(a, memStore(p, w.held, w.db.scope + "-v-" + label), new b.BulkQueue(1), "values", "bytes", "progress");
    out.push(await v.runValues(seq).then((x: any) => "values " + seq + " " + x.status, (e: any) => "values " + seq + " " + String(e?.constructor?.name)));
  }
  const n = new b.Archive(a, memStore(p, w.held, w.db.scope + "-n-" + label), new b.BulkQueue(1), "notices", "bytes", "progress");
  out.push(await new b.RecordedNotices(n, undefined).record((await a.notices.observe()).value.sequence).then(() => "notices recorded", (e: any) => "notices " + String(e?.constructor?.name)));
  return out;
}
/** The kernel's fold over every notice event (read by this build: earlier builds' events under their recorded stamps)
 * against the recorded notices in order and each subject's ledger with its archive. */
async function oracle(w: World) {
  const peek = memStore(w.proc("oracle-peek"), w.held) as any;
  const a = w.account(here, "oracle");
  const head = await peek.head();
  const roster = Array.from({ length: w.people }, (_, i) => W0.placementId(i));
  const tail = (await a.notices.observe()).value.sequence;
  const state = new Map<string, W0.ItemState[]>();
  const want: unknown[] = [];
  for (let n = 1; n <= tail; n++) {
    const e = await a.notices.event(n, head);
    const doc = w.docs.get(e.at);
    assert(doc, "no document for the release at " + e.at);
    const policy = W0.compileRelease(doc);
    for (const x of await worldsAt(peek, peek.profile, roster, { tx: e.at, validTime: e.value.validTime })) {
      const out = W0.evaluateWorld(x, policy, { tx: e.at, validTime: e.value.validTime });
      assert(!("error" in out));
      const res = W0.publish({ items: state.get(x.subject) ?? [], subjects: [], pending: [] }, [
        { subject: x.subject, release: e.value.nextHash, basis: { tx: BigInt(e.at), validTime: e.value.validTime }, workItems: (out as any).workItems },
      ]);
      state.set(x.subject, res.state.items as W0.ItemState[]);
      want.push(...res.deliveries.map(toWire));
    }
  }
  const n = new (Archive as any)(a, memStore(w.proc("oracle-reader"), w.held, w.db.scope + "-oracle-" + ++serial), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
  const got = (await new RecordedNotices(n, undefined).packets(head)).flatMap((p: any) => p.deliveries.map(toWire));
  const ndb = new Documents(peek.comp, "settlement-notices" + namesOf(peek).documents);
  const full = await readFullLedgers(ndb, roster, head, (s) => (state.get(s) ?? []).map((i) => i.id));
  return { events: tail, notices: got.length, noticesEqual: got.length === want.length && canonical(got) === canonical(want),
    ledgersEqual: roster.every((s) => canonical(comparable(full.get(s)!.items)) === canonical(comparable(state.get(s) ?? []))) };
}
/** Every owed release's values status, by sequence. */
async function valuesStatus(w: World) {
  const s = memStore(w.proc("values-peek"), w.held) as any, head = await s.head();
  const d = new Documents(s.comp, "settlement-values" + namesOf(s).documents);
  const owed = ((await s.controls(head)).releases as any[]).filter((r) => r.storage === "owed").map((r) => r.seq as number);
  return Object.fromEntries(await Promise.all(owed.map(async (q) => [q, (await d.row<any>("values:" + q, head))?.value.status ?? "none"])));
}

/** The upgrade: build A enrols, publishes and settles R1, publishes R2 (owed); this build refuses, typed, writing nothing;
 * the re-stamp refuses while R2 is owed; A finishes R2; the re-stamp succeeds; A refuses; this build publishes and
 * settles R3; the notices of A's events and this build's equal the oracle. */
async function upgrade(A: Build) {
  const w = await world();
  const out: Record<string, unknown> = { selectorsDiffer: A.selector !== selector };
  await w.account(A, "a-enrol").installHeld(validTime);
  out.aR1 = (await publish(w, A, "a-pub-1", "r1", W0.R1.doc)).ok;
  out.aSettle1 = await settle(w, A, "a-settle-1");
  out.aR2 = (await publish(w, A, "a-pub-2", "r2", W0.R2.doc)).ok;
  // This build before the re-stamp: every account operation refuses, typed, and writes nothing.
  const before = (await journal(w.db)).length;
  out.bPublish = await publish(w, here, "b-pub-early", "r3-early", W0.R1.doc);
  out.bSettle = await settle(w, here, "b-settle-early");
  out.wroteBeforeRestamp = (await journal(w.db)).length - before;
  // Saves and reads through the store go on.
  const store = memStore(w.proc("b-save"), w.held) as any;
  out.save = (await outcome(store.commit("r6-save-" + serial, "save", [fact(w.held.prefix + "r6-probe", ":r6/probe", "after-upgrade")], await store.head()))).ok;
  out.read = (await worldsAt(store, store.profile, [W0.placementId(0)], { tx: await store.head(), validTime }))[0]!.facts.length;
  out.statusOwed = await w.account(here, "b-status-1").stampStatus();
  out.restampOwed = await outcome(w.account(here, "b-restamp-1").restamp());
  out.bSettleOwed = await settle(w, here, "b-settle-owed");
  // A finishes what the account owes; then the re-stamp.
  out.aSettle2 = await settle(w, A, "a-settle-2");
  out.statusReady = await w.account(here, "b-status-2").stampStatus();
  out.restamp = await outcome(w.account(here, "b-restamp-2").restamp());
  out.restampAgain = await outcome(w.account(here, "b-restamp-3").restamp());
  const afterRestamp = (await journal(w.db)).length;
  out.aPublishAfter = await publish(w, A, "a-pub-after", "r3-a", W0.R2.doc);
  out.aSettleAfter = await settle(w, A, "a-settle-after");
  out.wroteByA = (await journal(w.db)).length - afterRestamp;
  out.bR3 = (await publish(w, here, "b-pub-3", "r3", W0.R1.doc)).ok;
  out.bSettle3 = await settle(w, here, "b-settle-3");
  out.values = await valuesStatus(w);
  out.oracle = await oracle(w);
  out.statusAfter = await w.account(here, "b-status-3").stampStatus();
  return { w, out };
}

const STAMP_A = process.env.STAMP_A, STAMP_B = process.env.STAMP_B;
for (const [variant, root] of [["one byte outside behaviour (a comment in account.ts)", STAMP_A], ["a behaviour change (a range boundary in a declaration table)", STAMP_B]] as const)
  test("R6-1: an upgrade from a build with " + variant + ": typed refusal, re-stamp refused while owed, re-stamp, both builds' notices exact", { skip: !root }, async () => {
    const A = await build(variant, root!);
    const { out } = await upgrade(A);
    console.log("[R6-1 " + variant + "] " + JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? String(v) : v)));
    const typed = (x: any) => x.ok === false && x.error === "CompilerChanged" && x.stored === A.selector && x.running === selector;
    assert(out.selectorsDiffer, "the two builds have different stamps");
    assert(out.aR1 && out.aR2 && (out.aSettle1 as string[]).every((x) => /stored|superseded|recorded/.test(x)));
    assert(typed(out.bPublish), "this build's Publish refuses, typed, naming both stamps");
    assert((out.bSettle as string[]).every((x) => /CompilerChanged/.test(x)), "this build's settlers refuse, typed");
    assert.equal(out.wroteBeforeRestamp, 0, "nothing written before the re-stamp");
    assert(out.save && (out.read as number) > 0, "saves and reads on the account go on");
    const owed = out.statusOwed as any;
    assert(!owed.current && !owed.ready && owed.stored === A.selector && canonical(owed.owes.values) === canonical([2]) && owed.owes.notices?.tail === 2);
    assert((out.restampOwed as any).error === "RestampRefused" && canonical((out.restampOwed as any).owes.values) === canonical([2]), "the re-stamp refuses while R2 is owed");
    assert((out.bSettleOwed as string[]).every((x) => /CompilerChanged/.test(x)), "this build's settler refuses the owed release");
    assert((out.aSettle2 as string[]).every((x) => /stored|superseded|recorded/.test(x)), "the stamp's build finishes it");
    assert((out.statusReady as any).ready, "the account owes nothing: ready to re-stamp");
    assert((out.restamp as any).ok && (out.restamp as any).value.restamped === true);
    assert((out.restampAgain as any).ok && (out.restampAgain as any).value.restamped === false, "a second re-stamp does nothing");
    const aTyped = (x: any) => x.ok === false && x.error === "CompilerChanged";
    assert(aTyped(out.aPublishAfter), "the old build refuses after the re-stamp, typed");
    assert.equal(out.wroteByA, 0, "the old build writes nothing after the re-stamp");
    assert(out.bR3 && (out.bSettle3 as string[]).every((x) => /stored|superseded|recorded/.test(x)), "this build publishes and settles");
    assert(Object.values(out.values as object).every((v) => v === "stored" || v === "superseded"), "every owed release's values settled");
    const o = out.oracle as any;
    assert(o.events === 3 && o.noticesEqual && o.ledgersEqual, "the notices of both builds' events equal the oracle, ledgers with their archive exact");
    assert((out.statusAfter as any).current && (out.statusAfter as any).earlierStamps === 1);
  });

test("R6-2: the re-stamp racing a Publish by the old build (interleaved): exactly one commits, the other is refused with nothing written", { skip: !STAMP_A }, async () => {
  const A = await build("comment", STAMP_A!);
  const rows: Record<string, unknown>[] = [];
  for (let seed = 0; seed < 24; seed++) {
    const w = await world(2, 3);
    await w.account(A, "a-enrol").installHeld(validTime);
    await publish(w, A, "a-pub-1", "r1", W0.R1.doc);
    await settle(w, A, "a-settle-1");
    w.db.maxYield = 1 + (seed % 6);
    // Half the seeds give the Publish a head start of a few turns of the event loop, so both orders occur.
    const lag = (seed % 2) * (5 + seed);
    const late = async () => { for (let k = 0; k < lag; k++) await new Promise((r) => setImmediate(r)); return outcome(w.account(here, "b-restamp").restamp()); };
    const [pub, restamp] = await Promise.all([publish(w, A, "a-pub-race", "race-" + seed, W0.R2.doc), late()]);
    const txs = await journal(w.db);
    const published = txs.filter((t) => String(t.commandId).includes("race-" + seed) && t.actor === "lazy/join").length;
    const restamped = txs.filter((t) => String(t.commandId).startsWith("account-restamp:")).length;
    rows.push({ seed, pub: pub.ok ? "published" : pub.error, restamp: restamp.ok ? "restamped" : restamp.error, published, restamped });
  }
  console.log("[R6-2] " + JSON.stringify(rows));
  for (const r of rows) {
    assert.equal(Number(r.published) + Number(r.restamped), 1, "exactly one of the two commits: " + JSON.stringify(r));
    if (r.published) assert.equal(r.restamp, "RestampRefused", "the re-stamp then finds the release owed");
    // The old build's Publish refused by the guard (a conflict it does not retry, the store's class being another
    // module's) or, retried, by the stamp: either way nothing of it is written.
    else assert(r.pub === "CompilerChanged" || r.pub === "Conflict", "the old build's Publish is refused: " + r.pub);
  }
});

test("R6-3: the behaviour change: after the re-stamp the account's enrolment state equals a fresh enrolment's under this build (a held account keeps no enrolment index)", { skip: !STAMP_B }, async () => {
  const A = await build("behaviour", STAMP_B!);
  const { w } = await upgrade(A);
  const fresh = await world();
  await fresh.account(here, "fresh-enrol").installHeld(validTime);
  const metaOf = async (x: World) => {
    const s = memStore(x.proc("meta"), x.held) as any, head = await s.head();
    const d = new Documents(s.comp, "joined" + namesOf(s).documents);
    const m = (await d.row<any>("join-meta", head))!.value;
    const index = (await journal(x.db)).flatMap((t) => t.changes).filter((c: any) => /:join-(index|address)/.test(String(c.entityId))).length;
    // The census document's own ID names the write that installed it; its members and count are what it holds.
    return { compiler: m.compiler, census: { count: m.census.count, members: m.census.members }, epoch: m.epoch, scheduled: m.scheduled, expanded: m.expanded ?? null, indexRows: index };
  };
  const a = await metaOf(w), b = await metaOf(fresh);
  console.log("[R6-3] " + JSON.stringify({ restamped: a, fresh: b }));
  assert.equal(a.compiler, selector);
  assert.deepEqual(a, b, "the re-stamped account's stamp, census, epoch and (empty) index equal a fresh enrolment's");
});

/** Another build's stamp written into an enrolled account directly (what a restore of a database written by another
 * build gives): join-meta's compiler and the tail's inputs. */
async function foreignStamp(w: World, stamp: string) {
  const s = memStore(w.proc("foreign"), w.held) as any, head = await s.head();
  const d = new Documents(s.comp, "joined" + namesOf(s).documents);
  const m = (await d.row<any>("join-meta", head))!, t = (await d.row<any>("tail", head))!;
  await s.commit("foreign-stamp-" + ++serial, "lazy/join", [...d.change("join-meta", m, { ...m.value, compiler: stamp }), ...d.change("tail", t, { ...t.value, inputs: stamp })], head);
}

test("R6-4: without another tree: a foreign stamp gives the typed refusal on Publish with nothing written; the re-stamp names what is owed by kind", async () => {
  const w = await world();
  await w.account(here, "enrol").installHeld(validTime);
  assert((await publish(w, here, "pub-1", "r1", W0.R1.doc)).ok);
  // R1 owed: values and notices.
  await foreignStamp(w, "e".repeat(64));
  const before = (await journal(w.db)).length;
  const pub = await publish(w, here, "pub-2", "r2", W0.R2.doc);
  const wrote = (await journal(w.db)).length - before;
  const refused = await outcome(w.account(here, "restamp").restamp());
  const status = await w.account(here, "status").stampStatus();
  const out = { pub, wrote, refused, status };
  console.log("[R6-4] " + JSON.stringify(out));
  assert(pub.ok === false && pub.error === "CompilerChanged" && pub.stored === "e".repeat(64) && pub.running === selector);
  assert.equal(wrote, 0);
  assert(refused.ok === false && refused.error === "RestampRefused" && canonical(refused.owes.values) === canonical([1]) && refused.owes.notices.tail === 1);
  assert(/values of releases 1; notices of events 1 to 1/.test(refused.message));
  assert(!status.ready && !status.current && !status.nothingOwed);
});

test("R6-5: the re-stamp is the only way back, and only for an account that owes nothing: with nothing owed it succeeds and the account works again", async () => {
  const w = await world();
  await w.account(here, "enrol").installHeld(validTime);
  assert((await publish(w, here, "pub-1", "r1", W0.R1.doc)).ok);
  assert((await settle(w, here, "settle-1")).every((x) => /stored|superseded|recorded/.test(x)));
  await foreignStamp(w, "d".repeat(64));
  const refusedBefore = await publish(w, here, "pub-2", "r2", W0.R2.doc);
  const restamp = await outcome(w.account(here, "restamp").restamp());
  const pub2 = await publish(w, here, "pub-2b", "r2", W0.R2.doc);
  const settled = await settle(w, here, "settle-2");
  const o = await oracle(w);
  const out = { refusedBefore: refusedBefore.ok ? "published" : refusedBefore.error, restamp, pub2: pub2.ok, settled, oracle: o };
  console.log("[R6-5] " + JSON.stringify(out));
  assert.equal(out.refusedBefore, "CompilerChanged");
  assert(restamp.ok && restamp.value.restamped && restamp.value.from === "d".repeat(64));
  assert(pub2.ok && settled.every((x) => /stored|superseded|recorded/.test(x)));
  assert(o.events === 2 && o.noticesEqual && o.ledgersEqual);
});
