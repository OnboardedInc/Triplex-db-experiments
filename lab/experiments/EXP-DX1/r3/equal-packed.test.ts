import test from "node:test";
import assert from "node:assert/strict";
import { equalPackedBytes } from "../../../../packages/datomic/src/replica/equalPackedBytes.ts";
// [DX-R3-P8] Why: slab prefixes/suffixes are unrelated to an entity's exact bounded byte slice.
// Rejected: comparing backing slab identity or the revision rather than all entity bytes.
test("native predecessor equality includes every bounded slice byte", () => {
  const a = new SharedArrayBuffer(64),
    b = new SharedArrayBuffer(128);
  const x = new Uint8Array(a),
    y = new Uint8Array(b);
  x.fill(3);
  y.fill(7);
  x.fill(42, 8, 24);
  y.fill(42, 32, 48);
  const p = { buffer: a, offset: 8, byteLength: 16, revision: 1 },
    q = { buffer: b, offset: 32, byteLength: 16, revision: 1 };
  assert(equalPackedBytes(p, q));
  for (let n = 0; n < 16; n++) {
    y[32 + n] = 43;
    assert.equal(equalPackedBytes(p, q), false);
    y[32 + n] = 42;
  }
  assert.equal(equalPackedBytes(p, { ...q, byteLength: 15 }), false);
  assert(
    equalPackedBytes(
      { buffer: a, byteLength: 0, revision: 1 },
      { buffer: b, byteLength: 0, revision: 1 },
    ),
  );
  assert.throws(() => equalPackedBytes(p, { ...q, offset: 127 }));
  for (const length of [-1, NaN, 1.5, Infinity])
    assert.throws(() => equalPackedBytes(p, { ...q, byteLength: length }));
});
