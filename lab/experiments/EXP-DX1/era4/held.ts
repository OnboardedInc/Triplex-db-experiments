// [DX-ERA4] Inventory row 19 (era4/DERIVED-COPIES.md 11.6): a held reader (`LazyReader`, its answer cache in the client's
// memory) across a removal stopped right after its native commit, on a sealed database guarded per account. Driven by
// era4/run.sh with ERA4_SCRIPT=held.ts and the gateway paused after the commit:
//   ERA4_EXTRA_ENV="TX2_REMOVAL_PER_ACCOUNT=1 TX2_REMOVAL_TEST_PAUSE_AT=committed TX2_REMOVAL_TEST_PAUSE_MS=4000
//     [TX2_REMOVAL_COMMIT_BOUNDARY=1]" bash era4/run.sh OUT on
// The reader caches X's computed answer (it copies X's protected document type and expiry: DOCEXP) at a pinned
// position and at the head; the removal of X's document values is sent and pauses after its commit in Datomic; then the
// same reads are made while it is paused, and again after its publication. A computed answer holding X's removed
// expiry, served after the removal took effect for reads, is a break: on the commit boundary that is from the commit; on
// the log's boundary from the publication (a read that finds the removal committed publishes it first).
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
import { readErasure } from "../../../bench/lib/datomic-erasure.ts";
import { activation, fact, openStore, type Store } from "../actv-lazy/store.ts";
import { LazyReader, rosterRoot, rosterSeal } from "../actv-lazy/read.ts";
import { valid } from "../actv-lazy/fixture.ts";

const [out] = process.argv.slice(2);
assert(out);
const RUN = randomUUID().slice(0, 8);
const peer = new DatomicClient(process.env.DATOMIC_URL!);
const container = process.env.ERA4_CONTAINER!;
const commitBoundary = process.env.TX2_REMOVAL_COMMIT_BOUNDARY === "1";
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "derived.jsonl"), line + "\n");
};
const dbOf = (s: Pick<Store, "scope">) =>
  "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(s.scope))).toString("base64url");
const X = W0.placementId(0), Y = W0.placementId(1);
const X_EXP = "2026-02-13", Y_EXP = "2025-12-29";
const docOf = (s: string) => s + "/doc:a";
const seed = (e: string, a: string, v: string | number) => ({
  op: "assert" as const, entityId: e, attribute: a, value: triplexValue(a, v), validFrom: 0,
});
const facts = (s: string, expires: string) => [
  seed(s, "bgcStatus", "clear"), seed(s, "documents", docOf(s)),
  seed(docOf(s), "docType", "ead"), seed(docOf(s), "expiresOn", expires),
];
/** The promise's value, or "blocked" when it does not settle within ms (it is then left to settle on its own). */
const within = async <T>(ms: number, p: Promise<T>) => {
  const r = await Promise.race([p.then((v) => ({ v }), (e) => ({ e: String(e).slice(0, 300) })), sleep(ms).then(() => "blocked" as const)]);
  return r;
};

assert(derivedSealOn(), "held.ts runs with TX2_DERIVED_SEAL=1 (the held reader's protected-scope rule)");
const store = await openStore("lazy-era4-held-" + RUN);
const db = dbOf(store);
await peer.declareProtection(db, ["docType", "expiresOn"], true);
await peer.request("POST", `/v2/db/${db}/removal-per-account`, {});
await store.input("era4-held-seed", { kind: "baseline", at: valid }, [
  fact(rosterRoot(0), "lazy/members", [X, Y]),
  fact("members/seal", "lazy/roster-seal", rosterSeal([X, Y])),
  ...facts(X, X_EXP), ...facts(Y, Y_EXP),
]);
await activation(store, "r1", W0.R1, valid);
const p0 = await store.head();
const reader = new LazyReader(store, "w0", 4 << 20, () => valid, "legacy", undefined, true);
const pin = { position: p0, validTime: valid };
const readX = async (label: string, how: "pinned" | "head") => {
  const r = await within(20_000, reader.readAt(X, how === "pinned" ? pin : {}));
  const holds = typeof r === "object" && "v" in r ? r.v.json.includes(X_EXP) : undefined;
  return { label, how, outcome: r === "blocked" ? "blocked" : "e" in r ? r.e : "answered", route: typeof r === "object" && "v" in r ? r.v.route : undefined, holdsRemovedExpiry: holds };
};
const before = [await readX("before", "pinned"), await readX("before", "head"), await readX("before-again", "pinned")];
assert(before.every((b) => b.holdsRemovedExpiry === true), "X's answer copies its document's expiry before the removal");

// the removal of X's two protected document values; the gateway pauses it after its commit in Datomic
const rows = await peer.rows(db, { entityIds: [docOf(X)] });
const ids = ["docType", "expiresOn"].map((a) => rows.find((r) => r.attribute === a)!.id);
const logsBefore = execFileSync("docker", ["logs", container], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).length;
const removal = peer.erase(db, "era4-held-rm-" + RUN, ids.map((id) => ({ id }))).then((r) => ({ ok: r.seq }), (e) => ({ error: String(e).slice(0, 300) }));
let paused = false;
for (let i = 0; i < 300 && !paused; i++) {
  const text = execFileSync("docker", ["logs", container], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  paused = text.slice(logsBefore).includes("TRIPLEX_REMOVAL_PAUSED committed");
  if (!paused) await sleep(100);
}
assert(paused, "the removal paused after its commit");
const pausedAt = Date.now();
// while it is paused after its commit: the frontier, the plain read of X's document, and the held reader
const frontier = await within(3_000, readErasure(store.comp) as Promise<{ seq: number; erased: Record<string, unknown> } | undefined>);
const plain = await within(3_000, peer.rows(db, { entityIds: [docOf(X)] }));
const during = [await readX("during", "pinned"), await readX("during", "head")];
const duringMs = Date.now() - pausedAt;
let done: { ok?: number; error?: string } = await removal;
// a removal answered after the client's 5 s deadline is resent (the same command answers from the log once published)
for (let i = 0; i < 10 && !("ok" in done); i++)
  done = await peer.erase(db, "era4-held-rm-" + RUN, ids.map((id) => ({ id }))).then((r) => ({ ok: r.seq }), (e) => ({ error: String(e).slice(0, 300) }));
const after = [await readX("after", "pinned"), await readX("after", "head")];
const summary = {
  boundary: commitBoundary ? "commit" : "log",
  before, during, duringMs, done, after,
  frontierDuring: frontier === "blocked" ? "blocked" : "v" in frontier
    ? { seq: frontier.v?.seq, erasedHoldsX: ids.map((id) => id in (frontier.v?.erased ?? {})) } : frontier,
  plainReadDuring: plain === "blocked" ? "blocked" : "v" in plain ? { holdsRemovedExpiry: JSON.stringify(plain.v).includes(X_EXP) } : plain,
};
// A break: a computed answer holding the removed expiry served while the removal was in effect for reads.
const effectiveDuring = commitBoundary;
const breakDuring = effectiveDuring && during.some((d) => d.outcome === "answered" && d.holdsRemovedExpiry);
const breakAfter = after.some((d) => d.holdsRemovedExpiry);
log("held", { ...summary, breakDuring, breakAfter, pass: !breakDuring && !breakAfter && "ok" in done });
peer.close();
process.exit(0);
