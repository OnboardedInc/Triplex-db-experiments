import { ValueDomains } from "@triplex-build/triplex/runtime";
/** Acknowledged Effect lifecycle adapted from the native-engine integration; see SOURCE-ADAPTATION.json. */
import { Context, Effect, Exit, Layer, Option } from "effect";
import {
  StorageAdapter,
  ReadError,
  WriteError,
  MigrationError,
  type StorageAdapterService,
  type TripleInput,
  type TripleRow,
  type QueryPattern,
} from "@triplex-build/triplex/runtime";

type Basis = NonNullable<Parameters<StorageAdapterService["query"]>[1]>;
type DependencyProjection = {
  readonly sourcePosition: number;
  readonly nextTemporalBoundary?: number;
};
export interface GranularSession {
  runRecords<Row extends Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
    signal?: AbortSignal,
  ): Promise<readonly Row[]>;
  nextCommitPosition(): Promise<number>;
  currentCommitPosition(): Promise<number>;
  claimCommand(commandId: string, transactionId: string, timestamp: number): Promise<string | null>;
  insert(
    input: TripleInput,
    txId: string | null,
    timestamp: number,
    id: string,
    position: number,
  ): Promise<TripleRow>;
  batchInsert(
    inputs: readonly TripleInput[],
    txId: string,
    timestamp: number,
    ids: readonly string[],
    position: number,
  ): Promise<readonly TripleRow[]>;
  retract(id: string, timestamp: number, txId: string, position: number): Promise<boolean>;
  getById(id: string): Promise<TripleRow | null>;
  getByEntity(id: string, basis?: Basis): Promise<readonly TripleRow[]>;
  getByEntities(
    ids: readonly string[],
    basis?: Basis,
  ): Promise<ReadonlyMap<string, readonly TripleRow[]>>;
  query(pattern: QueryPattern, basis?: Basis): Promise<readonly TripleRow[]>;
  history(entityId: string): Promise<readonly TripleRow[]>;
  dependencyState(attributes: readonly string[], basis: Basis): Promise<DependencyProjection>;
}
/** Internal queue admission only; no public query/schema option. */
export interface ReadQueueAdmissionOptions {
  readonly signal?: AbortSignal;
  readonly onAdmission?: (withdrawPending: () => boolean) => void;
}
export interface TransactionAdmissionOptions {
  readonly withdrawableRead?: boolean;
}
export interface TransactionController<A> {
  readonly started: Promise<GranularSession>;
  readonly completion: Promise<A>;
  readonly withdrawPending?: () => boolean;
  readonly succeed: (value: A) => void;
  readonly fail: (error: unknown) => void;
}
export interface GranularBackend {
  initialize(schema: string): Promise<void>;
  withTransaction<A>(work: (session: GranularSession) => Promise<A>, options?: ReadQueueAdmissionOptions): Promise<A>;
  read<A>(work: (session: GranularSession) => Promise<A>): Promise<A>;
  startTransaction<A>(options?: TransactionAdmissionOptions): TransactionController<A>;
  close(): Promise<void>;
}
interface Binding {
  readonly owner: symbol;
  readonly session: GranularSession;
  poisoned: unknown | null;
}
class CurrentTransaction extends Context.Service<CurrentTransaction, Binding>()(
  "Goal10/DuckDBTransaction",
) {}
class WorkFailure extends Error {
  readonly original: unknown;
  constructor(original: unknown) {
    super("Original Effect work failed");
    this.name = "EffectWorkFailure";
    this.original = original;
  }
}
const writeError = (cause: unknown) =>
  cause instanceof WriteError
    ? cause
    : new WriteError({ message: "DuckDB transaction/write failed", cause });
const readError = (cause: unknown) =>
  cause instanceof ReadError ? cause : new ReadError({ message: "DuckDB read failed", cause });
const rollbackAcknowledged = (value: unknown): boolean =>
  value !== null &&
  typeof value === "object" &&
  "code" in value &&
  "outcome" in value &&
  value.code === "ROLLED_BACK" &&
  value.outcome === "rollback_ack";

const withdrawalAcknowledged = (value: unknown): boolean =>
  value !== null && typeof value === "object" &&
  "code" in value && value.code === "CANCELED_BEFORE_BEGIN" &&
  "phase" in value && value.phase === "queue" &&
  "outcome" in value && value.outcome === "not_started";

/** Runs work on its original Effect fiber, using a context token rather than a detached runPromise. */
export const makeEffectStorage = (backend: GranularBackend, schema: string) => {
  const owner = Symbol("owned-duckdb-effect-service");
  const invoke = <A, E>(
    operation: (session: GranularSession, signal: AbortSignal) => Promise<A>,
    mapError: (cause: unknown) => E,
    withdrawableRead = false,
  ): Effect.Effect<A, E> =>
    Effect.flatMap(Effect.serviceOption(CurrentTransaction), (binding) => {
      if (Option.isSome(binding)) {
        if (binding.value.owner !== owner)
          return Effect.fail(mapError(new Error("Foreign physical transaction context")));
        return Effect.tryPromise({
          try: (signal) => operation(binding.value.session, signal),
          catch: mapError,
        });
      }
      return Effect.tryPromise({
        try: (signal) => backend.withTransaction((session) => operation(session, signal), withdrawableRead ? { signal } : {}),
        catch: mapError,
      });
    });

  const transaction = (withdrawableRead: boolean): StorageAdapterService["withTransaction"] => <A, E>(
    work: Effect.Effect<A, E>,
  ): Effect.Effect<A, E | WriteError> =>
    Effect.flatMap(Effect.serviceOption(CurrentTransaction), (current) => {
      if (Option.isSome(current)) {
        if (current.value.owner !== owner)
          return Effect.fail(writeError(new Error("Foreign physical transaction context")));
        // Flat nesting, not savepoints: a failed nested region poisons the whole transaction even if caught.
        return Effect.gen(function* () {
          const result = yield* Effect.exit(work);
          if (Exit.isFailure(result)) {
            yield* Effect.sync(() => {
              current.value.poisoned ??= result.cause;
            });
            return yield* Effect.failCause(result.cause);
          }
          return result.value;
        });
      }
      return Effect.uninterruptibleMask((restore) =>
        Effect.gen(function* () {
          const controller = yield* Effect.sync(() => backend.startTransaction<A>({ withdrawableRead }));
          const acquisition = Effect.tryPromise({
            try: () => controller.started,
            catch: writeError,
          });
          // Restore acquisition only for reads. Writes keep the original mask.
          // If cancellation loses withdrawal, acquire and acknowledge rollback;
          // never abandon possibly started work. See DUCKDB-WITHDRAWAL.md.
          const initial = yield* Effect.exit(withdrawableRead ? restore(acquisition) : acquisition);
          let acquired = initial;
          if (Exit.isFailure(initial) && withdrawableRead) {
            if (controller.withdrawPending?.()) {
              const withdrawal = yield* Effect.promise(() => controller.completion.then(
                () => ({ ok: true as const }),
                (error: unknown) => ({ ok: false as const, error }),
              ));
              if (withdrawal.ok || !withdrawalAcknowledged(withdrawal.error))
                return yield* Effect.fail(writeError(new Error("Queued read withdrawal was not acknowledged")));
              return yield* Effect.failCause(initial.cause);
            }
            acquired = yield* Effect.exit(acquisition);
          }
          if (Exit.isFailure(acquired)) return yield* Effect.failCause(acquired.cause);
          const binding: Binding = { owner, session: acquired.value, poisoned: null };
          const result: Exit.Exit<A, E | WriteError> = Exit.isFailure(initial)
            ? Exit.failCause(initial.cause)
            : yield* Effect.exit(restore(Effect.provideService(work, CurrentTransaction, binding)));
          yield* Effect.sync(() => {
            if (Exit.isSuccess(result) && binding.poisoned === null)
              controller.succeed(result.value);
            else
              controller.fail(
                new WorkFailure(Exit.isFailure(result) ? result.cause : binding.poisoned),
              );
          });
          const completion = yield* Effect.promise(() =>
            controller.completion.then(
              (value) => ({ ok: true as const, value }),
              (error: unknown) => ({ ok: false as const, error }),
            ),
          );
          if (Exit.isFailure(result)) {
            if (!completion.ok && rollbackAcknowledged(completion.error))
              return yield* Effect.failCause(result.cause);
            return yield* Effect.fail(
              writeError(
                completion.ok
                  ? new Error("Failed work returned without rollback acknowledgment")
                  : completion.error,
              ),
            );
          }
          if (!completion.ok) return yield* Effect.fail(writeError(completion.error));
          if (binding.poisoned !== null)
            return yield* Effect.fail(
              writeError(new Error("Poisoned nested transaction unexpectedly committed")),
            );
          return completion.value;
        }),
      );
    });

  const withTransaction = transaction(false);
  const withReadTransaction = transaction(true);
  const storage: StorageAdapterService = {
    valueDomain: ValueDomains.duckdb,
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
    nextCommitPosition: () => invoke((s) => s.nextCommitPosition(), writeError),
    currentCommitPosition: () => invoke((s) => s.currentCommitPosition(), readError, true),
    dependencyState: (attributes, basis) =>
      invoke((s) => s.dependencyState(attributes, basis), readError, true),
    claimCommand: (commandId, transactionId, timestamp) =>
      invoke((s) => s.claimCommand(commandId, transactionId, timestamp), writeError),
    insert: (input, txId, timestamp, id, position) =>
      invoke((s) => s.insert(input, txId, timestamp, id, position), writeError),
    batchInsert: (inputs, txId, timestamp, ids, position) =>
      invoke((s) => s.batchInsert(inputs, txId, timestamp, ids, position), writeError),
    retract: (id, timestamp, txId, position) =>
      invoke((s) => s.retract(id, timestamp, txId, position), writeError),
    getById: (id) => invoke((s) => s.getById(id), readError, true),
    getByEntity: (id, basis) => invoke((s) => s.getByEntity(id, basis), readError, true),
    getByEntities: (ids, basis) => invoke((s) => s.getByEntities(ids, basis), readError, true),
    query: (pattern, basis) => invoke((s) => s.query(pattern, basis), readError, true),
    history: (id) => invoke((s) => s.history(id), readError, true),
    initialize: () =>
      Effect.flatMap(Effect.serviceOption(CurrentTransaction), (current) =>
        Option.isSome(current)
          ? Effect.fail(
              new MigrationError({
                version: 1,
                name: "DuckDB public schema",
                message: "Initialize cannot run within a transaction",
              }),
            )
          : Effect.tryPromise({
              try: () => backend.initialize(schema),
              catch: (cause) =>
                new MigrationError({
                  version: 1,
                  name: "DuckDB public schema",
                  message: "DuckDB initialization failed",
                  cause,
                }),
            }),
      ),
    close: () =>
      Effect.flatMap(Effect.serviceOption(CurrentTransaction), (current) =>
        Option.isSome(current)
          ? Effect.fail(writeError(new Error("Close cannot wait on its own active transaction")))
          : Effect.tryPromise({ try: () => backend.close(), catch: writeError }),
      ),
  };
  const runRecords = <Row extends Record<string, unknown>>(
    sql: string,
    params: readonly unknown[],
  ) => invoke((session, signal) => session.runRecords<Row>(sql, params, signal), readError, true);
  return Object.freeze({ storage: Object.freeze(storage), runRecords, withReadTransaction });
};

/** Scope release explicitly surfaces cleanup failure as a defect, never silently ignores it. */
export const makeStorageLayer = <E, R>(
  openBackend: Effect.Effect<GranularBackend, E, R>,
  schema: string,
) =>
  Layer.effect(
    StorageAdapter,
    Effect.gen(function* () {
      const backend = yield* Effect.acquireRelease(openBackend, (value) =>
        Effect.orDie(Effect.tryPromise({ try: () => value.close(), catch: writeError })),
      );
      return makeEffectStorage(backend, schema).storage;
    }),
  );
