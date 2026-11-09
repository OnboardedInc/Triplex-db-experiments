import { ValueDomains } from "../src/ValueDomain.js";
import { describe, expect, it } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Triples } from "../src/store/Triples.js";
import { TriplesLive } from "../src/store/TriplesLive.js";
import { StorageAdapter } from "../src/storage/StorageAdapter.js";
import { QueryExecutor } from "../src/storage/QueryExecutor.js";
import { TripleStoreRuntimeLive } from "../src/store/TripleStoreRuntime.js";
import { InvalidTripleError, WriteError } from "../src/errors/index.js";
import { EntityId } from "../src/Branded.js";

// [EXP-GS12F] Why: prove early rejection without depending on backend rollback behavior.
// Rejected: unchanged position alone (an adapter could claim then roll back).
describe("GS12F pre-claim value validation", () => {
  it("rejects the six W01b integers before reaching a command claim", async () => {
    let claims = 0;
    let transactions = 0;
    const adapter = {
      valueDomain: ValueDomains.memory,
      initialize: () => Effect.void,
      supportedValueTypes: ["integer", "string"],
      withTransaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => {
        transactions++;
        return effect;
      },
      claimCommand: () =>
        Effect.suspend(() => {
          claims++;
          return Effect.fail(new WriteError({ message: "claim boundary" }));
        }),
    };
    const runtime = ManagedRuntime.make(
      TriplesLive.pipe(
        Layer.provide(
          Layer.mergeAll(
            Layer.succeed(StorageAdapter, adapter as never),
            Layer.succeed(QueryExecutor, {} as never),
            TripleStoreRuntimeLive,
          ),
        ),
      ),
    );
    try {
      const triples = await runtime.runPromise(Triples);
      for (const value of [
        "9223372036854775808",
        "-9223372036854775809",
        "01",
        "-0",
        "+1",
        "1e3",
      ]) {
        const input = {
          entityId: EntityId.make("probe"),
          attribute: ":probe/integer",
          value: { type: "integer" as const, value },
        };
        for (const write of [
          triples.transact([{ op: "assert", ...input }], { commandId: value }),
          triples.assert(input),
          triples.assertBatch([input]),
        ]) {
          expect(await runtime.runPromise(write.pipe(Effect.flip))).toBeInstanceOf(
            InvalidTripleError,
          );
          expect(claims).toBe(0);
          expect(transactions).toBe(0);
        }
      }
      const error = await runtime.runPromise(
        triples
          .transact(
            [
              {
                op: "assert",
                entityId: EntityId.make("probe"),
                attribute: ":probe/valid",
                value: { type: "integer", value: "9223372036854775807" },
              },
            ],
            { commandId: "valid" },
          )
          .pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(WriteError);
      expect(claims).toBe(1);
      expect(transactions).toBe(1);
    } finally {
      await runtime.dispose();
    }
  });
});
