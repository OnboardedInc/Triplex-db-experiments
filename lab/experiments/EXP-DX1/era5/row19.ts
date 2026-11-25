// [DX-ERA5] Inventory row 19 under the removal builder's commit boundary (coordinator's question, 2026-11-25): can the
// held reader's answer cache (`actv-lazy/read.ts` `LazyReader`, which under TX2_DERIVED_SEAL keys on and checks the
// removal sequence) serve a computed answer holding a removed value between the removal's native commit and its
// publication? Driven by era5/run.sh with ERA5_DRIVER=row19.ts, ERA5_GATEWAY_REF=<the removal builder's head> and the
// gateway options TX2_REMOVAL_PER_ACCOUNT=1, TX2_REMOVAL_TEST_PAUSE_AT=committed, TX2_REMOVAL_TEST_PAUSE_MS=20000 and
// TX2_REMOVAL_COMMIT_BOUNDARY=1 (arm commit) or unset (arm log). The client runs with TX2_DERIVED_SEAL=1, so the reader
// is the option's (protectedScope on). Unsealed protected database (that head has no derived routes and no preview
// change; masking at the commit is the same rule on both). Reads are pinned at the position after the Publish, with a
// fixed valid time, so the cache key repeats and no read crosses the removal's transaction.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { W0, triplexValue } from "../../../bench/lib/w0-world.ts";
import { derivedSealOn } from "../../../bench/lib/derived-seal.ts";
import { openStore, fact, type Store } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { valid } from "../actv-lazy/fixture.ts";
import { LazyReader, rosterRoot, rosterSeal } from "../actv-lazy/read.ts";

const [out] = process.argv.slice(2);
assert(out && derivedSealOn(), "row19.ts runs with TX2_DERIVED_SEAL=1 (the option's reader)");
const RUN = randomUUID().slice(0, 8);
const peer = new DatomicClient(process.env.DATOMIC_URL!, 60_000);
const container = process.env.ERA5_GATEWAY_CONTAINER!;
const boundary = process.env.ERA5_BOUNDARY ?? "unknown";
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, boundary, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "attack.jsonl"), line + "\n");
};
const dbOf = (s: Pick<Store, "scope">) => "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(s.scope))).toString("base64url");
const X_EXP = "2026-02-13";
const X = W0.placementId(0), Y = W0.placementId(1);
const docOf = (s: string) => s + "/doc:a";
const seed = (e: string, a: string, v: string | number) => ({ op: "assert" as const, entityId: e, attribute: a, value: triplexValue(a, v), validFrom: 0 });
const facts = (s: string, type: string, expires: string) => [
  seed(s, "bgcStatus", "clear"), seed(s, "weeklyMinutes", 2400), seed(s, "location", "loc:r19"), seed(s, "payRateCents", 1660),
  seed(s, "baselinePayRateCents", 1660), seed(s, "documents", docOf(s)), seed(docOf(s), "docType", type), seed(docOf(s), "expiresOn", expires),
];

const store = await openStore("lazy-era5-row19-" + RUN);
const db = dbOf(store);
await peer.declareProtection(db, ["docType", "expiresOn"], false);
const moved = await peer.request<{ perAccount?: boolean }>("POST", `/v2/db/${db}/removal-per-account`, {});
const a = new JoinedAccount(store);
await store.input("r19-seed", { kind: "baseline", at: valid }, [
  fact(rosterRoot(0), "lazy/members", [X, Y]),
  fact("members/seal", "lazy/roster-seal", rosterSeal([X, Y])),
  seed("loc:r19", "jurisdiction", "jur:r19"), seed("loc:r19", "localMinWageCents", 1700), seed("jur:r19", "stateMinWageCents", 1650),
  ...facts(X, "visa", X_EXP), ...facts(Y, "ead", "2025-12-29"),
]);
await a.install([X, Y], valid);
await a.publish("r19-one", W0.R1.doc, valid, "owed", undefined, { sources: "census" });
const P = await store.head();
const pin = { position: P, validTime: valid };
const holds = (j: unknown) => typeof j === "string" && j.includes(X_EXP);
const read = async (r: LazyReader) => {
  const t = performance.now();
  try {
    const x = await r.readAt(X, pin);
    return { route: x.route, holdsRemovedDate: holds(x.json), ms: Math.round(performance.now() - t) };
  } catch (e) {
    return { failed: String((e as Error).message).slice(0, 120), ms: Math.round(performance.now() - t) };
  }
};
const frontier = async () => {
  try { return (await peer.request<{ seq: number; erased: object }>("GET", `/v2/db/${db}/erasure-frontier`)).seq; }
  catch (e) { return "failed: " + String((e as Error).message).slice(0, 80); }
};
const plain = async () => {
  try {
    const rows = await peer.rows(db, { entityIds: [docOf(X)], basis: { recordedPosition: P } });
    return { holdsRemovedDate: JSON.stringify(rows).includes(X_EXP), types: rows.map((r) => r.value_type) };
  } catch (e) { return { failed: String((e as Error).message).slice(0, 120) }; }
};

const reader = new LazyReader(store, "w0", 2 << 20, undefined, "legacy");
const before = { first: await read(reader), second: await read(reader), seq: await frontier(), plain: await plain() };
log("before", { movedPerAccount: moved.perAccount ?? moved, P, ...before });

const xRows = await peer.rows(db, { entityIds: [docOf(X)] });
const ids = ["docType", "expiresOn"].map((attr) => xRows.find((r) => r.attribute === attr)!.id);
const started = performance.now();
const removal = peer.erase(db, "r19-remove-x-" + RUN, ids.map((id) => ({ id }))).then(
  (r) => ({ seq: r.seq, ms: Math.round(performance.now() - started) }),
  (e) => ({ failed: String((e as Error).message).slice(0, 120), ms: Math.round(performance.now() - started) }),
);
let paused = false;
for (let i = 0; i < 300 && !paused; i++) {
  paused = execFileSync("docker", ["logs", container], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).includes("TRIPLEX_REMOVAL_PAUSED committed");
  if (!paused) await sleep(100);
}
const sinceCommit = performance.now();
const during = {
  pausedAfterCommit: paused,
  seq: await frontier(),
  plain: await plain(),
  cachedReader: await read(reader),
  freshReader: await read(new LazyReader(store, "w0", 2 << 20, undefined, "legacy")),
  msSinceCommit: Math.round(performance.now() - sinceCommit),
};
log("between-commit-and-publication", during);
const done = await removal;
const after = { removal: done, seq: await frontier(), plain: await plain(), cachedReader: await read(reader) };
log("after-publication", after);
log("verdict", { boundary, cachedAnswerWithRemovedValueAfterCommit: during.cachedReader.holdsRemovedDate === true,
  plainReadMaskedAfterCommit: (during.plain as { holdsRemovedDate?: boolean }).holdsRemovedDate === false });
peer.close();
await store.close().catch(() => {});
process.exit(0);
