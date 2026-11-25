// [DX-XQ3] Toy gate for the ID list route and Triplex's reads by type through it (gates G1, G4, G5, G8 of the design
// of 2026-11-24, section 10), on a stack of this checkout's gateway with TX2_ID_LISTS=1:
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq3/gate.ts OUT WRITE_URL READ_URL
// Counts are exact; times are diagnostic (Mac, lab VM). Writes go through Triplex's own runtime on the write gateway;
// every check reads the read gateway. Brute force: every row ever recorded at or before the position (one history
// read of the whole scope), its entity IDs and its reference targets, filtered by the same prefix and shape.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer, ManagedRuntime } from "effect";

const REPO = path.resolve(import.meta.dirname, "../../../..");
const dist = (pkg: string, file: string) => pathToFileURL(path.join(REPO, "packages", pkg, "dist", file)).href;
const core: any = await import(dist("core", "index.js"));
const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const config: any = await import(dist("core", "config/index.js"));
const datomic: any = await import(dist("datomic", "index.js"));

const [out, writeUrl, readUrl] = process.argv.slice(2);
assert(out && writeUrl && readUrl, "usage: gate.ts OUT WRITE_URL READ_URL");
fs.mkdirSync(out, { recursive: true });
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "gate.jsonl"), line + "\n");
};
const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);
const check = (ok: boolean, what: string, detail: object = {}) => {
  bump(ok ? "pass" : "fail");
  if (!ok) log("FAIL", { what, ...detail });
  assert(ok, what);
};

const ACCOUNTS = ["account-003", "account-004", "account-0031"] as const;
const N = Number(process.env["DX_XQ3_SUBJECTS"] ?? 40);
const pad = (n: number) => String(n).padStart(8, "0");
const subjectId = (a: string, i: number) => `acct/${a}/pl:${pad(i)}`;
const placementId = (a: string, i: number, k: number) => `acct/${a}/pl:${pad(i)}:p${k}`;
const taskId = (a: string, i: number, k: number) => `acct/${a}/tk:${pad(i)}:${k}`;
const workerId = (a: string, i: number) => `acct/${a}/wk:${pad(i)}`;
const PROTECTED = ":privacy/identity-number";

const scope = runtimeApi.DatabaseScope.test(`xq3-gate-${process.pid}-${Date.now()}`);
const writer = new datomic.DatomicClient(writeUrl, 60_000);
const reader = new datomic.DatomicClient(readUrl, 60_000);
// Name the request when the client refuses to encode it (a gate bug, never a store result).
for (const client of [writer, reader]) {
  const original = client.request.bind(client);
  client.request = async (method: string, route: string, body?: unknown, ...rest: unknown[]) => {
    try {
      return await original(method, route, body, ...rest);
    } catch (error: any) {
      if (error?._tag === "DatomicCodecError") log("encode-error", { method, route, body: JSON.stringify(body) });
      throw error;
    }
  };
}
const created = await writer.create(scope, "lean");
const db: string = created.db;
log("scope", { db, created });

// Protection is declared before the first save (the gateway's rule); without an erasure directory it is refused and
// the removal case is reported as not run.
let protectedScope = false;
try {
  await writer.declareProtection(db, [PROTECTED], false);
  protectedScope = true;
} catch (error) {
  log("protection-unavailable", { message: String((error as Error).message) });
}

const types = {
  Subject: ACCOUNTS.map((account) => ({ account, prefix: "pl:", shape: "pl:{8 digits}" })),
  Placement: ACCOUNTS.map((account) => ({ account, prefix: "pl:", shape: "pl:{8 digits}:p{digits}" })),
  Task: ACCOUNTS.map((account) => ({ account, prefix: "tk:" })),
  ...datomic.configStoreIdLists,
};
const runtimeFor = (client: any, idLists?: object) => {
  const definition = runtimeApi.Runtime.define({
    name: "datomic",
    storage: Layer.succeed(
      runtimeApi.StorageAdapter,
      datomic.makeDatomicStorageAdapter(client, scope, { layout: "lean", serverRecordTime: true, ...(idLists ? { idLists } : {}) }),
    ),
    queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(client, scope)),
  });
  const triplex = definition.layer({ scope, capabilities: runtimeApi.Capabilities.none });
  return ManagedRuntime.make(Layer.merge(triplex, config.ConfigStore.layer.pipe(Layer.provide(triplex)))) as any;
};
const write = runtimeFor(writer);
const stock = runtimeFor(reader);
const listed = runtimeFor(reader, { types, bounds: { entries: 64 } });
const refusing = runtimeFor(reader, { types, refuseScans: true });
const Triples = core.Triples;
const run = (rt: any, f: (t: any) => any) => rt.runPromise(Effect.flatMap(Triples, f));

// ---- workload ----
const receipts: { label: string; position: number; instant: number }[] = [];
const transact = async (label: string, ops: object[], meta: object = {}) => {
  const r = await run(write, (t) => t.transact(ops, { actor: "xq3-gate", ...meta }));
  receipts.push({ label, position: r.position, instant: r.instant });
  return r;
};
const assertOp = (entityId: string, entityType: string, attribute: string, value: object) => ({
  op: "assert", entityId, entityType, attribute, value, validFrom: 0,
});
const live = new Map<string, any[]>(); // entity -> its live triples, from receipts
const remember = (r: any) => {
  for (const t of r.triples) live.set(t.entityId, [...(live.get(t.entityId) ?? []), t]);
};
const t0 = performance.now();
// 1. Create: per account N subjects, two placements each (with a reference to a worker that has no facts), two tasks.
for (const a of ACCOUNTS)
  for (let i = 0; i < N; i += 10) {
    const ops: object[] = [];
    for (let j = i; j < Math.min(N, i + 10); j++) {
      ops.push(assertOp(subjectId(a, j), "Subject", ":person/name", { type: "string", value: `name ${j}` }));
      for (const k of [0, 1]) {
        ops.push(assertOp(placementId(a, j, k), "Placement", ":placement/status", { type: "string", value: "open" }));
        ops.push(assertOp(placementId(a, j, k), "Placement", ":placement/worker", { type: "ref", value: workerId(a, j) }));
        ops.push(assertOp(taskId(a, j, k), "Task", ":task/status", { type: "string", value: "pending" }));
      }
    }
    remember(await transact(`create ${a} ${i}`, ops));
  }
const P1 = receipts.at(-1)!;
// 2. Change values (retract and assert), retire every fact of some tasks, create more subjects.
for (const a of ACCOUNTS) {
  const ops: object[] = [];
  for (let j = 0; j < N; j += 3) {
    const old = (live.get(taskId(a, j, 0)) ?? []).filter((t: any) => t.attribute === ":task/status");
    for (const t of old) ops.push({ op: "retract", id: t.id });
    ops.push(assertOp(taskId(a, j, 0), "Task", ":task/status", { type: "string", value: "complete" }));
  }
  for (let j = 1; j < N; j += 4) for (const t of live.get(taskId(a, j, 1)) ?? []) ops.push({ op: "retract", id: t.id });
  for (let j = N; j < N + 5; j++) ops.push(assertOp(subjectId(a, j), "Subject", ":person/name", { type: "string", value: `late ${j}` }));
  await transact(`change ${a}`, ops);
}
const P2 = receipts.at(-1)!;
// 3. A configuration release through Triplex's own ConfigStore (reserved entities under _triplex/config/).
const SubjectType = config.EntityType.make("Subject", {
  attributes: { name: config.Attribute.use(config.Attribute.text(":person/name"), { required: true }) },
});
const release = await write.runPromise(
  Effect.gen(function* () {
    const store = yield* config.ConfigStore.ConfigStore;
    const nodes = yield* SubjectType.nodes;
    return yield* store.commit({ label: "xq3-release", objects: nodes, ref: "test" });
  }),
);
receipts.push({ label: "config release", position: release.transaction.position, instant: release.transaction.instant });
// 4. Removal on request: protected values saved for five subjects of account-003, then removed.
const removed = [0, 1, 2, 3, 4].map((j) => subjectId("account-003", j));
let removal: object = { run: false };
if (protectedScope) {
  await transact(
    "protected values",
    removed.map((s, j) => assertOp(s, "Subject", PROTECTED, { type: "string", value: `IDN-${9000 + j}` })),
  );
  const before = await reader.listIds(db, { account: "account-003", prefix: "pl:", shape: "pl:{8 digits}", limit: 1000 });
  const erased = await writer.erase(
    db,
    `xq3-erase-${process.pid}`,
    removed.map((entityId) => ({ entityId, attribute: PROTECTED })),
  );
  const head = await reader.basis(db);
  const after = await reader.listIds(db, {
    account: "account-003", prefix: "pl:", shape: "pl:{8 digits}", limit: 1000,
    atLeastPosition: Number(head.position.v),
  });
  const text = JSON.stringify(after);
  removal = {
    run: true, erasure: erased, beforePosition: before.position, afterPosition: after.position,
    idsUnchanged: JSON.stringify(before.ids) === JSON.stringify(after.ids),
    removedListed: removed.every((s) => after.ids!.includes(s)),
    protectedValueInAnswer: /IDN-9/.test(text),
  };
  check((removal as any).idsUnchanged && (removal as any).removedListed && !(removal as any).protectedValueInAnswer, "removal: IDs unchanged, no protected value", removal);
  receipts.push({ label: "removal", position: after.position, instant: Number.NaN });
}
const workloadMs = performance.now() - t0;
const headBasis = await reader.basis(db);
const HEAD = Number(headBasis.position.v);
log("workload", { receipts, head: HEAD, workloadMs, removal });

// ---- brute force: the owners of every row the store's own history read returns at position p ----
// (POST read, history, basis {recordedPosition: p}: the same physical cut every pinned Triplex read uses.) In the lean
// layout an entity gets its ID with its first row; a reference target with no row of its own has none.
const histories = new Map<number, any[]>();
const historyAt = async (p: number) => {
  if (!histories.has(p)) histories.set(p, await reader.rows(db, { pattern: {}, history: true, basis: { recordedPosition: p, validAt: 0 } }));
  return histories.get(p)!;
};
const bruteIds = async (p: number, start: string, shape?: RegExp) => {
  // A shape is matched against the ID after the account's base (`acct/<account>/` or `_triplex/`).
  const base = start.startsWith("_triplex/") ? "_triplex/" : start.slice(0, start.indexOf("/", 5) + 1);
  const ids = new Set<string>();
  for (const row of await historyAt(p)) if (row.entity_type !== "_Transaction") ids.add(row.entity_id);
  return [...ids].filter((id) => id.startsWith(start) && (!shape || shape.test(id.slice(base.length)))).sort();
};
const shapeRe = (shape?: string) =>
  shape === undefined ? undefined
    : new RegExp("^" + shape.replace(/\{(\d+) digits\}/g, "[0-9]{$1}").replace(/\{digits\}/g, "[0-9]+").replace(/\{segment\}/g, "[^:/]+") + "$");
const allPages = async (request: any) => {
  const pages: any[] = [];
  for (let next: string | null | undefined, n = 0; ; n++) {
    assert(n < 100000);
    const page = await reader.listIds(db, next ? { account: request.account, ...(request.prefix !== undefined ? { prefix: request.prefix } : {}), ...(request.shape ? { shape: request.shape } : {}),
      ...(request.result ? { result: request.result } : {}), ...(request.order ? { order: request.order } : {}),
      ...(request.limit ? { limit: request.limit } : {}), ...(request.bounds ? { bounds: request.bounds } : {}), cursor: next } : request);
    pages.push(page);
    next = page.next;
    if (!next) return pages;
  }
};

// ---- G1: route pages against brute force, at the head and at pinned positions ----
const positions = [...new Set([0, P1.position, P2.position, release.transaction.position, HEAD, ...receipts.map((r) => r.position).filter((_, i) => i % 3 === 0)])].sort((a, b) => a - b);
const kinds: [string, string, string | undefined][] = [];
for (const a of [...ACCOUNTS, "_system"])
  for (const [prefix, shape] of a === "_system"
    ? ([["", undefined], ["config/", undefined], ["config/object/", undefined], ["config/ref/", undefined]] as const)
    : ([["", undefined], ["pl:", undefined], ["pl:", "pl:{8 digits}"], ["pl:", "pl:{8 digits}:p{digits}"], ["tk:", undefined], ["wk:", undefined], ["pl:0000001", undefined]] as const))
    kinds.push([a, prefix, shape]);
let g1Pages = 0, g1Ids = 0;
for (const p of positions)
  for (const [account, prefix, shape] of kinds)
    for (const [limit, order] of [[7, "asc"], [1000, "asc"], [5, "desc"]] as const) {
      const start = (account === "_system" ? "_triplex/" : `acct/${account}/`) + prefix;
      let expected = await bruteIds(p, start, shapeRe(shape));
      if (order === "desc") expected = expected.reverse();
      const pages = await allPages({ account, prefix, ...(shape ? { shape } : {}), limit, order, basis: { recordedPosition: p } });
      const got = pages.flatMap((x) => x.ids);
      check(JSON.stringify(got) === JSON.stringify(expected), "G1 route equals brute force", { p, account, prefix, shape, limit, order, got: got.length, expected: expected.length });
      check(pages.every((x) => x.position === p && x.trailingBy === 0), "G1 every page at the first page's position");
      g1Pages += pages.length;
      g1Ids += got.length;
    }
// Record-time bases: the route resolves them like every pinned read; the answer states the position.
let recordTimeChecks = 0;
for (const r of receipts.filter((x) => Number.isFinite(x.instant))) {
  const page = await reader.listIds(db, { account: "account-004", prefix: "pl:", limit: 1000, basis: { recordedAt: r.instant } });
  check(page.position >= r.position, "record time at or after its commit", { r, position: page.position });
  check(JSON.stringify(page.ids) === JSON.stringify(await bruteIds(page.position, "acct/account-004/pl:")), "record-time page equals brute force at its stated position");
  recordTimeChecks++;
}
log("G1-route", { positions, kinds: kinds.length, pages: g1Pages, ids: g1Ids, recordTimeChecks });

// ---- G1: Triplex's entityPage, match and ConfigStore.load: listed runtime equals the stock scan ----
const pageChain = async (rt: any, request: any) => {
  const pages: any[] = [];
  let cursor: string | undefined;
  do {
    const page = await run(rt, (t) => t.entityPage({ ...request, ...(cursor ? { cursor } : {}) }));
    pages.push(page);
    cursor = page.nextCursor;
  } while (cursor && pages.length < 10000);
  return pages;
};
// Every entityPage request names both instants: a default "now" would differ between the two calls and their cursors.
const LATER = Date.now() + 86_400_000;
const recordTimes = [P1.instant, P2.instant, release.transaction.instant, LATER];
const VALID = Date.now();
let entityPageChains = 0, entityPagePages = 0, matchCompares = 0;
for (const entityType of ["Subject", "Placement", "Task", "triplex.config-object", "triplex.config-snapshot", "triplex.config-ref", "NotListed"])
  for (const recordedAt of recordTimes)
    // Limit 1 only where the stock scan is cheap enough (each stock page reads every fact of the type).
    for (const limit of entityType === "Subject" || entityType.startsWith("triplex.") ? [1, 9, 200] : [9, 200]) {
      const request = { entityType, limit, basis: { recordedAt, validAt: VALID } };
      // Both chains pin the same head: no write happens during the comparison.
      const [a, b] = [await pageChain(stock, request), await pageChain(listed, request)];
      const strip = (pages: any[]) => JSON.stringify(pages.map((x) => ({ entities: x.entities, nextCursor: x.nextCursor, position: x.snapshot.recordedPosition })));
      check(strip(a) === strip(b), "G1 entityPage listed equals scan", { entityType, recordedAt, limit, a: a.length, b: b.length });
      entityPageChains++;
      entityPagePages += b.length;
    }
for (const pattern of [{ entityType: "Subject" }, { entityType: "Task", attribute: ":task/status" }, { entityType: "Task", attribute: ":task/status", value: { type: "string", value: "complete" } }, { entityType: "Placement" }, { entityType: "triplex.config-revision" }])
  for (const recordedAt of recordTimes) {
    const basis = { recordedAt, validAt: VALID };
    const key = (rows: any[]) => JSON.stringify(rows.map((t) => t.id).sort());
    const [a, b] = [await run(stock, (t) => t.match(pattern, basis)), await run(listed, (t) => t.match(pattern, basis))];
    check(key(a) === key(b) && a.length === b.length, "G1 match listed equals scan", { pattern, recordedAt, a: a.length, b: b.length });
    matchCompares++;
  }
const digest = (store: any) => JSON.stringify({ snapshots: store.snapshots.map((s: any) => s.id), revisions: store.revisions.map((r: any) => r.id), refs: [...store.refs.entries()], objects: [...store.objects.keys()].sort(), schemas: [...store.schemas.keys()].sort(), seq: store.seq });
const loadStock = await stock.runPromise(Effect.flatMap(config.ConfigStore.ConfigStore, (s: any) => s.load()));
const loadListed = await listed.runPromise(Effect.flatMap(config.ConfigStore.ConfigStore, (s: any) => s.load()));
check(digest(loadStock) === digest(loadListed) && loadListed.snapshots.length === 1, "G1 ConfigStore.load listed equals scan");
// refuseScans: a read by attribute alone is refused, a read naming its entity is not.
const refusal = await run(refusing, (t) => t.match({ attribute: ":task/status" })).then(() => "accepted", (e: any) => e?.code ?? e?._tag ?? String(e));
check(refusal === "MatchNeedsPaging", "refuseScans refuses an attribute scan", { refusal });
const named = await run(refusing, (t) => t.match({ entityId: subjectId("account-004", 1) }));
check(named.length === 1, "refuseScans keeps reads that name their entity");
// The fact bound of a bounded match.
const tight = runtimeFor(reader, { types, matchFactLimit: 10 });
const bound = await run(tight, (t) => t.match({ entityType: "Task" })).then(() => "accepted", (e: any) => e?.code ?? String(e));
check(bound === "MatchNeedsPaging", "a bounded match over its fact limit is refused", { bound });
log("G1-triplex", { entityPageChains, entityPagePages, matchCompares, configSnapshots: loadListed.snapshots.length });

// ---- G4: isolation through HTTP, crafted inputs ----
let g4 = 0;
for (const prefix of ["", "../account-004/", "pl:../../account-004/", "/", "%2F..%2Faccount-004", "ÿ", "￿"]) {
  const page = await reader.listIds(db, { account: "account-003", prefix, limit: 1000 });
  check(page.ids!.every((id: string) => id.startsWith("acct/account-003/")), "G4 crafted prefix stays in the account", { prefix });
  g4++;
}
const own3 = (await allPages({ account: "account-003", limit: 1000 })).flatMap((x) => x.ids);
check(own3.length > 0 && !own3.some((id: string) => id.startsWith("acct/account-0031/")), "G4 account-003 never lists account-0031");
const refusedCode = (f: () => Promise<unknown>) => f().then(() => "accepted", (e: any) => e?.code ?? String(e));
for (const [request, code] of [
  [{ account: "account-003/../account-004" }, "InvalidValue"],
  [{ account: "account-003", prefix: "pl:\u0000" }, "InvalidValue"],
  [{ prefix: "pl:" }, "AccountRequired"],
  [{ account: "account-003", after: subjectId("account-004", 1) }, "AccountMismatch"],
  [{ account: "account-003", after: subjectId("account-0031", 1) }, "AccountMismatch"],
] as const) {
  check((await refusedCode(() => reader.listIds(db, request as any))) === code, "G4 refusal", { request, code });
  g4++;
}
const first = await reader.listIds(db, { account: "account-003", prefix: "pl:", limit: 3 });
check((await refusedCode(() => reader.listIds(db, { account: "account-004", prefix: "pl:", limit: 3, cursor: first.next! }))) === "CursorMismatch", "G4 cursor replayed in another account");
check((await refusedCode(() => reader.listIds(db, { account: "account-003", prefix: "tk:", limit: 3, cursor: first.next! }))) === "CursorMismatch", "G4 cursor replayed with another request");
log("G4", { checks: g4 + 3, account003Ids: own3.length });

// ---- G5: entries bound, cursor continuation, permits ----
const total003 = (await bruteIds(HEAD, "acct/account-003/")).length;
const total004 = (await bruteIds(HEAD, "acct/account-004/")).length;
for (const entries of [1, 7, 64]) {
  const pages = await allPages({ account: "account-003", result: "count", bounds: { entries } });
  check(pages.every((x) => x.examined <= entries), "G5 entries examined never over the bound", { entries });
  check(pages.at(-1).count === total003 && pages.at(-1).countExact === true, "G5 a cursor always continues to the exact count", { entries, count: pages.at(-1).count, total003 });
  log("G5-bound", { entries, pages: pages.length, maxExamined: Math.max(...pages.map((x) => x.examined)), count: pages.at(-1).count });
}
// Concurrency: 16 requests of one account at once; refused ones are IndexBusy, the rest exact; afterwards nothing held.
const burst = await Promise.all(Array.from({ length: 16 }, () => reader.listIds(db, { account: "account-004", result: "count", bounds: { entries: 1000000, ms: 1000 } }).then((x: any) => x, (e: any) => e)));
const busy = burst.filter((x: any) => x?.code === "IndexBusy").length;
const ok = burst.filter((x: any) => typeof x?.count === "number");
check(busy + ok.length === 16 && ok.every((x: any) => x.count === total004), "G5 burst: IndexBusy or exact", { busy, ok: ok.length });
const otherAccounts = await Promise.all(ACCOUNTS.map((account) => reader.listIds(db, { account, result: "count", bounds: { entries: 1000000 } }).then((x: any) => x, (e: any) => e)));
const after = await reader.listIds(db, { account: "account-004", result: "count" });
check(after.count === total004, "G5 permits released after the burst");
const stats = await reader.request("GET", "/v2/admin/scan-stats");
log("G5-burst", { busy, ok: ok.length, otherAccounts: otherAccounts.map((x: any) => x?.code ?? x?.count), idLists: stats.idLists });

log("PASS", { counts, head: HEAD });
fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ db, head: HEAD, counts, removal, receipts: receipts.length }, null, 2));
await Promise.all([write.dispose(), stock.dispose(), listed.dispose(), refusing.dispose(), tight.dispose()]);
await writer.delete(scope);
writer.close();
reader.close();
