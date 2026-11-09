//#region src/kv/kv/encoding.ts
/**
* Byte-level utilities for ordered key-value storage.
*
* These operations form the foundation for lexicographic key ordering
* used by all index structures in the hexastore.
*/
/**
* Lexicographic comparison of two byte arrays.
* Returns -1 if a < b, 0 if a === b, 1 if a > b.
*/
const compare = (a, b) => {
	const minLen = Math.min(a.length, b.length);
	for (let i = 0; i < minLen; i++) {
		if (a[i] < b[i]) return -1;
		if (a[i] > b[i]) return 1;
	}
	if (a.length < b.length) return -1;
	if (a.length > b.length) return 1;
	return 0;
};
/**
* Increment a key by 1 in the lexicographic order.
* Used to compute exclusive upper bounds for range scans.
*
* [0x01, 0x02] → [0x01, 0x03]
* [0x01, 0xFF] → [0x02, 0x00]
* [0xFF]       → [0xFF, 0x00] (extends)
*/
const increment = (key) => {
	const result = new Uint8Array(key.length);
	result.set(key);
	for (let i = result.length - 1; i >= 0; i--) {
		if (result[i] < 255) {
			result[i] += 1;
			return result;
		}
		result[i] = 0;
	}
	const extended = new Uint8Array(key.length + 1);
	extended.set(key);
	return extended;
};
/**
* Concatenate multiple byte arrays into one.
*/
const concat = (...parts) => {
	let totalLength = 0;
	for (const part of parts) totalLength += part.length;
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const part of parts) {
		result.set(part, offset);
		offset += part.length;
	}
	return result;
};
/**
* Convert a hex string to a Uint8Array.
*/
const fromHex = (hex) => {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	return bytes;
};
/**
* Convert a Uint8Array to a hex string.
*/
const toHex = (bytes) => {
	let hex = "";
	for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
	return hex;
};
/**
* Check if a key starts with a given prefix.
*/
const startsWith = (key, prefix) => {
	if (key.length < prefix.length) return false;
	for (let i = 0; i < prefix.length; i++) if (key[i] !== prefix[i]) return false;
	return true;
};
//#endregion
export { compare, concat, fromHex, increment, startsWith, toHex };

//# sourceMappingURL=encoding.js.map