/**
 * The writer's exact-value guard: reject, before any mutation, a value the ledger would change.
 *
 * [EXP-F02b] Why: Sam's numeric rule (lab/SCOPE.md 2.4: a hard error, never silent conversion) and
 * RULINGS Q30a/Q30b/Q23. Both lane adapters encode JSON with `JSON.stringify`, which writes -0 as
 * 0, so EXP-F02 saw `ledger json neg-zero-in-object` and `ledger json neg-zero-in-list` come back
 * as 0 on xtdb and qlever. Q30a: a JSON value with -0 or a non-finite number is rejected with
 * InvalidTripleError / invalid-value (detail `inexact-json-number`), before CanonicalJson or any
 * lane encoder runs. Q30b: an instant given as -0 is rejected, never turned into 0 (F02 finding 3:
 * `projection-scalar instant neg-zero`, `projection-literal instant neg-zero`,
 * `native-ledger/value_datetime_native instant neg-zero`). Blob metadata is canonical JSON too, so
 * a blob size of -0 (which every lane writes back as 0) is refused under Q30a.
 * Kept: a `number` -0 is a legitimate binary64 value and keeps its sign (RULINGS Q21 AMB-04).
 * Qualified routes (Q23): the Triplex writer calls this; bulk import, replay and restore must call
 * it too (and `ExactJson.firstInexactNumberText` on JSON text they parse).
 * Rejected: normalizing in place (silent conversion); a check inside each lane adapter (the
 * journal writes number -0 through the same JSON path, so an adapter-level -0 refusal would break
 * legitimate number -0 assertions).
 */
import { Effect } from "effect";

import * as ExactJson from "../content/ExactJson.js";
import { InvalidTripleError } from "../errors/index.js";
import type { TransactOp } from "../Triple.js";
import type { TripleValue } from "../Value.js";

const invalid = (field: string, value: string, detail: string, message: string) =>
  new InvalidTripleError({ field, value, message, reason: "invalid-value", detail });

/** The typed rejection for one value, or `undefined` when every lane stores it exactly. */
export const inexactValueError = (
  value: TripleValue,
  field = "value",
): InvalidTripleError | undefined => {
  switch (value.type) {
    case "json": {
      const found = ExactJson.firstInexactNumber(value.value);
      return found === undefined
        ? undefined
        : invalid(
            field,
            `${found.path} = ${found.text}`,
            "inexact-json-number",
            `JSON value has ${found.text} at ${found.path} (${found.reason}); JSON cannot carry it exactly and it is rejected, not normalized (RULINGS Q30a)`,
          );
    }
    case "datetime":
      return Object.is(value.value, -0)
        ? invalid(
            field,
            "-0",
            "negative-zero-instant",
            "An instant of -0 is rejected, never turned into 0 (RULINGS Q30b)",
          )
        : undefined;
    case "blob":
      return Object.is(value.size, -0)
        ? invalid(
            `${field}.size`,
            "-0",
            "inexact-json-number",
            "Blob size -0 cannot be carried by the canonical JSON metadata (RULINGS Q30a)",
          )
        : undefined;
    default:
      return undefined;
  }
};

/** The first assert operation whose value is inexact, as a typed error naming its index. */
export const inexactAssertError = (
  operations: ReadonlyArray<TransactOp>,
): InvalidTripleError | undefined => {
  for (const [index, operation] of operations.entries()) {
    if (operation.op !== "assert") continue;
    const error = inexactValueError(operation.value, `operations[${index}].value`);
    if (error !== undefined) return error;
  }
  return undefined;
};

/** Fail with the first inexact assert value; succeed when every value is exact. */
export const requireExactOperations = (
  operations: ReadonlyArray<TransactOp>,
): Effect.Effect<void, InvalidTripleError> => {
  const error = inexactAssertError(operations);
  return error === undefined ? Effect.void : Effect.fail(error);
};
