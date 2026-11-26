// [DX-XQ7] Gate (b): does a sweep on the question reader leave the main reader's cache alone? On a toy stack of this
// checkout (xq7/gate.sh: the main reader and the question reader each with a 32 MB object cache, per-read io counters
// on both), 256 pinned readers re-read a fixed set of subjects on the main reader in 20 s windows: alone, beside one
// and four sweeps on the question reader, alone, beside one and four sweeps on the main reader, alone. Per window, from
// the main reader's own counters (Datomic io-stats summed over every read by entity): reads, object cache hits,
// segments read from storage (`sql`) and loads per index; the sweeps' pages on each gateway (which reader served them); every
// pinned read's row count against its first read. PostgreSQL's index scans of Datomic's table are recorded too (they
// sum every peer). Counts are results; times are diagnostic.
//   bash lab/experiments/EXP-DX1/xq7/gate.sh "$PWD" NEW_OUT_DIR cache.ts   (under one ordinary heavy token)
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
const [out, writeUrl, readUrl, questionUrl, prefix] = process.argv.slice(2);
assert(out && writeUrl && readUrl && questionUrl && prefix?.startsWith("tx2-dxxq7"));
fs.mkdirSync(out, { recursive: true });
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "cache.jsonl"), line + "\n");
};
const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8" });
const HOT = Number(process.env["DX_XQ7_HOT"] ?? 300);
const BIG = Number(process.env["DX_XQ7_BIG"] ?? 4000);
const ARM_S = Number(process.env["DX_XQ7_ARM_SECONDS"] ?? 20);
const READERS = Number(process.env["DX_XQ7_READERS"] ?? 256);
const pad = (n: number) => String(n).padStart(8, "0");
const sid = (acct: string, i: number) => `acct/${acct}/pl:${pad(i)}`;
const HOT_ACCTS = ["account-001", "account-002"];
const SWEEP_ACCTS = ["account-007", "account-008", "account-009", "account-010"];

const scope = runtimeApi.DatabaseScope.test(`xq7-cache-${process.pid}`);
const writer = new datomic.DatomicClient(writeUrl, 600_000);
const reader = new datomic.DatomicClient(readUrl, 600_000);
const qreader = new datomic.DatomicClient(questionUrl, 600_000);
const { db } = await writer.create(scope, "lean");
const rt = ManagedRuntime.make(runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
}).layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const transact = (ops: object[]) => rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact(ops, { actor: "xq7-cache" })));
const S = (v: string) => ({ type: "string", value: v });
// Twelve facts per subject (the sweep builder's load.ts shape).
const subjectOps = (acct: string, i: number) => [
  ["name", S(`name ${i}`)], ["status", S(["pending", "complete", "requires_action"][i % 3]!)], ["score", { type: "integer", value: String(i % 97) }],
  ["rating", { type: "number", value: (i % 13) / 13 }], ["active", { type: "boolean", value: i % 2 === 0 }], ["joined", { type: "datetime", value: 1.7e12 + i * 1000 }],
  ["city", S(`city ${i % 40}`)], ["team", S(`team ${i % 9}`)], ["level", { type: "integer", value: String(i % 5) }],
  ["note", S(`note ${i} ${"x".repeat(40)}`)], ["employer", { type: "ref", value: `acct/${acct}/em:${i % 20}` }], ["round", { type: "integer", value: "0" }],
].map(([attr, value]) => ({ op: "assert", entityId: sid(acct, i), entityType: "Subject", attribute: `:person/${attr}`, value, validFrom: 0 }));
const t0 = performance.now();
for (const acct of [...HOT_ACCTS, ...SWEEP_ACCTS]) {
  const n = HOT_ACCTS.includes(acct) ? HOT : BIG;
  for (let i = 0; i < n; i += 100) await transact(Array.from({ length: Math.min(100, n - i) }, (_, k) => subjectOps(acct, i + k)).flat());
}
const P = Number((await writer.basis(db)).position.v), V = 1.8e12;
await writer.request("POST", `/v2/db/${db}/request-index`, { waitMs: 600000 });
for (const c of [reader, qreader]) await c.basis(db, { position: P, waitMs: 2000 });
log("seed", { HOT, BIG, P, seedMs: Math.round(performance.now() - t0) });

const pgGets = () => Number(docker("exec", `${prefix}-pg`, "psql", "-U", "postgres", "-d", "datomic", "-Atc",
  "select coalesce(sum(idx_scan),0)+coalesce(sum(seq_scan),0) from pg_stat_user_tables where relname='datomic_kvs'").trim());
const hot = HOT_ACCTS.flatMap((acct) => Array.from({ length: HOT }, (_, i) => sid(acct, i)));
const rowsFor = new Map<string, number>();
const where = [{ attribute: ":person/status", op: "eq", value: S("pending") }];
const sweeper = async (client: any, acct: string, stop: () => boolean, tally: { pages: number; subjects: number; busy: number; counts: number[] }) => {
  while (!stop()) {
    let next: string | null = null;
    do {
      const r: any = { account: acct, from: { prefix: "pl:", shape: "pl:{8 digits}" }, where, result: "count", bounds: { subjects: 256, ms: 200 } };
      const page: any = await datomic.sweepPageWaiting(client, db, next ? { ...r, cursor: next } : { ...r, basis: { recordedPosition: P, validAt: V } });
      tally.pages++; tally.subjects += page.examined; tally.busy += page.busyRetries; next = page.next;
      if (!next) tally.counts.push(page.count);
    } while (next && !stop());
  }
};
const stats = async (client: any) => (await client.request("GET", "/v2/admin/scan-stats")) as any;
const numeric = (x: any) => Object.fromEntries(Object.entries(x ?? {}).filter(([, v]) => typeof v === "number")) as Record<string, number>;
const delta = (a: Record<string, number>, b: Record<string, number>) => Object.fromEntries(Object.keys(b).map((k) => [k, b[k]! - (a[k] ?? 0)]));
const arms: any[] = [];
const plan = (process.env["DX_XQ7_ARMS"] ?? "warm:0,control:0,question:1,question:4,control:0,main:1,main:4,control:0").split(",").map((x) => x.split(":") as [string, string]);
for (const [where_, n] of plan) {
  const sweeps = Number(n);
  const s0 = await stats(reader), q0 = await stats(qreader), g0 = pgGets();
  let stopped = false;
  const deadline = performance.now() + ARM_S * 1000;
  const tally = { pages: 0, subjects: 0, busy: 0, counts: [] as number[] };
  const client = where_ === "main" ? reader : qreader;
  const sweepers = Array.from({ length: sweeps }, (_, k) => sweeper(client, SWEEP_ACCTS[k % SWEEP_ACCTS.length]!, () => stopped, tally));
  const lat: number[] = [];
  let reads = 0, rows = 0, mismatched = 0;
  await Promise.all(Array.from({ length: READERS }, async () => {
    while (performance.now() < deadline) {
      const id = hot[Math.floor(Math.random() * hot.length)]!;
      const startedAt = performance.now();
      const got = await reader.rows(db, { entityIds: [id], basis: { recordedPosition: P, validAt: V } });
      lat.push(performance.now() - startedAt);
      reads++; rows += got.length;
      const seen = rowsFor.get(id);
      if (seen === undefined) rowsFor.set(id, got.length); else if (seen !== got.length) mismatched++;
    }
  }));
  stopped = true;
  await Promise.all(sweepers);
  const s1 = await stats(reader), q1 = await stats(qreader), g1 = pgGets();
  const io = delta(numeric(s0.readIo), numeric(s1.readIo));
  const ioReads = io["reads"] ?? 0;
  const per = (k: string) => Math.round(((io[k] ?? 0) / Math.max(1, ioReads)) * 10000) / 10000;
  lat.sort((x, y) => x - y);
  const q = (f: number) => Math.round(lat[Math.min(lat.length - 1, Math.floor(f * lat.length))]! * 10) / 10;
  const loadKeys = Object.keys(io).filter((k) => k.endsWith("-load"));
  const arm = {
    arm: where_, sweeps, seconds: ARM_S, readers: READERS, reads, ioReads, rowsPerRead: rows / reads, mismatchedRowCounts: mismatched,
    // Datomic 1.0.7745's io-stats name a segment read from storage `sql` (with `sql-ms`), a decode `deserialize`.
    mainReader: { objectCacheHits: io["ocache"] ?? 0, storageReads: io["sql"] ?? 0, loads: Object.fromEntries(loadKeys.map((k) => [k, io[k]])),
      ocachePerRead: per("ocache"), storageReadsPerRead: per("sql"), loadsPerRead: Math.round((loadKeys.reduce((n, k) => n + io[k]!, 0) / Math.max(1, ioReads)) * 10000) / 10000,
      io },
    sweepPagesOnMain: (s1.sweep?.requests ?? 0) - (s0.sweep?.requests ?? 0), sweepPagesOnQuestionReader: (q1.sweep?.requests ?? 0) - (q0.sweep?.requests ?? 0),
    subjectsSwept: tally.subjects, sweepsCompleted: tally.counts.length, sweepCounts: [...new Set(tally.counts)], sweepBusyRetries: tally.busy,
    postgresGetsAllPeers: g1 - g0, readsPerSecondDiagnostic: Math.round(reads / ARM_S), p50msDiagnostic: q(0.5), p99msDiagnostic: q(0.99),
  };
  log("arm", arm);
  arms.push(arm);
}
// The verdicts, from counts only.
const by = (name: string) => arms.filter((a) => a.arm === name && a.sweeps > 0);
const controls = arms.filter((a) => a.arm === "control");
const maxControl = Math.max(...controls.map((a) => a.mainReader.storageReadsPerRead));
const verdict = {
  controlsStorageReadsPerRead: controls.map((a) => a.mainReader.storageReadsPerRead),
  questionArmsStorageReadsPerRead: by("question").map((a) => a.mainReader.storageReadsPerRead),
  mainArmsStorageReadsPerRead: by("main").map((a) => a.mainReader.storageReadsPerRead),
  questionArmsSweptOnlyThere: by("question").every((a) => a.sweepPagesOnMain === 0 && a.sweepPagesOnQuestionReader > 0),
  mainArmsSweptOnlyThere: by("main").every((a) => a.sweepPagesOnQuestionReader === 0 && a.sweepPagesOnMain > 0),
  questionArmsUnchanged: by("question").every((a) => a.mainReader.storageReadsPerRead <= maxControl),
  mainArmsDisplaced: by("main").every((a) => a.mainReader.storageReadsPerRead > maxControl),
  rowCountsStable: arms.every((a) => a.mismatchedRowCounts === 0),
  // Every sweep account holds BIG subjects of which every third is "pending": each completed sweep counts ceil(BIG/3).
  sweepCountsAllExact: arms.flatMap((a) => a.sweepCounts).every((c) => c === Math.ceil(BIG / 3)),
  sweepsCompleted: arms.reduce((n, a) => n + a.sweepsCompleted, 0),
};
log("verdict", verdict);
fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ db, HOT, BIG, P, arms, verdict }, null, 2));
await rt.dispose();
await writer.delete(scope);
writer.close(); reader.close(); qreader.close();
process.exitCode = verdict.questionArmsSweptOnlyThere && verdict.mainArmsSweptOnlyThere && verdict.questionArmsUnchanged && verdict.rowCountsStable && verdict.sweepCountsAllExact ? 0 : 1;
log("done", { exitCode: process.exitCode });
