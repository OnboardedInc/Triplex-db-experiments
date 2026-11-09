import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/entity/Errors.d.ts
declare const DescriptorCompileError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "DescriptorCompileError";
} & Readonly<A>;
/** A release cannot be compiled into entity descriptors. `kind` mirrors the two http errors. */
declare class DescriptorCompileError extends DescriptorCompileError_base<{
  readonly kind: "unsupported" | "conflict";
  readonly path: string;
  readonly message: string;
}> {}
declare const EntityInputError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "EntityInputError";
} & Readonly<A>;
/** Application input does not satisfy an entity descriptor. */
declare class EntityInputError extends EntityInputError_base<{
  readonly path: string;
  readonly message: string;
}> {}
declare const EntityShapeError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "EntityShapeError";
} & Readonly<A>;
/** Stored facts cannot be decoded as a document of the descriptor (type, membership, required). */
declare class EntityShapeError extends EntityShapeError_base<{
  readonly entityId: string;
  readonly path: string;
  readonly message: string;
}> {}
/** One conflicted (entity, attribute) pair: a cardinality-one attribute with distinct live values. */
interface ConflictedAttribute {
  readonly entityId: string;
  readonly entityType: string;
  readonly attribute: string;
  /** Number of distinct live values at the read basis (always at least 2). */
  readonly distinctValues: number;
}
declare const ConflictingValuesError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "ConflictingValuesError";
} & Readonly<A>;
/**
 * Frozen contract C5 (lab/PLAN.md section 4): a cardinality-one attribute with two or more
 * distinct live values at the basis. `get`/`getMany` fail with every conflicted entity and
 * attribute they touch; `find`, counts, ordering, includes and negation fail when an attribute
 * the query references is conflicted for any candidate. Equal duplicates are never a conflict.
 * There is no three-valued "unknown".
 */
declare class ConflictingValuesError extends ConflictingValuesError_base<{
  readonly conflicts: ReadonlyArray<ConflictedAttribute>;
  readonly message: string;
}> {}
declare const ProjectionSpecError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "ProjectionSpecError";
} & Readonly<A>;
/** A projection spec cannot be compiled; `inputs` names every colliding or offending input. */
declare class ProjectionSpecError extends ProjectionSpecError_base<{
  readonly reason: "column-collision" | "table-collision" | "reserved-name" | "reserved-namespace" | "invalid-name" | "unsupported-type" | "duplicate-entity-type" | "duplicate-attribute" | "attribute-type-conflict" | "unknown-ref-target" | "approximate-number" | "invalid-option";
  readonly inputs: ReadonlyArray<string>;
  readonly message: string;
}> {}
declare const InexactValueError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "InexactValueError";
} & Readonly<A>;
/**
 * A value (or coordinate, or entity id) that an engine's declared type cannot hold exactly.
 * [EXP-R01] Why: Sam's numeric rule (lab/SCOPE.md 2.4): a hard error, never silent conversion.
 * Lanes raise this instead of rounding, or keep the value ledger-only when the spec's
 * `inexactPolicy` is `ledger-only`.
 */
declare class InexactValueError extends InexactValueError_base<{
  readonly engine: "xtdb" | "rdf"; /** The `_tag` of the first exactness rule the value fails. */
  readonly rule: string; /** A lossless rendering of the offending value. */
  readonly value: string;
  readonly message: string;
}> {}
declare const NotImplementedError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "NotImplementedError";
} & Readonly<A>;
/**
 * [EXP-R01] Placeholder raised by behavior stubs. Planner, repository and writer behavior is
 * deferred to EXP-R02, which tests it against reviewed golden vectors (adversarial review round
 * 3, finding 5: no behavior before its contract and independent expected answers exist).
 */
declare class NotImplementedError extends NotImplementedError_base<{
  readonly feature: string;
  readonly message: string;
}> {}
declare const notImplemented: (feature: string) => NotImplementedError;
//#endregion
export { ConflictedAttribute, ConflictingValuesError, DescriptorCompileError, EntityInputError, EntityShapeError, InexactValueError, NotImplementedError, ProjectionSpecError, notImplemented };
//# sourceMappingURL=Errors.d.ts.map