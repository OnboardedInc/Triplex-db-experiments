import { encodeOrThrow } from "../content/CanonicalJson.js";
import { resolveTemporalBasis } from "../Temporal.js";
import { hash } from "../content/ContentId.js";
import { integer } from "../Value.js";
import { compile, is } from "../config/TypeSchema.js";
import { validateDatabaseScope } from "../runtime/DatabaseScope.js";
import { Effect, Schema } from "effect";
//#region src/native/NativeQuery.ts
/**
* Schema and evidence contracts shared by native query providers. Native query
* text stays in its backend language; this module never compiles Datalog.
*/
const nativeQueryContractId = (contract) => {
	if (!contract.name || contract.name.length > 1024) throw new TypeError("A native query contract requires a name of at most 1024 characters");
	return hash("triplex/native-query-contract/v1", encodeOrThrow(contract));
};
const resolveNativeReadBasis = (input) => {
	validateDatabaseScope(input.scope);
	if (!Number.isSafeInteger(input.currentPosition) || input.currentPosition < 0) throw new RangeError("The current native source position must be a nonnegative safe integer");
	const requested = input.options?.basis?.recordedPosition ?? input.currentPosition;
	if (!Number.isSafeInteger(requested) || requested < 0 || requested > input.currentPosition) throw new RangeError("The requested native source position is unavailable");
	return {
		scope: input.scope,
		recordedPosition: requested,
		...resolveTemporalBasis(input.options?.basis, input.now)
	};
};
const decodeNativeParameters = (contract, input) => Schema.decodeUnknownEffect(compile(contract.parameters))(input);
/**
* Hydrate only a declared scalar domain. In particular, an int64 carrier must
* never pass through Number before the signed-64 boundary check. TypeExpr.any
* remains native data rather than guessing types from a string's spelling.
*/
const hydrateNativeValue = (type, value) => {
	switch (type._tag) {
		case "Constrained": return hydrateNativeValue(type.base, value);
		case "Prim":
			if (type.prim === "int64") {
				if (typeof value === "string" || typeof value === "bigint") return integer(value);
				if (typeof value === "number") {
					if (!Number.isSafeInteger(value)) throw new RangeError("An int64 result was rounded");
					return integer(BigInt(value));
				}
			}
			if ([
				"number",
				"integer",
				"instant"
			].includes(type.prim)) {
				if (typeof value === "bigint") {
					const number = Number(value);
					if (!Number.isSafeInteger(number)) throw new RangeError("An exact result cannot fit number");
					return number;
				}
				if (typeof value === "string") {
					const number = Number(value);
					if (!Number.isFinite(number) || /^[+-]?\d+$/.test(value) && !Number.isSafeInteger(number)) throw new RangeError("A numeric native result is not representable");
					return number;
				}
			}
			return value;
		case "List": return Array.isArray(value) ? value.map((item) => hydrateNativeValue(type.item, item)) : value;
		case "Struct":
			if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
			return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, type.fields[key] ? hydrateNativeValue(type.fields[key].type, item) : item]));
		case "Union":
			if (is(type, value)) return value;
			for (const member of type.members) try {
				const candidate = hydrateNativeValue(member, value);
				if (is(member, candidate)) return candidate;
			} catch {}
			return value;
		default: return value;
	}
};
const decodeNativeRows = (contract, rows) => Effect.forEach(rows, (row) => Effect.flatMap(Effect.try(() => hydrateNativeValue(contract.row, row)), Schema.decodeUnknownEffect(compile(contract.row))));
/** JSON-safe evidence preserves bigint and negative-zero parameter identity. */
const nativeEvidenceValue = (value) => {
	if (typeof value === "bigint") return integer(value);
	if (typeof value === "number" && Object.is(value, -0)) return {
		type: "float64",
		bits: "8000000000000000"
	};
	if (Array.isArray(value)) return value.map(nativeEvidenceValue);
	if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, nativeEvidenceValue(item)]));
	return value;
};
const nativeAttributeKey = (attribute) => {
	const key = typeof attribute === "string" ? attribute : attribute.key;
	if (!key || !key.isWellFormed()) throw new TypeError("Invalid native attribute identity");
	return key;
};
//#endregion
export { decodeNativeParameters, decodeNativeRows, hydrateNativeValue, nativeAttributeKey, nativeEvidenceValue, nativeQueryContractId, resolveNativeReadBasis };

//# sourceMappingURL=NativeQuery.js.map