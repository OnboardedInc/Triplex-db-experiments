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
import { type XtdbClient, type XtdbStatement, XtdbTransactionRejected } from "./XtdbClient.js";
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
    /**
     * [EXP-P4 arm X1] Temporal bounds of current (non-history) reads of `tx_assertions`.
     * "all-valid-time" (default, unchanged) says `FOR ALL VALID_TIME`; "default" omits the clause, so the scan
     * gets XTDB's default point bounds (valid time AS OF now, system time AS OF the snapshot).
     * Why: R24 sections 1.3 to 1.6. XTDB 2.2.0 files rows whose versions were superseded into weekly
     * historical files and drops those files and pages for a scan whose lower temporal bound is after their
     * recency (`trie.clj:113-118`). `FOR ALL VALID_TIME` makes the valid-time lower bound the minimum long,
     * so nothing is ever dropped and the polygon resolver runs for every event.
     * Exactness: every `tx_assertions` version is written by `insertStatement` below with `_valid_from` 1970
     * and no `_valid_to`, and nothing in this package deletes, erases or patches it, so the one version
     * visible at the snapshot's system time is valid at every valid time and both bounds return the same
     * rows. Triplex's own valid time stays in the `valid_from` and `valid_to` columns, filtered in SQL.
     * Rejected: also changing `tx_meta`, claims and receipts reads (R24 lists them); X1 is the read-path
     * arm only, measured alone first (RULINGS Q68g).
     */
    readonly currentReadTemporalBounds?: "all-valid-time" | "default";
  } = {},
): StorageAdapterService => {
  const key = Symbol(scopeKey);
  const currentAssertionSource =
    options.currentReadTemporalBounds === "default"
      ? "tx_assertions"
      : "tx_assertions FOR ALL VALID_TIME";
  const maxRetries = options.maxRetries ?? 12;
  const resolutionTimeoutMs = options.resolutionTimeoutMs ?? 30_000;
  const admission = Semaphore.makeUnsafe(1);
  const current = Effect.map(CurrentTransactions, (transactions) => transactions.get(key));
  const read = <A>(thunk: (signal: AbortSignal) => Promise<A>): Effect.Effect<A, ReadError> =>
    Effect.tryPromise({
      try: thunk,
      catch: (cause) => new ReadError({ message: "XTDB read failed", cause }),
    });
  const committedPosition = () =>
    read(async (signal) => {
      const rows = await client.query(
        "SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
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
            `SELECT ${assertionColumns.join(", ")} FROM ${history ? "tx_assertions FOR ALL VALID_TIME" : currentAssertionSource} WHERE ${conditions.join(" AND ")}`,
            params,
            undefined,
            { signal, timeoutMs: 30_000 },
          )
        ).map(decodeAssertionRow),
      );
      const byId = new Map(rows.map((row) => [row.id, row]));
      if (state !== undefined) {
        for (const [rowId, row] of state.rows) {
          byId.delete(rowId);
          if (
            (id === undefined || rowId === id) &&
            (entityIds === undefined || entityIds.includes(row.entity_id)) &&
            matchesPattern(row, pattern) &&
            (history || visibleAt(row, basis))
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

    return Effect.tryPromise({
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
          await bounded(client.submit(statements));
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
              client.query(
                "SELECT operation_id FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = ? AND operation_id = ?",
                [scopeKey, operationId],
                undefined,
                { timeoutMs: Math.max(1, until - Date.now()) },
              ),
            );
            if (receipt.length > 0) return;
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
  };

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
            };
            const child: TransactionState = {
              client,
              scopeKey,
              sourceK: parent.sourceK,
              ...baseline,
              rows: new Map(baseline.rows),
              claims: new Map(baseline.claims),
              newIds: new Set(baseline.newIds),
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
              [...parent.newIds].some((id) => !baseline.newIds.has(id))
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
          };
          const context = new Map(transactions);
          context.set(key, state);
          const result = yield* Effect.provideService(effect, CurrentTransactions, context);
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
        : Effect.flatMap(requireTransaction, (state) =>
            Effect.tryPromise({
              try: (signal) =>
                validateXtdbConstraints(client, scopeKey, state, input, {
                  strategy: options.constraintStrategy as "inline" | "projection",
                  signal,
                }),
              catch: (cause) =>
                new WriteError({ message: "XTDB constraint validation failed", cause }),
            }),
          ),
    withTransaction,
    nextCommitPosition: () =>
      Effect.flatMap(requireTransaction, (state) =>
        Effect.try({
          try: () => {
            if (!Number.isSafeInteger(state.position + 1))
              throw new RangeError("Commit position exhausted");
            return ++state.position;
          },
          catch: (cause) => new WriteError({ message: "Cannot allocate commit position", cause }),
        }),
      ),
    currentCommitPosition: () =>
      Effect.flatMap(current, (state) =>
        state === undefined ? committedPosition() : Effect.succeed(state.position),
      ),
    claimCommand: (commandId, txId, timestamp) =>
      Effect.gen(function* () {
        const state = yield* requireTransaction;
        const pending = state.claims.get(commandId);
        if (pending !== undefined) return pending.txId;
        const existing = yield* read((signal) =>
          client.query(
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
        state.claims.set(commandId, { commandId, txId, timestamp });
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
