import { Schema } from "effect";

//#region src/runtime/DatabaseScope.d.ts
declare const ScopeSchema: Schema.brand<Schema.String, "DatabaseScope">;
/** Opaque cursor identity. Construct through `make` or `test`, never from request input. */
type DatabaseScope = typeof ScopeSchema.Type;
interface DatabaseIdentity {
  readonly env: string;
  readonly tenant: string;
  readonly database: string;
  readonly generation: number;
}
declare const DatabaseScope: {
  readonly make: ({
    env,
    tenant,
    database,
    generation
  }: DatabaseIdentity) => DatabaseScope; /** Repeatable identity for an isolated test fixture; not globally unique. */
  readonly test: (name: string) => DatabaseScope;
};
/** Validate JavaScript callers too; a TypeScript cast must not restore a default scope. */
declare const validateDatabaseScope: (scope: DatabaseScope) => void;
//#endregion
export { DatabaseIdentity, DatabaseScope, validateDatabaseScope };
//# sourceMappingURL=DatabaseScope.d.ts.map