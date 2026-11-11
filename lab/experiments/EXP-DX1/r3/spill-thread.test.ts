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
