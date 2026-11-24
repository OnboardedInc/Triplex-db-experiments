// [DX-XQ3] Scan counts for the design's section 9 item 4 (the ID route): entries examined and storage reads per page
// of 100 and 1,000 IDs on a toy whose account spans many index segments, cold (read gateway restarted) and warm, at the
// head and at an old pinned position. Counts are exact; times are diagnostic (Mac, lab VM).
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq3/counts.ts OUT WRITE_URL READ_URL PREFIX
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
assert(out && writeUrl && readUrl && prefix?.startsWith("tx2-dx"));
fs.mkdirSync(out, { recursive: true });
const docker = (...args: string[]) =>
  execFileSync("docker", args, { env: { ...process.env, DOCKER_HOST: `unix://${process.env["HOME"]}/.colima/triplex2/docker.sock` }, encoding: "utf8" });
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "counts.jsonl"), line + "\n");
};
const SUBJECTS = Number(process.env["DX_XQ3_COUNT_SUBJECTS"] ?? 100000);
const scope = runtimeApi.DatabaseScope.test(`xq3-counts-${process.pid}`);
const writer = new datomic.DatomicClient(writeUrl, 600_000);
let reader = new datomic.DatomicClient(readUrl, 600_000);
const { db } = await writer.create(scope, "lean");
const definition = runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
});
const rt = ManagedRuntime.make(definition.layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const commit = (i: number) =>
  rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact([{ op: "assert", entityId: `acct/account-007/zz:${i}`, entityType: "Marker", attribute: ":marker/n", value: { type: "string", value: String(i) }, validFrom: 0 }])));
const seed = (env: Record<string, string>) => {
  const uri = `datomic:sql://${db}?jdbc:postgresql://${prefix}-pg:5432/datomic?user=datomic&password=datomic`;
  const args = ["run", "--rm", "--pull", "never", "--name", `${prefix}-seed`, "--network", `${prefix}-net`, "--memory", "1500m", "--memory-swap", "1500m",
    "-e", "DATOMIC_JAVA_OPTS=-Xms256m -Xmx1g", "-e", `XQ3_URI=${uri}`,
    ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
    "-v", `${import.meta.dirname}:/xq3:ro`, "--entrypoint", "/opt/datomic/bin/run", "tx2-datomic:1.0.7745-da00", "-i", "/xq3/seed-ids.clj"];
  const result = docker(...args);
  log("seed", { env, result: result.trim().split("\n").at(-1) });
};
const p1 = await commit(1);
seed({ XQ3_ACCOUNT: "account-007", XQ3_FROM: "0", XQ3_COUNT: String(SUBJECTS), XQ3_PLACEMENTS: "2" });
seed({ XQ3_ACCOUNT: "account-008", XQ3_FROM: "0", XQ3_COUNT: String(SUBJECTS), XQ3_PLACEMENTS: "2" });
const p2 = await commit(2);
// Interleave: a later placement for every subject, so a page at p2 walks past IDs its view must filter out.
seed({ XQ3_ACCOUNT: "account-007", XQ3_FROM: "0", XQ3_COUNT: String(SUBJECTS), XQ3_PLACEMENTS: "1", XQ3_TAG: "q" });
const p3 = await commit(3);
await writer.request("POST", `/v2/db/${db}/request-index`, { waitMs: 600000 });
log("positions", { p1: p1.position, p2: p2.position, head: p3.position });

const restartReader = async () => {
  reader.close();
  docker("restart", `${prefix}-gw-r`);
  for (let i = 0; i < 180; i++) {
    try {
      const r = await fetch(`${readUrl}/health`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) break;
    } catch {}
    await new Promise((s) => setTimeout(s, 1000));
  }
  reader = new datomic.DatomicClient(readUrl, 600_000);
  await reader.basis(db); // the peer opens the database (one basis read; not an ID list)
};
// Storage reads, counted where they happen: PostgreSQL's index scans of Datomic's one table (each segment get is one
// SELECT by id). Statistics reach pg_stat after the reading backend goes idle (at most 10 s), so each count is the
// difference of two readings 11 s apart around the page, with the same quiet interval measured alone as a baseline.
// Datomic's io-stats attributed no read to the ID walk on this peer (counts-1 and counts-2), hence this counter.
const pgGets = () => Number(docker("exec", `${prefix}-pg`, "psql", "-U", "postgres", "-d", "datomic", "-Atc",
  "select coalesce(sum(idx_scan),0)+coalesce(sum(seq_scan),0) from pg_stat_user_tables where relname='datomic_kvs'").trim());
const settle = async () => { await new Promise((s) => setTimeout(s, 11_000)); return pgGets(); };
const measured = process.env["DX_XQ3_STORAGE_GETS"] === "1";
const measure = async (label: string, request: any) => {
  const before = measured ? await settle() : NaN;
  const t0 = performance.now();
  const page = await reader.listIds(db, request);
  const clientMs = performance.now() - t0;
  const storageGets = measured ? (await settle()) - before : undefined;
  const row = { label, storageGets, position: page.position, returned: page.ids?.length ?? page.count, examined: page.examined,
    segmentsLoaded: page.segmentsLoaded, ioReads: page.ioReads, scanMicros: page.scanMicros, clientMs: Math.round(clientMs * 10) / 10, stopped: page.stopped };
  log("page", row);
  return page;
};
const big = { bounds: { entries: 1000000, ms: 1000, segments: 4096 } };
if (measured) { const a = await settle(); const b = await settle(); log("idle-baseline", { storageGetsIn11s: b - a }); }
for (const [where, basis] of [["head", undefined], ["old", { recordedPosition: p2.position }]] as const) {
  for (const limit of [100, 1000]) {
    await restartReader();
    const request = { account: "account-007", prefix: "pl:", limit, ...(basis ? { basis } : {}), ...big };
    await measure(`${where} cold first page ${limit}`, request);
    await measure(`${where} warm first page ${limit}`, request);
    const deep = { account: "account-007", prefix: "pl:", limit, after: `acct/account-007/pl:${String(Math.floor(SUBJECTS / 2)).padStart(8, "0")}`, ...(basis ? { basis } : {}), ...big };
    await measure(`${where} cold-ish middle page ${limit}`, deep);
    if (!measured) {
      await measure(`${where} warm middle page ${limit}`, deep);
      await measure(`${where} warm shape page ${limit}`, { ...request, shape: "pl:{8 digits}" });
    }
  }
  await restartReader();
  for (const temperature of ["cold", "warm"]) {
    const before = measured ? await settle() : NaN;
    let next: string | null = null, pages = 0, examined = 0, segments = 0, micros = 0, count = 0;
    const t0 = performance.now();
    do {
      const page: any = await reader.listIds(db, next ? { account: "account-007", prefix: "pl:", result: "count", ...big, cursor: next }
        : { account: "account-007", prefix: "pl:", result: "count", ...big, ...(basis ? { basis } : {}) });
      pages++; examined += page.examined; segments += page.segmentsLoaded; micros += page.scanMicros; count = page.count; next = page.next;
    } while (next);
    const clientMs = performance.now() - t0;
    log("count", { where, temperature, pages, count, examined, segmentsLoaded: segments, scanMs: micros / 1000, clientMs,
      ...(measured ? { storageGets: (await settle()) - before } : {}) });
  }
}
// G5 at a size where one request takes long enough to overlap: the time bound, and a burst of eight full counts of one
// account with one of another account beside them (default: one permit, one request per account).
await restartReader();
const timed: any = await reader.listIds(db, { account: "account-007", prefix: "", result: "count", bounds: { entries: 1000000, ms: 5, segments: 4096 } });
log("time-bound", { stopped: timed.stopped, examined: timed.examined, scanMicros: timed.scanMicros, withinBoundPlus10ms: timed.scanMicros <= 15000 });
const full = (account: string) => reader.listIds(db, { account, prefix: "", result: "count", bounds: { entries: 1000000, ms: 1000, segments: 4096 } }).then((x: any) => ({ count: x.count, stopped: x.stopped, scanMicros: x.scanMicros }), (e: any) => ({ code: e?.code ?? String(e) }));
const burst = await Promise.all([...Array.from({ length: 8 }, () => full("account-007")), full("account-008")]);
const afterBurst: any = await reader.listIds(db, { account: "account-008", prefix: "", result: "count", bounds: { entries: 1000000, ms: 1000, segments: 4096 } });
const scanStats: any = await reader.request("GET", "/v2/admin/scan-stats");
log("burst", { burst, afterBurst: { count: afterBurst.count, stopped: afterBurst.stopped }, idLists: scanStats.idLists });
await rt.dispose();
await writer.delete(scope);
writer.close();
reader.close();
log("done");
