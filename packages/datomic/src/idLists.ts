// [DX-XQ3] Questions across subjects, step 0 (design 2026-11-24, option E1): Triplex reads by entity type answered
// from the gateway's ID list route instead of a scan of every fact. A type is listed by the ID prefixes its entities
// live under (`acct/<account>/<prefix>` or, for Triplex's reserved entities, `_triplex/<prefix>` under the account
// `_system`), optionally narrowed by an ID shape. Default off: without `idLists` the adapter behaves exactly as before.
// Rejected: guessing a type's IDs from its name (a type whose IDs are not under a declared prefix would lose entities).
import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import { ReadError, type TripleRow } from "@triplex-build/triplex/runtime";
import { DatomicHttpError, type DatomicClient, type DatomicIdListPage, type DatomicIdListRequest } from "./DatomicClient.js";

/** One ID range a type's entities live in. */
export interface IdListSource {
  readonly account: string;
  readonly prefix: string;
  readonly shape?: string;
}
export interface IdListOptions {
  /** Entity type → the ID ranges its entities live in. Every entity of the type must be inside one of them. */
  readonly types: Readonly<Record<string, readonly IdListSource[]>>;
  /** With true, a read by pattern that names no entity and no listed type is refused (MatchNeedsPaging), never scanned. */
  readonly refuseScans?: boolean;
  /** Most facts a bounded `match` may return (default 10,000); more is refused with MatchNeedsPaging. */
  readonly matchFactLimit?: number;
  /** Bounds sent with every page (the gateway's defaults when absent). */
  readonly bounds?: DatomicIdListRequest["bounds"];
  /** Attempts on 503 IndexBusy before the read fails (default 40, one bound's wait apart). */
  readonly busyAttempts?: number;
}

// [DX-XQ3] Why: Triplex's ConfigStore reads its five record types by type; every such entity lives under one reserved
// prefix, so its load becomes five bounded ID lists under `_system`. Spread into `idLists.types` to turn it on.
export const configStoreIdLists: Readonly<Record<string, readonly IdListSource[]>> = {
  "triplex.config-object": [{ account: "_system", prefix: "config/object/" }],
  "triplex.config-type": [{ account: "_system", prefix: "config/type/" }],
  "triplex.config-revision": [{ account: "_system", prefix: "config/revision/" }],
  "triplex.config-snapshot": [{ account: "_system", prefix: "config/snapshot/" }],
  "triplex.config-ref": [{ account: "_system", prefix: "config/ref/" }],
};

export class DatomicMatchNeedsPaging extends ReadError {
  readonly code = "MatchNeedsPaging";
}

const startOf = (source: IdListSource) =>
  (source.account === "_system" ? "_triplex/" : `acct/${source.account}/`) + source.prefix;

// [DX-SCALE2] Why: a type listed per account has one range per account, and the nested check below compares every
// pair (A squared comparisons: 10^10 at 100,000 accounts, minutes at start-up), while candidateIds sorted the type's
// ranges again on every page (A log A per page). With TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS=1 (default off: both as
// before) the check sorts the starts once and compares neighbours only, and the sorted ranges are kept per options
// object and type. Same decision: if some start b begins with another start a, every start sorted between a and b
// also begins with a, so a's sorted successor begins with a; equal starts are neighbours. Only which offending pair
// the message names can differ. Rejected: a prefix tree (more code for the same answer).
export const manyAccountRanges = () => process.env["TRIPLEX_DATOMIC_ID_LISTS_MANY_ACCOUNTS"] === "1";
const byStart = (a: IdListSource, b: IdListSource) => (startOf(a) < startOf(b) ? -1 : startOf(a) > startOf(b) ? 1 : 0);
const sortedSources = new WeakMap<IdListOptions, Map<string, readonly IdListSource[]>>();
const sortedFor = (options: IdListOptions, entityType: string): readonly IdListSource[] => {
  if (!manyAccountRanges()) return [...(options.types[entityType] ?? [])].sort(byStart);
  let m = sortedSources.get(options);
  if (!m) sortedSources.set(options, (m = new Map()));
  let s = m.get(entityType);
  if (!s) m.set(entityType, (s = [...(options.types[entityType] ?? [])].sort(byStart)));
  return s;
};

export const validateIdListOptions = (options: IdListOptions): void => {
  for (const [type, sources] of Object.entries(options.types)) {
    if (sources.length === 0) throw new TypeError(`idLists.types.${type} lists no ID range`);
    const starts = sources.map(startOf);
    if (manyAccountRanges()) {
      const sorted = [...starts].sort();
      for (let k = 1; k < sorted.length; k++)
        if (sorted[k]!.startsWith(sorted[k - 1]!))
          throw new TypeError(
            `idLists.types.${type}: range ${sorted[k]} is inside range ${sorted[k - 1]} (entities would be listed twice)`,
          );
    } else {
      for (const [i, a] of starts.entries())
        for (const [j, b] of starts.entries())
          if (i !== j && b.startsWith(a))
            throw new TypeError(`idLists.types.${type}: range ${b} is inside range ${a} (entities would be listed twice)`);
    }
    for (const source of sources)
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(source.account))
        throw new TypeError(`idLists.types.${type}: invalid account ${source.account}`);
  }
  const limit = options.matchFactLimit ?? 10_000;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000_000)
    throw new RangeError("idLists.matchFactLimit must be 1..1000000");
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One page from the route, waiting out IndexBusy (the account's other listing, or every permit in use). */
export async function listIdsPage(
  client: DatomicClient,
  db: string,
  request: DatomicIdListRequest,
  attempts = 40,
): Promise<DatomicIdListPage> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await client.listIds(db, request);
    } catch (error) {
      if (!(error instanceof DatomicHttpError && error.code === "IndexBusy") || attempt >= attempts) throw error;
      await sleep(Math.min(1000, request.bounds?.ms ?? 100));
    }
  }
}

/**
 * The candidate IDs of a type after `after`, in ascending ID order, across its ranges, read at `position`.
 * Yields each route page's IDs; the caller stops when it has enough.
 */
export async function* candidateIds(
  client: DatomicClient,
  db: string,
  options: IdListOptions,
  entityType: string,
  position: number,
  after: string | undefined,
  pageLimit: () => number,
): AsyncGenerator<readonly string[]> {
  const sources = sortedFor(options, entityType);
  for (const source of sources) {
    const start = startOf(source);
    // Ranges are disjoint and sorted: a range wholly at or before `after` is done.
    if (after !== undefined && !after.startsWith(start) && after > start) continue;
    let cursor: string | undefined;
    let first = true;
    for (;;) {
      const request: DatomicIdListRequest = {
        account: source.account,
        prefix: source.prefix,
        ...(source.shape === undefined ? {} : { shape: source.shape }),
        limit: Math.max(1, Math.min(1000, pageLimit())),
        ...(options.bounds === undefined ? {} : { bounds: options.bounds }),
        ...(cursor !== undefined
          ? { cursor }
          : {
              basis: { recordedPosition: position },
              ...(first && after !== undefined && after.startsWith(start) ? { after } : {}),
            }),
      };
      first = false;
      const page = await listIdsPage(client, db, request, options.busyAttempts);
      if (page.position !== position) throw new TypeError("ID list answered at another position");
      yield page.ids ?? [];
      if (page.next === null) break;
      cursor = page.next;
    }
  }
}

/** The rows of a batch of entities at the basis, as the adapter's getByEntities reads them. */
export type ReadEntities = (
  ids: readonly string[],
  basis: ResolvedTemporalBasis,
) => Promise<ReadonlyMap<string, readonly TripleRow[]>>;

/**
 * Triples.entityPage through the ID list: the first `limit` entities after `after` that have a fact of the type
 * visible at the basis, each with all its visible rows, and whether another follows. Exactly the scan's page.
 */
export async function entityPage(
  client: DatomicClient,
  db: string,
  options: IdListOptions,
  read: ReadEntities,
  request: { readonly entityType: string; readonly after?: string; readonly limit: number; readonly basis: ResolvedTemporalBasis },
  position: number,
): Promise<{ entities: (readonly [string, readonly TripleRow[]])[]; more: boolean }> {
  const kept: (readonly [string, readonly TripleRow[]])[] = [];
  const want = request.limit + 1;
  for await (const ids of candidateIds(client, db, options, request.entityType, position, request.after, () => want - kept.length)) {
    if (ids.length === 0) continue;
    const rows = await read(ids, request.basis);
    for (const id of ids) {
      const entityRows = rows.get(id) ?? [];
      if (entityRows.some((row) => row.entity_type === request.entityType)) kept.push([id, entityRows]);
      if (kept.length >= want) break;
    }
    if (kept.length >= want) break;
  }
  return { entities: kept.slice(0, request.limit), more: kept.length > request.limit };
}

/**
 * A read by pattern on a listed type, bounded: every fact of the type's entities that matches the pattern, at most
 * `matchFactLimit`, else MatchNeedsPaging.
 */
export async function boundedMatch(
  client: DatomicClient,
  db: string,
  options: IdListOptions,
  read: ReadEntities,
  entityType: string,
  basis: ResolvedTemporalBasis,
  position: number,
  matches: (row: TripleRow) => boolean,
): Promise<TripleRow[]> {
  const limit = options.matchFactLimit ?? 10_000;
  const found: TripleRow[] = [];
  for await (const ids of candidateIds(client, db, options, entityType, position, undefined, () => 1000)) {
    if (ids.length === 0) continue;
    const rows = await read(ids, basis);
    for (const id of ids)
      for (const row of rows.get(id) ?? [])
        if (matches(row)) {
          found.push(row);
          if (found.length > limit)
            throw new DatomicMatchNeedsPaging({
              message: `More than ${limit} facts of type ${entityType} match; page by entity with entityPage`,
            });
        }
  }
  // The scan's order (adapter queryRows): record time, then fact ID.
  return found.sort((a, b) => a.recorded_at - b.recorded_at || a.id.localeCompare(b.id));
}
