// @ts-nocheck -- [EXP-CHECKJS] runtime-built or optional package modules absent from this standalone project; runtime-populated records, optional option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Canonical fake-only helper controls; does not import either SDK worker. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { verifyAdmission, exclusiveJson } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
const root = path.resolve(import.meta.dirname, '../../..');
const admission = await verifyAdmission(root, { backend: 'qlever', jobId: 'qlever-wrapper-runtime-components-v1' });
assert.equal(admission.grant.resources.memoryBytes, 512 * 1024 ** 2);
assert.equal(admission.grant.resources.cpuUnits, 1);
const result = spawnSync(process.execPath, ['--max-old-space-size=128', '--test', 'qualification/extensions/string-order-v1/probe-support.test.mjs', 'qualification/extensions/qlever-wrapper-repair-v1/lowercase-support.test.mjs'], {
  cwd: root, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=128' }, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 ** 2,
});
await writeFile(path.join(admission.artifacts, 'components.tap'), result.stdout ?? '', { flag: 'wx', mode: 0o600 });
await writeFile(path.join(admission.artifacts, 'components.stderr'), result.stderr ?? '', { flag: 'wx', mode: 0o600 });
await exclusiveJson(root, path.join(admission.artifacts, 'process.json'), { status: result.status, signal: result.signal, errorCode: result.error?.code ?? null });
assert.equal(result.status, 0); assert.equal(result.signal, null); assert.equal(result.stderr, '');
assert.match(result.stdout, /# pass 16\b/); assert.match(result.stdout, /# fail 0\b/);
await exclusiveJson(root, path.join(admission.artifacts, 'checks.json'), { passed: true, componentTests: 16, workerImports: 0, operationalCalls: 0 });
