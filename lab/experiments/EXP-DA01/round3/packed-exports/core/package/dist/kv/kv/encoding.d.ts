//#region src/kv/kv/encoding.d.ts
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
declare const compare: (a: Uint8Array, b: Uint8Array) => -1 | 0 | 1;
/**
 * Increment a key by 1 in the lexicographic order.
 * Used to compute exclusive upper bounds for range scans.
 *
 * [0x01, 0x02] → [0x01, 0x03]
 * [0x01, 0xFF] → [0x02, 0x00]
 * [0xFF]       → [0xFF, 0x00] (extends)
 */
declare const increment: (key: Uint8Array) => Uint8Array;
/**
 * Concatenate multiple byte arrays into one.
 */
declare const concat: (...parts: readonly Uint8Array[]) => Uint8Array;
/**
 * Convert a hex string to a Uint8Array.
 */
declare const fromHex: (hex: string) => Uint8Array;
/**
 * Convert a Uint8Array to a hex string.
 */
declare const toHex: (bytes: Uint8Array) => string;
/**
 * Check if a key starts with a given prefix.
 */
declare const startsWith: (key: Uint8Array, prefix: Uint8Array) => boolean;
//#endregion
export { compare, concat, fromHex, increment, startsWith, toHex };
//# sourceMappingURL=encoding.d.ts.map