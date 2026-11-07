/**
 * Typed repository and writer over the public `Triples` service.
 *
 * [EXP-R01] Why: an application declares EntityTypes once and gets `Repository<Model>` and
 * `Writer<Model>`, correct on every backend because they use only the public `Triples` service
 * (KV first). Lane-specific projection readers come later and must match this behavior.
 * Inspired by: lab/research/R3-artifacts/api-sketch.ts sections 3-4; R3 report section 5;
 * docs/agents.md rule 1 (one application command is one `transact`).
 * Rejected: caller-asserted row generics; `null` for absent values (D5).
 *
 * Status: interface only. Every behavior is deferred to EXP-R02, which tests it against reviewed
 * golden vectors (adversarial review round 3, finding 5). Effectful stubs die with
 * `NotImplementedError`; pure stubs throw it.
 */
import { Effect } from "effect";

import type { EntityId } from "../Branded.js";
import type * as GraphConstraint from "../config/GraphConstraint.js";
import type {
  CommandAlreadyCommittedError,
  ConstraintViolationError,
  PaginationCursorError,
  ReadError,
  TransactionConflictError,
  WriteError,
} from "../errors/index.js";
import type { TemporalBasis } from "../Temporal.js";
import type { TransactOp, TripleId } from "../Triple.js";
import type { TransactionMeta, TransactionResult, Triples } from "../store/Triples.js";
import type { ConflictingValuesError, EntityShapeError } from "./Errors.js";
import { notImplemented } from "./Errors.js";
import type {
  Doc,
  Expanded,
  Include,
  Input,
  InputOf,
  Model,
  Models,
  OutputOf,
  Patch,
  Where,
} from "./Model.js";

/** The cut a read actually used. */
export interface ResolvedBasis {
  /** Recorded-time cut; absent for "latest". */
  readonly recordedAt?: number;
  /** Exact commit position, reported only when the read is known to be exactly that cut. */
  readonly recordedPosition?: number;
  readonly validAt: number;
}

export interface FindArgs<M extends Model, I extends Include<M>> {
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

export interface Page<T> {
  readonly items: ReadonlyArray<T>;
  readonly nextCursor?: string;
  readonly basis: ResolvedBasis;
}

/** One assertion of one attribute with both clocks; the only read that shows intervals. */
export interface TimelineEntry<V> {
  readonly id: TripleId;
  readonly value: V;
  readonly validFrom: number;
  readonly validTo?: number;
  readonly recordedAt: number;
  readonly retractedAt?: number;
  readonly txId?: string;
}

/** Errors a repository read can fail with. */
export type RepositoryReadError =
  | ReadError
  | PaginationCursorError
  | ConflictingValuesError
  | EntityShapeError;

export interface Repository<M extends Model, All extends Models = {}> {
  readonly model: M;
  /** A closed view: every later read uses this basis and cannot drift to "now". */
  readonly at: (basis: TemporalBasis) => Repository<M, All>;
  /** `undefined` when the entity is not a member of the model's type at the basis. */
  readonly get: <const I extends Include<M> = {}>(
    id: EntityId | string,
    options?: { readonly include?: I },
  ) => Effect.Effect<Expanded<M, All, I> | undefined, RepositoryReadError>;
  /** One batched read; preserves input order and missing entries. */
  readonly getMany: (
    ids: ReadonlyArray<EntityId | string>,
  ) => Effect.Effect<ReadonlyArray<Doc<M> | undefined>, RepositoryReadError>;
  readonly find: <const I extends Include<M> = {}>(
    args?: FindArgs<M, I>,
  ) => Effect.Effect<Page<Expanded<M, All, I>>, RepositoryReadError>;
  readonly count: (where?: Where<M>) => Effect.Effect<number, RepositoryReadError>;
  readonly timeline: <K extends keyof M["attributes"]>(
    id: EntityId | string,
    attribute: K,
  ) => Effect.Effect<ReadonlyArray<TimelineEntry<OutputOf<M["attributes"][K]>>>, ReadError>;
}

export interface RepositoryOptions<All extends Models> {
  /** Models available as `include` targets, keyed by entity type name. */
  readonly models?: All;
}

/** Build a repository for `model` over the `Triples` service. Deferred to EXP-R02. */
export const make = <M extends Model, All extends Models = {}>(
  model: M,
  _options: RepositoryOptions<All> = {},
): Effect.Effect<Repository<M, All>, never, Triples> =>
  Effect.succeed(stubRepository<M, All>(model));

const die = (feature: string) => Effect.die(notImplemented(feature));

const stubRepository = <M extends Model, All extends Models>(model: M): Repository<M, All> => ({
  model,
  at: () => stubRepository<M, All>(model),
  get: () => die("Repository.get"),
  getMany: () => die("Repository.getMany"),
  find: () => die("Repository.find"),
  count: () => die("Repository.count"),
  timeline: () => die("Repository.timeline"),
});

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface ValidTime {
  readonly validFrom?: number;
  readonly validTo?: number;
}

/** Operations plus the preconditions they were built against; merged and sent by `commit`. */
export interface WritePlan {
  readonly ops: ReadonlyArray<TransactOp>;
  readonly preconditions: NonNullable<TransactionMeta["preconditions"]>;
}

type AttributeValue<M extends Model, K extends keyof M["attributes"]> = InputOf<M["attributes"][K]>;

export interface Writer<M extends Model> {
  readonly model: M;
  /** Pure: assert every supplied attribute, tagged with the model's entity type. */
  readonly create: (id: EntityId | string, input: Input<M>, time?: ValidTime) => WritePlan;
  /** Reads live fact ids to retract replaced values; preconditions pin that read. */
  readonly patch: (
    id: EntityId | string,
    patch: Patch<M>,
    time?: ValidTime,
  ) => Effect.Effect<WritePlan, ReadError, Triples>;
  /** Pure: assert one more value of an attribute. */
  readonly addValue: <K extends keyof M["attributes"]>(
    id: EntityId | string,
    attribute: K,
    value: AttributeValue<M, K>,
    time?: ValidTime,
  ) => WritePlan;
  /** Retract every live assertion of one value (all supports). */
  readonly removeValue: <K extends keyof M["attributes"]>(
    id: EntityId | string,
    attribute: K,
    value: AttributeValue<M, K>,
  ) => Effect.Effect<WritePlan, ReadError, Triples>;
}

/** Build a writer for `model`. Deferred to EXP-R02. */
export const writer = <M extends Model>(model: M): Writer<M> => ({
  model,
  create: () => {
    throw notImplemented("Writer.create");
  },
  patch: () => die("Writer.patch"),
  addValue: () => {
    throw notImplemented("Writer.addValue");
  },
  removeValue: () => die("Writer.removeValue"),
});

export interface CommitMeta {
  readonly actor: string;
  readonly commandId: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  /** Pins `configSnapshot` and derives `enforce` from the same release. */
  readonly release?: {
    readonly snapshotId: string;
    readonly constraints: ReadonlyArray<GraphConstraint.Rule>;
  };
}

export type CommitError =
  | WriteError
  | ReadError
  | TransactionConflictError
  | CommandAlreadyCommittedError
  | ConstraintViolationError;

/** Merge plans and perform exactly one `Triples.transact`. Deferred to EXP-R02. */
export const commit = (
  _plans: ReadonlyArray<WritePlan>,
  _meta: CommitMeta,
): Effect.Effect<TransactionResult, CommitError, Triples> => die("commit");
