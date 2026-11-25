// [DX-ERA4, after the second review's N1 and N3] forms.ts P in the deep format: one held, namespaced account in the
// layout version 0.1 is built on (SCALE1's `person`: a subject's facts on sibling entities acct/<account>/pl:N, wk:N,
// doc:N:0:f, tk:..., linked from the placement by references; the held reader's act2-deep worlds), its document expiry
// dates (`:file/expiresOn`) protected and sealed, the setting `derived-seal-required` declared on the source and both
// archives. Its subjects owe F forms (largeRelease(R1, forms=F,policies=F,permille=1000)); the release is published
// receipt-only (owed), settled, and its notices recorded with TX2_NOTICE_LEDGER=parts; then subject 0's ledger is read
// back and opened. Driven by era4/stack-forms.sh (ERA4_FORMS_DRIVER=deep-forms.ts) or era5/run.sh
// (ERA5_DRIVER=../era4/deep-forms.ts). DEEP_FORMS (default 200,1700), DEEP_PEOPLE (default 3). Counts are the result;
// times are diagnostic (Mac).
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
const FORMS = (process.env.DEEP_FORMS ?? "200,1700").split(",").filter(Boolean).map(Number);
const writer = new DatomicClient(process.env.DATOMIC_URL!, 600_000);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "deep-forms.jsonl"), line + "\n");
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
      // every unit is sealed under the subject's protected document dates (the gateway's choice from the root)
      row.ledgerHeaderNames = [...new Set((led.items as unknown[]).map((u) => (typeof u === "string" ? JSON.parse(Buffer.from(u.split(".")[1]!, "base64url").toString()).k.length : -1)))];
    }
    row.packets = (await notices.packets(at)).length;
    for (const s of [store, values.store, noticeArchive.store]) await (s as any).close().catch(() => {});
  } catch (e) {
    row.setup = "FAILED: " + short(e);
  }
  row.seconds = Math.round((performance.now() - t) / 100) / 10;
  log("deep-forms", row);
  return row;
}
const rows: Record<string, unknown>[] = [];
// accounts whose subject 0 owes forms (a start date) and holds a protected document date
const candidates = Array.from({ length: 400 }, (_, a) => a).filter((a) =>
  person(a, 0).some((f) => f.a === ":person/custom-start") && person(a, 0).some((f) => f.a === ":file/expiresOn"));
assert(candidates.length >= FORMS.length, "too few accounts whose subject 0 owes forms");
for (const [k, F] of FORMS.entries()) rows.push(await formsCase(F, candidates[k]!));
log("verdict", { P: rows.map((r) => [r.forms, r.recorder ?? r.setup, r.ledgerParts, r.ledgerItemsOpened]), sealCounters: counters, run: RUN });
process.exit(rows.every((r) => r.recorder === "recorded") ? 0 : 1);
