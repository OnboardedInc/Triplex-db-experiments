import { EntityId, TransactionId, TripleId } from "../Branded.js";
import { TransactOp, TransactionPrecondition, Triple, TripleInput } from "../Triple.js";
import { TripleValue } from "../Value.js";
import { Rule } from "../Constraint.js";
import { ReadBasis, TemporalBasis } from "../Temporal.js";
import { EntityPageCursor, EntityPageRequest, EntityPageSnapshot } from "../EntityPage.js";
import { CommandAlreadyCommittedError, ConstraintViolationError, DatalogQueryError, PaginationCursorError, ReadError, TransactionConflictError, WriteError } from "../errors/index.js";
import { DatalogQuery, WrappedQuery } from "../datalog/schema.js";
import { QueryDebugInfo, QueryMetrics, QueryPlan, QueryResult, WrappedQueryResult } from "../storage/QueryExecutor.js";
import { Pattern } from "../types/Pattern.js";
import { Context, Effect } from "effect";

//#region src/store/Triples.d.ts
/**
 * Transaction result containing the transaction ID, asserted triples, and retraction count
 */
interface TransactionResult {
  readonly txId: TransactionId;
  readonly position: number;
  readonly instant: number;
  readonly triples: readonly Triple[];
  readonly retracted: number;
}
/**
 * Transaction metadata options
 */
interface TransactionMeta {
  readonly actor?: string;
  /** Atomically unique idempotency identity within this Triplex database. */
  readonly commandId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly configSnapshot?: string;
  /**
   * Portable constraints to enforce against the transaction's complete
   * post-state. Hosts normally derive these from the pinned config snapshot.
   */
  readonly enforce?: {
    readonly constraints: readonly Rule[];
  };
  /**
   * Serialized transaction preconditions. `TripleLive` references must also
   * have a matching `retract` operation; `EntityState` compares the complete
   * observed live fact-ID set. A mismatch fails the whole transaction with
   * `TransactionConflictError`.
   */
  readonly preconditions?: readonly TransactionPrecondition[];
}
interface TransactionChange {
  readonly op: "assert" | "retract";
  readonly tripleId: TripleId;
  readonly entityId: EntityId;
  readonly attribute: string;
  /** Present on journals written by the bitemporal journal format. */
  readonly entityType?: string;
  /** The complete typed value, retained for assertions and retractions. */
  readonly value?: TripleValue;
  readonly validFrom?: number;
  readonly validTo?: number;
  readonly recordedAt?: number;
  readonly retractedAt?: number;
  readonly assertionTxId?: TransactionId;
  readonly retractionTxId?: TransactionId;
}
interface TransactionRecord {
  readonly txId: TransactionId;
  readonly position: number;
  readonly instant: number;
  readonly actor?: string;
  readonly commandId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly configSnapshot?: string;
  readonly changes: readonly TransactionChange[];
}
interface TransactionPageRequest {
  /** Return transactions strictly after this commit position. Defaults to 0. */
  readonly after?: number;
  /** Maximum number of transactions to return. Defaults to 100; maximum 1,000. */
  readonly limit?: number;
}
interface TransactionPage {
  readonly transactions: readonly TransactionRecord[];
  /** Position of the final returned transaction, suitable for the next `after`. */
  readonly next?: number;
}
interface EntityTransactionPageRequest {
  /** Maximum number of transactions to return. Defaults to 100; maximum 1,000. */
  readonly limit?: number;
  /** Commit-position snapshot returned by the first page. Omit on the first request. */
  readonly snapshotPosition?: number;
  /** Return transactions strictly before this position. */
  readonly beforePosition?: number;
}
interface EntityTransactionPage {
  readonly transactions: readonly TransactionRecord[];
  /** Commit position captured by the first page and required for stable continuation. */
  readonly snapshotPosition: number;
  /** Exclusive position boundary for the next page, when more results exist. */
  readonly nextBeforePosition?: number;
}
interface DependencyState {
  /** Latest assertion or retraction position for the selected attributes. */
  readonly sourcePosition: number;
  /** Earliest future valid-time edge in the selected attributes' recorded view. */
  readonly nextTemporalBoundary?: number;
}
interface EntityPage {
  /** Complete entity bodies, ordered by entity identity, all read from one exact commit cut. */
  readonly entities: readonly (readonly Triple[])[];
  readonly snapshot: EntityPageSnapshot;
  readonly nextCursor?: EntityPageCursor;
}
/**
 * Options accepted by the Datalog read methods.
 */
interface QueryOptions {
  /** Include debug metrics (generated SQL, timings, plan) in the response. */
  readonly debug?: boolean;
  /** Evaluate the complete query against one bitemporal basis. */
  readonly basis?: TemporalBasis;
  /** Return the exact resolved scope/position/time cut actually used by this read. */
  readonly includeBasis?: boolean;
}
/** Options for bounded Datalog reads. */
interface PagedQueryOptions extends QueryOptions {
  /** Defaults to 100; maximum 1,000. Independent of the query's logical limit. */
  readonly pageSize?: number;
  /** Opaque continuation returned by the previous call with the same query. */
  readonly cursor?: string;
}
/**
 * Response from a Datalog read. `queryAll` never includes a continuation.
 */
interface QueryResponse {
  readonly results: QueryResult;
  readonly nextCursor?: string;
  readonly debug?: QueryDebugInfo;
  readonly basis?: ReadBasis;
}
/**
 * Response from a paged Datalog query (`queryPage`): result bindings, optional
 * total count, and a cursor for the next page.
 */
type PagedQueryResponse = WrappedQueryResult;
/**
 * Result of explaining a query (compile without executing).
 */
interface ExplainResult {
  readonly queryPlan: QueryPlan;
  readonly metrics?: QueryMetrics;
}
interface TriplesService {
  readonly assert: (input: TripleInput) => Effect.Effect<Triple, WriteError>;
  readonly assertBatch: (inputs: readonly TripleInput[]) => Effect.Effect<readonly Triple[], WriteError>;
  readonly retract: (id: TripleId) => Effect.Effect<void, WriteError>;
  readonly retractByPattern: (pattern: Pattern) => Effect.Effect<number, WriteError | ReadError>;
  /** Group operations into a single atomic transaction with metadata. */
  readonly transact: (operations: readonly TransactOp[], meta?: TransactionMeta) => Effect.Effect<TransactionResult, WriteError | ReadError | TransactionConflictError | CommandAlreadyCommittedError | ConstraintViolationError>;
  /** Fetch a single triple by id. */
  readonly get: (id: TripleId) => Effect.Effect<Triple | null, ReadError>;
  /** Fetch all live triples for an entity. */
  readonly entity: (entityId: EntityId, basis?: TemporalBasis) => Effect.Effect<readonly Triple[], ReadError>;
  /** Batch entity materialization, preserving input order and missing entries. */
  readonly entities: (entityIds: readonly EntityId[], basis?: TemporalBasis) => Effect.Effect<readonly (readonly Triple[])[], ReadError>;
  readonly entityPage: (request: EntityPageRequest) => Effect.Effect<EntityPage, ReadError | PaginationCursorError>;
  /** Match triples against a pattern. */
  readonly match: (pattern: Pattern, basis?: TemporalBasis) => Effect.Effect<readonly Triple[], ReadError>;
  /** Full history (including retracted) for an entity. */
  readonly history: (entityId: EntityId) => Effect.Effect<readonly Triple[], ReadError>;
  /** Read a persisted causal transaction envelope and its fact changes. */
  readonly transaction: (txId: TransactionId) => Effect.Effect<TransactionRecord | null, ReadError>;
  /** Lookup the durable receipt for an atomically unique command ID. */
  readonly transactionByCommand: (commandId: string) => Effect.Effect<TransactionRecord | null, ReadError>;
  /** Read ordered transaction envelopes after a durable resume position. */
  readonly transactions: (request?: TransactionPageRequest) => Effect.Effect<TransactionPage, ReadError>;
  /** Read the authoritative journal entries that changed one entity, newest first. */
  readonly transactionsForEntity: (entityId: EntityId, request?: EntityTransactionPageRequest) => Effect.Effect<EntityTransactionPage, ReadError>;
  /** Latest committed backend position, including internal maintenance writes. */
  readonly currentPosition: () => Effect.Effect<number, ReadError>;
  /**
   * Indexed freshness and valid-time schedule for a fixed attribute dependency
   * set. An empty set has source position zero and no temporal boundary.
   */
  readonly dependencyState: (attributes: readonly string[], basis?: TemporalBasis) => Effect.Effect<DependencyState, ReadError>;
  /** Explicit complete Datalog read for trusted batch/internal processing. */
  readonly queryAll: (query: DatalogQuery, options?: QueryOptions) => Effect.Effect<QueryResponse, ReadError | DatalogQueryError>;
  /** Execute one bounded, snapshot-stable Datalog page (100 rows by default). */
  readonly query: (query: DatalogQuery, options?: PagedQueryOptions) => Effect.Effect<PagedQueryResponse, ReadError | DatalogQueryError | PaginationCursorError>;
  /** Execute a wrapped Datalog page (100 rows by default; maximum 1,000). */
  readonly queryPage: (query: WrappedQuery, options?: QueryOptions) => Effect.Effect<PagedQueryResponse, ReadError | DatalogQueryError | PaginationCursorError>;
  /** Explain a Datalog query without executing it. */
  readonly explain: (query: DatalogQuery) => Effect.Effect<ExplainResult, DatalogQueryError>;
  /** Explain a wrapped Datalog query without executing it. */
  readonly explainPage: (query: WrappedQuery) => Effect.Effect<ExplainResult, DatalogQueryError>;
}
declare const Triples_base: Context.ServiceClass<Triples, "triplex/Triples", TriplesService>;
/**
 * The `Triples` service tag.
 *
 * Namespaced so the bare id can't collide with another library's tag when they
 * share an Effect context.
 */
declare class Triples extends Triples_base {}
//#endregion
export { DependencyState, EntityPage, EntityTransactionPage, EntityTransactionPageRequest, ExplainResult, PagedQueryOptions, PagedQueryResponse, QueryOptions, QueryResponse, TransactionChange, TransactionMeta, TransactionPage, TransactionPageRequest, TransactionRecord, TransactionResult, Triples, TriplesService };
//# sourceMappingURL=Triples.d.ts.map