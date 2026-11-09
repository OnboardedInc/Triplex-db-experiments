/**
 * QLever storage adapter whose source of truth is the host broker (EXP-P2Q candidate, behind
 * `makeQleverStorageAdapter(..., { broker })`; the default A0 path is unchanged).
 *
 * Differences from A0 (`QleverStorageAdapter.ts`), each for a reason:
 * 1. The commit is decided and made durable by the broker (claims and per-subject CAS from its own record,
 *    one fsynced frame per group) and ACKed before QLever applies it (RULINGS Q31e, R17 2.4 option A).
 * 2. Positions are placeholders while staging and bound to (LSN, ordinal) when the broker decides (the P2X
 *    `bindPositions` pattern); see position.ts for the packing and Q31c.
 * 3. Read-your-own-write by routing (TARGETS 4.1 items 4 to 6): a read at basis B is answered from one
 *    QLever request that returns the rows and the replica marker together (one request is one snapshot,
 *    R17 1.1 item 1). If the marker has reached B the replica alone serves it; otherwise the broker's
 *    overlay of unpublished frames is merged in, and if the overlay no longer holds every frame after the
 *    marker the read routes to the broker's own record on disk. No index answers for a basis it is not
 *    eligible for.
 * 4. Temporal predicates are evaluated in the kernel, never as `FILTER(?rp <= P)` in SPARQL (brief point 6;
 *    R17 0.2 item 3: the planner does not push a temporal FILTER into the scan, 8.5M-row scans), so the
 *    replica query is a plain pattern match and the same visibility test applies to replica and overlay rows.
 * 5. The CAS read set is recorded per transaction (P2X, R18 3.1 item 1): reads confined to known entities
 *    are guarded per subject; any other read escalates the commit to the scope-wide guard.
 */
import { randomUUID } from "node:crypto";
import { Context, Effect, Exit } from "effect";
import { isPatternVariable, type ResolvedTemporalBasis } from "@triplex-build/triplex";
import {
  ReadError,
  WriteError,
  MigrationError,
  TransactionOutcomeUnknown,
  type QueryPattern,
  type StorageAdapterService,
  type TripleRow,
} from "@triplex-build/triplex/runtime";
import type { QleverClient } from "../QleverClient.js";
import {
  assertionIri,
  decodeRow,
  fieldIri as f,
  graphIri,
  literal as lit,
  metaIri,
  numericFromOrderKey,
  numericOrderKey as order,
  packValue,
} from "../rdf.js";
import { BrokerFailed, type HostBroker, type ReplicaSnapshot } from "./broker.js";
import { markerFields } from "./sparql.js";
import { lastPositionOf } from "./position.js";
import { BasisNotAvailable, ReplicaUnavailable, isUnreachable, type BasisSurface } from "./errors.js";

export type BrokerReadRoute = "replica" | "overlay" | "log";
export interface BrokerReadEvent {
  readonly route: BrokerReadRoute;
  readonly basis: number;
  readonly replicaPosition: number;
  readonly rows: number;
  readonly ms: number;
  readonly staged: boolean;
}
export interface BrokerAdapterOptions {
  readonly maxRetries?: number;
  /**
   * Deadline for any read that must wait for its basis: the replica for Datalog, dependencyState and native
   * reads, the resolved prefix for repository pulls beyond it (default 2 s, RULINGS Q58a). `publicationWaitMs`
   * is the earlier name.
   */
  readonly basisWaitMs?: number;
  readonly publicationWaitMs?: number;
  readonly onRead?: (event: BrokerReadEvent) => void;
}

/**
 * The basis gate the broker adapter hands the Datalog executor (V-P2Q C1, C2, N2; RULINGS Q67c, Q72b). The
 * executor answers in several requests, so the gate brackets them with a replica snapshot. Called as a function
 * outside a transaction (requested basis, or the broker head) it waits until the resolved prefix covers the
 * basis and the replica's real marker reaches it, and returns the snapshot (`basis` is the position to query
 * at). `inTransaction` honors a requested cut at or below sourceK, or uses sourceK when omitted.
 * `after(snapshot)`, once the last answer request has returned,
 * probes again and refuses the answer if the replica was reset in between (another incarnation, a fence by the
 * broker, or a marker below the basis), even when the marker is back at or above the basis by then.
 * Datalog never merges the overlay (RULINGS Q58d): it waits or fails typed.
 */
export type BasisGate = ((requested: number | undefined) => Promise<ReplicaSnapshot>) & {
  readonly inTransaction: (sourceK: number, requested?: number) => Promise<ReplicaSnapshot>;
  readonly after: (snapshot: ReplicaSnapshot) => Promise<void>;
};

interface State {
  readonly sourceK: number;
  placeholders: number[];
  rows: Map<string, TripleRow>;
  claims: Map<string, { txId: string; timestamp: number }>;
  newIds: Set<string>;
  priors: Map<string, TripleRow>;
  reads: { entities: Set<string>; scopeWide: boolean };
}
const Transactions = Context.Reference<ReadonlyMap<symbol, State>>("triplex/qlever/broker-transactions", {
  defaultValue: () => new Map(),
});

/** Same pattern semantics as the A0 adapter's `matches`. */
const matches = (row: TripleRow, pattern: QueryPattern) =>
  (pattern.entityId === undefined || isPatternVariable(pattern.entityId) || row.entity_id === pattern.entityId) &&
  (pattern.attribute === undefined || isPatternVariable(pattern.attribute) || row.attribute === pattern.attribute) &&
  (pattern.entityType === undefined || row.entity_type === pattern.entityType) &&
  (pattern.value === undefined ||
    isPatternVariable(pattern.value) ||
    Object.entries(packValue(pattern.value)).every(([key, value]) => row[key as keyof TripleRow] === value));

/**
 * Kernel visibility at position B (A0's `visible` with the recorded position always named). A retraction
 * counts only once its own position is at or below B, so a replica that is ahead of B still answers B exactly.
 */
const visibleAt = (row: TripleRow, b: number, basis?: ResolvedTemporalBasis) =>
  row.recorded_position <= b &&
  !(basis?.recordedAt !== undefined && row.recorded_at > basis.recordedAt) &&
  !(
    row.retracted_at !== null &&
    row.retracted_position !== null &&
    row.retracted_position <= b &&
    (basis?.recordedAt === undefined || row.retracted_at <= basis.recordedAt)
  ) &&
  (basis === undefined ||
    (row.valid_from <= basis.validAt && (row.valid_to === null || row.valid_to > basis.validAt)));

/** A0's `visible`, used for this transaction's own staged rows so in-transaction reads behave as on A0. */
const visibleA0 = (row: TripleRow, basis?: ResolvedTemporalBasis) =>
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

// Placeholders are negative and process-unique, so they never equal a committed position (always >= 0)
// and one that escaped substitution is caught by the broker (finalize).
let placeholderCounter = 0;
// A staged row belongs to this uncommitted transaction, which sorts after every committed basis, exactly
// as A0's staged K+n positions do (P2X stagedView).
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
/** Bind placeholder positions in a callback's result (P2X `bindPositions`, TransactionResult shape). */
const bindPositions = (value: unknown, positions: ReadonlyMap<number, number>, depth = 0): unknown => {
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

export class QleverBrokerConflict extends WriteError {
  readonly reason = "serialization-conflict" as const;
}

export interface QleverBrokerStorageAdapterService extends StorageAdapterService {
  readonly sourceView: Effect.Effect<
    { readonly sourcePosition: number; readonly pendingPosition: number; readonly rows: readonly TripleRow[] } | undefined
  >;
  readonly broker: HostBroker;
  /** Basis for queries outside a transaction: waits for the replica (Datalog has no overlay merge). */
  readonly resolveQueryBasis: BasisGate;
  readonly routes: Record<BrokerReadRoute, number>;
}

export const makeQleverBrokerStorageAdapter = (
  client: QleverClient,
  scopeKey: string,
  broker: HostBroker,
  options: BrokerAdapterOptions = {},
): QleverBrokerStorageAdapterService => {
  const graph = graphIri(scopeKey);
  const key = Symbol(scopeKey);
  // Q58a default deadline: 2 s for any read that must wait for a basis.
  const basisWaitMs = options.basisWaitMs ?? options.publicationWaitMs ?? 2_000;
  const routes: Record<BrokerReadRoute, number> = { replica: 0, overlay: 0, log: 0 };
  const current = Effect.map(Transactions, (states) => states.get(key));
  const required = Effect.flatMap(current, (state) =>
    state === undefined
      ? Effect.fail(new WriteError({ message: "QLever mutation requires withTransaction" }))
      : Effect.succeed(state),
  );

  // [EXP-P2Q] Why: Q89c forbids substituting the immutable transaction pin for a requested future cut.
  // Rejected: waiting on the moving broker head (a pinned transaction cannot adopt a newer snapshot).
  const readBasis = async (
    sourceK: number | undefined,
    requested: number | undefined,
    surface: BasisSurface,
  ) => {
    const b = requested ?? sourceK ?? broker.head();
    if (sourceK !== undefined && b > sourceK) {
      const started = performance.now();
      while (performance.now() - started < basisWaitMs)
        await new Promise<void>((resolve) =>
          setTimeout(resolve, basisWaitMs - (performance.now() - started)),
        );
      throw new BasisNotAvailable({
        required: b,
        observed: sourceK,
        replica: "the transaction snapshot",
        surface,
        waitedMs: performance.now() - started,
      });
    }
    if (sourceK === undefined && b > lastPositionOf(broker.durable().lsn))
      await broker.awaitResolved(b, basisWaitMs, surface);
    return b;
  };

  const queryRows = (
    pattern: QueryPattern,
    basis?: ResolvedTemporalBasis,
    history = false,
    id?: string,
    entities?: readonly string[],
  ): Effect.Effect<readonly TripleRow[], ReadError> =>
    Effect.gen(function* () {
      const state = yield* current;
      const b = yield* Effect.tryPromise({
        try: () => readBasis(state?.sourceK, basis?.recordedPosition, "repository"),
        catch: (cause) =>
          cause instanceof ReadError
            ? cause
            : new ReadError({ message: "QLever read failed", cause }),
      });
      if (entities?.length === 0) return [];
      if (state) {
        // CAS read set (module comment item 5).
        if (pattern.entityId !== undefined && !isPatternVariable(pattern.entityId)) state.reads.entities.add(pattern.entityId);
        else if (entities !== undefined) for (const entity of entities) state.reads.entities.add(entity);
        else if (id === undefined) state.reads.scopeWide = true;
      }
      const clauses = [`?subject ${f("_row")} ?row .`];
      if (id !== undefined) clauses.push(`VALUES ?subject { ${assertionIri(id)} }`);
      const exact = (column: string, value: string) => clauses.push(`?subject ${f(column)} ${lit(value)} .`);
      if (entities) clauses.push(`VALUES ?entity { ${entities.map(lit).join(" ")} } ?subject ${f("entity_id")} ?entity .`);
      if (pattern.entityId !== undefined && !isPatternVariable(pattern.entityId)) exact("entity_id", pattern.entityId);
      if (pattern.attribute !== undefined && !isPatternVariable(pattern.attribute)) exact("attribute", pattern.attribute);
      if (pattern.entityType !== undefined) exact("entity_type", pattern.entityType);
      if (pattern.value !== undefined && !isPatternVariable(pattern.value))
        for (const [column, value] of Object.entries(packValue(pattern.value)))
          if (value !== null)
            exact(
              column === "value_number" || column === "value_datetime" ? `${column}_order` : column,
              typeof value === "number" && (column === "value_number" || column === "value_datetime")
                ? order(value)
                : String(value),
            );
      const selection = { ...(entities ? { entities } : {}), ...(id !== undefined ? { id } : {}) };
      const scoped =
        pattern.entityId !== undefined && !isPatternVariable(pattern.entityId)
          ? { ...selection, entities: [pattern.entityId] }
          : selection;
      const select = (row: TripleRow) =>
        (id === undefined || row.id === id) &&
        (entities === undefined || entities.includes(row.entity_id)) &&
        matches(row, pattern);
      const t0 = performance.now();
      const replica = yield* Effect.tryPromise({
        try: async (signal) => {
          const bindings = await client.query(
            `SELECT ?row ?brokerPosition WHERE { { GRAPH ${graph} { ${metaIri} ${markerFields.position} ?brokerPosition } } UNION { GRAPH ${graph} { ${clauses.join("\n")} } } }`,
            { signal },
          );
          let marker = 0;
          const rows: TripleRow[] = [];
          for (const binding of bindings) {
            if (binding["brokerPosition"]) marker = Number(binding["brokerPosition"].value);
            if (binding["row"]) rows.push(decodeRow(binding["row"].value));
          }
          return { rows, marker };
        },
        catch: (cause) => cause,
      }).pipe(
        // V-P2Q M3: an unreachable replica is not a reason to fail a repository pull or a retraction-target
        // read; the broker's own record answers exactly (every row version is in the log), so commits with
        // retractions continue during an outage (Q31e). Other failures stay ReadError.
        Effect.catch((cause) =>
          isUnreachable(cause)
            ? Effect.succeed(undefined)
            : Effect.fail(new ReadError({ message: "QLever read failed", cause })),
        ),
      );
      let route: BrokerReadRoute = "replica";
      let marker = 0;
      const byId = new Map<string, TripleRow>();
      if (replica === undefined) {
        route = "log";
        for (const row of broker.fromLog(0, scoped, select)) byId.set(row.id, row);
      } else {
        marker = replica.marker;
        for (const row of replica.rows) byId.set(row.id, row);
        if (marker < b) {
          let overlay = broker.overlay(marker, scoped, select);
          route = "overlay";
          if (overlay === undefined) {
            overlay = broker.fromLog(marker, scoped, select);
            route = "log";
          }
          for (const row of overlay) byId.set(row.id, row);
        }
      }
      routes[route]++;
      options.onRead?.({ route, basis: b, replicaPosition: marker, rows: byId.size, ms: performance.now() - t0, staged: state !== undefined });
      if (state && id !== undefined) {
        const found = byId.get(id) ?? state.rows.get(id);
        if (found) state.reads.entities.add(found.entity_id);
        else state.reads.scopeWide = true;
      }
      const out = new Map<string, TripleRow>();
      for (const [rowId, row] of byId)
        if (history ? row.recorded_position <= b : visibleAt(row, b, basis)) out.set(rowId, row);
      if (state)
        for (const [rowId, row] of state.rows) {
          out.delete(rowId);
          if (
            (id === undefined || id === rowId) &&
            (entities === undefined || entities.includes(row.entity_id)) &&
            matches(row, pattern) &&
            (history || visibleA0(stagedView(row), basis))
          )
            out.set(rowId, row);
        }
      return [...out.values()].sort((a, b2) => a.recorded_at - b2.recorded_at || a.id.localeCompare(b2.id));
    });

  const persist = (state: State, operationId: string, attemptId: string) =>
    Effect.tryPromise({
      try: async () => {
        const decision = await broker.submit({
          operationId,
          attemptId,
          sourceK: state.sourceK,
          reads: state.reads,
          claims: [...state.claims].map(([commandId, claim]) => ({ commandId, ...claim })),
          placeholders: state.placeholders,
          rows: [...state.rows.values()],
          priors: state.priors,
          newIds: state.newIds,
        });
        if (decision.kind === "conflict")
          throw new QleverBrokerConflict({
            message: `Broker compare-and-set conflict (${decision.reason}${decision.entity ? ` ${decision.entity}` : ""})`,
          });
        return decision.positions;
      },
      catch: (cause) =>
        cause instanceof WriteError
          ? cause
          : cause instanceof BrokerFailed
            ? new TransactionOutcomeUnknown({
                operationId,
                attemptId,
                ...(state.claims.size === 1 ? { commandId: [...state.claims.keys()][0]! } : {}),
                cause,
              })
            : new WriteError({ message: "QLever broker commit failed", cause }),
    });

  const withTransaction = <A, E>(
    effect: Effect.Effect<A, E>,
    transactionOptions?: { readonly replaySafe?: boolean },
  ): Effect.Effect<A, E | WriteError> =>
    Effect.suspend(() => {
      const operationId = randomUUID();
      const attempt = (retry: number): Effect.Effect<A, E | WriteError> =>
        Effect.gen(function* () {
          const states = yield* Transactions;
          const parent = states.get(key);
          if (parent) {
            // Nested callback: a savepoint copy adopted on success, as in A0.
            const child: State = {
              sourceK: parent.sourceK,
              placeholders: [...parent.placeholders],
              rows: new Map(parent.rows),
              claims: new Map(parent.claims),
              newIds: new Set(parent.newIds),
              priors: new Map(parent.priors),
              reads: { entities: new Set(parent.reads.entities), scopeWide: parent.reads.scopeWide },
            };
            const snapshot = { placeholders: parent.placeholders.length, rows: parent.rows, claims: parent.claims };
            const context = new Map(states);
            context.set(key, child);
            const result = yield* Effect.provideService(effect, Transactions, context);
            if (
              parent.placeholders.length !== snapshot.placeholders ||
              parent.rows !== snapshot.rows ||
              parent.claims !== snapshot.claims
            )
              return yield* Effect.fail(
                new QleverBrokerConflict({ message: "Concurrent nested QLever callbacks changed the savepoint" }),
              );
            parent.placeholders = child.placeholders;
            parent.rows = child.rows;
            parent.claims = child.claims;
            parent.newIds = child.newIds;
            parent.priors = child.priors;
            parent.reads = child.reads;
            return result;
          }
          const state: State = {
            sourceK: broker.head(),
            placeholders: [],
            rows: new Map(),
            claims: new Map(),
            newIds: new Set(),
            priors: new Map(),
            reads: { entities: new Set(), scopeWide: false },
          };
          const context = new Map(states);
          context.set(key, state);
          const result = yield* Effect.provideService(effect, Transactions, context);
          if (!state.rows.size && !state.claims.size) return result;
          const exit = yield* Effect.exit(Effect.uninterruptible(persist(state, operationId, randomUUID())));
          if (Exit.isSuccess(exit)) return bindPositions(result, exit.value) as A;
          return yield* Effect.failCause(exit.cause).pipe(
            Effect.catch((error) =>
              error instanceof QleverBrokerConflict &&
              transactionOptions?.replaySafe === true &&
              retry < (options.maxRetries ?? 12)
                ? Effect.andThen(Effect.sleep(`${Math.min(50, retry * 2)} millis`), attempt(retry + 1))
                : Effect.fail(error),
            ),
          );
        });
      return attempt(0);
    });

  const insert: StorageAdapterService["insert"] = (input, txId, timestamp, id, position) =>
    Effect.flatMap(required, (state) =>
      Effect.try({
        try: () => {
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

  /** Typed failure for surfaces without a log fallback (V-P2Q M3). */
  const typed = (surface: "datalog" | "dependency-state") => (cause: unknown) =>
    cause instanceof ReadError
      ? cause
      : isUnreachable(cause)
        ? new ReplicaUnavailable({ replica: "the QLever replica", surface, cause })
        : new ReadError({ message: "QLever read failed", cause });
  /**
   * A0's dependency aggregate on the replica. It answers in one request, so the replica marker is read in that
   * same request (a UNION with the marker triple, as pulls do; RULINGS Q67c, Q72b): the answer and the marker
   * come from one snapshot, and no reset between separate probes can hide (V-P2Q N2). Eligible for B when that
   * marker is at or above B, or when the overlay proves that no frame after it touches the attributes (the
   * answer is then already exact for B; nothing is merged, RULINGS Q58d). Otherwise wait for the replica within
   * the deadline and ask again, then typed failure.
   */
  const dependencyState: StorageAdapterService["dependencyState"] = (attributes, basis) =>
    Effect.flatMap(current, (state) => Effect.tryPromise({ catch: typed("dependency-state"), try: async (signal) => {
          const started = performance.now();
          const b = await readBasis(state?.sourceK, basis.recordedPosition, "dependency-state");
          if (attributes.length === 0) return { sourcePosition: 0 };
          const wanted = new Set(attributes);
          const noBoundary = "ffffffffffffffff";
          const time = basis.recordedAt;
          const filter = `FILTER(?recorded <= ${lit(order(b))}${time === undefined ? "" : ` && ?recordedTime <= ${lit(order(time))}`})`;
          const visibleRetraction = `BOUND(?retracted) && ?retracted <= ${lit(order(b))}${time === undefined ? "" : ` && ?retractedTime <= ${lit(order(time))}`}`;
          const aggregate = `SELECT (MAX(?source) AS ?sourcePosition) (MIN(?next) AS ?nextBoundary) WHERE { GRAPH ${graph} { VALUES ?attribute { ${[...wanted].map(lit).join(" ")} } ?s ${f("attribute")} ?attribute ; ${f("recorded_position_order")} ?recorded ; ${f("recorded_position_native")} ?position ; ${f("recorded_at_order")} ?recordedTime ; ${f("valid_from_order")} ?validFrom . OPTIONAL { ?s ${f("retracted_position_order")} ?retracted ; ${f("retracted_position_native")} ?retractedPosition ; ${f("retracted_at_order")} ?retractedTime } OPTIONAL { ?s ${f("valid_to_order")} ?validTo } ${filter} BIND(IF(${visibleRetraction},?retractedPosition,?position) AS ?source) BIND(IF(${visibleRetraction},${lit(noBoundary)},IF(?validFrom > ${lit(order(basis.validAt))},?validFrom,IF(BOUND(?validTo) && ?validTo > ${lit(order(basis.validAt))},?validTo,${lit(noBoundary)}))) AS ?next) } }`;
          const sparql = `SELECT ?sourcePosition ?nextBoundary ?brokerPosition WHERE { { GRAPH ${graph} { ${metaIri} ${markerFields.position} ?brokerPosition } } UNION { ${aggregate} } }`;
          // Pacing only (the in-request marker below decides): when the broker already knows the replica is
          // behind B and a frame after it touches the attributes, wait first instead of computing an answer
          // that would be discarded.
          const cached = broker.replicaPosition();
          if (cached < b) {
            const touched = broker.overlay(cached, {}, (row) => wanted.has(row.attribute));
            if (touched === undefined || touched.length > 0) await broker.awaitReplica(b, Math.max(0, basisWaitMs - (performance.now() - started)), "dependency-state");
          }
          for (;;) {
            const rows = await client.query(sparql, { signal });
            const markerRow = rows.find((row) => row["brokerPosition"] !== undefined);
            const observed = Number(markerRow?.["brokerPosition"]?.value ?? 0);
            const answer = rows.find((row) => row !== markerRow);
            const exact =
              observed >= b ||
              (() => {
                const touched = broker.overlay(observed, {}, (row) => wanted.has(row.attribute));
                return touched !== undefined && touched.length === 0;
              })();
            if (exact)
              return {
                sourcePosition: Number(answer?.["sourcePosition"]?.value ?? 0),
                ...(answer?.["nextBoundary"] && answer["nextBoundary"].value !== noBoundary
                  ? { nextTemporalBoundary: numericFromOrderKey(answer["nextBoundary"].value) }
                  : {}),
              };
            const remaining = basisWaitMs - (performance.now() - started);
            if (remaining <= 0)
              throw new BasisNotAvailable({ required: b, observed, replica: "the QLever replica", surface: "dependency-state", waitedMs: performance.now() - started });
            await broker.awaitReplica(b, remaining, "dependency-state");
          }
        } }));

  const resolveQueryBasis: BasisGate = Object.assign(
    async (requested: number | undefined) => {
      const started = performance.now();
      const b = await readBasis(undefined, requested, "datalog");
      return broker.openSnapshot(b, Math.max(0, basisWaitMs - (performance.now() - started)), "datalog");
    },
    {
      inTransaction: async (sourceK: number, requested?: number) =>
        broker.openSnapshot(await readBasis(sourceK, requested, "datalog"), basisWaitMs, "datalog"),
      after: (snapshot: ReplicaSnapshot) => broker.verifySnapshot(snapshot),
    },
  );

  return {
    supportedValueTypes: ["string", "number", "integer", "boolean", "datetime", "ref", "json", "blob"],
    broker,
    routes,
    resolveQueryBasis,
    sourceView: Effect.map(current, (state) => {
      if (!state) return undefined;
      // V-P2Q C1: only the Datalog executor reads this view, and its query is not confined to known entities,
      // so a transaction that used it is guarded scope-wide (any commit after sourceK conflicts).
      state.reads.scopeWide = true;
      // The executor inlines staged rows; give them A0's K+1.. positions so its basis tests behave as on A0.
      const local = new Map(state.placeholders.map((placeholder, i) => [placeholder, state.sourceK + 1 + i]));
      const pending = state.sourceK + Math.max(1, state.placeholders.length);
      return {
        sourcePosition: state.sourceK,
        pendingPosition: pending,
        rows: [...state.rows.values()].map((row) => ({
          ...row,
          recorded_position: local.get(row.recorded_position) ?? row.recorded_position,
          retracted_position:
            row.retracted_position === null ? null : (local.get(row.retracted_position) ?? row.retracted_position),
        })),
      };
    }),
    withTransaction,
    nextCommitPosition: () =>
      Effect.flatMap(required, (state) =>
        Effect.sync(() => {
          // RULINGS Q31c: nested transacts take consecutive ordinals in one frame; the broker binds them.
          const placeholder = -++placeholderCounter;
          state.placeholders.push(placeholder);
          return placeholder;
        }),
      ),
    currentCommitPosition: () =>
      Effect.flatMap(current, (state) => Effect.succeed(state ? state.sourceK : broker.head())),
    claimCommand: (id, txId, timestamp) =>
      Effect.flatMap(required, (state) =>
        Effect.sync(() => {
          const pending = state.claims.get(id);
          if (pending) return pending.txId;
          // Lost-ACK resolution from the broker's own record (C2), not from a QLever claim triple.
          const claimed = broker.claim(id);
          if (claimed) return claimed.txId;
          state.claims.set(id, { txId, timestamp });
          return null;
        }),
      ),
    insert,
    batchInsert: (inputs, txId, timestamp, ids, position) =>
      inputs.length !== ids.length
        ? Effect.fail(new WriteError({ message: "Assertion identity count mismatch" }))
        : Effect.forEach(inputs, (input, index) => insert(input, txId, timestamp, ids[index]!, position)),
    retract: (id, timestamp, txId, position) =>
      Effect.gen(function* () {
        const state = yield* required;
        const row = (yield* queryRows({}, undefined, false, id).pipe(
          Effect.mapError((cause) => new WriteError({ message: "Cannot read retraction target", cause })),
        ))[0];
        if (!row) return false;
        if (!state.rows.has(id)) state.priors.set(id, row);
        state.rows.set(id, { ...row, retracted_at: timestamp, retracted_position: position, retract_tx_id: txId });
        return true;
      }),
    getById: (id) => Effect.map(queryRows({}, undefined, false, id), (rows) => rows[0] ?? null),
    getByEntity: (entityId, basis) => queryRows({ entityId }, basis),
    getByEntities: (ids, basis) =>
      Effect.map(
        queryRows({}, basis, false, undefined, [...new Set(ids)]),
        (rows) => new Map([...new Set(ids)].map((id) => [id, rows.filter((row) => row.entity_id === id)])),
      ),
    query: (pattern, basis) => queryRows(pattern, basis),
    history: (entityId) => queryRows({ entityId }, undefined, true),
    dependencyState,
    initialize: () =>
      Effect.tryPromise({
        try: async () => {
          await client.query("SELECT ?s WHERE { ?s ?p ?o } LIMIT 1");
        },
        catch: (cause) =>
          new MigrationError({ version: 1, name: "qlever-native", message: "Cannot access QLever RDF server", cause }),
      }),
    close: () => Effect.void,
  };
};
