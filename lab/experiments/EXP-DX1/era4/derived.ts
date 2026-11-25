// [DX-ERA4] T1, the failing test of era4/DERIVED-COPIES.md section 2 (driven by era4/run.sh, which owns the gateway):
//   node --experimental-transform-types lab/experiments/EXP-DX1/era4/derived.ts OUT DUMP_DIR
// W0's rule DOCEXP reads two protected attributes of a subject's document: it copies `docType` and `expiresOn` verbatim
// into `notify.document-expired`, and that notice exists only if the expiry date is past (a property of the protected
// value). (EVSUB, which reads the SSN, cannot run here: the joined account refuses SSN input, account.ts 379.) Two accounts (A: subjects X, Y, Z; B: subject W), each a W0
// lazy store with its settlement and notice archives; A's notices delivered into a recipient database. Then X's ssn and
// document's type and expiry are removed and every route and every stored byte is scanned for them and their derivatives. Then the
// stream goes on (saves of X and Y, recorded and delivered) and is checked against an independent oracle.
// Counts are the result; times are diagnostic (Mac).
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { inflateRawSync } from "node:zlib";
import { inspect } from "node:util";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { W0, canonical, triplexValue } from "../../../bench/lib/w0-world.ts";
import { counters, derivedSealOn, isRemoved, isSealed, open } from "../../../bench/lib/derived-seal.ts";
import { Documents, hash, parse, unpack } from "../notify1/store.ts";
import type { Packet } from "../notify1/dispatcher.ts";
import { openStore, fact, type Store } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { valid } from "../actv-lazy/fixture.ts";
import { rosterRoot, rosterSeal } from "../actv-lazy/read.ts";
import { worldsAt } from "../actv-lazy/decision.ts";

const [out, dumpDir] = process.argv.slice(2);
assert(out && dumpDir);
const sealOn = derivedSealOn();
// ERA4_SEALED=0: an unsealed protected database (today the derived writers run only there: on a sealed one their
// transactions' staged reads are refused, ProtectedPreviewUnavailable).
const SEALED = process.env.ERA4_SEALED !== "0";
const RUN = randomUUID().slice(0, 8);
const url = process.env.DATOMIC_URL!;
const peer = new DatomicClient(url);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data }, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  console.log(line);
  fs.appendFileSync(path.join(out, "derived.jsonl"), line + "\n");
};
const dbOf = (s: Pick<Store, "scope">) =>
  "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(s.scope))).toString("base64url");

// ---- the values: removed (X), kept (Y, Z, W), and an unprotected control ----
// Expiry dates: X, Y and W expired at the valid time (2026-11-04), Z not (so Z has no notice).
const X_EXP = "2026-02-13", Y_EXP = "2025-12-29", Z_EXP = "2027-08-15", W_EXP = "2026-01-22";
const CONTROL = "era4-control-" + RUN;
const X = W0.placementId(0), Y = W0.placementId(1), Z = W0.placementId(2);
const PROTECTED = ["docType", "expiresOn"];
const docOf = (s: string) => s + "/doc:a";

const seed = (e: string, a: string, v: string | number) => ({
  op: "assert" as const,
  entityId: e,
  attribute: a,
  value: triplexValue(a, v),
  validFrom: 0,
});
function subjectFacts(s: string, expires: string) {
  return [
    seed(s, "bgcStatus", "clear"),
    seed(s, "weeklyMinutes", 2400),
    seed(s, "location", "loc:era4"),
    seed(s, "payRateCents", 1660),
    seed(s, "baselinePayRateCents", 1660),
    seed(s, "documents", docOf(s)),
    seed(docOf(s), "docType", "ead"),
    seed(docOf(s), "expiresOn", expires),
  ];
}
async function account(scope: string, people: { id: string; expires: string }[]) {
  const store = await openStore(scope);
  const db = dbOf(store);
  await peer.declareProtection(db, PROTECTED, SEALED);
  // [DX-ERA4] ERA4_MOVE=1 (with TX2_REMOVAL_PER_ACCOUNT=1 on the gateway): the source database guarded per account, so the
  // removal runs DX-ERA2's per-account path (and TX2_REMOVAL_COMMIT_BOUNDARY applies). Unset: database-wide, as before.
  if (process.env.ERA4_MOVE === "1") await peer.request("POST", `/v2/db/${db}/removal-per-account`, {});
  const a = new JoinedAccount(store);
  const ids = people.map((p) => p.id);
  await store.input("era4-seed", { kind: "baseline", at: valid }, [
    fact(rosterRoot(0), "lazy/members", ids),
    fact("members/seal", "lazy/roster-seal", rosterSeal(ids)),
    seed("loc:era4", "jurisdiction", "jur:era4"),
    seed("loc:era4", "localMinWageCents", 1700),
    seed("jur:era4", "stateMinWageCents", 1650),
    ...people.flatMap((p) => subjectFacts(p.id, p.expires)),
    fact("ctl:era4", "era4/note", CONTROL),
  ]);
  await a.install(ids, valid);
  await a.publish("era4-one", W0.R1.doc, valid, "owed", undefined, { sources: "census" });
  const first = (await a.notices.observe()).value.sequence;
  const values = await Archive.open(a, new BulkQueue(1));
  const noticeArchive = await Archive.open(a, new BulkQueue(1), "notices");
  await values.runValues(first);
  const notices = new RecordedNotices(noticeArchive);
  await notices.record(first);
  return { store, db, a, ids, first, values, noticeArchive, notices };
}
type Account = Awaited<ReturnType<typeof account>>;
const packetsOf = async (acc: Account) => {
  const at = await acc.noticeArchive.store.head();
  return sealOn ? acc.notices.openedPackets(at) : acc.notices.packets(at);
};
const deliveriesOf = (ps: Packet[], subject: string) =>
  ps.flatMap((p) => p.deliveries.filter((d) => d.subject === subject).map((d) => ({ event: p.event, d })));

// ---- the scan ----
/** Every string a stored or answered value can carry, decoded every way the store encodes: JSON (walked), deflate plus
 * base64 (inflated), recursively. */
function expand(v: unknown, into: string[], depth = 0) {
  if (depth > 6 || v === null || v === undefined) return;
  if (typeof v === "string") {
    into.push(v);
    // A row text is a header then a JSON array; JSON written by the gateway escapes "/" as "\/".
    const plain = v.replace(/\\\//g, "/");
    for (const start of new Set([0, plain.indexOf("["), plain.indexOf("{")].filter((i) => i >= 0)))
      if (/^[\[{"]/.test(plain.slice(start).trim()))
        try {
          expand(JSON.parse(plain.slice(start)), into, depth + 1);
        } catch {}
    for (const m of plain.match(/[A-Za-z0-9+/]{24,}={0,2}/g) ?? [])
      try {
        expand(inflateRawSync(Buffer.from(m, "base64")).toString("utf8"), into, depth + 1);
      } catch {}
    return;
  }
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return into.push(String(v)), undefined;
  if (Array.isArray(v)) for (const x of v) expand(x, into, depth + 1);
  else if (typeof v === "object") for (const x of Object.values(v as object)) expand(x, into, depth + 1);
}
const places = new Map<string, string[]>();
function place(name: string, v: unknown) {
  const into = places.get(name) ?? [];
  expand(v, into);
  places.set(name, into);
}
async function openAllSealed(name: string) {
  // The store's remaining keys: every sealed derived record found in a place, opened through its database.
  const found = [...new Set((places.get(name) ?? []).flatMap((s) => s.match(/tdx1\.[A-Za-z0-9_.-]+/g) ?? []))];
  const opened = found.length ? await open(url, found) : [];
  place(name + "+opened", opened.filter((v) => !isRemoved(v)));
  return { sealed: found.length, opened: opened.filter((v) => !isRemoved(v)).length };
}
async function req<T>(method: string, p: string, body?: unknown) {
  return peer.request<T>(method as never, p, body as never);
}
async function routes(label: string, db: string, before: number, comp: Store["comp"]) {
  // Journal pages: the transactions route (each transaction's own rows), then each transaction's journal entry with its
  // change records (the route the SDK's feed reads), masked by the gateway as every read is.
  const page = await req<{ transactions: [string, number, string[]][] }>("POST", `/v2/db/${db}/transactions`, { after: 0, limit: 1000 });
  assert(page.transactions.length < 1000);
  place(`journal:${label}`, page);
  const entities = new Set<string>();
  const cells = (t: string) => JSON.parse(t.slice(t.indexOf("["))) as unknown[];
  for (const [txId, , rows] of page.transactions) {
    for (const t of rows) {
      const c = cells(t);
      if (c[3] === ":_tx/changed-entity" && typeof c[5] === "string") entities.add(c[5]);
    }
    const j = await req<unknown>("POST", `/v2/db/${db}/journal`, { txId });
    place(`journal:${label}`, j);
  }
  // The feed from the start (the lean layout's feed pages; the identity-only log route is not on this layout).
  try {
    for (let after = 0, n = 0; n < 500; n++) {
      const pg = await comp.feedPage!(after, 16);
      if (!pg.transactions.length) break;
      place(`feed:${label}`, pg);
      after = pg.transactions.at(-1)!.position;
    }
  } catch (e) {
    // Known before this work (ACT9 page 10.1): the SDK's feed decode stops at a removal's transaction.
    refused[`feed:${label}`] = String((e as Error).cause ?? (e as Error).message).slice(0, 120);
  }
  const list = [...entities];
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    place(`rows-current:${label}`, await peer.rows(db, { entityIds: chunk }));
    place(`rows-history:${label}`, await peer.rows(db, { entityIds: chunk, history: true }));
    place(`rows-pinned-before:${label}`, await peer.rows(db, { entityIds: chunk, basis: { recordedPosition: before } }));
    place(`rows-pinned-before-history:${label}`,
      await peer.rows(db, { entityIds: chunk, history: true, basis: { recordedPosition: before } }));
  }
  return list.length;
}
async function dump(n: number) {
  fs.writeFileSync(path.join(dumpDir, "dump-request-" + n), "1");
  for (let i = 0; i < 600 && !fs.existsSync(path.join(dumpDir, "dump-done-" + n)); i++) await sleep(200);
  assert(fs.existsSync(path.join(dumpDir, "dump-done-" + n)), "the gateway did not dump");
  const lines = fs.readFileSync(path.join(dumpDir, "dump-" + n + ".jsonl"), "utf8").trim().split("\n");
  for (const l of lines) {
    const r = JSON.parse(l) as { db: string; a: string; v: string };
    place(r.a === "opened:protected" ? `native-opened:${r.db}` : `native:${r.db}`, r.v);
  }
  return lines.length;
}
function count(needles: Record<string, string>) {
  const table: Record<string, Record<string, number>> = {};
  for (const [label, needle] of Object.entries(needles)) {
    table[label] = {};
    for (const [name, list] of places) {
      const n = list.reduce((k, s) => k + (s.includes(needle) ? 1 : 0), 0);
      if (n) table[label]![name] = n;
    }
  }
  return table;
}

// ---- the oracle (independent of the recorder's ledgers, sealing and forgetting): W0's kernel on each subject's world
// read through the gateway when the event is recorded, folded with W0.publish; a subject whose items were computed from
// a world holding a removed assertion is forgotten at the first event after the removal (section 3.4). ----
type OracleSubject = { items: W0.ItemState[]; inputs: Set<string>; generation: number };
const oracle = new Map<string, OracleSubject>();
async function oracleStep(acc: Account, n: number, removed: Set<string>, removalSeq: number) {
  const e = await acc.a.notices.event(n, await acc.store.head());
  const subjects = e.value.kind === "activation" ? acc.ids : (e.value.selection as { ids: string[] }).ids;
  const worlds = await worldsAt(acc.store, "w0", subjects, { tx: e.at, validTime: e.value.validTime });
  const policy = W0.RELEASES_BY_HASH.get(e.value.nextHash)!;
  const expected = new Map<string, W0.Delivery[]>();
  for (const [i, s] of subjects.entries()) {
    const rows = await peer.rows(acc.db, { entityIds: [s, docOf(s)], basis: { recordedPosition: e.at } });
    const o = oracle.get(acc.db + s) ?? { items: [], inputs: new Set(), generation: 0 };
    if ([...o.inputs].some((id) => removed.has(id))) (o.items = [], (o.inputs = new Set()), (o.generation = removalSeq));
    const result = W0.evaluateWorld(worlds[i]!, policy, { tx: e.at, validTime: e.value.validTime });
    assert(!("error" in result));
    const r = W0.publish({ items: o.items, subjects: [], pending: [] }, [
      { subject: s, release: e.value.nextHash, basis: { tx: BigInt(e.at), validTime: e.value.validTime }, workItems: result.workItems },
    ]);
    o.items = [...r.state.items];
    for (const row of rows) if (row.value_type === "string") o.inputs.add(row.id);
    oracle.set(acc.db + s, o);
    expected.set(s, r.deliveries);
  }
  return expected;
}
function compare(acc: Account, n: number, expected: Map<string, W0.Delivery[]>, ps: Packet[]) {
  let same = 0, differ = 0;
  for (const [s, want] of expected) {
    const got = deliveriesOf(ps, s).filter((x) => x.event === n).map((x) => x.d as W0.Delivery & { generation?: number });
    const g = oracle.get(acc.db + s)!.generation;
    const strip = (d: W0.Delivery & { generation?: number }) => {
      const { generation: _g, ...rest } = d;
      return canonical(rest);
    };
    const ok = canonical(got.map(strip)) === canonical(want.map(strip)) &&
      got.every((d) => !sealOn || (d.generation ?? 0) === g);
    ok ? same++ : (differ++, log("stream-differ", { account: acc.db.slice(0, 16), event: n, subject: s, got, want, generation: g }));
  }
  return { same, differ };
}

// ---- the run ----
const t0 = performance.now();
const A = await account("lazy-era4-a-" + RUN, [
  { id: X, expires: X_EXP },
  { id: Y, expires: Y_EXP },
  { id: Z, expires: Z_EXP },
]);
const B = await account("lazy-era4-b-" + RUN, [{ id: W0.placementId(5), expires: W_EXP }]);
const sink = await openStore("lazy-era4-sink-" + RUN);
const sinkDocs = new Documents(sink.comp, "sink");
// A second recipient that receives nothing until after the removal: packets recorded before it, delivered after it
// (section 3.5), then the stream after it.
const late = await openStore("lazy-era4-late-" + RUN);
const lateDocs = new Documents(late.comp, "sink");
const deliveredFirst = await A.notices.deliver(sinkDocs, await A.noticeArchive.store.head());
const oracleA1 = await oracleStep(A, A.first, new Set(), 0);
const oracleB1 = await oracleStep(B, B.first, new Set(), 0);
const before = { A: await packetsOf(A), B: await packetsOf(B) };
const xBefore = deliveriesOf(before.A, X).map((x) => x.d);
const submit = xBefore.find((d) => d.kind === "notify.document-expired");
log("recorded", {
  arm: sealOn ? "on" : "off",
  sealed: SEALED,
  packets: before.A.length,
  deliveries: before.A.reduce((n, p) => n + p.deliveries.length, 0),
  xKinds: xBefore.map((d) => d.kind),
  submitPayload: submit?.payload,
  delivered: deliveredFirst,
  seconds: Math.round((performance.now() - t0) / 100) / 10,
});
log("expected", { event: A.first, kind: (await A.a.notices.event(A.first, await A.store.head())).value.kind,
  bySubject: Object.fromEntries([...oracleA1].map(([k, v]) => [k, v.map((d) => d.kind)])),
  rules: Object.keys((W0.RELEASES_BY_HASH.get((await A.a.notices.event(A.first, await A.store.head())).value.nextHash) as any)?.rules ?? {}) });
assert(submit && submit.payload.includes(X_EXP), "DOCEXP copied X's expiry date into a notice (the rule reads it)");
assert(!deliveriesOf(before.A, Z).some((x) => x.d.kind === "notify.document-expired"), "Z's document has not expired: no notice");
const storedBefore = await A.values.stored(A.first);
const chainA1 = compare(A, A.first, oracleA1, before.A), chainB1 = compare(B, B.first, oracleB1, before.B);
log("stream", { phase: "before", A: chainA1, B: chainB1 });

// Heads before the removal (the pinned-before reads), per database.
const dbs = {
  source: A.db,
  values: dbOf(A.values.store),
  notices: dbOf(A.noticeArchive.store),
  sink: dbOf(sink),
  late: dbOf(late),
  "b-source": B.db,
  "b-notices": dbOf(B.noticeArchive.store),
};
const stores: Record<keyof typeof dbs, { head(): Promise<number>; comp: Store["comp"] }> = {
  source: A.store,
  values: A.values.store,
  notices: A.noticeArchive.store,
  sink,
  late,
  "b-source": B.store,
  "b-notices": B.noticeArchive.store,
};
const heads: Record<string, number> = {};
for (const k of Object.keys(dbs) as (keyof typeof dbs)[]) heads[k] = await stores[k].head();

// ---- the removal ----
const xRows = await peer.rows(A.db, { entityIds: [docOf(X)] });
const ids = PROTECTED.map((a) => xRows.find((r) => r.attribute === a)!.id);
const erased = await peer.erase(A.db, "era4-remove-x-" + RUN, ids.map((id) => ({ id })));
const removed = new Set(ids);
// The shred worker deletes each removed assertion's key file (grace 0, every 500 ms): wait until both are gone.
const keyFile = (id: string) => "assertion-" + createHash("sha256").update(id).digest("hex") + ".key";
const keyFiles = () =>
  fs.existsSync(path.join(dumpDir, "authority"))
    ? fs.readdirSync(path.join(dumpDir, "authority"), { recursive: true }).map(String)
    : [];
const presentBefore = ids.filter((id) => keyFiles().some((f) => f.endsWith(keyFile(id)))).length;
let shredded = false;
for (let i = 0; i < 150 && !shredded; i++) {
  shredded = ids.every((id) => !keyFiles().some((f) => f.endsWith(keyFile(id))));
  if (!shredded) await sleep(200);
}
log("removed", { seq: erased.seq, identities: ids.length, keyFilesJustAfter: presentBefore, shredded });

{
  const rows = await peer.rows(A.db, { entityIds: [docOf(X)], history: true });
  log("x-doc-rows", { rows: rows.map((r) => [r.attribute, r.tx_id, r.retract_tx_id, r.value_type, r.id]) });
}
const lateFirst = await A.notices.deliver(lateDocs, await A.noticeArchive.store.head()).catch((e) => String(e));
log("late-delivery", { arm: sealOn ? "on" : "off", effects: lateFirst });
// ---- the scan after the acknowledgement ----
let refused: Record<string, string> = {};
const tryRead = async (name: string, f: () => Promise<unknown>) => {
  try {
    place(name, await f());
  } catch (e) {
    refused[name] = String((e as Error).message).slice(0, 120);
  }
};
await tryRead("client:packets", () => packetsOf(A));
await tryRead("client:stored", () => A.values.stored(A.first));
await tryRead("client:ledger", async () => {
  const at = await A.noticeArchive.store.head();
  const r = await A.noticeArchive.db.rows<string>(A.ids.map((s) => "recorded-ledger:" + s), at);
  return [...r.values()].map((x) => unpack<unknown>(x.value));
});
const origin = hash([before.A[0]!.account, before.A[0]!.epoch]);
await tryRead("client:recipient", async () => {
  const at = await sinkDocs.head();
  const keys = [...A.ids.map((s) => "receiver:" + origin + ":" + s), ...before.A.map((p) => "effects:" + origin + ":" + p.batch)];
  const r = await sinkDocs.rows<string>(keys, at);
  return [...r.values()].map((x) => unpack<unknown>(x.value));
});
const entityCounts: Record<string, number> = {};
for (const k of Object.keys(dbs) as (keyof typeof dbs)[]) entityCounts[k] = await routes(k, dbs[k], heads[k]!, stores[k].comp);
// ERA4_NO_DUMP=1 (the server run, era4/server.sh): no in-memory gateway to dump; the stored rows are scanned from pg_dump.
const dumped = process.env.ERA4_NO_DUMP === "1" ? 0 : await dump(0);
const openedSealed: Record<string, unknown> = {};
for (const name of [...places.keys()]) if (!name.endsWith("+opened")) openedSealed[name] = await openAllSealed(name);
const needles = {
  "X expiry date (removed)": X_EXP,
  "X document-expired version (derivative)": submit!.version,
  "X document-expired item id (derivative)": submit!.id,
  "Y expiry date (kept)": Y_EXP,
  "W expiry date (kept, account B)": W_EXP,
  "control (unprotected)": CONTROL,
};
const table = count(needles);
const xFound = Object.entries(table)
  .filter(([k]) => k.startsWith("X "))
  .reduce((n, [, v]) => n + Object.values(v).reduce((a, b) => a + b, 0), 0);
log("scan", { arm: sealOn ? "on" : "off", sealed: SEALED, table, refused, entities: entityCounts, dumpedStrings: dumped, sealedFound: openedSealed });

// ---- the stream after the removal ----
const after = { A: await packetsOf(A).catch((e) => String(e)), B: await packetsOf(B) };
const chain = {
  aVerifies: Array.isArray(after.A),
  yUnchanged: Array.isArray(after.A) &&
    canonical(deliveriesOf(after.A, Y)) === canonical(deliveriesOf(before.A, Y)),
  bUnchanged: canonical(after.B) === canonical(before.B),
  xAfter: Array.isArray(after.A) ? deliveriesOf(after.A, X).map((x) => (isRemoved(x.d) ? "removed" : x.d.kind)) : [],
};
log("chain", chain);
let stream: Record<string, unknown> = {};
// Saves after the removal are of an unprotected attribute: a lazy account cannot save a protected one on a sealed
// database (the SDK's in-transaction preview of a protected row is refused, ProtectedPreviewUnavailable, with or
// without this option). A pay change over the threshold gives each subject a new notice.
let step = "save Y";
try {
  await A.a.save("era4-y-pay-" + RUN, { e: Y, a: "payRateCents", values: [9999] }, valid);
  // W0 accepts a removed value only for `ssn` (schema.ts 69): a world holding X's removed document values is W0.E_VALUE.
  // So X's document link goes first (an unprotected reference), then X's pay change.
  step = "unlink X's document";
  await A.a.save("era4-x-unlink-" + RUN, { e: X, a: "documents", values: [] }, valid);
  step = "save X";
  await A.a.save("era4-x-pay-" + RUN, { e: X, a: "payRateCents", values: [9999] }, valid);
  step = "observe";
  const next = (await A.a.notices.observe()).value.sequence;
  step = "oracle";
  const steps: Map<string, W0.Delivery[]>[] = [];
  for (let n = A.first + 1; n <= next; n++) steps.push(await oracleStep(A, n, removed, erased.seq));
  step = "record";
  await A.notices.record(next);
  step = "deliver";
  const effects = await A.notices.deliver(sinkDocs, await A.noticeArchive.store.head());
  const again = await A.notices.deliver(sinkDocs, await A.noticeArchive.store.head());
  step = "late recipient";
  const lateEffects = await A.notices.deliver(lateDocs, await A.noticeArchive.store.head());
  // Both recipients' state of every subject, opened: equal for Y and Z; for X, only X's new generation.
  const origin = hash([before.A[0]!.account, before.A[0]!.epoch]);
  const stateOf = async (docs: Documents, s: string) => {
    const r = await docs.row<string>("receiver:" + origin + ":" + s, await docs.head());
    if (!r) return null;
    const v = unpack<{ g: number; e: unknown[] }>(r.value);
    return { g: v.g, e: (await open(url, v.e)).map((x) => (typeof x === "string" ? x : canonical(x))) };
  };
  const recipients: Record<string, unknown> = {};
  for (const s of A.ids) {
    const [a1, a2] = [await stateOf(sinkDocs, s), await stateOf(lateDocs, s)];
    recipients[s] = { same: canonical(a1) === canonical(a2), generation: [a1?.g, a2?.g], entries: [a1?.e.length, a2?.e.length] };
  }
  stream.late = { effects: lateEffects, recipients };
  const ps = (await packetsOf(A)) as Packet[];
  const cmp = steps.map((m, i) => compare(A, A.first + 1 + i, m, ps));
  stream = {
    ...stream,
    recorded: true,
    events: next - A.first,
    oracle: cmp.reduce((t, c) => ({ same: t.same + c.same, differ: t.differ + c.differ }), { same: 0, differ: 0 }),
    xNew: deliveriesOf(ps, X).filter((x) => x.event > A.first).map((x) => ({ kind: x.d.kind, seq: x.d.seq, generation: (x.d as any).generation })),
    yNew: deliveriesOf(ps, Y).filter((x) => x.event > A.first).map((x) => ({ kind: x.d.kind, seq: x.d.seq, generation: (x.d as any).generation })),
    delivered: effects,
    deliveredAgain: again,
  };
} catch (e) {
  stream = { recorded: false, step, error: String((e as Error).message).slice(0, 200),
    cause: inspect((e as Error).cause ?? e, { depth: 6 }).replace(/\s+/g, " ").slice(0, 1500),
    stack: String((e as Error).stack ?? "").split("\n").filter((l) => l.includes("EXP-DX1") || l.includes("bench/lib")).slice(0, 12).join(" | ") };
}
log("stream", { phase: "after", ...stream });
log("cost", {
  sealCounters: counters,
  packetBytes: before.A.length ? canonical(before.A).length : 0,
  storedBefore: storedBefore.output.length,
});
const pass =
  sealOn &&
  xFound === 0 &&
  (table["control (unprotected)"]?.["native:" + A.db] ?? 0) > 0 &&
  Object.keys(table["Y expiry date (kept)"] ?? {}).some((k) => k.includes("+opened") || k.startsWith("native-opened")) &&
  chain.aVerifies && chain.yUnchanged && chain.bUnchanged &&
  stream.recorded === true && (stream.oracle as { differ: number }).differ === 0 && stream.deliveredAgain === 0 &&
  Object.values(((stream.late as { recipients?: Record<string, { same: boolean }> })?.recipients) ?? { none: { same: false } }).every((r) => r.same);
log("verdict", { arm: sealOn ? "on" : "off", sealed: SEALED, xFound, pass, seconds: Math.round((performance.now() - t0) / 100) / 10 });
peer.close();
for (const s of [A.store, B.store, sink, late, A.values.store, A.noticeArchive.store, B.values.store, B.noticeArchive.store])
  await s.close().catch(() => {});
process.exit(sealOn ? (pass ? 0 : 1) : xFound > 0 ? 0 : 1);
