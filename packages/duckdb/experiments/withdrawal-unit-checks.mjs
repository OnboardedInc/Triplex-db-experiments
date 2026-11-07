import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

// Actual Node test outcomes form this component receipt. No native correctness,
// cancellation qualification or performance result is inferred from fake ports.
const artifacts = process.env.TRIPLEX_RUN_ARTIFACTS;
assert(artifacts, 'Run through the owned controller');
const result = spawnSync(process.execPath, [
  '--test', '--test-reporter=tap',
  'packages/duckdb/test/queue-withdrawal.test.mjs',
  'packages/duckdb/test/observer-admission.test.mjs',
], { encoding: 'utf8', env: process.env, maxBuffer: 4 * 1024 ** 2 });
writeFileSync(path.join(artifacts, 'unit.tap'), result.stdout ?? '');
writeFileSync(path.join(artifacts, 'unit.stderr'), result.stderr ?? '');
const tests = [...(result.stdout ?? '').matchAll(/^ok \d+ - (.+)$/gm)].map(x => x[1]).sort();
const passed = result.status === 0 && /# fail 0\b/.test(result.stdout ?? '') &&
  !/# (?:skip|todo)/i.test((result.stdout ?? '').split('\n').filter(x => /^ok |^not ok /.test(x)).join('\n'));
writeFileSync(path.join(artifacts, 'result.json'), JSON.stringify({
  format: 'triplex-duckdb-withdrawal-unit-checks/1',
  status: passed ? 'PASS' : 'FAIL',
  testCount: tests.length,
  tests,
}, null, 2) + '\n');
if (!passed) throw new Error(`Withdrawal component tests failed: exit=${result.status}, signal=${result.signal}`);
