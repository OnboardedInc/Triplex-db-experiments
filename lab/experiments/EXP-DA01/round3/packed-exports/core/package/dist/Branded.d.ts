import { Schema } from "effect";
import * as _$effect_Brand0 from "effect/Brand";
import * as _$effect_Effect0 from "effect/Effect";

//#region src/Branded.d.ts
declare const TripleIdSchema: Schema.brand<Schema.String, "TripleId">;
declare const TripleId: Schema.brand<Schema.String, "TripleId"> & {
  decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
};
type TripleId = typeof TripleIdSchema.Type;
declare const EntityIdSchema: Schema.brand<Schema.String, "EntityId">;
declare const EntityId: Schema.brand<Schema.String, "EntityId"> & {
  decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
};
type EntityId = typeof EntityIdSchema.Type;
declare const Attribute: Schema.brand<Schema.String, "Attribute">;
type Attribute = typeof Attribute.Type;
declare const DatabaseIdSchema: Schema.brand<Schema.String, "DatabaseId">;
declare const DatabaseId: Schema.brand<Schema.String, "DatabaseId"> & {
  decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"DatabaseId">, Schema.SchemaError, never>;
};
type DatabaseId = typeof DatabaseIdSchema.Type;
declare const TransactionIdSchema: Schema.brand<Schema.brand<Schema.String, "EntityId">, "TransactionId">;
declare const TransactionId: Schema.brand<Schema.brand<Schema.String, "EntityId">, "TransactionId"> & {
  decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId"> & _$effect_Brand0.Brand<"TransactionId">, Schema.SchemaError, never>;
};
type TransactionId = typeof TransactionIdSchema.Type;
declare const decode: {
  tripleId: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
  entityId: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  attribute: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"Attribute">, Schema.SchemaError, never>;
  databaseId: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"DatabaseId">, Schema.SchemaError, never>;
  transactionId: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId"> & _$effect_Brand0.Brand<"TransactionId">, Schema.SchemaError, never>;
};
declare const unsafe: {
  tripleId: (s: string) => string & _$effect_Brand0.Brand<"TripleId">;
  entityId: (s: string) => string & _$effect_Brand0.Brand<"EntityId">;
  attribute: (s: string) => string & _$effect_Brand0.Brand<"Attribute">;
  databaseId: (s: string) => string & _$effect_Brand0.Brand<"DatabaseId">;
  transactionId: (s: string) => string & _$effect_Brand0.Brand<"EntityId"> & _$effect_Brand0.Brand<"TransactionId">;
};
//#endregion
export { Attribute, DatabaseId, EntityId, TransactionId, TripleId, decode, unsafe };
//# sourceMappingURL=Branded.d.ts.map