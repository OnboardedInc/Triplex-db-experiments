import { attrs, editable } from "./fixture.ts";

type Schema = {
  type: "object" | "string" | "integer";
  properties?: Record<string, Schema>;
  required?: readonly string[];
  enum?: readonly string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minProperties?: number;
  pattern?: string;
  additionalProperties?: false;
};
const object = (
  properties: Record<string, Schema>,
  required = Object.keys(properties),
): Schema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const text = (maxLength: number): Schema => ({ type: "string", minLength: 1, maxLength });
const int = (minimum: number, maximum = Number.MAX_SAFE_INTEGER): Schema => ({
  type: "integer",
  minimum,
  maximum,
});
const accountId = text(32);
const person = { accountId, personId: text(80) };
const position = int(0);
const commandId: Schema = { ...text(100), pattern: "^[A-Za-z0-9:_-]+$" };
const state: Schema = { type: "string", enum: ["Active", "Review"] };
const changes: Schema = {
  ...object(
    {
      [attrs.role]: text(160),
      [attrs.status]: state,
      [attrs.note]: text(500),
    },
    [],
  ),
  minProperties: 1,
};
const save = object({ ...person, commandId, expectedPosition: position, changes });

type Definition = { title: string; description: string; schema: Schema };
export const actions = {
  accounts: {
    title: "Accounts",
    description: "List fixture scopes, counts, dates and native query examples.",
    schema: object({}),
  },
  people: {
    title: "People",
    description: "List people in an account with a numeric offset.",
    schema: object({ accountId, offset: position, limit: int(1, 200) }, ["accountId"]),
  },
  current: {
    title: "Read current",
    description:
      "Read a person's values at a fresh recorded position and the demo's current business time.",
    schema: object(person),
  },
  earlier: {
    title: "Read earlier",
    description: "Read an exact earlier cut and compare it to current values.",
    schema: object({ ...person, position, validAt: position }, ["accountId", "personId"]),
  },
  history: {
    title: "Person journal",
    description:
      "Page through one person's transactions, newest first. Pass both cursor fields on the next page.",
    schema: object({ ...person, snapshotPosition: position, beforePosition: position }, [
      "accountId",
      "personId",
    ]),
  },
  feed: {
    title: "Change feed",
    description:
      "Poll the ordered Datomic log. Pass nextT as fromT to resume. T is an inclusive native tick, encoded as decimal text.",
    schema: object(
      {
        fromT: { ...text(19), pattern: "^(0|[1-9][0-9]*)$" },
        waitMs: int(0, 2000),
      },
      [],
    ),
  },
  save: {
    title: "Save fields",
    description:
      "Atomically edit a person at the observed position. Resend the exact request with the same commandId to recover the receipt.",
    schema: save,
  },
  duplicate: {
    title: "Replay same save",
    description:
      "Submit the same save request twice and return both receipts. The second request reuses the first transaction.",
    schema: save,
  },
  publish: {
    title: "Publish release",
    description:
      "Publish a policy and read a first answer at its receipt position. Poll release to watch materialization.",
    schema: object({ ...person, label: text(80), reviewStatus: state }),
  },
  release: {
    title: "Release progress",
    description: "Read a release's progress and one materialized answer when available.",
    schema: object({ ...person, releaseId: text(140) }),
  },
  erase: {
    title: "Erase protected value",
    description:
      "Report whether the base can present erased values across all playground read routes.",
    schema: object(person),
  },
  native: {
    title: "Run Datomic Datalog",
    description:
      "Read-only vector or map EDN in the documented gateway query grammar. Default basis is a fresh exact position.",
    schema: object({ query: text(8000), position }, ["query"]),
  },
  load: {
    title: "Run laptop load",
    description:
      "Run a bounded read/write exercise and return observed p50 and p99. Saves target a dedicated synthetic person.",
    schema: object({
      savesPerSecond: int(0, 8),
      readsPerSecond: int(0, 20),
      seconds: int(1, 8),
    }),
  },
} satisfies Record<string, Definition>;

export type Action = keyof typeof actions;
export type Payload = {
  accountId?: string;
  personId?: string;
  commandId?: string;
  offset?: number;
  limit?: number;
  expectedPosition?: number;
  changes?: Partial<Record<(typeof editable)[number], string>>;
  position?: number;
  validAt?: number;
  snapshotPosition?: number;
  beforePosition?: number;
  fromT?: string;
  waitMs?: number;
  label?: string;
  reviewStatus?: string;
  releaseId?: string;
  query?: string;
  savesPerSecond?: number;
  readsPerSecond?: number;
  seconds?: number;
};
export class ActionError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ownsAction(name: string): name is Action {
  return Object.hasOwn(actions, name);
}

function validate(schema: Schema, value: unknown, path: string): void {
  const invalid = () => {
    throw new ActionError(400, "InvalidInput", `Invalid ${path}`);
  };
  if (schema.type === "string") {
    if (
      typeof value !== "string" ||
      value.length < (schema.minLength ?? 0) ||
      value.length > (schema.maxLength ?? Infinity) ||
      (schema.pattern && !new RegExp(schema.pattern).test(value)) ||
      (schema.enum && !schema.enum.includes(value))
    )
      invalid();
    return;
  }
  if (schema.type === "integer") {
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < (schema.minimum ?? -Infinity) ||
      value > (schema.maximum ?? Infinity)
    )
      invalid();
    return;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  const obj = value as Record<string, unknown>;
  const properties = schema.properties!;
  if (
    schema.required?.some((key) => !Object.hasOwn(obj, key)) ||
    Object.keys(obj).length < (schema.minProperties ?? 0)
  )
    invalid();
  for (const [key, field] of Object.entries(obj)) {
    if (!Object.hasOwn(properties, key)) invalid();
    validate(properties[key]!, field, path + "." + key);
  }
}

export function inputFor(action: Action, value: unknown): Payload {
  validate(actions[action].schema, value, "request");
  return value as Payload;
}

export type Timing = {
  totalMs: number;
  clientMs: number | null;
  gatewayMs: number | null;
  transactorMs: number | null;
  storageMs: number | null;
  peerWaitMs: number | null;
  traceId: string | null;
};
export type Result = {
  records?: readonly unknown[];
  receipt?: unknown;
  position?: number;
  [key: string]: unknown;
};
export type Reply = {
  records: readonly unknown[];
  receipt: unknown;
  position: number | null;
  timings: Timing;
  ok: boolean;
  error?: { code: string; message: string };
  [key: string]: unknown;
};
export type Invoke = (name: Action, input: unknown) => Promise<{ status: number; reply: Reply }>;

export const outputSchema = {
  type: "object",
  required: ["ok", "records", "receipt", "position", "timings"],
  properties: {
    ok: { type: "boolean" },
    records: { type: "array", items: {} },
    receipt: {},
    position: { type: ["integer", "null"], minimum: 0 },
    timings: {
      type: "object",
      required: [
        "totalMs",
        "traceId",
        "clientMs",
        "gatewayMs",
        "peerWaitMs",
        "transactorMs",
        "storageMs",
      ],
      properties: {
        totalMs: { type: "number", minimum: 0 },
        traceId: { type: ["string", "null"] },
        ...Object.fromEntries(
          ["clientMs", "gatewayMs", "peerWaitMs", "transactorMs", "storageMs"].map((key) => [
            key,
            { type: ["number", "null"], minimum: 0 },
          ]),
        ),
      },
    },
    error: {
      type: "object",
      properties: { code: { type: "string" }, message: { type: "string" } },
    },
  },
};

export function openapi() {
  return {
    openapi: "3.1.0",
    info: { title: "Triplex playground", version: "0.1.0" },
    paths: Object.fromEntries(
      Object.entries(actions).map(([name, action]) => [
        `/api/${name}`,
        {
          post: {
            operationId: name,
            summary: action.title,
            description: action.description,
            requestBody: {
              required: true,
              content: { "application/json": { schema: action.schema } },
            },
            responses: Object.fromEntries(
              Object.entries({
                200: "Action result",
                400: "Invalid input or query",
                404: "Not found",
                409: "Conflict",
                503: "Unavailable",
                500: "Unexpected error",
              }).map(([status, description]) => [
                status,
                {
                  description,
                  content: {
                    "application/json": { schema: { $ref: "#/components/schemas/Reply" } },
                  },
                },
              ]),
            ),
          },
        },
      ]),
    ),
    components: { schemas: { Reply: outputSchema } },
  };
}
