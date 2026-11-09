import { EntityId, TransactionId, TripleId } from "../Branded.js";
import { Triple } from "../Triple.js";
import { CanonicalEncodingError } from "../content/CanonicalJson.js";
import { TemporalBasis } from "../Temporal.js";
import { DatalogQueryError, ReadError } from "../errors/index.js";
import { Constant, DatalogQuery } from "../datalog/schema.js";
import { ContentId } from "../content/ContentId.js";
import { TypeExpr } from "../config/TypeExpr.js";
import { TriplesService } from "../store/Triples.js";
import { Effect, Schema } from "effect";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/derivation/Derivation.d.ts
declare const DefinitionError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "DerivationDefinitionError";
} & Readonly<A>;
declare class DefinitionError extends DefinitionError_base<{
  readonly message: string;
}> {}
declare const CandidateConflictError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "DerivationCandidateConflictError";
} & Readonly<A>;
declare class CandidateConflictError extends CandidateConflictError_base<{
  readonly definition: ContentId;
  readonly candidate: ContentId;
  readonly message: string;
}> {}
interface Definition {
  readonly name: string;
  readonly query: DatalogQuery;
  readonly identity: readonly string[];
  readonly output: readonly string[];
  readonly configSnapshot: string;
  readonly resultType?: TypeExpr;
  readonly dependencies: Dependencies;
  readonly id: ContentId;
}
interface Dependencies {
  readonly attributes: readonly string[];
  readonly entityTypes: readonly string[];
  readonly boundEntityIds: readonly string[];
  readonly hasDynamicAttributes: boolean;
}
interface DefinitionInput {
  readonly name: string;
  readonly query: DatalogQuery;
  /** Variables whose values form the stable candidate identity. */
  readonly identity: readonly string[];
  /** Public result variables. Defaults to variable terms in `query.find`. */
  readonly output?: readonly string[];
  readonly configSnapshot: string;
  /** Optional runtime type for the public result binding. */
  readonly resultType?: TypeExpr;
}
declare const make: (input: DefinitionInput) => Effect.Effect<Definition, DefinitionError | CanonicalEncodingError>;
interface SourceFact {
  readonly tripleId: TripleId;
  readonly transactionId?: TransactionId;
  readonly transactionPosition?: number;
  readonly entityId: EntityId;
  readonly attribute: string;
  readonly validFrom: number;
  readonly validTo?: number;
  /** True when the source exists only in a read-only hypothetical overlay. */
  readonly hypothetical?: boolean;
  /** Content commitment for a hypothetical fact input. */
  readonly hypotheticalContentId?: ContentId;
}
interface Candidate {
  /** Stable across provenance and output revisions for the same logical key. */
  readonly id: ContentId;
  /** Changes when the result or its explanation changes. */
  readonly revision: ContentId;
  readonly definitionId: ContentId;
  readonly configSnapshot: string;
  readonly identity: Readonly<Record<string, Constant | null>>;
  readonly result: Readonly<Record<string, Constant | null>>;
  readonly basis: TemporalBasis;
  readonly sources: readonly SourceFact[];
  readonly nextTemporalBoundary?: number;
}
interface Evaluation {
  readonly definition: Definition;
  readonly basis: TemporalBasis;
  readonly candidates: readonly Candidate[];
  /** Earliest valid-time instant at which this evaluation may change without a new transaction. */
  readonly nextTemporalBoundary?: number;
}
interface EvaluateOptions {
  /** Callers pin valid time so an evaluation can be replayed. */
  readonly basis: TemporalBasis & {
    readonly validAt: number;
  };
}
interface Reader extends Pick<TriplesService, "match" | "queryAll" | "transaction"> {
  /** Indexed freshness and temporal scheduling when backed by a full store. */
  readonly dependencyState?: TriplesService["dependencyState"];
  /** Ordered journal access enables discovery of future valid-time boundaries. */
  readonly transactions?: TriplesService["transactions"];
  /** Private views may provide their own bounded temporal schedule. */
  readonly temporalBoundary?: (definition: Definition, basis: EvaluateOptions["basis"]) => Effect.Effect<number | undefined, ReadError>;
  /** Optional provenance supplied by a private read view such as an overlay. */
  readonly sourceMetadata?: (triple: Triple) => {
    readonly hypothetical?: boolean;
    readonly hypotheticalContentId?: ContentId;
  };
}
declare const candidateIdentityId: (definitionName: string, identity: Readonly<Record<string, Constant | null>>) => ContentId;
declare const candidateRevisionId: (input: {
  readonly id: ContentId;
  readonly definitionId: ContentId;
  readonly configSnapshot: string;
  readonly result: Readonly<Record<string, Constant | null>>;
  readonly sources: readonly SourceFact[];
}) => ContentId;
declare const evaluate: (triples: Reader, definition: Definition, options: EvaluateOptions) => Effect.Effect<Evaluation, ReadError | DatalogQueryError | CanonicalEncodingError | Schema.SchemaError | CandidateConflictError>;
interface Reconciliation {
  readonly added: readonly Candidate[];
  readonly removed: readonly Candidate[];
  readonly changed: readonly {
    readonly before: Candidate;
    readonly after: Candidate;
  }[];
  readonly unchanged: readonly Candidate[];
}
declare const reconcile: (previous: readonly Candidate[], current: readonly Candidate[]) => Reconciliation;
//#endregion
export { Candidate, CandidateConflictError, Definition, DefinitionError, DefinitionInput, Dependencies, EvaluateOptions, Evaluation, Reader, Reconciliation, SourceFact, candidateIdentityId, candidateRevisionId, evaluate, make, reconcile };
//# sourceMappingURL=Derivation.d.ts.map