import assert from 'node:assert/strict';
import { Effect, Layer, ManagedRuntime, Cause, Exit } from 'effect';
import { Triples } from './src/store/Triples.js';
import { TriplesLive } from './src/store/TriplesLive.js';
import { StorageAdapter } from './src/storage/StorageAdapter.js';
import { QueryExecutor } from './src/storage/QueryExecutor.js';
import { TripleStoreRuntimeLive } from './src/store/TripleStoreRuntime.js';
import { WriteError } from './src/errors/index.js';

// [EXP-W01b] Why: instrument the adapter claim boundary to prove invalid batches never mutate
// command receipts or positions. Rejected: asserting Schema.is alone (does not exercise transact).
let claims = 0;
const adapter = {
  initialize: () => Effect.void,
  supportedValueTypes: ['integer', 'string'],
  withTransaction: (effect: unknown) => effect,
  claimCommand: () => Effect.suspend(() => {
    claims++;
    return Effect.fail(new WriteError({ message: 'PROBE_ADAPTER_BOUNDARY' }));
  }),
};
const rt = ManagedRuntime.make(TriplesLive.pipe(Layer.provide(Layer.mergeAll(
  Layer.succeed(StorageAdapter, adapter as never),
  Layer.succeed(QueryExecutor, {} as never), TripleStoreRuntimeLive,
))));
const triples = await rt.runPromise(Triples);
const patched = process.argv.includes('--patched');
const results = [];
try {
  for (const value of ['9223372036854775808', '-9223372036854775809', '01', '-0', '+1', '1e3', '1152921504606846976', '9223372036854775807']) {
    const invalid = !['1152921504606846976', '9223372036854775807'].includes(value);
    const before = claims;
    const exit = await rt.runPromiseExit(triples.transact([
      { op: 'assert', entityId: 'probe' as never, attribute: ':probe/good', value: { type: 'string', value: 'batch must be atomic' } },
      { op: 'assert', entityId: 'probe' as never, attribute: ':probe/integer', value: { type: 'integer', value } as never },
    ], { commandId: `probe/${value}` }));
    assert(Exit.isFailure(exit));
    const error = Cause.findErrorOption(exit.cause);
    assert.equal(error._tag, 'Some');
    if (error._tag !== 'Some') throw new Error('missing typed error');
    const e = error.value as { _tag: string; message: string };
    const want = patched && invalid ? 'InvalidTripleError' : 'WriteError';
    assert.equal(e._tag, want);
    assert.equal(claims - before, patched && invalid ? 0 : 1);
    results.push({ value, tag: e._tag, adapterClaims: claims - before });
  }
} finally { await rt.dispose(); }
console.log(JSON.stringify({ patched, results, limitation: 'Instrumented adapter boundary only; no engine, round-trip, or performance claim.' }));
