// @ts-nocheck -- [EXP-CHECKJS-R2] runtime callback/availability guards not inferred. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Executor } from './runner.mjs';
import { openComposition, classify } from './composition.mjs';
import { failureKind, diagnostics } from './diagnostics.mjs';

// [EXP-W01b] Why: restart disposal and missing-ref cascades are harness faults with different
// remedies from engine deadlines. Rejected: testing only classification strings (misses the race).
test('queued writer waits for replacement runtime after a restart', async () => {
  let generation = 0, releaseDispose, firstStarted;
  const started = new Promise(r => { firstStarted = r; });
  const disposal = new Promise(r => { releaseDispose = r; });
  const T = {
    qualification: { loadQualificationBackend: async () => ({ makeRuntime: () => ({ layer: () => ({}) }) }) },
    runtime: { DatabaseScope: { test: x => x }, Capabilities: { none: {} } }, core: { Triples: 'service' },
    Exit: { isSuccess: x => x.ok },
    ManagedRuntime: { make: () => {
      const id = ++generation;
      return {
        runPromise: async () => ({ transact: () => id }),
        runPromiseExit: async () => {
          if (id === 1) { firstStarted(); return new Promise(() => {}); }
          return { ok: true, value: { txId: 'new', position: 1, instant: 1, triples: [] } };
        },
        dispose: async () => { if (id === 1) await disposal; },
      };
    } },
  };
  const comp = await openComposition({ lane: 'xtdb', scope: 'test', load: async () => T });
  const first = comp.transact([], {});
  await started;
  const queued = comp.transact([], {});
  const restart = comp.restart();
  assert.equal((await first).status, 'unknown');
  await new Promise(r => setImmediate(r));
  assert.equal(generation, 1);
  releaseDispose(); await restart;
  assert.equal((await queued).receipt.txId, 'new');
  assert.equal(generation, 2);
  await comp.close();
});

test('missing assertion reference is blocked and never submitted to the engine', async () => {
  let calls = 0; const checks = [];
  const ex = new Executor({ comp: { transact: () => { calls++; } }, phys: x => x, physCommand: x => x,
    epoch: 0, check: (...x) => checks.push(x), hooks: {} });
  const a = await ex.submit({ index: 0, subject: 's', operations: [{ op: 'retract', target: 'absent' }], meta: { commandId: 'c' } });
  assert.equal(a.status, 'blocked'); assert.equal(a.category, 'predecessor-not-committed');
  assert.equal(calls, 0); assert.equal(ex.pending, 0); assert.equal(checks[0][1], false);
});

test('generic I/O errors do not assert engine timeout or semantic success', () => {
  assert.equal(failureKind({ tag: 'ReadError', message: 'XTDB read failed' }), 'engine-io-unresolved');
  assert.equal(failureKind({ tag: 'WriteError', message: 'deadline exceeded' }), 'engine-timeout');
  assert.equal(failureKind('ManagedRuntime disposed'), 'harness-runtime-restart');
  const wrapped = classify({ _tag: 'ReadError', message: 'XTDB read failed', cause: new Error('deadline exceeded') });
  assert.equal(wrapped.causes[0].message, 'deadline exceeded');
  assert.equal(failureKind(wrapped), 'engine-timeout');
  const d = diagnostics({ attempts: [{ index: 1, status: 'blocked', category: 'predecessor-not-committed' }] });
  assert.equal(d.counts['harness-blocked-predecessor'], 1);
});
