import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { PublicDuckDBBackend } from '../dist/public-backend.js';
import { observePublicReadStages } from '../experiments/public-read-stage-preload.mjs';

test('stage observer forwards internal admission arguments and callback identity', async () => {
  // A pure instrumentation gate: no native backend is opened. The observer must
  // not drop the new queue signal/registration while wrapping the real class.
  const directory = await mkdtemp(path.join(process.env.TMPDIR, 'duck-observer-unit-'));
  const file = path.join(directory, 'trace.jsonl');
  const original = PublicDuckDBBackend.prototype.withTransaction;
  let received, actualWork;
  PublicDuckDBBackend.prototype.withTransaction = function (work, admission) {
    received = admission;
    actualWork = work;
    return Promise.resolve().then(() => work('owned-session'));
  };
  const observer = observePublicReadStages(file);
  try {
    const signal = new AbortController().signal;
    const register = () => {};
    const admission = { signal, onAdmission: register };
    const answer = await Object.create(PublicDuckDBBackend.prototype).withTransaction(
      async session => { assert.equal(session, 'owned-session'); return 'answer'; },
      admission,
    );
    assert.equal(answer, 'answer');
    assert.equal(received, admission);
    assert.equal(received.signal, signal);
    assert.equal(received.onAdmission, register);
    assert.equal(typeof actualWork, 'function');
    assert.equal(observer.snapshot().backends[0].pendingTransactions, 0);
  } finally {
    observer.close();
    PublicDuckDBBackend.prototype.withTransaction = original;
  }
  const events = (await readFile(file, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(events.filter(x => x.event === 'backend-queue-submit').length, 1);
  assert.equal(events.filter(x => x.event === 'backend-queue-settle' && x.ok).length, 1);
  // Only this newly-created component scratch is disposable; no run receipt or
  // persisted backend is removed by the test.
  await rm(directory, { recursive: true });
});
