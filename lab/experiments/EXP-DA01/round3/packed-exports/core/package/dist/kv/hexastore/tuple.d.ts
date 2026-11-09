//#region src/kv/hexastore/tuple.d.ts
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
declare const TAG_NULL = 0;
/** Boolean values: false sorts before true. */
declare const TAG_BOOLEAN = 1;
/** IEEE 754 double with sign-flip for correct sort order. */
declare const TAG_NUMBER = 2;
/** UTF-8 string with null-byte escaping. */
declare const TAG_STRING = 3;
/** Reference (entity ID) -- same encoding as string but distinct type. */
declare const TAG_REF = 4;
/** Epoch milliseconds as int64 big-endian. */
declare const TAG_DATETIME = 5;
/** JSON -- length-prefixed, not sortable by content. */
declare const TAG_JSON = 6;
/** Blob hash -- SHA-256 bytes. */
declare const TAG_BLOB = 7;
/** Max sentinel -- sorts after all real values. Used as upper bound. */
declare const TAG_MAX = 255;
type TuplePart = {
  readonly type: "null";
} | {
  readonly type: "boolean";
  readonly value: boolean;
} | {
  readonly type: "number";
  readonly value: number;
} | {
  readonly type: "string";
  readonly value: string;
} | {
  readonly type: "ref";
  readonly value: string;
} | {
  readonly type: "datetime";
  readonly value: number;
} | {
  readonly type: "json";
  readonly value: unknown;
} | {
  readonly type: "blob";
  readonly value: string;
} | {
  readonly type: "max";
};
declare const tNull: () => TuplePart;
declare const tBoolean: (value: boolean) => TuplePart;
declare const tNumber: (value: number) => TuplePart;
declare const tString: (value: string) => TuplePart;
declare const tRef: (value: string) => TuplePart;
declare const tDatetime: (value: number) => TuplePart;
declare const tJson: (value: unknown) => TuplePart;
declare const tBlob: (value: string) => TuplePart;
declare const tMax: () => TuplePart;
/**
 * Encode a tuple of parts into a single byte array.
 * The resulting bytes sort lexicographically according to the tuple's element order.
 */
declare const encodeTuple: (...parts: readonly TuplePart[]) => Uint8Array;
/**
 * Decode a byte array back into a tuple of parts.
 */
declare const decodeTuple: (bytes: Uint8Array) => TuplePart[];
/**
 * Encode a single tuple part to a latin1 string.
 * Mirror of `encodePart` but produces a string directly.
 */
declare const encodePartStr: (part: TuplePart) => string;
/**
 * Encode a string value directly to latin1 (TAG_STRING + null-escaped content).
 * Equivalent to `encodePartStr(tString(s))` but allocates zero intermediate objects.
 */
declare const encodeStringStr: (s: string) => string;
/**
 * Encode a ref value directly to latin1 (TAG_REF + null-escaped content).
 * Equivalent to `encodePartStr(tRef(s))` but allocates zero intermediate objects.
 */
declare const encodeRefStr: (s: string) => string;
/**
 * Encode a number value directly to latin1 (TAG_NUMBER + sign-flipped IEEE 754).
 * Equivalent to `encodePartStr(tNumber(n))` but allocates zero intermediate objects.
 */
declare const encodeNumberStr: (n: number) => string;
/**
 * Encode a datetime value directly to latin1 (TAG_DATETIME + int64 big-endian).
 * Equivalent to `encodePartStr(tDatetime(n))` but allocates zero intermediate objects.
 */
declare const encodeDatetimeStr: (n: number) => string;
/**
 * Encode a boolean value directly to latin1 (TAG_BOOLEAN + 0x00/0x01).
 * Equivalent to `encodePartStr(tBoolean(b))` but allocates zero intermediate objects.
 */
declare const encodeBooleanStr: (b: boolean) => string;
/**
 * Encode a blob value directly to latin1 (TAG_BLOB + null-escaped content).
 * Equivalent to `encodePartStr(tBlob(s))` but allocates zero intermediate objects.
 */
declare const encodeBlobStr: (s: string) => string;
//#endregion
export { TAG_BLOB, TAG_BOOLEAN, TAG_DATETIME, TAG_JSON, TAG_MAX, TAG_NULL, TAG_NUMBER, TAG_REF, TAG_STRING, TuplePart, decodeTuple, encodeBlobStr, encodeBooleanStr, encodeDatetimeStr, encodeNumberStr, encodePartStr, encodeRefStr, encodeStringStr, encodeTuple, tBlob, tBoolean, tDatetime, tJson, tMax, tNull, tNumber, tRef, tString };
//# sourceMappingURL=tuple.d.ts.map