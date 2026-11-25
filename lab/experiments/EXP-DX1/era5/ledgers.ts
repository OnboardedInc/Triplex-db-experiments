// [DX-ERA5, third review] DX-ERA4's chunked sealed ledgers (second review N1) against the real settlement archive and
// recorder, driven by era5/run.sh (ERA5_DRIVER=ledgers.ts), the setting declared on every database, TX2_NOTICE_LEDGER
// parts. W0 format, lean layout, subjects X, Y, Z as forms.ts. Cases (ERA7_CASES, comma separated):
//   shrink:A:B   one account; a release of A owed forms per subject, settled and recorded; then a release of B forms
//                (fewer): settled and recorded again. The Publish review's Z1 (act10/REVIEW-4.md) found that a ledger
//                shrinking from parts to one part stops an account's notices for good in its writer.
//   edge:F       one release of F forms (near the claimed capacity of about 1,780): a named stop or the account?
//   lone:F       one subject owes F forms and the others none (permille chosen from the subjects' buckets): do the
//                others still get their notices when that subject cannot be recorded?
//   remove:F     a release of F forms (several parts per subject); X's document values removed and keys deleted; then
//                a second release of F+1 forms: does only X's ledger open as removed, do Y's and Z's still open, does
//                the recorder restart X in a new generation and go on past it?
// Counts are the result; times are diagnostic (Mac).
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { inflateRawSync } from "node:zlib";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { W0, triplexValue } from "../../../bench/lib/w0-world.ts";
import { counters, derivedSealOn, isRemoved, open, placeOf } from "../../../bench/lib/derived-seal.ts";
import { readLedgers } from "../actv-lazy/join/ledger-parts.ts";
import { openStore, fact, type Store } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { valid } from "../actv-lazy/fixture.ts";
import { rosterRoot, rosterSeal } from "../actv-lazy/read.ts";

const [out, dumpDir] = process.argv.slice(2);
assert(out && derivedSealOn() && process.env.TX2_NOTICE_LEDGER === "parts", "ledgers.ts runs with TX2_DERIVED_SEAL=1 and TX2_NOTICE_LEDGER=parts");
const RUN = randomUUID().slice(0, 8);
const peer = new DatomicClient(process.env.DATOMIC_URL!, 120_000);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "attack.jsonl"), line + "\n");
};
const dbOf = (s: Pick<Store, "scope">) => "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(s.scope))).toString("base64url");
const requireSealed = (s: Pick<Store, "scope">) => peer.request("POST", `/v2/db/${dbOf(s)}/derived-seal-required`, {});
const short = (e: unknown) => String((e as Error).message ?? e).replace(/\s+/g, " ").slice(0, 240);
const X = W0.placementId(0), Y = W0.placementId(1), Z = W0.placementId(2);
// ERA7_PEOPLE=1 for the large single-subject cases (shrink, edge): only X
const SUBJECTS = [X, Y, Z].slice(0, Number(process.env.ERA7_PEOPLE ?? 3));
const docOf = (s: string) => s + "/doc:a";
const seed = (e: string, a: string, v: string | number) => ({ op: "assert" as const, entityId: e, attribute: a, value: triplexValue(a, v), validFrom: 0 });
const facts = (s: string, type: string, expires: string) => [
  seed(s, "startDate", "2026-10-01"), seed(s, "bgcStatus", "clear"), seed(s, "weeklyMinutes", 2400), seed(s, "location", "loc:era5"),
  seed(s, "payRateCents", 1660), seed(s, "baselinePayRateCents", 1660), seed(s, "documents", docOf(s)),
  seed(docOf(s), "docType", type), seed(docOf(s), "expiresOn", expires),
];
const release = (forms: number, permille = 1000) => largeRelease(W0.R1.doc, parseShape(`forms=${forms},policies=${forms},permille=${permille}`));
const bucket = (s: string) => parseInt(createHash("sha256").update(s).digest("hex").slice(0, 8), 16) % 1000;

async function account(tag: string, first: W0.ReleaseDoc) {
  const store = await openStore(`lazy-era5-l3-${tag}-${RUN}`);
  await peer.declareProtection(dbOf(store), ["docType", "expiresOn"], true);
  await requireSealed(store);
  const a = new JoinedAccount(store);
  await store.input("era5-seed", { kind: "baseline", at: valid }, [
    fact(rosterRoot(0), "lazy/members", SUBJECTS), fact("members/seal", "lazy/roster-seal", rosterSeal(SUBJECTS)),
    seed("loc:era5", "jurisdiction", "jur:era5"), seed("loc:era5", "localMinWageCents", 1700), seed("jur:era5", "stateMinWageCents", 1650),
    ...[facts(X, "visa", "2026-02-13"), facts(Y, "ead", "2025-12-29"), facts(Z, "ead", "2027-08-15")].slice(0, SUBJECTS.length).flat(),
  ]);
  await a.install(SUBJECTS, valid);
  await a.publish(`l3-${tag}-1`, first, valid, "owed", undefined, { sources: "census" });
  const seq1 = (await a.notices.observe()).value.sequence;
  const values = await Archive.open(a, new BulkQueue(1));
  const noticeArchive = await Archive.open(a, new BulkQueue(1), "notices");
  await requireSealed(values.store);
  await requireSealed(noticeArchive.store);
  const notices = new RecordedNotices(noticeArchive);
  return { store, a, seq1, values, noticeArchive, notices };
}
type Acc = Awaited<ReturnType<typeof account>>;
const step = async (acc: Acc, seq: number) => ({
  settlement: await acc.values.runValues(seq).then((p) => p.status, (e) => "FAILED: " + short(e)),
  recorder: await acc.notices.record(seq).then(() => "recorded", (e) => "FAILED: " + short(e)),
});
const again = async (acc: Acc, seq: number) => acc.notices.record(seq).then(() => "recorded", (e) => "FAILED: " + short(e));
async function ledgerOf(acc: Acc, s: string) {
  const at = await acc.noticeArchive.store.head();
  const led = (await readLedgers(acc.noticeArchive.db, [s], at)).get(s);
  if (!led || !led.head) return { form: null };
  const comp = acc.noticeArchive.source.s.comp;
  const opened = await open(comp.backend!.url, led.items, led.items.map(() => placeOf(comp, s)));
  let items = 0, removed = 0;
  for (const v of opened) {
    const b = (v as { bytes?: Buffer } | null)?.bytes;
    if (Buffer.isBuffer(b)) items += (JSON.parse(inflateRawSync(b).toString()) as { items: unknown[] }).items.length;
    else if (isRemoved(v)) removed++;
    else items++;
  }
  const h = led.head.value as unknown;
  return { form: typeof h === "string" ? "whole" : "parts", parts: led.parts.length, units: led.items.length, itemsOpened: items, unitsRemoved: removed };
}
const generation = async (acc: Acc, s: string) => {
  const at = await acc.noticeArchive.store.head();
  return (await acc.noticeArchive.db.rows<number>(["recorded-generation:" + s], at)).get("recorded-generation:" + s)?.value ?? 0;
};
const packetsFor = async (acc: Acc) => {
  const ps = await acc.notices.packets(await acc.noticeArchive.store.head());
  const by: Record<string, number> = {};
  for (const p of ps) for (const d of p.deliveries as unknown as { subject: string }[]) by[d.subject] = (by[d.subject] ?? 0) + 1;
  return { packets: ps.length, deliveriesBySubject: by };
};
const closeAll = async (acc: Acc) => { for (const s of [acc.store, acc.values.store, acc.noticeArchive.store]) await s.close().catch(() => {}); };
const keyFile = (id: string) => "assertion-" + createHash("sha256").update(id).digest("hex") + ".key";
const keyFiles = () => (fs.existsSync(path.join(dumpDir, "authority")) ? fs.readdirSync(path.join(dumpDir, "authority"), { recursive: true }).map(String) : []);

for (const spec of (process.env.ERA7_CASES ?? "shrink:300:20").split(",").filter(Boolean)) {
  const [kind, a, b] = spec.split(":");
  const t = performance.now();
  const row: Record<string, unknown> = { case: spec };
  try {
    if (kind === "shrink") {
      const acc = await account(`shrink-${a}-${b}`, release(Number(a)));
      row.first = await step(acc, acc.seq1);
      row.ledgerAfterFirst = await ledgerOf(acc, X);
      await acc.a.publish(`l3-shrink-2`, release(Number(b)), valid, "owed", undefined, { sources: "census" });
      const seq2 = (await acc.a.notices.observe()).value.sequence;
      row.second = await step(acc, seq2);
      if (String((row.second as { recorder: string }).recorder).startsWith("FAILED")) row.secondAgain = await again(acc, seq2);
      row.ledgerAfterSecond = Object.fromEntries(await Promise.all(SUBJECTS.map(async (s) => [s, await ledgerOf(acc, s)])));
      row.deliveries = await packetsFor(acc);
      await closeAll(acc);
    } else if (kind === "edge") {
      const acc = await account(`edge-${a}`, release(Number(a)));
      row.first = await step(acc, acc.seq1);
      if (String((row.first as { recorder: string }).recorder).startsWith("FAILED")) row.firstAgain = await again(acc, acc.seq1);
      row.ledger = Object.fromEntries(await Promise.all(SUBJECTS.map(async (s) => [s, await ledgerOf(acc, s)])));
      row.deliveries = await packetsFor(acc);
      await closeAll(acc);
    } else if (kind === "lone") {
      // the subject with the lowest bucket owes every form; the others (buckets at or above the permille) owe none
      const order = SUBJECTS.map((s) => [s, bucket(s)] as const).sort((p, q) => p[1] - q[1]);
      const permille = order[0]![1] + 1;
      assert(order[1]![1] >= permille);
      row.buckets = Object.fromEntries(order);
      row.lone = order[0]![0];
      const acc = await account(`lone-${a}`, release(Number(a), permille));
      row.first = await step(acc, acc.seq1);
      if (String((row.first as { recorder: string }).recorder).startsWith("FAILED")) row.firstAgain = await again(acc, acc.seq1);
      row.ledger = { X: await ledgerOf(acc, X), Y: await ledgerOf(acc, Y), Z: await ledgerOf(acc, Z) };
      row.deliveries = await packetsFor(acc);
      await closeAll(acc);
    } else if (kind === "remove") {
      const F = Number(a);
      const acc = await account(`remove-${a}`, release(F));
      row.first = await step(acc, acc.seq1);
      row.before = { X: await ledgerOf(acc, X), Y: await ledgerOf(acc, Y) };
      const db = dbOf(acc.store);
      const rows = await peer.rows(db, { entityIds: [docOf(X)] });
      const ids = ["docType", "expiresOn"].map((attr) => rows.find((r) => r.attribute === attr)!.id);
      const erased = await peer.erase(db, "l3-remove-x-" + RUN, ids.map((id) => ({ id })));
      let gone = false;
      for (let i = 0; i < 150 && !gone; i++) {
        gone = ids.every((id) => !keyFiles().some((f) => f.endsWith(keyFile(id))));
        if (!gone) await sleep(200);
      }
      row.removal = { seq: erased.seq, keysGone: gone };
      row.afterRemoval = { X: await ledgerOf(acc, X), Y: await ledgerOf(acc, Y), Z: await ledgerOf(acc, Z) };
      row.generationBefore = await generation(acc, X);
      await acc.a.publish(`l3-remove-2`, release(F + 1), valid, "owed", undefined, { sources: "census" });
      const seq2 = (await acc.a.notices.observe()).value.sequence;
      row.second = await step(acc, seq2);
      row.afterSecond = { X: await ledgerOf(acc, X), Y: await ledgerOf(acc, Y), Z: await ledgerOf(acc, Z) };
      row.generationAfter = { X: await generation(acc, X), Y: await generation(acc, Y) };
      row.deliveries = await packetsFor(acc);
      await closeAll(acc);
    }
  } catch (e) {
    row.error = "FAILED: " + short(e);
  }
  row.seconds = Math.round((performance.now() - t) / 100) / 10;
  log("L3", row);
}
log("verdict", { sealCounters: counters, run: RUN });
peer.close();
process.exit(0);
