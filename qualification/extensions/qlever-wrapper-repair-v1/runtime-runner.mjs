/** Exact private SDK entry, authenticated manifest and installed-byte checks.
 * No loader, installation, compiler or service administration lives here.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { owned, verifyAdmission, verifyPins, exclusiveJson } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { openContext, loadJobManifest } from '../../devloop/state.mjs';
import { verifyDependencyLock } from '../../../.artifacts/read-basis-core-build-v1/compiler-inputs.mjs';
import { safeError, sha } from '../string-order-v1/probe-support.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
let admission;
try {
  const at = process.argv.indexOf('--contract'); assert(at >= 2, 'FROZEN_CONTRACT_REQUIRED');
  const contractPath = await owned(root, process.argv[at + 1]);
  const contractBytes = await readFile(contractPath), contract = JSON.parse(contractBytes);
  assert(['PUBLIC_Q_WRAPPER_LOWERCASE_PRIVATE_SDK', 'PUBLIC_QLEVER_STRING_EXTENSION_BOTH'].includes(contract.mode));
  assert.match(contract.jobId, /^qlever-wrapper-(?:lowercase|mixed)-v[1-9][0-9]*$/);
  admission = await verifyAdmission(root, { backend: 'qlever', jobId: contract.jobId });
  const context = await openContext(root);
  const manifest = await loadJobManifest(context, admission.job);
  assert.equal(manifest.inputs.find(row => row.path === path.relative(root, contractPath))?.sha256, sha(contractBytes), 'CONTRACT_NOT_IN_FROZEN_MANIFEST');
  assert.deepEqual(manifest.requiredOwners, ['foundation-qlever']);
  const entry = contract.appEntry;
  assert(entry.path.startsWith(contract.sdkBuild.packageRoot + '/probes/'), 'PRIVATE_APPLICATION_OWNERSHIP');
  assert.equal(manifest.inputs.find(row => row.path === entry.path)?.sha256, entry.sha256, 'APPLICATION_NOT_IN_FROZEN_MANIFEST');
  await verifyPins(root, [entry]);
  const lockBytes = await readFile(await owned(root, contract.dependencyLock.path));
  assert.equal(sha(lockBytes), contract.dependencyLock.sha256);
  const lock = JSON.parse(lockBytes);
  const guardBytes = await readFile(await owned(root, contract.guardPins.path));
  assert.equal(sha(guardBytes), contract.guardPins.sha256);
  const guards = JSON.parse(guardBytes);
  await verifyDependencyLock(root, lock); await verifyPins(root, guards);
  let completed = false, finalError;
  try {
    process.env.TRIPLEX_QUALIFICATION_ROOT = root;
    await import(pathToFileURL(await owned(root, entry.path)).href);
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
