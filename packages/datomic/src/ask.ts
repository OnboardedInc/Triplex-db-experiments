// [DX-XQ10] Questions across subjects in one call: the commit-time index (`find`, exp/DX-XQ4, TX2_CROSS_INDEX=1) when it
// can answer, the slow exact route (`sweep`, exp/DX-XQ6 and XQ9, TX2_SWEEP=1) when it cannot, the same question in the
// same condition language, at the same position and valid time, with the route that answered and why the index did
// not, in every answer.
//
// Rules, each enforced here:
//   1. The question is asked of one account at one commit position and one valid-time instant, and the answer states
//      both. A missing valid time is fixed here to the caller's clock before either route is asked (Triplex's own rule,
//      packages/core/src/Temporal.ts), so the two routes can never answer for different instants.
//   2. Route "auto" (the default) asks the index first. A typed refusal with `fallback: "sweep"` sends the same
//      question to the sweep, pinned to the position the index answered at when it answered a page, else to the basis
//      the caller gave. A refusal with `fallback: "none"`, or without the field (a protected value, a malformed
//      question), is thrown as it is. Route "index" or "sweep" forces one route and throws its refusals.
//   3. A cursor is the route's own, wrapped with its route, position and valid time; it is sent back only to the route
//      that issued it. When a later index page is refused with `fallback: "sweep"`, the question restarts on the sweep
//      from its first page at the pinned position and valid time, and the answer says `restarted: true` (the caller
//      discards the index pages it already has).
//   4. ids come in entity ID order on both routes unless the caller names an order (then the index alone pages it in
//      value order). Counts per value carry a "no value" group (value null) on both routes. Projections are the set of
//      visible values (distinct, sorted) on both routes. Top N and sums are the sweep's (find has neither).
// Rejected: choosing the route from a local copy of the declaration (the gateway's refusal is the authority, and a
// refusal costs no subject read); resolving the head first with a separate call (a refused first index page answered
// nothing, so there is no second position to disagree with; a pinned or record-time basis is passed unchanged).
import { createHash } from "node:crypto";
import { DatomicHttpError, type CrossIndexAnswer, type CrossIndexFindRequest, type DatomicClient } from "./DatomicClient.js";
import { sweepPage, type SweepCondition, type SweepPage, type SweepRequest } from "./sweep.js";

export type AskRoute = "index" | "sweep";
export type AskResult = "ids" | "count" | "countByValue" | "countDistinct" | "top" | "sum";

/** The question, in the condition language both routes share (sweep.ts `SweepCondition` is its widest form). */
export interface AskQuestion {
  readonly account: string;
  /** The kind: an ID prefix after `acct/<account>/` and an optional shape; `{type}` is the index's alone. */
  readonly from?: { readonly prefix: string; readonly shape?: string } | { readonly type: string };
  readonly where?: readonly SweepCondition[];
  /** The sweep's OR groups (TX2_SWEEP_SHAPES or). */
  readonly anyOf?: readonly (readonly SweepCondition[])[];
  readonly result?: AskResult;
  readonly of?: string;
  /**
   * result ids: absent = entity ID order on both routes; {by: "entity", direction} or {by: <the range attribute>,
   * direction} pages in that order (the index alone). result top: {by, type, direction} (the sweep alone).
   */
  readonly order?: { readonly by: string; readonly type?: "string" | "integer" | "number" | "datetime"; readonly direction?: "asc" | "desc" };
  readonly project?: readonly string[];
  /** IDs per page (ids), or N (top). */
  readonly limit?: number;
}

export interface AskRequest extends AskQuestion {
  readonly basis?: { readonly recordedPosition?: number; readonly recordedAt?: number; readonly validAt?: number };
  readonly atLeastPosition?: number;
  readonly basisWaitMs?: number;
  /** "auto" (default): the index when it can, else the sweep. "index" or "sweep": that route only. */
  readonly route?: "auto" | AskRoute;
  /** The previous answer's `next`. */
  readonly cursor?: string;
  readonly bounds?: { readonly index?: CrossIndexFindRequest["bounds"]; readonly sweep?: SweepRequest["bounds"] };
  /** Attempts on 503 IndexBusy or SweepBusy before the call fails (default 200). */
  readonly busyAttempts?: number;
}

export interface AskRefusal {
  readonly route: AskRoute;
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly fallback?: "sweep" | "none";
  readonly maximum?: number;
}

export type AskValue = { readonly type: string; readonly value: string | number | boolean | null } | null;

export interface AskAnswer {
  readonly route: AskRoute;
  /** Why the index did not answer (its typed refusal), when the sweep did. */
  readonly indexRefusal?: AskRefusal;
  /** true when route was forced by the caller. */
  readonly forced: boolean;
  /** true when a later index page was refused and the question restarted on the sweep at the pinned basis. */
  readonly restarted: boolean;
  readonly account: string;
  readonly position: number;
  readonly t: string;
  readonly validAt: number;
  readonly head: number;
  readonly result: AskResult;
  /** "id" (entity ID ascending), "entity-desc", "value" (the index's range attribute order) or "top". */
  readonly order: string;
  readonly complete: boolean;
  readonly ids?: readonly string[];
  /** Per ID of `ids`: {attribute: the set of visible values}. */
  readonly projected?: readonly Readonly<Record<string, readonly AskValue[]>>[];
  /** count, countByValue, countDistinct: the running count, exact for the question when complete. */
  readonly count?: number;
  /** countByValue: one group per value, the "no value" group last (value null). */
  readonly counts?: readonly { readonly value: AskValue; readonly count: number }[];
  readonly top?: { readonly ids: readonly string[]; readonly values: readonly AskValue[] };
  readonly sum?: { readonly sum: string; readonly valuesAdded: number; readonly subjectsWithValue: number; readonly skipped: number; readonly average: unknown };
  /** What this page examined: index datoms and entity reads (index), IDs listed and subjects read (sweep). */
  readonly examined: {
    readonly indexEntries?: number;
    readonly entityReads?: number;
    readonly indexOnly?: boolean;
    readonly idsListed?: number;
    readonly subjectsRead?: number;
    readonly rows?: number;
    readonly segmentsLoaded: number;
  };
  readonly facts: "stored";
  readonly next: string | null;
  /** The route's own answer, unchanged. */
  readonly raw: CrossIndexAnswer | SweepPage;
}

/** Thrown when the call ends refused: the refusal of the route that ended it, and the index's when the sweep ended it. */
export class AskRefused extends DatomicHttpError {
  constructor(error: DatomicHttpError, readonly refusedBy: AskRoute, readonly indexRefusal?: AskRefusal) {
    super(error.status, error.code, error.message, error.maximum, error.route, error.retryAfterMs, error.fallback);
  }
}

const dbName = /^(?:s-[a-f0-9]{32}|s2-[A-Za-z0-9_-]+)$/;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The question part of a request (what a cursor must keep), canonical, hashed into the cursor. */
function questionOf(r: AskQuestion): AskQuestion {
  const { account, from, where, anyOf, result, of, order, project, limit } = r;
  return { account, from, where, anyOf, result, of, order, project, limit } as AskQuestion;
}
const canonical = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canonical)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => [k, canonical((v as Record<string, unknown>)[k])]))
  : v;
const questionHash = (q: AskQuestion) => createHash("sha256").update(JSON.stringify(canonical(questionOf(q)))).digest("base64url").slice(0, 22);

interface AskCursor { v: 1; route: AskRoute; cursor: string; position: number; validAt: number; q: string; forced: boolean; ir?: AskRefusal; matched?: number }
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
function openCursor(text: string, q: AskQuestion): AskCursor {
  let c: AskCursor;
  try { c = JSON.parse(Buffer.from(text, "base64url").toString("utf8")) as AskCursor; } catch { throw new DatomicHttpError(400, "InvalidValue", "Malformed ask cursor"); }
  if (!c || c.v !== 1 || (c.route !== "index" && c.route !== "sweep") || typeof c.cursor !== "string" || !Number.isSafeInteger(c.position) || typeof c.validAt !== "number")
    throw new DatomicHttpError(400, "InvalidValue", "Malformed ask cursor");
  if (c.q !== questionHash(q)) throw new DatomicHttpError(409, "CursorMismatch", "The cursor belongs to another question");
  return c;
}

// ---- the two routes' requests -----------------------------------------------------------------------------------------

type Basis = Pick<AskRequest, "basis" | "atLeastPosition" | "basisWaitMs">;

function findRequest(q: AskQuestion, basis: Basis, bounds: AskRequest["bounds"], cursor?: string): CrossIndexFindRequest {
  const result = q.result ?? "ids";
  // ids: entity ID order unless the caller named an order (rule 4). A top N order {type} is sent as it is: find refuses
  // it by type with fallback "sweep".
  const order = q.order ?? (result === "ids" ? { by: "entity", direction: "asc" as const } : undefined);
  return ({
    account: q.account,
    ...(q.from ? { from: q.from } : {}),
    ...(q.where ? { where: q.where } : {}),
    ...(q.anyOf ? ({ anyOf: q.anyOf } as object) : {}),
    result: result as CrossIndexFindRequest["result"],
    ...(q.of !== undefined ? { of: q.of } : {}),
    ...(order ? { order: order as CrossIndexFindRequest["order"] } : {}),
    ...(q.project?.length ? { project: q.project } : {}),
    ...(q.limit !== undefined ? { limit: q.limit } : {}),
    ...(cursor ? { cursor } : { ...(basis.basis ? { basis: basis.basis } : {}), ...(basis.atLeastPosition !== undefined ? { atLeastPosition: basis.atLeastPosition } : {}), ...(basis.basisWaitMs !== undefined ? { basisWaitMs: basis.basisWaitMs } : {}) }),
    ...(bounds?.index ? { bounds: bounds.index } : {}),
  }) as CrossIndexFindRequest;
}

function sweepRequest(q: AskQuestion, basis: Basis, bounds: AskRequest["bounds"], cursor?: string): SweepRequest {
  const result = q.result ?? "ids";
  if (q.from && "type" in q.from)
    throw new DatomicHttpError(400, "UnsupportedOperation", "The sweep lists a kind by ID prefix; from {type} is the index's alone");
  if (result === "countDistinct") throw new DatomicHttpError(400, "UnsupportedOperation", "countDistinct is the index's alone");
  if (q.order && result !== "top" && !(q.order.by === "entity" && q.order.direction !== "desc"))
    throw new DatomicHttpError(400, "OrderedPagingNeedsIndex", "Pages in value order or descending ID order are the index's alone");
  return ({
    account: q.account,
    ...(q.from ? { from: q.from } : {}),
    ...(q.where ? { where: q.where } : {}),
    ...(q.anyOf ? { anyOf: q.anyOf } : {}),
    result: result as SweepRequest["result"],
    ...(q.of !== undefined ? { of: q.of } : {}),
    ...(result === "top" && q.order ? { order: q.order as SweepRequest["order"] } : {}),
    ...(q.project?.length ? { project: q.project } : {}),
    ...(q.limit !== undefined ? { limit: q.limit } : {}),
    ...(cursor ? { cursor } : { ...(basis.basis ? { basis: basis.basis } : {}), ...(basis.atLeastPosition !== undefined ? { atLeastPosition: basis.atLeastPosition } : {}), ...(basis.basisWaitMs !== undefined ? { basisWaitMs: basis.basisWaitMs } : {}) }),
    ...(bounds?.sweep ? { bounds: bounds.sweep } : {}),
  }) as SweepRequest;
}

async function waitingBusy<T>(attempts: number, f: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try { return await f(); } catch (error) {
      if (!(error instanceof DatomicHttpError && (error.code === "IndexBusy" || error.code === "SweepBusy")) || attempt >= attempts) throw error;
      await sleep(Math.max(1, Math.min(1000, error.retryAfterMs ?? 50)));
    }
  }
}

// ---- one answer in one form ---------------------------------------------------------------------------------------------

const valueOf = (v: unknown): AskValue => {
  if (v === null || v === undefined) return null;
  const o = v as { type?: unknown; value?: unknown };
  if (typeof o.type !== "string") return null;
  const raw = o.value;
  const value = o.type === "integer" && raw !== null && raw !== undefined ? String(raw)
    : (o.type === "number" || o.type === "datetime") && typeof raw === "number" ? raw + 0 // -0 is 0 (rule of both routes)
    : raw === undefined ? null : (raw as string | number | boolean | null);
  return { type: o.type, value };
};
const valueKey = (v: AskValue) => (v === null ? "￿" : JSON.stringify([v.type, v.value]));
const byValue = (a: { value: AskValue }, b: { value: AskValue }) => (valueKey(a.value) < valueKey(b.value) ? -1 : valueKey(a.value) > valueKey(b.value) ? 1 : 0);
const valueSet = (vs: readonly AskValue[]) => [...new Map(vs.map((v) => [valueKey(v), v])).values()].sort((a, b) => byValue({ value: a }, { value: b }));

function fromIndex(a: CrossIndexAnswer, q: AskQuestion): Omit<AskAnswer, "route" | "forced" | "restarted" | "next" | "indexRefusal"> {
  const result = (q.result ?? "ids") as AskResult;
  const ids = a.ids ? [...a.ids] : undefined;
  return {
    account: a.account, position: a.position, t: a.t, validAt: a.validAt, head: a.head, result,
    order: a.order?.by === "entity" ? (a.order.direction === "desc" ? "entity-desc" : "id") : "value",
    complete: a.next === null,
    ...(ids ? { ids } : {}),
    ...(ids && q.project?.length
      ? { projected: ids.map((id) => Object.fromEntries(q.project!.map((attr) => [attr, valueSet((a.projected?.[id]?.[attr] ?? []).map((v) => ({ type: "ref", value: v })))]))) }
      : {}),
    ...(result !== "ids" && a.count !== undefined ? { count: a.count } : {}),
    ...(result === "countByValue" ? { counts: (a.counts ?? []).map((c) => ({ value: valueOf(c.value), count: c.count })).sort(byValue) } : {}),
    examined: { indexEntries: a.examined, ...(a.entityReads !== undefined ? { entityReads: a.entityReads } : {}), ...(a.indexOnly !== undefined ? { indexOnly: a.indexOnly } : {}), segmentsLoaded: a.segmentsLoaded },
    facts: "stored",
    raw: a,
  };
}

function fromSweep(p: SweepPage, q: AskQuestion): Omit<AskAnswer, "route" | "forced" | "restarted" | "next" | "indexRefusal"> {
  const result = (q.result ?? "ids") as AskResult;
  const ids = result === "ids" && p.ids ? [...p.ids] : undefined;
  return {
    account: p.account, position: p.position, t: p.t, validAt: p.validAt, head: p.head, result,
    order: result === "top" ? "top" : "id",
    complete: p.complete,
    ...(ids ? { ids } : {}),
    ...(ids && q.project?.length
      ? { projected: ids.map((_, i) => Object.fromEntries(q.project!.map((attr) => [attr, valueSet(((p.projected?.[i]?.[attr] ?? []) as unknown[]).map(valueOf))]))) }
      : {}),
    ...(result === "count" ? { count: p.count ?? 0 } : {}),
    ...(result === "countByValue" ? { counts: (p.groups ?? []).map((g) => ({ value: valueOf(g.value), count: g.count })).sort(byValue) } : {}),
    ...(result === "top" ? { top: { ids: [...(p.ids ?? [])], values: (p.values ?? []).map(valueOf) } } : {}),
    ...(result === "sum" ? { sum: { sum: p.sum ?? "0", valuesAdded: p.valuesAdded ?? 0, subjectsWithValue: p.subjectsWithValue ?? 0, skipped: p.skipped ?? 0, average: p.average ?? null } } : {}),
    examined: { idsListed: p.listed, subjectsRead: p.examined, rows: p.rows, segmentsLoaded: p.segmentsLoaded },
    facts: "stored",
    raw: p,
  };
}

const refusalOf = (route: AskRoute, e: DatomicHttpError): AskRefusal => ({
  route, status: e.status, code: e.code, message: e.message,
  ...(e.fallback ? { fallback: e.fallback } : {}),
  ...(e.maximum !== undefined ? { maximum: e.maximum } : {}),
});

/**
 * One page of a question across subjects. See the rules at the top of this file. Returns the page with the route that
 * answered; throws `AskRefused` (a DatomicHttpError) when the call ends refused.
 */
export async function askPage(client: DatomicClient, db: string, request: AskRequest): Promise<AskAnswer> {
  if (!dbName.test(db)) throw new TypeError("Invalid Datomic database name");
  const q = questionOf(request);
  const route = request.route ?? "auto";
  if (route !== "auto" && route !== "index" && route !== "sweep") throw new DatomicHttpError(400, "InvalidValue", "route is auto, index or sweep");
  const attempts = request.busyAttempts ?? 200;
  const forced = route !== "auto";
  const wrap = (r: AskRoute, cursor: string | null, position: number, validAt: number, ir?: AskRefusal, matched?: number): string | null =>
    cursor === null ? null
      : b64(JSON.stringify({ v: 1, route: r, cursor, position, validAt, q: questionHash(q), forced, ...(ir ? { ir } : {}), ...(matched !== undefined ? { matched } : {}) } satisfies AskCursor));
  // The sweep's count per value: its groups are running totals; the subjects matched are counted here across pages.
  let priorMatched = 0;

  const onSweep = async (basis: Basis, cursor: string | undefined, indexRefusal: AskRefusal | undefined, restarted: boolean): Promise<AskAnswer> => {
    let page: SweepPage;
    try {
      page = await waitingBusy(attempts, () => sweepPage(client, db, sweepRequest(q, basis, request.bounds, cursor)));
    } catch (error) {
      if (error instanceof DatomicHttpError) throw new AskRefused(error, "sweep", indexRefusal);
      throw error;
    }
    const matched = priorMatched + page.matched;
    const answer = fromSweep(page, q);
    return {
      route: "sweep", ...(indexRefusal ? { indexRefusal } : {}), forced, restarted, ...answer,
      ...(answer.result === "countByValue" ? { count: matched } : {}),
      next: wrap("sweep", page.next, page.position, page.validAt, indexRefusal, matched),
    };
  };
  const onIndex = async (basis: Basis, cursor: string | undefined): Promise<AskAnswer> => {
    const a = await waitingBusy(attempts, () => client.find(db, findRequest(q, basis, request.bounds, cursor)));
    if (a.account !== q.account || !(a.ids ?? []).every((id) => id.startsWith(`acct/${q.account}/`))) throw new TypeError("Invalid find answer");
    return { route: "index", forced, restarted: false, ...fromIndex(a, q), next: wrap("index", a.next, a.position, a.validAt) };
  };

  if (request.cursor) {
    if (request.basis || request.atLeastPosition !== undefined) throw new DatomicHttpError(409, "CursorMismatch", "A cursor keeps its first page's basis");
    const c = openCursor(request.cursor, q);
    if (forced && c.route !== route) throw new DatomicHttpError(409, "CursorMismatch", `The cursor is the ${c.route} route's; it is never sent to the other route`);
    if (c.route === "sweep") { priorMatched = c.matched ?? 0; return onSweep({}, c.cursor, c.ir, false); }
    try {
      return await onIndex({}, c.cursor);
    } catch (error) {
      // A later index page refused with fallback "sweep": restart the question on the sweep at the pinned basis.
      if (!forced && error instanceof DatomicHttpError && error.fallback === "sweep")
        return onSweep({ basis: { recordedPosition: c.position, validAt: c.validAt } }, undefined, refusalOf("index", error), true);
      if (error instanceof DatomicHttpError) throw new AskRefused(error, "index");
      throw error;
    }
  }

  // Rule 1: one valid-time instant for both routes, fixed before either is asked.
  const basis: Basis = {
    basis: { ...(request.basis ?? {}), validAt: request.basis?.validAt ?? Date.now() },
    ...(request.atLeastPosition !== undefined ? { atLeastPosition: request.atLeastPosition } : {}),
    ...(request.basisWaitMs !== undefined ? { basisWaitMs: request.basisWaitMs } : {}),
  };
  if (route === "sweep") return onSweep(basis, undefined, undefined, false);
  try {
    return await onIndex(basis, undefined);
  } catch (error) {
    if (!(error instanceof DatomicHttpError)) throw error;
    if (route === "index" || error.fallback !== "sweep") throw new AskRefused(error, "index");
    return onSweep(basis, undefined, refusalOf("index", error), false);
  }
}

export interface AskAll extends Omit<AskAnswer, "next" | "raw" | "examined"> {
  readonly pages: number;
  readonly examined: { readonly indexEntries: number; readonly entityReads: number; readonly idsListed: number; readonly subjectsRead: number; readonly rows: number; readonly segmentsLoaded: number };
  /** Index pages discarded when the question restarted on the sweep. */
  readonly discardedIndexPages: number;
}

/** Every page of one question (ids concatenated; counts, top N and sums from the last page). */
export async function askAll(client: DatomicClient, db: string, request: AskRequest, maxPages = 100_000): Promise<AskAll> {
  const { cursor: _c, ...first } = request;
  let page = await askPage(client, db, first);
  let pages = [page];
  let discarded = 0;
  for (let n = 1; page.next !== null; n++) {
    if (n >= maxPages) throw new DatomicHttpError(413, "TooManyPages", `More than ${maxPages} pages`);
    const { basis: _b, atLeastPosition: _a, ...rest } = first;
    page = await askPage(client, db, { ...rest, cursor: page.next });
    if (page.restarted) { discarded += pages.length; pages = []; }
    if (pages.length && (page.position !== pages[0]!.position || page.validAt !== pages[0]!.validAt))
      throw new TypeError("A page of the question moved position or valid time");
    pages.push(page);
  }
  const last = pages[pages.length - 1]!;
  const sum = (f: (e: AskAnswer["examined"]) => number | undefined) => pages.reduce((n, p) => n + (f(p.examined) ?? 0), 0);
  const ids = last.result === "ids" ? pages.flatMap((p) => p.ids ?? []) : undefined;
  const projected = last.result === "ids" && pages.some((p) => p.projected) ? pages.flatMap((p) => p.projected ?? []) : undefined;
  const { next: _n, raw: _r, examined: _e, ids: _i, projected: _p, indexRefusal: _x, ...head } = last;
  const indexRefusal = pages[0]!.indexRefusal ?? last.indexRefusal;
  return {
    ...head,
    ...(indexRefusal ? { indexRefusal } : {}),
    route: last.route,
    restarted: discarded > 0,
    ...(ids ? { ids } : {}),
    ...(projected ? { projected } : {}),
    pages: pages.length,
    discardedIndexPages: discarded,
    examined: {
      indexEntries: sum((e) => e.indexEntries), entityReads: sum((e) => e.entityReads), idsListed: sum((e) => e.idsListed),
      subjectsRead: sum((e) => e.subjectsRead), rows: sum((e) => e.rows), segmentsLoaded: sum((e) => e.segmentsLoaded),
    },
  };
}
