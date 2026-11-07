/**
 * Engine-neutral errors of the `./entity` subpath.
 *
 * [EXP-R01] Why: the descriptor compiler and the entity codec moved here from
 * `packages/http`, whose errors are HTTP-API classes with a wire `code`. Core keeps neutral
 * errors with the same `path`/`message` payload and http maps them one to one, so the http
 * wire behavior is unchanged. Inspired by: lab/research/R9-core-plumbing.md section 5.2.
 */
import { Data } from "effect";

/** A release cannot be compiled into entity descriptors. `kind` mirrors the two http errors. */
export class DescriptorCompileError extends Data.TaggedError("DescriptorCompileError")<{
  readonly kind: "unsupported" | "conflict";
  readonly path: string;
  readonly message: string;
}> {}

/** Application input does not satisfy an entity descriptor. */
export class EntityInputError extends Data.TaggedError("EntityInputError")<{
  readonly path: string;
  readonly message: string;
}> {}

/** Stored facts cannot be decoded as a document of the descriptor (type, membership, required). */
export class EntityShapeError extends Data.TaggedError("EntityShapeError")<{
  readonly entityId: string;
  readonly path: string;
  readonly message: string;
}> {}

/** One conflicted (entity, attribute) pair: a cardinality-one attribute with distinct live values. */
export interface ConflictedAttribute {
  readonly entityId: string;
  readonly entityType: string;
  readonly attribute: string;
  /** Number of distinct live values at the read basis (always at least 2). */
  readonly distinctValues: number;
}

/**
 * Frozen contract C5 (lab/PLAN.md section 4): a cardinality-one attribute with two or more
 * distinct live values at the basis. `get`/`getMany` fail with every conflicted entity and
 * attribute they touch; `find`, counts, ordering, includes and negation fail when an attribute
 * the query references is conflicted for any candidate. Equal duplicates are never a conflict.
 * There is no three-valued "unknown".
 */
export class ConflictingValuesError extends Data.TaggedError("ConflictingValuesError")<{
  readonly conflicts: ReadonlyArray<ConflictedAttribute>;
  readonly message: string;
}> {}

/** A projection spec cannot be compiled; `inputs` names every colliding or offending input. */
export class ProjectionSpecError extends Data.TaggedError("ProjectionSpecError")<{
  readonly reason:
    | "column-collision"
    | "table-collision"
    | "reserved-name"
    | "reserved-namespace"
    | "invalid-name"
    | "unsupported-type"
    | "duplicate-entity-type"
    | "duplicate-attribute"
    | "attribute-type-conflict"
    | "unknown-ref-target"
    | "approximate-number"
    | "invalid-option";
  readonly inputs: ReadonlyArray<string>;
  readonly message: string;
}> {}

/**
 * A value (or coordinate, or entity id) that an engine's declared type cannot hold exactly.
 * [EXP-R01] Why: Sam's numeric rule (lab/SCOPE.md 2.4): a hard error, never silent conversion.
 * Lanes raise this instead of rounding, or keep the value ledger-only when the spec's
 * `inexactPolicy` is `ledger-only`.
 */
export class InexactValueError extends Data.TaggedError("InexactValueError")<{
  readonly engine: "xtdb" | "rdf";
  /** The `_tag` of the first exactness rule the value fails. */
  readonly rule: string;
  /** A lossless rendering of the offending value. */
  readonly value: string;
  readonly message: string;
}> {}

/**
 * [EXP-R01] Placeholder raised by behavior stubs. Planner, repository and writer behavior is
 * deferred to EXP-R02, which tests it against reviewed golden vectors (adversarial review round
 * 3, finding 5: no behavior before its contract and independent expected answers exist).
 */
export class NotImplementedError extends Data.TaggedError("NotImplementedError")<{
  readonly feature: string;
  readonly message: string;
}> {}

export const notImplemented = (feature: string): NotImplementedError =>
  new NotImplementedError({ feature, message: `EXP-R02: ${feature} is not implemented` });
