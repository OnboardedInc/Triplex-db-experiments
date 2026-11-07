/** SOURCE ONLY. Future materializer must copy this and client-outcomes.mjs
 * inside each newly generated private package's probes/owned-client-v1/ before
 * public self-reference imports can run. No current SDK/test import occurred.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Effect } from 'effect';
import { Triples } from '@triplex-build/triplex';
import { DatabaseScope, Capabilities } from '@triplex-build/triplex/runtime';
import { makeQleverRuntime } from '@triplex-build/triplex-qlever';
import { observeOwnedQleverClient } from './client-outcomes.mjs';

const setup = reject => {
  const cause = new Error('synthetic owned metadata transport rejection');
  let queries = 0, initializationQueries = 0, closes = 0;
  const original = {
    query: function (text) {
      assert.equal(this, original);
      if (text === 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1') {
        initializationQueries++; return Promise.resolve([]);
      }
      assert.match(text, /^SELECT \?position WHERE /); queries++;
      return reject ? Promise.reject(cause) : Promise.resolve([]);
    },
    update: function () { assert.equal(this, original); throw new Error('UNEXPECTED_UPDATE'); },
    command: function () { assert.equal(this, original); throw new Error('UNEXPECTED_COMMAND'); },
    cancel: function () { assert.equal(this, original); throw new Error('UNEXPECTED_CANCEL'); },
    close: function () { assert.equal(this, original); closes++; return Promise.resolve(); },
  };
  const observed = observeOwnedQleverClient(original, { dispatchUntil: Date.now() + 60000 });
  const runtime = makeQleverRuntime({ url: 'http://127.0.0.1:17019', client: observed.client });
  const scope = DatabaseScope.make({ env: 'test', tenant: 'owned-client-source', database: reject ? 'rejection' : 'local', generation: 0 });
  const run = program => Effect.runPromise(program.pipe(
    Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none,
      deterministic: { startTime: 1000.25, seed: 'borrowed-client-source' } })), Effect.scoped));
  return { ...observed, run, cause, counts: () => ({ queries, initializationQueries, closes }) };
};
const query = { find: ['?v'], where: [['source-subject', ':source/value', '?v']] };

test('real public runtime may catch an inner ReadError but observed borrowed client keeps it unknown', async () => {
  const f = setup(true);
  const caught = await f.run(Effect.gen(function* () {
    const triples = yield* Triples;
    return yield* triples.query(query, { pageSize: 1001 }).pipe(Effect.flip);
  }));
  assert.equal(caught._tag, 'ReadError'); assert.equal(caught.cause, f.cause);
  assert.equal(f.counts().queries, 1); assert.equal(f.counts().initializationQueries, 1); assert.equal(f.counts().closes, 0);
  assert(f.snapshot().unknownClientWork); assert.equal(f.snapshot().pendingMethodPromises, 0);
  assert.throws(() => f.client.query('later'), /ADMISSION_UNRESOLVED/); assert.equal(f.counts().queries, 1);
  await f.client.close(); assert.equal(f.counts().closes, 1); assert(f.snapshot().unknownClientWork);
});

test('real public local Pagination failure after successful metadata stays a local typed constraint', async () => {
  const f = setup(false);
  const caught = await f.run(Effect.gen(function* () {
    const triples = yield* Triples;
    return yield* triples.query(query, { pageSize: 1001 }).pipe(Effect.flip);
  }));
  assert.equal(caught._tag, 'PaginationCursorError');
  assert.equal(f.counts().queries, 1); assert.equal(f.counts().initializationQueries, 1); assert.equal(f.counts().closes, 0);
  assert.equal(f.snapshot().unknownClientWork, false); assert.equal(f.snapshot().pendingMethodPromises, 0);
  await f.client.close(); assert.equal(f.counts().closes, 1); assert.equal(f.snapshot().unknownClientWork, false);
});
