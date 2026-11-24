// [DX-XQ6] Exactness gate for the exact sweep (POST /v2/db/{db}/sweep), on a toy stack of this checkout's gateway with
// TX2_SWEEP=1. Counts are exact; times are diagnostic (Mac, lab VM).
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq6/gate.ts OUT WRITE_URL READ_URL PREFIX
// Writes go through Triplex's own runtime on the write gateway (an import through a client of write class "import");
// every check reads the read gateway. Brute force (independent of the sweep's read path): one history read of the
// whole scope at the position (lean/history-entity over d/history, not the as-of live read the sweep uses), then
// visibility at (position, valid time) and every condition recomputed here in TypeScript.
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
assert(out && writeUrl && readUrl && prefix?.startsWith("tx2-dxxq6"), "usage: gate.ts OUT WRITE_URL READ_URL PREFIX");
fs.mkdirSync(out, { recursive: true });
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "gate.jsonl"), line + "\n");
};
const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);
const failures: object[] = [];
const check = (ok: boolean, what: string, detail: object = {}) => {
  bump(ok ? "pass" : "fail");
  if (!ok) {
    failures.push({ what, ...detail });
    log("FAIL", { what, ...detail });
    if (failures.length > 25) throw new Error("too many failures");
  }
};
const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8" });

const A3 = "account-003", A31 = "account-0031", A9 = "account-009";
const ACCOUNTS = [A3, A31, A9];
const N = Number(process.env["DX_XQ6_SUBJECTS"] ?? 30);
const pad = (n: number) => String(n).padStart(8, "0");
const subjectId = (a: string, i: number) => `acct/${a}/pl:${pad(i)}`;
const taskId = (a: string, i: number, k: number) => `acct/${a}/tk:${pad(i)}:${k}`;
const formId = (a: string, k: number) => `acct/${a}/fm:${k}`;
const PROTECTED = ":privacy/identity-number";
const DAY = 86_400_000;
const T0 = Date.now();
const T_CORR = T0 - 10 * DAY, V_PAST1 = T0 - 20 * DAY, V_PAST2 = T0 - 5 * DAY, V_NOW = T0 + 3_600_000;
const T_FORM_END = T0 - 7 * DAY, T_IMPORT = T0 - 15 * DAY;

const scope = runtimeApi.DatabaseScope.test(`xq6-gate-${process.pid}-${Date.now()}`);
const writer = new datomic.DatomicClient(writeUrl, 60_000);
const importer = new datomic.DatomicClient(writeUrl, 60_000, undefined, { writeClass: "import" });
const reader = new datomic.DatomicClient(readUrl, 60_000);
const { db } = await writer.create(scope, "lean");
log("scope", { db });
let protectedScope = false;
try {
  await writer.declareProtection(db, [PROTECTED], false);
  protectedScope = true;
} catch (error) {
  log("protection-unavailable", { message: String((error as Error).message) });
}
const runtimeFor = (client: any) => {
  const definition = runtimeApi.Runtime.define({
    name: "datomic",
    storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(client, scope, { layout: "lean", serverRecordTime: true })),
    queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(client, scope)),
  });
  return ManagedRuntime.make(definition.layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
};
const write = runtimeFor(writer);
const importRt = runtimeFor(importer);
const run = (rt: any, f: (t: any) => any) => rt.runPromise(Effect.flatMap(core.Triples, f));

// ---- workload ----
const receipts: { label: string; position: number; instant: number }[] = [];
const live = new Map<string, any[]>();
const remember = (r: any) => { for (const t of r.triples) live.set(t.entityId, [...(live.get(t.entityId) ?? []), t]); };
const transact = async (label: string, ops: object[], rt = write) => {
  const r = await run(rt, (t) => t.transact(ops, { actor: "xq6-gate" }));
  receipts.push({ label, position: r.position, instant: r.instant });
  remember(r);
  return r;
};
const a = (entityId: string, entityType: string, attribute: string, value: object, validFrom = 0, validTo?: number) =>
  ({ op: "assert", entityId, entityType, attribute, value, validFrom, ...(validTo !== undefined ? { validTo } : {}) });
const S = (v: string) => ({ type: "string", value: v });
const I = (v: number) => ({ type: "integer", value: String(v) });
const R = (v: string) => ({ type: "ref", value: v });
const STATUSES = ["pending", "complete", "requires_action"];
const factsOf = (id: string, attribute: string) => (live.get(id) ?? []).filter((t: any) => t.attribute === attribute);
const retractAll = (id: string, attribute?: string) =>
  (live.get(id) ?? []).filter((t: any) => !attribute || t.attribute === attribute).map((t: any) => ({ op: "retract", id: t.id }));

const t0 = performance.now();
// 1. Create, in two accounts (account-009 stays empty): subjects with five value families, two tasks each, forms.
for (const acct of [A3, A31]) {
  for (let k = 0; k < 4; k++) await transact(`form ${acct} ${k}`, [a(formId(acct, k), "Form", ":form/name", S(`form ${k}`))]);
  for (let i = 0; i < N; i += 10) {
    const ops: object[] = [];
    for (let j = i; j < Math.min(N, i + 10); j++) {
      const s = subjectId(acct, j);
      ops.push(a(s, "Subject", ":person/name", S(`name ${j}`)), a(s, "Subject", ":person/score", I(j * 3)),
        a(s, "Subject", ":person/rating", { type: "number", value: (j % 7) / 7 }),
        a(s, "Subject", ":person/active", { type: "boolean", value: j % 3 !== 0 }),
        a(s, "Subject", ":person/joined", { type: "datetime", value: T0 - (j + 1) * DAY }));
      for (const k of [0, 1]) {
        const t = taskId(acct, j, k);
        ops.push(a(t, "Task", ":task/status", S(STATUSES[(j + k) % 3]!)), a(t, "Task", ":task/progress", I((j * 7 + k * 13) % 100)),
          a(t, "Task", ":task/due", { type: "datetime", value: T0 + ((j % 11) - 5) * DAY }));
        if ((j + k) % 4 !== 0) ops.push(a(t, "Task", ":task/assignee", R(subjectId(acct, (j + 1) % N))));
        ops.push(a(t, "Task", ":task/form", R(formId(acct, (j + k) % 4)), 0, j % 5 === 0 ? T_FORM_END : undefined));
      }
    }
    await transact(`create ${acct} ${i}`, ops);
  }
}
// A subject with 200 forms (200 attributes on one entity), in four saves.
const WIDE = subjectId(A3, 7);
for (let part = 0; part < 4; part++)
  await transact(`wide ${part}`, Array.from({ length: 50 }, (_, k) => a(WIDE, "Subject", `:form/f${String(part * 50 + k).padStart(3, "0")}`, S(`answer ${part * 50 + k}`))));
// Protected values for five subjects of account-003 (removed on request later).
if (protectedScope)
  await transact("protected values", [0, 1, 2, 3, 4].map((j) => a(subjectId(A3, j), "Subject", PROTECTED, S(`IDN-${9000 + j}`))));
const P_A = receipts.at(-1)!.position;
// 2. Corrections dated in the past (old value valid until T_CORR, new value from T_CORR), and retirements.
for (const acct of [A3, A31]) {
  const ops: object[] = [];
  for (let j = 0; j < N; j += 4) {
    const s = subjectId(acct, j);
    ops.push(...retractAll(s, ":person/score"), a(s, "Subject", ":person/score", I(j * 3), 0, T_CORR), a(s, "Subject", ":person/score", I(j * 3 + 100), T_CORR));
  }
  for (let j = 1; j < N; j += 5) ops.push(...retractAll(taskId(acct, j, 1)));
  for (let j = 2; j < N; j += 6) ops.push(...retractAll(taskId(acct, j, 0), ":task/status"), a(taskId(acct, j, 0), "Task", ":task/status", S("complete")));
  await transact(`corrections ${acct}`, ops);
}
const P_B = receipts.at(-1)!.position;
// 3. An import (write class "import"): new subjects of account-0031 valid from a past instant, and a backdated value.
await transact("import", [
  ...Array.from({ length: 6 }, (_, k) => [
    a(subjectId(A31, N + k), "Subject", ":person/name", S(`imported ${k}`), T_IMPORT),
    a(subjectId(A31, N + k), "Subject", ":person/score", I(500 + k), T_IMPORT),
  ]).flat(),
  a(subjectId(A31, 3), "Subject", ":person/active", { type: "boolean", value: true }, T_IMPORT),
], importRt);
// 4. Removal on request of three subjects' protected values.
let removal: any = { run: false };
if (protectedScope) {
  const erased = await writer.erase(db, `xq6-erase-${process.pid}`, [0, 1, 2].map((j) => ({ entityId: subjectId(A3, j), attribute: PROTECTED })));
  const head = await reader.basis(db, { position: Number((await writer.basis(db)).position.v), waitMs: 2000 });
  removal = { run: true, erased, position: Number(head.position.v) };
  receipts.push({ label: "removal", position: Number(head.position.v), instant: Number.NaN });
}
// 5. Settlement in progress: a release writes :task/next-form for account-003's tasks in frames of 8 tasks; two frames
//    now, the rest between sweep pages below.
const settleTasks = Array.from({ length: N }, (_, j) => [0, 1].map((k) => taskId(A3, j, k))).flat()
  .filter((t) => factsOf(t, ":task/status").length > 0 || (live.get(t) ?? []).length > 0);
let settled = 0;
const settleFrame = async () => {
  const frame = settleTasks.slice(settled, settled + 8);
  settled += frame.length;
  if (frame.length) await transact(`settle ${settled}`, frame.map((t) => a(t, "Task", ":task/next-form", S("F2"))));
  return frame.length;
};
await settleFrame(); await settleFrame();
const P_H0 = Number((await reader.basis(db, { position: receipts.at(-1)!.position, waitMs: 2000 })).position.v);
log("workload", { receipts: receipts.length, P_A, P_B, P_H0, removal, workloadMs: Math.round(performance.now() - t0) });

// ---- brute force ----
const histories = new Map<number, any[]>();
const historyAt = async (p: number) => {
  if (!histories.has(p)) histories.set(p, await reader.rows(db, { pattern: {}, history: true, basis: { recordedPosition: p, validAt: 0 } }));
  return histories.get(p)!;
};
const visible = (r: any, p: number, v: number) =>
  r.recorded_position <= p && !(r.retracted_position != null && r.retracted_position <= p) &&
  r.valid_from <= v && (r.valid_to == null || r.valid_to > v);
type Val = [string, any];
const rowValue = (r: any): Val => {
  switch (r.value_type) {
    case "string": case "ref": return [r.value_type, r.value_string];
    case "integer": return ["integer", BigInt(r.value_string)];
    case "number": return ["number", Number(r.value_number)];
    case "datetime": return ["datetime", Number(r.value_datetime)];
    case "boolean": return ["boolean", r.value_boolean === true || Number(r.value_boolean) === 1];
    default: return [r.value_type, null];
  }
};
const condValue = (v: any): Val => [v.type, v.type === "integer" ? BigInt(v.value) : v.value];
const cmp = (x: any, y: any) => (x < y ? -1 : x > y ? 1 : 0);
const same = (x: Val, y: Val) => x[0] === y[0] && x[1] !== null && cmp(x[1], y[1]) === 0;
const holds = (c: any, values: Val[]) => {
  switch (c.op) {
    case "exists": return values.length > 0;
    case "missing": return values.length === 0;
    case "eq": return values.some((x) => same(x, condValue(c.value)));
    case "in": return values.some((x) => c.values.some((y: any) => same(x, condValue(y))));
    case "prefix": return values.some((x) => x[0] === "string" && typeof x[1] === "string" && x[1].startsWith(c.value.value));
    case "range": {
      const lo = c.from ?? c.fromExclusive, hi = c.to ?? c.toExclusive, fam = (lo ?? hi).type;
      return values.some((x) => x[0] === fam && x[1] !== null &&
        (!lo || (c.fromExclusive ? cmp(x[1], condValue(lo)[1]) > 0 : cmp(x[1], condValue(lo)[1]) >= 0)) &&
        (!hi || (c.toExclusive ? cmp(x[1], condValue(hi)[1]) < 0 : cmp(x[1], condValue(hi)[1]) <= 0)));
    }
  }
  throw new Error(`op ${c.op}`);
};
const shapeRe = (shape?: string) => shape === undefined ? undefined
  : new RegExp("^" + shape.replace(/\{(\d+) digits\}/g, "[0-9]{$1}").replace(/\{digits\}/g, "[0-9]+").replace(/\{segment\}/g, "[^:/]+") + "$");
const keyOf = (v: Val | null) => JSON.stringify(v === null ? null : [v[0], typeof v[1] === "bigint" ? String(v[1]) : v[1]]);
const brute = async (q: any, p: number, v: number) => {
  const base = `acct/${q.account}/`, start = base + (q.from?.prefix ?? ""), re = shapeRe(q.from?.shape);
  const bySubject = new Map<string, any[]>();
  for (const r of await historyAt(p))
    if (r.entity_id.startsWith(start) && (!re || re.test(r.entity_id.slice(base.length))) && visible(r, p, v))
      bySubject.set(r.entity_id, [...(bySubject.get(r.entity_id) ?? []), r]);
  const values = (rows: any[], attr: string) => rows.filter((r) => r.attribute === attr).map(rowValue);
  const ids = [...bySubject.keys()].sort().filter((id) => (q.where ?? []).every((c: any) => holds(c, values(bySubject.get(id)!, c.attribute))));
  const groups = new Map<string, number>();
  if (q.result === "countByValue")
    for (const id of ids) {
      const vs = [...new Set(values(bySubject.get(id)!, q.of).map(keyOf))];
      for (const k of vs.length ? vs : [keyOf(null)]) groups.set(k, (groups.get(k) ?? 0) + 1);
    }
  const projected = ids.map((id) => Object.fromEntries((q.project ?? []).map((attr: string) => [attr, values(bySubject.get(id)!, attr).map(keyOf).sort()])));
  return { ids, groups, projected };
};

// ---- the sweep, page by page ----
const sweep = (request: any) => datomic.sweepPageWaiting(reader, db, request);
const allPages = async (request: any, between?: (n: number) => Promise<void>) => {
  const pages: any[] = [];
  let cursor: string | null = null;
  for (let n = 0; ; n++) {
    assert(n < 20000, "a cursor must end");
    const { basis: _b, atLeastPosition: _a, ...rest } = request;
    const page = await sweep(cursor ? { ...rest, cursor } : request);
    pages.push(page);
    if (!page.next) return pages;
    if (between) await between(n);
    cursor = page.next;
  }
};
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
const pagings = [{ limit: 3, bounds: { subjects: 5 } }, { limit: 1000, bounds: { subjects: 7 } }, { limit: 1000, bounds: { subjects: 10000, ms: 2000 } }];
const compare = (label: string, q: any, pages: any[], expected: any, p: number, v: number, paging: any) => {
  const last = pages.at(-1);
  check(pages.every((x) => x.position === p && x.validAt === v && x.facts === "stored"), "every page at the question's position and valid time", { label, p, v });
  check(pages.every((x, i) => x.complete === (i === pages.length - 1)), "only the last page is complete", { label });
  check(pages.every((x) => x.examined <= (paging.bounds?.subjects ?? 256)), "subjects per page within the bound", { label });
  const result = q.result ?? "ids";
  if (result === "ids") {
    check(pages.every((x) => x.ids.length <= (paging.limit ?? 100)), "matches per page within the limit", { label });
    const got = pages.flatMap((x) => x.ids);
    check(JSON.stringify(got) === JSON.stringify(expected.ids), "ids equal brute force", { label, got: got.slice(0, 12), expected: expected.ids.slice(0, 12), n: got.length, m: expected.ids.length });
    if (q.project?.length) {
      const proj = pages.flatMap((x) => x.projected).map((m: any) => Object.fromEntries(Object.entries(m).map(([k, vs]: any) => [k, vs.map((w: any) => keyOf(condValue(w))).sort()])));
      check(JSON.stringify(proj) === JSON.stringify(expected.projected), "projected values equal brute force", { label });
    }
    bump("ids-compared", got.length);
  } else if (result === "count") {
    check(last.count === expected.ids.length && last.countComplete === true, "count equals brute force", { label, got: last.count, expected: expected.ids.length });
    bump("counted", last.count);
  } else {
    const got = new Map(last.groups.map((g: any) => [keyOf(g.value === null ? null : condValue(g.value)), g.count]));
    check(JSON.stringify([...got.entries()].sort()) === JSON.stringify([...expected.groups.entries()].sort()), "groups equal brute force", { label, got: [...got.entries()], expected: [...expected.groups.entries()] });
  }
  for (const x of pages) for (const id of x.ids ?? []) check(id.startsWith(`acct/${q.account}/`), "no ID of another account", { label, id });
  check(!/IDN-9/.test(JSON.stringify(pages)), "no protected value in any answer", { label });
  bump("sweeps"); bump("pages", pages.length);
};

// ---- G1: every accepted shape, three accounts, three positions, three valid instants, three page sizes ----
let g1 = 0;
const signatures = new Map<string, Set<string>>();
const POSITIONS = [P_A, P_B, P_H0];
const INSTANTS = [V_PAST1, V_PAST2, V_NOW];
for (const acct of ACCOUNTS)
  for (const [qi, base] of questions(acct).entries())
    for (const p of POSITIONS)
      for (const v of INSTANTS) {
        const { name, ...q } = { ...base, account: acct };
        const paging = pagings[(qi + g1) % pagings.length]!;
        const pages = await allPages({ ...q, ...paging, basis: { recordedPosition: p, validAt: v } });
        const expected = await brute(q, p, v);
        compare(`${acct} ${name} p=${p} v=${v}`, q, pages, expected, p, v, paging);
        const sig = `${acct} ${name}`;
        signatures.set(sig, (signatures.get(sig) ?? new Set()).add(JSON.stringify([expected.ids, [...expected.groups.entries()].sort()])));
        if (expected.ids.length === 0) bump("empty-answers");
        g1++;
      }
// Non-vacuity: how many (account, question) pairs have different true answers across the nine (position, valid time).
const varying = [...signatures.entries()].filter(([, v]) => v.size > 1).map(([k, v]) => `${k}: ${v.size}`);
log("G1", { sweeps: g1, counts, questionsWhoseAnswerChangesAcrossPositionsAndInstants: varying.length, of: signatures.size, varying });

// "Valid now" and "latest" by default: the answer states both, and is exact at what it states.
{
  const q = { account: A3, ...questions(A3)[2] }; delete (q as any).name;
  const before = Date.now();
  const pages = await allPages({ ...q, limit: 4, bounds: { subjects: 9 } });
  const p = pages[0].position, v = pages[0].validAt;
  // The gateway's clock is the lab VM's; allow two seconds of skew against this process's clock.
  check(p === P_H0 && v >= before - 2000 && v <= Date.now() + 2000, "default basis: the head and the gateway's clock, stated", { p, v, before, skewMs: v - before });
  compare("default basis", q, pages, await brute(q, p, v), p, v, { limit: 4, bounds: { subjects: 9 } });
  // A record time resolves to a stated position, and the answer is exact there.
  for (const r of receipts.filter((x) => Number.isFinite(x.instant)).filter((_, i) => i % 7 === 0)) {
    const pg = await allPages({ ...q, basis: { recordedAt: r.instant, validAt: V_NOW } });
    check(pg[0].position >= r.position, "record time at or after its commit", { r, position: pg[0].position });
    compare("record time", q, pg, await brute(q, pg[0].position, V_NOW), pg[0].position, V_NOW, { limit: 100 });
  }
}

// ---- Between pages: saves, a removal on request, settlement frames and a read-gateway restart ----
const between = async (label: string, q: any, act: (n: number) => Promise<void>) => {
  const p = Number((await reader.basis(db)).position.v);
  const pages = await allPages({ ...q, limit: 2, bounds: { subjects: 4 }, basis: { recordedPosition: p, validAt: V_NOW } }, act);
  compare(label, q, pages, await brute(q, p, V_NOW), p, V_NOW, { limit: 2, bounds: { subjects: 4 } });
  const head = Number((await reader.basis(db)).position.v);
  check(head > p, `${label}: the head moved during the sweep`, { p, head });
  const [atP, atHead] = [await brute(q, p, V_NOW), await brute(q, head, V_NOW)];
  const differs = JSON.stringify([atP.ids, atP.projected]) !== JSON.stringify([atHead.ids, atHead.projected]);
  const fresh = await allPages({ ...q, basis: { recordedPosition: head, validAt: V_NOW } });
  compare(`${label} at the new head`, q, fresh, await brute(q, head, V_NOW), head, V_NOW, { limit: 100 });
  return { label, position: p, head, pages: pages.length, trueAnswerDiffersAtHead: differs, matchesAtP: atP.ids.length, matchesAtHead: atHead.ids.length };
};
const pendingQ = { account: A3, from: TASKS, where: [{ attribute: ":task/status", op: "eq", value: S("pending") }], project: [":task/status"] };
const b1 = await between("subjects changed between pages", pendingQ, async (n) => {
  // Change tasks the sweep has not reached yet (and one it has), create a task after the end, retire a fact.
  const j = Math.min(N - 1, 6 + n * 2);
  await transact(`between ${n}`, [
    ...retractAll(taskId(A3, j, 0), ":task/status"), a(taskId(A3, j, 0), "Task", ":task/status", S(n % 2 ? "pending" : "complete")),
    a(taskId(A3, N + 50 + n, 0), "Task", ":task/status", S("pending")),
    ...retractAll(taskId(A3, 0, 0), ":task/status").slice(0, n === 1 ? 1 : 0),
  ]);
});
let b2: any = { run: false };
if (protectedScope) {
  const subjectsQ = { account: A3, from: SUBJECTS, where: [{ attribute: ":person/name", op: "exists" }], project: [":person/name"] };
  b2 = await between("removal on request between pages", subjectsQ, async (n) => {
    if (n === 0 || n === 2) {
      const j = n === 0 ? 3 : 4;
      await writer.erase(db, `xq6-erase-between-${n}-${process.pid}`, [{ entityId: subjectId(A3, j), attribute: PROTECTED }]);
      await reader.basis(db, { position: Number((await writer.basis(db)).position.v), waitMs: 2000 });
    }
  });
}
const settleQ = { account: A3, from: TASKS, where: [{ attribute: ":task/next-form", op: "exists" }], project: [":task/next-form"] };
const b3 = await between("settlement frames between pages", settleQ, async () => { await settleFrame(); });
const restartReader = async () => {
  docker("restart", `${prefix}-gw-r`);
  for (let i = 0; i < 180; i++) {
    try { if ((await fetch(`${readUrl}/health`, { signal: AbortSignal.timeout(2000) })).ok) return; } catch {}
    await new Promise((s) => setTimeout(s, 1000));
  }
  throw new Error("read gateway did not come back");
};
let restarted = false;
const b4 = await between("read gateway restarted between pages", { account: A31, from: SUBJECTS, result: "count", where: [{ attribute: ":person/score", op: "range", from: I(50) }] }, async (n) => {
  if (n === 1) { await restartReader(); restarted = true; }
  if (n === 2) await transact("after restart", [a(subjectId(A31, 1), "Subject", ":person/score", I(999))]);
});
check(restarted, "the read gateway was restarted inside a sweep");
for (const b of [b1, b3, b4]) check(b.trueAnswerDiffersAtHead, "the true answer moved between the cursor's position and the head (the test can fail)", b);
log("between", { b1, b2, b3, b4, settledFrames: settled });

// ---- One subject's answer equals what `read` returns for it (the pinned read route, POST read with entityIds) ----
{
  let compared = 0;
  for (const [p, v] of [[P_A, V_PAST1], [P_B, V_PAST2], [P_H0, V_NOW]] as const) {
    const q = { account: A3, from: TASKS, where: [{ attribute: ":task/status", op: "exists" }], project: [":task/status", ":task/due", ":task/assignee", ":task/progress"] };
    const pages = await allPages({ ...q, basis: { recordedPosition: p, validAt: v } });
    const ids = pages.flatMap((x: any) => x.ids), projected = pages.flatMap((x: any) => x.projected);
    for (const [i, id] of ids.entries()) {
      const rows = await reader.rows(db, { entityIds: [id], basis: { recordedPosition: p, validAt: v } });
      for (const attr of q.project) {
        const fromRead = rows.filter((r: any) => r.attribute === attr).map((r: any) => keyOf(rowValue(r))).sort();
        const fromSweep = projected[i][attr].map((w: any) => keyOf(condValue(w))).sort();
        check(JSON.stringify(fromRead) === JSON.stringify(fromSweep), "a subject's swept values equal what read returns", { id, attr, p, v });
        compared++;
      }
    }
  }
  log("equals-read", { compared });
}

// ---- Refusals and isolation ----
const code = (f: () => Promise<unknown>) => f().then(() => "accepted", (e: any) => e?.code ?? String(e));
const page1 = await datomic.sweepPage(reader, db, { ...pendingQ, limit: 2, bounds: { subjects: 3 } });
const cursor = page1.next as string;
const tampered = (() => { const [body, sig] = cursor.split("."); const json = JSON.parse(Buffer.from(body!, "base64url").toString());
  json.account = A31; return `${Buffer.from(JSON.stringify(json)).toString("base64url")}.${sig}`; })();
const forged = (() => { const [body, sig] = cursor.split("."); const json = JSON.parse(Buffer.from(body!, "base64url").toString());
  json.last = subjectId(A31, 2); json.position = 1; return `${Buffer.from(JSON.stringify(json)).toString("base64url")}.${sig}`; })();
const { project: _p, ...pendingNoProject } = pendingQ;
for (const [label, request, expected] of [
  ["protected attribute in where", { account: A3, from: SUBJECTS, where: [{ attribute: PROTECTED, op: "eq", value: S("IDN-9003") }] }, "ProtectedValueLookup"],
  ["protected attribute in prefix", { account: A3, from: SUBJECTS, where: [{ attribute: PROTECTED, op: "prefix", value: S("IDN") }] }, "ProtectedValueLookup"],
  ["protected attribute exists", { account: A3, from: SUBJECTS, where: [{ attribute: PROTECTED, op: "exists" }] }, "ProtectedValueLookup"],
  ["protected attribute projected", { account: A3, from: SUBJECTS, project: [PROTECTED] }, "ProtectedValueLookup"],
  ["protected attribute grouped", { account: A3, from: SUBJECTS, result: "countByValue", of: PROTECTED }, "ProtectedValueLookup"],
  ["cursor in another account", { ...pendingQ, account: A31, cursor }, "CursorMismatch"],
  ["cursor naming another account's ID (edited)", { ...pendingQ, cursor: forged }, "CursorMismatch"],
  ["cursor edited to another account", { ...pendingQ, account: A31, cursor: tampered }, "CursorMismatch"],
  ["cursor with another question", { ...pendingNoProject, cursor }, "CursorMismatch"],
  ["cursor with another position", { ...pendingQ, cursor, basis: { recordedPosition: P_A } }, "CursorMismatch"],
  ["no account", { from: SUBJECTS }, "AccountRequired"],
  ["malformed account", { account: "account-003/../account-0031" }, "InvalidValue"],
  ["not-equal", { account: A3, where: [{ attribute: ":task/status", op: "ne", value: S("x") }] }, "UnsupportedOperation"],
  ["json value", { account: A3, where: [{ attribute: ":task/status", op: "eq", value: { type: "json", value: "{}" } }] }, "UnsupportedOperation"],
  ["nine conditions", { account: A3, where: Array.from({ length: 9 }, () => ({ attribute: ":task/status", op: "exists" })) }, "UnsupportedOperation"],
] as const) {
  const got = protectedScope || !String(label).startsWith("protected") ? await code(() => datomic.sweepPage(reader, db, request)) : expected;
  check(got === expected, `refusal: ${label}`, { got, expected });
  bump("refusals");
}
// The cursor still works for its own question and account after the refusals.
check((await datomic.sweepPage(reader, db, { ...pendingQ, limit: 2, bounds: { subjects: 3 }, cursor })).position === page1.position, "the cursor continues its own question");

// ---- Busy: 12 sweeps of one account and 3 of another at once (one permit, one sweep per account); each either
//      SweepBusy after its queue wait or exact. ----
const burstQ = { account: A3, from: TASKS, result: "count", bounds: { subjects: 10000, ms: 2000 } };
const truth = (await brute(burstQ, P_H0, V_NOW)).ids.length;
const burst = await Promise.all([...Array.from({ length: 12 }, () => burstQ), ...Array.from({ length: 3 }, () => ({ ...burstQ, account: A31 }))]
  .map((r) => datomic.sweepPage(reader, db, { ...r, basis: { recordedPosition: P_H0, validAt: V_NOW } }).then((x: any) => x, (e: any) => e)));
const busy = burst.filter((x: any) => x?.code === "SweepBusy").length;
const okA3 = burst.slice(0, 12).filter((x: any) => typeof x?.count === "number");
check(busy + burst.filter((x: any) => typeof x?.count === "number").length === 15, "burst: SweepBusy or an answer");
check(okA3.every((x: any) => x.count === truth && x.complete), "burst: every answer exact", { truth, got: okA3.map((x: any) => x.count) });
const stats = await reader.request("GET", "/v2/admin/scan-stats");
const threads = await reader.request("GET", "/v2/admin/threads");
log("busy", { busy, answered: 15 - busy, sweepStats: stats.sweep, readPermitsFree: threads.readPermitsFree });

log("PASS?", { failures: failures.length, counts });
fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ db, positions: { P_A, P_B, P_H0 }, instants: { V_PAST1, V_PAST2, V_NOW, T_CORR }, counts, failures, removal, protectedScope }, null, 2));
await Promise.all([write.dispose(), importRt.dispose()]);
await writer.delete(scope);
writer.close(); importer.close(); reader.close();
process.exitCode = failures.length ? 1 : 0;
