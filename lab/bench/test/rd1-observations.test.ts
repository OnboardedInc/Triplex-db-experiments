import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Option } from "effect";
import type { Receipt } from "../lib/composition.ts";
import { ExpectationCache } from "../lib/expectation-cache.ts";
import { ModelJournal, journalReceipt } from "../lib/model-journal.ts";
import { R, type ReadRecord } from "../lib/observe.ts";
import { ReadBatch, unpackReadBatch } from "../lib/read-batch.ts";
import { judgeReadCode, wasHot } from "../lib/read-judgment.ts";
import { ReadWindow } from "../lib/read-window.ts";
import { SplitFold } from "../lib/split-evidence.ts";
import { StreamReads } from "../lib/stream-reads.ts";
import { SpillThread } from "../lib/spill-thread.ts";
import { ids, hopOf } from "../lib/world.ts";

const record = (position: number, time: number, start: number): ReadRecord => [
  0,
  0,
  time,
  17,
  start,
  0.125,
  -1,
  0,
  "0000000000000000:0",
  0,
  0,
  0,
  null,
  2,
  position,
  0,
  -1,
  0,
  "replica",
  "packed",
  0,
];

test("transfer and reuse retain every field, with fractional clocks and a typed failure", () => {
  const rows = [record(105, 12.25, 100.25), record(106, 15.125, 101.5)];
  rows[1]![R.error] = "ClockError";
  const packed = new ReadBatch();
  for (const row of rows) packed.push(row);
  const batch = packed.take();
  const remote = structuredClone(batch, { transfer: [batch.values.buffer] });
  assert.equal(batch.values.buffer.byteLength, 0);
  assert.deepEqual([...unpackReadBatch(remote)], rows);
  packed.recycle(remote.values.buffer);
  packed.push(rows[0]!);
  assert.deepEqual([...unpackReadBatch(packed.take())], [rows[0]]);
});

test("a late receipt must bind before folding, with final equivalence and a bounded pending prefix", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dx-rd1-"));
  t.after(() => fs.rmSync(dir, { recursive: true }));
  const file = path.join(dir, "journal.bin");
  const context = { run: "local-rolling-test", source: "fixture", slot: "fixture", subjects: 1 };
  const stream = new StreamReads({ file, context, deep: false, progress: new Int32Array(1) });
  const window = { name: "L256", from: 100, to: 200 };
  stream.phase(0, { windows: [window], recovery: [] });
  const root = ids.placement(0);
  const child = "fixture-child";
  const op = {
    op: "assert",
    entityId: root,
    attribute: ":placement/child",
    value: { type: "ref", value: child },
    validFrom: 15,
  };
  const childOp = {
    op: "assert",
    entityId: child,
    attribute: ":fixture/name",
    value: { type: "string", value: "old" },
    validFrom: 17,
    validTo: 18,
  };
  const rowOf = (o: typeof op | typeof childOp, id: string) => ({
    ...o,
    id,
    validTo: "validTo" in o ? Option.some(o.validTo) : Option.none(),
  });
  const seed = {
    position: 4,
    instant: 10,
    txId: "seed",
    triples: [rowOf(op, "ref"), rowOf(childOp, "one")],
  } as unknown as Receipt;
  const late = { position: 8, instant: 20, txId: "late", triples: [] } as unknown as Receipt;
  const later = { position: 9, instant: 30, txId: "later", triples: [] } as unknown as Receipt;
  stream.addModel(journalReceipt([op, childOp], seed));
  stream.addModel(journalReceipt([], later));
  const rows = [record(8, 20, 120), record(9, 30, 121), record(9, 30, 210)];
  for (const row of rows) assert.equal(stream.capture(row), true);
  stream.advance(10, 220);
  assert.equal(stream.progress.pending, 3);
  stream.addModel(
    journalReceipt(
      [
        { op: "retract", id: "one" },
        { op: "retract", id: "ref" },
      ],
      late,
    ),
  );
  stream.advance(30, 240);
  for (let i = 0; i < 30_000; i++) stream.capture(rows[1]!);
  assert.throws(() => stream.addModel(journalReceipt([], late)), /crossed the sealed read clock/);
  const summary = stream.seal(30, 240, 3);
  const { model } = new ModelJournal(file, context, summary.journal).restore();
  const expected = new ExpectationCache(model);
  const offline = new ReadWindow(window);
  const account = (r: ReadRecord) =>
    offline.add(
      r,
      judgeReadCode(r, expected),
      wasHot(r, expected),
      "bucket:small",
      `hops:${hopOf(0)}`,
    );
  for (const row of rows) account(row);
  for (let i = 0; i < 30_000; i++) account(rows[1]!);
  assert.deepEqual(summary.windows.L256, offline);
  assert.equal(summary.compared, 30_003);
  assert.equal(summary.peakPending, 3);
  assert.equal(summary.verdicts[0], 30_003);
});

test("the split join distinguishes delayed delivery, delayed application and missing application", () => {
  const fold = new SplitFold();
  for (const position of [4, 5, 6, null])
    fold.add({
      position,
      firstStepEnd: 100,
      acknowledgedAt: 106,
      secondStepStart: 110,
      secondStepEnd: 112,
    });
  fold.apply([
    { position: 4, at: 108 },
    { position: 7, at: 113 },
  ]);
  fold.apply([{ position: 5, at: 121 }]);
  const result = fold.finish();
  assert.equal(result.selected, 4);
  assert.equal(result.acknowledgedBetween, 4);
  assert.equal(result.appliedBetween, 1);
  assert.equal(result.applicationUnknown, 2);
});

test("the real collector port verifies more rows than its byte allowance can spool", { timeout: 15_000 }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dx-rd1-port-"));
  const context = { run: "collector-port", source: "fixture", slot: "fixture", subjects: 1 };
  const spill = new SpillThread(path.join(tmp, "spill"), 32_768, { file: path.join(tmp, "model"), context, deep: false });
  try {
    const cut = { position: 1, instant: 10, txId: "seed", triples: [] } as unknown as Receipt;
    spill.bindReceipt([], cut);
    await spill.beginPhase(0, 100, 0, { windows: [{name: "L256", from: 100, to: 200}], recovery: [] });
    const port = spill.connect();
    for (let id = 1; id <= 8; id++) {
      const batch = new ReadBatch();
      for (let i = 0; i < 1_024; i++) batch.push(record(1, 10, 150));
      const packed = batch.take();
      const ack = new Promise<{ id: number; buffer: ArrayBuffer }>(resolve => port.once("message", resolve));
      port.postMessage({ id, packed }, [packed.values.buffer]);
      const reply = await ack;
      assert.equal(reply.id, id);
      assert(reply.buffer.byteLength > 32_768);
      spill.frontier(10, 150, []);
    }
    port.close();
    const retained = await spill.finish({ through: 10, at: 200 });
    assert.equal(retained.length, 0);
    assert.equal(spill.checked?.compared, 8192);
    assert.equal(spill.checked?.windows.L256?.correct, 8192);
    assert.equal(spill.checked?.pending, 0);
    assert(Number(spill.diskBudget?.peakBytes) < 32_768);
  } finally { await spill.abort(); fs.rmSync(tmp, { recursive: true }); }
});
