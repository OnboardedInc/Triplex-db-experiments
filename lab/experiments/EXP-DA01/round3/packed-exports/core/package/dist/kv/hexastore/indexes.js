import { concat, increment } from "../kv/encoding.js";
import { encodeTuple, tMax, tString } from "./tuple.js";
//#region src/kv/hexastore/indexes.ts
/** Entity → Attribute → Value → TxId */
const EAVT_PREFIX = new Uint8Array([1]);
/** Attribute → Entity → Value → TxId */
const AEVT_PREFIX = new Uint8Array([2]);
/** Attribute → Value → Entity → TxId */
const AVET_PREFIX = new Uint8Array([3]);
/** Value → Attribute → Entity → TxId (refs only) */
const VAET_PREFIX = new Uint8Array([4]);
/** EntityType → TripleId (entity type lookup) */
const TYPE_PREFIX = new Uint8Array([5]);
/** TripleId → full triple data */
const META_PREFIX = new Uint8Array([32]);
const INDEX_PREFIX = {
	EAVT: EAVT_PREFIX,
	AEVT: AEVT_PREFIX,
	AVET: AVET_PREFIX,
	VAET: VAET_PREFIX
};
/**
* Build a EAVT index key.
*/
const eavtKey = (entity, attribute, value, txId, tripleId) => concat(EAVT_PREFIX, encodeTuple(entity, attribute, value, txId, tripleId));
/**
* Build an AEVT index key.
*/
const aevtKey = (attribute, entity, value, txId, tripleId) => concat(AEVT_PREFIX, encodeTuple(attribute, entity, value, txId, tripleId));
/**
* Build an AVET index key.
*/
const avetKey = (attribute, value, entity, txId, tripleId) => concat(AVET_PREFIX, encodeTuple(attribute, value, entity, txId, tripleId));
/**
* Build a VAET index key (for ref values only).
*/
const vaetKey = (value, attribute, entity, txId, tripleId) => concat(VAET_PREFIX, encodeTuple(value, attribute, entity, txId, tripleId));
/**
* Build a META key for a triple ID.
*/
const metaKey = (tripleId) => concat(META_PREFIX, encodeTuple(tString(tripleId)));
/**
* Build a TYPE index key: TYPE:{entityType}:{tripleId}
* This enables prefix scans by entityType for O(k) entity type queries.
*/
const typeKey = (entityType, tripleId) => concat(TYPE_PREFIX, encodeTuple(tString(entityType), tString(tripleId)));
/**
* Compute the [start, end) byte range for scanning all entries of a given entityType.
*/
const typePrefixRange = (entityType) => {
	return {
		start: concat(TYPE_PREFIX, encodeTuple(tString(entityType))),
		end: concat(TYPE_PREFIX, encodeTuple(tString(entityType), tMax()))
	};
};
const EAVT_STR = String.fromCharCode(1);
const AEVT_STR = String.fromCharCode(2);
const AVET_STR = String.fromCharCode(3);
const VAET_STR = String.fromCharCode(4);
const TYPE_STR = String.fromCharCode(5);
const META_STR = String.fromCharCode(32);
/** Build EAVT key as latin1 string (zero Uint8Array allocations). */
const eavtKeyStr = (e, a, v, tx, id) => EAVT_STR + e + a + v + tx + id;
/** Build AEVT key as latin1 string. */
const aevtKeyStr = (a, e, v, tx, id) => AEVT_STR + a + e + v + tx + id;
/** Build AVET key as latin1 string. */
const avetKeyStr = (a, v, e, tx, id) => AVET_STR + a + v + e + tx + id;
/** Build VAET key as latin1 string. */
const vaetKeyStr = (v, a, e, tx, id) => VAET_STR + v + a + e + tx + id;
/** Build META key as latin1 string. */
const metaKeyStr = (tripleIdEncoded) => META_STR + tripleIdEncoded;
/** Build TYPE key as latin1 string. */
const typeKeyStr = (entityTypeEncoded, tripleIdEncoded) => TYPE_STR + entityTypeEncoded + tripleIdEncoded;
/**
* Select the optimal index for a given pattern shape.
*
* The heuristic: choose the index whose leading columns match the most
* bound components. This maximizes the prefix length and minimizes scan range.
*/
const selectIndex = (shape, entityPart, attributePart, valuePart, isRef) => {
	const { entity, attribute, value } = shape;
	if (entity && attribute && value) return {
		index: "EAVT",
		prefixParts: [
			entityPart,
			attributePart,
			valuePart
		]
	};
	if (entity && attribute) return {
		index: "EAVT",
		prefixParts: [entityPart, attributePart]
	};
	if (entity) return {
		index: "EAVT",
		prefixParts: [entityPart]
	};
	if (attribute && value) return {
		index: "AVET",
		prefixParts: [attributePart, valuePart]
	};
	if (attribute) return {
		index: "AEVT",
		prefixParts: [attributePart]
	};
	if (value && isRef) return {
		index: "VAET",
		prefixParts: [valuePart]
	};
	return {
		index: "EAVT",
		prefixParts: []
	};
};
/**
* Compute the [start, end) byte range for a prefix scan on a given index.
* Start is the encoded prefix; end is the prefix incremented by 1 byte.
*/
const prefixRange = (indexName, prefixParts) => {
	const prefix = INDEX_PREFIX[indexName];
	if (prefixParts.length === 0) return {
		start: prefix,
		end: increment(prefix)
	};
	return {
		start: concat(prefix, encodeTuple(...prefixParts)),
		end: concat(prefix, encodeTuple(...prefixParts, tMax()))
	};
};
//#endregion
export { AEVT_PREFIX, AVET_PREFIX, EAVT_PREFIX, INDEX_PREFIX, META_PREFIX, TYPE_PREFIX, VAET_PREFIX, aevtKey, aevtKeyStr, avetKey, avetKeyStr, eavtKey, eavtKeyStr, metaKey, metaKeyStr, prefixRange, selectIndex, typeKey, typeKeyStr, typePrefixRange, vaetKey, vaetKeyStr };

//# sourceMappingURL=indexes.js.map