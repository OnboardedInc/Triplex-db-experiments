import { Triple } from "../Triple.js";
import { TripleValue } from "../Value.js";
import { EntityInputError, EntityShapeError } from "./Errors.js";
import { AttributeDescriptor, EntityDescriptor } from "./Descriptors.js";
import { Effect, Schema } from "effect";

//#region src/entity/EntityCodec.d.ts
declare namespace EntityCodec_d_exports {
  export { EntityDocument, attributesSchema, decodeInput, encodeEntity, inputSchema, outputSchema };
}
interface EntityDocument {
  readonly id: string;
  readonly type: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}
declare const attributesSchema: (entity: EntityDescriptor) => Schema.Codec<unknown, unknown>;
declare const inputSchema: (entity: EntityDescriptor) => Schema.Codec<unknown, unknown>;
declare const outputSchema: (entity: EntityDescriptor) => Schema.Codec<unknown, unknown>;
declare const decodeInput: (entity: EntityDescriptor, body: unknown) => Effect.Effect<ReadonlyMap<AttributeDescriptor, ReadonlyArray<TripleValue>>, EntityInputError>;
/** Materialize only declared attributes and reject ambiguous or incompatible stored state. */
declare const encodeEntity: (entity: EntityDescriptor, facts: readonly Triple[]) => Effect.Effect<EntityDocument, EntityShapeError>;
//#endregion
export { EntityCodec_d_exports, EntityDocument, attributesSchema, decodeInput, encodeEntity, inputSchema, outputSchema };
//# sourceMappingURL=EntityCodec.d.ts.map