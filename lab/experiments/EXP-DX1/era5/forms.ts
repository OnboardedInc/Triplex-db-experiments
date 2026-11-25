// [DX-ERA5, second review] Two attacks on DX-ERA4's answer at 73e0d6849 with the real held-path writers, driven by
// era5/run.sh (ERA5_DRIVER=forms.ts):
//   P  Subjects owing F forms (largeRelease(W0.R1, forms=F,policies=F,permille=1000): every subject owes every form),
//      the database setting declared on every database, ledgers whole (the only mode the setting accepts). For each F:
//      does settlement and the recorder finish, and how large is a subject's sealed ledger? Then F=200 in parts with and
//      without the setting. The owner's requirement (decisions 2026-11-24): 200 or more forms.
//   K  One account of three subjects through settlement, the recorder and a delivery into a recipient database, the
//      setting declared everywhere: every datom string of every database (history included, from the gateway's dump,
//      decoded every way the store encodes) searched for the subjects' kept expiry dates in clear, by attribute and by
//      derived-document kind, and each kind checked against the setting's list.
// Counts are the result; times are diagnostic (Mac).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { inflateRawSync } from "node:zlib";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { W0, triplexValue } from "../../../bench/lib/w0-world.ts";
import { counters, derivedSealOn, isRemoved, open, placeOf } from "../../../bench/lib/derived-seal.ts";
import { readLedgers } from "../actv-lazy/join/ledger-parts.ts";
import { Documents, unpack } from "../notify1/store.ts";
import { openStore, fact, type Store } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { valid } from "../actv-lazy/fixture.ts";
import { rosterRoot, rosterSeal } from "../actv-lazy/read.ts";

const [out, dumpDir] = process.argv.slice(2);
assert(out && dumpDir && derivedSealOn(), "era5/forms.ts runs with TX2_DERIVED_SEAL=1");
const RUN = randomUUID().slice(0, 8);
const peer = new DatomicClient(process.env.DATOMIC_URL!, 120_000);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "attack.jsonl"), line + "\n");
};
const dbOf = (s: Pick<Store, "scope">) => "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(s.scope))).toString("base64url");
const requireSealed = (s: Pick<Store, "scope">) => peer.request("POST", `/v2/db/${dbOf(s)}/derived-seal-required`, {});
const X_EXP = "2026-02-13", Y_EXP = "2025-12-29", Z_EXP = "2027-08-15";
const X = W0.placementId(0), Y = W0.placementId(1), Z = W0.placementId(2);
const docOf = (s: string) => s + "/doc:a";
const seed = (e: string, a: string, v: string | number) => ({ op: "assert" as const, entityId: e, attribute: a, value: triplexValue(a, v), validFrom: 0 });
const subjectFacts = (s: string, type: string, expires: string) => [
  // startDate: the synthetic policies read it (W0 kernel.ts 758-787); without it no form is owed
  seed(s, "startDate", "2026-10-01"), seed(s, "bgcStatus", "clear"), seed(s, "weeklyMinutes", 2400), seed(s, "location", "loc:era5"), seed(s, "payRateCents", 1660),
  seed(s, "baselinePayRateCents", 1660), seed(s, "documents", docOf(s)), seed(docOf(s), "docType", type), seed(docOf(s), "expiresOn", expires),
];
async function account(scope: string, release: W0.ReleaseDoc, setting: boolean) {
  const store = await openStore(scope);
  await peer.declareProtection(dbOf(store), ["docType", "expiresOn"], true);
  if (setting) await requireSealed(store);
  const a = new JoinedAccount(store);
  const ids = [X, Y, Z];
  await store.input("era5-seed", { kind: "baseline", at: valid }, [
    fact(rosterRoot(0), "lazy/members", ids), fact("members/seal", "lazy/roster-seal", rosterSeal(ids)),
    seed("loc:era5", "jurisdiction", "jur:era5"), seed("loc:era5", "localMinWageCents", 1700), seed("jur:era5", "stateMinWageCents", 1650),
    ...subjectFacts(X, "visa", X_EXP), ...subjectFacts(Y, "ead", Y_EXP), ...subjectFacts(Z, "ead", Z_EXP),
  ]);
  await a.install(ids, valid);
  await a.publish("era5-forms", release, valid, "owed", undefined, { sources: "census" });
  const first = (await a.notices.observe()).value.sequence;
  const values = await Archive.open(a, new BulkQueue(1));
  const noticeArchive = await Archive.open(a, new BulkQueue(1), "notices");
  if (setting) (await requireSealed(values.store), await requireSealed(noticeArchive.store));
  const notices = new RecordedNotices(noticeArchive);
  return { store, a, first, values, noticeArchive, notices };
}
const short = (e: unknown) => String((e as Error).message ?? e).replace(/\s+/g, " ").slice(0, 220);
const closeAll = async (...stores: { close(): Promise<unknown> }[]) => { for (const s of stores) await s.close().catch(() => {}); };

// ---- P: subjects owing F forms ----
const P: unknown[] = [];
async function formsCase(F: number, mode: "whole" | "parts", setting: boolean) {
  const before = process.env.TX2_NOTICE_LEDGER;
  if (mode === "parts") process.env.TX2_NOTICE_LEDGER = "parts"; else delete process.env.TX2_NOTICE_LEDGER;
  const t = performance.now();
  const row: Record<string, unknown> = { forms: F, ledger: mode, setting };
  try {
    const acc = await account(`lazy-era5-forms-${F}-${mode}-${setting ? "s" : "n"}-${RUN}`, largeRelease(W0.R1.doc, parseShape(`forms=${F},policies=${F},permille=1000`)), setting);
    row.settlement = await acc.values.runValues(acc.first).then((p) => p.status, (e) => "FAILED: " + short(e));
    row.recorder = await acc.notices.record(acc.first).then(() => "recorded", (e) => "FAILED: " + short(e));
    // a second try: does the recorder go on, or stay stopped?
    if (String(row.recorder).startsWith("FAILED")) row.recorderAgain = await acc.notices.record(acc.first).then(() => "recorded", (e) => "FAILED: " + short(e));
    const at = await acc.noticeArchive.store.head();
    const ledgers = await acc.noticeArchive.db.rows<string>([X, Y, Z].map((s) => "recorded-ledger:" + s), at);
    const xl = ledgers.get("recorded-ledger:" + X)?.value;
    row.ledgerChars = typeof xl === "string" ? xl.length : xl === undefined ? null : JSON.stringify(xl).length;
    row.ledgerItems = typeof xl === "string" ? unpack<unknown[]>(xl).length : null;
    // [DX-ERA4, second review N1] the ledger as a reader gets it: its form, its parts, and its items opened
    const head = xl as unknown as { parts?: number; form?: string } | string | undefined;
    row.ledgerForm = typeof head === "object" ? (head.form ?? "parts") : head === undefined ? null : "whole";
    row.ledgerParts = typeof head === "object" ? head.parts : 0;
    if (head !== undefined) {
      const comp = acc.noticeArchive.source.s.comp;
      const led = (await readLedgers(acc.noticeArchive.db, [X], at)).get(X)!;
      const opened = await open(comp.backend!.url, led.items, led.items.map(() => placeOf(comp, X)));
      row.ledgerUnits = led.items.length;
      row.ledgerItemsOpened = opened.reduce<number>((n, v) => {
        const b = (v as { bytes?: Buffer } | null)?.bytes;
        return n + (Buffer.isBuffer(b) ? (JSON.parse(inflateRawSync(b).toString()) as unknown[]).length : isRemoved(v) ? 0 : 1);
      }, 0);
      row.ledgerLargestPartChars = led.parts.length ? Math.max(...led.parts.map((r) => r.value.length)) : null;
    }
    row.packets = (await acc.notices.packets(at)).length;
    await closeAll(acc.store, acc.values.store, acc.noticeArchive.store);
  } catch (e) {
    row.setup = "FAILED: " + short(e);
  } finally {
    if (before === undefined) delete process.env.TX2_NOTICE_LEDGER; else process.env.TX2_NOTICE_LEDGER = before;
  }
  row.seconds = Math.round((performance.now() - t) / 100) / 10;
  log("P-forms", row);
  P.push(row);
}
const list = (process.env.ERA5_FORMS ?? "5,10,20,30,40,60,100,200").split(",").map(Number);
for (const F of list) await formsCase(F, "whole", true);
// [DX-ERA4, second review N1] ledgers in parts with the setting at the owner's sizes (ERA5_PARTS_FORMS), and without it
for (const F of (process.env.ERA5_PARTS_FORMS ?? "200").split(",").filter(Boolean).map(Number)) await formsCase(F, "parts", true);
for (const F of (process.env.ERA5_PARTS_OFF ?? "200").split(",").filter(Boolean).map(Number)) await formsCase(F, "parts", false);

// ---- K: every clear copy of a kept value, by attribute and kind ----
let dumps = 0;
async function native() {
  const n = dumps++;
  fs.writeFileSync(path.join(dumpDir, "dump-request-" + n), "1");
  for (let i = 0; i < 600 && !fs.existsSync(path.join(dumpDir, "dump-done-" + n)); i++) await sleep(200);
  assert(fs.existsSync(path.join(dumpDir, "dump-done-" + n)), "the gateway did not dump");
  return fs.readFileSync(path.join(dumpDir, "dump-" + n + ".jsonl"), "utf8").trim().split("\n")
    .map((l) => JSON.parse(l) as { db: string; a: string; v: string });
}
function expand(s: string, depth = 0): string[] {
  const outS = [s];
  if (depth > 3) return outS;
  for (const m of s.replace(/\\\//g, "/").match(/[A-Za-z0-9+/]{24,}={0,2}/g) ?? [])
    try { outS.push(...expand(inflateRawSync(Buffer.from(m, "base64")).toString("utf8"), depth + 1)); } catch {}
  return outS;
}
const listRe = /^notice:v1:[0-9a-f]{64}:(answer:[0-9]+:f[0-9]+|answer:[0-9]+:[0-9]+|recorded-notices:[0-9]+|recorded-ledger-part:.+|recorded-ledger:.+|receiver:[^:]+:.+|effects:[^:]+:[0-9]+)$/;
const K = await account("lazy-era5-kinds-" + RUN, W0.R1.doc, true);
const sink = await openStore("lazy-era5-kinds-sink-" + RUN);
await requireSealed(sink);
const sinkDocs = new Documents(sink.comp, "sink");
const kSettle = await K.values.runValues(K.first).then((p) => p.status, (e) => "FAILED: " + short(e));
const kRecord = await K.notices.record(K.first).then(() => "recorded", (e) => "FAILED: " + short(e));
const kDeliver = await K.notices.deliver(sinkDocs, await K.noticeArchive.store.head()).then(() => "delivered", (e) => "FAILED: " + short(e));
const dbs = { source: dbOf(K.store), values: dbOf(K.values.store), notices: dbOf(K.noticeArchive.store), recipient: dbOf(sink) };
const dump = await native();
const byDb: Record<string, unknown> = {};
for (const [label, db] of Object.entries(dbs)) {
  const mine = dump.filter((r) => r.db === db);
  const hits: Record<string, number> = {};
  for (const r of mine) {
    if (r.a === "opened:protected") continue;
    const text = expand(r.v).join("\n");
    for (const [who, d] of [["Y", Y_EXP], ["Z", Z_EXP], ["X", X_EXP]] as const)
      if (text.includes(d)) hits[`${who} ${r.a}`] = (hits[`${who} ${r.a}`] ?? 0) + 1;
  }
  byDb[label] = { datoms: mine.length, clearCopiesOfExpiryDates: hits };
}
// the derived-document kinds each database holds (current and history), checked by the setting's list or not
const kinds: Record<string, { rows: number; onTheList: boolean }> = {};
for (const [label, db] of Object.entries(dbs)) {
  const page = await peer.request<{ transactions: [string, number, string[]][] }>("POST", `/v2/db/${db}/transactions`, { after: 0, limit: 1000 });
  const entities = new Set<string>();
  for (const [, , rows] of page.transactions)
    for (const t of rows) {
      const c = JSON.parse(t.slice(t.indexOf("["))) as unknown[];
      if (c[3] === ":_tx/changed-entity" && typeof c[5] === "string") entities.add(c[5]);
    }
  const ents = [...entities];
  for (let i = 0; i < ents.length; i += 100)
    for (const r of await peer.rows(db, { entityIds: ents.slice(i, i + 100), history: true })) {
      if (r.attribute !== "notice/value") continue;
      const entity = String((r as { entityId?: string }).entityId ?? (r as { entity_id?: string }).entity_id);
      const m = /^notice:v1:[0-9a-f]{64}:(.*)$/.exec(entity);
      const kind = label + " " + (m ? m[1]!.replace(/[0-9]+/g, "N").replace(/pl:[A-Za-z0-9]+/g, "<subject>").replace(/:[0-9a-f]{16,}/g, ":<hash>") : "(not a document) " + entity);
      const k = (kinds[kind] ??= { rows: 0, onTheList: listRe.test(entity) });
      k.rows++;
    }
}
log("K-kinds", { settlement: kSettle, recorder: kRecord, delivery: kDeliver, databases: byDb, kinds });
log("verdict", { P: P.map((r) => [(r as { forms: number }).forms, (r as { ledger: string }).ledger, (r as { setting: boolean }).setting, (r as { recorder?: string }).recorder ?? (r as { setup?: string }).setup]), sealCounters: counters, run: RUN });
peer.close();
await closeAll(K.store, K.values.store, K.noticeArchive.store, sink);
process.exit(0);
