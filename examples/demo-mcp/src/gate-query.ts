// [DX-CON1] Gates of build step 2 (functions), on the toy:
//   1. A scan makes zero requests: every refused question and every unbounded read is stopped before it is sent.
//   2. The subject source equals the store source for 20 anchored queries at one position.
//   3. Six fixed questions on one subject return the counts the generator's arithmetic gives (scale1 plan.ts person()).
//   4. Paging: a second page is read at the first page's position; the ten example questions all run.
// Usage: node src/gate-query.ts [--account account-002] [--subject 3] [--json PATH]
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Triples } from "@triplex-build/triplex";
import { ConfigStore } from "@triplex-build/triplex/config";
import { Capabilities, QueryExecutor, Runtime, StorageAdapter } from "@triplex-build/triplex/runtime";
import { makeDatomicQueryExecutor, makeDatomicStorageAdapter } from "@triplex-build/triplex-datomic";
import { Effect, Layer, ManagedRuntime } from "effect";
import { guardCounts, GuardedClient } from "./guard.ts";
import { Demo, loadConnection } from "./store.ts";
import { adaptExample } from "./query.ts";
import { runTool } from "./tools.ts";

const arg = (name: string, fallback?: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const account = arg("--account", "account-002")!;
const subjectNo = Number(arg("--subject", "3"));
assert(account !== "account-010");
const conn = loadConnection();
const demo = new Demo(conn);
const checks: { check: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: string) => {
  checks.push({ check: name, ok, ...(detail ? { detail } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -- " + detail : ""}`);
};
const call = async (name: string, input: object) => {
  try {
    return { ok: true, value: (await runTool(name, input, "proof", demo)) as Record<string, any> };
  } catch (e) {
    return { ok: false, value: { error: { code: (e as { code?: string }).code ?? (e as { _tag?: string })._tag, message: String((e as Error).message) } } as Record<string, any> };
  }
};
const ids = demo.subjectIds(account, subjectNo);
const one = { subject: { account, subject: subjectNo } };

// ---- 1. zero requests for a scan ----------------------------------------------------------------------------------
const refused: [string, object][] = [
  ["store, variable entity", { query: { find: ["?e", "?v"], where: [["?e", ":task/status", "?v"]] }, from: "store" }],
  ["store, not", { query: { find: ["?v"], where: [[ids.task, ":task/status", "?v"], ["not", [ids.task, ":task/progress", 0]]] }, from: "store" }],
  ["store, or", { query: { find: ["?p"], where: [[ids.task, ":task/progress", "?p"], ["or", [[ids.task, ":task/status", "complete"], [ids.task, ":i9/status", "complete"]]]] }, from: "store" }],
  ["store, rules", { query: { find: ["?y"], where: [["step", ids.task, "?y"]], rules: [{ name: "step", body: [["?x", ":task/subtask", "?y"]] }] }, from: "store" }],
  ["subject, transaction binding", { query: { find: ["?tx"], where: [[ids.task, ":task/progress", "?p", "?tx"]] }, from: one }],
  ["17 subjects", { query: { find: ["?e"], where: [["?e", ":placement/status", "?s"]] }, from: { subjects: { account, subjects: [...Array(17).keys()] } } }],
];
for (const [what, input] of refused) {
  const sent = guardCounts.sent;
  const r = await call("query", input);
  check(`refused with zero requests: ${what}`, !r.ok && r.value["error"].code === "QueryRefused" && guardCounts.sent === sent, `${r.value["error"]?.code}, ${guardCounts.sent - sent} requests`);
}
// Unbounded reads by any caller are stopped by the guard itself.
const bare = new GuardedClient(conn.readUrl, 10_000);
let sent = guardCounts.sent;
const scans: [string, () => Promise<unknown>][] = [
  ["a row read by attribute", () => bare.rows(conn.database, { pattern: { attribute: ":task/status" } })],
  ["a row read by entity type", () => bare.rows(conn.database, { pattern: { entityType: "Review" } })],
  ["a configuration read before discovery", () => bare.rows(conn.database, { pattern: { entityType: "triplex.config-snapshot" } })],
  ["a row read with an empty entity list", () => bare.rows(conn.database, { entityIds: [] })],
  ["a store query outside the console's checks", () => bare.request("POST", `/v1/db/${conn.database}/q`, { edn: "[:find ?e :where [?e :task/status _]]" })],
];
for (const [what, work] of scans) {
  const code = await work().then(() => "sent", (e: { code?: string }) => e.code ?? "error");
  check(`guard refuses ${what} before sending`, code === "ScanRefused" && guardCounts.sent === sent, code);
  sent = guardCounts.sent;
}
// Triplex's own by-type reads (entityPage, match by type) through the guarded runtime.
const def = Runtime.define({
  name: "datomic",
  storage: Layer.succeed(StorageAdapter, makeDatomicStorageAdapter(bare, demo.scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(bare, demo.scope)),
});
const layer = def.layer({ scope: demo.scope, capabilities: Capabilities.none });
const rt = ManagedRuntime.make(Layer.merge(layer, ConfigStore.layer.pipe(Layer.provide(layer))));
for (const [what, effect] of [
  ["Triples.match by entity type", Effect.flatMap(Triples, (s) => s.match({ entityType: "Review" }))],
  ["Triples.entityPage", Effect.flatMap(Triples, (s) => (s as any).entityPage({ entityType: "Review", limit: 5 }))],
  ["ConfigStore.load before discovery", Effect.flatMap(ConfigStore.ConfigStore, (s) => s.load())],
] as const) {
  const before = guardCounts.sent;
  const out = await rt.runPromise(effect as Effect.Effect<unknown, unknown>).then(() => "answered", (e: unknown) => JSON.stringify(e).includes("ScanRefused") || String((e as Error)?.message ?? e).includes("Refused before sending") ? "ScanRefused" : "other: " + String((e as Error)?.message ?? e).slice(0, 120));
  const rowReads = guardCounts.sent - before;
  check(`guard refuses ${what}`, out === "ScanRefused", `${out}; requests sent first: ${rowReads} (scope opening and basis only)`);
}
await rt.dispose();
bare.close();

// ---- 2. subject source equals store source for 20 anchored queries at one position ---------------------------------
const pulled = await call("read_subject", { account, subject: subjectNo });
const position = pulled.value["position"] as number;
const entities = [...new Set((pulled.value["facts"] as { entity: string }[]).map((f) => f.entity))].map((e) => (e.startsWith("acct/") ? e : demo.account(account).namespace + e)).sort();
assert(entities.length >= 20, `subject has ${entities.length} entities`);
const norm = (rows: Record<string, unknown>[]) => rows.map((r) => JSON.stringify(Object.fromEntries(Object.entries(r).sort().map(([k, v]) => [k, String(v)])))).sort();
let equal = 0;
const diffs: string[] = [];
for (const e of entities.slice(0, 20)) {
  const query = { find: ["?a", "?v"], where: [[e, "?a", "?v"]] };
  const [a, b] = await Promise.all([call("query", { query, from: one, basis: { position }, pageSize: 1000 }), call("query", { query, from: "store", basis: { position }, pageSize: 1000 })]);
  if (a.ok && b.ok && JSON.stringify(norm(a.value["bindings"])) === JSON.stringify(norm(b.value["bindings"])) && a.value["bindings"].length > 0) equal++;
  else diffs.push(`${e}: ${a.ok ? a.value["bindings"].length : a.value["error"].code} vs ${b.ok ? b.value["bindings"].length : b.value["error"].code}`);
}
check("subject source equals store source for 20 anchored queries at one position", equal === 20, diffs.length ? diffs.slice(0, 3).join("; ") : `20 entities at position ${position}`);

// ---- 3. six fixed questions against the generator's arithmetic ------------------------------------------------------
const a = conn.roster.findIndex((r) => r.account === account);
// The generator itself (imported at run time; its module is outside this package's type check).
const planPath = "../../../lab/experiments/EXP-DX1/scale1/decision/plan.ts";
const { person } = (await import(planPath)) as { person: (a: number, i: number) => { e: string; a: string; v: { type: string; value: unknown } }[] };
const facts = person(a, subjectNo);
const countA = (attr: string) => facts.filter((f) => f.a === attr).length;
const perEntity = (attr: string) => {
  const m = new Map<string, number>();
  for (const f of facts) if (f.a === attr) m.set(f.e, (m.get(f.e) ?? 0) + 1);
  return [...m.entries()].map(([e, n]) => `${e}=${n}`).sort();
};
const six: [string, object, (rows: any[]) => unknown, unknown][] = [
  ["placements of the root", { find: ["?p"], where: [[ids.root, ":person/placement", "?p"]] }, (r) => r.length, countA(":person/placement")],
  ["tasks through the placements (a join)", { find: ["?t"], where: [[ids.root, ":person/placement", "?p"], ["?p", ":placement/task", "?t"]] }, (r) => r.length, countA(":placement/task")],
  ["subtask links per task (a grouped count)", { find: ["?t", "?n"], where: [["?t", ":task/subtask", "?s"]], aggregate: [["count", "?s", "?n"]] }, (r) => r.map((x) => `${x["?t"]}=${x["?n"]}`).sort(), perEntity(":task/subtask")],
  ["files of the profile", { find: ["?f"], where: [["?w", ":person/file", "?f"]] }, (r) => r.length, countA(":person/file")],
  ["profiles of the root", { find: ["?w"], where: [[ids.root, ":person/profile", "?w"]] }, (r) => r.length, countA(":person/profile")],
  ["entities reachable from the first task (recursive rule)", { find: ["?y"], where: [["reach", ids.task, "?y"]], rules: [
    { name: "reach", body: [["?x", ":task/subtask", "?y"]] }, { name: "reach", body: [["?x", ":task/subtask", "?z"], ["reach", "?z", "?y"]] }] },
    (r) => r.length, new Set(facts.filter((f) => f.a === ":task/subtask" && f.e === ids.task).map((f) => f.v.value)).size],
];
for (const [what, query, measure, expected] of six) {
  const r = await call("query", { query, from: one, pageSize: 1000 });
  const got = r.ok ? measure(r.value["bindings"]) : r.value["error"];
  check(`generator arithmetic: ${what}`, JSON.stringify(got) === JSON.stringify(expected), `got ${JSON.stringify(got).slice(0, 120)}, generator ${JSON.stringify(expected).slice(0, 120)}`);
}

// ---- 4. paging, exact integers and the example questions ------------------------------------------------------------
const all = await call("query", { query: { find: ["?e", "?a", "?v"], where: [["?e", "?a", "?v"]] }, from: one, pageSize: 1000 });
const first = await call("query", { query: { find: ["?e", "?a", "?v"], where: [["?e", "?a", "?v"]] }, from: one, pageSize: 50 });
const second = await call("query", { query: { find: ["?e", "?a", "?v"], where: [["?e", "?a", "?v"]] }, from: one, pageSize: 50, cursor: first.value["cursor"] });
check("a second page is read at the first page's position and continues it", second.ok && second.value["position"] === first.value["position"] &&
  JSON.stringify([...first.value["bindings"], ...second.value["bindings"]]) === JSON.stringify(all.value["bindings"].slice(0, 100)), `total ${all.value["total"]}`);
const progress = await call("query", { query: { find: ["?t", "?p"], where: [["?t", ":task/progress", "?p"], [">=", "?p", 0]] }, from: one });
check("exact integers are evaluated as numbers and labelled", typeof all.value["exactIntegers"] === "string" && progress.ok && progress.value["columns"].find((c: any) => c.name === "?p")?.note === "exact integer, evaluated as a number" && progress.value["bindings"].length > 0);
const examples = JSON.parse(readFileSync(join(import.meta.dirname, "../../../demo/console/questions.json"), "utf8")) as { name: string; query: object; from: object | string; basis?: object; expect?: string }[];
let ran = 0;
const bad: string[] = [];
for (const original of examples) {
  const ex = adaptExample(original, account, subjectNo, conn.sealed.head, conn.roster[a]!.people);
  const { query, from, basis } = ex;
  const r = await call("query", { query, from, ...(basis ? { basis } : {}) });
  const expectRefused = ex.expect === "refused";
  if (r.ok !== !expectRefused || (expectRefused && r.value["error"].code !== "QueryRefused")) bad.push(`${ex.name}: ${JSON.stringify(r.value["error"] ?? r.value["total"])}`);
  else ran++;
}
check(`the ${examples.length} example questions run (the last one is refused)`, ran === examples.length, bad.join("; "));

demo.close();
const failed = checks.filter((c) => !c.ok);
const out = arg("--json");
if (out) writeFileSync(out, JSON.stringify({ gate: "query", at: new Date().toISOString(), checks, failed: failed.length }, null, 2) + "\n");
console.log(`QUERY GATE ${failed.length ? "FAILED" : "PASSED"}: ${checks.length - failed.length} of ${checks.length} checks`);
process.exit(failed.length ? 1 : 0);
