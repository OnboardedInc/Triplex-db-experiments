import { SqlDialect } from "./types.js";

//#region src/dialects/postgresql.d.ts
/**
 * PostgreSQL dialect for datalog compilation.
 *
 * Key differences from SQLite:
 * - No LIMIT required for OFFSET-only queries
 * - Native TRUE/FALSE boolean literals
 * - $1, $2, ... parameter placeholders (1-indexed)
 */
declare const PostgresqlDialect: SqlDialect;
//#endregion
export { PostgresqlDialect };
//# sourceMappingURL=postgresql.d.ts.map