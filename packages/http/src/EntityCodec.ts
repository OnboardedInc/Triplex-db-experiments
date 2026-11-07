import type { Triple, TripleValue } from "@triplex-build/triplex";
import { EntityCodec } from "@triplex-build/triplex/entity";
import { Effect } from "effect";

import type { AttributeDescriptor, EntityDescriptor } from "./ConfigApi.js";
import { DataShapeConflictError, RequestValidationError } from "./Errors.js";

// [EXP-R01] Why: the codec moved to core (`@triplex-build/triplex/entity`) so the typed
// repository and the projection fallbacks decode with the same function. This module keeps the
// http surface and maps core's neutral errors to the http wire errors one to one.
// Inspired by: lab/research/R9-core-plumbing.md section 5.2.

export type EntityDocument = EntityCodec.EntityDocument;

export const attributesSchema = (entity: EntityDescriptor) => EntityCodec.attributesSchema(entity);
export const inputSchema = (entity: EntityDescriptor) => EntityCodec.inputSchema(entity);
export const outputSchema = (entity: EntityDescriptor) => EntityCodec.outputSchema(entity);

export const decodeInput = (
  entity: EntityDescriptor,
  body: unknown,
): Effect.Effect<
  ReadonlyMap<AttributeDescriptor, ReadonlyArray<TripleValue>>,
  RequestValidationError
> =>
  EntityCodec.decodeInput(entity, body).pipe(
    Effect.mapError(
      (error) =>
        new RequestValidationError({
          code: "invalid_request",
          path: error.path,
          message: error.message,
        }),
    ),
  );

/** Materialize only declared attributes and reject ambiguous or incompatible stored state. */
export const encodeEntity = (
  entity: EntityDescriptor,
  facts: readonly Triple[],
): Effect.Effect<EntityDocument, DataShapeConflictError> =>
  EntityCodec.encodeEntity(entity, facts).pipe(
    Effect.mapError(
      (error) =>
        new DataShapeConflictError({
          code: "data_shape_conflict",
          entityId: error.entityId,
          path: error.path,
          message: error.message,
        }),
    ),
  );
