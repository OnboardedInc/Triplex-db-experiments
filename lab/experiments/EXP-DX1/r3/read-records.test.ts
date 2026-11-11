import assert from "node:assert/strict";
import { test } from "node:test";
import { ReadRecords } from "../../../bench/lib/read-records.ts";
import { R, type ReadRecord } from "../../../bench/lib/observe.ts";

test("lossless observations preserve every field, order, sign, null and string across chunks", () => {
  const expected: ReadRecord[] = Array.from({ length: 10003 }, (_, n) => [
    n % 6,
    n,
    1794371313024 + n / 16,
    n % 3 ? 1794371313024 : -0,
    n + 0.125,
    n / 17,
    n % 99,
    500 + n,
    `deadbeef${n % 31}:500`,
    3000,
    6,
    n % 2,
    n % 13 ? null : "Error/é\ud800",
    n % 3,
    n,
    n % 2,
    -1,
    n % 2,
    n % 2 ? "replica" : "fallback",
    "packed",
    n % 3 ? 0 : 10.125,
  ]);
  const packed = new ReadRecords();
  for (const row of expected) packed.push(row);
  assert.equal(packed.length, expected.length);
  assert.deepEqual([...packed], expected);
  assert.deepEqual(
    packed.map((row) => row),
    expected,
  );
  assert.deepEqual(
    packed.filter((row) => row[R.error] !== null),
    expected.filter((row) => row[R.error] !== null),
  );
  assert.deepEqual(
    packed.find((row) => row[R.subject] === 8192),
    expected.find((row) => row[R.subject] === 8192),
  );
  assert.equal(
    packed.find((row) => row[R.subject] < 0),
    undefined,
  );
  assert.deepEqual(
    packed.map((row, index) => [index, row[R.digest]]),
    expected.map((row, index) => [index, row[R.digest]]),
  );
  assert(packed.stringCount < 40);
  assert.equal(packed.encodedBytes, 3 * 4096 * 21 * 8);
});

// [DX-R3] Why: spill/recovery must preserve every bit across chunks and dictionary resets, not merely counts.
// Rejected: testing the file format only against itself without a complete tuple comparison.
test("bounded spill survives checkpoint/reopen and reads phase subsets losslessly", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dxr3-spill-"));
  try {
    const dir = path.join(root, "rows");
    const rows: ReadRecord[] = Array.from({ length: 10003 }, (_, n) => [n % 3, n, 1, -0, n, n/7, 0, 1, `unique-${n}/é\ud800`, 2, 1, 0, n % 7 ? null : "error", 0, 1, 0, -1, 0, "replica", "packed", 0]);
    const store = new ReadRecords(dir);
    rows.forEach(r => store.push(r));
    store.checkpoint();
    assert.deepEqual([...store], rows);
    assert(store.residentBytes <= 2 * 4096 * 21 * 8);
    const subset: ReadRecord[] = [];
    store.forPhase(2, r => subset.push(r));
    assert.deepEqual(subset, rows.filter(r => r[R.phase] === 2));
    const restored = new ReadRecords(dir, true);
    assert.deepEqual([...restored], rows);
    restored.push(rows[0]!);
    restored.checkpoint();
    assert.deepEqual([...new ReadRecords(dir, true)], [...rows, rows[0]!]);
    assert.throws(() => new ReadRecords(dir), /EEXIST/);
    restored.dispose();
    assert(!fs.existsSync(dir));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
