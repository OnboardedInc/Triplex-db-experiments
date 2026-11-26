// [DX-ERA4, third review T1, the owner's ruling of 2026-11-25] The removed-value rule end to end in the deep format
// version 0.1 is built on: one held, namespaced account (SCALE1's `person`, 3 subjects), its documents' expiry dates
// protected and sealed, the setting declared on every database, TX2_NOTICE_LEDGER=parts. A release (R1's rules plus F
// synthetic forms) published at a valid time where subject 0's and subject 2's documents have expired and subject 1's
// have not; settled and recorded. Then subject 0's and subject 1's expiry dates removed on request; then a second
// release (R2's rules, which change DOCEXP's lead days, plus F + 1 forms) at the same valid time. Checked:
//   - both settlements and both recordings complete (T1: they stopped before);
//   - subject 0's expired-document notice is kept: its new generation delivers it again, the removed date as its marker;
//   - subject 1, whose document had not expired at the removal, gets no expired-document notice (none to keep);
//   - subject 2, untouched, keeps its generation and gets no expired-document notice again;
//   - no delivery of the second release names a removed date's value.
// Driven by era5/run.sh (ERA5_DRIVER=../era4/removed-kept.ts) or era4/stack-forms.sh (ERA4_FORMS_DRIVER=removed-kept.ts).
// KEPT_FORMS (default 2), KEPT_VALID (default 2027-01-15T12:00:00.000000Z). Counts are the result; times are diagnostic.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { counters, derivedSealOn } from "../../../bench/lib/derived-seal.ts";
import { person, keyFor } from "../scale1/decision/plan.ts";
import { command } from "../w1/group/workload.ts";
import { openStore } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";

const [out] = process.argv.slice(2);
assert(out && derivedSealOn() && process.env.TX2_NOTICE_LEDGER === "parts", "removed-kept.ts runs with TX2_DERIVED_SEAL=1 and TX2_NOTICE_LEDGER=parts");
const RUN = randomUUID().slice(0, 8);
const PEOPLE = 3;
const F = Number(process.env.KEPT_FORMS ?? 2);
const validTime = process.env.KEPT_VALID ?? "2027-01-15T12:00:00.000000Z";
assert(W0.isInstant(validTime));
const writer = new DatomicClient(process.env.DATOMIC_URL!, 600_000);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data }, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  console.log(line);
  fs.appendFileSync(path.join(out, "removed-kept.jsonl"), line + "\n");
};
const dbOf = (scope: string) => "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scope))).toString("base64url");
const short = (e: unknown) => String((e as Error).message ?? e).replace(/\s+/g, " ").slice(0, 300);
const day = validTime.slice(0, 10);
const files = (a: number, i: number) => person(a, i).filter((f) => f.a === ":file/expiresOn");
const expired = (a: number, i: number) => files(a, i).length > 0 && files(a, i).every((f) => String((f.v as { value: string }).value) < day);
const fresh = (a: number, i: number) => files(a, i).length > 0 && files(a, i).every((f) => String((f.v as { value: string }).value) >= day);
const a = Array.from({ length: 400 }, (_, k) => k).find((k) => expired(k, 0) && fresh(k, 1) && expired(k, 2) &&
  person(k, 0).some((f) => f.a === ":person/custom-start"));
assert(a !== undefined, "no account with subjects 0 and 2 expired and 1 not at " + day);
const row: Record<string, unknown> = { format: "act2-deep (held, namespaced)", people: PEOPLE, forms: F, validTime, account: a };
const t = performance.now();
try {
  const name = "dx-scale-decision-" + randomUUID() + "-0";
  const created = await writer.create(String(runtimeApi.DatabaseScope.test(name)), "lean", true, 35_000);
  assert(created.created && created.strictRecordClocks);
  const db = created.db;
  await writer.declareProtection(db, [":file/expiresOn"], true);
  const key = keyFor(a);
  for (let i = 0; i < PEOPLE; i++)
    await writer.transact(db, { ...command("removed-kept/load/" + RUN + "/" + i, person(a, i) as never, [], false), groupAccount: key } as never);
  await writer.request("POST", `/v2/db/${db}/request-index`, { waitMs: 600_000 });
  await writer.request("POST", `/v2/db/${db}/derived-seal-required`, {});
  const begin = await writer.begin(db);
  await writer.release(db, begin.handle);
  const descriptor = { account: key, prefix: "acct/" + key + "/", people: PEOPLE, cut: begin.position,
    seal: sha256(canonical(["removed-kept", RUN, key])), namespace: true, verifyThrough: async () => {}, committed: () => {} };
  const store = await openStore(name, "act2-deep", "write", descriptor);
  const joined = new JoinedAccount(store);
  await joined.installHeld(validTime);
  const values = await Archive.open(joined, new BulkQueue(1));
  const noticeArchive = await Archive.open(joined, new BulkQueue(1), "notices");
  for (const s of [values.store, noticeArchive.store]) await writer.request("POST", `/v2/db/${dbOf(s.scope)}/derived-seal-required`, {});
  const notices = new RecordedNotices(noticeArchive);
  const deliveries = async () => (await notices.openedPackets(await noticeArchive.store.head())).flatMap((p) => p.deliveries as unknown as Record<string, unknown>[]);
  const expiredOf = (ds: Record<string, unknown>[], s: string) =>
    ds.filter((d) => d.subject === s && d.kind === "notify.document-expired").map((d) => ({ generation: d.generation, seq: d.seq, key: d.key, payload: d.payload, removed: d.removed }));
  const S = [0, 1, 2].map((i) => W0.placementId(i));
  const generation = async (s: string) =>
    (await noticeArchive.db.rows<number>(["recorded-generation:" + s], await noticeArchive.store.head())).get("recorded-generation:" + s)?.value ?? 0;
  const kept = async (s: string) =>
    (await noticeArchive.db.rows<string[]>(["recorded-kept:" + s], await noticeArchive.store.head())).get("recorded-kept:" + s)?.value ?? [];

  await joined.publish("removed-kept-1:" + RUN, largeRelease(W0.R1.doc, parseShape(`forms=${F},policies=${F},permille=1000`)), validTime, "owed");
  const first = (await joined.notices.observe()).value.sequence;
  row.settlement1 = await values.runValues(first).then((p: any) => p.status, (e: unknown) => "FAILED: " + short(e));
  row.recorder1 = await notices.record(first).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
  const d1 = await deliveries();
  row.first = Object.fromEntries(await Promise.all(S.map(async (s) => [s, { expired: expiredOf(d1, s), kept: (await kept(s)).length, generation: await generation(s) }])));

  // subject 0's and subject 1's document dates removed on request
  const ids: string[] = [];
  for (const i of [0, 1]) {
    const entities = [...new Set(files(a, i).map((f) => f.e))].map((e) => (e.startsWith("acct/") ? e : "acct/" + key + "/" + e));
    const live = await writer.rows(db, { entityIds: entities });
    ids.push(...live.filter((r: { attribute: string }) => r.attribute === ":file/expiresOn").map((r: { id: string }) => r.id));
  }
  row.removedAssertions = ids.length;
  row.removal = (await writer.erase(db, "removed-kept/" + RUN, ids.map((id) => ({ id })))).seq;
  await new Promise((r) => setTimeout(r, 3000));

  await joined.publish("removed-kept-2:" + RUN, largeRelease(W0.R2.doc, parseShape(`forms=${F + 1},policies=${F + 1},permille=1000`)), validTime, "owed");
  const second = (await joined.notices.observe()).value.sequence;
  row.settlement2 = await values.runValues(second).then((p: any) => p.status, (e: unknown) => "FAILED: " + short(e));
  row.recorder2 = await notices.record(second).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
  const d2 = (await deliveries()).slice(d1.length);
  row.second = Object.fromEntries(await Promise.all(S.map(async (s) => [s, {
    expired: expiredOf(d2, s), deliveries: d2.filter((d) => d.subject === s).length,
    kept: (await kept(s)).length, generation: await generation(s),
  }])));
  // no delivery of the second release names a removed date: every removed file's date as stored before the removal
  const removedDates = new Set([0, 1].flatMap((i) => files(a, i).map((f) => String((f.v as { value: string }).value))));
  row.secondNamesARemovedDate = d2.some((d) => d.subject !== S[2] && [...removedDates].some((x) => canonical(d.payload ?? null).includes(x)));
  const s0 = (row.second as Record<string, { expired: { payload: unknown }[] }>)[S[0]!]!;
  const s1 = (row.second as Record<string, { expired: unknown[] }>)[S[1]!]!;
  const s2 = (row.second as Record<string, { expired: unknown[]; generation: number }>)[S[2]!]!;
  const f0 = (row.first as Record<string, { expired: unknown[]; generation: number }>);
  row.checks = {
    recordedBoth: row.recorder1 === "recorded" && row.recorder2 === "recorded",
    settledBoth: row.settlement1 === "stored" && row.settlement2 === "stored",
    s0NoticeFirst: f0[S[0]!]!.expired.length > 0,
    s0NoticeKeptWithMarker: s0.expired.length > 0 && s0.expired.every((d) => canonical(d.payload).includes('"expiresOn":{"erasedAt"')),
    s1NoNotice: f0[S[1]!]!.expired.length === 0 && s1.expired.length === 0,
    s2Untouched: f0[S[2]!]!.expired.length > 0 && s2.expired.length === 0 && s2.generation === f0[S[2]!]!.generation,
    noRemovedDate: row.secondNamesARemovedDate === false,
  };
  for (const s of [store, values.store, noticeArchive.store]) await (s as any).close().catch(() => {});
} catch (e) {
  row.setup = "FAILED: " + short(e);
}
row.seconds = Math.round((performance.now() - t) / 100) / 10;
log("removed-kept", row);
const checks = (row.checks ?? {}) as Record<string, boolean>;
log("verdict", { pass: Object.keys(checks).length === 7 && Object.values(checks).every(Boolean), checks, sealCounters: counters, run: RUN });
process.exit(Object.keys(checks).length === 7 && Object.values(checks).every(Boolean) ? 0 : 1);
