import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

// [CX-VDF01] Why: rerun the unchanged consumer audits, and isolate the reported missing CLI build artifact.
// Rejected: re-running root pack against other unbuilt packages (does not isolate this setup claim).
const root = path.resolve(import.meta.dirname, '../../..');
const out = import.meta.dirname;
const durable = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDF01/pack';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['pnpm-lock.yaml', 'vitest.workspace-aliases.ts', 'packages/host/vitest.config.ts',
  'packages/host/src/feed/Adapters.ts', 'packages/host/src/feed/ConsumerStore.ts',
  'packages/core/src/feed/index.ts', 'packages/testkit/src/feed/index.ts',
  'packages/host/test/feed/datomic.test.ts',
  'packages/datomic/test/feed.test.ts', 'packages/datomic/src/DatomicClient.ts',
  'lab/experiments/EXP-DF01/recorded-page.json', 'packages/cli/package.json',
  'packages/cli/tsdown.config.ts', 'lab/verify/DF01/run-secondary.mjs', 'lab/verify/DF01/audit-historical.mjs'];
const hashes = () => Object.fromEntries(files.map(p => [p, sha(fs.readFileSync(path.join(root, p)))]));
const inputs = hashes();
const startedAt = new Date().toISOString();
const steps = [];
process.on('exit', code => fs.writeFileSync(path.join(out, 'secondary-attempt.json'), JSON.stringify({
  startedAt, endedAt: new Date().toISOString(), code, inputs, steps,
}, null, 2) + '\n'));
const run = (name, command, args) => {
  const begin = new Date().toISOString();
  const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, `${name}.stdout.log`), r.stdout ?? '');
  fs.writeFileSync(path.join(out, `${name}.stderr.log`), r.stderr ?? '');
  steps.push({ name, command, args, startedAt: begin, endedAt: new Date().toISOString(), code: r.status,
    signal: r.signal, error: r.error?.message ?? null });
  return r;
};
const resultFile = path.join(out, 'focused-tests.json');
fs.rmSync(resultFile, { force: true });
const tests = run('focused-tests', process.execPath, ['node_modules/vitest/vitest.mjs', 'run',
  '--maxWorkers=1', '--no-file-parallelism',
  '--config', 'packages/host/vitest.config.ts', 'packages/host/test/feed/datomic.test.ts',
  'packages/datomic/test/feed.test.ts',
  '--reporter=json', `--outputFile=${resultFile}`]);
assert.equal(tests.status, 0);
const testResult = JSON.parse(fs.readFileSync(resultFile));
assert.equal(testResult.success, true);
assert.equal(testResult.numFailedTests, 0);
assert.equal(testResult.numPendingTests, 0);
assert.equal(testResult.numPassedTests, 4);
assert.ok(testResult.startTime >= Date.parse(startedAt));
const historical = run('historical-audit', process.execPath, ['lab/verify/DF01/audit-historical.mjs']);
assert.equal(historical.status, 0);
fs.mkdirSync(durable, { recursive: true });
const target = path.join(durable, 'triplex-build-triplex-cli-0.1.1.tgz');
assert.equal(fs.existsSync(target), false, 'Refuse pre-existing packaging output');
const pack = run('cli-pack', 'pnpm', ['--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store',
  '--filter', '@triplex-build/triplex-cli', 'pack', '--pack-destination', durable]);
assert.equal(pack.status, 0);
const entries = execFileSync('tar', ['-tzf', target], { encoding: 'utf8' }).trim().split('\n');
for (const required of ['package/dist/index.js', 'package/dist/index.d.ts', 'package/dist/cli.js'])
  assert.ok(entries.includes(required), `Missing ${required} after CLI build`);
fs.writeFileSync(path.join(out, 'cli-tar-entries.txt'), entries.join('\n') + '\n');
const describe = run('cli-describe', process.execPath, ['packages/cli/dist/cli.js', 'describe']);
assert.equal(describe.status, 0);
const description = JSON.parse(describe.stdout);
assert.equal(description.ok, true);
assert.equal(description.command, 'describe');
assert.deepEqual(inputs, hashes());
const result = { kind: 'offline-secondary-verification', startedAt, endedAt: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  slot: null, inputs, steps,
  tests: { passed: testResult.numPassedTests, failed: testResult.numFailedTests, skipped: testResult.numPendingTests },
  cliTarball: { path: target, bytes: fs.statSync(target).size, sha256: sha(fs.readFileSync(target)),
    requiredEntriesPresent: true, fullRootPackConsumerRun: false } };
fs.writeFileSync(path.join(out, 'secondary-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
