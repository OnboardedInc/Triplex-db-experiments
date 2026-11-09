import { EntityId, TripleId } from "../Branded.js";
import { TransactOp } from "../Triple.js";
import { TemporalBasis } from "../Temporal.js";
import { CommandAlreadyCommittedError, ConstraintViolationError, PaginationCursorError, ReadError, TransactionConflictError, WriteError } from "../errors/index.js";
import { TransactionMeta, TransactionResult, Triples } from "../store/Triples.js";
import { Rule } from "../config/GraphConstraint.js";
import { ConflictingValuesError, EntityShapeError } from "./Errors.js";
import { Doc, Expanded, Include, Input, InputOf, Model, Models, OutputOf, Patch, Where } from "./Model.js";
import { Effect } from "effect";

//#region src/entity/Repository.d.ts
declare namespace Repository_d_exports {
  export { CommitError, CommitMeta, FindArgs, Page, Repository, RepositoryOptions, RepositoryReadError, ResolvedBasis, TimelineEntry, ValidTime, WritePlan, Writer, commit, make, writer };
}
/** The cut a read actually used. */
interface ResolvedBasis {
  /** Recorded-time cut; absent for "latest". */
  readonly recordedAt?: number;
  /** Exact commit position, reported only when the read is known to be exactly that cut. */
  readonly recordedPosition?: number;
  readonly validAt: number;
}
interface FindArgs<M extends Model, I extends Include<M>> {
  readonly where?: Where<M>;
  readonly include?: I;
  /** Ascending by an attribute alias or the entity id. Defaults to `$id`. */
  readonly orderBy?: keyof M["attributes"] | "$id";
  readonly direction?: "asc" | "desc";
  /** Default 50, maximum 200 (as `entityPage`). */
  readonly limit?: number;
  /** Opaque; binds entity type, query, basis and position. */
  readonly cursor?: string;
}
interface Page<T> {
  readonly items: ReadonlyArray<T>;
  readonly nextCursor?: string;
  readonly basis: ResolvedBasis;
}
/** One assertion of one attribute with both clocks; the only read that shows intervals. */
interface TimelineEntry<V> {
  readonly id: TripleId;
  readonly value: V;
  readonly validFrom: number;
  readonly validTo?: number;
  readonly recordedAt: number;
  readonly retractedAt?: number;
  readonly txId?: string;
}
/** Errors a repository read can fail with. */
type RepositoryReadError = ReadError | PaginationCursorError | ConflictingValuesError | EntityShapeError;
interface Repository<M extends Model, All extends Models = {}> {
  readonly model: M;
  /** A closed view: every later read uses this basis and cannot drift to "now". */
  readonly at: (basis: TemporalBasis) => Repository<M, All>;
  /** `undefined` when the entity is not a member of the model's type at the basis. */
  readonly get: <const I extends Include<M> = {}>(id: EntityId | string, options?: {
    readonly include?: I;
  }) => Effect.Effect<Expanded<M, All, I> | undefined, RepositoryReadError>;
  /** One batched read; preserves input order and missing entries. */
  readonly getMany: (ids: ReadonlyArray<EntityId | string>) => Effect.Effect<ReadonlyArray<Doc<M> | undefined>, RepositoryReadError>;
  readonly find: <const I extends Include<M> = {}>(args?: FindArgs<M, I>) => Effect.Effect<Page<Expanded<M, All, I>>, RepositoryReadError>;
  readonly count: (where?: Where<M>) => Effect.Effect<number, RepositoryReadError>;
  readonly timeline: <K extends keyof M["attributes"]>(id: EntityId | string, attribute: K) => Effect.Effect<ReadonlyArray<TimelineEntry<OutputOf<M["attributes"][K]>>>, ReadError>;
}
interface RepositoryOptions<All extends Models> {
  /** Models available as `include` targets, keyed by entity type name. */
  readonly models?: All;
}
/** Build a repository for `model` over the `Triples` service. Deferred to EXP-R02. */
declare const make: <M extends Model, All extends Models = {}>(model: M, _options?: RepositoryOptions<All>) => Effect.Effect<Repository<M, All>, never, Triples>;
interface ValidTime {
  readonly validFrom?: number;
  readonly validTo?: number;
}
/** Operations plus the preconditions they were built against; merged and sent by `commit`. */
interface WritePlan {
  readonly ops: ReadonlyArray<TransactOp>;
  readonly preconditions: NonNullable<TransactionMeta["preconditions"]>;
}
type AttributeValue<M extends Model, K extends keyof M["attributes"]> = InputOf<M["attributes"][K]>;
interface Writer<M extends Model> {
  readonly model: M;
  /** Pure: assert every supplied attribute, tagged with the model's entity type. */
  readonly create: (id: EntityId | string, input: Input<M>, time?: ValidTime) => WritePlan;
  /** Reads live fact ids to retract replaced values; preconditions pin that read. */
  readonly patch: (id: EntityId | string, patch: Patch<M>, time?: ValidTime) => Effect.Effect<WritePlan, ReadError, Triples>;
  /** Pure: assert one more value of an attribute. */
  readonly addValue: <K extends keyof M["attributes"]>(id: EntityId | string, attribute: K, value: AttributeValue<M, K>, time?: ValidTime) => WritePlan;
  /** Retract every live assertion of one value (all supports). */
  readonly removeValue: <K extends keyof M["attributes"]>(id: EntityId | string, attribute: K, value: AttributeValue<M, K>) => Effect.Effect<WritePlan, ReadError, Triples>;
}
/** Build a writer for `model`. Deferred to EXP-R02. */
declare const writer: <M extends Model>(model: M) => Writer<M>;
interface CommitMeta {
  readonly actor: string;
  readonly commandId: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  /** Pins `configSnapshot` and derives `enforce` from the same release. */
  readonly release?: {
    readonly snapshotId: string;
    readonly constraints: ReadonlyArray<Rule>;
  };
}
type CommitError = WriteError | ReadError | TransactionConflictError | CommandAlreadyCommittedError | ConstraintViolationError;
/** Merge plans and perform exactly one `Triples.transact`. Deferred to EXP-R02. */
declare const commit: (_plans: ReadonlyArray<WritePlan>, _meta: CommitMeta) => Effect.Effect<TransactionResult, CommitError, Triples>;
//#endregion
export { CommitError, CommitMeta, FindArgs, Page, Repository, RepositoryOptions, RepositoryReadError, Repository_d_exports, ResolvedBasis, TimelineEntry, ValidTime, WritePlan, Writer, commit, make, writer };
//# sourceMappingURL=Repository.d.ts.map