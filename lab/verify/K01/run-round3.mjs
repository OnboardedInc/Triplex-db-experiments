// [EXP-K01-R3] Why: bind all offline gates to actual source bytes and exits under one heavy grant. Rejected: combining stale TAP or hiding a failed command behind later successful checks.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../..');
const evidence = path.join(root, 'lab/experiments/EXP-K01-seed-clone/evidence/round3');
const tmp = path.join(import.meta.dirname, 'tmp/final');
fs.mkdirSync(evidence, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['lab/bin/engine.mjs', 'lab/bench/clone-check.ts', 'lab/experiments/EXP-K01-seed-clone/round2-live.mjs', 'lab/experiments/EXP-K01-seed-clone/round2-t1.mjs', 'lab/verify/K01/offline.test.mjs', 'lab/verify/K01/round3.test.mjs', 'lab/verify/K01/run-offline.mjs', 'lab/verify/K01/run-round3.mjs'];
const receipt = { at: new Date().toISOString(), head: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(), node: process.version, offlineOnly: true, sourceSha256: Object.fromEntries(files.map(f => [f, sha(fs.readFileSync(path.join(root, f)))])), runs: [] };
for (const [label, args] of [
  ['reviewer-gates', ['lab/verify/K01/run-offline.mjs']],
  ['extended', ['--test', 'lab/verify/K01/round3.test.mjs']],
  ['types-final', ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'lab/bench/tsconfig.json']],
  ...['lab/bin/engine.mjs', 'lab/experiments/EXP-K01-seed-clone/round2-live.mjs', 'lab/experiments/EXP-K01-seed-clone/round2-t1.mjs', 'lab/verify/K01/run-round3.mjs'].map((f, i) => [`syntax-${i}`, ['--check', f]]),
]) {
  const t = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, TMPDIR: tmp }, encoding: 'utf8', timeout: 120000 });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  fs.writeFileSync(path.join(evidence, label + '.log'), output);
  receipt.runs.push({ label, command: [process.execPath, ...args], exit: result.status, signal: result.signal, error: result.error?.message ?? null, elapsedMs: Date.now() - t, outputSha256: sha(output) });
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(path.join(evidence, 'final-run.json'), JSON.stringify(receipt, null, 2) + '\n');
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
process.exitCode = receipt.runs.some(r => r.exit !== 0) ? 1 : 0;
