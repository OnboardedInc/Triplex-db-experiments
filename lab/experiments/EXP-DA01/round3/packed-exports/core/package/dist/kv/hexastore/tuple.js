import { concat } from "../kv/encoding.js";
//#region src/kv/hexastore/tuple.ts
/**
* Tuple encoding for lexicographically sortable KV keys.
*
* Encodes typed values into byte arrays that sort correctly when compared
* byte-by-byte. This is the core encoding used by the hexastore indexes.
*
* Encoding scheme follows FoundationDB's tuple layer conventions:
* - Type tag (1 byte) determines the encoding
* - Values are encoded to preserve lexicographic sort order
* - Null-byte escaping allows variable-length strings without length prefixes
*/
/** Null sentinel -- sorts before all real values. */
const TAG_NULL = 0;
/** Boolean values: false sorts before true. */
const TAG_BOOLEAN = 1;
/** IEEE 754 double with sign-flip for correct sort order. */
const TAG_NUMBER = 2;
/** UTF-8 string with null-byte escaping. */
const TAG_STRING = 3;
/** Reference (entity ID) -- same encoding as string but distinct type. */
const TAG_REF = 4;
/** Epoch milliseconds as int64 big-endian. */
const TAG_DATETIME = 5;
/** JSON -- length-prefixed, not sortable by content. */
const TAG_JSON = 6;
/** Blob hash -- SHA-256 bytes. */
const TAG_BLOB = 7;
/** Max sentinel -- sorts after all real values. Used as upper bound. */
const TAG_MAX = 255;
const tNull = () => ({ type: "null" });
const tBoolean = (value) => ({
	type: "boolean",
	value
});
const tNumber = (value) => ({
	type: "number",
	value
});
const tString = (value) => ({
	type: "string",
	value
});
const tRef = (value) => ({
	type: "ref",
	value
});
const tDatetime = (value) => ({
	type: "datetime",
	value
});
const tJson = (value) => ({
	type: "json",
	value
});
const tBlob = (value) => ({
	type: "blob",
	value
});
const tMax = () => ({ type: "max" });
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
/**
* Encode a string with null-byte escaping.
*
* 0x00 in the input is escaped to [0x00, 0xFF].
* The string is terminated with [0x00, 0x00].
* This allows correct lexicographic ordering and unambiguous boundaries.
*/
const encodeString = (s) => {
	const bytes = textEncoder.encode(s);
	let nullCount = 0;
	for (const b of bytes) if (b === 0) nullCount++;
	const result = new Uint8Array(bytes.length + nullCount + 2);
	let j = 0;
	for (const b of bytes) if (b === 0) {
		result[j++] = 0;
		result[j++] = 255;
	} else result[j++] = b;
	result[j++] = 0;
	result[j] = 0;
	return result;
};
/**
* Decode a null-byte-escaped string from a buffer at a given offset.
* Returns [decoded string, bytes consumed (including terminator)].
*/
const decodeString = (bytes, offset) => {
	const parts = [];
	let i = offset;
	while (i < bytes.length) if (bytes[i] === 0) if (i + 1 < bytes.length && bytes[i + 1] === 255) {
		parts.push(0);
		i += 2;
	} else {
		i += 2;
		break;
	}
	else {
		parts.push(bytes[i]);
		i += 1;
	}
	return [textDecoder.decode(new Uint8Array(parts)), i - offset];
};
/**
* Encode a float64 for lexicographic sort order.
*
* IEEE 754 doubles: positive values sort correctly in big-endian.
* For negative values, flip ALL bits. For positive, flip only the sign bit.
* This gives correct total ordering: -Inf < ... < -0 < +0 < ... < +Inf.
*/
const encodeNumber = (n) => {
	const buf = /* @__PURE__ */ new ArrayBuffer(8);
	new DataView(buf).setFloat64(0, n, false);
	const bytes = new Uint8Array(buf);
	if (n < 0 || Object.is(n, -0)) for (let i = 0; i < 8; i++) bytes[i] = ~bytes[i] & 255;
	else bytes[0] = bytes[0] ^ 128;
	return bytes;
};
/**
* Decode a float64 from sign-flip encoding.
*/
const decodeNumber = (bytes, offset) => {
	const buf = new Uint8Array(8);
	buf.set(bytes.slice(offset, offset + 8));
	if ((buf[0] & 128) === 0) for (let i = 0; i < 8; i++) buf[i] = ~buf[i] & 255;
	else buf[0] = buf[0] ^ 128;
	return new DataView(buf.buffer).getFloat64(0, false);
};
/**
* Encode a single tuple part to bytes.
*/
const encodePart = (part) => {
	switch (part.type) {
		case "null": return new Uint8Array([0]);
		case "boolean": return new Uint8Array([1, part.value ? 1 : 0]);
		case "number": return concat(new Uint8Array([2]), encodeNumber(part.value));
		case "string": return concat(new Uint8Array([3]), encodeString(part.value));
		case "ref": return concat(new Uint8Array([4]), encodeString(part.value));
		case "datetime": {
			const buf = /* @__PURE__ */ new ArrayBuffer(8);
			new DataView(buf).setBigInt64(0, BigInt(Math.floor(part.value)), false);
			return concat(new Uint8Array([5]), new Uint8Array(buf));
		}
		case "json": {
			const str = JSON.stringify(part.value);
			const strBytes = textEncoder.encode(str);
			const lenBuf = /* @__PURE__ */ new ArrayBuffer(4);
			new DataView(lenBuf).setUint32(0, strBytes.length, false);
			return concat(new Uint8Array([6]), new Uint8Array(lenBuf), strBytes);
		}
		case "blob": return concat(new Uint8Array([7]), encodeString(part.value));
		case "max": return new Uint8Array([255]);
	}
};
/**
* Decode a single tuple part from bytes at the given offset.
* Returns [decoded part, bytes consumed].
*/
const decodePart = (bytes, offset) => {
	const tag = bytes[offset];
	switch (tag) {
		case 0: return [{ type: "null" }, 1];
		case 1: return [{
			type: "boolean",
			value: bytes[offset + 1] !== 0
		}, 2];
		case 2: return [{
			type: "number",
			value: decodeNumber(bytes, offset + 1)
		}, 9];
		case 3: {
			const [str, consumed] = decodeString(bytes, offset + 1);
			return [{
				type: "string",
				value: str
			}, 1 + consumed];
		}
		case 4: {
			const [str, consumed] = decodeString(bytes, offset + 1);
			return [{
				type: "ref",
				value: str
			}, 1 + consumed];
		}
		case 5: return [{
			type: "datetime",
			value: Number(new DataView(bytes.buffer, bytes.byteOffset + offset + 1, 8).getBigInt64(0, false))
		}, 9];
		case 6: {
			const len = new DataView(bytes.buffer, bytes.byteOffset + offset + 1, 4).getUint32(0, false);
			const str = textDecoder.decode(bytes.slice(offset + 5, offset + 5 + len));
			return [{
				type: "json",
				value: JSON.parse(str)
			}, 5 + len];
		}
		case 7: {
			const [str, consumed] = decodeString(bytes, offset + 1);
			return [{
				type: "blob",
				value: str
			}, 1 + consumed];
		}
		case 255: return [{ type: "max" }, 1];
		default: throw new Error(`Unknown tuple tag: 0x${tag.toString(16)}`);
	}
};
/**
* Encode a tuple of parts into a single byte array.
* The resulting bytes sort lexicographically according to the tuple's element order.
*/
const encodeTuple = (...parts) => {
	return concat(...parts.map(encodePart));
};
/**
* Decode a byte array back into a tuple of parts.
*/
const decodeTuple = (bytes) => {
	const parts = [];
	let offset = 0;
	while (offset < bytes.length) {
		const [part, consumed] = decodePart(bytes, offset);
		parts.push(part);
		offset += consumed;
	}
	return parts;
};
/**
* Encode a string value with null-byte escaping, returning a latin1 string.
* Mirror of `encodeString` but produces a string instead of Uint8Array.
*/
const encodeStringToStr = (s) => {
	let result = "";
	for (let i = 0; i < s.length; i++) {
		const code = s.charCodeAt(i);
		if (code === 0) result += "\0ÿ";
		else if (code < 128) result += s[i];
		else return encodeStringToStrSlow(s);
	}
	return result + "\0\0";
};
/**
* Slow path for non-ASCII strings: use TextEncoder for UTF-8, then convert.
*/
const encodeStringToStrSlow = (s) => {
	const bytes = textEncoder.encode(s);
	let result = "";
	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i];
		if (b === 0) result += "\0ÿ";
		else result += String.fromCharCode(b);
	}
	return result + "\0\0";
};
/**
* Encode a single tuple part to a latin1 string.
* Mirror of `encodePart` but produces a string directly.
*/
const encodePartStr = (part) => {
	switch (part.type) {
		case "null": return String.fromCharCode(0);
		case "boolean": return String.fromCharCode(1) + String.fromCharCode(part.value ? 1 : 0);
		case "number": return encodeNumberStr(part.value);
		case "string": return encodeStringStr(part.value);
		case "ref": return encodeRefStr(part.value);
		case "datetime": return encodeDatetimeStr(part.value);
		case "json": {
			const str = JSON.stringify(part.value);
			const strBytes = textEncoder.encode(str);
			const lenBuf = /* @__PURE__ */ new ArrayBuffer(4);
			new DataView(lenBuf).setUint32(0, strBytes.length, false);
			const lenBytes = new Uint8Array(lenBuf);
			let s = String.fromCharCode(6);
			for (let i = 0; i < 4; i++) s += String.fromCharCode(lenBytes[i]);
			for (let i = 0; i < strBytes.length; i++) s += String.fromCharCode(strBytes[i]);
			return s;
		}
		case "blob": return String.fromCharCode(7) + encodeStringToStr(part.value);
		case "max": return String.fromCharCode(255);
	}
};
/** TAG_STRING char, pre-computed. */
const TAG_STRING_CHR = String.fromCharCode(3);
/** TAG_REF char, pre-computed. */
const TAG_REF_CHR = String.fromCharCode(4);
/** TAG_NUMBER char, pre-computed. */
const TAG_NUMBER_CHR = String.fromCharCode(2);
/** TAG_DATETIME char, pre-computed. */
const TAG_DATETIME_CHR = String.fromCharCode(5);
/** TAG_BOOLEAN char, pre-computed. */
const TAG_BOOLEAN_CHR = String.fromCharCode(1);
/** TAG_BLOB char, pre-computed. */
const TAG_BLOB_CHR = String.fromCharCode(7);
/**
* Encode a string value directly to latin1 (TAG_STRING + null-escaped content).
* Equivalent to `encodePartStr(tString(s))` but allocates zero intermediate objects.
*/
const encodeStringStr = (s) => TAG_STRING_CHR + encodeStringToStr(s);
/**
* Encode a ref value directly to latin1 (TAG_REF + null-escaped content).
* Equivalent to `encodePartStr(tRef(s))` but allocates zero intermediate objects.
*/
const encodeRefStr = (s) => TAG_REF_CHR + encodeStringToStr(s);
const _numBuf = /* @__PURE__ */ new ArrayBuffer(8);
const _numDV = new DataView(_numBuf);
const _numBytes = new Uint8Array(_numBuf);
/**
* Encode a number value directly to latin1 (TAG_NUMBER + sign-flipped IEEE 754).
* Equivalent to `encodePartStr(tNumber(n))` but allocates zero intermediate objects.
*/
const encodeNumberStr = (n) => {
	_numDV.setFloat64(0, n, false);
	if (n < 0 || Object.is(n, -0)) for (let i = 0; i < 8; i++) _numBytes[i] = ~_numBytes[i] & 255;
	else _numBytes[0] = _numBytes[0] ^ 128;
	return TAG_NUMBER_CHR + String.fromCharCode(_numBytes[0], _numBytes[1], _numBytes[2], _numBytes[3], _numBytes[4], _numBytes[5], _numBytes[6], _numBytes[7]);
};
/**
* Encode a datetime value directly to latin1 (TAG_DATETIME + int64 big-endian).
* Equivalent to `encodePartStr(tDatetime(n))` but allocates zero intermediate objects.
*/
const encodeDatetimeStr = (n) => {
	_numDV.setBigInt64(0, BigInt(Math.floor(n)), false);
	return TAG_DATETIME_CHR + String.fromCharCode(_numBytes[0], _numBytes[1], _numBytes[2], _numBytes[3], _numBytes[4], _numBytes[5], _numBytes[6], _numBytes[7]);
};
/**
* Encode a boolean value directly to latin1 (TAG_BOOLEAN + 0x00/0x01).
* Equivalent to `encodePartStr(tBoolean(b))` but allocates zero intermediate objects.
*/
const encodeBooleanStr = (b) => TAG_BOOLEAN_CHR + String.fromCharCode(b ? 1 : 0);
/**
* Encode a blob value directly to latin1 (TAG_BLOB + null-escaped content).
* Equivalent to `encodePartStr(tBlob(s))` but allocates zero intermediate objects.
*/
const encodeBlobStr = (s) => TAG_BLOB_CHR + encodeStringToStr(s);
//#endregion
export { TAG_BLOB, TAG_BOOLEAN, TAG_DATETIME, TAG_JSON, TAG_MAX, TAG_NULL, TAG_NUMBER, TAG_REF, TAG_STRING, decodeTuple, encodeBlobStr, encodeBooleanStr, encodeDatetimeStr, encodeNumberStr, encodePartStr, encodeRefStr, encodeStringStr, encodeTuple, tBlob, tBoolean, tDatetime, tJson, tMax, tNull, tNumber, tRef, tString };

//# sourceMappingURL=tuple.js.map