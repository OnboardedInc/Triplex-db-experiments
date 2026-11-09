import { Effect } from "effect";
import type { TransactOp } from "../Triple.js";
import { ValueDomains, invalidValue, type ValueDomain } from "../ValueDomain.js";
import { InvalidTripleError } from "../errors/index.js";

// [EXP-GS12F] Why: malformed wire values must fail before command claims or adapter packing.
// Rejected: adapter-only validation (packing exceptions become generic WriteError).
export const invalidAssertValue = (
  operations: readonly TransactOp[],
  domain: ValueDomain = ValueDomains.memory,
): InvalidTripleError | undefined => {
  for (const operation of operations) {
    if (operation.op === "assert") {
      const error = invalidValue(operation.value, domain);
      if (error) return error;
    }
  }
  return undefined;
};

// [EXP-GS12F] Why: some backend transaction callbacks map every failure to WriteError.
// Rejected: validation inside the callback (SQLite and KV regression tests exposed wrapping).
export const withValidAssertValues = <A, E, R>(
  operations: readonly TransactOp[],
  effect: Effect.Effect<A, E, R>,
  domain: ValueDomain = ValueDomains.memory,
): Effect.Effect<A, E | InvalidTripleError, R> =>
  Effect.suspend<A, E | InvalidTripleError, R>(() => {
    const invalid = invalidAssertValue(operations, domain);
    return invalid ? Effect.fail(invalid) : effect;
  });
