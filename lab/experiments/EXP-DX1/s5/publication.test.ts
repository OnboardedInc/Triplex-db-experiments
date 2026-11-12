import { localReadTurns } from "../../../bench/lib/w0-replica-live.ts";
import { it, expect } from "vitest";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import {
  outboxEntity,
  bindPublicationProfiles,
  offerLiveWrite,
  finishLiveWrite,
} from "../../../bench/lib/w0-outbox.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
// [DX-S5] Why: exercise actual atomic outbox construction, bounded overlap and stored bytes, including a late failed ACK.
// Rejected: a scheduler-only mock that never applies the publication operations or checks changed coverage.
it("overlaps disjoint frames, preserves invocation order and publishes exact states", async () => {
  const records = Array.from(
    { length: 603 },
    (_, i): W0.EvaluationRecord => ({
      subject: "s" + i,
      release: "R1",
      basis: { tx: 1n, validTime: W0.POPULATION_VALID_TIME },
      workItems: [
        { id: "i" + i, key: "k", kind: "create", payload: "{}", rule: "r", version: "v" },
      ],
    }),
  );
  const stored = new Map<string, any[]>(),
    frames: string[][] = [];
  let active = 0,
    peak = 0;
  const comp = {
    transactionByCommand: async () => ({ ok: true, value: null }),
    transact: async (ops: any[], meta: any) => {
      active++;
      peak = Math.max(peak, active);
      const ids = ops.filter((o) => o.attribute === "p5/state").map((o) => o.entityId);
      frames.push(ids);
      await new Promise((r) => setTimeout(r, ids[0].endsWith("s0") ? 20 : 2));
      expect(meta.preconditions).toEqual([]);
      for (const op of ops) stored.set(op.entityId, [...(stored.get(op.entityId) ?? []), op]);
      active--;
      return { ok: true, value: { position: frames.length, triples: ops } };
    },
  } as unknown as CompositionHandle;
  const result = await publishChanged(comp, records, {
    frameSize: 128,
    inflight: 4,
    readStates: () => [],
  });
  expect(result.changed).toBe(603);
  expect(result.commits).toBe(5);
  expect(peak).toBe(4);
  expect(frames.flat()).toEqual(records.map((r) => outboxEntity(r.subject)));
  for (const record of records) {
    const actual = stored.get(outboxEntity(record.subject))!.find((o) => o.attribute === "p5/state")
      .value.value;
    expect(actual).toBe(canonical(W0.publish(W0.EMPTY_OUTBOX, [record]).state));
  }
  const failed = {
    ...comp,
    transact: async () => {
      await new Promise((r) => setTimeout(r, 1));
      return { ok: false, tag: "injected", error: new Error("injected") };
    },
  } as CompositionHandle;
  await expect(
    publishChanged(failed, records, { frameSize: 128, inflight: 4, readStates: () => [] }),
  ).rejects.toThrow("injected");
});

it("gives pending trace writes priority before publication submission", async () => {
  let submitted = false;
  const comp = {
    transactionByCommand: async () => ({ ok: true, value: null }),
    transact: async () => {
      submitted = true;
      return { ok: true, value: {} };
    },
  } as unknown as CompositionHandle;
  offerLiveWrite();
  const task = publishChanged(
    comp,
    [
      {
        subject: "priority",
        release: "R1",
        basis: { tx: 1n, validTime: W0.POPULATION_VALID_TIME },
        workItems: [
          { id: "item", key: "k", kind: "create", payload: "{}", rule: "r", version: "v" },
        ],
      },
    ],
    { inflight: 1, frameSize: 64, yieldToWriter: true, readStates: () => [] },
  );
  try {
    await new Promise((r) => setTimeout(r, 10));
    expect(submitted).toBe(false);
  } finally {
    finishLiveWrite();
  }
  await task;
  expect(submitted).toBe(true);
});

it("keeps 256 reads outstanding while allowing I/O turns between bounded decode batches", async () => {
  const turn = localReadTurns(),
    reads: Promise<void>[] = [];
  let completed = 0;
  for (let i = 0; i < 256; i++)
    reads.push(
      turn().then(() => {
        completed++;
      }),
    );
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(completed).toBe(8);
  await Promise.all(reads);
  expect(completed).toBe(256);
});

it("binds concurrent profiling by the actual receipt rather than a shared callback context", () => {
  const a = {
    operationId: "op-a",
    transactionIds: ["_tx/a"],
    httpCalls: 1,
    attempts: [{ requests: [{ path: "a", datoms: 7 }] }],
  };
  const b = {
    operationId: "op-b",
    transactionIds: ["_tx/b"],
    httpCalls: 2,
    attempts: [{ requests: [{ path: "b", datoms: 9 }] }],
  };
  const responses: any[] = [
    {
      timing: {
        receiptTxId: "a",
        adapterCommits: [b, a],
        nativeFrames: [{ operationId: "op-b" }, { operationId: "op-a" }],
      },
    },
    { timing: { receiptTxId: "_tx/b", adapterCommits: [], nativeFrames: [] } },
    { timing: { receiptTxId: "missing", adapterCommits: [], nativeFrames: [] } },
  ];
  bindPublicationProfiles(responses);
  expect(responses[0].timing.requests.map((r: any) => r.path)).toEqual(["a"]);
  expect(responses[1].timing.requests.map((r: any) => r.path)).toEqual(["b"]);
  expect(responses[0].timing.nativeFrames).toEqual([{ operationId: "op-a" }]);
  expect(responses[1].timing.publishDatoms).toBe(9);
  expect(responses[2].timing.diagnosticReceiptBound).toBe(false);
});
