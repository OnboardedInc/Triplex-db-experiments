import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { encodeOrThrow } from "../content/CanonicalJson.js";
import { Domain, hash } from "../content/ContentId.js";
import { IntegerValue } from "../Value.js";
import { Schema } from "effect";
//#region src/config/TypeExpr.ts
/**
* The type algebra: attribute and entity types as *data*, not as code.
*
* `SchemaId` content-addresses an Effect Schema by hashing what
* `JSONSchema.make` emits. That works, but it has two defects this module
* exists to remove.
*
* First, identity is borrowed. Upgrading `effect` can move every id in the
* store while not one type has changed, because the bytes being hashed are
* someone else's serializer output. For a system of record that is not a
* caveat, it is a bug.
*
* Second, and more fundamentally: an Effect Schema is executable TypeScript,
* while Triplex configuration must also represent types authored dynamically.
* Making that type language explicit turns runtime schema declarations into
* ordinary content-addressed values that can be versioned, diffed, and deployed
* by the same machinery as every other config node.
*
* The algebra is deliberately small and closed. That is what makes
* `TypeSubsumption.subsumes` total rather than sound-but-incomplete: over a
* language you define, "is every value of A also a value of B" is decidable, so
* there is no `Unknown` verdict and no falling back to decoding instances. The
* discipline to keep is that nothing here may grow into expressions or
* computation - the moment the language can compute, subsumption stops being
* decidable and the guarantee is gone.
*
* Each constructor carries its own `v`. Adding a constructor therefore leaves
* every existing type's id untouched, and only types that actually use the new
* one are affected. That is the merkle property applied to the type language
* itself, and it is why the version lives on the node rather than on the
* module.
*
* This module sits on Triplex's shared content-addressing foundation and stays
* independent of the triple persistence layer.
*/
var TypeExpr_exports = /* @__PURE__ */ __exportAll({
	TypeExprSchema: () => TypeExprSchema,
	any: () => any,
	boolean: () => boolean,
	canonical: () => canonical,
	constrained: () => constrained,
	date: () => date,
	enumOf: () => enumOf,
	id: () => id,
	instant: () => instant,
	int64: () => int64,
	integer: () => integer,
	list: () => list,
	max: () => max,
	maxLength: () => maxLength,
	min: () => min,
	minLength: () => minLength,
	number: () => number,
	optional: () => optional,
	pattern: () => pattern,
	prim: () => prim,
	ref: () => ref,
	required: () => required,
	struct: () => struct,
	text: () => text,
	union: () => union
});
const TYPE_DOMAIN = Domain.typeExpr;
const any = {
	_tag: "Any",
	v: 1
};
const prim = (name) => ({
	_tag: "Prim",
	v: 1,
	prim: name
});
const text = prim("text");
const number = prim("number");
const integer = prim("integer");
/** Tagged exact integer; legacy integer/number keep their JS-number contract and IDs. */
const int64 = prim("int64");
const boolean = prim("boolean");
const date = prim("date");
const instant = prim("instant");
/** Values are a set: order is not content and duplicates are not information. */
const enumOf = (values) => ({
	_tag: "Enum",
	v: 1,
	values: [...new Set(values)].sort()
});
const ref = (kind) => ({
	_tag: "Ref",
	v: 1,
	kind
});
const list = (item) => ({
	_tag: "List",
	v: 1,
	item
});
const struct = (fields) => ({
	_tag: "Struct",
	v: 1,
	fields
});
const required = (type) => ({
	type,
	optional: false
});
const optional = (type, fallback) => fallback === void 0 ? {
	type,
	optional: true
} : {
	type,
	optional: true,
	fallback
};
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
/** Members are a set, ordered canonically so `A | B` and `B | A` are one type. */
const union = (members) => {
	const flat = members.flatMap((m) => m._tag === "Union" ? m.members : [m]);
	const seen = /* @__PURE__ */ new Map();
	for (const member of flat) seen.set(canonical(member), member);
	const distinct = [...seen.entries()].sort(([a], [b]) => cmp(a, b)).map(([, m]) => m);
	return distinct.length === 1 ? distinct[0] : {
		_tag: "Union",
		v: 1,
		members: distinct
	};
};
const constrained = (base, constraints) => {
	if (constraints.length === 0) return base;
	const inner = base._tag === "Constrained" ? base : null;
	const all = [...inner?.constraints ?? [], ...constraints];
	const seen = /* @__PURE__ */ new Map();
	for (const c of all) seen.set(encodeOrThrow(c), c);
	return {
		_tag: "Constrained",
		v: 1,
		base: inner ? inner.base : base,
		constraints: [...seen.entries()].sort(([a], [b]) => cmp(a, b)).map(([, c]) => c)
	};
};
const pattern = (regex) => ({
	_tag: "Pattern",
	regex
});
const minLength = (value) => ({
	_tag: "MinLength",
	value
});
const maxLength = (value) => ({
	_tag: "MaxLength",
	value
});
const min = (value) => ({
	_tag: "Min",
	value
});
const max = (value) => ({
	_tag: "Max",
	value
});
/**
* Canonical bytes for a type. Constructors already normalise sets on the way
* in, so this is a straight canonical encoding - the two halves together are
* what make `A | B` and `B | A` a single id.
*/
const canonical = (expr) => encodeOrThrow(expr);
/** The type's content id. Owned end to end: no third-party serializer. */
const id = (expr) => hash(TYPE_DOMAIN, canonical(expr));
/**
* A schema for `TypeExpr` itself, so a type read back out of a store or off the
* wire can be validated like anything else. Note the direction: this describes
* the *language*, and is written once by us. The types customers create are
* values of it.
*/
const TypeExprSchema = Schema.suspend(() => Schema.Union([
	Schema.Struct({
		_tag: Schema.Literal("Any"),
		v: Schema.Literal(1)
	}),
	Schema.Struct({
		_tag: Schema.Literal("Prim"),
		v: Schema.Literal(1),
		prim: Schema.Literals([
			"text",
			"number",
			"integer",
			"int64",
			"boolean",
			"date",
			"instant"
		])
	}),
	Schema.Struct({
		_tag: Schema.Literal("Enum"),
		v: Schema.Literal(1),
		values: Schema.Array(Schema.String)
	}),
	Schema.Struct({
		_tag: Schema.Literal("Ref"),
		v: Schema.Literal(1),
		kind: Schema.String
	}),
	Schema.Struct({
		_tag: Schema.Literal("List"),
		v: Schema.Literal(1),
		item: TypeExprSchema
	}),
	Schema.Struct({
		_tag: Schema.Literal("Struct"),
		v: Schema.Literal(1),
		fields: Schema.Record(Schema.String, Schema.Struct({
			type: TypeExprSchema,
			optional: Schema.Boolean,
			fallback: Schema.optional(Schema.Union([
				Schema.String,
				Schema.Number,
				Schema.Boolean,
				IntegerValue
			]))
		}))
	}),
	Schema.Struct({
		_tag: Schema.Literal("Union"),
		v: Schema.Literal(1),
		members: Schema.Array(TypeExprSchema)
	}),
	Schema.Struct({
		_tag: Schema.Literal("Constrained"),
		v: Schema.Literal(1),
		base: TypeExprSchema,
		constraints: Schema.Array(Schema.Union([
			Schema.Struct({
				_tag: Schema.Literal("Pattern"),
				regex: Schema.String
			}),
			Schema.Struct({
				_tag: Schema.Literal("MinLength"),
				value: Schema.Number
			}),
			Schema.Struct({
				_tag: Schema.Literal("MaxLength"),
				value: Schema.Number
			}),
			Schema.Struct({
				_tag: Schema.Literal("Min"),
				value: Schema.Number
			}),
			Schema.Struct({
				_tag: Schema.Literal("Max"),
				value: Schema.Number
			})
		]))
	})
]));
//#endregion
export { TypeExprSchema, TypeExpr_exports, any, boolean, canonical, constrained, date, enumOf, id, instant, int64, integer, list, max, maxLength, min, minLength, number, optional, pattern, prim, ref, required, struct, text, union };

//# sourceMappingURL=TypeExpr.js.map