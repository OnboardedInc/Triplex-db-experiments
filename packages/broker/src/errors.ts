import { ReadError } from "@triplex-build/triplex/runtime";

export type BasisSurface =
  | "repository"
  | "datalog"
  | "dependency-state"
  | "native"
  | "a0-repository";

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
      message: `Replica ${input.replica} is unreachable for ${input.surface} reads: ${String(input.cause)}`,
      ...(input.cause === undefined ? {} : { cause: input.cause }),
    });
    this.replica = input.replica;
    this.surface = input.surface;
    if (input.required !== undefined) this.required = input.required;
    if (input.observed !== undefined) this.observed = input.observed;
  }
}
