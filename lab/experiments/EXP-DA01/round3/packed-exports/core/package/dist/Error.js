import { Schema } from "effect";
//#region src/Error.ts
var DatabaseNotFound = class extends Schema.TaggedError()("DatabaseNotFound", { database: Schema.String }) {};
var DatabaseAlreadyExists = class extends Schema.TaggedError()("DatabaseAlreadyExists", { database: Schema.String }) {};
var InternalError = class extends Schema.TaggedError()("InternalError", { message: Schema.String }) {};
//#endregion
export { DatabaseAlreadyExists, DatabaseNotFound, InternalError };

//# sourceMappingURL=Error.js.map