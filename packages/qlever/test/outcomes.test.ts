import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { EntityId, integer } from "@triplex-build/triplex";
import { TransactionOutcomeUnknown } from "@triplex-build/triplex/runtime";
import { makeQleverClient, type QleverClient } from "../src/QleverClient.js";
import { makeQleverStorageAdapter } from "../src/QleverStorageAdapter.js";
import { resolveQleverOperation } from "../src/Operations.js";

describe.skipIf(process.env["QLEVER_INTEGRATION"] !== "1")(
  "QLever unknown operation recovery",
  () => {
    it("keeps absence unresolved and resolves a delayed submission by durable identity", async () => {
      const real = makeQleverClient(process.env["QLEVER_URL"] ?? "http://127.0.0.1:7019");
      const scope = `delayed-outcome:${randomUUID()}`;
      let pending: string | undefined;
      const uncertain: QleverClient = {
        ...real,
        update: async (sparql) => {
          pending = sparql;
          throw new Error("Injected ambiguous transport failure");
        },
      };
      const adapter = makeQleverStorageAdapter(uncertain, scope, { resolutionTimeoutMs: 40 });
      try {
        const outcome = await Effect.runPromise(
          adapter
            .withTransaction(
              Effect.gen(function* () {
                const position = yield* adapter.nextCommitPosition();
                yield* adapter.insert(
                  {
                    entityId: EntityId.make("delayed:e"),
                    attribute: ":value",
                    value: integer("576460752303423487"),
                    validFrom: 0,
                  },
                  "delayed:tx",
                  100,
                  "delayed:assertion",
                  position,
                );
              }),
            )
            .pipe(Effect.flip),
        );
        expect(outcome).toBeInstanceOf(TransactionOutcomeUnknown);
        if (!(outcome instanceof TransactionOutcomeUnknown))
          throw new Error("Expected typed unknown outcome");
        expect(
          await Effect.runPromise(resolveQleverOperation(real, scope, outcome.operationId)),
        ).toEqual({ status: "unresolved", operationId: outcome.operationId });
        expect(pending).toBeDefined();
        await real.update(pending!);
        expect(
          await Effect.runPromise(resolveQleverOperation(real, scope, outcome.operationId)),
        ).toMatchObject({ status: "committed", operationId: outcome.operationId, position: 1 });
        expect((await Effect.runPromise(adapter.getById("delayed:assertion")))?.value_string).toBe(
          "576460752303423487",
        );
      } finally {
        await real.close();
      }
    });
  },
);
