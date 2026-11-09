import { Attribute, EntityId, TransactionId, TripleId } from "./Branded.js";
import { RuleSchema } from "./Constraint.js";
import { TripleValue } from "./Value.js";
import { Schema } from "effect";
//#region src/Triple.ts
const TripleInput = Schema.Struct({
	entityId: EntityId,
	attribute: Schema.String,
	value: TripleValue,
	entityType: Schema.optional(Schema.String),
	createdBy: Schema.optional(Schema.String),
	validFrom: Schema.optional(Schema.Number),
	validTo: Schema.optional(Schema.Number)
});
const QueryRequest = Schema.Struct({
	entityId: Schema.optional(EntityId),
	attribute: Schema.optional(Schema.String),
	entityType: Schema.optional(Schema.String),
	value: Schema.optional(TripleValue)
});
const QueryAsOfRequest = Schema.Struct({
	entityId: Schema.optional(EntityId),
	attribute: Schema.optional(Schema.String),
	entityType: Schema.optional(Schema.String),
	value: Schema.optional(TripleValue),
	asOf: Schema.Number
});
const AssertTripleRequest = Schema.Union([TripleInput, Schema.Array(TripleInput)]);
const RetractResponse = Schema.Struct({ retracted: Schema.Number });
const TripleResponse = Schema.Struct({
	id: TripleId,
	entityId: EntityId,
	attribute: Schema.String,
	value: TripleValue,
	recordedAt: Schema.Number,
	validFrom: Schema.Number,
	validTo: Schema.NullOr(Schema.Number),
	createdBy: Schema.NullOr(Schema.String),
	retractedAt: Schema.NullOr(Schema.Number),
	entityType: Schema.NullOr(Schema.String),
	schemaVersion: Schema.NullOr(Schema.Number),
	txId: Schema.NullOr(TransactionId),
	retractTxId: Schema.NullOr(TransactionId)
});
const Triple = Schema.Struct({
	id: TripleId,
	entityId: EntityId,
	attribute: Attribute,
	value: TripleValue,
	recordedAt: Schema.Number,
	validFrom: Schema.Number,
	validTo: Schema.OptionFromOptional(Schema.Number),
	createdBy: Schema.OptionFromOptional(Schema.String),
	retractedAt: Schema.OptionFromOptional(Schema.Number),
	entityType: Schema.OptionFromOptional(Schema.String),
	schemaVersion: Schema.OptionFromOptional(Schema.Number),
	txId: Schema.OptionFromOptional(TransactionId),
	retractTxId: Schema.OptionFromOptional(TransactionId)
});
const TripleRow = Schema.Struct({
	id: Schema.String,
	entity_id: Schema.String,
	attribute: Schema.String,
	value_type: Schema.String,
	value_string: Schema.NullOr(Schema.String),
	value_number: Schema.NullOr(Schema.Number),
	value_boolean: Schema.NullOr(Schema.Number),
	value_datetime: Schema.NullOr(Schema.Number),
	value_json: Schema.NullOr(Schema.String),
	recorded_at: Schema.Number,
	recorded_position: Schema.Number,
	valid_from: Schema.Number,
	valid_to: Schema.NullOr(Schema.Number),
	created_by: Schema.NullOr(Schema.String),
	retracted_at: Schema.NullOr(Schema.Number),
	retracted_position: Schema.NullOr(Schema.Number),
	retract_tx_id: Schema.NullOr(Schema.String),
	entity_type: Schema.NullOr(Schema.String),
	schema_version: Schema.NullOr(Schema.Number),
	tx_id: Schema.NullOr(Schema.String)
});
const TransactAssertOp = Schema.Struct({
	op: Schema.Literal("assert"),
	entityId: EntityId,
	attribute: Schema.String,
	value: TripleValue,
	entityType: Schema.optional(Schema.String),
	createdBy: Schema.optional(Schema.String),
	validFrom: Schema.optional(Schema.Number),
	validTo: Schema.optional(Schema.Number)
});
const TransactRetractOp = Schema.Struct({
	op: Schema.Literal("retract"),
	id: TripleId
});
const TransactRetractPatternOp = Schema.Struct({
	op: Schema.Literal("retract-pattern"),
	pattern: QueryRequest
});
const TransactOp = Schema.Union([
	TransactAssertOp,
	TransactRetractOp,
	TransactRetractPatternOp
]);
const TripleLivePrecondition = Schema.Struct({
	_tag: Schema.Literal("TripleLive"),
	id: TripleId
});
const EntityStatePrecondition = Schema.Struct({
	_tag: Schema.Literal("EntityState"),
	entityId: EntityId,
	tripleIds: Schema.Array(TripleId)
});
const TransactionPrecondition = Schema.Union([TripleLivePrecondition, EntityStatePrecondition]);
const TransactRequest = Schema.Struct({
	operations: Schema.Array(TransactOp),
	meta: Schema.optional(Schema.Struct({
		actor: Schema.optional(Schema.String),
		commandId: Schema.optional(Schema.String),
		correlationId: Schema.optional(Schema.String),
		causationId: Schema.optional(Schema.String),
		configSnapshot: Schema.optional(Schema.String),
		enforce: Schema.optional(Schema.Struct({ constraints: Schema.Array(RuleSchema) })),
		preconditions: Schema.optional(Schema.Array(TransactionPrecondition))
	}))
});
const TransactResponse = Schema.Struct({
	txId: TransactionId,
	asserted: Schema.Array(TripleResponse),
	retracted: Schema.Number
});
const queryToPattern = (query) => ({
	...query.entityId !== void 0 && { entityId: query.entityId },
	...query.attribute !== void 0 && { attribute: query.attribute },
	...query.entityType !== void 0 && { entityType: query.entityType },
	...query.value !== void 0 && { value: query.value }
});
//#endregion
export { AssertTripleRequest, Attribute, EntityId, EntityStatePrecondition, QueryAsOfRequest, QueryRequest, RetractResponse, TransactAssertOp, TransactOp, TransactRequest, TransactResponse, TransactRetractOp, TransactRetractPatternOp, TransactionPrecondition, Triple, TripleId, TripleInput, TripleLivePrecondition, TripleResponse, TripleRow, queryToPattern };

//# sourceMappingURL=Triple.js.map