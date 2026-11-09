// [EXP-DA01] Why: adapt XTDB staged SPI and savepoint/replay discipline to one Datomic transaction. Rejected: per-row commits (break atomicity).
import { reachResponse } from "./reach.js";
import { readFailure } from "./readErrors.js";
import { randomUUID } from "node:crypto";
import { Effect, Exit, Semaphore } from "effect";
import { type ResolvedTemporalBasis } from "@triplex-build/triplex";
import {
  type StorageAdapterService,
  type TripleRow,
  type TripleInput,
  type QueryPattern,
  ValueDomains,
  storedValueDomain,
  InvalidTripleError,
  WriteError,
  ReadError,
  MigrationError,
  TransactionOutcomeUnknown,
} from "@triplex-build/triplex/runtime";
import { DatomicClient, DatomicHttpError } from "./DatomicClient.js";
import { matchesPattern, packValue, visibleAt } from "./rows.js";
import { stagedInput } from "./protocol.js";
import { databaseName } from "./scopeName.js";
import { CurrentTransactions, type TransactionState } from "./TransactionContext.js";

export class DatomicSerializationConflict extends WriteError {
  readonly reason = "serialization-conflict" as const;
}

export const makeDatomicStorageAdapter = (
  client: DatomicClient,
  scopeKey: string,
  options: {
    readonly maxRetries?: number;
    readonly resolutionTimeoutMs?: number;
    readonly admissionQueue?: boolean;
  } = {},
): StorageAdapterService => {
  const key = Symbol(scopeKey);
  const db = databaseName(scopeKey);
  const maxRetries = options.maxRetries ?? 12;
  const resolutionTimeoutMs = options.resolutionTimeoutMs ?? 30_000;
  const admission = Semaphore.makeUnsafe(1);
  const current = Effect.map(CurrentTransactions, (transactions) => transactions.get(key));
  const read = <A>(thunk: (signal: AbortSignal) => Promise<A>): Effect.Effect<A, ReadError> =>
    Effect.tryPromise({
      try: thunk,
      catch: (cause) => readFailure(cause, "Datomic read failed"),
    });
  const committedPosition = () =>
    read(async () => {
      const result = await client.basis(db);
      const position = Number(result.position.v);
      if (!Number.isSafeInteger(position) || position < 0) throw new RangeError("Unsafe position");
      return position;
    });
  const requireTransaction = Effect.flatMap(current, (state) =>
    state === undefined
      ? Effect.fail(new WriteError({ message: "Datomic mutation requires withTransaction" }))
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
      const rows = yield* read(() =>
        client.rows(db, {
          pattern,
          history,
          ...(id === undefined ? {} : { id }),
          ...(entityIds === undefined ? {} : { entityIds }),
          ...(basis === undefined ? {} : { basis }),
          ...(state === undefined
            ? {}
            : {
                handle: state.handle,
                ...(state.rows.size || state.position !== state.sourceK
                  ? { staged: stagedInput(state) }
                  : {}),
              }),
        }),
      );
      return rows
        .filter((row) => matchesPattern(row, pattern))
        .sort(
          (left, right) => left.recorded_at - right.recorded_at || left.id.localeCompare(right.id),
        );
    });

  const persist = (
    state: TransactionState,
    operationId: string,
    attemptId: string,
  ): Effect.Effect<void, WriteError> => {
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
                  () => reject(new Error("Datomic outcome resolution deadline exceeded")),
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
            client.transact(db, {
              sourceK: state.sourceK,
              position: state.position,
              operationId,
              attemptId,
              rows: [...state.rows.values()],
              newIds: [...state.newIds],
              claims: [...state.claims.values()],
            }),
          );
        } catch (error) {
          if (
            error instanceof DatomicHttpError &&
            error.status >= 400 &&
            error.status < 500 &&
            error.code !== "OperationDuplicate"
          ) {
            if (["CasConflict", "CommandConflict"].includes(error.code))
              throw new DatomicSerializationConflict({
                message: "Datomic source changed while staging the transaction",
                cause: error,
              });
            throw new WriteError({ message: "Datomic transaction was rejected", cause: error });
          }
          submitError = error;
        }
        do {
          try {
            const receipt = await bounded(client.operation(db, operationId));
            if (receipt.status === "committed") return;
          } catch (error) {
            submitError = error;
          }
          if (Date.now() >= until) break;
          await new Promise((resolve) => setTimeout(resolve, 25));
        } while (Date.now() < until);
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
          : new WriteError({ message: "Datomic transaction failed", cause }),
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
              handle: parent.handle,
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
                new DatomicSerializationConflict({
                  message:
                    "Concurrent nested Datomic callbacks changed the savepoint; callback was not replayed",
                }),
              );
            }
            parent.position = child.position;
            parent.rows = child.rows;
            parent.claims = child.claims;
            parent.newIds = child.newIds;
            return result;
          }
          const snapshot = yield* read(() => client.begin(db)).pipe(
            Effect.mapError(
              (cause) => new WriteError({ message: "Cannot acquire Datomic source cut", cause }),
            ),
          );
          const sourceK = snapshot.position;
          const state: TransactionState = {
            client,
            scopeKey,
            sourceK,
            handle: snapshot.handle,
            position: sourceK,
            rows: new Map(),
            claims: new Map(),
            newIds: new Set(),
          };
          const context = new Map(transactions);
          context.set(key, state);
          return yield* Effect.gen(function* () {
            const result = yield* Effect.provideService(effect, CurrentTransactions, context);
            if (
              state.rows.size === 0 &&
              state.claims.size === 0 &&
              state.position === state.sourceK
            )
              return result;
            const exit = yield* Effect.exit(
              Effect.uninterruptible(persist(state, operationId, randomUUID())),
            );
            if (Exit.isSuccess(exit)) return result;
            return yield* Effect.failCause(exit.cause).pipe(
              Effect.catch((error) =>
                error instanceof DatomicSerializationConflict &&
                transactionOptions?.replaySafe === true &&
                retry < maxRetries
                  ? Effect.andThen(
                      Effect.sleep(`${Math.min(50, retry * 2)} millis`),
                      attempt(retry + 1),
                    )
                  : Effect.fail(error),
              ),
            );
          }).pipe(
            Effect.ensuring(
              Effect.promise(() => client.release(db, snapshot.handle)).pipe(Effect.ignore),
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
            ...packValue(input.value, storedValueDomain(ValueDomains.datomic, input.attribute)),
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
        catch: (cause) =>
          cause instanceof InvalidTripleError
            ? cause
            : new WriteError({ message: "Invalid Datomic assertion", cause }),
      });
    });

  const adapter: StorageAdapterService = {
    valueDomain: ValueDomains.datomic,
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
    withTransaction,
    atomicReach: true,
    getReachTriples: (root, basis) => Effect.gen(function* () {
      if (yield* current) return undefined;
      const response = yield* read(() => client.request<{ declined?: string; position: number; t: string; rows: unknown[]; entities: number; visited: string[] }>("POST", `/v2/db/${db}/reach`, { root, basis }));
      if (response.declined !== undefined) {
        client.reachDiagnostics.declines[response.declined] = (client.reachDiagnostics.declines[response.declined] ?? 0) + 1;
        return undefined;
      }
      return yield* Effect.try({ try: () => {
        if (!Number.isSafeInteger(response.position) || response.position < 0 || !/^\d+$/.test(response.t) ||
            (basis.recordedPosition !== undefined && response.position !== basis.recordedPosition)) throw new Error("Fast reach basis mismatch");
        return reachResponse(root, response);
      }, catch: () => { client.reachDiagnostics.faults++; return undefined; } }).pipe(
        Effect.matchEffect({ onFailure: () => Effect.succeed(undefined), onSuccess: effect => effect }),
      );
    }),
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
    // [EXP-QH1-R5] Why: outside a transaction the gateway syncs a fresh database value for each request that carries no handle, so a
    // multi-level pull would read each level from a different value. One basis read at the pull's start gives the logical commit
    // position; every level then sends it as basis.recordedPosition and the gateway answers from `at-position` (d/as-of the first
    // physical transaction covering it), an exact cut, on a request-time db that is never behind it (`await-position`). Inside a
    // transaction the held handle already fixes the value and staged rows must stay visible, so no position is offered.
    // Rejected: holding a gateway snapshot handle for the whole pull (a handle pins gateway state and must be released on every
    // failure path; the position is stateless); currentCommitPosition (names the staged position in a transaction); a lock (P1).
    pullPosition: () =>
      Effect.flatMap(current, (state) =>
        state === undefined ? committedPosition() : Effect.succeed(undefined),
      ),
    claimCommand: (commandId, txId, timestamp) =>
      Effect.gen(function* () {
        const state = yield* requireTransaction;
        const pending = state.claims.get(commandId);
        if (pending !== undefined) return pending.txId;
        const existing = yield* read(() => client.claim(db, commandId, state.sourceK)).pipe(
          Effect.mapError(
            (cause) => new WriteError({ message: "Cannot read command claim", cause }),
          ),
        );
        if (existing !== null) return existing;
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
      Effect.map(
        queryRows({}, basis, false, undefined, [...new Set(entityIds)]),
        (rows) =>
          new Map(
            [...new Set(entityIds)].map(
              (entityId) => [entityId, rows.filter((row) => row.entity_id === entityId)] as const,
            ),
          ),
      ),
    query: (pattern, basis) => queryRows(pattern, basis),
    history: (entityId) => queryRows({ entityId }, undefined, true),
    dependencyState: (attributes, basis) =>
      Effect.gen(function* () {
        const rows = (yield* queryRows({}, basis, true)).filter((row) =>
          attributes.includes(row.attribute),
        );
        let sourcePosition = 0;
        let nextTemporalBoundary: number | undefined;
        for (const row of rows) {
          if (
            (basis.recordedPosition !== undefined &&
              row.recorded_position > basis.recordedPosition) ||
            (basis.recordedAt !== undefined && row.recorded_at > basis.recordedAt)
          )
            continue;
          sourcePosition = Math.max(sourcePosition, row.recorded_position);
          if (
            row.retracted_position !== null &&
            (basis.recordedPosition === undefined ||
              row.retracted_position <= basis.recordedPosition) &&
            (basis.recordedAt === undefined || row.retracted_at! <= basis.recordedAt)
          )
            sourcePosition = Math.max(sourcePosition, row.retracted_position);
          if (visibleAt(row, { ...basis, validAt: row.valid_from }))
            for (const edge of [row.valid_from, row.valid_to])
              if (
                edge !== null &&
                edge > basis.validAt &&
                (nextTemporalBoundary === undefined || edge < nextTemporalBoundary)
              )
                nextTemporalBoundary = edge;
        }
        return {
          sourcePosition,
          ...(nextTemporalBoundary === undefined ? {} : { nextTemporalBoundary }),
        };
      }),
    initialize: () =>
      Effect.tryPromise({
        try: async () => {
          await client.create(scopeKey);
        },
        catch: (cause) =>
          new MigrationError({
            version: 1,
            name: "datomic-baseline",
            message: "Cannot initialize Datomic scope",
            cause,
          }),
      }),
    // The runtime's scoped layer owns the shared client.
    close: () => Effect.void,
  };
  return adapter;
};
