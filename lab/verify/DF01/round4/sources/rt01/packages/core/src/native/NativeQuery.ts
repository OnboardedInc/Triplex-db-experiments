/**
 * Schema and evidence contracts shared by native query providers. Native query
 * text stays in its backend language; this module never compiles Datalog.
 */
import { Effect, Schema } from "effect";
import * as TypeExpr from "../config/TypeExpr.js";
import * as TypeSchema from "../config/TypeSchema.js";
import * as CanonicalJson from "../content/CanonicalJson.js";
import * as ContentId from "../content/ContentId.js";
import { integer } from "../Value.js";
import { resolveTemporalBasis, type TemporalBasis, type ReadBasis } from "../Temporal.js";
import { validateDatabaseScope, type DatabaseScope } from "../runtime/DatabaseScope.js";

export interface NativeQueryContract {
  readonly name: string;
  readonly parameters: TypeExpr.TypeExpr;
  /** A runtime type, deliberately not an unchecked generic asserted by a caller. */
  readonly row: TypeExpr.TypeExpr;
}

/** Native providers retain the validated database identity at their boundary. */
export interface NativeReadBasis extends ReadBasis {
  readonly scope: DatabaseScope;
}

export interface NativeReadOptions {
  readonly basis?: TemporalBasis & { readonly recordedPosition?: number };
  readonly timeoutMs?: number;
  readonly maxRows?: number;
  readonly signal?: AbortSignal;
  /** Preserve protocol-native records/terms alongside the declared row decode. */
  readonly includeRaw?: boolean;
}

export interface NativeQueryTrace {
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

export interface NativeQueryStep {
  readonly phase: string;
  readonly language: string;
  readonly query: string;
  readonly parameters: readonly unknown[];
  readonly elapsedMs: number;
}

export interface NativeReadResult {
  readonly rows: readonly unknown[];
  readonly basis: NativeReadBasis;
  readonly trace: NativeQueryTrace;
  readonly rawRows?: readonly unknown[];
}

export const nativeQueryContractId = (contract: NativeQueryContract): string => {
  if (!contract.name || contract.name.length > 1024)
    throw new TypeError("A native query contract requires a name of at most 1024 characters");
  return ContentId.hash(
    "triplex/native-query-contract/v1",
    CanonicalJson.encodeOrThrow(contract as unknown as CanonicalJson.CanonicalValue),
  );
};

export const resolveNativeReadBasis = (input: {
  readonly scope: DatabaseScope;
  readonly options?: NativeReadOptions;
  readonly currentPosition: number;
  readonly now: number;
}): NativeReadBasis => {
  validateDatabaseScope(input.scope);
  if (!Number.isSafeInteger(input.currentPosition) || input.currentPosition < 0)
    throw new RangeError("The current native source position must be a nonnegative safe integer");
  const requested = input.options?.basis?.recordedPosition ?? input.currentPosition;
  if (!Number.isSafeInteger(requested) || requested < 0 || requested > input.currentPosition)
    throw new RangeError("The requested native source position is unavailable");
  return {
    scope: input.scope,
    recordedPosition: requested,
    ...resolveTemporalBasis(input.options?.basis, input.now),
  };
};

export const decodeNativeParameters = (contract: NativeQueryContract, input: unknown) =>
  Schema.decodeUnknownEffect(TypeSchema.compile(contract.parameters))(input);

/**
 * Hydrate only a declared scalar domain. In particular, an int64 carrier must
 * never pass through Number before the signed-64 boundary check. TypeExpr.any
 * remains native data rather than guessing types from a string's spelling.
 */
export const hydrateNativeValue = (type: TypeExpr.TypeExpr, value: unknown): unknown => {
  switch (type._tag) {
    case "Constrained":
      return hydrateNativeValue(type.base, value);
    case "Prim":
      if (type.prim === "int64") {
        if (typeof value === "string" || typeof value === "bigint") return integer(value);
        if (typeof value === "number") {
          if (!Number.isSafeInteger(value)) throw new RangeError("An int64 result was rounded");
          return integer(BigInt(value));
        }
      }
      if (["number", "integer", "instant"].includes(type.prim)) {
        if (typeof value === "bigint") {
          const number = Number(value);
          if (!Number.isSafeInteger(number))
            throw new RangeError("An exact result cannot fit number");
          return number;
        }
        if (typeof value === "string") {
          const number = Number(value);
          if (
            !Number.isFinite(number) ||
            (/^[+-]?\d+$/.test(value) && !Number.isSafeInteger(number))
          )
            throw new RangeError("A numeric native result is not representable");
          return number;
        }
      }
      return value;
    case "List":
      return Array.isArray(value)
        ? value.map((item) => hydrateNativeValue(type.item, item))
        : value;
    case "Struct":
      if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          type.fields[key] ? hydrateNativeValue(type.fields[key].type, item) : item,
        ]),
      );
    case "Union":
      // A native text carrier already admitted as text must not be guessed into
      // an int64 merely because another union member admits decimal digits.
      if (TypeSchema.is(type, value)) return value;
      for (const member of type.members) {
        try {
          const candidate = hydrateNativeValue(member, value);
          if (TypeSchema.is(member, candidate)) return candidate;
        } catch {
          // Another declared union member may admit the original native value.
        }
      }
      return value;
    default:
      return value;
  }
};

export const decodeNativeRows = (contract: NativeQueryContract, rows: readonly unknown[]) =>
  Effect.forEach(rows, (row) =>
    Effect.flatMap(
      Effect.try(() => hydrateNativeValue(contract.row, row)),
      Schema.decodeUnknownEffect(TypeSchema.compile(contract.row)),
    ),
  );

/** JSON-safe evidence preserves bigint and negative-zero parameter identity. */
export const nativeEvidenceValue = (value: unknown): unknown => {
  if (typeof value === "bigint") return integer(value);
  // Ordinary JSON emits the same number for +0 and -0. Keep the binary64 sign
  // before serialization so a native trace/parameter digest can distinguish
  // them. This evidence carrier is never a replacement for the native value
  // sent to a backend or returned through the declared row decoder.
  // https://tc39.es/ecma262/#sec-samevalue
  if (typeof value === "number" && Object.is(value, -0))
    return { type: "float64", bits: "8000000000000000" };
  if (Array.isArray(value)) return value.map(nativeEvidenceValue);
  if (typeof value === "object" && value !== null)
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, nativeEvidenceValue(item)]),
    );
  return value;
};

export const nativeAttributeKey = (attribute: string | { readonly key: string }): string => {
  const key = typeof attribute === "string" ? attribute : attribute.key;
  if (!key || !key.isWellFormed()) throw new TypeError("Invalid native attribute identity");
  return key;
};
