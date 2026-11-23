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
const subject = z.number().int().min(0).describe("Subject number in the account (0 to its subject count - 1)");
const kind = z
  .enum(entityKinds as [string, ...string[]])
  .default("task")
  .describe('Which of the subject\'s entities: "root" (the subject\'s root record), "profile" (worker profile) or "task" (first task)');
const attribute = z.string().describe("Attribute name, e.g. :task/field-0, :placement/status, :worker/address");
const READ = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const CHANGE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
const changeNote =
  " CHANGES THE DATABASE: a real, durable, synchronous commit through the write gateway. Refused unless the connection is a demo working copy.";

const server = new McpServer({ name: "triplex-demo", version: "0.1.0" });

server.registerTool("database_summary", {
  title: "Database summary",
  description: "Size and position of the connected database: records counted at bring-up, subjects, accounts, the sealed head, the live head, the record-time range and how many transactions the demo added since the seal. In this test data each subject is a worker record (profile, placements, tasks, subtasks, files).",
  inputSchema: {},
  annotations: READ,
}, () => answer(() => demo().summary()));

server.registerTool("list_accounts", {
  title: "List accounts",
  description: "The accounts in the one database, each with its subject count and subject numbers, from the sealed roster that bring-up checked. Pass checkDirectories to also read each account's directory entity live (slower).",
  inputSchema: { checkDirectories: z.boolean().default(false) },
  annotations: READ,
}, (a) => answer(() => demo().listAccounts(a.checkDirectories)));

server.registerTool("find_subjects", {
  title: "Find subjects",
  description: "Subjects in an account by subject number (the store's subject key), read live with their status. Protected values are never looked up by value.",
  inputSchema: { account, from: z.number().int().min(0).default(0).describe("First subject number"), count: z.number().int().min(1).max(50).default(10) },
  annotations: READ,
}, (a) => answer(() => demo().findSubjects(a.account, a.from, a.count)));

server.registerTool("read_subject", {
  title: "Read a subject now",
  description: "Every current fact of one subject: the root and every entity reachable from it (profile, placements, tasks, subtasks, files), at one exact position, in one request to the read gateway.",
  inputSchema: { account, subject, attribute: attribute.optional().describe("Only this attribute (optional)") },
  annotations: READ,
}, (a) => answer(() => demo().readSubject(a.account, a.subject, a.attribute)));

server.registerTool("read_subject_at", {
  title: "Read a subject at an earlier date",
  description: "Both time axes: what we now believe was true on a date (valid time), and what the store believed about that date at a record time (default: the same date), with the facts that differ from today.",
  inputSchema: { account, subject, at: z.string().describe("ISO date-time or epoch milliseconds"), attribute: attribute.optional().describe("Only this attribute; also lists the three views in full"), recordedAt: z.string().optional().describe("Record time for the 'believed' view; default is the same instant as at"), position: z.number().int().min(1).optional().describe("Or a database position for the 'believed' view (what the store held at that position)") },
  annotations: READ,
}, (a) => answer(() => demo().readSubjectAt(a.account, a.subject, a.at, a.attribute, a.recordedAt, a.position)));

server.registerTool("field_history", {
  title: "History of one field",
  description: "Every stored row of one attribute of one of the subject's entities, including retired ones: value, valid from and to, recorded at and position, retired at and position. Its cost follows how often that entity was saved: the gateway reads the entity's whole history (entityHistoryRows) and filters to the attribute afterwards.",
  inputSchema: { account, subject, attribute, kind, limit: z.number().int().min(1).max(2000).default(40).describe("Rows to return, newest first kept; the total is always reported") },
  annotations: READ,
}, (a) => answer(() => demo().fieldHistory(a.account, a.subject, a.attribute, a.kind as never, a.limit)));

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

server.registerTool("read_many_subjects", {
  title: "Read many subjects at one cut",
  description: "Up to 16 subjects of one account read together at the identical position in one request (the read gateway's multi-root pull): facts and entities per subject.",
  inputSchema: { account, subjects: z.array(z.number().int().min(0)).min(1).max(16) },
  annotations: READ,
}, (a) => answer(() => demo().readManySubjects(a.account, a.subjects)));

server.registerTool("save_facts", {
  title: "Save facts",
  description: "Save new text values for one of a subject's entities from now on, guarded by the entity's exact current state. Returns the receipt (transaction, durable position, record time) and reads the values back at that position." + changeNote,
  inputSchema: { account, subject, kind, changes: z.record(z.string(), z.string()).describe('Attribute to new value, e.g. {":task/field-0": "approved"}') },
  annotations: CHANGE,
}, (a) => answer(() => demo().saveFacts(a.account, a.subject, a.kind as never, a.changes)));

server.registerTool("correct_past_value", {
  title: "Correct a value as of a past date",
  description: "A valid-time correction: from a past date on, the attribute had a different value. Shows both beliefs about that date: as recorded before the correction and as recorded after it." + changeNote,
  inputSchema: { account, subject, kind, attribute, value: z.string(), validFrom: z.string().describe("ISO date-time or epoch milliseconds in the past") },
  annotations: CHANGE,
}, (a) => answer(() => demo().correctPastValue(a.account, a.subject, a.kind as never, a.attribute, a.value, a.validFrom)));

server.registerTool("retire_fact", {
  title: "Retire a fact",
  description: "Stop a fact being current from now on. It disappears from current reads; the time it was true stays in history and in earlier reads." + changeNote,
  inputSchema: { account, subject, kind, attribute },
  annotations: CHANGE,
}, (a) => answer(() => demo().retireFact(a.account, a.subject, a.kind as never, a.attribute)));

server.registerTool("remove_on_request", {
  title: "Removal on request",
  description: "Remove one subject's protected values on request. Checks the database's removal state first and explains what it can and cannot remove." + changeNote,
  inputSchema: { account, subject },
  annotations: CHANGE,
}, (a) => answer(() => demo().removeOnRequest(a.account, a.subject)));

await server.connect(new StdioServerTransport());
