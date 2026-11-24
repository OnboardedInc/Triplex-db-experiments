// [DX-XQ10] Stack gate for the connected pieces (xq10/QUESTIONS-CONNECTED.md): the question reader serving find, and
// the SDK's one call (askPage / askAll) across both routes. Counts are results; times are diagnostic (Mac, lab VM).
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq10/reader.ts OUT WRITE READ QUESTION PREFIX MODE
// MODE "main" (the main reader also serves questions, DX_QUESTION_MAIN_REFUSES=0, so one request can go to both):
//   (a) find byte-equal: every find page from the question reader equal, timing fields removed, to the same request on
//       the single (main) reader at the same position; cursors from one continue on the other (the launcher's shared key)
//   (b) ask: askAll with the index forced and the sweep forced give the same answer (ids in order, counts, counts per
//       value) for every question both take; auto answers from the index when it can, else the sweep with the index's
//       typed refusal, at the same position and valid time
//   (c) late start: the question reader stopped, saves, started; a pinned find is answered at exactly its position or
//       refused by type, never early; a cursor issued before the restart continues after it
// MODE "refusal" (DX_QUESTION_MAIN_REFUSES=1): the main reader and the writer refuse ids, sweep and find with 421
//   naming the question reader; ask without the SDK option is refused with that answer; with it, answered.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer, ManagedRuntime } from "effect";

const REPO = path.resolve(import.meta.dirname, "../../../..");
const dist = (pkg: string, file: string) => pathToFileURL(path.join(REPO, "packages", pkg, "dist", file)).href;
const core: any = await import(dist("core", "index.js"));
const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const datomic: any = await import(dist("datomic", "index.js"));

const [out, writeUrl, readUrl, questionUrl, prefix, mode] = process.argv.slice(2);
assert(out && writeUrl && readUrl && questionUrl && prefix?.startsWith("tx2-dxxq10") && (mode === "main" || mode === "refusal"));
fs.mkdirSync(out, { recursive: true });
const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);
const failures: object[] = [];
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "reader.jsonl"), line + "\n");
};
const check = (ok: boolean, what: string, detail: object = {}) => {
  bump(ok ? "pass" : "fail");
  if (!ok) { failures.push({ what, ...detail }); log("FAIL", { what, ...detail }); if (failures.length > 40) throw new Error("too many failures"); }
};
const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8" });
const sleep = (ms: number) => new Promise((s) => setTimeout(s, ms));
const DAY = 86_400_000, T0 = Date.now();
const A = "account-101", B = "account-1011";
const N = Number(process.env["XQ10_SUBJECTS"] ?? 60);
const pad = (n: number) => String(n).padStart(8, "0");
const sid = (a: string, i: number) => `acct/${a}/pl:${pad(i)}`;
const tid = (a: string, i: number) => `acct/${a}/pl:${pad(i)}:t0`;
const S = (v: string) => ({ type: "string", value: v });
const I = (v: number) => ({ type: "integer", value: String(v) });
const R = (v: string) => ({ type: "ref", value: v });
const D = (v: number) => ({ type: "datetime", value: v });
const STATUSES = ["pending", "complete", "blocked", ""];

const scope = runtimeApi.DatabaseScope.test(`xq10-reader-${mode}-${process.pid}-${Date.now()}`);
const writer = new datomic.DatomicClient(writeUrl, 120_000);
const main = new datomic.DatomicClient(readUrl, 60_000);
const question = new datomic.DatomicClient(questionUrl, 60_000);
const sdk = new datomic.DatomicClient(readUrl, 60_000, undefined, { questionReaderUrl: questionUrl });
const { db } = await writer.create(scope, "lean");
const rt = ManagedRuntime.make(runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
}).layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const live = new Map<string, any[]>();
const transact = async (ops: object[]) => {
  const r = await rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact(ops, { actor: "xq10-reader" })));
  for (const t of r.triples) live.set(`${t.entityId} ${t.attribute}`, [...(live.get(`${t.entityId} ${t.attribute}`) ?? []), t]);
  return r.position as number;
};
const as = (entityId: string, entityType: string, attribute: string, value: object, validFrom = 0, validTo?: number) =>
  ({ op: "assert", entityId, entityType, attribute, value, validFrom, ...(validTo !== undefined ? { validTo } : {}) });
const retract = (e: string, a: string) => (live.get(`${e} ${a}`) ?? []).splice(0).map((t: any) => ({ op: "retract", id: t.id }));

// ---- workload: two accounts whose names prefix each other, five families, a past-valid correction, then the index ----
for (const acct of [A, B])
  for (let i = 0; i < N; i += 15) {
    const ops: object[] = [];
    for (let j = i; j < Math.min(N, i + 15); j++) {
      ops.push(as(sid(acct, j), "Subject", ":person/status", S(STATUSES[j % 4]!)), as(sid(acct, j), "Subject", ":person/score", I((j * 7) % 50)),
        as(sid(acct, j), "Subject", ":person/name", S(`name ${j}`)));
      if (j % 5) ops.push(as(sid(acct, j), "Subject", ":person/manager", R(sid(acct, (j + 1) % N))));
      ops.push(as(tid(acct, j), "Task", ":task/status", S(STATUSES[(j + 1) % 4]!)), as(tid(acct, j), "Task", ":task/due", D(T0 + ((j % 9) - 4) * DAY)));
    }
    await transact(ops);
  }
const P0 = await transact([as(sid(A, 0), "Subject", ":person/note", S("before the index"))]);
const declaration = {
  version: 1,
  attributes: [
    { attribute: ":person/status", code: "a1", family: "string" }, { attribute: ":person/score", code: "a2", family: "integer" },
    { attribute: ":person/manager", code: "a3", family: "ref" }, { attribute: ":task/status", code: "a4", family: "string" },
    { attribute: ":task/due", code: "a5", family: "datetime" },
  ],
};
await writer.declareIndexes(db, declaration);
const backfill = await writer.backfillIndex(db, {});
const epoch = await writer.indexDeclaration(db);
const P1 = Number(Object.values(epoch.epochs as Record<string, { position: number }>)[0]!.position);
log("index", { backfill, P0, P1 });
// After the epoch: replacements on the per-subject writer, a correction dated in the past, retirements.
for (const acct of [A, B])
  for (let j = 0; j < N; j += 3)
    await transact([...retract(sid(acct, j), ":person/status"), as(sid(acct, j), "Subject", ":person/status", S(j % 2 ? "complete" : "pending"))]);
const P2 = await transact([...retract(sid(A, 4), ":person/score"), as(sid(A, 4), "Subject", ":person/score", I(4), 0, T0 - 10 * DAY),
  as(sid(A, 4), "Subject", ":person/score", I(44), T0 - 10 * DAY), ...retract(tid(A, 5), ":task/status")]);
const P3 = await transact([as(sid(A, N), "Subject", ":person/status", S("pending")), as(sid(A, N), "Subject", ":person/score", I(1))]);
// at-least waits are 1..2000 ms per request: wait up to 10 s in steps
for (const c of [main, question]) for (let n = 0; ; n++) {
  try { await c.basis(db, { position: P3, waitMs: 2000 }); break; } catch (e) { if (n >= 4) throw e; }
}
const positions = [P1, P2, P3];
const validTimes = [T0 - 20 * DAY, T0 + 3_600_000, T0 + 30 * DAY];
log("workload", { P0, P1, P2, P3 });

const strip = (x: any) => {
  const { queryMicros: _1, queryCpuMicros: _2, queueMicros: _3, queue: _4, segmentsLoaded: _5, head: _6, ...rest } = x ?? {};
  return JSON.stringify(rest);
};
const raw = async (url: string, method: string, route: string, body?: object) => {
  const r = await fetch(url + route, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  return { status: r.status, text, body: (() => { try { return JSON.parse(text); } catch { return null; } })() };
};

const findQuestions = (acct: string) => [
  { where: [{ attribute: ":person/status", op: "eq", value: S("pending") }] },
  { where: [{ attribute: ":person/status", op: "in", values: [S("complete"), S("")] }] },
  { where: [{ attribute: ":person/score", op: "range", from: I(10), toExclusive: I(30) }] },
  { where: [{ attribute: ":person/status", op: "prefix", value: S("p") }] },
  { from: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [{ attribute: ":person/manager", op: "missing" }] },
  { from: { prefix: "pl:" }, where: [{ attribute: ":task/status", op: "exists" }, { attribute: ":task/due", op: "range", to: D(T0) }] },
  { from: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [] },
  { where: [{ attribute: ":person/manager", op: "eq", value: R(sid(acct, 3)) }] },
].flatMap((q) => [
  { account: acct, ...q, result: "ids" },
  { account: acct, ...q, result: "count" },
  { account: acct, ...q, result: "countByValue", of: ":person/status" },
]);

if (mode === "main") {
  // ---- (a) find byte-equal on the question reader and the single reader ------------------------------------------------
  let pages = 0, bytes = 0, crossed = 0;
  for (const p of positions) for (const v of validTimes) for (const acct of [A, B]) for (const [qi, q] of findQuestions(acct).entries()) {
    const limit = [3, 1000][qi % 2]!, entries = [20, 100_000][(qi >> 1) % 2]!;
    let req: any = { ...q, ...(q.result === "ids" ? { order: { by: "entity", direction: "asc" }, limit } : {}), basis: { recordedPosition: p, validAt: v }, bounds: { entries, ms: 1000, segments: 4096 } };
    for (let n = 0; n < 10_000; n++) {
      const [onQ, onMain] = [await raw(questionUrl, "POST", `/v2/db/${db}/find`, req), await raw(readUrl, "POST", `/v2/db/${db}/find`, req)];
      if (onQ.status === 413 && onQ.body?.code === "BoundTooSmall") { req = { ...req, bounds: { ...req.bounds, entries: req.bounds.entries * 10 } }; continue; }
      pages++; bytes += onQ.text.length;
      check(onQ.status === onMain.status && strip(onQ.body) === strip(onMain.body), "(a) find page byte-equal", { q: req, q1: onQ.text.slice(0, 300), m: onMain.text.slice(0, 300) });
      if (onQ.status !== 200) { bump("(a) refused on both readers, byte-equal"); check(onQ.body?.code === "UnsupportedOperation", "(a) only the ID-order refusal", { body: onQ.text.slice(0, 200) }); break; }
      check(onQ.body.position === p, "(a) find answered at the pinned position", { body: onQ.text.slice(0, 200) });
      if (!onQ.body?.next) break;
      // every other page continues on the other reader with the cursor the first issued; find binds a cursor to the
      // whole request, the basis included, so the basis is sent again (as XQ4's run-find does)
      req = { ...req, cursor: onQ.body.next };
      crossed++; // the next page goes to both readers with the cursor the question reader issued
    }
  }
  log("(a)", { pages, bytes, crossed });

  // ---- (b) the one call ------------------------------------------------------------------------------------------------
  const norm = (x: any) => JSON.stringify({ ids: x.ids ?? null, count: x.count ?? null, counts: x.counts ?? null, top: x.top ?? null, position: x.position, validAt: x.validAt, complete: x.complete });
  let agreed = 0, autoIndex = 0, autoSweep = 0;
  for (const p of positions) for (const v of validTimes) for (const acct of [A, B]) for (const q of findQuestions(acct)) {
    const request = { ...q, basis: { recordedPosition: p, validAt: v }, ...(q.result === "ids" ? { limit: 7 } : {}),
      bounds: { index: { entries: 100_000, ms: 1000 }, sweep: { subjects: 17, ms: 2000 } } };
    const i = await datomic.askAll(sdk, db, { ...request, route: "index" }).catch((e: any) => e);
    const s = await datomic.askAll(sdk, db, { ...request, route: "sweep" });
    const a = await datomic.askAll(sdk, db, request);
    if (i instanceof datomic.AskRefused) {
      // ids in entity ID order driven only by a range or a prefix: find refuses that order (fallback sweep); auto
      // then answers on the sweep at the same basis, saying why.
      check(i.fallback === "sweep" && a.route === "sweep" && a.indexRefusal?.code === i.code && norm(a) === norm(s), "(b) a forced-index refusal with fallback sweep: auto answers as the sweep", { code: i.code, route: a.route });
      bump("index refused, sweep answered");
      continue;
    }
    check(norm(i) === norm(s), "(b) index and sweep give the same answer", { q: request, index: norm(i).slice(0, 300), sweep: norm(s).slice(0, 300) });
    check(a.route === "index" && norm(a) === norm(i), "(b) auto answers from the index for a declared question", { route: a.route });
    if (norm(i) === norm(s)) agreed++;
    if (a.route === "index") autoIndex++;
  }
  // Questions the index refuses with fallback "sweep": auto answers from the sweep at the same basis, stating why.
  const refused = [
    { name: "attribute not declared", q: { account: A, where: [{ attribute: ":person/name", op: "prefix", value: S("name 1") }], result: "count" }, code: "AttributeNotIndexed" },
    { name: "is not", q: { account: A, from: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [{ attribute: ":person/status", op: "ne", value: S("pending") }], result: "count" }, code: "UnsupportedOperation" },
    { name: "any of", q: { account: A, where: [], anyOf: [[{ attribute: ":person/status", op: "eq", value: S("blocked") }], [{ attribute: ":person/score", op: "range", from: I(40) }]], result: "ids" }, code: "UnsupportedOperation" },
    { name: "top N", q: { account: A, from: { prefix: "pl:", shape: "pl:{8 digits}" }, result: "top", limit: 5, order: { by: ":person/score", type: "integer", direction: "desc" } }, code: "UnsupportedOperation" },
  ];
  for (const { name, q, code } of refused) for (const p of positions) {
    const v = validTimes[1]!;
    const a = await datomic.askAll(sdk, db, { ...q, basis: { recordedPosition: p, validAt: v } });
    const direct = await datomic.askAll(sdk, db, { ...q, basis: { recordedPosition: p, validAt: v }, route: "sweep" });
    check(a.route === "sweep" && a.indexRefusal?.code === code && a.indexRefusal?.fallback === "sweep", `(b) ${name}: answered by the sweep with the index's refusal`, { route: a.route, refusal: a.indexRefusal });
    check(a.position === p && a.validAt === v && norm(a) === norm(direct), `(b) ${name}: the same basis and answer as the sweep asked directly`, { got: norm(a).slice(0, 200) });
    autoSweep++;
  }
  // Before the index's epoch: refused by the index, answered by the sweep at that position.
  const before = await datomic.askAll(sdk, db, { account: A, where: [{ attribute: ":person/status", op: "eq", value: S("pending") }], result: "count", basis: { recordedPosition: P0, validAt: validTimes[1] } });
  check(before.route === "sweep" && before.indexRefusal?.code === "IndexNotAvailableAtPosition" && before.position === P0, "(b) before the epoch: the sweep at that position", { route: before.route, position: before.position });
  // A protected-free refusal with fallback none is returned as is (countDistinct of an undeclared attribute).
  const none = await datomic.askPage(sdk, db, { account: A, where: [{ attribute: ":person/status", op: "exists" }], result: "countDistinct", of: ":person/name" }).catch((e: any) => e);
  check(none instanceof datomic.AskRefused && none.fallback === "none" && none.refusedBy === "index", "(b) a refusal with fallback none is returned as is", { code: none?.code, fallback: none?.fallback });
  log("(b)", { agreed, autoIndex, autoSweep });

  // ---- (c) the question reader started late -----------------------------------------------------------------------------
  const pinnedQ = { account: A, where: [{ attribute: ":person/status", op: "exists" }], result: "ids", order: { by: "entity", direction: "asc" }, limit: 4 };
  const before1 = await raw(questionUrl, "POST", `/v2/db/${db}/find`, { ...pinnedQ, basis: { recordedPosition: P3, validAt: validTimes[1] } });
  docker("stop", `${prefix}-gw-q`);
  const late: number[] = [];
  for (let k = 0; k < 5; k++) late.push(await transact([...retract(sid(A, 10 + k), ":person/status"), as(sid(A, 10 + k), "Subject", ":person/status", S("late"))]));
  docker("start", `${prefix}-gw-q`);
  let tally: Record<string, number> = {}, early = 0, differ = 0, probes = 0;
  const started = Date.now();
  while (Date.now() - started < 120_000) { try { if ((await fetch(questionUrl + "/health")).ok) break; } catch { /* starting */ } await sleep(200); }
  const head = late.at(-1)!;
  for (const target of [...late, head + 2, head + 5]) for (const wait of [1, 2000]) for (const kind of ["pinned", "atLeast"]) {
    probes++;
    const body = kind === "pinned" ? { ...pinnedQ, basis: { recordedPosition: target, validAt: validTimes[1] }, basisWaitMs: wait }
      : { ...pinnedQ, atLeastPosition: target, basisWaitMs: wait, basis: { validAt: validTimes[1] } };
    const r = await raw(questionUrl, "POST", `/v2/db/${db}/find`, body);
    const key = r.status === 200 ? "answered" : r.body?.code ?? String(r.status);
    tally[key] = (tally[key] ?? 0) + 1;
    if (r.status === 200) {
      if (kind === "pinned" ? r.body.position !== target : r.body.position < target) early++;
      const m = await raw(readUrl, "POST", `/v2/db/${db}/find`, { ...pinnedQ, basis: { recordedPosition: r.body.position, validAt: validTimes[1] } });
      if (strip({ ...r.body, next: null }) !== strip({ ...m.body, next: null })) differ++;
    }
  }
  check(early === 0 && differ === 0 && Object.keys(tally).every((k) => ["answered", "BasisNotAvailable", "AtLeastTimeout"].includes(k)), "(c) never answered early; equal to the single reader", { tally, early, differ });
  // the cursor issued before the restart continues after it, exact
  const cont = await raw(questionUrl, "POST", `/v2/db/${db}/find`, { ...pinnedQ, basis: { recordedPosition: P3, validAt: validTimes[1] }, cursor: before1.body?.next });
  const cmain = await raw(readUrl, "POST", `/v2/db/${db}/find`, { ...pinnedQ, basis: { recordedPosition: P3, validAt: validTimes[1] }, cursor: before1.body?.next });
  check(cont.status === 200 && cont.body.position === P3 && strip(cont.body) === strip(cmain.body), "(c) a cursor from before the restart continues, on either reader", { status: cont.status, code: cont.body?.code });
  log("(c)", { probes, tally, early, differ });
} else {
  // ---- refusal mode ------------------------------------------------------------------------------------------------------
  for (const [name, url] of [["main reader", readUrl], ["writer", writeUrl]] as const)
    for (const route of ["ids", "sweep", "find"]) {
      const r = await raw(url, "POST", `/v2/db/${db}/${route}`, { account: A });
      check(r.status === 421 && r.body?.code === "QuestionReaderRoute" && r.body?.questionReader === questionUrl && r.body?.route === route,
        `${name} refuses ${route} naming the question reader`, { status: r.status, body: r.text.slice(0, 200) });
    }
  const q = { account: A, where: [{ attribute: ":person/status", op: "eq", value: S("pending") }], result: "count", basis: { recordedPosition: P3, validAt: validTimes[1] } };
  const plain = await datomic.askPage(main, db, q).catch((e: any) => e);
  check(plain instanceof datomic.AskRefused && plain.code === "QuestionReaderRoute", "ask without the SDK option is told where questions are served", { code: plain?.code });
  const viaOption = await datomic.askPage(sdk, db, q);
  const direct = await datomic.askPage(question, db, q);
  check(viaOption.route === "index" && viaOption.count === direct.count && viaOption.position === P3, "ask with the SDK option is answered by the question reader's index", { count: viaOption.count });
  const stats = await raw(questionUrl, "GET", "/v2/admin/scan-stats");
  check((stats.body?.questionReader?.served?.find ?? 0) >= 2, "the question reader counts the find pages it served", stats.body?.questionReader ?? {});
}

fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ db, mode, counts, failures }, null, 2));
await rt.dispose();
await writer.delete(scope).catch(() => undefined);
for (const c of [writer, main, question, sdk]) c.close();
log("PASS?", { mode, counts, failed: failures.length });
process.exitCode = failures.length ? 1 : 0;
