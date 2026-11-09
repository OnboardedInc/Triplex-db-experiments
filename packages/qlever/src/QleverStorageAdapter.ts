import { readQleverCut, resolveQleverBasis } from "./RecordCut.js";
import { nextStamp, instantOf, stampOf } from "@triplex-build/triplex";
import { randomUUID } from "node:crypto";
import { Context, Effect, Exit, Semaphore } from "effect";
import { isPatternVariable, type ResolvedTemporalBasis } from "@triplex-build/triplex";
import {
  WriteError,
  ReadError,
  MigrationError,
  TransactionOutcomeUnknown,
  type StorageAdapterService,
  type TripleRow,
  type QueryPattern,
} from "@triplex-build/triplex/runtime";
import type { QleverClient } from "./QleverClient.js";
import {
  assertionIri,
  claimIri,
  operationIri,
  fieldIri as f,
  graphIri,
  metaIri,
  literal as lit,
  packValue,
  decodeRow,
  encodedRowFields,
  type QleverCommitEncoding,
  numericOrderKey as order,
  numericFromOrderKey,
  integerOrderKey,
} from "./rdf.js";

interface State {
  readonly sourceK: number;
  readonly sourceStamp: number;
  stamp?: number;
  position: number;
  rows: Map<string, TripleRow>;
  claims: Map<string, { txId: string; timestamp: number }>;
  newIds: Set<string>;
}
const Transactions = Context.Reference<ReadonlyMap<symbol, State>>("triplex/qlever/transactions", {
  defaultValue: () => new Map(),
});
export interface QleverSourceView {
  readonly sourcePosition: number;
  readonly pendingPosition: number;
  readonly rows: readonly TripleRow[];
}
export interface QleverStorageAdapterService extends StorageAdapterService {
  readonly sourceView: Effect.Effect<QleverSourceView | undefined>;
}
export class QleverSerializationConflict extends WriteError {
  readonly reason = "serialization-conflict" as const;
}
const matches = (row: TripleRow, pattern: QueryPattern) =>
  (pattern.entityId === undefined ||
    isPatternVariable(pattern.entityId) ||
    row.entity_id === pattern.entityId) &&
  (pattern.attribute === undefined ||
    isPatternVariable(pattern.attribute) ||
    row.attribute === pattern.attribute) &&
  (pattern.entityType === undefined || row.entity_type === pattern.entityType) &&
  (pattern.value === undefined ||
    isPatternVariable(pattern.value) ||
    Object.entries(packValue(pattern.value)).every(
      ([key, value]) => row[key as keyof TripleRow] === value,
    ));
const visible = (row: TripleRow, basis?: ResolvedTemporalBasis) =>
  !(basis?.recordedPosition !== undefined && row.recorded_position > basis.recordedPosition) &&
  !(basis?.recordedAt !== undefined && row.recorded_at > basis.recordedAt) &&
  !(
    row.retracted_at !== null &&
    (basis?.recordedAt === undefined || row.retracted_at <= basis.recordedAt) &&
    (basis?.recordedPosition === undefined ||
      (row.retracted_position !== null && row.retracted_position <= basis.recordedPosition))
  ) &&
  (basis === undefined ||
    (row.valid_from <= basis.validAt && (row.valid_to === null || row.valid_to > basis.validAt)));

export const makeQleverStorageAdapter = (
  client: QleverClient,
  scopeKey: string,
  options: {
    readonly maxRetries?: number;
    readonly resolutionTimeoutMs?: number;
    readonly admissionQueue?: boolean;
    /** EXP-J01: default `a0`; `compact` omits never-read channels (rdf.ts UNREAD_CHANNELS). */
    readonly commitEncoding?: QleverCommitEncoding;
  } = {},
): QleverStorageAdapterService => {
  const commitEncoding = options.commitEncoding ?? "a0";
  if (commitEncoding !== "a0" && commitEncoding !== "compact")
    throw new TypeError("Unknown QLever commit encoding; choose a0 or compact");
  const graph = graphIri(scopeKey),
    key = Symbol(scopeKey),
    admission = Semaphore.makeUnsafe(1);
  const current = Effect.map(Transactions, (states) => states.get(key));
  const read = <A>(thunk: (signal: AbortSignal) => Promise<A>) =>
    Effect.tryPromise({
      try: thunk,
      catch: (cause) =>
        cause instanceof ReadError
          ? cause
          : new ReadError({ message: "QLever read failed", cause }),
    });
  const currentCut = () => read((signal) => readQleverCut(client, scopeKey, signal));
  const position = () => Effect.map(currentCut(), (cut) => cut.position);
  const required = Effect.flatMap(current, (state) =>
    state === undefined
      ? Effect.fail(new WriteError({ message: "QLever mutation requires withTransaction" }))
      : Effect.succeed(state),
  );
  const queryRows = (
    pattern: QueryPattern,
    basis?: ResolvedTemporalBasis,
    history = false,
    id?: string,
    entities?: readonly string[],
  ): Effect.Effect<readonly TripleRow[], ReadError> =>
    Effect.gen(function* () {
      const state = yield* current;
      if (!state && basis)
        basis = yield* read((signal) => resolveQleverBasis(client, scopeKey, basis!, signal));
      const k =
        state === undefined
          ? basis?.recordedPosition
          : Math.min(state.sourceK, basis?.recordedPosition ?? state.sourceK);
      const clauses = [`?subject ${f("_row")} ?row .`];
      if (id !== undefined) clauses.push(`VALUES ?subject { ${assertionIri(id)} }`);
      const exact = (column: string, value: string) =>
        clauses.push(`?subject ${f(column)} ${lit(value)} .`);
      if (entities)
        clauses.push(
          `VALUES ?entity { ${entities.map(lit).join(" ")} } ?subject ${f("entity_id")} ?entity .`,
        );
      if (pattern.entityId !== undefined && !isPatternVariable(pattern.entityId))
        exact("entity_id", pattern.entityId);
      if (pattern.attribute !== undefined && !isPatternVariable(pattern.attribute))
        exact("attribute", pattern.attribute);
      if (pattern.entityType !== undefined) exact("entity_type", pattern.entityType);
      if (pattern.value !== undefined && !isPatternVariable(pattern.value))
        for (const [column, value] of Object.entries(packValue(pattern.value)))
          if (value !== null)
            exact(
              column === "value_number" || column === "value_datetime" ? `${column}_order` : column,
              typeof value === "number" &&
                (column === "value_number" || column === "value_datetime")
                ? order(value)
                : String(value),
            );
      if (k !== undefined)
        clauses.push(
          `?subject ${f("recorded_position_order")} ?recordedOrder . FILTER(?recordedOrder <= ${lit(order(k))})`,
        );
      if (basis?.recordedAt !== undefined)
        clauses.push(
          `?subject ${f("recorded_at_order")} ?recordedTime . FILTER(?recordedTime <= ${lit(order(basis.recordedAt))})`,
        );
      if (!history) {
        clauses.push(
          `OPTIONAL { ?subject ${f("retracted_at_order")} ?retractedTime } OPTIONAL { ?subject ${f("retracted_position_order")} ?retractedOrder }`,
        );
        clauses.push(
          `FILTER(!BOUND(?retractedTime)${k === undefined ? "" : ` || ?retractedOrder > ${lit(order(k))}`}${basis?.recordedAt === undefined ? "" : ` || ?retractedTime > ${lit(order(basis.recordedAt))}`})`,
        );
        if (basis)
          clauses.push(
            `?subject ${f("valid_from_order")} ?validFrom . OPTIONAL { ?subject ${f("valid_to_order")} ?validTo } FILTER(?validFrom <= ${lit(order(basis.validAt))} && (!BOUND(?validTo) || ?validTo > ${lit(order(basis.validAt))}))`,
          );
      }
      const rows = yield* read(async (signal) =>
        (
          await client.query(`SELECT ?row WHERE { GRAPH ${graph} { ${clauses.join("\n")} } }`, {
            signal,
          })
        ).map((binding) => decodeRow(binding["row"]!.value)),
      );
      const byId = new Map(rows.map((row) => [row.id, row]));
      if (state)
        for (const [rowId, row] of state.rows) {
          byId.delete(rowId);
          if (
            (id === undefined || id === rowId) &&
            (entities === undefined || entities.includes(row.entity_id)) &&
            matches(row, pattern) &&
            (history || visible(row, basis))
          )
            byId.set(rowId, row);
        }
      return [...byId.values()]
        .map((row) =>
          !history &&
          row.retracted_at !== null &&
          ((basis?.recordedAt !== undefined && row.retracted_at > basis.recordedAt) ||
            (basis?.recordedPosition !== undefined &&
              row.retracted_position! > basis.recordedPosition))
            ? { ...row, retracted_at: null, retracted_position: null, retract_tx_id: null }
            : row,
        )
        .sort((a, b) => a.recorded_at - b.recorded_at || a.id.localeCompare(b.id));
    });
  const persist = (
    state: State,
    operationId: string,
    attemptId: string,
  ): Effect.Effect<void, WriteError> =>
    Effect.tryPromise({
      try: async () => {
        const values: [string, string, string][] = [];
        for (const row of state.rows.values())
          for (const [column, value] of encodedRowFields(row, commitEncoding))
            values.push([assertionIri(row.id), f(column), value]);
        values.push(
          [metaIri, f("position"), lit(String(state.position))],
          [metaIri, f("position_native"), String(state.position)],
          [metaIri, f("stamp"), lit(integerOrderKey(String(state.stamp ?? state.sourceStamp)))],
        );
        for (const [id, claim] of state.claims)
          for (const [column, value] of Object.entries({
            command_id: id,
            tx_id: claim.txId,
            recorded_at: String(claim.timestamp),
            position: String(state.position),
            stamp: String(state.stamp ?? state.sourceStamp),
          }))
            values.push([claimIri(id), f(column), lit(value)]);
        for (const [column, value] of Object.entries({
          operation_id: operationId,
          attempt_id: attemptId,
          position: String(state.position),
          stamp: String(state.stamp ?? state.sourceStamp),
        }))
          values.push([operationIri(operationId), f(column), lit(value)]);
        const guards = [
          // [EXP-RT01] Why: exact constants guard the whole cut without a marker join. Rejected: OPTIONAL/coalesce marker joins (live attempt2 hit Cartesian Product Join timeouts).
          state.sourceK === 0 && state.sourceStamp === 0
            ? `FILTER NOT EXISTS { GRAPH ${graph} { ${metaIri} ${f("position")} ?sourcePosition } } FILTER NOT EXISTS { GRAPH ${graph} { ${metaIri} ${f("stamp")} ?sourceStamp } }`
            : `GRAPH ${graph} { ${metaIri} ${f("position")} ${lit(String(state.sourceK))} ; ${f("stamp")} ${lit(integerOrderKey(String(state.sourceStamp)))} }`,
          `FILTER NOT EXISTS { GRAPH ${graph} { ${operationIri(operationId)} ${f("operation_id")} ?operation } }`,
        ];
        for (const id of state.claims.keys())
          guards.push(
            `FILTER NOT EXISTS { GRAPH ${graph} { ${claimIri(id)} ${f("command_id")} ?command } }`,
          );
        if (state.newIds.size)
          guards.push(
            `FILTER NOT EXISTS { VALUES ?newSubject { ${[...state.newIds].map(assertionIri).join(" ")} } GRAPH ${graph} { ?newSubject ${f("id")} ?existingId } }`,
          );
        // Isolating the guard subquery avoids QLever 0.6.0's CartesianProductJoin
        // planner assertion for NOT EXISTS combined directly with VALUES+OPTIONAL.
        const update = `DELETE { GRAPH ${graph} { ?s ?p ?old } } INSERT { GRAPH ${graph} { ?s ?p ?new } } WHERE { { SELECT * WHERE { ${guards.join("\n")} } } VALUES (?s ?p ?new) { ${values.map((row) => `(${row.join(" ")})`).join("\n")} } OPTIONAL { GRAPH ${graph} { ?s ?p ?old } } }`;
        let acknowledged = false,
          cause: unknown;
        const until = Date.now() + (options.resolutionTimeoutMs ?? 30_000);
        try {
          await client.update(update, { timeoutMs: Math.max(1, until - Date.now()) });
          acknowledged = true;
        } catch (error) {
          cause = error;
        }
        do {
          try {
            const receipt = await client.query(
              `SELECT ?attempt ?position ?stamp WHERE { GRAPH ${graph} { ${operationIri(operationId)} ${f("attempt_id")} ?attempt ; ${f("position")} ?position ; ${f("stamp")} ?stamp } }`,
              { timeoutMs: Math.max(1, until - Date.now()) },
            );
            if (
              receipt.length === 1 &&
              receipt[0]?.["attempt"]?.value === attemptId &&
              Number(receipt[0]?.["position"]?.value) === state.position &&
              Number(receipt[0]?.["stamp"]?.value) === (state.stamp ?? state.sourceStamp)
            )
              return;
            if (acknowledged) {
              const cut = await client.query(
                `SELECT ?position WHERE { GRAPH ${graph} { ${metaIri} ${f("position")} ?position } }`,
                { timeoutMs: Math.max(1, until - Date.now()) },
              );
              if (Number(cut[0]?.["position"]?.value ?? 0) !== state.sourceK)
                throw new QleverSerializationConflict({
                  message: "QLever source changed during callback staging",
                });
              throw new WriteError({
                message: "QLever conditional transaction rejected an assertion or command identity",
              });
            }
          } catch (error) {
            if (error instanceof WriteError) throw error;
            cause = error;
          }
          if (Date.now() >= until) break;
          await new Promise((resolve) => setTimeout(resolve, 25));
        } while (true);
        throw new TransactionOutcomeUnknown({
          operationId,
          attemptId,
          ...(state.claims.size === 1 ? { commandId: [...state.claims.keys()][0]! } : {}),
          cause,
        });
      },
      catch: (cause) =>
        cause instanceof WriteError
          ? cause
          : new WriteError({ message: "QLever commit failed", cause }),
    });
  const withTransaction = <A, E>(
    effect: Effect.Effect<A, E>,
    transactionOptions?: { readonly replaySafe?: boolean },
  ): Effect.Effect<A, E | WriteError> =>
    Effect.suspend(() => {
      const operationId = randomUUID();
      const attempt = (retry: number): Effect.Effect<A, E | WriteError> =>
        Effect.gen(function* () {
          const states = yield* Transactions,
            parent = states.get(key);
          if (parent) {
            const saved = {
              position: parent.position,
              rows: new Map(parent.rows),
              claims: new Map(parent.claims),
              newIds: new Set(parent.newIds),
            };
            const child: State = {
              sourceK: parent.sourceK,
              sourceStamp: parent.sourceStamp,
              ...(parent.stamp === undefined ? {} : { stamp: parent.stamp }),
              ...saved,
              rows: new Map(saved.rows),
              claims: new Map(saved.claims),
              newIds: new Set(saved.newIds),
            };
            const context = new Map(states);
            context.set(key, child);
            const result = yield* Effect.provideService(effect, Transactions, context);
            const unchanged = <K, V>(left: ReadonlyMap<K, V>, right: ReadonlyMap<K, V>) =>
              left.size === right.size && [...left].every(([id, value]) => right.get(id) === value);
            if (
              parent.position !== saved.position ||
              !unchanged(parent.rows, saved.rows) ||
              !unchanged(parent.claims, saved.claims) ||
              parent.newIds.size !== saved.newIds.size ||
              [...parent.newIds].some((id) => !saved.newIds.has(id))
            )
              return yield* Effect.fail(
                new QleverSerializationConflict({
                  message:
                    "Concurrent nested QLever callbacks changed the savepoint; callback was not replayed",
                }),
              );
            if (child.stamp !== undefined) parent.stamp = child.stamp;
            parent.position = child.position;
            parent.rows = child.rows;
            parent.claims = child.claims;
            parent.newIds = child.newIds;
            return result;
          }
          const sourceCut = yield* currentCut().pipe(
            Effect.mapError(
              (cause) => new WriteError({ message: "Cannot acquire QLever source cut", cause }),
            ),
          );
          const sourceK = sourceCut.position;
          const state: State = {
            sourceK,
            sourceStamp: stampOf(sourceCut.recordedAt),
            position: sourceK,
            rows: new Map(),
            claims: new Map(),
            newIds: new Set(),
          };
          const context = new Map(states);
          context.set(key, state);
          const result = yield* Effect.provideService(effect, Transactions, context);
          if (!state.rows.size && !state.claims.size && state.position === sourceK) return result;
          const exit = yield* Effect.exit(
            Effect.uninterruptible(persist(state, operationId, randomUUID())),
          );
          if (Exit.isSuccess(exit)) return result;
          return yield* Effect.failCause(exit.cause).pipe(
            Effect.catch((error) =>
              error instanceof QleverSerializationConflict &&
              transactionOptions?.replaySafe === true &&
              retry < (options.maxRetries ?? 12)
                ? Effect.andThen(
                    Effect.sleep(`${Math.min(50, retry * 2)} millis`),
                    attempt(retry + 1),
                  )
                : Effect.fail(error),
            ),
          );
        });
      return Effect.flatMap(current, (parent) =>
        parent || !options.admissionQueue
          ? attempt(0)
          : Semaphore.withPermits(admission, 1)(attempt(0)),
      );
    });
  const ensureStamp = (state: State, timestamp: number): void => {
    // [EXP-RT01] Why: low-level callers share the stamp invariant too. Rejected: silently accepting a mismatched row stamp (receipt and watermark would disagree).
    if (state.stamp !== undefined) {
      if (timestamp !== state.stamp / 1000)
        throw new TypeError("Row record instant differs from the transaction's decided stamp");
      return;
    }
    const stamp = stampOf(timestamp);
    if (stamp <= state.sourceStamp)
      throw new TypeError("Row record instant is not above the source stamp");
    state.stamp = stamp;
  };
  const insert: StorageAdapterService["insert"] = (input, txId, timestamp, id, position) =>
    Effect.flatMap(required, (state) =>
      Effect.try({
        try: () => {
          ensureStamp(state, timestamp);
          if (state.rows.has(id)) throw new Error("Duplicate assertion identity");
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
          state.rows.set(id, row);
          state.newIds.add(id);
          return row;
        },
        catch: (cause) => new WriteError({ message: "Invalid QLever assertion", cause }),
      }),
    );
  return {
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
    sourceView: Effect.map(current, (state) =>
      state
        ? {
            sourcePosition: state.sourceK,
            pendingPosition: state.position,
            rows: [...state.rows.values()],
          }
        : undefined,
    ),
    withTransaction,
    recordTime: "decided",
    currentCut,
    commitStamp: (stagedAt) =>
      Effect.flatMap(required, (state) =>
        Effect.try({
          try: () => {
            state.stamp ??= nextStamp(state.sourceStamp, stagedAt);
            return { instant: instantOf(state.stamp), decided: true };
          },
          catch: (cause) => new WriteError({ message: "Cannot assign record stamp", cause }),
        }),
      ),
    nextCommitPosition: () =>
      Effect.flatMap(required, (state) =>
        Effect.try({
          try: () => {
            if (!Number.isSafeInteger(state.position + 1))
              throw new RangeError("Commit position exhausted");
            return ++state.position;
          },
          catch: (cause) => new WriteError({ message: "Cannot allocate position", cause }),
        }),
      ),
    currentCommitPosition: () =>
      Effect.flatMap(current, (state) => (state ? Effect.succeed(state.position) : position())),
    claimCommand: (id, txId, timestamp) =>
      Effect.gen(function* () {
        const state = yield* required;
        const pending = state.claims.get(id);
        if (pending) return pending.txId;
        const rows = yield* read((signal) =>
          client.query(
            `SELECT ?tx WHERE { GRAPH ${graph} { ${claimIri(id)} ${f("tx_id")} ?tx ; ${f("position")} ?position . FILTER(xsd:integer(?position) <= ${state.sourceK}) } }`.replace(
              "SELECT",
              "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> SELECT",
            ),
            { signal },
          ),
        ).pipe(
          Effect.mapError(
            (cause) => new WriteError({ message: "Cannot read command claim", cause }),
          ),
        );
        if (rows.length) return rows[0]!["tx"]!.value;
        yield* Effect.try({
          try: () => ensureStamp(state, timestamp),
          catch: (cause) => new WriteError({ message: "Invalid claim stamp", cause }),
        });
        state.claims.set(id, { txId, timestamp });
        return null;
      }),
    insert,
    batchInsert: (inputs, txId, timestamp, ids, position) =>
      inputs.length !== ids.length
        ? Effect.fail(new WriteError({ message: "Assertion identity count mismatch" }))
        : Effect.forEach(inputs, (input, index) =>
            insert(input, txId, timestamp, ids[index]!, position),
          ),
    retract: (id, timestamp, txId, position) =>
      Effect.gen(function* () {
        const state = yield* required;
        yield* Effect.try({
          try: () => ensureStamp(state, timestamp),
          catch: (cause) => new WriteError({ message: "Invalid retraction stamp", cause }),
        });
        const row = (yield* queryRows({}, undefined, false, id).pipe(
          Effect.mapError(
            (cause) => new WriteError({ message: "Cannot read retraction target", cause }),
          ),
        ))[0];
        if (!row) return false;
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
    getByEntities: (ids, basis) =>
      ids.length
        ? Effect.map(
            queryRows({}, basis, false, undefined, [...new Set(ids)]),
            (rows) =>
              new Map(
                [...new Set(ids)].map((id) => [id, rows.filter((row) => row.entity_id === id)]),
              ),
          )
        : Effect.succeed(new Map()),
    query: (pattern, basis) => queryRows(pattern, basis),
    history: (entityId) => queryRows({ entityId }, undefined, true),
    dependencyState: (attributes, requested) =>
      Effect.flatMap(
        read((signal) => resolveQleverBasis(client, scopeKey, requested, signal)),
        (basis) =>
          attributes.length === 0
            ? Effect.succeed({ sourcePosition: 0 })
            : read(async (signal) => {
                const noBoundary = "ffffffffffffffff";
                const sourceCut = basis.recordedPosition ?? Number.MAX_SAFE_INTEGER,
                  time = basis.recordedAt;
                const filter = `FILTER(?recorded <= ${lit(order(sourceCut))}${time === undefined ? "" : ` && ?recordedTime <= ${lit(order(time))}`})`;
                const visibleRetraction = `BOUND(?retracted) && ?retracted <= ${lit(order(sourceCut))}${time === undefined ? "" : ` && ?retractedTime <= ${lit(order(time))}`}`;
                const rows = await client.query(
                  `SELECT (MAX(?source) AS ?sourcePosition) (MIN(?next) AS ?nextBoundary) WHERE { GRAPH ${graph} { VALUES ?attribute { ${[...new Set(attributes)].map(lit).join(" ")} } ?s ${f("attribute")} ?attribute ; ${f("recorded_position_order")} ?recorded ; ${f("recorded_position_native")} ?position ; ${f("recorded_at_order")} ?recordedTime ; ${f("valid_from_order")} ?validFrom . OPTIONAL { ?s ${f("retracted_position_order")} ?retracted ; ${f("retracted_position_native")} ?retractedPosition ; ${f("retracted_at_order")} ?retractedTime } OPTIONAL { ?s ${f("valid_to_order")} ?validTo } ${filter} BIND(IF(${visibleRetraction},?retractedPosition,?position) AS ?source) BIND(IF(${visibleRetraction},${lit(noBoundary)},IF(?validFrom > ${lit(order(basis.validAt))},?validFrom,IF(BOUND(?validTo) && ?validTo > ${lit(order(basis.validAt))},?validTo,${lit(noBoundary)}))) AS ?next) } }`,
                  { signal },
                );
                return {
                  sourcePosition: Number(rows[0]?.["sourcePosition"]?.value ?? 0),
                  ...(rows[0]?.["nextBoundary"] && rows[0]["nextBoundary"].value !== noBoundary
                    ? { nextTemporalBoundary: numericFromOrderKey(rows[0]["nextBoundary"].value) }
                    : {}),
                };
              }),
      ),
    initialize: () =>
      Effect.tryPromise({
        try: async () => {
          await readQleverCut(client, scopeKey);
        },
        catch: (cause) =>
          cause instanceof MigrationError
            ? cause
            : new MigrationError({
                version: 1,
                name: "qlever-native",
                message: "Cannot access QLever RDF server",
                cause,
              }),
      }),
    close: () => Effect.void,
  };
};
