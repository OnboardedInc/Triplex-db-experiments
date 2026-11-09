import {
  assertFeedCursor,
  validateFeedEntry,
  type ChangeFeed,
  type FeedEntry,
  type FeedChange,
  type FeedCursor,
  type FeedPage,
  type FeedTransaction,
  type FeedStamp,
} from "@triplex-build/triplex/feed";
import type { TransactionPage } from "@triplex-build/triplex";

const coordinate = (n: number | string): string => {
  if (typeof n === "number" && !Number.isSafeInteger(n))
    throw new Error("Unsafe source coordinate");
  return String(n);
};
const stamp = (n?: number | string): FeedStamp =>
  n === undefined
    ? { stamp: null, stampStatus: "pending-RT01" }
    : { stamp: coordinate(n), stampStatus: "decided" };
const checked = (entries: readonly FeedEntry[], cursor: FeedCursor): FeedPage => {
  entries.forEach(validateFeedEntry);
  return { entries, cursor };
};

// [EXP-FD01] Why: SQL01's LogFeed.poll is synchronous. Only a reader-worker RPC may enter here.
// Rejected: calling LogFeed on the server event loop (R25/Q84b). This interface is the integration seam.
export interface BrokerFeedRequest {
  readonly kind: "feed";
  readonly cursor: unknown;
  readonly maxBytes: number;
}
export interface BrokerFeedPage {
  readonly cursor: unknown;
  readonly resolutions: readonly (
    | {
        readonly kind: "commit";
        readonly epoch: number;
        readonly lsn: number;
        readonly transacts: readonly {
          readonly positions: readonly number[];
          readonly operationId: string;
          readonly txIds: readonly string[];
          readonly commandIds: readonly string[];
          readonly stamp?: number | string;
          readonly changes: readonly {
            readonly op: "assert" | "retract" | "erase";
            readonly entity: string;
            readonly attribute: string;
            readonly validFrom: number;
            readonly validTo: number | null;
            readonly position: number;
            readonly assertionId?: string;
            readonly erasureSeq?: string;
          }[];
        }[];
      }
    | { readonly kind: "aborted"; readonly epoch: number; readonly lsn: number }
    | {
        readonly kind: "epoch";
        readonly epoch: number;
        readonly lsn: number;
        readonly previousEpoch: number;
      }
    | {
        readonly kind: "seal";
        readonly epoch: number;
        readonly lsn: number;
        readonly stamp: string;
      }
  )[];
}
export function brokerChangeFeed(
  source: string,
  stream: string,
  reader: {
    readonly transport: "reader-worker";
    readonly request: (request: BrokerFeedRequest) => Promise<BrokerFeedPage>;
  },
): ChangeFeed {
  if (reader.transport !== "reader-worker") throw new Error("Broker feed requires reader worker");
  return {
    source,
    arm: "candidate",
    poll: async (cursor, limit = 8 * 1024 * 1024) => {
      assertFeedCursor(source, cursor);
      const page = await reader.request({
        kind: "feed",
        cursor: JSON.parse(cursor.token),
        maxBytes: limit,
      });
      const entries: FeedEntry[] = page.resolutions.map((r) => {
        const base = { stream, epoch: coordinate(r.epoch), offset: coordinate(r.lsn) };
        if (r.kind === "commit")
          return {
            ...base,
            kind: "commit",
            transactions: r.transacts.map(
              (t): FeedTransaction => ({
                ...stamp(t.stamp),
                positions: t.positions.map(coordinate),
                txIds: [...t.txIds],
                commandIds: [...t.commandIds],
                operationId: t.operationId,
                changes: t.changes.map((c): FeedChange => {
                  if (!c.assertionId)
                    throw new Error(
                      "Broker feed pending assertionId support; legacy tuples are not P3 identities",
                    );
                  return {
                    op: c.op,
                    entity: c.entity,
                    attribute: c.attribute,
                    validFrom: c.validFrom,
                    validTo: c.validTo,
                    position: coordinate(c.position),
                    assertionId: c.assertionId,
                    ...(c.erasureSeq === undefined ? {} : { erasureSeq: c.erasureSeq }),
                  };
                }),
              }),
            ),
          };
        if (r.kind === "epoch")
          return { ...base, kind: "epoch", previousEpoch: coordinate(r.previousEpoch) };
        if (r.kind === "seal") return { ...base, kind: "seal", stamp: r.stamp };
        return { ...base, kind: "aborted" };
      });
      return checked(entries, { source, token: JSON.stringify(page.cursor) });
    },
  };
}

/** Structural contract read from exp/P2X-xtdb-commit-feed:CommitFeed.ts. */
export interface NativeXtdbFeed {
  readonly poll: (
    cursor: { readonly msgId: number; readonly processed: boolean },
    options: { readonly exact: true; readonly limit: number },
  ) => Promise<{
    readonly watermark: { readonly msgId: number; readonly processed: boolean };
    readonly resolutions: readonly {
      readonly epoch: number;
      readonly offset: number;
      readonly status: "committed" | "aborted";
      readonly stamp: number;
      readonly operationId: string;
      readonly commandIds: readonly string[];
      readonly transacts: readonly { readonly position: number; readonly ordinal: number }[];
      readonly changes?: readonly {
        readonly op: "assert" | "retract";
        readonly entity: string;
        readonly attribute: string;
        readonly validFrom: number;
        readonly validTo: number | null;
        readonly ordinal: number;
      }[];
    }[];
  }>;
}
export function xtdbChangeFeed(
  source: string,
  stream: string,
  native: NativeXtdbFeed,
  identities: (operationId: string, ordinal: number, changeIndex: number | null) => Promise<string>,
  decidedStamp = false,
): ChangeFeed {
  return {
    source,
    arm: "candidate",
    poll: async (cursor, limit = 1000) => {
      assertFeedCursor(source, cursor);
      const page = await native.poll(JSON.parse(cursor.token), { exact: true, limit });
      const entries: FeedEntry[] = [];
      for (const r of page.resolutions) {
        const base = { stream, epoch: coordinate(r.epoch), offset: coordinate(r.offset) };
        if (r.status === "aborted") {
          entries.push({ ...base, kind: "aborted" });
          continue;
        }
        if (!r.changes) throw new Error("P2X exact tuples missing");
        // [EXP-FD01] Why: P2X supplies operation-wide command IDs, not an ordinal-to-command map.
        // Rejected: copying all commands to each ordinal (falsely reports a command at new positions).
        const changes: FeedChange[] = [];
        const txIds: string[] = [];
        const byOrdinal = new Map(r.transacts.map((t) => [t.ordinal, t]));
        if (byOrdinal.size !== r.transacts.length) throw new Error("Duplicate P2X ordinal");
        for (const t of r.transacts) txIds.push(await identities(r.operationId, t.ordinal, null));
        for (const [i, c] of r.changes.entries()) {
          const t = byOrdinal.get(c.ordinal);
          if (!t) throw new Error("P2X change has no logical transaction");
          changes.push({
            op: c.op,
            entity: c.entity,
            attribute: c.attribute,
            validFrom: c.validFrom,
            validTo: c.validTo,
            position: coordinate(t.position),
            assertionId: await identities(r.operationId, t.ordinal, i),
          });
        }
        const transactions: FeedTransaction[] = [
          {
            ...stamp(decidedStamp ? r.stamp : undefined),
            positions: r.transacts.map((t) => coordinate(t.position)),
            txIds,
            commandIds: [...r.commandIds],
            operationId: r.operationId,
            changes,
          },
        ];
        entries.push({ ...base, kind: "commit", transactions });
      }
      return checked(entries, { source, token: JSON.stringify(page.watermark) });
    },
  };
}

// [EXP-FD01] Why: Q98a retains the journal only as an A0 control. Rejected: disguising it as a native P3 feed.
export function journalChangeFeed(
  source: string,
  stream: string,
  epoch: string,
  read: (after: number, limit: number) => Promise<TransactionPage>,
  decidedStamp?: (position: number) => Promise<string>,
): ChangeFeed {
  return {
    source,
    arm: "A0-control",
    poll: async (cursor, limit = 1000) => {
      assertFeedCursor(source, cursor);
      const after = Number(cursor.token);
      if (!Number.isSafeInteger(after) || after < 0) throw new Error("Invalid journal cursor");
      const page = await read(after, limit);
      const entries: FeedEntry[] = [];
      for (const tx of page.transactions) {
        const p = coordinate(tx.position);
        entries.push({
          stream,
          epoch,
          offset: p,
          kind: "commit",
          transactions: [
            {
              ...(decidedStamp ? stamp(await decidedStamp(tx.position)) : stamp()),
              positions: [p],
              txIds: [String(tx.txId)],
              operationId: String(tx.txId),
              commandIds: tx.commandId ? [tx.commandId] : [],
              changes: tx.changes.map((c) => {
                if (c.validFrom === undefined)
                  throw new Error("Legacy journal lacks valid-time interval");
                return {
                  op: c.op,
                  entity: String(c.entityId),
                  attribute: c.attribute,
                  validFrom: c.validFrom,
                  validTo: c.validTo ?? null,
                  position: p,
                  assertionId: String(c.tripleId),
                };
              }),
            },
          ],
        });
      }
      return checked(entries, { source, token: String(page.next ?? after) });
    },
  };
}
export function datomicChangeFeed(source: string): ChangeFeed {
  return {
    source,
    arm: "candidate",
    poll: async () => {
      throw new Error(
        "FeedUnavailable: Datomic log route pending EXP-DF01; use journalChangeFeed as A0-control",
      );
    },
  };
}
