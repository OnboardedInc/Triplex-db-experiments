import { CanonicalEncodingError } from "../content/CanonicalJson.js";
import { CardinalityRule as CardinalityRule$1, Code as Code$1, ReferenceTargetRule as ReferenceTargetRule$1, RequiredRule as RequiredRule$1, Rule as Rule$1, UniqueRule as UniqueRule$1, Violation as Violation$1 } from "../Constraint.js";
import { TemporalBasis } from "../Temporal.js";
import { ReadError } from "../errors/index.js";
import { ConfigNode, DuplicateChildKeyError } from "./ConfigNode.js";
import { TriplesService } from "../store/Triples.js";
import { Effect, Schema } from "effect";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/config/GraphConstraint.d.ts
declare namespace GraphConstraint_d_exports {
  export { CardinalityRule, Code, Definition, DuplicateGraphConstraintError, InvalidGraphConstraintError, KIND, ReferenceTargetRule, RequiredRule, Rule, UniqueRule, Violation, cardinality, collect, enforcement, evaluate, parse, referenceTarget, required, unique };
}
declare const KIND = "graph-constraint";
type Code = Code$1;
type RequiredRule = RequiredRule$1;
type CardinalityRule = CardinalityRule$1;
type UniqueRule = UniqueRule$1;
type ReferenceTargetRule = ReferenceTargetRule$1;
type Rule = Rule$1;
interface Definition<R extends Rule = Rule> {
  readonly _tag: "GraphConstraint";
  readonly key: string;
  readonly rule: R;
  readonly node: Effect.Effect<ConfigNode, DuplicateChildKeyError | CanonicalEncodingError | Schema.SchemaError>;
}
type Violation = Omit<Violation$1, "actual" | "valueIdentity">;
declare const InvalidGraphConstraintError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "InvalidGraphConstraintError";
} & Readonly<A>;
declare class InvalidGraphConstraintError extends InvalidGraphConstraintError_base<{
  readonly key: string;
  readonly message: string;
}> {}
declare const DuplicateGraphConstraintError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "DuplicateGraphConstraintError";
} & Readonly<A>;
declare class DuplicateGraphConstraintError extends DuplicateGraphConstraintError_base<{
  readonly key: string;
  readonly message: string;
}> {}
declare const required: (entityType: string, attribute: string) => Definition<RequiredRule>;
declare const cardinality: (entityType: string, attribute: string, max: number) => Definition<CardinalityRule>;
declare const unique: (entityType: string, attribute: string) => Definition<UniqueRule>;
declare const referenceTarget: (entityType: string, attribute: string, targetEntityType: string) => Definition<ReferenceTargetRule>;
/** Build the plain transaction metadata payload for atomic enforcement. */
declare const enforcement: (definitions: ReadonlyArray<Definition>) => {
  readonly constraints: ReadonlyArray<Rule>;
};
declare const parse: (node: ConfigNode) => Effect.Effect<Rule, InvalidGraphConstraintError>;
/** Load and validate every independently versioned graph constraint in a config tree. */
declare const collect: (root: ConfigNode) => Effect.Effect<ReadonlyArray<Definition>, InvalidGraphConstraintError | DuplicateGraphConstraintError>;
/** Evaluate graph constraints at one bitemporal basis without mutating the store. */
declare const evaluate: (triples: TriplesService, definitions: ReadonlyArray<Definition>, basis?: TemporalBasis) => Effect.Effect<ReadonlyArray<Violation>, ReadError | CanonicalEncodingError>;
//#endregion
export { CardinalityRule, Code, Definition, DuplicateGraphConstraintError, GraphConstraint_d_exports, InvalidGraphConstraintError, KIND, ReferenceTargetRule, RequiredRule, Rule, UniqueRule, Violation, cardinality, collect, enforcement, evaluate, parse, referenceTarget, required, unique };
//# sourceMappingURL=GraphConstraint.d.ts.map