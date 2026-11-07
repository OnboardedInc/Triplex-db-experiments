/**
 * `@triplex-build/triplex/entity`: the engine-independent entity core.
 *
 * - `Descriptors` and `EntityCodec`: release-to-descriptor compile and fact/document codec
 *   (moved from `packages/http`, behavior unchanged).
 */
export * as Descriptors from "./Descriptors.js";
export * as EntityCodec from "./EntityCodec.js";
export * as PhysicalNames from "./PhysicalNames.js";
export * as ProjectionSpec from "./ProjectionSpec.js";
export {
  ConflictingValuesError,
  DescriptorCompileError,
  EntityInputError,
  EntityShapeError,
  NotImplementedError,
  ProjectionSpecError,
  type ConflictedAttribute,
} from "./Errors.js";
