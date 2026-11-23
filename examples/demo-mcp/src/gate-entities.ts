// [DX-CON1] Gates of build step 6 (functions), on the toy, through the console's HTTP server (as the app calls it):
//   - eight creates at once get eight different numbers, contiguous after the counter; two processes creating at once
//     also get distinct numbers;
//   - every read back equals what was written, with the entity type set;
//   - each create's journal entry carries the release live points to (configSnapshot) and the actor;
//   - typed save_facts, correct_past_value and retire_fact on a created entity; list_entities and read_entity
//     (with asSubject) agree with the creates; the type's checks refuse bad values before anything is sent.
// Usage: node src/gate-entities.ts [--port 28588] [--account account-003] [--json PATH]
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Triples } from "@triplex-build/triplex";
import { EntityId } from "@triplex-build/triplex";
import { Effect } from "effect";
import { Demo, loadConnection, stateFile } from "./store.ts";

const arg = (name: string, fallback?: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const port = Number(arg("--port", "28588"));
const account = arg("--account", "account-003")!;
assert(account !== "account-010");
const conn = loadConnection();
const demo = new Demo(conn);

const servers = [port, port + 1].map((p) => {
  const child = spawn(process.execPath, [join(import.meta.dirname, "page.ts"), String(p)], { env: { ...process.env, TRIPLEX_DEMO_STATE: stateFile() }, stdio: ["ignore", "pipe", "inherit"] });
  return { child, ready: new Promise<void>((ok) => child.stdout!.on("data", (b: Buffer) => b.toString().includes("Triplex Console server") && ok())) };
});
process.on("exit", () => servers.forEach((s) => s.child.kill()));
await Promise.all(servers.map((s) => s.ready));

const checks: { check: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: string) => {
  checks.push({ check: name, ok, ...(detail ? { detail } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -- " + detail : ""}`);
};
async function call(name: string, input: object, at = port) {
  const res = await fetch(`http://127.0.0.1:${at}/api/tools/${name}`, { method: "POST", headers: { "content-type": "application/json", origin: `http://127.0.0.1:${at}` }, body: JSON.stringify(input) });
  const value = (await res.json()) as Record<string, any>;
  return { ok: res.ok, value };
}

const types = await call("list_entity_types", {});
const review = types.value["types"]?.find((t: { name: string }) => t.name === "Review");
assert(review, "Review must be on live (run gate-config.ts first)");
const liveId = types.value["release"].id;
const before = (await call("list_entities", { type: "Review", account, count: 1 })).value["created"] as number;

// Eight at once through one server, then four at once spread over two servers (two processes).
const make = (i: number, at = port) => call("create_entity", { type: "Review", account, attributes: { ":review/outcome": "pending", ":review/of": `${conn.roster.find((r) => r.account === account)!.namespace}pl:${String(i % 12).padStart(8, "0")}`, ":review/note": `gate ${i}`, ":review/decided-on": "2026-11-09" }, validFrom: "2026-11-09T00:00:00Z" }, at);
const eight = await Promise.all([...Array(8).keys()].map((i) => make(i)));
const numbers = eight.map((r) => r.value["number"] as number).sort((a, b) => a - b);
check("eight creates at once get eight different numbers, contiguous after the counter", eight.every((r) => r.ok) && JSON.stringify(numbers) === JSON.stringify([...Array(8).keys()].map((i) => before + i)),
  eight.every((r) => r.ok) ? `numbers ${numbers[0]} to ${numbers[7]}` : JSON.stringify(eight.find((r) => !r.ok)?.value));
const two = await Promise.all([0, 1, 2, 3].map((i) => make(100 + i, i % 2 ? port + 1 : port)));
const twoNumbers = two.map((r) => r.value["number"] as number);
check("four creates at once from two processes get distinct numbers", two.every((r) => r.ok) && new Set(twoNumbers).size === 4 && twoNumbers.every((n) => n >= before + 8 && n < before + 12),
  two.every((r) => r.ok) ? `numbers ${twoNumbers.sort((a, b) => a - b).join(", ")}, attempts ${two.map((r) => r.value["receipt"].attempts).join(", ")}` : JSON.stringify(two.find((r) => !r.ok)?.value));
const all = [...eight, ...two];
check("every read back equals what was written, entity type set", all.every((r) => r.value["readbackMatches"] === true));

// The journal says which release governed each write, and who wrote it.
const firstPos = Math.min(...all.map((r) => r.value["position"] as number)) - 1;
const page = await demo.read(Effect.flatMap(Triples, (s) => s.transactions({ after: firstPos, limit: 100 })));
const byTx = new Map(page.transactions.map((t) => [t.txId as string, t]));
check("each create's journal entry carries the live release and actor console", all.every((r) => {
  const t = byTx.get(r.value["receipt"].txId);
  return t?.configSnapshot === liveId && t?.actor === "console";
}), `release ${liveId.slice(0, 20)}`);
const one = all[0]!.value;
const forEntity = await demo.read(Effect.flatMap(Triples, (s) => s.transactionsForEntity(EntityId.make(one["entity"]), { limit: 5 } as never)));
check("transactionsForEntity finds the create", JSON.stringify(forEntity).includes(one["receipt"].txId));

// Listing and reading.
const listed = await call("list_entities", { type: "Review", account, from: before, count: 12 });
check("list_entities lists the twelve by number with their values", listed.ok && listed.value["created"] === before + 12 &&
  listed.value["entities"].every((e: any) => e.present && e.attributes[":review/outcome"]?.[0] === "pending"), `created ${listed.value["created"]}`);
const read = await call("read_entity", { entity: one["entity"], asSubject: true });
check("read_entity: entity type Review, and read as a subject it reaches the referenced worker record", read.ok && read.value["entityType"] === "Review" &&
  read.value["subject"].entities >= 2 && read.value["subject"].facts.some((f: any) => f.attribute === ":subject/account"), `${read.value["subject"]?.entities} entities, ${read.value["subject"]?.factCount} facts`);

// Typed changes on the created entity.
const saved = await call("save_facts", { entity: one["entity"], changes: { ":review/outcome": "approved" } });
check("typed save_facts on a Review: read back matches, write pinned to the live release", saved.ok && saved.value["readbackMatches"] === true && saved.value["receipt"].configSnapshot === liveId, saved.ok ? `position ${saved.value["position"]}` : JSON.stringify(saved.value));
const corrected = await call("correct_past_value", { entity: one["entity"], attribute: ":review/outcome", value: "rejected", validFrom: "2026-11-16T00:00:00Z" });
check("typed correct_past_value on a Review: both beliefs, read back matches", corrected.ok && corrected.value["readbackMatches"] === true, corrected.ok ? JSON.stringify(Object.values(corrected.value["beliefs"])) : JSON.stringify(corrected.value));
const retired = await call("retire_fact", { entity: one["entity"], attribute: ":review/note" });
check("retire_fact on a Review: the note leaves current reads", retired.ok && retired.value["retiredFromCurrent"] === true, retired.ok ? undefined : JSON.stringify(retired.value));
const history = await call("field_history", { entity: one["entity"], attribute: ":review/outcome" });
check("field_history by entity keeps the retracted assertions", history.ok && history.value["rows"].some((r: any) => !r.live) && history.value["rows"].some((r: any) => r.live), `${history.value["totalRows"]} rows`);

// Refusals before anything is sent.
const refusals: [string, object, string][] = [
  ["a value outside the enum", { type: "Review", account, attributes: { ":review/outcome": "maybe", ":review/of": `acct/${account}/pl:00000001` } }, "InvalidInput"],
  ["a missing required attribute", { type: "Review", account, attributes: { ":review/outcome": "pending" } }, "InvalidInput"],
  ["a reference to an entity with no facts", { type: "Review", account, attributes: { ":review/outcome": "pending", ":review/of": `acct/${account}/pl:09999999` } }, "UnknownReference"],
  ["an attribute the type does not have", { type: "Review", account, attributes: { ":review/outcome": "pending", ":review/of": `acct/${account}/pl:00000001`, ":review/colour": "red" } }, "InvalidInput"],
  ["an entity of type Subject", { type: "Subject", account, attributes: {} }, "Reserved"],
];
for (const [what, input, code] of refusals) {
  const r = await call("create_entity", input);
  check(`create_entity refuses ${what}`, !r.ok && r.value["error"]?.code === code, r.value["error"]?.code);
}
const repeat = await call("create_entity", { type: "Review", account, commandId: one["receipt"].commandId, attributes: { ":review/outcome": "pending", ":review/of": `acct/${account}/pl:00000001` } });
check("a repeated commandId is refused with the original command named", !repeat.ok && repeat.value["error"]?.code === "CommandAlreadyCommitted", repeat.value["error"]?.code);
const reservedSave = await call("save_facts", { entity: `acct/${account}/console/type/Review`, changes: { ":console/next": "0" } });
check("a save to the console's own counter is refused", !reservedSave.ok);
const counts = await call("list_entity_types", {});
check("list_entity_types counts the created entities", counts.value["types"].find((t: any) => t.name === "Review").createdByAccount[account] === before + 12);

for (const s of servers) s.child.kill();
demo.close();
const failed = checks.filter((c) => !c.ok);
const out = arg("--json");
if (out) writeFileSync(out, JSON.stringify({ gate: "entities", at: new Date().toISOString(), checks, failed: failed.length }, null, 2) + "\n");
console.log(`ENTITIES GATE ${failed.length ? "FAILED" : "PASSED"}: ${checks.length - failed.length} of ${checks.length} checks`);
process.exit(failed.length ? 1 : 0);
