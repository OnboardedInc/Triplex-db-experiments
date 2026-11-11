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
