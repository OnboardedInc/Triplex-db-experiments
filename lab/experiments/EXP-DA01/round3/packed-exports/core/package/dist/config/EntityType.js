import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { any, list, optional, required, struct, text } from "./TypeExpr.js";
import { makeTyped } from "./ConfigNode.js";
import { KIND, assertion } from "./Attribute.js";
import { cardinality, referenceTarget, required as required$1, unique } from "./GraphConstraint.js";
import { ENTITY_SCHEMA_KIND } from "./EntityValidation.js";
import { Effect } from "effect";
//#region src/config/EntityType.ts
/** Ergonomic entity-type declarations compiled to content-addressed config nodes. */
var EntityType_exports = /* @__PURE__ */ __exportAll({ make: () => make });
const ENTITY_TYPE_NAME = /^[A-Z][A-Za-z0-9]*$/;
const RESERVED_PROPERTIES = new Set([
	"entityType",
	"schema",
	"node",
	"nodes",
	"attributes",
	"constraints"
]);
const DefinitionType = struct({
	entityType: required(text),
	type: required(any),
	attributes: required(any)
});
const make = (name, definition) => {
	if (!ENTITY_TYPE_NAME.test(name)) throw new TypeError(`Entity type identity must be PascalCase; received ${name}`);
	const fields = {};
	const handles = {};
	const usage = {};
	const definitions = /* @__PURE__ */ new Map();
	const constraints = [];
	for (const [property, attributeUse] of Object.entries(definition.attributes)) {
		if (RESERVED_PROPERTIES.has(property)) throw new TypeError(`Entity attribute alias ${property} is reserved by the EntityType API`);
		const attribute = attributeUse.attribute;
		if (definitions.has(attribute.key)) throw new TypeError(`Entity type ${name} uses ${attribute.key} more than once; one global attribute may have only one usage in an entity type`);
		const valueType = attributeUse.cardinality === "many" ? list(attribute.type) : attribute.type;
		fields[attribute.key] = attributeUse.required ? required(valueType) : optional(valueType);
		usage[property] = {
			attribute: attribute.key,
			required: attributeUse.required,
			cardinality: attributeUse.cardinality,
			unique: attributeUse.unique
		};
		definitions.set(attribute.key, attribute);
		handles[property] = {
			key: attribute.key,
			type: attribute.type,
			required: attributeUse.required,
			cardinality: attributeUse.cardinality,
			unique: attributeUse.unique,
			definition: attribute,
			assertion: (value, options) => assertion(attribute, value, options)
		};
		if (attributeUse.required) constraints.push(required$1(name, attribute.key));
		if (attributeUse.cardinality === "one") constraints.push(cardinality(name, attribute.key, 1));
		if (attributeUse.unique) constraints.push(unique(name, attribute.key));
		if (attribute.type._tag === "Ref") constraints.push(referenceTarget(name, attribute.key, attribute.type.kind));
	}
	const schema = struct(fields);
	const node = Effect.gen(function* () {
		const constraintNodes = yield* Effect.all(constraints.map((constraint) => constraint.node));
		return yield* makeTyped({
			kind: ENTITY_SCHEMA_KIND,
			key: name,
			type: DefinitionType,
			attrs: {
				entityType: name,
				type: schema,
				attributes: usage
			},
			children: constraintNodes.map((constraint) => ({
				rel: "constraint",
				node: constraint
			})),
			refs: [...definitions.values()].sort((left, right) => left.key.localeCompare(right.key)).map((attribute) => ({
				rel: "uses-attribute",
				kind: KIND,
				key: attribute.key
			}))
		});
	});
	return {
		entityType: name,
		schema,
		attributes: handles,
		constraints,
		node,
		nodes: Effect.all([...[...definitions.values()].sort((left, right) => left.key.localeCompare(right.key)).map((attribute) => attribute.node), node]),
		...handles
	};
};
//#endregion
export { EntityType_exports, make };

//# sourceMappingURL=EntityType.js.map