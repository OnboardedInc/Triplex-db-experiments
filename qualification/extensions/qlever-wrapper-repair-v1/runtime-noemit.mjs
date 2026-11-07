/** Public-DTS-only validation; no generation, SDK worker or native evaluation. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { owned, verifyAdmission, verifyPins, exclusiveJson } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { verifyDependencyLock } from '../../../.artifacts/read-basis-core-build-v1/compiler-inputs.mjs';
import { safeError, sha } from '../string-order-v1/probe-support.mjs';
const root = path.resolve(import.meta.dirname, '../../..');
let admission;
try {
  const at = process.argv.indexOf('--contract'); assert(at >= 2);
  const contract = JSON.parse(await readFile(await owned(root, process.argv[at + 1])));
  admission = await verifyAdmission(root, { backend: 'qlever', jobId: 'qlever-wrapper-runtime-noemit-v1' });
  assert.equal(admission.grant.resources.memoryBytes, 1.5 * 1024 ** 3); assert.equal(admission.grant.resources.cpuUnits, 2);
  const lockBytes = await readFile(await owned(root, contract.dependencyLock.path)); assert.equal(sha(lockBytes), contract.dependencyLock.sha256);
  const guardsBytes = await readFile(await owned(root, contract.guardPins.path)); assert.equal(sha(guardsBytes), contract.guardPins.sha256);
  const lock = JSON.parse(lockBytes), guards = JSON.parse(guardsBytes);
  await verifyDependencyLock(root, lock); await verifyPins(root, guards);
  const compiler = await realpath(createRequire(path.join(root, 'package.json')).resolve('typescript/bin/tsc'));
  assert(compiler.startsWith(root + path.sep));
  const typeProject = await owned(root, contract.typeProject);
  const result = spawnSync(process.execPath, ['--max-old-space-size=768', compiler, '--project', typeProject], {
    cwd: root, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=768' }, encoding: 'utf8', timeout: 90000, maxBuffer: 1024 ** 2,
  });
  for (const [name, value] of [['noemit.stdout', result.stdout], ['noemit.stderr', result.stderr]]) await writeFile(path.join(admission.artifacts, name), value ?? '', { flag: 'wx', mode: 0o600 });
  await exclusiveJson(root, path.join(admission.artifacts, 'process.json'), { status: result.status, signal: result.signal, errorCode: result.error?.code ?? null });
  await verifyDependencyLock(root, lock); await verifyPins(root, guards);
  assert.equal(result.status, 0); assert.equal(result.signal, null); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
  await exclusiveJson(root, path.join(admission.artifacts, 'checks.json'), { passed: true, strictNoEmit: true, workerImports: 0, nativeCalls: 0, generatedFiles: 0 });
} catch (error) {
  process.exitCode = 1; const safe = safeError(error);
  if (admission) await exclusiveJson(root, path.join(admission.artifacts, 'failure.json'), safe);
  process.stderr.write(JSON.stringify(safe) + '\n');
}
