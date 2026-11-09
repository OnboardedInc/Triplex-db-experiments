// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Offline schema/descriptor/oracle gate. No backend factory is imported. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, owned, exclusiveJson, verifyAdmission, verifyPins } from '../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { verifyDependencyLock } from '../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/inputs.mjs';
const arg = name => process.argv[process.argv.indexOf(name) + 1];
const admission = await verifyAdmission(ROOT, { backend: 'xtdb', jobId: 'configured-entity-recipe-components-v1' });
const contract = JSON.parse(await readFile(await owned(ROOT, arg('--contract'))));
assert.equal(contract.mode, 'SEVEN_OFFLINE_SCHEMA_RECIPE_CONTROLS');
assert.equal(admission.job.manifest.requiredOwners.length, 0);
const lock = JSON.parse(await readFile(await owned(ROOT, contract.dependencies.path)));
await verifyDependencyLock(ROOT, lock); await verifyPins(ROOT, contract.guards);
const child = spawnSync(process.execPath, ['--max-old-space-size=256', '--test', '--test-isolation=none', '--test-concurrency=1', '--test-reporter=tap',
  path.join(import.meta.dirname, 'recipe.test.mjs')], { cwd: ROOT, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=256' },
  encoding: 'utf8', timeout: 90000, maxBuffer: 4 * 1024 ** 2 });
await writeFile(path.join(admission.artifacts, 'recipe.tap'), child.stdout ?? '', { flag: 'wx', mode: 0o600 });
await writeFile(path.join(admission.artifacts, 'recipe.stderr'), child.stderr ?? '', { flag: 'wx', mode: 0o600 });
await exclusiveJson(ROOT, path.join(admission.artifacts, 'child-outcome.json'), { status: child.status, signal: child.signal });
await verifyDependencyLock(ROOT, lock); await verifyPins(ROOT, contract.guards);
assert.equal(child.status, 0); assert.equal(child.signal, null);
for (const expr of [/# tests 7\n/, /# pass 7\n/, /# fail 0\n/, /# skipped 0\n/]) assert.match(child.stdout, expr);
await exclusiveJson(ROOT, path.join(admission.artifacts, 'checks.json'), {
  backendCalls: 0, cases: 7, configurationDerivedOnly: true, status: 'PASS_OFFLINE_RECIPE_ONLY',
});
