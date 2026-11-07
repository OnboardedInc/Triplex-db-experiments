/** Independent critical-fix review: real children, isolated component state. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { openContext, snapshot } from '../devloop/state.mjs';
import { atomicJson, hashFile, readJson, sleep } from '../devloop/io.mjs';
import { enqueue, grantNext, requestCancel, reservations, cleanupAttempt } from '../devloop/scheduler.mjs';
import { executeNext, groupSnapshot, ownedEnvironment } from '../devloop/executor.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';
import { checkReadOracle, requireUniqueReferences } from '../devloop/compare.mjs';

const root = resolve(import.meta.dirname, '../..');
const id = randomUUID();
const directory = join(root, '.artifacts/devloop-independent-review', id);
await fs.mkdir(directory, { recursive: true });
const runner = join(directory, 'child.mjs');
const oracle = join(directory, 'oracle.json');
await fs.writeFile(runner, `import{writeFile}from'node:fs/promises';import{join}from'node:path';const out=process.env.TRIPLEX_RUN_ARTIFACTS;await writeFile(join(out,'started.json'),JSON.stringify({pid:process.pid}));if(process.argv[2]==='hold')setInterval(()=>{},1000);else await writeFile(join(out,'answer.json'),process.argv[2]==='bad'?'bad\\n':'good\\n');\n`, { flag: 'wx' });
await fs.writeFile(oracle, 'good\n', { flag: 'wx' });
const policy = { format: 'triplex-devloop-policy/1', maximumHeavyTrials: 3, memoryPoolBytes: 768 * 1024 ** 2, cpuPoolUnits: 3, sampleMilliseconds: 40, terminationGraceMilliseconds: 200, maximumLogBytesPerAttempt: 8192, memorySupervision: 'Independent component trial: sampled owned process groups; no physical Mac memory cap', lanes: { 'qlever-native': 'qlever' }, promotion: {} };
const ctx = await openContext(root, { stateDirectory: relative(root, join(directory, 'state')), testPolicy: policy });
const report = { format: 'triplex-independent-controller-review/1', id, reviewer: 'qlever-agent', controllerAuthor: 'duckdb-agent', status: 'RUNNING', startedUtc: new Date().toISOString(), diagnosticProfile: { id: 'controller-verification-cpu9-v1', aggregateCpuReservation: 8.5, aggregatePool: 9, productionPoolUnchanged: 8, maximumSeconds: 60 }, checks: [], limitations: ['Component controller proof uses a 768MiB subreservation inside Qnative-001; engine semantics/performance are not implied.', 'Mac memory is sampled and terminated; it is not an allocator hard limit.'] };
const output = join(directory, 'review.json');
const save = () => atomicJson(output, report);
await save();
const check = async (name, run) => { try { const result = await run(); report.checks.push({ name, status: 'PASS', result }); } catch (cause) { report.checks.push({ name, status: 'FAIL', error: String(cause), stack: cause.stack }); await save(); throw cause; } await save(); };
const command = async (jobId, mode = 'hold') => ({ format: 'triplex-devloop-job/1', id: jobId, kind: 'fixture', queryPath: 'qlever-native', backend: 'qlever', author: 'qlever-independent-reviewer', logicalTaskId: 'independent-controller-critical-fixes', problemId: 'controller-integrity', hypothesis: 'The repaired controller admits three owned invocations and refuses false acceptance and tampered evidence', goals: [6, 7], dependsOn: [], inspiration: [{ reference: 'qualification/devloop/test/controller.test.mjs', mechanism: 'Actual owned argv lifecycle', adaptation: 'Independently authored children and fixtures, concurrent execution plus retained adversarial mutations' }], command: { argv: [process.execPath, runner, mode], cwd: '.', env: {} }, resources: { heavy: true, memoryBytes: 256 * 1024 ** 2, cpuUnits: 1, diskBytes: 1024 * 1024, timeoutMilliseconds: 10000, maximumLogBytes: 8192 }, inputs: await Promise.all([['qualification/devloop/executor.mjs', 'source'], [relative(root, runner), 'runner'], [relative(root, oracle), 'oracle']].map(async ([path, role]) => ({ path, role, sha256: await hashFile(join(root, path)) }))), evidence: { checks: [{ key: 'independent-answer-bytes', expectedInput: relative(root, oracle), actual: 'artifacts/answer.json' }], requiredCheckKeys: ['independent-answer-bytes'] }, retention: { scratch: 'rebuildable-ephemeral-only' } });
try {
  await check('three-real-concurrent-argv-invocations-and-bounded-cancel', async () => {
    for (const job of ['parallel-a', 'parallel-b', 'parallel-c', 'parallel-d']) await enqueue(ctx, await command(job));
    const active = [executeNext(ctx), executeNext(ctx), executeNext(ctx)];
    let observed;
    for (let i = 0; i < 150; i++) {
      const state = await snapshot(ctx);
      const running = Object.values(state.jobs).filter(job => job.status === 'running');
      if (running.length === 3) {
        const starts = await Promise.all(running.map(async job => { try { return await readJson(join(root, job.attempts.at(-1).directory, 'artifacts/started.json')); } catch { return null; } }));
        if (starts.every(Boolean)) { observed = { childPids: starts.map(start => start.pid), reservations: reservations(state) }; break; }
      }
      await sleep(20);
    }
    assert.ok(observed, 'Three separately spawned argv children were never simultaneously observed');
    assert.equal(new Set(observed.childPids).size, 3);
    await assert.rejects(grantNext(ctx), { code: 'NO_ADMISSION' });
    const state = await snapshot(ctx);
    for (const job of Object.values(state.jobs).filter(job => job.status === 'running')) await requestCancel(ctx, job.manifest.id, 'Independent concurrent active cancellation');
    const outcomes = await Promise.all(active);
    for (const outcome of outcomes) { assert.equal(outcome.status, 'canceled'); assert.equal(outcome.cleanup.groupGone, true); }
    for (const job of Object.values((await snapshot(ctx)).jobs).filter(job => job.attempts.length)) assert.equal((await groupSnapshot(job.attempts.at(-1).worker.pgid)).processes.length, 0);
    await requestCancel(ctx, 'parallel-d', 'No pending test process');
    assert.equal(reservations(await snapshot(ctx)).heavy, 0);
    return { ...observed, statuses: outcomes.map(value => value.status), allOwnedGroupsGone: true };
  });
  await check('exit-zero-cannot-pass-wrong-oracle-bytes', async () => {
    await enqueue(ctx, await command('wrong', 'bad'));
    const result = await executeNext(ctx); assert.equal(result.commandOutcome.code, 0); assert.equal(result.status, 'failed_oracle');
    return { status: result.status, exitCode: result.commandOutcome.code };
  });
  await check('dirty-source-hash-refused', async () => {
    const spec = await command('dirty', 'ok'); spec.inputs[0].sha256 = '0'.repeat(64);
    await assert.rejects(enqueue(ctx, spec), { code: 'INPUT_CHANGED' });
  });
  await check('owned-private-docker-environment-and-override-refusal', async () => {
    const env = await ownedEnvironment(ctx);
    assert.equal(env.DOCKER_HOST, `unix://${root}/.runtime/colima/triplex/docker.sock`);
    for (const key of ['COLIMA_HOME', 'LIMA_HOME', 'DOCKER_CONFIG', 'BUILDX_CONFIG']) assert.ok(env[key].startsWith(root + '/'));
    await assert.rejects(ownedEnvironment(ctx, { DOCKER_HOST: 'unix:///var/run/docker.sock' }), { code: 'PRIVATE_DOCKER' });
    return Object.fromEntries(['DOCKER_HOST', 'DOCKER_CONFIG'].map(key => [key, env[key]]));
  });
  await check('duplicate-calibration-and-wrong-task-cut-params-result-refused', async () => {
    assert.throws(() => requireUniqueReferences(['a/0001', 'a/0001', 'a/0001']), { code: 'REPEATS' });
    const expected = { taskClass: 'lookup', logicalTaskId: 'people/lookup', paramsSha256: '1'.repeat(64), basis: { knownPosition: '4', validAt: 1.25 }, expectedSha256: '2'.repeat(64) };
    const catalog = { entries: { a: expected } }; const read = { ...expected, oracleKey: 'a', knownPosition: '4', resultSha256: expected.expectedSha256 };
    checkReadOracle(catalog, read);
    for (const delta of [{ logicalTaskId: 'other' }, { paramsSha256: '3'.repeat(64) }, { basis: { knownPosition: '5', validAt: 1.25 }, knownPosition: '5' }, { resultSha256: '3'.repeat(64), expectedSha256: '3'.repeat(64) }]) assert.throws(() => checkReadOracle(catalog, { ...read, ...delta }), { code: 'READ_ORACLE' });
  });
  await check('symlink-cleanup-refusal-and-terminal-hash-anchor', async () => {
    await enqueue(ctx, await command('good', 'ok')); const result = await executeNext(ctx); assert.equal(result.status, 'completed_verified_bytes');
    await verifyAttempt(ctx, 'good', '0001');
    const attempt = join(root, result.directory); const link = join(attempt, 'scratch/escape');
    await fs.symlink(oracle, link); await assert.rejects(cleanupAttempt(ctx, 'good', '0001'), { code: 'SYMLINK' }); await fs.unlink(link);
    await cleanupAttempt(ctx, 'good', '0001'); assert.equal((await readJson(join(attempt, 'terminal.json'))).status, 'completed_verified_bytes');
    const actual = join(attempt, 'artifacts/answer.json'); await fs.writeFile(actual, 'edited\n');
    const terminal = await readJson(join(attempt, 'terminal.json')); terminal.outputs.find(file => file.path === 'artifacts/answer.json').sha256 = await hashFile(actual); await atomicJson(join(attempt, 'terminal.json'), terminal);
    await assert.rejects(verifyAttempt(ctx, 'good', '0001'), { code: 'TERMINAL_CHANGED' });
    return { tamperedFixtureRetained: relative(root, attempt) };
  });
  report.status = 'PASS_COMPONENT_ONLY';
} catch (cause) { report.status = 'FAIL_RETAINED'; report.error = String(cause); process.exitCode = 1; }
finally { report.finishedUtc = new Date().toISOString(); await save(); console.log(JSON.stringify({ output, status: report.status, checks: report.checks.length })); }
