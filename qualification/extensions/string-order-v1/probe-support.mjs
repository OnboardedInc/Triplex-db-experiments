import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Oracle comparison only. Never order, casefold or normalize actual rows.
// Membership is a separate fixed-identity property, not an ordering oracle.
export const rowsOf = (rows, native = false) => {
  assert(Array.isArray(rows) && rows.length <= 32, 'BOUNDED_ROWS_REQUIRED');
  return rows.map(row => {
    const expected = native ? ['entity', 'label'] : ['?entity', '?label'];
    assert.deepEqual(Object.keys(row).sort(), expected, 'EXACT_PUBLIC_PROJECTION_REQUIRED');
    const entity = row[native ? 'entity' : '?entity'];
    const label = row[native ? 'label' : '?label'];
    assert(typeof entity === 'string' && typeof label === 'string', 'TEXT_ROW_CHANNELS_REQUIRED');
    return { entity, label };
  });
};
export const exact = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
export const basisMatches = (actual, expected) => Object.entries(expected).every(([key, value]) => actual?.[key] === value);
export const membership = (actual, expected) => {
  if (actual.length !== expected.length || new Set(actual.map(row => row.entity)).size !== actual.length) return false;
  return expected.every(row => actual.some(value => value.entity === row.entity && value.label === row.label));
};
export const codepoints = value => [...value].map(character => character.codePointAt(0));
export const sha = value => createHash('sha256').update(value).digest('hex');
// JSON object-key order only. Array order is evidence and is never changed.
// Match JSON's omission of optional undefined fields rather than emitting the
// non-JSON token `undefined` inside a captured public response.
export const canonical = value => JSON.stringify(value, (_key, nested) =>
  nested && typeof nested === 'object' && !Array.isArray(nested)
    ? Object.fromEntries(Object.keys(nested).sort().map(key => [key, nested[key]]))
    : nested);
export const safeError = error => {
  const message = String(error?.message ?? error);
  return { class: ['AssertionError', 'TypeError', 'Error'].includes(error?.name) ? error.name : 'OtherError',
    messageSha256: sha(message), messageBytes: Buffer.byteLength(message) };
};

// The SDK call budget is independent of internal native preconditions/admission
// queries. Those are fully charged to the process group and retained traces.
export const SDK_CALLS = Object.freeze([
  'fresh-ascii', 'fresh-unicode', 'seed-ascii', 'seed-unicode', 'ack-seed-ascii', 'ack-seed-unicode',
  'native-ascii-membership', 'native-unicode-membership', 'native-ascii-asc', 'native-ascii-desc',
  'native-ascii-gt-E', 'native-ascii-lt-c', 'native-page-first',
  'datalog-ascii-membership', 'datalog-ascii-asc', 'datalog-ascii-desc', 'datalog-ascii-gt-E',
  'datalog-ascii-lt-c', 'datalog-page-first', 'correct-ascii', 'ack-correction', 'ascii-history',
  'datalog-page-continue', 'datalog-page-reopen', 'datalog-latest', 'datalog-unicode-observe',
  'native-page-continue', 'native-page-reopen', 'native-latest', 'native-unicode-asc', 'native-unicode-gt-private-use',
]);
export class Inventory {
  constructor(deadline, now = () => Date.now()) { this.deadline = deadline; this.now = now; this.seen = new Set(); }
  take(id) {
    assert(SDK_CALLS.includes(id) && !this.seen.has(id), 'SDK_CALL_NOT_DECLARED_OR_REPEATED');
    assert(this.now() < this.deadline, 'GLOBAL_SDK_WINDOW_EXPIRED');
    this.seen.add(id);
    return Math.max(1, Math.min(5000, this.deadline - this.now()));
  }
}

// A wrong answer is evidence, not an exception that conceals later declared
// independent reads. An exception from a write/transport/ownership path aborts.
// Finally restoration is attempted even when the setting ACK was lost.
export const phases = async ({ settings, readNativeBefore, readDatalog, readNativeAfter, record }) => {
  let changed = false;
  const before = await settings.read('before');
  assert.equal(before, '100');
  try {
    await readNativeBefore();
    changed = true;
    await settings.set('1', 'select-f1');
    assert.equal(await settings.read('selected-f1'), '1');
    await readDatalog();
    await settings.set('100', 'restore-before-native');
    assert.equal(await settings.read('native-after-f1'), '100');
    await readNativeAfter();
  } finally {
    if (changed) {
      try {
        await settings.set('100', 'finally-restore');
        assert.equal(await settings.read('finally-readback'), '100');
        record.restored100 = true;
      } catch (error) { record.restored100 = false; record.restoreError = safeError(error); throw error; }
    } else {
      assert.equal(await settings.read('unchanged-after-setup'), '100');
      record.restored100 = true;
    }
  }
};
