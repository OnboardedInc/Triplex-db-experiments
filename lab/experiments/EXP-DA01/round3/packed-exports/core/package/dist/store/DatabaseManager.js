import { Context } from "effect";
//#region src/store/DatabaseManager.ts
/**
* DatabaseManager service definition
*
* Manages database lifecycle and provides database-scoped Triples services.
* Each database is backed by a storage backend (SQLite, PostgreSQL, etc.).
*
* This is a pure database concern — no runtime services (snapshots, compliance, etc.).
*/
/**
* DatabaseManager service tag for dependency injection
*/
var DatabaseManager = class extends Context.Service()("DatabaseManager") {};
//#endregion
export { DatabaseManager };

//# sourceMappingURL=DatabaseManager.js.map