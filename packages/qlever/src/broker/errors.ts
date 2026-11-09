/**
 * Typed read failures for the broker composition (V-P2Q findings C1, C2, M2, M3; RULINGS Q58a, Q62a).
 *
 * Both keep ReadError's tag, as TransactionOutcomeUnknown keeps WriteError's, so every adapter and executor
 * signature (`Effect<..., ReadError>`) stays unchanged; callers branch on `reason` or `instanceof`. The reasons
 * are the contract's strings, `basis-not-reached` and `replica-unreachable` (RULINGS Q72c). Core tagged errors
 * (`_tag` "BasisNotAvailable" / "ReplicaUnavailable", Q67h) come before the broker becomes a default; until then
 * no claim may close an obligation pinned to E-BASIS-NOT-AVAILABLE or E-REPLICA-UNAVAILABLE.
 * - BasisNotAvailable: the surface waited within its deadline and the source (the replica's real marker, or the
 *   broker's resolved prefix) did not reach the required basis. Nothing was answered.
 * - ReplicaUnavailable: the replica could not be reached and the surface has no exact fallback (Datalog,
 *   dependencyState, native SPARQL). Repository pulls do not raise it: they fall back to the broker's log.
 */
import { qleverTransportCodes } from "./transport-codes.js";
import { ReadError } from "@triplex-build/triplex/runtime";
import { QleverHttpError, QleverRequestError, QleverDecodeError } from "../QleverClient.js";

export type BasisSurface = "repository" | "datalog" | "dependency-state" | "native" | "a0-repository";

export class BasisNotAvailable extends ReadError {
  readonly reason = "basis-not-reached" as const;
  readonly required: number;
  readonly observed: number;
  readonly replica: string;
  readonly surface: BasisSurface;
  readonly waitedMs: number;
  constructor(input: {
    readonly required: number;
    readonly observed: number;
    readonly replica: string;
    readonly surface: BasisSurface;
    readonly waitedMs: number;
    readonly cause?: unknown;
  }) {
    super({
      message: `Basis ${input.required} is not available on ${input.replica} for ${input.surface} reads (observed ${input.observed} after ${Math.round(input.waitedMs)} ms)`,
      ...(input.cause === undefined ? {} : { cause: input.cause }),
    });
    this.required = input.required;
    this.observed = input.observed;
    this.replica = input.replica;
    this.surface = input.surface;
    this.waitedMs = input.waitedMs;
  }
}

export class ReplicaUnavailable extends ReadError {
  readonly reason = "replica-unreachable" as const;
  readonly replica: string;
  readonly surface: BasisSurface;
  readonly required?: number;
  readonly observed?: number;
  constructor(input: {
    readonly replica: string;
    readonly surface: BasisSurface;
    readonly required?: number;
    readonly observed?: number;
    readonly cause?: unknown;
  }) {
    super({
      message: `QLever replica ${input.replica} is unreachable for ${input.surface} reads: ${String(input.cause)}`,
      ...(input.cause === undefined ? {} : { cause: input.cause }),
    });
    this.replica = input.replica;
    this.surface = input.surface;
    if (input.required !== undefined) this.required = input.required;
    if (input.observed !== undefined) this.observed = input.observed;
  }
}

/**
 * Whether a client failure means "the replica cannot be reached" (connection refused or reset, socket hang up,
 * a request deadline, an aborted request, an HTTP 5xx) rather than a bad query (HTTP 4xx, a decode error).
 */
export const isUnreachable = (error: unknown): boolean => {
  // [EXP-P2Q] Why: only structured request/socket identities prove an outage; decode prose does not.
  // Rejected: returning on the first positive (a deeper HTTP/basis/decode failure must stay distinct).
  const seen = new Set<unknown>();
  let current = error;
  let transport = false;
  for (let depth = 0; depth < 32 && current != null && !seen.has(current); depth++) {
    seen.add(current);
    if (
      current instanceof BasisNotAvailable ||
      current instanceof SyntaxError ||
      current instanceof QleverDecodeError
    )
      return false;
    if (current instanceof QleverHttpError) {
      if (current.status < 500) return false;
      transport = true;
    }
    const code = (current as { code?: unknown }).code;
    const classification = typeof code === "string" ? qleverTransportCodes.get(code) : undefined;
    if (classification === false) return false;
    if (
      current instanceof QleverRequestError ||
      (current instanceof DOMException &&
        (current.name === "AbortError" || current.name === "TimeoutError")) ||
      classification === true
    )
      transport = true;
    current = (current as { cause?: unknown }).cause;
  }
  // [EXP-P2Q] Why: an unvisited suffix may contain a protected decode/HTTP/basis failure.
  // Rejected: accepting an early code when the traversal limit hides the remaining cause chain.
  return transport && (current == null || seen.has(current));
};
