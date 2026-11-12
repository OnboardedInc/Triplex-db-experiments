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
  r.apply({ reset: false, valid: true, position: 21, recordTime: 201, clockEnd: 21, changes: [] });
  assert.equal(r.resolve({ recordedAt: 201, validAt: 0 }), 21);
  assert.equal(r.resolve({ recordedAt: 200, validAt: 0 }), undefined);
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

test("two actual inline feed pages keep a multi-journal physical clock open until its final journal", async () => {
  const { timedReplicaSource } = await import("../../../../packages/datomic/dist/index.js");
  const { encodeRowText } = await import("../../../../packages/datomic/dist/rowText.js");
  const { ReplicaReadHost, boundedReplicaFeed } = await import("../../../bench/lib/replica-reads.ts");
  const calls: number[] = [];
  const client = { async request(_method: string, _route: string, body: any) {
    calls.push(body.limit);
    const p = body.after + 1, id = `_tx/0000000000000000000000000${p}`;
    const fields = { entity_id: id, value_string: null, value_boolean: null, value_json: null,
      recorded_position: p, recorded_at: 100, valid_from: 0, valid_to: null, created_by: null,
      entity_type: "_Transaction", schema_version: 1, tx_id: id, retracted_at: null,
      retracted_position: null, retract_tx_id: null };
    const rows = [encodeRowText({ ...fields, id: `position-${p}`, attribute: ":_tx/position", value_type: "number", value_number: p, value_datetime: null }),
      encodeRowText({ ...fields, id: `instant-${p}`, attribute: ":_tx/instant", value_type: "datetime", value_number: null, value_datetime: 100 })];
    return { head: 2, clockEnds: [[p, 2]], transactions: [[id, p, rows, { position: p, t: "12", reset: false, entities: [], closures: [] }]] };
  } };
  const timed = timedReplicaSource(client as any, "test", async () => 2, 0);
  const source = boundedReplicaFeed(timed.source);
  const host = new (ReplicaReadHost as any)(source, timed.times, 1024, true, timed.clockEnds, timed.timings) as import("../../../bench/lib/replica-reads.ts").ReplicaReadHost;
  await source.feed(0, 1, 0);
  host.replica.onUpdate!({ reset: true, valid: true, position: 1, changes: [] });
  assert.equal(host.index.resolve({ recordedAt: 100, validAt: 0 }), undefined);
  await source.feed(1, 1000, 0);
  host.replica.onUpdate!({ reset: false, valid: true, position: 2, changes: [] });
  assert.equal(host.index.resolve({ recordedAt: 100, validAt: 0 }), 2);
  assert.deepEqual(calls, [1, 4]);
  const restored = new RecentReads(); restored.install(host.index.image());
  assert.equal(restored.resolve({ recordedAt: 100, validAt: 0 }), 2);
  await host.close();
});

test("bootstrap clock comes from fresh journal bytes, never an arbitrary equal-cut caller instant", async () => {
  const { bootstrapSourceClock } = await import("../../../bench/lib/replica-reads.ts");
  const times = new Map([[1, 150]]), ends = new Map([[1, 1]]);
  const source = {
    async feed(after: number, limit: number) { assert.equal(after, 0); assert.equal(limit, 1); times.set(1, 100); ends.set(1, 1); },
    async page(_roots: string[], basis: any) { if (basis.recordedAt !== undefined) assert.equal(basis.recordedAt, 100); return { t: "12" }; },
  };
  assert.equal(await bootstrapSourceClock(source, times, ends, "root", 1), 100);
  const omitted = { ...source, async feed() {} };
  assert(Number.isNaN(await bootstrapSourceClock(omitted, times, ends, "root", 1)));
  assert.equal(ends.has(1), false);
});
