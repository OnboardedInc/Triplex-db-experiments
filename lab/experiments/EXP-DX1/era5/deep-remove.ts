// [DX-ERA5, third review] era4/deep-forms.ts with a removal: one held, namespaced account in the deep format (SCALE1's
// person), its document expiry dates protected and sealed, the setting declared everywhere, TX2_NOTICE_LEDGER=parts.
// A release of F owed forms published, settled and recorded; then subject 0's document dates removed on request and
// their keys deleted; then a second release (F+1 forms) published, settled and recorded. Checked: subject 0's ledger
// opens as removed before the second release and starts again after it (a new generation), subjects 1 and 2's ledgers
// open throughout, and the recorder goes past subject 0. Driven by era5/stack-deep.sh (a stack) or era5/run.sh
// (ERA5_DRIVER=deep-remove.ts). DEEP_FORMS (default 200), DEEP_PEOPLE (default 3).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { counters, derivedSealOn, isRemoved, open, placeOf } from "../../../bench/lib/derived-seal.ts";
import { person, keyFor, root } from "../scale1/decision/plan.ts";
import { command } from "../w1/group/workload.ts";
import { openStore } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { readLedgers } from "../actv-lazy/join/ledger-parts.ts";

const [out] = process.argv.slice(2);
assert(out && derivedSealOn() && process.env.TX2_NOTICE_LEDGER === "parts", "deep-forms.ts runs with TX2_DERIVED_SEAL=1 and TX2_NOTICE_LEDGER=parts");
const RUN = randomUUID().slice(0, 8);
const PEOPLE = Number(process.env.DEEP_PEOPLE ?? 3);
const FORMS = (process.env.DEEP_FORMS ?? "200").split(",").filter(Boolean).map(Number);
const writer = new DatomicClient(process.env.DATOMIC_URL!, 600_000);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "deep-remove.jsonl"), line + "\n");
};
const dbOf = (scope: string) => "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scope))).toString("base64url");
const short = (e: unknown) => String((e as Error).message ?? e).replace(/\s+/g, " ").slice(0, 300);
const validTime = W0.POPULATION_VALID_TIME;

async function formsCase(F: number, a: number) {
  const t = performance.now();
  const row: Record<string, unknown> = { forms: F, format: "act2-deep (held, namespaced)", people: PEOPLE };
  try {
    // the held reader wants a SCALE1-named scope it did not create
    const name = "dx-scale-decision-" + randomUUID() + "-0";
    const created = await writer.create(String(runtimeApi.DatabaseScope.test(name)), "lean", true, 35_000);
    assert(created.created && created.strictRecordClocks);
    const db = created.db;
    await writer.declareProtection(db, [":file/expiresOn"], true);
    // the account's subjects, each committed whole (SCALE1's person: root, profile, files, tasks)
    const key = keyFor(a);
    // subject 0 must hold a start date (the large release's synthetic policies read only that) and a file
    const owes = (i: number) => person(a, i).some((f) => f.a === ":person/custom-start") && person(a, i).some((f) => f.a === ":file/expiresOn");
    assert(owes(0), "subject 0 of account " + key + " has no start date or no file");
    let rows = 0;
    for (let i = 0; i < PEOPLE; i++) {
      const facts = person(a, i);
      rows += facts.length;
      await writer.transact(db, { ...command("deep-forms/load/" + RUN + "/" + i, facts as never, [], false), groupAccount: key } as never);
    }
    await writer.request("POST", `/v2/db/${db}/request-index`, { waitMs: 600_000 });
    await writer.request("POST", `/v2/db/${db}/derived-seal-required`, {});
    const begin = await writer.begin(db);
    await writer.release(db, begin.handle);
    const descriptor = { account: key, prefix: "acct/" + key + "/", people: PEOPLE, cut: begin.position,
      seal: sha256(canonical(["deep-forms", RUN, key, F])), namespace: true,
      verifyThrough: async () => {}, committed: () => {} };
    const store = await openStore(name, "act2-deep", "write", descriptor);
    const joined = new JoinedAccount(store);
    await joined.installHeld(validTime);
    const values = await Archive.open(joined, new BulkQueue(1));
    const noticeArchive = await Archive.open(joined, new BulkQueue(1), "notices");
    for (const s of [values.store, noticeArchive.store]) await writer.request("POST", `/v2/db/${dbOf(s.scope)}/derived-seal-required`, {});
    const doc = largeRelease(W0.R1.doc, parseShape(`forms=${F},policies=${F},permille=1000`));
    await joined.publish("deep-forms:" + RUN + ":" + F, doc, validTime, "owed");
    const first = (await joined.notices.observe()).value.sequence;
    row.rootPlace = placeOf((store as any).comp, W0.placementId(0));
    row.expectedRoot = root(a, 0);
    row.subjectFacts = rows;
    row.settlement = await values.runValues(first).then((p: any) => p.status, (e: unknown) => "FAILED: " + short(e));
    const notices = new RecordedNotices(noticeArchive);
    row.recorder = await notices.record(first).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
    if (String(row.recorder).startsWith("FAILED")) row.recorderAgain = await notices.record(first).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
    const at = await noticeArchive.store.head();
    const X = W0.placementId(0);
    const comp = (store as any).comp;
    const led = (await readLedgers(noticeArchive.db, [X], at)).get(X)!;
    const head = led.head?.value as { parts?: number; form?: string } | string | undefined;
    row.ledgerForm = typeof head === "object" ? (head.form ?? "parts") : head === undefined ? null : "whole";
    row.ledgerParts = typeof head === "object" ? head.parts : 0;
    if (head !== undefined) {
      const opened = await open(comp.backend!.url, led.items, led.items.map(() => placeOf(comp, X)));
      row.ledgerUnits = led.items.length;
      row.ledgerItemsOpened = opened.reduce<number>((n, v) => {
        const b = (v as { bytes?: Buffer } | null)?.bytes;
        return n + (Buffer.isBuffer(b) ? (JSON.parse(inflateRawSync(b).toString()) as { items: unknown[] }).items.length : isRemoved(v) ? 0 : 1);
      }, 0);
      row.ledgerLargestPartChars = led.parts.length ? Math.max(...led.parts.map((r) => r.value.length)) : null;
      // the protected names each unit is sealed under (the subject's document dates; with a root in the place the writer
      // names its world's rows too, so this shows the seal, not which side chose the keys: that is attack6.clj n3deep)
      row.ledgerHeaderNames = [...new Set((led.items as unknown[]).map((u) => (typeof u === "string" ? JSON.parse(Buffer.from(u.split(".")[1]!, "base64url").toString()).k.length : -1)))];
    }
    row.packets = (await notices.packets(at)).length;
    // [DX-ERA5] the removal of subject 0's document dates, then a second release
    const ledgerState = async (s: string) => {
      const at2 = await noticeArchive.store.head();
      const l = (await readLedgers(noticeArchive.db, [s], at2)).get(s);
      if (!l || !l.head) return { form: null };
      const o = await open(comp.backend!.url, l.items, l.items.map(() => placeOf(comp, s)));
      let items = 0, removed = 0;
      for (const v of o) {
        const b = (v as { bytes?: Buffer } | null)?.bytes;
        if (Buffer.isBuffer(b)) items += (JSON.parse(inflateRawSync(b).toString()) as { items: unknown[] }).items.length;
        else if (isRemoved(v)) removed++; else items++;
      }
      const gen = (await noticeArchive.db.rows<number>(["recorded-generation:" + s], at2)).get("recorded-generation:" + s)?.value ?? 0;
      return { units: l.items.length, itemsOpened: items, unitsRemoved: removed, generation: gen };
    };
    const S1 = W0.placementId(1);
    const fileRows = person(a, 0).filter((f) => f.a === ":file/expiresOn").map((f) => f.e);
    const prefixed = [...new Set(fileRows)].map((e) => (e.startsWith("acct/") ? e : "acct/" + key + "/" + e));
    const live = await writer.rows(db, { entityIds: prefixed });
    const ids = live.filter((r) => r.attribute === ":file/expiresOn").map((r) => r.id);
    row.removedAssertions = ids.length;
    const erased = await writer.erase(db, "deep-remove/" + RUN, ids.map((id) => ({ id })));
    row.removal = erased.seq;
    await new Promise((r) => setTimeout(r, 3000));
    row.beforeSecond = { s0: await ledgerState(X), s1: await ledgerState(S1) };
    const doc2 = largeRelease(W0.R1.doc, parseShape(`forms=${F + 1},policies=${F + 1},permille=1000`));
    await joined.publish("deep-remove-2:" + RUN + ":" + F, doc2, validTime, "owed");
    const second = (await joined.notices.observe()).value.sequence;
    row.settlement2 = await values.runValues(second).then((p: any) => p.status, (e: unknown) => "FAILED: " + short(e));
    row.recorder2 = await notices.record(second).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
    if (String(row.recorder2).startsWith("FAILED")) row.recorder2Again = await notices.record(second).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
    if (String(row.settlement2).startsWith("FAILED")) row.settlement2Again = await values.runValues(second).then((p: any) => p.status, (e: unknown) => "FAILED: " + short(e));
    row.afterSecond = { s0: await ledgerState(X), s1: await ledgerState(S1) };
    row.packetsAfterSecond = (await notices.packets(await noticeArchive.store.head())).length;
    for (const s of [store, values.store, noticeArchive.store]) await (s as any).close().catch(() => {});
  } catch (e) {
    row.setup = "FAILED: " + short(e);
  }
  row.seconds = Math.round((performance.now() - t) / 100) / 10;
  log("deep-remove", row);
  return row;
}
const rows: Record<string, unknown>[] = [];
// accounts whose subject 0 owes forms (a start date) and holds a protected document date
const candidates = Array.from({ length: 400 }, (_, a) => a).filter((a) =>
  person(a, 0).some((f) => f.a === ":person/custom-start") && person(a, 0).some((f) => f.a === ":file/expiresOn"));
assert(candidates.length >= FORMS.length, "too few accounts whose subject 0 owes forms");
for (const [k, F] of FORMS.entries()) rows.push(await formsCase(F, candidates[k]!));
log("verdict", { P: rows.map((r) => [r.forms, r.recorder ?? r.setup, r.recorder2, r.beforeSecond, r.afterSecond]), sealCounters: counters, run: RUN });
process.exit(rows.every((r) => r.recorder === "recorded" && r.recorder2 === "recorded") ? 0 : 1);
