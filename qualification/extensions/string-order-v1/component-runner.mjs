/** Fake-only pure component gate. No public SDK, network or Docker imports. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { verifyAdmission } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { canonical, safeError } from './probe-support.mjs';
const root = path.resolve(import.meta.dirname, '../../..');
try {
  const admission = await verifyAdmission(root, { backend: 'qlever' });
  assert.match(admission.grant.jobId, /^qlever-public-string-components-v[1-9][0-9]*$/);
  assert.equal(admission.grant.resources.memoryBytes, 512 * 1024 ** 2);
  assert.equal(admission.grant.resources.cpuUnits, 1);
  const result = spawnSync(process.execPath, ['--max-old-space-size=128', '--test', '--test-isolation=none', '--test-concurrency=1', '--test-reporter=tap',
    'qualification/extensions/string-order-v1/probe-support.test.mjs'], {
    cwd: root, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=128' }, encoding: 'utf8', timeout: 30000, maxBuffer: 256 * 1024,
  });
  for (const [name, value] of [['components.tap', result.stdout], ['components.stderr', result.stderr]])
    writeFileSync(path.join(admission.artifacts, name), value ?? '', { flag: 'wx', mode: 0o600 });
  assert.equal(result.status, 0); assert.equal(result.signal, null); assert.equal(result.stderr, '');
  assert.match(result.stdout, /# tests 10\n/); assert.match(result.stdout, /# pass 10\n/); assert.match(result.stdout, /# fail 0\n/);
  writeFileSync(path.join(admission.artifacts, 'checks.json'), canonical({ passed: true, componentTests: 10, operationalCalls: 0 }) + '\n', { flag: 'wx', mode: 0o600 });
} catch (error) { process.stderr.write(canonical(safeError(error)) + '\n'); process.exitCode = 1; }
