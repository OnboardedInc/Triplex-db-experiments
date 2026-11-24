// [DX-API1] API-call-shaped reads: nine generic read shapes taken from the product's handlers (API-CALL-READS.md
// section 1), each written once as the reads a straightforward port would make, level by level (a level's reads depend
// only on earlier levels), and run four ways:
//   today   one HTTP read per entity (`/read`, entityIds [id]), unpinned, a level's reads in parallel (the adapter outside a
//           transaction: every read resolves the reader's head on its own);
//   pinned  the same after one `/basis` call, every read pinned to that position (what a careful port does today);
//   loader  the same handler code through CallReads (the SDK helper): a level's reads coalesce into one /batch request,
//           every batch of the call pinned to the first batch's position, a per-call memo;
//   batch1  the whole call as ONE /batch request, later levels taking their subjects from earlier entries by reference.
// Rejected: describing the shapes by product table names (generic shapes only; the repository is public), and deriving a
// child's ID from the generator where the store would have to read a reference (every child here is found by a read).
import { taskId, placementId, deepTasks, taskSerial } from "../../../bench/lib/deep-world.ts";
import { ids } from "../../../bench/lib/world.ts";

export const FORMS = 24, PROPS = 8, RULES = 39;
export const def = {
  form: (A: string, k: number) => `${A}def/form:${String(k).padStart(2, "0")}`,
  account: (A: string) => `${A}def/account`,
  prop: (A: string, k: number) => `${A}def/prop:${k}`,
  policy: (A: string) => `${A}def/policy`,
  rule: (A: string, k: number) => `${A}def/rule:${String(k).padStart(2, "0")}`,
};
type Fact = { e: string; a: string; v: { type: string; value: string } };
const str = (value: string) => ({ type: "string", value });
const ref = (value: string) => ({ type: "ref", value });
/** The definitions in force of one account (stand-ins for forms, custom properties, a policy's rule graph). */
export function definitionFacts(A: string): Fact[] {
  const rows: Fact[] = [];
  for (let k = 0; k < FORMS; k++) {
    rows.push({ e: def.form(A, k), a: ":form/name", v: str(`form ${k}`) });
    for (let f = 0; f < 9; f++) rows.push({ e: def.form(A, k), a: `:form/field-${f}`, v: str(`field ${f} of form ${k}: text, required`) });
  }
  rows.push({ e: def.account(A), a: ":account/name", v: str("an account") });
  for (let k = 0; k < PROPS; k++) {
    rows.push({ e: def.account(A), a: ":account/property", v: ref(def.prop(A, k)) });
    rows.push({ e: def.prop(A, k), a: ":prop/name", v: str(`property ${k}`) }, { e: def.prop(A, k), a: ":prop/type", v: str("string") },
      { e: def.prop(A, k), a: ":prop/required", v: str(k % 2 ? "yes" : "no") });
  }
  rows.push({ e: def.policy(A), a: ":policy/name", v: str("the policy in force") });
  for (let k = 0; k < 3; k++) rows.push({ e: def.policy(A), a: ":policy/node", v: ref(def.rule(A, k)) });
  for (let k = 0; k < RULES; k++) {
    rows.push({ e: def.rule(A, k), a: ":rule/attribute", v: str(`:person/custom-${k % 7}`) },
      { e: def.rule(A, k), a: ":rule/op", v: str(["=", "<", ">"][k % 3]!) }, { e: def.rule(A, k), a: ":rule/value", v: str(String(k)) });
    if (3 + 3 * k + 2 < RULES) for (let c = 0; c < 3; c++) rows.push({ e: def.rule(A, k), a: ":rule/child", v: ref(def.rule(A, 3 + 3 * k + c)) });
  }
  return rows;
}
/** The reference from each task to the form it was made from (added to the deep subject's own facts). */
export const templateFacts = (A: string, i: number): Fact[] =>
  Array.from({ length: deepTasks(i) }, (_, t) => ({ e: A + taskId(i, t), a: ":task/template", v: ref(def.form(A, taskSerial(i, t) % FORMS)) }));

export type Ctx = { A: string; account: string; i: number; t: number; after: string };
export type Step = {
  key: string;
  ids?: (c: Ctx) => string[];
  from?: { step: string; attribute?: string };
  pattern?: { attribute: string };
  page?: (c: Ctx) => Record<string, unknown>;
  /** Read each subject's world by reach (one-request form only). */
  reach?: true;
};
export type Shape = {
  name: string;
  what: string;
  levels: Step[][];
  /** Reads after the call's own save (the save happens between `levels` and `after`). */
  save?: true;
  after?: Step[][];
  /** The one-request form, when the levels cannot be (reference lists above the batch's 512-subject entry bound). */
  batch?: Step[];
};
const root = (c: Ctx) => [c.A + ids.placement(c.i)];
const account = (c: Ctx) => [def.account(c.A)];
const task = (c: Ctx) => [c.A + taskId(c.i, c.t)];
const chain = (from: string): Step[][] => [
  [{ key: "next1", from: { step: from, attribute: ":subtask/next" } }],
  [{ key: "next2", from: { step: "next1", attribute: ":subtask/next" } }],
  [{ key: "next3", from: { step: "next2", attribute: ":subtask/next" } }],
];
export const shapes: Shape[] = [
  {
    name: "subject-page",
    what: "a subject's page: the subject root, its profile, placements, tasks, subtasks and files, the forms its tasks were made from, the account's property definitions",
    levels: [
      [{ key: "root", ids: root }, { key: "account", ids: account }],
      [{ key: "profile", from: { step: "root", attribute: ":person/profile" } }, { key: "placements", from: { step: "root", attribute: ":person/placement" } },
       { key: "props", from: { step: "account", attribute: ":account/property" } }],
      [{ key: "files", from: { step: "profile", attribute: ":person/file" } }, { key: "tasks", from: { step: "placements", attribute: ":placement/task" } }],
      [{ key: "subtasks", from: { step: "tasks", attribute: ":task/subtask" } }, { key: "forms", from: { step: "tasks", attribute: ":task/template" } }],
      ...chain("subtasks"),
    ],
  },
  {
    name: "task-page",
    what: "a task's page: the task, its subtasks, its form, the subject root and profile, the account's property definitions",
    levels: [
      [{ key: "task", ids: task }, { key: "root", ids: root }, { key: "account", ids: account }],
      [{ key: "subtasks", from: { step: "task", attribute: ":task/subtask" } }, { key: "form", from: { step: "task", attribute: ":task/template" } },
       { key: "profile", from: { step: "root", attribute: ":person/profile" } }, { key: "props", from: { step: "account", attribute: ":account/property" } }],
      ...chain("subtasks"),
    ],
  },
  {
    name: "subject-list",
    what: "a list page of 50 subjects with status columns: an ID list page, then each subject's root, profile, placements, tasks, subtasks and forms",
    levels: [
      [{ key: "page", page: (c) => ({ account: c.account, prefix: "pl:", shape: "pl:{8 digits}", limit: 50, after: c.after }) }, { key: "account", ids: account }],
      [{ key: "roots", from: { step: "page" } }, { key: "props", from: { step: "account", attribute: ":account/property" } }],
      [{ key: "profiles", from: { step: "roots", attribute: ":person/profile" } }, { key: "placements", from: { step: "roots", attribute: ":person/placement" } }],
      [{ key: "tasks", from: { step: "placements", attribute: ":placement/task" } }],
      [{ key: "subtasks", from: { step: "tasks", attribute: ":task/subtask" } }, { key: "forms", from: { step: "tasks", attribute: ":task/template" } }],
      ...chain("subtasks"),
    ],
    // One request: the page, then the 50 subjects' worlds by reach (each root's world is everything reachable from it,
    // forms included), and the definitions.
    batch: [
      { key: "page", page: (c) => ({ account: c.account, prefix: "pl:", shape: "pl:{8 digits}", limit: 50, after: c.after }) },
      { key: "account", ids: account },
      { key: "worlds", from: { step: "page" }, reach: true },
      { key: "props", from: { step: "account", attribute: ":account/property" } },
    ],
  },
  {
    name: "form-submit",
    what: "a form submission: read-before-write of the journey (subject, its tasks and forms), the submitted task twice, its subtasks, the profile again; one save; then the task and the subject read back",
    levels: [
      [{ key: "root", ids: root }, { key: "account", ids: account }],
      [{ key: "profile", from: { step: "root", attribute: ":person/profile" } }, { key: "placements", from: { step: "root", attribute: ":person/placement" } },
       { key: "props", from: { step: "account", attribute: ":account/property" } }],
      [{ key: "tasks", from: { step: "placements", attribute: ":placement/task" } }],
      [{ key: "forms", from: { step: "tasks", attribute: ":task/template" } }, { key: "task", ids: task },
       { key: "profile2", from: { step: "root", attribute: ":person/profile" } }],
      [{ key: "subtasks", from: { step: "task", attribute: ":task/subtask" } }, { key: "existing", ids: task }],
    ],
    save: true,
    after: [[{ key: "taskAfter", ids: task }, { key: "rootAfter", ids: root }]],
  },
  {
    name: "import-row",
    what: "one import row's lookups: the subject and its placement by ID, three shared definitions, the account's property definitions, the profile and the placement's task",
    levels: [
      [{ key: "root", ids: root }, { key: "placement", ids: (c) => [c.A + placementId(c.i, 0)] }, { key: "account", ids: account },
       { key: "shared", ids: (c) => [0, 1, 2].map((k) => def.form(c.A, k)) }],
      [{ key: "profile", from: { step: "root", attribute: ":person/profile" } }, { key: "props", from: { step: "account", attribute: ":account/property" } },
       { key: "ptask", from: { step: "placement", attribute: ":placement/task" } }],
    ],
  },
  {
    name: "policy-eval",
    what: "a policy evaluated for one subject: the subject's root, profile, placements and tasks with their forms, and the policy's rule graph node by node (40 nodes, depth 4)",
    levels: [
      [{ key: "root", ids: root }, { key: "account", ids: account }, { key: "policy", ids: (c) => [def.policy(c.A)] }],
      [{ key: "profile", from: { step: "root", attribute: ":person/profile" } }, { key: "placements", from: { step: "root", attribute: ":person/placement" } },
       { key: "props", from: { step: "account", attribute: ":account/property" } }, { key: "rules1", from: { step: "policy", attribute: ":policy/node" } }],
      [{ key: "tasks", from: { step: "placements", attribute: ":placement/task" } }, { key: "rules2", from: { step: "rules1", attribute: ":rule/child" } }],
      [{ key: "forms", from: { step: "tasks", attribute: ":task/template" } }, { key: "rules3", from: { step: "rules2", attribute: ":rule/child" } }],
    ],
  },
  {
    name: "check-webhook",
    what: "a check-result webhook: the check's task by its ID, the subject, the form and subtasks, then each of the task's 13 fields read on its own before it is written",
    levels: [
      [{ key: "task", ids: (c) => [c.A + taskId(c.i, 0)] }, { key: "root", ids: root }, { key: "account", ids: account }],
      [{ key: "form", from: { step: "task", attribute: ":task/template" } }, { key: "subtasks", from: { step: "task", attribute: ":task/subtask" } },
       { key: "profile", from: { step: "root", attribute: ":person/profile" } }, { key: "props", from: { step: "account", attribute: ":account/property" } }],
      Array.from({ length: 13 }, (_, f) => ({ key: `field${f}`, ids: (c: Ctx) => [c.A + taskId(c.i, 0)], pattern: { attribute: `:task/field-${f}` } })),
    ],
  },
  {
    name: "placement-page",
    what: "a placement's page: the placement, its tasks with forms and subtasks, the subject root and profile, three shared definitions, the property definitions",
    levels: [
      [{ key: "placement", ids: (c) => [c.A + placementId(c.i, 0)] }, { key: "root", ids: root }, { key: "account", ids: account },
       { key: "shared", ids: (c) => [0, 1, 2].map((k) => def.form(c.A, k)) }],
      [{ key: "tasks", from: { step: "placement", attribute: ":placement/task" } }, { key: "profile", from: { step: "root", attribute: ":person/profile" } },
       { key: "props", from: { step: "account", attribute: ":account/property" } }],
      [{ key: "forms", from: { step: "tasks", attribute: ":task/template" } }, { key: "subtasks", from: { step: "tasks", attribute: ":task/subtask" } }],
      ...chain("subtasks"),
    ],
  },
  {
    name: "task-fields",
    what: "a task's fields through the public API: the task and the form it was made from",
    levels: [[{ key: "task", ids: task }], [{ key: "form", from: { step: "task", attribute: ":task/template" } }]],
  },
];

/** A reference value of `attribute` in decoded or wire rows. */
export const refsOf = (rows: readonly any[], attribute: string): string[] => {
  const v = (x: any) => (x !== null && typeof x === "object" ? x.v : x);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows)
    if (v(r.attribute) === attribute && v(r.value_type) === "ref") {
      const id = v(r.value_string);
      if (!seen.has(id)) { seen.add(id); out.push(id); }
    }
  return out;
};
