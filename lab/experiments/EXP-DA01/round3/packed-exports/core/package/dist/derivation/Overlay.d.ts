import { TripleInput } from "../Triple.js";
import { CanonicalEncodingError } from "../content/CanonicalJson.js";
import { DatalogQueryError, ReadError, WriteError } from "../errors/index.js";
import { ContentId } from "../content/ContentId.js";
import { TriplesService } from "../store/Triples.js";
import { CandidateConflictError, Definition, EvaluateOptions, Evaluation } from "./Derivation.js";
import { Effect, Schema } from "effect";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/derivation/Overlay.d.ts
declare namespace Overlay_d_exports {
  export { InvalidOverlayError, Overlay, OverlayError, UnsupportedOverlayDefinitionError, evaluateOverlay };
}
interface Overlay {
  /** Facts visible only to this evaluation. Omitted validFrom defaults to basis.validAt. */
  readonly assertions?: readonly TripleInput[];
  /** Visible base triple IDs to hide from this evaluation. */
  readonly retractions?: readonly string[];
}
declare const InvalidOverlayError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "InvalidDerivationOverlayError";
} & Readonly<A>;
declare class InvalidOverlayError extends InvalidOverlayError_base<{
  readonly message: string;
}> {}
declare const UnsupportedOverlayDefinitionError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "UnsupportedDerivationOverlayDefinitionError";
} & Readonly<A>;
declare class UnsupportedOverlayDefinitionError extends UnsupportedOverlayDefinitionError_base<{
  readonly definition: ContentId;
  readonly message: string;
}> {}
type OverlayError = ReadError | WriteError | DatalogQueryError | CandidateConflictError | CanonicalEncodingError | Schema.SchemaError | InvalidOverlayError | UnsupportedOverlayDefinitionError;
/**
 * Evaluate temporary assertions and retractions without writing to `triples`.
 *
 * The overlay copies only fixed attributes discovered from the definition into
 * a fresh in-memory indexed store, applies the patch, and delegates query
 * execution to the same KV Datalog evaluator used by the normal backend. Match
 * reads are translated back to original or deterministic hypothetical triples
 * so candidate provenance remains meaningful.
 */
declare const evaluateOverlay: (triples: TriplesService, definition: Definition, options: EvaluateOptions & {
  readonly overlay: Overlay;
}) => Effect.Effect<Evaluation, OverlayError>;
//#endregion
export { InvalidOverlayError, Overlay, OverlayError, Overlay_d_exports, UnsupportedOverlayDefinitionError, evaluateOverlay };
//# sourceMappingURL=Overlay.d.ts.map