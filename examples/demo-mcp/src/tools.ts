// [DX-CON1] The one tool catalogue of Triplex Console. Every entry has a name, a title, a group, the sentences a visitor
// says to an assistant, a zod input shape, whether it changes data, and a run function returning the answer with its
// envelope (position, timing, database, consoleUrl). mcp.ts registers this list; page.ts serves it at /api/catalogue and
// runs each entry at POST /api/tools/:name; the web app calls only those endpoints.
// Why: one definition, so the assistant, the app and the "Ask your assistant" page cannot disagree.
// Rejected: per-surface wrappers (the first demo had one in mcp.ts and another in page.ts, and they drifted).
import { statSync } from "node:fs";
import { z } from "zod";
import { caller, Demo, DemoError, entityKinds, stateFile, type Actor } from "./store.ts";

export type Group =
  | "The database"
  | "Types"
  | "Entities"
  | "Subjects"
  | "Time"
  | "Questions"
  | "Changes"
  | "The feed"
  | "Derivations"
  | "Removal";
export const groups: readonly Group[] = [
  "The database", "Types", "Entities", "Subjects", "Time", "Questions", "Changes", "The feed", "Derivations", "Removal",
];

export type Shape = z.ZodRawShape;
export type Tool<S extends Shape = Shape> = {
  name: string;
  title: string;
  group: Group;
  /** What a visitor says to an assistant; the first is the one the Assistant page shows. */
  sentences: string[];
  description: string;
  input: S;
  changes: boolean;
  run: (demo: Demo, input: z.infer<z.ZodObject<S>>) => Promise<object>;
  /** The console route that shows the same thing (path and query, no origin). */
  route: (input: z.infer<z.ZodObject<S>>, output: Record<string, unknown>) => string;
};
const tool = <S extends Shape>(t: Tool<S>) => t as unknown as Tool;

// ---- shared inputs ----------------------------------------------------------------------------------------------

const account = z
  .union([z.string(), z.number().int()])
  .describe('Account key such as "account-001", or its number 1 to 10');
const subject = z.number().int().min(0).describe("Subject number in the account (0 to its subject count - 1)");
const kind = z
  .enum(entityKinds as [string, ...string[]])
  .default("task")
  .describe('Which of the subject\'s entities: "root" (the subject\'s root record), "profile" (worker profile) or "task" (first task)');
const attribute = z.string().describe("Attribute name, e.g. :task/field-0, :placement/status, :worker/address");
const changeNote =
  " CHANGES THE DATABASE: a real, durable, synchronous commit through the write gateway. Refused unless the connection is a demo working copy.";

// ---- console routes ---------------------------------------------------------------------------------------------
// The web app owns these paths (examples/console). Each tool answer carries one as consoleUrl.

const q = (params: Record<string, string | number | undefined | null>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "") as [string, string | number][];
  return entries.length ? "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString() : "";
};
export const routes = {
  home: () => "/",
  about: () => "/about",
  account: (a: string) => `/accounts/${encodeURIComponent(a)}`,
  subject: (a: string, n: number, extra: Record<string, string | number | undefined> = {}) =>
    `/accounts/${encodeURIComponent(a)}/subjects/${n}${q(extra)}`,
  entity: (id: string, extra: Record<string, string | number | undefined> = {}) => `/entities/${encodeURIComponent(id)}${q(extra)}`,
  journal: (extra: Record<string, string | number | undefined> = {}) => `/journal${q(extra)}`,
  types: (name?: string) => (name ? `/types/${encodeURIComponent(name)}` : "/types"),
  configuration: () => "/configuration",
  query: () => "/query",
  assistant: (toolName?: string) => `/assistant${toolName ? "#" + toolName : ""}`,
};

// ---- the catalogue ----------------------------------------------------------------------------------------------

export const tools: Tool[] = [
  tool({
    name: "database_summary",
    title: "Database summary",
    group: "The database",
    sentences: ["How big is the database and where is its head?"],
    description:
      "Size and position of the connected database: records counted at bring-up, subjects, accounts, the sealed head, the live head, the record-time range and how many transactions the demo added since the seal. In this test data each subject is a worker record (profile, placements, tasks, subtasks, files).",
    input: {},
    changes: false,
    run: (d) => d.summary(),
    route: () => routes.about(),
  }),
  tool({
    name: "list_accounts",
    title: "List accounts",
    group: "The database",
    sentences: ["List the accounts."],
    description:
      "The accounts in the one database, each with its subject count and subject numbers, from the sealed roster that bring-up checked. Pass checkDirectories to also read each account's directory entity live (slower).",
    input: { checkDirectories: z.boolean().default(false) },
    changes: false,
    run: (d, a) => d.listAccounts(a.checkDirectories),
    route: () => routes.home(),
  }),
  tool({
    name: "find_subjects",
    title: "Find subjects",
    group: "Subjects",
    sentences: ["Show the first five subjects in account-003."],
    description:
      "Subjects in an account by subject number (the store's subject key), read live with their status. Protected values are never looked up by value.",
    input: {
      account,
      from: z.number().int().min(0).default(0).describe("First subject number"),
      count: z.number().int().min(1).max(50).default(10),
    },
    changes: false,
    run: (d, a) => d.findSubjects(a.account, a.from, a.count),
    route: (a, out) => routes.account(String(out["account"] ?? a.account)) + q({ from: a.from }),
  }),
  tool({
    name: "read_subject",
    title: "Read a subject now",
    group: "Subjects",
    sentences: ["Read everything about subject 0 of account-003."],
    description:
      "Every current fact of one subject: the root and every entity reachable from it (profile, placements, tasks, subtasks, files), at one exact position, in one request to the read gateway.",
    input: { account, subject, attribute: attribute.optional().describe("Only this attribute (optional)") },
    changes: false,
    run: (d, a) => d.readSubject(a.account, a.subject, a.attribute),
    route: (a, out) => routes.subject(String(out["account"]), a.subject, { position: out["position"] as number }),
  }),
  tool({
    name: "read_many_subjects",
    title: "Read many subjects at one cut",
    group: "Subjects",
    sentences: ["Read subjects 50000 to 50015 of account-003 at one position."],
    description:
      "Up to 16 subjects of one account read together at the identical position in one request (the read gateway's multi-root pull): facts and entities per subject.",
    input: { account, subjects: z.array(z.number().int().min(0)).min(1).max(16) },
    changes: false,
    run: (d, a) => d.readManySubjects(a.account, a.subjects),
    route: (a, out) => routes.account(String(out["account"])) + q({ subjects: a.subjects.join(","), position: out["position"] as number }),
  }),
  tool({
    name: "read_subject_at",
    title: "Read a subject at an earlier date",
    group: "Time",
    sentences: ["What did we believe about subject 0 on 1 June 2025, and what do we know now?"],
    description:
      "Both time axes: what we now believe was true on a date (valid time), and what the store believed about that date at a record time (default: the same date), with the facts that differ from today.",
    input: {
      account,
      subject,
      at: z.string().describe("ISO date-time or epoch milliseconds"),
      attribute: attribute.optional().describe("Only this attribute; also lists the three views in full"),
      recordedAt: z.string().optional().describe("Record time for the 'believed' view; default is the same instant as at"),
      position: z.number().int().min(0).optional().describe("Exact recorded position for the 'believed' view (instead of recordedAt)"),
    },
    changes: false,
    run: (d, a) => {
      if (a.position !== undefined && a.recordedAt !== undefined)
        throw new DemoError("InvalidInput", "Give recordedAt or position, not both");
      return d.readSubjectAt(a.account, a.subject, a.at, a.attribute, a.recordedAt, a.position);
    },
    route: (a, out) =>
      routes.subject(String(out["account"]), a.subject, { tab: "time", at: a.at, attribute: a.attribute, recordedAt: a.recordedAt, believedPosition: a.position }),
  }),
  tool({
    name: "field_history",
    title: "History of one field",
    group: "Time",
    sentences: ["Show the full history of :task/field-0 on subject 0's first task."],
    description:
      "Every stored row of one attribute of one of the subject's entities, including retired ones: value, valid from and to, recorded at and position, retired at and position. Its cost follows how often that entity was saved: the gateway reads the entity's whole history (entityHistoryRows) and filters to the attribute afterwards.",
    input: {
      account,
      subject,
      attribute,
      kind,
      limit: z.number().int().min(1).max(2000).default(40).describe("Rows to return, newest first kept; the total is always reported"),
    },
    changes: false,
    run: (d, a) => d.fieldHistory(a.account, a.subject, a.attribute, a.kind as never, a.limit),
    route: (a, out) => routes.entity(String(out["entity"]), { tab: "history", attribute: a.attribute }),
  }),
  tool({
    name: "save_facts",
    title: "Save facts",
    group: "Changes",
    sentences: ["Set :task/field-0 on subject 7 of account-003 to reviewed."],
    description:
      "Save new text values for one of a subject's entities from now on, guarded by the entity's exact current state. Returns the receipt (transaction, durable position, record time) and reads the values back at that position." +
      changeNote,
    input: {
      account,
      subject,
      kind,
      changes: z.record(z.string(), z.string()).describe('Attribute to new value, e.g. {":task/field-0": "approved"}'),
    },
    changes: true,
    run: (d, a) => d.saveFacts(a.account, a.subject, a.kind as never, a.changes),
    route: (_a, out) => routes.entity(String(out["entity"]), { tab: "journal" }),
  }),
  tool({
    name: "correct_past_value",
    title: "Correct a value as of a past date",
    group: "Changes",
    sentences: ["We learned :task/field-0 on subject 7 of account-003 was approved from last Monday. Record that."],
    description:
      "A valid-time correction: from a past date on, the attribute had a different value. Shows both beliefs about that date: as recorded before the correction and as recorded after it." +
      changeNote,
    input: {
      account,
      subject,
      kind,
      attribute,
      value: z.string(),
      validFrom: z.string().describe("ISO date-time or epoch milliseconds in the past"),
    },
    changes: true,
    run: (d, a) => d.correctPastValue(a.account, a.subject, a.kind as never, a.attribute, a.value, a.validFrom),
    route: (a, out) => routes.entity(String(out["entity"]), { tab: "time", attribute: a.attribute, at: a.validFrom }),
  }),
  tool({
    name: "retire_fact",
    title: "Retire a fact",
    group: "Changes",
    sentences: ["Retire :task/field-2 on subject 7 of account-003."],
    description:
      "Stop a fact being current from now on. It disappears from current reads; the time it was true stays in history and in earlier reads." +
      changeNote,
    input: { account, subject, kind, attribute },
    changes: true,
    run: (d, a) => d.retireFact(a.account, a.subject, a.kind as never, a.attribute),
    route: (a, out) => routes.entity(String(out["entity"]), { tab: "history", attribute: a.attribute }),
  }),
  tool({
    name: "change_feed",
    title: "Change feed",
    group: "The feed",
    sentences: ["Who changed since position 28,309,866?"],
    description:
      "The committed transactions after a position, in order, with every change (assert or retract, entity, attribute, value, valid time). Optionally only one account's changes. Pass the returned next as after to continue.",
    input: {
      after: z.number().int().min(0).optional().describe("Return transactions strictly after this position; default is the last few"),
      account: account.optional(),
      limit: z.number().int().min(1).max(200).default(20),
    },
    changes: false,
    run: (d, a) => d.changeFeed(a.after, a.account, a.limit),
    route: (a, out) => routes.journal({ after: out["after"] as number, account: a.account === undefined ? undefined : String(out["account"]) }),
  }),
  tool({
    name: "remove_on_request",
    title: "Removal on request",
    group: "Removal",
    sentences: ["Remove subject 0's protected values."],
    description:
      "Remove one subject's protected values on request. Checks the database's removal state first and explains what it can and cannot remove. On this database it changes nothing: it holds no protected values, and the gateway refuses a protection declaration on a populated scope.",
    input: { account, subject },
    changes: false,
    run: (d, a) => d.removeOnRequest(a.account, a.subject),
    route: () => routes.about() + "?tab=limits",
  }),
];

export const byName = new Map(tools.map((t) => [t.name, t]));
export const annotations = (t: Tool) =>
  t.changes
    ? ({ readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const)
    : ({ readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const);

// ---- running a tool ---------------------------------------------------------------------------------------------

let cached: { demo: Demo; mtime: number } | undefined;
/** One Demo per connection file; a new connect.sh (new file time) gets a fresh one. */
export function currentDemo() {
  const mtime = statSync(stateFile()).mtimeMs;
  if (!cached || cached.mtime !== mtime) {
    cached?.demo.close();
    cached = { demo: new Demo(), mtime };
  }
  return cached.demo;
}

export const consoleOrigin = () => process.env["TRIPLEX_CONSOLE_URL"] ?? "http://127.0.0.1:28580";

/** The `database` field of every answer: which database answered. */
export function databaseOf(d: Demo) {
  const c = d.connection;
  return {
    id: c.database,
    kind: c.kind,
    label: c.kind === "1b" ? "The 1 billion record database (working copy)" : "Small database on this Mac (working copy)",
    workingCopy: c.workingCopy,
  };
}

export type ToolError = { error: { code: string; message: string } };
export const errorOf = (error: unknown): ToolError => {
  const code = error instanceof DemoError ? error.code
    : error instanceof z.ZodError ? "InvalidInput"
    : ((error as { code?: string; _tag?: string }).code ?? (error as { _tag?: string })._tag ?? "Error");
  const message = error instanceof z.ZodError ? z.prettifyError(error)
    : error instanceof Error ? error.message
    : typeof error === "object" && error !== null && "message" in error ? String((error as { message: unknown }).message)
    : String(error);
  return { error: { code, message } };
};

/**
 * Validate the input with the tool's own schema, run it as the given actor, and add the envelope. Throws a ToolError
 * shape on failure (callers render it): the MCP server as an isError result, the HTTP server as a 400.
 */
export async function runTool(name: string, rawInput: unknown, actor: Actor, demo: Demo = currentDemo()): Promise<object> {
  const t = byName.get(name);
  if (!t) throw new DemoError("UnknownTool", `No tool named ${name}`);
  const input = z.object(t.input).parse(rawInput ?? {});
  const out = (await caller.run({ actor }, () => t.run(demo, input as never))) as Record<string, unknown>;
  return { ...out, database: databaseOf(demo), consoleUrl: consoleOrigin() + t.route(input as never, out) };
}

/** JSON text the same way on every surface: bigints as decimal text, two-space indent. */
export const toJson = (value: unknown) =>
  JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);

/** The catalogue as the web app and the Assistant page read it. */
export function catalogue() {
  return {
    version: "triplex-console-catalogue/1",
    server: "triplex-demo",
    groups,
    tools: tools.map((t) => ({
      name: t.name,
      title: t.title,
      group: t.group,
      sentences: t.sentences,
      description: t.description,
      changes: t.changes,
      annotations: annotations(t),
      inputSchema: z.toJSONSchema(z.object(t.input), { io: "input", unrepresentable: "any" }),
    })),
  };
}
