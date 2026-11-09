import { it, expect } from "vitest";
import { Effect } from "effect";
import { transactionsForEntity } from "../../src/store/entityTransactionHistory.js";
import { unsafe } from "../../src/Branded.js";
import { BasisNotAvailable } from "../../src/errors/index.js";

it("journal index errors retain the exact typed object", async () => {
  const sentinel = new BasisNotAvailable({
    axis: "recordedAt",
    required: 2,
    observed: 1,
    waitedMs: 0,
    surface: "index",
    message: "sentinel",
  });
  const error = await Effect.runPromise(
    transactionsForEntity(
      {
        currentPosition: () => Effect.succeed(1),
        query: () => Effect.fail(sentinel),
        transaction: () => Effect.succeed(null),
      },
      unsafe.entityId("subject"),
      { snapshotPosition: 1 },
    ).pipe(Effect.flip),
  );
  expect(error).toBe(sentinel);
});
it("waits before any index lookup, binds empty results, and retains the original continuation cut", async () => {
  let position = 0;
  const queries: number[] = [];
  const reader = {
    currentPosition: () => Effect.sync(() => position),
    query: (_q: unknown, snapshot: number) =>
      Effect.sync(() => {
        queries.push(snapshot);
        return { results: [] };
      }),
    transaction: () => Effect.succeed(null),
  };
  const timer = setTimeout(() => {
    position = 1;
  }, 40);
  try {
    const first = await Effect.runPromise(
      transactionsForEntity(reader, unsafe.entityId("missing"), { snapshotPosition: 1 }),
    );
    expect(first).toEqual({ transactions: [], snapshotPosition: 1 });
    expect(queries).toEqual([1]);
    position = 2;
    const next = await Effect.runPromise(
      transactionsForEntity(reader, unsafe.entityId("missing"), {
        snapshotPosition: first.snapshotPosition,
        beforePosition: 1,
      }),
    );
    expect(next.snapshotPosition).toBe(1);
    expect(queries).toEqual([1, 1]);
  } finally {
    clearTimeout(timer);
  }
});
it("future journal snapshots wait then refuse without running the index", async () => {
  let calls = 0;
  const started = performance.now();
  const error = await Effect.runPromise(
    transactionsForEntity(
      {
        currentPosition: () => Effect.succeed(0),
        query: () =>
          Effect.sync(() => {
            calls++;
            return { results: [] };
          }),
        transaction: () => Effect.succeed(null),
      },
      unsafe.entityId("missing"),
      { snapshotPosition: 1 },
    ).pipe(Effect.flip),
  );
  expect(error).toMatchObject({
    _tag: "BasisNotAvailable",
    axis: "recordedPosition",
    required: 1,
    observed: 0,
  });
  expect(calls).toBe(0);
  expect(performance.now() - started).toBeGreaterThanOrEqual(1900);
});

it("pins every positive envelope read and a continuation after the head advances", async () => {
  const tx1 = unsafe.transactionId("_tx/00000000000000000000000001");
  const tx2 = unsafe.transactionId("_tx/00000000000000000000000002");
  let head = 2,
    pages = 0;
  const cuts: number[] = [];
  const reader = {
    currentPosition: () => Effect.sync(() => head),
    query: (_q: unknown, cut: number) =>
      Effect.sync(() => {
        cuts.push(cut);
        return {
          results:
            pages++ === 0
              ? [
                  { "?transaction": tx2, "?position": 2 },
                  { "?transaction": tx1, "?position": 1 },
                ]
              : [{ "?transaction": tx1, "?position": 1 }],
        };
      }),
    transaction: (txId: typeof tx1, cut: number) =>
      Effect.sync(() => {
        cuts.push(cut);
        return { txId, position: txId === tx2 ? 2 : 1, instant: 1000, changes: [] };
      }),
  };
  const first = await Effect.runPromise(
    transactionsForEntity(reader, unsafe.entityId("present"), { limit: 1 }),
  );
  expect(first.transactions[0]!.txId).toBe(tx2);
  expect(first.nextBeforePosition).toBe(2);
  head = 3;
  const next = await Effect.runPromise(
    transactionsForEntity(reader, unsafe.entityId("present"), {
      limit: 1,
      snapshotPosition: first.snapshotPosition,
      beforePosition: first.nextBeforePosition!,
    }),
  );
  expect(next.transactions[0]!.txId).toBe(tx1);
  expect(cuts).toEqual([2, 2, 2, 2]);
});
