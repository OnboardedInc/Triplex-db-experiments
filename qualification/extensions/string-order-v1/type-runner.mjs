/** Strict noEmit against real public DTS; no generator or native entry. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { verifyAdmission } from '../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
import { canonical, safeError } from './probe-support.mjs';
const root = path.resolve(import.meta.dirname, '../../..');
try {
  const admission = await verifyAdmission(root, { backend: 'qlever' });
  assert.match(admission.grant.jobId, /^qlever-public-string-noemit-v[1-9][0-9]*$/);
  assert.equal(admission.grant.resources.memoryBytes, 1.5 * 1024 ** 3);
  assert.equal(admission.grant.resources.cpuUnits, 2);
  const compiler = realpathSync(createRequire(path.join(root, 'package.json')).resolve('typescript/bin/tsc'));
  assert(compiler.startsWith(root + path.sep));
  const result = spawnSync(process.execPath, ['--max-old-space-size=768', compiler, '--project', 'qualification/extensions/string-order-v1/noemit.tsconfig.json'], {
    cwd: root, env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=768' }, encoding: 'utf8', timeout: 90000, maxBuffer: 1024 ** 2,
  });
  for (const [name, value] of [['noemit.stdout', result.stdout], ['noemit.stderr', result.stderr]])
    writeFileSync(path.join(admission.artifacts, name), value ?? '', { flag: 'wx', mode: 0o600 });
  writeFileSync(path.join(admission.artifacts, 'compiler-outcome.json'), canonical({ status: result.status, signal: result.signal, compiler }) + '\n', { flag: 'wx', mode: 0o600 });
  assert.equal(result.status, 0); assert.equal(result.signal, null); assert.equal(result.stderr, ''); assert.equal(result.stdout, '');
  writeFileSync(path.join(admission.artifacts, 'checks.json'), canonical({ passed: true, strictNoEmit: true, nativeCalls: 0, generatedFiles: 0 }) + '\n', { flag: 'wx', mode: 0o600 });
} catch (error) { process.stderr.write(canonical(safeError(error)) + '\n'); process.exitCode = 1; }
