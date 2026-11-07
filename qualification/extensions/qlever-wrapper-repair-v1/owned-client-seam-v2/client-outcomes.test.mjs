/** Eight authored pure callbacks, UNEXECUTED; no SDK/network/hold imports. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { observeOwnedQleverClient } from './client-outcomes.mjs';
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const fixture = (options = {}) => {
  let now = 0; const calls = [], pending = [];
  const original = Object.fromEntries(['query', 'update', 'command', 'cancel', 'close'].map(kind => [kind,
    function (...args) { assert.equal(this, original); const d = deferred(); calls.push({ kind, args, promise: d.promise }); pending.push(d); return d.promise; }]));
  const observed = observeOwnedQleverClient(original, { dispatchUntil: 840000, now: () => now, ...options });
  return { ...observed, original, calls, pending, at: value => { now = value; } };
};
test('admitted query update command preserve receiver arguments original Promise and result identity', async () => {
  const f = fixture();
  for (const kind of ['query', 'update', 'command']) {
    const options = { timeoutMs: 1 }, text = kind + '-fixed'; const actual = f.client[kind](text, options);
    const call = f.calls.at(-1), result = { kind }; assert.equal(actual, call.promise);
    assert.equal(call.args[0], text); assert.equal(call.args[1], options);
    f.pending.at(-1).resolve(result); assert.equal(await actual, result);
  }
  assert.equal(f.snapshot().pendingMethodPromises, 0); assert.equal(f.snapshot().unknownClientWork, false);
});
test('caught inner rejection is observed before the consumer and blocks every next request', async () => {
  // The unchanged real client rejects its method Promise for fetch rejection,
  // body-reader rejection and invalid SELECT shape. These are finite supplied
  // causes, not a fake transport integration or an executed real-client test.
  for (const cause of [new TypeError('synthetic fetch rejection'), new Error('synthetic body read'),
    new TypeError('synthetic SELECT shape')]) {
    const f = fixture(); const actual = f.client.query('metadata');
    const consumer = actual.catch(error => { assert.equal(error, cause); assert(f.snapshot().unknownClientWork); return 'outer-success'; });
    f.pending[0].reject(cause); assert.equal(await consumer, 'outer-success');
    for (const kind of ['query', 'update', 'command']) assert.throws(() => f.client[kind]('later'), /ADMISSION_UNRESOLVED/);
    assert.equal(f.calls.length, 1); assert.equal(f.snapshot().pendingMethodPromises, 0);
  }
});
test('absolute deadline refuses transport without a timer and after a deferred callback advances time', () => {
  const f = fixture(); f.at(840000); assert.throws(() => f.client.query('late'), /ADMISSION_UNRESOLVED/); assert.equal(f.calls.length, 0);
  let time = 0, calls = 0;
  const original = Object.fromEntries(['query', 'update', 'command', 'cancel', 'close'].map(k => [k, () => { calls++; return Promise.resolve(); }]));
  const o = observeOwnedQleverClient(original, { dispatchUntil: 840000, now: () => time,
    emit: () => { time = 840000; } });
  assert.throws(() => o.client.query('late-after-callback'), /ADMISSION_UNRESOLVED/); assert.equal(calls, 0);
});
test('signal abort is sticky even if the admitted original later resolves', async () => {
  const f = fixture(), controller = new AbortController(), options = { signal: controller.signal };
  const actual = f.client.query('fixed', options); controller.abort(); assert(f.snapshot().unknownClientWork);
  const result = []; f.pending[0].resolve(result); assert.equal(await actual, result);
  assert.equal(f.snapshot().pendingMethodPromises, 0); assert.throws(() => f.client.query('later')); assert.equal(f.calls.length, 1);
});
test('synchronous original throws keep their exact cause and make uncertainty sticky', () => {
  const cause = new Error('synthetic synchronous failure'), f = fixture(); f.original.query = function () { assert.equal(this, f.original); throw cause; };
  assert.throws(() => f.client.query('fixed'), error => error === cause);
  assert(f.snapshot().unknownClientWork); assert.equal(f.snapshot().pendingMethodPromises, 0);
});
test('local typed constraint after a fulfilled original response does not fabricate uncertainty', async () => {
  const f = fixture(); const actual = f.client.query('metadata'); f.pending[0].resolve([]); await actual;
  assert.throws(() => { throw new RangeError('local page size'); }); assert.equal(f.snapshot().unknownClientWork, false);
  const next = f.client.query('next'); f.pending[1].resolve([]); await next; assert.equal(f.calls.length, 2);
});
test('observer callback failure stays contained and refuses later dispatch', async () => {
  const f = fixture({ emit: event => { if (event.phase === 'settled') throw new Error('synthetic observer'); } });
  const actual = f.client.query('fixed'), result = []; f.pending[0].resolve(result); assert.equal(await actual, result);
  assert(f.snapshot().unknownClientWork); assert(f.snapshot().observerFailures > 0); assert.throws(() => f.client.update('later'));
  const g = fixture({ onUncertainty: () => Promise.reject(new Error('invalid async observer')) });
  const rejected = g.client.query('fixed'); g.pending[0].reject(new Error('synthetic')); await assert.rejects(rejected);
  await Promise.resolve(); assert(g.snapshot().unknownClientWork); assert(g.snapshot().observerFailures > 0);
  const h = fixture({ assertAdmission: async () => { throw new Error('invalid async admission'); } });
  assert.throws(() => h.client.query('not-admitted'), /SYNCHRONOUS_ADMISSION_CHECK_REQUIRED/);
  await Promise.resolve(); assert.equal(h.calls.length, 0); assert(h.snapshot().unknownClientWork);
});
test('explicit cancel and close retain original Promises and never clear prior uncertainty', async () => {
  const f = fixture(); const cancel = f.client.cancel('owned-id'); assert.equal(cancel, f.calls[0].promise);
  f.pending[0].resolve(); await cancel; assert(f.snapshot().unknownClientWork);
  const close = f.client.close(); assert.equal(close, f.calls[1].promise); f.pending[1].resolve(); await close;
  assert(f.snapshot().unknownClientWork); assert.equal(f.snapshot().pendingMethodPromises, 0); assert.equal(f.calls.length, 2);
});
