import { it, expect } from "vitest";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import { outboxEntity } from "../../../bench/lib/w0-outbox.ts";
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
      return { ok: false, tag: "injected" };
    },
  } as CompositionHandle;
  await expect(
    publishChanged(failed, records, { frameSize: 128, inflight: 4, readStates: () => [] }),
  ).rejects.toThrow("injected");
});
