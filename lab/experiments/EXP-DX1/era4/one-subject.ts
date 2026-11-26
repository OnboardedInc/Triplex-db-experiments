// [DX-ERA4, third review T2] The property "one subject never stops an account", with the real settlement and notice
// recorder. One account of six subjects, the setting declared on every database, TX2_NOTICE_LEDGER=parts; at once, one
// subject each:
//   S0  a full ledger: S0 alone owes the forms (the policies' share is chosen from the subjects' buckets, below S0's and
//       above every other's; only S0 has a start date in W0's format), 999 and then 1,000 other forms: more than a
//       ledger can hold over its life, so S0 stops at the second release;
//   S1  a removal: its document's expiry date removed on request between the two releases (its expired-document notice
//       kept, the owner's rule of 2026-11-25);
//   S2  an evaluation error: in the deep format its pay is "abc" in the data (ONE_EVAL=data, the default there); in W0's
//       format (whose enrolment validates every world) the evaluation fails by the seam `failEvaluation`;
//   S3  a seal failure: every seal call holding an item placed at S3 is refused (400), by the seam `refuseSubject` (its
//       document expired, so the recorder has a notice of S3's to seal as the settlement has its changes);
//   S4, S5 ordinary (their documents expired at the valid time, so each is owed a notice).
// Two releases (R1's rules, then R2's, each with the forms), each settled and recorded. Checked: both settlements and
// both recordings complete; S1, S4 and S5 get their notices and are never stopped; S0, S2 and S3 each have their named
// stop (LedgerFull, EvaluationFailed, SealRefused) and nobody else has one; S1's kept notice is delivered again with its
// removed date as the marker. ONE_FORMAT=w0|deep. Driven by era5/run.sh (ERA5_DRIVER=../era4/one-subject.ts) or
// era4/stack-forms.sh (ERA4_FORMS_DRIVER=one-subject.ts). Counts are the result; times are diagnostic.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { W0, canonical, sha256, triplexValue } from "../../../bench/lib/w0-world.ts";
import { counters, derivedSealOn, failEvaluation, refuseSubject } from "../../../bench/lib/derived-seal.ts";
import { person, keyFor } from "../scale1/decision/plan.ts";
import { command } from "../w1/group/workload.ts";
import { openStore, fact, type Store } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { ledgerMode } from "../actv-lazy/join/ledger-parts.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { valid } from "../actv-lazy/fixture.ts";
import { rosterRoot, rosterSeal } from "../actv-lazy/read.ts";

const [out] = process.argv.slice(2);
// ONE_CLEAR=1: the same in clear (no derived seal, no setting) with TX2_SUBJECT_STOP=1, for the full ledger (S0) and
// the evaluation error (S2); S3 has no seal to be refused. S1's value is not removed there: without the option a removal
// makes every release published before it stale for the whole database (the removal line's database-wide rule; the
// per-account options narrow it), so the second release could not be published over the first; that is the removal
// rule's, not a subject's stop
const CLEAR = process.env.ONE_CLEAR === "1";
// TX2_NOTICE_LEDGER=whole (named: under the option unset is parts, ledger-parts.ts `ledgerMode`): the same with whole
// ledgers, sealed or in clear: S0's ledger of 999 forms does not fit one frame, so S0 stops (LedgerFull) at the first
// release, before any of its deliveries is written, and the others go on (before the fourth round's split check the
// account's recorder stopped)
const WHOLE = ledgerMode() === "whole";
assert(out && (CLEAR ? !derivedSealOn() && process.env.TX2_SUBJECT_STOP === "1" : derivedSealOn()),
  "one-subject.ts runs with TX2_DERIVED_SEAL=1, or ONE_CLEAR=1 with TX2_SUBJECT_STOP=1");
const FORMAT = process.env.ONE_FORMAT ?? "w0";
assert(FORMAT === "w0" || FORMAT === "deep");
const EVAL = process.env.ONE_EVAL ?? (FORMAT === "deep" ? "data" : "seam");
// S0's ledger over its lifetime limit (about 1,790 items sealed) at the second release: 999 forms and then 1,000 (the
// synthetic release names its forms with three digits below 1,000 and four above, so these are 1,999 different items),
// each release small enough for the store (a release marker holds the old and the new document within 1 MiB per value;
// a Publish record about 1.2 x (2 x new + old) within 4 MiB: 1,900 and 1,901 forms exceeded it)
const F = Number(process.env.ONE_FORMS ?? 999);
const RUN = randomUUID().slice(0, 8);
const peer = new DatomicClient(process.env.DATOMIC_URL!, 600_000);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data }, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  console.log(line);
  fs.appendFileSync(path.join(out, "one-subject.jsonl"), line + "\n");
};
const dbOf = (scope: string) => "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scope))).toString("base64url");
const requireSealed = async (s: Pick<Store, "scope">) => { if (!CLEAR) await peer.request("POST", `/v2/db/${dbOf(s.scope)}/derived-seal-required`, {}); };
const short = (e: unknown) => String((e as Error).message ?? e).replace(/\s+/g, " ").slice(0, 300);
const S = Array.from({ length: 6 }, (_, i) => W0.placementId(i));
const bucket = (s: string) => parseInt(createHash("sha256").update(s).digest("hex").slice(0, 8), 16) % 1000;
// S0 must have the lowest bucket: the policies' share is one above it
assert(S.slice(1).every((s) => bucket(s) > bucket(S[0]!)), "S0 is not the lowest bucket");
const permille = bucket(S[0]!) + 1;
const release = (base: W0.ReleaseDoc, forms: number) => largeRelease(base, parseShape(`forms=${forms},policies=${forms},permille=${permille}`));

type Setup = { store: Store; a: JoinedAccount; validTime: string; removable: () => Promise<{ db: string; ids: string[] }> };

async function w0Setup(): Promise<Setup> {
  const store = await openStore("lazy-era4-one-w0-" + RUN);
  await peer.declareProtection(dbOf(store.scope), ["docType", "expiresOn"], !CLEAR); // in clear: protection without seals (a gateway without the option)
  await requireSealed(store);
  const a = new JoinedAccount(store);
  const docOf = (s: string) => s + "/doc:a";
  const seed = (e: string, at: string, v: string | number) => ({ op: "assert" as const, entityId: e, attribute: at, value: triplexValue(at, v), validFrom: 0 });
  const facts = (s: string, start: boolean, expires: string) => [
    ...(start ? [seed(s, "startDate", "2026-10-01")] : []), seed(s, "bgcStatus", "clear"), seed(s, "weeklyMinutes", 2400),
    seed(s, "location", "loc:one"), seed(s, "payRateCents", 1660), seed(s, "baselinePayRateCents", 1660), seed(s, "documents", docOf(s)),
    seed(docOf(s), "docType", "ead"), seed(docOf(s), "expiresOn", expires),
  ];
  const past = "2025-12-29", future = "2027-08-15";
  await store.input("one-seed", { kind: "baseline", at: valid }, [
    fact(rosterRoot(0), "lazy/members", S), fact("members/seal", "lazy/roster-seal", rosterSeal(S)),
    seed("loc:one", "jurisdiction", "jur:one"), seed("loc:one", "localMinWageCents", 1700), seed("jur:one", "stateMinWageCents", 1650),
    ...facts(S[0]!, true, future), ...facts(S[1]!, false, past), ...facts(S[2]!, false, future), ...facts(S[3]!, false, past),
    ...facts(S[4]!, false, past), ...facts(S[5]!, false, past),
  ]);
  await a.install(S, valid);
  return {
    store, a, validTime: valid,
    removable: async () => {
      const db = dbOf(store.scope);
      const rows = await peer.rows(db, { entityIds: [docOf(S[1]!)] });
      return { db, ids: rows.filter((r: { attribute: string }) => r.attribute === "expiresOn").map((r: { id: string }) => r.id) };
    },
  };
}

async function deepSetup(): Promise<Setup> {
  // every subject's documents have expired by then (SCALE1's dates are 2026-12-01 and 2027-03-01), so each is owed a notice
  const validTime = "2027-04-15T12:00:00.000000Z";
  const day = validTime.slice(0, 10);
  const files = (a: number, i: number) => person(a, i).filter((f) => f.a === ":file/expiresOn");
  const expired = (a: number, i: number) => files(a, i).length > 0 && files(a, i).every((f) => String((f.v as { value: string }).value) < day);
  const has = (a: number, i: number, attr: string) => person(a, i).some((f) => f.a === attr);
  const acct = Array.from({ length: 600 }, (_, k) => k).find((k) => has(k, 0, ":person/custom-start") && expired(k, 1) && expired(k, 4) &&
    expired(k, 5) && has(k, 2, ":person/custom-pay-cents"));
  assert(acct !== undefined, "no account with the subjects this test needs at " + day);
  const name = "dx-scale-decision-" + randomUUID() + "-0";
  const created = await peer.create(String(runtimeApi.DatabaseScope.test(name)), "lean", true, 35_000);
  assert(created.created && created.strictRecordClocks);
  const db = created.db;
  await peer.declareProtection(db, [":file/expiresOn"], !CLEAR);
  const key = keyFor(acct);
  for (let i = 0; i < S.length; i++) {
    // S2's pay is "abc" in the data (ONE_EVAL=data): its world does not evaluate
    const facts = person(acct, i).map((f) => (i === 2 && EVAL === "data" && f.a === ":person/custom-pay-cents" ? { ...f, v: { type: "string", value: "abc" } } : f));
    await peer.transact(db, { ...command("one-subject/load/" + RUN + "/" + i, facts as never, [], false), groupAccount: key } as never);
  }
  await peer.request("POST", `/v2/db/${db}/request-index`, { waitMs: 600_000 });
  if (!CLEAR) await peer.request("POST", `/v2/db/${db}/derived-seal-required`, {});
  const begin = await peer.begin(db);
  await peer.release(db, begin.handle);
  const descriptor = { account: key, prefix: "acct/" + key + "/", people: S.length, cut: begin.position,
    seal: sha256(canonical(["one-subject", RUN, key])), namespace: true, verifyThrough: async () => {}, committed: () => {} };
  const store = await openStore(name, "act2-deep", "write", descriptor);
  const a = new JoinedAccount(store);
  await a.installHeld(validTime);
  return {
    store, a, validTime,
    removable: async () => {
      const entities = [...new Set(files(acct, 1).map((f) => f.e))].map((e) => (e.startsWith("acct/") ? e : "acct/" + key + "/" + e));
      const live = await peer.rows(db, { entityIds: entities });
      return { db, ids: live.filter((r: { attribute: string }) => r.attribute === ":file/expiresOn").map((r: { id: string }) => r.id) };
    },
  };
}

const row: Record<string, unknown> = { format: FORMAT, sealed: !CLEAR, ledger: WHOLE ? "whole" : "parts", evaluationError: EVAL, forms: F, permille, buckets: Object.fromEntries(S.map((s) => [s, bucket(s)])) };
const t = performance.now();
let checks: Record<string, boolean> = {};
try {
  const { store, a, validTime, removable } = FORMAT === "w0" ? await w0Setup() : await deepSetup();
  row.validTime = validTime;
  const values = await Archive.open(a, new BulkQueue(1));
  const noticeArchive = await Archive.open(a, new BulkQueue(1), "notices");
  for (const s of [values.store, noticeArchive.store]) await requireSealed(s);
  const notices = new RecordedNotices(noticeArchive);
  refuseSubject.subject = S[3];
  if (EVAL === "seam") failEvaluation.subject = S[2];
  const deliveries = async () => {
    const ps = await notices.packets(await noticeArchive.store.head());
    const by: Record<string, number> = Object.fromEntries(S.map((s) => [s, 0]));
    for (const p of ps) for (const d of p.deliveries as unknown as { subject: string }[]) by[d.subject] = (by[d.subject] ?? 0) + 1;
    return by;
  };
  const stops = async (seq: number) => {
    const nh = await noticeArchive.store.head(), vh = await values.store.head();
    const rec = await noticeArchive.db.rows<{ at: number; code: string }>(S.map((s) => "recorded-stopped:" + s), nh);
    const set = await values.db.rows<{ at: number; code: string }>(S.map((s) => "settled-stopped:" + seq + ":" + s), vh);
    return {
      recorder: Object.fromEntries(S.flatMap((s) => (rec.get("recorded-stopped:" + s) ? [[s, rec.get("recorded-stopped:" + s)!.value.code]] : []))),
      settlement: Object.fromEntries(S.flatMap((s) => (set.get("settled-stopped:" + seq + ":" + s) ? [[s, set.get("settled-stopped:" + seq + ":" + s)!.value.code]] : []))),
    };
  };
  // release 1
  const extra: unknown[] = FORMAT === "w0" ? [undefined, { sources: "census" }] : [];
  await (a.publish as (...x: unknown[]) => Promise<unknown>).call(a, "one-1:" + RUN, release(W0.R1.doc, F), validTime, "owed", ...extra);
  const seq1 = (await a.notices.observe()).value.sequence;
  row.settlement1 = await values.runValues(seq1).then((p: any) => p.status, (e: unknown) => "FAILED: " + short(e));
  row.recorder1 = await notices.record(seq1).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
  row.deliveries1 = await deliveries();
  row.stops1 = await stops(seq1);
  // S1's expiry date removed
  const r = CLEAR ? undefined : await removable();
  row.removedAssertions = r?.ids.length ?? 0;
  row.removal = r ? (await peer.erase(r.db, "one-subject/" + RUN, r.ids.map((id) => ({ id })))).seq : "not in clear";
  // the removal published before release 2 reads its inputs (without the option it publishes after its shred grace;
  // a publish that read the frontier before it is refused, "Discard the old protected input cut")
  for (let k = 0; r && k < 120 && (await peer.erasureFrontier(r.db)).seq < (row.removal as number); k++) await new Promise((res) => setTimeout(res, 500));
  await new Promise((res) => setTimeout(res, 3000));
  // release 2
  // in clear the packets hold the deliveries themselves (the open route is the option's)
  const allDeliveries = async () => (await (CLEAR ? notices.packets(await noticeArchive.store.head()) : notices.openedPackets(await noticeArchive.store.head())))
    .flatMap((p) => p.deliveries as unknown as Record<string, unknown>[]);
  const before = (await allDeliveries()).length;
  await (a.publish as (...x: unknown[]) => Promise<unknown>).call(a, "one-2:" + RUN, release(W0.R2.doc, F + 1), validTime, "owed", ...extra);
  const seq2 = (await a.notices.observe()).value.sequence;
  row.settlement2 = await values.runValues(seq2).then((p: any) => p.status, (e: unknown) => "FAILED: " + short(e));
  row.recorder2 = await notices.record(seq2).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
  row.deliveries2 = await deliveries();
  row.stops2 = await stops(seq2);
  const d2 = (await allDeliveries()).slice(before);
  const kept = d2.filter((d) => d.subject === S[1] && d.kind === "notify.document-expired");
  // a delivery's payload is the work item's payload text (a JSON string)
  const text = (x: unknown) => (typeof x === "string" ? x : canonical(x ?? null));
  row.s1KeptNotices = kept.map((d) => text(d.payload));
  const d1 = row.deliveries1 as Record<string, number>, s1 = row.stops1 as { recorder: Record<string, string>; settlement: Record<string, string> },
    s2 = row.stops2 as typeof s1;
  const only = (m: Record<string, string>, want: Record<string, string>) => canonical(m) === canonical(want);
  const by2 = row.deliveries2 as Record<string, number>;
  // whole ledgers: S0 stops at the first release before any delivery; in parts it is served first and stops at the second
  const fullLedger = WHOLE
    ? { fullLedgerSubjectStoppedBeforeAnyDelivery: d1[S[0]!] === 0 && by2[S[0]!] === 0 }
    : { fullLedgerSubjectRecordedFirst: (d1[S[0]!] ?? 0) > 0 };
  if (CLEAR) checks = {
    settledBoth: row.settlement1 === "stored" && row.settlement2 === "stored",
    recordedBoth: row.recorder1 === "recorded" && row.recorder2 === "recorded",
    othersGetTheirNotices: [S[1]!, S[3]!, S[4]!, S[5]!].every((s) => (d1[s] ?? 0) > 0),
    recorderStopsAreExactlyThese: only(s1.recorder, { ...(WHOLE ? { [S[0]!]: "LedgerFull" } : {}), [S[2]!]: "EvaluationFailed" }) &&
      only(s2.recorder, { [S[0]!]: "LedgerFull", [S[2]!]: "EvaluationFailed" }),
    ...fullLedger,
    settlementStopsAreTheEvaluation: only(s1.settlement, { [S[2]!]: "EvaluationFailed" }) &&
      only(s2.settlement, { [S[2]!]: "EvaluationFailed" }),
    othersServedAtTheSecondRelease: [S[1]!, S[3]!, S[4]!, S[5]!].every((s) => by2[s]! > d1[s]!),
  };
  else checks = {
    settledBoth: row.settlement1 === "stored" && row.settlement2 === "stored",
    recordedBoth: row.recorder1 === "recorded" && row.recorder2 === "recorded",
    othersGetTheirNotices: [S[1]!, S[4]!, S[5]!].every((s) => (d1[s] ?? 0) > 0),
    recorderStopsAreExactlyTheThree: only(s1.recorder, { ...(WHOLE ? { [S[0]!]: "LedgerFull" } : {}), [S[2]!]: "EvaluationFailed", [S[3]!]: "SealRefused" }) &&
      only(s2.recorder, { [S[0]!]: "LedgerFull", [S[2]!]: "EvaluationFailed", [S[3]!]: "SealRefused" }),
    ...fullLedger,
    settlementStopsAreTheEvaluationAndTheSeal: [s1.settlement, s2.settlement].every((m) => m[S[2]!] === "EvaluationFailed" && m[S[3]!] === "SealRefused" &&
      Object.keys(m).every((s) => [S[0], S[2], S[3]].includes(s))),
    removedSubjectKeepsItsNotice: kept.length > 0 && kept.every((d) => text(d.payload).includes('"expiresOn":{"erasedAt"')),
  };
  for (const s of [store, values.store, noticeArchive.store]) await (s as any).close().catch(() => {});
} catch (e) {
  row.setup = "FAILED: " + short(e);
}
row.seconds = Math.round((performance.now() - t) / 100) / 10;
log("one-subject", row);
const pass = Object.keys(checks).length === 7 && Object.values(checks).every(Boolean);
log("verdict", { pass, checks, sealCounters: counters, run: RUN });
peer.close();
process.exit(pass ? 0 : 1);
