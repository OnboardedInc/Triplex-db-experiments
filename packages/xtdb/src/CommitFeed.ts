/**
 * Ordered, resumable change feed for scopes written with the `subject-stamp` commit path (EXP-P2X).
 *
 * Shape (R16 3.4): one tailer reads `xt.source_log_msgs` from a record start (O(window); R16 3.2
 * measured a 2 ms empty poll at the tip) and resolves each transaction message by tx id in `xt.txs`
 * (`_id IN (...)`, point lookups). Fan-out belongs in Triplex: R16 3.3 saw 32 pollers on `xt.txs`
 * stall commits for seconds, so callers run one tailer per node, not one per subscriber.
 *
 * Coordinates (RULINGS Q31c): stream = the XTDB database's source log; epoch and offset come from the
 * tx id, which XTDB 2.2.0 builds as `(epoch << 48) + offset` (`MsgIdUtil.kt:12-15 @ c6c1962`);
 * ordinal = the Triplex transact inside that engine transaction. The packed Triplex position is
 * derived from the transaction's system time (`stampedPosition`), whose order equals log order.
 *
 * Watermark (RULINGS Q31c, TARGETS 4.1 item 3): the cursor only ever advances over a fully resolved
 * prefix. A transaction message with no `xt.txs` row yet (appended, not yet applied) stops the page,
 * so a reader never passes a position that could still commit. Aborted transactions of the scope are
 * listed in the resolution stream rather than silently skipped. A read never crosses an epoch: the
 * upper bound is the end of the cursor's epoch, so an epoch change stalls the feed visibly instead of
 * mapping positions implicitly.
 */
import { type XtdbClient, type XtdbStatement } from "./XtdbClient.js";
import { stampedPosition } from "./XtdbStorageAdapter.js";

const EPOCH_SPAN = 2 ** 48;
// Upper bound of one read: inside the cursor's epoch. Probe p4-log-params: an upper bound of
// epochStart + 2^48 - 1 returns no rows at all (the log cursor's exclusive end becomes the next
// epoch's first id), while epochStart + 2^47 works; 2^47 bytes is 128 TiB of log per epoch.
const WINDOW_END = 2 ** 47 - 1;
const STAMP_OF = (column: string) =>
  `((${column} - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z') / INTERVAL 'PT0.000001S')`;

/**
 * A resume point. `msgId` is always a source-log record start (XTDB rejects any other lower bound
 * with "log file corrupted ... expected record separator"); `processed` says whether that record has
 * already been handled, so a resume reads it inclusively and skips it exactly once.
 */
export interface XtdbFeedCursor {
  readonly msgId: number;
  readonly processed: boolean;
}

export interface XtdbFeedTransact {
  /** Packed Triplex position: what receipts and bases carry. */
  readonly position: number;
  readonly ordinal: number;
  readonly subjects: readonly string[];
}

export interface XtdbFeedChange {
  readonly op: "assert" | "retract";
  readonly entity: string;
  readonly attribute: string;
  readonly validFrom: number;
  readonly validTo: number | null;
  readonly ordinal: number;
}

export interface XtdbFeedResolution {
  readonly msgId: number;
  readonly epoch: number;
  readonly offset: number;
  readonly status: "committed" | "aborted";
  /** The transaction's system time in epoch microseconds (also present for aborted ones). */
  readonly stamp: number;
  readonly operationId: string;
  /** Committed only: one entry per Triplex transact, in ordinal order. */
  readonly transacts: readonly XtdbFeedTransact[];
  readonly attributes: readonly string[];
  readonly commandIds: readonly string[];
  /** Hull of the valid-time ranges the transaction changed; `validTo` null means open-ended. */
  readonly validFrom?: number;
  readonly validTo?: number | null;
  /** Exact tuples from the feed row; loaded when METADATA could not carry them, or on request. */
  readonly changes?: readonly XtdbFeedChange[];
}

export interface XtdbFeedPage {
  /** This scope's committed and aborted transactions, in log order, up to the watermark. */
  readonly resolutions: readonly XtdbFeedResolution[];
  /** Where the next poll starts; covers every record read and resolved, of any scope. */
  readonly watermark: XtdbFeedCursor;
  /** Records the watermark moved over that belong to other scopes or are not transactions. */
  readonly skipped: number;
  /** True when the page stopped at a transaction that is appended but not yet resolved. */
  readonly blocked: boolean;
  /** True when the log read hit a record that could not be decoded yet (see `poll`). */
  readonly torn?: boolean;
}

export interface XtdbCommitFeed {
  /** The newest record start in the log, as a processed cursor: a consumer starting "now". */
  readonly tip: () => Promise<XtdbFeedCursor>;
  readonly poll: (
    cursor: XtdbFeedCursor,
    options?: {
      readonly limit?: number;
      readonly exact?: boolean;
      /** Log bytes read per poll before the fallback read (default 8 MiB). */
      readonly windowBytes?: number;
    },
  ) => Promise<XtdbFeedPage>;
}

const integer = (value: unknown, label: string): number => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number)) throw new TypeError(`Unsafe ${label} in the XTDB feed`);
  return number;
};

const parseChanges = (text: unknown): XtdbFeedChange[] =>
  (JSON.parse(String(text)) as unknown[][]).map(
    ([op, entity, attribute, validFrom, validTo, ordinal]) => ({
      op: op === "retract" ? "retract" : "assert",
      entity: String(entity),
      attribute: String(attribute),
      validFrom: Number(validFrom),
      validTo: validTo === null ? null : Number(validTo),
      ordinal: integer(ordinal, "ordinal"),
    }),
  );

export const makeXtdbCommitFeed = (
  client: XtdbClient,
  scopeKey: string,
): XtdbCommitFeed => ({
  tip: async () => {
    const rows = await client.query("SELECT _id FROM xt.txs ORDER BY _id DESC LIMIT 1");
    return { msgId: rows[0] === undefined ? 0 : integer(rows[0]["_id"], "tx id"), processed: rows[0] !== undefined };
  },
  poll: async (cursor, options = {}) => {
    const limit = options.limit ?? 1_000;
    const epoch = Math.floor(cursor.msgId / EPOCH_SPAN);
    const epochEnd = epoch * EPOCH_SPAN + WINDOW_END;
    // Bound each read by log bytes: the log table decodes records in batches of up to 1,024 and
    // builds each record's message text whatever the LIMIT, so a backlog of large records would land
    // on the engine heap at once. Offsets are byte positions, so the window is a byte budget.
    const windowEnd = Math.min(epochEnd, cursor.msgId + (options.windowBytes ?? 8 * 2 ** 20));
    const read = (upper: number) =>
      client.query(
        "SELECT msg_id, msg_type FROM xt.source_log_msgs WHERE msg_id BETWEEN ? AND ? LIMIT ?",
        [cursor.msgId, upper, limit + 1],
      );
    let raw: Record<string, unknown>[];
    try {
      raw = await read(windowEnd);
      // Nothing new in the window: either the tip, or one record longer than the window. A read to
      // the epoch end tells them apart, so a large record can never stall the feed.
      if (windowEnd < epochEnd && raw.every((row) => cursor.processed && Number(row["msg_id"]) === cursor.msgId))
        raw = await read(epochEnd);
    } catch (error) {
      // EXP-P2X preload (8 concurrent writers, 0.1-1.3 MB records): the log table raised "Protocol
      // message contained an invalid tag (zero)" once, and every record decoded on its own afterwards
      // (probe p7-log-decode). It reads the local log in batches up to its end, so a window that
      // reaches a record still being appended can decode a torn record. Treat that as "not yet
      // readable": the watermark does not move, so nothing is skipped; `torn` lets the caller
      // surface a decode error that persists.
      if (/invalid tag|record separator|truncated|protocol message/i.test(String((error as Error)?.message)))
        return { resolutions: [], watermark: cursor, skipped: 0, blocked: true, torn: true };
      throw error;
    }
    const records = raw
      .map((row) => ({ msgId: integer(row["msg_id"], "msg id"), type: String(row["msg_type"]) }))
      .sort((left, right) => left.msgId - right.msgId)
      .filter((record) => !(cursor.processed && record.msgId === cursor.msgId));
    const txIds = records.filter((record) => record.type === "tx").map((record) => record.msgId);
    const statuses = new Map<number, Record<string, unknown>>();
    if (txIds.length > 0)
      for (const row of await client.query(
        `SELECT _id, committed, ${STAMP_OF("system_time")} AS stamp, user_metadata FROM xt.txs WHERE _id IN (${txIds.map(() => "?").join(", ")})`,
        txIds,
      ))
        statuses.set(integer(row["_id"], "tx id"), row);
    const resolutions: XtdbFeedResolution[] = [];
    const needRows: string[] = [];
    let watermark = cursor;
    let skipped = 0;
    let blocked = false;
    for (const record of records) {
      if (record.type === "tx") {
        const status = statuses.get(record.msgId);
        if (status === undefined) {
          blocked = true; // appended, not yet applied: the resolved prefix ends here
          break;
        }
        const meta = (status["user_metadata"] ?? {}) as Record<string, unknown>;
        if (meta["triplex"] === "p2x-1" && meta["scope"] === scopeKey) {
          const committed = status["committed"] === true;
          const stamp = integer(status["stamp"], "stamp");
          const n = integer(meta["n"] ?? 1, "ordinal count");
          const more = meta["more"] === true;
          const subjects = ((meta["subj"] as unknown[] | undefined) ?? []).map(String);
          const operationId = String(meta["op"]);
          if (committed && (more || options.exact === true))
            needRows.push(JSON.stringify([scopeKey, operationId]));
          resolutions.push({
            msgId: record.msgId,
            epoch: Math.floor(record.msgId / EPOCH_SPAN),
            offset: record.msgId % EPOCH_SPAN,
            status: committed ? "committed" : "aborted",
            stamp,
            operationId,
            transacts: committed
              ? Array.from({ length: n }, (_unused, ordinal) => ({
                  position: stampedPosition(stamp, ordinal),
                  ordinal,
                  subjects: more ? [] : subjects,
                }))
              : [],
            attributes: ((meta["attrs"] as unknown[] | undefined) ?? []).map(String),
            commandIds: ((meta["cmd"] as unknown[] | undefined) ?? []).map(String),
            ...(meta["vf"] === undefined
              ? {}
              : {
                  validFrom: integer(meta["vf"], "valid_from"),
                  validTo: meta["vt"] === undefined ? null : integer(meta["vt"], "valid_to"),
                }),
          });
        } else skipped++;
      } else skipped++;
      watermark = { msgId: record.msgId, processed: true };
      if (resolutions.length >= limit) break;
    }
    if (needRows.length > 0) {
      const rows = new Map<string, Record<string, unknown>>();
      for (const row of await client.query(
        `SELECT _id, changes, command_ids FROM tx_feed FOR ALL VALID_TIME WHERE _id IN (${needRows.map(() => "?").join(", ")})`,
        needRows,
      ))
        rows.set(String(row["_id"]), row);
      for (let i = 0; i < resolutions.length; i++) {
        const resolution = resolutions[i]!;
        const id = JSON.stringify([scopeKey, resolution.operationId]);
        if (resolution.status !== "committed" || !needRows.includes(id)) continue;
        const row = rows.get(id);
        // The feed row commits atomically with the transaction, so its absence is corruption.
        if (row === undefined)
          throw new Error(`Committed transaction ${resolution.msgId} has no feed row`);
        const changes = parseChanges(row["changes"]);
        resolutions[i] = {
          ...resolution,
          changes,
          commandIds: (JSON.parse(String(row["command_ids"])) as unknown[]).map(String),
          attributes: [...new Set(changes.map((change) => change.attribute))].sort(),
          transacts: resolution.transacts.map((transact) => ({
            ...transact,
            subjects: [
              ...new Set(
                changes
                  .filter((change) => change.ordinal === transact.ordinal)
                  .map((change) => change.entity),
              ),
            ].sort(),
          })),
        };
      }
    }
    return { resolutions, watermark, skipped, blocked };
  },
});

// ------------------------------------------------------------------ durable consumption

export interface XtdbFeedEffect {
  readonly position: number;
  readonly subject: string;
  readonly msgId: number;
}

/** Affected-subject effects of a page: one per (position, subject), the P3 "affected subjects". */
export const feedEffects = (page: XtdbFeedPage): XtdbFeedEffect[] =>
  page.resolutions.flatMap((resolution) =>
    resolution.transacts.flatMap((transact) =>
      transact.subjects.map((subject) => ({
        position: transact.position,
        subject,
        msgId: resolution.msgId,
      })),
    ),
  );

const checkpointId = (scopeKey: string, consumer: string) => JSON.stringify([scopeKey, consumer]);

/** Statements that record effects; `keyed` makes a replayed effect overwrite rather than duplicate. */
export const effectStatements = (
  scopeKey: string,
  consumer: string,
  effects: readonly XtdbFeedEffect[],
  options: { readonly keyed: boolean; readonly id?: () => string },
): XtdbStatement[] => {
  const out: XtdbStatement[] = [];
  for (let i = 0; i < effects.length; i += 200) {
    const group = effects.slice(i, i + 200);
    out.push({
      // _valid_from at the epoch: a replayed effect must replace its row's whole valid lifetime.
      // Without it XTDB opens a new valid-time slice at "now", and the crash runs (keyed-split)
      // saw each replayed key twice under FOR ALL VALID_TIME.
      sql: `INSERT INTO tx_feed_effects (_valid_from, _id, scope_key, consumer, position, subject, msg_id) VALUES ${group.map(() => "(TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ?, ?, ?, ?, ?, ?)").join(", ")}`,
      params: group.flatMap((effect) => [
        options.keyed
          ? JSON.stringify([scopeKey, consumer, effect.position, effect.subject])
          : options.id!(),
        scopeKey,
        consumer,
        effect.position,
        effect.subject,
        effect.msgId,
      ]),
    });
  }
  return out;
};

/** Fence on the expected checkpoint, then write the new one (a single consumer advances it). */
export const checkpointStatements = (
  scopeKey: string,
  consumer: string,
  expected: XtdbFeedCursor | null,
  next: XtdbFeedCursor,
): XtdbStatement[] => [
  expected === null
    ? {
        sql: "ASSERT NOT EXISTS (SELECT 1 FROM tx_feed_checkpoints FOR ALL VALID_TIME WHERE _id = ?), 'triplex-feed-checkpoint-conflict'",
        params: [checkpointId(scopeKey, consumer)],
      }
    : {
        sql: "ASSERT EXISTS (SELECT 1 FROM tx_feed_checkpoints FOR ALL VALID_TIME WHERE _id = ? AND msg_id = ? AND processed = ?), 'triplex-feed-checkpoint-conflict'",
        params: [checkpointId(scopeKey, consumer), expected.msgId, expected.processed],
      },
  {
    sql: "INSERT INTO tx_feed_checkpoints (_valid_from, _id, scope_key, consumer, msg_id, processed) VALUES (TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ?, ?, ?, ?, ?)",
    params: [checkpointId(scopeKey, consumer), scopeKey, consumer, next.msgId, next.processed],
  },
];

export const readFeedCheckpoint = async (
  client: XtdbClient,
  scopeKey: string,
  consumer: string,
): Promise<XtdbFeedCursor | null> => {
  const rows = await client.query(
    "SELECT msg_id, processed FROM tx_feed_checkpoints FOR ALL VALID_TIME WHERE _id = ?",
    [checkpointId(scopeKey, consumer)],
  );
  return rows[0] === undefined
    ? null
    : { msgId: integer(rows[0]["msg_id"], "checkpoint"), processed: rows[0]["processed"] === true };
};

/**
 * Record a page durably: keyed effects plus the checkpoint in one XTDB transaction (TARGETS 1.1 P3
 * items 4 and 5; R18 3.4 item 5, the Kafka rule: store the offset with the output). A crash before
 * the commit loses both, so the page replays; a crash after it leaves nothing to replay; a replayed
 * effect overwrites its own key, so a visible duplicate cannot arise.
 */
export const recordFeedProgress = (
  client: XtdbClient,
  scopeKey: string,
  consumer: string,
  page: XtdbFeedPage,
  expected: XtdbFeedCursor | null,
): Promise<unknown> =>
  client.submit(
    [
      ...checkpointStatements(scopeKey, consumer, expected, page.watermark).slice(0, 1),
      ...effectStatements(scopeKey, consumer, feedEffects(page), { keyed: true }),
      ...checkpointStatements(scopeKey, consumer, expected, page.watermark).slice(1),
    ],
    { metadata: { triplex: "p2x-consumer", scope: scopeKey, consumer } },
  );
