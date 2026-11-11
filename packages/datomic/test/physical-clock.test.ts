import { expect, it } from "vitest";
import { Effect } from "effect";
import { randomUUID } from "node:crypto";
import { DatomicClient, DatomicHttpError } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { physicalInstant, observeInstant, registerCommit, sendCommit } from "../src/CommitOrder.js";

// [DX-R3-P7] Why: strict clock ownership is the physical transaction, not the logical journal.
// Rejected: testing only increasing sequential calls (cannot reveal mixed clocks in an outer batch).
it("shares a strict physical instant, advances on retry, and keeps non-strict logical instants", () => {
  const scope = randomUUID(),
    order = {};
  expect(physicalInstant(scope, 100, order, true)).toBe(100);
  expect(physicalInstant(scope, 101, order, true)).toBe(100);
  observeInstant(scope, 1000);
  expect(physicalInstant(scope, 99, {}, true)).toBe(1001);
  expect(physicalInstant(scope, 99, {}, true)).toBe(1002);
  expect(physicalInstant(scope, 99, order, false)).toBe(1003);
});

it("uses the stored policy and shares the outer instant through nested adapter callbacks", async () => {
  const client = new DatomicClient("http://127.0.0.1:1");
  client.create = async () => ({
    db: "scope",
    created: false,
    schemaHash: "",
    strictRecordClocks: true,
  });
  client.begin = async () => ({ handle: "held", position: 0 });
  client.release = async () => ({});
  const adapter = makeDatomicStorageAdapter(client, randomUUID());
  try {
    await Effect.runPromise(adapter.initialize());
    const times = await Effect.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          const first = yield* adapter.transactionInstant!(100);
          const second = yield* adapter.withTransaction(adapter.transactionInstant!(200));
          return [first, second, yield* adapter.transactionInstant!(300)];
        }),
        { replaySafe: true },
      ),
    );
    expect(times).toEqual([100, 100, 100]);
  } finally {
    client.close();
  }
});

// [DX-R3-P7] Why: a source-rejected commit consumed its handover turn, and retries need the next sequence.
// Rejected: reusing an already submitted turn or waiting for its ACK before sending independent work.
it("keeps 32 sends contiguous across a clock rejection and its retry", async () => {
  const lane = {},
    sequences: number[] = [];
  const results = await Promise.allSettled(
    Array.from({ length: 32 }, (_, i) =>
      sendCommit(registerCommit(i, lane), async (sequence, sent) => {
        sequences.push(sequence);
        sent();
        if (i === 7) throw new DatomicHttpError(409, "ClockConflict", "TRIPLEX_CLOCK 100", 100);
        return sequence;
      }),
    ),
  );
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect(sequences).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  await sendCommit(registerCommit(1000, lane), async (n, sent) => {
    sent();
    expect(n).toBe(33);
  });
});

it("replays a rejected adapter transaction above the returned maximum with a fresh ordered turn", async () => {
  const client = new DatomicClient("http://127.0.0.1:1");
  client.create = async () => ({
    db: "scope",
    created: false,
    schemaHash: "",
    strictRecordClocks: true,
  });
  client.begin = async () => ({ handle: "held", position: 0 });
  client.release = async () => ({});
  const submitted: { sequence: number; time: number }[] = [];
  client.transact = async (_db, input) => {
    input.onSent?.();
    submitted.push({ sequence: input.sendSequence!, time: input.rows[0]!.recorded_at });
    if (submitted.length === 1)
      throw new DatomicHttpError(409, "ClockConflict", "TRIPLEX_CLOCK 1000", 1000);
    return {
      operationId: input.operationId,
      position: { t: "long", v: "1" },
      t: { t: "long", v: "1" },
      datoms: 1,
    };
  };
  const adapter = makeDatomicStorageAdapter(client, randomUUID());
  try {
    await Effect.runPromise(adapter.initialize());
    await Effect.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          const time = yield* adapter.transactionInstant!(100);
          const position = yield* adapter.nextCommitPosition();
          yield* adapter.insert(
            {
              entityId: "root",
              attribute: ":probe/value",
              value: { type: "string", value: "v" },
            } as any,
            "tx",
            time,
            "row",
            position,
          );
        }),
        { replaySafe: true },
      ),
    );
    expect(submitted).toEqual([
      { sequence: 1, time: 100 },
      { sequence: 2, time: 1001 },
    ]);
    expect(client.commitDiagnostics.clockReplays).toBe(1);
  } finally {
    client.close();
  }
});
