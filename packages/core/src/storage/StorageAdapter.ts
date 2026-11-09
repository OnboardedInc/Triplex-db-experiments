/**
 * StorageAdapter - Backend-agnostic storage interface
 *
 * Abstracts low-level storage operations allowing different backends
 * (SQLite, PostgreSQL, Cloudflare DO, FoundationDB, etc.) to use
 * their optimal primitives.
 */

import { reachBy } from "../store/reach.js";
import { Context, Effect } from "effect";
import type { TripleInput, TripleRow, QueryPattern } from "./types.js";
import type { ResolvedTemporalBasis } from "../Temporal.js";
import { WriteError, ReadError, MigrationError, InvalidTripleError } from "../errors/index.js";
import type { DependencyState } from "../store/Triples.js";
import type { ValueType } from "../Value.js";
import type { TransactOp } from "../Triple.js";
import type { Rule as ConstraintRule, ViolationAt } from "../Constraint.js";

/**
 * StorageAdapterService - Backend-agnostic storage primitives
 */
export interface StorageAdapterService {
  // [EXP-QH1] Why: a columnar store can decode directly to Triples without a second row materialization.
  // Rejected: a new public pull API; undefined retains the normal read path, including transactions/history.
  readonly getEntityTriples?: (
    entityIds: readonly string[],
    basis: ResolvedTemporalBasis,
  ) => Effect.Effect<
    ReadonlyMap<string, readonly import("../Triple.js").Triple[]> | undefined,
    ReadError
  >;
  // [EXP-QH1-R3] Why: a store that can answer a whole subject pull in one operation skips the per-level kernel round trips.
  // Rejected: a required method (every other backend would need a fallback); undefined retains the per-level path, including
  // transactions and record-time cuts.
  readonly getReachTriples?: (
    root: string,
    basis: ResolvedTemporalBasis,
  ) => Effect.Effect<import("../store/Triples.js").ReachResult | undefined, ReadError>;
  // [EXP-QH1-R4] Why: a whole-pull read (Triples.reach) that falls back level by level must read every level at one exact record
  // position, captured once at its start. Whether the adapter has such a position to offer depends on the caller's transaction:
  // inside one, reads already use the transaction's snapshot and must still see its staged writes, which an explicit committed position
  // would hide (QLever, A0 staged K+n). undefined from the method means "do not pin"; an absent method means the same.
  // Rejected: always using currentCommitPosition (hides staged rows on adapters whose position is the pre-transaction one).
  // [EXP-DX1] Why: an atomic whole-pull adapter pins its own db in the single request.
  // Rejected: a separate position HTTP request before every atomic pull.
  readonly atomicReach?: boolean;
  readonly pullPosition?: () => Effect.Effect<number | undefined, ReadError>;
  /** Optional exact-snapshot policy, propagated to public repository reads. */
  readonly snapshotReadPolicy?: import("./ReadSurface.js").SnapshotReadPolicy;
  // [CX-A01-0314-R2] Why: missing composition domains must fail compilation. Rejected: optional domains (silently admitted broker values against memory limits).
  readonly valueDomain: import("../ValueDomain.js").ValueDomain;
  /** Optional query capability hint; valueDomain owns write admission. */
  readonly supportedValueTypes?: readonly ValueType[];
  /** Optional server-side equivalent of Constraint.newlyViolated. Undefined requests the portable fallback. */
  readonly validateConstraints?: (input: {
    readonly operations: readonly TransactOp[];
    readonly constraints: readonly ConstraintRule[];
    readonly instant: number;
  }) => Effect.Effect<readonly ViolationAt[] | undefined, ReadError | WriteError>;
  readonly withTransaction: <A, E>(
    effect: Effect.Effect<A, E>,
    options?: {
      readonly replaySafe?: boolean;
      readonly hint?: { readonly commandId?: string; readonly tripleIds?: readonly string[] };
    },
  ) => Effect.Effect<A, E | WriteError>;
  /** Allocate the next ordered commit position inside the current transaction. */
  readonly nextCommitPosition: () => Effect.Effect<number, WriteError>;
  /** Read the latest committed position for an exact read snapshot boundary. */
  readonly currentCommitPosition: () => Effect.Effect<number, ReadError>;
  /** Indexed projection freshness and valid-time scheduling for fixed attributes. */
  readonly dependencyState: (
    attributes: readonly string[],
    basis: ResolvedTemporalBasis,
  ) => Effect.Effect<DependencyState, ReadError>;
  /**
   * Atomically reserve a command idempotency identity inside the current
   * transaction. Returns the original transaction id when it was already
   * reserved, or `null` when this transaction acquired it.
   */
  readonly claimCommand: (
    commandId: string,
    transactionId: string,
    timestamp: number,
  ) => Effect.Effect<string | null, WriteError>;
  readonly insert: (
    input: TripleInput,
    txId: string | null,
    timestamp: number,
    id: string,
    position: number,
  ) => Effect.Effect<TripleRow, WriteError | InvalidTripleError>;
  readonly batchInsert: (
    inputs: readonly TripleInput[],
    txId: string,
    timestamp: number,
    ids: readonly string[],
    position: number,
  ) => Effect.Effect<readonly TripleRow[], WriteError | InvalidTripleError>;
  readonly retract: (
    id: string,
    timestamp: number,
    txId: string,
    position: number,
  ) => Effect.Effect<boolean, WriteError>;
  readonly getById: (id: string) => Effect.Effect<TripleRow | null, ReadError>;
  readonly getByEntity: (
    entityId: string,
    basis?: ResolvedTemporalBasis,
  ) => Effect.Effect<readonly TripleRow[], ReadError>;
  readonly getByEntities: (
    entityIds: readonly string[],
    basis?: ResolvedTemporalBasis,
  ) => Effect.Effect<ReadonlyMap<string, readonly TripleRow[]>, ReadError>;
  readonly query: (
    pattern: QueryPattern,
    basis?: ResolvedTemporalBasis,
  ) => Effect.Effect<readonly TripleRow[], ReadError>;
  readonly history: (entityId: string) => Effect.Effect<readonly TripleRow[], ReadError>;
  readonly initialize: () => Effect.Effect<void, MigrationError>;
  readonly close: () => Effect.Effect<void, unknown>;
}

/** SQL-only refinement used by SQL snapshot persistence, never required by a runtime. */
export interface SqlStorageAdapterService extends StorageAdapterService {
  readonly rawQuery: <T extends object>(
    sql: string,
    params: readonly unknown[],
  ) => Effect.Effect<readonly T[], ReadError>;
}

export const isSqlStorageAdapter = (
  adapter: StorageAdapterService,
): adapter is SqlStorageAdapterService =>
  "rawQuery" in adapter && typeof adapter.rawQuery === "function";

/**
 * StorageAdapter service tag for dependency injection
 */
export class StorageAdapter extends Context.Service<StorageAdapter, StorageAdapterService>()(
  "StorageAdapter",
) {
  // [EXP-DX1] Why: adapters reorder prefetches with the identical portable BFS.
  // Rejected: a second traversal implementation with drifting result order.
  static readonly reachBy = reachBy;
}
