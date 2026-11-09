import { TAG_BLOB, TAG_BOOLEAN, TAG_DATETIME, TAG_JSON, TAG_MAX, TAG_NULL, TAG_NUMBER, TAG_REF, TAG_STRING, decodeTuple, encodeTuple, tBlob, tBoolean, tDatetime, tJson, tMax, tNull, tNumber, tRef, tString } from "./tuple.js";
import { AEVT_PREFIX, AVET_PREFIX, EAVT_PREFIX, INDEX_PREFIX, META_PREFIX, VAET_PREFIX, aevtKey, avetKey, eavtKey, metaKey, prefixRange, selectIndex, vaetKey } from "./indexes.js";
import { patternToScan, valueToTuplePart } from "./scan.js";
import { KvTripleStore, createKvTripleStore } from "./KvTripleStore.js";
export { AEVT_PREFIX, AVET_PREFIX, EAVT_PREFIX, INDEX_PREFIX, KvTripleStore, META_PREFIX, TAG_BLOB, TAG_BOOLEAN, TAG_DATETIME, TAG_JSON, TAG_MAX, TAG_NULL, TAG_NUMBER, TAG_REF, TAG_STRING, VAET_PREFIX, aevtKey, avetKey, createKvTripleStore, decodeTuple, eavtKey, encodeTuple, metaKey, patternToScan, prefixRange, selectIndex, tBlob, tBoolean, tDatetime, tJson, tMax, tNull, tNumber, tRef, tString, vaetKey, valueToTuplePart };
