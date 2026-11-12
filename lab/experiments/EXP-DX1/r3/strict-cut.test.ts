import assert from "node:assert/strict";
import { test } from "node:test";
import { RecentReads } from "../../../../packages/datomic/dist/index.js";

// [DX-R3-P8] Why: strict clocks certify whole physical commits, not individual logical journals or feed pages.
// Rejected: a greater-clock sentinel commit (leaves the most common receipt cut unnecessarily remote).
test("strict newest clock closes exactly at its physical end across pages and shared images", () => {
  const r = new RecentReads(20, 1024, true);
  r.apply({ reset: true, valid: true, position: 10, recordTime: 100, clockEnd: 10, changes: [] });
  assert.equal(r.resolve({ recordedAt: 100, validAt: 0 }), 10);
  r.apply({ reset: false, valid: true, position: 11, recordTime: 101, clockEnd: 12, changes: [] });
  assert.equal(r.resolve({ recordedAt: 101, validAt: 0 }), undefined);
  assert.equal(r.resolve({ recordedAt: 100, validAt: 0 }), 10);
  assert.equal(r.resolve({ recordedAt: 100.5, validAt: 0 }), 10);
  assert.equal(r.resolve({ recordedAt: 99, validAt: 0 }), undefined);
  const reader = new RecentReads(); reader.install(r.image());
  assert.equal(reader.resolve({ recordedAt: 101, validAt: 0 }), undefined);
  reader.apply({ reset: false, valid: true, position: 12, recordTime: 101, clockEnd: 12, changes: [] });
  assert.equal(reader.resolve({ recordedAt: 101, validAt: 0 }), 12);
  assert.equal(reader.resolve({ recordedAt: 102, validAt: 0 }), undefined);
  const restored = new RecentReads(); restored.install(reader.image());
  assert.equal(restored.resolve({ recordedAt: 101, validAt: 0 }), 12);
});
test("bootstrap and rebuilt cuts need fresh end proof; eviction and non-strict policy fail closed", () => {
  const r = new RecentReads(1, 1024, true);
  r.apply({ reset: true, valid: true, position: 10, recordTime: 100, clockEnd: 10, changes: [] });
  assert.equal(r.resolve({ recordedAt: 100, validAt: 0 }), 10);
  r.apply({ reset: true, valid: false, position: 10, changes: [] });
  r.apply({ reset: true, valid: true, position: 20, changes: [] });
  assert.equal(r.resolve({ recordedAt: 100, validAt: 0 }), undefined);
  r.apply({ reset: true, valid: true, position: 20, recordTime: 200, clockEnd: 20, changes: [] });
  assert.equal(r.resolve({ recordedAt: 200, validAt: 0 }), 20);
  r.apply({ reset: false, valid: true, position: 21, recordTime: 201, clockEnd: 21, changes: [] });
  r.apply({ reset: false, valid: true, position: 22, recordTime: 202, clockEnd: 22, changes: [] });
  assert.equal(r.resolve({ recordedAt: 200, validAt: 0 }), undefined);
  const ordinary = new RecentReads(); ordinary.install({ ...r.image(), strictRecordClocks: false });
  assert.equal(ordinary.resolve({ recordedAt: 202, validAt: 0 }), undefined);
  assert.equal(ordinary.resolve({ recordedPosition: 22, validAt: 0 }), 22);
});

test("a lying duplicate end cannot reopen an already closed strict clock", () => {
  const r = new RecentReads(20, 1024, true);
  r.apply({ reset: true, valid: true, position: 1, recordTime: 100, clockEnd: 1, changes: [] });
  r.apply({ reset: false, valid: true, position: 2, recordTime: 100, clockEnd: 2, changes: [] });
  assert.equal(r.resolve({ recordedAt: 100, validAt: 0 }), undefined);
});
