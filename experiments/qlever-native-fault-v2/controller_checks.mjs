import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Controller components only: no native engine/container/mount/fault operation.
// Expected names are frozen before execution. Actual Node assertions must all
// pass; exit zero or a self-authored passed field alone is insufficient.
const artifacts = process.env.TRIPLEX_RUN_ARTIFACTS;
assert(artifacts, 'Use canonical resource admission');
const files = [
  'qualification/devloop/test/controller.test.mjs',
  'qualification/devloop/test/integrity.test.mjs',
  'qualification/devloop/test/migration.test.mjs',
  'qualification/devloop/test/preimages.test.mjs',
  'qualification/devloop/test/prepared-stopped.test.mjs',
];
const result = spawnSync(process.execPath, [
  '--max-old-space-size=256', '--test', '--test-concurrency=1', '--test-reporter=tap', ...files,
], { encoding: 'utf8', env: process.env, timeout: 120000, maxBuffer: 8 * 1024 ** 2 });
writeFileSync(join(artifacts, 'controller.tap'), result.stdout ?? '', { flag: 'wx' });
writeFileSync(join(artifacts, 'controller.stderr'), result.stderr ?? '', { flag: 'wx' });
const stdout = result.stdout ?? '';
const names = [...stdout.matchAll(/^ok \d+ - (.+)$/gm)].map(match => match[1]).sort();
const passed = result.status === 0 && /# fail 0\b/.test(stdout) &&
  /# skipped 0\b/.test(stdout) && /# todo 0\b/.test(stdout) &&
  !/^not ok /m.test(stdout) && names.length === 42;
writeFileSync(join(artifacts, 'result.json'), JSON.stringify({
  format: 'triplex-controller-prepared-stopped-components/1',
  status: passed ? 'PASS' : 'FAIL', tests: names.length, names,
  scope: 'CONTROLLER_COMPONENTS_ONLY_NO_NATIVE_ACTION',
}, null, 2) + '\n', { flag: 'wx' });
if (!passed) throw new Error('Controller components failed or incomplete; retain TAP and stderr');
