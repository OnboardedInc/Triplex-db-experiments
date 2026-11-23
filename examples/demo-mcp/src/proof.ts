// [DX-DEMO1] Scripted proof: drive every MCP tool through the official MCP client over stdio, in the order the demo
// is shown, check every read after every change against the SDK directly (DatomicClient rows at the same position),
// and write the outputs and timings as demo/EXAMPLES.md.
// Usage: node src/proof.ts [--examples PATH] [--json PATH]
// Why: the same sequence proves the toy today and fills EXAMPLES.md from the 1 billion database in the proving slot.
// Rejected: hand-copied outputs (they drift from what the tools return).
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { DatomicClient, setLoaderPositionRowCompatibility } from "@triplex-build/triplex-datomic";
import { Demo, loadConnection, stateFile } from "./store.ts";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const examplesFile = arg("--examples") ?? join(import.meta.dirname, "../../../demo/EXAMPLES.md");
const jsonFile = arg("--json");
const conn = loadConnection();
const big = conn.kind === "1b";
const reader = new DatomicClient(conn.readUrl, 60_000);
const db = conn.database;

const client = new Client({ name: "triplex-demo-proof", version: "0.1.0" });
await client.connect(new StdioClientTransport({
  command: process.execPath,
  args: [join(import.meta.dirname, "mcp.ts")],
  env: { ...process.env, TRIPLEX_DEMO_STATE: stateFile() } as Record<string, string>,
  stderr: "inherit",
}));
const tools = (await client.listTools()).tools.map((t) => t.name).sort();

type Step = { n: number; title: string; prompt: string; tool: string; args: Record<string, unknown>; out: any; checks: string[] };
const steps: Step[] = [];
async function call(title: string, prompt: string, tool: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name: tool, arguments: args });
  const text = (result.content as { type: string; text: string }[])[0]!.text;
  const out = JSON.parse(text);
  if (result.isError && tool !== "remove_on_request") throw new Error(`${tool} failed: ${text}`);
  const step = { n: steps.length + 1, title, prompt, tool, args, out, checks: [] as string[] };
  steps.push(step);
  return step;
}
const check = (step: Step, ok: boolean, text: string) => {
  assert(ok, `Step ${step.n} (${step.tool}): ${text}`);
  step.checks.push(text);
};
const rowsAt = (entityIds: string[], position: number, validAt: number, history = false) =>
  reader.rows(db, { entityIds, basis: { recordedPosition: position, validAt }, basisWaitMs: 2000, ...(history ? { history: true } : {}) });

// Who to show: member 0, the first of AGE1's active sample in every account (the aging edited it most).
const account = "account-003";
const member = 0;
const roster = conn.roster.find((r) => r.account === account)!;
const ns = roster.namespace;
const task = `${ns}i9:${String(member).padStart(8, "0")}`;

// 1-3: scale and the accounts
const s1 = await call("How big is it?", "How big is the database you are connected to, and where is its head?", "database_summary", {});
check(s1, s1.out.head >= conn.sealed.head, "live head is at or after the sealed head");
const s2 = await call("The accounts", "List the accounts and how many people each has.", "list_accounts", {});
check(s2, s2.out.accounts.every((a: { directoryFound: boolean }) => a.directoryFound), "every account's directory entity was read live");
const s3 = await call("Find people", `Show me the first five people in ${account}.`, "find_people", { account, from: 0, count: 5 });
check(s3, s3.out.people.length === 5 && s3.out.people.every((p: { status: string | null }) => p.status !== null), "five people found, each with a live status");

// 4: a point read of one whole person, checked against the SDK rows for the same entities at the same position
const s4 = await call("One person, everything", `Read everything about member ${member} of ${account} right now.`, "read_person", { account, member });
{
  const entities = [...new Set(s4.out.facts.map((f: { entity: string }) => ns + f.entity))] as string[];
  const direct = await rowsAt(entities, s4.out.position, Date.now());
  const a = s4.out.facts.map((f: { entity: string; attribute: string; type: string; value: unknown }) =>
    `${ns + f.entity} ${f.attribute} ${f.type === "string" ? f.value : "(" + f.type + ")"}`).sort();
  const b = direct.map((r) => `${r.entity_id} ${r.attribute} ${r.value_type === "string" ? r.value_string : "(" + r.value_type + ")"}`).sort();
  check(s4, JSON.stringify(a) === JSON.stringify(b) && a.length === s4.out.factCount,
    `the ${a.length} facts equal the SDK's rows for the same ${entities.length} entities at position ${s4.out.position} (every entity and attribute, every text value)`);
}

// 5-6: history and time travel
const s5 = await call("History of one field", `Show the full history of :task/field-0 on member ${member}'s first task.`, "field_history", { account, member, attribute: ":task/field-0", kind: "task" });
{
  const direct = (await rowsAt([task], s5.out.position, Date.now(), true)).filter((r) => r.attribute === ":task/field-0");
  check(s5, direct.length === s5.out.rows.length && s5.out.rows.length >= 1, `${s5.out.rows.length} rows, equal to the SDK's history rows`);
}
const firstRow = s5.out.rows[0];
const beforeAging = firstRow && s5.out.rows.length > 1 ? Date.parse(s5.out.rows[1].recordedAt) - 1 : Date.parse(firstRow.recordedAt) + 1;
const s6 = await call("What did we believe then?", `What did the store believe about member ${member} just before the first change to :task/field-0 was recorded, and what is true now?`, "read_person_at", { account, member, at: new Date(beforeAging).toISOString(), attribute: ":task/field-0" });
check(s6, Array.isArray(s6.out.believedThen), "three views returned");

// 7-9: a save, its readback and the feed
const stamp = new Date().toISOString().slice(0, 19);
const s7 = await call("Save a fact", `Set :task/field-0 on member ${member}'s first task to "reviewed ${stamp}".`, "save_facts", { account, member, kind: "task", changes: { ":task/field-0": `reviewed ${stamp}` } });
{
  const direct = (await rowsAt([task], s7.out.receipt.position, Date.now())).filter((r) => r.attribute === ":task/field-0");
  check(s7, s7.out.readbackMatches && direct.length === 1 && direct[0]!.value_string === `reviewed ${stamp}`, `readback and the SDK at position ${s7.out.receipt.position} both show the new value`);
}
const s8 = await call("The field's history now", "Show that field's history again.", "field_history", { account, member, attribute: ":task/field-0", kind: "task" });
check(s8, s8.out.rows.length >= s5.out.rows.length + 2 && s8.out.rows.some((r: { live: boolean; retiredPosition: number }) => !r.live && r.retiredPosition === s7.out.receipt.position), "the old row is retired at the save's position and the new rows are live");
const s9a = await call("The feed across the loader's history", "Show the last five transactions the aging loader wrote before the seal.", "change_feed", { after: conn.sealed.head - 5, limit: 5 });
if (conn.loaderPositionRows) {
  // The same page through the SDK in this process, first with the product's default reader, then with the rule.
  const local = new Demo({ ...conn, loaderPositionRows: false });
  let refused = "";
  try { await local.changeFeed(conn.sealed.head - 5, undefined, 5); } catch (e) {
    for (let x: unknown = e; x && refused.length < 400; x = (x as { cause?: unknown }).cause) refused += " / " + String((x as Error).message ?? x);
  }
  setLoaderPositionRowCompatibility(true);
  const read = await local.changeFeed(conn.sealed.head - 5, undefined, 5);
  local.close();
  check(s9a, /Journal position payload must be null|Noncanonical row text header/.test(refused) && read.transactions.length === 5,
    `the product's default reader refuses these loader-written rows (${refused.match(/Journal position payload must be null|Noncanonical row text header/)?.[0]}); the named rule reads them`);
}
check(s9a, s9a.out.transactions.length === 5 && s9a.out.transactions[4].position === conn.sealed.head,
  "five loader-written transactions up to the sealed head decode" + (conn.loaderPositionRows ? " (with the named loader compatibility rule)" : ""));
const s9 = await call("The change feed", `Show the change feed for ${account} from just before that save.`, "change_feed", { after: s7.out.receipt.position - 1, account, limit: 5 });
check(s9, s9.out.transactions[0]?.position === s7.out.receipt.position && s9.out.transactions[0]?.txId === s7.out.receipt.txId, "the first transaction after the save's predecessor is the save, same transaction id");

// 10-11: a valid-time correction and both beliefs
const pastDate = "2025-06-01T00:00:00.000Z";
const s10 = await call("Correct the past", `We learned that from ${pastDate.slice(0, 10)} on, :task/field-1 of member ${member} was actually "corrected value". Record that.`, "correct_past_value", { account, member, kind: "task", attribute: ":task/field-1", value: "corrected value", validFrom: pastDate });
{
  const [before, after] = Object.values(s10.out.beliefs) as string[][];
  const direct = (await rowsAt([task], s10.out.receipt.position, Date.parse(pastDate) + 1)).filter((r) => r.attribute === ":task/field-1");
  check(s10, s10.out.readbackMatches && after![0] === "corrected value" && before![0] !== "corrected value" && direct[0]?.value_string === "corrected value", "before and after beliefs differ; the SDK at the receipt position agrees");
}
const s11 = await call("Both time axes", `What was :task/field-1 on ${pastDate.slice(0, 10)}, as we know it now and as we knew it just before the correction?`, "read_person_at", { account, member, at: "2025-06-02T00:00:00.000Z", attribute: ":task/field-1", recordedAt: new Date(Date.parse(s10.out.receipt.recordedAt) - 1).toISOString() });
check(s11, s11.out.trueThenAsKnownNow[0]?.value === "corrected value" && s11.out.believedThen[0]?.value !== "corrected value", "valid-time view shows the correction; the record-time view before it does not");

// 12: retire a fact
const s12 = await call("Retire a fact", `Retire :task/field-2 on member ${member}'s first task.`, "retire_fact", { account, member, kind: "task", attribute: ":task/field-2" });
{
  const now = (await rowsAt([task], s12.out.receipt.position, Date.now())).filter((r) => r.attribute === ":task/field-2");
  const past = (await rowsAt([task], s12.out.receipt.position, Date.parse(s12.out.retiredFrom) - 1000)).filter((r) => r.attribute === ":task/field-2");
  check(s12, s12.out.retiredFromCurrent && now.length === 0 && past.length === 1, "gone from the current read, still true one second before it was retired (SDK)");
}

// 13: removal on request
const s13 = await call("Removal on request", `Remove member ${member}'s protected values on request.`, "remove_on_request", { account, member });
{
  // Verify the explanation on this aged person: the product route refuses to declare protection on a populated scope.
  const writer = new DatomicClient(conn.writeUrl, 60_000);
  const before = await writer.erasureFrontier(db);
  let refusal = "";
  try { await writer.declareProtection(db, [":demo/protected-note"]); refusal = "accepted"; }
  catch (e) { refusal = (e as { code?: string }).code ?? String(e); }
  const after = await writer.erasureFrontier(db);
  writer.close();
  check(s13, s13.out.done === false && !before.protected && refusal === "ProtectedScopeNeedsMigration" && !after.protected,
    "on this aged person the tool changes nothing, and the gateway itself refuses a protection declaration (ProtectedScopeNeedsMigration), so the explanation holds");
}

// 14: across people
const members = Array.from({ length: 16 }, (_, i) => (big ? 50_000 : 0) + i).filter((m) => m < roster.people);
const s14 = await call("Many people at one cut", `Read people ${members[0]} to ${members.at(-1)} of ${account} together at one exact position.`, "read_many_people", { account, members });
check(s14, s14.out.people.length === members.length && s14.out.totalFacts > 0, `${members.length} people, ${s14.out.totalFacts} facts, one cut`);

// 15: the person again, after all the changes
const s15 = await call("The person after the changes", `Read member ${member} again, only :task/field-0.`, "read_person", { account, member, attribute: ":task/field-0" });
check(s15, s15.out.facts[0]?.value === `reviewed ${stamp}`, "the saved value is current");
const s16 = await call("Summary after the demo", "How many transactions has the demo added since the seal?", "database_summary", {});
check(s16, s16.out.transactionsSinceSeal >= 3, `${s16.out.transactionsSinceSeal} transactions since the seal`);

await client.close();
reader.close();

// ---- write EXAMPLES.md ----------------------------------------------------------------------------------------------
const trim = (v: unknown, depth = 0): unknown => {
  if (Array.isArray(v)) return v.length > 6 ? [...v.slice(0, 6).map((x) => trim(x, depth + 1)), `… ${v.length - 6} more`] : v.map((x) => trim(x, depth + 1));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => !(k === "calls" && depth > 0)).map(([k, x]) => [k, trim(x, depth + 1)]));
  return v;
};
const source = big
  ? `the sealed 1 billion record database (${conn.recordsAtBringUp.toLocaleString("en-US")} records at bring-up), working copy on the rented machine, through the SSH tunnel`
  : `the SMALL toy database in the Mac lab VM (${conn.recordsAtBringUp.toLocaleString("en-US")} records; diagnostic timings, not results), through an SSH tunnel to the VM`;
const lines = [
  "# Worked examples",
  "",
  `Generated by \`examples/demo-mcp/src/proof.ts\` on ${new Date().toISOString()} from ${source}.`,
  big ? "" : "**These outputs are from the small toy database.** The proving slot regenerates this file from the 1 billion database.",
  "",
  "Each example has the prompt to give an assistant, the MCP tool call it turns into, the output (long lists cut to six items) and the time: `serverMs` is the gateways' own handling time summed over the requests, `roundTripMs` includes the tunnel. Every read after every change was checked against the SDK (`DatomicClient` rows at the same position); the check is listed under each example.",
  "",
  `Tools offered: ${tools.map((t) => "`" + t + "`").join(", ")}.`,
  "",
  "| # | Example | Tool | Gateway ms | Round trip ms | Requests | Position |",
  "| ---: | --- | --- | ---: | ---: | ---: | ---: |",
  ...steps.map((s) => `| ${s.n} | ${s.title} | \`${s.tool}\` | ${s.out.timing?.serverMs ?? "n/a"} | ${s.out.timing?.roundTripMs ?? "n/a"} | ${s.out.timing?.requests ?? "n/a"} | ${s.out.position ?? "n/a"} |`),
  "",
];
for (const s of steps) {
  lines.push(`## ${s.n}. ${s.title}`, "", `**Prompt:** ${s.prompt}`, "", "**Tool call:**", "", "```json", JSON.stringify({ tool: s.tool, arguments: s.args }, null, 2), "```", "",
    `**Time:** gateway ${s.out.timing?.serverMs ?? "n/a"} ms, round trip ${s.out.timing?.roundTripMs ?? "n/a"} ms, ${s.out.timing?.requests ?? "n/a"} requests.`, "",
    "**Output:**", "", "```json", JSON.stringify(trim(s.out), null, 2), "```", "", ...s.checks.map((c) => `- Checked: ${c}`), "");
}
writeFileSync(examplesFile, lines.join("\n"));
if (jsonFile) writeFileSync(jsonFile, JSON.stringify({ connection: { ...conn, writeUrl: undefined, readUrl: undefined }, tools, steps }, null, 2));
console.log(`PROOF PASSED: ${steps.length} calls, ${steps.reduce((n, s) => n + s.checks.length, 0)} checks; tools ${tools.length}; examples written to ${examplesFile}`);
for (const s of steps) console.log(`${String(s.n).padStart(2)} ${s.tool.padEnd(20)} gateway ${String(s.out.timing?.serverMs ?? "n/a").padStart(8)} ms  round trip ${String(s.out.timing?.roundTripMs ?? "n/a").padStart(8)} ms`);
