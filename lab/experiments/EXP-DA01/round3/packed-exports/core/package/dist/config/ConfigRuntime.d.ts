import { TripleValue } from "../Value.js";
import { TemporalBasis } from "../Temporal.js";
import { ReadError } from "../errors/index.js";
import { ContentId } from "../content/ContentId.js";
import { Triples } from "../store/Triples.js";
import { ConfigSnapshot } from "./InMemoryConfigStore.js";
import { ConfigStore, LoadError } from "./ConfigStore.js";
import { Clock as Clock$1 } from "./World.js";
import { Evaluation, Tampered } from "./Evaluate.js";
import { Effect } from "effect";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/config/ConfigRuntime.d.ts
declare namespace ConfigRuntime_d_exports {
  export { AmbiguousDecisionFactError, ConfigRuntimeError, Decision, EvaluateRefInput, TamperedDecision, UnknownConfigRefError, UnsupportedDecisionFactError, evaluate, verify };
}
declare const UnknownConfigRefError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "UnknownConfigRefError";
} & Readonly<A>;
declare class UnknownConfigRefError extends UnknownConfigRefError_base<{
  readonly ref: string;
  readonly message: string;
}> {}
declare const AmbiguousDecisionFactError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "AmbiguousDecisionFactError";
} & Readonly<A>;
declare class AmbiguousDecisionFactError extends AmbiguousDecisionFactError_base<{
  readonly entity: string;
  readonly attribute: string;
  readonly count: number;
  readonly message: string;
}> {}
declare const UnsupportedDecisionFactError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "UnsupportedDecisionFactError";
} & Readonly<A>;
declare class UnsupportedDecisionFactError extends UnsupportedDecisionFactError_base<{
  readonly entity: string;
  readonly attribute: string;
  readonly valueType: TripleValue["type"];
  readonly message: string;
}> {}
type ConfigRuntimeError = LoadError | ReadError | UnknownConfigRefError | AmbiguousDecisionFactError | UnsupportedDecisionFactError;
interface EvaluateRefInput {
  /** Git-style configuration ref, for example `live` or `test`. */
  readonly ref: string;
  /** Key of a rule node in the selected configuration release. */
  readonly rule: string;
  /** Entity substituted for `World.SUBJECT`. */
  readonly subject: string;
  readonly clock: Clock$1;
  /** Evaluate against facts visible at this bitemporal basis. Defaults to now. */
  readonly basis?: TemporalBasis;
}
interface Decision {
  /** Content identity of the release root, subject, and nested evaluation. */
  readonly cid: ContentId;
  readonly ref: string;
  readonly snapshotId: string;
  readonly snapshotRootCid: ConfigSnapshot["rootCid"];
  readonly subject: string;
  readonly evaluation: Evaluation;
}
interface TamperedDecision {
  readonly path: string;
  readonly claimed: ContentId;
  readonly actual: ContentId;
}
/**
 * Evaluate a deployed rule directly against temporal Triple facts.
 *
 * The returned envelope pins the release selected by the ref. The nested
 * evaluation remains independently verifiable with `Evaluate.verify` and
 * records content IDs for every config node and fact value it observed.
 */
declare const evaluate: (input: EvaluateRefInput) => Effect.Effect<Decision, ConfigRuntimeError, ConfigStore | Triples>;
/** Verify both the release-pinned decision envelope and its evaluation tree. */
declare const verify: (decision: Decision) => ReadonlyArray<TamperedDecision | Tampered>;
//#endregion
export { AmbiguousDecisionFactError, ConfigRuntimeError, ConfigRuntime_d_exports, Decision, EvaluateRefInput, TamperedDecision, UnknownConfigRefError, UnsupportedDecisionFactError, evaluate, verify };
//# sourceMappingURL=ConfigRuntime.d.ts.map