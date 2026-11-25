// [DX-XQ9] Counted work per 1,000 subjects for each question shape the sweep gained (counts exact; every time
// diagnostic: Mac, lab VM, shared with other builders). For each shape, a whole count (or top N, or sum) over one
// account's subjects at the head, uncached (read gateway restarted first) and cached (repeated at once): storage reads
// (PostgreSQL index scans of Datomic's table, net of the idle baseline, as xq3 and xq6 count them), subject rows read,
// related entities and their rows read, IDs listed for them, reader CPU, gateway time, cursor bytes.
// Two layouts of the same children: account-007 writes each subject with its children in one commit (packed, as one
// commit per subject's save does); account-008 writes the subjects first and the children later, 50 per commit in a
// scattered order (not packed), so a subject's children sit in other segments than the subject.
//   node lab/bin/heavy.mjs --label DX-XQ9-load -- bash lab/experiments/EXP-DX1/xq9/gate.sh "$PWD" NEW_OUT_DIR load
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
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "load.jsonl"), line + "\n");
};
const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8" });
const N = Number(process.env["DX_XQ9_SUBJECTS"] ?? 2000);
const TASKS = 3;
const pad = (n: number) => String(n).padStart(8, "0");
const sid = (acct: string, i: number) => `acct/${acct}/pl:${pad(i)}`;
const PACKED = "account-007", SCATTERED = "account-008";

const scope = runtimeApi.DatabaseScope.test(`xq9-load-${process.pid}`);
const writer = new datomic.DatomicClient(writeUrl, 600_000);
let reader = new datomic.DatomicClient(readUrl, 600_000);
const { db } = await writer.create(scope, "lean");
const rt = ManagedRuntime.make(runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
}).layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const transact = (ops: object[]) => rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact(ops, { actor: "xq9-load" })));
const S = (v: string) => ({ type: "string", value: v });
const I = (v: number) => ({ type: "integer", value: String(v) });
const op = (e: string, type: string, attribute: string, value: object) => ({ op: "assert", entityId: e, entityType: type, attribute, value, validFrom: 0 });
// Twelve facts per subject (xq6's width), one placement by reference, three tasks by key (three facts each).
const subjectOps = (acct: string, i: number) => [
  ["name", S(i % 17 === 0 ? `Smith ${i}` : `name ${i}`)], ["status", S(["pending", "complete", "requires_action"][i % 3]!)], ["score", I(i % 97)],
  ["rating", { type: "number", value: (i % 13) / 13 }], ["active", { type: "boolean", value: i % 2 === 0 }], ["joined", { type: "datetime", value: 1.7e12 + i * 1000 }],
  ["city", S(`city ${i % 40}`)], ["team", S(`team ${i % 9}`)], ["level", I(i % 5)],
  ["note", S(`note ${i} ${"x".repeat(40)}`)], ["placement", { type: "ref", value: `${sid(acct, i)}:p0` }], ["round", I(0)],
].map(([attr, value]) => op(sid(acct, i), "Subject", `:person/${attr}`, value as object));
const childOps = (acct: string, i: number) => [
  op(`${sid(acct, i)}:p0`, "Placement", ":placement/status", S(i % 5 === 0 ? "ended" : "active")),
  ...Array.from({ length: TASKS }, (_, k) => {
    const t = `acct/${acct}/tk:${pad(i)}:${k}`;
    return [op(t, "Task", ":task/status", S((i + k) % 4 === 0 ? "pending" : "complete")), op(t, "Task", ":task/progress", I((i * 7 + k) % 100)), op(t, "Task", ":task/subject", { type: "ref", value: sid(acct, i) })];
  }).flat(),
];
const t0 = performance.now();
for (let i = 0; i < N; i += 50) await transact(Array.from({ length: Math.min(50, N - i) }, (_, k) => [...subjectOps(PACKED, i + k), ...childOps(PACKED, i + k)]).flat());
for (let i = 0; i < N; i += 100) await transact(Array.from({ length: Math.min(100, N - i) }, (_, k) => subjectOps(SCATTERED, i + k)).flat());
// Children of the scattered account in a shuffled order (stride 37 over N), 50 subjects' children per commit.
const order = Array.from({ length: N }, (_, k) => (k * 37) % N);
for (let i = 0; i < N; i += 50) await transact(order.slice(i, i + 50).flatMap((j) => childOps(SCATTERED, j)));
const HEAD = Number((await writer.basis(db)).position.v);
await writer.request("POST", `/v2/db/${db}/request-index`, { waitMs: 600000 });
log("seed", { N, TASKS, HEAD, seedMs: Math.round(performance.now() - t0) });

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
  await reader.basis(db, { position: HEAD, waitMs: 2000 });
};
const pgGets = () => Number(docker("exec", `${prefix}-pg`, "psql", "-U", "postgres", "-d", "datomic", "-Atc",
  "select coalesce(sum(idx_scan),0)+coalesce(sum(seq_scan),0) from pg_stat_user_tables where relname='datomic_kvs'").trim());
const settle = async () => { await new Promise((s) => setTimeout(s, 11_000)); return pgGets(); };

const SUBJECTS = { prefix: "pl:", shape: "pl:{8 digits}" };
const shapes: Record<string, object> = {
  "eq (the sweep's existing shape, for reference)": { result: "count", where: [{ attribute: ":person/status", op: "eq", value: S("pending") }] },
  "ne": { result: "count", where: [{ attribute: ":person/status", op: "ne", value: S("pending") }] },
  "contains, any case": { result: "count", where: [{ attribute: ":person/name", op: "contains", value: S("SMITH"), caseInsensitive: true }] },
  "or, two groups": { result: "count", anyOf: [[{ attribute: ":person/status", op: "eq", value: S("pending") }], [{ attribute: ":person/level", op: "eq", value: I(2) }, { attribute: ":person/active", op: "eq", value: { type: "boolean", value: true } }]] },
  "has by key (3 tasks each): a pending task": { result: "count", where: [{ op: "has", related: { prefix: "tk:", link: "key" }, where: [{ attribute: ":task/status", op: "eq", value: S("pending") }] }] },
  "has by reference (1 placement each): ended": { result: "count", where: [{ op: "has", related: { prefix: "pl:", shape: "pl:{8 digits}:p{digits}", link: { ref: ":person/placement" } }, where: [{ attribute: ":placement/status", op: "eq", value: S("ended") }] }] },
  "top 100 by score, descending": { result: "top", limit: 100, order: { by: ":person/score", type: "integer", direction: "desc" } },
  "top 1,000 by name": { result: "top", limit: 1000, order: { by: ":person/name", type: "string" } },
  "sum of score": { result: "sum", of: ":person/score" },
};
const sweepWhole = async (account: string, q: object) => {
  let next: string | null = null, pages = 0, cursorBytes = 0;
  const sum = { examined: 0, rows: 0, related: 0, relatedRows: 0, relatedListed: 0, cpuMicros: 0, readMicros: 0, relatedMicros: 0, totalMicros: 0, answer: null as any };
  const startedAt = performance.now();
  do {
    const base = { account, from: SUBJECTS, ...q, bounds: { subjects: 10000, ms: 2000 } };
    const page: any = await datomic.sweepPageWaiting(reader, db, next ? { ...base, cursor: next } : { ...base, basis: { recordedPosition: HEAD, validAt: 1.8e12 } });
    pages++; next = page.next; cursorBytes = Math.max(cursorBytes, next?.length ?? 0);
    sum.examined += page.examined; sum.rows += page.rows; sum.related += page.related ?? 0; sum.relatedRows += page.relatedRows ?? 0;
    sum.relatedListed += page.relatedListed ?? 0; sum.cpuMicros += page.cpuMicros; sum.readMicros += page.micros.read;
    sum.relatedMicros += page.relatedMicros ?? 0; sum.totalMicros += page.micros.total;
    sum.answer = page.count ?? page.sum ?? (page.ids ? page.ids.length : null);
  } while (next);
  return { pages, cursorBytes, ...sum, clientMs: Math.round(performance.now() - startedAt) };
};
const idleA = await settle(), idleB = await settle();
const idle = Math.max(0, idleB - idleA);
log("idle-baseline", { storageGetsIn11s: idle });
const per1000 = (x: number, n: number) => Math.round((x * 1000 * 100) / n) / 100;
const results: any[] = [];
for (const account of [PACKED, SCATTERED])
  for (const [name, q] of Object.entries(shapes)) {
    const uncachedToo = name.startsWith("eq") || name.startsWith("has") || name.startsWith("top 100");
    for (const temperature of uncachedToo ? ["uncached", "cached"] : ["cached"]) {
      if (temperature === "uncached") await restartReader();
      const before = await settle();
      const r = await sweepWhole(account, q);
      const after = await settle();
      const gets = Math.max(0, after - before - idle);
      const row = {
        account, layout: account === PACKED ? "children packed with the subject" : "children written later, scattered",
        shape: name, temperature, subjects: r.examined, answer: r.answer, pages: r.pages, cursorBytes: r.cursorBytes,
        perThousand: {
          storageReads: per1000(gets, r.examined), subjectRows: per1000(r.rows, r.examined), relatedRead: per1000(r.related, r.examined),
          relatedRows: per1000(r.relatedRows, r.examined), relatedIdsListed: per1000(r.relatedListed, r.examined),
          cpuMs: per1000(r.cpuMicros / 1000, r.examined), gatewayMs: per1000(r.totalMicros / 1000, r.examined), relatedMs: per1000(r.relatedMicros / 1000, r.examined),
        },
      };
      results.push(row);
      log("cost", row);
    }
  }
fs.writeFileSync(path.join(out, "cost.json"), JSON.stringify({ N, TASKS, HEAD, results }, null, 2));
await rt.dispose();
await writer.delete(scope);
writer.close(); reader.close();
