//#region src/dialects/sqlite.ts
/**
* Default SQLite dialect for datalog compilation.
* Backend-specific dialects can override at runtime via CurrentDialect.
*/
const SqliteDialect = {
	name: "sqlite",
	limitOffset: (limit, offset) => {
		const parts = [];
		if (limit !== void 0) parts.push(`LIMIT ${limit}`);
		if (offset !== void 0 && offset > 0) {
			if (limit === void 0) parts.push("LIMIT -1");
			parts.push(`OFFSET ${offset}`);
		}
		return parts.join(" ");
	},
	castAsText: (expression) => `CAST(${expression} AS TEXT)`,
	booleanLiteral: (value) => value ? "1" : "0",
	paramPlaceholder: (index) => `?${index + 1}`,
	escapeLikePattern: (value) => value.replace(/[%_\\]/g, "\\$&")
};
//#endregion
export { SqliteDialect };

//# sourceMappingURL=sqlite.js.map