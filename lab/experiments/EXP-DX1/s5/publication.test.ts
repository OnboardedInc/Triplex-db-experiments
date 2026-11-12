import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { generateTrace } from "../../../bench/lib/trace.ts";
import { startW0Live } from "../../../bench/lib/w0-replica-live.ts";
import { RecentReads, packEntity, pullAt } from "../../../../packages/datomic/dist/index.js";
import { localReadTurns } from "../../../bench/lib/w0-replica-live.ts";
import { it, expect } from "vitest";
import { serialize } from "node:v8";
import {
  publishChanged,
  compactCandidateReferences,
  decodeCandidateRecord,
} from "../../../bench/lib/w0-replica.ts";
import {
  outboxEntity,
  bindPublicationProfiles,
  offerLiveWrite,
  finishLiveWrite,
} from "../../../bench/lib/w0-outbox.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
it("compacts every reference byte in order while releasing the original graphs in chunks", () => {
  const records = Array.from({ length: 3073 }, (_, i) => ({
    subject: "s" + i,
    worldSha256: "w" + i,
    candidates: [
      {
        release: "r",
        output: { n: i, signed: -0 },
        record: { subject: "s" + i, basis: { tx: BigInt(i) } },
      },
    ],
  })) as any;
  const expected = records.map((r: any) => canonical(r.candidates[0])),
    worlds = records.map((r: any) => r.worldSha256),
    remaining: number[] = [];
  const actual = compactCandidateReferences(records, true, () => remaining.push(records.length));
  expect(actual).toEqual({ candidates: expected, worlds });
  expect(records).toEqual([]);
  expect(remaining.at(-1)).toBe(0);
  expect(remaining.length).toBeGreaterThan(1);
  expect(remaining.every((n, i) => n < 3073 && (!i || n < remaining[i - 1]))).toBe(true);
});
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
  const turn = localReadTurns(8),
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

it("bounds writer yielding so a permanently nonempty trace queue cannot starve publication", async () => {
  const comp = {
    transactionByCommand: async () => ({ ok: true, value: null }),
    transact: async () => ({ ok: true, value: {} }),
  } as unknown as CompositionHandle;
  offerLiveWrite();
  try {
    const result = await publishChanged(
      comp,
      [
        {
          subject: "bounded-yield",
          release: "R1",
          basis: { tx: 1n, validTime: W0.POPULATION_VALID_TIME },
          workItems: [
            { id: "item", key: "k", kind: "create", payload: "{}", rule: "r", version: "v" },
          ],
        },
      ],
      {
        inflight: 1,
        frameSize: 64,
        yieldToWriter: true,
        maxWriterYieldMs: 1,
        readStates: () => [],
      },
    );
    expect(result.changed).toBe(1);
    expect(result.commits).toBe(1);
  } finally {
    finishLiveWrite();
  }
});

it("serves exact current-position rows through the built public pullAt API without history or fallback", async () => {
  const index = new RecentReads(0, 0);
  const before = [
    {
      id: "row-a",
      entityId: "root",
      attribute: "value",
      value: { type: "string" as const, value: "before" },
      position: 1,
      validFrom: 0,
    },
  ];
  const after = [
    { ...before[0], id: "row-b", value: { type: "string" as const, value: "after" }, position: 2 },
  ];
  const old = packEntity(1, before),
    next = packEntity(2, after);
  index.apply({ position: 1, reset: true, valid: true, changes: [["root", undefined, old]] });
  let fallbacks = 0;
  const fallback = async () => {
    fallbacks++;
    return "unavailable";
  };
  const first = await pullAt(index, "root", { recordedPosition: 1, validAt: 1 }, fallback);
  expect(first.route).toBe("replica");
  if (first.route === "replica") expect(first.value.rows).toEqual(before);
  index.apply({ position: 2, reset: false, valid: true, changes: [["root", old, next]] });
  const second = await pullAt(index, "root", { recordedPosition: 2, validAt: 1 }, fallback);
  expect(second.route).toBe("replica");
  if (second.route === "replica") expect(second.value.rows).toEqual(after);
  expect(fallbacks).toBe(0);
  expect(index.historyBytes).toBe(0);
  expect((await pullAt(index, "root", { recordedPosition: 1, validAt: 1 }, fallback)).route).toBe(
    "fallback",
  );
  expect(fallbacks).toBe(1);
});

it("drains every frozen offer due before stop even when the event loop was delayed", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxs5-offers-"));
  const comp = memoryComposition("datomic", "dxs5-unit-" + randomUUID());
  const replica = {
    position: 0,
    validAt: 1,
    snapshotSubject: () => ({
      position: 0,
      validAt: 1,
      world: () => [
        {
          id: "fixture",
          entityId: W0.placementId(0),
          attribute: "fixture",
          value: { type: "string", value: "unchanged" },
          position: 0,
          validFrom: 0,
        },
      ],
    }),
  };
  try {
    const live = await startW0Live({
      comp,
      composition: "memory",
      lane: "datomic",
      scope: "unit",
      N: 1,
      dir,
      id: "drain",
      seed: "dxs5-stop-offers",
      offsetS: 120,
      replica: replica as any,
    });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    const result = await live.stop();
    const expected = generateTrace({
      seed: "dxs5-stop-offers",
      subjects: 1,
      durationS: 1020,
    }).filter(
      (e) => e.atMs >= 120000 && e.atMs - 120000 < result.endedAtMs - result.generatorStartedAtMs,
    );
    expect(expected.length).toBeGreaterThan(0);
    expect(result.offered).toBe(expected.length);
    expect(result.acknowledged).toBe(expected.length);
    const raw = fs
      .readFileSync(result.raw, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(raw.filter((r) => r.kind === "write").length).toBe(expected.length);
  } finally {
    await comp.close();
    fs.rmSync(dir, { recursive: true });
  }
});

// [DX-S5] Why: compact candidate transport must preserve exact scalar types and release ordering while releasing decoded graphs.
// Rejected: JSON candidate transport or checking only output counts.
it("keeps lossless candidate bytes and decodes independent bounded graphs", () => {
  const candidates = [
    {
      release: "R2",
      record: { basis: { tx: 9007199254740993n } },
      output: { negativeZero: -0, missing: null },
    },
    { release: "R1", output: "second" },
    { release: "R3", output: "third" },
  ];
  const record = decodeCandidateRecord({
    subject: "subject",
    worldSha256: "hash",
    encodedCandidates: serialize(candidates),
  });
  expect(record.candidates).toEqual(candidates);
  expect(record.candidates).not.toBe(record.candidates);
  expect(Object.is((record.candidates[0].output as any).negativeZero, -0)).toBe(true);
  expect(canonical(record.candidates)).toBe(canonical(candidates));
});
