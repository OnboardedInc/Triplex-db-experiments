import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SpillThread } from "../../../bench/lib/spill-thread.ts";
import { ReadRecords } from "../../../bench/lib/read-records.ts";
import { R, type ReadRecord } from "../../../bench/lib/observe.ts";

// [DX-R3] Why: moving retention off-thread must preserve every tuple and committed phase across the worker boundary.
// Rejected: checking only the worker's message count or exit status.
test("worker spill retains exact rows, partial batches, checkpoint prefix and resumed phase index", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dxr3-worker-spill-"));
  const rows: ReadRecord[] = Array.from({ length: 12517 }, (_, i) => [i % 7, i, 1.5, -0, i, i / 3, i, 42, `digest-é-${i}`, 99, 5, 0, i % 13 ? null : "Error", 2, i, 1, -1, 0, "replica", "packed", .125]);
  const spill = new SpillThread(path.join(root, "rows"));
  try {
    for (const row of rows.slice(0, 7001)) spill.push(row);
    await spill.checkpoint();
    const prefix = new ReadRecords(spill.directory, true);
    assert.deepEqual([...prefix], rows.slice(0, 7001));
    for (const row of rows.slice(7001)) spill.push(row);
    const restored = await spill.finish();
    assert.equal(restored.length, rows.length);
    assert.deepEqual([...restored], rows);
    const phase: unknown[] = [];
    restored.forPhase(3, (r, index) => phase.push([index, r]));
    assert.deepEqual(phase, rows.flatMap((r, index) => r[R.phase] === 3 ? [[index, r]] : []));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

// [DX-R3] Why: finalization across independent producer ports requires processed-prefix ACKs, not parent-message ordering.
// Rejected: a count-only test that could miss a duplicate, reordered producer suffix or lost oracle sample.
test("direct producer ports drain every exact tuple and oracle sample before finalization", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dxr3-direct-spill-"));
  const spill = new SpillThread(path.join(root, "rows"));
  const samples: any[] = [];
  spill.onProgress = m => samples.push(...m.samples ?? []);
  const make = (i: number): ReadRecord => [3, i, 1.5, -0, i, i / 3, i, 42, `digest-é-${i}`, 99, 5, 0, null, 2, i, 1, -1, 0, "replica", "packed", .125];
  const expected = Array.from({ length: 10003 }, (_, i) => make(i));
  await spill.beginPhase(3, 100, 23);
  try {
    await Promise.all([0, 1].map(async producer => {
      const port = spill.connect();
      const rows = expected.filter((_, i) => i % 2 === producer);
      const ack = new Promise<void>(resolve => port.once("message", () => resolve()));
      port.postMessage({ id: producer, records: rows, samples: [{ producer, stamp: 123 }] });
      await ack; port.close();
    }));
    const restored = await spill.finish();
    assert.deepEqual([...restored].sort((a, b) => a[R.subject] - b[R.subject]), expected);
    assert.deepEqual(samples.sort((a, b) => a.producer - b.producer), [{ producer: 0, stamp: 123 }, { producer: 1, stamp: 123 }]);
    assert.equal(spill.progress[3].settled, expected.length - 123);
    assert.equal(spill.progress[3].reads, expected.length);
    assert.equal(spill.progress[3].verification.startsWith("PENDING"), true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
