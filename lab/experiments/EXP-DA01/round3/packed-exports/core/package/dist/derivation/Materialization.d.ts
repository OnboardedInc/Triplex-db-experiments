import { EntityId } from "../Branded.js";
import { CanonicalEncodingError } from "../content/CanonicalJson.js";
import { CommandAlreadyCommittedError, ConstraintViolationError, DatalogQueryError, ReadError, TransactionConflictError, WriteError } from "../errors/index.js";
import { DatalogQuery } from "../datalog/schema.js";
import { ContentId } from "../content/ContentId.js";
import { TransactionResult, TriplesService } from "../store/Triples.js";
import { Candidate, CandidateConflictError, Definition, EvaluateOptions, Reconciliation } from "./Derivation.js";
import { Effect, Schema } from "effect";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/derivation/Materialization.d.ts
declare namespace Materialization_d_exports {
  export { CorruptMaterializationError, MaterializationError, MaterializationRun, MaterializationState, System, current, currentSourcePosition, entityId, materialize, runsQuery };
}
declare const System: {
  readonly prefix: "_triplex/derivation/";
  readonly entityType: {
    readonly candidate: "triplex.derivation-candidate";
    readonly run: "triplex.derivation-run";
  };
  readonly attribute: {
    readonly contentId: ":triplex/content-id";
    readonly name: ":triplex/derivation-name";
    readonly definition: ":triplex/derivation-definition";
    readonly configSnapshot: ":triplex/derivation-config-snapshot";
    readonly candidateId: ":triplex/derivation-candidate-id";
    readonly candidateBody: ":triplex/derivation-candidate-body";
    readonly runCandidate: ":triplex/derivation-run-candidate";
    readonly formatVersion: ":triplex/derivation-format-version";
    readonly sourcePosition: ":triplex/derivation-source-position";
    readonly validAt: ":triplex/derivation-valid-at";
    readonly recordedAt: ":triplex/derivation-recorded-at";
    readonly nextTemporalBoundary: ":triplex/derivation-next-temporal-boundary";
  };
};
declare const entityId: {
  candidate: (revision: ContentId) => EntityId;
  run: (id: ContentId) => EntityId;
};
interface MaterializationRun {
  readonly id: ContentId;
  readonly definitionId: ContentId;
  readonly configSnapshot: string;
  readonly sourcePosition: number;
  readonly basis: EvaluateOptions["basis"];
  readonly candidates: readonly Candidate[];
  readonly nextTemporalBoundary?: number;
  readonly reconciliation: Reconciliation;
  /** Undefined when this exact immutable run was already present. */
  readonly transaction: TransactionResult | undefined;
}
interface MaterializationState {
  readonly status: "current" | "stale" | "unmaterialized";
  readonly currentPosition: number;
  readonly sourcePosition?: number;
  readonly definitionId?: ContentId;
  readonly configSnapshot?: string;
  readonly basis?: EvaluateOptions["basis"];
  readonly candidates: readonly Candidate[];
  readonly nextTemporalBoundary?: number;
}
declare const CorruptMaterializationError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "CorruptDerivationMaterializationError";
} & Readonly<A>;
declare class CorruptMaterializationError extends CorruptMaterializationError_base<{
  readonly entityId: string;
  readonly message: string;
}> {}
type MaterializationError = ReadError | WriteError | TransactionConflictError | CommandAlreadyCommittedError | ConstraintViolationError | DatalogQueryError | CandidateConflictError | CorruptMaterializationError | CanonicalEncodingError | Schema.SchemaError;
/** Latest transaction position capable of changing this definition's answer. */
declare const currentSourcePosition: (triples: TriplesService, definition: Definition, basis?: EvaluateOptions["basis"]) => Effect.Effect<number, ReadError>;
/**
 * Persist one immutable evaluation checkpoint and return its diff from the
 * previously selected run for the same logical definition name.
 */
declare const materialize: (triples: TriplesService, definition: Definition, options: EvaluateOptions) => Effect.Effect<MaterializationRun, MaterializationError>;
/** Last durable candidates plus an explicit freshness verdict. */
declare const current: (triples: TriplesService, definition: Definition, options: EvaluateOptions) => Effect.Effect<MaterializationState, ReadError | CorruptMaterializationError | CanonicalEncodingError | Schema.SchemaError>;
/** Query all immutable run/candidate memberships for auditing or composition. */
declare const runsQuery: (name: string) => DatalogQuery;
//#endregion
export { CorruptMaterializationError, MaterializationError, MaterializationRun, MaterializationState, Materialization_d_exports, System, current, currentSourcePosition, entityId, materialize, runsQuery };
//# sourceMappingURL=Materialization.d.ts.map