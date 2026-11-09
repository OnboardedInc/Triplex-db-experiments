import { UnsupportedValueTypeError } from "../../errors/index.js";
import { encodeBlobStr, encodeBooleanStr, encodeDatetimeStr, encodeNumberStr, encodePartStr, encodeRefStr, encodeStringStr, tBlob, tBoolean, tDatetime, tJson, tNumber, tRef, tString } from "./tuple.js";
import { prefixRange, selectIndex } from "./indexes.js";
//#region src/kv/hexastore/scan.ts
/**
* Convert a TripleValue to a TuplePart for index key encoding.
*/
const valueToTuplePart = (value) => {
	switch (value.type) {
		case "integer": throw new UnsupportedValueTypeError("KV indexes", "integer");
		case "string": return tString(value.value);
		case "number": return tNumber(value.value);
		case "boolean": return tBoolean(value.value);
		case "datetime": return tDatetime(value.value);
		case "ref": return tRef(value.value);
		case "json": return tJson(value.value);
		case "blob": return tBlob(value.value);
	}
};
/**
* Convert a TripleValue to a latin1-encoded string for the string fast path.
* Uses direct encoders to skip TuplePart object allocation.
*/
const valueToPartStr = (value) => {
	switch (value.type) {
		case "integer": throw new UnsupportedValueTypeError("KV indexes", "integer");
		case "string": return encodeStringStr(value.value);
		case "number": return encodeNumberStr(value.value);
		case "boolean": return encodeBooleanStr(value.value);
		case "datetime": return encodeDatetimeStr(value.value);
		case "ref": return encodeRefStr(value.value);
		case "json": return encodePartStr(tJson(value.value));
		case "blob": return encodeBlobStr(value.value);
	}
};
/**
* Convert a scan pattern to index selection + range bounds.
*/
const patternToScan = (pattern) => {
	const entityPart = pattern.entity !== void 0 ? tString(pattern.entity) : void 0;
	const attributePart = pattern.attribute !== void 0 ? tString(pattern.attribute) : void 0;
	const valuePart = pattern.value !== void 0 ? valueToTuplePart(pattern.value) : void 0;
	const isRef = pattern.value?.type === "ref";
	const choice = selectIndex({
		entity: pattern.entity !== void 0,
		attribute: pattern.attribute !== void 0,
		value: pattern.value !== void 0
	}, entityPart, attributePart, valuePart, isRef);
	const { start, end } = prefixRange(choice.index, choice.prefixParts);
	return {
		choice,
		start,
		end
	};
};
//#endregion
export { patternToScan, valueToPartStr, valueToTuplePart };

//# sourceMappingURL=scan.js.map