// [DX-CON1] The console's only client. The app reads the tool catalogue and calls POST /api/tools/:name; nothing else
// talks to the store. Every answer carries the envelope of DESIGN.md 6.2 (position, timing, database, consoleUrl).
// Why: one interface for the app and the assistant, so every screen can show the exact tool call behind it.
// Rejected: talking to the gateways from the browser (the structural rule forbids it).

export type Call = { route: string; status: number; serverMs: number | null; roundTripMs: number };
export type Timing = {
  /** Sum of the gateways' own handling time over the requests this answer needed. */
  serverMs: number | null;
  /** Wall time on the machine running the page server, tunnel included. */
  roundTripMs: number;
  requests: number;
  calls: Call[];
  /** Work the console's local functions did themselves (query and derivation evaluation). */
  consoleMs?: number;
};
export type DatabaseRef = { id: string; kind: "toy" | "1b"; label: string; workingCopy: boolean };
export type Envelope = { position: number; timing: Timing; database?: DatabaseRef; consoleUrl?: string };
export type Answer<T = Record<string, unknown>> = T & Envelope;

/** One basis on every reading tool: recordedAt and position are exclusive. */
export type Basis = { validAt?: string | number; recordedAt?: string | number; position?: number };

export type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  description?: string;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  additionalProperties?: JsonSchema | boolean;
  propertyNames?: JsonSchema;
  [k: string]: unknown;
};

export type CatalogueTool = {
  name: string;
  title: string;
  group: string;
  sentences: string[];
  description: string;
  changes: boolean;
  annotations?: Record<string, boolean>;
  inputSchema: JsonSchema;
  /** A recorded example, when the catalogue carries one. */
  example?: { date?: string; database?: string; source?: string; input?: unknown; output?: unknown };
};
export type Catalogue = { version: string; server: string; groups: string[]; tools: CatalogueTool[]; register?: string };

export type Connection = {
  kind: "toy" | "1b";
  database: string;
  label?: string;
  file?: string;
  workingCopy: boolean;
  recordsAtBringUp: number;
  headAtBringUp: number;
  sealed: { head: number; physicalT?: number; records: number };
  roster: { account: string; namespace: string; firstPerson: number; people: number }[];
  subjects?: number;
  recordTimeRange?: { first: string | null; lastAtBringUp: string | null };
  pinnedReads?: { shortcut?: boolean; cutLookup?: boolean } | null;
  loaderPositionRows?: boolean;
  connectedAt?: string;
  [k: string]: unknown;
};

/** A tool's refusal or error, as the page server sends it: 400 { error: { code, message } }. */
export class ToolError extends Error {
  readonly code: string;
  readonly status: number;
  readonly tool: string;
  readonly detail: Record<string, unknown>;
  constructor(tool: string, status: number, code: string, message: string, detail: Record<string, unknown> = {}) {
    super(message);
    this.tool = tool;
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
  /** A refusal is the console or the store declining on purpose, with a reason; it is shown in a neutral alert. */
  get refused() {
    return REFUSAL_CODES.has(this.code) || /Refused$/.test(this.code);
  }
}
export const REFUSAL_CODES = new Set([
  "QueryRefused",
  "ScanRefused",
  "NotAWorkingCopy",
  "ReservedName",
  "ReservedAttribute",
  "ValueTypeChange",
  "RemovalUnavailable",
  "AlreadyLive",
  "TooManySubjects",
  "UnknownSubject",
  "OutOfRange",
]);

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: { code: `HTTP${res.status}`, message: text.slice(0, 400) || res.statusText } };
  }
}

export async function callTool<T = Record<string, unknown>>(name: string, input: unknown = {}, signal?: AbortSignal): Promise<Answer<T>> {
  const res = await fetch(`/api/tools/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input ?? {}),
    signal,
  });
  const body = await readJson(res);
  if (!res.ok || (body && typeof body === "object" && "error" in body && body.error)) {
    const e = (body?.error ?? {}) as { code?: string; message?: string };
    throw new ToolError(name, res.status, e.code ?? `HTTP${res.status}`, e.message ?? res.statusText, body?.error ?? {});
  }
  return body as Answer<T>;
}

export async function getCatalogue(): Promise<Catalogue> {
  const res = await fetch("/api/catalogue");
  const body = await readJson(res);
  if (!res.ok) throw new ToolError("catalogue", res.status, body?.error?.code ?? `HTTP${res.status}`, body?.error?.message ?? "The catalogue could not be read");
  return body as Catalogue;
}

export async function getConnection(): Promise<Connection> {
  const res = await fetch("/api/connection");
  const body = await readJson(res);
  if (!res.ok)
    throw new ToolError("connection", res.status, body?.error?.code ?? `HTTP${res.status}`, body?.error?.message ?? "Not connected", body?.error ?? {});
  return body as Connection;
}
