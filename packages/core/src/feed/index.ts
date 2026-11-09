// [EXP-FD01] Why: Q98a/f requires immutable identity-only delivery, independent of backend values.
// Rejected: reusing TransactionRecord (contains values and cannot survive erasure byte-exactly).
export interface FeedChange {
  readonly op: "assert" | "retract" | "erase";
  readonly entity: string;
  readonly attribute: string;
  readonly validFrom: number;
  readonly validTo: number | null;
  readonly position: string;
  readonly assertionId: string;
  readonly erasureSeq?: string;
}
export type FeedStamp =
  | { readonly stamp: string; readonly stampStatus: "decided" }
  | { readonly stamp: null; readonly stampStatus: "pending-RT01" };
export type FeedTransaction = FeedStamp & {
  readonly positions: readonly string[];
  readonly txIds: readonly string[];
  readonly operationId: string;
  readonly commandIds: readonly string[];
  readonly changes: readonly FeedChange[];
};
export type FeedEntry = {
  readonly stream: string;
  readonly epoch: string;
  /** Source offset or LSN, never a dense synthetic position. */
  readonly offset: string;
} & (
  | { readonly kind: "commit"; readonly transactions: readonly FeedTransaction[] }
  | { readonly kind: "aborted" }
  | { readonly kind: "epoch"; readonly previousEpoch: string }
  | { readonly kind: "seal"; readonly stamp: string }
);
export interface FeedCursor {
  /** Immutable tenant/database/generation/source binding. */
  readonly source: string;
  readonly token: string;
}
export interface FeedPage {
  readonly entries: readonly FeedEntry[];
  readonly cursor: FeedCursor;
}
export interface ChangeFeed {
  readonly source: string;
  readonly arm: "candidate" | "A0-control";
  readonly poll: (cursor: FeedCursor, limit?: number) => Promise<FeedPage>;
}
export interface AffectedSubject {
  readonly epoch: string;
  readonly position: string;
  readonly subject: string;
}
export type FeedCrashPoint = "before-effect" | "after-effect" | "after-checkpoint";
export interface ConsumerStore {
  readonly checkpoint: (consumer: string) => FeedCursor | null;
  readonly apply: (
    consumer: string,
    expected: FeedCursor | null,
    page: FeedPage,
    affected: readonly AffectedSubject[],
    crash?: (point: FeedCrashPoint) => void,
  ) => void;
}

const natural = (s: string) => {
  if (typeof s !== "string" || !/^(0|[1-9][0-9]*)$/.test(s))
    throw new Error("Noncanonical feed coordinate");
};
const keys = (o: object, allowed: readonly string[]) => {
  if (Object.keys(o).some((k) => !allowed.includes(k))) throw new Error("Unexpected feed field");
};
const identity = (s: string) => {
  if (typeof s !== "string" || s.length === 0) throw new Error("Missing feed identity");
};
/** Reject extra fields as well as incomplete legacy tuples; never invent an assertion identity. */
export function validateFeedEntry(entry: FeedEntry): void {
  identity(entry.stream);
  natural(entry.epoch);
  natural(entry.offset);
  keys(entry, [
    "stream",
    "epoch",
    "offset",
    "kind",
    ...(entry.kind === "commit"
      ? ["transactions"]
      : entry.kind === "epoch"
        ? ["previousEpoch"]
        : entry.kind === "seal"
          ? ["stamp"]
          : []),
  ]);
  if (entry.kind === "epoch") natural(entry.previousEpoch);
  else if (entry.kind === "seal") natural(entry.stamp);
  else if (entry.kind === "commit") {
    if (!entry.transactions.length) throw new Error("Empty commit resolution");
    const positions = new Set<string>();
    for (const tx of entry.transactions) {
      keys(tx, [
        "positions",
        "txIds",
        "operationId",
        "commandIds",
        "stamp",
        "stampStatus",
        "changes",
      ]);
      identity(tx.operationId);
      if (!tx.positions.length || !tx.txIds.length)
        throw new Error("Missing transaction identities");
      for (const p of tx.positions) {
        natural(p);
        if (positions.has(p)) throw new Error("Duplicate position");
        positions.add(p);
      }
      for (const id of [...tx.txIds, ...tx.commandIds]) identity(id);
      if (tx.stampStatus === "decided") {
        if (tx.stamp === null) throw new Error("Missing decided stamp");
        natural(tx.stamp);
      } else if (tx.stampStatus !== "pending-RT01" || tx.stamp !== null)
        throw new Error("Invalid stamp status");
      for (const c of tx.changes) {
        keys(c, [
          "op",
          "entity",
          "attribute",
          "validFrom",
          "validTo",
          "position",
          "assertionId",
          "erasureSeq",
        ]);
        if (!["assert", "retract", "erase"].includes(c.op))
          throw new Error("Unknown change operation");
        identity(c.entity);
        identity(c.attribute);
        identity(c.assertionId);
        natural(c.position);
        if (!tx.positions.includes(c.position)) throw new Error("Change outside transaction");
        if (
          !Number.isFinite(c.validFrom) ||
          (c.validTo !== null && (!Number.isFinite(c.validTo) || c.validTo <= c.validFrom))
        )
          throw new Error("Invalid valid-time interval");
        if (c.op === "erase") {
          if (c.erasureSeq === undefined) throw new Error("Missing erasure sequence");
          natural(c.erasureSeq);
        } else if (c.erasureSeq !== undefined)
          throw new Error("Erasure sequence on ordinary change");
      }
    }
  } else if (entry.kind !== "aborted") throw new Error("Unknown feed resolution");
}
/** Stable wire bytes: object insertion order from upstream readers is irrelevant. */
export function feedBytes(entry: FeedEntry): string {
  validateFeedEntry(entry);
  const sort = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sort)
      : v !== null && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, sort(x)]),
          )
        : v;
  return JSON.stringify(sort(entry));
}
export function assertFeedCursor(source: string, cursor: FeedCursor): void {
  if (cursor.source !== source) throw new Error("Feed cursor source mismatch");
}

export interface FeedPosition {
  readonly source: string;
  readonly stream: string;
  readonly epoch: string;
  readonly position: string;
}
/** Source publication and durable knowledge must use the same host monotonic clock domain. */
export interface FeedInstant extends FeedPosition {
  readonly clock: string;
  readonly atMonoMs: number;
}
export function feedPositionKey(p: FeedPosition): string {
  identity(p.source);
  identity(p.stream);
  natural(p.epoch);
  natural(p.position);
  return JSON.stringify([p.source, p.stream, p.epoch, p.position]);
}
// [EXP-FD01-R2] Why: Q98c/d starts lag at publication, never at decided record time or ACK.
// Rejected: accepting a caller's lag number without its source-bound publication observation (QA F2).
export function publicationLagMs(publication: FeedInstant | undefined, known: FeedInstant): number {
  if (!publication) throw new Error("Missing source publication instant");
  if (
    feedPositionKey(publication) !== feedPositionKey(known) ||
    typeof publication.clock !== "string" ||
    !publication.clock ||
    publication.clock !== known.clock
  )
    throw new Error("Publication clock/source/position mismatch");
  if (
    !Number.isFinite(publication.atMonoMs) ||
    !Number.isFinite(known.atMonoMs) ||
    publication.atMonoMs < 0 ||
    known.atMonoMs < publication.atMonoMs
  )
    throw new Error("Invalid publication interval");
  return known.atMonoMs - publication.atMonoMs;
}
