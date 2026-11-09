// [EXP-P5B-R2] Why: Q101a's map is an integrity boundary. Rejected: testing only sparse-position success.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PositionMap } from "../lib/position-map.ts";
test("Q101a maps 1 to 2048, exact history positions and ordinal-gap feed prefixes", () => {
  const m = new PositionMap();
  m.append(1, 2048, { v: 1 }, { v: 1 });
  m.append(2, 3072, { v: 2 }, { v: 2 });
  assert.equal(m.native(1), 2048);
  assert.equal(m.reference(2048), 1);
  assert.equal(m.referenceCut(3000), 1);
  assert.throws(() => m.reference(3000), /unmapped/);
  assert.throws(() => m.native(3), /unmapped/);
});
test("Q101a refuses planted reference gaps, non-increasing native positions and command-byte changes", () => {
  const m = new PositionMap();
  assert.throws(() => m.append(2, 2048, {}, {}), /gap/);
  m.append(1, 2048, {}, {});
  assert.throws(() => m.append(2, 2048, {}, {}), /non-increasing/);
  assert.throws(() => m.append(2, 1024, {}, {}), /non-increasing/);
  assert.throws(() => m.append(2, 3072, { v: 1 }, { v: 2 }), /bytes differ/);
  assert.equal(m.size, 1);
});
test("Q101a refuses a map changed after seeding even if its own hash field is edited", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p5-map-"));
  const f = path.join(dir, "map.json");
  try {
    const m = new PositionMap();
    m.append(1, 2048, {}, {});
    m.sealSeed();
    const hash = m.save(f);
    assert.equal(PositionMap.load(f, hash).native(1), 2048);
    const data = JSON.parse(fs.readFileSync(f, "utf8"));
    data.entries[0][1] = 4096;
    data.sha256 = "0".repeat(64);
    fs.writeFileSync(f, JSON.stringify(data));
    assert.throws(() => PositionMap.load(f, hash), /hash mismatch/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
