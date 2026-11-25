// [DX-ACT8, third review U9] No lifetime limit: one held account publishes far more distinct notice policies over time
// than one ledger can hold (about 1,580 by the ledger cap's count), with the retired-item archive the settings turn on.
// Real code over memstore.ts (in process). Run:
//   node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/lifetime.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { worldsAt } from "../actv-lazy/decision.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { type Permits } from "../actv-lazy/join/account-settings.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { toWire } from "../actv-lazy/join/check.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { ledgerCapacity, readFullLedgers, readLedgers, worstLedgerChars, noticeItems } from "../actv-lazy/join/ledger-parts.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { Documents } from "../notify1/store.ts";
import { heldAccount, MemDb, memStore, Proc, seedAccount } from "./memstore.ts";

const validTime = W0.POPULATION_VALID_TIME;
const NONE: Permits = { accountKeys: false, frameGuards: false, ledgerCap: false };
process.env.TX2_PUBLISH_BESIDE = "1";
process.env.TX2_ENROL_BESIDE_SAVES = "1";
for (const k of ["TX2_ACCOUNT_KEYS", "TX2_SETTLE_FRAME_GUARDS", "TX2_LEDGER_CAP_AT_PUBLISH", "TX2_NOTICE_LEDGER", "TX2_RELEASE_DOCS"]) delete process.env[k];

/** A large release whose forms and notice policies carry `tag` in their IDs (distinct policies across tags). */
function tagged(n: number, tag: string, base = W0.R1.doc) {
  const d = largeRelease(base, parseShape("forms=" + n + ",policies=" + n + ",permille=1000"));
  const fix = (s: string) => s.replace(/^form:f/, "form:" + tag).replace(/^pol:p/, "pol:" + tag);
  const doc = { ...d, forms: d.forms!.map((f) => ({ ...f, id: fix(f.id) })), policies: d.policies!.map((p) => ({ ...p, id: fix(p.id), form: fix(p.form) })) };
  W0.compileRelease(doc as never);
  return doc as W0.ReleaseDoc;
}
const outcome = (p: Promise<{ position: number }>) =>
  p.then((r) => ({ ok: true as const, position: r.position }), (e) => ({ ok: false as const, error: String(e?.message).split("\n")[0]!.slice(0, 200) }));

test("U9: 4,000 distinct notice policies over 12 releases of one account: every release publishes and records, the ledgers hold the items in force only, the fold is exact", async () => {
  const db = new MemDb("act8-lifetime-" + process.pid, 1);
  db.maxYield = 0;
  const proc = (name: string, permits: Permits) => {
    const p = new Proc(db, name);
    p.permits = permits;
    return p;
  };
  const cut = await seedAccount(db, "acct-a", 4);
  const held = heldAccount("acct-a", 4, cut);
  const account = (p: Proc) => new JoinedAccount(memStore(p, held) as any);
  await account(proc("enrol", NONE)).installHeld(validTime);
  const docs = new Map<number, W0.ReleaseDoc>();
  const r1 = await account(proc("first", NONE)).publish("r1", W0.R1.doc, validTime, "owed");
  docs.set(r1.position, W0.R1.doc);
  // The settler (allowed nothing: it follows the stored settings) records every notice through the tail.
  const settle = async (label: string) => {
    const p = proc(label, NONE), a = account(p);
    const n = new (Archive as any)(a, memStore(p, held, db.scope + "-n-" + label), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
    const tail = (await a.notices.observe()).value.sequence;
    return new RecordedNotices(n, undefined).record(tail).then(() => "recorded", (e) => String(e?.constructor?.name) + ": " + String(e?.message).slice(0, 200));
  };
  // A publisher allowed the ledger cap: its first Publish turns the settings on (parts, archive, cap).
  const publisher = proc("publisher", { ...NONE, ledgerCap: true });
  const rounds: Record<string, unknown>[] = [];
  const publishAndSettle = async (name: string, doc: W0.ReleaseDoc) => {
    const r = await outcome(account(publisher).publish(name, doc, validTime, "owed", undefined, { docs: "ref" }));
    if (r.ok) docs.set(r.position, doc);
    const recorded = r.ok ? await settle("settler-" + name) : "not published";
    rounds.push({ name, published: r.ok, recorded, ...(r.ok ? {} : { error: r.error }) });
    return { r, recorded };
  };
  for (let k = 0; k < 10; k++) {
    const { r, recorded } = await publishAndSettle("g" + k, tagged(400, "g" + k));
    assert(r.ok, "release g" + k + " publishes");
    assert.equal(recorded, "recorded", "the notices of g" + k + " record");
  }
  // The policies of the first release again: their archived items come back and continue at their sequence + 1.
  const again = await publishAndSettle("g0-again", tagged(400, "g0"));
  assert(again.r.ok && again.recorded === "recorded");
  // One release over what a ledger can hold is refused at its Publish (the cap is per release now) ...
  const over = await outcome(account(publisher).publish("over", tagged(1700, "o"), validTime, "owed", undefined, { docs: "ref" }));
  assert(!over.ok && /Release refused/.test(over.error), "a release over what one ledger holds is refused: " + JSON.stringify(over));
  // ... and a release adding no notice policy after it publishes.
  const r2 = await publishAndSettle("r2", W0.R2.doc);
  assert(r2.r.ok && r2.recorded === "recorded");

  // The oracle: the kernel's fold over every event, every subject, with the whole state (retired items kept).
  const peek = memStore(proc("peek", NONE), held) as any;
  const a = account(proc("check", NONE));
  const head = await peek.head();
  const settings = (await peek.controls(head)).settings;
  assert(settings?.archive && settings?.ledger === "parts" && settings?.ledgerCap);
  const roster = Array.from({ length: 4 }, (_, i) => W0.placementId(i));
  const tail = (await a.notices.observe()).value.sequence;
  const state = new Map<string, W0.ItemState[]>();
  const want: unknown[] = [];
  for (let n = 1; n <= tail; n++) {
    const e = await a.notices.event(n, head);
    const doc = docs.get(e.at)!;
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
  const n = new (Archive as any)(a, memStore(proc("reader", NONE), held, db.scope + "-reader"), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
  const got = (await new RecordedNotices(n, undefined).packets(head)).flatMap((p: any) => p.deliveries.map(toWire));
  assert.equal(got.length, want.length);
  assert.equal(canonical(got), canonical(want), "every recorded notice, in order, is the fold's");
  const ndb = new Documents(db.comp as any, "settlement-notices-acct-a");
  const full = await readFullLedgers(ndb, roster, head, (s) => (state.get(s) ?? []).map((i) => i.id));
  const live = await readLedgers(ndb, roster, head);
  const comeBack = (want as any[]).filter((d) => /"seq":"?2/.test(canonical(d))).length;
  const out = {
    rounds,
    distinctPolicies: 10 * 400,
    notices: got.length,
    perSubject: roster.map((s) => ({
      everHeld: state.get(s)!.length,
      inForce: state.get(s)!.filter((i) => !i.retired).length,
      ledger: live.get(s)!.items.length,
      ledgerParts: live.get(s)!.parts.length,
      archived: full.get(s)!.archived,
    })),
    deliveriesWithSequence2: comeBack,
    capacityChars: ledgerCapacity("parts"),
    worstCharsOf400: worstLedgerChars(noticeItems([tagged(400, "x")]).items),
  };
  console.log("[U9] " + JSON.stringify(out));
  for (const s of roster) {
    assert.equal(canonical(full.get(s)!.items), canonical(state.get(s)), "the ledger and its archive are the fold's whole state: " + s);
    assert.equal(canonical(live.get(s)!.items), canonical(state.get(s)!.filter((i) => !i.retired)), "the ledger holds the items in force only: " + s);
    assert(state.get(s)!.length > 4000, "the subject held more items over time than one ledger can: " + s);
  }
  assert(comeBack >= 4 * 400, "the first release's items came back at sequence 2");
});

test("U9: the cap is one release's: two releases of 1,000 policies each publish; their union in one release is refused; either again publishes", async () => {
  const db = new MemDb("act8-lifetime-cap-" + process.pid, 2);
  db.maxYield = 0;
  const proc = (name: string, permits: Permits) => {
    const p = new Proc(db, name);
    p.permits = permits;
    return p;
  };
  const cut = await seedAccount(db, "acct-c", 4);
  const held = heldAccount("acct-c", 4, cut);
  const account = (p: Proc) => new JoinedAccount(memStore(p, held) as any);
  await account(proc("enrol", NONE)).installHeld(validTime);
  await account(proc("first", NONE)).publish("r1", W0.R1.doc, validTime, "owed");
  const publisher = proc("publisher", { ...NONE, ledgerCap: true });
  const offer = (name: string, doc: W0.ReleaseDoc) => outcome(account(publisher).publish(name, doc, validTime, "owed", undefined, { docs: "ref" }));
  const a = tagged(1000, "a"), b = tagged(1000, "b");
  const union = { ...a, forms: [...a.forms!, ...b.forms!], policies: [...a.policies!, ...b.policies!] } as W0.ReleaseDoc;
  W0.compileRelease(union as never);
  const out = { a: await offer("a", a), b: await offer("b", b), union: await offer("union", union), aAgain: await offer("a-again", a), r2: await offer("r2", W0.R2.doc) };
  console.log("[U9 cap] " + JSON.stringify(out));
  assert(out.a.ok && out.b.ok, "each release of 1,000 policies fits one ledger");
  assert(!out.union.ok && /no earlier|0 not published before|an earlier release held all at once/.test((out.union as any).error), "their union does not fit one ledger and no single earlier release held it");
  assert(out.aAgain.ok && out.r2.ok);
});
