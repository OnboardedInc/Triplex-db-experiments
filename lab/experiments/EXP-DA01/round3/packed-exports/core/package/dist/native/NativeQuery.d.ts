import { ReadBasis, TemporalBasis } from "../Temporal.js";
import { TypeExpr } from "../config/TypeExpr.js";
import { DatabaseScope } from "../runtime/DatabaseScope.js";
import { Effect, Schema } from "effect";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/native/NativeQuery.d.ts
interface NativeQueryContract {
  readonly name: string;
  readonly parameters: TypeExpr;
  /** A runtime type, deliberately not an unchecked generic asserted by a caller. */
  readonly row: TypeExpr;
}
/** Native providers retain the validated database identity at their boundary. */
interface NativeReadBasis extends ReadBasis {
  readonly scope: DatabaseScope;
}
interface NativeReadOptions {
  readonly basis?: TemporalBasis & {
    readonly recordedPosition?: number;
  };
  readonly timeoutMs?: number;
  readonly maxRows?: number;
  readonly signal?: AbortSignal;
  /** Preserve protocol-native records/terms alongside the declared row decode. */
  readonly includeRaw?: boolean;
}
interface NativeQueryTrace {
  readonly language: string;
  readonly query: string;
  readonly parameters: readonly unknown[];
  readonly basis: NativeReadBasis;
  readonly mappingId: string;
  readonly contractId: string;
  readonly elapsedMs: number;
  /** Includes basis acquisition and any explicitly charged backend working state. */
  readonly steps?: readonly NativeQueryStep[];
}
interface NativeQueryStep {
  readonly phase: string;
  readonly language: string;
  readonly query: string;
  readonly parameters: readonly unknown[];
  readonly elapsedMs: number;
}
interface NativeReadResult {
  readonly rows: readonly unknown[];
  readonly basis: NativeReadBasis;
  readonly trace: NativeQueryTrace;
  readonly rawRows?: readonly unknown[];
}
declare const nativeQueryContractId: (contract: NativeQueryContract) => string;
declare const resolveNativeReadBasis: (input: {
  readonly scope: DatabaseScope;
  readonly options?: NativeReadOptions;
  readonly currentPosition: number;
  readonly now: number;
}) => NativeReadBasis;
declare const decodeNativeParameters: (contract: NativeQueryContract, input: unknown) => Effect.Effect<unknown, Schema.SchemaError, never>;
/**
 * Hydrate only a declared scalar domain. In particular, an int64 carrier must
 * never pass through Number before the signed-64 boundary check. TypeExpr.any
 * remains native data rather than guessing types from a string's spelling.
 */
declare const hydrateNativeValue: (type: TypeExpr, value: unknown) => unknown;
declare const decodeNativeRows: (contract: NativeQueryContract, rows: readonly unknown[]) => Effect.Effect<unknown[], Schema.SchemaError | _$effect_Cause0.UnknownError, never>;
/** JSON-safe evidence preserves bigint and negative-zero parameter identity. */
declare const nativeEvidenceValue: (value: unknown) => unknown;
declare const nativeAttributeKey: (attribute: string | {
  readonly key: string;
}) => string;
//#endregion
export { NativeQueryContract, NativeQueryStep, NativeQueryTrace, NativeReadBasis, NativeReadOptions, NativeReadResult, decodeNativeParameters, decodeNativeRows, hydrateNativeValue, nativeAttributeKey, nativeEvidenceValue, nativeQueryContractId, resolveNativeReadBasis };
//# sourceMappingURL=NativeQuery.d.ts.map