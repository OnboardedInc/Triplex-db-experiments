import { TypeExpr } from "./TypeExpr.js";
import { Effect, Schema } from "effect";

//#region src/config/TypeSchema.d.ts
declare namespace TypeSchema_d_exports {
  export { compile, is, normalize };
}
/**
 * Compile to a Schema that decodes to `unknown`.
 *
 * Deliberately not generic over a success type. Offering `compile<A>()` would
 * let a caller assert a static shape the runtime value need not have, which is
 * exactly the unsoundness this whole direction exists to avoid.
 */
declare const compile: (expr: TypeExpr) => Schema.Codec<unknown, unknown>;
/** Does this value satisfy the type? The instance-level check, when needed. */
declare const is: (expr: TypeExpr, value: unknown) => boolean;
/**
 * Validate a value and return its normalised (encoded) form.
 *
 * Decode then re-encode, so the type's own fallbacks are applied and anything
 * the type considers irrelevant is discarded. Hashing this rather than the raw
 * input is what makes two configs differing only in ways the type ignores come
 * out byte-identical.
 */
declare const normalize: (expr: TypeExpr, input: unknown) => Effect.Effect<unknown, Schema.SchemaError>;
//#endregion
export { TypeSchema_d_exports, compile, is, normalize };
//# sourceMappingURL=TypeSchema.d.ts.map