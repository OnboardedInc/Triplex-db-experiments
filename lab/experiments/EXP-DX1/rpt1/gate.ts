// [DX-RPT1] Gates (a) to (g) of the reporting copy (rpt1/SQL-REPORTING.md section 6), on a toy stack of this
// checkout's gateway and the copy's own PostgreSQL. Counts are results; times are diagnostic (Mac, lab VM).
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/rpt1/gate.ts OUT WRITE_URL READ_URL PREFIX PG_PORT
// RPT_PG_PASSWORD names the copy's superuser password (generated per run by gate.sh, never written down).
// The oracle is the store itself: whole-history row reads at each position (lean/history over d/history) and the
// sweep route; the copy is compared against them column for column.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer, ManagedRuntime } from "effect";

const REPO = path.resolve(import.meta.dirname, "../../../..");
const dist = (pkg: string, file: string) => pathToFileURL(path.join(REPO, "packages", pkg, "dist", file)).href;
const core: any = await import(dist("core", "index.js"));
const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const datomic: any = await import(dist("datomic", "index.js"));
const reporting: any = await import(dist("reporting", "index.js"));
const postgres: any = (await import(pathToFileURL(path.join(REPO, "packages/reporting/node_modules/postgres/src/index.js")).href)).default;

const [out, writeUrl, readUrl, prefix, pgPort] = process.argv.slice(2);
assert(out && writeUrl && readUrl && prefix?.startsWith("tx2-dxrpt1-") && pgPort, "usage: gate.ts OUT WRITE_URL READ_URL PREFIX PG_PORT");
const password = process.env["RPT_PG_PASSWORD"];
assert(password, "RPT_PG_PASSWORD");
fs.mkdirSync(out, { recursive: true });
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "gate.jsonl"), line + "\n");
};
const counts: Record<string, number> = {};
// DX_RPT1_STOP_AFTER=<label> ends the run after that part (a smoke run while building).
const stopAfter = async (label: string) => {
  if (process.env["DX_RPT1_STOP_AFTER"] !== label) return;
  log("summary", { counts, failures: failures.length, stoppedAfter: label });
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ counts, failures, stoppedAfter: label }, null, 2));
  process.exit(failures.length ? 1 : 0);
};
const bump = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);
const failures: object[] = [];
const check = (ok: boolean, what: string, detail: object = {}) => {
  bump(ok ? "pass" : "fail");
  if (!ok) {
    failures.push({ what, ...detail });
    log("FAIL", { what, ...detail });
    if (failures.length > 40) throw new Error("too many failures");
  }
};
const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8" });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pgUrl = (db: string) => `postgres://postgres:${password}@127.0.0.1:${pgPort}/${db}`;
const admin = postgres(pgUrl("postgres"), { max: 1, onnotice: () => {} });
for (const db of ["rpt_clean", "rpt_kill", "rpt_two", "rpt_replay"]) await admin.unsafe(`CREATE DATABASE ${db}`);
const pg: Record<string, any> = {};
for (const db of ["rpt_clean", "rpt_kill", "rpt_two", "rpt_replay"]) pg[db] = postgres(pgUrl(db), { max: 4, onnotice: () => {} });

// ---- the store ----
const A3 = "account-003", A31 = "account-0031", A9 = "account-009";
const ACCOUNTS = [A3, A31, A9];
const N = Number(process.env["DX_RPT1_SUBJECTS"] ?? 30);
const pad = (n: number) => String(n).padStart(8, "0");
const subjectId = (a: string, i: number) => `acct/${a}/pl:${pad(i)}`;
const taskId = (a: string, i: number, k: number) => `acct/${a}/tk:${pad(i)}:${k}`;
const formId = (a: string, k: number) => `acct/${a}/fm:${k}`;
const PROTECTED = ":privacy/identity-number";
const CONTROL = `CTRL-VISIBLE-${process.pid}-${Date.now()}`;
const DAY = 86_400_000;
const T0 = Date.now();
const T_CORR = T0 - 10 * DAY, V_PAST1 = T0 - 20 * DAY, V_PAST2 = T0 - 5 * DAY, V_NOW = T0 + 3_600_000;
const T_FORM_END = T0 - 7 * DAY, T_IMPORT = T0 - 15 * DAY;
const protectedValues: string[] = [];

const writer = new datomic.DatomicClient(writeUrl, 60_000);
const importer = new datomic.DatomicClient(writeUrl, 60_000, undefined, { writeClass: "import" });
const reader = new datomic.DatomicClient(readUrl, 60_000);
const makeStore = async (label: string) => {
  const scope = runtimeApi.DatabaseScope.test(`rpt1-${label}-${process.pid}-${Date.now()}`);
  const { db } = await writer.create(scope, "lean");
  await writer.declareProtection(db, [PROTECTED], false);
  const runtimeFor = (client: any) => {
    const definition = runtimeApi.Runtime.define({
      name: "datomic",
      storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(client, scope, { layout: "lean", serverRecordTime: true })),
      queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(client, scope)),
    });
    return ManagedRuntime.make(definition.layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
  };
  return { label, db, write: runtimeFor(writer), importRt: runtimeFor(importer), live: new Map<string, any[]>(), receipts: [] as any[] };
};
type Store = Awaited<ReturnType<typeof makeStore>>;
const A = await makeStore("followed");
const B = await makeStore("control");
log("stores", { followed: A.db, control: B.db });

const transact = async (s: Store, label: string, ops: object[], rt = s.write) => {
  let r: any;
  for (let attempt = 0; ; attempt++) {
    try {
      r = await rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact(ops, { actor: "rpt1-gate" })));
      break;
    } catch (error: any) {
      // Refused before it reached the transactor (it is restarting): nothing was committed, so send it again.
      if (attempt > 240 || !/Transactor not available/.test(String(error?.cause?.message ?? error?.message))) throw error;
      bump("transact-retried-transactor-unavailable");
      await sleep(500);
    }
  }
  s.receipts.push({ label, position: r.position });
  for (const t of r.triples) s.live.set(t.entityId, [...(s.live.get(t.entityId) ?? []), t]);
  return r;
};
const a = (entityId: string, entityType: string, attribute: string, value: object, validFrom = 0, validTo?: number) =>
  ({ op: "assert", entityId, entityType, attribute, value, validFrom, ...(validTo !== undefined ? { validTo } : {}) });
const S = (v: string) => ({ type: "string", value: v });
const I = (v: number) => ({ type: "integer", value: String(v) });
const R = (v: string) => ({ type: "ref", value: v });
const STATUSES = ["pending", "complete", "requires_action"];
const retractAll = (s: Store, id: string, attribute?: string) =>
  (s.live.get(id) ?? []).filter((t: any) => !attribute || t.attribute === attribute).map((t: any) => ({ op: "retract", id: t.id }));
const waitHealthy = async (client: any, db: string) => {
  for (let i = 0; i < 240; i++) {
    try { await client.basis(db); return; } catch { await sleep(500); }
  }
  throw new Error("gateway did not come back");
};
const headOf = async (db: string) => Number((await writer.basis(db)).position.v);

// ---- the clean projector, in this process, following A from position 0 while the workload runs ----
const lag: any[] = [];
const clean = new reporting.Projector({ sql: pg["rpt_clean"], source: new reporting.StoreSource(readUrl, A.db), pageLimit: 200, waitMs: 500,
  log: (k: string, d: object) => { bump(`clean-${k}`); if (k !== "retry") log(`clean-${k}`, d); } });
await clean.install();
await clean.start(0);
let stopClean = false, cleanPaused = false, cleanError: unknown = null;
const cleanLoop = clean.follow(() => stopClean, (s: any) => { if (s.journals) lag.push(s); })
  .catch((e: unknown) => { cleanError = e; log("clean-stopped", { message: String((e as Error).message) }); });
// The follower can be paused (rebuild gate, P above the watermark) without stopping the process.
const pauseClean = async () => { stopClean = true; await cleanLoop; cleanPaused = true; };
let cleanLoop2: Promise<void> | null = null;
const resumeClean = () => {
  stopClean = false; cleanPaused = false;
  cleanLoop2 = clean.follow(() => stopClean, (s: any) => { if (s.journals) lag.push(s); })
    .catch((e: unknown) => { cleanError = e; log("clean-stopped", { message: String((e as Error).message) }); });
};
const waitWatermark = async (projector: any, position: number, ms = 60_000) => {
  const deadline = Date.now() + ms;
  for (;;) {
    const w = await projector.watermark();
    if (w && w.after >= position) return w.after;
    if (cleanError) throw cleanError;
    if (Date.now() > deadline) throw new Error(`watermark did not reach ${position} (at ${w?.after})`);
    await sleep(100);
  }
};

// ---- the workload, each step applied to A (followed) and then B (control) ----
const t0 = performance.now();
const both = async (f: (s: Store) => Promise<void>) => { await f(A); await f(B); };
await both(async (s) => {
  for (const acct of [A3, A31]) {
    for (let k = 0; k < 4; k++) await transact(s, `form ${acct} ${k}`, [a(formId(acct, k), "Form", ":form/name", S(`form ${k}`))]);
    for (let i = 0; i < N; i += 10) {
      const ops: object[] = [];
      for (let j = i; j < Math.min(N, i + 10); j++) {
        const sid = subjectId(acct, j);
        ops.push(a(sid, "Subject", ":person/name", S(`name ${j}`)), a(sid, "Subject", ":person/score", I(j * 3)),
          a(sid, "Subject", ":person/rating", { type: "number", value: (j % 7) / 7 }),
          a(sid, "Subject", ":person/active", { type: "boolean", value: j % 3 !== 0 }),
          a(sid, "Subject", ":person/joined", { type: "datetime", value: T0 - (j + 1) * DAY }));
        for (const k of [0, 1]) {
          const t = taskId(acct, j, k);
          ops.push(a(t, "Task", ":task/status", S(STATUSES[(j + k) % 3]!)), a(t, "Task", ":task/progress", I((j * 7 + k * 13) % 100)),
            a(t, "Task", ":task/due", { type: "datetime", value: T0 + ((j % 11) - 5) * DAY }));
          if ((j + k) % 4 !== 0) ops.push(a(t, "Task", ":task/assignee", R(subjectId(acct, (j + 1) % N))));
          ops.push(a(t, "Task", ":task/form", R(formId(acct, (j + k) % 4)), 0, j % 5 === 0 ? T_FORM_END : undefined));
        }
      }
      await transact(s, `create ${acct} ${i}`, ops);
    }
  }
  const wide = subjectId(A3, 7);
  for (let part = 0; part < 4; part++)
    await transact(s, `wide ${part}`, Array.from({ length: 50 }, (_, k) => a(wide, "Subject", `:form/f${String(part * 50 + k).padStart(3, "0")}`, S(`answer ${part * 50 + k}`))));
  // Protected values: five subjects of account-003, three of account-0031, one later retired (a history row).
  const pv = (acct: string, j: number) => `IDN-${acct.slice(-4)}-${9000 + j}-${s.label}`;
  const ops = [...[0, 1, 2, 3, 4].map((j) => a(subjectId(A3, j), "Subject", PROTECTED, S(pv(A3, j)))),
    ...[0, 1, 2].map((j) => a(subjectId(A31, j), "Subject", PROTECTED, S(pv(A31, j))))];
  for (const o of ops) protectedValues.push((o as any).value.value);
  await transact(s, "protected values", ops);
  await transact(s, "control value", [a(subjectId(A31, 9), "Subject", ":person/nickname", S(`${CONTROL}-${s.label}`))]);
});
const P_A = A.receipts.at(-1).position;
log("step", { step: "created", P_A, ms: Math.round(performance.now() - t0) });

// A transactor restart in the middle of the workload; the projector keeps following through it.
docker("restart", "-t", "5", `${prefix}-tx`);
await waitHealthy(writer, A.db);
log("step", { step: "transactor restarted" });

await both(async (s) => {
  for (const acct of [A3, A31]) {
    const ops: object[] = [];
    for (let j = 0; j < N; j += 4) {
      const sid = subjectId(acct, j);
      ops.push(...retractAll(s, sid, ":person/score"), a(sid, "Subject", ":person/score", I(j * 3), 0, T_CORR), a(sid, "Subject", ":person/score", I(j * 3 + 100), T_CORR));
    }
    for (let j = 1; j < N; j += 5) ops.push(...retractAll(s, taskId(acct, j, 1)));
    for (let j = 2; j < N; j += 6) ops.push(...retractAll(s, taskId(acct, j, 0), ":task/status"), a(taskId(acct, j, 0), "Task", ":task/status", S("complete")));
    await transact(s, `corrections ${acct}`, ops);
  }
  // Retire one protected value of account-0031 (it stays in history) and write a new one.
  const old = retractAll(s, subjectId(A31, 2), PROTECTED);
  const fresh = `IDN-0031-9102-${s.label}`;
  protectedValues.push(fresh);
  await transact(s, "protected replaced", [...old, a(subjectId(A31, 2), "Subject", PROTECTED, S(fresh))]);
});
const P_B = A.receipts.at(-1).position;
await both(async (s) => {
  await transact(s, "import", [
    ...Array.from({ length: 6 }, (_, k) => [
      a(subjectId(A31, N + k), "Subject", ":person/name", S(`imported ${k}`), T_IMPORT),
      a(subjectId(A31, N + k), "Subject", ":person/score", I(500 + k), T_IMPORT),
    ]).flat(),
    a(subjectId(A31, 3), "Subject", ":person/active", { type: "boolean", value: true }, T_IMPORT),
  ], s.importRt);
  // Removal on request: three subjects of account-003 and the replaced value's subject of account-0031 (both values).
  await writer.erase(s.db, `rpt1-erase-${s.label}-${process.pid}`, [
    ...[0, 1, 2].map((j) => ({ entityId: subjectId(A3, j), attribute: PROTECTED })),
    { entityId: subjectId(A31, 2), attribute: PROTECTED },
  ]);
});
log("step", { step: "imported and removed" });

// A read gateway restart: the projector's own source goes away for a few seconds.
docker("restart", "-t", "5", `${prefix}-gw-r`);
await waitHealthy(reader, A.db);
log("step", { step: "read gateway restarted" });

await both(async (s) => {
  // Settlement frames: a release writes :task/next-form for account-003's tasks, 8 tasks a frame (as XQ6's gate).
  const tasks = Array.from({ length: N }, (_, j) => [0, 1].map((k) => taskId(A3, j, k))).flat().filter((t) => (s.live.get(t) ?? []).length > 0);
  for (let i = 0; i < tasks.length; i += 8) await transact(s, `settle ${i}`, tasks.slice(i, i + 8).map((t) => a(t, "Task", ":task/next-form", S("F2"))));
  // Schema changes: a changed value type on one attribute, and a new kind.
  await transact(s, "type change", [a(taskId(A31, 4, 0), "Task", ":task/progress", S("blocked"))]);
  await transact(s, "new kind", [a(`acct/${A31}/nt:00000001`, "Note", ":note/text", S("first note")), a(`acct/${A31}/nt:00000001`, "Note", ":note/about", R(subjectId(A31, 1)))]);
});
const P_H = await headOf(A.db);
log("workload", { P_A, P_B, P_H, receiptsA: A.receipts.length, receiptsB: B.receipts.length, ms: Math.round(performance.now() - t0) });
await waitWatermark(clean, P_H, 120_000);
log("caught-up", { watermark: P_H });

// ---- helpers over the store ----
const omitRows = async (db: string, p: number) => {
  const raw = await reader.request("POST", `/v1/db/${db}/read`, { pattern: {}, history: true, basis: { recordedPosition: p, validAt: 0 }, omitProtected: true });
  assert.equal(raw.omittedProtected, true);
  return raw.rows.map(reporting.decodeWireRow).filter((r: any) => r.entity_type !== "_Transaction");
};
const visible = (r: any, p: number, v: number) =>
  r.recorded_position <= p && !(r.retracted_position != null && r.retracted_position <= p) &&
  r.valid_from <= v && (r.valid_to == null || r.valid_to > v);
const num = (x: any) => (x === null || x === undefined ? null : Number(x));
const factKey = (f: any) => JSON.stringify([
  f.account, f.entity, f.kind, f.attribute, f.assertion_id, f.value_type, f.value_string ?? null, num(f.value_number),
  f.value_boolean ?? null, num(f.value_datetime), f.value_json === null || f.value_json === undefined ? null : JSON.stringify(sortKeys(f.value_json)),
  num(f.valid_from), num(f.valid_to), num(f.recorded_position), num(f.recorded_at), num(f.retracted_position), num(f.retracted_at)]);
function sortKeys(v: any): any {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(sortKeys);
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
}
const storeFacts = (rows: any[]) => rows.map((r) => reporting.factFromStoreRow(r)).map((f: any) => ({ ...f, value_json: f.value_json }));
const copyFacts = async (sql: any, p?: number) => {
  const rows = await sql`SELECT * FROM rpt.facts ${p === undefined ? sql`` : sql`WHERE recorded_position <= ${p}`}`;
  return rows.map((r: any) => (p !== undefined && r.retracted_position !== null && Number(r.retracted_position) > p)
    ? { ...r, retracted_position: null, retracted_at: null } : r);
};
const compareFacts = (label: string, expected: any[], got: any[]) => {
  const e = new Set(expected.map(factKey)), g = new Set(got.map(factKey));
  const missing = [...e].filter((k) => !g.has(k)), extra = [...g].filter((k) => !e.has(k));
  check(missing.length === 0 && extra.length === 0 && expected.length === got.length, `${label}: facts equal the store's history`,
    { expected: expected.length, got: got.length, missing: missing.slice(0, 3), extra: extra.slice(0, 3) });
  bump("facts-compared", expected.length);
  return { expected: expected.length, missing: missing.length, extra: extra.length };
};

// ---- (b1) every fact of the copy equals the store's history at the watermark, and at P_A and P_B ----
const b1: any = {};
for (const [label, p] of [["head", P_H], ["P_A", P_A], ["P_B", P_B]] as const) {
  const store = storeFacts(await omitRows(A.db, p));
  const copy = await copyFacts(pg["rpt_clean"], p);
  b1[label] = compareFacts(`b1 ${label}`, store, copy);
}
log("b1", b1);
await stopAfter("b1");

// ---- (b2) every kind view equals the store at three positions and three valid instants ----
const viewsOf = async (sql: any) => (await sql`SELECT kind, view_name FROM rpt.kinds ORDER BY kind`).map((r: any) => ({ kind: r.kind, view: r.view_name }));
const columnsOf = async (sql: any, kind: string) => await sql`SELECT attribute, value_type, column_name FROM rpt.columns WHERE kind = ${kind} ORDER BY ordinal`;
const cellOf = (r: any) => {
  switch (r.value_type) {
    case "string": case "ref": case "blob": return r.value_string;
    case "integer": return String(BigInt(r.value_string));
    case "number": return Number(r.value_number);
    case "boolean": return r.value_boolean === true || Number(r.value_boolean) === 1;
    case "datetime": return Number(r.value_datetime);
    case "json": return JSON.stringify(sortKeys(JSON.parse(r.value_json)));
    default: return null;
  }
};
const viewCell = (valueType: string, x: any) => {
  if (x === null || x === undefined) return null;
  switch (valueType) {
    case "integer": return String(BigInt(String(x)));
    case "number": return Number(x);
    case "datetime": return (x as Date).getTime();
    case "json": return JSON.stringify(sortKeys(x));
    default: return x;
  }
};
let b2Views = 0, b2Rows = 0, b2Multi = 0;
const b2 = async (sql: any, label: string, positions: number[], instants: number[], accountFilter?: string) => {
  for (const p of positions) {
    const rows = (await omitRows(A.db, p)).filter((r: any) => !accountFilter || reporting.accountOf(r.entity_id) === accountFilter);
    for (const v of instants) {
      const vis = rows.filter((r: any) => visible(r, p, v));
      for (const { kind, view } of await viewsOf(sql)) {
        const cols = await columnsOf(sql, kind);
        const expected = new Map<string, Record<string, unknown>>();
        const byEntity = new Map<string, any[]>();
        for (const r of vis) if (r.entity_type === kind) byEntity.set(r.entity_id, [...(byEntity.get(r.entity_id) ?? []), r]);
        for (const [entity, rs] of byEntity) {
          const row: Record<string, unknown> = {};
          for (const c of cols) {
            const cand = rs.filter((r) => r.attribute === c.attribute && r.value_type === c.value_type)
              .sort((x, y) => y.recorded_position - x.recorded_position || (y.id < x.id ? -1 : y.id > x.id ? 1 : 0));
            if (cand.length > 1) b2Multi++;
            row[c.column_name] = c.value_type === "protected" || !cand.length ? null : cellOf(cand[0]);
          }
          expected.set(entity, row);
        }
        const got = await sql.begin(async (tx: any) => {
          await tx`SELECT set_config('rpt.position', ${String(p)}, true), set_config('rpt.valid_at', ${String(v)}, true)`;
          return await tx.unsafe(`SELECT * FROM report."${view}"${accountFilter ? ` WHERE account = '${accountFilter}'` : ""}`);
        });
        const gotMap = new Map<string, Record<string, unknown>>();
        for (const r of got) gotMap.set(r.entity, Object.fromEntries(cols.map((c: any) => [c.column_name, viewCell(c.value_type, r[c.column_name])])));
        const diffs: any[] = [];
        for (const [entity, row] of expected) if (JSON.stringify(row) !== JSON.stringify(gotMap.get(entity))) diffs.push({ entity, expected: row, got: gotMap.get(entity) });
        for (const entity of gotMap.keys()) if (!expected.has(entity)) diffs.push({ entity, extra: true });
        check(diffs.length === 0, `${label}: view ${view} equals the store at p=${p} v=${v}`, { diffs: diffs.slice(0, 2) });
        b2Views++;
        b2Rows += expected.size;
      }
    }
  }
};
await b2(pg["rpt_clean"], "b2", [P_A, P_B, P_H], [V_PAST1, V_PAST2, V_NOW]);
log("b2", { views: b2Views, rows: b2Rows, cellsWithSeveralVisibleValues: b2Multi });
await stopAfter("b2");

// ---- (e) reporting logins, one per account; used by (b3) and checked in (e) ----
const roleOf = (acct: string) => `rpt_${acct.replace(/-/g, "_")}`;
for (const acct of ACCOUNTS) {
  await pg["rpt_clean"].unsafe(reporting.readerLoginSql(roleOf(acct)));
  await pg["rpt_clean"]`INSERT INTO rpt.grants (role_name, account) VALUES (${roleOf(acct)}, ${acct}) ON CONFLICT DO NOTHING`;
}
const asRole = async (role: string, settings: Record<string, string>, f: (tx: any) => Promise<any>) =>
  await pg["rpt_clean"].begin(async (tx: any) => {
    await tx.unsafe(`SET LOCAL ROLE ${role}`);
    for (const [k, v] of Object.entries(settings)) await tx`SELECT set_config(${k}, ${v}, true)`;
    return await f(tx);
  });

// ---- (b3) SQL answers equal the sweep route's for XQ6's question shapes ----
const SUBJECTS = { prefix: "pl:", shape: "pl:{8 digits}" };
const TASKS = { prefix: "tk:" };
const questions = (acct: string): any[] => [
  { name: "list subjects", from: SUBJECTS },
  { name: "count subjects", from: SUBJECTS, result: "count" },
  { name: "tasks pending", from: TASKS, where: [{ attribute: ":task/status", op: "eq", value: S("pending") }] },
  { name: "who owes subject 5", from: TASKS, where: [{ attribute: ":task/assignee", op: "eq", value: R(subjectId(acct, 5)) }, { attribute: ":task/status", op: "in", values: [S("pending"), S("requires_action")] }], project: [":task/due", ":task/status"] },
  { name: "tasks open count", from: TASKS, result: "count", where: [{ attribute: ":task/status", op: "in", values: [S("pending"), S("requires_action")] }] },
  { name: "tasks due by now", from: TASKS, where: [{ attribute: ":task/due", op: "range", to: { type: "datetime", value: T0 } }] },
  { name: "score 10..<150 count", from: SUBJECTS, result: "count", where: [{ attribute: ":person/score", op: "range", from: I(10), toExclusive: I(150) }] },
  { name: "rating > 0.5", from: SUBJECTS, where: [{ attribute: ":person/rating", op: "range", fromExclusive: { type: "number", value: 0.5 } }], project: [":person/rating"] },
  { name: "name prefix", from: SUBJECTS, where: [{ attribute: ":person/name", op: "prefix", value: S("name 1") }] },
  { name: "active count", from: SUBJECTS, result: "count", where: [{ attribute: ":person/active", op: "eq", value: { type: "boolean", value: true } }] },
  { name: "unassigned tasks", from: TASKS, where: [{ attribute: ":task/assignee", op: "missing" }] },
  { name: "tasks with a form", from: TASKS, result: "count", where: [{ attribute: ":task/form", op: "exists" }] },
  { name: "tasks by status", from: TASKS, result: "countByValue", of: ":task/status" },
  { name: "progress 20..60 and form 1", from: TASKS, where: [{ attribute: ":task/progress", op: "range", from: I(20), to: I(60) }, { attribute: ":task/form", op: "eq", value: R(formId(acct, 1)) }] },
  { name: "wide subject answer 150", from: SUBJECTS, where: [{ attribute: ":form/f150", op: "eq", value: S("answer 150") }], project: [":form/f150", ":form/f000"] },
  { name: "settled by release", from: TASKS, result: "count", where: [{ attribute: ":task/next-form", op: "exists" }] },
  { name: "all IDs of the account by kind", from: { prefix: "" }, result: "countByValue", of: ":task/status" },
];
const condValue = (v: any): [string, any] => [v.type, v.type === "integer" ? BigInt(v.value) : v.value];
const keyOf = (v: [string, any] | null) => JSON.stringify(v === null ? null : [v[0], typeof v[1] === "bigint" ? String(v[1]) : v[1]]);
// One SQL predicate on the facts of one subject s, for one condition; parameters appended to `params`.
const typedMatch = (value: any, params: any[]) => {
  params.push(value.type);
  const t = `$${params.length}`;
  switch (value.type) {
    case "string": case "ref": params.push(value.value); return `(v.value_type = ${t} AND v.value_string = $${params.length})`;
    case "integer": params.push(value.value); return `(v.value_type = ${t} AND v.value_string::numeric = $${params.length}::numeric)`;
    case "number": params.push(String(value.value)); return `(v.value_type = ${t} AND v.value_number = $${params.length}::float8)`;
    case "datetime": params.push(String(value.value)); return `(v.value_type = ${t} AND v.value_datetime = $${params.length}::float8)`;
    case "boolean": params.push(value.value); return `(v.value_type = ${t} AND v.value_boolean = $${params.length}::boolean)`;
  }
  throw new Error(`type ${value.type}`);
};
const column = (type: string) => ({ integer: "v.value_string::numeric", number: "v.value_number", datetime: "v.value_datetime", string: "v.value_string" } as any)[type];
const condSql = (c: any, params: any[]) => {
  params.push(c.attribute);
  const attr = `$${params.length}`;
  const facts = `SELECT 1 FROM rpt.facts_visible v WHERE v.entity = s.entity AND v.attribute = ${attr}`;
  switch (c.op) {
    case "exists": return `EXISTS (${facts})`;
    case "missing": return `NOT EXISTS (${facts})`;
    case "eq": return `EXISTS (${facts} AND ${typedMatch(c.value, params)})`;
    case "in": return `EXISTS (${facts} AND (${c.values.map((x: any) => typedMatch(x, params)).join(" OR ")}))`;
    case "prefix": params.push(c.value.value); return `EXISTS (${facts} AND v.value_type = 'string' AND starts_with(v.value_string, $${params.length}))`;
    case "range": {
      const lo = c.from ?? c.fromExclusive, hi = c.to ?? c.toExclusive, fam = (lo ?? hi).type;
      const cast = fam === "integer" ? "::numeric" : fam === "string" ? "" : "::float8";
      const parts = [`v.value_type = '${fam}'`];
      if (lo) { params.push(String(lo.value)); parts.push(`${column(fam)} ${c.fromExclusive ? ">" : ">="} $${params.length}${cast}`); }
      if (hi) { params.push(String(hi.value)); parts.push(`${column(fam)} ${c.toExclusive ? "<" : "<="} $${params.length}${cast}`); }
      return `EXISTS (${facts} AND ${parts.join(" AND ")})`;
    }
  }
  throw new Error(`op ${c.op}`);
};
const shapeRe = (shape?: string) => shape === undefined ? null
  : "^" + shape.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\?\{(\d+) digits\\?\}/g, "[0-9]{$1}").replace(/\{(\d+) digits\}/g, "[0-9]{$1}").replace(/\{digits\}/g, "[0-9]+").replace(/\{segment\}/g, "[^:/]+") + "$";
const sqlAnswer = async (q: any, p: number, v: number) => {
  const params: any[] = [];
  const base = `acct/${q.account}/`;
  params.push(base + (q.from?.prefix ?? ""));
  let subjects = `SELECT DISTINCT v.entity FROM rpt.facts_visible v WHERE starts_with(v.entity, $1)`;
  const re = shapeRe(q.from?.shape);
  if (re) { params.push(base.length + 1, re); subjects += ` AND substr(v.entity, $2) ~ $3`; }
  const where = (q.where ?? []).map((c: any) => condSql(c, params));
  const matched = `SELECT s.entity FROM (${subjects}) s${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
  return await asRole(roleOf(q.account), { "rpt.position": String(p), "rpt.valid_at": String(v) }, async (tx) => {
    const result = q.result ?? "ids";
    if (result === "count") return { count: Number((await tx.unsafe(`SELECT count(*) AS n FROM (${matched}) m`, params))[0].n) };
    if (result === "countByValue") {
      params.push(q.of);
      const rows = await tx.unsafe(`SELECT x.value_type, x.value_string, x.value_number, x.value_boolean, x.value_datetime, count(*) AS n FROM (
          SELECT DISTINCT m.entity, v.value_type, v.value_string, v.value_number, v.value_boolean, v.value_datetime
          FROM (${matched}) m LEFT JOIN rpt.facts_visible v ON v.entity = m.entity AND v.attribute = $${params.length}) x
        GROUP BY 1, 2, 3, 4, 5`, params);
      const groups = new Map<string, number>();
      for (const r of rows) groups.set(r.value_type === null ? keyOf(null) : keyOf([r.value_type, r.value_type === "integer" ? BigInt(r.value_string) : cellOf(r)]), Number(r.n));
      return { groups };
    }
    const ids = (await tx.unsafe(`SELECT entity FROM (${matched}) m ORDER BY entity COLLATE "C"`, params)).map((r: any) => r.entity);
    let projected: any[] = [];
    if (q.project?.length) {
      const vals = await tx.unsafe(`SELECT v.entity, v.attribute, v.value_type, v.value_string, v.value_number, v.value_boolean, v.value_datetime
        FROM rpt.facts_visible v WHERE v.entity = ANY($1) AND v.attribute = ANY($2)`, [ids, q.project]);
      projected = ids.map((id: string) => Object.fromEntries(q.project.map((attr: string) => [attr,
        vals.filter((r: any) => r.entity === id && r.attribute === attr).map((r: any) => keyOf([r.value_type, r.value_type === "integer" ? BigInt(r.value_string) : cellOf(r)])).sort()])));
    }
    return { ids, projected };
  });
};
const sweepAll = async (request: any) => {
  const pages: any[] = [];
  let cursor: string | null = null;
  for (let n = 0; n < 20000; n++) {
    const { basis: _b, ...rest } = request;
    const page = await datomic.sweepPageWaiting(reader, A.db, cursor ? { ...rest, cursor } : request);
    pages.push(page);
    if (!page.next) return pages;
    cursor = page.next;
  }
  throw new Error("cursor did not end");
};
let b3 = 0;
for (const acct of ACCOUNTS)
  for (const base of questions(acct))
    for (const p of [P_A, P_B, P_H])
      for (const v of [V_PAST1, V_PAST2, V_NOW]) {
        const { name, ...q } = { ...base, account: acct };
        const pages = await sweepAll({ ...q, limit: 1000, bounds: { subjects: 10000, ms: 2000 }, basis: { recordedPosition: p, validAt: v } });
        const got = await sqlAnswer(q, p, v);
        const result = q.result ?? "ids";
        const label = `b3 ${acct} ${name} p=${p} v=${v}`;
        if (result === "count") check(got.count === pages.at(-1).count, label, { sql: got.count, sweep: pages.at(-1).count });
        else if (result === "countByValue") {
          const sweep = new Map(pages.at(-1).groups.map((g: any) => [keyOf(g.value === null ? null : condValue(g.value)), g.count]));
          check(JSON.stringify([...sweep.entries()].sort()) === JSON.stringify([...got.groups.entries()].sort()), label,
            { sql: [...got.groups.entries()], sweep: [...sweep.entries()] });
        } else {
          const ids = pages.flatMap((x: any) => x.ids);
          check(JSON.stringify(ids) === JSON.stringify(got.ids), label, { sql: got.ids.slice(0, 8), sweep: ids.slice(0, 8), n: got.ids.length, m: ids.length });
          if (q.project?.length) {
            const proj = pages.flatMap((x: any) => x.projected).map((m: any) => Object.fromEntries(Object.entries(m).map(([k, vs]: any) => [k, vs.map((w: any) => keyOf(condValue(w))).sort()])));
            check(JSON.stringify(proj) === JSON.stringify(got.projected), `${label} projected`, {});
          }
          bump("b3-ids", ids.length);
        }
        b3++;
      }
// The three dashboard queries of the page, against the sweep's own answers at the head, valid now.
const dash: any = {};
{
  const v = V_NOW;
  for (const acct of [A3, A31]) {
    const sweep = await sweepAll({ account: acct, from: TASKS, result: "countByValue", of: ":task/status", limit: 1000, bounds: { subjects: 10000, ms: 2000 }, basis: { recordedPosition: P_H, validAt: v } });
    const viaView = await asRole(roleOf(acct), { "rpt.valid_at": String(v) }, (tx) => tx`SELECT status, count(*)::int AS n FROM report.task GROUP BY status`);
    const sweepMap = Object.fromEntries(sweep.at(-1).groups.map((g: any) => [g.value === null ? "null" : g.value.value, g.count]));
    const viewMap = Object.fromEntries(viaView.map((r: any) => [r.status ?? "null", r.n]));
    check(JSON.stringify(Object.entries(sweepMap).sort()) === JSON.stringify(Object.entries(viewMap).sort()), `dashboard 1 ${acct}: tasks by status`, { sweepMap, viewMap });
    const overdue = await asRole(roleOf(acct), { "rpt.valid_at": String(v) }, (tx) => tx`
      SELECT t.entity, t.due, s.name FROM report.task t JOIN report.subject s ON s.entity = t.assignee
      WHERE t.status IN ('pending', 'requires_action') AND t.due < to_timestamp(${T0 / 1000}) ORDER BY t.due, t.entity`);
    const sweepOverdue = (await sweepAll({ account: acct, from: TASKS, where: [{ attribute: ":task/status", op: "in", values: [S("pending"), S("requires_action")] },
      { attribute: ":task/due", op: "range", toExclusive: { type: "datetime", value: T0 } }, { attribute: ":task/assignee", op: "exists" }], limit: 1000, bounds: { subjects: 10000, ms: 2000 }, basis: { recordedPosition: P_H, validAt: v } })).flatMap((x: any) => x.ids);
    check(JSON.stringify([...overdue.map((r: any) => r.entity)].sort()) === JSON.stringify([...sweepOverdue].sort()), `dashboard 2 ${acct}: overdue open tasks with assignee`, { view: overdue.length, sweep: sweepOverdue.length });
    dash[acct] = { byStatus: viewMap, overdue: overdue.length };
  }
  // 3: a subject's record on a past valid date, at the head and as the store knew it at P_A.
  const sid = subjectId(A3, 4);
  for (const [p, vt] of [[P_H, V_PAST1], [P_H, V_PAST2], [P_A, V_PAST2]] as const) {
    const [row] = await asRole(roleOf(A3), { "rpt.position": String(p), "rpt.valid_at": String(vt) }, (tx) => tx`SELECT name, score FROM report.subject WHERE entity = ${sid}`);
    const store = (await omitRows(A.db, p)).filter((r: any) => r.entity_id === sid && visible(r, p, vt));
    const score = store.filter((r: any) => r.attribute === ":person/score").map((r: any) => r.value_string);
    check(row && String(row.score) === String(score[0]) && score.length === 1, `dashboard 3: subject record at p=${p} v=${vt}`, { view: row, store: score });
    dash[`record p=${p} v=${vt}`] = row;
  }
}
log("b3", { sweeps: b3, dashboards: dash });
await stopAfter("b3");

// ---- (a) the store is unchanged by the projector: journals of A (followed) and B (not) equal modulo IDs and clocks ----
const journalOf = async (db: string) => {
  const out: any[] = [];
  for (let after = 0; ; ) {
    const page = await reader.request("POST", `/v2/db/${db}/transactions`, { after, limit: 1000, bounded: true });
    for (const [txId, position, texts] of page.transactions) out.push({ txId, position, rows: texts.map(datomic.decodeRowText) });
    if (page.stopped !== "limit" && page.next <= after) break;
    if (page.stopped === "end") break;
    after = page.next;
  }
  return out;
};
const normalise = (journals: any[]) => {
  const ids = new Map<string, string>();
  const id = (x: string) => { if (!ids.has(x)) ids.set(x, `#${ids.size}`); return ids.get(x)!; };
  return journals.map((j) => ({
    position: j.position, tx: id(j.txId),
    changes: j.rows.filter((r: any) => r.attribute === ":_tx/change").map((r: any) => JSON.parse(r.value_json))
      .map((c: any) => ({ op: c.op, entity: c.entityId.replace(/^(acct\/[^/]+\/)/, "$1"), attribute: c.attribute, value: c.value ? JSON.stringify(c.value).replace(/-(followed|control)/g, "-X") : null,
        triple: id(c.tripleId), validFrom: c.validFrom, validTo: c.validTo ?? null }))
      .sort((x: any, y: any) => x.triple < y.triple ? -1 : 1),
    attributes: j.rows.map((r: any) => r.attribute).filter((x: string) => x !== ":_tx/change").sort(),
  }));
};
const writeStatsBefore = await writer.request("GET", "/v2/admin/scan-stats");
const jA = normalise(await journalOf(A.db)), jB = normalise(await journalOf(B.db));
const firstDiff = jA.findIndex((x, i) => JSON.stringify(x) !== JSON.stringify(jB[i]));
check(jA.length === jB.length && firstDiff === -1, "a: journals of the followed and the control database equal modulo IDs and clocks",
  { followed: jA.length, control: jB.length, firstDiff, a: jA[firstDiff], b: jB[firstDiff] });

// ---- (c) kill the projector at a random point of every page, for a whole replay; equal to the clean copy ----
const cli = path.join(REPO, "packages/reporting/dist/cli.js");
const runCli = (env: Record<string, string>, args: string[]) => new Promise<{ code: number | null; signal: string | null; lines: any[] }>((resolve) => {
  const child = spawn(process.execPath, [cli, ...args], { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let text = "";
  child.stdout.on("data", (d) => (text += d));
  child.stderr.on("data", (d) => (text += d));
  child.on("close", (code, signal) => resolve({ code, signal, lines: text.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } }) }));
});
const kills: Record<string, number> = {};
let killRuns = 0;
for (let seed = 0; ; seed++) {
  const w = await new reporting.Projector({ sql: pg["rpt_kill"], source: new reporting.StoreSource(readUrl, A.db) }).watermark().catch(() => null);
  if (w && w.after >= P_H) break;
  assert(seed < 2000, "kill run did not finish");
  const r = await runCli({ RPT_PG_URL: pgUrl("rpt_kill"), RPT_DIE: "random", RPT_DIE_PAGE: "1", RPT_DIE_SEED: String(seed) },
    ["follow", "--reader", readUrl, "--database", A.db, "--page-limit", "3", "--wait-ms", "0", "--until-position", String(P_H)]);
  killRuns++;
  const died = r.lines.find((l) => l.kind === "die");
  if (died) kills[died.point] = (kills[died.point] ?? 0) + 1;
  else if (r.code !== 0) { log("kill-run-error", { lines: r.lines.slice(-5) }); throw new Error("kill run failed"); }
}
const tableDump = async (sql: any) => ({
  facts: (await sql`SELECT * FROM rpt.facts ORDER BY account, assertion_id`).map((r: any) => factKey(r) + `|${r.removed_position}`),
  entities: (await sql`SELECT account, entity, kind, first_position FROM rpt.entities ORDER BY account, entity`).map((r: any) => JSON.stringify(r)),
  commits: (await sql`SELECT account, position, tx_id, recorded_at, changes FROM rpt.commits ORDER BY account, position, tx_id`).map((r: any) => JSON.stringify(r)),
  columns: (await sql`SELECT kind, attribute, value_type, column_name, status FROM rpt.columns ORDER BY kind, attribute, value_type`).map((r: any) => JSON.stringify(r)),
  watermark: Number((await sql`SELECT after_position FROM rpt.feed_state`)[0].after_position),
});
const same = (x: any, y: any) => ["facts", "entities", "commits", "columns", "watermark"].filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
const cleanDump = await tableDump(pg["rpt_clean"]);
const killDump = await tableDump(pg["rpt_kill"]);
check(same(cleanDump, killDump).length === 0, "c: copy built with a kill at every page equals the clean copy", { differ: same(cleanDump, killDump) });
log("c", { killRuns, kills, facts: killDump.facts.length });

// ---- two projectors at once on one copy ----
const two = [0, 1].map(() => new reporting.Projector({ sql: pg["rpt_two"], source: new reporting.StoreSource(readUrl, A.db), pageLimit: 4, waitMs: 0 }));
await two[0].install(); await two[0].start(0);
let lost = 0, applied = 0;
await Promise.all(two.map(async (pj: any) => {
  for (;;) {
    const w = await pj.watermark();
    if (w.after >= P_H) return;
    const s = await pj.step();
    if (s === null) lost++; else applied++;
  }
}));
const twoDump = await tableDump(pg["rpt_two"]);
check(same(cleanDump, twoDump).length === 0, "two projectors at once: equal to the clean copy", { differ: same(cleanDump, twoDump), lost, applied });
log("two", { pagesApplied: applied, pagesDiscardedBecauseTheOtherMovedFirst: lost });

// ---- (e) isolation ----
const relations = (await pg["rpt_clean"]`SELECT schemaname || '.' || quote_ident(relname) AS r FROM pg_stat_user_tables WHERE schemaname IN ('rpt')
  UNION ALL SELECT schemaname || '.' || quote_ident(viewname) FROM pg_views WHERE schemaname IN ('rpt', 'report')`).map((r: any) => r.r);
const iso: Record<string, any> = {};
for (const acct of ACCOUNTS) {
  const role = roleOf(acct);
  let own = 0, other = 0, denied = 0;
  for (const rel of relations) {
    try {
      const rows = await asRole(role, {}, (tx) => tx.unsafe(`SELECT * FROM ${rel}`));
      for (const r of rows) {
        if (r.account === undefined) continue;
        if (r.account === acct) own++; else other++;
      }
    } catch (error: any) {
      denied++;
      log("iso-denied", { role, rel, message: String(error.message).slice(0, 120) });
    }
  }
  const direct = await asRole(role, {}, (tx) => tx`SELECT count(*)::int AS n FROM rpt.facts WHERE entity = ${subjectId(acct === A3 ? A31 : A3, 4)}`);
  const spoof = await asRole(role, { "rpt.account": A3 }, (tx) => tx`SELECT count(*)::int AS n FROM rpt.facts WHERE account <> ${acct}`);
  check(other === 0 && direct[0].n === 0 && spoof[0].n === 0, `e: ${role} reads no other account's rows`, { own, other, direct: direct[0].n, spoof: spoof[0].n });
  iso[acct] = { relations: relations.length, ownRows: own, otherRows: other, deniedRelations: denied, directReadOfAnotherAccountsSubject: direct[0].n };
}
log("e", iso);

// ---- (f) lag under production-shaped saves, and (g) rebuild of account-003 while saves continue ----
const sizeOf = (n: number) => 2 + (n % 11);
let saving = true, saves = 0, saveErrors = 0;
const saver = (async () => {
  let i = 0;
  const started = Date.now();
  while (saving) {
    const acct = i % 3 === 0 ? A3 : A31;
    const sid = subjectId(acct, 1000 + i);
    const ops = Array.from({ length: sizeOf(i) }, (_, k) => a(sid, "Subject", k === 0 ? ":person/name" : `:form/q${k}`, S(`v ${i} ${k}`)));
    try { await transact(A, `save ${i}`, ops); saves++; } catch { saveErrors++; }
    i++;
    const due = started + i * 40; // 25 saves per second
    const wait = due - Date.now();
    if (wait > 0) await sleep(wait);
  }
})();
const lagStart = lag.length;
await sleep(Number(process.env["DX_RPT1_LAG_SECONDS"] ?? 30) * 1000);
const lagPages = lag.slice(lagStart);
// (g1) the rebuild reads at P while the follower keeps moving, so the swap catches up (P, G].
const rebuilder = new reporting.Projector({ sql: pg["rpt_clean"], source: new reporting.StoreSource(readUrl, A.db) });
const g1 = await rebuilder.rebuildAccount(A3, { beforeSwap: async () => { const p = await headOf(A.db); await waitWatermark(clean, p + 3, 30_000); } });
log("g1", g1);
// (g2) the follower paused, so the rebuild reads above the watermark and the follower then skips to the fence.
await pauseClean();
await sleep(2000);
const g2 = await rebuilder.rebuildAccount(A3);
resumeClean();
log("g2", g2);
await sleep(3000);
saving = false;
await saver;
const P_END = await headOf(A.db);
await waitWatermark(clean, P_END, 120_000);
const afterRebuild = compareFacts("g: after two rebuilds of account-003 during saves", storeFacts(await omitRows(A.db, P_END)), await copyFacts(pg["rpt_clean"], P_END));
const g1Views = b2Views;
await b2(pg["rpt_clean"], "g views", [P_END], [V_NOW]);
log("g", { P_END, saves, saveErrors, facts: afterRebuild, viewsChecked: b2Views - g1Views, g1CaughtUp: g1.caughtUp, g2Fence: g2.fence, g2Watermark: g2.watermark });
const pct = (xs: number[], q: number) => { const s = [...xs].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)] : null; };
const behindEntries = lagPages.map((s: any) => Math.max(0, s.head - s.next));
const behindMs = lagPages.filter((s: any) => s.newestRecordedAt !== null).map((s: any) => s.availableAt - s.newestRecordedAt + s.applyMs);
log("f", { pages: lagPages.length, journals: lagPages.reduce((n: number, s: any) => n + s.journals, 0), entriesBehind: { p50: pct(behindEntries, 0.5), p99: pct(behindEntries, 0.99), max: Math.max(0, ...behindEntries) },
  timeBehindMs: { p50: pct(behindMs, 0.5), p99: pct(behindMs, 0.99), max: Math.max(0, ...behindMs) },
  applyMs: { p50: pct(lagPages.map((s: any) => s.applyMs), 0.5), p99: pct(lagPages.map((s: any) => s.applyMs), 0.99) }, savesPerSecondOffered: 25, diagnostic: true });

// ---- cost: a whole replay into its own copy in one process; requests, CPU, the read gateway's journal counters ----
const readBefore = await reader.request("GET", "/v2/admin/scan-stats");
const replay = await runCli({ RPT_PG_URL: pgUrl("rpt_replay") }, ["follow", "--reader", readUrl, "--database", A.db, "--page-limit", "200", "--wait-ms", "0", "--until-position", String(P_END)]);
const readAfter = await reader.request("GET", "/v2/admin/scan-stats");
const writeStatsAfter = await writer.request("GET", "/v2/admin/scan-stats");
const done = replay.lines.find((l) => l.kind === "done");
const changesReplayed = replay.lines.filter((l) => l.kind === "page").reduce((n, l) => n + l.changes, 0);
const journalsReplayed = replay.lines.filter((l) => l.kind === "page").reduce((n, l) => n + l.journals, 0);
const writeRoutesSame = JSON.stringify(writeStatsBefore.routes) === JSON.stringify(writeStatsAfter.routes);
check(writeRoutesSame, "a: the write gateway received no request while the journals were read, the views compared and a whole replay ran", {});
const sizes = (await pg["rpt_replay"]`SELECT c.relname, pg_total_relation_size(c.oid)::bigint AS total, pg_relation_size(c.oid)::bigint AS heap,
  pg_indexes_size(c.oid)::bigint AS indexes, coalesce(pg_total_relation_size(nullif(c.reltoastrelid, 0)), 0)::bigint AS toast
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'rpt' AND c.relkind = 'r'`).map((r: any) => ({ ...r, total: Number(r.total), heap: Number(r.heap), indexes: Number(r.indexes), toast: Number(r.toast) }));
const factsN = Number((await pg["rpt_replay"]`SELECT count(*) AS n FROM rpt.facts`)[0].n);
const factBytes = sizes.find((s: any) => s.relname === "facts");
const allBytes = sizes.reduce((n: number, s: any) => n + s.total, 0);
const cpuMs = done ? (done.cpu.user + done.cpu.system) / 1000 : null;
log("cost", { facts: factsN, journals: journalsReplayed, changes: changesReplayed, factsTable: factBytes, bytesPerFactFactsTable: factBytes.total / factsN,
  bytesPerFactAllTables: allBytes / factsN, sizes, projectorCpuMsPerThousandChanges: cpuMs && (cpuMs / changesReplayed) * 1000,
  projectorRequests: done?.requests, readGatewayJournal: { before: readBefore.journalExamined, after: readAfter.journalExamined },
  readGatewayRoutesDelta: Object.fromEntries(Object.entries(readAfter.routes ?? {}).map(([k, v]: any) => [k, v - (readBefore.routes?.[k] ?? 0)]).filter(([, d]: any) => d)), diagnostic: true });

// ---- (d) no protected value anywhere in the copy's PostgreSQL: data files (tables, indexes, TOAST), WAL, pg_dump ----
for (const db of ["rpt_clean", "rpt_kill", "rpt_two", "rpt_replay"]) await pg[db]`CHECKPOINT`;
const needles = [...new Set(protectedValues)];
const scanScript = `const fs=require('fs'),path=require('path');const needles=JSON.parse(process.argv[1]);const counts={};const where={};
for(const n of needles){counts[n]=0;where[n]=[];}let files=0,bytes=0;
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.isFile()){const b=fs.readFileSync(p);files++;bytes+=b.length;
for(const n of needles){let i=-1,c=0;const nb=Buffer.from(n);while((i=b.indexOf(nb,i+1))!==-1)c++;if(c){counts[n]+=c;where[n].push(path.relative('/data',p).split('/').slice(0,2).join('/'));}}}}};
walk('/data');console.log(JSON.stringify({files,bytes,counts,where}));`;
const control = [`${CONTROL}-followed`];
const scan = JSON.parse(docker("run", "--rm", "--pull", "never", "--name", `${prefix}-scan`, "--network", "none", "--memory", "256m",
  "-v", `${prefix}-rpg-data:/data:ro`, process.env["RPT_NODE_IMAGE"]!, "node", "-e", scanScript, JSON.stringify([...needles, ...control])));
const protectedHits = needles.reduce((n, x) => n + scan.counts[x], 0);
const controlWhere = scan.where[control[0]] as string[];
check(protectedHits === 0, "d: no protected value in any file of the copy's data directory (tables, indexes, TOAST, WAL)", { hits: needles.filter((x) => scan.counts[x]).map((x) => [x, scan.where[x]]) });
check(scan.counts[control[0]] > 0 && controlWhere.some((w) => w.startsWith("base/")) && controlWhere.some((w) => w.startsWith("pg_wal")),
  "d: the control value is found in table files and in the WAL (the scan works)", { control: scan.counts[control[0]], where: [...new Set(controlWhere)] });
const dumps: Record<string, any> = {};
for (const db of ["rpt_clean", "rpt_kill", "rpt_two", "rpt_replay"]) {
  const text = docker("exec", `${prefix}-rpg`, "pg_dump", "-U", "postgres", db);
  dumps[db] = { bytes: text.length, protected: needles.filter((x) => text.includes(x)).length, control: text.includes(control[0]) };
  check(dumps[db].protected === 0 && dumps[db].control, `d: pg_dump of ${db} holds no protected value and holds the control`, dumps[db]);
}
const protectedRows = await pg["rpt_clean"]`SELECT value_type, count(*)::int AS n, count(removed_position)::int AS removed FROM rpt.facts WHERE attribute = ${PROTECTED} GROUP BY 1`;
const protectedCols = await pg["rpt_clean"]`SELECT kind, column_name, status FROM rpt.columns WHERE attribute = ${PROTECTED}`;
log("d", { protectedValuesWritten: needles.length, files: scan.files, bytesScanned: scan.bytes, protectedOccurrences: protectedHits,
  controlOccurrences: scan.counts[control[0]], controlFoundIn: [...new Set(controlWhere)], dumps, protectedRows, protectedCols });

// ---- the end ----
stopClean = true;
await (cleanLoop2 ?? cleanLoop);
for (const db of Object.keys(pg)) await pg[db].end({ timeout: 5 });
await admin.end({ timeout: 5 });
for (const rt of [A.write, A.importRt, B.write, B.importRt]) await rt.dispose();
log("summary", { counts, failures: failures.length, ms: Math.round(performance.now() - t0) });
fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ counts, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
