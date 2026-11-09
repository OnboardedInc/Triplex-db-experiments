import { Data } from "effect";
//#region src/entity/Errors.ts
/**
* Engine-neutral errors of the `./entity` subpath.
*
* [EXP-R01] Why: the descriptor compiler and the entity codec moved here from
* `packages/http`, whose errors are HTTP-API classes with a wire `code`. Core keeps neutral
* errors with the same `path`/`message` payload and http maps them one to one, so the http
* wire behavior is unchanged. Inspired by: lab/research/R9-core-plumbing.md section 5.2.
*/
/** A release cannot be compiled into entity descriptors. `kind` mirrors the two http errors. */
var DescriptorCompileError = class extends Data.TaggedError("DescriptorCompileError") {};
/** Application input does not satisfy an entity descriptor. */
var EntityInputError = class extends Data.TaggedError("EntityInputError") {};
/** Stored facts cannot be decoded as a document of the descriptor (type, membership, required). */
var EntityShapeError = class extends Data.TaggedError("EntityShapeError") {};
/**
* Frozen contract C5 (lab/PLAN.md section 4): a cardinality-one attribute with two or more
* distinct live values at the basis. `get`/`getMany` fail with every conflicted entity and
* attribute they touch; `find`, counts, ordering, includes and negation fail when an attribute
* the query references is conflicted for any candidate. Equal duplicates are never a conflict.
* There is no three-valued "unknown".
*/
var ConflictingValuesError = class extends Data.TaggedError("ConflictingValuesError") {};
/** A projection spec cannot be compiled; `inputs` names every colliding or offending input. */
var ProjectionSpecError = class extends Data.TaggedError("ProjectionSpecError") {};
/**
* A value (or coordinate, or entity id) that an engine's declared type cannot hold exactly.
* [EXP-R01] Why: Sam's numeric rule (lab/SCOPE.md 2.4): a hard error, never silent conversion.
* Lanes raise this instead of rounding, or keep the value ledger-only when the spec's
* `inexactPolicy` is `ledger-only`.
*/
var InexactValueError = class extends Data.TaggedError("InexactValueError") {};
/**
* [EXP-R01] Placeholder raised by behavior stubs. Planner, repository and writer behavior is
* deferred to EXP-R02, which tests it against reviewed golden vectors (adversarial review round
* 3, finding 5: no behavior before its contract and independent expected answers exist).
*/
var NotImplementedError = class extends Data.TaggedError("NotImplementedError") {};
const notImplemented = (feature) => new NotImplementedError({
	feature,
	message: `EXP-R02: ${feature} is not implemented`
});
//#endregion
export { ConflictingValuesError, DescriptorCompileError, EntityInputError, EntityShapeError, InexactValueError, NotImplementedError, ProjectionSpecError, notImplemented };

//# sourceMappingURL=Errors.js.map