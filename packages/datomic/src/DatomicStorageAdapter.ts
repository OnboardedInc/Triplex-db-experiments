// [EXP-DA01] Why: adapt XTDB staged SPI and savepoint/replay discipline to one Datomic transaction. Rejected: per-row commits (break atomicity).
import { decodeRowText } from "./rowText.js";
import { RowCache } from "./RowCache.js";
import { validateTagged } from "./codec.js";
import { decodeEntity } from "./reach.js";
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
import {
  CurrentTransactions,
  DatomicOptimisticRestart,
  type TransactionState,
} from "./TransactionContext.js";

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
    readonly optimisticCommits?: boolean;
    readonly indexedJournalReads?: boolean;
  } = {},
): StorageAdapterService => {
  const key = Symbol(scopeKey);
  const db = databaseName(scopeKey);
  const maxRetries = options.maxRetries ?? 12;
  const resolutionTimeoutMs = options.resolutionTimeoutMs ?? 30_000;
  let lastSeenPosition = 0;
  const cache = new RowCache();
  const remember = (row: TripleRow) => {
    cache.set(row.id, {
      ...row,
      retracted_at: null,
      retracted_position: null,
      retract_tx_id: null,
    });
  };
  const observe = (name: string, row: TripleRow) => {
    if (name === db) remember(row);
  };
  client.rowObservers.add(observe);
  const cached = (id: string) => cache.get(id);
  const finalPositions = new Map<string, number>();
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
      lastSeenPosition = Math.max(lastSeenPosition, position);
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
      if (
        state?.optimistic &&
        (history ||
          basis !== undefined ||
          id === undefined ||
          (!state.rows.has(id) && !state.prefetch?.rows.has(id)))
      ) {
        state.restart.needed = true;
        return yield* Effect.fail(
          new DatomicOptimisticRestart({ message: "Optimistic cache cannot answer this read" }),
        );
      }
      if (state) {
        if (history || (id === undefined && entityIds === undefined && !pattern.entityId))
          state.scopeWide = true;
        if (typeof pattern.entityId === "string" && !pattern.entityId.startsWith("?"))
          state.entities.add(pattern.entityId);
        else if (pattern.entityId) state.scopeWide = true;
        for (const entity of entityIds ?? []) state.entities.add(entity);
      }
      // [EXP-DX1] Why: staged rows override prefetched rows; known absence also saves a read.
      // Rejected: re-reading a prefetched retract target or hiding nested staged writes.
      if (
        state &&
        id !== undefined &&
        basis === undefined &&
        (state.rows.has(id) || state.prefetch?.rows.has(id))
      ) {
        const row = state.rows.get(id) ?? state.prefetch?.rows.get(id);
        if (row && state) state.entities.add(row.entity_id);
        else if (state) state.scopeWide = true;
        return row && (history || visibleAt(row)) && matchesPattern(row, pattern) ? [row] : [];
      }
      // [DX-B4-T2] Why: receipt bodies already have exact row datoms. Rejected: reconstructing each journal fact through entity maps.
      if (
        options.indexedJournalReads !== false &&
        !state &&
        !history &&
        basis === undefined &&
        pattern.entityType === "_Transaction" &&
        pattern.entityId
      ) {
        const direct = yield* read(() =>
          client.request<{ declined?: string; rows: string[] }>("POST", `/v2/db/${db}/journal`, {
            txId: pattern.entityId,
          }),
        );
        if (!direct.declined)
          return direct.rows
            .map(decodeRowText)
            .filter((row) => matchesPattern(row, pattern))
            .sort((a, b) => a.recorded_at - b.recorded_at || a.id.localeCompare(b.id));
      }
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
                ...(state.optimistic ? {} : { handle: state.handle }),
                ...(state.rows.size || state.position !== state.sourceK
                  ? { staged: stagedInput(state) }
                  : {}),
              }),
        }),
      );
      for (const row of rows) {
        if (state) state.entities.add(row.entity_id);
        if (!state?.newIds.has(row.id)) remember(row);
      }
      if (state && id !== undefined && rows.length === 0) state.scopeWide = true;
      return rows
        .filter((row) => matchesPattern(row, pattern))
        .sort(
          (left, right) => left.recorded_at - right.recorded_at || left.id.localeCompare(right.id),
        );
    });

  // [DX-B3-M3] Why: only an ACK bound to this operation or its resolved receipt can publish cached positions.
  // Rejected: caching provisional rows before the transactor has acknowledged them.
  const settle = (state: TransactionState, position: number) => {
    const provisional = state.position,
      lower = state.sourceK,
      delta = position - provisional;
    const shift = (p: number) => (p > lower && p <= provisional ? p + delta : p);
    lastSeenPosition = Math.max(lastSeenPosition, position);
    for (const claim of state.claims.values()) finalPositions.set(claim.txId, position);
    for (const [id, row] of state.rows) {
      let next = row;
      if (delta !== 0) {
        next = {
          ...row,
          recorded_position: state.newIds.has(id)
            ? shift(row.recorded_position)
            : row.recorded_position,
          retracted_position:
            row.retracted_position === null ? null : shift(row.retracted_position),
          ...(state.newIds.has(id) && row.attribute === ":_tx/position"
            ? { value_number: shift(row.recorded_position) }
            : {}),
        };
      }
      state.rows.set(id, next);
      if (state.newIds.has(id)) {
        if (row.tx_id) finalPositions.set(row.tx_id, next.recorded_position);
        remember(next);
      }
    }
    state.position = position;
  };

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
          state.submitted = true;
          const ack = await bounded(
            client.transact(db, {
              sourceK: state.optimistic ? null : state.sourceK,
              position: state.position,
              span: state.position - state.sourceK,
              entities: [...state.entities],
              live: [...state.live],
              scopeWide: state.scopeWide,
              operationId,
              attemptId,
              rows: [...state.rows.values()],
              newIds: [...state.newIds],
              claims: [...state.claims.values()],
              ...(state.optimistic ? {} : { handle: state.handle }),
              release: true,
            }),
          );
          // [EXP-DX1] Why: a bound transaction ACK is already a receipt; resolve only ambiguous ACKs.
          // Rejected: unconditional operation lookup (adds a third HTTP request).
          if (
            ack &&
            typeof ack === "object" &&
            "operationId" in ack &&
            ack.operationId === operationId &&
            "position" in ack &&
            "t" in ack &&
            "datoms" in ack &&
            Number.isSafeInteger(ack.datoms) &&
            Number(ack.datoms) >= 0
          ) {
            const p = validateTagged(ack.position),
              t = validateTagged(ack.t);
            if (
              p.t === "long" &&
              Number.isSafeInteger(Number(p.v)) &&
              Number(p.v) >= state.position - state.sourceK &&
              t.t === "long" &&
              BigInt(t.v) >= 0n
            ) {
              settle(state, Number(p.v));
              return;
            }
          }
        } catch (error) {
          if (
            error instanceof DatomicHttpError &&
            error.status >= 400 &&
            error.status < 500 &&
            error.code !== "OperationDuplicate"
          ) {
            if (["CasConflict", "CommandConflict"].includes(error.code)) {
              client.commitDiagnostics.conflicts++;
              throw new DatomicSerializationConflict({
                message: "Datomic source changed while staging the transaction",
                cause: error,
              });
            }
            throw new WriteError({ message: "Datomic transaction was rejected", cause: error });
          }
          submitError = error;
        }
        do {
          try {
            const receipt = await bounded(client.operation(db, operationId));
            if (receipt.status === "committed") {
              const p = Number(validateTagged(receipt.position).v);
              if (!Number.isSafeInteger(p) || p < state.position - state.sourceK)
                throw new Error("Invalid operation receipt position");
              settle(state, p);
              return;
            }
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
    transactionOptions?: {
      readonly replaySafe?: boolean;
      readonly hint?: { readonly commandId?: string; readonly tripleIds?: readonly string[] };
    },
  ): Effect.Effect<A, E | WriteError> =>
    Effect.suspend(() => {
      const operationId = randomUUID();
      const attempt = (retry: number, forceSnapshot = false): Effect.Effect<A, E | WriteError> =>
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
              ...(parent.prefetch === undefined ? {} : { prefetch: parent.prefetch }),
              optimistic: parent.optimistic === true,
              restart: parent.restart,
              entities: new Set(parent.entities),
              live: new Set(parent.live),
              scopeWide: parent.scopeWide,
              ...baseline,
              rows: new Map(baseline.rows),
              claims: new Map(baseline.claims),
              newIds: new Set(baseline.newIds),
            };
            const context = new Map(transactions);
            context.set(key, child);
            const result = yield* Effect.provideService(effect, CurrentTransactions, context).pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  for (const entity of child.entities) parent.entities.add(entity);
                  for (const id of child.live) parent.live.add(id);
                  parent.scopeWide ||= child.scopeWide;
                }),
              ),
            );
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
            for (const entity of child.entities) parent.entities.add(entity);
            for (const id of child.live) parent.live.add(id);
            parent.scopeWide ||= child.scopeWide;
            parent.position = child.position;
            parent.rows = child.rows;
            parent.claims = child.claims;
            parent.newIds = child.newIds;
            return result;
          }
          const hint = transactionOptions?.hint;
          const optimistic =
            options.optimisticCommits !== false &&
            !forceSnapshot &&
            transactionOptions?.replaySafe === true &&
            hint !== undefined &&
            (hint.tripleIds ?? []).every((id) => cache.has(id));
          if (optimistic) client.commitDiagnostics.optimisticAttempts++;
          const snapshot = yield* read<{
            handle: string;
            position: number;
            prefetch?: NonNullable<TransactionState["prefetch"]>;
          }>(() =>
            optimistic
              ? Promise.resolve({
                  handle: "",
                  position: lastSeenPosition,
                  prefetch: {
                    ...(hint?.commandId === undefined ? {} : { commandId: hint.commandId }),
                    claim: null,
                    rows: new Map((hint?.tripleIds ?? []).map((id) => [id, cached(id)!])),
                  },
                })
              : transactionOptions?.hint === undefined
                ? client.begin(db)
                : client.beginCommand(db, transactionOptions.hint),
          ).pipe(
            Effect.mapError(
              (cause) => new WriteError({ message: "Cannot acquire Datomic source cut", cause }),
            ),
          );
          const sourceK = snapshot.position;
          const state: TransactionState = {
            client,
            scopeKey,
            optimistic,
            restart: { needed: false },
            sourceK,
            handle: snapshot.handle,
            ...("prefetch" in snapshot ? { prefetch: snapshot.prefetch } : {}),
            position: sourceK,
            rows: new Map(),
            claims: new Map(),
            newIds: new Set(),
            entities: new Set(),
            live: new Set(optimistic ? hint?.tripleIds : []),
            scopeWide: false,
          };
          for (const row of state.prefetch?.rows.values() ?? [])
            if (row) state.entities.add(row.entity_id);
          const context = new Map(transactions);
          context.set(key, state);
          return yield* Effect.gen(function* () {
            const result = yield* Effect.provideService(effect, CurrentTransactions, context);
            if (state.restart.needed)
              return yield* Effect.fail(
                new WriteError({ message: "Unsupported optimistic read requires a snapshot" }),
              );
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
                      Effect.suspend(() => {
                        client.commitDiagnostics.replays++;
                        for (const id of hint?.tripleIds ?? []) cache.delete(id);
                        return attempt(retry + 1, true);
                      }),
                    )
                  : Effect.fail(error),
              ),
            );
          }).pipe(
            Effect.catch((error) =>
              state.restart.needed && optimistic
                ? Effect.suspend(() => {
                    client.commitDiagnostics.optimisticFallbacks++;
                    return attempt(retry, true);
                  })
                : Effect.fail(error),
            ),
            Effect.ensuring(
              Effect.promise(() =>
                state.submitted || optimistic
                  ? Promise.resolve()
                  : client.release(db, snapshot.handle),
              ).pipe(Effect.ignore),
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
          state.entities.add(row.entity_id);
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
    committedPosition: (txId) => {
      const p = finalPositions.get(txId);
      finalPositions.delete(txId);
      return p;
    },
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
    // [DX-B4-T1] Why: staged reads retain the portable snapshot overlay. Rejected: exposing committed head inside a transaction.
    getTransactionsAfter: (after, limit, waitMs = 0) =>
      Effect.gen(function* () {
        if (yield* current) return undefined;
        return yield* read(async () => {
          const result = await client.request<{
            declined?: string;
            head: number;
            transactions: [string, number, string[]][];
          }>(
            "POST",
            `/v2/db/${db}/transactions`,
            { after, limit, waitMs },
            Math.max(30_000, waitMs + 5000),
          );
          if (result.declined) return undefined;
          return result.transactions.map(([txId, position, rows]) => {
            const triples = decodeEntity(txId, position, rows).rows;
            if (triples.some((t) => t.entityId !== txId))
              throw new TypeError("Journal binding mismatch");
            return { txId, triples };
          });
        });
      }),
    // [DX-B4-T2] Why: unique committed claims are invisible until publication. Rejected: a client-side claim cache.
    getTransactionIdByCommand: (commandId) =>
      Effect.gen(function* () {
        if (yield* current) return undefined;
        return yield* read(async () => {
          const result = await client.request<{ declined?: string; txId: string | null }>(
            "POST",
            `/v2/db/${db}/command`,
            { commandId },
          );
          if (result.declined) return undefined;
          if (result.txId !== null && typeof result.txId !== "string")
            throw new TypeError("Invalid command lookup");
          return result.txId;
        });
      }),
    getReachTriples: (root, basis) =>
      Effect.gen(function* () {
        if (yield* current) return undefined;
        const response = yield* read(() => client.reachEntities(db, [root], basis));
        if (!response) return undefined;
        return yield* Effect.try({
          try: () => reachResponse(root, response.entities, basis),
          catch: () => {
            client.reachDiagnostics.faults++;
            return undefined;
          },
        }).pipe(Effect.catch(() => Effect.succeed(undefined)));
      }),
    getReachTriplesMany: (roots, basis) =>
      Effect.gen(function* () {
        if (yield* current) return undefined;
        const response = yield* read(() => client.reachEntities(db, roots, basis));
        if (!response) return undefined;
        return yield* Effect.try({
          try: () => roots.map((root) => reachResponse(root, response.entities, basis)),
          catch: () => {
            client.reachDiagnostics.faults++;
            return undefined;
          },
        }).pipe(Effect.catch(() => Effect.succeed(undefined)));
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
      Effect.flatMap(current, (state) => {
        if (state?.optimistic) {
          state.restart.needed = true;
          return Effect.fail(
            new DatomicOptimisticRestart({ message: "The current position requires a snapshot" }),
          );
        }
        return state === undefined ? committedPosition() : Effect.succeed(state.position);
      }),
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
        if (state.optimistic && state.prefetch?.commandId !== commandId) {
          state.restart.needed = true;
          return yield* Effect.fail(new WriteError({ message: "Optimistic claim was not hinted" }));
        }
        const existing = yield* read(() =>
          state.prefetch?.commandId === commandId
            ? Promise.resolve(state.prefetch.claim)
            : client.claim(db, commandId, state.sourceK),
        ).pipe(
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
        state.entities.add(row.entity_id);
        if (!state.newIds.has(id)) state.live.add(id);
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
    close: () =>
      Effect.sync(() => {
        client.rowObservers.delete(observe);
        cache.clear();
        finalPositions.clear();
      }),
  };
  return adapter;
};
