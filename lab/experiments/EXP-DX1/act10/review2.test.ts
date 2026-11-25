// [DX-ACT10, second review] Attacks on the fixes at bf377c57f, real code over memstore.ts (in process, diagnostic only).
// Run: node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/review2.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { canonical, W0 } from "../../../bench/lib/w0-world.ts";
import { JoinedAccount, joinedCommandId } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { heldAccount, MemDb, memStore, Proc, seedAccount } from "./memstore.ts";

const validTime = W0.POPULATION_VALID_TIME;
const people = 4;
const large = (permille: number, base = W0.R1.doc) => largeRelease(base, parseShape("forms=20,policies=20,permille=" + permille));
let serial = 0;
const fresh = () => {
  const db = new MemDb("act10-r2-" + ++serial + "-" + process.pid, serial);
  db.maxYield = 0;
  return db;
};
/** Runs `f` with these options set, then restores the environment exactly. */
async function withEnv<T>(env: Record<string, string | undefined>, f: () => Promise<T>) {
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(env)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  try {
    return await f();
  } finally {
    for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  }
}
const ON = { TX2_ACCOUNT_KEYS: "1", TX2_PUBLISH_BESIDE: "1" },
  OFF = { TX2_ACCOUNT_KEYS: undefined, TX2_PUBLISH_BESIDE: "1" };
/** Accounts in one database. `namespace: false` is the single-account layout (account 0 of the held toy). */
async function accounts(db: MemDb, names: { name: string; namespace?: boolean }[]) {
  const out = [];
  for (const x of names) {
    const cut = await seedAccount(db, x.name, people);
    const held = heldAccount(x.name, people, cut, x.namespace ?? true);
    const s = memStore(new Proc(db, "p-" + x.name), held) as any;
    const a = new JoinedAccount(s);
    await withEnv({ TX2_ENROL_BESIDE_SAVES: "1" }, () => a.installHeld(validTime));
    out.push({ name: x.name, held, s, a });
  }
  return out;
}
const releases = async (x: { s: any }) => (await x.s.controls(await x.s.head())).releases.length;
const tail = async (x: { a: JoinedAccount }) => (await x.a.notices.observe()).value.sequence;
const outcome = (p: Promise<{ position: number; txId: string }>) =>
  p.then((r) => ({ ok: true, position: r.position, txId: r.txId }), (e) => ({ ok: false, error: String(e?.message).split("\n")[0]!.slice(0, 90) }));
const records = async (db: MemDb, id: string) =>
  ((await db.comp.feedPage(0, 1_000_000)).transactions as any[]).filter((t) => t.actor === "lazy/join" && String(t.commandId).endsWith(id))
    .map((t) => t.commandId);

// ---------------------------------------------------------------------------------------------- (a) old records
test("A1: an un-prefixed record of account B, then account A (namespaced) publishes the same ID and document with the option", async () => {
  const db = fresh();
  const [A, B] = await accounts(db, [{ name: "acct-a" }, { name: "acct-b" }]);
  const b = await withEnv(OFF, () => outcome(B!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const a = await withEnv(ON, () => outcome(A!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const again = await withEnv(ON, () => outcome(B!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const out = { b, a, bResentWithOption: again, aReleases: await releases(A!), bReleases: await releases(B!), records: await records(db, "r1") };
  console.log("[A1] " + JSON.stringify(out));
  assert(a.ok && b.ok && (a as any).txId !== (b as any).txId && out.aReleases === 1 && out.bReleases === 1);
  assert((again as any).txId === (b as any).txId, "B's resend after the option is its old record");
});

test("A2: the single-account layout (un-prefixed IDs) and a namespaced account's record written before the option", async () => {
  const db = fresh();
  // Account 0 of the held toy: the single-account layout; account B namespaced.
  const [Z, B] = await accounts(db, [{ name: "acct-0", namespace: false }, { name: "acct-b" }]);
  const b = await withEnv(OFF, () => outcome(B!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const z = await withEnv(ON, () => outcome(Z!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const out = { bBeforeOption: b, singleLayoutWithOption: z, zGetsBsReceipt: (z as any).txId === (b as any).txId,
    zReleases: await releases(Z!), zTail: await tail(Z!), bReleases: await releases(B!) };
  console.log("[A2] " + JSON.stringify(out));
  // The break if true: account 0's Publish is acknowledged with account B's receipt; nothing is written for account 0.
  assert.equal(out.zGetsBsReceipt, true);
  assert.equal(out.zReleases, 0);
});

test("A2b: the single-account layout and a namespaced account, both with the option, same ID: separate", async () => {
  const db = fresh();
  const [Z, B] = await accounts(db, [{ name: "acct-0", namespace: false }, { name: "acct-b" }]);
  const b = await withEnv(ON, () => outcome(B!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const z = await withEnv(ON, () => outcome(Z!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  console.log("[A2b] " + JSON.stringify({ b, z, zReleases: await releases(Z!), bReleases: await releases(B!) }));
  assert((z as any).txId !== (b as any).txId);
});

// ---------------------------------------------------------------------------------------------- (d) mixed fleet
test("D1m: one command sent by a publisher with the option, then resent by a publisher without it (same account)", async () => {
  const db = fresh();
  const [A] = await accounts(db, [{ name: "acct-a" }]);
  const first = await withEnv(ON, () => outcome(A!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  // The client resends after a lost reply, through a process started before the option (rolling deploy or rollback).
  const resend = await withEnv(OFF, () => outcome(A!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const out = { first, resend, sameRecord: (first as any).txId === (resend as any).txId, releases: await releases(A!),
    tail: await tail(A!), records: await records(db, "r1") };
  console.log("[D1m] " + JSON.stringify(out));
  // The break if false: one command landed twice (two releases, two notice events, both command ID forms).
  assert.equal(out.sameRecord, false);
  assert.equal(out.releases, 2);
});

test("D2m: one command sent without the option, resent with it (same account): the old record is recovered", async () => {
  const db = fresh();
  const [A] = await accounts(db, [{ name: "acct-a" }]);
  const first = await withEnv(OFF, () => outcome(A!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const resend = await withEnv(ON, () => outcome(A!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const other = await withEnv(ON, () => outcome(A!.a.publish("r1", W0.R2.doc, validTime, "owed")));
  const out = { first, resend, sameRecord: (first as any).txId === (resend as any).txId, otherDocument: other, releases: await releases(A!) };
  console.log("[D2m] " + JSON.stringify(out));
  assert(out.sameRecord && !other.ok && out.releases === 1);
});

test("D3m: two accounts, one publisher with the option and one without, the same ID and document", async () => {
  const db = fresh();
  const [A, B] = await accounts(db, [{ name: "acct-a" }, { name: "acct-b" }]);
  const a = await withEnv(ON, () => outcome(A!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const b = await withEnv(OFF, () => outcome(B!.a.publish("r1", W0.R1.doc, validTime, "owed")));
  const b2 = await withEnv(OFF, () => outcome(B!.a.publish("r2", W0.R1.doc, validTime, "owed")));
  const a2 = await withEnv(ON, () => outcome(A!.a.publish("r2", W0.R1.doc, validTime, "owed")));
  const out = { a, b, b2, a2, aReleases: await releases(A!), bReleases: await releases(B!), a2GetsB2: (a2 as any).txId === (b2 as any).txId };
  console.log("[D3m] " + JSON.stringify(out));
  assert(out.aReleases === 2 && out.bReleases === 2 && !out.a2GetsB2);
});

// ---------------------------------------------------------------------------------------------- (b) the separator
test("B1: joined command IDs and definitions prefixes are one-to-one over the allowed names", async () => {
  const account = /^[a-zA-Z0-9_.-]{1,60}$/, id = /^[a-zA-Z0-9_.:-]{1,145}$/, deadline = /^deadline\/[a-f0-9]{64}$/;
  // The separator in a name or an ID is refused before any key is formed (store.ts 126, account.ts 571).
  assert(!account.test("a/b") && !id.test("b/c") && id.test("deadline:x") && !id.test("deadline/" + "a".repeat(64)) && deadline.test("deadline/" + "a".repeat(64)));
  const keys = new Map<string, string>();
  const alphabet = "ab0-._:/";
  const words = (n: number): string[] => (n === 0 ? [""] : words(n - 1).flatMap((w) => [...alphabet].map((c) => w + c)));
  let pairs = 0, collisions = 0;
  await withEnv(ON, async () => {
    for (const acc of words(3).filter((w) => account.test(w)))
      for (const i of words(3).filter((w) => id.test(w))) {
        const k = joinedCommandId({ held: { namespace: true, account: acc } } as never, i);
        const who = acc + "|" + i;
        if (keys.has(k) && keys.get(k) !== who) collisions++;
        keys.set(k, who);
        pairs++;
      }
    // The single-account layout's keys against the namespaced ones: un-prefixed IDs hold no "/" except a deadline's.
    for (const i of words(3).filter((w) => id.test(w))) {
      const k = joinedCommandId({ held: { namespace: false, account: "x" } } as never, i);
      if (keys.has(k)) collisions++;
    }
  });
  // The one exception: a deadline ID of the single-account layout, `deadline/<64 hex>`, is the key of a namespaced
  // account named "deadline" publishing the ID `<64 hex>`.
  const hex = "f".repeat(64);
  const crossed = await withEnv(ON, async () =>
    joinedCommandId({ held: { namespace: false, account: "x" } } as never, "deadline/" + hex) ===
      joinedCommandId({ held: { namespace: true, account: "deadline" } } as never, hex));
  console.log("[B1] " + JSON.stringify({ pairs, collisions, deadlineCrossesAccountNamedDeadline: crossed }));
  assert.equal(collisions, 0);
});

// ---------------------------------------------------------------------------------------------- (e) the ledger cap
/** A large release whose forms and policies carry `tag` in their IDs (distinct policy sets across releases). */
function tagged(n: number, tag: string, base = W0.R1.doc) {
  const d = largeRelease(base, parseShape("forms=" + n + ",policies=" + n + ",permille=1000"));
  const fix = (s: string) => s.replace(/^form:f/, "form:" + tag).replace(/^pol:p/, "pol:" + tag);
  const doc = { ...d, forms: d.forms!.map((f) => ({ ...f, id: fix(f.id) })), policies: d.policies!.map((p) => ({ ...p, id: fix(p.id), form: fix(p.form) })) };
  W0.compileRelease(doc as never);
  return doc as W0.ReleaseDoc;
}
async function settleNotices(db: MemDb, x: { held: any }, ledger: "whole" | "parts", through: number) {
  const proc = new Proc(db, "settle-" + ++serial);
  const a = new JoinedAccount(memStore(proc, x.held) as any);
  const n = new (Archive as any)(a, memStore(proc, x.held, db.scope + "-n" + serial), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
  return new RecordedNotices(n, ledger).record(through).then(() => "recorded", (e) => String(e?.constructor?.name) + ": " + String(e?.message).slice(0, 100));
}
test("C2: the cap computed by a publisher with ledgers in parts, the account settled by a process writing whole ledgers", async () => {
  const db = fresh();
  const [A] = await accounts(db, [{ name: "acct-c" }]);
  const doc = tagged(400, "h");
  const env = { ...ON, TX2_LEDGER_CAP_AT_PUBLISH: "1", TX2_NOTICE_LEDGER: "parts" };
  const pub = await withEnv(env, () => outcome(A!.a.publish("c-400", doc, validTime, "owed", undefined, { docs: "ref" })));
  // The same release offered by a publisher writing whole ledgers (the settler's mode) is refused at Publish.
  const db2 = fresh();
  const [A2] = await accounts(db2, [{ name: "acct-c" }]);
  const wholePub = await withEnv({ ...env, TX2_NOTICE_LEDGER: undefined }, () => outcome(A2!.a.publish("c-400", doc, validTime, "owed", undefined, { docs: "ref" })));
  const settled = await settleNotices(db, A!, "whole", 1);
  console.log("[C2] " + JSON.stringify({ publisherInParts: pub, settlerWhole: settled, publisherWhole: wholePub }));
  assert(pub.ok && /FrameTooLarge/.test(settled) && !wholePub.ok);
});

test("C3: at, one under and one over the cap (ledgers in parts), and whether the cap's limit is the settlement's", async () => {
  const env = { ...ON, TX2_LEDGER_CAP_AT_PUBLISH: "1", TX2_NOTICE_LEDGER: "parts" };
  const tryN = async (n: number, cap: boolean) => {
    const db = fresh();
    const [A] = await accounts(db, [{ name: "acct-n" }]);
    const p = await withEnv({ ...env, TX2_LEDGER_CAP_AT_PUBLISH: cap ? "1" : undefined }, () => outcome(A!.a.publish("n-" + n, tagged(n, "k"), validTime, "owed", undefined, { docs: "ref" })));
    const s = p.ok ? await settleNotices(db, A!, "parts", 1) : "not published";
    return { n, published: p.ok, error: p.ok ? undefined : (p as any).error.slice(0, 60), settlement: s };
  };
  // Find the cap's boundary by bisection over the policy count, then settle at it and one over without the cap.
  let lo = 1000, hi = 2000;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const db = fresh();
    const [A] = await accounts(db, [{ name: "acct-b" + mid }]);
    const ok = await withEnv(env, () => A!.a.publish("b-" + mid, tagged(mid, "k"), validTime, "owed", undefined, { docs: "ref" }).then(() => true, () => false));
    if (ok) lo = mid; else hi = mid - 1;
  }
  const at = await tryN(lo, true), over = await tryN(lo + 1, true), under = await tryN(lo - 1, true);
  const overNoCap = await tryN(lo + 1, false);
  let real = lo + 1;
  for (const n of [lo + 40, lo + 80, lo + 120, lo + 160]) if ((await tryN(n, false)).settlement === "recorded") real = n;
  console.log("[C3] " + JSON.stringify({ capBoundary: lo, at, under, over, overWithoutCapSettles: overNoCap.settlement, largestSettledWithoutCapTried: real }));
  assert(at.published && at.settlement === "recorded" && under.published && !over.published);
});

test("C4: an account's history: two releases of different policies, then a release with no notice policies", async () => {
  const env = { ...ON, TX2_NOTICE_LEDGER: "parts" };
  const run = async (cap: boolean) => {
    const db = fresh();
    const [A] = await accounts(db, [{ name: "acct-h" }]);
    const e = { ...env, TX2_LEDGER_CAP_AT_PUBLISH: cap ? "1" : undefined };
    const steps: Record<string, unknown> = {};
    const p1 = await withEnv(e, () => outcome(A!.a.publish("h-1", tagged(900, "g"), validTime, "owed", undefined, { docs: "ref" })));
    steps.first = { published: p1.ok, notices: p1.ok ? await settleNotices(db, A!, "parts", 1) : null };
    const p2 = await withEnv(e, () => outcome(A!.a.publish("h-2", tagged(900, "j"), validTime, "owed", undefined, { docs: "ref" })));
    steps.second = { published: p2.ok, error: p2.ok ? undefined : (p2 as any).error.slice(0, 80), notices: p2.ok ? await settleNotices(db, A!, "parts", 2) : null };
    const p3 = await withEnv(e, () => outcome(A!.a.publish("h-3", W0.R2.doc, validTime, "owed", undefined, { docs: "ref" })));
    steps.noNoticePolicies = { published: p3.ok, error: p3.ok ? undefined : (p3 as any).error.slice(0, 80) };
    return steps;
  };
  const without = await run(false), withCap = await run(true);
  console.log("[C4] " + JSON.stringify({ capOff: without, capOn: withCap }));
});

// ---------------------------------------------------------------------------------------------- (f) frame guards
const { setSettlementControl, SettlementControl } = await import("../actv-lazy/join/settlement-control.ts");
const GUARDS = { ...ON, TX2_SETTLE_FRAME_GUARDS: "1", TX2_SETTLE_CONTROL: "1" };
/** A settling process of `x` with its control; `legacy`: the control path of a process without the frame guards. */
function settlerOf(db: MemDb, x: { held: any }, label: string, legacy = false) {
  const proc = new Proc(db, "settle-" + label);
  const a = new JoinedAccount(memStore(proc, x.held) as any);
  const queue = new BulkQueue(1);
  const values = new (Archive as any)(a, memStore(proc, x.held, db.scope + "-" + label + "-v"), queue, "values", "bytes", "progress") as Archive;
  const notices = new (Archive as any)(a, memStore(proc, x.held, db.scope + "-" + label + "-n"), queue, "notices", "bytes", "progress") as Archive;
  const control = new SettlementControl(values.store, queue, values.turnKey());
  values.control = notices.control = legacy ? { gate: () => control.gate() } : control;
  return { proc, a, values, notices, recorder: new RecordedNotices(notices, "whole"), control };
}
const framesAfter = async (db: MemDb, at: number) =>
  ((await db.comp.feedPage(at, 100000)).transactions as any[]).filter((t) => /^settled-/.test(String(t.commandId))).length;

test("G1: what the frame guards refuse: a pace change, a pause set and cleared, another account's Publish, between a frame's read and its commit", async () => {
  await withEnv(GUARDS, async () => {
    const out: Record<string, unknown> = {};
    for (const event of ["pace", "pause-and-resume", "other-account-publish", "none"] as const) {
      const db = fresh();
      const [A, B] = await accounts(db, [{ name: "acct-g" }, { name: "acct-o" }]);
      await A!.a.publish("g:R1", W0.R1.doc, validTime, "owed");
      await B!.a.publish("o:R1", W0.R1.doc, validTime, "owed");
      await A!.a.publish("g:large", large(1000), validTime, "owed");
      const w = settlerOf(db, A!, "g1-" + event);
      const op = memStore(new Proc(db, "operator"), A!.held, db.scope + "-op") as any;
      let fired = 0;
      db.beforeCommit = async (id) => {
        if (fired || !id.startsWith("settled-")) return;
        fired++;
        if (event === "pace") await setSettlementControl(op, { paceMs: 1, by: "act10" });
        if (event === "pause-and-resume") {
          await setSettlementControl(op, { paused: true, by: "act10" });
          await setSettlementControl(op, { paused: false, by: "act10" });
        }
        if (event === "other-account-publish") await B!.a.publish("o:large", large(1000), validTime, "owed");
      };
      await Promise.all([w.values.runValues(2), w.recorder.record(2)]);
      db.beforeCommit = undefined;
      out[event] = { refused: w.values.contest.refused + w.notices.contest.refused, committed: w.values.contest.committed + w.notices.contest.committed,
        status: (await w.values.values(2))?.value.status };
    }
    console.log("[G1] " + JSON.stringify(out));
    assert.equal((out["other-account-publish"] as any).refused, 0);
  });
});

test("G2: a pause while a frame is in flight, from a settling process with the guards and from one without them", async () => {
  await withEnv(GUARDS, async () => {
    const out: Record<string, unknown> = {};
    for (const legacy of [false, true]) {
      const db = fresh();
      const [A] = await accounts(db, [{ name: "acct-p" }]);
      await A!.a.publish("p:R1", W0.R1.doc, validTime, "owed");
      await A!.a.publish("p:large", large(1000), validTime, "owed");
      const guarded = settlerOf(db, A!, "g2-guarded");
      const other = settlerOf(db, A!, "g2-other", legacy);
      const op = memStore(new Proc(db, "operator"), A!.held, db.scope + "-op") as any;
      let pause: number | undefined;
      db.beforeCommit = async (id) => {
        if (pause === undefined && id.startsWith("settled-")) pause = (await setSettlementControl(op, { paused: true, by: "act10" })).position;
      };
      const runs = Promise.allSettled([guarded.values.runValues(2), guarded.recorder.record(2), other.values.runValues(2), other.recorder.record(2)]);
      await new Promise((x) => setTimeout(x, 1500));
      const after = await framesAfter(db, pause!);
      db.beforeCommit = undefined;
      await setSettlementControl(op, { paused: false, by: "act10" });
      await runs;
      out[legacy ? "secondProcessWithoutGuards" : "bothWithGuards"] = { pauseAt: pause, framesAfterPause: after };
    }
    console.log("[G2] " + JSON.stringify(out));
    assert.equal((out.bothWithGuards as any).framesAfterPause, 0);
  });
});

test("G3: the cost of the guards: store reads and guard checks per frame", async () => {
  const out: Record<string, unknown> = {};
  for (const guards of [false, true]) {
    await withEnv({ ...ON, TX2_SETTLE_CONTROL: "1", TX2_SETTLE_FRAME_GUARDS: guards ? "1" : undefined }, async () => {
      const db = fresh();
      const [A] = await accounts(db, [{ name: "acct-k" }]);
      await A!.a.publish("k:R1", W0.R1.doc, validTime, "owed");
      await A!.a.publish("k:large", large(1000), validTime, "owed");
      const w = settlerOf(db, A!, "g3-" + guards);
      // Disable the 250 ms cache's effect on the count: one control read per frame either way would be the floor.
      const before = w.proc.calls;
      await Promise.all([w.values.runValues(2), w.recorder.record(2)]);
      const frames = w.values.contest.committed + w.notices.contest.committed;
      out[guards ? "guards" : "noGuards"] = { frames, storeCallsPerFrame: Math.round(((w.proc.calls - before) / frames) * 10) / 10 };
    });
  }
  console.log("[G3] " + JSON.stringify(out));
});

test("G4: two turns at once on one values writer (one worker settling the same release twice) beside a later Publish", async () => {
  await withEnv(GUARDS, async () => {
    let storedAfterLater = 0, superseded = 0, stored = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const db = new MemDb("act10-r2-g4-" + seed + "-" + process.pid, seed);
      db.maxYield = 3;
      const [A] = await accounts(db, [{ name: "acct-t" }]);
      await A!.a.publish("t:R1", W0.R1.doc, validTime, "owed");
      await A!.a.publish("t:large", large(1000), validTime, "owed");
      const w = settlerOf(db, A!, "g4");
      const later = (async () => {
        for (let k = db.random.int(40); k > 0; k--) await new Promise((x) => setImmediate(x));
        return (await A!.a.publish("t:later", W0.R2.doc, validTime, "owed")).position;
      })();
      await Promise.allSettled([w.values.runValues(2), w.values.runValues(2), later]);
      const q = await later;
      const row = await w.values.values(2);
      if (row?.value.status === "stored") {
        stored++;
        if (row.at > q) storedAfterLater++;
      } else superseded++;
    }
    console.log("[G4] " + JSON.stringify({ schedules: 400, stored, superseded, storedAfterLaterRelease: storedAfterLater }));
  });
});
