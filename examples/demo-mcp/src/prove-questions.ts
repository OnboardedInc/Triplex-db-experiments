// [DX-XQ8] Proof of the console's questions across subjects: every new tool (list_kinds, describe_kind, list_ids,
// ask_across_subjects) and the paths the "Ask across subjects" page takes (one store page per call with the cursor,
// fill, to the end, a past position, a past record time, a past valid time), each compared with an independent answer:
// one history read of the whole scope at the position (plain SDK, not the console's guarded client and not the sweep's
// as-of read), then visibility at (position, valid time), conditions, columns and groups recomputed here, as the sweep
// builder's gate does (lab/experiments/EXP-DX1/xq6/gate.ts). Also: an edited cursor, a refused protected filter, a
// removal on request between two pages, two accounts whose names prefix each other (a fresh protected scope in the same
// stack), and the agent tools over MCP equal to the console's answers.
// Writes into account-003 of the connected toy (two saves and one correction) and creates one new scope.
//   TRIPLEX_DEMO_STATE=<second toy's connection file> node src/prove-questions.ts --out DIR [--keep]
// --keep leaves the protected scope and writes its connection file (connection-xq8prot.json) for the page's screenshots.
// Refuses the owner's connection file and the default port.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "@triplex-build/triplex-datomic";
import { Demo, loadConnection, stateFile, type Connection } from "./store.ts";
import { errorOf, runTool } from "./tools.ts";

const arg = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const outDir = arg("--out");
assert(outDir, "Give --out DIR");
const keep = process.argv.includes("--keep");
const file = stateFile();
assert(!file.endsWith("/connection.json"), "Run this on a second toy (TRIPLEX_DEMO_STATE=~/.triplex-demo/connection-<name>.json), never the owner's");
mkdirSync(outDir, { recursive: true });
const conn = loadConnection();
assert(conn.kind === "toy" && conn.workingCopy, "A toy working copy only");
const demo = new Demo(conn);
const started = Date.now();

// ---- checks --------------------------------------------------------------------------------------------------------
const checks: { section: string; check: string; ok: boolean; detail?: string }[] = [];
let section = "";
const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);
const check = (name: string, ok: boolean, detail?: unknown) => {
  checks.push({ section, check: name, ok, ...(detail === undefined ? {} : { detail: typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600) }) });
  if (!ok) console.log(`FAIL [${section}] ${name} ${detail === undefined ? "" : JSON.stringify(detail).slice(0, 600)}`);
};
const tool = async (name: string, input: object, d: Demo = demo): Promise<any> => runTool(name, input, "proof", d);
const refusal = async (name: string, input: object, d: Demo = demo) => {
  try {
    await tool(name, input, d);
    return { code: "accepted" } as any;
  } catch (e: any) {
    return errorOf(e).error as any;
  }
};

// ---- the independent answer ----------------------------------------------------------------------------------------
type Row = { entity_id: string; attribute: string; value_type: string; value_string: string | null; value_number: number | null; value_boolean: number | boolean | null; value_datetime: number | null; recorded_position: number; retracted_position: number | null; valid_from: number; valid_to: number | null };
const histories = new Map<string, Row[]>();
async function historyAt(client: DatomicClient, db: string, p: number) {
  const key = db + "@" + p;
  if (!histories.has(key)) histories.set(key, (await client.rows(db, { pattern: {}, history: true, basis: { recordedPosition: p, validAt: 0 } })) as unknown as Row[]);
  return histories.get(key)!;
}
const visible = (r: Row, p: number, v: number) =>
  r.recorded_position <= p && !(r.retracted_position != null && r.retracted_position <= p) && r.valid_from <= v && (r.valid_to == null || r.valid_to > v);
const plain = (r: Row): unknown => {
  switch (r.value_type) {
    case "string": case "ref": case "integer": return r.value_string ?? (r.value_number === null ? null : String(r.value_number));
    case "number": return Number(r.value_number);
    case "boolean": return r.value_boolean === true || Number(r.value_boolean) === 1;
    case "datetime": return new Date(Number(r.value_datetime)).toISOString();
    default: return null;
  }
};
const family = (r: Row) => r.value_type;
const shapeRe = (shape?: string) => shape === undefined ? undefined
  : new RegExp("^" + shape.replace(/\{(\d+) digits\}/g, "[0-9]{$1}").replace(/\{digits\}/g, "[0-9]+").replace(/\{segment\}/g, "[^:/]+") + "$");
const cmp = (x: any, y: any) => (x < y ? -1 : x > y ? 1 : 0);
/** One condition as the store's grammar defines it, over the plain values of one subject's visible rows. */
function holds(c: any, rows: Row[]) {
  const mine = rows.filter((r) => r.attribute === c.attribute);
  const typeOf = (t?: string) => ({ text: "string", reference: "ref", date: "datetime", bool: "boolean" } as Record<string, string>)[t ?? ""] ?? t;
  const conv = (v: any, t: string): any =>
    t === "integer" ? BigInt(String(v)) : t === "number" ? Number(v) : t === "datetime" ? (typeof v === "number" ? v : Date.parse(String(v))) : t === "boolean" ? v === true || v === "true" : String(v);
  const valOf = (r: Row): any =>
    r.value_type === "integer" ? BigInt(String(r.value_string ?? r.value_number)) : r.value_type === "datetime" ? Number(r.value_datetime) : r.value_type === "number" ? Number(r.value_number) : r.value_type === "boolean" ? (r.value_boolean === true || Number(r.value_boolean) === 1) : r.value_string;
  const t = typeOf(c.type) ?? (typeof c.value === "number" ? "integer" : "string");
  switch (c.op) {
    case "exists": return mine.length > 0;
    case "missing": return mine.length === 0;
    case "eq": return mine.some((r) => family(r) === t && cmp(valOf(r), conv(c.value, t)) === 0);
    case "in": return mine.some((r) => family(r) === t && c.values.some((v: any) => cmp(valOf(r), conv(v, t)) === 0));
    case "prefix": return mine.some((r) => family(r) === "string" && String(r.value_string).startsWith(String(c.value)));
    case "range": return mine.some((r) => family(r) === t &&
      (c.from === undefined || (c.fromExclusive ? cmp(valOf(r), conv(c.from, t)) > 0 : cmp(valOf(r), conv(c.from, t)) >= 0)) &&
      (c.to === undefined || (c.toExclusive ? cmp(valOf(r), conv(c.to, t)) < 0 : cmp(valOf(r), conv(c.to, t)) <= 0)));
  }
  throw new Error("op " + c.op);
}
async function brute(client: DatomicClient, db: string, q: any, p: number, v: number) {
  const base = `acct/${q.account}/`, start = base + q.kind.prefix, re = shapeRe(q.kind.shape);
  const by = new Map<string, Row[]>();
  for (const r of await historyAt(client, db, p))
    if (r.entity_id.startsWith(start) && (!re || re.test(r.entity_id.slice(base.length))) && visible(r, p, v))
      by.set(r.entity_id, [...(by.get(r.entity_id) ?? []), r]);
  const ids = [...by.keys()].sort().filter((id) => (q.where ?? []).every((c: any) => holds(c, by.get(id)!)));
  const columns = ids.map((id) => Object.fromEntries((q.columns ?? []).map((a: string) => [a, by.get(id)!.filter((r) => r.attribute === a).map(plain).map(String).sort()])));
  const groups = new Map<string, number>();
  if (q.result === "countByValue")
    for (const id of ids) {
      const vs = [...new Set(by.get(id)!.filter((r) => r.attribute === q.of).map((r) => JSON.stringify(plain(r))))];
      for (const k of vs.length ? vs : ["null"]) groups.set(k, (groups.get(k) ?? 0) + 1);
    }
  return { ids, columns, groups, subjects: by.size };
}
/** IDs with a fact recorded at or before p (what an ID list means), under acct/<account>/<prefix>, matching the shape. */
async function bruteIds(client: DatomicClient, db: string, account: string, prefix: string, shape: string | undefined, p: number) {
  const base = `acct/${account}/`, re = shapeRe(shape);
  const ids = new Set<string>();
  for (const r of await historyAt(client, db, p))
    if (r.recorded_position <= p && r.entity_id.startsWith(base + prefix) && (!re || re.test(r.entity_id.slice(base.length)))) ids.add(r.entity_id);
  return [...ids].sort();
}

/** Every page of a question through the tool, `mode: page`, following the cursor; the first page carries the basis. */
async function allPages(q: any, opts: { limit?: number; pageSubjects?: number; between?: (n: number) => Promise<void> } = {}, d: Demo = demo) {
  const pages: any[] = [];
  let cursor: string | null = null;
  for (let n = 0; n < 5000; n++) {
    const { basis, ...rest } = q;
    const a = await tool("ask_across_subjects", { ...rest, mode: "page", ...(opts.limit ? { limit: opts.limit } : {}), ...(opts.pageSubjects ? { pageSubjects: opts.pageSubjects } : {}), ...(cursor ? { cursor } : basis ? { basis } : {}) }, d);
    pages.push(a);
    if (!a.next) return pages;
    await opts.between?.(n);
    cursor = a.next;
  }
  throw new Error("a cursor must end");
}
function compare(label: string, q: any, pages: any[], expected: Awaited<ReturnType<typeof brute>>, p: number, v: number) {
  const first = pages[0];
  check(`${label}: every page at the question's position and valid time`, pages.every((x) => x.holdsFor.position === p && x.holdsFor.validAtMs === v && x.facts === "stored"), { p, v, got: pages.map((x) => [x.holdsFor.position, x.holdsFor.validAtMs]).slice(0, 3) });
  check(`${label}: only the last page is complete`, pages.every((x, i) => x.complete === (i === pages.length - 1)));
  const last = pages[pages.length - 1];
  if ((q.result ?? "list") === "list") {
    const got = pages.flatMap((x) => x.rows.map((r: any) => r.id));
    check(`${label}: IDs equal the independent answer`, JSON.stringify(got) === JSON.stringify(expected.ids), { got: got.length, expected: expected.ids.length, firstGot: got.slice(0, 4), firstExpected: expected.ids.slice(0, 4) });
    if (q.columns?.length) {
      const cols = pages.flatMap((x) => x.rows.map((r: any) => Object.fromEntries(q.columns.map((a: string) => [a, (r.columns[a] ?? []).map(String).sort()]))));
      check(`${label}: columns equal the independent answer`, JSON.stringify(cols) === JSON.stringify(expected.columns), { got: cols.slice(0, 2), expected: expected.columns.slice(0, 2) });
    }
    bump("ids compared", got.length);
  } else if (q.result === "count") {
    check(`${label}: count equals the independent answer`, last.count === expected.ids.length && last.countComplete === true, { got: last.count, expected: expected.ids.length });
    bump("subjects counted", last.count);
  } else {
    const got = new Map<string, number>(last.groups.map((g: any) => [JSON.stringify(g.value), g.subjects]));
    check(`${label}: groups equal the independent answer`, JSON.stringify([...got].sort()) === JSON.stringify([...expected.groups].sort()), { got: [...got], expected: [...expected.groups] });
  }
  const examined = pages.reduce((n, x) => n + x.progress.subjectsExamined, 0);
  check(`${label}: subjects examined reported`, examined >= expected.subjects, { examined, subjectsWithFacts: expected.subjects });
  check(`${label}: no ID of another account`, pages.every((x) => (x.rows ?? []).every((r: any) => r.id.startsWith(`acct/${q.account}/`))));
  check(`${label}: route and fast-index place reported`, first.route.used === "slow exact read of each subject" && first.route.fastIndex.available === false);
  bump("questions"); bump("store pages", pages.length);
}

// ======================================================================================================================
// A. The connected toy (the console's own database): kinds, IDs, attributes and questions at several cuts.
// ======================================================================================================================
const plainClient = new DatomicClient(conn.readUrl, 60_000);
const db = conn.database;
const A = "account-003", B = "account-007";
section = "setup";
const P0 = (await demo.head()).position;
// Writes through the console's own tools, so the answers differ across positions and valid times.
const save1 = await tool("save_facts", { account: A, subject: 2, kind: "task", changes: { ":i9/status": "complete" } });
const corr = await tool("correct_past_value", { account: A, subject: 3, kind: "task", attribute: ":i9/status", value: "requires_action", validFrom: new Date(Date.now() - 8 * 86_400_000).toISOString() });
const save2 = await tool("save_facts", { account: A, subject: 4, kind: "root", changes: { ":placement/status": "paused" } });
const P1 = (await demo.head()).position;
check("three writes committed", P1 > P0 && save1.readbackMatches && corr.readbackMatches && save2.readbackMatches, { P0, P1 });
const V_NOW = Date.now() + 3_600_000, V_4 = Date.now() - 4 * 86_400_000, V_PAST = Date.UTC(2025, 5, 1);
const iso = (ms: number) => new Date(ms).toISOString();

section = "list_kinds";
for (const account of [A, B]) {
  for (const p of [P0, P1]) {
    const k = await tool("list_kinds", { account, basis: { position: p } });
    check(`${account} at ${p}: answer holds for the position asked`, k.holdsFor.position === p);
    for (const kind of k.kinds) {
      const ids = await bruteIds(plainClient, db, account, kind.prefix, kind.shape, p);
      check(`${account} at ${p}: kind ${kind.shape ?? kind.prefix} count equals the independent answer`, kind.ids === ids.length && kind.countExact, { got: kind.ids, expected: ids.length });
    }
    const all = await bruteIds(plainClient, db, account, "", undefined, p);
    const prefixes = new Set(all.map((id) => /^([^:/]*[:/])/.exec(id.slice(`acct/${account}/`.length))?.[1] ?? id.slice(`acct/${account}/`.length)));
    check(`${account} at ${p}: every kind found`, JSON.stringify([...prefixes].sort()) === JSON.stringify([...new Set(k.kinds.map((x: any) => x.prefix))].sort()), { got: k.kinds.map((x: any) => x.prefix), expected: [...prefixes] });
  }
}

section = "list_ids";
for (const [prefix, shape] of [["pl:", "pl:{8 digits}"], ["i9:", undefined], ["sec:", undefined], ["", undefined]] as const) {
  for (const p of [P0, P1]) {
    const expected = await bruteIds(plainClient, db, A, prefix, shape, p);
    const got: string[] = [];
    let cursor: string | undefined, pages = 0;
    do {
      const a = await tool("list_ids", { account: A, prefix, ...(shape ? { shape } : {}), limit: 7, ...(cursor ? { cursor } : { basis: { position: p } }) });
      check(`${prefix || "every ID"} at ${p}: page holds for the position`, a.holdsFor.position === p && a.holdsFor.validAt === null);
      got.push(...a.ids);
      cursor = a.next ?? undefined;
      pages++;
    } while (cursor && pages < 500);
    check(`${prefix || "every ID"} at ${p}: pages of 7 equal the independent answer`, JSON.stringify(got) === JSON.stringify(expected), { got: got.length, expected: expected.length });
    const c = await tool("list_ids", { account: A, prefix, ...(shape ? { shape } : {}), result: "count", basis: { position: p } });
    check(`${prefix || "every ID"} at ${p}: exact count equals the independent answer`, c.count === expected.length && c.countExact === true, { got: c.count, expected: expected.length });
    bump("ids listed", got.length);
  }
}
// A past record time resolves to a stated position, exact there.
{
  const at = Date.parse(save2.receipt.recordedAt);
  const a = await tool("list_ids", { account: A, prefix: "pl:", shape: "pl:{8 digits}", result: "count", basis: { recordedAt: at } });
  const expected = await bruteIds(plainClient, db, A, "pl:", "pl:{8 digits}", a.holdsFor.position);
  check("record time: stated position at or after the commit and exact there", a.holdsFor.position >= save2.receipt.position && a.count === expected.length, { position: a.holdsFor.position, receipt: save2.receipt.position });
}

section = "describe_kind";
for (const [prefix, shape] of [["i9:", undefined], ["pl:", "pl:{8 digits}"], ["wk:", undefined], ["review:", undefined]] as const) {
  const d = await tool("describe_kind", { account: A, prefix, ...(shape ? { shape } : {}), sample: 30, basis: { position: P1, validAt: V_NOW } });
  const ids = (await bruteIds(plainClient, db, A, prefix, shape, P1)).slice(0, 30);
  const rows = (await historyAt(plainClient, db, P1)).filter((r) => ids.includes(r.entity_id) && visible(r, P1, V_NOW));
  const attrs = [...new Set(rows.map((r) => r.attribute))].sort();
  check(`${prefix}: attributes equal those of the first 30 IDs`, JSON.stringify(d.attributes.map((a: any) => a.attribute)) === JSON.stringify(attrs), { got: d.attributes.length, expected: attrs.length });
  check(`${prefix}: no protected attributes declared on this database, none marked`, d.protectedAttributesDeclared === false && d.attributes.every((a: any) => !a.protected));
}

section = "ask_across_subjects";
const questions = (account: string): any[] => [
  { name: "every subject (S1)", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, result: "list", columns: [":placement/status", ":subject/member"] },
  { name: "pending tasks (S3)", kind: { prefix: "i9:" }, where: [{ attribute: ":i9/status", op: "eq", type: "text", value: "pending" }], result: "list", columns: [":task/progress"] },
  { name: "tasks with no status (S3)", kind: { prefix: "i9:" }, where: [{ attribute: ":i9/status", op: "missing" }], result: "count" },
  { name: "pending, progress 20 to 60 (S4, S5)", kind: { prefix: "i9:" }, where: [{ attribute: ":i9/status", op: "in", type: "text", values: ["pending", "requires_action"] }, { attribute: ":task/progress", op: "range", type: "integer", from: "20", to: "60" }], result: "list", columns: [":task/progress", ":i9/status"] },
  { name: "tasks per status (S6)", kind: { prefix: "i9:" }, result: "countByValue", of: ":i9/status" },
  { name: "active subjects (S6)", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [{ attribute: ":placement/status", op: "eq", type: "text", value: "active" }], result: "count" },
  { name: "reviews of subject 7 (S2)", kind: { prefix: "review:" }, where: [{ attribute: ":review/of", op: "eq", type: "reference", value: `acct/${account}/pl:00000007` }], result: "list", columns: [":review/outcome"] },
  { name: "pay at least 1,400, exclusive 2,000 (S5)", kind: { prefix: "wk:" }, where: [{ attribute: ":person/custom-pay-cents", op: "range", type: "integer", from: "1400", to: "2000", toExclusive: true }], result: "list", columns: [":person/custom-pay-cents"] },
  { name: "start text prefix (S8)", kind: { prefix: "wk:" }, where: [{ attribute: ":person/custom-start", op: "prefix", value: "2026-11" }], result: "count" },
  { name: "every subject, total (S11)", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, result: "count" },
];
const signatures = new Map<string, Set<string>>();
let qi = 0;
for (const account of [A, B])
  for (const base of questions(account))
    for (const [p, v] of [[P0, V_NOW], [P1, V_NOW], [P1, V_4], [P1, V_PAST]] as const) {
      const { name, ...q0 } = base;
      const q = { ...q0, account, basis: { position: p, validAt: iso(v) } };
      const paging = [{ limit: 3, pageSubjects: 5 }, { limit: 1000, pageSubjects: 7 }, {}][qi++ % 3]!;
      const pages = await allPages(q, paging);
      const expected = await brute(plainClient, db, q, p, v);
      compare(`${account} ${name} at ${p}, valid ${iso(v).slice(0, 10)}`, q, pages, expected, p, v);
      const sig = `${account} ${name}`;
      signatures.set(sig, (signatures.get(sig) ?? new Set()).add(JSON.stringify([expected.ids, [...expected.groups].sort()])));
    }
const varying = [...signatures].filter(([, s]) => s.size > 1).map(([k]) => k);
check("non-vacuous: some questions have different true answers across the cuts", varying.length >= 3, varying);
counts["questions whose answer changes across cuts"] = varying.length;

// Modes: fill (default) and toEnd in one call each; the default basis is stated and exact.
{
  const q = { account: A, ...questions(A)[1] }; delete q.name;
  const fill = await tool("ask_across_subjects", { ...q, limit: 5, pageSubjects: 3 });
  const p = fill.holdsFor.position, v = fill.holdsFor.validAtMs;
  const expected = await brute(plainClient, db, q, p, v);
  check("fill: default basis is the latest position and now, stated", p === P1 && Math.abs(v - Date.now()) < 120_000);
  check("fill: up to limit rows, the first of the independent answer", JSON.stringify(fill.rows.map((r: any) => r.id)) === JSON.stringify(expected.ids.slice(0, 5)) && (fill.rows.length === 5 || fill.complete));
  const toEnd = await tool("ask_across_subjects", { ...q, mode: "toEnd", pageSubjects: 2, basis: { position: P1, validAt: iso(V_NOW) } });
  const e2 = await brute(plainClient, db, q, P1, V_NOW);
  check("toEnd: complete in one call, equal to the independent answer", toEnd.complete && JSON.stringify(toEnd.rows.map((r: any) => r.id)) === JSON.stringify(e2.ids) && toEnd.progress.storePages > 1, { pages: toEnd.progress.storePages });
  const rt = await tool("ask_across_subjects", { ...q, result: "count", columns: undefined, basis: { recordedAt: Date.parse(corr.receipt.recordedAt), validAt: iso(V_4) } });
  const e3 = await brute(plainClient, db, { ...q, result: "count" }, rt.holdsFor.position, V_4);
  check("past record time and past valid time: stated position at or after the correction, exact there", rt.holdsFor.position >= corr.receipt.position && rt.count === e3.ids.length, { position: rt.holdsFor.position, got: rt.count, expected: e3.ids.length });
  // Each row links to the Subject or Entity page at the answer's position and valid time.
  const s = await tool("ask_across_subjects", { account: A, kind: { prefix: "pl:", shape: "pl:{8 digits}" }, limit: 2, basis: { position: P0, validAt: iso(V_NOW) } });
  check("row links open the Subject page at the same position and valid time", s.rows.every((r: any) => r.consoleLink.includes(`/accounts/${A}/subjects/`) && r.consoleLink.includes(`recorded=${P0}`) && r.consoleLink.includes(encodeURIComponent(iso(V_NOW)))), s.rows.map((r: any) => r.consoleLink));
}

section = "refusals";
{
  const q = { account: A, kind: { prefix: "i9:" }, where: [{ attribute: ":i9/status", op: "eq", value: "pending" }] };
  const page1 = await tool("ask_across_subjects", { ...q, mode: "page", limit: 2, pageSubjects: 3, basis: { position: P1 } });
  const cursor = page1.next as string;
  const [body, sig] = cursor.split(".");
  const json = JSON.parse(Buffer.from(body!, "base64url").toString());
  const edited = `${Buffer.from(JSON.stringify({ ...json, position: P0 })).toString("base64url")}.${sig}`;
  for (const [label, input] of [
    ["edited cursor", { ...q, mode: "page", cursor: edited }],
    ["cursor of another question", { ...q, where: [], mode: "page", cursor }],
    ["cursor in another account", { ...q, account: B, mode: "page", cursor }],
  ] as const) {
    const r = await refusal("ask_across_subjects", input);
    check(`${label}: refused CursorMismatch with a plain sentence`, r.code === "CursorMismatch" && r.refused === true && /page marker/.test(r.explanation) && r.storeCode === "CursorMismatch", r);
  }
  const edIds = await tool("list_ids", { account: A, prefix: "pl:", limit: 2, basis: { position: P1 } });
  // The ID list's cursor is not signed; the route binds it to the account, the request and the basis instead.
  const tampered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(edIds.next as string, "base64url").toString()), account: B })).toString("base64url");
  const r2 = await refusal("list_ids", { account: A, prefix: "pl:", cursor: tampered });
  check("list_ids: edited cursor refused CursorMismatch with a plain sentence", r2.code === "CursorMismatch" && r2.refused === true, r2);
  const after = await tool("ask_across_subjects", { ...q, mode: "page", cursor });
  check("the original cursor still continues its own question", after.holdsFor.position === P1);
  const r3 = await refusal("ask_across_subjects", { account: A, kind: { prefix: "i9:" }, where: [{ attribute: ":i9/status", op: "range", type: "boolean", from: true }] });
  check("a range on yes/no: the store's UnsupportedOperation, explained", r3.code === "UnsupportedOperation" && r3.refused === true && /slow exact route answers/.test(r3.explanation), r3);
  const r4 = await refusal("ask_across_subjects", { account: A, kind: { prefix: "i9:" }, where: Array.from({ length: 9 }, () => ({ attribute: ":i9/status", op: "exists" })) });
  check("nine conditions refused", r4.code === "InvalidInput", r4.code);
  const r5 = await refusal("list_ids", { account: "account-999", prefix: "pl:" });
  check("an account the database does not have is refused by name", r5.code === "UnknownAccount", r5.code);
}

// ======================================================================================================================
// B. A protected scope in the same stack: accounts account-003 and account-0031 (one name starts with the other),
//    a protected attribute, a refused protected filter, and a removal on request between two pages.
// ======================================================================================================================
section = "protected scope";
const PROT = ":privacy/identity-number";
const scope = DatabaseScope.test(`xq8-proof-${process.pid}-${Date.now()}`);
const pdb = "s2-" + Buffer.from(scope).toString("base64url");
const opener = new DatomicClient(conn.writeUrl, 60_000);
const created = await opener.create(scope, "lean", true, 60_000);
check("protected scope created", created.db === pdb);
await opener.declareProtection(pdb, [PROT], false);
const N = 12;
const pconn: Connection = {
  version: "triplex-demo-connection/1", kind: "toy", database: pdb, scope, writeUrl: conn.writeUrl, readUrl: conn.readUrl, workingCopy: true,
  recordsAtBringUp: 0, headAtBringUp: 0, physicalTAtBringUp: 0, sealed: { head: 0, physicalT: 0, records: 0 },
  roster: ["account-003", "account-0031"].map((account) => ({ account, namespace: `acct/${account}/`, firstPerson: 0, people: N })),
  clocks: null, connectedAt: new Date().toISOString(),
};
const pdemo = new Demo(pconn);
const pad = (n: number) => String(n).padStart(8, "0");
const sid = (a: string, i: number) => `acct/${a}/pl:${pad(i)}`;
const S = (v: string) => ({ type: "string", value: v });
const assertOp = (e: string, attribute: string, value: object) => ({ op: "assert", entityId: e, attribute, value, validFrom: 1_700_000_000_000, entityType: "Subject" });
for (const a of ["account-003", "account-0031"]) {
  const ops: object[] = [];
  for (let i = 0; i < N; i++) {
    ops.push(assertOp(sid(a, i), ":person/name", S(`${a} subject ${i}`)), assertOp(sid(a, i), ":person/status", S(i % 3 ? "active" : "paused")));
    for (const k of [0, 1]) ops.push(assertOp(`acct/${a}/tk:${pad(i)}:${k}`, ":task/status", S((i + k) % 2 ? "pending" : "complete")));
    if (a === "account-003") ops.push(assertOp(sid(a, i), PROT, S(`IDN-${9000 + i}`)));
  }
  await pdemo.transact(ops as never, { actor: "proof", commandId: `xq8-proof-${a}-${Date.now()}` } as never);
}
const PP = (await pdemo.head()).position;
const noProtected = (x: unknown) => !/IDN-9/.test(JSON.stringify(x));

// Prefix-sharing accounts: kinds, IDs and counts stay inside each account.
for (const a of ["account-003", "account-0031"]) {
  const k = await tool("list_kinds", { account: a }, pdemo);
  // Every pl: ID here is a root, so the kind needs no separate "roots only" shape.
  const roots = k.kinds.find((x: any) => x.shape === "pl:{8 digits}") ?? k.kinds.find((x: any) => x.prefix === "pl:");
  check(`${a}: ${N} subject roots by the ID list`, roots?.ids === N, k.kinds);
  const ids = await tool("list_ids", { account: a, prefix: "", limit: 1000 }, pdemo);
  check(`${a}: every ID of the account stays inside it`, ids.ids.length > 0 && ids.ids.every((id: string) => id.startsWith(`acct/${a}/`)), ids.ids.length);
  const count = await tool("ask_across_subjects", { account: a, kind: { prefix: "tk:" }, where: [{ attribute: ":task/status", op: "eq", value: "pending" }], result: "count", basis: { position: PP, validAt: iso(V_NOW) } }, pdemo);
  const e = await brute(plainClient, pdb, { account: a, kind: { prefix: "tk:" }, where: [{ attribute: ":task/status", op: "eq", value: "pending" }] }, PP, V_NOW);
  check(`${a}: pending tasks counted exactly (${e.ids.length})`, count.count === e.ids.length && count.complete, { got: count.count, expected: e.ids.length });
}
check("account-003 never lists account-0031", !(await tool("list_ids", { account: "account-003", prefix: "", limit: 1000 }, pdemo)).ids.some((id: string) => id.includes("account-0031")));

// The attribute list marks the protected attribute, with no value.
const described = await tool("describe_kind", { account: "account-003", prefix: "pl:", shape: "pl:{8 digits}" }, pdemo);
const prot = described.attributes.find((a: any) => a.attribute === PROT);
check("describe_kind: the protected attribute is marked not filterable, with the reason", described.protectedAttributesDeclared === true && prot?.protected === true && prot?.filterable === false && /never filters/.test(prot?.reason ?? ""), prot);
check("describe_kind: other attributes stay filterable", described.attributes.filter((a: any) => a.attribute !== PROT).every((a: any) => a.filterable && !a.protected));
check("describe_kind: no protected value in the answer", noProtected(described));

// A protected attribute in any part of a question is refused by the store, with its code and a plain sentence.
for (const [label, input] of [
  ["is", { where: [{ attribute: PROT, op: "eq", value: "IDN-9003" }] }],
  ["starts with", { where: [{ attribute: PROT, op: "prefix", value: "IDN" }] }],
  ["has a value", { where: [{ attribute: PROT, op: "exists" }] }],
  ["as a column", { columns: [PROT] }],
  ["count per value", { result: "countByValue", of: PROT }],
] as const) {
  const r = await refusal("ask_across_subjects", { account: "account-003", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, ...input }, pdemo);
  check(`protected attribute ${label}: refused ProtectedValueLookup with a plain sentence`, r.code === "ProtectedValueLookup" && r.refused === true && /never filters, groups or lists/.test(r.explanation) && r.storeCode === "ProtectedValueLookup", r);
  check(`protected attribute ${label}: the refusal carries no protected value`, noProtected(r));
}

// A removal on request between two pages: the question stays exact at its position; a fresh one is exact at the head.
{
  const q = { account: "account-003", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [{ attribute: ":person/status", op: "eq", value: "active" }], result: "list", columns: [":person/name"], basis: { position: PP, validAt: iso(V_NOW) } };
  const idsBefore = await tool("list_ids", { account: "account-003", prefix: "pl:", shape: "pl:{8 digits}" }, pdemo);
  let removals = 0;
  const pages = await allPages(q, {
    limit: 2, pageSubjects: 3,
    between: async (n) => {
      if (n === 0 || n === 1) {
        await opener.erase(pdb, `xq8-proof-erase-${n}-${process.pid}`, [{ entityId: sid("account-003", 9 + n), attribute: PROT }]);
        await pdemo.reader.basis(pdb, { position: Number((await opener.basis(pdb)).position.v), waitMs: 2000 });
        removals++;
      }
    },
  }, pdemo);
  const head = (await pdemo.head()).position;
  check("two removals on request happened between pages", removals === 2 && head > PP, { PP, head });
  compare("removal between pages, at the question's position", q, pages, await brute(plainClient, pdb, q, PP, V_NOW), PP, V_NOW);
  const fresh = await allPages({ ...q, basis: { position: head, validAt: iso(V_NOW) } }, {}, pdemo);
  compare("after the removal, at the new head", q, fresh, await brute(plainClient, pdb, q, head, V_NOW), head, V_NOW);
  check("no protected value in any page", noProtected(pages) && noProtected(fresh));
  const idsAfter = await tool("list_ids", { account: "account-003", prefix: "pl:", shape: "pl:{8 digits}" }, pdemo);
  check("removal keeps the subjects' IDs (it removes protected values only)", JSON.stringify(idsBefore.ids) === JSON.stringify(idsAfter.ids) && idsAfter.holdsFor.position === head);
  const frontier = await pdemo.reader.erasureFrontier(pdb);
  check("the store recorded the removals", frontier.protected && Object.keys(frontier.erased).length >= 2, { erased: Object.keys(frontier.erased).length });
}

// ======================================================================================================================
// C. The agent tools over MCP give the console's answers.
// ======================================================================================================================
section = "agent tools (MCP)";
{
  const client = new Client({ name: "xq8-proof", version: "1" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(import.meta.dirname, "mcp.ts")], env: { ...process.env } as Record<string, string> }));
  const listed = (await client.listTools()).tools.map((t) => t.name);
  check("the four new tools are registered over MCP", ["list_kinds", "describe_kind", "list_ids", "ask_across_subjects"].every((n) => listed.includes(n)), listed.length);
  const viaMcp = async (name: string, input: object) => JSON.parse(((await client.callTool({ name, arguments: input as Record<string, unknown> })).content as { text: string }[])[0]!.text);
  const q = { account: A, kind: { prefix: "i9:" }, where: [{ attribute: ":i9/status", op: "eq", value: "pending" }], columns: [":task/progress"], basis: { position: P1, validAt: iso(V_NOW) } };
  const [m, c] = [await viaMcp("ask_across_subjects", q), await tool("ask_across_subjects", q)];
  check("ask_across_subjects: MCP equals the console", JSON.stringify([m.rows, m.holdsFor.position, m.holdsFor.validAt, m.complete]) === JSON.stringify([c.rows, c.holdsFor.position, c.holdsFor.validAt, c.complete]));
  const [m2, c2] = [await viaMcp("list_ids", { account: A, prefix: "i9:", result: "count", basis: { position: P0 } }), await tool("list_ids", { account: A, prefix: "i9:", result: "count", basis: { position: P0 } })];
  check("list_ids: MCP equals the console", m2.count === c2.count && m2.holdsFor.position === c2.holdsFor.position);
  const m3 = await viaMcp("ask_across_subjects", { ...q, cursor: "x.y", basis: undefined });
  check("a refusal over MCP carries the store's code and the plain sentence", m3.error?.code === "CursorMismatch" && /page marker/.test(m3.error?.explanation ?? ""), m3);
  await client.close();
}

// ---- results ---------------------------------------------------------------------------------------------------------
if (keep) {
  const pfile = join(homedir(), ".triplex-demo", "connection-xq8prot.json");
  writeFileSync(pfile, JSON.stringify(pconn, null, 2) + "\n", { mode: 0o600 });
  console.log(`Kept the protected scope; its connection file is ${pfile}`);
} else {
  await opener.delete(scope).catch(() => {});
}
const failed = checks.filter((c) => !c.ok);
const result = { proof: "questions across subjects", at: new Date(started).toISOString(), seconds: Math.round((Date.now() - started) / 1000), database: db.slice(0, 12), positions: { P0, P1, protectedScope: PP }, counts, passed: checks.length - failed.length, failed: failed.length, checks };
writeFileSync(join(outDir, "questions-proof.json"), JSON.stringify(result, null, 2) + "\n");
const bySection = [...new Set(checks.map((c) => c.section))].map((s) => {
  const mine = checks.filter((c) => c.section === s);
  return `| ${s} | ${mine.filter((c) => c.ok).length} | ${mine.filter((c) => !c.ok).length} |`;
});
writeFileSync(join(outDir, "questions-proof.md"), [
  `# Questions across subjects: proof on a second toy (${result.at})`, "",
  `**${result.passed} of ${checks.length} checks passed** in ${result.seconds} s (times diagnostic, Mac).`, "",
  "| Section | Passed | Failed |", "| --- | ---: | ---: |", ...bySection, "",
  "| Count | Value |", "| --- | ---: |", ...Object.entries(counts).map(([k, v]) => `| ${k} | ${v} |`), "",
  ...(failed.length ? ["## Failed", "", ...failed.map((f) => `- [${f.section}] ${f.check}: ${f.detail ?? ""}`)] : []),
].join("\n") + "\n");
console.log(`QUESTIONS PROOF ${failed.length ? "FAILED" : "PASSED"}: ${result.passed} of ${checks.length} checks, ${result.seconds} s; counts ${JSON.stringify(counts)}`);
demo.close(); pdemo.close(); plainClient.close(); opener.close();
process.exit(failed.length ? 1 : 0);
