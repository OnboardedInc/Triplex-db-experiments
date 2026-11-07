/** Measured diagnostic only: real public Triplex reads over the existing C++
 * owner, unchanged finite profile and an untouched already-admitted scope.
 * No optimization, fixture rewrite or application write is performed.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Cause, Effect, Exit } from 'effect';
import { Triples } from '@triplex-build/triplex';
import { Capabilities, DatabaseScope } from '@triplex-build/triplex/runtime';
import { makeDuckDBRuntime } from '@triplex-build/triplex-duckdb';
import { observePublicReadStages } from './public-read-stage-preload.mjs';

const root = resolve(import.meta.dirname, '../../..'), args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
const directory = process.env.TRIPLEX_RUN_DIRECTORY, artifacts = process.env.TRIPLEX_RUN_ARTIFACTS;
assert(directory?.startsWith(root + '/') && artifacts?.startsWith(directory + '/'));
const admission = JSON.parse(await readFile(process.env.TRIPLEX_RESOURCE_ADMISSION, 'utf8'));
assert.equal(admission.jobId, process.env.TRIPLEX_DEVLOOP_JOB_ID); assert.equal(admission.state, 'ADMITTED');
assert.equal(admission.backend, 'duckdb'); assert.equal(admission.resources.memoryBytes, 2 * 1024 ** 3); assert.equal(admission.resources.cpuUnits, 2); assert.equal(admission.resources.timeoutMilliseconds, 120000);
const fixture = JSON.parse(await readFile(resolve(root, option('--fixture')), 'utf8'));
const spec = JSON.parse(await readFile(resolve(root, option('--spec')), 'utf8'));
const seed = fixture.instances.find(instance => instance.index === 1);
assert(seed && seed.baselinePosition === 2 && seed.recordedAt === 1000.25);
assert.equal(spec.entities, 1000); assert.equal(spec.factsPerEntity, 1);
const parts = JSON.parse(seed.scope), scope = DatabaseScope.make({ env: parts[1], tenant: parts[2], database: parts[3], generation: parts[4] });
assert.equal(scope, seed.scope);
const report = { format: 'triplex-duckdb-public-stage-diagnostic/1', status: 'RUNNING', applicationWrites: 0, baseline: seed, profile: { threads: 1, memoryLimitBytes: 128000000, spillLimitBytes: 64000000, requestDeadlineMs: 30000 }, requests: [], cancellation: null, limitations: ['Instrumented diagnostic, not production goodput/capacity or a default change.', 'Port spans include driver/scheduler work; only labelled existing C++ metrics are direct native measurements.'] };
const save = async () => writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2) + '\n');
let cancelIssued = false;
const abort = new AbortController();
const stage = observePublicReadStages(join(artifacts, 'stages.jsonl'), { maximumBytes: 16 * 1024 ** 2, onQueue: observed => {
  if (observed.requestId !== 'burst-15-cancel' || cancelIssued) return;
  cancelIssued = true;
  report.cancellation = { ...observed, requested: true, classification: observed.queuedBehindAcceptedWork ? 'QUEUED_BEHIND_ACCEPTED_WORK' : 'ALREADY_ACTIVE_OR_NO_QUEUE_OBSERVED' };
  stage.mark('explicit-cancel-request', report.cancellation);
  abort.abort(); // Only this logical request's Effect; never another active port.
} });
try {
  const runtime = await makeDuckDBRuntime({ databaseDirectory: resolve(root, option('--database-directory')), threads: 1, memoryLimit: '128MB', maxTempDirectorySize: '64MB', queryTimeoutMs: 30000 });
  await Effect.runPromise(Effect.gen(function* () {
    const triples = yield* Triples;
    yield* Effect.tryPromise(async () => {
      report.positionBefore = await Effect.runPromise(triples.currentPosition()); assert.equal(report.positionBefore, 2);
      const read = async (id, index, historical, signal) => stage.withRequest(id, async () => {
        const started = performance.now(); stage.mark('public-read-start', { requestId: id, index, historical });
        const result = await Effect.runPromiseExit(triples.queryAll({ find: ['?name'], where: [[`${spec.id}:entity:${index}`, ':load/name', '?name']] }, { basis: { validAt: 1.25, ...(historical ? { recordedAt: seed.recordedAt } : {}) }, includeBasis: true }).pipe(Effect.timeout(30000)), signal ? { signal } : undefined);
        const elapsedMs = performance.now() - started;
        if (Exit.isFailure(result)) {
          stage.mark('public-read-failed', { requestId: id, elapsedMs, interruptedOnly: Cause.hasInterruptsOnly(result.cause) });
          assert.equal(id, 'burst-15-cancel', Cause.pretty(result.cause)); assert(signal?.aborted && Cause.hasInterruptsOnly(result.cause));
          const observed = { id, status: 'EXPECTED_CANCELLATION', elapsedMs }; report.requests.push(observed); return observed;
        }
        assert.notEqual(id, 'burst-15-cancel', 'Explicitly cancelled request completed before cancellation was observed');
        assert.deepEqual(result.value.results.map(row => row['?name']), [`${spec.id}:name:${index}:v0`]);
        assert.equal(result.value.basis.scope, scope); assert.equal(result.value.basis.recordedPosition, 2); assert.equal(result.value.basis.validAt, 1.25); assert.equal(result.value.basis.recordedAt, historical ? seed.recordedAt : undefined);
        const observed = { id, status: 'ANSWER_VERIFIED', elapsedMs, rows: result.value.results, basis: result.value.basis }; report.requests.push(observed); stage.mark('public-read-return', { requestId: id, elapsedMs }); return observed;
      });
      await read('sequential-current', 0, false); await read('sequential-history', 0, true);
      const outcomes = await Promise.allSettled(Array.from({ length: 16 }, (_, index) => read(index === 15 ? 'burst-15-cancel' : `burst-${index}`, index, index % 2 === 1, index === 15 ? abort.signal : undefined)));
      for (const outcome of outcomes) if (outcome.status === 'rejected') throw outcome.reason;
      report.logicalReadSettledAtMs = performance.now();
      stage.mark('logical-read-batch-settled');
      report.positionAfter = await Effect.runPromise(triples.currentPosition()); assert.equal(report.positionAfter, 2);
      stage.mark('final-position-acknowledged', { position: report.positionAfter });
      report.finalPositionAcknowledgedAtMs = performance.now();
      report.stageBeforeScopeRelease = stage.snapshot();
      assert.equal(report.stageBeforeScopeRelease.backends.length, 1, 'Observers must see the actual shared backend');
      assert.equal(report.stageBeforeScopeRelease.ports.length, 1, 'Observers must see the actual loaded port module');
      assert(report.stageBeforeScopeRelease.backends.every(backend => backend.pendingTransactions === 0));
      assert.equal(report.stageBeforeScopeRelease.dropped, 0);
      assert.equal(report.requests.filter(request => request.status === 'ANSWER_VERIFIED').length, 17);
      assert.equal(report.requests.filter(request => request.status === 'EXPECTED_CANCELLATION').length, 1);
      assert.equal(report.cancellation?.classification, 'QUEUED_BEHIND_ACCEPTED_WORK', 'Queued cancellation not observed; retain as inconclusive');
    });
  }).pipe(Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })), Effect.scoped));
  report.status = 'PASS_DIAGNOSTIC_ORACLES_ONLY';
  const checks = { format: 'triplex-duckdb-public-stage-checks/1', positionBefore: 2, positionAfter: 2, verifiedAnswers: 17, expectedCancellations: 1, queuedCancellationObserved: true, applicationWrites: 0, stageLogWithin16MiB: true };
  await writeFile(join(artifacts, 'checks.json'), JSON.stringify(checks, null, 2) + '\n', { flag: 'wx' });
} catch (error) { report.status = 'FAILED_OR_INCONCLUSIVE_DIAGNOSTIC'; report.error = error?.stack ?? String(error); process.exitCode = 1; }
finally { report.stageAfterScopeRelease = stage.snapshot(); await save(); stage.close(); }
