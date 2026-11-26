// [DX-ERA4, third review T7] The account calendar (`join-calendar`, a clear derived document) under TX2_DERIVED_SEAL.
// Found while bounding the content-free kinds: the calendar held the end of day of every future document expiry date
// (`expiresOn`, `:file/expiresOn`: protected values), in clear, written at a save (deep `deepImpact`, the W0 edit
// path), where no removal reaches it. Under the option it now holds no day derived from a document's date, only the next
// end of day after the clock, renewed at each (account.ts `nextEndOfDay`). This driver checks, in W0's format:
//   - with the option off (as before): the calendar names the future expiry dates' days (the copy the option removes);
//   - with the option on: after enrolment, after a save of a new future expiry date, and after the clock advances,
//     the calendar holds exactly the next end of day and names no document's day;
//   - the expired-document notices are the same with the option on and off once the clock passes a document's expiry
//     (the daily wake passes every boundary the expiry days did).
// Driven by era5/run.sh (ERA5_DRIVER=../era4/calendar.ts) with TX2_DERIVED_SEAL=1; the off run sets the option off for
// its own account only (the module reads it at each call). Counts are the result; times are diagnostic.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { W0, canonical, triplexValue } from "../../../bench/lib/w0-world.ts";
import { counters, derivedSealOn } from "../../../bench/lib/derived-seal.ts";
import { openStore, fact, type Store } from "../actv-lazy/store.ts";
import { JoinedAccount, nextEndOfDay } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { valid } from "../actv-lazy/fixture.ts";
import { rosterRoot, rosterSeal } from "../actv-lazy/read.ts";

const [out] = process.argv.slice(2);
assert(out && derivedSealOn(), "era4/calendar.ts runs with TX2_DERIVED_SEAL=1");
const RUN = randomUUID().slice(0, 8);
const peer = new DatomicClient(process.env.DATOMIC_URL!, 120_000);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data }, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  console.log(line);
  fs.appendFileSync(path.join(out, "calendar.jsonl"), line + "\n");
};
const dbOf = (s: Pick<Store, "scope">) => "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(s.scope))).toString("base64url");
const short = (e: unknown) => String((e as Error).message ?? e).replace(/\s+/g, " ").slice(0, 300);
const X = W0.placementId(0), Y = W0.placementId(1), Z = W0.placementId(2);
// the population's valid time is 2026-11-04T12:00; Y's document expires two days later, X's next year, Z's is past
const EXP: Record<string, string> = { [X]: "2027-08-15", [Y]: "2026-11-06", [Z]: "2025-12-29" };
const SAVED = "2027-03-01"; // a new future expiry date saved for X's document under the option
const LATER = "2026-11-08T12:00:00.000000Z";
const docOf = (s: string) => s + "/doc:a";
const seed = (e: string, a: string, v: string | number) => ({ op: "assert" as const, entityId: e, attribute: a, value: triplexValue(a, v), validFrom: 0 });
const subjectFacts = (s: string, type: string) => [
  seed(s, "startDate", "2026-10-01"), seed(s, "bgcStatus", "clear"), seed(s, "weeklyMinutes", 2400), seed(s, "location", "loc:cal"), seed(s, "payRateCents", 1660),
  seed(s, "baselinePayRateCents", 1660), seed(s, "documents", docOf(s)), seed(docOf(s), "docType", type), seed(docOf(s), "expiresOn", EXP[s]!),
];
const days = [...Object.values(EXP), SAVED];
const namesADay = (calendar: string[]) => calendar.filter((d) => days.some((x) => d.startsWith(x) || d === W0.endOfDay(W0.parseDate(x))));

async function scenario(on: boolean) {
  const before = process.env.TX2_DERIVED_SEAL;
  if (!on) delete process.env.TX2_DERIVED_SEAL;
  const row: Record<string, unknown> = { option: on ? "on" : "off" };
  try {
    const store = await openStore("lazy-era4-calendar-" + (on ? "on" : "off") + "-" + RUN);
    await peer.declareProtection(dbOf(store), ["docType", "expiresOn"], true);
    if (on) await peer.request("POST", `/v2/db/${dbOf(store)}/derived-seal-required`, {});
    const a = new JoinedAccount(store);
    const ids = [X, Y, Z];
    await store.input("calendar-seed", { kind: "baseline", at: valid }, [
      fact(rosterRoot(0), "lazy/members", ids), fact("members/seal", "lazy/roster-seal", rosterSeal(ids)),
      seed("loc:cal", "jurisdiction", "jur:cal"), seed("loc:cal", "localMinWageCents", 1700), seed("jur:cal", "stateMinWageCents", 1650),
      ...subjectFacts(X, "visa"), ...subjectFacts(Y, "ead"), ...subjectFacts(Z, "ead"),
    ]);
    const calendar = async () => (await a.db.get<string[]>("join-calendar", await a.s.head())).value;
    await a.install(ids, valid);
    row.afterEnrolment = await calendar();
    await a.publish("calendar-1:" + RUN, W0.R1.doc, valid, "owed", undefined, { sources: "census" });
    const values = await Archive.open(a, new BulkQueue(1));
    const noticeArchive = await Archive.open(a, new BulkQueue(1), "notices");
    if (on) for (const s of [values.store, noticeArchive.store]) await peer.request("POST", `/v2/db/${dbOf(s)}/derived-seal-required`, {});
    const notices = new RecordedNotices(noticeArchive);
    const first = (await a.notices.observe()).value.sequence;
    row.settlement = await values.runValues(first).then((p: any) => p.status, (e: unknown) => "FAILED: " + short(e));
    row.recorder1 = await notices.record(first).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
    await a.save("calendar-save:" + RUN, { e: docOf(X), a: "expiresOn", values: [SAVED] }, valid);
    row.afterSave = await calendar();
    await a.advance(LATER);
    row.afterAdvance = await calendar();
    const last = (await a.notices.observe()).value.sequence;
    row.events = last;
    row.recorder2 = await notices.record(last).then(() => "recorded", (e: unknown) => "FAILED: " + short(e));
    const packets = await notices.openedPackets(await noticeArchive.store.head());
    const ds = packets.flatMap((p) => p.deliveries as unknown as Record<string, unknown>[]);
    row.expired = ds.filter((d) => d.kind === "notify.document-expired").map((d) => [d.subject, d.key, canonical(d.payload ?? null).includes("erasedAt")]).map((x) => canonical(x)).sort();
    row.deliveries = ds.length;
    row.calendarNamesADay = { afterEnrolment: namesADay(row.afterEnrolment as string[]), afterSave: namesADay(row.afterSave as string[]),
      afterAdvance: namesADay(row.afterAdvance as string[]) };
    for (const s of [store, values.store, noticeArchive.store]) await (s as any).close().catch(() => {});
  } catch (e) {
    row.setup = "FAILED: " + short(e);
  } finally {
    if (before === undefined) delete process.env.TX2_DERIVED_SEAL;
    else process.env.TX2_DERIVED_SEAL = before;
  }
  log("calendar", row);
  return row;
}

const off = await scenario(false);
const on = await scenario(true);
const names = (r: Record<string, unknown>, k: string) => ((r.calendarNamesADay as Record<string, string[]> | undefined)?.[k] ?? ["(no reading)"]);
const checks = {
  offRecorded: off.recorder1 === "recorded" && off.recorder2 === "recorded",
  onRecorded: on.recorder1 === "recorded" && on.recorder2 === "recorded",
  // before the fix (and with the option off) the calendar names the future expiry days: the copy the option removes
  // (an end of day is the next day's midnight: W0.endOfDay("2027-08-15") is 2027-08-16T00:00, which is why the forms
  // dump search for the date itself did not see it)
  offNamesTheDays: names(off, "afterSave").length > 0,
  onEnrolmentIsTheNextEndOfDay: canonical(on.afterEnrolment) === canonical([nextEndOfDay(valid)]),
  onSaveNamesNoDay: names(on, "afterSave").length === 0,
  onAdvanceIsTheNextEndOfDay: canonical(on.afterAdvance) === canonical([nextEndOfDay(LATER)]),
  onNamesNoDayAnywhere: [...names(on, "afterEnrolment"), ...names(on, "afterSave"), ...names(on, "afterAdvance")].length === 0,
  sameExpiredNotices: Array.isArray(on.expired) && canonical(on.expired) === canonical(off.expired),
  yExpiredAfterTheAdvance: Array.isArray(on.expired) && (on.expired as string[]).some((x) => x.includes(Y)),
};
log("verdict", { pass: Object.values(checks).every(Boolean), checks, sealCounters: counters, run: RUN });
peer.close();
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
