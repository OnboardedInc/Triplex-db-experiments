import { randomUUID } from "node:crypto";
import { Effect, Exit, Semaphore } from "effect";
import { isPatternVariable, type ResolvedTemporalBasis } from "@triplex-build/triplex";
import {
  type StorageAdapterService,
  type TripleRow,
  type TripleInput,
  type QueryPattern,
  WriteError,
  ReadError,
  MigrationError,
  TransactionOutcomeUnknown,
} from "@triplex-build/triplex/runtime";
import { TxAttributes } from "@triplex-build/triplex/internal";
import {
  type XtdbClient,
  type XtdbStatement,
  type XtdbSubmitOptions,
  XtdbTransactionRejected,
} from "./XtdbClient.js";
import {
  assertionColumns,
  assertionValue,
  canonicalJson,
  decodeAssertionRow,
  matchesPattern,
  packValue,
  visibleAt,
} from "./codecs.js";
import { validateXtdbConstraints } from "./ConstraintValidation.js";
import { CurrentTransactions, type TransactionState } from "./TransactionContext.js";

export class XtdbSerializationConflict extends WriteError {
  readonly reason = "serialization-conflict" as const;
}

const insertStatement = (
  table: string,
  columns: readonly string[],
  values: readonly (readonly unknown[])[],
): XtdbStatement => ({
  // The logical timeline lives in Triplex columns. Replacing a row must replace
  // its entire native valid lifetime rather than create another valid slice.
  sql: `INSERT INTO ${table} (_valid_from, ${columns.join(", ")}) VALUES ${values.map(() => `(TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ${columns.map(() => "?").join(", ")})`).join(", ")}`,
  params: values.flat(),
});

/**
 * How a commit gets its place in the scope's total order.
 * - `scope-counter` (default, the A0 control): every commit asserts `MAX(position) = K` for the
 *   scope and writes K+1. Positions are dense, and every commit in a scope contends on one counter
 *   (R18 0, cross-cutting finding 5).
 * - `subject-stamp` (EXP-P2X candidate): the engine stamps the position inside the transaction from
 *   its own system time, and the compare-and-set covers only the subjects the transaction read or
 *   wrote. See `lab/experiments/EXP-P2X-xtdb-commit-feed/DESIGN.md`.
 */
export type XtdbCommitPath = "scope-counter" | "subject-stamp";

/**
 * The transaction's own system time in epoch microseconds, evaluated by the indexer.
 * Why this is the offset coordinate (RULINGS Q31c): the XTDB tx id is not readable inside the
 * transaction, but XTDB 2.2.0 gives every transaction a system time strictly later than the latest
 * completed one, bumping by 1 us when the clock has not advanced, and rejects an explicit earlier or
 * equal one (`TxResolver.kt:204-246 @ c6c1962`); DML runs with `currentTime = systemTime`. So the
 * stamp is a strictly increasing function of log order. Probe p1-stamp-order (EXP-P2X): 320
 * concurrent commits, every stamp equal to `_system_from` and `xt.txs.system_time`, distinct,
 * strictly increasing in tx-id order. A CAST to BIGINT is unsupported in 2.2.0 and EXTRACT(EPOCH)
 * truncates to seconds (probe p0-primitives), hence the interval division.
 */
export const COMMIT_STAMP_SQL =
  "((CURRENT_TIMESTAMP - TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z') / INTERVAL 'PT0.000001S')";
/**
 * Triplex positions are one safe integer, so (offset, ordinal) is packed order-preservingly as
 * `(stamp - BASE) * ORDINALS + ordinal`. Stream and epoch are constant for a scope on one database
 * and are reported by the feed (`XtdbCommitFeed`), not packed. With 2^53 bits, 8 ordinals per engine
 * transaction leaves the offset exact until 2055-09; from 30 days before that every commit is
 * rejected (persistStamped) instead of overflowing.
 */
export const POSITION_BASE_US = 1_577_836_800_000_000; // 2020-01-01T00:00:00Z
export const POSITION_ORDINALS = 8;
const POSITION_OFFSET_LIMIT = Math.floor((Number.MAX_SAFE_INTEGER + 1) / POSITION_ORDINALS);
/** The packed Triplex position of one ordinal in a transaction stamped `stampUs`. */
export const stampedPosition = (stampUs: number, ordinal: number): number =>
  (stampUs - POSITION_BASE_US) * POSITION_ORDINALS + ordinal;
const positionSql = (ordinal: number) =>
  `((${COMMIT_STAMP_SQL} - ${POSITION_BASE_US}) * ${POSITION_ORDINALS} + ${ordinal})`;
/** A cell the engine fills with its position (or the raw stamp) inside the transaction. */
class Stamp {
  constructor(
    readonly ordinal: number,
    readonly form: "position" | "raw" | "number-identity",
  ) {}
}
const stampedInsert = (
  table: string,
  columns: readonly string[],
  values: readonly (readonly unknown[])[],
): XtdbStatement => {
  const params: unknown[] = [];
  const cell = (value: unknown) => {
    if (value instanceof Stamp) {
      if (value.form === "raw") return COMMIT_STAMP_SQL;
      // The journal's position fact also stores its value as canonical JSON (value_identity);
      // this spelling equals canonicalJson({type: "number", value}) (probe p2-sql-details).
      if (value.form === "number-identity")
        return `'{"type":"number","value":' || CAST(${positionSql(value.ordinal)} AS VARCHAR) || '}'`;
      return positionSql(value.ordinal);
    }
    params.push(value);
    return "?";
  };
  return {
    sql: `INSERT INTO ${table} (_valid_from, ${columns.join(", ")}) VALUES ${values.map((row) => `(TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', ${row.map(cell).join(", ")})`).join(", ")}`,
    params,
  };
};
const chunks = <A>(items: readonly A[], size: number): A[][] => {
  const out: A[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};
// METADATA rides in the BEGIN statement and in every `xt.txs` row, so it carries bounded lists; a
// larger commit sets `more` and the consumer reads the exact tuples from its feed row instead.
const METADATA_LIST_LIMIT = 256;
const isJournalRow = (row: TripleRow) =>
  row.entity_type === "_Transaction" && row.entity_id === row.tx_id;
/**
 * Replace placeholder positions in a callback's result with the engine-stamped ones. The core
 * contract hands out a position before commit (`nextCommitPosition`) and returns it in the
 * receipt, while subject-stamp only learns it from the engine at commit. This binds `position`
 * fields of plain records and arrays (the shape of `TransactionResult`, also when nested results are
 * returned together); anything else is left untouched. A core hook that binds positions after commit
 * would remove this (open question in DESIGN.md).
 */
const bindPositions = (
  value: unknown,
  positions: ReadonlyMap<number, number>,
  depth = 0,
): unknown => {
  if (positions.size === 0 || depth > 3 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const bound = value.map((item) => bindPositions(item, positions, depth + 1));
    return bound.some((item, i) => item !== value[i]) ? bound : value;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;
  let out: Record<string, unknown> | undefined;
  for (const [field, item] of Object.entries(value)) {
    const bound =
      field === "position" && typeof item === "number" && positions.has(item)
        ? positions.get(item)
        : bindPositions(item, positions, depth + 1);
    if (bound !== item) (out ??= { ...(value as Record<string, unknown>) })[field] = bound;
  }
  return out ?? value;
};
// A staged placeholder belongs to this uncommitted transaction, which sorts after every committed
// basis, exactly as A0's staged K+n does; this keeps in-transaction visibility identical.
const stagedView = (row: TripleRow): TripleRow => {
  const recorded = row.recorded_position < 0;
  const retracted = row.retracted_position !== null && row.retracted_position < 0;
  return recorded || retracted
    ? {
        ...row,
        recorded_position: recorded ? Number.MAX_SAFE_INTEGER : row.recorded_position,
        retracted_position: retracted ? Number.MAX_SAFE_INTEGER : row.retracted_position,
      }
    : row;
};

const cutConditions = (
  position: number | undefined,
  recordedAt: number | undefined,
  params: unknown[],
  history: boolean,
): string[] => {
  const conditions: string[] = [];
  if (position !== undefined) {
    conditions.push("recorded_position <= ?");
    params.push(position);
  }
  if (recordedAt !== undefined) {
    conditions.push("recorded_at <= ?");
    params.push(recordedAt);
  }
  if (!history) {
    const retraction = ["retracted_at IS NULL"];
    if (position !== undefined) {
      retraction.push("retracted_position > ?");
      params.push(position);
    }
    if (recordedAt !== undefined) {
      retraction.push("retracted_at > ?");
      params.push(recordedAt);
    }
    conditions.push(`(${retraction.join(" OR ")})`);
  }
  return conditions;
};

export const makeXtdbStorageAdapter = (
  client: XtdbClient,
  scopeKey: string,
  options: {
    readonly maxRetries?: number;
    readonly resolutionTimeoutMs?: number;
    readonly admissionQueue?: boolean;
    readonly constraintStrategy?: "portable" | "inline" | "projection";
    /** Default `scope-counter`. `subject-stamp` is the EXP-P2X candidate (experimental). */
    readonly commitPath?: XtdbCommitPath;
  } = {},
): StorageAdapterService => {
  const key = Symbol(scopeKey);
  const maxRetries = options.maxRetries ?? 12;
  const resolutionTimeoutMs = options.resolutionTimeoutMs ?? 30_000;
  const admission = Semaphore.makeUnsafe(1);
  const stamped = options.commitPath === "subject-stamp";
  // Placeholders are negative, so they can never equal a real position (always >= 0) and any that
  // escaped substitution is caught by the guard in persistStamped.
  let placeholderCounter = 0;
  const current = Effect.map(CurrentTransactions, (transactions) => transactions.get(key));
  const read = <A>(thunk: (signal: AbortSignal) => Promise<A>): Effect.Effect<A, ReadError> =>
    Effect.tryPromise({
      try: thunk,
      catch: (cause) => new ReadError({ message: "XTDB read failed", cause }),
    });
  const committedPosition = () =>
    read(async (signal) => {
      // subject-stamp: the scope head row is keyed by _id, so this is an IID point lookup rather
      // than a `scope_key` scan of every scope's rows (R18 3.4 item 7; R7: non-_id predicates scan).
      const rows = await client.query(
        stamped
          ? "SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE _id = ?"
          : "SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
        [scopeKey],
        undefined,
        { signal, timeoutMs: 30_000 },
      );
      const position = Number(rows[0]?.["position"] ?? 0);
      if (!Number.isSafeInteger(position) || position < 0)
        throw new TypeError("Unsafe commit position");
      return position;
    });
  const requireTransaction = Effect.flatMap(current, (state) =>
    state === undefined
      ? Effect.fail(new WriteError({ message: "XTDB mutation requires withTransaction" }))
      : Effect.succeed(state),
  );

  const queryRows = (
    pattern: QueryPattern,
    basis?: ResolvedTemporalBasis,
    history = false,
    id?: string,
    entityIds?: readonly string[],
  ): Effect.Effect<readonly TripleRow[], ReadError> =>
    Effect.gen(function* () {
      const state = yield* current;
      const position =
        state === undefined
          ? basis?.recordedPosition
          : Math.min(state.sourceK, basis?.recordedPosition ?? state.sourceK);
      const params: unknown[] = [scopeKey];
      const conditions = ["scope_key = ?"];
      if (id !== undefined) {
        conditions.push("id = ?");
        params.push(id);
      }
      if (entityIds !== undefined) {
        conditions.push(`entity_id IN (${entityIds.map(() => "?").join(", ")})`);
        params.push(...entityIds);
      }
      if (pattern.entityId !== undefined && !isPatternVariable(pattern.entityId)) {
        conditions.push("entity_id = ?");
        params.push(pattern.entityId);
      }
      if (pattern.attribute !== undefined && !isPatternVariable(pattern.attribute)) {
        conditions.push("attribute = ?");
        params.push(pattern.attribute);
      }
      if (pattern.entityType !== undefined) {
        conditions.push("entity_type = ?");
        params.push(pattern.entityType);
      }
      if (pattern.value !== undefined && !isPatternVariable(pattern.value)) {
        const value = packValue(pattern.value);
        for (const [column, data] of Object.entries(value)) {
          if (data !== null) {
            conditions.push(`${column} = ?`);
            params.push(data);
          }
        }
      }
      conditions.push(...cutConditions(position, basis?.recordedAt, params, history));
      if (!history && basis !== undefined) {
        conditions.push("valid_from <= ?", "(valid_to IS NULL OR valid_to > ?)");
        params.push(basis.validAt, basis.validAt);
      }
      const rows = yield* read(async (signal) =>
        (
          await client.query(
            `SELECT ${assertionColumns.join(", ")} FROM tx_assertions FOR ALL VALID_TIME WHERE ${conditions.join(" AND ")}`,
            params,
            undefined,
            { signal, timeoutMs: 30_000 },
          )
        ).map(decodeAssertionRow),
      );
      if (state?.reads !== undefined) {
        // subject-stamp read set: a read confined to known entities is guarded by those entities'
        // heads; anything else (pattern or entity-type scans, a by-id miss whose entity is unknown)
        // escalates the commit to the scope-wide guard, so serializability never depends on which
        // shape a caller used (R18 3.1 item 1: record what the computation read).
        const reads = state.reads;
        if (pattern.entityId !== undefined && !isPatternVariable(pattern.entityId))
          reads.entities.add(pattern.entityId);
        else if (entityIds !== undefined) for (const entity of entityIds) reads.entities.add(entity);
        else if (id !== undefined) {
          if (rows[0] !== undefined) reads.entities.add(rows[0].entity_id);
          else if (!state.rows.has(id)) reads.scopeWide = true;
        } else reads.scopeWide = true;
      }
      const byId = new Map(rows.map((row) => [row.id, row]));
      if (state !== undefined) {
        for (const [rowId, row] of state.rows) {
          byId.delete(rowId);
          if (
            (id === undefined || rowId === id) &&
            (entityIds === undefined || entityIds.includes(row.entity_id)) &&
            matchesPattern(row, pattern) &&
            (history || visibleAt(stamped ? stagedView(row) : row, basis))
          )
            byId.set(rowId, row);
        }
      }
      return [...byId.values()].sort(
        (left, right) => left.recorded_at - right.recorded_at || left.id.localeCompare(right.id),
      );
    });

  const persist = (
    state: TransactionState,
    operationId: string,
    attemptId: string,
  ): Effect.Effect<void, WriteError> => {
    const statements: XtdbStatement[] = [
      {
        sql: "ASSERT (SELECT COALESCE(MAX(position), 0) FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?) = ?, 'triplex-cas-conflict'",
        params: [scopeKey, state.sourceK],
      },
      {
        sql: "ASSERT NOT EXISTS (SELECT 1 FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = ? AND operation_id = ?), 'triplex-operation-duplicate'",
        params: [scopeKey, operationId],
      },
    ];
    for (const claim of state.claims.values()) {
      statements.push({
        sql: "ASSERT NOT EXISTS (SELECT 1 FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = ? AND command_id = ?), 'triplex-command-conflict'",
        params: [scopeKey, claim.commandId],
      });
    }
    if (state.newIds.size > 0)
      statements.push({
        sql: `ASSERT NOT EXISTS (SELECT 1 FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND id IN (${[...state.newIds].map(() => "?").join(", ")})), 'triplex-assertion-identity-conflict'`,
        params: [scopeKey, ...state.newIds],
      });
    const rows = [...state.rows.values()];
    for (let i = 0; i < rows.length; i += 200) {
      statements.push(
        insertStatement(
          "tx_assertions",
          ["_id", "scope_key", ...assertionColumns, "value_identity"],
          rows
            .slice(i, i + 200)
            .map((row) => [
              JSON.stringify([scopeKey, row.id]),
              scopeKey,
              ...assertionColumns.map((column) => row[column]),
              canonicalJson(assertionValue(row)),
            ]),
        ),
      );
    }
    if (state.claims.size > 0)
      statements.push(
        insertStatement(
          "tx_claims",
          ["_id", "scope_key", "command_id", "tx_id", "recorded_at", "position"],
          [...state.claims.values()].map((claim) => [
            JSON.stringify([scopeKey, claim.commandId]),
            scopeKey,
            claim.commandId,
            claim.txId,
            claim.timestamp,
            state.position,
          ]),
        ),
      );
    statements.push(
      insertStatement(
        "tx_meta",
        ["_id", "scope_key", "position"],
        [[scopeKey, scopeKey, state.position]],
      ),
    );
    statements.push(
      insertStatement(
        "tx_attempts",
        ["_id", "scope_key", "operation_id", "attempt_id", "position"],
        [
          [
            JSON.stringify([scopeKey, operationId]),
            scopeKey,
            operationId,
            attemptId,
            state.position,
          ],
        ],
      ),
    );

    return Effect.asVoid(
      submitAndResolve(
        statements,
        undefined,
        "SELECT operation_id FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = ? AND operation_id = ?",
        [scopeKey, operationId],
        state,
        operationId,
        attemptId,
      ),
    );
  };

  /**
   * subject-stamp commit (EXP-P2X). Differences from `persist`, each for a reason:
   * 1. CAS per subject: assert that no commit after the source cut touched any entity this
   *    transaction read or wrote (`tx_heads`, one row per entity keyed by _id). Commits on disjoint
   *    subjects therefore never conflict. A read that was not confined to known entities escalates
   *    to the scope head (`tx_meta`), which every commit in the scope rewrites (R18 3.4 item 4).
   *    Asserting `position > K` instead of reading each head first saves a round trip per subject:
   *    every in-transaction read is filtered to `recorded_position <= sourceK`, so "no head newer than
   *    K" is exactly "everything I read is unchanged".
   * 2. Positions are stamped by the engine inside the transaction (COMMIT_STAMP_SQL), so order and
   *    gap-freedom come from XTDB's log rather than a counter (R16 3.4; R18 3.4 item 4).
   * 3. Every guard and lookup is an _id point lookup (claims, identity, attempts, receipt), never a
   *    `scope_key` scan; R16 2.4 measured an _id claim lookup at about 11 ms, and R7 found non-_id
   *    predicates scan the whole table.
   * 4. A feed carrier commits atomically with the facts: METADATA (scope, operation, subjects,
   *    attributes, valid-time hull) in `xt.txs`, and a `tx_feed` row with the exact
   *    (op, entity, attribute, valid_from, valid_to, ordinal) tuples (R16 3.4).
   * Resolves to the transaction's stamp (epoch microseconds).
   */
  const persistStamped = (
    state: TransactionState,
    operationId: string,
    attemptId: string,
  ): Effect.Effect<number, WriteError> =>
    Effect.suspend(() => {
      const stamps = state.stamps ?? new Map<number, number>();
      const reads = state.reads ?? { entities: new Set<string>(), scopeWide: false };
      const ordinalOf = (value: number | null) => (value === null ? undefined : stamps.get(value));
      const lastOrdinal = Math.max(0, stamps.size - 1);
      const assertionCells: unknown[][] = [];
      const heads = new Map<string, number>();
      const changes: (string | number | null)[][] = [];
      const txIds = new Set<string>([...state.claims.values()].map((claim) => claim.txId));
      for (const row of state.rows.values()) {
        const fresh = state.newIds.has(row.id);
        const recorded = ordinalOf(row.recorded_position);
        const retracted = ordinalOf(row.retracted_position);
        // Every staged position must be one this transaction allocated, or order would be a
        // caller's guess rather than the log's.
        if ((fresh && recorded === undefined) || (!fresh && retracted === undefined))
          return Effect.fail(
            new WriteError({
              message: "subject-stamp rows must carry a position from nextCommitPosition",
            }),
          );
        const positionFact =
          isJournalRow(row) &&
          row.attribute === TxAttributes.POSITION &&
          row.value_type === "number" &&
          row.value_number !== null &&
          stamps.has(row.value_number);
        if (!positionFact && row.value_number !== null && stamps.has(row.value_number))
          return Effect.fail(
            new WriteError({ message: "A placeholder commit position escaped into a fact value" }),
          );
        const factOrdinal = positionFact ? stamps.get(row.value_number!)! : 0;
        assertionCells.push([
          JSON.stringify([scopeKey, row.id]),
          scopeKey,
          ...assertionColumns.map((column) =>
            column === "recorded_position" && recorded !== undefined
              ? new Stamp(recorded, "position")
              : column === "retracted_position" && retracted !== undefined
                ? new Stamp(retracted, "position")
                : column === "value_number" && positionFact
                  ? new Stamp(factOrdinal, "position")
                  : row[column],
          ),
          positionFact
            ? new Stamp(factOrdinal, "number-identity")
            : canonicalJson(assertionValue(row)),
        ]);
        if (fresh && row.tx_id !== null) txIds.add(row.tx_id);
        if (retracted !== undefined && row.retract_tx_id !== null) txIds.add(row.retract_tx_id);
        if (isJournalRow(row)) continue;
        for (const [op, ordinal] of [
          ["assert", fresh ? recorded : undefined],
          ["retract", retracted],
        ] as const) {
          if (ordinal === undefined) continue;
          changes.push([op, row.entity_id, row.attribute, row.valid_from, row.valid_to, ordinal]);
          heads.set(row.entity_id, Math.max(heads.get(row.entity_id) ?? 0, ordinal));
        }
      }
      // The packed offset is exact until 2055-09. The engine clock is checked against that limit on
      // the host clock with a 30-day margin rather than by an in-transaction ASSERT: clocks disagree
      // by seconds, not a month, and it saves a round trip on every commit.
      if ((Date.now() + 30 * 86_400_000) * 1_000 - POSITION_BASE_US >= POSITION_OFFSET_LIMIT)
        return Effect.fail(
          new WriteError({ message: "subject-stamp positions are exhausted (packed offset limit)" }),
        );
      const guarded = [...new Set([...reads.entities, ...heads.keys()])];
      // Guards that share a handling share one ASSERT, so the candidate sends as many statements as
      // A0 (8 for a one-subject command) and the comparison measures engine work, not round trips:
      // claim and subject CAS both mean "retry, then the claim read decides" (serialization
      // conflict); assertion identity and operation replay both mean a definite rejection.
      const serialization: string[] = [];
      const serializationParams: unknown[] = [];
      if (state.claims.size > 0) {
        serialization.push(
          `NOT EXISTS (SELECT 1 FROM tx_claims FOR ALL VALID_TIME WHERE _id IN (${[...state.claims.keys()].map(() => "?").join(", ")}))`,
        );
        serializationParams.push(
          ...[...state.claims.keys()].map((commandId) => JSON.stringify([scopeKey, commandId])),
        );
      }
      if (reads.scopeWide) {
        serialization.push(
          "NOT EXISTS (SELECT 1 FROM tx_meta FOR ALL VALID_TIME WHERE _id = ? AND position > ?)",
        );
        serializationParams.push(scopeKey, state.sourceK);
      } else
        for (const group of chunks(guarded, 200)) {
          serialization.push(
            `NOT EXISTS (SELECT 1 FROM tx_heads FOR ALL VALID_TIME WHERE _id IN (${group.map(() => "?").join(", ")}) AND position > ?)`,
          );
          serializationParams.push(
            ...group.map((entity) => JSON.stringify([scopeKey, entity])),
            state.sourceK,
          );
        }
      const statements: XtdbStatement[] = [];
      if (serialization.length > 0)
        statements.push({
          sql: `ASSERT ${serialization.join(" AND ")}, 'triplex-cas-conflict'`,
          params: serializationParams,
        });
      const identities = chunks([...state.newIds], 200).map(
        (group) =>
          `NOT EXISTS (SELECT 1 FROM tx_assertions FOR ALL VALID_TIME WHERE _id IN (${group.map(() => "?").join(", ")}))`,
      );
      statements.push({
        sql: `ASSERT ${[...identities, "NOT EXISTS (SELECT 1 FROM tx_attempts FOR ALL VALID_TIME WHERE _id = ?)"].join(" AND ")}, 'triplex-identity-conflict'`,
        params: [
          ...[...state.newIds].map((id) => JSON.stringify([scopeKey, id])),
          JSON.stringify([scopeKey, operationId]),
        ],
      });
      for (const group of chunks(assertionCells, 200))
        statements.push(
          stampedInsert(
            "tx_assertions",
            ["_id", "scope_key", ...assertionColumns, "value_identity"],
            group,
          ),
        );
      if (state.claims.size > 0)
        statements.push(
          stampedInsert(
            "tx_claims",
            ["_id", "scope_key", "command_id", "tx_id", "recorded_at", "position"],
            [...state.claims.values()].map((claim) => [
              JSON.stringify([scopeKey, claim.commandId]),
              scopeKey,
              claim.commandId,
              claim.txId,
              claim.timestamp,
              new Stamp(Math.min(claim.ordinal ?? 0, lastOrdinal), "position"),
            ]),
          ),
        );
      for (const group of chunks([...heads], 200))
        statements.push(
          stampedInsert(
            "tx_heads",
            ["_id", "scope_key", "entity_id", "position"],
            group.map(([entity, ordinal]) => [
              JSON.stringify([scopeKey, entity]),
              scopeKey,
              entity,
              new Stamp(ordinal, "position"),
            ]),
          ),
        );
      const commandIds = [...state.claims.keys()];
      statements.push(
        stampedInsert(
          "tx_feed",
          [
            "_id",
            "scope_key",
            "operation_id",
            "position",
            "stamp",
            "ordinals",
            "tx_ids",
            "command_ids",
            "changes",
          ],
          [
            [
              JSON.stringify([scopeKey, operationId]),
              scopeKey,
              operationId,
              new Stamp(lastOrdinal, "position"),
              new Stamp(lastOrdinal, "raw"),
              Math.max(1, stamps.size),
              JSON.stringify([...txIds]),
              JSON.stringify(commandIds),
              JSON.stringify(changes),
            ],
          ],
        ),
      );
      // The scope head is a blind write: XTDB applies transactions serially in log order, so the
      // surviving version always carries the greatest stamp, and no commit asserts against it
      // unless it made a scope-wide read.
      statements.push(
        stampedInsert(
          "tx_meta",
          ["_id", "scope_key", "position"],
          [[scopeKey, scopeKey, new Stamp(lastOrdinal, "position")]],
        ),
      );
      statements.push(
        stampedInsert(
          "tx_attempts",
          ["_id", "scope_key", "operation_id", "attempt_id", "position", "stamp"],
          [
            [
              JSON.stringify([scopeKey, operationId]),
              scopeKey,
              operationId,
              attemptId,
              new Stamp(lastOrdinal, "position"),
              new Stamp(lastOrdinal, "raw"),
            ],
          ],
        ),
      );
      const subjects = [...heads.keys()].sort();
      const attributes = [...new Set(changes.map((change) => String(change[2])))].sort();
      const froms = changes.map((change) => change[3]);
      const tos = changes.map((change) => change[4]);
      const exactRange =
        froms.every((value) => Number.isSafeInteger(value)) &&
        tos.every((value) => value === null || Number.isSafeInteger(value));
      const open = tos.some((value) => value === null);
      const more =
        stamps.size > 1 ||
        !exactRange ||
        subjects.length > METADATA_LIST_LIMIT ||
        attributes.length > METADATA_LIST_LIMIT ||
        commandIds.length > METADATA_LIST_LIMIT;
      const metadata = {
        triplex: "p2x-1",
        scope: scopeKey,
        op: operationId,
        n: Math.max(1, stamps.size),
        ...(more ? { more: true } : { subj: subjects, attrs: attributes, cmd: commandIds }),
        ...(exactRange && changes.length > 0
          ? {
              vf: Math.min(...(froms as number[])),
              ...(open ? {} : { vt: Math.max(...(tos as number[])) }),
            }
          : {}),
      };
      return Effect.flatMap(
        submitAndResolve(
          statements,
          { metadata },
          "SELECT stamp FROM tx_attempts FOR ALL VALID_TIME WHERE _id = ?",
          [JSON.stringify([scopeKey, operationId])],
          state,
          operationId,
          attemptId,
        ),
        (receipt) => {
          const stamp = Number(receipt["stamp"]);
          return Number.isSafeInteger(stamp) && stamp > POSITION_BASE_US
            ? Effect.succeed(stamp)
            : Effect.fail(new WriteError({ message: "XTDB returned an invalid commit stamp" }));
        },
      );
    });

  /**
   * Submit and resolve the outcome; shared by both commit paths, which differ only in the receipt
   * query. A rejection is definite; any other failure after submission is resolved by the receipt.
   */
  const submitAndResolve = (
    statements: readonly XtdbStatement[],
    submitOptions: XtdbSubmitOptions | undefined,
    receiptSql: string,
    receiptParams: readonly unknown[],
    state: TransactionState,
    operationId: string,
    attemptId: string,
  ): Effect.Effect<Record<string, unknown>, WriteError> =>
    Effect.tryPromise({
      try: async () => {
        const until = Date.now() + resolutionTimeoutMs;
        const bounded = async <A>(promise: Promise<A>): Promise<A> => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            return await Promise.race([
              promise,
              new Promise<never>((_resolve, reject) => {
                timer = setTimeout(
                  () => reject(new Error("XTDB outcome resolution deadline exceeded")),
                  Math.max(0, until - Date.now()),
                );
              }),
            ]);
          } finally {
            if (timer !== undefined) clearTimeout(timer);
          }
        };
        let submitError: unknown;
        try {
          await bounded(
            submitOptions === undefined
              ? client.submit(statements)
              : client.submit(statements, submitOptions),
          );
        } catch (error) {
          if (error instanceof XtdbTransactionRejected) {
            if (/triplex-(cas|command)-conflict/.test(error.message))
              throw new XtdbSerializationConflict({
                message: "XTDB source changed while staging the transaction",
                cause: error,
              });
            throw new WriteError({ message: "XTDB transaction was rejected", cause: error });
          }
          submitError = error;
        }
        do {
          try {
            const receipt = await bounded(
              client.query(receiptSql, receiptParams, undefined, {
                timeoutMs: Math.max(1, until - Date.now()),
              }),
            );
            if (receipt.length > 0) return receipt[0]!;
          } catch (error) {
            submitError = error;
          }
          if (Date.now() >= until) break;
          await new Promise((resolve) => setTimeout(resolve, 25));
        } while (true);
        throw new TransactionOutcomeUnknown({
          operationId,
          attemptId,
          ...(state.claims.size === 1 ? { commandId: [...state.claims.keys()][0]! } : {}),
          ...(submitError === undefined ? {} : { cause: submitError }),
        });
      },
      catch: (cause) =>
        cause instanceof WriteError
          ? cause
          : new WriteError({ message: "XTDB transaction failed", cause }),
    });

  const withTransaction = <A, E>(
    effect: Effect.Effect<A, E>,
    transactionOptions?: { readonly replaySafe?: boolean },
  ): Effect.Effect<A, E | WriteError> =>
    Effect.suspend(() => {
      const operationId = randomUUID();
      const attempt = (retry: number): Effect.Effect<A, E | WriteError> =>
        Effect.gen(function* () {
          const transactions = yield* CurrentTransactions;
          const parent = transactions.get(key);
          if (parent !== undefined) {
            const baseline = {
              position: parent.position,
              rows: new Map(parent.rows),
              claims: new Map(parent.claims),
              newIds: new Set(parent.newIds),
              stampCount: parent.stamps?.size ?? 0,
            };
            const child: TransactionState = {
              client,
              scopeKey,
              sourceK: parent.sourceK,
              position: baseline.position,
              rows: new Map(baseline.rows),
              claims: new Map(baseline.claims),
              newIds: new Set(baseline.newIds),
              // subject-stamp: reads are shared by reference (a rolled-back child's reads still
              // guard the commit); ordinals are copied so a rolled-back child frees its ordinal.
              ...(parent.reads === undefined ? {} : { reads: parent.reads }),
              ...(parent.stamps === undefined ? {} : { stamps: new Map(parent.stamps) }),
            };
            const context = new Map(transactions);
            context.set(key, child);
            const result = yield* Effect.provideService(effect, CurrentTransactions, context);
            // A failed child never mutates the parent. A successful child cannot
            // overwrite a sibling's intervening writes or allocated positions.
            const unchanged = <K, V>(left: ReadonlyMap<K, V>, right: ReadonlyMap<K, V>) =>
              left.size === right.size && [...left].every(([id, value]) => right.get(id) === value);
            if (
              parent.position !== baseline.position ||
              !unchanged(parent.rows, baseline.rows) ||
              !unchanged(parent.claims, baseline.claims) ||
              parent.newIds.size !== baseline.newIds.size ||
              [...parent.newIds].some((id) => !baseline.newIds.has(id)) ||
              (parent.stamps?.size ?? 0) !== baseline.stampCount
            ) {
              return yield* Effect.fail(
                new XtdbSerializationConflict({
                  message:
                    "Concurrent nested XTDB callbacks changed the savepoint; callback was not replayed",
                }),
              );
            }
            parent.position = child.position;
            parent.rows = child.rows;
            parent.claims = child.claims;
            parent.newIds = child.newIds;
            if (child.stamps !== undefined) parent.stamps = child.stamps;
            return result;
          }
          const sourceK = yield* committedPosition().pipe(
            Effect.mapError(
              (cause) => new WriteError({ message: "Cannot acquire XTDB source cut", cause }),
            ),
          );
          const state: TransactionState = {
            client,
            scopeKey,
            sourceK,
            position: sourceK,
            rows: new Map(),
            claims: new Map(),
            newIds: new Set(),
            ...(stamped
              ? { reads: { entities: new Set<string>(), scopeWide: false }, stamps: new Map() }
              : {}),
          };
          const context = new Map(transactions);
          context.set(key, state);
          const result = yield* Effect.provideService(effect, CurrentTransactions, context);
          if (stamped) {
            if (state.rows.size === 0 && state.claims.size === 0 && state.stamps!.size === 0)
              return result;
            const exit = yield* Effect.exit(
              Effect.uninterruptible(persistStamped(state, operationId, randomUUID())),
            );
            if (Exit.isSuccess(exit)) {
              const positions = new Map(
                [...state.stamps!].map(([placeholder, ordinal]) => [
                  placeholder,
                  stampedPosition(exit.value, ordinal),
                ]),
              );
              return bindPositions(result, positions) as A;
            }
            return yield* Effect.failCause(exit.cause).pipe(
              Effect.catch((error) =>
                error instanceof XtdbSerializationConflict &&
                transactionOptions?.replaySafe === true &&
                retry < maxRetries
                  ? Effect.andThen(
                      Effect.sleep(`${Math.min(50, retry * 2)} millis`),
                      attempt(retry + 1),
                    )
                  : Effect.fail(error),
              ),
            );
          }
          if (state.rows.size === 0 && state.claims.size === 0 && state.position === state.sourceK)
            return result;
          const exit = yield* Effect.exit(
            Effect.uninterruptible(persist(state, operationId, randomUUID())),
          );
          if (Exit.isSuccess(exit)) return result;
          return yield* Effect.failCause(exit.cause).pipe(
            Effect.catch((error) =>
              error instanceof XtdbSerializationConflict &&
              transactionOptions?.replaySafe === true &&
              retry < maxRetries
                ? Effect.andThen(
                    Effect.sleep(`${Math.min(50, retry * 2)} millis`),
                    attempt(retry + 1),
                  )
                : Effect.fail(error),
            ),
          );
        });
      return Effect.flatMap(current, (parent) =>
        parent !== undefined || options.admissionQueue !== true
          ? attempt(0)
          : Semaphore.withPermits(admission, 1)(attempt(0)),
      );
    });

  const insert: StorageAdapterService["insert"] = (input, txId, timestamp, id, position) =>
    Effect.gen(function* () {
      const state = yield* requireTransaction;
      return yield* Effect.try({
        try: () => {
          const row: TripleRow = {
            id,
            entity_id: input.entityId,
            attribute: input.attribute,
            ...packValue(input.value),
            recorded_at: timestamp,
            recorded_position: position,
            valid_from: input.validFrom ?? timestamp,
            valid_to: input.validTo ?? null,
            created_by: input.createdBy ?? null,
            retracted_at: null,
            retracted_position: null,
            retract_tx_id: null,
            entity_type: input.entityType ?? null,
            schema_version: 1,
            tx_id: txId,
          };
          if (state.rows.has(id)) throw new Error(`Duplicate assertion identity ${id}`);
          state.rows.set(id, row);
          state.newIds.add(id);
          return row;
        },
        catch: (cause) => new WriteError({ message: "Invalid XTDB assertion", cause }),
      });
    });

  const adapter: StorageAdapterService = {
    supportedValueTypes: [
      "string",
      "number",
      "integer",
      "boolean",
      "datetime",
      "ref",
      "json",
      "blob",
    ],
    validateConstraints: (input) =>
      options.constraintStrategy === undefined || options.constraintStrategy === "portable"
        ? Effect.succeed(undefined)
        : Effect.flatMap(requireTransaction, (state) => {
            // Server-side constraint checks scan the scope, so they need the scope-wide guard.
            if (state.reads !== undefined) state.reads.scopeWide = true;
            return Effect.tryPromise({
              try: (signal) =>
                validateXtdbConstraints(client, scopeKey, state, input, {
                  strategy: options.constraintStrategy as "inline" | "projection",
                  signal,
                }),
              catch: (cause) =>
                new WriteError({ message: "XTDB constraint validation failed", cause }),
            });
          }),
    withTransaction,
    nextCommitPosition: () =>
      Effect.flatMap(requireTransaction, (state) =>
        Effect.try({
          try: () => {
            if (state.stamps !== undefined) {
              // RULINGS Q31c: several Triplex transacts in one engine transaction get consecutive
              // ordinals at one offset; the engine fills in the offset at commit.
              if (state.stamps.size >= POSITION_ORDINALS)
                throw new RangeError(
                  `At most ${POSITION_ORDINALS} Triplex transacts fit one XTDB transaction`,
                );
              const placeholder = -++placeholderCounter;
              state.stamps.set(placeholder, state.stamps.size);
              return placeholder;
            }
            if (!Number.isSafeInteger(state.position + 1))
              throw new RangeError("Commit position exhausted");
            return ++state.position;
          },
          catch: (cause) => new WriteError({ message: "Cannot allocate commit position", cause }),
        }),
      ),
    currentCommitPosition: () =>
      Effect.flatMap(current, (state) =>
        state === undefined
          ? committedPosition()
          : // subject-stamp has no position before commit; inside a transaction the readable cut
            // is the source cut.
            Effect.succeed(state.stamps !== undefined ? state.sourceK : state.position),
      ),
    claimCommand: (commandId, txId, timestamp) =>
      Effect.gen(function* () {
        const state = yield* requireTransaction;
        const pending = state.claims.get(commandId);
        if (pending !== undefined) return pending.txId;
        // subject-stamp reads the claim by _id and without the source-cut filter: any committed
        // claim is final, so a duplicate or lost-ACK retry costs one point read instead of a rejected
        // transaction and a retry (R16 2.4). The in-transaction ASSERT still settles a race.
        const existing = yield* read((signal) =>
          stamped
            ? client.query(
                "SELECT tx_id FROM tx_claims FOR ALL VALID_TIME WHERE _id = ?",
                [JSON.stringify([scopeKey, commandId])],
                undefined,
                { signal, timeoutMs: 30_000 },
              )
            : client.query(
                "SELECT tx_id FROM tx_claims FOR ALL VALID_TIME WHERE scope_key = ? AND command_id = ? AND position <= ?",
                [scopeKey, commandId, state.sourceK],
                undefined,
                { signal, timeoutMs: 30_000 },
              ),
        ).pipe(
          Effect.mapError(
            (cause) => new WriteError({ message: "Cannot read command claim", cause }),
          ),
        );
        if (existing[0]?.["tx_id"] !== undefined) return String(existing[0]["tx_id"]);
        state.claims.set(commandId, {
          commandId,
          txId,
          timestamp,
          ...(state.stamps === undefined ? {} : { ordinal: state.stamps.size }),
        });
        return null;
      }),
    insert,
    batchInsert: (inputs, txId, timestamp, ids, position) =>
      inputs.length !== ids.length
        ? Effect.fail(new WriteError({ message: "Batch assertion identity count mismatch" }))
        : Effect.forEach(inputs, (input: TripleInput, i) =>
            insert(input, txId, timestamp, ids[i]!, position),
          ),
    retract: (id, timestamp, txId, position) =>
      Effect.gen(function* () {
        const state = yield* requireTransaction;
        const row = (yield* queryRows({}, undefined, false, id).pipe(
          Effect.mapError(
            (cause) => new WriteError({ message: "Cannot read retraction target", cause }),
          ),
        ))[0];
        if (row === undefined) return false;
        state.rows.set(id, {
          ...row,
          retracted_at: timestamp,
          retracted_position: position,
          retract_tx_id: txId,
        });
        return true;
      }),
    getById: (id) => Effect.map(queryRows({}, undefined, false, id), (rows) => rows[0] ?? null),
    getByEntity: (entityId, basis) => queryRows({ entityId }, basis),
    getByEntities: (entityIds, basis) =>
      entityIds.length === 0
        ? Effect.succeed(new Map())
        : Effect.map(
            queryRows({}, basis, false, undefined, [...new Set(entityIds)]),
            (rows) =>
              new Map(
                [...new Set(entityIds)].map(
                  (entityId) =>
                    [entityId, rows.filter((row) => row.entity_id === entityId)] as const,
                ),
              ),
          ),
    query: (pattern, basis) => queryRows(pattern, basis),
    history: (entityId) => queryRows({ entityId }, undefined, true),
    dependencyState: (attributes, basis) => {
      if (attributes.length === 0) return Effect.succeed({ sourcePosition: 0 });
      const unique = [...new Set(attributes)];
      const sourceParams: unknown[] = [];
      const notAsserted: string[] = [];
      const retracted: string[] = ["retracted_position IS NOT NULL"];
      if (basis.recordedPosition !== undefined) {
        notAsserted.push("recorded_position > ?");
        sourceParams.push(basis.recordedPosition);
      }
      if (basis.recordedAt !== undefined) {
        notAsserted.push("recorded_at > ?");
        sourceParams.push(basis.recordedAt);
      }
      if (basis.recordedPosition !== undefined) {
        retracted.push("retracted_position <= ?");
        sourceParams.push(basis.recordedPosition);
      }
      if (basis.recordedAt !== undefined) {
        retracted.push("retracted_at <= ?");
        sourceParams.push(basis.recordedAt);
      }
      const expression = `CASE ${notAsserted.length ? `WHEN ${notAsserted.join(" OR ")} THEN 0 ` : ""}WHEN ${retracted.join(" AND ")} THEN retracted_position ELSE recorded_position END`;
      sourceParams.push(scopeKey, ...unique);
      const boundaryParams: unknown[] = [basis.validAt, basis.validAt, scopeKey, ...unique];
      const visibility = cutConditions(
        basis.recordedPosition,
        basis.recordedAt,
        boundaryParams,
        false,
      );
      return Effect.map(
        Effect.all([
          read((signal) =>
            client.query(
              `SELECT MAX(${expression}) AS source_position FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND attribute IN (${unique.map(() => "?").join(",")})`,
              sourceParams,
              undefined,
              { signal, timeoutMs: 30_000 },
            ),
          ),
          read((signal) =>
            client.query(
              `SELECT MIN(CASE WHEN valid_from > ? THEN valid_from WHEN valid_to > ? THEN valid_to END) AS next_temporal_boundary FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND attribute IN (${unique.map(() => "?").join(",")}) AND ${visibility.join(" AND ")}`,
              boundaryParams,
              undefined,
              { signal, timeoutMs: 30_000 },
            ),
          ),
        ]),
        ([source, boundary]) => {
          const edge = boundary[0]?.["next_temporal_boundary"];
          return {
            sourcePosition: Number(source[0]?.["source_position"] ?? 0),
            ...(edge === null || edge === undefined ? {} : { nextTemporalBoundary: Number(edge) }),
          };
        },
      );
    },
    initialize: () =>
      Effect.tryPromise({
        try: async () => {
          await client.submit([
            {
              sql: `CREATE TABLE tx_assertions (_id, scope_key, ${assertionColumns.join(", ")}, value_identity)`,
            },
            { sql: "CREATE TABLE tx_meta (_id, scope_key, position)" },
            {
              sql: "CREATE TABLE tx_claims (_id, scope_key, command_id, tx_id, recorded_at, position)",
            },
            {
              sql: "CREATE TABLE tx_attempts (_id, scope_key, operation_id, attempt_id, position)",
            },
            {
              sql: "CREATE TABLE tx_query_relations (_id, scope_key, run_id, rule_name, arg1, arg2, depth)",
            },
            {
              sql: "CREATE TABLE tx_constraint_graphs (_id, scope_key, run_id, phase, id, entity_id, attribute, entity_type, valid_from, valid_to, value_type, value_string, value_number, value_boolean, value_datetime, value_json, value_identity)",
            },
            { sql: "CREATE TABLE tx_constraint_generations (_id, scope_key, run_id, source_k)" },
            ...(stamped
              ? [
                  { sql: "CREATE TABLE tx_heads (_id, scope_key, entity_id, position)" },
                  {
                    sql: "CREATE TABLE tx_feed (_id, scope_key, operation_id, position, stamp, ordinals, tx_ids, command_ids, changes)",
                  },
                  // Consumer tables (CommitFeed.ts): XTDB fails to plan an ASSERT over a table that
                  // has never existed, so a first checkpoint needs them declared up front.
                  {
                    sql: "CREATE TABLE tx_feed_effects (_id, scope_key, consumer, position, subject, msg_id)",
                  },
                  {
                    sql: "CREATE TABLE tx_feed_checkpoints (_id, scope_key, consumer, msg_id, processed)",
                  },
                ]
              : []),
          ]);
        },
        catch: (cause) =>
          new MigrationError({
            version: 1,
            name: "xtdb-baseline",
            message: "Cannot initialize XTDB tables",
            cause,
          }),
      }),
    // The runtime's scoped layer owns the shared client.
    close: () => Effect.void,
  };
  return adapter;
};
