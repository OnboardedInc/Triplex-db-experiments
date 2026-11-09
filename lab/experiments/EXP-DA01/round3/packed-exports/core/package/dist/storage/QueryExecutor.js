import { Context } from "effect";
//#region src/storage/QueryExecutor.ts
/**
* QueryExecutor - Backend-agnostic query execution interface
*
* This interface abstracts how Datalog queries are executed against storage.
* SQL backends compile Datalog to SQL and execute via SqlClient.
* KV backends execute directly using index intersection (hexastore pattern).
*
* The QueryExecutor is the key abstraction that enables non-SQL backends
* like FoundationDB or SpacetimeDB to participate in Datalog query execution
* without going through SQL.
*/
/**
* QueryExecutor service tag for dependency injection
*/
var QueryExecutor = class extends Context.Service()("QueryExecutor") {};
//#endregion
export { QueryExecutor };

//# sourceMappingURL=QueryExecutor.js.map