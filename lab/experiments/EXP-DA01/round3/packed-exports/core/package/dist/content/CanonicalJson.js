import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { Data, Effect } from "effect";
//#region src/content/CanonicalJson.ts
/**
* Deterministic JSON encoding — the substrate every content hash in
* Triplex is computed over.
*
* The contract is byte-identity: two values that mean the same thing MUST
* encode to the same bytes, on any machine, in any process, forever. That is
* stronger than `JSON.stringify`, which preserves insertion order and so lets
* database round-trips or object assembly order silently change a hash. The rules:
*
* - object keys are emitted in ascending UTF-16 code-unit order (`<`)
* - `undefined` object properties are dropped; `undefined` array slots become
*   `null` (an array's length is content, an absent property is not)
* - `NaN` / `Infinity` are rejected rather than coerced to `null`, because a
*   silent coercion collapses two distinct broken configs onto one hash
* - `Date`, `BigInt`, functions and class instances are rejected: a timestamp
*   in a content hash means the hash changes when nothing did, so projections
*   must strip them explicitly rather than have this module guess a format
* - cycles are rejected; graph relationships are modelled as references rather
*   than recursively nested values
*
* Numbers use `JSON.stringify`'s shortest-round-trip representation, which is
* specified behaviour (ECMA-262 Number::toString) and therefore stable across
* engines. Note `-0` encodes as `0` and integral floats lose the `.0`, so
* `1` and `1.0` share a hash. That is intended: they are the same JSON value.
*/
var CanonicalJson_exports = /* @__PURE__ */ __exportAll({
	CanonicalEncodingError: () => CanonicalEncodingError,
	encode: () => encode,
	encodeOrThrow: () => encodeOrThrow
});
var CanonicalEncodingError = class extends Data.TaggedError("CanonicalEncodingError") {};
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const describe = (value) => {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	if (value instanceof Date) return "Date";
	const type = typeof value;
	if (type !== "object") return type;
	const name = value.constructor?.name;
	return name && name !== "Object" ? name : "object";
};
function write(value, path, seen, out) {
	if (value === null) {
		out.push("null");
		return;
	}
	switch (typeof value) {
		case "boolean":
			out.push(value ? "true" : "false");
			return;
		case "string":
			out.push(JSON.stringify(value));
			return;
		case "number":
			if (!Number.isFinite(value)) throw new CanonicalEncodingError({
				path,
				reason: "non_finite_number",
				message: `${String(value)} has no canonical encoding at ${path}`
			});
			out.push(JSON.stringify(value === 0 ? 0 : value));
			return;
		case "object": break;
		default: throw new CanonicalEncodingError({
			path,
			reason: "unsupported_type",
			message: `${describe(value)} is not encodable at ${path}`
		});
	}
	const object = value;
	if (seen.has(object)) throw new CanonicalEncodingError({
		path,
		reason: "circular_reference",
		message: `circular reference at ${path}`
	});
	const nested = new Set(seen).add(object);
	if (Array.isArray(value)) {
		out.push("[");
		value.forEach((item, index) => {
			if (index > 0) out.push(",");
			write(item ?? null, `${path}[${index}]`, nested, out);
		});
		out.push("]");
		return;
	}
	if (Object.getPrototypeOf(object) !== Object.prototype && Object.getPrototypeOf(object) !== null) throw new CanonicalEncodingError({
		path,
		reason: "unsupported_type",
		message: `${describe(value)} is not encodable at ${path}; project it to a plain object first`
	});
	const keys = Object.keys(object).filter((key) => object[key] !== void 0).sort(cmp);
	out.push("{");
	keys.forEach((key, index) => {
		if (index > 0) out.push(",");
		out.push(JSON.stringify(key), ":");
		write(object[key], path ? `${path}.${key}` : key, nested, out);
	});
	out.push("}");
}
/** Encode without the Effect wrapper. Throws `CanonicalEncodingError`. */
const encodeOrThrow = (value) => {
	const out = [];
	write(value, "", /* @__PURE__ */ new Set(), out);
	return out.join("");
};
const encode = (value) => Effect.try({
	try: () => encodeOrThrow(value),
	catch: (error) => error instanceof CanonicalEncodingError ? error : new CanonicalEncodingError({
		path: "",
		reason: "unsupported_type",
		message: String(error)
	})
});
//#endregion
export { CanonicalEncodingError, CanonicalJson_exports, encode, encodeOrThrow };

//# sourceMappingURL=CanonicalJson.js.map