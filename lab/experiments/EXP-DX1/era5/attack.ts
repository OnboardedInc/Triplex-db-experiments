// [DX-ERA5] The review's attacks on the option's real writers (era5/REVIEW.md), driven by era5/run.sh (which owns the
// gateway: this checkout's source on the pinned runtime image, an in-memory Datomic, the file authority, sealed, grace 0):
//   node --experimental-transform-types lab/experiments/EXP-DX1/era5/attack.ts OUT DUMP_DIR
// Two W0 lazy accounts as DX-ERA4's T1 builds them (era4/derived.ts), protected attributes `docType` and `expiresOn`,
// W0's rule DOCEXP copying both into `notify.document-expired`. Subjects X (a visa, expired: the one removed), Y (an EAD,
// expired: kept), Z (an EAD, not expired).
//   W  The settlement archive's frame cache: account F's first settlement frame meets a seal call that fails once (as a
//      gateway restart, a timeout or a gateway without the option does); the same archive's next turn writes the frame.
//      Account C is the same without the failure. Then X's values are removed in both, the keys deleted, and the stored
//      changes, the archive's rows and the native data are searched for X's removed expiry date and document type.
//   R  The recorder under the same single failure (control for W: it seals again on every frame).
//   L  From account C's stored bytes after the removal: the clear length of each sealed record of X (packets, ledger,
//      settled changes, the recipient's state), against Y's records opened through the route; which document types fit.
// Counts are the result; times are diagnostic (Mac).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { inflateRawSync } from "node:zlib";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { W0, triplexValue } from "../../../bench/lib/w0-world.ts";
import { counters, derivedSealOn, isSealed, open } from "../../../bench/lib/derived-seal.ts";
import { Documents, hash, unpack } from "../notify1/store.ts";
import { openStore, fact, type Store } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { valid } from "../actv-lazy/fixture.ts";
import { rosterRoot, rosterSeal } from "../actv-lazy/read.ts";

const [out, dumpDir] = process.argv.slice(2);
assert(out && dumpDir && derivedSealOn(), "era5/attack.ts runs with TX2_DERIVED_SEAL=1");
const RUN = randomUUID().slice(0, 8);
const url = process.env.DATOMIC_URL!;
const peer = new DatomicClient(url);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data }, (_, v) => (typeof v === "bigint" ? v.toString() : v));
  console.log(line);
  fs.appendFileSync(path.join(out, "attack.jsonl"), line + "\n");
};
const dbOf = (s: Pick<Store, "scope">) => "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(s.scope))).toString("base64url");

// ---- one failed seal call, as a gateway restart, a timeout or a gateway without the option answers ----------------
let faults = 0, stalls = 0;
const injected: string[] = [];
const request = DatomicClient.prototype.request;
// W2: no injected error. The gateway's container is paused (`docker pause`, as a long collection pause or an overloaded
// host stalls it) while one seal call is in flight; the client's own 5 s timeout ends the call; the container resumes.
const container = process.env.ERA5_GATEWAY_CONTAINER;
const docker = (verb: string) => execFileSync("docker", [verb, container!], { stdio: "ignore" });
DatomicClient.prototype.request = function (this: DatomicClient, method: "GET" | "POST", p: string, ...rest: unknown[]) {
  if (faults > 0 && method === "POST" && p.endsWith("/derived-seal")) {
    faults--;
    injected.push(p);
    return Promise.reject(new Error("fetch failed (injected once: the gateway restarted during the seal call)"));
  }
  if (stalls > 0 && container && method === "POST" && p.endsWith("/derived-seal")) {
    stalls--;
    docker("pause");
    const t = performance.now();
    return (request as (...a: unknown[]) => Promise<unknown>).call(this, method, p, ...rest).finally(() => {
      docker("unpause");
      injected.push("stall " + Math.round(performance.now() - t) + " ms");
    });
  }
  return (request as (...a: unknown[]) => Promise<unknown>).call(this, method, p, ...rest);
} as typeof request;

// ---- the accounts ----
const X_EXP = "2026-02-13", Y_EXP = "2025-12-29", Z_EXP = "2027-08-15";
const X = W0.placementId(0), Y = W0.placementId(1), Z = W0.placementId(2);
const PROTECTED = ["docType", "expiresOn"];
const docOf = (s: string) => s + "/doc:a";
const seed = (e: string, a: string, v: string | number) => ({
  op: "assert" as const, entityId: e, attribute: a, value: triplexValue(a, v), validFrom: 0,
});
const subjectFacts = (s: string, type: string, expires: string) => [
  seed(s, "bgcStatus", "clear"),
  seed(s, "weeklyMinutes", 2400),
  seed(s, "location", "loc:era5"),
  seed(s, "payRateCents", 1660),
  seed(s, "baselinePayRateCents", 1660),
  seed(s, "documents", docOf(s)),
  seed(docOf(s), "docType", type),
  seed(docOf(s), "expiresOn", expires),
];
async function account(scope: string) {
  const store = await openStore(scope);
  const db = dbOf(store);
  await peer.declareProtection(db, PROTECTED, true);
  const a = new JoinedAccount(store);
  const ids = [X, Y, Z];
  await store.input("era5-seed", { kind: "baseline", at: valid }, [
    fact(rosterRoot(0), "lazy/members", ids),
    fact("members/seal", "lazy/roster-seal", rosterSeal(ids)),
    seed("loc:era5", "jurisdiction", "jur:era5"),
    seed("loc:era5", "localMinWageCents", 1700),
    seed("jur:era5", "stateMinWageCents", 1650),
    ...subjectFacts(X, "visa", X_EXP),
    ...subjectFacts(Y, "ead", Y_EXP),
    ...subjectFacts(Z, "ead", Z_EXP),
  ]);
  await a.install(ids, valid);
  await a.publish("era5-one", W0.R1.doc, valid, "owed", undefined, { sources: "census" });
  const first = (await a.notices.observe()).value.sequence;
  const values = await Archive.open(a, new BulkQueue(1));
  const noticeArchive = await Archive.open(a, new BulkQueue(1), "notices");
  const notices = new RecordedNotices(noticeArchive);
  return { store, db, a, first, values, noticeArchive, notices };
}
type Account = Awaited<ReturnType<typeof account>>;

// ---- reading the stored bytes ----
type Changes = { subject: string; changes: [string, string | null][]; part?: number };
async function framePages(acc: Account) {
  const at = await acc.values.store.head();
  const progress = (await acc.values.db.get<{ frame?: number }>("values:" + acc.first, at)).value;
  const keys = Array.from({ length: progress.frame ?? 0 }, (_, i) => "answer:" + acc.first + ":f" + (i + 1));
  const rows = await acc.values.db.rows<{ bytes: string }>(keys, at);
  return keys.flatMap((k) => unpack<Changes[]>(rows.get(k)!.value.bytes));
}
async function rawPackets(acc: Account) {
  return acc.notices.packets(await acc.noticeArchive.store.head());
}
async function rawLedger(acc: Account, s: string) {
  const at = await acc.noticeArchive.store.head();
  const r = await acc.noticeArchive.db.rows<string>(["recorded-ledger:" + s], at);
  const v = r.get("recorded-ledger:" + s)?.value;
  return v === undefined ? [] : unpack<unknown[]>(v);
}
const clearLength = (wire: string) => Buffer.from(wire.split(".")[3]!, "base64url").length - 16;
/** Every string stored in a database: current rows, history and journal, through the routes (the masked answers every
 * reader gets), plus the native dump (every datom's string, history included) from era4/serve.clj. */
async function routeStrings(db: string) {
  const page = await peer.request<{ transactions: [string, number, string[]][] }>("POST", `/v2/db/${db}/transactions`, { after: 0, limit: 1000 });
  const strings: string[] = [JSON.stringify(page)];
  const entities = new Set<string>();
  for (const [, , rows] of page.transactions)
    for (const t of rows) {
      const c = JSON.parse(t.slice(t.indexOf("["))) as unknown[];
      if (c[3] === ":_tx/changed-entity" && typeof c[5] === "string") entities.add(c[5]);
    }
  const list = [...entities];
  for (let i = 0; i < list.length; i += 100) {
    strings.push(JSON.stringify(await peer.rows(db, { entityIds: list.slice(i, i + 100) })));
    strings.push(JSON.stringify(await peer.rows(db, { entityIds: list.slice(i, i + 100), history: true })));
  }
  return strings;
}
let dumps = 0;
async function nativeStrings(db: string) {
  const n = dumps++;
  fs.writeFileSync(path.join(dumpDir, "dump-request-" + n), "1");
  for (let i = 0; i < 600 && !fs.existsSync(path.join(dumpDir, "dump-done-" + n)); i++) await sleep(200);
  assert(fs.existsSync(path.join(dumpDir, "dump-done-" + n)), "the gateway did not dump");
  return fs.readFileSync(path.join(dumpDir, "dump-" + n + ".jsonl"), "utf8").trim().split("\n")
    .map((l) => JSON.parse(l) as { db: string; a: string; v: string })
    .filter((r) => r.db === db && r.a !== "opened:protected").map((r) => r.v);
}
/** Decoded every way the store encodes: JSON strings as they are, and deflate plus base64 (`pack`) inflated. */
function expand(strings: string[]) {
  const outS: string[] = [];
  const walk = (s: string, depth: number) => {
    outS.push(s);
    if (depth > 3) return;
    for (const m of s.replace(/\\\//g, "/").match(/[A-Za-z0-9+/]{24,}={0,2}/g) ?? [])
      try { walk(inflateRawSync(Buffer.from(m, "base64")).toString("utf8"), depth + 1); } catch {}
  };
  for (const s of strings) walk(s, 0);
  return outS;
}
const occurrences = (strings: string[], needle: string) => strings.reduce((n, s) => n + s.split(needle).length - 1, 0);

// ---- W and R: one failed seal call ----
const F = await account("lazy-era5-fault-" + RUN);
const C = await account("lazy-era5-control-" + RUN);
const sink = await openStore("lazy-era5-sink-" + RUN);
const sinkDocs = new Documents(sink.comp, "sink");

faults = 1;
const firstTurn = await F.values.runValues(F.first).then(() => "completed", (e) => String((e as Error).message).slice(0, 160));
faults = 0;
const retry = await F.values.runValues(F.first).then((p) => p.status, (e) => "refused: " + String((e as Error).message).slice(0, 160));
await C.values.runValues(C.first);
faults = 1;
const recorderFirst = await F.notices.record(F.first).then(() => "completed", (e) => String((e as Error).message).slice(0, 160));
faults = 0;
await F.notices.record(F.first);
await C.notices.record(C.first);
await C.notices.deliver(sinkDocs, await C.noticeArchive.store.head());

// W2: account G, the same first frame with the gateway stalled during its seal call (no injected error)
const G = await account("lazy-era5-stall-" + RUN);
stalls = container ? 1 : 0;
const stallTurn = await G.values.runValues(G.first).then(() => "completed", (e) => String((e as Error).message).slice(0, 160));
stalls = 0;
const stallRetry = await G.values.runValues(G.first).then((p) => p.status, (e) => "refused: " + String((e as Error).message).slice(0, 160));
await G.notices.record(G.first);

const unitsOf = async (acc: Account) => {
  const pieces = await framePages(acc);
  const bySubject: Record<string, { sealed: number; clear: number; clearText: string[] }> = {};
  for (const p of pieces)
    for (const u of p.changes) {
      const b = (bySubject[p.subject] ??= { sealed: 0, clear: 0, clearText: [] });
      if (u[0] === "" && typeof u[1] === "string" && isSealed(u[1])) b.sealed++;
      else (b.clear++, b.clearText.push(JSON.stringify(u)));
    }
  return bySubject;
};
const packetsOf = async (acc: Account) => {
  const ps = await rawPackets(acc);
  let sealed = 0, clear = 0;
  for (const p of ps) for (const d of p.deliveries as unknown[]) (isSealed((d as { sealed?: unknown }).sealed) ? sealed++ : clear++);
  return { packets: ps.length, sealed, clear };
};
const beforeF = await unitsOf(F), beforeC = await unitsOf(C);
log("W-before-removal", {
  injected: injected.length,
  firstTurn,
  retry,
  recorderFirst,
  faultArchive: Object.fromEntries(Object.entries(beforeF).map(([s, b]) => [s, { sealed: b.sealed, clear: b.clear }])),
  controlArchive: Object.fromEntries(Object.entries(beforeC).map(([s, b]) => [s, { sealed: b.sealed, clear: b.clear }])),
  xClearUnitsSample: beforeF[X]?.clearText.slice(0, 2),
  stall: { container: Boolean(container), firstTurn: stallTurn, retry: stallRetry,
    units: Object.fromEntries(Object.entries(await unitsOf(G)).map(([s, b]) => [s, { sealed: b.sealed, clear: b.clear }])) },
  faultPackets: await packetsOf(F),
  controlPackets: await packetsOf(C),
});

// ---- the removal of X's document type and expiry date in both accounts, keys deleted ----
const keyFile = (id: string) => "assertion-" + createHash("sha256").update(id).digest("hex") + ".key";
const keyFiles = () => (fs.existsSync(path.join(dumpDir, "authority")) ? fs.readdirSync(path.join(dumpDir, "authority"), { recursive: true }).map(String) : []);
async function removeX(acc: Account) {
  const rows = await peer.rows(acc.db, { entityIds: [docOf(X)] });
  const ids = PROTECTED.map((a) => rows.find((r) => r.attribute === a)!.id);
  const erased = await peer.erase(acc.db, "era5-remove-x-" + RUN, ids.map((id) => ({ id })));
  let gone = false;
  for (let i = 0; i < 150 && !gone; i++) {
    gone = ids.every((id) => !keyFiles().some((f) => f.endsWith(keyFile(id))));
    if (!gone) await sleep(200);
  }
  return { seq: erased.seq, ids, keysGone: gone };
}
const removedF = await removeX(F), removedC = await removeX(C), removedG = await removeX(G);

// ---- after the acknowledgement: what the store serves and holds ----
const served = async (acc: Account) => {
  try {
    const s = await acc.values.stored(acc.first);
    const x = s.output.filter((o) => o.subject === X);
    const text = JSON.stringify(x);
    return { xExpiry: occurrences([text], X_EXP), xVisa: occurrences([text], '\\"visa\\"') + occurrences([text], '"visa"'), x: text.slice(0, 400) };
  } catch (e) {
    return { refused: String((e as Error).message).slice(0, 160) };
  }
};
const scanArchive = async (acc: Account) => {
  const db = dbOf(acc.values.store);
  const routes = expand(await routeStrings(db));
  const native = expand(await nativeStrings(db));
  return {
    routes: { xExpiry: occurrences(routes, X_EXP), yExpiry: occurrences(routes, Y_EXP) },
    native: { xExpiry: occurrences(native, X_EXP), yExpiry: occurrences(native, Y_EXP) },
  };
};
const W = {
  fault: { removal: removedF, servedAfterRemoval: await served(F), archive: await scanArchive(F) },
  control: { removal: removedC, servedAfterRemoval: await served(C), archive: await scanArchive(C) },
  stall: { removal: removedG, servedAfterRemoval: await served(G), archive: await scanArchive(G) },
};
log("W-after-removal", W);

// ---- L: what the length of X's stored records says about X's removed document type ----
const TYPES = ["passport", "ead", "visa"]; // W0's schema, packages/w0/src/schema.ts 83
async function places(acc: Account) {
  const ps = await rawPackets(acc);
  const deliveries = (s: string) =>
    ps.flatMap((p) => (p.deliveries as unknown as { subject: string; sealed: unknown }[]).filter((d) => d.subject === s).map((d) => d.sealed))
      .filter(isSealed);
  const pieces = await framePages(acc);
  const units = (s: string) => pieces.filter((p) => p.subject === s).flatMap((p) => p.changes.map((u) => u[1])).filter(isSealed);
  const origin = hash([ps[0]!.account, ps[0]!.epoch]);
  const recipient = async (s: string) => {
    const r = await sinkDocs.row<string>("receiver:" + origin + ":" + s, await sinkDocs.head());
    return r ? unpack<{ e: unknown[] }>(r.value).e.filter(isSealed) : [];
  };
  return {
    packets: [deliveries(X), deliveries(Y)],
    ledger: [(await rawLedger(acc, X)).filter(isSealed), (await rawLedger(acc, Y)).filter(isSealed)],
    settled: [units(X), units(Y)],
    recipient: [await recipient(X), await recipient(Y)],
  } as Record<string, [string[], string[]]>;
}
const L: Record<string, unknown> = {};
for (const [place, [xs, ys]] of Object.entries(await places(C))) {
  const xOpened = await open(url, xs);
  const yClear = (await open(url, ys)) as string[];
  assert(ys.every((w, i) => clearLength(w) === Buffer.byteLength(yClear[i]!)), "the clear length is the stored length less the 16-byte tag");
  const typeIn = (s: string) => (s.match(/docType\\*"\s*:\s*\\*"(passport|ead|visa)/g) ?? []).length;
  const lx = xs.map(clearLength).sort((a, b) => a - b);
  const fits = TYPES.filter((t) => {
    const predicted = yClear.map((s) => Buffer.byteLength(s) + typeIn(s) * (t.length - "ead".length)).sort((a, b) => a - b);
    return predicted.length === lx.length && predicted.every((v, i) => v === lx[i]);
  });
  L[place] = {
    xRecords: xs.length,
    xOpenAsRemoved: xOpened.filter((v) => typeof v === "object").length,
    xClearLengths: lx,
    yClearLengths: yClear.map((s) => Buffer.byteLength(s)).sort((a, b) => a - b),
    yRecordsNamingTheType: yClear.filter((s) => typeIn(s) > 0).length,
    typesThatFit: fits,
  };
}
log("L-length", { truth: "visa", places: L });

// ---- S: after the removal of X's document values, the next Publish (R2) of the same account ----
// W0's kernel accepts a removed value only for `ssn` (page 5.1, the fourth limit): X's world now holds removed values.
// Does the account's settlement and notice stream go on for Y and Z? Control: account D, the same, no removal.
const D = await account("lazy-era5-noremoval-" + RUN);
await D.values.runValues(D.first);
await D.notices.record(D.first);
const nextRelease = async (acc: Account, label: string) => {
  const step: Record<string, unknown> = {};
  try {
    await acc.a.publish("era5-two-" + label, W0.R2.doc, valid, "owed", undefined, { sources: "census" });
    const second = (await acc.a.notices.observe()).value.sequence;
    step.sequence = second;
    step.settlement = await acc.values.runValues(second).then((p) => p.status, (e) => "FAILED: " + String((e as Error).message).slice(0, 200));
    step.notices = await acc.notices.record(second).then(() => "recorded", (e) => "FAILED: " + String((e as Error).message).slice(0, 200));
  } catch (e) {
    step.publish = "FAILED: " + String((e as Error).message).slice(0, 200);
  }
  return step;
};
const S = { afterRemoval: await nextRelease(C, "c"), control: await nextRelease(D, "d") };
log("S-next-release", S);

const breaks = {
  W2: (W.stall.archive.routes.xExpiry + W.stall.archive.native.xExpiry + ((W.stall.servedAfterRemoval as { xExpiry?: number }).xExpiry ?? 0)) > 0,
  W: (W.fault.archive.routes.xExpiry + W.fault.archive.native.xExpiry + ((W.fault.servedAfterRemoval as { xExpiry?: number }).xExpiry ?? 0)) > 0,
  L: Object.values(L).some((v) => JSON.stringify((v as { typesThatFit: string[] }).typesThatFit) === '["visa"]'),
  S: JSON.stringify(S.afterRemoval).includes("FAILED") && !JSON.stringify(S.control).includes("FAILED"),
};
log("verdict", { breaks, sealCounters: counters, run: RUN });
peer.close();
for (const s of [G.store, G.values.store, G.noticeArchive.store, D.store, D.values.store, D.noticeArchive.store, F.store, C.store, sink, F.values.store, F.noticeArchive.store, C.values.store, C.noticeArchive.store]) await s.close().catch(() => {});
process.exit(0);
