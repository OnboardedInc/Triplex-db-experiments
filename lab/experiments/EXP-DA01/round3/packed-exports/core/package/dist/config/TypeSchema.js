import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { IntegerValue } from "../Value.js";
import { constrained } from "./TypeExpr.js";
import { Effect, Schema } from "effect";
//#region src/config/TypeSchema.ts
/**
* Compiling a `TypeExpr` down to an Effect Schema.
*
* The point of writing our own type language was never to leave Effect Schema
* behind - it was to stop borrowing *identity* from it. So the relationship is
* one-directional and explicit: `TypeExpr` is the source of truth, and Schema
* is a compilation target, alongside whatever else needs one (JSON Schema for
* docs, a widget for the form builder, DDL for a relational mirror).
*
*     TypeExpr ──► Schema      decoding, parse errors, effect-form, HttpApi
*        │    ──► JSON Schema  external contracts
*        └── canonical ──► ContentId   identity, owned end to end
*
* Everything Effect Schema is good at survives. What does not survive - and
* cannot, by construction - is a precise *static* type. A type a customer
* created at 3pm has no TypeScript counterpart, so the result decodes to
* `unknown` and callers narrow it themselves. That is not a shortcoming of the
* compiler; it is what "types are runtime data" means.
*/
var TypeSchema_exports = /* @__PURE__ */ __exportAll({
	compile: () => compile,
	is: () => is,
	normalize: () => normalize
});
/** ISO calendar date with no zone - distinct from an instant, on purpose. */
const IsoDate = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/, { message: "Expected an ISO calendar date (YYYY-MM-DD)" }));
const primSchema = (name) => {
	switch (name) {
		case "text": return Schema.String;
		case "number": return Schema.Number;
		case "integer": return Schema.Int;
		case "int64": return IntegerValue;
		case "boolean": return Schema.Boolean;
		case "date": return IsoDate;
		case "instant": return Schema.Int;
	}
};
const applyConstraint = (schema, constraint) => {
	switch (constraint._tag) {
		case "Pattern": return schema.check(Schema.isPattern(new RegExp(constraint.regex)));
		case "MinLength": return schema.check(Schema.isMinLength(constraint.value));
		case "MaxLength": return schema.check(Schema.isMaxLength(constraint.value));
		case "Min": return schema.check(Schema.isGreaterThanOrEqualTo(constraint.value));
		case "Max": return schema.check(Schema.isLessThanOrEqualTo(constraint.value));
	}
};
const go = (expr) => {
	switch (expr._tag) {
		case "Any": return Schema.Unknown;
		case "Prim": return primSchema(expr.prim);
		case "Enum": return Schema.Literals(expr.values);
		case "Ref": return Schema.String;
		case "List": return Schema.Array(go(expr.item));
		case "Struct": return Schema.StructWithRest(Schema.Struct(Object.fromEntries(Object.entries(expr.fields).map(([name, field]) => [name, field.optional ? field.fallback === void 0 ? Schema.optional(go(field.type)) : go(field.type).pipe(Schema.withDecodingDefaultType(Effect.succeed(field.fallback))) : go(field.type)]))), [Schema.Record(Schema.Union([Schema.String, Schema.Symbol]), Schema.Unknown)]).check(Schema.isPropertyNames(Schema.Literals(Object.keys(expr.fields))));
		case "Union": return Schema.Union(expr.members.map(go));
		case "Constrained":
			if (expr.base._tag === "Union") return Schema.Union(expr.base.members.map((member) => go(constrained(member, expr.constraints))));
			if (expr.base._tag === "Prim" && expr.base.prim === "int64") return expr.constraints.reduce((schema, constraint) => {
				if (constraint._tag !== "Min" && constraint._tag !== "Max") throw new TypeError(`Constraint ${constraint._tag} does not apply to int64`);
				if (!Number.isSafeInteger(constraint.value)) throw new RangeError("int64 schema bounds must be exact safe integer literals");
				const bound = BigInt(constraint.value);
				return schema.check(Schema.makeFilter((value) => constraint._tag === "Min" ? BigInt(value.value) >= bound : BigInt(value.value) <= bound, { message: `Expected int64 ${constraint._tag === "Min" ? ">=" : "<="} ${bound}` }));
			}, go(expr.base));
			return expr.constraints.reduce(applyConstraint, go(expr.base));
	}
};
/**
* Compile to a Schema that decodes to `unknown`.
*
* Deliberately not generic over a success type. Offering `compile<A>()` would
* let a caller assert a static shape the runtime value need not have, which is
* exactly the unsoundness this whole direction exists to avoid.
*/
const compile = (expr) => go(expr);
/** Does this value satisfy the type? The instance-level check, when needed. */
const is = (expr, value) => Schema.is(compile(expr))(value);
/**
* Validate a value and return its normalised (encoded) form.
*
* Decode then re-encode, so the type's own fallbacks are applied and anything
* the type considers irrelevant is discarded. Hashing this rather than the raw
* input is what makes two configs differing only in ways the type ignores come
* out byte-identical.
*/
const normalize = (expr, input) => {
	const schema = compile(expr);
	return Schema.decodeUnknownEffect(schema)(input).pipe(Effect.flatMap((decoded) => Schema.encodeEffect(schema)(decoded)));
};
//#endregion
export { TypeSchema_exports, compile, is, normalize };

//# sourceMappingURL=TypeSchema.js.map