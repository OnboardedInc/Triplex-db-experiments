import { Context } from "effect";
//#region src/store/DatabaseRegistry.ts
/**
* DatabaseRegistry service definition
*
* Manages database metadata (name, description, createdAt) and
* database access control (which users can access which databases).
*
* Implementations:
* - Node.js: SQLite registry file (_registry.db)
* - Cloudflare: RegistryDO (Durable Object with SQLite storage)
*/
/**
* DatabaseRegistry service tag for dependency injection
*/
var DatabaseRegistry = class extends Context.Service()("DatabaseRegistry") {};
//#endregion
export { DatabaseRegistry };

//# sourceMappingURL=DatabaseRegistry.js.map