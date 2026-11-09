import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { boolean as boolean$1, datetime, integer as integer$1, number as number$1, ref as ref$1, string } from "../Value.js";
import { any, boolean as boolean$2, date as date$1, enumOf as enumOf$1, instant as instant$1, int64 as int64$1, integer as integer$2, number as number$2, ref as ref$2, required, struct, text as text$1 } from "./TypeExpr.js";
import { makeTyped } from "./ConfigNode.js";
//#region src/config/Attribute.ts
var Attribute_exports = /* @__PURE__ */ __exportAll({
	KIND: () => KIND,
	assertion: () => assertion,
	boolean: () => boolean,
	date: () => date,
	enumOf: () => enumOf,
	instant: () => instant,
	int64: () => int64,
	integer: () => integer,
	number: () => number,
	ref: () => ref,
	text: () => text,
	use: () => use
});
const KIND = "attribute";
const ATTRIBUTE_KEY = /^:[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$/;
const DefinitionType = struct({
	key: required(text$1),
	valueType: required(any)
});
const validateKey = (key) => {
	if (!ATTRIBUTE_KEY.test(key)) throw new TypeError(`Attribute identity must be a lowercase namespaced keyword such as :employer/name; received ${key}`);
	return key;
};
const make = (keyInput, type, encode, refs = []) => {
	const key = validateKey(keyInput);
	return {
		_tag: "Attribute",
		key,
		type,
		encode,
		node: makeTyped({
			kind: KIND,
			key,
			type: DefinitionType,
			attrs: {
				key,
				valueType: type
			},
			refs
		})
	};
};
const text = (key) => make(key, text$1, string);
const number = (key) => make(key, number$2, number$1);
const integer = (key) => make(key, integer$2, number$1);
/** Exact integers use their tagged lossless public value, separately from legacy JS integers. */
const int64 = (key) => make(key, int64$1, (value) => integer$1(value.value));
const boolean = (key) => make(key, boolean$2, boolean$1);
const date = (key) => make(key, date$1, string);
const instant = (key) => make(key, instant$1, datetime);
const enumOf = (key, values) => make(key, enumOf$1(values), (value) => string(value));
/** A relation attribute whose values are entity ids of `target`. */
const ref = (key, target) => ({
	...make(key, ref$2(target.entityType), ref$1, [{
		rel: "references-entity-type",
		kind: "entity-schema",
		key: target.entityType
	}]),
	refTarget: target.entityType
});
/** Requiredness and cardinality belong to an entity's use, not the global attribute. */
const use = (attribute, options) => ({
	_tag: "AttributeUse",
	attribute,
	required: options?.required ?? false,
	cardinality: options?.cardinality ?? "one",
	unique: options?.unique ?? false
});
const assertion = (definition, value, options = {}) => {
	if (options.validFrom !== void 0 && !Number.isFinite(options.validFrom)) throw new TypeError("validFrom must be a finite epoch-millisecond value");
	return {
		attribute: definition.key,
		value: definition.encode(value),
		...options.validFrom !== void 0 && { validFrom: options.validFrom }
	};
};
//#endregion
export { Attribute_exports, KIND, assertion, boolean, date, enumOf, instant, int64, integer, number, ref, text, use };

//# sourceMappingURL=Attribute.js.map