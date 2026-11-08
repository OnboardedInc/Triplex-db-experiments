/**
 * @triplex-build/w0: the TypeScript reference kernel for the W0 world definition (lab/world/W0/SPEC.md, W0-1.1.2).
 *
 * The functions are pure and return plain values; this module adds the Effect boundary only (typed errors as tagged values
 * carrying the SPEC 4.4 `W0.E_*` codes). Nothing inside the rules or the arithmetic runs on the Effect runtime.
 */
import { Data, Effect } from "effect";
import { affectedSubjects } from "./affected.js";
import type { Basis, Failure, Output, World } from "./kernel.js";
import { evaluateWorld, isFailure, outputJson, reconcileWorld } from "./kernel.js";
import type { EvaluationRecord } from "./outbox.js";
import { recordOf } from "./outbox.js";
import type { Activation, CompiledRelease } from "./release.js";
import type { W0ErrorCode } from "./schema.js";

export * from "./affected.js";
export * from "./dates.js";
export * from "./json.js";
export * from "./kernel.js";
export * from "./ops.js";
export * from "./outbox.js";
export * from "./population.js";
export * from "./release.js";
export * from "./schema.js";

/** A W0 error (SPEC 4.4) as a tagged value. */
export class W0Error extends Data.TaggedError("W0Error")<{ readonly code: W0ErrorCode }> {}

const lift = (r: Output | Failure): Effect.Effect<Output, W0Error> =>
  isFailure(r) ? Effect.fail(new W0Error({ code: r.error })) : Effect.succeed(r);

/** SPEC 1 `evaluate` as an Effect. */
export const evaluate = (
  world: World,
  release: CompiledRelease,
  basis: Basis,
): Effect.Effect<Output, W0Error> =>
  Effect.suspend(() => lift(evaluateWorld(world, release, basis)));

/** SPEC 1 `reconcile` as an Effect. */
export const reconcile = (
  world: World,
  activations: readonly Activation[],
  basis: Basis,
): Effect.Effect<Output, W0Error> =>
  Effect.suspend(() => lift(reconcileWorld(world, activations, basis)));

/** SPEC 10 `affected` as an Effect. */
export const affected = (
  release: CompiledRelease,
  worlds: readonly World[],
  writes: readonly (readonly [string, string])[],
  basis: Basis,
): Effect.Effect<readonly string[], W0Error> =>
  Effect.suspend(() => {
    const r = affectedSubjects(release, worlds, writes, basis);
    return "error" in r ? Effect.fail(new W0Error({ code: r.error })) : Effect.succeed(r.affected);
  });

/** What the P5 sweep needs from one subject after its Triplex read: the output, its bytes and its outbox record. */
export interface SubjectResult {
  readonly output: Output;
  /** canonicalJson(output) (SPEC 9) */
  readonly json: string;
  /** the SPEC 8.8 evaluation record to hand to `publish` (live reconciles only, RULINGS Q44c) */
  readonly record: EvaluationRecord;
}

/**
 * The per-subject entry point for the P5 sweep: one subject's facts at the sweep's pinned basis and the release, in; the
 * subject's outputs (work items included), canonical bytes and evaluation record, out. Pure and synchronous.
 */
export function sweepSubject(
  world: World,
  release: CompiledRelease,
  basis: Basis,
): SubjectResult | { error: W0ErrorCode } {
  const r = evaluateWorld(world, release, basis);
  if (isFailure(r)) return r;
  return { output: r, json: outputJson(r), record: recordOf(r) };
}
