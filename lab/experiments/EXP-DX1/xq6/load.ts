// [DX-XQ6] Two toy measurements for the exact sweep (counts exact, every time diagnostic: Mac, lab VM, shared):
//  1. Cost per 1,000 subjects swept: storage reads (PostgreSQL index scans of Datomic's table, net of the idle
//     baseline, as xq3/counts.ts counts them), Datomic io-stats segment loads, rows read, reader CPU, for uncached
//     subjects (read gateway restarted) and cached ones (the same sweep repeated), at the head and at an old position.
//  2. The other readers: 256 pinned readers of random subjects, alone and beside one and four sweeps: per read, the
//     rows returned (must equal the alone arm subject for subject), read permits taken (exactly one per read: sweeps take
//     none), the gateway's entity-cache hits and misses, the read queue's peak; latency diagnostic.
//   bash lab/experiments/EXP-DX1/xq6/gate.sh "$PWD" NEW_OUT_DIR load.ts   (under one ordinary heavy token)
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
const [out, writeUrl, readUrl, prefix] = process.argv.slice(2);
assert(out && writeUrl && readUrl && prefix?.startsWith("tx2-dxxq6"));
fs.mkdirSync(out, { recursive: true });
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "load.jsonl"), line + "\n");
};
const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8" });
const BIG = Number(process.env["DX_XQ6_BIG"] ?? 4000);
const SMALL = Number(process.env["DX_XQ6_SMALL"] ?? 600);
const ARM_S = Number(process.env["DX_XQ6_ARM_SECONDS"] ?? 20);
const READERS = Number(process.env["DX_XQ6_READERS"] ?? 256);
const pad = (n: number) => String(n).padStart(8, "0");
const sid = (acct: string, i: number) => `acct/${acct}/pl:${pad(i)}`;
const ACCTS = ["account-007", "account-008", "account-009", "account-010"];

const scope = runtimeApi.DatabaseScope.test(`xq6-load-${process.pid}`);
const writer = new datomic.DatomicClient(writeUrl, 600_000);
let reader = new datomic.DatomicClient(readUrl, 600_000);
const { db } = await writer.create(scope, "lean");
const rt = ManagedRuntime.make(runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
}).layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const transact = (ops: object[]) => rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact(ops, { actor: "xq6-load" })));
const S = (v: string) => ({ type: "string", value: v });
// Twelve facts per subject, about the loader's subject-root width.
const subjectOps = (acct: string, i: number, round: number) => [
  ["name", S(`name ${i}`)], ["status", S(["pending", "complete", "requires_action"][(i + round) % 3]!)], ["score", { type: "integer", value: String(i % 97) }],
  ["rating", { type: "number", value: (i % 13) / 13 }], ["active", { type: "boolean", value: i % 2 === 0 }], ["joined", { type: "datetime", value: 1.7e12 + i * 1000 }],
  ["city", S(`city ${i % 40}`)], ["team", S(`team ${i % 9}`)], ["level", { type: "integer", value: String(i % 5) }],
  ["note", S(`note ${i} ${"x".repeat(40)}`)], ["employer", { type: "ref", value: `acct/${acct}/em:${i % 20}` }], ["round", { type: "integer", value: String(round) }],
].map(([attr, value]) => ({ op: "assert", entityId: sid(acct, i), entityType: "Subject", attribute: `:person/${attr}`, value, validFrom: 0 }));
const t0 = performance.now();
for (const [ai, acct] of ACCTS.entries()) {
  const n = ai === 0 ? BIG : SMALL;
  for (let i = 0; i < n; i += 100) await transact(Array.from({ length: Math.min(100, n - i) }, (_, k) => subjectOps(acct, i + k, 0)).flat());
}
const OLD = Number((await writer.basis(db)).position.v);
// A second round on a third of the big account's subjects, so an old position differs from the head.
for (let i = 0; i < BIG; i += 300) await transact(Array.from({ length: Math.min(100, Math.ceil((BIG - i) / 3)) }, (_, k) => i + k * 3).filter((j) => j < BIG)
  .flatMap((j) => subjectOps("account-007", j, 1).filter((op: any) => op.attribute === ":person/status" || op.attribute === ":person/round")));
const HEAD = Number((await writer.basis(db)).position.v);
await writer.request("POST", `/v2/db/${db}/request-index`, { waitMs: 600000 });
log("seed", { BIG, SMALL, OLD, HEAD, seedMs: Math.round(performance.now() - t0) });

const health = async () => {
  for (let i = 0; i < 180; i++) {
    try { if ((await fetch(`${readUrl}/health`, { signal: AbortSignal.timeout(2000) })).ok) return; } catch {}
    await new Promise((s) => setTimeout(s, 1000));
  }
  throw new Error("read gateway did not come back");
};
const restartReader = async () => {
  reader.close();
  docker("restart", `${prefix}-gw-r`);
  await health();
  reader = new datomic.DatomicClient(readUrl, 600_000);
  await reader.basis(db, { position: HEAD, waitMs: 2000 }); // the peer opens the database (not a sweep)
};
const pgGets = () => Number(docker("exec", `${prefix}-pg`, "psql", "-U", "postgres", "-d", "datomic", "-Atc",
  "select coalesce(sum(idx_scan),0)+coalesce(sum(seq_scan),0) from pg_stat_user_tables where relname='datomic_kvs'").trim());
const settle = async () => { await new Promise((s) => setTimeout(s, 11_000)); return pgGets(); };

// ---- 1. Cost ----
const question = { account: "account-007", from: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [{ attribute: ":person/status", op: "eq", value: S("pending") }] };
const sweepWhole = async (position: number) => {
  let next: string | null = null, pages = 0;
  const sum = { examined: 0, rows: 0, cpuMicros: 0, readMicros: 0, listMicros: 0, evalMicros: 0, totalMicros: 0, segmentsLoaded: 0, count: 0, listed: 0 };
  const startedAt = performance.now();
  do {
    const page: any = await datomic.sweepPageWaiting(reader, db, next ? { ...question, result: "count", bounds: { subjects: 10000, ms: 2000 }, cursor: next }
      : { ...question, result: "count", bounds: { subjects: 10000, ms: 2000 }, basis: { recordedPosition: position, validAt: 1.8e12 } });
    pages++; next = page.next;
    sum.examined += page.examined; sum.rows += page.rows; sum.cpuMicros += page.cpuMicros; sum.readMicros += page.micros.read;
    sum.listMicros += page.micros.list; sum.evalMicros += page.micros.evaluate; sum.totalMicros += page.micros.total;
    sum.segmentsLoaded += page.segmentsLoaded; sum.count = page.count; sum.listed += page.listed;
  } while (next);
  return { pages, ...sum, clientMs: Math.round(performance.now() - startedAt) };
};
const idleA = process.env["DX_XQ6_COST"] === "0" ? 0 : await settle(), idleB = process.env["DX_XQ6_COST"] === "0" ? 0 : await settle();
const idle = idleB - idleA;
log("idle-baseline", { storageGetsIn11s: idle });
const cost: any[] = [];
for (const [where, position] of (process.env["DX_XQ6_COST"] === "0" ? [] : [["head", HEAD], ["old", OLD]]) as [string, number][]) {
  await restartReader();
  for (const temperature of ["uncached", "cached"]) {
    const before = await settle();
    const r = await sweepWhole(position);
    const gets = (await settle()) - before - idle;
    const per = (x: number) => Math.round((x / r.examined) * 1000 * 100) / 100;
    const row = { where, position, temperature, ...r, storageGets: gets,
      per1000: { storageGets: per(gets), rows: per(r.rows), cpuSeconds: per(r.cpuMicros) / 1e6, readSeconds: per(r.readMicros) / 1e6, gatewaySeconds: per(r.totalMicros) / 1e6, segmentsLoaded: per(r.segmentsLoaded) } };
    log("cost", row);
    cost.push(row);
  }
}

// ---- 2. The other readers ----
const P = HEAD, V = 1.8e12;
const rowsFor = new Map<string, number>();
const subjects = ACCTS.flatMap((acct, ai) => Array.from({ length: ai === 0 ? BIG : SMALL }, (_, i) => sid(acct, i)));
const pick = () => subjects[Math.floor(Math.random() * subjects.length)]!;
const sweeper = async (acct: string, stop: () => boolean, tally: { pages: number; subjects: number; busy: number }) => {
  while (!stop()) {
    let next: string | null = null;
    do {
      const r: any = { account: acct, from: { prefix: "pl:", shape: "pl:{8 digits}" }, where: question.where, result: "count", bounds: { subjects: 256, ms: 200 } };
      const page: any = await datomic.sweepPageWaiting(reader, db, next ? { ...r, cursor: next } : { ...r, basis: { recordedPosition: P, validAt: V } });
      tally.pages++; tally.subjects += page.examined; tally.busy += page.busyRetries; next = page.next;
    } while (next && !stop());
  }
};
const numeric = (x: any) => Object.fromEntries(Object.entries(x ?? {}).filter(([, v]) => typeof v === "number")) as Record<string, number>;
const delta = (a: Record<string, number>, b: Record<string, number>) => Object.fromEntries(Object.keys(b).map((k) => [k, b[k]! - (a[k] ?? 0)]));
const arms: any[] = [];
for (const sweeps of (process.env["DX_XQ6_ARMS"] ?? "0,1,4,0").split(",").map(Number)) {
  await reader.request("POST", "/v2/admin/threads/reset", {});
  const s0 = await reader.request("GET", "/v2/admin/scan-stats"), th0 = await reader.request("GET", "/v2/admin/threads");
  let stopped = false;
  const deadline = performance.now() + ARM_S * 1000;
  const tally = { pages: 0, subjects: 0, busy: 0 };
  const sweepers = Array.from({ length: sweeps }, (_, k) => sweeper(ACCTS[k % ACCTS.length]!, () => stopped, tally));
  const lat: number[] = [];
  let reads = 0, rows = 0, mismatched = 0, firstSeen = 0;
  await Promise.all(Array.from({ length: READERS }, async () => {
    while (performance.now() < deadline) {
      const id = pick();
      const startedAt = performance.now();
      const got = await reader.rows(db, { entityIds: [id], basis: { recordedPosition: P, validAt: V } });
      lat.push(performance.now() - startedAt);
      reads++; rows += got.length;
      const seen = rowsFor.get(id);
      if (seen === undefined) { rowsFor.set(id, got.length); firstSeen++; } else if (seen !== got.length) mismatched++;
    }
  }));
  stopped = true;
  await Promise.all(sweepers);
  const s1 = await reader.request("GET", "/v2/admin/scan-stats"), th1 = await reader.request("GET", "/v2/admin/threads");
  lat.sort((x, y) => x - y);
  const q = (f: number) => Math.round(lat[Math.min(lat.length - 1, Math.floor(f * lat.length))]! * 10) / 10;
  const cache = delta(numeric(s0.entityCache), numeric(s1.entityCache));
  const sweepStats = delta(numeric(s0.sweep), numeric(s1.sweep));
  const readsAdmitted = th1.readsAdmitted - th0.readsAdmitted;
  const arm = { sweeps, seconds: ARM_S, readers: READERS, reads, rowsPerRead: rows / reads, mismatchedRowCounts: mismatched, firstSeen,
    readsAdmitted, readPermitsPerRead: readsAdmitted / reads, readsWaitingPeak: th1.readsWaitingPeak, readsRefusedBusy: th1.readsRefusedBusy - th0.readsRefusedBusy,
    cacheHitsPerRead: (cache["hits"] ?? 0) / reads, cacheMissesPerRead: (cache["misses"] ?? 0) / reads,
    revisionMissesPerRead: (cache["revisionMisses"] ?? 0) / reads,
    sweepPages: tally.pages, sweepSubjects: tally.subjects, sweepBusyRetries: tally.busy, gatewaySweep: sweepStats,
    readsPerSecond: Math.round(reads / ARM_S), p50ms: q(0.5), p99ms: q(0.99) };
  log("arm", arm);
  arms.push(arm);
}
fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ db, BIG, SMALL, OLD, HEAD, idle, cost, arms }, null, 2));
await rt.dispose();
await writer.delete(scope);
writer.close(); reader.close();
log("done");
