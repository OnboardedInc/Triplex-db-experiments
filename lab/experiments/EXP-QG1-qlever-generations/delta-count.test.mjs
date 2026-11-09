import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deltaCount } from "./delta-count.mjs";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qg1-envelope-"));
const u64 = (n) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
};
const header = Buffer.concat([
  Buffer.from("QLEVER.UPDATE"),
  Buffer.from([1, 0]),
  u64(0),
  u64(1),
  u64(0),
  u64(3),
  Buffer.from("abc"),
  u64(2),
]);
const good = Buffer.concat([header, u64(4), Buffer.alloc(32), u64(8), Buffer.alloc(64)]);
const file = path.join(dir, "delta");
test("v1 counts quad vectors, including deleted IDs", () => {
  fs.writeFileSync(file, good);
  assert.deepEqual(deltaCount(file), {
    deleted: 1,
    inserted: 2,
    total: 3,
    words: 1,
    bytes: good.length,
  });
});
test("truncation, unknown version and trailing bytes refuse", () => {
  for (const b of [
    good.subarray(0, -1),
    Buffer.concat([good, Buffer.from([0])]),
    Buffer.concat([Buffer.from("X"), good.subarray(1)]),
  ]) {
    fs.writeFileSync(file, b);
    assert.throws(() => deltaCount(file));
  }
});
test.after(() => fs.rmSync(dir, { recursive: true }));
