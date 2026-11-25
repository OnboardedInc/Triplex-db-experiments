// [DX-ERA2 sixth pass, owed by the fifth review] The SDK end to end on a stack: applications that write and read
// through the Triplex runtime (makeDatomicRuntime: the storage adapter, its Reach cache, its optimistic commits and
// their removalSeen), never through hand-built bodies. The toy bodies of the earlier stacks could not be read by the
// SDK (their transaction IDs are not `_tx/` + a ULID); here every value is written by the SDK itself.
//   tsx sdk-e2e.ts WRITE_URL READ_URL log|commit OUT.json
// The write gateway may move the database to the commit boundary; on the commit variant it pauses 8 s after a
// removal's commit (TX2_REMOVAL_TEST_PAUSE_AT=committed), so the read gateway serves reads between the commit and the
// publication. Applications (each its own runtime: its own client, caches and stamps):
//   A  writes a1 and b1, reads a1 (entity and Reach) before the removal, then again after its commit: the removed value
//      must not be answered, and its Reach cache must not answer it either;
//   S  reads a1 before the removal and never again, then saves a new a1 secret after it: its optimistic commit carries
//      the stamp it saw (removalSeen), older than the removal, so it is declined (the application sees a WriteError
//      whose cause is ErasureReplayDeclined); the refusal carries the current stamp, so its next save is stored;
//   F  never read the database: before its first optimistic commit the SDK reads the stamp once (sixth pass, V3), so
//      the commit says when it was framed and its new value of a1's secret is stored (a new save after the removal).
// Prints ERA2_SDK_E2E with every observation; exits 1 when a check fails.
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { Effect, ManagedRuntime } from "effect";
// the core package as the SDK resolves it (packages/datomic/node_modules/@triplex-build/triplex links to packages/core)
import { Triples, EntityId, string } from "../../../../packages/core/dist/index.js";
import { Capabilities, DatabaseScope } from "../../../../packages/core/dist/runtime/index.js";
import { makeDatomicRuntime, DatomicClient } from "../../../../packages/datomic/src/index.ts";

const [W, R, variant, out] = process.argv.slice(2) as [string, string, "log" | "commit", string];
const checks: { label: string; ok: boolean; detail?: unknown }[] = [];
const check = (label: string, ok: boolean, detail?: unknown) => {
  checks.push({ label, ok, detail });
  console.log("ERA2_SDK_E2E_CHECK", ok ? "ok  " : "FAIL", label, detail === undefined ? "" : JSON.stringify(detail));
};
const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, body: (await r.json()) as Record<string, unknown>, stamp: r.headers.get("x-triplex-removal-stamp") };
};
const frontier = async (u: string, db: string) =>
  (await (await fetch(`${u}/v2/db/${db}/erasure-frontier`)).json()) as { seq: number; removalStamp: number };
const text = (x: unknown) =>
  JSON.stringify(x, (_k, v) => (v instanceof Map ? Object.fromEntries(v) : typeof v === "bigint" ? String(v) : v));
const secret = (tag: string) => `SECRET-${tag}-${randomUUID()}`;

const scope = DatabaseScope.test(`era2-sdk-${randomUUID()}`);
const admin = new DatomicClient(W);
const created = await admin.create(scope, "lean", true);
const db = created.db;
const protection = await post(`${W}/v2/db/${db}/protection`, { attributes: [":person/secret"], sealed: true });
const moved = await post(`${W}/v2/db/${db}/removal-per-account`, {});
const boundary = variant === "commit" ? await post(`${W}/v2/db/${db}/removal-commit-boundary`, {}) : undefined;
check("set-up: protected, per account, on the asked boundary", protection.status === 200 && moved.status === 200 &&
  (variant === "log" || boundary?.status === 200), { protection: protection.status, moved: moved.status, boundary: boundary?.status });

type App = { name: string; run: <A, E>(e: Effect.Effect<A, E, Triples>) => Promise<{ ok: boolean; value?: A; error?: Record<string, unknown> }> };
const app = (name: string, url: string): App => {
  const definition = makeDatomicRuntime({ url, layout: "lean" });
  const runtime = ManagedRuntime.make(definition.layer({ scope, capabilities: Capabilities.none }) as never);
  return {
    name,
    run: (e) =>
      (runtime as any).runPromise(
        Effect.match(e, {
          onFailure: (error: any) => ({
            ok: false,
            error: { tag: error?._tag, message: error?.message, code: error?.cause?.code, status: error?.cause?.status },
          }),
          onSuccess: (value) => ({ ok: true, value }),
        }),
      ),
  };
};
const a1 = EntityId.make("acct/a/one"), b1 = EntityId.make("acct/b/one");
const assertSecret = (entity: EntityId, value: string) =>
  Effect.flatMap(Effect.service(Triples), (t) =>
    t.transact([{ op: "assert", entityId: entity, attribute: ":person/secret", value: string(value) }]));
const entityText = (entity: EntityId) => Effect.map(Effect.flatMap(Effect.service(Triples), (t) => t.entity(entity)), text);
const reachText = (entity: EntityId) => Effect.map(Effect.flatMap(Effect.service(Triples), (t) => t.reach(entity)), text);

const A = app("A", R), S = app("S", R), F = app("F", R), C = app("C", R);
const s1 = secret("a1"), sb = secret("b1");
const seeded = await A.run(Effect.flatMap(Effect.service(Triples), (t) =>
  t.transact([
    { op: "assert", entityId: a1, attribute: ":person/secret", value: string(s1) },
    { op: "assert", entityId: a1, attribute: ":person/name", value: string("Ann") },
    { op: "assert", entityId: b1, attribute: ":person/secret", value: string(sb) },
  ])));
check("A's save through the SDK is stored", seeded.ok, seeded.error);
const aBefore = await A.run(entityText(a1));
const aReach1 = await A.run(reachText(a1));
const aReach2 = await A.run(reachText(a1));
check("A reads a1's secret before the removal (entity and Reach, twice)",
  aBefore.ok && (aBefore.value ?? "").includes(s1) && (aReach2.value ?? "").includes(s1), { entity: aBefore.ok, reach: aReach2.ok });
const sBefore = await S.run(entityText(a1));
check("S reads a1 before the removal", sBefore.ok && (sBefore.value ?? "").includes(s1));
const stampBefore = (await frontier(R, db)).removalStamp;

// the removal, sent by the application's back office to the write gateway
const removal = post(`${W}/v2/db/${db}/erase`, { commandId: `sdk-rm-${randomUUID()}`, selectors: [{ entityId: "acct/a/one", attribute: ":person/secret" }] });
let between: Record<string, unknown> = {};
if (variant === "commit") {
  // between the commit and the publication: the read gateway's stamp has moved, its sequence has not
  const until = Date.now() + 7000;
  let f = await frontier(R, db);
  while (f.removalStamp <= stampBefore && Date.now() < until) { await new Promise((r) => setTimeout(r, 100)); f = await frontier(R, db); }
  const aReach3 = await A.run(reachText(a1));
  const cEntity = await C.run(entityText(a1));
  between = { frontier: f, aReachAnswers: (aReach3.value ?? "").includes(s1), cEntityAnswers: (cEntity.value ?? "").includes(s1), aReachOk: aReach3.ok, cOk: cEntity.ok };
  check("commit boundary: between the commit and the publication the stamp has moved", f.removalStamp > stampBefore && f.seq === 0, f);
  check("commit boundary: A's Reach cache does not answer the value after the commit", aReach3.ok && !(aReach3.value ?? "").includes(s1), between);
  check("commit boundary: a fresh reader does not get it", cEntity.ok && !(cEntity.value ?? "").includes(s1), between);
}
const removed = await removal;
check("the removal is acknowledged", removed.status === 200, removed.body);
const aAfter = await A.run(reachText(a1));
const aEntityAfter = await A.run(entityText(a1));
check("after the acknowledgement, A's Reach and entity reads do not answer the value",
  aAfter.ok && aEntityAfter.ok && !(aAfter.value ?? "").includes(s1) && !(aEntityAfter.value ?? "").includes(s1));

// S: an optimistic commit carrying the stamp it saw before the removal
const s2 = secret("a1-s");
const sFirst = await S.run(assertSecret(a1, s2));
const sSecond = await S.run(assertSecret(a1, s2));
check("S's save framed on a stamp older than the removal is declined: the application sees ErasureReplayDeclined",
  !sFirst.ok && sFirst.error?.["code"] === "ErasureReplayDeclined", sFirst.error);
check("the refusal taught S the current stamp: its next save is stored", sSecond.ok, sSecond.error);
// F: never read the database; its first optimistic commit carries no stamp
const s3 = secret("a1-f");
const fFirst = await F.run(assertSecret(a1, s3));
const fSecond = await F.run(assertSecret(a1, s3));
check("F's first save (it never read the database: the SDK reads the stamp first) is stored", fFirst.ok, fFirst.error);
check("and its next save too", fSecond.ok, fSecond.error);
// the removed value itself, read through every reader at the end
const end = await post(`${R}/v1/db/${db}/read`, { entityIds: ["acct/a/one", "acct/b/one"], history: true });
const cEnd = await C.run(reachText(a1));
check("at the end no reader answers the removed value (history read, a fresh SDK reader)",
  end.status === 200 && !text(end.body).includes(s1) && cEnd.ok && !(cEnd.value ?? "").includes(s1));
check("b1's secret, never removed, is still answered", text(end.body).includes(sb));
const result = { variant, db, stampBefore, between, removal: removed.status, sFirst, sSecond: sSecond.ok, fFirst, fSecond: fSecond.ok,
  failed: checks.filter((c) => !c.ok).length, checks: checks.length };
writeFileSync(out, JSON.stringify({ ...result, checks }, null, 1));
console.log("ERA2_SDK_E2E", JSON.stringify(result));
await admin.delete(scope).catch(() => undefined);
process.exit(result.failed === 0 ? 0 : 1);
