// [DX-SCALE2] The Mac miniature of many small accounts in the one database (driven by scale2/mini.sh, which owns the
// stack). Counts are exact; every time is diagnostic (Mac, lab VM shared with other builders).
//   node --experimental-transform-types lab/experiments/EXP-DX1/scale2/mini.ts OUT WRITE_URL READ_URL PREFIX
// Steps, all in ONE Datomic database:
//   1. load the roster (scale2/population.ts): deep accounts, small publishing accounts, thin accounts; every subject
//      committed whole (one position per subject), each commit inside one account;
//   2. enrol every publishing account as a held, namespaced account (its own release list, notice stream, settlement
//      progress), publish R1 and settle it quietly, then publish the large release (20 forms, 20 policies) in all of them;
//   3. a live window: saves over every account (one commit per subject's save, revisits as the production study's
//      shape), a busy deep account and a quiet thin account, pinned and current readers checked against the oracle,
//      a feed follower, and settlement of every publishing account at once through ONE bulk queue with the progress
//      precondition;
//   4. checks, one account at a time: every subject's root and form at the final head against the oracle; the feed
//      (every save once, at its receipt position, in order); an ID list and a sweep per sampled account; the settled
//      changes, notices and ledgers of every publishing account against the W0 oracle (act7/stream.ts);
//   5. counts per account and the gateway's per-account structures (class histogram of the read gateway).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, DatomicHttpError, DatomicTransportError, sweepPageWaiting, listIdsPage } from "../../../../packages/datomic/dist/index.js";
import { assertionValue } from "../../../../packages/datomic/dist/rows.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { sha } from "../scale1/decision/plan.ts";
import { command } from "../w1/group/workload.ts";
import { facts, formId, roster, subjectId, summary, statuses, type Account } from "./population.ts";

const [out, writeUrl, readUrl, prefix] = process.argv.slice(2);
assert(out && writeUrl && readUrl && prefix);
fs.mkdirSync(out, { recursive: true });
const env = (k: string, d: number) => Number(process.env[k] ?? d);
const SEED = process.env.DX_SCALE2_SEED ?? "mini-1";
const DEEP = env("DX_SCALE2_DEEP", 10), DEEP_PEOPLE = env("DX_SCALE2_DEEP_PEOPLE", 8);
const PUBLISH = env("DX_SCALE2_PUBLISH", 50), PUBLISH_MAX = env("DX_SCALE2_PUBLISH_MAX", 12);
const THIN = env("DX_SCALE2_THIN", 2000);
const WINDOW_S = env("DX_SCALE2_WINDOW_S", 40), RATE = env("DX_SCALE2_RATE", 40), BUSY_RATE = env("DX_SCALE2_BUSY_RATE", 15);
const QUIET_RATE = env("DX_SCALE2_QUIET_RATE", 2), INFLIGHT = env("DX_SCALE2_INFLIGHT", 12), READERS = env("DX_SCALE2_READERS", 6);
const SAMPLE = env("DX_SCALE2_SAMPLE", 40);
const VALID_AT = 1_800_000_000_000;
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line.length > 2000 ? line.slice(0, 2000) + "..." : line);
  fs.appendFileSync(path.join(out, "mini.jsonl"), line + "\n");
};
const now = () => performance.now();
// Open TCP sockets of this process (to the gateways), for the per-account inventory.
const sockets = () => {
  try { return execFileSync("lsof", ["-a", "-n", "-P", "-p", String(process.pid), "-i", "TCP"], { encoding: "utf8" }).split("\n")
    .filter((l) => l.includes("ESTABLISHED")).length; } catch { return null; }
};
const q = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)]! * 100) / 100;
};
const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8", maxBuffer: 64 << 20 });

// Resident memory of this stack's containers (docker stats), for the idle cost of accounts (diagnostic on the Mac).
function containerMemory() {
  try {
    const text = docker("stats", "--no-stream", "--format", "{{.Name}} {{.MemUsage}}");
    return Object.fromEntries(text.split("\n").filter((l) => l.startsWith(prefix + "-")).map((l) => {
      const [n, use] = l.split(" ");
      const m = /^([0-9.]+)([KMG]i?B)/.exec(use ?? "");
      const scale: Record<string, number> = { KiB: 1 / 1024, MiB: 1, GiB: 1024, kB: 1 / 1000, MB: 1, GB: 1000 };
      return [n!.slice(prefix!.length + 1), m ? Math.round(Number(m[1]) * (scale[m[2]!] ?? 1)) : null];
    }));
  } catch (e) { return { error: String((e as Error).message).slice(0, 120) }; }
}
// The read gateway's sweep gates (accounts holding one), from its scan statistics (the image has no jcmd).
async function gates() {
  try { return ((await (await fetch(readUrl + "/v2/admin/scan-stats")).json()) as any).sweepGates ?? null; } catch { return null; }
}
async function scanStats(url: string) {
  try { return ((await (await fetch(url + "/v2/admin/scan-stats")).json()) as any).routes ?? null; } catch { return null; }
}
// ---------------------------------------------------------------------------------------------------------------
// The oracle: for every (entity, attribute) its versions in position order; a version holds every value of the
// attribute from its position on, each with the position it was recorded at. A read at position P sees, per attribute,
// the last version at or before P. A save replaces the attributes it writes with one value at its receipt position.
type Version = { position: number; values: { v: string; p: number }[] };
const oracle = new Map<string, Map<string, Version[]>>();
const norm = (v: { type: string; value: unknown }) =>
  v.type + ":" + (typeof v.value === "object" ? JSON.stringify(v.value) : String(v.value));
function seedOracle(rows: { e: string; a: string; v: { type: string; value: unknown } }[], position: number) {
  for (const f of rows) {
    const m = oracle.get(f.e) ?? new Map<string, Version[]>();
    oracle.set(f.e, m);
    const vs = m.get(f.a) ?? [];
    if (vs.length && vs.at(-1)!.position === position) vs.at(-1)!.values.push({ v: norm(f.v), p: position });
    else vs.push({ position, values: [{ v: norm(f.v), p: position }] });
    m.set(f.a, vs);
  }
}
function oracleAt(entity: string, position: number) {
  const out: string[] = [];
  for (const [a, vs] of oracle.get(entity) ?? []) {
    let pick: Version | undefined;
    for (const v of vs) if (v.position <= position) pick = v;
    if (pick) for (const value of pick.values) out.push(entity + "|" + a + "|" + value.v + "|" + value.p);
  }
  return out.sort();
}
const rowKey = (r: any) => r.entity_id + "|" + r.attribute + "|" + norm(assertionValue(r) as any) + "|" + r.recorded_position;

// ---------------------------------------------------------------------------------------------------------------
// DX_SCALE2_ADOPT=READY_JSON (the server test): the database is an existing one brought up by demo/server-up.sh (the
// sealed 1 billion copy, ten deep accounts of 100,000 subjects). Its deep accounts are not loaded; the oracle learns a
// deep subject's root and form from one read at the run's start position the first time the run touches it (this
// runner is the only writer during the run, so that state holds at every later position until its own first save).
const ADOPT = process.env.DX_SCALE2_ADOPT;
const ready = ADOPT ? JSON.parse(fs.readFileSync(ADOPT, "utf8")) : undefined;
const accounts = roster({ seed: SEED, deep: DEEP, deepPeople: ready ? env("DX_SCALE2_ADOPT_DEEP_PEOPLE", 100_000) : DEEP_PEOPLE,
  publish: PUBLISH, publishMax: PUBLISH_MAX, thin: THIN, offset: env("DX_SCALE2_INDEX_OFFSET", 0) });
const busy = accounts[0]!; // the busy deep account
const quiet = accounts.find((a) => a.kind === "thin")!; // the quiet thin account
log("roster", { seed: SEED, ...summary(accounts), busy: busy.key, quiet: quiet.key, quietPeople: quiet.people });

const adoptedName = ready ? (String(ready.scope).startsWith("[") ? JSON.parse(ready.scope)[3] : String(ready.scope)) : undefined;
const name: string = adoptedName ?? "dx-scale-decision-" + randomUUID() + "-0";
assert(/^dx-scale-decision-[0-9a-f-]+-0$/.test(name), "the held settlement needs a SCALE1-named scope: " + name);
const scopeKey = String(runtimeApi.DatabaseScope.test(name));
const writer = new DatomicClient(writeUrl, 600_000);
const reader = new DatomicClient(readUrl, 600_000);
const created = await writer.create(scopeKey, "lean", true, 35_000);
assert(created.strictRecordClocks && created.created === !ready);
if (ready) assert.equal(created.db, ready.database, "the ready file names another database");
const db = created.db;
// A commit whose reply was lost or timed out (503 OutcomeUnknown, a transport error) is resolved as the product resolves
// a lost acknowledgement: ask the writer whether the operation committed; if it is absent after a wait, send it again
// (a second copy of a committed operation is refused as a duplicate, and the lookup then finds the first).
const resolutions = { unknown: 0, committed: 0, resent: 0 };
async function transactSure(input: any): Promise<number> {
  for (let attempt = 0; ; attempt++) {
    try {
      const ack: any = await writer.transact(db, input);
      return Number(ack.position.v);
    } catch (e) {
      const uncertain = e instanceof DatomicTransportError || (e instanceof DatomicHttpError &&
        (e.code === "OutcomeUnknown" || /DUPLICATE|AlreadyCommitted/i.test(String(e.code) + String(e.message))));
      if (!uncertain || attempt >= 6) throw e;
      resolutions.unknown++;
      // The commit's first new row, if it is in the store, carries the commit's position (a load commit has no claim
      // for the operation lookup to find).
      const first = input.rows?.[0];
      const landed = async () => {
        if (!first) return undefined;
        const rows = await writer.rows(db, { entityIds: [first.entity_id] }).catch(() => [] as any[]);
        const r = rows.find((x: any) => x.id === first.id);
        return r ? Number(r.recorded_position) : undefined;
      };
      for (let k = 0; k < 40; k++) {
        await sleep(500);
        const o = await writer.operation(db, input.operationId).catch(() => undefined);
        if (o?.status === "committed") { resolutions.committed++; return Number(o.position!.v); }
        const p = await landed();
        if (p !== undefined) { resolutions.committed++; return p; }
        if (o?.status === "absent" && k >= 6) break;
      }
      resolutions.resent++;
    }
  }
}
const head = async (c = writer) => (await c.begin(db).then(async (b) => { await c.release(db, b.handle); return b.position; }));
log("scope", { name, db });

// Positions of every subject's seed commit, per account (the held oracle wants them for the publishing accounts).
const seedPos = new Map<string, number[]>();
// Per-account counters.
type Counts = { loadCommits: number; loadFacts: number; saves: number; saveRows: number; acked: number; refused: number;
  pinnedReads: number; currentReads: number; readRowsCompared: number; feedEntries: number; finalRows: number };
const counts = new Map<string, Counts>(accounts.map((a) => [a.key, { loadCommits: 0, loadFacts: 0, saves: 0, saveRows: 0, acked: 0,
  refused: 0, pinnedReads: 0, currentReads: 0, readRowsCompared: 0, feedEntries: 0, finalRows: 0 }]));
const C = (a: Account) => counts.get(a.key)!;

// ---- 1. Load ----------------------------------------------------------------------------------------------------
async function pool<T>(items: T[], depth: number, f: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: depth }, async () => { while (i < items.length) await f(items[i++]!); }));
}
const memoryBeforeLoad = containerMemory();
const loadStarted = now();
const chunks: { a: Account; first: number; end: number }[] = [];
for (const a of accounts) {
  if (ready && a.kind === "deep") continue; // the sealed database's own accounts
  let first = 0, rows = 0;
  for (let i = 0; i < a.people; i++) {
    const n = facts(a, i).length;
    if (rows && rows + n > env("DX_SCALE2_LOAD_ROWS", 600)) { chunks.push({ a, first, end: i }); first = i; rows = 0; }
    rows += n;
  }
  chunks.push({ a, first, end: a.people });
}
await pool(chunks, env("DX_SCALE2_LOAD_DEPTH", 4), async ({ a, first, end }) => {
  const rows = Array.from({ length: end - first }, (_, k) => facts(a, first + k)).flat();
  const id = "scale2/load/" + a.key + "/" + first;
  const input = { ...command(id, rows as never, [], false), groupAccount: a.key };
  const p = await transactSure(input);
  const pos = seedPos.get(a.key) ?? Array<number>(a.people).fill(0);
  for (let i = first; i < end; i++) pos[i] = p;
  seedPos.set(a.key, pos);
  C(a).loadCommits++;
  C(a).loadFacts += rows.length;
});
const loadedHead = await head();
// [adopt] A deep subject of the sealed database, learnt once at the run's start position (see ADOPT above).
const learning = new Map<string, Promise<void>>();
// Every other subject's oracle is regenerated from the generator at its load position the first time it is needed,
// so the runner holds only the subjects it touched (the 100,000-account rung would not fit otherwise).
const touched = new Set<string>();
function ensureOracle(a: Account, i: number) {
  const root = subjectId(a, i);
  if (oracle.has(root)) return Promise.resolve();
  if (!ready || a.kind !== "deep") {
    seedOracle(facts(a, i), seedPos.get(a.key)![i]!);
    return Promise.resolve();
  }
  let p = learning.get(root);
  if (!p) {
    p = (async () => {
      const ents = [root, formId(a, i)];
      const rows = await writer.rows(db, { entityIds: ents, basis: { recordedPosition: loadedHead, validAt: VALID_AT } });
      assert(rows.some((r) => r.entity_id === root), "no subject " + root + " in the adopted database");
      for (const e of ents) oracle.set(e, new Map());
      for (const r of rows) {
        const m = oracle.get(r.entity_id)!;
        const vs = m.get(r.attribute) ?? [{ position: loadedHead, values: [] }];
        vs[0]!.values.push({ v: norm(assertionValue(r) as any), p: Number(r.recorded_position) });
        m.set(r.attribute, vs);
      }
    })();
    learning.set(root, p);
  }
  return p;
}
const THIN_SHARE = process.env.DX_SCALE2_THIN_SHARE === undefined ? undefined : Number(process.env.DX_SCALE2_THIN_SHARE);
await writer.request("POST", `/v2/db/${db}/request-index`, { waitMs: 600_000 });
const memoryAfterLoad = containerMemory();
log("load", { memoryBeforeLoad, memoryAfterLoad, commits: chunks.length, facts: [...counts.values()].reduce((n, c) => n + c.loadFacts, 0), head: loadedHead,
  ms: Math.round(now() - loadStarted) });

// ---- 2. Publishing accounts ---------------------------------------------------------------------------------------
const allPublishers = accounts.filter((a) => a.kind === "publish");
// DX_SCALE2_LATE=N: the last N publishing accounts enrol during the live window, while every other account saves and
// settles (they take no saves themselves, so their oracle is their load). Without TX2_ENROL_BESIDE_SAVES=1 their
// enrolment is expected to be refused by the enrolment's own writer check; the run records it and goes on.
const LATE = env("DX_SCALE2_LATE", 0);
const lateAccounts = new Set(allPublishers.slice(allPublishers.length - LATE).map((a) => a.key));
const publishers = allPublishers.filter((a) => !lateAccounts.has(a.key));
// DX_SCALE2_LIVE_PUBLISH=N: the last N enrolled publishing accounts publish their large release DURING the window,
// beside every other account's saves and settlement (they take no saves themselves), instead of before it.
const LIVE_PUBLISH = env("DX_SCALE2_LIVE_PUBLISH", 0);
const livePublishers = new Set(publishers.slice(publishers.length - LIVE_PUBLISH).map((a) => a.key));
const doPublish = publishers.length > 0 && process.env.DX_SCALE2_PUBLISH_PHASE !== "0";
type Pub = { a: Account; store: any; joined: any; roster: string[]; releases: any[]; target?: number; enrolMs: number;
  enrolCommits: number; enrolBytes: number; publishBytes: number; publishMs: number };
const pubs: Pub[] = [];
let enrolAccount!: (a: Account) => Promise<Pub>;
let W0: any, settleModule: any, BulkQueueCls: any, worldAt: any, streamCheck: any, largeRelease: any, parseShape: any, canonical: any,
  sha256: any;
if (doPublish) {
  ({ W0, canonical, sha256 } = await import("../../../bench/lib/w0-world.ts"));
  const { openStore } = await import("../actv-lazy/store.ts");
  const { JoinedAccount } = await import("../actv-lazy/join/account.ts");
  settleModule = await import("../actv-lazy/join/settlement.ts");
  ({ BulkQueue: BulkQueueCls } = await import("../actv-lazy/join/bulk.ts"));
  ({ expected: worldAt } = await import("../actv-lazy/join/held-campaign.ts"));
  ({ streamCheck } = await import("../actv-lazy/act7/stream.ts"));
  ({ largeRelease, parseShape } = await import("../actv-lazy/join/large-release.ts"));
  const validTime = W0.POPULATION_VALID_TIME;
  const heapBefore = (globalThis.gc?.(), process.memoryUsage().heapUsed);
  const socketsBefore = sockets();
  // DX_SCALE2_HEAP=1: heap snapshots before and after enrolment (scale2/heap-diff.ts names what each account holds).
  const v8 = await import("node:v8");
  if (process.env.DX_SCALE2_HEAP === "1") v8.writeHeapSnapshot(path.join(out, "enrol-before.heapsnapshot"));
  const heapCurve: { accounts: number; heap: number }[] = [];
  enrolAccount = async (a: Account): Promise<Pub> => {
    const started = now(), before = await head();
    const descriptor = { account: a.key, prefix: "acct/" + a.key + "/", people: a.people, cut: loadedHead,
      seal: sha256(canonical(["scale2", SEED, a.key])), namespace: true,
      // The held ledger's writer check is replaced here by the oracle checks of section 4 (no ledger in this runner).
      verifyThrough: async () => {}, committed: () => {} };
    const store = await openStore(name, "act2-deep", "write", descriptor);
    const joined = new JoinedAccount(store);
    await joined.installHeld(validTime);
    const p = await joined.publish("scale2:" + SEED + ":" + a.key + ":R1", W0.R1.doc, validTime, "owed");
    const seq = await sequenceAt(joined, p.position);
    const w = await settleModule.Settlement.open(joined, new BulkQueueCls(1));
    try { await w.settle(seq); } finally { await w.close(); }
    const after = await head();
    return { a, store, joined, roster: Array.from({ length: a.people }, (_, i) => W0.placementId(i)),
      releases: [{ seq, position: p.position, doc: W0.R1.doc, old: null }], enrolMs: now() - started,
      enrolCommits: after - before, enrolBytes: 0, publishBytes: 0, publishMs: 0 };
  };
  for (const a of publishers) {
    pubs.push(await enrolAccount(a));
    if (pubs.length % 10 === 0) heapCurve.push({ accounts: pubs.length, heap: (globalThis.gc?.(), process.memoryUsage().heapUsed) });
  }
  if (process.env.DX_SCALE2_HEAP === "1") v8.writeHeapSnapshot(path.join(out, "enrol-after.heapsnapshot"));
  const heapAfter = (globalThis.gc?.(), process.memoryUsage().heapUsed);
  log("enrolled", { accounts: pubs.length, commitsPerAccount: pubs.map((x) => x.enrolCommits),
    msPerAccount: { p50: q(pubs.map((x) => x.enrolMs), 0.5), max: q(pubs.map((x) => x.enrolMs), 1) },
    heapBytesPerAccount: Math.round((heapAfter - heapBefore) / pubs.length), heapCurve, gcExposed: Boolean(globalThis.gc),
    socketsBefore, socketsAfter: sockets(), sharedAgent: process.env.TRIPLEX_DATOMIC_SHARED_AGENT === "1" });
  const shape = parseShape("forms=20,policies=20,permille=1000");
  for (const x of pubs) {
    if (livePublishers.has(x.a.key)) continue;
    const doc = largeRelease(W0.R1.doc, shape);
    const started = now();
    const p = await x.joined.publish("scale2:" + SEED + ":" + x.a.key + ":large", doc, validTime, "owed");
    x.publishMs = now() - started;
    x.publishBytes = x.store.counters.lastOps.bytes;
    const seq = await sequenceAt(x.joined, p.position);
    x.releases.push({ seq, position: p.position, doc, old: W0.R1.doc });
    x.target = seq;
  }
  log("published", { accounts: pubs.length, publishBytes: pubs[0]?.publishBytes, publishMs: { p50: q(pubs.map((x) => x.publishMs), 0.5),
    max: q(pubs.map((x) => x.publishMs), 1) } });
}
async function sequenceAt(a: any, position: number) {
  for (let i = 0; i < 2000; i++) {
    const t = await a.notices.observe();
    if (t.at >= position) { assert.equal(t.at, position, "another Publish followed"); return t.value.sequence; }
    await sleep(5);
  }
  throw new Error("The notice tail never reached the Publish at " + position);
}

// ---- 3. The live window --------------------------------------------------------------------------------------------
type Save = { id: string; a: Account; i: number; rows: number; due: number; sent?: number; acked?: number; position?: number;
  status?: "acked" | "refused"; quiet: boolean; busy: boolean; alone: boolean };
const saves: Save[] = [];
const locks = new Map<string, Promise<void>>();
const lastReceipt = new Map<string, number>(); // subject -> position of its last acknowledged save (or seed)
const receipts: number[] = [];
async function withSubject<T>(key: string, f: () => Promise<T>) {
  const prev = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const mine = new Promise<void>((r) => (release = r));
  locks.set(key, prev.then(() => mine));
  await prev;
  try { return await f(); } finally { release(); if (locks.get(key) === mine) locks.delete(key); }
}
const accountWeights = accounts.map((a) => a.people);
const totalPeople = accountWeights.reduce((n, x) => n + x, 0);
let saveSeq = 0;
const deepAccounts = accounts.filter((a) => a.kind === "deep"), smallAccounts = accounts.filter((a) => a.kind !== "deep");
const weighted = (xs: Account[], rnd: () => number) => {
  let u = rnd() * xs.reduce((n, a) => n + a.people, 0);
  for (const a of xs) { if ((u -= a.people) < 0) return a; }
  return xs.at(-1)!;
};
// Accounts weighted by their size; with DX_SCALE2_THIN_SHARE the small accounts (thin and publishing) together get
// that share of the spread saves and reads.
function pickAccount(rnd: () => number) {
  if (THIN_SHARE === undefined) {
    let u = rnd() * totalPeople;
    for (const a of accounts) { if ((u -= a.people) < 0) return a; }
    return accounts.at(-1)!;
  }
  return rnd() < THIN_SHARE ? weighted(smallAccounts, rnd) : weighted(deepAccounts, rnd);
}
async function doSave(s: Save) {
  const key = s.a.key + "/" + s.i;
  await ensureOracle(s.a, s.i);
  touched.add(subjectId(s.a, s.i));
  await withSubject(key, async () => {
    const root = subjectId(s.a, s.i), form = formId(s.a, s.i);
    const prior = await writer.rows(db, { entityIds: [root, form] });
    const fields = prior.filter((r) => r.entity_id === form && /^:task\/field-\d+$/.test(r.attribute))
      .sort((x, y) => Number(x.attribute.split("-").at(-1)) - Number(y.attribute.split("-").at(-1)));
    const width = s.a.kind === "thin" ? 1 + (saveSeq % fields.length) : Math.min(fields.length, 5 + (saveSeq % 13));
    const old = fields.slice(0, width);
    const newFacts: any[] = old.map((r, n) => ({ e: form, a: r.attribute, v: { type: "string", value: sha([s.id, n]).slice(0, 57) } }));
    if (s.a.kind === "thin" && saveSeq % 3 === 0) {
      const st = prior.find((r) => r.entity_id === root && r.attribute === ":person/status")!;
      old.push(st);
      newFacts.push({ e: root, a: ":person/status", v: { type: "string", value: statuses[saveSeq % 3]! } });
    }
    saveSeq++;
    s.rows = newFacts.length;
    const input = { ...command(s.id, newFacts, old as never, true), live: old.map((r) => r.id), groupAccount: s.a.key,
      writeClass: "live" as const };
    s.sent = now();
    try {
      s.position = await transactSure(input);
      s.acked = now();
      s.status = "acked";
      // Oracle: retire the old versions of the changed attributes, add the new ones, at the receipt position.
      for (const f of newFacts) {
        const m = oracle.get(f.e)!;
        const vs = m.get(f.a)!;
        vs.push({ position: s.position, values: [{ v: norm(f.v), p: s.position }] });
      }
      lastReceipt.set(key, s.position);
      receipts.push(s.position);
      C(s.a).acked++;
      C(s.a).saveRows += newFacts.length;
    } catch (e) {
      s.status = "refused";
      C(s.a).refused++;
      log("save-refused", { id: s.id, account: s.a.key, error: String((e as Error).message).slice(0, 300) });
    }
  });
}
function plan(seconds: number, label: string, opts: { spread: boolean; busy: boolean; quiet: boolean; alone?: boolean }) {
  let seed = 0;
  for (const ch of label) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  let st = seed || 1;
  const rnd = () => { st ^= st << 13; st ^= st >>> 17; st ^= st << 5; st >>>= 0; return st / 4294967296; };
  const out: Save[] = [];
  const recent: { a: Account; i: number }[] = [];
  const add = (rate: number, choose: () => { a: Account; i: number }, flags: { quiet: boolean; busy: boolean }) => {
    for (let t = -Math.log(1 - rnd()) / rate; t < seconds; t += -Math.log(1 - rnd()) / rate) {
      const x = choose();
      out.push({ id: "scale2/save/" + label + "/" + out.length, a: x.a, i: x.i, rows: 0, due: t * 1000, ...flags,
        alone: Boolean(opts.alone) });
    }
  };
  if (opts.spread) add(RATE, () => {
    // About 40% of saves revisit a subject saved recently (the production study's 39% within 10 s), the rest are any
    // subject of any account, accounts weighted by their size.
    if (recent.length && rnd() < 0.4) return recent[Math.floor(rnd() * recent.length)]!;
    let a = pickAccount(rnd);
    while (lateAccounts.has(a.key) || livePublishers.has(a.key)) a = pickAccount(rnd);
    const x = { a, i: Math.floor(rnd() * a.people) };
    recent.push(x);
    if (recent.length > 50) recent.shift();
    return x;
  }, { quiet: false, busy: false });
  if (opts.busy) add(BUSY_RATE, () => ({ a: busy, i: Math.floor(rnd() * busy.people) }), { quiet: false, busy: true });
  if (opts.quiet) add(QUIET_RATE, () => ({ a: quiet, i: Math.floor(rnd() * quiet.people) }), { quiet: true, busy: false });
  return out.sort((x, y) => x.due - y.due);
}
async function play(tape: Save[], until: () => boolean = () => false) {
  const begun = now();
  let inflight = 0;
  const all: Promise<void>[] = [];
  for (const s of tape) {
    const wait = begun + s.due - now();
    if (wait > 0) await sleep(wait);
    if (until()) break;
    while (inflight >= INFLIGHT) await sleep(1);
    inflight++;
    saves.push(s);
    C(s.a).saves++;
    all.push(doSave(s).finally(() => inflight--));
  }
  await Promise.all(all);
}

// Readers: pinned (a recent receipt position, any subject) and current (a subject with no save in flight, at least its
// last receipt). Every answer is compared with the oracle; any difference stops the run.
let reading = false;
const readStats = { pinned: 0, current: 0, rows: 0, pinnedMs: [] as number[], currentMs: [] as number[] };
async function readerLoop(n: number) {
  let st = 0x9e3779b9 ^ (n * 7919);
  const rnd = () => { st ^= st << 13; st ^= st >>> 17; st ^= st << 5; st >>>= 0; return st / 4294967296; };
  while (reading) {
    const a = pickAccount(rnd), i = Math.floor(rnd() * a.people);
    const ents = [subjectId(a, i), formId(a, i)];
    await ensureOracle(a, i);
    if (rnd() < 0.5 && receipts.length) {
      const P = receipts[Math.max(0, receipts.length - 1 - Math.floor(rnd() * 200))]!;
      const t0 = now();
      const rows = await reader.rows(db, { entityIds: ents, basis: { recordedPosition: P, validAt: VALID_AT } });
      readStats.pinnedMs.push(now() - t0);
      const got = rows.map(rowKey).sort(), want = ents.flatMap((e) => oracleAt(e, P)).sort();
      assert.deepEqual(got, want, "pinned read differs: " + ents[0] + " at " + P);
      readStats.pinned++; readStats.rows += got.length; C(a).pinnedReads++; C(a).readRowsCompared += got.length;
    } else {
      const key = a.key + "/" + i;
      await withSubject(key, async () => {
        const at = lastReceipt.get(key) ?? seedPos.get(a.key)?.[i] ?? loadedHead;
        const t0 = now();
        const rows = await reader.rows(db, { entityIds: ents, atLeastPosition: at, basis: { validAt: VALID_AT } });
        readStats.currentMs.push(now() - t0);
        const got = rows.map(rowKey).sort(), want = ents.flatMap((e) => oracleAt(e, Number.MAX_SAFE_INTEGER)).sort();
        assert.deepEqual(got, want, "current read differs: " + ents[0]);
        readStats.current++; readStats.rows += got.length; C(a).currentReads++; C(a).readRowsCompared += got.length;
      });
    }
  }
}

// Feed follower on the read gateway: every commit in position order; lag from a save's acknowledgement to the follower
// seeing its position (diagnostic).
let following = false;
const feedPages = { pages: 0, transactions: 0, ms: 0, maxMs: 0 };
const feedTrace: object[] = [];
let windowStart = now();
const feedSeen = new Map<number, { at: number; command?: string; entities: string[] }>();
async function feedLoop(from: number) {
  let after = from;
  while (following || after < (receipts.length ? Math.max(...receipts.slice(-50)) : 0)) {
    const t0 = now();
    const page = await reader.request<{ transactions: [string, number, string[]][] }>("POST", `/v2/db/${db}/transactions`,
      { after, limit: 256 });
    const took = now() - t0;
    feedPages.pages++; feedPages.transactions += page.transactions.length; feedPages.ms += took;
    feedPages.maxMs = Math.max(feedPages.maxMs, took);
    if (feedPages.pages % 20 === 1 && feedTrace.length < 80) feedTrace.push({ after, n: page.transactions.length, last: page.transactions.at(-1)?.[1] ?? null,
      maxReceipt: receipts.length ? Math.max(...receipts.slice(-200)) : null, ms: Math.round(took), t: Math.round(now() - windowStart) });
    if (!page.transactions.length) { await sleep(20); if (!following) break; continue; }
    for (const [, position, encoded] of page.transactions) {
      assert.equal(position, after + 1, "feed gap at " + (after + 1));
      after = position;
      const rows = encoded.map(decodeRowText);
      if (!feedSeen.has(position)) feedSeen.set(position, { at: now(), command: rows.find((r: any) => r.attribute === ":_tx/command-id")?.value_string ?? undefined,
        entities: rows.filter((r: any) => r.attribute === ":_tx/changed-entity").map((r: any) => r.value_string ?? r.value_ref) });
    }
  }
  return after;
}

// Quiet account alone first (its own baseline), then the window.
const aloneTape = plan(10, "alone", { spread: false, busy: false, quiet: true, alone: true });
await play(aloneTape);
const settleStart = await head();
const tape = plan(WINDOW_S, "window", { spread: true, busy: true, quiet: true });
reading = true; following = true;
const readers = Array.from({ length: READERS }, (_, n) => readerLoop(n));
const feed = feedLoop(settleStart);
let settled: { key: string; ms: number }[] = [];
let queue: any;
const windowBegun = now();
windowStart = windowBegun;
const settling = doPublish ? (async () => {
  queue = new BulkQueueCls(1);
  const heapBefore = (globalThis.gc?.(), process.memoryUsage().heapUsed);
  const socketsBefore = sockets();
  const settlingPubs = pubs.filter((x) => x.target !== undefined);
  const workers = await Promise.all(settlingPubs.map((x) => settleModule.Settlement.open(x.joined, queue, false, "bytes", "progress")));
  const heapAfter = (globalThis.gc?.(), process.memoryUsage().heapUsed);
  log("settlement-open", { accounts: workers.length, heapBytesPerAccount: Math.round((heapAfter - heapBefore) / workers.length),
    socketsBefore, socketsAfter: sockets() });
  await Promise.all(workers.map(async (w: any, j: number) => {
    await w.settle(settlingPubs[j]!.target);
    settled.push({ key: settlingPubs[j]!.a.key, ms: now() - windowBegun });
  }));
  return workers;
})() : Promise.resolve([] as any[]);
// Late enrolment beside the saves (DX_SCALE2_LATE).
const late: { account: string; ok: boolean; error?: string; pub?: Pub }[] = [];
const lateTask = doPublish && LATE ? (async () => {
  await sleep(2000);
  for (const a of allPublishers.filter((x) => lateAccounts.has(x.key))) {
    try { late.push({ account: a.key, ok: true, pub: await enrolAccount(a) }); }
    catch (e) { late.push({ account: a.key, ok: false, error: String((e as Error).message).slice(0, 300) }); }
  }
})() : Promise.resolve();
// Publish beside the saves (DX_SCALE2_LIVE_PUBLISH): each attempt and its outcome.
const livePublish: { account: string; ok: boolean; ms: number; error?: string }[] = [];
const livePublishTask = doPublish && LIVE_PUBLISH ? (async () => {
  await sleep(3000);
  for (const x of pubs.filter((p) => livePublishers.has(p.a.key))) {
    const started = now();
    try {
      const doc = largeRelease(W0.R1.doc, parseShape("forms=20,policies=20,permille=1000"));
      const p = await x.joined.publish("scale2:" + SEED + ":" + x.a.key + ":live", doc, W0.POPULATION_VALID_TIME, "owed");
      const seq = await sequenceAt(x.joined, p.position);
      x.releases.push({ seq, position: p.position, doc, old: W0.R1.doc });
      x.target = seq;
      livePublish.push({ account: x.a.key, ok: true, ms: Math.round(now() - started) });
    } catch (e) {
      livePublish.push({ account: x.a.key, ok: false, ms: Math.round(now() - started), error: String((e as Error).message).slice(0, 200) });
    }
  }
})() : Promise.resolve();
await play(tape);
await lateTask;
await livePublishTask;
log("live-publish", { accounts: livePublish });
log("late-enrolment", { option: process.env.TX2_ENROL_BESIDE_SAVES === "1", accounts: late.map(({ account, ok, error, pub }) =>
  ({ account, ok, error, enrolCommits: pub?.enrolCommits, enrolMs: pub ? Math.round(pub.enrolMs) : undefined })) });
const workers = await settling;
reading = false;
await Promise.all(readers);
following = false;
const finalHead = await head();
await feedLoop(settleStart).catch(() => undefined);
await feed;
log("window", { saves: saves.length, acked: saves.filter((s) => s.status === "acked").length,
  refused: saves.filter((s) => s.status === "refused").length, finalHead, ms: Math.round(now() - windowBegun),
  settledMs: { first: settled.length ? Math.round(Math.min(...settled.map((x) => x.ms))) : null,
    last: settled.length ? Math.round(Math.max(...settled.map((x) => x.ms))) : null }, feedPages });
assert.equal(saves.filter((s) => s.status !== "acked").length, 0, "a save was not acknowledged");

// Accounts whose Publish landed during the window settle now (quietly), so section 4d checks them as the others.
const liveWorkers: any[] = [];
for (const x of pubs.filter((p) => livePublishers.has(p.a.key) && p.target !== undefined)) {
  const w = await settleModule.Settlement.open(x.joined, new BulkQueueCls(1), false, "bytes", "progress");
  await w.settle(x.target);
  liveWorkers.push({ x, w });
}
// ---- 4. Checks, one account at a time -------------------------------------------------------------------------------
// 4a. Every subject's root and form at the final head (pinned), against the oracle.
const checkStarted = now();
for (const a of accounts) {
  // [adopt] Deep accounts of the sealed database: the subjects this run touched (the oracle knows no others).
  const ents = (ready && a.kind === "deep"
    ? Array.from({ length: a.people }, (_, i) => i).filter((i) => oracle.has(subjectId(a, i)))
    : Array.from({ length: a.people }, (_, i) => i)).flatMap((i) => [subjectId(a, i), formId(a, i)]);
  for (let k = 0; k < ents.length; k += 128) {
    const part = ents.slice(k, k + 128);
    for (let j = 0; j < part.length; j += 2) {
      const i = Number(part[j]!.split(":").at(-1));
      await ensureOracle(a, i);
    }
    const rows = await reader.rows(db, { entityIds: part, basis: { recordedPosition: finalHead, validAt: VALID_AT } });
    const got = rows.map(rowKey).sort(), want = part.flatMap((e) => oracleAt(e, finalHead)).sort();
    assert.deepEqual(got, want, "final read differs in " + a.key);
    C(a).finalRows += got.length;
    // Untouched subjects leave the oracle again (it is regenerated if needed).
    if (!(ready && a.kind === "deep"))
      for (let j = 0; j < part.length; j += 2) if (!touched.has(part[j]!)) { for (const e of facts(a, Number(part[j]!.split(":").at(-1))).map((f) => f.e)) oracle.delete(e); }
  }
}
log("final-reads", { accounts: accounts.length, rows: [...counts.values()].reduce((n, c) => n + c.finalRows, 0),
  ms: Math.round(now() - checkStarted) });

// 4b. The feed: every acknowledged save once, at its receipt position, naming its subject's entities.
const byPosition = new Map<number, Save>();
for (const s of saves) if (s.position !== undefined) byPosition.set(s.position, s);
let feedChecked = 0, lags: number[] = [], quietLags: number[] = [];
for (const s of saves) {
  if (s.position === undefined || s.alone) continue;
  const f = feedSeen.get(s.position);
  assert(f, "save missing from the feed: " + s.id);
  assert.equal(f.command, s.id, "feed position " + s.position + " carries another command");
  assert(f.entities.includes(formId(s.a, s.i)), "feed entry lacks the form of " + s.id);
  C(s.a).feedEntries++;
  feedChecked++;
  lags.push(Math.max(0, f.at - s.acked!));
  if (s.quiet) quietLags.push(Math.max(0, f.at - s.acked!));
}
const perSubjectOrder = new Map<string, number>();
for (const [p] of [...feedSeen].sort((x, y) => x[0] - y[0])) {
  const s = byPosition.get(p);
  if (!s) continue;
  const k = s.a.key + "/" + s.i, last = perSubjectOrder.get(k) ?? 0;
  assert(p > last);
  perSubjectOrder.set(k, p);
}
log("feed", { trace: feedTrace, checked: feedChecked, positionsSeen: feedSeen.size, lagMs: { p50: q(lags, 0.5), p99: q(lags, 0.99) },
  quietLagMs: { p50: q(quietLags, 0.5), p99: q(quietLags, 0.99) } });

// 4c. ID lists and sweeps per sampled account: the smallest and largest thin accounts, every deep account, some
// publishing accounts, and a spread of the rest.
const thinSorted = accounts.filter((a) => a.kind === "thin").sort((x, y) => x.people - y.people);
const sampled = [...new Map([...accounts.filter((a) => a.kind === "deep"), ...thinSorted.slice(0, 5), ...thinSorted.slice(-5),
  ...publishers.slice(0, 5), ...accounts.filter((_, j) => j % Math.max(1, Math.floor(accounts.length / SAMPLE)) === 0)]
  .map((a) => [a.key, a])).values()];
const idRows: object[] = [], sweepRows: object[] = [];
const beforeSweeps = await gates();
const S = (value: string) => ({ type: "string", value });
for (const a of sampled) {
  // ID list: every subject of the account at the final head, pages of 1,000, against the generator.
  const want = Array.from({ length: a.people }, (_, i) => subjectId(a, i)).sort();
  let next: string | null = null, got: string[] = [], pages = 0, examined = 0, scanMicros = 0;
  let first: any;
  do {
    const page: any = await listIdsPage(reader, db, next ? { account: a.key, prefix: "pl:", shape: "pl:{8 digits}", limit: 1000, cursor: next }
      : { account: a.key, prefix: "pl:", shape: "pl:{8 digits}", limit: 1000, basis: { recordedPosition: finalHead } } as never);
    first ??= { examined: page.examined, segmentsLoaded: page.segmentsLoaded, ioReads: page.ioReads, scanMicros: page.scanMicros };
    got.push(...page.ids); pages++; examined += page.examined; scanMicros += page.scanMicros ?? 0;
    next = page.next;
  } while (next);
  assert.deepEqual(got.map((x) => "acct/" + a.key + "/" + x.replace(/^acct\/[^/]+\//, "")).sort(), want, "ID list differs in " + a.key);
  idRows.push({ account: a.key, kind: a.kind, people: a.people, ids: got.length, pages, examined, scanMicros, first });
  // Sweep: thin accounts count subjects whose status is pending; deep-shaped ones count subjects with a member fact.
  // [adopt] Not on the sealed deep accounts (a 100,000-subject sweep is XQ6's server run, 2 to 4 minutes each).
  if (ready && a.kind === "deep") continue;
  const where = a.kind === "thin" ? [{ attribute: ":person/status", op: "eq", value: S("pending") }]
    : [{ attribute: ":subject/member", op: "exists" }];
  let cursor: string | null = null, count = 0, sweepPages = 0, sexamined = 0, cpu = 0;
  do {
    const page: any = await sweepPageWaiting(reader, db, cursor ? { account: a.key, from: { prefix: "pl:", shape: "pl:{8 digits}" }, where,
      result: "count", bounds: { subjects: 64, ms: 2000 }, cursor } as never
      : { account: a.key, from: { prefix: "pl:", shape: "pl:{8 digits}" }, where, result: "count", bounds: { subjects: 64, ms: 2000 },
        basis: { recordedPosition: finalHead, validAt: VALID_AT } } as never);
    sweepPages++; sexamined += page.examined; cpu += page.cpuMicros ?? 0; count = page.count; cursor = page.next;
  } while (cursor);
  if (a.kind === "thin") for (let i = 0; i < a.people; i++) await ensureOracle(a, i);
  const wantCount = a.kind === "thin"
    ? Array.from({ length: a.people }, (_, i) => oracleAt(subjectId(a, i), finalHead).some((k) => k.includes("|:person/status|string:pending|"))).filter(Boolean).length
    : a.people;
  assert.equal(count, wantCount, "sweep count differs in " + a.key);
  sweepRows.push({ account: a.key, kind: a.kind, people: a.people, count, pages: sweepPages, examined: sexamined, cpuMicros: cpu });
}
const afterSweeps = await gates();
log("ids-and-sweeps", { sampled: sampled.length, beforeSweeps, afterSweeps, ids: idRows, sweeps: sweepRows });

// 4d. Publishing accounts: the settled release of every account against the W0 oracle, one account at a time.
const settlement: object[] = [];
if (doPublish) {
  const validTime = W0.POPULATION_VALID_TIME;
  const checkList: { x: Pub; w: any }[] = [...workers.map((w: any, j: number) => ({ x: (pubs.filter((p) => p.target !== undefined && !livePublishers.has(p.a.key)))[j]!, w })), ...liveWorkers];
  for (const { x, w } of checkList) {
    const positions = seedPos.get(x.a.key)!;
    const checked = await streamCheck({ worker: w, roster: x.roster, releases: x.releases, target: x.target,
      world: (at: number) => (i: number) => worldAt(i, at, new Map(), positions), workers: 1, validTime, reads: () => true });
    assert(checked.independent, "the release under test adds forms");
    settlement.push({ account: x.a.key, people: x.a.people, values: w.archive.contest.summary(), notices: w.recorder.archive.contest.summary(),
      turns: queue?.turnsByKey.get(w.archive.turnKey()) ?? null, live: livePublishers.has(x.a.key), checked: { ...checked, noticesByRelease: undefined },
      enrolCommits: x.enrolCommits, publishBytes: x.publishBytes, publishMs: Math.round(x.publishMs), enrolMs: Math.round(x.enrolMs) });
  }
  for (const { w } of checkList) await w.close();
  for (const l of late) {
    if (!l.pub) continue;
    const x = l.pub;
    const w = await settleModule.Settlement.open(x.joined, new BulkQueueCls(1));
    try {
      const checked = await streamCheck({ worker: w, roster: x.roster, releases: x.releases, target: x.releases[0].seq,
        world: (at: number) => (i: number) => worldAt(i, at, new Map(), seedPos.get(x.a.key)!), workers: 1, validTime, reads: () => true });
      settlement.push({ account: x.a.key, people: x.a.people, late: true, checked: { ...checked, noticesByRelease: undefined },
        enrolCommits: x.enrolCommits, enrolMs: Math.round(x.enrolMs) });
    } finally { await w.close(); }
  }
  log("settlement", { accounts: settlement.length, late: settlement.filter((s: any) => s.late).map((s: any) => ({ account: s.account,
    changes: s.checked.changes, notices: s.checked.notices })), perAccount: settlement.filter((s: any) => !s.late).map((s: any) => ({ account: s.account, people: s.people,
    valueFrames: s.values.committed, noticeFrames: s.notices.committed, refused: s.values.refused + s.notices.refused,
    changes: s.checked.changes, notices: s.checked.notices })) });
}

// ---- 5. Per-account structures in the read gateway and the summary ----------------------------------------------------
const quietAlone = saves.filter((s) => s.alone).map((s) => s.acked! - s.sent!);
const quietLoaded = saves.filter((s) => s.quiet && !s.alone).map((s) => s.acked! - s.sent!);
const busyLoaded = saves.filter((s) => s.busy).map((s) => s.acked! - s.sent!);
const spread = saves.filter((s) => !s.busy && !s.quiet).map((s) => s.acked! - s.sent!);
const touchedAccounts = new Set(saves.filter((s) => !s.alone).map((s) => s.a.key));
const result = {
  seed: SEED, db, name, scopeKey, prefix, roster: summary(accounts), loadedHead, finalHead,
  resolutions, memory: { beforeLoad: memoryBeforeLoad, afterLoad: memoryAfterLoad, afterWindow: containerMemory() },
  saves: { total: saves.length, accountsTouched: touchedAccounts.size, spreadMs: { p50: q(spread, 0.5), p99: q(spread, 0.99) },
    busyMs: { n: busyLoaded.length, p50: q(busyLoaded, 0.5), p99: q(busyLoaded, 0.99) },
    quietAloneMs: { n: quietAlone.length, p50: q(quietAlone, 0.5), p99: q(quietAlone, 0.99) },
    quietLoadedMs: { n: quietLoaded.length, p50: q(quietLoaded, 0.5), p99: q(quietLoaded, 0.99) } },
  reads: { pinned: readStats.pinned, current: readStats.current, rowsCompared: readStats.rows,
    pinnedMs: { p50: q(readStats.pinnedMs, 0.5), p99: q(readStats.pinnedMs, 0.99) },
    currentMs: { p50: q(readStats.currentMs, 0.5), p99: q(readStats.currentMs, 0.99) } },
  feed: { checked: feedChecked, lagMs: { p50: q(lags, 0.5), p99: q(lags, 0.99) } },
  ids: idRows, sweeps: sweepRows, settlement,
  livePublish,
  late: late.map(({ account, ok, error, pub }) => ({ account, ok, error, enrolCommits: pub?.enrolCommits })),
  sweepGates: { beforeSweeps, afterSweeps, sweptAccounts: sweepRows.length },
  routes: { write: await scanStats(writeUrl), read: await scanStats(readUrl) }, feedPages,
  perAccount: Object.fromEntries(counts),
};
fs.writeFileSync(path.join(out, "result.json"), JSON.stringify(result, null, 1) + "\n");
log("PASS", { accounts: accounts.length, saves: saves.length, touched: touchedAccounts.size });
writer.close();
reader.close();
process.exit(0);
