import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { EntityId } from "../Branded.js";
import { encodeOrThrow } from "../content/CanonicalJson.js";
import { integer } from "../Value.js";
import { compile, normalize as normalize$1 } from "../config/TypeSchema.js";
import { EntityInputError, EntityShapeError } from "./Errors.js";
import { Effect, Option, Result, Schema } from "effect";
//#region src/entity/EntityCodec.ts
/**
* Entity codec: application input to typed fact values, and live facts to entity documents.
*
* [EXP-R01] Why: moved verbatim from `packages/http/src/EntityCodec.ts` so the http REST surface,
* the typed repository's ledger path and every projection fallback decode facts with one function
* and raise the same shape errors (R9 section 5.2). Errors are core-neutral; http maps them to its
* wire errors. Inspired by: packages/http/src/EntityCodec.ts@00a300d:1-234.
* Rejected: a second decoder in the repository (documents and errors would drift between paths).
*/
var EntityCodec_exports = /* @__PURE__ */ __exportAll({
	attributesSchema: () => attributesSchema,
	decodeInput: () => decodeInput,
	encodeEntity: () => encodeEntity,
	inputSchema: () => inputSchema,
	outputSchema: () => outputSchema
});
const requestError = (path, message) => new EntityInputError({
	path,
	message
});
const conflict = (entityId, path, message) => new EntityShapeError({
	entityId,
	path,
	message
});
const valueSchema = (attribute) => {
	const compiled = compile(attribute.type);
	const scalar = attribute.storage === "integer" ? compiled.annotate({ description: "Exact signed 64-bit integer. The value is canonical decimal text from -9223372036854775808 through 9223372036854775807; JSON numbers and noncanonical spellings are rejected." }) : compiled;
	return attribute.cardinality === "many" ? Schema.Array(scalar) : scalar;
};
const closedStruct = (fields) => Schema.StructWithRest(Schema.Struct(fields), [Schema.Record(Schema.Union([Schema.String, Schema.Symbol]), Schema.Unknown)]).check(Schema.isPropertyNames(Schema.Literals(Object.keys(fields))));
const attributesSchema = (entity) => {
	return closedStruct(Object.fromEntries(entity.attributes.map((attribute) => [attribute.key, attribute.required ? valueSchema(attribute) : Schema.optional(valueSchema(attribute))]))).annotate({ identifier: `${entity.entityType}Attributes` });
};
const inputSchema = (entity) => closedStruct({ attributes: attributesSchema(entity) }).annotate({ identifier: `${entity.entityType}Input` });
const outputSchema = (entity) => Schema.Struct({
	id: Schema.String,
	type: Schema.Literal(entity.entityType),
	attributes: attributesSchema(entity)
}).annotate({ identifier: entity.entityType });
const normalize = (attribute, value, path) => normalize$1(attribute.type, value).pipe(Effect.mapError((error) => requestError(path, error.message)), Effect.flatMap((normalized) => attribute.storage === "ref" ? EntityId.decode(normalized).pipe(Effect.mapError((error) => requestError(path, error.message))) : Effect.succeed(normalized)));
const tripleValue = (attribute, value) => {
	switch (attribute.storage) {
		case "string": return {
			type: "string",
			value
		};
		case "number": return {
			type: "number",
			value
		};
		case "integer": return integer(value.value);
		case "boolean": return {
			type: "boolean",
			value
		};
		case "datetime": return {
			type: "datetime",
			value
		};
		case "ref": return {
			type: "ref",
			value: EntityId.make(value)
		};
		case "json": return {
			type: "json",
			value
		};
	}
};
const canonical = (value) => encodeOrThrow(value);
const decodeInput = (entity, body) => Effect.gen(function* () {
	const record = (yield* Schema.decodeUnknownEffect(inputSchema(entity))(body).pipe(Effect.mapError((error) => requestError("$", error.message)))).attributes;
	const result = /* @__PURE__ */ new Map();
	for (const attribute of entity.attributes) {
		const raw = record[attribute.key];
		if (raw === void 0) continue;
		const values = attribute.cardinality === "many" ? raw : [raw];
		if (attribute.required && values.length === 0) return yield* requestError(`$.attributes[${JSON.stringify(attribute.key)}]`, "A required cardinality-many attribute must contain at least one value");
		const normalized = yield* Effect.forEach(values, (value, index) => normalize(attribute, value, `$.attributes[${JSON.stringify(attribute.key)}]${attribute.cardinality === "many" ? `[${index}]` : ""}`));
		const distinct = [...new Map(normalized.map((value) => [canonical(value), value])).entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => tripleValue(attribute, value));
		result.set(attribute, distinct);
	}
	if ([...result.values()].every((values) => values.length === 0)) return yield* requestError("$.attributes", "An entity must contain at least one application fact");
	return result;
});
const decodeStoredValue = (entityId, attribute, value) => {
	if (value.type !== attribute.storage) throw conflict(entityId, `$.attributes[${JSON.stringify(attribute.key)}]`, `Stored ${value.type} value is incompatible with configured ${attribute.storage} storage`);
	const raw = value.type === "integer" ? value : value.value;
	if (attribute.storage === "ref" && typeof raw === "string" && raw.length === 0) throw conflict(entityId, `$.attributes[${JSON.stringify(attribute.key)}]`, "Stored reference is not a valid entity ID");
	const decoded = Schema.decodeUnknownResult(compile(attribute.type))(raw);
	if (Result.isFailure(decoded)) throw conflict(entityId, `$.attributes[${JSON.stringify(attribute.key)}]`, `Stored value does not satisfy the configured type: ${decoded.failure.message}`);
	return decoded.success;
};
/** Materialize only declared attributes and reject ambiguous or incompatible stored state. */
const encodeEntity = (entity, facts) => Effect.try({
	try: () => {
		const entityId = facts[0]?.entityId ?? "";
		const memberships = new Set(facts.flatMap((fact) => Option.isSome(fact.entityType) ? [fact.entityType.value] : []));
		if (!memberships.has(entity.entityType)) throw conflict(entityId, "$.type", `Entity is not a ${entity.entityType}`);
		if ([...memberships].some((membership) => membership !== entity.entityType)) throw conflict(entityId, "$.type", "Mixed entity-type membership is not supported");
		const attributes = {};
		for (const descriptor of entity.attributes) {
			const values = facts.filter((fact) => fact.attribute === descriptor.key).map((fact) => decodeStoredValue(entityId, descriptor, fact.value));
			const distinct = [...new Map(values.map((value) => [canonical(value), value])).entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
			if (descriptor.cardinality === "one" && distinct.length > 1) throw conflict(entityId, `$.attributes[${JSON.stringify(descriptor.key)}]`, "A scalar attribute has multiple distinct live values");
			if (descriptor.required && distinct.length === 0) throw conflict(entityId, `$.attributes[${JSON.stringify(descriptor.key)}]`, "A required attribute is missing");
			if (distinct.length > 0) attributes[descriptor.key] = descriptor.cardinality === "many" ? distinct : distinct[0];
		}
		return {
			id: entityId,
			type: entity.entityType,
			attributes
		};
	},
	catch: (error) => error instanceof EntityShapeError ? error : conflict(facts[0]?.entityId ?? "", "$", String(error))
});
//#endregion
export { EntityCodec_exports, attributesSchema, decodeInput, encodeEntity, inputSchema, outputSchema };

//# sourceMappingURL=EntityCodec.js.map