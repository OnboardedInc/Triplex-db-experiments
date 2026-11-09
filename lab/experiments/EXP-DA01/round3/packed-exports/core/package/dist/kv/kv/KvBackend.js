import { Context } from "effect";
//#region src/kv/kv/KvBackend.ts
/**
* Ordered Key-Value Backend service interface.
*
* This is the portable abstraction layer that can be implemented by:
* - InMemoryKvBackend (sorted map, for dev/test)
* - FoundationDB (distributed, for production scale)
* - RocksDB/LMDB (single-node, for embedded production)
*
* All keys and values are raw byte arrays (Uint8Array).
* Keys are stored in lexicographic order, enabling efficient range scans.
*/
/** Effect service tag for dependency injection. */
var KvBackend = class extends Context.Service()("KvBackend") {};
//#endregion
export { KvBackend };

//# sourceMappingURL=KvBackend.js.map