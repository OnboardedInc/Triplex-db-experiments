// [DX-ACT8, fifth round] The frames whose size depends on an account's history, each bounded by construction
// (PUBLISH-BESIDE-SAVES.md section 0.C), and the archive's rows without payload (fourth review Z4). Real code over
// memstore.ts (in process, diagnostic only).
// Run: node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/round5.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { transitionFencesMax, type Permits } from "../actv-lazy/join/account-settings.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { frameEstimate } from "../actv-lazy/join/frames.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { ledgerCapacity, ledgerChange, ledgerKey, ledgerPartChars, ledgerPartKey, ledgerPartsMax, type Ledger } from "../actv-lazy/join/ledger-parts.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { namesOf } from "../actv-lazy/store.ts";
import { Documents, pack } from "../notify1/store.ts";
import { heldAccount, MemDb, memStore, Proc, seedAccount } from "./memstore.ts";

const validTime = W0.POPULATION_VALID_TIME;
const NONE: Permits = { accountKeys: false, frameGuards: false, ledgerCap: false };
let serial = 0;
process.env.TX2_PUBLISH_BESIDE = "1";
process.env.TX2_ENROL_BESIDE_SAVES = "1";
for (const k of ["TX2_ACCOUNT_KEYS", "TX2_SETTLE_FRAME_GUARDS", "TX2_LEDGER_CAP_AT_PUBLISH", "TX2_NOTICE_LEDGER", "TX2_RELEASE_DOCS"]) delete process.env[k];

async function setup(people = 4) {
  const db = new MemDb("act8-r5-" + ++serial + "-" + process.pid, 8800 + serial);
  db.maxYield = 0;
  const cut = await seedAccount(db, "acct-a", people);
  const held = heldAccount("acct-a", people, cut);
  const proc = (name: string, permits: Permits) => {
    const p = new Proc(db, name);
    p.permits = permits;
    return p;
  };
  const account = (p: Proc) => new JoinedAccount(memStore(p, held) as any);
  await account(proc("enrol", NONE)).installHeld(validTime);
  await account(proc("first", NONE)).publish("r1", W0.R1.doc, validTime, "owed");
  return { db, held, proc, account };
}
type Setup = Awaited<ReturnType<typeof setup>>;
const journal = async (db: MemDb) => (await db.comp.feedPage(0, 1_000_000)).transactions as any[];
const settingsOf = async (x: Setup) => {
  const s = memStore(x.proc("peek", NONE), x.held) as any;
  return (await s.controls(await s.head())).settings;
};
const valuesArchive = (x: Setup, label: string) => {
  const p = x.proc(label, NONE);
  return new (Archive as any)(x.account(p), memStore(p, x.held, x.db.scope + "-v-" + label), new BulkQueue(1), "values", "bytes", "progress") as Archive;
};
function tagged(n: number, tag: string) {
  const d = largeRelease(W0.R1.doc, parseShape("forms=" + n + ",policies=" + n + ",permille=1000"));
  const fix = (s: string) => s.replace(/^form:f/, "form:" + tag).replace(/^pol:p/, "pol:" + tag);
  const doc = { ...d, forms: d.forms!.map((f) => ({ ...f, id: fix(f.id) })), policies: d.policies!.map((p) => ({ ...p, id: fix(p.id), form: fix(p.form) })) };
  W0.compileRelease(doc as never);
  return doc as W0.ReleaseDoc;
}

test("R5-1: a transition fences at most transitionFencesMax owed releases; over it, a permitted Publish is refused (retryable, nothing written) until the settlers drain the backlog", async () => {
  const x = await setup();
  // R1 and 32 more owed releases, none of whose values is settled: 33 rows the transition would fence.
  for (let k = 0; k < transitionFencesMax; k++) await x.account(x.proc("pub-" + k, NONE)).publish("b" + k, k % 2 ? W0.R1.doc : W0.R2.doc, validTime, "owed");
  const before = (await journal(x.db)).length;
  const refused = await x.account(x.proc("permitted", { ...NONE, ledgerCap: true })).publish("p1", W0.R2.doc, validTime, "owed")
    .then(() => "published", (e) => String(e?.constructor?.name) + ": " + String(e?.message).slice(0, 160));
  const wrote = (await journal(x.db)).length - before;
  const settingsWhileBacklog = await settingsOf(x);
  // The settlers drain one release (R1, sequence 1; its values are superseded by the later releases): 32 pending, within
  // the bound.
  const r1 = await valuesArchive(x, "drain").runValues(1);
  const landed = await x.account(x.proc("permitted-2", { ...NONE, ledgerCap: true })).publish("p1", W0.R2.doc, validTime, "owed")
    .then((r) => "published at " + r.position, (e) => "refused: " + String(e?.message).slice(0, 160));
  const transition = (await journal(x.db)).filter((t) => t.actor === "lazy/settings");
  const ops = transition.map((t) => t.changes.length);
  const out = { refused, wrote, settingsWhileBacklog: settingsWhileBacklog ?? null, r1: r1.status, landed, settings: await settingsOf(x), transitionChanges: ops };
  console.log("[R5-1] " + JSON.stringify(out));
  assert.match(refused, /^SettingsPending: Publish refused for now/);
  assert.equal(wrote, 0, "the refused Publish wrote nothing");
  assert.equal(settingsWhileBacklog, undefined);
  assert(r1.status === "stored" || r1.status === "superseded", "R1's values settled (stored, or superseded by a later release)");
  assert.match(landed, /^published/);
  assert.equal((await settingsOf(x))?.ledgerCap, true);
  assert.equal(transition.length, 1);
  // The origin (retract, assert), the calendar (retract, assert), 32 values rows, the cursor (none yet): at most
  // 2 + 2 + 2 x 32 + 2 changes.
  assert(ops[0]! <= 2 + 2 + 2 * transitionFencesMax + 2, "the transition's size is bounded by construction");
});

test("R5-2: under the archive a retired item's row holds its ID, subject and sequence only (no payload); re-added, it continues its sequence", async () => {
  const x = await setup(2);
  const permitted = { ...NONE, ledgerCap: true };
  const notices = async (label: string) => {
    const p = x.proc(label, NONE), a = x.account(p);
    const archive = new (Archive as any)(a, memStore(p, x.held, x.db.scope + "-n-" + label), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
    const tail = (await a.notices.observe()).value.sequence;
    await new RecordedNotices(archive, undefined).record(tail);
    return archive;
  };
  await x.account(x.proc("pub-a", permitted)).publish("a", tagged(30, "a"), validTime, "owed", undefined, { docs: "ref" } as never);
  await notices("n1");
  await x.account(x.proc("pub-b", permitted)).publish("b", tagged(30, "b"), validTime, "owed", undefined, { docs: "ref" } as never);
  await notices("n2");
  await x.account(x.proc("pub-a2", permitted)).publish("a2", tagged(30, "a"), validTime, "owed", undefined, { docs: "ref" } as never);
  const archive = await notices("n3");
  const s = memStore(x.proc("peek", NONE), x.held) as any, head = await s.head();
  const prefix = (archive as any).db.prefix as string;
  // Every archive row in the database, read by its entity (the documents' rows are entity `prefix + key`).
  const all = (await journal(x.db)).flatMap((t) => t.changes).filter((c: any) => String(c.entityId).startsWith(prefix + "recorded-retired:"));
  const ndb = new Documents(s.comp, "settlement-notices" + namesOf(s).documents);
  const keys = [...new Set(all.map((c: any) => String(c.entityId).slice(prefix.length)))];
  const values = [...(await ndb.rows<any>(keys, head)).values()].map((r) => r.value);
  const shapes = [...new Set(values.map((v) => Object.keys(v).sort().join(",")))];
  const seqs = [...new Set(values.map((v) => String(v.seq)))].sort();
  const deliveries = ((await new RecordedNotices(archive, undefined).packets(head)) as any[]).flatMap((p) => p.deliveries);
  const comeBack = deliveries.filter((d) => String(d.seq) === "2").length;
  const out = { archiveRows: keys.length, shapes, seqs, deliveries: deliveries.length, comeBack };
  console.log("[R5-2] " + JSON.stringify(out));
  assert(keys.length > 0, "items retired into the archive");
  assert.deepEqual(shapes, ["id,retired,seq,subject"], "an archive row holds no payload");
  assert(comeBack > 0, "a re-added item is delivered at its sequence + 1");
});

test("R5-3: every closing piece of a ledger change, with the cursor change, fits the writer's bound, from any old ledger to any new one (by construction)", () => {
  const db = new Documents({ scopeName: "r5-3" } as never, "settlement-notices-" + "x".repeat(24));
  const max = ledgerPartsMax(), subject = "pl:s99999999", sha = "0".repeat(64), id = "f".repeat(40);
  const cursor = { epoch: "0".repeat(26), event: 999999, start: 999999, parent: sha, batch: 999999999, previous: sha,
    entries: 999999999999, frames: "bytes", part: 999999, ledger: "parts", erasureSeq: 999999, archive: true };
  // Items as the kernel writes them (hashed IDs, a due date and a form each), so the packed (compressed) length grows
  // with the count as a real ledger's does.
  const item = (k: number) => ({ id: "wi:" + sha256(subject + ":" + k), payload: canonical({ dueAt: "2026-11-" + String(1 + (k % 30)).padStart(2, "0") + "T23:59:59.999999Z", form: "form:f" + k }), retired: false, seq: 999999n, subject });
  /** The most items whose packed ledger is at most `chars` characters (bisection over the count). */
  const itemsOf = (chars: number) => {
    const of = (n: number) => Array.from({ length: n }, (_, k) => item(k)).sort((x, y) => (x.id < y.id ? -1 : 1));
    let lo = 1, hi = 1;
    while (pack(of(hi)).length <= chars) hi *= 2;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (pack(of(m)).length <= chars) lo = m; else hi = m; }
    return of(lo);
  };
  const olds: Ledger[] = [{ items: [{ ...item(-1) }] as any, head: { id, value: "x", at: 1 } as any, parts: [] }];
  for (let k = 1; k <= max; k++)
    olds.push({ items: [{ ...item(-2) }] as any, head: { id, value: { parts: k, event: 999999, chars: k * ledgerPartChars, sha }, at: 1 } as any,
      parts: Array.from({ length: k }, () => ({ id, value: "", at: 1 } as any)) });
  const rows: Record<string, unknown>[] = [];
  let worst = 0;
  for (const target of [100, ledgerPartChars - 500, ledgerPartChars, ledgerPartChars + 1, 3 * ledgerPartChars, (max - 1) * ledgerPartChars + 1, max * ledgerPartChars - 200]) {
    const items = itemsOf(target);
    for (const old of olds) {
      const change = ledgerChange(db, subject, 999999, old, items);
      const closing = [...change.closing, { op: "retract" as const, id }, db.put("notice-progress", cursor)];
      const e = frameEstimate(closing);
      worst = Math.max(worst, e.us);
      for (const p of change.parts) assert(frameEstimate([p, { op: "retract" as const, id }, db.put("notice-progress", cursor)]).fits, "a part fits");
      rows.push({ target, oldParts: old.parts.length, newParts: change.parts.length, closingUs: e.us, fits: e.fits });
    }
  }
  const whole = ledgerCapacity("whole");
  console.log("[R5-3] " + JSON.stringify({ partsMax: max, wholeCapacity: whole, partChars: ledgerPartChars, worstClosingUs: worst, cases: rows.length, failing: rows.filter((r) => !r.fits) }));
  assert(whole >= ledgerPartChars, "a whole ledger of one part's characters fits beside the cursor");
  assert(rows.every((r) => r.fits), "every closing piece fits");
  void ledgerKey; void ledgerPartKey;
});

test("R5-4: a transition refused at every try (a write to a row it fences before each commit): the permitted Publish waits four rounds, then is refused, retryable, having written nothing; with no one busy the next one turns the settings on and the cap applies", async () => {
  const x = await setup();
  const record = async (label: string) => {
    const p = x.proc(label, NONE), a = x.account(p);
    const archive = new (Archive as any)(a, memStore(p, x.held, x.db.scope + "-n-" + label), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
    await new RecordedNotices(archive, undefined).record((await a.notices.observe()).value.sequence);
  };
  await record("n1");
  // Before each transition's commit, a writer rewrites the notice cursor (a row every transition fences) with its own value.
  const busy = memStore(x.proc("busy", NONE), x.held) as any;
  const cursors = new Documents(busy.comp, "settlement-notices" + namesOf(busy).documents);
  let tries = 0;
  x.db.beforeCommit = async (id) => {
    if (!id.startsWith("account-settings:")) return;
    tries++;
    const head = await busy.head(), row = await cursors.row<any>("notice-progress", head);
    await busy.commit("busy-" + tries, "lazy/settlement", cursors.change("notice-progress", row, row!.value), head);
  };
  const before = (await journal(x.db)).filter((t) => t.actor !== "lazy/settlement").length;
  const over = await x.account(x.proc("permitted", { ...NONE, ledgerCap: true })).publish("over", tagged(1700, "o"), validTime, "owed", undefined, { docs: "ref" } as never)
    .then(() => "published", (e) => String(e?.constructor?.name) + ": " + String(e?.message).slice(0, 120));
  x.db.beforeCommit = undefined;
  const wrote = (await journal(x.db)).filter((t) => t.actor !== "lazy/settlement").length - before;
  const settingsWhileBusy = await settingsOf(x);
  const again = await x.account(x.proc("permitted-2", { ...NONE, ledgerCap: true })).publish("over", tagged(1700, "o"), validTime, "owed", undefined, { docs: "ref" } as never)
    .then(() => "published", (e) => String(e?.constructor?.name) + ": " + String(e?.message).slice(0, 120));
  const out = { tries, over, wrote, settingsWhileBusy: settingsWhileBusy ?? null, again, settings: await settingsOf(x) };
  console.log("[R5-4] " + JSON.stringify(out));
  assert.equal(tries, 32, "four rounds of eight tries");
  assert.match(over, /^SettingsPending: Publish refused for now/);
  assert.equal(wrote, 0, "the refused Publish wrote nothing");
  assert.equal(settingsWhileBusy, undefined);
  assert.match(again, /^ReleaseTooLarge: Release refused: one subject could owe/);
  assert.equal((await settingsOf(x))?.ledgerCap, true);
});
