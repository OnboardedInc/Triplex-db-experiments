import { TuplePart } from "./tuple.js";

//#region src/kv/hexastore/indexes.d.ts
/** Entity → Attribute → Value → TxId */
declare const EAVT_PREFIX: Uint8Array<ArrayBuffer>;
/** Attribute → Entity → Value → TxId */
declare const AEVT_PREFIX: Uint8Array<ArrayBuffer>;
/** Attribute → Value → Entity → TxId */
declare const AVET_PREFIX: Uint8Array<ArrayBuffer>;
/** Value → Attribute → Entity → TxId (refs only) */
declare const VAET_PREFIX: Uint8Array<ArrayBuffer>;
/** EntityType → TripleId (entity type lookup) */
declare const TYPE_PREFIX: Uint8Array<ArrayBuffer>;
/** TripleId → full triple data */
declare const META_PREFIX: Uint8Array<ArrayBuffer>;
type IndexName = "EAVT" | "AEVT" | "AVET" | "VAET";
declare const INDEX_PREFIX: Record<IndexName, Uint8Array>;
/**
 * Build a EAVT index key.
 */
declare const eavtKey: (entity: TuplePart, attribute: TuplePart, value: TuplePart, txId: TuplePart, tripleId: TuplePart) => Uint8Array;
/**
 * Build an AEVT index key.
 */
declare const aevtKey: (attribute: TuplePart, entity: TuplePart, value: TuplePart, txId: TuplePart, tripleId: TuplePart) => Uint8Array;
/**
 * Build an AVET index key.
 */
declare const avetKey: (attribute: TuplePart, value: TuplePart, entity: TuplePart, txId: TuplePart, tripleId: TuplePart) => Uint8Array;
/**
 * Build a VAET index key (for ref values only).
 */
declare const vaetKey: (value: TuplePart, attribute: TuplePart, entity: TuplePart, txId: TuplePart, tripleId: TuplePart) => Uint8Array;
/**
 * Build a META key for a triple ID.
 */
declare const metaKey: (tripleId: string) => Uint8Array;
/**
 * Build a TYPE index key: TYPE:{entityType}:{tripleId}
 * This enables prefix scans by entityType for O(k) entity type queries.
 */
declare const typeKey: (entityType: string, tripleId: string) => Uint8Array;
/**
 * Compute the [start, end) byte range for scanning all entries of a given entityType.
 */
declare const typePrefixRange: (entityType: string) => {
  start: Uint8Array;
  end: Uint8Array;
};
/** Build EAVT key as latin1 string (zero Uint8Array allocations). */
declare const eavtKeyStr: (e: string, a: string, v: string, tx: string, id: string) => string;
/** Build AEVT key as latin1 string. */
declare const aevtKeyStr: (a: string, e: string, v: string, tx: string, id: string) => string;
/** Build AVET key as latin1 string. */
declare const avetKeyStr: (a: string, v: string, e: string, tx: string, id: string) => string;
/** Build VAET key as latin1 string. */
declare const vaetKeyStr: (v: string, a: string, e: string, tx: string, id: string) => string;
/** Build META key as latin1 string. */
declare const metaKeyStr: (tripleIdEncoded: string) => string;
/** Build TYPE key as latin1 string. */
declare const typeKeyStr: (entityTypeEncoded: string, tripleIdEncoded: string) => string;
/**
 * Describes which components of a triple pattern are bound (known).
 */
interface PatternShape {
  readonly entity: boolean;
  readonly attribute: boolean;
  readonly value: boolean;
}
/**
 * The result of index selection: which index to use and what prefix parts.
 */
interface IndexChoice {
  readonly index: IndexName;
  /** Tuple parts to use as the prefix for the range scan. */
  readonly prefixParts: readonly TuplePart[];
}
/**
 * Select the optimal index for a given pattern shape.
 *
 * The heuristic: choose the index whose leading columns match the most
 * bound components. This maximizes the prefix length and minimizes scan range.
 */
declare const selectIndex: (shape: PatternShape, entityPart?: TuplePart, attributePart?: TuplePart, valuePart?: TuplePart, isRef?: boolean) => IndexChoice;
/**
 * Compute the [start, end) byte range for a prefix scan on a given index.
 * Start is the encoded prefix; end is the prefix incremented by 1 byte.
 */
declare const prefixRange: (indexName: IndexName, prefixParts: readonly TuplePart[]) => {
  start: Uint8Array;
  end: Uint8Array;
};
//#endregion
export { AEVT_PREFIX, AVET_PREFIX, EAVT_PREFIX, INDEX_PREFIX, IndexChoice, IndexName, META_PREFIX, PatternShape, TYPE_PREFIX, VAET_PREFIX, aevtKey, aevtKeyStr, avetKey, avetKeyStr, eavtKey, eavtKeyStr, metaKey, metaKeyStr, prefixRange, selectIndex, typeKey, typeKeyStr, typePrefixRange, vaetKey, vaetKeyStr };
//# sourceMappingURL=indexes.d.ts.map