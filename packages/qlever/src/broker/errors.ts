/**
 * Typed read failures for the broker composition (V-P2Q findings C1, C2, M2, M3; RULINGS Q58a, Q62a).
 *
 * Both keep ReadError's tag, as TransactionOutcomeUnknown keeps WriteError's, so every adapter and executor
 * signature (`Effect<..., ReadError>`) stays unchanged; callers branch on `reason` or `instanceof`.
 * - BasisNotAvailable: the surface waited within its deadline and the source (the replica's real marker, or the
 *   broker's resolved prefix) did not reach the required basis. Nothing was answered.
 * - ReplicaUnavailable: the replica could not be reached and the surface has no exact fallback (Datalog,
 *   dependencyState, native SPARQL). Repository pulls do not raise it: they fall back to the broker's log.
 */
import { ReadError } from "@triplex-build/triplex/runtime";
import { QleverHttpError } from "../QleverClient.js";

export type BasisSurface = "repository" | "datalog" | "dependency-state" | "native" | "a0-repository";

export class BasisNotAvailable extends ReadError {
  readonly reason = "basis-not-available" as const;
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
  readonly reason = "replica-unavailable" as const;
  readonly replica: string;
  readonly surface: BasisSurface;
  constructor(input: { readonly replica: string; readonly surface: BasisSurface; readonly cause?: unknown }) {
    super({
      message: `QLever replica ${input.replica} is unreachable for ${input.surface} reads: ${String(input.cause)}`,
      ...(input.cause === undefined ? {} : { cause: input.cause }),
    });
    this.replica = input.replica;
    this.surface = input.surface;
  }
}

/**
 * Whether a client failure means "the replica cannot be reached" (connection refused or reset, socket hang up,
 * a request deadline, an aborted request, an HTTP 5xx) rather than a bad query (HTTP 4xx, a decode error).
 */
export const isUnreachable = (error: unknown): boolean => {
  if (error instanceof QleverHttpError) return error.status >= 500;
  const text = `${(error as { code?: string })?.code ?? ""} ${String((error as Error)?.message ?? error)}`;
  return /ECONNREFUSED|ECONNRESET|EPIPE|ETIMEDOUT|EHOSTUNREACH|ENOTFOUND|socket hang up|deadline|aborted|timed? ?out|fetch failed|connect/i.test(
    text,
  );
};
