/** Proposed admitted pure oracle gate. No oracle/test import in this runner. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, flags, verifyAdmission, verifyPins, readJson, exclusiveJson } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { openContext, loadJobManifest } from '../../devloop/state.mjs';

flags();
const jobId = 'historical-assertion-metadata-oracle-v2-components-v1';
const admission = await verifyAdmission(ROOT, { backend: 'xtdb', jobId });
assert.deepEqual(admission.job.manifest.requiredOwners, []);
const contractPath = 'qualification/capacity/historical-assertion-metadata-v2/offline-v1/contract.json';
const manifest = await loadJobManifest(await openContext(ROOT), admission.job);
assert.equal(path.resolve(ROOT, manifest.command.argv[2]), path.join(import.meta.dirname, 'run.mjs'));
const contractPin = manifest.inputs.find(input => input.path === contractPath);
assert(contractPin);
const { size: contractBytes } = await import('node:fs/promises').then(fs => fs.stat(path.join(ROOT, contractPath)));
await verifyPins(ROOT, [{ ...contractPin, bytes: contractBytes }]);
const contract = await readJson(path.join(ROOT, contractPath));
assert.equal(contract.jobId, jobId);
assert.equal(contract.testNames.length, 9);
await verifyPins(ROOT, contract.guardInputs);
await exclusiveJson(ROOT, path.join(admission.artifacts, 'input-identity.json'), {
  node: process.version, execPath: process.execPath, flags: flags(),
  contractPath, sourceCheckpoint: contract.sourceCheckpoint,
  scope: 'FINITE_PURE_ORACLE_ONLY_NO_SDK_COMPILER_ENGINE_OR_HELPER_IMPLEMENTATION',
});
const result = spawnSync(process.execPath, [
  '--max-old-space-size=256', '--test', '--test-isolation=none',
  '--test-concurrency=1', '--test-reporter=tap',
  path.join(import.meta.dirname, 'oracle.test.mjs'),
], {
  cwd: ROOT, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=256' },
  encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 ** 2,
});
await writeFile(path.join(admission.artifacts, 'oracle.tap'), result.stdout ?? '', { flag: 'wx', mode: 0o600 });
await writeFile(path.join(admission.artifacts, 'oracle.stderr'), result.stderr ?? '', { flag: 'wx', mode: 0o600 });
await exclusiveJson(ROOT, path.join(admission.artifacts, 'child-outcome.json'), {
  status: result.status, signal: result.signal, errorCode: result.error?.code ?? null,
  childTimeoutMilliseconds: 60000, maximumCapturedOutputBytes: 2 * 1024 ** 2,
});
assert.equal(result.status, 0);
assert.equal(result.signal, null);
assert.equal(result.error, undefined);
assert.equal(result.stderr, '');
for (const [name, value] of [['tests', 9], ['pass', 9], ['fail', 0], ['cancelled', 0], ['skipped', 0], ['todo', 0]]) {
  assert.match(result.stdout, new RegExp(`^# ${name} ${value}$`, 'm'));
}
const passedNames = result.stdout.split('\n').filter(line => /^ok \d+ - /.test(line)).map(line => line.replace(/^ok \d+ - /, ''));
assert.deepEqual(passedNames, contract.testNames);
await verifyPins(ROOT, contract.guardInputs);
await exclusiveJson(ROOT, path.join(admission.artifacts, 'checks.json'), {
  status: 'PASS_FINITE_METADATA_ORACLE_ONLY', cases: 9, sdkCalls: 0,
  compilerInvocations: 0, backendCalls: 0, helperImplementations: 0,
});
