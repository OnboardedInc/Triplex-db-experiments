// [DX-CON1] Gate of build step 8 (functions), on the toy:
//   1. evaluate_derivation's candidates equal Derivation.evaluate over a copy built from level-by-level entity reads
//      (rows by entity ID at the same position, following ref values), identity and result for every candidate, and
//      every source fact the tool names exists in the stored rows with its attribute, transaction and position.
//   2. Reconcile matches a hand-built case: one open task is marked complete, and comparing with the position before
//      shows exactly that task removed and every other candidate unchanged.
// Usage: node src/gate-derive.ts [--account account-003] [--subject 9] [--json PATH]
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { KvTriples, Triples } from "@triplex-build/triplex";
import * as Derivation from "@triplex-build/triplex/derivation";
import { Context, Effect, Layer } from "effect";
import { rowValue } from "./entities.ts";
import { Demo, loadConnection } from "./store.ts";
import { runTool } from "./tools.ts";

const arg = (name: string, fallback?: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const account = arg("--account", "account-003")!;
assert(account !== "account-010");
const conn = loadConnection();
const demo = new Demo(conn);
const checks: { check: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: unknown, detail?: string) => {
  checks.push({ check: name, ok: ok === true, ...(detail ? { detail } : {}) });
  console.log(`${ok === true ? "PASS" : "FAIL"} ${name}${detail ? " -- " + detail : ""}`);
};
const call = (name: string, input: object) => runTool(name, input, "proof", demo) as Promise<Record<string, any>>;
const derivation = {
  name: "open-tasks",
  query: { find: ["?task", "?progress"], where: [["?placement", ":placement/task", "?task"], ["?task", ":task/progress", "?progress"], ["not", ["?task", ":task/status", "complete"]]] },
  identity: ["?task"],
};
// The first subject from --subject on that still has an open task (each run completes one).
const people = conn.roster.find((x) => x.account === account)!.people;
let subject = Number(arg("--subject", "9"));
let tool1 = await call("evaluate_derivation", { derivation, account, subject });
while (!tool1["candidates"].length && subject + 1 < people) tool1 = await call("evaluate_derivation", { derivation, account, subject: ++subject });
const root = demo.subjectIds(account, subject).root;

// 1. The reference: the subject's facts read level by level by entity ID at one position, into a fresh copy.
const position = tool1["position"] as number;
const validAt = Date.now();
const rows: Awaited<ReturnType<typeof demo.reader.rows>>[number][] = [];
let level = [root];
const seen = new Set<string>();
while (level.length) {
  level.forEach((e) => seen.add(e));
  const got = await demo.reader.rows(demo.db, { entityIds: level, basis: { recordedPosition: position, validAt } });
  rows.push(...got);
  level = [...new Set(got.filter((r) => r.value_type === "ref" && r.value_string && !seen.has(r.value_string)).map((r) => r.value_string!))];
}
const inputs = rows.map((r) => ({
  entityId: r.entity_id, attribute: r.attribute, validFrom: r.valid_from, ...(r.valid_to === null ? {} : { validTo: r.valid_to }),
  value: r.value_type === "integer" ? { type: "number", value: Number(rowValue(r)) } : r.value_type === "ref" ? { type: "ref", value: r.value_string } : r.value_type === "datetime" ? { type: "datetime", value: r.value_datetime } : r.value_type === "boolean" ? { type: "boolean", value: r.value_boolean === 1 } : r.value_type === "number" ? { type: "number", value: r.value_number } : r.value_type === "json" ? { type: "json", value: JSON.parse(r.value_json!) } : { type: "string", value: r.value_string },
}));
const reference = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
  const context = yield* Layer.build(Layer.fresh(KvTriples.layer));
  const memory = Context.get(context, Triples);
  yield* memory.assertBatch(inputs as never);
  const definition = yield* Derivation.make({ ...derivation, query: derivation.query as never, configSnapshot: tool1["derivation"].pinnedTo?.id ?? "console:no-release" });
  return yield* Derivation.evaluate(memory as never, definition, { basis: { validAt } });
})) as Effect.Effect<Derivation.Evaluation, unknown>);
const key = (identity: object, result: object) => JSON.stringify([identity, Object.fromEntries(Object.entries(result).map(([k, v]) => [k, typeof v === "object" && v && "value" in v ? String((v as { value: unknown }).value) : String(v)]))]);
const mine = (tool1["candidates"] as any[]).map((c) => key(c.identity, c.result)).sort();
const theirs = reference.candidates.map((c) => key(Object.fromEntries(Object.entries(c.identity).map(([k, v]) => [k, typeof v === "object" && v && "value" in v ? (v as { value: unknown }).value : v])), c.result)).sort();
check("candidates equal Derivation.evaluate over a copy built from level-by-level entity reads", JSON.stringify(mine) === JSON.stringify(theirs) && mine.length > 0,
  `${mine.length} candidates over ${rows.length} facts in ${seen.size} entities at position ${position}`);
const byId = new Map(rows.map((r) => [r.id, r]));
const sourcesOk = (tool1["candidates"] as any[]).every((c) => c.sources.length === reference.candidates.find((x) => key(Object.fromEntries(Object.entries(x.identity).map(([k, v]) => [k, typeof v === "object" && v && "value" in v ? (v as { value: unknown }).value : v])), x.result) === key(c.identity, c.result))?.sources.length &&
  c.sources.every((s: any) => byId.get(s.factId)?.attribute === s.attribute && byId.get(s.factId)?.tx_id === s.transaction && byId.get(s.factId)?.recorded_position === s.position));
check("every source names a stored fact with its attribute, transaction and position", sourcesOk);

// 2. A hand-built reconcile: mark one open task complete, then compare with the position before.
const open = tool1["candidates"] as any[];
const target = open[0].identity["?task"] as string;
const saved = await call("save_facts", { entity: target, changes: { ":task/status": "complete" } });
const tool2 = await call("evaluate_derivation", { derivation, account, subject, compareToPosition: position });
void root;
const r = tool2["reconcile"];
check("reconcile: exactly the completed task is removed, the rest unchanged", saved["readbackMatches"] === true && r.counts.removed === 1 && r.removed[0].identity["?task"] === target && r.counts.added === 0 && r.counts.changed === 0 && r.counts.unchanged === open.length - 1,
  JSON.stringify(r.counts));
const refused = await call("evaluate_derivation", { derivation: { ...derivation, query: { ...derivation.query, rules: [{ name: "x", body: [["?a", ":task/subtask", "?b"]] }] } }, account, subject }).then(() => "ran", (e: { code?: string }) => e.code);
check("a derivation with rules is refused (provenance follows patterns, comparisons and not)", refused === "QueryRefused");

demo.close();
const failed = checks.filter((c) => !c.ok);
const out = arg("--json");
if (out) writeFileSync(out, JSON.stringify({ gate: "derive", at: new Date().toISOString(), checks, failed: failed.length }, null, 2) + "\n");
console.log(`DERIVE GATE ${failed.length ? "FAILED" : "PASSED"}: ${checks.length - failed.length} of ${checks.length} checks`);
process.exit(failed.length ? 1 : 0);
