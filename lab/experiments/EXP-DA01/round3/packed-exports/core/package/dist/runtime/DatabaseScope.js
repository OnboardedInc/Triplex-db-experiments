import { Schema } from "effect";
//#region src/runtime/DatabaseScope.ts
const ScopeSchema = Schema.String.pipe(Schema.brand("DatabaseScope"));
const nonempty = (value, field) => {
	if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`DatabaseScope.${field} must be a nonempty string`);
};
const make = ({ env, tenant, database, generation }) => {
	nonempty(env, "env");
	nonempty(tenant, "tenant");
	nonempty(database, "database");
	if (!Number.isSafeInteger(generation) || generation < 0) throw new TypeError("DatabaseScope.generation must be a nonnegative safe integer");
	return Schema.decodeSync(ScopeSchema)(JSON.stringify([
		"triplex-scope-v1",
		env,
		tenant,
		database,
		generation
	]));
};
const DatabaseScope = {
	make,
	test: (name) => make({
		env: "test",
		tenant: "test",
		database: name,
		generation: 0
	})
};
/** Validate JavaScript callers too; a TypeScript cast must not restore a default scope. */
const validateDatabaseScope = (scope) => {
	let value;
	try {
		value = JSON.parse(scope);
	} catch {
		throw new TypeError("Invalid DatabaseScope");
	}
	if (!Array.isArray(value) || value.length !== 5 || value[0] !== "triplex-scope-v1" || typeof value[1] !== "string" || typeof value[2] !== "string" || typeof value[3] !== "string" || typeof value[4] !== "number" || make({
		env: value[1],
		tenant: value[2],
		database: value[3],
		generation: value[4]
	}) !== scope) throw new TypeError("Invalid DatabaseScope");
};
//#endregion
export { DatabaseScope, validateDatabaseScope };

//# sourceMappingURL=DatabaseScope.js.map