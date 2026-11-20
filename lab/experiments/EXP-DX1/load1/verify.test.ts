import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { SerialBudget } from "./budget.ts";
import { Snapshot } from "./snapshot.ts";
import { windowed } from "../../../bench/lib/load-window.ts";
import { frames, identity, type Frame } from "./source.ts";
import { record } from "./oracle.ts";
import { microFixture } from "./micro.ts";

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

test("time pacing reduces over-budget frames and rejects a sustained minimum-frame stall", () => {
  const budget = new SerialBudget(8);
  for (let i = 0; i < 8; i++) budget.observe(8, 3);
  const before = budget.next()!;
  assert(before > 10);
  budget.observe(12, 25);
  assert(budget.next()! < before);
  for (let i = 0; i < 6; i++) budget.observe(8, 9);
  assert.equal(budget.next(), undefined);
});
for (const mode of ["adaptive", "ordered"] as const)
  test(`an unresolved ${mode} frame keeps its original boundary and receipt on reopen`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dx-load-budget-"));
    const saved = new Map<string, any>();
    let sends = 0;
    const fake = {
      scopeName: "budget-scope",
      backend: { name: "datomic" },
      async transactionByCommand(command: string) {
        return { ok: true, value: saved.get(command) };
      },
      async transact(operations: Frame["operations"], meta: ReturnType<typeof identity>) {
        if (saved.has(meta.commandId)) return { ok: false, tag: "Duplicate" };
        const position = ++sends,
          instant = 1000 + position,
          txId = "tx" + position;
        const changes = operations.map((op, i) => ({
          ...op,
          tripleId: "id" + position + "-" + i,
          recordedAt: instant,
          assertionTxId: txId,
        }));
        saved.set(meta.commandId, { ...meta, position, instant, txId, changes });
        return {
          ok: true,
          value: {
            position,
            instant,
            txId,
            triples: changes.map((o) => ({
              ...o,
              id: o.tripleId,
              validTo: { _tag: "None" },
              txId: { value: txId },
            })),
          },
        };
      },
    } as unknown as CompositionHandle;
    const file = path.join(dir, "cursor.sqlite");
    const fixture = microFixture(30, 24);
    const open = (variant: number) =>
      mode === "adaptive"
        ? Snapshot.open(fake, "thin", 30, 32, file, { budgetMs: variant })
        : Snapshot.open(
            fake,
            microFixture(30, variant === 8 ? 24 : 16),
            30,
            variant === 8 ? 24 : 16,
            file,
            undefined,
            variant === 8 ? 3 : 2,
          );
    try {
      let writer = await open(8);
      const before = mode === "adaptive" ? writer.nextFrame(32)! : fixture.batches().next().value!;
      assert(before);
      assert(before.end > 1);
      await assert.rejects(
        writer.write(before, {
          beforeCheckpoint() {
            throw Error("lost checkpoint");
          },
        }),
        /lost checkpoint/,
      );
      assert.equal(writer.cursor(), 0);
      const durable = await fake.transactionByCommand(writer.frameIdentity(before).commandId);
      assert(durable.ok && durable.value);
      writer.close();
      await assert.rejects(open(16), /different source or storage/);
      writer = await open(8);
      if (mode === "adaptive") assert.deepEqual(writer.nextFrame(1), before);
      else assert.equal(writer.cursor(), before.end);
      const after = await writer.write(before);
      assert.equal(after.txId, durable.value.txId);
      assert.equal(after.position, durable.value.position);
      assert.equal(sends, 2);
      assert.equal(writer.cursor(), before.end);
      writer.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

test("paced import counts a missing scheduled save and protects each account independently", async () => {
  const { reviewPace } = await import("./pacing.ts");
  const verdict = { offered: 40, ok: 40, p99Ms: 10 };
  const accounts = [...Array.from({ length: 10 }, (_, i) => "live" + i), "quiet"];
  const baseline = Object.fromEntries(accounts.map((a) => [a, { save: verdict, read: verdict }]));
  const samples = accounts.flatMap((actor, i) =>
    (["save", "read"] as const).flatMap((kind) =>
      Array.from({ length: 40 }, (_, seq) => {
        const due = seq * 200 + (actor === "quiet" ? 0 : i * 20);
        return { actor, kind, seq, due, offered: due, end: due + 11, outcome: "verified" };
      }),
    ),
  );
  assert.equal(reviewPace(baseline, samples, 50, 8000, 88).next, 96);
  const outlier = { ...samples[0]!, end: 14 };
  const slow = [outlier, ...samples.slice(1)];
  assert.equal(reviewPace(baseline, slow, 50, 8000, 110).next, 88);
  const missing = reviewPace(baseline, samples.slice(1), 50, 8000, 110);
  assert.equal(missing.next, 88);
  assert.equal(missing.incomplete, 1);
});
