import assert from "node:assert/strict";
import test from "node:test";
import { windowed } from "../../../bench/lib/load-window.ts";
import { frames, identity } from "./source.ts";
import { record } from "./oracle.ts";

test("a failed frame drains all admitted work and schedules no new frame", async () => {
  const entered: number[] = [],
    settled: number[] = [];
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const run = windowed([0, 1, 2, 3], 2, async (i) => {
    entered.push(i);
    if (i === 0) throw Error("outcome unknown");
    await gate;
    settled.push(i);
  });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(entered, [0, 1]);
  release();
  await assert.rejects(run, /outcome unknown/);
  assert.deepEqual(settled, [1]);
  await assert.rejects(windowed([], 3, async () => {}));
});
test("complete subjects are disjoint and every frame respects the requested limit", () => {
  for (const width of [128, 500, 2000]) {
    const owners = new Set<string>();
    let total = 0,
      n = 0;
    for (const frame of frames("thin", 400, width)) {
      assert.equal(frame.first, n);
      n = frame.end;
      total += frame.operations.length;
      assert(frame.operations.length > 0 && frame.operations.length <= width);
      for (const e of new Set(frame.operations.map((o) => o.entityId))) {
        assert(!owners.has(e));
        owners.add(e);
      }
    }
    assert.equal(n, 400);
    assert.equal(total, 3200);
  }
});
test("same-count swapped facts, stale command bindings and reused assertion IDs fail", () => {
  const f = frames("thin", 1, 128).next().value!;
  assert(f);
  const m = identity("scope", "source", 128, f);
  const r = {
    ...m,
    instant: 10,
    position: 2,
    txId: "tx",
    changes: f.operations.map((o, i) => ({
      ...o,
      tripleId: "r" + i,
      recordedAt: 10,
      assertionTxId: "tx",
    })),
  };
  assert(record(f, m, r).ids);
  assert.throws(() => record(f, { ...m, correlationId: "stale" }, r));
  assert.throws(() => record(f, m, { ...r, changes: [...r.changes].reverse() }));
  assert.throws(() =>
    record(f, m, { ...r, changes: r.changes.map((c) => ({ ...c, tripleId: "one" })) }),
  );
});
