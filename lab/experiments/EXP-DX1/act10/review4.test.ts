// [DX-ACT10, fourth review] Attacks on the Publish line at a6f89a409 (code a380292be): the transition's fences, the
// retired-item archive, the random frame and enrolment IDs, U2 and U4 as fixed. Real code over memstore.ts (in process,
// diagnostic only). Run: node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/review4.test.ts
// [DX-ACT8, fifth round] Flipped to the fixed behaviour: W1, W1b (Z3), W3 (Z6), W7 (Z2), W8, W8b (Z1). W4 counts any stop
// as a failure (W4_SEEDS histories from W4_FROM; the standing gate runs 200). W2 still states Z5 (closed by the gateway
// rule, not here). Ledgers with their archive are compared in the archive's form (`comparable`: a retired item's payload,
// which the kernel's fold never reads, is not kept; Z4).
import assert from "node:assert/strict";
import { test } from "node:test";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { worldsAt } from "../actv-lazy/decision.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { ensureSettings, type Permits } from "../actv-lazy/join/account-settings.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { toWire } from "../actv-lazy/join/check.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { comparable, readFullLedgers, readLedgers } from "../actv-lazy/join/ledger-parts.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { fact, namesOf } from "../actv-lazy/store.ts";
import { Documents } from "../notify1/store.ts";
import { heldAccount, Killed, MemDb, memStore, Proc, rng, seedAccount } from "./memstore.ts";

const validTime = W0.POPULATION_VALID_TIME;
const NONE: Permits = { accountKeys: false, frameGuards: false, ledgerCap: false };
const ALL: Permits = { accountKeys: true, frameGuards: true, ledgerCap: true };
let serial = 0;
process.env.TX2_PUBLISH_BESIDE = "1";
process.env.TX2_ENROL_BESIDE_SAVES = "1";
for (const k of ["TX2_ACCOUNT_KEYS", "TX2_SETTLE_FRAME_GUARDS", "TX2_LEDGER_CAP_AT_PUBLISH", "TX2_NOTICE_LEDGER", "TX2_RELEASE_DOCS"]) delete process.env[k];

type Acct = { name: string; held: ReturnType<typeof heldAccount>; account: (p: Proc) => JoinedAccount; store: (p: Proc) => any };
/** Held accounts in one fresh database, each enrolled and with R1 published by a process allowed nothing; `docs` maps
 * each account's release positions to their documents (for the oracle). */
async function setup(names = ["acct-a"], people = 4) {
  const db = new MemDb("act10-r4-" + ++serial + "-" + process.pid, 7000 + serial);
  db.maxYield = 0;
  const proc = (name: string, permits: Permits, oldBuild = false) => {
    const p = new Proc(db, name);
    p.permits = permits;
    p.oldBuild = oldBuild;
    return p;
  };
  const accounts: Acct[] = [];
  const docs = new Map<string, Map<number, W0.ReleaseDoc>>();
  for (const name of names) {
    const cut = await seedAccount(db, name, people);
    const held = heldAccount(name, people, cut);
    const account = (p: Proc) => new JoinedAccount(memStore(p, held) as any);
    await account(proc("enrol-" + name, NONE)).installHeld(validTime);
    const r1 = await account(proc("first-" + name, NONE)).publish(name + ":r1", W0.R1.doc, validTime, "owed");
    docs.set(name, new Map([[r1.position, W0.R1.doc]]));
    accounts.push({ name, held, account, store: (p: Proc) => memStore(p, held) as any });
  }
  return { db, proc, accounts, x: accounts[0]!, docs, people };
}
type Setup = Awaited<ReturnType<typeof setup>>;
const outcome = (p: Promise<{ position: number; txId?: string }>) =>
  p.then((r) => ({ ok: true as const, position: r.position, txId: r.txId }), (e) => ({ ok: false as const, error: String(e?.message).split("\n")[0]!.slice(0, 140) }));
const settingsOf = async (t: Setup, x = t.x) => {
  const s = x.store(t.proc("peek", NONE));
  return (await s.controls(await s.head())).settings;
};
const tailOf = async (t: Setup, x = t.x) => (await x.account(t.proc("peek", NONE)).notices.observe()).value.sequence;
async function publish(t: Setup, p: Proc, id: string, doc: W0.ReleaseDoc, x = t.x) {
  const r = await outcome(x.account(p).publish(id, doc, validTime, "owed", undefined, { docs: "ref" }) as any);
  if (r.ok) t.docs.get(x.name)!.set(r.position, doc);
  return r;
}
const noticeArchive = (t: Setup, p: Proc, label: string, a = t.x.account(p)) =>
  new (Archive as any)(a, memStore(p, t.x.held, t.db.scope + "-n-" + label), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
async function recordNotices(t: Setup, label: string, permits: Permits, ledger: "whole" | "parts" | undefined, through: number, oldBuild = false) {
  const p = t.proc(label, permits, oldBuild);
  return new RecordedNotices(noticeArchive(t, p, label), ledger).record(through)
    .then(() => "recorded", (e) => String(e?.constructor?.name) + ": " + String(e?.message).split("\n")[0]!.slice(0, 140));
}
const cursorOf = async (t: Setup) => {
  const s = t.x.store(t.proc("peek", NONE));
  const d = new Documents(s.comp, "settlement-notices" + namesOf(s).documents);
  return (await d.row<any>("notice-progress", await s.head()))?.value;
};
/** A large release whose forms and notice policies carry `tag` in their IDs (distinct policies across tags). */
function tagged(n: number, tag: string, base = W0.R1.doc) {
  const d = largeRelease(base, parseShape("forms=" + n + ",policies=" + n + ",permille=1000"));
  const fix = (s: string) => s.replace(/^form:f/, "form:" + tag).replace(/^pol:p/, "pol:" + tag);
  const doc = { ...d, forms: d.forms!.map((f) => ({ ...f, id: fix(f.id) })), policies: d.policies!.map((p) => ({ ...p, id: fix(p.id), form: fix(p.form) })) };
  W0.compileRelease(doc as never);
  return doc as W0.ReleaseDoc;
}

/**
 * The oracle (independent of the recorder): the kernel's fold over every notice event of the account, every subject,
 * with the whole state (retired items kept), against the recorded notices in order and each subject's ledger with its
 * archive (and the ledger alone against the items in force when the account archives).
 */
async function oracle(t: Setup, x = t.x) {
  const peek = x.store(t.proc("oracle-peek", NONE));
  const a = x.account(t.proc("oracle", NONE));
  const head = await peek.head();
  const roster = Array.from({ length: t.people }, (_, i) => W0.placementId(i));
  const tail = (await a.notices.observe()).value.sequence;
  const state = new Map<string, W0.ItemState[]>();
  const want: unknown[] = [];
  const docs = t.docs.get(x.name)!;
  for (let n = 1; n <= tail; n++) {
    const e = await a.notices.event(n, head);
    const doc = docs.get(e.at);
    assert(doc, "no document for the release at " + e.at);
    const policy = W0.compileRelease(doc);
    assert.equal(policy.hash, e.value.nextHash);
    for (const w of await worldsAt(peek, peek.profile, roster, { tx: e.at, validTime: e.value.validTime })) {
      const out = W0.evaluateWorld(w, policy, { tx: e.at, validTime: e.value.validTime });
      assert(!("error" in out));
      const res = W0.publish({ items: state.get(w.subject) ?? [], subjects: [], pending: [] }, [
        { subject: w.subject, release: e.value.nextHash, basis: { tx: BigInt(e.at), validTime: e.value.validTime }, workItems: (out as any).workItems },
      ]);
      state.set(w.subject, res.state.items as W0.ItemState[]);
      want.push(...res.deliveries.map(toWire));
    }
  }
  const n = new (Archive as any)(a, memStore(t.proc("oracle-reader", NONE), x.held, t.db.scope + "-oracle-" + ++serial), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
  const got = (await new RecordedNotices(n, undefined).packets(head)).flatMap((p: any) => p.deliveries.map(toWire));
  const ndb = new Documents(peek.comp, "settlement-notices" + namesOf(peek).documents);
  const full = await readFullLedgers(ndb, roster, head, (s) => (state.get(s) ?? []).map((i) => i.id));
  const live = await readLedgers(ndb, roster, head);
  const subjects = roster.map((s) => ({
    s,
    fullEqual: canonical(comparable(full.get(s)!.items)) === canonical(comparable(state.get(s) ?? [])),
    liveIsInForce: canonical(live.get(s)!.items) === canonical((state.get(s) ?? []).filter((i) => !i.retired)),
    everHeld: (state.get(s) ?? []).length,
    inForce: (state.get(s) ?? []).filter((i) => !i.retired).length,
    ledger: live.get(s)!.items.length,
    parts: live.get(s)!.parts.length,
    archived: full.get(s)!.archived,
  }));
  return { notices: got.length, noticesEqual: got.length === want.length && canonical(got) === canonical(want), subjects, tail };
}

// --------------------------------------------------------------------------------------------- (1) the fences, W1
test("W1: a transition between a notice turn's two head reads: the event is written under the archive, in parts (Z3 fixed)", async () => {
  const t = await setup();
  // Before any setting: a release of 40 notice policies, its notices recorded by a settler naming no mode (whole).
  assert((await publish(t, t.proc("pub-g0", NONE), "g0", tagged(40, "g0"))).ok);
  assert.equal(await recordNotices(t, "s0", NONE, undefined, await tailOf(t)), "recorded");
  // A release of 40 other notice policies by a process allowed nothing: at its event g0's 40 items retire.
  assert((await publish(t, t.proc("pub-g", NONE), "g", tagged(40, "g"))).ok);
  const tail = await tailOf(t);
  // The settler, allowed nothing and naming no mode: right after its turn reads the source head, a permitted process
  // (allowed the cap) turns the settings on (its fences rewrite the cursor), then the settler reads its own head.
  const p = t.proc("settler", NONE), a = t.x.account(p);
  const archive = noticeArchive(t, p, "settler", a);
  const source = (a as any).s, head = source.head.bind(source);
  let fired = false;
  source.head = async () => {
    const h = await head();
    if (!fired) {
      fired = true;
      await ensureSettings(t.x.store(t.proc("upgrader", { ...NONE, ledgerCap: true })));
    }
    return h;
  };
  const first = await new RecordedNotices(archive, undefined).record(tail).then(() => "recorded", (e) => String(e?.message).split("\n")[0]!.slice(0, 140));
  const settings = await settingsOf(t);
  const cursor = await cursorOf(t);
  const o1 = await oracle(t);
  // The next event (R2) under the settings: the archive takes over and the fold stays exact.
  assert((await publish(t, t.proc("pub-r2", NONE), "r2", W0.R2.doc)).ok);
  const next = await recordNotices(t, "s2", NONE, undefined, await tailOf(t));
  const o2 = await oracle(t);
  const out = { transitionLanded: fired, settings, first, cursorAfterEvent: { event: cursor?.event, archive: cursor?.archive ?? null, ledger: cursor?.ledger ?? null },
    afterEvent: o1.subjects.map((s) => ({ ledger: s.ledger, inForce: s.inForce, parts: s.parts, archived: s.archived, fullEqual: s.fullEqual })), noticesEqual: o1.noticesEqual,
    next, afterNext: o2.subjects.map((s) => ({ ledger: s.ledger, inForce: s.inForce, archived: s.archived, fullEqual: s.fullEqual })), nextNoticesEqual: o2.noticesEqual };
  console.log("[W1] " + JSON.stringify(out));
  assert(settings?.archive && settings.ledger === "parts", "the settings were on when the event was written");
  assert.equal(first, "recorded");
  // [DX-ACT8, fifth round] Fixed (Z3): the decision is read at the position the frame is guarded on, so the event written
  // after the transition is under the archive, its ledgers hold the items in force only, and the fold is exact.
  assert.equal(cursor?.archive, true);
  assert.equal(cursor?.ledger, "parts");
  assert(o1.noticesEqual && o1.subjects.every((s) => s.ledger === s.inForce && s.archived > 0 && s.fullEqual), "the event archives its retired items");
  assert(o2.noticesEqual && o2.subjects.every((s) => s.fullEqual && s.ledger === s.inForce), "the next event archives and the fold is exact");
});

test("W1b: the same window for a settler naming no mode on ledgers already in parts: recorded at once (Z3 fixed)", async () => {
  const t = await setup();
  // Before any setting, as every gate ran: a 400-policy release, its notices recorded in parts.
  assert((await publish(t, t.proc("pub-big", NONE), "big", tagged(400, "h"))).ok);
  assert.equal(await recordNotices(t, "s-parts", NONE, "parts", await tailOf(t)), "recorded");
  assert((await publish(t, t.proc("pub-r2", NONE), "r2", W0.R2.doc)).ok);
  const tail = await tailOf(t);
  const p = t.proc("settler-none", NONE), a = t.x.account(p);
  const archive = noticeArchive(t, p, "settler-none", a);
  const source = (a as any).s, head = source.head.bind(source);
  let fired = false;
  source.head = async () => {
    const h = await head();
    if (!fired) {
      fired = true;
      await ensureSettings(t.x.store(t.proc("upgrader", { ...NONE, ledgerCap: true })));
    }
    return h;
  };
  const first = await new RecordedNotices(archive, undefined).record(tail).then(() => "recorded", (e) => String(e?.message).split("\n")[0]!.slice(0, 140));
  const again = await recordNotices(t, "settler-none-again", NONE, undefined, tail);
  const o = await oracle(t);
  const out = { settings: await settingsOf(t), first, again, noticesEqual: o.noticesEqual, subjects: o.subjects.map((s) => ({ fullEqual: s.fullEqual, archived: s.archived })) };
  console.log("[W1b] " + JSON.stringify(out));
  // [DX-ACT8, fifth round] Fixed (Z3): no refusal, the first run records (the second finds nothing left).
  assert.equal(first, "recorded");
  assert.equal(again, "recorded");
  assert(o.noticesEqual && o.subjects.every((s) => s.fullEqual));
});

// ------------------------------------------------------------------------------------- (3) the enrolment ID, W2
test("W2: the enrolment with TX2_ENROL_BESIDE_SAVES unset keeps the computable ID; with it set, another account can write one of the four entities first (Z5: stays, closed by the gateway rule)", async () => {
  const t = await setup(["acct-b"]);
  const B = t.accounts[0]!;
  const enrolAs = async (held: ReturnType<typeof heldAccount>, label: string) =>
    new JoinedAccount(memStore(t.proc(label, NONE), held) as any).installHeld(validTime)
      .then(() => "enrolled", (e) => "refused: " + String(e?.message).split("\n")[0]!.slice(0, 100));
  // (a) The option unset (its default): the ID is join-held-enrolment:<account>, as before the fix.
  const cutA = await seedAccount(t.db, "acct-a", 4);
  const heldA = heldAccount("acct-a", 4, cutA);
  const bs = B.store(t.proc("b-saver", NONE));
  const takenA = await outcome(bs.commit("join-held-enrolment:acct-a", "save", [fact(B.held.prefix + "act10-probe", ":act10/probe", 1)], await bs.head()));
  delete process.env.TX2_ENROL_BESIDE_SAVES;
  const unset: string[] = [];
  try {
    for (let k = 0; k < 2; k++) unset.push(await enrolAs(heldA, "enrol-a-" + k));
  } finally {
    process.env.TX2_ENROL_BESIDE_SAVES = "1";
  }
  // (b) The option set: another account writes one fact on the account's join-meta document before it enrols.
  const cutC = await seedAccount(t.db, "acct-c", 4);
  const heldC = heldAccount("acct-c", 4, cutC);
  const prefixC = (new JoinedAccount(memStore(t.proc("names-c", NONE), heldC) as any) as any).db.prefix;
  const takenC = await outcome(bs.commit("b-ordinary-save-" + serial, "save", [fact(prefixC + "join-meta", "notice/value", "x")], await bs.head()));
  const set: string[] = [];
  for (let k = 0; k < 2; k++) set.push(await enrolAs(heldC, "enrol-c-" + k));
  const out = { unset: { taken: takenA.ok, enrolments: unset }, set: { taken: takenC.ok, enrolments: set } };
  console.log("[W2] " + JSON.stringify(out));
  assert(takenA.ok && unset.every((x) => x.startsWith("refused")), "with the option unset the account cannot enrol");
  assert(takenC.ok && set.every((x) => x.startsWith("refused")), "with it set, one fact on a fourth entity stops the enrolment");
});

// --------------------------------------------------------------------------------- (U4 as fixed) the journal rule, W3
test("W3: the every-change rule accepts only the record's own journal entity, not another transaction's (Z6 fixed)", async () => {
  const t = await setup(["acct-a", "acct-b"]);
  const [A, B] = t.accounts as [Acct, Acct];
  // A Publish of B, whose journal entity a forged record of A then writes into.
  const rb = await publish(t, t.proc("pub-b", NONE), "rb", W0.R2.doc, B);
  assert(rb.ok && rb.txId);
  const pa = t.proc("publisher-a", NONE), sa = A.store(pa);
  let context: any;
  const commit = sa.commit;
  sa.commit = async (...args: any[]) => {
    if (String(args[0]) === "joined:r9" && !context) { context = args[4]; throw new Error("request lost"); }
    return commit(...args);
  };
  await outcome(new JoinedAccount(sa).publish("r9", W0.R2.doc, validTime, "owed"));
  const f = t.proc("forger", NONE), fs = memStore(f, A.held) as any;
  const prefixA = (A.account(f) as any).db.prefix;
  const forged = await outcome(fs.commit("joined:r9", "lazy/join", [fact(prefixA + "act10-forged", "act10/x", 1), fact(String(rb.txId), "act10/x", 1)], await fs.head(), context));
  const a = await outcome(A.account(t.proc("pa2", NONE)).publish("r9", W0.R2.doc, validTime, "owed") as any);
  const out = { bTx: rb.txId, forged, a, aGetsForged: a.ok && (a as any).txId === (forged as any).txId };
  console.log("[W3] " + JSON.stringify(out));
  // [DX-ACT8, fifth round] Fixed (Z6): the forged record is never returned as A's Publish.
  assert((forged as any).ok, "the forged record landed");
  assert(!out.aGetsForged, "a record that also writes another transaction's journal entity is not A's own");
});

// ------------------------------------------------------ (2) the archive's fold against an independent oracle, W4
/** A release from a pool of notice policies: `ids` chosen policies (with their forms), some renamed, some forms' due
 * days changed (the item's payload changes, its ID does not). */
function fromPool(pool: W0.ReleaseDoc, ids: readonly string[], renames: ReadonlyMap<string, string>, due: ReadonlyMap<string, number>) {
  const byId = new Map(pool.policies!.map((p) => [p.id, p]));
  const forms = new Map(pool.forms!.map((f) => [f.id, f]));
  const policies = ids.map((id) => ({ ...byId.get(id)!, id: renames.get(id) ?? id }));
  const used = [...new Set(ids.map((id) => byId.get(id)!.form))].sort();
  const doc = { ...pool, forms: used.map((f) => ({ ...forms.get(f)!, ...(due.has(f) ? { dueBusinessDays: due.get(f)! } : {}) })), policies };
  W0.compileRelease(doc as never);
  return doc as W0.ReleaseDoc;
}

test("W4: random retire, re-add, rename and payload changes over many releases, settings turned on mid-history, settlers of every mode killed at random: the fold is exact", async () => {
  const seeds = Number(process.env.W4_SEEDS ?? 6), releases = Number(process.env.W4_RELEASES ?? 12), from = Number(process.env.W4_FROM ?? 0);
  const rows: Record<string, unknown>[] = [];
  let failures = 0, stopped = 0;
  for (let seed = from; seed < from + seeds; seed++) {
    const r = rng(41000 + seed);
    const t = await setup(["acct-a"], 4);
    const pool = tagged(240, "w");
    const all = pool.policies!.map((p) => p.id);
    const renames = new Map<string, string>(), due = new Map<string, number>();
    let turnedOn = -1, kills = 0, settles = 0, stop: string | undefined, maxParts = 0;
    const modes: (undefined | "whole" | "parts")[] = [undefined, "whole", "parts"];
    releasesLoop: for (let k = 0; k < releases; k++) {
      // Before release `on`, publishers and settlers are allowed nothing and name `whole` or nothing (whole ledgers);
      // from then on a permitted publisher (its first Publish turns the settings on) and settlers of every mode.
      const on = 3;
      const size = k < on ? 8 + r.int(25) : 20 + r.int(200);
      const ids = [...all].sort(() => r.next() - 0.5).slice(0, size).sort();
      for (const id of ids) if (r.next() < 0.08) renames.set(id, id + "-r" + k);
      for (const f of new Set(ids.map((id) => pool.policies!.find((p) => p.id === id)!.form))) if (r.next() < 0.1) due.set(f, 1 + r.int(9));
      const doc = fromPool(pool, ids, renames, due);
      const publisher = t.proc("pub-" + k, k >= on ? { ...NONE, ledgerCap: true, frameGuards: r.next() < 0.5 } : NONE);
      const pr = await publish(t, publisher, "w" + k, doc);
      assert(pr.ok, "release " + k + " publishes: " + JSON.stringify(pr));
      if (k >= on && turnedOn < 0 && (await settingsOf(t))) turnedOn = k;
      const tail = await tailOf(t);
      for (let attempt = 0; ; attempt++) {
        const mode = k < on ? (r.next() < 0.5 ? undefined : "whole") : modes[r.int(3)];
        const p = t.proc("settle-" + k + "-" + attempt, NONE);
        if (attempt < 3 && r.next() < 0.5) { p.killAfter = 5 + r.int(120); p.lostReply = r.next() < 0.5; }
        settles++;
        const res = await new RecordedNotices(noticeArchive(t, p, "settle-" + k + "-" + attempt), mode).record(tail)
          .then(() => "recorded", (e) => (e instanceof Killed ? "killed" : String(e?.constructor?.name) + ": " + String(e?.message).split("\n")[0]!.slice(0, 120)));
        if (res === "recorded") break;
        if (res === "killed") { kills++; continue; }
        // [DX-ACT8, fifth round] Any stop is a failure (Z1 fixed): counted, and this seed ends here.
        stop = "release " + k + " (" + size + " policies): " + res.slice(0, 120); stopped++; break releasesLoop;
      }
    }
    if (stop) { rows.push({ seed, turnedOn, settles, kills, stop }); continue; }
    const o = await oracle(t);
    const ok = o.noticesEqual && o.subjects.every((s) => s.fullEqual && s.liveIsInForce) && turnedOn >= 0;
    if (!ok) failures++;
    for (const s of o.subjects) maxParts = Math.max(maxParts, s.parts);
    rows.push({ seed, turnedOn, settles, kills, notices: o.notices, ok, maxParts, subjects: o.subjects.map((s) => [s.everHeld, s.inForce, s.ledger, s.parts, s.archived]) });
  }
  const totals = rows.reduce((n: any, x: any) => ({ notices: n.notices + (x.notices ?? 0), kills: n.kills + x.kills, settles: n.settles + x.settles }), { notices: 0, kills: 0, settles: 0 });
  console.log("[W4] " + JSON.stringify({ seeds, from, releases, failures, stopped, totals, rows }));
  assert.equal(stopped, 0, "no history stops the recorder");
  assert.equal(failures, 0);
});

// ------------------------------------------------------------------------- (2) a subject at the per-release cap, W5
test("W5: a subject at the per-release cap: two disjoint releases at the cap, then the first again; every event records exactly", async () => {
  const t = await setup(["acct-a"], 2);
  const publisher = t.proc("publisher", ALL);
  const n = Number(process.env.W5_POLICIES ?? 1590);
  const steps: Record<string, unknown>[] = [];
  for (const [id, doc] of [["a", tagged(n, "a")], ["b", tagged(n, "b")], ["a-again", tagged(n, "a")], ["over", tagged(n + 40, "o")]] as const) {
    const r = await publish(t, publisher, id, doc);
    const recorded = r.ok ? await recordNotices(t, "settler-" + id, NONE, undefined, await tailOf(t)) : "not published";
    steps.push({ id, published: r.ok, ...(r.ok ? {} : { error: r.error }), recorded });
  }
  const o = await oracle(t);
  console.log("[W5] " + JSON.stringify({ policies: n, steps, notices: o.notices, noticesEqual: o.noticesEqual, subjects: o.subjects }));
  assert(steps.slice(0, 3).every((s) => s.published && s.recorded === "recorded"));
  assert(o.noticesEqual && o.subjects.every((s) => s.fullEqual && s.liveIsInForce));
});

// ------------------------------------------------- (1) a row the fence creates, read by a page-framed settler, W6
test("W6: the fence creates an owed release's first values row in the byte-frame form; a page-framed settler then settles it in byte frames", async () => {
  const run = async (transition: boolean) => {
    const t = await setup(["acct-a"], 8);
    const A = t.x;
    const valuesArchive = (label: string, frames: "pages" | "bytes") => {
      const p = t.proc(label, NONE);
      return new (Archive as any)(A.account(p), memStore(p, A.held, t.db.scope + "-v-" + label), new BulkQueue(1), "values", frames, "progress") as Archive;
    };
    // R1's values settled in pages (the settler's framing when TX2_SETTLE_FRAMES is unset), then R2 published.
    const r1 = await valuesArchive("v1", "pages").runValues(1);
    assert((await publish(t, t.proc("pub-r2", NONE), "r2", W0.R2.doc)).ok);
    if (transition) await ensureSettings(A.store(t.proc("upgrader", { ...NONE, ledgerCap: true })));
    const before = await valuesArchive("peek", "pages").values(2);
    const r2 = await valuesArchive("v2", "pages").runValues(2).then((x: any) => x, (e: any) => ({ error: String(e?.message).slice(0, 140) }));
    return { r1: { status: r1.status, frames: (r1 as any).frames ?? "pages" }, rowBefore: before?.value ?? null,
      r2: { status: r2.status, frames: r2.frames ?? "pages", changes: r2.changes, through: r2.through, error: r2.error } };
  };
  const plain = await run(false), fenced = await run(true);
  console.log("[W6] " + JSON.stringify({ plain, fenced }));
  assert.equal(plain.r2.frames, "pages");
  assert.equal(fenced.r2.status, "stored");
  assert.equal(fenced.r2.changes, plain.r2.changes, "the same values either way");
  assert.equal(fenced.r2.frames, "bytes", "the release a page-framed settler stores is in byte frames after the fence");
});

// ------------------------------------------------------- (1) a transition starved by frames, W7
test("W7: a permitted publisher whose transitions are refused by frames waits, then either turns the settings on (the cap refuses) or refuses its Publish, retryable; the release over the cap never publishes (Z2 fixed)", async () => {
  const t = await setup(["acct-a"], 256);
  const A = t.x;
  // A pending owed release whose values frames (pages of four subjects) write its progress row, which every transition fences.
  assert((await publish(t, t.proc("pub-r2", NONE), "r2", W0.R2.doc)).ok);
  const p = t.proc("values-settler", NONE);
  const values = new (Archive as any)(A.account(p), memStore(p, A.held, t.db.scope + "-v-busy"), new BulkQueue(1), "values", "pages", "progress") as Archive;
  let frames = 0, transitions = 0;
  t.db.beforeCommit = async (id) => {
    if (!id.startsWith("account-settings:")) return;
    transitions++;
    const r = await values.turn(2).catch(() => undefined);
    if (r) frames++;
  };
  const over = await publish(t, t.proc("publisher", { ...NONE, ledgerCap: true }), "over", tagged(1700, "o"));
  t.db.beforeCommit = undefined;
  const settingsAfter = await settingsOf(t);
  // With no one busy, the next permitted Publish turns the settings on; the over-cap release's notices then cannot record.
  const next = await publish(t, t.proc("publisher-2", { ...NONE, ledgerCap: true }), "r3", W0.R2.doc);
  // The over-cap release offered again, now that the settings are on: the cap refuses it.
  const overAgain = await publish(t, t.proc("publisher-3", { ...NONE, ledgerCap: true }), "over", tagged(1700, "o"));
  const notices = await recordNotices(t, "settler", NONE, undefined, await tailOf(t));
  const out = { transitionsTried: transitions, framesBetween: frames, over, settingsAfterOver: settingsAfter ?? null, next, overAgain, settings: await settingsOf(t), notices };
  console.log("[W7] " + JSON.stringify(out));
  // [DX-ACT8, fifth round] Fixed (Z2): the permitted Publish waits and tries again (four rounds of eight tries). Here the
  // values release runs out of frames while it waits, so its transition lands and the cap refuses the release; had every
  // try been refused it would have been refused, retryable, writing nothing (round5.test.ts R5-4). Either way the
  // release over the cap never publishes.
  assert(transitions >= 8 && !over.ok, "the over-cap release did not publish");
  assert.match((over as any).error, /Publish refused for now|Release refused: one subject could owe/);
  assert(settingsAfter === undefined ? /Publish refused for now/.test((over as any).error) : settingsAfter.ledgerCap === true);
  assert(next.ok && (await settingsOf(t))?.ledgerCap === true, "the next permitted Publish turned the settings on");
  assert(!overAgain.ok && /Release refused|owe|parts/i.test((overAgain as any).error), "the cap refuses the release");
  assert.equal(notices, "recorded");
});

// ------------------------------------------------- (2) a ledger that shrinks from parts to one part, W8
test("W8: under the archive a subject's ledger shrinks from parts to what one part holds: it stays in parts, and every size records (Z1 fixed)", async () => {
  const results: Record<string, unknown>[] = [];
  for (const n of [120, 140, 150, 155, 160, 163, 166]) {
    const t = await setup(["acct-a"], 2);
    const publisher = t.proc("publisher", ALL);
    const big = await publish(t, publisher, "big", tagged(260, "b" + n));
    const first = await recordNotices(t, "settler-big", NONE, undefined, await tailOf(t));
    const peek = t.x.store(t.proc("peek", NONE));
    const ndb = new Documents(peek.comp, "settlement-notices" + namesOf(peek).documents);
    const roster = [W0.placementId(0), W0.placementId(1)];
    const partsBefore = (await readLedgers(ndb, roster, await peek.head())).get(roster[0]!)!.parts.length;
    const small = await publish(t, publisher, "small", tagged(n, "s" + n));
    const second = await recordNotices(t, "settler-small", NONE, undefined, await tailOf(t));
    const again = second === "recorded" ? "-" : await recordNotices(t, "settler-small-2", NONE, "parts", await tailOf(t));
    const partsAfter = (await readLedgers(ndb, roster, await peek.head())).get(roster[0]!)!.parts.length;
    const o = await oracle(t);
    results.push({ policies: n, big: big.ok, first, partsBefore, small: small.ok, second, again, partsAfter, exact: o.noticesEqual && o.subjects.every((s) => s.fullEqual && s.liveIsInForce) });
  }
  console.log("[W8] " + JSON.stringify(results));
  // [DX-ACT8, fifth round] Fixed (Z1): every size records at the first try, the ledger stays in parts (one part up to
  // 163 policies, two at 166), exact.
  assert(results.every((r) => r.big && r.small && r.first === "recorded" && r.second === "recorded" && r.partsBefore === 2 &&
    (r.partsAfter === 1 || r.partsAfter === 2) && r.exact), "every shrink records");
  assert(results.some((r) => r.partsAfter === 1), "a ledger in parts that shrinks to one part stays in parts");
});

// ------------------------------------------- (3) the random enrolment ID: kills at every step, two at once, W9
test("W9: an enrolment killed at every step (reply lost or not), then enrolled again; and two enrolments of one account at once: one record each time", async () => {
  const enrolmentRecords = async (db: MemDb, account: string) =>
    ((await db.comp.feedPage(0, 1_000_000)).transactions as any[]).filter((x) => String(x.commandId).startsWith("join-held-enrolment:" + account)).length;
  const kills: Record<string, unknown>[] = [];
  let k = 0;
  for (; k < 200; k++) {
    const db = new MemDb("act10-r4-enrol-" + k + "-" + process.pid, 9000 + k);
    db.maxYield = 0;
    const cut = await seedAccount(db, "acct-a", 4);
    const held = heldAccount("acct-a", 4, cut);
    const p = new Proc(db, "enrol-killed");
    p.permits = NONE;
    p.killAfter = k;
    p.lostReply = k % 2 === 1;
    const first = await new JoinedAccount(memStore(p, held) as any).installHeld(validTime).then(() => "enrolled", (e) => (e instanceof Killed ? "killed" : "error: " + String(e?.message).slice(0, 80)));
    const q = new Proc(db, "enrol-again");
    q.permits = NONE;
    const second = await new JoinedAccount(memStore(q, held) as any).installHeld(validTime).then(() => "enrolled", (e) => "error: " + String(e?.message).slice(0, 80));
    const records = await enrolmentRecords(db, "acct-a");
    kills.push({ killAfter: k, lostReply: p.lostReply, first, second, records });
    if (first === "enrolled") break;
  }
  const concurrent: Record<string, unknown>[] = [];
  for (let seed = 0; seed < 40; seed++) {
    const db = new MemDb("act10-r4-enrol2-" + seed + "-" + process.pid, 9500 + seed);
    db.maxYield = 3;
    const cut = await seedAccount(db, "acct-a", 4);
    const held = heldAccount("acct-a", 4, cut);
    const go = (name: string) => {
      const p = new Proc(db, name);
      p.permits = NONE;
      return new JoinedAccount(memStore(p, held) as any).installHeld(validTime).then(() => "enrolled", (e) => "error: " + String(e?.message).slice(0, 80));
    };
    const both = await Promise.all([go("enrol-x"), go("enrol-y")]);
    concurrent.push({ seed, both, records: await enrolmentRecords(db, "acct-a") });
  }
  const bad = kills.filter((x) => x.second !== "enrolled" || x.records !== 1).concat(concurrent.filter((x) => x.records !== 1 || (x.both as string[]).some((b) => b !== "enrolled")));
  console.log("[W9] " + JSON.stringify({ killPoints: kills.length, lastKillPoint: k, concurrentPairs: concurrent.length, bad: bad.slice(0, 6), badCount: bad.length }));
  assert.equal(bad.length, 0);
});

test("W8b: after a ledger of ten parts, small releases record: the closing piece is the retractions and a head (Z1 fixed)", async () => {
  const results: Record<string, unknown>[] = [];
  for (const n of [20, 60, 100, 120, 140, 150, 166]) {
    const t = await setup(["acct-a"], 1);
    const publisher = t.proc("publisher", ALL);
    await publish(t, publisher, "big", tagged(1590, "x" + n));
    const first = await recordNotices(t, "settler-big", NONE, undefined, await tailOf(t));
    await publish(t, publisher, "small", tagged(n, "y" + n));
    const second = await recordNotices(t, "settler-small", NONE, undefined, await tailOf(t));
    const o = await oracle(t);
    results.push({ policies: n, first, second: second === "recorded" ? "recorded" : second.slice(0, 90), exact: o.noticesEqual && o.subjects.every((s) => s.fullEqual && s.liveIsInForce) });
  }
  console.log("[W8b] " + JSON.stringify(results));
  // [DX-ACT8, fifth round] Fixed (Z1).
  assert(results.every((r) => r.first === "recorded" && r.second === "recorded" && r.exact));
});

test("W8c: probe, which releases after a ledger of K parts stop the recorder (diagnostic map)", { skip: process.env.W8C !== "1" }, async () => {
  const out: Record<string, unknown>[] = [];
  for (const [bigN, smalls] of [[1590, [0, 1, 5, 10, 20, 40, 60, 80, 90]], [700, [0, 1, 20, 60, 100]], [260, [0, 1, 20, 60, 100, 150, 160]]] as const) {
    for (const n of smalls) {
      const t = await setup(["acct-a"], 1);
      const publisher = t.proc("publisher", ALL);
      await publish(t, publisher, "big", tagged(bigN, "x" + bigN + "v" + n));
      const first = await recordNotices(t, "settler-big", NONE, undefined, await tailOf(t));
      await publish(t, publisher, "small", n === 0 ? W0.R2.doc : tagged(n, "y" + bigN + "v" + n));
      const second = await recordNotices(t, "settler-small", NONE, undefined, await tailOf(t));
      out.push({ big: bigN, small: n === 0 ? "R2" : n, first, second: second === "recorded" ? "recorded" : "STOP" });
    }
  }
  console.log("[W8c] " + JSON.stringify(out));
});

test("W8d: diagnostic, the closing piece of the stopping case priced by the writer's own estimate", { skip: process.env.W8D !== "1" }, async () => {
  const { frameEstimate } = await import("../actv-lazy/join/frames.ts");
  const { ledgerChange, readLedgers: rl } = await import("../actv-lazy/join/ledger-parts.ts");
  const rows: Record<string, unknown>[] = [];
  for (const [bigTag, smallTag, n] of [["x20", "y20", 20], ["x1590v20", "y1590v20", 20], ["x60", "y60", 60]] as const) {
    const t = await setup(["acct-a"], 1);
    const publisher = t.proc("publisher", ALL);
    await publish(t, publisher, "big", tagged(1590, bigTag));
    await recordNotices(t, "settler-big", NONE, undefined, await tailOf(t));
    await publish(t, publisher, "small", tagged(n, smallTag));
    const second = await recordNotices(t, "settler-small", NONE, undefined, await tailOf(t));
    const peek = t.x.store(t.proc("peek", NONE));
    const ndb = new Documents(peek.comp, "settlement-notices" + namesOf(peek).documents);
    const s = W0.placementId(0), head = await peek.head();
    const old = (await rl(ndb, [s], head)).get(s)!;
    const o = await oracle(t);
    // The items in force after the small release, from the kernel's fold (the oracle's state).
    const live = (await (async () => { const st = new Map<string, W0.ItemState[]>(); return st; })());
    void live;
    const cursor = await ndb.row<any>("notice-progress", head);
    const inForce = o.subjects[0]!.inForce;
    rows.push({ bigTag, n, second: second.slice(0, 70), oldParts: old.parts.length, oldChars: old.parts.reduce((k, r) => k + r.value.length, 0), cursor: cursor?.value && { event: cursor.value.event, part: cursor.value.part, start: cursor.value.start }, inForce });
    // Price a closing piece: retract the old parts, replace the head with a packed ledger of `inForce` synthetic items.
    const items = Array.from({ length: inForce }, (_, i) => ({ id: "pol:" + smallTag + String(i).padStart(3, "0"), payload: "{\"due\":\"2026-01-01\",\"form\":\"form:" + smallTag + "\"}", retired: false, seq: 1n, subject: s })) as any;
    const change = ledgerChange(ndb, s, 9, old, items);
    const cursorOps = cursor ? [{ op: "retract" as const, id: cursor.id }, ndb.put("notice-progress", cursor.value)] : [];
    (rows.at(-1) as any).closingOps = change.closing.length;
    (rows.at(-1) as any).estimate = frameEstimate([...change.closing, ...cursorOps]);
  }
  console.log("[W8d] " + JSON.stringify(rows, (_k, v) => (typeof v === "bigint" ? String(v) : v)));
});

// ------------------------------------------- (4) U2 for an account whose ledgers are whole and large at its first setting
test("W10: ledgers whole and near the whole limit (retired items kept) when the first setting lands; settlers naming whole continue: exact", async () => {
  const out: Record<string, unknown>[] = [];
  for (const c of [90, 200]) {
    const t = await setup(["acct-a"], 2);
    // Before any setting: two disjoint releases of 90 policies recorded whole (the second keeps the first's 90 retired
    // items in the ledger: about 11,000 of the 11,771 characters a whole ledger may hold).
    for (const tag of ["wa", "wb"]) {
      assert((await publish(t, t.proc("pub-" + tag, NONE), tag, tagged(90, tag + c))).ok);
      assert.equal(await recordNotices(t, "s-" + tag, NONE, "whole", await tailOf(t)), "recorded");
    }
    const before = (await oracle(t)).subjects.map((s) => ({ ledger: s.ledger, parts: s.parts }));
    // The first setting, by a publisher allowed the cap; then settlers naming whole (U2) record a third, disjoint release.
    assert((await publish(t, t.proc("pub-c", { ...NONE, ledgerCap: true }), "wc", tagged(c, "wc" + c))).ok);
    const third = await recordNotices(t, "s-c", NONE, "whole", await tailOf(t));
    assert((await publish(t, t.proc("pub-r2", NONE), "r2", W0.R2.doc)).ok);
    const fourth = await recordNotices(t, "s-r2", NONE, "whole", await tailOf(t));
    const o = await oracle(t);
    out.push({ third: c, before, settings: await settingsOf(t), recorded: [third, fourth], noticesEqual: o.noticesEqual, subjects: o.subjects.map((s) => ({ fullEqual: s.fullEqual, liveIsInForce: s.liveIsInForce, ledger: s.ledger, archived: s.archived })) });
  }
  console.log("[W10] " + JSON.stringify(out));
  assert(out.every((x: any) => x.recorded.every((r: string) => r === "recorded") && x.noticesEqual && x.subjects.every((s: any) => s.fullEqual && s.liveIsInForce)));
});
