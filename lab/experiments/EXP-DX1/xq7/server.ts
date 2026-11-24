// [DX-XQ7] Server run for the question reader on the sealed 1 billion database (QUESTION-READER.md section 6 has the
// command, its duration and the predictions, written before any run). The sweep builder's arm B (xq6/server.ts) twice
// on one stack: 256 pinned readers re-reading a fixed set of subjects of other accounts at position 87,002 on the main
// reader, a save loop of one commit per subject's save (17 facts, 23 saves/s) on account-005, and an exact count of
// account-003's 100,000 subjects (one part, then three parts at once), first on the main reader, then on the question
// reader. Every window records the main reader's own io-stats counters (object cache hits, storage reads, loads per
// pinned read: DX_READ_IO_COUNTERS=1), which gateway served the sweep pages, and the readers' and saves' latencies.
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq7/server.ts READY_FILE NEW_OUT [QUESTION_URL]
// The stack: demo/server-up.sh with DEMO_QUESTION_READER=1 (demo/server/profile.mjs) and the sweep options (section 6).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer, ManagedRuntime } from "effect";

const REPO = path.resolve(import.meta.dirname, "../../../..");
const dist = (pkg: string, file: string) => pathToFileURL(path.join(REPO, "packages", pkg, "dist", file)).href;
const core: any = await import(dist("core", "index.js"));
const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const datomic: any = await import(dist("datomic", "index.js"));
const [readyFile, out, questionArg] = process.argv.slice(2);
assert(readyFile && out && !fs.existsSync(out), "usage: server.ts READY_FILE NEW_OUT [QUESTION_URL]");
fs.mkdirSync(out, { recursive: true });
const ready = JSON.parse(fs.readFileSync(readyFile, "utf8"));
assert(ready.version === "triplex-demo-ready/1" && /^tx2-dx[a-z0-9-]+$/.test(ready.prefix));
const readUrl = `http://127.0.0.1:${ready.readPort}`, writeUrl = `http://127.0.0.1:${ready.writePort}`;
const questionUrl = questionArg ?? `http://127.0.0.1:${ready.readPort + 10}`;
const db: string = ready.database;
// Overrides exist only for the Mac dry run; the server command sets none of them.
const OLD = Number(process.env["DX_XQ7_OLD"] ?? 87002), SUBJECTS = Number(process.env["DX_XQ7_SERVER_SUBJECTS"] ?? 100_000);
const HOT = Number(process.env["DX_XQ7_HOT"] ?? 1000), WINDOW_MS = Number(process.env["DX_XQ7_WINDOW_S"] ?? 120) * 1000;
const ACCOUNT = "account-003";
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "server.jsonl"), line + "\n");
};
const reader = new datomic.DatomicClient(readUrl, 600_000);
const qreader = new datomic.DatomicClient(questionUrl, 600_000);
const pad = (n: number) => String(n).padStart(8, "0");
const sid = (acct: string, i: number) => `acct/${acct}/pl:${pad(i)}`;
const mainStats = async () => (await reader.request("GET", "/v2/admin/scan-stats")) as any;
const qStats = async () => (await qreader.request("GET", "/v2/admin/scan-stats")) as any;
const s0 = await mainStats(), q0 = await qStats();
// The main reader serves the sweep in the first two sweep windows, so it runs with DX_QUESTION_MAIN_REFUSES=0.
assert(s0.readIo, "the main reader must run with DX_READ_IO_COUNTERS=1");
assert(q0.questionReader?.questionReader === true, "QUESTION_URL is not a question reader");
const head = Number((await reader.basis(db)).position.v);
await qreader.basis(db, { position: head, waitMs: 2000 });
// The condition: the first unprotected string fact of subject 0 (an attribute every loader subject carries).
const sample = await reader.rows(db, { entityIds: [sid(ACCOUNT, 0)], basis: { recordedPosition: head, validAt: Date.now() } });
const fact = sample.find((r: any) => r.value_type === "string" && !/privacy|identity/.test(r.attribute));
assert(fact, "subject 0 has no string fact to filter on");
const where = [{ attribute: fact.attribute, op: "eq", value: { type: "string", value: fact.value_string } }];
const kind = { prefix: "pl:", shape: "pl:{8 digits}" };
const parts = Array.from({ length: 10 }, (_, d) => `pl:0000${d}`);
log("question", { head, where, parts, readUrl, questionUrl });

// A pool of `width` workers over the ten parts of the account; every part pinned to one position and valid time.
const countOn = async (client: any, width: number) => {
  const validAt = Date.now(), t0 = performance.now();
  const queue = [...parts];
  let count = 0, pages = 0, examined = 0, busy = 0, cpu = 0, rows = 0;
  await Promise.all(Array.from({ length: width }, async () => {
    for (let prefix = queue.shift(); prefix; prefix = queue.shift()) {
      let next: string | null = null;
      do {
        const r = { account: ACCOUNT, from: { ...kind, prefix }, where, result: "count", bounds: { subjects: 2000, ms: 2000 } };
        const page: any = await datomic.sweepPageWaiting(client, db, next ? { ...r, cursor: next } : { ...r, basis: { recordedPosition: head, validAt } });
        pages++; examined += page.examined; busy += page.busyRetries; cpu += page.cpuMicros; rows += page.rows; next = page.next;
        if (!next) count += page.count;
      } while (next);
    }
  }));
  return { width, count, pages, examined, rows, busyRetries: busy, cpuSeconds: cpu / 1e6, seconds: (performance.now() - t0) / 1000 };
};

const [tag, env, tenant, database, generation] = JSON.parse(Buffer.from(db.slice(3), "base64url").toString());
assert(tag === "triplex-scope-v1", "unexpected database name");
const scope = runtimeApi.DatabaseScope.make({ env, tenant, database, generation });
const writer = new datomic.DatomicClient(writeUrl, 60_000);
const rt = ManagedRuntime.make(runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
}).layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const others = ["account-001", "account-002", "account-004", "account-006", "account-007", "account-008", "account-009", "account-010"];
// The re-read set: HOT subjects of the other accounts, small enough for the main reader's 1.5 GiB object cache once warm
// (about 1.7 segments each, about 0.5 MB decoded per segment: 1,000 subjects need about 0.85 GB).
const hot = Array.from({ length: HOT }, (_, k) => sid(others[k % others.length]!, (k * 7919) % SUBJECTS));
const numeric = (x: any) => Object.fromEntries(Object.entries(x ?? {}).filter(([, v]) => typeof v === "number")) as Record<string, number>;
const delta = (a: Record<string, number>, b: Record<string, number>) => Object.fromEntries(Object.keys(b).map((k) => [k, b[k]! - (a[k] ?? 0)]));
const window = async (label: string, where_: "none" | "main" | "question", width: number) => {
  const m0 = await mainStats(), qq0 = await qStats();
  let stop = false;
  const lat: number[] = [], saveLat: number[] = [];
  let reads = 0, saves = 0, saveErrors = 0, readErrors = 0;
  const readers = Array.from({ length: 256 }, async () => {
    while (!stop) {
      const id = hot[Math.floor(Math.random() * hot.length)]!;
      const t0 = performance.now();
      try { await reader.rows(db, { entityIds: [id], basis: { recordedPosition: OLD, validAt: 1.8e12 } }); reads++; lat.push(performance.now() - t0); }
      catch { readErrors++; }
    }
  });
  const saver = (async () => {
    for (let n = 0; !stop; n++) {
      const due = performance.now() + 1000 / 23;
      const s = sid("account-005", Math.floor(Math.random() * SUBJECTS));
      const t0 = performance.now();
      try {
        await rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact(Array.from({ length: 17 }, (_, k) => ({
          op: "assert", entityId: s, entityType: "Subject", attribute: `:xq7/probe-${k}`, value: { type: "string", value: `${label} ${n}` }, validFrom: 0 })), { actor: "xq7-server" })));
        saves++; saveLat.push(performance.now() - t0);
      } catch { saveErrors++; }
      const wait = due - performance.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
  })();
  const t0 = performance.now();
  const sweep = where_ === "none" ? (await new Promise((r) => setTimeout(r, WINDOW_MS)), null) : await countOn(where_ === "main" ? reader : qreader, width);
  stop = true;
  await Promise.all([...readers, saver]);
  const m1 = await mainStats(), qq1 = await qStats();
  const io = delta(numeric(m0.readIo), numeric(m1.readIo));
  const per = (k: string) => (io[k] ?? 0) / Math.max(1, io["reads"] ?? 0);
  const loads = Object.keys(io).filter((k) => k.endsWith("-load")).reduce((n, k) => n + io[k]!, 0);
  const q = (xs: number[], f: number) => { const s = [...xs].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(f * s.length))]! * 10) / 10; };
  const seconds = (performance.now() - t0) / 1000;
  log("window", { label, sweepOn: where_, width, seconds, reads, readsPerSecond: reads / seconds, readP50: q(lat, 0.5), readP99: q(lat, 0.99), readErrors,
    saves, saveP50: q(saveLat, 0.5), saveP99: q(saveLat, 0.99), saveErrors,
    mainReader: { reads: io["reads"] ?? 0, ocachePerRead: per("ocache"), storageReadsPerRead: per("sql"), loadsPerRead: loads / Math.max(1, io["reads"] ?? 0), io },
    sweepPagesOnMain: ((m1.sweep?.requests ?? 0) - (m0.sweep?.requests ?? 0)), sweepPagesOnQuestionReader: ((qq1.sweep?.requests ?? 0) - (qq0.sweep?.requests ?? 0)),
    sweep });
};
await window("warm-up", "none", 0);
await window("control", "none", 0);
await window("main reader, one part", "main", 1);
await window("main reader, three parts", "main", 3);
await window("control after the main reader", "none", 0);
await window("question reader, one part", "question", 1);
await window("question reader, three parts", "question", 3);
await window("control again", "none", 0);
await rt.dispose();
writer.close(); reader.close(); qreader.close();
log("done");
