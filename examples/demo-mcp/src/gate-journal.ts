// [DX-CON1] Gate of build step 3 (functions), on the toy: the change_feed tool's pages equal Triplex's own
// Triples.transactions; the account and actor filters equal the same filters applied to that page; "who changed since"
// equals a direct count over every transaction read; one entity's journal equals transactionsForEntity; the long poll
// returns a commit made while it waits.
// Usage: node src/gate-journal.ts [--account account-003] [--json PATH]
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { EntityId, Triples } from "@triplex-build/triplex";
import { Effect } from "effect";
import { Demo, loadConnection, subjectKey } from "./store.ts";
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
const direct = (after: number, limit: number) => demo.read(Effect.flatMap(Triples, (s) => s.transactions({ after, limit })));
const ns = conn.roster.find((r) => r.account === account)!.namespace;

const head = (await call("database_summary", {}))["head"] as number;
const after = Math.max(0, head - 60);
const tool = await call("change_feed", { after, limit: 50 });
const page = await direct(after, 50);
const sig = (t: { position: number; txId: string; actor?: string | null | undefined; configSnapshot?: string | null | undefined; changes: readonly unknown[]; totalChanges?: number | undefined }) =>
  `${t.position} ${t.txId} ${t.actor ?? ""} ${t.configSnapshot ?? ""} ${t.totalChanges ?? t.changes.length}`;
check("a page equals Triples.transactions (position, transaction, actor, release, changes)", JSON.stringify(tool["transactions"].map(sig)) === JSON.stringify(page.transactions.map(sig)) && tool["next"] === (page.next ?? null),
  `${page.transactions.length} transactions after ${after}`);
const byAccount = await call("change_feed", { after, limit: 50, account });
const want = page.transactions.filter((t) => t.changes.some((c) => c.entityId.startsWith(ns)));
check("the account filter equals the same filter on that page", JSON.stringify(byAccount["transactions"].map((t: any) => t.position)) === JSON.stringify(want.map((t) => t.position)) &&
  byAccount["transactions"].every((t: any) => t.changes.every((c: any) => c.entity.startsWith(ns))), `${want.length} of ${page.transactions.length}`);
const actors = [...new Set(page.transactions.map((t) => t.actor ?? ""))].filter(Boolean);
for (const actor of actors.slice(0, 3)) {
  const r = await call("change_feed", { after, limit: 50, actor });
  check(`the actor filter equals the same filter on that page: ${actor}`, JSON.stringify(r["transactions"].map((t: any) => t.position)) === JSON.stringify(page.transactions.filter((t) => t.actor === actor).map((t) => t.position)));
}

// Who changed since: against a direct count over every transaction after the position.
const since = Math.max(0, head - 300);
const summary = await call("change_feed", { after: since, summary: true });
const counts = new Map<string, { tx: Set<number>; facts: number }>();
let cursor = since, read = 0;
for (;;) {
  const p = await direct(cursor, 1000);
  read += p.transactions.length;
  for (const t of p.transactions) for (const c of t.changes) {
    const k = subjectKey(c.entityId, conn.roster).subject;
    const e = counts.get(k) ?? { tx: new Set(), facts: 0 };
    e.tx.add(t.position); e.facts++; counts.set(k, e);
  }
  if (p.transactions.length < 1000 || p.next === undefined) break;
  cursor = p.next;
}
const mine = new Map((summary["subjects"] as any[]).map((s) => [s.subject, s]));
const same = counts.size === mine.size && [...counts].every(([k, v]) => mine.get(k)?.transactions === v.tx.size && mine.get(k)?.factsChanged === v.facts);
check("who changed since equals a direct count", same && summary["transactionsRead"] === read && summary["complete"] === true, `${summary["subjectsChanged"]} subjects in ${read} transactions after ${since}`);

// One entity's journal.
const entity = `${ns}i9:00000007`;
const mineE = await call("change_feed", { entity, limit: 20 });
const directE = await demo.read(Effect.flatMap(Triples, (s) => s.transactionsForEntity(EntityId.make(entity), { limit: 20 })));
check("one entity's journal equals transactionsForEntity, newest first", JSON.stringify(mineE["transactions"].map(sig)) === JSON.stringify(directE.transactions.map(sig)) &&
  mineE["transactions"].every((t: any, i: number, a: any[]) => i === 0 || a[i - 1].position > t.position), `${directE.transactions.length} transactions`);

// The long poll returns a commit made while it waits.
const now = (await call("database_summary", {}))["head"] as number;
const waiting = call("change_feed", { after: now, waitMs: 8000, limit: 5 });
await new Promise((ok) => setTimeout(ok, 700));
const saved = await call("save_facts", { account, subject: 7, kind: "task", changes: { ":task/field-3": `journal gate ${Date.now()}` } });
const woke = await waiting;
check("the long poll returns the commit made while it waits", woke["transactions"].some((t: any) => t.position === saved["position"]), `woke with ${woke["transactions"].length} transaction(s), wall ${woke["timing"].roundTripMs} ms (diagnostic)`);

demo.close();
const failed = checks.filter((c) => !c.ok);
const out = arg("--json");
if (out) writeFileSync(out, JSON.stringify({ gate: "journal", at: new Date().toISOString(), checks, failed: failed.length }, null, 2) + "\n");
console.log(`JOURNAL GATE ${failed.length ? "FAILED" : "PASSED"}: ${checks.length - failed.length} of ${checks.length} checks`);
process.exit(failed.length ? 1 : 0);
