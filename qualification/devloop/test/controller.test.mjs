import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { hashFile, readJson, sleep } from '../io.mjs';
import { openContext, snapshot } from '../state.mjs';
import { cleanupAttempt, enqueue, grantNext, requestCancel, reservations, retryJob, selectNext, validateManifest } from '../scheduler.mjs';
import { executeNext, groupSnapshot } from '../executor.mjs';
import { verifyAttempt } from '../evidence.mjs';
import { compare } from '../compare.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const source = 'qualification/devloop/io.mjs';
const runner = 'qualification/devloop/fixtures/controller-child.mjs';
const oracle = 'qualification/devloop/fixtures/controller.expected.json';
const policy = {
  format: 'triplex-devloop-policy/1', maximumHeavyTrials: 3, memoryPoolBytes: 512 * 1024 ** 2, cpuPoolUnits: 3,
  sampleMilliseconds: 35, terminationGraceMilliseconds: 150, maximumLogBytesPerAttempt: 32768,
  memorySupervision: 'component-test-owned-group-sampling-not-physical-containment',
  lanes: { 'duckdb-datalog': 'duckdb', 'xtdb-datalog': 'xtdb', 'qlever-datalog': 'qlever', 'xtdb-native': 'xtdb', 'qlever-native': 'qlever' },
  promotion: { minimumReadGoodputRatio: 1.1, maximumRequiredP99Ratio: 1.1, minimumIndependentRuns: 3, minimumObservationsPerRequiredClass: 10000 },
};

async function context() {
  await fs.mkdir(join(root, '.local/devloop-tests'), { recursive: true });
  const directory = await fs.mkdtemp(join(root, '.local/devloop-tests/controller-'));
  return openContext(root, { stateDirectory: relative(root, directory), testPolicy: policy });
}
async function job(id, mode = 'ok', overrides = {}) {
  const manifest = {
    format: 'triplex-devloop-job/1', id, kind: 'fixture', queryPath: 'duckdb-datalog', backend: 'duckdb',
    author: 'controller-test-author', problemId: 'controller-lifecycle', logicalTaskId: 'controller-fixture-only', hypothesis: 'Exercise the real command/owned result lifecycle without any engine acceptance claim', goals: [6, 7], dependsOn: [],
    inspiration: [{ reference: 'wiki/decisions/operating-policy.md', mechanism: 'Invocation ownership through terminal cleanup', adaptation: 'Node process group + immutable command/result receipts; not a backend ACK' }],
    command: { argv: [process.execPath, join(root, runner), mode], cwd: '.', env: {} },
    resources: { heavy: true, memoryBytes: 256 * 1024 ** 2, cpuUnits: 1, diskBytes: 1024 ** 2, timeoutMilliseconds: 5000, maximumLogBytes: 16384 },
    inputs: await Promise.all([[source, 'source'], [runner, 'runner'], [oracle, 'oracle']].map(async ([path, role]) => ({ path, role, sha256: await hashFile(join(root, path)) }))),
    evidence: { checks: [{ key: 'actual-result-bytes', expectedInput: oracle, actual: 'artifacts/answer.json' }], requiredCheckKeys: ['actual-result-bytes'] },
    retention: { scratch: 'rebuildable-ephemeral-only', meaning: 'Controller fixture has no database or uncertain backend state' },
  };
  return { ...manifest, ...overrides };
}

test('three slots, memory/cpu/disk vectors and aged lane selection are independent gates', async () => {
  const ctx = await context();
  for (const [id, lane] of [['a', 'duckdb-datalog'], ['b', 'duckdb-datalog'], ['c', 'xtdb-datalog'], ['d', 'qlever-native']]) {
    const manifest = await job(id); manifest.queryPath = lane; manifest.backend = policy.lanes[lane]; manifest.resources.memoryBytes = 128 * 1024 ** 2;
    await enqueue(ctx, manifest);
  }
  const first = await grantNext(ctx, { executor: 'test' }); assert.equal(first.jobId, 'a');
  const second = await grantNext(ctx, { executor: 'test' }); assert.equal(second.jobId, 'c');
  const third = await grantNext(ctx, { executor: 'test' }); assert.equal(third.jobId, 'd');
  await assert.rejects(grantNext(ctx), { code: 'NO_ADMISSION' });
  const state = await snapshot(ctx); assert.equal(reservations(state).heavy, 3);
  assert.equal(selectNext(ctx, state, { freeBytes: 1e9 }), null);
  state.jobs.a.status = 'completed_process_only';
  assert.equal(selectNext(ctx, state, { freeBytes: 1 })?.manifest?.id, undefined);
});

test('a younger ready lane cannot be explicitly selected ahead of a fair older opportunity', async () => {
  const ctx = await context(); await enqueue(ctx, await job('first')); await enqueue(ctx, await job('second'));
  await assert.rejects(grantNext(ctx, { onlyJob: 'second' }), { code: 'FAIR_QUEUE' });
  assert.equal((await snapshot(ctx)).jobs.first.status, 'queued');
});

test('runnable contracts reject oracle escape, unsupported resource sizes and dependency cycles', async () => {
  const ctx = await context();
  const escape = await job('escape'); escape.evidence.checks[0].actual = '../unowned.json';
  assert.throws(() => validateManifest(escape, policy), { code: 'EVIDENCE' });
  const tooBig = await job('too-big'); tooBig.resources.memoryBytes = policy.memoryPoolBytes + 1;
  await assert.rejects(enqueue(ctx, tooBig), { code: 'CAPACITY' });
  const a = await job('a'); a.dependsOn = ['b']; await enqueue(ctx, a);
  const b = await job('b'); b.dependsOn = ['a']; await assert.rejects(enqueue(ctx, b), { code: 'DEPENDENCY' });
});

test('actual command result bytes, source pins, terminal receipts and guarded scratch cleanup work', async () => {
  const ctx = await context(); await enqueue(ctx, await job('real-result'));
  const result = await executeNext(ctx, { executor: 'controller-test-executor' });
  assert.equal(result.status, 'completed_verified_bytes'); assert.equal(result.cleanup.groupGone, true);
  assert.ok(result.resources.samples > 0); assert.ok(result.resources.sampledPeakProcessGroupRssBytes > 0);
  const verified = await verifyAttempt(ctx, 'real-result', '0001'); assert.equal(verified.retainedResultBytesUnchanged, true);
  const directory = join(root, result.directory);
  const preserved = await hashFile(join(directory, 'terminal.json'));
  await fs.symlink(join(root, source), join(directory, 'scratch', 'escape'));
  await assert.rejects(cleanupAttempt(ctx, 'real-result', '0001'), { code: 'SYMLINK' });
  await fs.unlink(join(directory, 'scratch', 'escape'));
  await cleanupAttempt(ctx, 'real-result', '0001');
  assert.equal(await hashFile(join(directory, 'terminal.json')), preserved);
  await fs.writeFile(join(directory, 'artifacts', 'answer.json'), '{"tampered":true}\n');
  await assert.rejects(verifyAttempt(ctx, 'real-result', '0001'), { code: 'OUTPUT_CHANGED' });
});

test('first failure remains immutable after an explicit successful retry', async () => {
  const ctx = await context(); const manifest = await job('retry', 'fail-once');
  manifest.command.argv.push(join(ctx.directory, 'first-marker'));
  await enqueue(ctx, manifest);
  const first = await executeNext(ctx, { executor: 'test' }); assert.equal(first.status, 'failed_process');
  const original = await hashFile(join(root, first.directory, 'terminal.json'));
  await retryJob(ctx, 'retry', 'Explicit retry of a controlled transient process failure');
  const second = await executeNext(ctx, { executor: 'test' }); assert.equal(second.status, 'completed_verified_bytes');
  const state = await snapshot(ctx); assert.equal(state.jobs.retry.firstOutcome.status, 'failed_process');
  assert.equal(state.jobs.retry.attempts.length, 2); assert.equal(await hashFile(join(root, first.directory, 'terminal.json')), original);
});

test('queued abort launches nothing and active abort terminates actual child/grandchild work', async () => {
  const ctx = await context(); await enqueue(ctx, await job('queued'));
  await requestCancel(ctx, 'queued', 'Cancel before admission'); assert.equal((await snapshot(ctx)).jobs.queued.attempts.length, 0);
  const tree = await job('tree', 'tree');
  // The first tree attempt correctly hit its 256 MiB watchdog (~291 MB with
  // controller + four Node processes). Use a 384 MiB cancellation fixture;
  // the separate low-memory test preserves denial coverage and policy is fixed.
  tree.resources.memoryBytes = 384 * 1024 ** 2;
  await enqueue(ctx, tree);
  const work = executeNext(ctx, { executor: 'test' });
  let directory;
  for (let i = 0; i < 150; i++) {
    const state = await snapshot(ctx); const attempt = state.jobs.tree.attempts.at(-1);
    if (attempt) {
      directory = join(root, attempt.directory);
      try { await fs.stat(join(directory, 'artifacts', 'descendants.json')); break; } catch {}
    }
    await sleep(20);
  }
  const descendants = await readJson(join(directory, 'artifacts', 'descendants.json')); assert.ok(descendants.grandchild > 0);
  await requestCancel(ctx, 'tree', 'Cancel a real active process tree');
  const result = await work; assert.equal(result.status, 'canceled'); assert.equal(result.cleanup.groupGone, true);
  const state = await snapshot(ctx); const group = state.jobs.tree.attempts.at(-1).worker.pgid;
  assert.equal((await groupSnapshot(group)).processes.length, 0); assert.equal(reservations(state).heavy, 0);
});

test('whole invocation deadline and sampled memory/log breaches terminate rather than return PASS', async () => {
  const ctx = await context();
  const timeout = await job('deadline', 'sleep'); timeout.resources.timeoutMilliseconds = 300;
  await enqueue(ctx, timeout); assert.equal((await executeNext(ctx)).status, 'deadline');
  const memory = await job('memory', 'sleep'); memory.resources.memoryBytes = 1024;
  await enqueue(ctx, memory); assert.equal((await executeNext(ctx)).status, 'resource_breach');
  const log = await job('logs', 'log-flood'); log.resources.maximumLogBytes = 1024;
  await enqueue(ctx, log); const result = await executeNext(ctx); assert.equal(result.status, 'resource_breach'); assert.equal(result.cleanup.groupGone, true);
});

test('bad result bytes fail the oracle and incomplete/synthetic evidence cannot be promoted', async () => {
  const ctx = await context(); await enqueue(ctx, await job('bad', 'bad-answer'));
  assert.equal((await executeNext(ctx)).status, 'failed_oracle');
  await assert.rejects(compare(ctx, ['bad/0001'], ['missing/0001'], '.local/devloop-tests/forbidden-comparison.json'), { code: 'COMPONENT_ONLY' });
  const sourceChanged = await job('changed'); sourceChanged.inputs[0].sha256 = '0'.repeat(64);
  await assert.rejects(enqueue(ctx, sourceChanged), { code: 'INPUT_CHANGED' });
});
