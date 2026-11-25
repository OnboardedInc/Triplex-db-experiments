import { assignRecordTime, assignedInstant } from "./recordClock.js";
import { beginSpan, endSpan } from "./tracing.js";
import {
  registerCommit,
  endCommit,
  sendCommit,
  commitClientIdFor,
  physicalInstant,
  observeInstant,
} from "./CommitOrder.js";
// [EXP-DA01] Why: adapt XTDB staged SPI and savepoint/replay discipline to one Datomic transaction. Rejected: per-row commits (break atomicity).
import { decodeRowText, encodeRowText } from "./rowText.js";
import { validateTagged } from "./codec.js";
import { decodeEntity } from "./reach.js";
import { reachResponse, reachRowsResponse, reachRowIndex } from "./reach.js";
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
import { DatomicClient, DatomicHttpError, atLeastBody } from "./DatomicClient.js";
import {
  boundedMatch,
  DatomicMatchNeedsPaging,
  entityPage as idListEntityPage,
  type IdListOptions,
  type ReadEntities,
  validateIdListOptions,
} from "./idLists.js";
import { isPatternVariable } from "@triplex-build/triplex";
import { matchesPattern, packValue, packValueOnce, createPackedRow, visibleAt } from "./rows.js";
import { fastPathEnabled } from "./fastPaths.js";
import { stagedInput } from "./protocol.js";
import type { ReadAtLeast } from "./readAtLeast.js";
import { databaseName } from "./scopeName.js";
import {
  CurrentTransactions,
  ImportClock,
  DatomicOptimisticRestart,
  type TransactionState,
} from "./TransactionContext.js";

export class DatomicSerializationConflict extends WriteError {
  readonly maximum?: number;
  readonly reason = "serialization-conflict" as const;
}

// [DX-B10] Why: callers distinguish an unsubmitted suffix from an ambiguous durable commit.
// Rejected: retrying a gap as a serialization conflict (would allocate still later sequence numbers).
export class DatomicCommitOrderError extends WriteError {
  readonly reason = "commit-order" as const;
  get code(): string {
    return (this.cause as DatomicHttpError).code;
  }
  // [DX-B10] Why: the existing transport preserves maximum; the concurrent read-cache owner owns its decoder.
  // Rejected: editing DatomicClient.ts or dropping the gateway's recovery coordinate.
  get expectedSequence(): number | undefined {
    return (this.cause as DatomicHttpError).maximum;
  }
}

export const makeDatomicStorageAdapter = (
  client: DatomicClient,
  scopeKey: string,
  options: {
    readonly layout?: "lean" | "legacy";
    readonly maxRetries?: number;
    readonly resolutionTimeoutMs?: number;
    readonly admissionQueue?: boolean;
    readonly optimisticCommits?: boolean;
    readonly serverRecordTime?: boolean;
    readonly indexedJournalReads?: boolean;
    readonly recordedJournalReads?: boolean;
    // [DX-XQ3] Reads by entity type through the gateway's ID list route (default off; see idLists.ts).
    readonly idLists?: IdListOptions;
    /**
     * [DX-JRN1] Ask the gateway for bounded journal pages (`bounded: true`) and follow each page's cursor until the
     * caller's limit or the end of the cut, so no single request walks the position index without a bound. The answers
     * are the same as without it. Default off; also on with TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1.
     */
    readonly boundedJournalPages?: boolean;
    /** [DX-RD4] Every unpinned read (the head it resolves) is at or after this floor's position. */
    readonly readAtLeast?: ReadAtLeast;
  } = {},
): StorageAdapterService => {
  if (options.idLists) validateIdListOptions(options.idLists);
  // [DX-T1] Why: Effect scopes include staging/validation and always close on typed failure or interruption.
  // Rejected: only timing successful HTTP transacts (loses replay, admission and preflight work).
  const traced = <A, E, R>(name: string, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.suspend(() => {
      const span = beginSpan(name);
      return effect.pipe(Effect.ensuring(Effect.sync(() => endSpan(span))));
    });
  const key = Symbol(scopeKey);
  const db = databaseName(scopeKey);
  const boundedJournal =
    options.boundedJournalPages ?? process.env["TRIPLEX_DATOMIC_BOUNDED_JOURNAL"] === "1";
  const maxRetries = options.maxRetries ?? 12;
  const resolutionTimeoutMs = options.resolutionTimeoutMs ?? 45_000;
  let lastSeenPosition = 0;
  let strictRecordClocks = false;
  const receiptPredecessors = (client.cacheOptions.receiptPredecessorAttributes?.length ?? 0) > 0;
  const prefix = `${db}\0`;
  const cache = {
    get: (id: string) => client.rowCache.get(prefix + id),
    has: (id: string) => client.rowCache.has(prefix + id),
    set: (id: string, row: TripleRow) => client.rowCache.set(prefix + id, row),
    delete: (id: string) => client.rowCache.delete(prefix + id),
    clear: () => client.rowCache.deleteWhere((key) => key.startsWith(prefix)),
  };
  const remember = (row: TripleRow, source: "read" | "receipt" = "read") => {
    // [DX-B6-1] Why: immutable journal bodies evicted subject preconditions during seed, adding a snapshot HTTP call to lone commits.
    // Rejected: raising the 32 MiB budget (unbounded client memory caused the original driver failure).
    if (row.entity_type === "_Transaction") return;
    // [DX-TAIL1] Why: a known retirement invalidates both fast-path copies of the same identity.
    // Rejected: normalizing an observed retired row back into a live optimistic input.
    if (receiptPredecessors && row.retracted_at !== null) {
      cache.delete(row.id);
      client.predecessorCache.delete(prefix + row.id);
      return;
    }
    if (client.predecessorCache.enabled)
      client.predecessorCache.remember(prefix + row.id, row, source);
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
  const cached = (id: string) => cache.get(id) ?? client.predecessorCache.row(prefix + id);
  const finalPositions = new Map<string, number>();
  const finalInstants = new Map<string, number>();
  const admission = Semaphore.makeUnsafe(1);
  const current = Effect.map(CurrentTransactions, (transactions) => transactions.get(key));
  const read = <A>(thunk: (signal: AbortSignal) => Promise<A>): Effect.Effect<A, ReadError> =>
    client.onCommit
      ? Effect.flatMap(current, (state) =>
          Effect.tryPromise({
            try: (signal) => client.observeRequests(state?.diagnostic, () => thunk(signal)),
            catch: (cause) => readFailure(cause, "Datomic read failed"),
          }),
        )
      : Effect.tryPromise({
          try: thunk,
          catch: (cause) => readFailure(cause, "Datomic read failed"),
        });
  // [DX-RD4] Why: an unpinned read outside a transaction resolves the gateway's head; a reader built from a receipt asks for
  // at least its position on that same request (no extra request). Rejected: pinning first with a basis call (one more trip).
  const atLeastFor = (basis: ResolvedTemporalBasis | undefined) =>
    basis?.recordedPosition === undefined && basis?.recordedAt === undefined
      ? options.readAtLeast?.request()
      : undefined;
  const committedPosition = () =>
    read(async () => {
      const result = await client.basis(db, options.readAtLeast?.request());
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
        (basis === undefined || client.supportsJournalCuts(db)) &&
        pattern.entityType === "_Transaction" &&
        pattern.entityId
      ) {
        const direct = yield* read(() =>
          client.request<{ declined?: string; rows: string[] }>("POST", `/v2/db/${db}/journal`, {
            txId: pattern.entityId,
            ...(basis === undefined ? {} : { basis }),
          }),
        );
        if (!direct.declined)
          return direct.rows
            .map(decodeRowText)
            .filter((row) => matchesPattern(row, pattern))
            .sort((a, b) => a.recorded_at - b.recorded_at || a.id.localeCompare(b.id));
      }
      const atLeast = state === undefined ? atLeastFor(basis) : undefined;
      const rows = yield* read(() =>
        client.rows(db, {
          ...(atLeast ? atLeastBody(atLeast) : {}),
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

  // [DX-XQ3] The rows of a batch of entities at a basis, read and ordered exactly as getByEntities reads them outside
  // a transaction (queryRows with entityIds), for the ID list paths below.
  const readEntities: ReadEntities = async (ids, basis) => {
    const rows = (
      await client.rows(db, {
        pattern: {},
        history: false,
        entityIds: [...new Set(ids)],
        ...(basis === undefined ? {} : { basis }),
      })
    ).slice();
    for (const row of rows) remember(row);
    rows.sort((left, right) => left.recorded_at - right.recorded_at || left.id.localeCompare(right.id));
    const grouped = new Map<string, TripleRow[]>(ids.map((id) => [id, []]));
    for (const row of rows) grouped.get(row.entity_id)?.push(row);
    return grouped;
  };
  const listedType = (pattern: QueryPattern) =>
    options.idLists !== undefined &&
    (pattern.entityId === undefined || isPatternVariable(pattern.entityId)) &&
    pattern.entityType !== undefined &&
    options.idLists.types[pattern.entityType] !== undefined;
  const boundedQuery = (
    pattern: QueryPattern,
    basis?: ResolvedTemporalBasis,
  ): Effect.Effect<readonly TripleRow[], ReadError> =>
    Effect.gen(function* () {
      const lists = options.idLists;
      if (lists === undefined || (yield* current) !== undefined) return yield* queryRows(pattern, basis);
      if (listedType(pattern)) {
        const position = basis?.recordedPosition ?? (yield* committedPosition());
        return yield* read(() =>
          boundedMatch(client, db, lists, readEntities, pattern.entityType!, basis!, position, (row) =>
            matchesPattern(row, pattern),
          ),
        );
      }
      if (
        lists.refuseScans === true &&
        (pattern.entityId === undefined || isPatternVariable(pattern.entityId)) &&
        pattern.entityType !== "_Transaction"
      )
        return yield* Effect.fail(
          new DatomicMatchNeedsPaging({
            message: `A read by ${JSON.stringify(pattern)} names no entity and no listed type; it would scan every entity`,
          }),
        );
      return yield* queryRows(pattern, basis);
    });

  // [DX-B3-M3] Why: only an ACK bound to this operation or its resolved receipt can publish cached positions.
  // Rejected: caching provisional rows before the transactor has acknowledged them.
  const settle = (state: TransactionState, position: number, instant?: number) => {
    if (state.serverRecordTime && !Number.isFinite(instant))
      throw new TypeError("Missing assigned record clock");
    if (
      state.serverRecordTime &&
      ([...state.rows.values()].some(
        (row) =>
          (state.newIds.has(row.id) && row.recorded_at > instant!) ||
          (row.retracted_at !== null && row.retracted_at > instant!),
      ) ||
        [...state.claims.values()].some((claim) => claim.timestamp > instant!))
    )
      throw new TypeError("Assigned record clock precedes submitted clock");
    const provisional = state.position,
      lower = state.sourceK,
      delta = position - provisional;
    const shift = (p: number) => (p > lower && p <= provisional ? p + delta : p);
    lastSeenPosition = Math.max(lastSeenPosition, position);
    for (const claim of state.claims.values()) {
      finalPositions.set(claim.txId, position);
      if (state.serverRecordTime) finalInstants.set(claim.txId, instant!);
    }
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
      if (state.serverRecordTime)
        next = assignRecordTime(next, state.newIds.has(id), instant!, state.newIds);
      state.rows.set(id, next);
      if (next.retracted_at !== null) {
        if (receiptPredecessors) cache.delete(id);
        client.predecessorCache.delete(prefix + id);
      }
      if (state.newIds.has(id)) {
        if (row.tx_id) {
          finalPositions.set(row.tx_id, next.recorded_position);
          if (state.serverRecordTime) finalInstants.set(row.tx_id, instant!);
        }
        remember(next, "receipt");
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
          const ticket = state.serverRecordTime
            ? undefined
            : (state.order?.ticket ?? registerCommit(-Infinity, client));
          if (state.order && ticket) state.order.ticket = ticket;
          if (state.diagnostic) {
            state.diagnostic.ready = performance.now();
            state.diagnostic.transactionIds = [
              ...new Set(
                [...state.rows.values()]
                  .filter((row) => row.entity_type === "_Transaction")
                  .map((row) => row.entity_id),
              ),
            ];
          }
          // [DX-T1-5] Why: server-assigned strict clocks eliminate timestamp tickets and client-wide send head-of-line waits.
          // Rejected: queueing strict writes by a provisional client timestamp after the transactor owns record time.
          const readyAt = performance.now();
          const submit = (sendSequence?: number, sent?: (published?: boolean) => void) => {
            if (state.serverRecordTime) client.commitDiagnostics.serverAssignedSubmissions++;
            else {
              client.commitDiagnostics.clientOrderedSubmissions++;
              client.commitDiagnostics.ticketWaitMicros += (performance.now() - readyAt) * 1000;
            }
            if (state.diagnostic) state.diagnostic.released = performance.now();
            return client.observeRequests(state.diagnostic, () =>
              client.transact(db, {
                ...(sent ? { onSent: sent } : {}),
                ...(sendSequence === undefined
                  ? {}
                  : { clientId: commitClientIdFor(client), sendSequence }),
                assignRecordTime: state.serverRecordTime === true,
                // [DX-B5-L0] Why: public journals take their timestamp from the replayed runtime clock.
                // Rejected: clock-replaying raw SPI callbacks with fixed import timestamps (cannot advance).
                replaySafe:
                  state.replaySafe === true &&
                  state.importInstant === undefined &&
                  [...state.rows.values()].some((row) => row.entity_type === "_Transaction"),
                sourceK: state.optimistic ? null : state.sourceK,
                // [DX-ERA2 fifth pass, Z7] when the frame began: removals after it that name a subject it writes
                // decline it, also when it carries no source
                ...(state.removalSeen === undefined ? {} : { removalSeen: state.removalSeen }),
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
          };
          const ack = await bounded(
            state.serverRecordTime ? submit() : sendCommit(ticket!, submit),
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
              const settled = beginSpan("client.settle-and-cache");
              try {
                settle(state, Number(p.v), assignedInstant(ack));
              } finally {
                endSpan(settled);
              }
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
            if (
              [
                "CasConflict",
                "CommandConflict",
                ...(!state.serverRecordTime ? ["ClockConflict"] : []),
              ].includes(error.code)
            ) {
              client.commitDiagnostics.conflicts++;
              if (error.code === "ClockConflict") {
                client.commitDiagnostics.clockReplays++;
                if (error.maximum !== undefined) observeInstant(scopeKey, error.maximum);
              }
              throw new DatomicSerializationConflict({
                message: "Datomic source changed while staging the transaction",
                cause: error,
              });
            }
            if (error.code.startsWith("CommitOrder"))
              throw new DatomicCommitOrderError({ message: error.message, cause: error });
            throw new WriteError({ message: "Datomic transaction was rejected", cause: error });
          }
          submitError = error;
        }
        do {
          try {
            const receipt = await bounded(
              client.observeRequests(state.diagnostic, () => client.operation(db, operationId)),
            );
            if (receipt.status === "committed") {
              const pTag = validateTagged(receipt.position),
                tTag = validateTagged(receipt.t);
              const p = Number(pTag.v),
                instant = assignedInstant(receipt);
              if (
                pTag.t !== "long" ||
                tTag.t !== "long" ||
                BigInt(tTag.v) < 0n ||
                !Number.isSafeInteger(p) ||
                p < state.position - state.sourceK ||
                (state.serverRecordTime &&
                  (receipt.operationId !== operationId ||
                    instant === undefined ||
                    instant < (state.order?.instant ?? -Infinity)))
              )
                throw new Error("Invalid bound operation receipt");
              settle(state, p, instant);
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
      const diagnostic: import("./DatomicClient.js").DatomicCommitSample | undefined =
        client.onCommit
          ? {
              operationId,
              transactionIds: [],
              httpCalls: 0,
              replays: 0,
              started: performance.now(),
              returned: 0,
              attempts: [] as import("./DatomicClient.js").DatomicCommitAttempt[],
            }
          : undefined;
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
              order: parent.order,
              diagnostic: parent.diagnostic,
              replaySafe: parent.replaySafe,
              serverRecordTime: parent.serverRecordTime,
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
          const observation: import("./DatomicClient.js").DatomicCommitAttempt | undefined =
            diagnostic
              ? {
                  firstAdapterCall: performance.now(),
                  optimistic: false,
                  begin: false,
                  httpCalls: 0,
                  requests: [],
                }
              : undefined;
          if (observation) diagnostic!.attempts.push(observation);
          const hint = transactionOptions?.hint;
          // [DX-H7] Why: capture predecessors before yielding; concurrent reads can evict either cache.
          // Rejected: separate has/get checks (an eligible row can disappear before staging).
          const predecessors =
            options.optimisticCommits !== false &&
            !forceSnapshot &&
            transactionOptions?.replaySafe === true &&
            hint !== undefined
              ? (hint.tripleIds ?? []).map((id) => [id, cached(id)] as const)
              : undefined;
          const optimistic =
            predecessors !== undefined && predecessors.every(([, row]) => row !== undefined);
          if (observation) {
            observation.optimistic = optimistic;
            observation.begin = !optimistic;
          }
          if (optimistic) client.commitDiagnostics.optimisticAttempts++;
          const snapshot = yield* traced(
            "client.begin-snapshot-or-prefetch",
            read<{
              handle: string;
              position: number;
              prefetch?: NonNullable<TransactionState["prefetch"]>;
            }>(() =>
              client.observeRequests(observation, () =>
                optimistic
                  ? // [DX-ERA2 sixth pass, V3] an optimistic commit always says when it was framed: a client that
                    // holds no removal stamp for this database (it never read it, so it cached nothing from it)
                    // reads the stamp once first, and the commit carries it as removalSeen
                    client.ensureRemovalStamp(db).then(() => ({
                      handle: "",
                      position: lastSeenPosition,
                      prefetch: {
                        ...(hint?.commandId === undefined ? {} : { commandId: hint.commandId }),
                        claim: null,
                        rows: new Map(predecessors!.map(([id, row]) => [id, row!])),
                      },
                    }))
                  : transactionOptions?.hint === undefined
                    ? client.begin(db)
                    : client.beginCommand(db, transactionOptions.hint),
              ),
            ).pipe(
              Effect.mapError(
                (cause) => new WriteError({ message: "Cannot acquire Datomic source cut", cause }),
              ),
            ),
          );
          const sourceK = snapshot.position;
          const state: TransactionState = {
            client,
            scopeKey,
            order: {},
            diagnostic: observation,
            replaySafe: transactionOptions?.replaySafe === true,
            serverRecordTime: strictRecordClocks && options.serverRecordTime !== false,
            optimistic,
            ...(client.removalStamps.has(db) ? { removalSeen: client.removalStamps.get(db)! } : {}),
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
            if (row) {
              state.entities.add(row.entity_id);
              if (!optimistic) remember(row);
            }
          const context = new Map(transactions);
          context.set(key, state);
          return yield* Effect.gen(function* () {
            const result = yield* traced(
              "client.validation-and-staging",
              Effect.provideService(effect, CurrentTransactions, context),
            );
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
              traced(
                "client.persist-and-resolve",
                Effect.uninterruptible(persist(state, operationId, randomUUID())),
              ),
            );
            if (Exit.isSuccess(exit)) return result;
            return yield* Effect.failCause(exit.cause).pipe(
              Effect.catch((error) =>
                error instanceof DatomicSerializationConflict &&
                transactionOptions?.replaySafe === true &&
                retry <
                  (error.cause instanceof DatomicHttpError && error.cause.code === "ClockConflict"
                    ? Math.max(32, maxRetries)
                    : maxRetries)
                  ? Effect.andThen(
                      Effect.sleep(
                        `${error.cause instanceof DatomicHttpError && error.cause.code === "ClockConflict" ? 0 : Math.min(50, retry * 2 + 1)} millis`,
                      ),
                      Effect.suspend(() => {
                        client.commitDiagnostics.replays++;
                        for (const id of hint?.tripleIds ?? []) {
                          cache.delete(id);
                          client.predecessorCache.delete(prefix + id);
                        }
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
                    endCommit(state.order?.ticket);
                    client.commitDiagnostics.optimisticFallbacks++;
                    return attempt(retry, true);
                  })
                : Effect.fail(error),
            ),
            Effect.ensuring(Effect.sync(() => endCommit(state.order?.ticket))),
            Effect.ensuring(
              Effect.promise(() =>
                state.submitted || optimistic
                  ? Promise.resolve()
                  : client.observeRequests(state.diagnostic, () =>
                      client.release(db, snapshot.handle),
                    ),
              ).pipe(Effect.ignore),
            ),
          );
        });
      return Effect.flatMap(current, (parent) =>
        parent !== undefined || options.admissionQueue !== true
          ? attempt(0)
          : Semaphore.withPermits(admission, 1)(attempt(0)),
      ).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            if (diagnostic && diagnostic.attempts.length) {
              diagnostic.returned = performance.now();
              diagnostic.httpCalls = diagnostic.attempts.reduce((n, a) => n + a.httpCalls, 0);
              diagnostic.replays = Math.max(0, diagnostic.attempts.length - 1);
              diagnostic.transactionIds = diagnostic.attempts.at(-1)?.transactionIds ?? [];
              client.onCommit?.(diagnostic);
            }
          }),
        ),
      );
    });

  const stage = (
    state: TransactionState,
    input: TripleInput,
    txId: string | null,
    timestamp: number,
    id: string,
    position: number,
  ) => {
    if (!state.serverRecordTime && state.replaySafe && state.order && !state.order.ticket)
      state.order.ticket = registerCommit(timestamp, client);
    const row: TripleRow = fastPathEnabled("row")
      ? createPackedRow(input, txId, timestamp, id, position, fastPathEnabled("pack"))
      : {
          id,
          entity_id: input.entityId,
          attribute: input.attribute,
          ...(fastPathEnabled("pack") ? packValueOnce : packValue)(
            input.value,
            storedValueDomain(ValueDomains.datomic, input.attribute),
          ),
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
  };
  const insertionError = (cause: unknown) =>
    cause instanceof InvalidTripleError
      ? cause
      : new WriteError({ message: "Invalid Datomic assertion", cause });
  const insert: StorageAdapterService["insert"] = (input, txId, timestamp, id, position) =>
    Effect.gen(function* () {
      const state = yield* requireTransaction;
      return yield* Effect.try({
        try: () => stage(state, input, txId, timestamp, id, position),
        catch: insertionError,
      });
    });

  const adapter: StorageAdapterService = {
    committedInstant: (txId) => {
      const instant = finalInstants.get(txId);
      finalInstants.delete(txId);
      return instant;
    },
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
          type Page = {
            declined?: string;
            head: number;
            transactions: [string, number, string[]][];
            next?: number;
            stopped?: "limit" | "end" | "entries" | "time";
          };
          let result: Page;
          if (!boundedJournal)
            result = await client.request<Page>(
              "POST",
              `/v2/db/${db}/transactions`,
              { after, limit, waitMs },
              Math.max(30_000, waitMs + 5000),
            );
          else {
            // [DX-JRN1] Why: each bounded page holds the journal permit for at most its examine bound; the cursor
            // resumes exactly after the last position the gateway considered. Only the first page may wait.
            // Rejected: treating a short bounded page as the end of the feed (it may have stopped on its bound).
            const transactions: Page["transactions"] = [];
            let cursor = after;
            for (let first = true; ; first = false) {
              const page = await client.request<Page>(
                "POST",
                `/v2/db/${db}/transactions`,
                { after: cursor, limit: limit - transactions.length, waitMs: first ? waitMs : 0, bounded: true },
                Math.max(30_000, (first ? waitMs : 0) + 5000),
              );
              if (page.declined) return undefined;
              if (page.stopped === undefined || page.next === undefined)
                throw new TypeError("Bounded journal page without a cursor");
              if (page.next < cursor) throw new TypeError("Bounded journal cursor moved backwards");
              transactions.push(...page.transactions);
              if (page.stopped === "limit" || page.stopped === "end" || transactions.length >= limit) break;
              cursor = page.next;
            }
            result = { head: 0, transactions };
          }
          if (result.declined) return undefined;
          return result.transactions.map(([txId, position, rows]) => {
            // [DX-B4-T1] Why: portable feed enumeration includes only typed journal rows, even after SPI writes.
            // Rejected: including unrelated rows merely because they share a journal entity ID.
            // [DX-B6-4] Why: unrelated SPI rows may contain non-journal tx IDs.
            // Rejected: decoding branded journal fields before selecting the entity type.
            const journalRows = rows
              .map(decodeRowText)
              .filter((row) => row.entity_type === "_Transaction");
            const triples = decodeEntity(
              txId,
              position,
              journalRows.map((row) => encodeRowText(row)),
            ).rows;
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
    getTransactionPositionsByEntity: (entityId, limit, basis, beforePosition) =>
      Effect.gen(function* () {
        const recordedOnly = options.recordedJournalReads === true;
        if (yield* current) {
          if (recordedOnly)
            return yield* Effect.fail(
              new ReadError({ message: "Journal history needs a committed snapshot" }),
            );
          return undefined;
        }
        if (!recordedOnly && !client.supportsJournalCuts(db)) return undefined;
        return yield* read(async () => {
          type Page = {
            declined?: string;
            positions: [string, number][];
            stopped?: "limit" | "end" | "entries" | "time";
            nextBefore?: number;
          };
          const ask = (before: number | undefined, n: number, bounded: boolean) =>
            client.request<Page>("POST", `/v2/db/${db}/entity-transactions`, {
              entityId,
              limit: n,
              basis: recordedOnly ? { recordedPosition: basis.recordedPosition } : basis,
              ...(recordedOnly ? { recordedOnly } : {}),
              ...(before === undefined ? {} : { beforePosition: before }),
              ...(bounded ? { bounded: true } : {}),
            });
          let result: Page;
          if (!boundedJournal) result = await ask(beforePosition, limit, false);
          else {
            // [DX-JRN1] Why: the bounded walk runs newest first and resumes below the lowest position it considered.
            // Rejected: the unbounded lean walk, which reads every transaction before answering.
            const positions: Page["positions"] = [];
            let before = beforePosition;
            for (;;) {
              const page = await ask(before, limit - positions.length, true);
              if (page.declined) {
                result = page;
                break;
              }
              positions.push(...page.positions);
              if (page.stopped === "limit" || page.stopped === "end" || page.stopped === undefined || positions.length >= limit) {
                result = { positions };
                break;
              }
              if (page.nextBefore === undefined || (before !== undefined && page.nextBefore > before))
                throw new TypeError("Bounded entity journal cursor moved forwards");
              before = page.nextBefore;
            }
          }
          if (result.declined) {
            if (recordedOnly)
              throw new TypeError(`Recorded journal index declined (${result.declined})`);
            return undefined;
          }
          return result.positions.map(([transactionId, position]) => ({ transactionId, position }));
        });
      }),
    ...(options.recordedJournalReads
      ? {
          getTransactionRowsAtPosition: (txId: string, recordedPosition: number) =>
            read(async () => {
              // [DX-W1] Why: hydration uses the same explicit recorded cut as journal membership.
              // Rejected: substituting the caller's current time or the newest database.
              const result = await client.request<{ declined?: string; rows: string[] }>(
                "POST",
                `/v2/db/${db}/journal`,
                { txId, basis: { recordedPosition }, recordedOnly: true },
              );
              if (result.declined)
                throw new TypeError(`Recorded journal declined (${result.declined})`);
              const rows = result.rows.map(decodeRowText);
              if (
                rows.some(
                  (row) => row.entity_id !== txId || row.recorded_position > recordedPosition,
                )
              )
                throw new TypeError("Journal envelope is outside the requested subject and cut");
              return rows
                .filter((row) => row.entity_type === "_Transaction")
                .sort((a, b) => a.recorded_at - b.recorded_at || a.id.localeCompare(b.id));
            }),
        }
      : {}),
    getReachRows: (root, basis) =>
      Effect.gen(function* () {
        if (yield* current) return undefined;
        const response = yield* read(() => client.reachEntities(db, [root], basis, false, false, atLeastFor(basis)));
        if (!response) return undefined;
        return yield* Effect.try({
          try: () => reachRowsResponse(root, response.entities, basis),
          catch: () => {
            client.reachDiagnostics.faults++;
            return undefined;
          },
        }).pipe(Effect.catch(() => Effect.succeed(undefined)));
      }),
    getReachRowsMany: (roots, basis) =>
      Effect.gen(function* () {
        if (yield* current) return undefined;
        const response = yield* read(() => client.reachEntities(db, roots, basis, true, false, atLeastFor(basis)));
        if (!response) return undefined;
        // [DX-B5-L4] Why: row getters share the triple getter's conservative malformed-coverage fallback.
        // Rejected: turning a missing entity in a transport response into an untyped Effect defect.
        return yield* Effect.try({
          try: () => {
            const index = reachRowIndex(response.entities);
            return roots.map((root) => reachRowsResponse(root, response.entities, basis, index));
          },
          catch: () => {
            client.reachDiagnostics.faults++;
            return undefined;
          },
        }).pipe(Effect.catch(() => Effect.succeed(undefined)));
      }),
    getReachTriples: (root, basis) =>
      Effect.gen(function* () {
        if (yield* current) return undefined;
        const response = yield* read(() => client.reachEntities(db, [root], basis, false, false, atLeastFor(basis)));
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
        const response = yield* read(() => client.reachEntities(db, roots, basis, false, false, atLeastFor(basis)));
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
    transactionInstant: (now) =>
      Effect.gen(function* () {
        const state = yield* requireTransaction;
        const imported = yield* ImportClock;
        const instant = yield* Effect.try({
          try: () => {
            if (imported || state.importInstant !== undefined) {
              if (
                !imported ||
                imported.scope !== scopeKey ||
                strictRecordClocks ||
                (state.importInstant !== undefined && state.importInstant !== imported.instant)
              )
                throw new Error("Source record clock conflicts with target scope or transaction");
              // [DX-ACT1] Why: historical source ordinals can share or reverse clocks. Rejected: the normal monotone allocation or gateway clock-replay flag, which rewrites those cuts.
              return (state.importInstant = imported.instant);
            }
            if (!state.serverRecordTime)
              return physicalInstant(scopeKey, now, state.order ?? {}, strictRecordClocks);
            if (!Number.isFinite(now)) throw new RangeError("Nonfinite submitted clock");
            return (state.order!.instant ??= now);
          },
          catch: (cause) =>
            new WriteError({
              message:
                "Cannot allocate a finite record clock; use a fresh scope if the clock is exhausted",
              cause,
            }),
        });
        // [DX-B6-5] Why: register before this fiber yields; nested journals share the first ticket.
        // Rejected: first-insert registration (timestamp order can invert).
        if (!state.serverRecordTime && state.replaySafe && state.order && !state.order.ticket)
          state.order.ticket = registerCommit(instant, client);
        return instant;
      }),
    claimCommand: (commandId, txId, timestamp) =>
      Effect.gen(function* () {
        const state = yield* requireTransaction;
        if (!state.serverRecordTime && state.replaySafe && state.order && !state.order.ticket)
          state.order.ticket = registerCommit(timestamp, client);
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
        : fastPathEnabled("batch")
          ? Effect.gen(function* () {
              const state = yield* requireTransaction;
              return yield* Effect.try({
                try: () =>
                  inputs.map((input, i) => stage(state, input, txId, timestamp, ids[i]!, position)),
                catch: insertionError,
              });
            })
          : Effect.forEach(inputs, (input: TripleInput, i) =>
              insert(input, txId, timestamp, ids[i]!, position),
            ),
    retract: (id, timestamp, txId, position) =>
      Effect.gen(function* () {
        const state = yield* requireTransaction;
        if (!state.serverRecordTime && state.replaySafe && state.order && !state.order.ticket)
          state.order.ticket = registerCommit(timestamp, client);
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
    query: (pattern, basis) =>
      options.idLists === undefined ? queryRows(pattern, basis) : boundedQuery(pattern, basis),
    // [DX-XQ3] Triples.entityPage by ID list for the listed types, outside a transaction (inside one, staged rows
    // must stay visible, so the scan answers). Absent without idLists.
    ...(options.idLists === undefined
      ? {}
      : {
          getEntityPage: (request: Parameters<NonNullable<StorageAdapterService["getEntityPage"]>>[0]) =>
            Effect.gen(function* () {
              const lists = options.idLists!;
              if (lists.types[request.entityType] === undefined || (yield* current) !== undefined)
                return undefined;
              const position = request.basis.recordedPosition ?? (yield* committedPosition());
              return yield* read(() =>
                idListEntityPage(client, db, lists, readEntities, request, position),
              );
            }),
        }),
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
          // [DX-R3-P7] Why: clock sharing follows the stored immutable policy, including reopened scopes.
          // Rejected: trusting the creation request or making callers choose timestamps.
          strictRecordClocks =
            (await client.create(scopeKey, options.layout)).strictRecordClocks === true;
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
        client.predecessorCache.clearScope(db);
        finalPositions.clear();
        finalInstants.clear();
      }),
  };
  return adapter;
};
