/** Current installed bytes are checked before/after the public SDK entry.
 * Reuses the independently reviewed recursive collector; no install, native
 * selector, second runtime or broad query wrapper is introduced here.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { owned, verifyAdmission, verifyPins, exclusiveJson } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { verifyDependencyLock } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs';
import { safeError, sha } from './probe-support.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const value = name => process.argv[process.argv.indexOf(name) + 1];
let admission;
try {
  assert(process.argv.includes('--contract'));
  const file = await owned(root, value('--contract'));
  const contract = JSON.parse(await readFile(file, 'utf8'));
  admission = await verifyAdmission(root, { backend: 'qlever', jobId: contract.jobId });
  assert(admission.job.manifest.requiredOwners.includes('foundation-qlever'));
  const lockFile = await owned(root, contract.dependencyLock.path);
  const lockBytes = await readFile(lockFile);
  assert.equal(sha(lockBytes), contract.dependencyLock.sha256);
  const lock = JSON.parse(lockBytes);
  const guardsFile = await owned(root, contract.guardPins.path);
  const guardsBytes = await readFile(guardsFile);
  assert.equal(sha(guardsBytes), contract.guardPins.sha256);
  const guards = JSON.parse(guardsBytes);
  await verifyDependencyLock(root, lock);
  await verifyPins(root, guards);
  let completed = false, finalError;
  try {
    // Node24's built-in TypeScript stripping loads the actual public package
    // exports. Runtime dependency resolution uses the checked installed layout.
    await import(pathToFileURL(path.join(root, 'packages/qlever/experiments/string-order-probe.ts')).href);
    completed = process.exitCode === undefined || process.exitCode === 0;
  } finally {
    try { await verifyDependencyLock(root, lock); await verifyPins(root, guards); }
    catch (error) { finalError = safeError(error); process.exitCode = 1; }
    await exclusiveJson(root, path.join(admission.artifacts, 'input-identity.json'), {
      status: completed && !finalError ? 'BEFORE_AND_AFTER_IDENTICAL' : 'FAILED_OR_PARTIAL',
      dependencySha256: lock.dependencySha256, guardPinCount: guards.length,
      installedLayoutOnly: true, copiedImmutableRuntimeClaimed: false,
      ...(finalError ? { error: finalError } : {}),
    });
  }
} catch (error) {
  process.exitCode = 1;
  const safe = safeError(error);
  if (admission) await exclusiveJson(root, path.join(admission.artifacts, 'runner-failure.json'), safe);
  process.stderr.write(JSON.stringify(safe) + '\n');
}
