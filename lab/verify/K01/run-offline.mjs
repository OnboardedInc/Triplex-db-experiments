// [EXP-K01-VK01] Why: preserve actual exit statuses alongside TAP and source identity. Rejected: piping tests through tail (would hide the test process status).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../../..');
const evidence = path.join(import.meta.dirname, 'evidence');
const tmp = path.join(import.meta.dirname, 'tmp');
fs.mkdirSync(evidence, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });
const run = args => spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, TMPDIR: tmp }, encoding: 'utf8', timeout: 60000 });
const receipt = { at: new Date().toISOString(), head: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(), node: process.version, reviewedHead: '05a23dd90fde0d7c1df5f8ecff2ef417fa436e20', runs: [] };
for (const [name, files] of [
  ['baseline', ['lab/bin/test/lab.test.mjs', 'lab/bench/test/bench.test.ts', 'lab/bench/test/clone.test.ts']],
  ['regressions', ['lab/verify/K01/offline.test.mjs']],
]) {
  const args = ['--test', ...files], start = Date.now(), result = run(args);
  const raw = (result.stdout ?? '') + (result.stderr ?? '');
  fs.writeFileSync(path.join(evidence, name + '.tap'), raw);
  receipt.runs.push({ name, command: [process.execPath, ...args], status: result.status, signal: result.signal, error: result.error?.message ?? null, wallMs: Date.now() - start, tapSha256: createHash('sha256').update(raw).digest('hex') });
}
fs.writeFileSync(path.join(evidence, 'run.json'), JSON.stringify(receipt, null, 2) + '\n');
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
process.exitCode = receipt.runs.some(result => result.status !== 0) ? 1 : 0;
