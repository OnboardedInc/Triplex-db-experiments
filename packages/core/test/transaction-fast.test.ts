import { describe, expect, it, vi } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Triples } from "../src/store/Triples.js";
import { TriplesLive } from "../src/store/TriplesLive.js";
import { StorageAdapter } from "../src/storage/StorageAdapter.js";
import { QueryExecutor } from "../src/storage/QueryExecutor.js";
import { TripleStoreRuntimeLive } from "../src/store/TripleStoreRuntime.js";
import { ValueDomains } from "../src/ValueDomain.js";
// [DX-B4-T1] Why: optional members must retain decline, absence and validation semantics on every adapter.
// Rejected: testing only the native gateway (would miss core fallback regressions).
describe("optional journal reads", () => {
  it("passes waitMs, falls back only on undefined and rejects invalid bounds before IO", async () => {
    const query = vi.fn(() => Effect.succeed([]));
    const feed = vi.fn(() =>
      Effect.succeed(undefined as { txId: string; triples: never[] }[] | undefined),
    );
    const command = vi.fn(() => Effect.succeed(undefined as string | null | undefined));
    const runtime = ManagedRuntime.make(
      TriplesLive.pipe(
        Layer.provide(
          Layer.mergeAll(
            Layer.succeed(StorageAdapter, {
              valueDomain: ValueDomains.memory,
              initialize: () => Effect.void,
              query,
              getTransactionsAfter: feed,
              getTransactionIdByCommand: command,
            } as never),
            Layer.succeed(QueryExecutor, {} as never),
            TripleStoreRuntimeLive,
          ),
        ),
      ),
    );
    try {
      const t = await runtime.runPromise(Triples);
      expect(await runtime.runPromise(t.transactions({ after: 7, limit: 3, waitMs: 200 }))).toEqual(
        { transactions: [] },
      );
      expect(feed).toHaveBeenLastCalledWith(7, 3, 200);
      expect(query).toHaveBeenCalledTimes(1);
      feed.mockImplementation(() => Effect.succeed([]));
      await runtime.runPromise(t.transactions());
      expect(query).toHaveBeenCalledTimes(1);
      expect(await runtime.runPromise(t.transactionByCommand("missing"))).toBeNull();
      expect(query).toHaveBeenCalledTimes(2);
      command.mockImplementation(() => Effect.succeed(null));
      expect(await runtime.runPromise(t.transactionByCommand("missing"))).toBeNull();
      expect(query).toHaveBeenCalledTimes(2);
      for (const waitMs of [-1, 0.5, 30001, NaN])
        await expect(runtime.runPromise(t.transactions({ waitMs }))).rejects.toMatchObject({
          _tag: "ReadError",
        });
      expect(feed).toHaveBeenCalledTimes(2);
    } finally {
      await runtime.dispose();
    }
  });
});
