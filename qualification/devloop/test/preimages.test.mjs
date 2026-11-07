import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { atomicJson, hashFile, readJson } from '../io.mjs';
import { openContext, readState, sidecarReference } from '../state.mjs';
import { enqueue, grantNext } from '../scheduler.mjs';
import { executeNext } from '../executor.mjs';
import { verifyAttempt } from '../evidence.mjs';
import { preserveInputPreimages, verifyInputPreimages } from '../preimages.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const policy = { format: 'triplex-devloop-policy/1', maximumHeavyTrials: 3, memoryPoolBytes: 512 * 1024 ** 2, cpuPoolUnits: 3, sampleMilliseconds: 30, terminationGraceMilliseconds: 150, maximumLogBytesPerAttempt: 32768, lanes: { 'duckdb-datalog': 'duckdb' }, promotion: {} };
async function setup() {
  const directory = await fs.mkdtemp(join(root, '.local/devloop-tests/preimages-'));
  const context = await openContext(root, { stateDirectory: relative(root, directory), testPolicy: policy });
  const source = join(directory, 'mutable-source.mjs'); await fs.writeFile(source, '// original declared source preimage\n');
  const pin = async (path, role) => ({ path: relative(root, path), role, sha256: await hashFile(path) });
  return { context, directory, source, pin, output: relative(root, join(directory, 'preimages.json')) };
}

test('copied content addresses deduplicate bytes and retain preimages after working-file mutation/deletion', async () => {
  const { context, directory, source, pin, output } = await setup();
  const secret = join(directory, 'access-token'); await fs.writeFile(secret, 'fixture-secret-must-never-be-copied');
  const dependency = join(directory, 'dependency.cache'); await fs.writeFile(dependency, 'cache-not-a-source-archive');
  const inputs = [await pin(source, 'source'), await pin(source, 'runner'), await pin(source, 'controller'), await pin(source, 'controller'), await pin(secret, 'credential-file'), await pin(dependency, 'dependency')];
  const reference = await preserveInputPreimages(context, inputs, output);
  const index = await readJson(join(root, reference.path));
  assert.equal(index.inputs.length, 3); assert.equal(index.inputs[0].object.path, index.inputs[1].object.path);
  assert.deepEqual(index.omittedRoles, { 'credential-file': 1, dependency: 1 });
  const object = join(root, index.inputs[0].object.path), before = await fs.readFile(object, 'utf8');
  assert.notEqual((await fs.stat(object)).ino, (await fs.stat(source)).ino);
  assert.equal((await fs.stat(object)).nlink, 1); assert.equal((await fs.stat(source)).nlink, 1);
  await fs.writeFile(source, '// changed after receipt\n'); await fs.unlink(source);
  assert.equal(await fs.readFile(object, 'utf8'), before);
  assert.equal((await verifyInputPreimages(context, reference)).uniqueObjects, 1);
});

test('tampered, symlinked and escaped preimages fail independent verification', async () => {
  for (const kind of ['bytes', 'missing', 'symlink', 'escape', 'index', 'omitted']) {
    const { context, source, pin, output } = await setup();
    const inputs = [await pin(source, 'source')];
    const reference = await preserveInputPreimages(context, inputs, output);
    const index = await readJson(join(root, reference.path)), object = join(root, index.inputs[0].object.path);
    let checked = reference;
    if (kind === 'bytes') { await fs.chmod(object, 0o600); await fs.writeFile(object, 'tampered\n'); }
    if (kind === 'missing') await fs.unlink(object);
    if (kind === 'symlink') { await fs.unlink(object); await fs.symlink(source, object); }
    if (kind === 'escape') { index.inputs[0].object.path = '../unowned'; await atomicJson(join(root, reference.path), index); checked = await sidecarReference(context, reference.path); }
    if (kind === 'index') await fs.appendFile(join(root, reference.path), '\n');
    if (kind === 'omitted') { index.inputs = []; await atomicJson(join(root, reference.path), index); checked = await sidecarReference(context, reference.path); }
    await assert.rejects(verifyInputPreimages(context, checked, { inputs }), error => ['PREIMAGE_CHANGED', 'ENOENT', 'SYMLINK', 'PREIMAGE_PATH', 'SIDECAR_CHANGED', 'PREIMAGE_COVERAGE'].includes(error.code));
  }
});

test('real future invocation binds reconstructible source/oracle/controller bytes and refuses a corrupted contract archive', async () => {
  const { context, source, pin } = await setup(), runner = join(root, 'qualification/devloop/fixtures/controller-child.mjs'), oracle = join(root, 'qualification/devloop/fixtures/controller.expected.json');
  const manifest = { format: 'triplex-devloop-job/1', id: 'source-history', kind: 'fixture', queryPath: 'duckdb-datalog', backend: 'duckdb', author: 'preimage-fixture', problemId: 'source-reconstruction', logicalTaskId: 'actual-source-archive', hypothesis: 'Retained byte preimages outlive a mutable working tree', goals: [6, 7], dependsOn: [], inspiration: [{ reference: 'wiki/problems/controller-state-growth.md', mechanism: 'Copy declared bytes by content hash', adaptation: 'Preserve current preimages without inventing old source snapshots' }], command: { argv: [process.execPath, runner, 'ok'], cwd: '.', env: {} }, resources: { heavy: true, memoryBytes: 256 * 1024 ** 2, cpuUnits: 1, diskBytes: 1024 ** 2, timeoutMilliseconds: 5000, maximumLogBytes: 8192 }, inputs: [await pin(source, 'source'), await pin(runner, 'runner'), await pin(oracle, 'oracle')], evidence: { checks: [{ key: 'actual', expectedInput: relative(root, oracle), actual: 'artifacts/answer.json' }], requiredCheckKeys: ['actual'] } };
  await enqueue(context, manifest); const result = await executeNext(context, { executor: 'preimage-test' });
  assert.equal(result.status, 'completed_verified_bytes');
  const verified = await verifyAttempt(context, manifest.id, '0001');
  assert.equal(verified.sourcePreimages.declared.files, 3);
  assert.ok(verified.sourcePreimages.invocation.files > 3);
  const inputRecord = await readJson(join(root, result.directory, 'inputs.json'));
  const index = await readJson(join(root, inputRecord.sourcePreimages.path));
  assert(index.inputs.some(entry => entry.role === 'controller' && entry.path.endsWith('preimages.mjs')));
  assert(index.inputs.some(entry => entry.role === 'oracle'));
  await fs.writeFile(source, '// changed after execution\n');
  assert.equal((await verifyAttempt(context, manifest.id, '0001')).sourcePreimages.invocation.status, 'DECLARED_PREIMAGE_BYTES_UNCHANGED');
  await assert.rejects(enqueue(context, { ...manifest, id: 'stale-source' }), { code: 'INPUT_CHANGED' });
  const second = { ...manifest, id: 'corrupt-contract', inputs: [await pin(source, 'source'), await pin(runner, 'runner'), await pin(oracle, 'oracle')] };
  await enqueue(context, second);
  const job = (await readState(context)).jobs[second.id], contract = await readJson(join(root, job.sourcePreimages.path)), object = join(root, contract.inputs.find(entry => entry.path === relative(root, source)).object.path);
  await fs.chmod(object, 0o600); await fs.writeFile(object, 'corrupted archive\n');
  await assert.rejects(grantNext(context, { onlyJob: second.id }), { code: 'PREIMAGE_CHANGED' });
  assert.equal((await readState(context)).jobs[second.id].attempts.length, 0);
});

test('source archive rejects credentials/cache relabeling, path escape and insufficient owned headroom', async () => {
  const { context, directory, source, pin, output } = await setup();
  const secret = join(directory, 'access-token'); await fs.writeFile(secret, 'fixture-secret');
  await assert.rejects(preserveInputPreimages(context, [await pin(secret, 'source')], output), { code: 'PREIMAGE_SECRET' });
  await assert.rejects(preserveInputPreimages(context, [{ path: '../unowned', role: 'source', sha256: '0'.repeat(64) }], output), { code: 'PATH' });
  const cache = join(directory, '.cache', 'file.mjs'); await fs.mkdir(join(directory, '.cache')); await fs.writeFile(cache, '// cache');
  await assert.rejects(preserveInputPreimages(context, [await pin(cache, 'source')], output), { code: 'PREIMAGE_CACHE' });
  context.storage.operationalMaximumBytes = 1; context.storage.ownedCountedBytes = 1;
  await assert.rejects(preserveInputPreimages(context, [await pin(source, 'source')], output), { code: 'STORAGE' });
  await assert.rejects(fs.access(join(context.directory, 'source-objects')), { code: 'ENOENT' });
});
