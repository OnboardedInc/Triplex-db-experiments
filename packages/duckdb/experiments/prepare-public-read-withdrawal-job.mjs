import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..'), id = process.argv[2];
assert(/^[a-z0-9][a-z0-9-]*$/.test(id ?? ''));
const captureId = `${id}-input-capture`;
const prepared = spawnSync(process.execPath, ['packages/duckdb/experiments/prepare-public-read-stage-job.mjs', captureId], {
  cwd: root, env: process.env, encoding: 'utf8',
});
assert.equal(prepared.status, 0, prepared.stderr);
const directory = `qualification/native-jobs/${captureId}`;
const manifest = JSON.parse(await readFile(path.join(root, directory, 'manifest.json')));
const expectedPath = `${directory}/withdrawal.expected.json`;
await writeFile(path.join(root, expectedPath), JSON.stringify({
  format: 'triplex-duckdb-queued-withdrawal-checks/1', verifiedNormalAnswers: 17,
  expectedCallerCancellations: 1, queuedBeforeCancellation: true, withdrawalErrorCode: 'CANCELED_BEFORE_BEGIN',
  cancelledTicketNativeDispatches: 0, cancelledTicketWorkCallbacks: 0, otherPortInterrupts: 0,
  positionBefore: 2, positionAfter: 2, applicationWrites: 0, pendingAfterDrain: 0,
}, null, 2) + '\n', { flag: 'wx' });
for (const [file, role] of [
  [expectedPath, 'oracle'],
  ['packages/duckdb/experiments/public-read-withdrawal.mjs', 'runner'],
  ['packages/duckdb/experiments/prepare-public-read-withdrawal-job.mjs', 'recipe'],
  ['qualification/devloop/DUCKDB-WITHDRAWAL.md', 'recipe'],
  ['qualification/devloop/recipes/duckdb-withdrawal-oracle.json', 'oracle'],
]) manifest.inputs.push({ path: file, role, sha256: createHash('sha256').update(await readFile(path.join(root, file))).digest('hex') });
manifest.id = id;
manifest.author = 'duckdb-withdrawal-owner';
manifest.problemId = 'duckdb-cancelled-queued-physical-work';
manifest.hypothesis = 'A genuinely queued cancelled public metadata ticket performs zero later native work while all17 other answers, cut and complete ownership checks remain correct';
manifest.dependsOn.push('duckdb-withdrawal-build-v2');
manifest.command.argv[1] = 'packages/duckdb/experiments/public-read-withdrawal.mjs';
manifest.command.env.NODE_OPTIONS = '--max-old-space-size=768';
manifest.evidence.checks.push({ key: 'genuinely-queued-withdrawal', expectedInput: expectedPath, actual: 'artifacts/withdrawal-checks.json' });
manifest.evidence.requiredCheckKeys.push('genuinely-queued-withdrawal');
const output = path.join(root, directory, 'withdrawal-manifest.json');
await writeFile(output, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: path.relative(root, output), inputs: manifest.inputs.length, resources: manifest.resources, status: 'PREPARED_UNEXECUTED_QUEUED_GATE' }));
