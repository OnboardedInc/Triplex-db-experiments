import { Schema } from "effect";
//#region src/Branded.ts
const TripleIdSchema = Schema.String.pipe(Schema.check(Schema.isPattern(/^[0-9A-Z]{26}$/)), Schema.brand("TripleId"));
const TripleId = Object.assign(TripleIdSchema, { decode: (s) => Schema.decodeEffect(TripleIdSchema)(s) });
const EntityIdSchema = Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.brand("EntityId"));
const EntityId = Object.assign(EntityIdSchema, { decode: (s) => Schema.decodeEffect(EntityIdSchema)(s) });
const Attribute = Schema.String.pipe(Schema.check(Schema.isPattern(/^:[a-zA-Z_][a-zA-Z0-9_-]*\/[a-zA-Z][a-zA-Z0-9_-]*$/)), Schema.brand("Attribute"), Schema.annotate({
	identifier: "Attribute",
	description: "Namespaced attribute name in format :namespace/attribute"
}));
const DatabaseIdSchema = Schema.String.pipe(Schema.check(Schema.isPattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/)), Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(64)), Schema.brand("DatabaseId"));
const DatabaseId = Object.assign(DatabaseIdSchema, { decode: (s) => Schema.decodeEffect(DatabaseIdSchema)(s) });
const TransactionIdSchema = EntityId.pipe(Schema.check(Schema.isPattern(/^_tx\/[0-9A-Z]{26}$/)), Schema.brand("TransactionId"));
const TransactionId = Object.assign(TransactionIdSchema, { decode: (s) => Schema.decodeEffect(TransactionIdSchema)(s) });
const decode = {
	tripleId: TripleId.decode,
	entityId: EntityId.decode,
	attribute: (s) => Schema.decodeEffect(Attribute)(s),
	databaseId: DatabaseId.decode,
	transactionId: TransactionId.decode
};
const unsafe = {
	tripleId: (s) => TripleId.make(s),
	entityId: (s) => EntityId.make(s),
	attribute: (s) => Schema.decodeSync(Attribute)(s),
	databaseId: (s) => DatabaseId.make(s),
	transactionId: (s) => TransactionId.make(s)
};
//#endregion
export { Attribute, DatabaseId, EntityId, TransactionId, TripleId, decode, unsafe };

//# sourceMappingURL=Branded.js.map