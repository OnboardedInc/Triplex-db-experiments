// @ts-nocheck -- [EXP-CHECKJS] runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Pure controls only: no worker import, credential, resolver or service call. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { LowercaseInventory, LOWERCASE_SDK_CALLS, basisMatches, exact, membership, rowsOf } from './lowercase-support.mjs';

test('the complete lowercase inventory is finite and unique', () => {
  const inventory = new LowercaseInventory(6000, () => 0);
  for (const id of LOWERCASE_SDK_CALLS) assert.equal(inventory.take(id), 5000);
  assert.equal(inventory.seen.size, 17);
  assert.equal(LOWERCASE_SDK_CALLS.filter(id => id.startsWith('native-')).length, 5);
  assert.equal(LOWERCASE_SDK_CALLS.filter(id => id.startsWith('datalog-')).length, 9);
});
test('duplicate and undeclared calls refuse before inventory changes', () => {
  const inventory = new LowercaseInventory(6000, () => 0);
  inventory.take('fresh-lowercase');
  assert.throws(() => inventory.take('fresh-lowercase'), /NOT_DECLARED_OR_REPEATED/);
  assert.throws(() => inventory.take('retry'), /NOT_DECLARED_OR_REPEATED/);
  assert.equal(inventory.seen.size, 1);
});
test('the remaining dispatch window bounds each call and expires closed', () => {
  let now = 999;
  const inventory = new LowercaseInventory(1000, () => now);
  assert.equal(inventory.take('fresh-lowercase'), 1);
  now = 1000;
  assert.throws(() => inventory.take('seed-lowercase'), /WINDOW_EXPIRED/);
  assert(!inventory.seen.has('seed-lowercase'));
});
test('row adaptation preserves actual order and exact membership', () => {
  const expected = [{ entity: 'lowercase-a', label: 'a' }, { entity: 'lowercase-c', label: 'c' }];
  const reversed = rowsOf([{ '?entity': 'lowercase-c', '?label': 'c' }, { '?entity': 'lowercase-a', '?label': 'a' }]);
  assert(membership(reversed, expected)); assert(!exact(reversed, expected));
  assert(!membership([...reversed, reversed[0]], expected));
});
test('page R is required while native and queryAll do not invent it', () => {
  const expected = { scope: 'fixture', recordedPosition: 1, validAt: 10.5 };
  assert(basisMatches(expected, expected));
  assert(!basisMatches(expected, { ...expected, recordedAt: 1000.25 }));
  assert(!basisMatches({ ...expected, recordedAt: 999 }, { ...expected, recordedAt: 1000.25 }));
  assert(basisMatches({ ...expected, recordedAt: 1000.25 }, { ...expected, recordedAt: 1000.25 }));
});
test('the four independent lowercase ranges match their fixed ASCII oracle', () => {
  const oracle = JSON.parse(readFileSync(new URL('./oracle.json', import.meta.url)));
  assert.deepEqual(oracle.fixture.rows.map(row => row.label), ['a', 'c', 'e', 'z']);
  const comparisons = { '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b };
  for (const item of oracle.cases) {
    const expected = oracle.fixture.rows.filter(row => comparisons[item.operator](row.label, item.boundary));
    assert.deepEqual(item.expectedRows, expected); assert.equal(item.expectedTerminalPage, true);
  }
});
