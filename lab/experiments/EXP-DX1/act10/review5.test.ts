// [DX-ACT10, fifth review] Attacks on the Publish line at 850517da9 (code 8455107b6): the one-part head and a mixed
// fleet with the previous round's build, the closing piece's margin with real cursors, payload-free archive rows and
// history, the 32-release bound on a transition, `SettingsPending` that does not end, the calendar row. Real code over
// memstore.ts (in process, diagnostic only). The harness (setup to oracle) is review4.test.ts's.
// Run: node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/review5.test.ts
// V2 also needs OLD_ROOT: lab/experiments/EXP-DX1 of a checkout at the previous round (a6f89a409) with its dists built.
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


const ledgerParts = await import("../actv-lazy/join/ledger-parts.ts");
const frames = await import("../actv-lazy/join/frames.ts");
const { noticeFrame } = await import("../actv-lazy/join/recorded.ts");
const { pack } = await import("../notify1/store.ts");
const { sha256 } = await import("../../../bench/lib/w0-world.ts");
const { SettlementControl, setSettlementControl } = await import("../actv-lazy/join/settlement-control.ts");
const { SettingsPending } = await import("../actv-lazy/join/account.ts");

// ------------------------------------------------------------ (2) the closing piece's margin with real cursors, V1
test("V1: the 77 closing pieces priced with a real cursor (a 64-character epoch, the account's seal) instead of the sizing cursor's 26", async () => {
  // The account's real Documents (its prefix) and its real epoch, from a held account in memory.
  const t = await setup(["acct-a"], 1);
  assert.equal(await recordNotices(t, "s0", NONE, "parts", await tailOf(t)), "recorded");
  const real = await cursorOf(t);
  const peek = t.x.store(t.proc("peek", NONE));
  const db = new Documents(peek.comp, "settlement-notices" + namesOf(peek).documents);
  const max = ledgerParts.ledgerPartsMax(), subject = "pl:s99999999", sha = "0".repeat(64), id = "f".repeat(40);
  const sizing = { epoch: "0".repeat(26), event: 999999, start: 999999, parent: sha, batch: 999999999, previous: sha,
    entries: 999999999999, frames: "bytes", part: 999999, ledger: "parts", erasureSeq: 999999, archive: true };
  const cursors: Record<string, object> = {
    sizing,
    "real epoch, the sizing counters": { ...sizing, epoch: real.epoch },
    // An account of a million subjects at its 40th notice event, on its last census page, under removal on request.
    "a million-subject account": { epoch: real.epoch, event: 40, start: 999936, parent: sha, batch: 40000000, previous: sha,
      entries: 64000000000, frames: "bytes", part: 3180, ledger: "parts", erasureSeq: 12, archive: true },
    // The toy's own counters (what a toy stack reaches).
    "the toy's counters": { epoch: real.epoch, event: 4, start: 7, parent: sha, batch: 900, previous: sha, entries: 16008,
      frames: "bytes", part: 3180, ledger: "parts", archive: true },
  };
  const item = (k: number) => ({ id: "wi:" + sha256(subject + ":" + k), payload: canonical({ dueAt: "2026-11-" + String(1 + (k % 30)).padStart(2, "0") + "T23:59:59.999999Z", form: "form:f" + k }), retired: false, seq: 999999n, subject });
  const itemsOf = (chars: number) => {
    const of = (n: number) => Array.from({ length: n }, (_, k) => item(k)).sort((x, y) => (x.id < y.id ? -1 : 1));
    let lo = 1, hi = 1;
    while (pack(of(hi)).length <= chars) hi *= 2;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (pack(of(m)).length <= chars) lo = m; else hi = m; }
    return of(lo);
  };
  const olds: any[] = [{ items: [{ ...item(-1) }], head: { id, value: "x", at: 1 }, parts: [] }];
  for (let k = 1; k <= max; k++)
    olds.push({ items: [{ ...item(-2) }], head: { id, value: { parts: k, event: 999999, chars: k * ledgerParts.ledgerPartChars, sha }, at: 1 },
      parts: Array.from({ length: k }, () => ({ id, value: "", at: 1 })) });
  const targets = [100, ledgerParts.ledgerPartChars - 500, ledgerParts.ledgerPartChars, ledgerParts.ledgerPartChars + 1, 3 * ledgerParts.ledgerPartChars,
    (max - 1) * ledgerParts.ledgerPartChars + 1, max * ledgerParts.ledgerPartChars - 200].map((c) => itemsOf(c));
  const out: Record<string, unknown> = { realEpochLength: String(real.epoch).length, partsMax: max };
  for (const [name, cursor] of Object.entries(cursors)) {
    let worst = 0;
    const failing: unknown[] = [];
    for (const items of targets)
      for (const old of olds) {
        const change = ledgerParts.ledgerChange(db, subject, 999999, old, items);
        const e = frames.frameEstimate([...change.closing, { op: "retract" as const, id }, db.put("notice-progress", cursor)]);
        worst = Math.max(worst, e.us);
        if (!e.fits) failing.push({ oldParts: old.parts.length, newParts: change.parts.length, us: e.us });
      }
    out[name] = { cursorBytes: canonical(cursor).length, worstUs: worst, failing: failing.length, of: targets.length * olds.length, examples: failing.slice(0, 3) };
  }
  // The writer's own frame builder on the worst case (10 old parts, 10 new) with the million-subject cursor: a frame of
  // the closing piece alone, as the recorder builds it when a subject's units are all written.
  const old = olds[max]!, items = targets.at(-1)!;
  const change = ledgerParts.ledgerChange(db, subject, 999999, old, items);
  // The cursor as it stands when only the subject's closing piece is left (its units all written, `part` back to 0).
  const current = { ...(cursors["a million-subject account"] as any), part: 0 };
  const candidate = { subject, units: [] as never[], deliveries: 0, closing: true, ledger: change.closing };
  const built = (() => { try { return noticeFrame(db, { id, value: current, at: 1 } as any, current, [candidate as any], { account: db.prefix, position: 1, recipe: sha, next: sha, size: 1000000, erasureSeq: 12, ledger: "parts", archive: true }).filled; } catch (e) { return String((e as Error).constructor.name) + ": " + String((e as Error).message).slice(0, 100); } })();
  out.writerOnTheWorstCase = built;
  console.log("[V1] " + JSON.stringify(out));
  assert.equal((out["sizing"] as any).failing, 0, "the builder's own sizing: every combination fits");
  assert((out["a million-subject account"] as any).failing > 0, "a real large account's cursor makes some closing pieces exceed the bound");
});

// ------------------------------------------------- (1) the one-part head and a mixed fleet with the previous round, V2
test("V2: a settler of the previous round (a6f89a409) meets a one-part head and payload-free archive rows", { skip: !process.env.OLD_ROOT }, async () => {
  const root = process.env.OLD_ROOT!;
  const old = {
    JoinedAccount: (await import(root + "/actv-lazy/join/account.ts")).JoinedAccount,
    Archive: (await import(root + "/actv-lazy/join/archive.ts")).Archive,
    BulkQueue: (await import(root + "/actv-lazy/join/bulk.ts")).BulkQueue,
    RecordedNotices: (await import(root + "/actv-lazy/join/recorded.ts")).RecordedNotices,
  };
  const oldSettle = async (t: Setup, label: string) => {
    const p = t.proc(label, NONE);
    const a = new old.JoinedAccount(memStore(p, t.x.held) as any);
    const n = new (old.Archive as any)(a, memStore(p, t.x.held, t.db.scope + "-old-" + label), new old.BulkQueue(1), "notices", "bytes", "progress");
    return new old.RecordedNotices(n, "parts").record(await tailOf(t)).then(() => "recorded", (e: any) => String(e?.constructor?.name) + ": " +
      String(e?.message).split("\n").map((x: string) => x.trim()).filter(Boolean).slice(0, 3).join(" | ").slice(0, 300) + " @ " + String(e?.stack ?? "").split("\n").filter((x: string) => /at /.test(x)).slice(0, 4).map((x: string) => x.trim().replace(/^.*EXP-DX1\//, "").slice(0, 90)).join(" < "));
  };
  const cases: Record<string, unknown>[] = [];
  for (const [label, small] of [["shrinks to one part", 150], ["stays in two parts", 200]] as const) {
    const t = await setup(["acct-a"], 2);
    const publisher = t.proc("publisher", ALL);
    assert((await publish(t, publisher, "big", tagged(260, "b" + small))).ok);
    assert.equal(await recordNotices(t, "new-1", NONE, undefined, await tailOf(t)), "recorded");
    assert((await publish(t, publisher, "small", tagged(small, "s" + small))).ok);
    assert.equal(await recordNotices(t, "new-2", NONE, undefined, await tailOf(t)), "recorded");
    const peek = t.x.store(t.proc("peek", NONE));
    const ndb = new Documents(peek.comp, "settlement-notices" + namesOf(peek).documents);
    const parts = (await readLedgers(ndb, [W0.placementId(0)], await peek.head())).get(W0.placementId(0))!.parts.length;
    // The next release, then a settler of the previous round, twice, then one of this round.
    assert((await publish(t, t.proc("pub-r2", NONE), "r2", W0.R2.doc)).ok);
    const oldRuns = [await oldSettle(t, "old-1"), await oldSettle(t, "old-2")];
    const newRun = await recordNotices(t, "new-3", NONE, undefined, await tailOf(t));
    const o = await oracle(t);
    cases.push({ label, partsAfterShrink: parts, oldRuns, newRun, noticesEqual: o.noticesEqual, fullEqual: o.subjects.every((s) => s.fullEqual) });
  }
  console.log("[V2] " + JSON.stringify(cases));
  assert(/AssertionError/.test(String((cases[0] as any).oldRuns[0])), "the previous round's settler refuses a one-part head");
});

// ------------------------------------------------------------------- (3) payload-free archive rows and history, V3
test("V3: an item retires with one payload and returns with another; what the stored state says between, against the kernel's state", async () => {
  const t = await setup(["acct-a"], 2);
  const publisher = t.proc("publisher", ALL);
  const pool = tagged(6, "h");
  const one = { ...pool, forms: pool.forms!.map((f) => ({ ...f })), policies: pool.policies!.slice(0, 6) } as W0.ReleaseDoc;
  const fewer = { ...pool, forms: pool.forms!.slice(0, 3), policies: pool.policies!.slice(0, 3) } as W0.ReleaseDoc;
  // The same six policies again, their forms due later (a new payload under the same item IDs).
  const later = { ...pool, forms: pool.forms!.map((f) => ({ ...f, dueBusinessDays: f.dueBusinessDays + 7 })), policies: pool.policies!.slice(0, 6) } as W0.ReleaseDoc;
  for (const d of [one, fewer, later]) W0.compileRelease(d as never);
  assert((await publish(t, publisher, "one", one)).ok);
  assert.equal(await recordNotices(t, "s1", NONE, undefined, await tailOf(t)), "recorded");
  assert((await publish(t, publisher, "fewer", fewer)).ok);
  assert.equal(await recordNotices(t, "s2", NONE, undefined, await tailOf(t)), "recorded");
  const peek = t.x.store(t.proc("peek", NONE));
  const between = await peek.head();
  assert((await publish(t, publisher, "later", later)).ok);
  assert.equal(await recordNotices(t, "s3", NONE, undefined, await tailOf(t)), "recorded");
  const o = await oracle(t);
  // The kernel's own state between "fewer" and "later": the three retired items keep their payload (SPEC 8.8).
  const ndb = new Documents(peek.comp, "settlement-notices" + namesOf(peek).documents);
  const s = W0.placementId(0);
  const ids = (await readLedgers(ndb, [s], await peek.head())).get(s)!.items.map((i) => i.id);
  const stored = (await ledgerParts.readFullLedgers(ndb, [s], between, () => ids)).get(s)!;
  const retired = stored.items.filter((i) => i.retired);
  // Where a retired item's last payload is still in the database: its last delivery, in the recorded packets.
  const a = t.x.account(t.proc("packets", NONE));
  const n = new (Archive as any)(a, memStore(t.proc("packets-r", NONE), t.x.held, t.db.scope + "-pk"), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
  const deliveries = (await new RecordedNotices(n, undefined).packets(between)).flatMap((p: any) => p.deliveries).filter((d: any) => d.subject === s);
  const lastPayload = (id: string) => deliveries.filter((d: any) => d.id === id).at(-1)?.payload;
  const out = { noticesEqual: o.noticesEqual, fullEqual: o.subjects.every((x) => x.fullEqual), retiredBetween: retired.length,
    storedPayloads: retired.map((i) => i.payload), recoverableFromDeliveries: retired.every((i) => typeof lastPayload(i.id) === "string" && lastPayload(i.id) !== "null"),
    returnedAtSequence: o.subjects.map((x) => x.everHeld) };
  console.log("[V3] " + JSON.stringify(out));
  assert(out.noticesEqual && out.fullEqual);
  assert(retired.length >= 3 && retired.every((i) => i.payload === "null"), "between, the stored state has no payload for a retired item");
  assert(out.recoverableFromDeliveries, "the payload is still in the item's last delivery");
});

// ------------------------------------------------------------- (4) the 32-release bound on a transition, V4
test("V4: more than 32 owed releases pending while settlement is paused: a permitted Publish is refused for as long as the pause lasts; a process allowed nothing keeps publishing", async () => {
  const t = await setup(["acct-a"], 2);
  const op = memStore(t.proc("operator", NONE), t.x.held, t.db.scope + "-op") as any;
  await setSettlementControl(op, { paused: true, by: "act10" });
  for (let k = 0; k < 33; k++) assert((await publish(t, t.proc("pub-none-" + k, NONE), "p" + k, W0.R2.doc)).ok);
  const permitted = t.proc("permitted", { ...NONE, ledgerCap: true });
  const attempts: string[] = [];
  const started = Date.now();
  for (let k = 0; k < 3; k++) {
    const r = await outcome(t.x.account(permitted).publish("perm-" + k, W0.R2.doc, validTime, "owed") as any);
    attempts.push(r.ok ? "published" : r.error.slice(0, 60));
  }
  const ms = Date.now() - started;
  const meanwhile = await publish(t, t.proc("pub-none-x", NONE), "px", W0.R2.doc);
  // A settler with the pause in force: no frame lands, so the backlog stays.
  const p = t.proc("values-settler", NONE), a = t.x.account(p);
  const queue = new BulkQueue(1);
  const values = new (Archive as any)(a, memStore(p, t.x.held, t.db.scope + "-v"), queue, "values", "bytes", "progress") as Archive;
  values.control = new SettlementControl(values.store, queue, values.turnKey());
  // One frame's worth of work under the pause, bounded in time (a settler waits for a pause to lift).
  const whilePaused = await Promise.race([values.turn(2).then((x: any) => "turned: " + x.status, (e: any) => "refused: " + String(e?.message).split("\n")[0]!.slice(0, 60)),
    new Promise((r) => setTimeout(() => r("still waiting for the pause after 2 s"), 2000))]);
  // The pause lifted and the backlog settled: the permitted Publish lands and the settings turn on.
  await setSettlementControl(op, { paused: false, by: "act10" });
  const tail = (await t.x.store(t.proc("peek", NONE)).controls(await t.x.store(t.proc("peek", NONE)).head())).releases.length;
  for (let seq = 1; seq <= tail; seq++) await values.runValues(seq).catch(() => undefined);
  const after = await outcome(t.x.account(permitted).publish("perm-after", W0.R2.doc, validTime, "owed") as any);
  const out = { pendingReleases: 34, attempts, msForThreeAttempts: ms, meanwhileAllowedNothing: meanwhile.ok, whilePaused, after: after.ok, settings: await settingsOf(t) ?? null };
  console.log("[V4] " + JSON.stringify(out));
  assert(attempts.every((x) => /Publish refused for now/.test(x)), "refused while the backlog lasts");
  assert(meanwhile.ok, "a process allowed nothing still publishes, adding to the backlog");
  assert(after.ok && out.settings, "once the backlog drains the settings turn on");
});

// ------------------------------------------------- (5) SettingsPending while a long settlement runs, V5
test("V5: a permitted Publish offered repeatedly while a long values settlement runs beside it (interleaved, not forced)", async () => {
  const t = await setup(["acct-a"], 256);
  t.db.maxYield = 3;
  assert((await publish(t, t.proc("pub-r2", NONE), "r2", W0.R2.doc)).ok);
  const p = t.proc("values-settler", NONE);
  const values = new (Archive as any)(t.x.account(p), memStore(p, t.x.held, t.db.scope + "-v"), new BulkQueue(1), "values", "pages", "progress") as Archive;
  let settling = true, frames = 0;
  const settle = values.runValues(2, async () => { frames++; }).then((x: any) => x.status).finally(() => { settling = false; });
  const permitted = t.proc("permitted", { ...NONE, ledgerCap: true });
  const tries: { during: boolean; result: string }[] = [];
  for (let k = 0; k < 40; k++) {
    const during = settling;
    const r = await outcome(t.x.account(permitted).publish("perm-" + k, W0.R2.doc, validTime, "owed") as any);
    tries.push({ during, result: r.ok ? "published" : /Publish refused for now/.test(r.error) ? "SettingsPending" : r.error.slice(0, 50) });
    if (r.ok) break;
  }
  const status = await settle;
  const out = { valuesFrames: frames, status, tries: tries.length, refusedDuring: tries.filter((x) => x.during && x.result === "SettingsPending").length,
    publishedDuring: tries.some((x) => x.during && x.result === "published"), last: tries.at(-1) };
  console.log("[V5] " + JSON.stringify(out));
  assert(tries.some((x) => x.result === "published"));
});

test("V2b: the other direction, an upgrade: an event the previous round wrote, settled by this round", { skip: !process.env.OLD_ROOT }, async () => {
  const root = process.env.OLD_ROOT!;
  const OldAccount = (await import(root + "/actv-lazy/join/account.ts")).JoinedAccount;
  const oldSelector = (await import(root + "/actv-lazy/join/index.ts")).selector;
  const newSelector = (await import("../actv-lazy/join/index.ts")).selector;
  const t = await setup(["acct-a"], 2);
  // R1's notices recorded by this round; then a release published by the previous round's build, options off.
  assert.equal(await recordNotices(t, "new-0", NONE, undefined, await tailOf(t)), "recorded");
  const oldPub = await outcome(new OldAccount(memStore(t.proc("old-publisher", NONE), t.x.held) as any).publish("r2", W0.R2.doc, validTime, "owed") as any);
  if (oldPub.ok) t.docs.get(t.x.name)!.set(oldPub.position, W0.R2.doc);
  const settle = await recordNotices(t, "new-after-upgrade", NONE, undefined, await tailOf(t));
  const out = { selectorsDiffer: oldSelector !== newSelector, oldPublish: oldPub, newSettler: settle };
  console.log("[V2b] " + JSON.stringify(out));
});

test("V2c: an upgrade of a held account: enrolled, published and settled by the previous round, then this round's build", { skip: !process.env.OLD_ROOT }, async () => {
  const root = process.env.OLD_ROOT!;
  const old = {
    JoinedAccount: (await import(root + "/actv-lazy/join/account.ts")).JoinedAccount,
    Archive: (await import(root + "/actv-lazy/join/archive.ts")).Archive,
    BulkQueue: (await import(root + "/actv-lazy/join/bulk.ts")).BulkQueue,
    RecordedNotices: (await import(root + "/actv-lazy/join/recorded.ts")).RecordedNotices,
  };
  const db = new MemDb("act10-r5-upgrade-" + process.pid, 7777);
  db.maxYield = 0;
  const cut = await seedAccount(db, "acct-u", 2);
  const held = heldAccount("acct-u", 2, cut);
  const proc = (name: string) => { const p = new Proc(db, name); p.permits = NONE; return p; };
  const step = (p: Promise<unknown>) => p.then(() => "ok", (e: any) => "refused: " + String(e?.message).split("\n").map((x: string) => x.trim()).filter(Boolean).slice(0, 2).join(" | ").slice(0, 160));
  const oldAccount = (name: string) => new old.JoinedAccount(memStore(proc(name), held) as any);
  const newAccount = (name: string) => new JoinedAccount(memStore(proc(name), held) as any);
  const out: Record<string, string> = {};
  out.oldEnrol = await step(oldAccount("old-enrol").installHeld(validTime));
  out.oldPublishR1 = await step(oldAccount("old-pub").publish("r1", W0.R1.doc, validTime, "owed"));
  const oldSettle = async (name: string) => {
    const p = proc(name), a = new old.JoinedAccount(memStore(p, held) as any);
    const n = new (old.Archive as any)(a, memStore(p, held, db.scope + "-" + name), new old.BulkQueue(1), "notices", "bytes", "progress");
    return step(new old.RecordedNotices(n, "parts").record((await a.notices.observe()).value.sequence));
  };
  out.oldSettle = await oldSettle("old-settle");
  // The upgrade: this round's build publishes and settles the same account.
  out.newPublishR2 = await step(newAccount("new-pub").publish("r2", W0.R2.doc, validTime, "owed"));
  const p = proc("new-settle"), a = newAccount("new-settle-a");
  const n = new (Archive as any)(a, memStore(p, held, db.scope + "-new-settle"), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
  out.newSettle = await step(new RecordedNotices(n, "parts").record((await a.notices.observe()).value.sequence));
  console.log("[V2c] " + JSON.stringify(out));
});

// ------------------------------------------------------------ (6) the calendar row with thousands of instants, V6
// The calendar (`join-calendar`) holds the account's distinct future due instants: each `:file/expiresOn` day's end, and
// each fact's end of validity (`validTo`) after the cut at its own millisecond (`deep.ts` 59-65). A deep save that adds
// one rewrites the row whole (`account.ts` 1391-1397), as do the transition (`account-settings.ts` 144-147) and each
// due instant's tick (1242-1243). The toy world holds no future due instant and its in-process store cannot take deep
// saves, so this prices the whole rewrite by the writer's own estimate at the sizes a deep account reaches (one, five
// and ten years of distinct days, the date range's end at day precision) and finds where the row meets the 1 MiB value.
test("V6: the calendar row's whole rewrite priced at 1, 5 and 10 years of days, at the date range's end, and at the 1 MiB value with instants", async () => {
  const t = await setup(["acct-a"], 4);
  const peek = t.x.account(t.proc("v6-peek", NONE));
  const head = await t.x.store(t.proc("v6-head", NONE)).head();
  const cal = await peek.db.get<string[]>("join-calendar", head);
  const dayMs = 86400000, first = Date.UTC(2026, 10, 26);
  const days = (k: number) => Array.from({ length: k }, (_, i) => W0.endOfDay(W0.parseDate(new Date(first + i * dayMs).toISOString().slice(0, 10))));
  // Instants at distinct milliseconds, as a fact's end of validity is stored (`toISOString` with "000Z").
  const instants = (k: number) => Array.from({ length: k }, (_, i) => new Date(first + i * 60000 + 123).toISOString().replace("Z", "000Z"));
  const price = (label: string, dates: string[]) => {
    const e = frames.frameEstimate(peek.db.change("join-calendar", cal, dates));
    return { label, instants: dates.length, valueBytes: Buffer.byteLength(canonical(dates)), us: e.us, timesBound: +(e.us / frames.frameBoundUs).toFixed(2) };
  };
  const lastDay = Math.round((Date.UTC(2099, 11, 31) - first) / dayMs) + 1;
  let lo = 1, hi = 100000;
  while (lo < hi) { const m = Math.ceil((lo + hi) / 2); if (Buffer.byteLength(canonical(instants(m))) <= 1048576) lo = m; else hi = m - 1; }
  const out = {
    toyCalendar: cal.value.length,
    priced: [price("284 days (the page's 8 ms point)", days(284)), price("1 year of days", days(365)), price("5 years", days(5 * 365)),
      price("10 years", days(10 * 365)), price("to 2099-12-31, one per day", days(lastDay)), price("instants at the 1 MiB value", instants(lo))],
    instantsAtTheValueLimit: lo,
  };
  console.log("[V6] " + JSON.stringify(out));
  assert(lo > lastDay, "day precision alone cannot reach the value limit");
});
