// [DX-DEMO1] Local MCP server (stdio) for showing the remote Triplex database. Every answer carries the time the
// gateways took, the round trip from this machine and the database position it was read or written at.
// Endpoints come from the private state file demo/connect.sh writes (default ~/.triplex-demo/connection.json).
// Why: the official SDK and typed tool inputs, so any MCP client (Claude Code, the desktop app, the Inspector) works.
// Rejected: the playground's hand-written JSON-RPC loop (bound to its fixture's actions).
import { statSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Demo, DemoError, entityKinds, stateFile } from "./store.ts";

let cached: { demo: Demo; mtime: number } | undefined;
function demo() {
  const mtime = statSync(stateFile()).mtimeMs;
  if (!cached || cached.mtime !== mtime) {
    cached?.demo.close();
    cached = { demo: new Demo(), mtime };
  }
  return cached.demo;
}

const json = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
async function answer(work: () => Promise<object>) {
  try {
    const value = await work();
    return { content: [{ type: "text" as const, text: json(value) }] };
  } catch (error) {
    const code = error instanceof DemoError ? error.code : ((error as { code?: string }).code ?? "Error");
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text" as const, text: json({ error: { code, message } }) }], isError: true };
  }
}

const account = z
  .union([z.string(), z.number().int()])
  .describe('Account key such as "account-001", or its number 1 to 10');
const member = z.number().int().min(0).describe("Member number of the person in the account (0 to people - 1)");
const kind = z
  .enum(entityKinds as [string, ...string[]])
  .default("task")
  .describe('Which of the person\'s entities: "person" (the root placement), "profile" (worker profile) or "task" (first task)');
const attribute = z.string().describe("Attribute name, e.g. :task/field-0, :placement/status, :worker/address");
const READ = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const CHANGE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
const changeNote =
  " CHANGES THE DATABASE: a real, durable, synchronous commit through the write gateway. Refused unless the connection is a demo working copy.";

const server = new McpServer({ name: "triplex-demo", version: "0.1.0" });

server.registerTool("database_summary", {
  title: "Database summary",
  description: "Size and position of the connected database: records counted at bring-up, people, accounts, the sealed head, the live head and how many transactions the demo added since the seal.",
  inputSchema: {},
  annotations: READ,
}, () => answer(() => demo().summary()));

server.registerTool("list_accounts", {
  title: "List accounts",
  description: "The accounts in the one database, each with its people count and member range, checked live against each account's directory entity.",
  inputSchema: {},
  annotations: READ,
}, () => answer(() => demo().listAccounts()));

server.registerTool("find_people", {
  title: "Find people",
  description: "People in an account by member number (the store's subject key), read live with their status. Protected values are never looked up by value.",
  inputSchema: { account, from: z.number().int().min(0).default(0).describe("First member number"), count: z.number().int().min(1).max(50).default(10) },
  annotations: READ,
}, (a) => answer(() => demo().findPeople(a.account, a.from, a.count)));

server.registerTool("read_person", {
  title: "Read a person now",
  description: "Every current fact of one person: the root and every entity reachable from it (profile, placements, tasks, subtasks, files), at one exact position, in one request to the read gateway.",
  inputSchema: { account, member, attribute: attribute.optional().describe("Only this attribute (optional)") },
  annotations: READ,
}, (a) => answer(() => demo().readPerson(a.account, a.member, a.attribute)));

server.registerTool("read_person_at", {
  title: "Read a person at an earlier date",
  description: "Both time axes: what we now believe was true on a date (valid time), and what the store believed about that date at a record time (default: the same date), with the facts that differ from today.",
  inputSchema: { account, member, at: z.string().describe("ISO date-time or epoch milliseconds"), attribute: attribute.optional().describe("Only this attribute; also lists the three views in full"), recordedAt: z.string().optional().describe("Record time for the 'believed' view; default is the same instant as at") },
  annotations: READ,
}, (a) => answer(() => demo().readPersonAt(a.account, a.member, a.at, a.attribute, a.recordedAt)));

server.registerTool("field_history", {
  title: "History of one field",
  description: "Every stored row of one attribute of one of the person's entities, including retired ones: value, valid from and to, recorded at and position, retired at and position.",
  inputSchema: { account, member, attribute, kind },
  annotations: READ,
}, (a) => answer(() => demo().fieldHistory(a.account, a.member, a.attribute, a.kind as never)));

server.registerTool("change_feed", {
  title: "Change feed",
  description: "The committed transactions after a position, in order, with every change (assert or retract, entity, attribute, value, valid time). Optionally only one account's changes. Pass the returned next as after to continue.",
  inputSchema: {
    after: z.number().int().min(0).optional().describe("Return transactions strictly after this position; default is the last few"),
    account: account.optional(),
    limit: z.number().int().min(1).max(200).default(20),
  },
  annotations: READ,
}, (a) => answer(() => demo().changeFeed(a.after, a.account, a.limit)));

server.registerTool("read_many_people", {
  title: "Read many people at one cut",
  description: "Up to 16 people of one account read together at the identical position in one request (the read gateway's multi-root pull): facts and entities per person.",
  inputSchema: { account, members: z.array(z.number().int().min(0)).min(1).max(16) },
  annotations: READ,
}, (a) => answer(() => demo().readManyPeople(a.account, a.members)));

server.registerTool("save_facts", {
  title: "Save facts",
  description: "Save new text values for one of a person's entities from now on, guarded by the entity's exact current state. Returns the receipt (transaction, durable position, record time) and reads the values back at that position." + changeNote,
  inputSchema: { account, member, kind, changes: z.record(z.string(), z.string()).describe('Attribute to new value, e.g. {":task/field-0": "approved"}') },
  annotations: CHANGE,
}, (a) => answer(() => demo().saveFacts(a.account, a.member, a.kind as never, a.changes)));

server.registerTool("correct_past_value", {
  title: "Correct a value as of a past date",
  description: "A valid-time correction: from a past date on, the attribute had a different value. Shows both beliefs about that date: as recorded before the correction and as recorded after it." + changeNote,
  inputSchema: { account, member, kind, attribute, value: z.string(), validFrom: z.string().describe("ISO date-time or epoch milliseconds in the past") },
  annotations: CHANGE,
}, (a) => answer(() => demo().correctPastValue(a.account, a.member, a.kind as never, a.attribute, a.value, a.validFrom)));

server.registerTool("retire_fact", {
  title: "Retire a fact",
  description: "Stop a fact being current from now on. It disappears from current reads; the time it was true stays in history and in earlier reads." + changeNote,
  inputSchema: { account, member, kind, attribute },
  annotations: CHANGE,
}, (a) => answer(() => demo().retireFact(a.account, a.member, a.kind as never, a.attribute)));

server.registerTool("remove_on_request", {
  title: "Removal on request",
  description: "Remove one person's protected values on request. Checks the database's removal state first and explains what it can and cannot remove." + changeNote,
  inputSchema: { account, member },
  annotations: CHANGE,
}, (a) => answer(() => demo().removeOnRequest(a.account, a.member)));

await server.connect(new StdioServerTransport());
