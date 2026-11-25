// [DX-ACT8, second review] The stored settings across their transition (PUBLISH-BESIDE-SAVES.md section 0.8), real code
// over memstore.ts (in process, diagnostic only). Each transition is landed between a commit's read and its commit
// (`MemDb.beforeCommit`), the window a process's view can be stale in.
// Run: node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/settings.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { JoinedAccount, scopedJoinedId } from "../actv-lazy/join/account.ts";
import { ensureSettings, type Permits } from "../actv-lazy/join/account-settings.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { fact, namesOf, value } from "../actv-lazy/store.ts";
import { heldAccount, MemDb, memStore, Proc, seedAccount } from "./memstore.ts";

const validTime = W0.POPULATION_VALID_TIME;
const NONE: Permits = { accountKeys: false, frameGuards: false, ledgerCap: false };
let serial = 0;
process.env.TX2_PUBLISH_BESIDE = "1";
process.env.TX2_ENROL_BESIDE_SAVES = "1";
for (const k of ["TX2_ACCOUNT_KEYS", "TX2_SETTLE_FRAME_GUARDS", "TX2_LEDGER_CAP_AT_PUBLISH", "TX2_NOTICE_LEDGER"]) delete process.env[k];

/** One held account in a fresh database, enrolled, R1 published by a process allowed nothing (no settings stored). */
async function setup() {
  const db = new MemDb("act8-settings-" + ++serial + "-" + process.pid, serial);
  db.maxYield = 0;
  const cut = await seedAccount(db, "acct-a", 4);
  const held = heldAccount("acct-a", 4, cut);
  const proc = (name: string, permits: Permits, oldBuild = false) => {
    const p = new Proc(db, name);
    p.permits = permits;
    p.oldBuild = oldBuild;
    return p;
  };
  const account = (p: Proc) => new JoinedAccount(memStore(p, held) as any);
  await account(proc("enrol", NONE)).installHeld(validTime);
  const r1 = await account(proc("first", NONE)).publish("r1", W0.R1.doc, validTime, "owed");
  return { db, held, proc, account, r1 };
}
const journal = async (db: MemDb) => (await db.comp.feedPage(0, 1_000_000)).transactions as any[];
const settingsAt = async (x: Awaited<ReturnType<typeof setup>>) => {
  const s = memStore(x.proc("peek", NONE), x.held) as any;
  return (await s.controls(await s.head())).settings;
};
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

test("S1: a Publish planned before the accountKeys transition is refused at its commit and planned again under it", async () => {
  const x = await setup();
  const A = x.account(x.proc("publisher", NONE));
  const fired = landBefore(x.db, "joined:", () => ensureSettings(memStore(x.proc("upgrader", { ...NONE, accountKeys: true }), x.held) as any));
  const r2 = await A.publish("r2", W0.R2.doc, validTime, "owed");
  x.db.beforeCommit = undefined;
  const record = (await journal(x.db)).find((t) => t.position === r2.position);
  const out = { fired: fired.done, refused: A.beside.refused, commandId: record.commandId, settings: await settingsAt(x),
    releases: (await (A as any).s.controls(await (A as any).s.head())).releases.length };
  console.log("[S1] " + JSON.stringify(out));
  assert(out.fired && out.refused >= 1, "the transition landed inside the Publish and refused its first commit");
  assert.equal(out.commandId, scopedJoinedId("acct-a", "r2"), "planned again under the setting: the scoped key");
  assert.equal(out.releases, 2);
});

test("S2: a build from before the settings: its Publish planned before the transition is refused at its commit (the calendar fence), then it refuses the account; the resend publishes once", async () => {
  // [DX-ACT8, third review U5] The transition rewrites the account's calendar row, which every guarded Publish is guarded
  // on: the old build's plan made before it no longer lands after it (it did at 2084d3ba7, section 0.8's window).
  const x = await setup();
  const old = x.account(x.proc("old-build", NONE, true));
  landBefore(x.db, "joined:", () => ensureSettings(memStore(x.proc("upgrader", { ...NONE, accountKeys: true }), x.held) as any));
  const r2 = await old.publish("r2", W0.R2.doc, validTime, "owed").then((r) => r, (e) => String(String(e?.message).split("\n")[0]));
  x.db.beforeCommit = undefined;
  // The client resends through a process of this build (allowed nothing; it follows the stored setting).
  const resend = await x.account(x.proc("new-build", NONE)).publish("r2", W0.R2.doc, validTime, "owed");
  const again = await x.account(x.proc("new-build-2", NONE)).publish("r2", W0.R2.doc, validTime, "owed");
  const after = await old.publish("r3", W0.R2.doc, validTime, "owed").then(() => "published", (e) => String(String(e?.message).split("\n")[0]));
  const s = memStore(x.proc("peek", NONE), x.held) as any;
  const record = (await journal(x.db)).find((t) => t.position === resend.position);
  const out = { oldBuild: typeof r2 === "string" ? r2 : "landed at " + r2.position, settings: await settingsAt(x), resendAs: record.commandId,
    resendFoundAgain: again.txId === resend.txId, releases: (await s.controls(await s.head())).releases.length, oldBuildAfter: after };
  console.log("[S2] " + JSON.stringify(out));
  assert.match(out.oldBuild, /deep-equal|deepStrictEqual|Expected values/i, "the old build's plan is refused, and its next plan refuses the account");
  assert.equal(out.settings?.accountKeys, true);
  assert.match(String(out.resendAs), /^joined:v2\//, "the resend publishes under the scoped form");
  assert.equal(out.resendFoundAgain, true);
  assert.equal(out.releases, 2);
  assert.match(out.oldBuildAfter, /deep-equal|deepStrictEqual|Expected values/i, "a build from before refuses once the setting is on");
});

/** Settles R1's values with a frame landing across the frameGuards transition and a later release (R2). */
async function frameAcross(oldBuild: boolean) {
  const x = await setup();
  const settler = x.proc("settler", NONE, oldBuild);
  const s = memStore(settler, x.held) as any;
  const values = new (Archive as any)(new JoinedAccount(s), memStore(settler, x.held, x.db.scope + "-v"), new BulkQueue(1), "values", "bytes", "progress") as Archive;
  let r2: { position: number } | undefined;
  const fired = landBefore(x.db, "settled-values:", async () => {
    await ensureSettings(memStore(x.proc("upgrader", { ...NONE, frameGuards: true }), x.held) as any);
    r2 = await x.account(x.proc("publisher", NONE)).publish("r2", W0.R2.doc, validTime, "owed");
  });
  let end: string;
  try {
    end = (await values.runValues(1)).status;
  } catch (e: any) {
    end = "refused: " + String(e?.message).split("\n")[0]!.slice(0, 80);
  }
  x.db.beforeCommit = undefined;
  // The same process's next turn (the later release's values).
  const next = await values.runValues(2).then((p) => p.status, (e) => "refused: " + String(e?.message).split("\n")[0]!.slice(0, 80));
  const late = (await journal(x.db)).filter((t) => t.position > r2!.position && String(t.commandId).startsWith("settled-values:") &&
    t.changes.some((c: any) => /answer:1:/.test(String(c.entityId)))).length; // release 1's value pages
  return { fired: fired.done, end, next, pagesAfterLaterRelease: late, settings: await settingsAt(x) };
}

const without = async <T>(defences: string, f: () => Promise<T>) => {
  process.env.DX_ACT8_INJECT = defences;
  try {
    return await f();
  } finally {
    delete process.env.DX_ACT8_INJECT;
  }
};
test("S3: a values frame planned before the frameGuards transition, with a later release landing too, is refused (origin guard and transition fence, each alone)", async () => {
  const out = await frameAcross(false);
  // [DX-ACT8, third review U5] Two defences refuse it now, each enough alone: the origin guard and the transition's
  // fence (its rewrite of the progress row). The negative control drops both.
  const fenceOnly = await without("no-origin-guard", () => frameAcross(false));
  const guardOnly = await without("no-fence", () => frameAcross(false));
  const control = await without("no-origin-guard,no-fence", () => frameAcross(false));
  console.log("[S3] " + JSON.stringify({ out, fenceOnly, guardOnly, control }));
  assert(out.fired && out.settings?.frameGuards === true);
  assert.equal(out.pagesAfterLaterRelease, 0, "no value page lands after the later release");
  assert.equal(out.end, "superseded");
  assert.equal(fenceOnly.pagesAfterLaterRelease, 0, "the fence alone refuses it");
  assert.equal(guardOnly.pagesAfterLaterRelease, 0, "the origin guard alone refuses it");
  assert(control.pagesAfterLaterRelease > 0, "negative control: without both the planned frame lands after the later release");
});

test("S4: a build from before: its frame planned before the transition is refused (the fence), then it refuses the account", async () => {
  // [DX-ACT8, third review U5] At 2084d3ba7 this frame landed (section 0.8's window); the fence closes it. Without the
  // fence (the negative control) it lands as it did.
  const out = await frameAcross(true);
  const control = await without("no-fence", () => frameAcross(true));
  console.log("[S4] " + JSON.stringify({ out, control }));
  assert(out.fired && out.settings?.frameGuards === true);
  assert.equal(out.pagesAfterLaterRelease, 0, "the frame planned before the transition does not land");
  assert.match(out.end, /^refused: .*(deep-equal|Expected values)/i);
  assert.match(out.next, /^refused: .*(deep-equal|Expected values)/i, "its next turn refuses the account");
  assert.equal(control.pagesAfterLaterRelease, 1, "negative control: without the fence the old build's one frame lands");
});

test("S5: settings this build does not know (another version or field) are refused, not ignored", async () => {
  for (const settings of [{ v: 2 }, { v: 1, accountKeys: true, ledger: "whole", other: true }]) {
    const x = await setup();
    const s = memStore(x.proc("writer", NONE), x.held) as any;
    const p = await s.head(), origin = (await s.controls(p)).origin;
    await s.commit("test-origin:" + serial, "test", [{ op: "retract", id: origin.id }, fact(namesOf(s).ORIGIN, "lazy/generation", { ...value(origin), settings })], p);
    const got = await x.account(x.proc("new-build", NONE)).publish("r2", W0.R2.doc, validTime, "owed").then(() => "published", (e) => String(e?.message));
    console.log("[S5] " + JSON.stringify({ settings, got: got.slice(0, 120) }));
    assert.match(got, /not ones this build knows/);
  }
});

test("S6: a first values frame and a first notice frame landing between a transition's read and its commit: the transition reads again; one row per key", async () => {
  // [DX-ACT8, third review fuzz finding] The transition creates the first progress row and the first notice cursor when
  // they are absent (its fences). A frame that creates them between the transition's read and its commit used to leave
  // two live rows for one key (seeds 230057 and 230234 of the mixed campaign at c788f5de2). The transition is now guarded
  // on every row it fences, so it is refused and reads again.
  const x = await setup();
  await x.account(x.proc("pub", NONE)).publish("large", largeRelease(W0.R1.doc, parseShape("forms=20,policies=20,permille=1000")), validTime, "owed");
  const settler = x.proc("settler", NONE);
  const a = new JoinedAccount(memStore(settler, x.held) as any);
  const values = new (Archive as any)(a, memStore(settler, x.held, x.db.scope + "-v"), new BulkQueue(1), "values", "bytes", "progress") as Archive;
  const notices = new (Archive as any)(a, memStore(settler, x.held, x.db.scope + "-n"), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
  const tail = (await a.notices.observe()).value.sequence;
  const stop = new Error("one frame");
  // The frames land after the transition's read and before its commit begins (the window its guards are checked over).
  const up = memStore(x.proc("upgrader", { ...NONE, frameGuards: true, accountKeys: true }), x.held) as any;
  const commit = up.commit, fired = { done: false };
  up.commit = async (...args: any[]) => {
    if (!fired.done && String(args[0]).startsWith("account-settings:")) {
      fired.done = true;
      await values.turn(2); // the release's first values frame (its progress row is created)
      await new RecordedNotices(notices).record(tail, async () => { throw stop; }).catch((e) => { if (e !== stop) throw e; });
    }
    return commit(...args);
  };
  const settings = await ensureSettings(up);
  const transitions = (await journal(x.db)).filter((t) => t.actor === "lazy/settings").length;
  const stored = (await values.runValues(2)).status;
  await new RecordedNotices(notices).record(tail);
  const rows = await Promise.all([values.db.rows(["values:2"], await x.db.head()), notices.db.rows(["notice-progress"], await x.db.head())]);
  console.log("[S6] " + JSON.stringify({ fired: fired.done, settings, transitions, stored, rows: rows.map((r) => r.size) }));
  assert(fired.done && settings?.frameGuards && settings?.archive);
  assert.equal(transitions, 1, "the refused transition read again and landed once");
  assert.equal(stored, "stored");
});
