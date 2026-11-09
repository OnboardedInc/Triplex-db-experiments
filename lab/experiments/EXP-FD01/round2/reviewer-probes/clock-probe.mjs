// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
import './source-hook.mjs';
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { FeedConsumer } from '../../bench/lib/feed.ts';
// [CX-VFD01] Why: test the actual bench consumer with record time and publication time separated.
// Rejected: merely attaching an ignored lagMs field to a FeedPage (does not execute metric code).
const dir = `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VFD01/clock-${randomUUID()}`;
fs.mkdirSync(dir, { recursive: true });
const paths = ['lab/bench/lib/feed.ts', 'lab/bench/lib/rng.ts', 'lab/bench/lib/world.ts',
  'packages/core/src/feed/index.ts', 'packages/host/src/feed/ConsumerStore.ts', 'packages/host/src/feed/Adapters.ts',
  'lab/verify/FD01/clock-probe.mjs', 'lab/verify/FD01/source-hook.mjs'];
const hashSources = () => Object.fromEntries(paths.map((p) => [p, createHash('sha256').update(fs.readFileSync(new URL('../../../' + p, import.meta.url))).digest('hex')]));
const sources = hashSources();
const clocks = { publishedAtMonoMs: 100, durableAtMonoMs: 400, decidedStampAsMs: 399 };
const handle = {
  feedPage: async () => {
    consumer.stop();
    return { next: 1, transactions: [{ position: 1, txId: 'tx1', changes: [{ op: 'assert', tripleId: 'a1', entityId: 'pl:00000000', attribute: ':a', validFrom: 0, validTo: null }] }] };
  },
  close: async () => {},
};
const consumer = new FeedConsumer({ dir, epoch: '1', startAfter: 0,
  now: () => clocks.durableAtMonoMs,
  commitOf: () => ({ instant: clocks.decidedStampAsMs, ackAt: 101, subject: 0, subjects: [0], stamp: 399000,
    publicationAtMonoMs: clocks.publishedAtMonoMs, correction: false, correctionValidFrom: null }),
  open: async () => handle, log: () => {}, crashes: [],
});
await consumer.run();
assert.equal(consumer.checkpoint, 1);
const result = { dir, sources, clocks, lags: consumer.lags, arm: consumer.feedArm,
  publicationLagMs: clocks.durableAtMonoMs - clocks.publishedAtMonoMs,
  reportedLagMs: consumer.lags[0]?.lagMs,
  note: 'A0 is explicitly diagnostic; this demonstrates that the requested Q98d negative check is absent, not that a production P3 receipt was accepted.' };
assert.equal(result.reportedLagMs, 1);
assert.equal(result.publicationLagMs, 300);
consumer.close();
assert.deepEqual(hashSources(), sources);
result.sourceUnchanged = true;
fs.writeFileSync(dir + '/result.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
