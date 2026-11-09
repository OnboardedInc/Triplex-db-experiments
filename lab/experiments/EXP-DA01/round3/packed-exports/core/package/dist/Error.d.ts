import { Schema } from "effect";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/Error.d.ts
declare const DatabaseNotFound_base: Schema.Class<DatabaseNotFound, Schema.TaggedStruct<"DatabaseNotFound", {
  readonly database: Schema.String;
}>, _$effect_Cause0.YieldableError>;
declare class DatabaseNotFound extends DatabaseNotFound_base {}
declare const DatabaseAlreadyExists_base: Schema.Class<DatabaseAlreadyExists, Schema.TaggedStruct<"DatabaseAlreadyExists", {
  readonly database: Schema.String;
}>, _$effect_Cause0.YieldableError>;
declare class DatabaseAlreadyExists extends DatabaseAlreadyExists_base {}
declare const InternalError_base: Schema.Class<InternalError, Schema.TaggedStruct<"InternalError", {
  readonly message: Schema.String;
}>, _$effect_Cause0.YieldableError>;
declare class InternalError extends InternalError_base {}
//#endregion
export { DatabaseAlreadyExists, DatabaseNotFound, InternalError };
//# sourceMappingURL=Error.d.ts.map