import { Context } from "effect";
//#region src/storage/StorageAdapter.ts
/**
* StorageAdapter - Backend-agnostic storage interface
*
* Abstracts low-level storage operations allowing different backends
* (SQLite, PostgreSQL, Cloudflare DO, FoundationDB, etc.) to use
* their optimal primitives.
*/
const isSqlStorageAdapter = (adapter) => "rawQuery" in adapter && typeof adapter.rawQuery === "function";
/**
* StorageAdapter service tag for dependency injection
*/
var StorageAdapter = class extends Context.Service()("StorageAdapter") {};
//#endregion
export { StorageAdapter, isSqlStorageAdapter };

//# sourceMappingURL=StorageAdapter.js.map