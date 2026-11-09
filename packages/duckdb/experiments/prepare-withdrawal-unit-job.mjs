// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..'), id = process.argv[2];
assert(/^[a-z0-9][a-z0-9-]*$/.test(id ?? ''));
const captured = spawnSync(process.execPath, ['packages/duckdb/experiments/prepare-sdk-job.mjs', `${id}-input-capture`, 'sdk'], {
  cwd: root, encoding: 'utf8', env: process.env,
});
assert.equal(captured.status, 0, captured.stderr);
const manifest = JSON.parse(await readFile(path.join(root, '.runtime/duckdb', `${id}-input-capture.json`)));
const files = [
  'packages/duckdb/test/queue-withdrawal.test.mjs',
  'packages/duckdb/test/observer-admission.test.mjs',
];
const tests = [];
for (const file of files) tests.push(...[...(await readFile(path.join(root, file), 'utf8')).matchAll(/test\('([^']+)'/g)].map(x => x[1]));
assert.equal(tests.length, 13);
const expectedPath = `.runtime/duckdb/${id}.expected.json`;
await writeFile(path.join(root, expectedPath), JSON.stringify({
  format: 'triplex-duckdb-withdrawal-unit-checks/1', status: 'PASS', testCount: tests.length, tests: tests.sort(),
}, null, 2) + '\n', { flag: 'wx' });
const additions = [
  ...files.map(file => [file, 'source']),
  ['packages/duckdb/experiments/withdrawal-unit-checks.mjs', 'runner'],
  ['packages/duckdb/experiments/prepare-withdrawal-unit-job.mjs', 'recipe'],
  ['packages/duckdb/experiments/public-read-stage-preload.mjs', 'runner'],
  ['qualification/devloop/DUCKDB-WITHDRAWAL.md', 'recipe'],
  ['qualification/devloop/recipes/duckdb-withdrawal-oracle.json', 'oracle'],
  [expectedPath, 'oracle'],
  [path.relative(root, process.execPath), 'dependency'],
];
for (const [file, role] of additions) {
  const bytes = await readFile(path.join(root, file));
  manifest.inputs.push({ path: file, role, sha256: createHash('sha256').update(bytes).digest('hex') });
}
Object.assign(manifest, {
  id, problemId: 'duckdb-cancelled-queued-physical-work', logicalTaskId: 'component-queue-acquisition-and-owner-lifecycle',
  hypothesis: 'Queued read withdrawal preserves live FIFO, original-fiber acquired-race ACK handling and unchanged write/foreign behavior; component ports do not qualify native cancellation',
  command: { argv: [process.execPath, 'packages/duckdb/experiments/withdrawal-unit-checks.mjs'], cwd: '.', env: { NODE_OPTIONS: '--max-old-space-size=768' } },
  resources: { heavy: true, memoryBytes: 1610612736, cpuUnits: 2, diskBytes: 33554432, timeoutMilliseconds: 120000, maximumLogBytes: 4194304 },
  evidence: { checks: [{ key: 'withdrawal-component-tests', expectedInput: expectedPath, actual: 'artifacts/result.json' }], requiredCheckKeys: ['withdrawal-component-tests'] },
  retention: { scratch: 'rebuildable-ephemeral-only', meaning: 'Keep component TAP/results/source preimages; no native backend opened' },
});
const output = path.join(root, '.runtime/duckdb', `${id}.json`);
await writeFile(output, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: path.relative(root, output), inputs: manifest.inputs.length, tests: 13, status: 'PREPARED_COMPONENT_NOT_EXECUTED' }));
