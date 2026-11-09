import { Effect, Schema } from "effect";
import type { TransactOp } from "../Triple.js";
import { TripleValue } from "../Value.js";
import { InvalidTripleError } from "../errors/index.js";

const isTripleValue = Schema.is(TripleValue);

// [EXP-GS12F] Why: malformed wire values must fail before command claims or adapter packing.
// Rejected: adapter-only validation (packing exceptions become generic WriteError).
export const invalidAssertValue = (
  operations: readonly TransactOp[],
): InvalidTripleError | undefined => {
  for (const operation of operations) {
    if (operation.op === "assert" && !isTripleValue(operation.value)) {
      return new InvalidTripleError({
        field: "value",
        value: operation.value,
        message: `Invalid triple value for ${operation.attribute} on ${operation.entityId}`,
      });
    }
  }
  return undefined;
};

// [EXP-GS12F] Why: some backend transaction callbacks map every failure to WriteError.
// Rejected: validation inside the callback (SQLite and KV regression tests exposed wrapping).
export const withValidAssertValues = <A, E, R>(
  operations: readonly TransactOp[],
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | InvalidTripleError, R> =>
  Effect.suspend<A, E | InvalidTripleError, R>(() => {
    const invalid = invalidAssertValue(operations);
    return invalid ? Effect.fail(invalid) : effect;
  });
