// [EXP-K01-VK01-R2] Why: retain fresh exits and source hashes without replacing earlier review evidence. Rejected: rerunning the builder helper in its historical evidence directory (overwrites prior receipts).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../../..');
const phase = process.argv.includes('--freshness') ? 'freshness' : 'baseline';
const evidence = path.join(import.meta.dirname, 'evidence/review-round2');
const tmp = path.join(import.meta.dirname, 'tmp/review-round2');
fs.mkdirSync(evidence, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['lab/bin/engine.mjs', 'lab/bench/clone-check.ts', 'lab/bench/lib/clone.ts', 'lab/bench/lib/bulk.ts', 'lab/experiments/EXP-K01-seed-clone/round2-live.mjs', 'lab/experiments/EXP-K01-seed-clone/round2-t1.mjs', 'lab/verify/K01/offline.test.mjs', 'lab/verify/K01/round3.test.mjs', 'lab/verify/K01/run-review-round2.mjs', ...(phase === 'freshness' ? ['lab/verify/K01/freshness.test.mjs'] : [])];
const suites = phase === 'freshness' ? [['freshness', ['lab/verify/K01/freshness.test.mjs']]] : [
  ['baseline', ['lab/bin/test/lab.test.mjs', 'lab/bench/test/bench.test.ts', 'lab/bench/test/clone.test.ts']],
  ['original-21', ['lab/verify/K01/offline.test.mjs']],
  ['builder-23', ['lab/verify/K01/round3.test.mjs']],
];
const receipt = { at: new Date().toISOString(), phase, head: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(), reviewedBuilder: 'a13316c', node: process.version, offlineOnly: true, hostDisk: fs.statfsSync(root, { bigint: false }), sourceSha256: Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(root, file)))])), runs: [] };
const oldCasesFile = path.join(import.meta.dirname, 'evidence/cases.json');
const historicalCases = fs.readFileSync(oldCasesFile);
try {
  for (const [name, tests] of suites) {
    const args = ['--test', ...tests], start = Date.now();
    const result = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, TMPDIR: tmp }, encoding: 'utf8', timeout: 60000, maxBuffer: 16 << 20 });
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    fs.writeFileSync(path.join(evidence, `${name}.tap`), output);
    receipt.runs.push({ name, args, status: result.status, signal: result.signal, error: result.error?.message ?? null, wallMs: Date.now() - start, outputSha256: hash(output) });
    if (name === 'original-21') fs.copyFileSync(oldCasesFile, path.join(evidence, 'original-21-cases.json'));
  }
} finally {
  fs.writeFileSync(oldCasesFile, historicalCases);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(path.join(evidence, `${phase}-run.json`), JSON.stringify(receipt, null, 2) + '\n');
}
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
process.exitCode = receipt.runs.some(run => run.status !== 0) ? 1 : 0;
