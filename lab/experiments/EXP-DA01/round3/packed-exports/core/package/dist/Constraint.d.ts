import { TransactOp, Triple } from "./Triple.js";
import { TripleValue } from "./Value.js";
import { CanonicalEncodingError } from "./content/CanonicalJson.js";
import { Effect, Schema } from "effect";

//#region src/Constraint.d.ts
declare namespace Constraint_d_exports {
  export { CardinalityRule, Code, FactLoader, ReferenceTargetRule, RequiredRule, Rule, RuleSchema, UniqueRule, Violation, ViolationAt, evaluateFacts, keyOf, loadRelevantFacts, newlyViolated, project, sameMutationValue };
}
type Code = "required" | "cardinality" | "unique" | "reference-target";
interface RequiredRule {
  readonly _tag: "Required";
  readonly v: 1;
  readonly entityType: string;
  readonly attribute: string;
}
interface CardinalityRule {
  readonly _tag: "Cardinality";
  readonly v: 1;
  readonly entityType: string;
  readonly attribute: string;
  readonly max: number;
}
interface UniqueRule {
  readonly _tag: "Unique";
  readonly v: 1;
  readonly entityType: string;
  readonly attribute: string;
}
interface ReferenceTargetRule {
  readonly _tag: "ReferenceTarget";
  readonly v: 1;
  readonly entityType: string;
  readonly attribute: string;
  readonly targetEntityType: string;
}
type Rule = RequiredRule | CardinalityRule | UniqueRule | ReferenceTargetRule;
declare const RuleSchema: Schema.Union<readonly [Schema.Struct<{
  readonly _tag: Schema.Literal<"Required">;
  readonly v: Schema.Literal<1>;
  readonly entityType: Schema.String;
  readonly attribute: Schema.String;
}>, Schema.Struct<{
  readonly _tag: Schema.Literal<"Cardinality">;
  readonly v: Schema.Literal<1>;
  readonly entityType: Schema.String;
  readonly attribute: Schema.String;
  readonly max: Schema.Number;
}>, Schema.Struct<{
  readonly _tag: Schema.Literal<"Unique">;
  readonly v: Schema.Literal<1>;
  readonly entityType: Schema.String;
  readonly attribute: Schema.String;
}>, Schema.Struct<{
  readonly _tag: Schema.Literal<"ReferenceTarget">;
  readonly v: Schema.Literal<1>;
  readonly entityType: Schema.String;
  readonly attribute: Schema.String;
  readonly targetEntityType: Schema.String;
}>]>;
interface Violation {
  readonly constraintKey: string;
  readonly code: Code;
  readonly subject: string;
  readonly entityType: string;
  readonly attribute: string;
  readonly path: string;
  readonly message: string;
  /** Number of observed values or claimants, used to distinguish repair from worsening. */
  readonly actual: number;
  /** Canonical identity of a value involved in uniqueness or reference validation. */
  readonly valueIdentity?: string;
}
interface ViolationAt extends Violation {
  readonly validAt: number;
}
interface FactLoader<E> {
  /** Load live-recorded rows that carry this entity type. */
  readonly byEntityType: (entityType: string) => Effect.Effect<readonly Triple[], E>;
  /** Batch-load every live-recorded fact for the selected entity IDs. */
  readonly byEntities: (entityIds: readonly string[]) => Effect.Effect<readonly Triple[], E>;
}
declare const keyOf: (rule: Rule) => string;
/**
 * Load only the current-recorded facts that can influence a rule set.
 *
 * Source type scans discover existing subjects, one batch expands those
 * subjects to their constrained attributes, and target type scans provide the
 * existence intervals needed by reference constraints. Assertions that create
 * a new source subject are included in the expansion before projection.
 */
declare const loadRelevantFacts: <E>(rules: readonly Rule[], operations: readonly TransactOp[], loader: FactLoader<E>) => Effect.Effect<readonly Triple[], E>;
/** Evaluate portable rules over one current-recorded fact set at a valid-time instant. */
declare const evaluateFacts: (facts: readonly Triple[], rules: readonly Rule[], validAt: number) => Effect.Effect<readonly Violation[], CanonicalEncodingError>;
/** Retraction uses stored value spelling; canonical uniqueness is a separate contract. */
declare const sameMutationValue: (left: TripleValue, right: TripleValue) => boolean;
/** Project a transaction onto live-recorded facts without mutating a backend. */
declare const project: (current: readonly Triple[], operations: readonly TransactOp[], instant: number) => Effect.Effect<readonly Triple[], CanonicalEncodingError>;
/**
 * Find constraints newly violated or worsened by a transaction at every
 * valid-time boundary represented by its post-state.
 */
declare const newlyViolated: (current: readonly Triple[], operations: readonly TransactOp[], rules: readonly Rule[], instant: number) => Effect.Effect<readonly ViolationAt[], CanonicalEncodingError>;
//#endregion
export { CardinalityRule, Code, Constraint_d_exports, FactLoader, ReferenceTargetRule, RequiredRule, Rule, RuleSchema, UniqueRule, Violation, ViolationAt, evaluateFacts, keyOf, loadRelevantFacts, newlyViolated, project, sameMutationValue };
//# sourceMappingURL=Constraint.d.ts.map