/**
 * `@triplex-build/triplex/entity`: the engine-independent entity core.
 *
 * - `Descriptors` and `EntityCodec`: release-to-descriptor compile and fact/document codec
 *   (moved from `packages/http`, behavior unchanged).
 * - `ProjectionSpec` and `PhysicalNames`: the content-addressed projection spec compiler.
 * - `Plan`: the projection plan IR (planner deferred to EXP-R02).
 * - `Repository`, model types: the typed repository and writer surface (deferred to EXP-R02).
 */
export * as Descriptors from "./Descriptors.js";
export * as EntityCodec from "./EntityCodec.js";
export * as PhysicalNames from "./PhysicalNames.js";
export * as ProjectionSpec from "./ProjectionSpec.js";
export * as Plan from "./Plan.js";
export * as Repository from "./Repository.js";
export type {
  AnyHandle,
  Doc,
  Expanded,
  Include,
  Input,
  Model,
  Models,
  Patch,
  Predicate,
  Where,
} from "./Model.js";
export {
  ConflictingValuesError,
  DescriptorCompileError,
  EntityInputError,
  EntityShapeError,
  NotImplementedError,
  ProjectionSpecError,
  type ConflictedAttribute,
} from "./Errors.js";
