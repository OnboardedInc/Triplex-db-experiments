// [DX-CON1] The one tool catalogue of Triplex Console. Every entry has a name, a title, a group, the sentences a visitor
// says to an assistant, a zod input shape, whether it changes data, and a run function returning the answer with its
// envelope (position, timing, database, consoleUrl). mcp.ts registers this list; page.ts serves it at /api/catalogue and
// runs each entry at POST /api/tools/:name; the web app calls only those endpoints.
// Why: one definition, so the assistant, the app and the "Ask your assistant" page cannot disagree.
// Rejected: per-surface wrappers (the first demo had one in mcp.ts and another in page.ts, and they drifted).
import { statSync } from "node:fs";
import { z } from "zod";
import { evaluateDerivation } from "./derive.ts";
import { runQuery } from "./query.ts";
import { createEntity, listEntities, readEntity, resolveBasis, typingFor } from "./entities.ts";
import { askAcross, describeKind, listIds, listKinds, type AskInput } from "./questions.ts";
import { defineEntityType, describeEntityType, listEntityTypes, listReleases, moveLive, VALUE_TYPES } from "./releases.ts";
import { caller, Demo, DemoError, entityKinds, stateFile, type Actor } from "./store.ts";

export type Group =
  | "The database"
  | "Types"
  | "Entities"
  | "Subjects"
  | "Time"
  | "Questions"
  | "Across subjects"
  | "Changes"
  | "The feed"
  | "Derivations"
  | "Removal";
export const groups: readonly Group[] = [
  "The database", "Types", "Entities", "Subjects", "Time", "Questions", "Across subjects", "Changes", "The feed", "Derivations", "Removal",
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
const attribute = z.string().describe("Attribute name, e.g. :task/field-0, :placement/status, :review/outcome");
const basis = z
  .object({
    validAt: z.union([z.string(), z.number()]).optional().describe("Valid time: ISO date-time or epoch milliseconds; default now"),
    recordedAt: z.union([z.string(), z.number()]).optional().describe("Record time (what the store knew then); exclusive with position"),
    position: z.number().int().min(0).optional().describe("Exact commit position; exclusive with recordedAt"),
  })
  .optional()
  .describe("When to read: { validAt?, recordedAt?, position? }; default latest and now");
const subjectRef = {
  account: account.optional(),
  subject: subject.optional(),
  root: z.string().optional().describe("Instead of account and subject: any entity ID, read as a subject"),
};
const entityRef = {
  account: account.optional(),
  subject: subject.optional(),
  kind,
  entity: z.string().optional().describe("Instead of account, subject and kind: the entity ID, e.g. acct/account-003/review:00000012"),
};
const scalar = z.union([z.string(), z.number(), z.boolean()]);
const values = z.union([scalar, z.array(scalar).max(64)]);
const questionValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.object({ type: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) }),
]);
const plainConditionShape = {
  attribute: z.string().min(1).max(512).describe("Attribute, e.g. :i9/status"),
  op: z.enum(["eq", "ne", "in", "range", "prefix", "contains", "exists", "missing"]).describe("eq is, ne is not (no value counts as not), in is one of, range between, prefix starts with, contains (text), exists has a value, missing has no value"),
  value: questionValue.optional().describe("For eq, ne, prefix and contains"),
  values: z.array(questionValue).min(1).max(64).optional().describe("For in"),
  from: questionValue.optional().describe("For range: lower end (inclusive unless fromExclusive)"),
  to: questionValue.optional().describe("For range: upper end (inclusive unless toExclusive)"),
  fromExclusive: z.boolean().optional(),
  toExclusive: z.boolean().optional(),
  caseInsensitive: z.boolean().optional().describe("For contains: ignore case"),
  type: z.enum(["text", "string", "reference", "ref", "integer", "number", "date", "datetime", "boolean"]).optional().describe("The values' type when it is not obvious"),
};
// [DX-XQ9] A condition is a plain one (above) or "has": one level of related entities (TX2_SWEEP_SHAPES related).
const questionCondition = z.object({
  ...plainConditionShape,
  attribute: plainConditionShape.attribute.optional(),
  op: z.enum(["eq", "ne", "in", "range", "prefix", "contains", "exists", "missing", "has"]).describe(plainConditionShape.op.description + "; has: related entities (give related, where, quantifier)"),
  related: z
    .object({
      prefix: z.string().max(64).describe("The related kind, e.g. i9: (tasks)"),
      shape: z.string().max(512).optional(),
      link: z.union([z.literal("key"), z.object({ ref: z.string().min(1).max(512) })]).default("key").describe("key: same number after the kind; {ref}: a reference attribute of the entity asked about"),
    })
    .optional()
    .describe("For has: which related entities"),
  where: z.array(z.object(plainConditionShape)).max(7).optional().describe("For has: conditions on each related entity (one level)"),
  quantifier: z
    .union([z.enum(["some", "none"]), z.object({ op: z.enum(["gte", "gt", "lte", "lt", "eq"]), value: z.number().int().min(0).max(1000) })])
    .optional()
    .describe("For has: some (default), none, or a count comparison"),
});
const basisParams = (b: { validAt?: string | number | undefined; recordedAt?: string | number | undefined; position?: number | undefined } | undefined) =>
  b ? { validAt: b.validAt as string | undefined, recordedAt: b.recordedAt as string | undefined, position: b.position } : {};
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
  // [DX-XQ8] The "Ask across subjects" page; ask carries the question so the link opens it filled in.
  questions: (ask?: object) => `/questions${ask ? "?ask=" + encodeURIComponent(JSON.stringify(ask)) : ""}`,
};

/**
 * [DX-XQ8] Where one answer row opens: a subject's root on its Subject page, any other entity on its Entity page, both
 * at the position and valid time the answer holds for (the console's basis parameters).
 */
export function rowRoute(d: Demo, id: string, position: number, validAt: string | null) {
  const at = { recorded: position, valid: validAt ?? undefined };
  const m = /^acct\/([^/]+)\/pl:(\d{8})$/.exec(id);
  const known = m && d.connection.roster.some((r) => r.account === m[1]);
  return known ? routes.subject(m![1]!, Number(m![2]), at) : routes.entity(id, at);
}

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
    run: async (d) => {
      const out = (await d.summary()) as Record<string, any>;
      // The release live points to and its entity types, read by ID from the refs (no scan).
      const types = (await listEntityTypes(d, "live")) as Record<string, any>;
      const calls = [...out["timing"].calls, ...types["timing"].calls];
      const known = calls.map((c: { serverMs: number | null }) => c.serverMs).filter((x): x is number => x !== null);
      return {
        ...out,
        liveRelease: types["release"],
        entityTypes: types["types"].length,
        timing: { serverMs: Math.round(known.reduce((a, b) => a + b, 0) * 100) / 100, roundTripMs: Math.round((out["timing"].roundTripMs + types["timing"].roundTripMs) * 100) / 100, requests: calls.length, calls },
      };
    },
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
    name: "list_entity_types",
    title: "List entity types",
    group: "Types",
    sentences: ["What entity types are there?"],
    description:
      "The entity types in the release a ref points to (default live): each type with its attribute count and how many entities the console created, plus the release (ID, label, sequence) and where test and live point. Read from Triplex's own configuration records by entity ID, starting from the two refs.",
    input: { ref: z.enum(["live", "test"]).default("live").describe("Which ref's release to read") },
    changes: false,
    run: (d, a) => listEntityTypes(d, a.ref),
    route: () => routes.types(),
  }),
  tool({
    name: "describe_entity_type",
    title: "Describe an entity type",
    group: "Types",
    sentences: ["Describe the Review type."],
    description:
      "One entity type as Triplex compiles it from the release (Descriptors.compile): attributes with value type, required, cardinality, unique and reference target; the constraints Triplex generated, each with whether the console checks it on this engine; and the type's revision history across releases.",
    input: { name: z.string().describe("Entity type name, PascalCase, e.g. Review"), ref: z.enum(["live", "test"]).default("live") },
    changes: false,
    run: (d, a) => describeEntityType(d, a.name, a.ref),
    route: (a) => routes.types(a.name) + "?tab=definition",
  }),
  tool({
    name: "define_entity_type",
    title: "Define an entity type",
    group: "Types",
    sentences: ["Define an entity type called Vehicle with a plate (text, required) and a depot (text)."],
    description:
      "Define (or change) an entity type and commit it as a new immutable configuration release with Triplex's ConfigStore.commit: one attribute node per attribute and one entity-schema node with its generated constraints, written as facts in one transaction. test always moves to the new release; live moves too unless moveLive is false. An existing attribute keeps its value type (in Triplex the attribute owns its type)." +
      changeNote,
    input: {
      name: z.string().describe("PascalCase type name, e.g. Review"),
      attributes: z
        .array(
          z.object({
            key: z.string().describe("Global attribute keyword, e.g. :review/outcome"),
            valueType: z.enum(VALUE_TYPES).describe("text, number, integer, int64 (exact integer), boolean, date, instant, enumOf or ref"),
            required: z.boolean().optional(),
            cardinality: z.enum(["one", "many"]).optional(),
            unique: z.boolean().optional().describe("Declared in Triplex; not enforced on this engine"),
            refTarget: z.string().optional().describe("For ref: the target entity type, e.g. Subject"),
            enumValues: z.array(z.string()).optional().describe("For enumOf: the allowed values"),
          }),
        )
        .min(1)
        .max(40),
      label: z.string().optional().describe("Release label; default <type>-<sequence>"),
      moveLive: z.boolean().default(true).describe("Also move live to the new release (default true)"),
    },
    changes: true,
    run: (d, a) => defineEntityType(d, a),
    route: (a) => routes.types(a.name) + "?tab=definition",
  }),
  tool({
    name: "list_releases",
    title: "List configuration releases",
    group: "Types",
    sentences: ["Show the configuration releases and where live points."],
    description:
      "The configuration releases, newest first (ID, label, sequence, parent, object count, the types in it, which refs point to it), and where test and live point. With compare, the object-level difference between two releases (Triplex's changesBetween).",
    input: {
      limit: z.number().int().min(1).max(200).default(20),
      compare: z.tuple([z.string(), z.string()]).optional().describe("Two release IDs to compare, older first"),
    },
    changes: false,
    run: (d, a) => listReleases(d, a.limit, a.compare),
    route: () => routes.configuration(),
  }),
  tool({
    name: "move_live",
    title: "Move live to a release",
    group: "Types",
    sentences: ["Move live back to the release before this one."],
    description:
      "Point the live ref at another release (Triplex's ConfigStore.setRef, a compare-and-retract on the ref fact). This is how a release is rolled back: no fact and no earlier receipt changes; new typed writes are pinned to the release live points to." +
      changeNote,
    input: { snapshotId: z.string().describe("Release ID (sha256-...) from list_releases") },
    changes: true,
    run: (d, a) => moveLive(d, a.snapshotId),
    route: () => routes.configuration(),
  }),
  tool({
    name: "create_entity",
    title: "Create an entity",
    group: "Entities",
    sentences: ["Add a review for subject 7 of account-003 with outcome pending."],
    description:
      "Create one entity of a type you defined, in one of the ten accounts. Values are checked by the type (value type, required, cardinality; uniqueness is not enforced on this engine) with Triplex's EntityCodec, references must point at existing entities, and the entity gets the next number of its type in that account (acct/<account>/<type>:<8 digits>). One transaction writes its facts with the entity type set and the type's counter replaced, pinned to the release live points to. Returns the entity, its number, the receipt and the read back." +
      changeNote,
    input: {
      type: z.string().describe("Entity type name, e.g. Review"),
      account,
      attributes: z.record(z.string(), values).describe('Attribute to value or values, e.g. {":review/outcome": "pending", ":review/of": "acct/account-003/pl:00000007"}'),
      validFrom: z.string().optional().describe("ISO date-time or epoch milliseconds; default now"),
      commandId: z.string().min(1).max(200).optional().describe("Idempotency key; repeating it returns CommandAlreadyCommitted"),
    },
    changes: true,
    run: (d, a) => createEntity(d, a),
    route: (_a, out) => routes.entity(String(out["entity"])),
  }),
  tool({
    name: "list_entities",
    title: "List entities of a type",
    group: "Entities",
    sentences: ["List the reviews in account-003."],
    description:
      "The entities of one type in one account, by number (this engine has no index by entity type): one read of the type's counter, then one read of the page's entity IDs at the basis. Each entity with its attribute values.",
    input: {
      type: z.string().describe("Entity type name, e.g. Review"),
      account,
      from: z.number().int().min(0).default(0),
      count: z.number().int().min(1).max(50).default(20),
      basis,
    },
    changes: false,
    run: (d, a) => listEntities(d, a),
    route: (a, out) => routes.types(a.type) + q({ account: String(out["account"]), from: a.from, ...basisParams(a.basis) }),
  }),
  tool({
    name: "read_entity",
    title: "Read an entity",
    group: "Entities",
    sentences: ["Read review 12 of account-003."],
    description:
      "One entity's facts at a basis, each with its valid interval, record time and position; its entity type (loader-built entities are untyped). With asSubject, also the whole reach from it (the entity read as a subject) in one request.",
    input: {
      entity: z.string().describe("Entity ID, e.g. acct/account-003/review:00000012 or acct/account-003/i9:00000000"),
      basis,
      asSubject: z.boolean().default(false),
    },
    changes: false,
    run: (d, a) => readEntity(d, a),
    route: (a) => routes.entity(a.entity, { ...(a.asSubject ? { asSubject: 1 } : {}), ...basisParams(a.basis) }),
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
    title: "Read a subject",
    group: "Subjects",
    sentences: ["Read everything about subject 0 of account-003."],
    description:
      "Every fact of one subject: the root and every entity reachable from it through references (profile, placements, tasks, subtasks, files, or the parts of an entity you created), at one exact position, in one request to the read gateway. Give account and subject, or root (any entity ID, read as a subject). Optional basis reads it at an earlier position, record time or valid time.",
    input: { ...subjectRef, attribute: attribute.optional().describe("Only this attribute (optional)"), basis },
    changes: false,
    run: async (d, a) => d.readSubject(a, a.attribute, a.basis ? await resolveBasis(d, a.basis) : undefined),
    route: (a, out) => (a.root ? routes.entity(a.root, { asSubject: 1, ...basisParams(a.basis) }) : routes.subject(String(out["account"]), a.subject!, basisParams(a.basis))),
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
      "Both time axes: what we now believe was true on a date (valid time), and what the store believed about that date at a record time or an exact position (default: the same date), with the facts that differ from today. Give account and subject, or root.",
    input: {
      ...subjectRef,
      at: z.string().describe("ISO date-time or epoch milliseconds"),
      attribute: attribute.optional().describe("Only this attribute; also lists the three views in full"),
      recordedAt: z.string().optional().describe("Record time for the 'believed' view; default is the same instant as at"),
      position: z.number().int().min(0).optional().describe("Exact recorded position for the 'believed' view (instead of recordedAt)"),
    },
    changes: false,
    run: (d, a) => {
      if (a.position !== undefined && a.recordedAt !== undefined)
        throw new DemoError("InvalidInput", "Give recordedAt or position, not both");
      return d.readSubjectAt(a, a.at, a.attribute, a.recordedAt, a.position);
    },
    route: (a, out) => {
      const extra = { tab: "time", at: a.at, attribute: a.attribute, recordedAt: a.recordedAt, believedPosition: a.position };
      return a.root ? routes.entity(a.root, extra) : routes.subject(String(out["account"]), a.subject!, extra);
    },
  }),
  tool({
    name: "field_history",
    title: "History of one field",
    group: "Time",
    sentences: ["Show the full history of :task/field-0 on subject 0's first task."],
    description:
      "Every stored row of one attribute of one entity, including retracted ones: value, valid from and to, recorded at and position, retracted at and position. Give account, subject and kind, or entity. Its cost follows how often that entity was saved: the gateway reads the entity's whole history (entityHistoryRows) and filters to the attribute afterwards.",
    input: {
      ...entityRef,
      attribute,
      limit: z.number().int().min(1).max(2000).default(40).describe("Rows to return, newest first kept; the total is always reported"),
    },
    changes: false,
    run: (d, a) => d.fieldHistory(d.target(a as never), a.attribute, a.limit),
    route: (a, out) => routes.entity(String(out["entity"]), { tab: "history", attribute: a.attribute }),
  }),
  tool({
    name: "query",
    title: "Ask a question in Triplex Datalog",
    group: "Questions",
    sentences: ["Which tasks of subject 50000 are not complete?"],
    description:
      "Run a Triplex Datalog query (the public DatalogQuery JSON: find, where, and optionally aggregate, having, orderBy, limit, offset, rules) against one subject (default; pulled in one request, then evaluated by Triplex's in-memory engine, so joins, not, or, aggregates and recursive rules work), up to 16 subjects at one identical position, or the store directly (only when every where clause names a literal entity or compares values). Questions that would read every record are refused before anything is sent, with the reason. Exact integers are evaluated as numbers inside 53 bits." +
      ' Example: {"query": {"find": ["?task"], "where": [["?p", ":placement/task", "?task"], ["not", ["?task", ":task/status", "complete"]]]}, "from": {"subject": {"account": "account-003", "subject": 50000}}}',
    input: {
      query: z.record(z.string(), z.unknown()).describe("Triplex Datalog JSON, e.g. { find: [\"?v\"], where: [[\"acct/account-003/i9:00000000\", \":task/status\", \"?v\"]] }"),
      from: z
        .union([
          z.literal("store"),
          z.object({ subject: z.object({ account: account.optional(), subject: subject.optional(), root: z.string().optional() }) }),
          z.object({ subjects: z.object({ account, subjects: z.array(z.number().int().min(0)).min(1) }) }),
        ])
        .describe('{ subject: { account, subject } } (or { subject: { root } }), { subjects: { account, subjects: [...] } } (at most 16), or "store"'),
      basis,
      pageSize: z.number().int().min(1).max(1000).default(100),
      cursor: z.string().optional().describe("The cursor of the previous page; the next page is read at the same position"),
      explain: z.boolean().default(false).describe("Include the plan"),
    },
    changes: false,
    run: (d, a) => runQuery(d, a as never),
    route: () => routes.query(),
  }),
  tool({
    name: "save_facts",
    title: "Save facts",
    group: "Changes",
    sentences: ["Set :review/outcome on review 12 of account-003 to approved.", "Set :task/field-0 on subject 7 of account-003 to reviewed."],
    description:
      "Save new values for one entity from now on, guarded by the entity's exact current state; the earlier values stay true for the time before now. Give account, subject and kind (a loader-built subject's entity; text values), or entity (for an entity of a type you defined, values are checked and typed by its type, and the write is pinned to the release live points to). Returns the receipt (transaction, durable position, record time) and reads the values back at that position." +
      changeNote,
    input: {
      ...entityRef,
      changes: z.record(z.string(), values).describe('Attribute to new value (or values), e.g. {":review/outcome": "approved"}'),
    },
    changes: true,
    run: async (d, a) => {
      const t = d.target(a as never);
      if (Object.keys(a.changes).length > 20) throw new DemoError("InvalidInput", "At most 20 attributes per save");
      return d.saveFacts(t, a.changes, await typingFor(d, t.entity, a.changes as never));
    },
    route: (_a, out) => routes.entity(String(out["entity"]), { tab: "journal" }),
  }),
  tool({
    name: "correct_past_value",
    title: "Correct a value as of a past date",
    group: "Changes",
    sentences: ["We learned the outcome of review 12 of account-003 was approved from last Monday. Record that."],
    description:
      "A valid-time correction: from a past date on, the attribute had a different value. One transaction retracts and asserts; nothing is erased. Shows both beliefs about that date: as recorded before the correction and as recorded after it. Give account, subject and kind, or entity (typed by its type when it has one)." +
      changeNote,
    input: {
      ...entityRef,
      attribute,
      value: z.union([z.string(), z.number(), z.boolean()]),
      validFrom: z.string().describe("ISO date-time or epoch milliseconds in the past"),
    },
    changes: true,
    run: async (d, a) => {
      const t = d.target(a as never);
      const typed = await typingFor(d, t.entity, { [a.attribute]: a.value });
      const value = typed?.values.get(a.attribute)?.[0];
      return d.correctPastValue(t, a.attribute, a.value, a.validFrom, typed && value ? { value, configSnapshot: typed.configSnapshot, entityType: typed.entityType } : undefined);
    },
    route: (a, out) => routes.entity(String(out["entity"]), { tab: "time", attribute: a.attribute, at: a.validFrom }),
  }),
  tool({
    name: "retire_fact",
    title: "Retire a fact",
    group: "Changes",
    sentences: ["Retire :review/note on review 12 of account-003."],
    description:
      "Stop a fact being current from now on: the live assertion is retracted and asserted again with its valid time ended now. It disappears from current reads; the time it was true stays in history and in earlier reads. Give account, subject and kind, or entity." +
      changeNote,
    input: { ...entityRef, attribute },
    changes: true,
    run: async (d, a) => {
      const t = d.target(a as never);
      const typed = await typingFor(d, t.entity, {});
      return d.retireFact(t, a.attribute, typed?.configSnapshot);
    },
    route: (a, out) => routes.entity(String(out["entity"]), { tab: "history", attribute: a.attribute }),
  }),
  tool({
    name: "change_feed",
    title: "Change feed",
    group: "The feed",
    sentences: ["Who changed since position 28,309,866?", "Show the last changes the assistant made."],
    description:
      "The committed transactions after a position, in order, with every change (assert or retract, entity, attribute, value, valid time), the actor, the command ID and the configuration release that governed the write. Optionally one account's changes or one actor's. Pass the returned next as after to continue; waitMs long-polls for new transactions. With entity, that entity's transactions newest first. With summary, who changed since after: the subjects changed with transaction and fact counts and how many transactions were read (at most 10 pages of 1,000).",
    input: {
      after: z.number().int().min(0).optional().describe("Return transactions strictly after this position; default is the last few"),
      account: account.optional(),
      limit: z.number().int().min(1).max(1000).default(20).describe("Transactions per page (at most 200; with summary, 1,000 per page read)"),
      entity: z.string().optional().describe("Only this entity's transactions, newest first"),
      before: z.number().int().min(0).optional().describe("With entity: transactions strictly before this position (the returned nextBefore)"),
      actor: z.string().optional().describe('Only transactions by this actor, e.g. "assistant", "console", "triplex/config-store"'),
      summary: z.boolean().default(false).describe("Who changed since after: subjects with counts"),
      waitMs: z.number().int().min(0).max(30_000).optional().describe("Long poll: wait up to this long for a transaction after after"),
    },
    changes: false,
    run: (d, a) => d.changeFeed(a),
    route: (a, out) => (a.entity ? routes.entity(a.entity, { tab: "journal" }) : routes.journal({ after: out["after"] as number, account: a.account === undefined ? undefined : String(out["account"]), actor: a.actor, summary: a.summary ? 1 : undefined })),
  }),
  tool({
    name: "evaluate_derivation",
    title: "Evaluate a derivation on one subject",
    group: "Derivations",
    sentences: ["Which tasks does subject 50000 still owe, and why?"],
    description:
      "Evaluate a Triplex derivation (a name, a Datalog query of patterns, comparisons and not, and the identity variables) for one subject with Triplex's Derivation.evaluate: each candidate with its identity, its result, its source facts (fact ID, attribute, transaction, position) and its next valid-time boundary. With compareToPosition, evaluate again at that position and reconcile: added, removed, changed, unchanged. The derivation pins the release live points to. Nothing is materialized." +
      ' Example: {"derivation": {"name": "open-tasks", "query": {"find": ["?task", "?progress"], "where": [["?placement", ":placement/task", "?task"], ["?task", ":task/progress", "?progress"], ["not", ["?task", ":task/status", "complete"]]]}, "identity": ["?task"]}, "account": "account-003", "subject": 50000}',
    input: {
      derivation: z.object({
        name: z.string().min(1).max(100),
        query: z.record(z.string(), z.unknown()).describe("Triplex Datalog: find and where (patterns, comparisons, not)"),
        identity: z.array(z.string()).min(1).describe("Variables that identify a candidate, e.g. [\"?task\"]"),
      }),
      ...subjectRef,
      basis,
      compareToPosition: z.number().int().min(0).optional().describe("Reconcile against the evaluation at this earlier position"),
    },
    changes: false,
    run: (d, a) => evaluateDerivation(d, a),
    route: (a, out) => routes.entity(String((out["subject"] as { root: string }).root), { tab: "derivations", ...(a.compareToPosition !== undefined ? { compare: a.compareToPosition } : {}) }),
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
  // ---- [DX-XQ8] questions across subjects (the read gateway's ID list and slow exact routes) ------------------------
  tool({
    name: "list_kinds",
    title: "Kinds of entity in an account",
    group: "Across subjects",
    sentences: ["What kinds of entity does account-003 hold, and how many of each?"],
    description:
      "The kinds of entity one account holds (the ID prefixes after acct/<account>/, such as pl: for subjects, i9: for tasks, review: for reviews), each with its count of IDs from the store's ID list, at the head, a past position or a past record time. A kind whose first ID is a prefix and a number also gets a 'roots only' shape (pl:{8 digits} keeps the subjects' root records and drops their placements). Counts are IDs with a fact recorded at or before the position the answer states (holdsFor.position); an ID list has no valid-time axis. Reads stored facts; one read per kind plus the counts, each count stopped at a ceiling and marked countExact false if it stops.",
    input: {
      account,
      basis: basis.describe("When to read: { position?, recordedAt? } (validAt is ignored: an ID list has no valid-time axis); default the latest position"),
      ceilingMs: z.number().int().min(100).max(20_000).optional().describe("Longest time to spend counting one kind (default 3,000 ms)"),
    },
    changes: false,
    run: (d, a) => listKinds(d, a),
    route: (a) => routes.questions({ account: a.account }),
  }),
  tool({
    name: "describe_kind",
    title: "Attributes of a kind",
    group: "Across subjects",
    sentences: ["What attributes do the tasks of account-003 have?"],
    description:
      "The attributes seen on the first entities of one kind in one account (in ID order, default 24), at one position and valid time: each attribute's value types, how many of the sampled entities have it, and a few example values. When the database declares protected attributes, each one is marked protected and not filterable, with the reason, and its values are never returned (the store's own refusal of a question naming it is how it is found). An attribute seen only on later entities is not listed; any attribute name can still be asked. Reads stored facts; holdsFor states the position and valid time.",
    input: {
      account,
      prefix: z.string().max(512).describe("The kind: the text the IDs start with after acct/<account>/, e.g. i9: (tasks), pl: (subjects), review:"),
      shape: z.string().max(512).optional().describe('Optional ID shape after acct/<account>/, e.g. "pl:{8 digits}" keeps subject roots only; tokens {N digits}, {digits}, {segment}'),
      basis,
      sample: z.number().int().min(1).max(200).default(24).describe("How many entities to sample, in ID order"),
    },
    changes: false,
    run: (d, a) => describeKind(d, a),
    route: (a) => routes.questions({ account: a.account, kind: { prefix: a.prefix, shape: a.shape } }),
  }),
  tool({
    name: "list_ids",
    title: "List the IDs of one kind",
    group: "Across subjects",
    sentences: ["How many tasks does account-003 have?", "List the first 100 subject IDs of account-003 at position 200."],
    description:
      "The IDs of one kind in one account in ID order, from the store's ID list route (one ordered range read, nothing read per entity), or their exact count (pages followed to the end or to the ceiling). At the head (default), a past position (basis.position) or a past record time (basis.recordedAt); the answer states the position it holds for (holdsFor.position) and that it has no valid-time axis: an ID is listed when its entity had a fact recorded at or before that position, live or retired. Pages of 1 to 1,000 with the store's cursor (pass next as cursor; it keeps the first page's position). Reads stored facts. Refusals come back with the store's code and one plain sentence (e.g. CursorMismatch for an edited cursor, InteriorPosition, BasisNotAvailable).",
    input: {
      account,
      prefix: z.string().max(512).default("").describe("The kind: the text the IDs start with after acct/<account>/, e.g. i9: or pl:; empty lists every ID of the account"),
      shape: z.string().max(512).optional().describe('Optional ID shape after acct/<account>/, e.g. "pl:{8 digits}" (subject roots only)'),
      basis: basis.describe("When: { position?, recordedAt? }; default the latest position. validAt is ignored here"),
      result: z.enum(["ids", "count"]).default("ids").describe("ids: one page of IDs; count: the exact count of the kind"),
      limit: z.number().int().min(1).max(1000).default(100).describe("IDs per page"),
      order: z.enum(["asc", "desc"]).default("asc"),
      cursor: z.string().max(8192).optional().describe("The previous answer's next; the page continues at the same position"),
      ceilingMs: z.number().int().min(100).max(60_000).default(10_000).describe("For count: stop after this long and say so"),
    },
    changes: false,
    run: (d, a) => listIds(d, a),
    route: (a) => routes.questions({ account: a.account, kind: { prefix: a.prefix, shape: a.shape } }),
  }),
  tool({
    name: "ask_across_subjects",
    title: "Ask a question across subjects",
    group: "Across subjects",
    sentences: [
      "Which tasks in account-003 are pending?",
      "How many subjects in account-003 are active?",
      "Count account-003's tasks per status.",
      "Which reviews in account-003 are about subject 7?",
      "Which subjects in account-003 have at least one pending task?",
      "Which subjects in account-003 have 3 or more open tasks?",
      "Top 10 profiles in account-003 by pay, highest first.",
      "Which profiles in account-003 have a start date containing -11-?",
    ],
    description:
      "A question across every entity of one kind in one account, answered exactly on the store's slow exact route: the store lists the kind's IDs in order, reads each one's facts at ONE position and ONE valid time with the pinned read's own code, and tests up to 8 conditions, all required. Result: a list of matching IDs with chosen columns (their values), a count, or a count of subjects per value of one attribute. The answer states the position and valid time it holds for (holdsFor), whether it is complete, how many subjects were examined, and that it reads stored facts (a value a release has not written yet is not seen). Conditions: eq (is), in (is one of, 1 to 64 values), range (from and/or to, inclusive unless fromExclusive/toExclusive; text, integer, number or date), prefix (text starts with), exists (has a value), missing (has no value). Values are plain (true/false, numbers, text; an entity ID is taken as a reference) or { type, value } with type text, reference, integer, number, date or boolean; give type when it is not obvious (an integer attribute does not match a number condition). Also (TX2_SWEEP_SHAPES on the read gateway, on in every demo stack): ne (is not; a subject with no value counts as not that value), contains (text contains the value; caseInsensitive true lower-cases both; values searched whole up to 65,536 characters), and has: a condition over related entities, one level, e.g. {\"op\": \"has\", \"related\": {\"prefix\": \"i9:\", \"link\": \"key\"}, \"where\": [{\"attribute\": \":i9/status\", \"op\": \"eq\", \"value\": \"pending\"}], \"quantifier\": \"some\"}; link key ties entities whose ID has the same number after the kind (pl:00000005 and i9:00000005:t2), link {ref: attribute} follows a reference attribute of the entity asked about; quantifier some (default), none, or {op: gte|gt|lte|lt|eq, value}. anyOf: 1 to 4 groups of conditions, the entity matches when every where condition and at least one group hold; 8 conditions in all, a has counting one plus its own. result top: the N best (limit, at most 1,000) by order {by, type: text|integer|number|date, direction: asc|desc}, after reading every entity of the kind once (ties by ID, entities without a value last). result sum with of: the exact sum and average of an integer attribute. Protected attributes are never filtered, grouped, ordered, summed or listed: such a question is refused (ProtectedValueLookup). mode: fill (default: pages until limit rows, the end, or ceilingMs, default 5 s), toEnd (to the end or ceilingMs, default 60 s; at most 5,000 rows returned), or page (one store page, for callers that page themselves). Pass next as cursor to continue at the same position and valid time; an edited cursor is refused (CursorMismatch). It is slow on a deep account (about 1 to 2 ms per subject at 1 billion records): count a sample first. Every refusal comes back with the store's code and one plain sentence. Example: {\"account\": \"account-003\", \"kind\": {\"prefix\": \"i9:\"}, \"where\": [{\"attribute\": \":i9/status\", \"op\": \"eq\", \"value\": \"pending\"}], \"columns\": [\":task/progress\"]}",
    input: {
      account,
      kind: z
        .object({
          prefix: z.string().max(512).describe("The text the IDs start with after acct/<account>/, e.g. i9: (tasks), pl: (subjects), review:"),
          shape: z.string().max(512).optional().describe('Optional ID shape, e.g. "pl:{8 digits}" for subject roots only'),
        })
        .describe("Which entities: one kind of one account (list_kinds lists them)"),
      where: z
        .array(
          questionCondition,
        )
        .max(8)
        .default([])
        .describe("Up to 8 conditions, all required (AND); none asks about every entity of the kind"),
      anyOf: z.array(z.array(questionCondition).min(1).max(8)).min(1).max(4).optional().describe("1 to 4 groups; the entity matches when at least one group's conditions all hold (and every where condition)"),
      result: z.enum(["list", "count", "countByValue", "top", "sum"]).default("list").describe("list: matching IDs with columns; count; countByValue: subjects per value of `of`; top: the `limit` best by `order`; sum: exact sum and average of the integer attribute `of`"),
      order: z
        .object({
          by: z.string().min(1).max(512).describe("The attribute to order by"),
          type: z.enum(["text", "string", "integer", "number", "date", "datetime"]).describe("The values' type; values of another type count as no value"),
          direction: z.enum(["asc", "desc"]).default("asc"),
        })
        .optional()
        .describe("For top: the order (ties by ID, entities without a value last)"),
      columns: z.array(z.string().min(1).max(512)).max(8).optional().describe("For list: up to 8 attributes whose values come back with each ID"),
      of: z.string().min(1).max(512).optional().describe("For countByValue: the attribute to count by; for sum: the integer attribute to add"),
      basis: basis.describe("When: { position?, recordedAt?, validAt? }; default the latest position and now. The answer states both"),
      limit: z.number().int().min(1).max(1000).default(50).describe("For list: rows to return in this call; for top: N"),
      cursor: z.string().max(1_048_576).optional().describe("The previous answer's next: continue the same question at the same position and valid time"),
      mode: z.enum(["fill", "toEnd", "page"]).default("fill"),
      ceilingMs: z.number().int().min(100).max(300_000).optional().describe("Longest time for this call (default 5,000 ms; 60,000 with toEnd); the answer says when it stopped there"),
      pageSubjects: z.number().int().min(1).max(10_000).optional().describe("Subjects the store reads per page (default 256)"),
    },
    changes: false,
    run: async (d, a) => {
      const out = await askAcross(d, a as AskInput);
      const at = out.holdsFor;
      return out.rows ? { ...out, rows: out.rows.map((r) => ({ ...r, consoleLink: consoleOrigin() + rowRoute(d, r.id, at.position, at.validAt) })) } : out;
    },
    route: (a) => routes.questions({ account: a.account, kind: a.kind, where: a.where, anyOf: a.anyOf, result: a.result, order: a.order, limit: a.result === "top" ? a.limit : undefined, columns: a.columns, of: a.of, basis: a.basis }),
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
  // [DX-CON1] A store error wraps the gateway's own answer (status, code, message); say it, not just "read failed".
  const causes: string[] = [];
  for (let c = (error as { cause?: unknown })?.cause, depth = 0; c && depth < 4; c = (c as { cause?: unknown }).cause, depth++) {
    const x = c as { _tag?: string; name?: string; status?: number; code?: string; message?: string };
    const text = [x.status ? `HTTP ${x.status}` : "", x.code ?? "", x.message ?? ""].filter(Boolean).join(" ");
    if (text && !causes.includes(text) && text !== message) causes.push(text);
  }
  const deadline = causes.some((t) => /deadline/i.test(t));
  return {
    error: {
      code,
      message: causes.length ? `${message}: ${causes.join("; ")}` : message,
      ...(causes.length ? { causes } : {}),
      ...(deadline ? { hint: "The gateway did not answer within its deadline. On this engine a journal read that walks the bulk loader's saves can take that long; the console bounds every journal page so it should not happen." } : {}),
      // [DX-XQ8] A store refusal's plain sentence and the store's own code and message (questions.ts storeError).
      ...(error instanceof DemoError && error.detail ? error.detail : {}),
    },
  };
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
  // Work the console did itself is counted apart from the store's time (DESIGN.md 7.3).
  if (typeof out["consoleMs"] === "number" && out["timing"]) {
    out["timing"] = { ...(out["timing"] as object), consoleMs: out["consoleMs"] };
    delete out["consoleMs"];
  }
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
