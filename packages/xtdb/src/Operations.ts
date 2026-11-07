import { Effect } from "effect";
import { ReadError } from "@triplex-build/triplex/runtime";
import type { XtdbClient } from "./XtdbClient.js";

export type OperationResolution =
  | {
      readonly status: "committed";
      readonly operationId: string;
      readonly attemptId: string;
      readonly position: number;
    }
  | { readonly status: "unresolved"; readonly operationId: string };

/**
 * Resolve an operation identity returned by TransactionOutcomeUnknown. Absence
 * never proves rejection: submission or processing may still be in progress.
 * Application replay across process crashes should use a caller command ID.
 */
export const resolveXtdbOperation = (
  client: XtdbClient,
  scopeKey: string,
  operationId: string,
): Effect.Effect<OperationResolution, ReadError> =>
  Effect.tryPromise({
    try: async (signal) => {
      if (!operationId || operationId.length > 1024)
        throw new TypeError("Invalid operation identity");
      const rows = await client.query<{
        operation_id: unknown;
        attempt_id: unknown;
        position: unknown;
      }>(
        "SELECT operation_id, attempt_id, position FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = ? AND operation_id = ?",
        [scopeKey, operationId],
        undefined,
        { signal, timeoutMs: 30_000 },
      );
      if (!rows.length) return { status: "unresolved", operationId };
      const row = rows[0]!;
      const position = Number(row.position);
      if (!Number.isSafeInteger(position) || position < 0 || typeof row.attempt_id !== "string")
        throw new Error("Invalid durable operation receipt");
      return { status: "committed", operationId, attemptId: row.attempt_id, position };
    },
    catch: (cause) => new ReadError({ message: "Cannot resolve XTDB operation outcome", cause }),
  });
