import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Inventory, basisMatches, canonical, exact, membership, phases, rowsOf, safeError } from './probe-support.mjs';

test('ASCII wrong order remains failure while exact membership is separate', () => {
  const expected = [{ entity: 'a', label: 'E' }, { entity: 'b', label: 'c' }];
  const actual = [...expected].reverse();
  assert.equal(exact(actual, expected), false); assert.equal(membership(actual, expected), true);
  assert.deepEqual(actual.map(row => row.label), ['c', 'E']);
});
test('decomposed and composed text never normalize into membership equality', () => {
  assert.equal(membership([{ entity: 'a', label: '\u00e9' }], [{ entity: 'a', label: 'e\u0301' }]), false);
  assert.equal(membership([{ entity: 'a', label: 'E' }, { entity: 'a', label: 'E' }], [{ entity: 'a', label: 'E' }, { entity: 'b', label: 'c' }]), false);
});
test('row adaptation preserves returned order and exact string channels', () => {
  const actual = rowsOf([{ '?entity': 'b', '?label': 'c' }, { '?entity': 'a', '?label': 'E' }]);
  assert.deepEqual(actual, [{ entity: 'b', label: 'c' }, { entity: 'a', label: 'E' }]);
  assert.throws(() => rowsOf([{ '?entity': 'a', '?label': 7 }]));
  const originalPageBasis = { scope: 'scope', recordedPosition: 1, validAt: 10.5, recordedAt: 1000.25 };
  assert(basisMatches(originalPageBasis, originalPageBasis));
  assert(!basisMatches({ ...originalPageBasis, recordedAt: 2000.25 }, originalPageBasis));
  assert(!basisMatches({ scope: 'scope', recordedPosition: 1, validAt: 10.5 }, originalPageBasis));
  const noExplicitRecordedAt = { scope: 'scope', recordedPosition: 1, validAt: 10.5 };
  assert(basisMatches({ ...originalPageBasis, recordedAt: 2000.25 }, noExplicitRecordedAt));
  assert(basisMatches(noExplicitRecordedAt, noExplicitRecordedAt));
});
test('captured optional fields remain valid JSON without reordering arrays', () => {
  assert.equal(canonical({ z: undefined, b: ['c', 'E'], a: 1 }), '{"a":1,"b":["c","E"]}');
});
test('finite SDK inventory refuses repeat, undeclared calls and exhausted time', () => {
  const inventory = new Inventory(100, () => 0); assert.equal(inventory.take('seed-ascii'), 100);
  assert.throws(() => inventory.take('seed-ascii')); assert.throws(() => inventory.take('undeclared'));
  assert.throws(() => new Inventory(100, () => 100).take('seed-ascii'));
});
const setup = failure => {
  const calls = [], record = {}, settings = {
    async read(id) { calls.push(['read', id]); return id === 'selected-f1' ? '1' : '100'; },
    async set(value, id) { calls.push(['set', value, id]); if (failure === 'setting-ack' && id === 'select-f1') throw new Error('setting acknowledgment unknown'); },
  };
  const step = name => async () => { calls.push([name]); if (failure === name) throw new Error('controlled fake infrastructure error'); };
  return { calls, record, options: { settings, readNativeBefore: step('native-before'), readDatalog: step('datalog'), readNativeAfter: step('native-after'), record } };
};
test('settings phases retain baseline native, F1 and native100 ordering', async () => {
  const { calls, record, options } = setup(); await phases(options);
  assert.deepEqual(calls.filter(row => row.length === 1).flat(), ['native-before', 'datalog', 'native-after']);
  assert.deepEqual(calls.filter(row => row[0] === 'set').map(row => row[1]), ['1', '100', '100']); assert(record.restored100);
});
test('unknown write/HTTP-like exception stops later phases and restores100', async () => {
  const { calls, record, options } = setup('datalog'); await assert.rejects(phases(options));
  assert(!calls.some(row => row[0] === 'native-after')); assert(record.restored100);
});
test('lost setting ACK still attempts finally100 without a packet call', async () => {
  const { calls, record, options } = setup('setting-ack'); await assert.rejects(phases(options));
  assert(!calls.some(row => row[0] === 'datalog')); assert(record.restored100);
});
test('setup failure preserves100 without selecting F1 or extra reads', async () => {
  const { calls, record, options } = setup('native-before'); await assert.rejects(phases(options));
  assert(!calls.some(row => row[0] === 'set')); assert(record.restored100);
});
test('error evidence hashes echoed text without retaining its contents', () => {
  const marker = 'component-only-echo-marker'; assert(!JSON.stringify(safeError(new Error(marker))).includes(marker));
});
