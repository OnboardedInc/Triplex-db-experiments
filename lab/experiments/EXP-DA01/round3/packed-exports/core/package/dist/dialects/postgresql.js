//#region src/dialects/postgresql.ts
/**
* PostgreSQL dialect for datalog compilation.
*
* Key differences from SQLite:
* - No LIMIT required for OFFSET-only queries
* - Native TRUE/FALSE boolean literals
* - $1, $2, ... parameter placeholders (1-indexed)
*/
const PostgresqlDialect = {
	name: "postgresql",
	limitOffset: (limit, offset) => {
		const parts = [];
		if (limit !== void 0) parts.push(`LIMIT ${limit}`);
		if (offset !== void 0 && offset > 0) parts.push(`OFFSET ${offset}`);
		return parts.join(" ");
	},
	castAsText: (expression) => `CAST(${expression} AS TEXT)`,
	booleanLiteral: (value) => value ? "TRUE" : "FALSE",
	paramPlaceholder: (index) => `$${index + 1}`,
	escapeLikePattern: (value) => value.replace(/[%_\\]/g, "\\$&")
};
//#endregion
export { PostgresqlDialect };

//# sourceMappingURL=postgresql.js.map