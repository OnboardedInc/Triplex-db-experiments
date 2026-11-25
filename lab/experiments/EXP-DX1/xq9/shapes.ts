// [DX-XQ9] Exactness gate for the sweep's added question shapes (TX2_SWEEP_SHAPES=all), on a toy stack of this
// checkout's gateway. Counts are exact; times are diagnostic (Mac, lab VM).
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq9/shapes.ts OUT WRITE_URL READ_URL PREFIX
// Writes go through Triplex's own runtime on the write gateway. Brute force, independent of the sweep's read path (the
// sweep builder's method, xq6/gate.ts): one history read of the whole scope at the position (lean/history-entity over
// d/history, not the as-of live read the sweep uses), visibility at (position, valid time), then every condition,
// related entity, OR group, order and sum recomputed here in TypeScript.
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
assert(out && writeUrl && readUrl && prefix?.startsWith("tx2-dx"), "usage: shapes.ts OUT WRITE_URL READ_URL PREFIX");
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
const N = Number(process.env["DX_XQ9_SUBJECTS"] ?? 30);
const pad = (n: number) => String(n).padStart(8, "0");
const subjectId = (a: string, i: number) => `acct/${a}/pl:${pad(i)}`;
const placementId = (a: string, i: number, p: number) => `acct/${a}/pl:${pad(i)}:p${p}`;
const taskId = (a: string, i: number, k: number) => `acct/${a}/tk:${pad(i)}:${k}`;
const formId = (a: string, i: number, k: number) => `acct/${a}/fo:${pad(i)}:${k}`;
const PROTECTED = ":privacy/identity-number";
const DAY = 86_400_000;
const T0 = Date.now();
const T_CORR = T0 - 10 * DAY, V_PAST1 = T0 - 20 * DAY, V_PAST2 = T0 - 5 * DAY, V_NOW = T0 + 3_600_000;
const T_END = T0 - 7 * DAY, T_LATE = T0 - 15 * DAY;

const scope = runtimeApi.DatabaseScope.test(`xq9-gate-${process.pid}-${Date.now()}`);
const writer = new datomic.DatomicClient(writeUrl, 60_000);
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
const definition = runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
});
const write = ManagedRuntime.make(definition.layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const run = (f: (t: any) => any) => write.runPromise(Effect.flatMap(core.Triples, f));

// ---- workload ----
const receipts: { label: string; position: number }[] = [];
const live = new Map<string, any[]>();
const transact = async (label: string, ops: object[]) => {
  const r = await run((t) => t.transact(ops, { actor: "xq9-gate" }));
  receipts.push({ label, position: r.position });
  for (const t of r.triples) live.set(t.entityId, [...(live.get(t.entityId) ?? []), t]);
  return r;
};
const a = (entityId: string, entityType: string, attribute: string, value: object, validFrom = 0, validTo?: number) =>
  ({ op: "assert", entityId, entityType, attribute, value, validFrom, ...(validTo !== undefined ? { validTo } : {}) });
const S = (v: string) => ({ type: "string", value: v });
const I = (v: number) => ({ type: "integer", value: String(v) });
const R = (v: string) => ({ type: "ref", value: v });
const STATUSES = ["pending", "complete", "requires_action"];
const NAMES = (j: number) => (j % 7 === 3 ? `Smith ${j}` : j % 7 === 5 ? `anna smithers ${j}` : j % 11 === 4 ? `ÉLODIE ${j}` : `name ${j}`);
const retractAll = (id: string, attribute?: string) =>
  (live.get(id) ?? []).filter((t: any) => !attribute || t.attribute === attribute).map((t: any) => ({ op: "retract", id: t.id }));

const t0 = performance.now();
for (const acct of [A3, A31]) {
  for (let i = 0; i < N; i += 10) {
    const ops: object[] = [];
    for (let j = i; j < Math.min(N, i + 10); j++) {
      const s = subjectId(acct, j);
      ops.push(a(s, "Subject", ":person/name", S(NAMES(j))), a(s, "Subject", ":person/score", I(j * 3)),
        a(s, "Subject", ":person/rank", I(j % 4)),
        a(s, "Subject", ":person/rating", { type: "number", value: (j % 7) / 7 }),
        a(s, "Subject", ":person/joined", { type: "datetime", value: T0 - (j + 1) * DAY }));
      if (j % 3 !== 0) ops.push(a(s, "Subject", ":person/active", { type: "boolean", value: j % 2 === 0 }));
      for (const p of j % 2 === 0 ? [0, 1] : [0]) {
        ops.push(a(s, "Subject", ":person/placement", R(placementId(acct, j, p))),
          a(placementId(acct, j, p), "Placement", ":placement/status", S(p === 0 ? "active" : "ended"), 0, p === 1 && j % 4 === 0 ? T_END : undefined));
      }
      for (const k of [0, 1]) {
        const t = taskId(acct, j, k);
        ops.push(a(t, "Task", ":task/status", S(STATUSES[(j + k) % 3]!)), a(t, "Task", ":task/progress", I((j * 7 + k * 13) % 100)),
          a(t, "Task", ":task/subject", R(s)));
        if ((j + k) % 4 !== 0) ops.push(a(t, "Task", ":task/assignee", R(subjectId(acct, (j + 1) % N))));
      }
      for (let k = 0; k < j % 3; k++)
        ops.push(a(formId(acct, j, k), "Form", ":form/type", S(k === 0 ? "W4" : "I9"), j % 5 === 1 ? T_LATE : 0),
          a(formId(acct, j, k), "Form", ":form/status", S((j + k) % 2 ? "pending" : "complete")));
    }
    await transact(`create ${acct} ${i}`, ops);
  }
}
// A reference from account-003 to account-0031's placement: never followed (the related entity must be in the account).
await transact("cross-account reference", [a(subjectId(A3, 2), "Subject", ":person/placement", R(placementId(A31, 2, 1)))]);
if (protectedScope)
  await transact("protected values", [0, 1, 2, 3, 4].map((j) => a(subjectId(A3, j), "Subject", PROTECTED, S(`IDN-${9000 + j}`))));
const P_A = receipts.at(-1)!.position;
// Corrections dated in the past, retirements of children, a status replaced, a form added late.
for (const acct of [A3, A31]) {
  const ops: object[] = [];
  for (let j = 0; j < N; j += 4) {
    const s = subjectId(acct, j);
    ops.push(...retractAll(s, ":person/score"), a(s, "Subject", ":person/score", I(j * 3), 0, T_CORR), a(s, "Subject", ":person/score", I(j * 3 + 100), T_CORR));
  }
  for (let j = 1; j < N; j += 5) ops.push(...retractAll(taskId(acct, j, 1)));
  for (let j = 2; j < N; j += 6) ops.push(...retractAll(taskId(acct, j, 0), ":task/status"), a(taskId(acct, j, 0), "Task", ":task/status", S("complete")));
  for (let j = 0; j < N; j += 7) ops.push(...retractAll(formId(acct, j, 0)), a(formId(acct, j, 2), "Form", ":form/type", S("W4")), a(formId(acct, j, 2), "Form", ":form/status", S("pending")));
  await transact(`corrections ${acct}`, ops);
}
const P_B = receipts.at(-1)!.position;
// New subjects valid from a past instant, and a removal on request.
await transact("late subjects", Array.from({ length: 4 }, (_, k) => [
  a(subjectId(A31, N + k), "Subject", ":person/name", S(`late smith ${k}`), T_LATE),
  a(subjectId(A31, N + k), "Subject", ":person/rank", I(2), T_LATE),
  a(taskId(A31, N + k, 0), "Task", ":task/status", S("pending"), T_LATE),
]).flat());
let removal: any = { run: false };
if (protectedScope) {
  const erased = await writer.erase(db, `xq9-erase-${process.pid}`, [0, 1].map((j) => ({ entityId: subjectId(A3, j), attribute: PROTECTED })));
  const head = await reader.basis(db, { position: Number((await writer.basis(db)).position.v), waitMs: 2000 });
  removal = { run: true, erased, position: Number(head.position.v) };
}
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
const shapeRe = (shape?: string) => shape === undefined ? undefined
  : new RegExp("^" + shape.replace(/\{(\d+) digits\}/g, "[0-9]{$1}").replace(/\{digits\}/g, "[0-9]+").replace(/\{segment\}/g, "[^:/]+") + "$");
const keyOf = (v: Val | null) => JSON.stringify(v === null ? null : [v[0], typeof v[1] === "bigint" ? String(v[1]) : v[1]]);
type World = { base: string; ents: Map<string, any[]>; ids: Set<string> };
const worldAt = async (account: string, p: number, v: number): Promise<World> => {
  const base = `acct/${account}/`;
  const ents = new Map<string, any[]>(), ids = new Set<string>();
  for (const r of await historyAt(p)) {
    if (!r.entity_id.startsWith(base)) continue;
    if (r.recorded_position <= p) ids.add(r.entity_id);
    if (visible(r, p, v)) ents.set(r.entity_id, [...(ents.get(r.entity_id) ?? []), r]);
  }
  return { base, ents, ids };
};
const values = (rows: any[], attr: string) => rows.filter((r) => r.attribute === attr).map(rowValue);
const keyOfId = (base: string, id: string) => {
  const local = id.slice(base.length), i = local.indexOf(":");
  if (i <= 0) return null;
  const more = local.slice(i + 1), j = more.indexOf(":"), k = j < 0 ? more : more.slice(0, j);
  return k || null;
};
const plainHolds = (c: any, vs: Val[]): boolean => {
  switch (c.op) {
    case "exists": return vs.length > 0;
    case "missing": return vs.length === 0;
    case "eq": return vs.some((x) => same(x, condValue(c.value)));
    case "ne": return !vs.some((x) => same(x, condValue(c.value)));
    case "in": return vs.some((x) => c.values.some((y: any) => same(x, condValue(y))));
    case "prefix": return vs.some((x) => x[0] === "string" && typeof x[1] === "string" && x[1].startsWith(c.value.value));
    case "contains": {
      const needle = c.caseInsensitive ? c.value.value.toLowerCase() : c.value.value;
      return vs.some((x) => x[0] === "string" && typeof x[1] === "string" && (c.caseInsensitive ? x[1].toLowerCase() : x[1]).includes(needle));
    }
    case "range": {
      const lo = c.from ?? c.fromExclusive, hi = c.to ?? c.toExclusive, fam = (lo ?? hi).type;
      return vs.some((x) => x[0] === fam && x[1] !== null &&
        (!lo || (c.fromExclusive ? cmp(x[1], condValue(lo)[1]) > 0 : cmp(x[1], condValue(lo)[1]) >= 0)) &&
        (!hi || (c.toExclusive ? cmp(x[1], condValue(hi)[1]) < 0 : cmp(x[1], condValue(hi)[1]) <= 0)));
    }
  }
  throw new Error(`op ${c.op}`);
};
const relatedOf = (w: World, id: string, rel: any): string[] => {
  const kindStart = w.base + rel.prefix, re = shapeRe(rel.shape);
  const inKind = (x: string) => x.startsWith(kindStart) && (!re || re.test(x.slice(w.base.length)));
  const link = rel.link ?? "key";
  if (link === "key") {
    const k = keyOfId(w.base, id);
    if (!k) return [];
    const start = kindStart + k;
    return [...w.ents.keys()].filter((x) => inKind(x) && x.startsWith(start) && (x.length === start.length || x[start.length] === ":"));
  }
  return [...new Set(values(w.ents.get(id) ?? [], link.ref).filter((x) => x[0] === "ref").map((x) => x[1] as string))]
    .filter((x) => inKind(x) && w.ents.has(x));
};
const quant = (q: any, n: number) =>
  q === undefined || q === "some" ? n > 0 : q === "none" ? n === 0
  : ({ gte: n >= q.value, gt: n > q.value, lte: n <= q.value, lt: n < q.value, eq: n === q.value } as any)[q.op];
const condHolds = (w: World, id: string, c: any): boolean => {
  if (c.op !== "has") return plainHolds(c, values(w.ents.get(id)!, c.attribute));
  const n = relatedOf(w, id, c.related).filter((r) => (c.where ?? []).every((x: any) => plainHolds(x, values(w.ents.get(r)!, x.attribute)))).length;
  return quant(c.quantifier, n);
};
const brute = async (q: any, p: number, v: number) => {
  const w = await worldAt(q.account, p, v);
  const start = w.base + (q.from?.prefix ?? ""), re = shapeRe(q.from?.shape);
  const inKind = (id: string) => id.startsWith(start) && (!re || re.test(id.slice(w.base.length)));
  const subjects = [...w.ents.keys()].filter(inKind).sort();
  const listed = [...w.ids].filter(inKind).length;
  const ids = subjects.filter((id) => (q.where ?? []).every((c: any) => condHolds(w, id, c)) &&
    (!q.anyOf || q.anyOf.some((g: any[]) => g.every((c) => condHolds(w, id, c)))));
  const groups = new Map<string, number>();
  if (q.result === "countByValue")
    for (const id of ids) {
      const vs = [...new Set(values(w.ents.get(id)!, q.of).map(keyOf))];
      for (const k of vs.length ? vs : [keyOf(null)]) groups.set(k, (groups.get(k) ?? 0) + 1);
    }
  let top: { ids: string[]; values: (string | null)[] } | undefined;
  if (q.result === "top") {
    const { by, type, direction } = q.order;
    const desc = direction === "desc";
    const ov = (id: string) => {
      const xs = values(w.ents.get(id)!, by).filter((x) => x[0] === type && x[1] !== null).map((x) => x[1]);
      return xs.length ? xs.reduce((m, x) => (desc ? (cmp(x, m) > 0 ? x : m) : (cmp(x, m) < 0 ? x : m))) : null;
    };
    const sorted = ids.map((id) => [id, ov(id)] as [string, any]).sort(([ia, va], [ib, vb]) =>
      va === null && vb === null ? cmp(ia, ib) : va === null ? 1 : vb === null ? -1 : (desc ? -cmp(va, vb) : cmp(va, vb)) || cmp(ia, ib));
    const kept = sorted.slice(0, q.limit ?? 100);
    top = { ids: kept.map(([id]) => id), values: kept.map(([, x]) => (x === null ? null : keyOf([type, x]))) };
  }
  let sum: any;
  if (q.result === "sum") {
    let total = 0n, n = 0, subjectsWithValue = 0, skipped = 0;
    for (const id of ids) {
      const vs = values(w.ents.get(id)!, q.of), ints = vs.filter((x) => x[0] === "integer" && x[1] !== null);
      for (const x of ints) total += x[1];
      n += ints.length; skipped += vs.length - ints.length; if (ints.length) subjectsWithValue++;
    }
    sum = { sum: String(total), valuesAdded: n, subjectsWithValue, skipped };
  }
  const projected = ids.map((id) => Object.fromEntries((q.project ?? []).map((attr: string) => [attr, values(w.ents.get(id)!, attr).map(keyOf).sort()])));
  return { ids, groups, projected, top, sum, listed };
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
const FORMS_REL = { prefix: "fo:", link: "key" };
const TASKS_REL = { prefix: "tk:", link: "key" };
const PLACEMENTS_REF = { prefix: "pl:", shape: "pl:{8 digits}:p{digits}", link: { ref: ":person/placement" } };
const questions = (acct: string): any[] => [
  { name: "ne: not active (no value counts as not)", from: SUBJECTS, where: [{ attribute: ":person/active", op: "ne", value: { type: "boolean", value: true } }], project: [":person/active"] },
  { name: "ne: tasks not complete, count", from: TASKS, result: "count", where: [{ attribute: ":task/status", op: "ne", value: S("complete") }] },
  { name: "ne with exists: has a status other than pending", from: TASKS, where: [{ attribute: ":task/status", op: "ne", value: S("pending") }, { attribute: ":task/status", op: "exists" }] },
  { name: "contains smith (case-sensitive)", from: SUBJECTS, where: [{ attribute: ":person/name", op: "contains", value: S("smith") }], project: [":person/name"] },
  { name: "contains SMITH (any case)", from: SUBJECTS, where: [{ attribute: ":person/name", op: "contains", value: S("SMITH"), caseInsensitive: true }] },
  { name: "contains élodie (any case)", from: SUBJECTS, result: "count", where: [{ attribute: ":person/name", op: "contains", value: S("élodie"), caseInsensitive: true }] },
  { name: "or: score >= 50, or inactive named name 1*", from: SUBJECTS, anyOf: [[{ attribute: ":person/score", op: "range", from: I(50) }], [{ attribute: ":person/active", op: "eq", value: { type: "boolean", value: false } }, { attribute: ":person/name", op: "prefix", value: S("name 1") }]] },
  { name: "or under where, count per rank", from: SUBJECTS, result: "countByValue", of: ":person/rank", where: [{ attribute: ":person/name", op: "exists" }], anyOf: [[{ attribute: ":person/active", op: "ne", value: { type: "boolean", value: true } }], [{ attribute: ":person/score", op: "eq", value: I(0) }]] },
  { name: "has: a pending task (by key)", from: SUBJECTS, where: [{ op: "has", related: TASKS_REL, where: [{ attribute: ":task/status", op: "eq", value: S("pending") }] }] },
  { name: "has none: no W4 form (by key)", from: SUBJECTS, where: [{ op: "has", related: FORMS_REL, quantifier: "none", where: [{ attribute: ":form/type", op: "eq", value: S("W4") }] }] },
  { name: "has count: 2 or more open tasks", from: SUBJECTS, result: "count", where: [{ op: "has", related: TASKS_REL, quantifier: { op: "gte", value: 2 }, where: [{ attribute: ":task/status", op: "ne", value: S("complete") }] }] },
  { name: "has count eq 0 forms, any", from: SUBJECTS, where: [{ op: "has", related: FORMS_REL, quantifier: { op: "eq", value: 0 } }] },
  { name: "has by reference: an ended placement", from: SUBJECTS, where: [{ op: "has", related: PLACEMENTS_REF, where: [{ attribute: ":placement/status", op: "eq", value: S("ended") }] }], project: [":person/placement"] },
  { name: "reverse by reference: tasks whose subject is active", from: TASKS, where: [{ op: "has", related: { prefix: "pl:", shape: "pl:{8 digits}", link: { ref: ":task/subject" } }, where: [{ attribute: ":person/active", op: "eq", value: { type: "boolean", value: true } }] }] },
  { name: "reverse by key: forms whose subject's name contains smith", from: { prefix: "fo:" }, where: [{ op: "has", related: { prefix: "pl:", shape: "pl:{8 digits}", link: "key" }, where: [{ attribute: ":person/name", op: "contains", value: S("smith"), caseInsensitive: true }] }] },
  { name: "has inside or: a pending I9 form, or score >= 80", from: SUBJECTS, result: "count", anyOf: [[{ op: "has", related: FORMS_REL, where: [{ attribute: ":form/type", op: "eq", value: S("I9") }, { attribute: ":form/status", op: "eq", value: S("pending") }] }], [{ attribute: ":person/score", op: "range", from: I(80) }]] },
  { name: "top 5 by score ascending", from: SUBJECTS, result: "top", limit: 5, order: { by: ":person/score", type: "integer" } },
  { name: "top 7 by rank descending (ties by ID)", from: SUBJECTS, result: "top", limit: 7, order: { by: ":person/rank", type: "integer", direction: "desc" } },
  { name: "top 10 by name", from: SUBJECTS, result: "top", limit: 10, order: { by: ":person/name", type: "string" } },
  { name: "top 3 by joined, newest first, with a has condition", from: SUBJECTS, result: "top", limit: 3, order: { by: ":person/joined", type: "datetime", direction: "desc" }, where: [{ op: "has", related: TASKS_REL }] },
  { name: "top 40 by active (other family: all missing, ID order)", from: SUBJECTS, result: "top", limit: 40, order: { by: ":person/active", type: "number" } },
  { name: "sum of score", from: SUBJECTS, result: "sum", of: ":person/score" },
  { name: "sum of open tasks' progress", from: TASKS, result: "sum", of: ":task/progress", where: [{ attribute: ":task/status", op: "ne", value: S("complete") }] },
  { name: "sum of names (no integers: skipped)", from: SUBJECTS, result: "sum", of: ":person/name" },
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
  } else if (result === "countByValue") {
    const got = new Map(last.groups.map((g: any) => [keyOf(g.value === null ? null : condValue(g.value)), g.count]));
    check(JSON.stringify([...got.entries()].sort()) === JSON.stringify([...expected.groups.entries()].sort()), "groups equal brute force", { label, got: [...got.entries()], expected: [...expected.groups.entries()] });
  } else if (result === "top") {
    check(JSON.stringify(last.ids) === JSON.stringify(expected.top.ids), "top ids equal brute force (order, ties by ID, missing last)", { label, got: last.ids, expected: expected.top.ids });
    const vals = last.values.map((x: any) => (x === null ? null : keyOf(condValue(x))));
    check(JSON.stringify(vals) === JSON.stringify(expected.top.values), "top values equal brute force", { label, got: vals, expected: expected.top.values });
    check(pages.slice(0, -1).every((x) => x.ids.length === 0), "top: only the complete page names entities", { label });
    check(pages.reduce((n, x) => n + x.examined, 0) === expected.listed, "top: every listed ID of the kind examined once", { label, examined: pages.reduce((n, x) => n + x.examined, 0), listed: expected.listed });
    bump("top-compared", last.ids.length);
  } else if (result === "sum") {
    const got = { sum: last.sum, valuesAdded: last.valuesAdded, subjectsWithValue: last.subjectsWithValue, skipped: last.skipped };
    check(JSON.stringify(got) === JSON.stringify(expected.sum) && last.countComplete === true, "sum equals brute force", { label, got, expected: expected.sum });
    if (expected.sum.valuesAdded > 0) {
      const avg = last.average;
      check(BigInt(avg.numerator) * BigInt(expected.sum.valuesAdded) === BigInt(expected.sum.sum) * BigInt(avg.denominator), "average is sum / values exactly", { label, avg });
    } else check(last.average === null, "no values: no average", { label });
  }
  for (const x of pages) for (const id of x.ids ?? []) check(id.startsWith(`acct/${q.account}/`), "no ID of another account", { label, id });
  check(!/IDN-9/.test(JSON.stringify(pages)), "no protected value in any answer", { label });
  if (JSON.stringify(q).includes('"has"')) check(pages.every((x) => typeof x.related === "number"), "a has question states the related entities read", { label });
  bump("sweeps"); bump("pages", pages.length);
};

// ---- 9a: every new shape, three accounts, three positions, three valid instants, rotating page sizes ----
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
        const request = { ...q, ...paging, ...(q.result === "top" ? { limit: q.limit } : {}), basis: { recordedPosition: p, validAt: v } };
        const pages = await allPages(request);
        const expected = await brute(q, p, v);
        compare(`${acct} ${name} p=${p} v=${v}`, q, pages, expected, p, v, paging);
        const sig = `${acct} ${name}`;
        signatures.set(sig, (signatures.get(sig) ?? new Set()).add(JSON.stringify([expected.ids, [...expected.groups.entries()].sort(), expected.top, expected.sum])));
        if (expected.ids.length === 0) bump("empty-answers");
        g1++;
      }
const varying = [...signatures.entries()].filter(([, v]) => v.size > 1).map(([k, v]) => `${k}: ${v.size}`);
log("9a", { sweeps: g1, counts, questionsWhoseAnswerChangesAcrossPositionsAndInstants: varying.length, of: signatures.size, varying });

// ---- Between pages ----
const head = async () => Number((await reader.basis(db)).position.v);
const between = async (label: string, q: any, paging: any, act: (n: number) => Promise<void>) => {
  const p = await head();
  const pages = await allPages({ ...q, ...paging, basis: { recordedPosition: p, validAt: V_NOW } }, act);
  compare(label, q, pages, await brute(q, p, V_NOW), p, V_NOW, paging);
  const h = await head();
  check(h > p, `${label}: the head moved during the sweep`, { p, h });
  const [atP, atHead] = [await brute(q, p, V_NOW), await brute(q, h, V_NOW)];
  const differs = JSON.stringify([atP.ids, atP.top, atP.sum, atP.projected]) !== JSON.stringify([atHead.ids, atHead.top, atHead.sum, atHead.projected]);
  const fresh = await allPages({ ...q, ...(q.result === "top" ? { limit: q.limit } : {}), basis: { recordedPosition: h, validAt: V_NOW } });
  compare(`${label} at the new head`, q, fresh, await brute(q, h, V_NOW), h, V_NOW, { limit: 100 });
  return { label, position: p, head: h, pages: pages.length, trueAnswerDiffersAtHead: differs, matchesAtP: atP.ids.length, matchesAtHead: atHead.ids.length };
};
const small = { limit: 2, bounds: { subjects: 4 } };
// b1: subjects and their children change between pages (ahead of the cursor and behind it), and new children appear.
const pendingTaskQ = { account: A3, from: SUBJECTS, where: [{ op: "has", related: TASKS_REL, where: [{ attribute: ":task/status", op: "eq", value: S("pending") }] }], project: [":person/name"] };
const b1 = await between("subjects and children changed between pages", pendingTaskQ, small, async (n) => {
  const j = Math.min(N - 1, 8 + n * 2), back = Math.max(0, n - 1);
  await transact(`b1 ${n}`, [
    ...retractAll(taskId(A3, j, 0), ":task/status"), a(taskId(A3, j, 0), "Task", ":task/status", S(n % 2 ? "pending" : "complete")),
    a(taskId(A3, back, 5), "Task", ":task/status", S("pending")),
    a(taskId(A3, j + 1 < N ? j + 1 : 0, 6), "Task", ":task/status", S("pending")),
    ...retractAll(subjectId(A3, j), ":person/name"), a(subjectId(A3, j), "Subject", ":person/name", S(`renamed ${j}`)),
  ]);
});
// b2: a child retired between pages (every fact of a task ahead of the cursor).
const b2 = await between("a child retired between pages", { account: A3, from: SUBJECTS, result: "count", where: [{ op: "has", related: TASKS_REL, quantifier: { op: "gte", value: 2 } }] }, small, async (n) => {
  const j = Math.min(N - 1, 10 + n * 3);
  await transact(`b2 ${n}`, [...retractAll(taskId(A3, j, 0)), ...retractAll(taskId(A3, j, 1))]);
});
// b3: a removal on request between pages, on a question with contains and a has condition.
let b3: any = { run: false };
if (protectedScope) {
  b3 = await between("removal on request between pages", { account: A3, from: SUBJECTS, where: [{ attribute: ":person/name", op: "contains", value: S("e") }], anyOf: [[{ op: "has", related: FORMS_REL }], [{ attribute: ":person/rank", op: "eq", value: I(1) }]], project: [":person/name"] }, small, async (n) => {
    if (n === 0 || n === 2) {
      await writer.erase(db, `xq9-erase-between-${n}-${process.pid}`, [{ entityId: subjectId(A3, n === 0 ? 2 : 3), attribute: PROTECTED }]);
      await reader.basis(db, { position: Number((await writer.basis(db)).position.v), waitMs: 2000 });
      await transact(`b3 ${n}`, [a(subjectId(A3, 20 + n), "Subject", ":person/name", S(`new e ${n}`))]);
    }
  });
}
// b4: top N with ties across a page boundary (ranks 0..3 repeat every 4 subjects, pages of 4 subjects), ranks of
// subjects ahead of the cursor changed between pages.
const topTiesQ = { account: A31, from: SUBJECTS, result: "top", limit: 9, order: { by: ":person/rank", type: "integer", direction: "desc" } };
const b4 = await between("top N with ties across page boundaries", topTiesQ, { bounds: { subjects: 4 } }, async (n) => {
  const j = Math.min(N - 1, 12 + n);
  await transact(`b4 ${n}`, [...retractAll(subjectId(A31, j), ":person/rank"), a(subjectId(A31, j), "Subject", ":person/rank", I(9))]);
});
// b5: the read gateway restarted in the middle of a top N (the heap travels in the signed cursor).
const restartReader = async () => {
  docker("restart", `${prefix}-gw-r`);
  for (let i = 0; i < 180; i++) {
    try { if ((await fetch(`${readUrl}/health`, { signal: AbortSignal.timeout(2000) })).ok) return; } catch {}
    await new Promise((s) => setTimeout(s, 1000));
  }
  throw new Error("read gateway did not come back");
};
let restarted = false;
const b5 = await between("read gateway restarted inside a top N", { account: A3, from: SUBJECTS, result: "top", limit: 6, order: { by: ":person/score", type: "integer", direction: "desc" } }, { bounds: { subjects: 5 } }, async (n) => {
  if (n === 2) { await restartReader(); restarted = true; }
  if (n === 3) await transact("b5 after restart", [a(subjectId(A3, 1), "Subject", ":person/score", I(100000))]);
});
check(restarted, "the read gateway was restarted inside a top N");
for (const b of [b1, b2, b4, b5]) check(b.trueAnswerDiffersAtHead, "the true answer moved between the cursor's position and the head (the test can fail)", b);
log("between", { b1, b2, b3, b4, b5 });

// ---- Refusals: protected attributes in every new position, nesting, ordered paging, bounds ----
const code = (f: () => Promise<unknown>) => f().then(() => "accepted", (e: any) => e?.code ?? String(e));
const P = (extra: object) => ({ account: A3, from: SUBJECTS, ...extra });
const refusals: [string, object, string][] = [
  ["protected in ne", P({ where: [{ attribute: PROTECTED, op: "ne", value: S("IDN-9003") }] }), "ProtectedValueLookup"],
  ["protected in contains", P({ where: [{ attribute: PROTECTED, op: "contains", value: S("IDN") }] }), "ProtectedValueLookup"],
  ["protected in contains, any case", P({ where: [{ attribute: PROTECTED, op: "contains", value: S("idn"), caseInsensitive: true }] }), "ProtectedValueLookup"],
  ["protected in an OR branch", P({ anyOf: [[{ attribute: ":person/rank", op: "exists" }], [{ attribute: PROTECTED, op: "exists" }]] }), "ProtectedValueLookup"],
  ["protected in a child condition", P({ where: [{ op: "has", related: TASKS_REL, where: [{ attribute: PROTECTED, op: "exists" }] }] }), "ProtectedValueLookup"],
  ["protected as the link of a has", P({ where: [{ op: "has", related: { prefix: "pl:", link: { ref: PROTECTED } } }] }), "ProtectedValueLookup"],
  ["protected as the order key", P({ result: "top", limit: 3, order: { by: PROTECTED, type: "string" } }), "ProtectedValueLookup"],
  ["protected summed", P({ result: "sum", of: PROTECTED }), "ProtectedValueLookup"],
  ["related to related", P({ where: [{ op: "has", related: TASKS_REL, where: [{ op: "has", related: FORMS_REL }] }] }), "NestedRelatedUnsupported"],
  ["entities pointing back", P({ where: [{ op: "has", related: { prefix: "tk:", link: { refBack: ":task/subject" } } }] }), "ReverseLinkUnsupported"],
  ["ordered pages of ids", P({ order: { by: ":person/score", type: "integer" } }), "OrderedPagingNeedsIndex"],
  ["top beyond 1,000", P({ result: "top", limit: 1001, order: { by: ":person/score", type: "integer" } }), "OrderedPagingNeedsIndex"],
  ["five OR groups", P({ anyOf: Array.from({ length: 5 }, () => [{ attribute: ":person/rank", op: "exists" }]) }), "UnsupportedOperation"],
  ["nine conditions across where, OR and has", P({ where: [{ attribute: ":person/rank", op: "exists" }, { op: "has", related: TASKS_REL, where: [{ attribute: ":task/status", op: "exists" }, { attribute: ":task/progress", op: "exists" }] }], anyOf: [[1, 2, 3, 4, 5].map(() => ({ attribute: ":person/rank", op: "exists" }))] }), "UnsupportedOperation"],
  ["contains needle of 257 characters", P({ where: [{ attribute: ":person/name", op: "contains", value: S("x".repeat(257)) }] }), "UnsupportedOperation"],
  ["contains with an integer", P({ where: [{ attribute: ":person/name", op: "contains", value: I(3) }] }), "UnsupportedOperation"],
  ["a quantifier above the bound", P({ where: [{ op: "has", related: TASKS_REL, quantifier: { op: "gte", value: 1001 } }] }), "InvalidValue"],
];
for (const [label, request, expected] of refusals) {
  const got = protectedScope || !label.startsWith("protected") ? await code(() => datomic.sweepPage(reader, db, request)) : expected;
  check(got === expected, `refusal: ${label}`, { got, expected });
  bump("refusals");
}

// ---- Isolation: a has by reference never reads another account's entity ----
{
  const q = { account: A3, from: SUBJECTS, where: [{ op: "has", related: { prefix: "pl:", link: { ref: ":person/placement" } }, where: [{ attribute: ":placement/status", op: "exists" }] }], result: "count" };
  const pages = await allPages({ ...q, basis: { recordedPosition: P_H0, validAt: V_NOW } });
  compare("isolation: cross-account reference ignored", q, pages, await brute(q, P_H0, V_NOW), P_H0, V_NOW, { limit: 100 });
}

log("PASS?", { failures: failures.length, counts });
fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify({ db, positions: { P_A, P_B, P_H0 }, instants: { V_PAST1, V_PAST2, V_NOW, T_CORR }, counts, failures, removal, protectedScope }, null, 2));
await write.dispose();
await writer.delete(scope);
writer.close(); reader.close();
process.exitCode = failures.length ? 1 : 0;
