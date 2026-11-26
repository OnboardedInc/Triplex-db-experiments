// [DX-ERA4, third review T2] The property "one subject never stops an account", with the real settlement and notice
// recorder. One account of six subjects, the setting declared on every database, TX2_NOTICE_LEDGER=parts; at once, one
// subject each:
//   S0  a full ledger: S0 alone owes ONE_FORMS forms (the policies' share is chosen from the subjects' buckets, below
//       S0's and above every other's; only S0 has a start date in W0's format), more than a ledger can hold;
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
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { valid } from "../actv-lazy/fixture.ts";
import { rosterRoot, rosterSeal } from "../actv-lazy/read.ts";

const [out] = process.argv.slice(2);
assert(out && derivedSealOn() && process.env.TX2_NOTICE_LEDGER === "parts", "one-subject.ts runs with TX2_DERIVED_SEAL=1 and TX2_NOTICE_LEDGER=parts");
const FORMAT = process.env.ONE_FORMAT ?? "w0";
assert(FORMAT === "w0" || FORMAT === "deep");
const EVAL = process.env.ONE_EVAL ?? (FORMAT === "deep" ? "data" : "seam");
// more than a ledger holds (about 1,790 items sealed), and two releases' documents within the store's 1 MiB per value
// (a release marker holds the old and the new document: 2,000 and 2,001 forms are 1,054,370 bytes)
const F = Number(process.env.ONE_FORMS ?? 1900);
const RUN = randomUUID().slice(0, 8);
const peer = new DatomicClient(process.env.DATOMIC_URL!, 600_000);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data }, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  console.log(line);
  fs.appendFileSync(path.join(out, "one-subject.jsonl"), line + "\n");
};
const dbOf = (scope: string) => "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scope))).toString("base64url");
const requireSealed = (s: Pick<Store, "scope">) => peer.request("POST", `/v2/db/${dbOf(s.scope)}/derived-seal-required`, {});
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
  await peer.declareProtection(dbOf(store.scope), ["docType", "expiresOn"], true);
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
  await peer.declareProtection(db, [":file/expiresOn"], true);
  const key = keyFor(acct);
  for (let i = 0; i < S.length; i++) {
    // S2's pay is "abc" in the data (ONE_EVAL=data): its world does not evaluate
    const facts = person(acct, i).map((f) => (i === 2 && EVAL === "data" && f.a === ":person/custom-pay-cents" ? { ...f, v: { type: "string", value: "abc" } } : f));
    await peer.transact(db, { ...command("one-subject/load/" + RUN + "/" + i, facts as never, [], false), groupAccount: key } as never);
  }
  await peer.request("POST", `/v2/db/${db}/request-index`, { waitMs: 600_000 });
  await peer.request("POST", `/v2/db/${db}/derived-seal-required`, {});
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

const row: Record<string, unknown> = { format: FORMAT, evaluationError: EVAL, forms: F, permille, buckets: Object.fromEntries(S.map((s) => [s, bucket(s)])) };
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
  const r = await removable();
  row.removedAssertions = r.ids.length;
  row.removal = (await peer.erase(r.db, "one-subject/" + RUN, r.ids.map((id) => ({ id })))).seq;
  await new Promise((res) => setTimeout(res, 3000));
  // release 2
  const before = (await notices.openedPackets(await noticeArchive.store.head())).flatMap((p) => p.deliveries as unknown as Record<string, unknown>[]).length;
  await (a.publish as (...x: unknown[]) => Promise<unknown>).call(a, "one-2:" + RUN, release(W0.R2.doc, F + 1), validTime, "owed", ...extra);
  const seq2 = (await a.notices.observe()).value.sequence;
  row.settlement2 = await values.runValues(seq2).then((p: any) => p.status, (e: unknown) => "FAILED: " + short(e));
  row.recorder2 = await notices.record(seq2).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
  row.deliveries2 = await deliveries();
  row.stops2 = await stops(seq2);
  const d2 = (await notices.openedPackets(await noticeArchive.store.head())).flatMap((p) => p.deliveries as unknown as Record<string, unknown>[]).slice(before);
  const kept = d2.filter((d) => d.subject === S[1] && d.kind === "notify.document-expired");
  // a delivery's payload is the work item's payload text (a JSON string)
  const text = (x: unknown) => (typeof x === "string" ? x : canonical(x ?? null));
  row.s1KeptNotices = kept.map((d) => text(d.payload));
  const d1 = row.deliveries1 as Record<string, number>, s1 = row.stops1 as { recorder: Record<string, string>; settlement: Record<string, string> },
    s2 = row.stops2 as typeof s1;
  const only = (m: Record<string, string>, want: Record<string, string>) => canonical(m) === canonical(want);
  checks = {
    settledBoth: row.settlement1 === "stored" && row.settlement2 === "stored",
    recordedBoth: row.recorder1 === "recorded" && row.recorder2 === "recorded",
    othersGetTheirNotices: [S[1]!, S[4]!, S[5]!].every((s) => (d1[s] ?? 0) > 0),
    recorderStopsAreExactlyTheThree: only(s1.recorder, { [S[0]!]: "LedgerFull", [S[2]!]: "EvaluationFailed", [S[3]!]: "SealRefused" }) &&
      only(s2.recorder, { [S[0]!]: "LedgerFull", [S[2]!]: "EvaluationFailed", [S[3]!]: "SealRefused" }),
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
const pass = Object.keys(checks).length === 6 && Object.values(checks).every(Boolean);
log("verdict", { pass, checks, sealCounters: counters, run: RUN });
peer.close();
process.exit(pass ? 0 : 1);
