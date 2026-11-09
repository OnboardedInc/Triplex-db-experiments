// @ts-nocheck -- [EXP-CHECKJS] option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { atomicJson, hashFile, readJson } from '../io.mjs';
import { loadJobManifest, openContext, readState, snapshot } from '../state.mjs';
import { enqueue, grantNext } from '../scheduler.mjs';
import { executeNext } from '../executor.mjs';
import { verifyAttempt } from '../evidence.mjs';
import { migrateState } from '../migration.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const policy = { format: 'triplex-devloop-policy/1', maximumHeavyTrials: 3, memoryPoolBytes: 512 * 1024 ** 2, cpuPoolUnits: 3, sampleMilliseconds: 30, terminationGraceMilliseconds: 150, maximumLogBytesPerAttempt: 32768, lanes: { 'duckdb-datalog': 'duckdb' }, promotion: {} };

async function setup() {
  const directory = await fs.mkdtemp(join(root, '.local/devloop-tests/migration-'));
  const context = await openContext(root, { stateDirectory: relative(root, directory), testPolicy: policy });
  const files = [['qualification/devloop/io.mjs', 'source'], ['qualification/devloop/fixtures/controller-child.mjs', 'runner'], ['qualification/devloop/fixtures/controller.expected.json', 'oracle']];
  const manifest = { format: 'triplex-devloop-job/1', id: 'history', kind: 'fixture', queryPath: 'duckdb-datalog', backend: 'duckdb', author: 'migration-fixture', logicalTaskId: 'preserve-controller-history', problemId: 'state-growth', hypothesis: 'Immutable manifests remove repeated pins without changing old receipt authority', goals: [6, 7], dependsOn: [], inspiration: [{ reference: 'wiki/problems/controller-state-growth.md', mechanism: 'Reuse immutable envelope bytes as a sidecar', adaptation: 'Keep admission mutable state thin and preserve unknown publication outcomes' }], command: { argv: [process.execPath, join(root, files[1][0]), 'ok'], cwd: '.', env: {} }, resources: { heavy: true, memoryBytes: 256 * 1024 ** 2, cpuUnits: 1, diskBytes: 1024, timeoutMilliseconds: 5000, maximumLogBytes: 8192 }, inputs: await Promise.all(files.map(async ([path, role]) => ({ path, role, sha256: await hashFile(join(root, path)) }))), evidence: { checks: [{ key: 'actual', expectedInput: files[2][0], actual: 'artifacts/answer.json' }], requiredCheckKeys: ['actual'] } };
  await enqueue(context, manifest);
  return { context, manifest };
}

async function legacy(context, { orphan = false } = {}) {
  const state = await readState(context);
  const job = state.jobs.history;
  job.manifest = await loadJobManifest(context, job);
  delete job.manifestRef;
  if (orphan) {
    job.status = 'cleanup_unknown';
    const attempt = job.attempts.at(-1);
    attempt.status = 'cleanup_unknown';
    delete attempt.terminalSha256;
    delete job.firstOutcome;
  }
  state.format = 'triplex-devloop-state/1';
  await atomicJson(join(context.directory, 'state.json'), state);
  return { state, sha256: await hashFile(join(context.directory, 'state.json')) };
}

test('explicit v1 migration preserves exact history and old anchored receipt reads', async () => {
  const { context, manifest } = await setup();
  const result = await executeNext(context, { executor: 'migration-test' });
  assert.equal(result.status, 'completed_verified_bytes');
  const terminalPath = join(context.root, result.directory, 'terminal.json'), terminalSha256 = await hashFile(terminalPath);
  const before = await legacy(context);
  await assert.rejects(snapshot(context), { code: 'STATE_MIGRATION_REQUIRED' });
  assert.equal(await hashFile(join(context.directory, 'state.json')), before.sha256);
  const migrated = await migrateState(context);
  assert.equal(migrated.status, 'MIGRATED_V2');
  assert.equal(migrated.legacy.sha256, before.sha256);
  assert.equal(await hashFile(join(context.root, migrated.legacy.path)), before.sha256);
  const state = await readState(context), job = state.jobs.history;
  assert.equal(state.format, 'triplex-devloop-state/2');
  assert.equal(Object.hasOwn(job.manifest, 'inputs'), false);
  assert.deepEqual(await loadJobManifest(context, job), manifest);
  assert.deepEqual(job.firstOutcome, before.state.jobs.history.firstOutcome);
  assert.deepEqual(job.attempts, before.state.jobs.history.attempts);
  assert.equal((await verifyAttempt(context, 'history', '0001')).terminalSha256, terminalSha256);
  assert.equal((await migrateState(context)).status, 'ALREADY_V2');
});

test('missing, changed, escaped or symlinked sidecars refuse grants before attempt creation', async () => {
  for (const kind of ['changed', 'missing', 'symlink', 'escape', 'header']) {
    const { context } = await setup();
    const state = await readState(context), job = state.jobs.history, file = join(context.root, job.manifestRef.path);
    if (kind === 'changed') await fs.appendFile(file, '\n');
    if (kind === 'missing') await fs.unlink(file);
    if (kind === 'symlink') { await fs.rename(file, file + '.original'); await fs.symlink(file + '.original', file); }
    if (kind === 'escape') { job.manifestRef.path = '../unowned-manifest.json'; await atomicJson(join(context.directory, 'state.json'), state); }
    if (kind === 'header') { job.manifest.hypothesis = 'tampered scheduling header'; await atomicJson(join(context.directory, 'state.json'), state); }
    await assert.rejects(grantNext(context), error => ['SIDECAR_CHANGED', 'ENOENT', 'SYMLINK', 'PATH', 'MANIFEST_CHANGED'].includes(error.code));
    assert.equal((await readState(context)).jobs.history.attempts.length, 0);
    await assert.rejects(fs.access(join(context.directory, 'jobs/history/attempts')), { code: 'ENOENT' });
  }
});

test('migration rejects a changed legacy envelope without publishing a new state', async () => {
  const { context } = await setup();
  const before = await legacy(context), path = join(context.directory, 'jobs/history/manifest.json');
  const envelope = await readJson(path); envelope.manifest.hypothesis = 'changed'; await atomicJson(path, envelope);
  await assert.rejects(migrateState(context), { code: 'MANIFEST_CHANGED' });
  assert.equal(await hashFile(join(context.directory, 'state.json')), before.sha256);
});

test('real crash after fsynced temporary v2 bytes preserves v1 and leaves orphan terminal unqualified', async () => {
  const { context } = await setup(); await executeNext(context, { executor: 'migration-crash-test' });
  const before = await legacy(context, { orphan: true });
  const code = `import {openContext} from './qualification/devloop/state.mjs';import {migrateState} from './qualification/devloop/migration.mjs';const c=await openContext(${JSON.stringify(root)},{stateDirectory:${JSON.stringify(relative(root, context.directory))},testPolicy:${JSON.stringify(policy)}});await migrateState(c,{beforePublish:()=>process.kill(process.pid,'SIGKILL')});`;
  const child = spawn(process.execPath, ['--max-old-space-size=256', '--input-type=module', '-e', code], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = ''; child.stderr.on('data', data => { stderr += data; });
  const [exit, signal] = await once(child, 'exit');
  assert.equal(exit, null, stderr); assert.equal(signal, 'SIGKILL');
  assert.equal(await hashFile(join(context.directory, 'state.json')), before.sha256);
  const staged = (await fs.readdir(context.directory)).filter(name => name.startsWith('state.json.') && name.endsWith('.tmp'));
  assert.equal(staged.length, 1); assert.equal((await readJson(join(context.directory, staged[0]))).format, 'triplex-devloop-state/2');
  const migrationDirectories = await fs.readdir(join(context.directory, 'migrations'));
  assert.equal(migrationDirectories.length, 1);
  await assert.rejects(fs.access(join(context.directory, 'migrations', migrationDirectories[0], 'published.json')), { code: 'ENOENT' });
  await migrateState(context); // Reclaims only the dead lock, never a job reservation.
  const state = await readState(context);
  assert.equal(state.jobs.history.status, 'cleanup_unknown');
  assert.equal(state.jobs.history.attempts[0].terminalSha256, undefined);
  assert.equal(state.jobs.history.firstOutcome, undefined);
  await assert.rejects(verifyAttempt(context, 'history', '0001'), { code: 'TERMINAL_CHANGED' });
});
