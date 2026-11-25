// [DX-ACT10, third review] Attacks on the stored settings and the fixes at 2084d3ba7, real code over memstore.ts (in
// process, diagnostic only). Run: node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/review3.test.ts
// [DX-ACT8, third review fixes] Each test's scenario is the reviewer's, unchanged; its assertions now state the fixed
// behaviour (U2 T1, U6 T3, U5 T4 and T5, U4 T6, U7 T7, U3 T9 and T10). T8 (U8) still states the finding: a Publish's ID
// is closed by the gateway's account claims, not on this branch (PUBLISH-BESIDE-SAVES.md section 0.10).
import assert from "node:assert/strict";
import { test } from "node:test";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { JoinedAccount, scopedJoinedId } from "../actv-lazy/join/account.ts";
import { ensureSettings, forgetSettled, type Permits } from "../actv-lazy/join/account-settings.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { SettlementControl, setSettlementControl } from "../actv-lazy/join/settlement-control.ts";
import { fact, namesOf, value } from "../actv-lazy/store.ts";
import { heldAccount, MemDb, memStore, Proc, seedAccount } from "./memstore.ts";

const validTime = W0.POPULATION_VALID_TIME;
const NONE: Permits = { accountKeys: false, frameGuards: false, ledgerCap: false };
let serial = 0;
process.env.TX2_PUBLISH_BESIDE = "1";
process.env.TX2_ENROL_BESIDE_SAVES = "1";
for (const k of ["TX2_ACCOUNT_KEYS", "TX2_SETTLE_FRAME_GUARDS", "TX2_LEDGER_CAP_AT_PUBLISH", "TX2_NOTICE_LEDGER", "TX2_RELEASE_DOCS"]) delete process.env[k];

/** Held accounts in one fresh database, each enrolled and with R1 published by a process allowed nothing. */
async function setup(names = ["acct-a"]) {
  const db = new MemDb("act10-r3-" + ++serial + "-" + process.pid, serial);
  db.maxYield = 0;
  const proc = (name: string, permits: Permits, oldBuild = false) => {
    const p = new Proc(db, name);
    p.permits = permits;
    p.oldBuild = oldBuild;
    return p;
  };
  const accounts = [];
  for (const name of names) {
    const cut = await seedAccount(db, name, 4);
    const held = heldAccount(name, 4, cut);
    const account = (p: Proc) => new JoinedAccount(memStore(p, held) as any);
    await account(proc("enrol-" + name, NONE)).installHeld(validTime);
    await account(proc("first-" + name, NONE)).publish(name + ":r1", W0.R1.doc, validTime, "owed");
    accounts.push({ name, held, account, store: (p: Proc) => memStore(p, held) as any });
  }
  return { db, proc, accounts, x: accounts[0]! };
}
type Setup = Awaited<ReturnType<typeof setup>>;
const outcome = (p: Promise<{ position: number; txId: string }>) =>
  p.then((r) => ({ ok: true, position: r.position, txId: r.txId }), (e) => ({ ok: false, error: String(e?.message).split("\n")[0]!.slice(0, 110) }));
const settingsOf = async (t: Setup, x = t.x) => {
  const s = x.store(t.proc("peek", NONE));
  return (await s.controls(await s.head())).settings;
};
const releasesOf = async (t: Setup, x = t.x) => {
  const s = x.store(t.proc("peek", NONE));
  return (await s.controls(await s.head())).releases.length;
};
const tailOf = async (t: Setup, x = t.x) => (await x.account(t.proc("peek", NONE)).notices.observe()).value.sequence;
/** Records the account's notices through `through` with one settling process (ledger mode named or not). */
async function recordNotices(t: Setup, label: string, permits: Permits, ledger: "whole" | "parts" | undefined, through: number, oldBuild = false) {
  const p = t.proc(label, permits, oldBuild);
  const a = t.x.account(p);
  const n = new (Archive as any)(a, memStore(p, t.x.held, t.db.scope + "-n-" + label), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
  return new RecordedNotices(n, ledger).record(through).then(() => "recorded", (e) => String(e?.constructor?.name) + ": " + String(e?.message).split("\n")[0]!.slice(0, 110));
}
/** A large release whose forms and notice policies carry `tag` in their IDs (distinct policies across releases). */
function tagged(n: number, tag: string, base = W0.R1.doc) {
  const d = largeRelease(base, parseShape("forms=" + n + ",policies=" + n + ",permille=1000"));
  const fix = (s: string) => s.replace(/^form:f/, "form:" + tag).replace(/^pol:p/, "pol:" + tag);
  const doc = { ...d, forms: d.forms!.map((f) => ({ ...f, id: fix(f.id) })), policies: d.policies!.map((p) => ({ ...p, id: fix(p.id), form: fix(p.form) })) };
  W0.compileRelease(doc as never);
  return doc as W0.ReleaseDoc;
}
/** Lands `f` once, between the first matching commit's read and its commit. */
function landBefore(db: MemDb, prefix: string, f: () => Promise<unknown>) {
  const fired = { done: false };
  db.beforeCommit = async (id) => {
    if (fired.done || !id.startsWith(prefix)) return;
    fired.done = true;
    await f();
  };
  return fired;
}
const journal = async (db: MemDb) => (await db.comp.feedPage(0, 1_000_000)).transactions as any[];

// ------------------------------------------------------------------------------------------ (a) the settings themselves
test("T1 (U2 fixed): the first transition stores parts and the archive whatever the permitted process names; nothing is locked", async () => {
  const t = await setup();
  // Before any setting, as every gate ran: a 400-policy release by reference, its notices recorded in parts.
  const big = await outcome(t.x.account(t.proc("pub0", NONE)).publish("big", tagged(400, "h"), validTime, "owed", undefined, { docs: "ref" }));
  const before = await recordNotices(t, "settler-parts-0", NONE, "parts", await tailOf(t));
  await t.x.account(t.proc("pub1", NONE)).publish("r2", W0.R2.doc, validTime, "owed");
  const pending = await tailOf(t);
  // The first permitted process: a publisher allowed the ledger cap, naming no ledger mode (a publisher never needed one).
  await ensureSettings(t.x.store(t.proc("upgrader", { ...NONE, ledgerCap: true })));
  const stored = await settingsOf(t);
  const settlerNamingNone = await recordNotices(t, "settler-none", NONE, undefined, pending);
  const settlerNamingParts = await recordNotices(t, "settler-parts", NONE, "parts", pending);
  const publishNoPolicies = await outcome(t.x.account(t.proc("pub2", NONE)).publish("r3", W0.R2.doc, validTime, "owed"));
  // The way out: a permitted process naming parts moves the mode (whole to parts is allowed).
  await ensureSettings(t.x.store(t.proc("fixer", { ...NONE, ledgerCap: true, ledger: "parts" })));
  const afterFix = { settings: await settingsOf(t), publish: await outcome(t.x.account(t.proc("pub3", NONE)).publish("r4", W0.R2.doc, validTime, "owed")),
    notices: await recordNotices(t, "settler-none-2", NONE, undefined, await tailOf(t)) };
  const out = { big: big.ok, before, stored, settlerNamingNone, settlerNamingParts, publishNoPolicies, afterFix };
  console.log("[T1] " + JSON.stringify(out));
  assert.equal(stored?.ledger, "parts");
  assert.equal(stored?.archive, true);
  assert.equal(settlerNamingNone, "recorded");
  assert.equal(settlerNamingParts, "recorded");
  assert(publishNoPolicies.ok, "a release adding no notice policy publishes");
  assert(afterFix.publish.ok && afterFix.notices === "recorded");
});

test("T2: two processes turning on different settings at once", async () => {
  const t = await setup();
  const fired = landBefore(t.db, "account-settings:", () => ensureSettings(t.x.store(t.proc("second", { ...NONE, frameGuards: true, ledger: "parts" }))));
  await ensureSettings(t.x.store(t.proc("first", { ...NONE, accountKeys: true })));
  t.db.beforeCommit = undefined;
  const transitions = (await journal(t.db)).filter((x) => x.actor === "lazy/settings").length;
  const out = { fired: fired.done, settings: await settingsOf(t), transitions };
  console.log("[T2] " + JSON.stringify(out));
  assert(out.settings?.accountKeys && out.settings?.frameGuards && out.settings?.ledger === "parts" && out.settings?.archive);
});

test("T3 (U6 fixed): the origin written directly: the permitted process turns the settings on again at its next plan; a second live origin row", async () => {
  // (i) A writer that rewrites the origin without its settings (as a restore to before the transition also does).
  const t = await setup();
  const up = t.proc("upgrader", { ...NONE, accountKeys: true, frameGuards: true });
  const A = t.x.account(up);
  const r2 = await A.publish("r2", W0.R2.doc, validTime, "owed"); // turns the settings on, then publishes scoped
  const s = t.x.store(t.proc("writer", NONE));
  const p = await s.head(), origin = (await s.controls(p)).origin;
  const { settings, ...rest } = value(origin);
  await s.commit("origin-rewrite:" + serial, "test", [{ op: "retract", id: origin.id }, fact(namesOf(s).ORIGIN, "lazy/generation", rest)], p);
  const afterOff = await settingsOf(t);
  // The permitted process has seen the settings on (its per-process cache): it does not turn them on again.
  const r3 = await A.publish("r3", W0.R2.doc, validTime, "owed");
  const stillOff = await settingsOf(t);
  const r3Key = (await journal(t.db)).find((x) => x.position === r3.position)?.commandId;
  // A fresh permitted process (a new Node process: an empty cache) does.
  forgetSettled();
  await t.x.account(t.proc("fresh-upgrader", { ...NONE, accountKeys: true, frameGuards: true })).publish("r4", W0.R2.doc, validTime, "owed");
  const freshOn = await settingsOf(t);
  // (ii) A second live origin row (one more fact, no retraction).
  const u = await setup();
  const w = u.x.store(u.proc("writer", NONE));
  const q = await w.head(), o2 = (await w.controls(q)).origin;
  await w.commit("origin-extra:" + serial, "test", [fact(namesOf(w).ORIGIN, "lazy/generation", value(o2))], q);
  const second = await outcome(u.x.account(u.proc("publisher", NONE)).publish("r2", W0.R2.doc, validTime, "owed"));
  const out = { stored: settings, afterOff: afterOff ?? "none", r2Scoped: (await journal(t.db)).find((x) => x.position === r2.position)?.commandId,
    r3Key, stillOff: stillOff ?? "none", freshOn: freshOn ?? "none", secondOriginRow: second,
    r2ResendAfterOff: await outcome(t.x.account(t.proc("resender", NONE)).publish("r2", W0.R2.doc, validTime, "owed")).then((x: any) => x.txId === r2.txId) };
  console.log("[T3] " + JSON.stringify(out));
  assert.equal(afterOff, undefined);
  assert(stillOff && (stillOff as any).accountKeys && (stillOff as any).frameGuards, "the permitted process turns them on again (no cache)");
  assert(String(r3Key).startsWith("joined:v2"), "r3 is published under the scoped form");
  assert(!second.ok, "a second live origin row refuses the account's guarded Publish");
  assert.equal(out.r2ResendAfterOff, true);
});

// ------------------------------------------------------------------------------------------- (b) the old build's window
test("T4 (U5 fixed): an old build's Publish planned before a ledgerCap transition is refused at its commit; notices record; the next Publish lands", async () => {
  const t = await setup();
  const old = t.x.account(t.proc("old-build", NONE, true));
  landBefore(t.db, "joined:", () => ensureSettings(t.x.store(t.proc("upgrader", { ...NONE, ledgerCap: true, ledger: "parts" }))));
  const over = await outcome(old.publish("over", tagged(1700, "o"), validTime, "owed", undefined, { docs: "ref" }));
  t.db.beforeCommit = undefined;
  const settings = await settingsOf(t);
  const notices = await recordNotices(t, "settler", NONE, undefined, await tailOf(t));
  const next = await outcome(t.x.account(t.proc("new-build", NONE)).publish("r3", W0.R2.doc, validTime, "owed"));
  const out = { over, settings, releases: await releasesOf(t), notices, nextPublishNoPolicies: next };
  console.log("[T4] " + JSON.stringify(out));
  assert(!over.ok && settings?.ledgerCap);
  assert.equal(out.releases, 2, "R1 and the new build's r3: the old build's release over the cap never landed");
  assert.equal(notices, "recorded");
  assert(next.ok);
});

test("T5 (U5 fixed): an old build's frame planned before a frameGuards transition is refused; nothing lands after the acknowledged pause", async () => {
  const t = await setup();
  await t.x.account(t.proc("pub", NONE)).publish("large", largeRelease(W0.R1.doc, parseShape("forms=20,policies=20,permille=1000")), validTime, "owed");
  const p = t.proc("old-settler", NONE, true);
  const a = t.x.account(p);
  const queue = new BulkQueue(1);
  const values = new (Archive as any)(a, memStore(p, t.x.held, t.db.scope + "-v"), queue, "values", "bytes", "progress") as Archive;
  values.control = new SettlementControl(values.store, queue, values.turnKey());
  const op = memStore(t.proc("operator", NONE), t.x.held, t.db.scope + "-op") as any;
  let pause: number | undefined;
  landBefore(t.db, "settled-values:", async () => {
    await ensureSettings(t.x.store(t.proc("upgrader", { ...NONE, frameGuards: true })));
    pause = (await setSettlementControl(op, { paused: true, by: "act10" })).position;
  });
  const run = await values.runValues(2).then((x) => x.status, (e) => "refused: " + String(e?.message).split("\n")[0]!.slice(0, 80));
  t.db.beforeCommit = undefined;
  const after = (await journal(t.db)).filter((x) => x.position > pause! && /^settled-values:/.test(String(x.commandId))).length;
  const out = { pauseAt: pause, settings: await settingsOf(t), valueFramesAfterPause: after, oldSettler: run };
  console.log("[T5] " + JSON.stringify(out));
  assert.equal(after, 0, "no frame lands after the acknowledged pause");
  assert.match(run, /^refused/);
});

// ------------------------------------------------------------------------------------------- (c) R1's ownership rule
test("T6 (U4 fixed): a record that wrote documents of two accounts is neither account's Publish", async () => {
  const t = await setup(["acct-a", "acct-b"]);
  const [A, B] = t.accounts as [any, any];
  // Each account's correlation for r9 is computed from public inputs; here it is read off A's own first attempt, whose
  // request is lost before it reaches the transactor (no settings: the legacy intent, the same for every account).
  const pa = t.proc("publisher-a", NONE);
  const sa = A.store(pa);
  let context: any;
  const commit = sa.commit;
  sa.commit = async (...args: any[]) => {
    if (String(args[0]) === "joined:r9" && !context) { context = args[4]; throw new Error("request lost"); }
    return commit(...args);
  };
  const lost = await outcome(new JoinedAccount(sa).publish("r9", W0.R2.doc, validTime, "owed"));
  // One record under joined:r9 with one fact in each account's notice documents.
  const f = t.proc("forger", NONE), fs = memStore(f, B.held) as any;
  const prefixA = (A.account(f) as any).db.prefix, prefixB = (B.account(f) as any).db.prefix;
  const forged = await outcome(fs.commit("joined:r9", "lazy/join", [fact(prefixA + "act10-forged", "act10/x", 1), fact(prefixB + "act10-forged", "act10/x", 1)], await fs.head(), context));
  const a = await outcome(A.account(t.proc("pa2", NONE)).publish("r9", W0.R2.doc, validTime, "owed"));
  const b = await outcome(B.account(t.proc("pb2", NONE)).publish("r9", W0.R2.doc, validTime, "owed"));
  const out = { lost: lost.ok, forged, aGetsForged: a.ok && (a as any).txId === (forged as any).txId, bGetsForged: b.ok && (b as any).txId === (forged as any).txId,
    aReleases: await releasesOf(t, A), bReleases: await releasesOf(t, B) };
  console.log("[T6] " + JSON.stringify(out));
  assert(!out.aGetsForged && !out.bGetsForged);
  assert.equal(out.aReleases, 1);
  assert.equal(out.bReleases, 1);
});

test("T7 (U7 fixed): a record under the joined:<account>/<id> form of bf377c57f is found: the resend gets it", async () => {
  const t = await setup();
  // The record a bf377c57f process with TX2_ACCOUNT_KEYS=1 wrote: the Publish's own record under joined:acct-a/r2.
  const p = t.proc("bf377c57f-with-keys", NONE), s = t.x.store(p);
  const commit = s.commit;
  s.commit = (...args: any[]) => commit(String(args[0]) === "joined:r2" ? "joined:acct-a/r2" : args[0], ...args.slice(1));
  const first = await outcome(new JoinedAccount(s).publish("r2", W0.R2.doc, validTime, "owed"));
  // This build everywhere, the setting turned on, and the client's resend of r2 after a lost reply.
  const resend = await outcome(t.x.account(t.proc("upgrader", { ...NONE, accountKeys: true })).publish("r2", W0.R2.doc, validTime, "owed"));
  const forms = (await journal(t.db)).filter((x) => /(^|\/)r2$/.test(String(x.commandId)) && x.actor === "lazy/join").map((x) => x.commandId);
  const out = { first, resend, sameRecord: (first as any).txId === (resend as any).txId, releases: await releasesOf(t), records: forms };
  console.log("[T7] " + JSON.stringify(out));
  assert.equal(out.sameRecord, true);
  assert.equal(out.releases, 2);
});

// ------------------------------------------------------------------------------------------------------- (d) R3 as left
test("T8 (U8, open until the gateway's account claims): R3 per route with the setting on: what another account reads and denies", async () => {
  const t = await setup(["acct-a", "acct-b"]);
  const [A, B] = t.accounts as [any, any];
  const up = t.proc("a-publisher", { ...NONE, accountKeys: true });
  const big = largeRelease(W0.R1.doc, parseShape("forms=20,policies=20,permille=1000"));
  await A.account(up).publish("r1b", big, validTime, "owed");
  // Learn: B reads A's Publish record by its computed command ID; with full documents the record holds the release.
  const seen = await B.store(t.proc("b", NONE)).lookup(scopedJoinedId("acct-a", "r1b"));
  const bytes = Buffer.byteLength(JSON.stringify(seen?.changes ?? []));
  const readsForms = JSON.stringify(seen?.changes ?? []).includes("form:f");
  // Deny: B saves its own subject under A's next Publish ID first; A then offers it five times.
  const bs = B.store(t.proc("b-saver", NONE));
  const taken = await outcome(bs.commit(scopedJoinedId("acct-a", "r2"), "save", [fact(B.held.prefix + "act10-probe", ":act10/probe", 1)], await bs.head()));
  const tries = [];
  for (let k = 0; k < 5; k++) tries.push((await outcome(A.account(t.proc("a-" + k, NONE)).publish("r2", W0.R2.doc, validTime, "owed"))).ok);
  const out = { learn: { found: Boolean(seen), changes: seen?.changes.length, bytes, readsForms }, deny: { taken: taken.ok, aOffers: tries } };
  console.log("[T8] " + JSON.stringify(out));
  assert(out.learn.found && tries.every((x) => !x));
});

test("T9 (U3 fixed): another account saves first under the ID of an account's frame: the next runs record anyway", async () => {
  const out: Record<string, unknown> = {};
  for (const kind of ["values", "notice"] as const) {
    const t = await setup(["acct-a", "acct-b"]);
    const [A, B] = t.accounts as [any, any];
    await A.account(t.proc("pub", { ...NONE, accountKeys: true, frameGuards: true })).publish("large", largeRelease(W0.R1.doc, parseShape("forms=20,policies=20,permille=1000")), validTime, "owed");
    // The next frame's command ID is a hash of what the account's records and the code determine (archive.ts 323,
    // recorded.ts 251); here it is read off the settler's first attempt, whose request is lost before the transactor.
    let frameId = "";
    const prefix = kind === "values" ? "settled-values:" : "settled-notice:";
    t.db.beforeCommit = async (id) => {
      if (!frameId && id.startsWith(prefix)) { frameId = id; throw new Error("request lost"); }
    };
    const settle = async (label: string) => {
      const p = t.proc(label, NONE), a = A.account(p), queue = new BulkQueue(1);
      const archive = new (Archive as any)(a, memStore(p, A.held, t.db.scope + "-" + label), queue, kind === "values" ? "values" : "notices", "bytes", "progress") as Archive;
      const run = kind === "values" ? archive.runValues(2).then((x) => "values " + x.status)
        : new RecordedNotices(archive, undefined).record(await tailOf(t, A)).then(() => "notices recorded");
      return run.then((x) => x, (e) => "refused: " + String(e?.constructor?.name) + " " + String(e?.message).split("\n")[0]!.slice(0, 90));
    };
    const first = await settle("settler-1");
    t.db.beforeCommit = undefined;
    // B saves its own subject under that ID (any writer chooses its command ID).
    const bs = B.store(t.proc("b-saver", NONE));
    const taken = await outcome(bs.commit(frameId, "save", [fact(B.held.prefix + "act10-probe", ":act10/probe", 1)], await bs.head()));
    const runs = [await settle("settler-2"), await settle("settler-3"), await settle("settler-4")];
    out[kind] = { frameId: frameId.slice(0, 30), first, taken: taken.ok, laterRuns: runs };
  }
  console.log("[T9] " + JSON.stringify(out));
  for (const kind of ["values", "notice"]) {
    const o = out[kind] as any;
    assert(o.taken, kind + ": the ID of the lost attempt is taken");
    assert(!o.laterRuns[0].startsWith("refused"), kind + ": the next run records (frame IDs are random under accountKeys)");
  }
});

test("T10 (U3 fixed): another account saves first under an account's old enrolment command ID: the account enrols anyway", async () => {
  const t = await setup(["acct-b"]);
  const [B] = t.accounts as [any];
  // Account A is seeded but not enrolled yet; its enrolment's command ID is join-held-enrolment:<account> (account.ts 329).
  const cut = await seedAccount(t.db, "acct-a", 4);
  const heldA = heldAccount("acct-a", 4, cut);
  const bs = B.store(t.proc("b-saver", NONE));
  const taken = await outcome(bs.commit("join-held-enrolment:acct-a", "save", [fact(B.held.prefix + "act10-probe", ":act10/probe", 1)], await bs.head()));
  const tries = [];
  for (let k = 0; k < 3; k++)
    tries.push(await new JoinedAccount(memStore(t.proc("enrol-a-" + k, NONE), heldA) as any).installHeld(validTime)
      .then(() => "enrolled", (e) => "refused: " + String(e?.message).split("\n")[0]!.slice(0, 90)));
  const out = { taken: taken.ok, enrolments: tries };
  console.log("[T10] " + JSON.stringify(out));
  assert(out.taken && tries[0] === "enrolled", "the enrolment's ID carries a random part");
  assert(tries.every((x) => x === "enrolled"), "a second enrolment of the same account finds the first by reading it");
});
