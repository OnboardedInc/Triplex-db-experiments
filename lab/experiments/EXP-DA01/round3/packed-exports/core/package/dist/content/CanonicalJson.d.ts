import { Effect } from "effect";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/content/CanonicalJson.d.ts
declare namespace CanonicalJson_d_exports {
  export { CanonicalEncodingError, CanonicalValue, encode, encodeOrThrow };
}
type CanonicalValue = null | boolean | number | string | ReadonlyArray<CanonicalValue | undefined> | {
  readonly [key: string]: CanonicalValue | undefined;
};
declare const CanonicalEncodingError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "CanonicalEncodingError";
} & Readonly<A>;
declare class CanonicalEncodingError extends CanonicalEncodingError_base<{
  /** Dotted path to the offending value, e.g. `attrs.rule.conditions[2]`. */readonly path: string;
  readonly reason: "non_finite_number" | "unsupported_type" | "circular_reference";
  readonly message: string;
}> {}
/** Encode without the Effect wrapper. Throws `CanonicalEncodingError`. */
declare const encodeOrThrow: (value: CanonicalValue) => string;
declare const encode: (value: CanonicalValue) => Effect.Effect<string, CanonicalEncodingError>;
//#endregion
export { CanonicalEncodingError, CanonicalJson_d_exports, CanonicalValue, encode, encodeOrThrow };
//# sourceMappingURL=CanonicalJson.d.ts.map