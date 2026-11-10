import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
// [DX-B6-3] Why: actual peer references after eviction must equal the portable row reader.
// Rejected: a cache-only accounting test with no retained gateway session.
describe.skipIf(process.env.DATOMIC_INTEGRATION !== "1")("byte-budget native equivalence", () => {
  it("keeps 1 MiB caches exact over a 2 MiB world without full retries", async () => {
    const budget = 1024 ** 2;
    const client = new DatomicClient(process.env.DATOMIC_GATEWAY_URL!, 30000, 64 * 1024 ** 2, {
      entityCacheBytes: budget,
      rowCacheBytes: budget,
    });
    const scope = DatabaseScope.test(`b6-cache-${randomUUID()}`);
    const a = makeDatomicStorageAdapter(client, scope);
    try {
      await Effect.runPromise(a.initialize());
      let position = 0;
      for (let i = 0; i < 128; i++)
        await Effect.runPromise(
          a.withTransaction(
            Effect.gen(function* () {
              position = yield* a.nextCommitPosition();
              yield* a.insert(
                {
                  entityId: `subject-${i}`,
                  attribute: ":value",
                  value: { type: "string", value: "x".repeat(16384) + i },
                  validFrom: 0,
                },
                `_tx/${String(i).padStart(26, "0")}`,
                1000 + i,
                `row-${i}`,
                position,
              );
            }),
          ),
        );
      const basis = { validAt: 2000, recordedPosition: position };
      for (let round = 0; round < 2; round++)
        for (let i = 0; i < 128; i++) {
          expect(await Effect.runPromise(a.getReachRows!(`subject-${i}`, basis))).toEqual(
            await Effect.runPromise(a.getByEntity(`subject-${i}`, basis)),
          );
          expect(client.reachCache.bytes).toBeLessThanOrEqual(budget);
          expect(client.rowCache.bytes).toBeLessThanOrEqual(budget);
        }
      expect(client.reachCache.evictions).toBeGreaterThan(0);
      expect(client.reachDiagnostics.needRequests).toBeGreaterThan(0);
      expect(client.reachDiagnostics.fullRetries).toBe(0);
      console.log(
        JSON.stringify({
          cacheBudget: budget,
          entities: client.reachCache.bytes,
          rows: client.rowCache.bytes,
          diagnostics: client.reachDiagnostics,
        }),
      );
    } finally {
      await client.delete(scope);
      client.close();
    }
  }, 120000);
});
