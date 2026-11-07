import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Cause, Effect, Exit } from 'effect';
import { PublicDuckDBBackend } from '../src/public-backend.mjs';
import { makeEffectStorage } from '../src/effect-storage.ts';

// Phase-controlled protocol tests, not a timing fixture or native C++ proof.
// Inspiration/rationale: qualification/devloop/DUCKDB-WITHDRAWAL.md. The public
// backend and original-fiber adapter are real; only the acknowledged port is a
// test double so acquisition/rollback races can be reproduced without sleeps.
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((r, j) => { resolve = r; reject = j; });
  return { promise, resolve, reject };
};
const promptly = async promise => {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Controlled unit operation did not settle')), 2000);
    })]);
  } finally { clearTimeout(timer); }
};
const fixture = async () => {
  const events = [], columns = new WeakMap();
  const port = {
    events,
    beginGate: null,
    beginEntered: null,
    positionGate: null,
    positionEntered: null,
    rollbackError: null,
    async begin() {
      events.push('begin');
      port.beginEntered?.resolve();
      if (port.beginGate) await port.beginGate.promise;
    },
    async run(plan) {
      events.push(`sql:${plan.name}`);
      if (plan.name === 'current_position') {
        port.positionEntered?.resolve();
        if (port.positionGate) await port.positionGate.promise;
      }
      const rows = plan.name === 'shared_version' ? [[5n]]
        : ['native_entity_ownership', 'shared_interop'].includes(plan.name) ? [[0n]]
        : plan.name === 'public_existing_scope' ? [['unit-scope', 'triplex-public-duckdb/2']]
        : plan.name === 'current_position' ? [[2n]] : [];
      columns.set(rows, plan.name === 'current_position' ? ['position'] : []);
      return rows;
    },
    columnsFor(rows) { return columns.get(rows) ?? []; },
    async commit() { events.push('commit'); },
    async rollback() {
      events.push('rollback');
      if (port.rollbackError) throw port.rollbackError;
    },
    async close() { events.push('close'); },
    async closeWriter() { events.push('close-writer'); },
    async closeReaders() { events.push('close-readers'); },
    async assertResourceProfile() { events.push('resources'); },
    async activateOwnership() { events.push('audit'); },
    interrupt() { events.push('interrupt'); },
  };
  const backend = new PublicDuckDBBackend(port, 'unit-scope');
  await backend.initialize('-- temporal-store/public-triplex/2\nSELECT 1;');
  events.length = 0;
  return { backend, port, events };
};
const observed = backend => {
  const registered = deferred();
  const admission = [];
  return {
    registered, admission,
    backend: {
      initialize: backend.initialize.bind(backend),
      withTransaction: backend.withTransaction.bind(backend),
      read: backend.read.bind(backend),
      close: backend.close.bind(backend),
      startTransaction(options) {
        admission.push(options);
        const controller = backend.startTransaction(options);
        registered.resolve(controller);
        return controller;
      },
    },
  };
};
const blocked = async backend => {
  const entered = deferred(), release = deferred();
  const completion = backend.withTransaction(async () => {
    entered.resolve();
    await release.promise;
    return 'first';
  });
  await entered.promise;
  return { release, completion };
};

test('queued signal withdrawal performs no native work and preserves live FIFO', async () => {
  const { backend, events } = await fixture(), first = await blocked(backend);
  const signal = new AbortController(), order = [];
  const rejected = assert.rejects(backend.withTransaction(async () => {
    events.push('cancelled-body');
  }, { signal: signal.signal }), e => e.code === 'CANCELED_BEFORE_BEGIN' && e.outcome === 'not_started');
  const second = backend.withTransaction(async () => { order.push('second'); });
  const third = backend.withTransaction(async () => { order.push('third'); });
  signal.abort();
  await promptly(rejected);
  assert.deepEqual(events, ['resources', 'begin']);
  first.release.resolve();
  await Promise.all([first.completion, second, third]);
  assert.deepEqual(order, ['second', 'third']);
  assert.equal(events.filter(x => x === 'audit').length, 3);
  assert(!events.includes('cancelled-body') && !events.includes('interrupt'));
  await backend.close();
});

test('read controller withdrawal is acknowledged once without BEGIN', async () => {
  const { backend, events } = await fixture(), first = await blocked(backend);
  const controller = backend.startTransaction({ withdrawableRead: true });
  const started = assert.rejects(controller.started, e => e.outcome === 'not_started');
  const completion = assert.rejects(controller.completion, e => e.code === 'CANCELED_BEFORE_BEGIN');
  assert.equal(controller.withdrawPending(), true);
  assert.equal(controller.withdrawPending(), false);
  await promptly(Promise.all([started, completion]));
  assert.deepEqual(events, ['resources', 'begin']);
  first.release.resolve();
  await first.completion;
  await backend.close();
  assert.equal(events.filter(x => x === 'begin').length, 1);
});

test('already aborted read is skipped and initialization/closed errors stay distinct', async () => {
  const { backend, port, events } = await fixture(), controller = new AbortController();
  controller.abort();
  await assert.rejects(backend.withTransaction(async () => assert.fail('must not run'), {
    signal: controller.signal,
  }), e => e.outcome === 'not_started');
  await backend.close();
  assert(!events.includes('resources') && !events.includes('begin'));
  await assert.rejects(backend.withTransaction(async () => {}), e => e.code === 'CLOSED');
  const uninitialized = new PublicDuckDBBackend(port, 'unit-scope');
  await assert.rejects(uninitialized.withTransaction(async () => {}), e => e.code === 'INITIALIZE');
});

test('acquired controller refuses withdrawal and acknowledges actual rollback/audit', async () => {
  const { backend, events } = await fixture();
  const controller = backend.startTransaction({ withdrawableRead: true });
  await controller.started;
  assert.equal(controller.withdrawPending(), false);
  controller.fail(new Error('cancelled owned work'));
  await assert.rejects(controller.completion, e => e.code === 'ROLLED_BACK' && e.outcome === 'rollback_ack');
  assert.deepEqual(events, ['resources', 'begin', 'rollback', 'audit']);
  await backend.withTransaction(session => session.currentCommitPosition());
  await backend.close();
});

test('original-fiber queued read interruption settles before another owner releases', async () => {
  const { backend, events } = await fixture(), first = await blocked(backend), proxy = observed(backend);
  const bundle = makeEffectStorage(proxy.backend, 'unused-schema'), signal = new AbortController();
  const exit = Effect.runPromiseExit(bundle.withReadTransaction(Effect.sync(() => {
    events.push('cancelled-effect-body');
  })), { signal: signal.signal });
  await proxy.registered.promise;
  signal.abort();
  assert(Exit.isFailure(await promptly(exit)));
  assert.deepEqual(events, ['resources', 'begin']);
  first.release.resolve();
  await first.completion;
  await backend.close();
  assert(!events.includes('cancelled-effect-body'));
});

test('cancellation racing BEGIN waits for start and real rollback before settlement', async () => {
  const { backend, port, events } = await fixture();
  port.beginGate = deferred(); port.beginEntered = deferred();
  const bundle = makeEffectStorage(backend, 'unused-schema'), signal = new AbortController();
  let settled = false;
  const exit = Effect.runPromiseExit(bundle.withReadTransaction(Effect.sync(() => {
    events.push('cancelled-effect-body');
  })), { signal: signal.signal }).then(value => { settled = true; return value; });
  await port.beginEntered.promise;
  signal.abort();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(settled, false);
  port.beginGate.resolve();
  assert(Exit.isFailure(await promptly(exit)));
  assert.deepEqual(events, ['resources', 'begin', 'rollback', 'audit']);
  await backend.close();
});

test('ordinary write acquisition stays masked and never abandons accepted work', async () => {
  const { backend, events } = await fixture(), first = await blocked(backend), proxy = observed(backend);
  const bundle = makeEffectStorage(proxy.backend, 'unused-schema'), signal = new AbortController();
  let settled = false;
  const exit = Effect.runPromiseExit(bundle.storage.withTransaction(Effect.sync(() => {
    events.push('cancelled-write-body');
  })), { signal: signal.signal }).then(value => { settled = true; return value; });
  await proxy.registered.promise;
  signal.abort();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(settled, false);
  assert.equal(proxy.admission[0].withdrawableRead, false);
  first.release.resolve();
  await first.completion;
  assert(Exit.isFailure(await promptly(exit)));
  assert(!events.includes('cancelled-write-body'));
  assert.equal(events.filter(x => x === 'rollback').length, 1);
  await backend.close();
});

test('caught same-owner nested failure still poisons the outer physical transaction', async () => {
  const { backend, events } = await fixture(), bundle = makeEffectStorage(backend, 'unused-schema');
  const nested = bundle.withReadTransaction(Effect.fail(new Error('nested failure'))).pipe(
    Effect.catch(() => Effect.succeed('caught')),
  );
  const exit = await Effect.runPromiseExit(bundle.storage.withTransaction(nested));
  assert(Exit.isFailure(exit));
  assert(events.includes('rollback') && !events.includes('commit'));
  await backend.close();
});

test('caught foreign preflight refusal preserves current valid outer commit behavior', async () => {
  const a = await fixture(), b = await fixture();
  const outer = makeEffectStorage(a.backend, 'unused-schema'), foreign = makeEffectStorage(b.backend, 'unused-schema');
  const answer = await Effect.runPromise(outer.storage.withTransaction(
    foreign.withReadTransaction(Effect.sync(() => assert.fail('foreign body must not run'))).pipe(
      Effect.catch(() => Effect.succeed('caught foreign refusal')),
    ),
  ));
  assert.equal(answer, 'caught foreign refusal');
  assert.deepEqual(a.events, ['resources', 'begin', 'commit', 'audit']);
  assert.deepEqual(b.events, []);
  await a.backend.close(); await b.backend.close();
});

test('unknown rollback is surfaced and fenced instead of hidden by interruption', async () => {
  const { backend, port } = await fixture();
  port.beginGate = deferred(); port.beginEntered = deferred();
  port.rollbackError = new Error('unit rollback acknowledgment lost');
  const bundle = makeEffectStorage(backend, 'unused-schema'), signal = new AbortController();
  const exit = Effect.runPromiseExit(bundle.withReadTransaction(Effect.succeed('unused')), {
    signal: signal.signal,
  });
  await port.beginEntered.promise;
  signal.abort(); port.beginGate.resolve();
  const result = await promptly(exit);
  assert(Exit.isFailure(result));
  assert.match(Cause.pretty(result.cause), /rollback|acknowledg|fenced/i);
  assert.equal(backend.status().owner.state, 'fenced');
  await backend.close();
});

test('close drains queued skip nodes and rejects new admission', async () => {
  const { backend, events } = await fixture(), first = await blocked(backend);
  const controller = backend.startTransaction({ withdrawableRead: true });
  const done = assert.rejects(controller.completion, e => e.outcome === 'not_started');
  const begun = assert.rejects(controller.started, e => e.outcome === 'not_started');
  assert(controller.withdrawPending());
  await Promise.all([done, begun]);
  let closed = false;
  const close = backend.close().then(() => { closed = true; });
  await Promise.resolve();
  assert.equal(closed, false);
  await assert.rejects(backend.withTransaction(async () => {}), e => e.code === 'CLOSED');
  first.release.resolve();
  await first.completion; await close;
  assert.equal(events.filter(x => x === 'begin').length, 1);
  assert.equal(events.filter(x => x === 'audit').length, 1);
  assert(events.includes('close'));
});

test('already acquiring standalone metadata keeps distinct caller and physical completion', async () => {
  const { backend, port, events } = await fixture();
  port.positionGate = deferred(); port.positionEntered = deferred();
  const bundle = makeEffectStorage(backend, 'unused-schema'), signal = new AbortController();
  const exit = Effect.runPromiseExit(bundle.storage.currentCommitPosition(), { signal: signal.signal });
  await port.positionEntered.promise;
  signal.abort();
  assert(Exit.isFailure(await promptly(exit)));
  assert.deepEqual(events, ['resources', 'begin', 'sql:current_position']);
  // Retained baseline behavior: direct invoke() does not await acquired metadata
  // drain. This is not queued withdrawal or caller-acknowledged rollback.
  port.positionGate.resolve();
  assert.equal(await backend.withTransaction(session => session.currentCommitPosition()), 2);
  assert.equal(events.filter(x => x === 'commit').length, 2);
  assert.equal(events.filter(x => x === 'audit').length, 2);
  assert(!events.includes('interrupt'));
  await backend.close();
});
