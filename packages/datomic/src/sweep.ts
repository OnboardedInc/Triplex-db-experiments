// [DX-XQ6] Questions across subjects, the exact sweep (design 2026-11-24, part 2 of DESIGN-FABLE.md): the gateway lists
// the IDs of one kind in one account, reads each subject with the pinned read's own code at one position and one
// valid-time instant, and tests the question's conditions on that subject's visible facts, in bounded pages with a
// signed cursor. The gateway route exists only with TX2_SWEEP=1. This file is the client side: one page as the gateway
// answers it, every page of a question, and an exact count (optionally split by ID prefix over several permits).
// Rejected: evaluating in the client (it would move every subject's rows over the wire, protected values included).
import { DatomicHttpError, type DatomicClient } from "./DatomicClient.js";

export type SweepValue =
  | { readonly type: "string" | "ref"; readonly value: string }
  | { readonly type: "integer"; readonly value: string | number }
  | { readonly type: "number" | "datetime"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean };

/** The find route's condition grammar (exp/DX-XQ4-commit-index), all conditions required (AND). */
export type SweepCondition =
  | { readonly attribute: string; readonly op: "eq"; readonly value: SweepValue }
  | { readonly attribute: string; readonly op: "in"; readonly values: readonly SweepValue[] }
  | {
      readonly attribute: string;
      readonly op: "range";
      readonly from?: SweepValue;
      readonly fromExclusive?: SweepValue;
      readonly to?: SweepValue;
      readonly toExclusive?: SweepValue;
    }
  | { readonly attribute: string; readonly op: "prefix"; readonly value: { readonly type: "string"; readonly value: string } }
  | { readonly attribute: string; readonly op: "exists" | "missing" };

export interface SweepRequest {
  readonly account: string;
  /** The kind: an ID prefix after `acct/<account>/` and an optional shape (the ID list route's grammar). */
  readonly from?: { readonly prefix?: string; readonly shape?: string };
  readonly where?: readonly SweepCondition[];
  readonly result?: "ids" | "count" | "countByValue";
  /** The attribute countByValue groups by. */
  readonly of?: string;
  /** Up to eight attributes whose visible values come back with each matching ID (result ids). */
  readonly project?: readonly string[];
  /** Matching IDs per page (result ids), 1..1000, default 100. */
  readonly limit?: number;
  readonly basis?: { readonly recordedPosition?: number; readonly recordedAt?: number; readonly validAt?: number };
  readonly atLeastPosition?: number;
  readonly basisWaitMs?: number;
  /** Subjects read per page (default 256, cap 10,000) and time per page (default 200 ms, cap 2,000). */
  readonly bounds?: { readonly subjects?: number; readonly ms?: number };
  readonly cursor?: string;
}

export interface SweepPage {
  readonly database: string;
  readonly account: string;
  /** The commit position every page of this question is exact at. */
  readonly position: number;
  readonly t: string;
  readonly head: number;
  /** The valid-time instant every page of this question is for (the gateway's clock when the first page named none). */
  readonly validAt: number;
  /** "stored": values a release has not yet written are not seen (see EXACT-SWEEP.md, settlement). */
  readonly facts: "stored";
  readonly result: "ids" | "count" | "countByValue";
  readonly complete: boolean;
  readonly stopped: "end" | "limit" | "subjects" | "time";
  readonly examined: number;
  readonly listed: number;
  readonly subjects: number;
  readonly matched: number;
  readonly rows: number;
  readonly segmentsLoaded: number;
  readonly ioReads?: Record<string, unknown>;
  readonly micros: { readonly total: number; readonly list: number; readonly read: number; readonly evaluate: number; readonly queue: number };
  readonly cpuMicros: number;
  readonly ids?: readonly string[];
  readonly projected?: readonly Record<string, readonly { type: string; value: unknown }[]>[];
  /** Running count over every page so far (result count); exact for the question when countComplete. */
  readonly count?: number;
  readonly groups?: readonly { readonly value: { type: string; value: unknown } | null; readonly count: number }[];
  readonly countComplete?: boolean;
  readonly next: string | null;
}

const dbName = /^(?:s-[a-f0-9]{32}|s2-[A-Za-z0-9_-]+)$/;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One page, validated: the account echoed, `next` null exactly when complete, every ID inside the account. */
export async function sweepPage(client: DatomicClient, db: string, request: SweepRequest): Promise<SweepPage> {
  if (!dbName.test(db)) throw new TypeError("Invalid Datomic database name");
  const page = await client.request<SweepPage>("POST", `/v2/db/${db}/sweep`, request);
  const base = `acct/${request.account}/`;
  if (
    typeof page !== "object" ||
    page === null ||
    page.account !== request.account ||
    !Number.isSafeInteger(page.position) ||
    typeof page.validAt !== "number" ||
    page.complete !== (page.next === null) ||
    !(page.ids ?? []).every((id) => id.startsWith(base))
  )
    throw new TypeError("Invalid sweep answer");
  return page;
}

/** One page, waiting out 503 SweepBusy (the account's other sweep, or every sweep permit in use). */
export async function sweepPageWaiting(
  client: DatomicClient,
  db: string,
  request: SweepRequest,
  attempts = 200,
): Promise<SweepPage & { readonly busyRetries: number }> {
  for (let attempt = 1; ; attempt++) {
    try {
      return { ...(await sweepPage(client, db, request)), busyRetries: attempt - 1 };
    } catch (error) {
      if (!(error instanceof DatomicHttpError && error.code === "SweepBusy") || attempt >= attempts) throw error;
      await sleep(Math.max(1, Math.min(1000, error.retryAfterMs ?? 50)));
    }
  }
}

/** Every page of one question, in order; the first page's position and valid time hold for all of them. */
export async function sweepAll(client: DatomicClient, db: string, request: SweepRequest): Promise<SweepPage[]> {
  const pages: SweepPage[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await sweepPageWaiting(
      client,
      db,
      cursor ? { ...withoutBasis(request), cursor } : request,
    );
    if (pages.length > 0 && (page.position !== pages[0]!.position || page.validAt !== pages[0]!.validAt))
      throw new TypeError("A sweep page moved position or valid time");
    pages.push(page);
    if (page.next === null) return pages;
    cursor = page.next;
  }
}
const withoutBasis = (request: SweepRequest): SweepRequest => {
  const { basis: _b, atLeastPosition: _a, cursor: _c, ...rest } = request;
  return rest;
};

export interface SweepCount {
  readonly count: number;
  /** The position and valid time the count is exact at (every part read at the same ones). */
  readonly position: number;
  readonly validAt: number;
  readonly pages: number;
  readonly examined: number;
  readonly busyRetries: number;
}

/**
 * The exact count of a question over the whole kind. With `split`, the kind's prefix is divided into the given
 * sub-prefixes (which must cover it: the caller states them, e.g. `pl:0000`..`pl:0009` for 100,000 loader subjects),
 * each swept by its own sequence of pages in parallel, all pinned to the position and valid time of the first part.
 * A gateway with TX2_SWEEP_PER_ACCOUNT ≥ the number of parts and as many permits runs them at once.
 */
export async function sweepCount(
  client: DatomicClient,
  db: string,
  request: Omit<SweepRequest, "result" | "cursor" | "of" | "project" | "limit">,
  split?: readonly string[],
): Promise<SweepCount> {
  const parts = split && split.length > 0 ? split : [request.from?.prefix ?? ""];
  const own = request.from?.prefix ?? "";
  if (split) for (const p of split) if (!p.startsWith(own)) throw new TypeError(`split prefix ${p} is outside ${own}`);
  for (const [i, a] of parts.entries())
    for (const [j, b] of parts.entries())
      if (i !== j && b.startsWith(a)) throw new TypeError(`split prefix ${b} is inside ${a} (subjects would count twice)`);
  // The first part fixes the position and valid time; every other part is pinned to them.
  const first = await sweepPageWaiting(client, db, { ...request, from: { ...request.from, prefix: parts[0]! }, result: "count" });
  const pinned = { ...withoutBasis(request), basis: { recordedPosition: first.position, validAt: first.validAt } };
  const finish = async (prefix: string, page?: SweepPage & { busyRetries: number }) => {
    let pages = 0, examined = 0, busy = 0;
    let current = page ?? (await sweepPageWaiting(client, db, { ...pinned, from: { ...request.from, prefix }, result: "count" }));
    for (;;) {
      pages++; examined += current.examined; busy += current.busyRetries;
      if (current.position !== first.position || current.validAt !== first.validAt) throw new TypeError("A sweep part moved position");
      if (current.next === null) return { count: current.count ?? 0, pages, examined, busy };
      current = await sweepPageWaiting(client, db, { ...withoutBasis(request), from: { ...request.from, prefix }, result: "count", cursor: current.next });
    }
  };
  const totals = await Promise.all(parts.map((prefix, i) => finish(prefix, i === 0 ? first : undefined)));
  return {
    count: totals.reduce((n, x) => n + x.count, 0),
    position: first.position,
    validAt: first.validAt,
    pages: totals.reduce((n, x) => n + x.pages, 0),
    examined: totals.reduce((n, x) => n + x.examined, 0),
    busyRetries: totals.reduce((n, x) => n + x.busy, 0),
  };
}
