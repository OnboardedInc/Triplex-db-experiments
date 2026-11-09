/**
 * Typed failures of the XTDB native task library (EXP-X02).
 *
 * [EXP-X02] Why: acceptance RULINGS Q8a asks for the exact int64 total or a typed
 * `integer-overflow` error when, and only when, the final total is outside int64. The
 * interim XTQL reachability must fail typed, never return a truncated closure, when its
 * explicit depth budget is exhausted. Plain `Error`s would be indistinguishable from
 * engine or transport failures in the runner's FAIL_PUBLIC_API bucket.
 */
import { Data, Effect } from "effect";
import { integer } from "@triplex-build/triplex";

export class NativeIntegerOverflowError extends Data.TaggedError("NativeIntegerOverflowError")<{
  readonly code: "integer-overflow";
  readonly message: string;
  readonly cause?: unknown;
}> {}

// [EXP-C8] NativeRecursionDepthError (the interim XTQL depth unrolling's budget) is gone: closure
// budgets now fail with the shared RecursionBudgetExceeded from @triplex-build/triplex/runtime.

export class NativeEngineHazardError extends Data.TaggedError("NativeEngineHazardError")<{
  readonly code: "mark-join-build-limit";
  readonly message: string;
}> {}

const MIN = -(2n ** 63n),
  MAX = 2n ** 63n - 1n;

/** Exact int64 or the typed overflow error; for host-side final arithmetic (workload 07). */
export const checkedInt64 = (value: bigint) => {
  if (value < MIN || value > MAX)
    throw new NativeIntegerOverflowError({
      code: "integer-overflow",
      message: `Native int64 result ${value} is outside the signed 64-bit range`,
    });
  return integer(value);
};

const messages = (cause: unknown): string => {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  for (let current = cause; current && !seen.has(current); ) {
    seen.add(current);
    parts.push(String((current as { message?: unknown }).message ?? current));
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(" | ");
};

/**
 * Map the engine's checked-arithmetic failure of an exact-sum query to the typed error.
 *
 * Sound only for queries built with xtdb-exact-sum.ts: there, the only arithmetic that can
 * overflow is the final recombination, and it overflows iff the exact total is outside int64
 * (proof in xtdb-exact-sum.ts). The engine text is `data exception - overflow error`
 * (R12 section 7.3; reproduced on the dev slot for SQL `+` and `*` on BIGINT, EXP-X02).
 */
export const typedSumOverflow = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catch((cause: E): Effect.Effect<never, E | NativeIntegerOverflowError> =>
      /data exception - overflow error/.test(messages(cause))
        ? Effect.fail(
            new NativeIntegerOverflowError({
              code: "integer-overflow",
              message: "The exact int64 total is outside the signed 64-bit range",
              cause,
            }),
          )
        : Effect.fail(cause),
    ),
  );
