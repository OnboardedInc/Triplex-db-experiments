// EXP-X05 driver unit tests. Run: node --test lab/experiments/EXP-X05-xtdb-read-follower/test/x05.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Oracle, decodeSnapshotToken, encodeSnapshotToken, intVal, microsIso, parseMicros, rowConsistent, strVal, traceDigest, traceSegment } from '../common.mjs';

test('basis token codec round-trips the XTDB docs example byte for byte', () => {
  // references/xtdb/docs/src/content/docs/about/txs-in-xtdb.md, SHOW SNAPSHOT_TOKEN example.
  const docs = 'ChYKBHh0ZGISDgoMCKHqs8cGEPCP2poB';
  const decoded = decodeSnapshotToken(docs);
  assert.deepEqual(Object.keys(decoded), ['xtdb']);
  assert.equal(encodeSnapshotToken(decoded.xtdb[0]), docs);
  assert.equal(decodeSnapshotToken(encodeSnapshotToken(1_762_548_123_456_789n)).xtdb[0], 1_762_548_123_456_789n);
  // Whole seconds omit the nanos field, like protobuf's implicit-presence Timestamp.
  assert.equal(decodeSnapshotToken(encodeSnapshotToken(1_762_548_123_000_000n)).xtdb[0], 1_762_548_123_000_000n);
});

test('timestamps parse to exact microseconds in every pgwire spelling and print back', () => {
  const t = 1_762_548_683_123_456n; // 2025-11-07T20:51:23.123456Z
  for (const text of ['2025-11-07 20:51:23.123456+00:00', '2025-11-07T20:51:23.123456Z', '2025-11-07 22:51:23.123456+02:00', '2025-11-07T20:51:23.123456Z[UTC]', '2025-11-07 20:51:23.123456+00'])
    assert.equal(parseMicros(text), t, text);
  assert.equal(parseMicros('2025-11-07 20:51:23+00:00'), 1_762_548_683_000_000n);
  assert.equal(microsIso(t), '2025-11-07T20:51:23.123456Z');
  assert.equal(parseMicros(microsIso(t)), t);
  assert.throws(() => parseMicros('2025-11-07 20:51:23.123456789Z'), /sub-microsecond/);
});

test('trace segments are frozen by seed and follow the declared mix', () => {
  const a = traceSegment({ seed: 'x05', rate: 40, seconds: 60, subjects: 100_000, active: 2000 });
  const b = traceSegment({ seed: 'x05', rate: 40, seconds: 60, subjects: 100_000, active: 2000 });
  assert.equal(traceDigest(a), traceDigest(b));
  assert.ok(a.length > 2200 && a.length < 2600, `${a.length} commands in 60 s at 40/s`);
  const small = a.filter(c => c.facts <= 10).length / a.length;
  assert.ok(small > 0.55 && small < 0.65, `5-10 band ${small}`);
  assert.ok(a.every(c => c.facts >= 5 && c.facts <= 50 && c.padBytes === 0));
  const burst = traceSegment({ seed: 'x05b', rate: 200, seconds: 5, subjects: 100_000, active: 2000, burst: true });
  assert.ok(burst.every(c => c.facts === 50 && c.padBytes >= 400 && c.padBytes < 1200));
});

test('oracle answers the last commit at or before the basis, the seed before any, and refuses uncertain subjects', () => {
  const o = new Oracle();
  o.add(7, 1, 100n); o.add(7, 2, 200n);
  assert.equal(o.expected(7, 99n), 0);
  assert.equal(o.expected(7, 100n), 1);
  assert.equal(o.expected(7, 199n), 1);
  assert.equal(o.expected(7, 250n), 2);
  assert.equal(o.expected(8, 250n), 0);
  assert.throws(() => o.add(7, 3, 150n), /not increasing/);
  o.markUncertain(7, 300n);
  assert.equal(o.expected(7, 250n), 2);
  assert.equal(o.expected(7, 300n), null);
});

test('entity columns are a function of (subject, pos), so a torn row is detected', () => {
  const row = { a0: String(intVal(5, 3, 0)), a7: String(intVal(5, 3, 7)), a8: strVal(5, 3, 8), a15: strVal(5, 3, 15) };
  assert.equal(rowConsistent(row, 5, 3), true);
  assert.equal(rowConsistent(row, 5, 4), false);
  assert.equal(rowConsistent({ ...row, a8: strVal(5, 2, 8) }, 5, 3), false);
  assert.equal(rowConsistent({ a0: intVal(5, 0, 0), a7: intVal(5, 0, 7), a8: strVal(5, 0, 8), a15: strVal(5, 0, 15) }, 5, 0), true);
});
