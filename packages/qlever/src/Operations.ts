import { instantOf } from "@triplex-build/triplex";
import { Effect } from "effect";
import { ReadError } from "@triplex-build/triplex/runtime";
import type { QleverClient } from "./QleverClient.js";
import { graphIri, operationIri, fieldIri } from "./rdf.js";

export type QleverOperationResolution =
  | {
      readonly status: "committed";
      readonly operationId: string;
      readonly attemptId: string;
      readonly position: number;
      readonly instant: number;
    }
  | { readonly status: "unresolved"; readonly operationId: string };

/** A missing operation marker is never proof of rejection or permission to replay. */
export const resolveQleverOperation = (
  client: QleverClient,
  scopeKey: string,
  operationId: string,
): Effect.Effect<QleverOperationResolution, ReadError> =>
  Effect.tryPromise({
    try: async (signal) => {
      if (!operationId || operationId.length > 1024)
        throw new TypeError("Invalid operation identity");
      const rows = await client.query(
        `SELECT ?operation ?attempt ?position ?stamp WHERE { GRAPH ${graphIri(scopeKey)} { ${operationIri(operationId)} ${fieldIri("operation_id")} ?operation ; ${fieldIri("attempt_id")} ?attempt ; ${fieldIri("position")} ?position ; ${fieldIri("stamp")} ?stamp } }`,
        { signal, timeoutMs: 30_000 },
      );
      if (!rows.length) return { status: "unresolved", operationId };
      const position = Number(rows[0]!["position"]?.value);
      const attemptId = rows[0]!["attempt"]?.value;
      if (
        rows.length !== 1 ||
        rows[0]!["operation"]?.value !== operationId ||
        !Number.isSafeInteger(position) ||
        position < 1 ||
        !attemptId
      )
        throw new TypeError("Invalid QLever operation marker");
      return {
        status: "committed",
        operationId,
        attemptId,
        position,
        instant: instantOf(Number(rows[0]!["stamp"]?.value)),
      };
    },
    catch: (cause) => new ReadError({ message: "Cannot resolve QLever operation outcome", cause }),
  });
