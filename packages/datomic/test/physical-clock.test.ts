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
  const adapter = makeDatomicStorageAdapter(client, randomUUID(), { serverRecordTime: false });
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
  const adapter = makeDatomicStorageAdapter(client, randomUUID(), { serverRecordTime: false });
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

// [DX-R3-P7] Why: clock conflict recovery must advance even when adding one loses precision.
// Rejected: exercising only Date.now-sized maxima (misses supported large finite imported times).
it("advances large finite maxima exactly or fails before allocating an impossible clock", async () => {
  const { issueInstant } = await import("../src/CommitOrder.js");
  for (const maximum of [2 ** 53, 1e20, -1e20]) {
    const scope = randomUUID();
    observeInstant(scope, maximum);
    const first = issueInstant(scope, maximum);
    expect(Number.isFinite(first)).toBe(true);
    expect(first).toBeGreaterThan(maximum);
    expect(issueInstant(scope, maximum)).toBeGreaterThan(first);
  }
  const exhausted = randomUUID();
  observeInstant(exhausted, Number.MAX_VALUE);
  expect(() => issueInstant(exhausted, 100)).toThrow("exhausted");
  expect(() => observeInstant(randomUUID(), Infinity)).toThrow("finite");
  expect(() => issueInstant(randomUUID(), NaN)).toThrow("finite");
});

it("returns a typed clock-exhaustion error without consuming an ordered send", async () => {
  const client = new DatomicClient("http://127.0.0.1:1"),
    scope = randomUUID();
  client.create = async () => ({
    db: "scope",
    created: false,
    schemaHash: "",
    strictRecordClocks: true,
  });
  client.begin = async () => ({ handle: "held", position: 0 });
  client.release = async () => ({});
  client.transact = async () => {
    throw new Error("exhausted clock must never submit");
  };
  const adapter = makeDatomicStorageAdapter(client, scope, { serverRecordTime: false });
  try {
    await Effect.runPromise(adapter.initialize());
    observeInstant(scope, Number.MAX_VALUE);
    await expect(
      Effect.runPromise(
        adapter.withTransaction(adapter.transactionInstant!(100), { replaySafe: true }),
      ),
    ).rejects.toThrow("Cannot allocate a finite record clock");
    await sendCommit(registerCommit(100, client), async (sequence, sent) => {
      sent();
      expect(sequence).toBe(1);
    });
  } finally {
    client.close();
  }
});
