// [DX-XQ8] Questions across subjects for the console and the agent tools: the read gateway's ID list route
// (POST /v2/db/{db}/ids, TX2_ID_LISTS=1) and its slow exact route (POST /v2/db/{db}/sweep, TX2_SWEEP=1), both from
// exp/DX-XQ6-exact-sweep. Five functions, each behind one catalogue tool (tools.ts):
//   listIds        the IDs of one kind in one account, or their exact count, at the head, a position or a record time
//   listKinds      which kinds of entity an account holds, found by the ID list (one bounded read per kind) with counts
//   describeKind   the attributes seen on the first subjects of a kind, with the protected ones marked as not filterable
//   askAcross      a question with up to 8 conditions (all required), answered by reading each subject at one position
//                  and one valid time: a list with columns, a count, or a count per value, in pages with the store's cursor
//   (fastIndex)    the one marked place for the commit-time index's fast answer, which does not exist yet
// Every answer states the position and valid time it holds for, and that it reads stored facts. Every typed refusal of
// the store is passed through with its code and one plain sentence.
// Why: the console and the agents see the store's own exact routes and their own refusals, nothing re-evaluated here.
// Rejected: evaluating conditions in this process over rows read by ID (it would move protected values over the wire and
// would not be the store's answer); offering a protected attribute as a filter (the store refuses it; the console marks
// it instead, from the store's own refusal).
import {
  AskRefused,
  askPage,
  DatomicHttpError,
  listIdsPage,
  sweepPageWaiting,
  type AskAnswer as StoreAskAnswer,
  type DatomicIdListPage,
  type DatomicIdListRequest,
  type SweepCondition,
  type SweepPage,
  type SweepValue,
} from "@triplex-build/triplex-datomic";
import { resolveBasis, type Basis } from "./entities.ts";
import { DemoError } from "./errors.ts";
import { GuardedClient } from "./guard.ts";
import type { Demo } from "./store.ts";

// ---- the one place question calls are sent -------------------------------------------------------------------------

/**
 * [DX-XQ8] QUESTION-READER SETTING. Every ID list and sweep request of this file goes through this client, and only
 * these: the subject reads, the erasure frontier and every other tool stay on the connection's read gateway.
 * Unset (default): the connection's read gateway. Set TRIPLEX_QUESTION_READER_URL (or `questionReaderUrl` in the
 * connection file) to send the question routes to a separate question reader (exp/DX-XQ7-question-reader), as that
 * branch's SDK option `questionReaderUrl` does; it must serve the same database. Busy answers (503 IndexBusy or
 * SweepBusy with retryAfterMs) are waited out by the SDK and, past that, shown by the console as "busy, retrying".
 */
export function questionReaderUrl(demo: Demo): string | undefined {
  const fromFile = (demo.connection as { questionReaderUrl?: unknown }).questionReaderUrl;
  const url = process.env["TRIPLEX_QUESTION_READER_URL"] ?? (typeof fromFile === "string" ? fromFile : undefined);
  return url && /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/?$/.test(url) ? url.replace(/\/$/, "") : undefined;
}
const questionClients = new WeakMap<Demo, GuardedClient>();
export function questionClient(demo: Demo): GuardedClient {
  const url = questionReaderUrl(demo);
  if (!url) return demo.reader;
  let client = questionClients.get(demo);
  if (!client) {
    client = new GuardedClient(url, 60_000);
    if (demo.reader.onRequest) client.onRequest = demo.reader.onRequest; // the same timing samples as every other request of the answer
    questionClients.set(demo, client);
  }
  return client;
}

const iso = (ms: number | null | undefined) =>
  ms === null || ms === undefined || !Number.isFinite(ms) ? null : new Date(ms).toISOString();
const round = (n: number) => Math.round(n * 100) / 100;

// ---- refusals ------------------------------------------------------------------------------------------------------

/** One plain sentence per code the two routes refuse with (EXACT-SWEEP.md section 1, ID-LISTS.md section 1). */
export const refusalSentences: Record<string, string> = {
  ProtectedValueLookup:
    "That attribute holds protected values. The store never filters, groups or lists subjects by a protected value; ask by another attribute.",
  CursorMismatch:
    "This page marker belongs to another question, account or position, or it was changed. Start the question again from its first page.",
  AccountRequired: "Name one account. Every question across subjects is asked inside one account.",
  InvalidValue: "One of the values is not in the form the store takes (see the message).",
  UnsupportedOperation:
    "The slow exact route answers: is, is not, is one of, between, starts with, contains, has a value, has no value, and \"has related\" (one level); all conditions together or up to 4 \"any of\" groups, at most 8 conditions in all; values of text, reference, integer, number, date or yes/no.",
  NestedRelatedUnsupported:
    "A condition on related entities cannot itself ask about their related entities: one level only. Ask the inner question first, or ask it from the other kind.",
  ReverseLinkUnsupported:
    "Finding the entities that point at each subject needs an index. Ask the reverse question instead: sweep the kind that holds the reference, with a \"has related\" condition through that reference.",
  OrderedPagingNeedsIndex:
    "The slow route reads every entity once, so it can give the top N (up to 1,000) in an order, but not pages in that order beyond them; pages in value order are the index route's (find), which is a separate branch.",
  RelatedLimitExceeded: "One entity has more than 1,000 related entities of that kind; the store refuses rather than count part of them.",
  ContainsValueTooLong: "A value of that attribute is longer than 65,536 characters; \"contains\" searches whole values only, so the store refuses rather than search part of one.",
  InteriorPosition:
    "That position is inside a group of commits written together. Ask at the group's own position (the store names it as the maximum).",
  IrregularScope: "The store cannot resolve a record time on this scope. Ask at a position instead.",
  LayoutUnsupported: "This database's layout is not one the question routes read.",
  BasisNotAvailable:
    "The read gateway has not reached that position yet. Ask again in a moment, or ask at the latest position.",
  AtLeastTimeout: "The read gateway did not reach the position of your last change in time. Ask again in a moment.",
  GroupLimitExceeded: "There are more than 1,000 different values; a count per value stops there. Add a condition to narrow it.",
  SweepBusy:
    "Busy, retrying: another question of this account is being answered, and the store answers one at a time per account.",
  IndexBusy: "Busy, retrying: another ID list of this account is being read.",
  AccountMismatch: "That starting ID belongs to another account.",
  // [DX-XQ10] The index route's refusals (find, exp/DX-XQ4); with route "auto" each one marked fallback "sweep" is answered
  // by the slow exact route instead, and the answer says which refusal sent it there.
  AttributeNotIndexed: "That attribute (or every attribute, on a database without a declaration) is not declared for the index, so the fast route cannot answer it.",
  IndexNotAvailableAtPosition: "The index was built at a later position than the one asked; before it, only the slow exact route answers.",
  IndexOff: "The read gateway runs without the index option (TX2_CROSS_INDEX).",
  BoundTooSmall: "One page of the index could not pass a single candidate inside its entry bound.",
  ValueFamilyMismatch: "The value's type is not the type the attribute was declared with; the slow exact route compares by each value's own type.",
  ReleaseWrittenAttribute: "A release writes that attribute, so its values settle in the background; it is not declared for the index.",
  RouteOff:
    "The read gateway was started without the questions-across-subjects options (TX2_ID_LISTS and TX2_SWEEP). Restart the stack with them on (demo/toy/README-FOR-CONSOLE.md, \"Switch the console\").",
};

/** A store refusal or error as a DemoError: the store's code, one plain sentence, the store's own message beside it. */
export function storeError(error: unknown, route: "ids" | "sweep" | "index"): unknown {
  if (!(error instanceof DatomicHttpError)) return error;
  const code = error.status === 404 && error.code === "NotFound" ? "RouteOff" : error.code;
  const sentence = refusalSentences[code];
  if (!sentence) return error;
  const busy = code === "SweepBusy" || code === "IndexBusy";
  return new DemoError(code, `${sentence} (store: ${error.code}${error.message ? ", " + error.message : ""})`, {
    refused: !busy,
    busy,
    explanation: sentence,
    storeCode: error.code,
    storeMessage: error.message,
    status: error.status,
    route,
    ...(error.maximum !== undefined ? { maximum: error.maximum } : {}),
    ...(error.retryAfterMs !== undefined ? { retryAfterMs: error.retryAfterMs } : {}),
  });
}

const rethrow = (route: "ids" | "sweep") => (error: unknown): never => {
  throw storeError(error, route);
};

// ---- the fast answer from the index (not built here) ------------------------------------------------------------------

/**
 * [DX-XQ10] THE FAST ANSWER FROM THE INDEX, now real (it was the marked FAST-INDEX HOOK of DX-XQ8). Every question goes
 * through the SDK's one call (askPage, packages/datomic/src/ask.ts): the commit-time index (find, TX2_CROSS_INDEX=1)
 * when the question is on declared attributes, at a position at or after the index's epoch and in a shape find takes;
 * otherwise the slow exact route at the same position and valid time, with the index's typed refusal shown. This is
 * what the database declares, read from the store (GET index-declaration), cached for 30 s.
 */
type Declaration = { declared: boolean; attributes: { attribute: string; code: string; family: string; since: number | null }[]; seq: number; error?: string };
const declarations = new WeakMap<Demo, { at: number; value: Declaration }>();
export async function declaration(demo: Demo): Promise<Declaration> {
  const hit = declarations.get(demo);
  if (hit && performance.now() - hit.at < 30_000) return hit.value;
  let value: Declaration;
  try {
    const state = await demo.reader.indexDeclaration(demo.db);
    const epochs = state.epochs ?? {};
    value = {
      declared: (state.declaration?.attributes?.length ?? 0) > 0,
      seq: state.seq,
      attributes: (state.declaration?.attributes ?? []).map((a) => ({ attribute: a.attribute, code: a.code, family: a.family, since: epochs[a.code]?.position ?? null })),
    };
  } catch (error) {
    value = { declared: false, seq: 0, attributes: [], error: error instanceof DatomicHttpError ? error.code : String(error) };
  }
  declarations.set(demo, { at: performance.now(), value });
  return value;
}
export function fastIndex(d: Declaration) {
  return {
    available: d.declared,
    name: "Fast answer from the index",
    status: d.declared
      ? `on: ${d.attributes.length} attribute${d.attributes.length === 1 ? "" : "s"} declared (${d.attributes.map((a) => a.attribute).join(", ")})`
      : `off: nothing is declared in this database${d.error && d.error !== "AttributeNotIndexed" ? ` (${d.error})` : ""}`,
    whatItWillChange: d.declared
      ? "Questions on declared attributes are answered from an index kept at each commit; everything else is read subject by subject, and the slow route checks the fast one."
      : "Declare attributes (the Indexed attributes view shows the call) and questions on them are answered from an index kept at each commit.",
  };
}

/**
 * [DX-XQ10] What the index holds, for the console's "Indexed attributes" view and the agent tool indexed_attributes:
 * the declared attributes (database-wide), since which position each answers, which of a kind's attributes are among
 * them, and the declare call that would add the others. The call is shown, never run here: a declaration is followed
 * by a backfill, which needs a quiet window (lab/experiments/EXP-DX1/xq4/COMMIT-INDEX.md).
 */
const DECLARABLE: Record<string, string> = { string: "string", ref: "ref", integer: "integer", number: "number", datetime: "datetime", boolean: "boolean" };
export function indexedAttributes(demo: Demo, input: { account: string | number; kind?: Kind | undefined }) {
  return demo.measure(async () => {
    const account = checkAccount(demo, input.account);
    const d = await declaration(demo);
    const kind = input.kind ? checkKind(input.kind) : undefined;
    const seen = kind ? await describeKind(demo, { account, prefix: kind.prefix, shape: kind.shape, sample: 24 }) : undefined;
    const declaredSet = new Map(d.attributes.map((a) => [a.attribute, a]));
    const rows = seen?.attributes.map((a) => ({
      attribute: a.attribute,
      valueTypes: a.valueTypes,
      declared: declaredSet.has(a.attribute),
      since: declaredSet.get(a.attribute)?.since ?? null,
      declarable: !a.protected && a.valueTypes.length === 1 && a.valueTypes[0]! in DECLARABLE && !declaredSet.has(a.attribute),
      reason: a.protected ? "Protected: never declared (a protected value is never looked up)." : a.valueTypes.length !== 1 ? "Values of more than one type." : a.valueTypes[0] === "json" ? "json values are not indexed." : undefined,
    }));
    const codes = new Set(d.attributes.map((a) => a.code));
    let next = 1;
    const code = () => { while (codes.has(`c${next}`)) next++; codes.add(`c${next}`); return `c${next}`; };
    const toAdd = (rows ?? []).filter((r) => r.declarable).map((r) => ({ attribute: r.attribute, code: code(), family: DECLARABLE[r.valueTypes[0]!]! }));
    const body = { version: 1, attributes: [...d.attributes.map(({ attribute, code, family }) => ({ attribute, code, family })), ...toAdd] };
    return {
      account,
      ...(kind ? { kind: { ...kind, label: kindLabel(kind) } } : {}),
      declared: d.declared,
      declarationSeq: d.seq,
      attributes: d.attributes,
      scope: "database-wide: one declaration for every account of the one database",
      ...(rows ? { kindAttributes: rows } : {}),
      declareCall: toAdd.length
        ? {
            shownNotRun: true,
            sdk: `await client.declareIndexes(db, ${JSON.stringify(body)});\nawait client.backfillIndex(db, {}); // in a quiet window: a save admitted during it refuses it (BackfillRaced)`,
            http: `POST /v2/db/${demo.db}/index-declaration ${JSON.stringify(body)}\nPOST /v2/db/${demo.db}/index-backfill {}`,
            adds: toAdd.map((a) => a.attribute),
            note: "A declaration only grows; codes are never reused. Each new code answers from the position its backfill seals.",
          }
        : null,
      position: seen?.position ?? Number((await demo.reader.basis(demo.db)).position.v),
    };
  });
}

// ---- kinds ---------------------------------------------------------------------------------------------------------

export type Kind = { prefix: string; shape?: string | undefined };
/** The kind in the routes' form (no undefined fields). */
const wireKind = (k: Kind): { prefix: string; shape?: string } => (k.shape ? { prefix: k.prefix, shape: k.shape } : { prefix: k.prefix });

const knownKinds: Record<string, string> = {
  "pl:": "Subject root records and placements",
  "wk:": "Profiles",
  "i9:": "Tasks",
  "sec:": "Subtasks",
  "doc:": "Files",
  "page/": "Pages",
  "console/": "Console counters",
  directory: "Account directory",
};
/** The kind's name in plain words, from its ID prefix (and shape when it keeps only the roots). */
export function kindLabel(kind: Kind): string {
  if (kind.prefix === "pl:" && kind.shape === "pl:{8 digits}") return "Subjects (root records)";
  if (kind.prefix === "pl:" && kind.shape) return "Subject root records";
  const known = knownKinds[kind.prefix];
  if (known) return kind.shape ? `${known} (${kind.shape})` : known;
  const word = kind.prefix.replace(/[:/]$/, "");
  const name = word.length >= 3
    ? word.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : `IDs starting ${kind.prefix}`;
  return kind.shape ? `${name} (${kind.shape})` : name;
}

function checkAccount(demo: Demo, account: string | number) {
  // Accounts come from the database's roster, so a picker offers every account and a typo is refused by name.
  return demo.account(account).account;
}

function checkKind(kind: Kind): Kind {
  if (typeof kind.prefix !== "string" || kind.prefix.length > 512 || /[\u0000-\u001f]/.test(kind.prefix))
    throw new DemoError("InvalidInput", "kind.prefix is the text after acct/<account>/ that the IDs of this kind start with, e.g. i9: or pl:");
  return kind.shape === undefined || kind.shape === "" ? { prefix: kind.prefix } : { prefix: kind.prefix, shape: kind.shape };
}

type IdListBasis = { recordedPosition?: number; recordedAt?: number; validAt?: number };
async function idListBasis(demo: Demo, basis?: Basis) {
  const b = await resolveBasis(demo, basis ?? {});
  const wire: IdListBasis = { ...b.wire };
  return { wire, words: b.words };
}

// ---- 1. the ID list ------------------------------------------------------------------------------------------------

export type ListIdsInput = {
  account: string | number;
  prefix?: string | undefined;
  shape?: string | undefined;
  basis?: Basis | undefined;
  result?: "ids" | "count" | undefined;
  limit?: number | undefined;
  order?: "asc" | "desc" | undefined;
  cursor?: string | undefined;
  ceilingMs?: number | undefined;
};

/**
 * One page of IDs, or the exact count of the kind (pages followed to the end or to the ceiling). An ID list answers
 * "which IDs had a fact recorded at or before this position"; it has no valid-time axis and does not look at values.
 */
export function listIds(demo: Demo, input: ListIdsInput) {
  return demo.measure(async () => {
    const account = checkAccount(demo, input.account);
    const kind = checkKind({ prefix: input.prefix ?? "", shape: input.shape });
    const result = input.result ?? "ids";
    const ceilingMs = Math.min(Math.max(input.ceilingMs ?? 10_000, 100), 60_000);
    const started = performance.now();
    const basis = input.cursor ? undefined : await idListBasis(demo, input.basis);
    const base: DatomicIdListRequest = {
      account,
      prefix: kind.prefix,
      ...(kind.shape ? { shape: kind.shape } : {}),
      result,
      ...(result === "ids" ? { limit: Math.min(Math.max(input.limit ?? 100, 1), 1000) } : {}),
      order: input.order ?? "asc",
      bounds: { entries: 100_000, ms: 1000 },
    };
    const pages: DatomicIdListPage[] = [];
    let cursor = input.cursor;
    for (;;) {
      const page = await listIdsPage(questionClient(demo), demo.db, {
        ...base,
        ...(cursor ? { cursor } : basis ? { basis: basis.wire } : {}),
      }).catch(rethrow("ids"));
      if (pages.length && page.position !== pages[0]!.position) throw new DemoError("Inconsistent", "An ID list page moved position");
      pages.push(page);
      if (result === "ids" || page.next === null || performance.now() - started > ceilingMs) break;
      cursor = page.next;
    }
    const last = pages[pages.length - 1]!;
    const complete = last.next === null;
    return {
      account,
      kind: { ...kind, label: kindLabel(kind) },
      result,
      ...(result === "ids" ? { ids: last.ids ?? [], returned: (last.ids ?? []).length } : { count: last.count ?? 0, countExact: complete && last.countExact !== false }),
      complete,
      stopped: last.stopped,
      next: last.next,
      ...(result === "count" && !complete ? { note: `Stopped at the ${ceilingMs} ms ceiling; the count so far is a lower bound. Pass next as cursor to continue at the same position.` } : {}),
      holdsFor: {
        position: last.position,
        validAt: null,
        asked: basis?.words.replace(/, valid .*$/, "") ?? "the position of the cursor's first page",
        meaning: "IDs of entities that had a fact recorded at or before this position, live or retired. An ID list has no valid-time axis and reads no values; ask_across_subjects reads values at a valid time.",
      },
      route: {
        used: "ID list" as const,
        how: "One ordered range read of the store's ID index inside acct/<account>/<prefix>, nothing read per subject.",
        pages: pages.length,
        entriesExamined: pages.reduce((n, p) => n + p.examined, 0),
        storage: { segmentsLoaded: pages.reduce((n, p) => n + (p.segmentsLoaded ?? 0), 0), scanMs: round(pages.reduce((n, p) => n + p.scanMicros, 0) / 1000) },
      },
      facts: "stored" as const,
      position: last.position,
    };
  });
}

// ---- 2. the kinds in an account ------------------------------------------------------------------------------------

/**
 * The kinds of entity in one account, by walking the ID list once per kind (each walk starts after the last kind's
 * IDs, so an account with K kinds costs K reads of one ID), then counting each kind's IDs with the ID list. Counts stop
 * at a ceiling per kind and say so.
 */
export function listKinds(demo: Demo, input: { account: string | number; basis?: Basis | undefined; ceilingMs?: number | undefined }) {
  return demo.measure(async () => {
    const account = checkAccount(demo, input.account);
    const base = `acct/${account}/`;
    const basis = await idListBasis(demo, input.basis);
    const perKindMs = Math.min(Math.max(input.ceilingMs ?? 3000, 100), 20_000);
    let position: number | undefined;
    const pinned = (): IdListBasis => (position === undefined ? basis.wire : { recordedPosition: position, ...(basis.wire.validAt === undefined ? {} : { validAt: basis.wire.validAt }) });
    const one = async (request: Omit<DatomicIdListRequest, "account">) => {
      const page = await listIdsPage(questionClient(demo), demo.db, { ...request, account, basis: pinned() }).catch(rethrow("ids"));
      position ??= page.position;
      return page;
    };
    const found: { prefix: string; first: string }[] = [];
    let after: string | undefined;
    let reads = 0;
    while (found.length < 64) {
      const page = await one({ prefix: "", limit: 1, ...(after ? { after } : {}), bounds: { entries: 100_000, ms: 1000 } });
      reads++;
      const id = page.ids?.[0];
      if (!id) break;
      const local = id.slice(base.length);
      const prefix = /^([^:/]*[:/])/.exec(local)?.[1] ?? local;
      found.push({ prefix, first: local });
      // The least key after every ID starting with this prefix (or after this one ID when it has no separator).
      after = prefix === local ? id : base + prefix + "￿";
    }
    const count = async (kind: Kind) => {
      const started = performance.now();
      let n = 0, pages = 0, cursor: string | undefined;
      for (;;) {
        const page = cursor
          ? await listIdsPage(questionClient(demo), demo.db, { account, prefix: kind.prefix, ...(kind.shape ? { shape: kind.shape } : {}), result: "count", cursor, bounds: { entries: 100_000, ms: 1000 } }).catch(rethrow("ids"))
          : await one({ prefix: kind.prefix, ...(kind.shape ? { shape: kind.shape } : {}), result: "count", bounds: { entries: 100_000, ms: 1000 } });
        pages++;
        n = page.count ?? 0;
        if (page.next === null) return { ids: n, countExact: true, pages };
        if (performance.now() - started > perKindMs) return { ids: n, countExact: false, pages };
        cursor = page.next;
      }
    };
    const kinds = [];
    for (const f of found) {
      const all = await count({ prefix: f.prefix });
      const rest = f.first.slice(f.prefix.length);
      // A kind whose first ID is the prefix and a run of digits also has a "roots only" shape (pl:00000005 against the
      // placements pl:00000005:p0): offer it first when it keeps fewer IDs.
      if (f.prefix !== f.first && /^\d+$/.test(rest)) {
        const shape = `${f.prefix}{${rest.length} digits}`;
        const roots = await count({ prefix: f.prefix, shape });
        if (roots.ids < all.ids || !all.countExact) {
          kinds.push({ prefix: f.prefix, shape, label: kindLabel({ prefix: f.prefix, shape }), ...roots, example: base + f.first });
        }
      }
      kinds.push({ prefix: f.prefix, label: kindLabel({ prefix: f.prefix }), ...all, example: base + f.first });
    }
    return {
      account,
      kinds,
      holdsFor: {
        position: position ?? null,
        validAt: null,
        asked: basis.words.replace(/, valid .*$/, ""),
        meaning: "Kinds are the ID prefixes after acct/<account>/. Counts are IDs with a fact recorded at or before the position (ID list counts).",
      },
      route: { used: "ID list" as const, kindReads: reads, countCeilingMsPerKind: perKindMs },
      facts: "stored" as const,
      position: position ?? (await demo.head()).position,
    };
  });
}

// ---- 3. the attributes of a kind -----------------------------------------------------------------------------------

const FAMILY_WORDS: Record<string, string> = {
  string: "text", ref: "reference", integer: "integer", number: "number", datetime: "date and time", boolean: "yes or no", json: "JSON",
};

/**
 * The attributes seen on the first `sample` entities of a kind (in ID order) at one position and valid time, each with
 * its value types, how many of the sampled entities have it and a few example values. When the database declares
 * protected attributes, each one is found from the store's own refusal (a question naming it is refused before any
 * subject is read), marked not filterable with the reason, and its values are never returned.
 */
export function describeKind(demo: Demo, input: { account: string | number; prefix: string; shape?: string | undefined; basis?: Basis | undefined; sample?: number | undefined }) {
  return demo.measure(async () => {
    const account = checkAccount(demo, input.account);
    const kind = checkKind({ prefix: input.prefix, shape: input.shape });
    const sample = Math.min(Math.max(input.sample ?? 24, 1), 200);
    const basis = await resolveBasis(demo, input.basis ?? {});
    const page = await listIdsPage(questionClient(demo), demo.db, {
      account, prefix: kind.prefix, ...(kind.shape ? { shape: kind.shape } : {}), limit: sample, basis: basis.wire, bounds: { entries: 100_000, ms: 1000 },
    }).catch(rethrow("ids"));
    const ids = page.ids ?? [];
    const validAt = basis.wire.validAt;
    const rows = ids.length
      ? await demo.reader.rows(demo.db, { entityIds: [...ids], basis: { recordedPosition: page.position, validAt } })
      : [];
    const seen = new Map<string, { families: Set<string>; entities: Set<string>; examples: string[] }>();
    for (const r of rows) {
      const a = seen.get(r.attribute) ?? { families: new Set<string>(), entities: new Set<string>(), examples: [] };
      a.entities.add(r.entity_id);
      if (r.value_type !== "erased") {
        a.families.add(r.value_type);
        const v = r.value_type === "boolean" ? String(r.value_boolean === 1) : r.value_type === "datetime" ? iso(r.value_datetime) : String(r.value_string ?? r.value_number ?? "");
        if (v && a.examples.length < 4 && !a.examples.includes(v)) a.examples.push(v.length > 60 ? v.slice(0, 57) + "..." : v);
      }
      seen.set(r.attribute, a);
    }
    const attributes = [...seen.keys()].sort();
    const frontier = await demo.reader.erasureFrontier(demo.db);
    const protectedSet = new Set<string>();
    let probes = 0;
    if (frontier.protected && ids.length) {
      // Ask the store: a question that names a protected attribute is refused (409 ProtectedValueLookup) before any
      // subject is read; one that does not reads at most one subject. Eight attributes per question.
      const pending = [...attributes];
      while (pending.length && probes < 200) {
        const batch = pending.slice(0, 8);
        probes++;
        try {
          await sweepPageWaiting(questionClient(demo), demo.db, {
            account, from: wireKind(kind), result: "ids", limit: 1, project: batch,
            basis: { recordedPosition: page.position, validAt }, bounds: { subjects: 1, ms: 200 },
          });
          pending.splice(0, batch.length);
        } catch (error) {
          if (!(error instanceof DatomicHttpError) || error.code !== "ProtectedValueLookup") throw storeError(error, "sweep");
          const named = batch.find((a) => error.message.startsWith(a + " ")) ?? (batch.length === 1 ? batch[0] : undefined);
          if (!named) throw new DemoError("ProtectedValueLookup", `The store refused one of ${batch.join(", ")} as protected without naming it`);
          protectedSet.add(named);
          pending.splice(pending.indexOf(named), 1);
        }
      }
    }
    return {
      account,
      kind: { ...kind, label: kindLabel(kind) },
      sampled: ids.length,
      sampleRule: `the first ${sample} IDs of the kind in ID order${page.next ? "" : " (that is every ID of the kind)"}; an attribute seen only on later subjects is not listed, and any attribute name can still be asked`,
      protectedAttributesDeclared: frontier.protected,
      attributes: attributes.map((a) => {
        const s = seen.get(a)!;
        const isProtected = protectedSet.has(a);
        const families = [...s.families].sort();
        return {
          attribute: a,
          valueTypes: families,
          valueTypeWords: families.map((f) => FAMILY_WORDS[f] ?? f),
          seenOn: s.entities.size,
          ...(isProtected
            ? { protected: true, filterable: false, reason: "Protected value: the store never filters, groups or lists by it.", examples: [] as string[] }
            : { protected: false, filterable: !families.every((f) => f === "json"), examples: s.examples }),
        };
      }),
      probes: { protectedChecks: probes },
      holdsFor: { position: page.position, validAt: iso(validAt), asked: basis.words },
      facts: "stored" as const,
      position: page.position,
    };
  });
}

// ---- 4. the question -----------------------------------------------------------------------------------------------

export type ValueType = "string" | "ref" | "integer" | "number" | "datetime" | "boolean";
const TYPE_ALIASES: Record<string, ValueType> = {
  string: "string", text: "string", ref: "ref", reference: "ref", integer: "integer", int: "integer",
  number: "number", datetime: "datetime", date: "datetime", instant: "datetime", boolean: "boolean", bool: "boolean",
};
export type Scalar = string | number | boolean;
export type TypedValue = { type: string; value: Scalar };
export type RelatedInput = { prefix: string; shape?: string | undefined; link?: "key" | { ref: string } | undefined };
export type ConditionInput = {
  attribute?: string | undefined;
  op: "eq" | "ne" | "in" | "range" | "prefix" | "contains" | "exists" | "missing" | "has";
  caseInsensitive?: boolean | undefined;
  /** [DX-XQ9] For has: the related kind and how it is tied, its own conditions, and the quantifier. */
  related?: RelatedInput | undefined;
  where?: ConditionInput[] | undefined;
  quantifier?: "some" | "none" | { op: "gte" | "gt" | "lte" | "lt" | "eq"; value: number } | undefined;
  value?: Scalar | TypedValue | undefined;
  values?: (Scalar | TypedValue)[] | undefined;
  from?: Scalar | TypedValue | undefined;
  to?: Scalar | TypedValue | undefined;
  fromExclusive?: boolean | undefined;
  toExclusive?: boolean | undefined;
  type?: string | undefined;
};

const isTyped = (v: unknown): v is TypedValue => typeof v === "object" && v !== null && "type" in v && "value" in v;

/** A value in the store's form. Without a type: yes/no, integer, number, a reference when it is an entity ID, else text. */
export function storeValue(input: Scalar | TypedValue, typeName?: string): SweepValue {
  const raw = isTyped(input) ? input.value : input;
  const given = isTyped(input) ? input.type : typeName;
  const type: ValueType | undefined = given === undefined ? undefined : TYPE_ALIASES[given];
  if (given !== undefined && !type)
    throw new DemoError("InvalidInput", `type is one of text, reference, integer, number, date, boolean (not ${given})`);
  const inferred: ValueType = type ?? (typeof raw === "boolean" ? "boolean"
    : typeof raw === "number" ? (Number.isInteger(raw) ? "integer" : "number")
    : /^acct\/[A-Za-z0-9_-]+\/\S+$/.test(raw) ? "ref" : "string");
  switch (inferred) {
    case "string": case "ref": return { type: inferred, value: String(raw) };
    case "integer": {
      const text = String(raw).trim();
      if (!/^-?\d+$/.test(text)) throw new DemoError("InvalidInput", `${raw} is not an integer`);
      return { type: "integer", value: text };
    }
    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new DemoError("InvalidInput", `${raw} is not a number`);
      return { type: "number", value: n };
    }
    case "datetime": {
      const ms = typeof raw === "number" ? raw : /^\d+$/.test(String(raw)) ? Number(raw) : Date.parse(String(raw));
      if (!Number.isFinite(ms)) throw new DemoError("InvalidInput", `${raw} is not a date (ISO text or epoch milliseconds)`);
      return { type: "datetime", value: ms };
    }
    case "boolean": {
      if (raw === true || raw === "true" || raw === "yes") return { type: "boolean", value: true };
      if (raw === false || raw === "false" || raw === "no") return { type: "boolean", value: false };
      throw new DemoError("InvalidInput", `${raw} is not yes or no`);
    }
  }
}

/** A condition in the store's grammar (the find route's, which the sweep takes unchanged). */
export function storeCondition(c: ConditionInput): SweepCondition {
  if (c.op === "has") {
    if (!c.related?.prefix) throw new DemoError("InvalidInput", `"has related" needs related.prefix, the related kind (e.g. i9:)`);
    const related = {
      prefix: c.related.prefix,
      ...(c.related.shape ? { shape: c.related.shape } : {}),
      link: c.related.link ?? "key",
    } as const;
    return {
      op: "has",
      related,
      ...(c.where?.length ? { where: c.where.map((x) => storeCondition(x) as Exclude<SweepCondition, { op: "has" }>) } : {}),
      ...(c.quantifier !== undefined ? { quantifier: c.quantifier } : {}),
    };
  }
  if (!c.attribute) throw new DemoError("InvalidInput", `${c.op} needs an attribute`);
  const attribute = c.attribute;
  switch (c.op) {
    case "ne":
      if (c.value === undefined) throw new DemoError("InvalidInput", `${attribute}: "is not" needs a value`);
      return { attribute, op: "ne", value: storeValue(c.value, c.type) };
    case "contains":
      if (c.value === undefined) throw new DemoError("InvalidInput", `${attribute}: "contains" needs a text value`);
      return {
        attribute, op: "contains", value: { type: "string", value: String(isTyped(c.value) ? c.value.value : c.value) },
        ...(c.caseInsensitive ? { caseInsensitive: true } : {}),
      };
    case "eq":
      if (c.value === undefined) throw new DemoError("InvalidInput", `${attribute}: "is" needs a value`);
      return { attribute, op: "eq", value: storeValue(c.value, c.type) };
    case "in":
      if (!c.values?.length) throw new DemoError("InvalidInput", `${attribute}: "is one of" needs 1 to 64 values`);
      return { attribute, op: "in", values: c.values.map((v) => storeValue(v, c.type)) };
    case "range": {
      if (c.from === undefined && c.to === undefined) throw new DemoError("InvalidInput", `${attribute}: "between" needs from, to or both`);
      // Both ends take the same type: the one given, else the one inferred from the first end given.
      const first = storeValue((c.from ?? c.to)!, c.type);
      const lo = c.from === undefined ? undefined : storeValue(c.from, c.type ?? first.type);
      const hi = c.to === undefined ? undefined : storeValue(c.to, c.type ?? first.type);
      return {
        attribute, op: "range",
        ...(lo ? (c.fromExclusive ? { fromExclusive: lo } : { from: lo }) : {}),
        ...(hi ? (c.toExclusive ? { toExclusive: hi } : { to: hi }) : {}),
      };
    }
    case "prefix":
      if (c.value === undefined) throw new DemoError("InvalidInput", `${attribute}: "starts with" needs a text value`);
      return { attribute, op: "prefix", value: { type: "string", value: String(isTyped(c.value) ? c.value.value : c.value) } };
    case "exists": case "missing":
      return { attribute, op: c.op };
  }
  throw new DemoError("InvalidInput", `op is one of eq, ne, in, range, prefix, contains, exists, missing, has (not ${String((c as { op: unknown }).op)})`);
}

const plainOf = (v: { type: string; value: unknown } | null) =>
  v === null ? null : v.type === "datetime" && typeof v.value === "number" ? iso(v.value) : v.value;

export type AskInput = {
  account: string | number;
  kind: Kind;
  where?: ConditionInput[] | undefined;
  /** [DX-XQ9] 1 to 4 groups; the entity matches when every where condition and at least one group hold. */
  anyOf?: ConditionInput[][] | undefined;
  result?: "list" | "count" | "countByValue" | "top" | "sum" | undefined;
  /** [DX-XQ9] For top: the order; `limit` is N. */
  order?: { by: string; type: string; direction?: "asc" | "desc" | undefined } | undefined;
  columns?: string[] | undefined;
  of?: string | undefined;
  basis?: Basis | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
  mode?: "page" | "fill" | "toEnd" | undefined;
  ceilingMs?: number | undefined;
  pageSubjects?: number | undefined;
  pageMs?: number | undefined;
  /** [DX-XQ10] "auto" (default): the index when it can, else the slow exact route; "index" or "sweep" forces one. */
  route?: "auto" | "index" | "sweep" | undefined;
};

const MAX_ROWS_TO_END = 5000;

/**
 * [DX-XQ10] A question across the subjects of one kind in one account, through the SDK's one call (askPage): the
 * commit-time index when it can answer, else the slow exact route at the same position and valid time; `route` forces
 * either ("index" or "sweep"; default "auto"). Modes: "page" returns one store page (the console drives paging and
 * shows progress); "fill" (default) follows pages until `limit` rows, the end, or the ceiling; "toEnd" follows pages to
 * the end or the ceiling. A cursor keeps the first page's route, position and valid time; it is never sent to the
 * other route (a later index page refused with fallback "sweep" restarts the question on the slow route, and the
 * answer says so).
 */
export function askAcross(demo: Demo, input: AskInput) {
  return demo.measure(async () => {
    const account = checkAccount(demo, input.account);
    const kind = checkKind(input.kind);
    const result = input.result ?? "list";
    const mode = input.mode ?? "fill";
    const route = input.route ?? "auto";
    const defaultCeiling = mode === "toEnd" ? 60_000 : 5_000;
    const ceilingMs = Math.min(Math.max(input.ceilingMs ?? defaultCeiling, 100), 300_000);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 1000);
    if (input.cursor && input.basis) throw new DemoError("InvalidInput", "A cursor keeps its first page's position and valid time; leave basis out when you pass cursor");
    const where = (input.where ?? []).map(storeCondition);
    const anyOf = input.anyOf?.map((g) => g.map(storeCondition));
    const basis = input.cursor ? undefined : await resolveBasis(demo, input.basis ?? {});
    if (result === "top" && !input.order) throw new DemoError("InvalidInput", "top needs order: { by, type, direction }");
    if (result === "sum" && !input.of) throw new DemoError("InvalidInput", "A sum needs of: the integer attribute to add");
    if (result === "countByValue" && !input.of) throw new DemoError("InvalidInput", "A count per value needs of: the attribute to count by");
    const orderType = input.order ? (TYPE_ALIASES[input.order.type] ?? input.order.type) : undefined;
    const decl = await declaration(demo);
    const question = {
      account,
      from: wireKind(kind),
      where,
      ...(anyOf ? { anyOf } : {}),
      result: result === "list" ? "ids" : result,
      ...(result === "top" && input.order
        ? { order: { by: input.order.by, type: orderType as "string", direction: input.order.direction ?? "asc" }, limit }
        : {}),
      ...((result === "countByValue" || result === "sum") && input.of ? { of: input.of } : {}),
      ...(result === "list" && input.columns?.length ? { project: input.columns } : {}),
      route,
      bounds: {
        index: { entries: 100_000, ms: Math.min(Math.max(input.pageMs ?? 200, 1), 1000) },
        sweep: { subjects: Math.min(Math.max(input.pageSubjects ?? 256, 1), 10_000), ms: Math.min(Math.max(input.pageMs ?? 200, 1), 2000) },
      },
    } as const;
    const started = performance.now();
    const pages: StoreAskAnswer[] = [];
    const rows: { id: string; columns: Record<string, unknown[]> }[] = [];
    let cursor = input.cursor;
    let restarted = false;
    for (;;) {
      const want = result === "list" ? (mode === "toEnd" ? Math.min(1000, MAX_ROWS_TO_END - rows.length) : limit - rows.length) : undefined;
      const page = await askPage(questionClient(demo), demo.db, {
        ...question,
        ...(want !== undefined ? { limit: Math.max(1, want) } : {}),
        ...(cursor ? { cursor } : basis ? { basis: basis.wire } : {}),
      } as Parameters<typeof askPage>[2]).catch((error: unknown) => { throw storeError(error, error instanceof AskRefused && error.refusedBy === "index" ? "index" : "sweep"); });
      if (page.restarted) { restarted = true; pages.length = 0; rows.length = 0; }
      if (pages.length && (page.position !== pages[0]!.position || page.validAt !== pages[0]!.validAt))
        throw new DemoError("Inconsistent", "A page of the question moved position or valid time");
      pages.push(page);
      if (result !== "top") for (const [i, id] of (page.ids ?? []).entries())
        rows.push({ id, columns: Object.fromEntries(Object.entries(page.projected?.[i] ?? {}).map(([a, vs]) => [a, vs.map((v) => plainOf(v as { type: string; value: unknown } | null))])) });
      if (page.next === null || mode === "page") break;
      if (result === "list" && mode === "fill" && rows.length >= limit) break;
      if (result === "list" && mode === "toEnd" && rows.length >= MAX_ROWS_TO_END) break;
      if (performance.now() - started > ceilingMs) break;
      cursor = page.next;
    }
    const first = pages[0]!, last = pages[pages.length - 1]!;
    const sweepRaw = (p: StoreAskAnswer) => (p.route === "sweep" ? (p.raw as SweepPage) : undefined);
    const indexRaw = (p: StoreAskAnswer) => (p.route === "index" ? (p.raw as unknown as { queryMicros?: number; queryCpuMicros?: number }) : undefined);
    const sum = (f: (p: StoreAskAnswer) => number | undefined) => pages.reduce((n, p) => n + (f(p) ?? 0), 0);
    const complete = last.next === null;
    const stoppedBy = complete ? "end" : mode === "page" ? "one page asked"
      : result === "list" && rows.length >= (mode === "toEnd" ? MAX_ROWS_TO_END : limit) ? "rows" : "ceiling";
    const asked = input.cursor ? "the position and valid time of the cursor's first page" : basis!.words;
    const lastSweep = sweepRaw(last);
    if (result === "top" && complete && last.top)
      for (const [i, id] of last.top.ids.entries()) rows.push({ id, columns: { [input.order!.by]: [plainOf(last.top.values[i] ?? null)] } });
    const relatedRead = sum((p) => sweepRaw(p)?.related);
    const onIndex = last.route === "index";
    const refusal = first.indexRefusal ?? last.indexRefusal;
    const matched = sum((p) => (p.route === "sweep" ? sweepRaw(p)!.matched : p.result === "ids" ? p.ids?.length : undefined));
    return {
      account,
      kind: { ...kind, label: kindLabel(kind) },
      question: {
        where: input.where ?? [], ...(input.anyOf ? { anyOf: input.anyOf } : {}), result, ...(input.of ? { of: input.of } : {}),
        ...(input.order ? { order: input.order } : {}), ...(input.columns?.length ? { columns: input.columns } : {}), route,
      },
      ...(result === "list" || result === "top" ? { rows, returned: rows.length } : {}),
      ...(result === "top"
        ? { top: { n: limit, order: lastSweep?.order ?? null, kept: lastSweep?.kept ?? 0, meaning: "The N best by the order after reading every entity of the kind once; ties by ID; entities without a value of the order's type last. Known only when complete." } }
        : {}),
      ...(result === "sum" && last.sum
        ? { sum: { of: input.of, ...last.sum, countComplete: complete, meaning: "Exact: every visible integer value of the attribute on every matching entity, added without overflow; values of other types are skipped and counted. The average is sum / values." } }
        : {}),
      ...(result === "count" ? { count: last.count ?? 0, countComplete: complete } : {}),
      ...(result === "countByValue"
        ? { groups: (last.counts ?? []).map((g) => ({ value: plainOf(g.value), type: g.value?.type ?? null, subjects: g.count })), countComplete: complete }
        : {}),
      complete,
      stoppedBy,
      next: last.next,
      holdsFor: {
        position: first.position,
        validAt: iso(first.validAt),
        validAtMs: first.validAt,
        asked,
        headWhenAnswered: last.head,
        meaning: "Exact for the facts recorded at or before this position and valid at this instant. A subject is an ID of the kind with at least one such fact.",
      },
      progress: {
        subjectsExamined: sum((p) => p.examined.subjectsRead),
        ...(relatedRead || pages.some((p) => sweepRaw(p)?.related !== undefined) ? { relatedRead, relatedRows: sum((p) => sweepRaw(p)?.relatedRows) } : {}),
        subjectsWithFacts: sum((p) => sweepRaw(p)?.subjects),
        matched,
        idsListed: sum((p) => p.examined.idsListed),
        indexEntriesExamined: sum((p) => p.examined.indexEntries),
        entityReads: sum((p) => p.examined.entityReads),
        storePages: pages.length,
        ceilingMs,
        elapsedMs: round(performance.now() - started),
      },
      facts: "stored" as const,
      factsMeaning: "Stored facts only: a value a release computes but has not written yet is not seen.",
      route: {
        used: onIndex ? ("fast answer from the index" as const) : ("slow exact read of each subject" as const),
        code: last.route,
        asked: route,
        forced: route !== "auto",
        restarted,
        ...(refusal
          ? { indexRefusal: { code: refusal.code, fallback: refusal.fallback ?? null, explanation: refusalSentences[refusal.code] ?? refusal.message, storeMessage: refusal.message } }
          : {}),
        reader: questionReaderUrl(demo) ? "a separate question reader" : "the read gateway",
        how: onIndex
          ? "The store read the index kept at each commit for the declared attributes, at the position and valid time, and confirmed each candidate's entries; no subject was read beyond those entries."
          : "The store listed the kind's IDs in order, read each subject's facts at the position and valid time with the pinned read's own code, and tested every condition there.",
        pages: pages.map((p) => {
          const w = sweepRaw(p), x = indexRaw(p);
          return {
            route: p.route,
            examined: w ? w.examined : p.examined.indexEntries ?? 0,
            matched: w ? w.matched : p.ids?.length ?? 0,
            rows: w ? w.rows : p.examined.entityReads ?? 0,
            stopped: w ? w.stopped : ((p.raw as { stopped?: string }).stopped ?? ""),
            storeMs: round((w ? w.micros.total : x?.queryMicros ?? 0) / 1000),
            busyRetries: 0,
          };
        }).slice(0, 100),
        rowsRead: sum((p) => sweepRaw(p)?.rows),
        storage: {
          segmentsLoaded: sum((p) => p.examined.segmentsLoaded),
          listMs: round(sum((p) => sweepRaw(p)?.micros.list) / 1000),
          readMs: round(sum((p) => sweepRaw(p)?.micros.read) / 1000),
          evaluateMs: round(sum((p) => sweepRaw(p)?.micros.evaluate) / 1000),
          queueMs: round(sum((p) => sweepRaw(p)?.micros.queue) / 1000),
          cpuMs: round(sum((p) => (sweepRaw(p)?.cpuMicros ?? indexRaw(p)?.queryCpuMicros)) / 1000),
          indexMs: round(sum((p) => indexRaw(p)?.queryMicros) / 1000),
          note: "segmentsLoaded is the store's own count of index segments loaded from storage (0 when everything was cached).",
        },
        busyRetries: 0,
        fastIndex: fastIndex(decl),
      },
      position: first.position,
    };
  });
}
