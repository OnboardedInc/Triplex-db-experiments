// [EXP-K01-VK01-R3] Why: bind independent reruns to the merged source and preserve all older receipts. Rejected: using the builder runner's historical output directory (would overwrite prior evidence).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../..');
const evidence = path.join(import.meta.dirname, 'evidence/review-round3');
const phase = process.argv.includes('--new') ? 'new' : 'existing';
const tmp = path.join(import.meta.dirname, 'tmp/review-round3');
fs.mkdirSync(evidence, { recursive: true }); fs.mkdirSync(tmp, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['lab/bin/engine.mjs', 'lab/bin/owner-state.mjs', 'lab/bin/xtdb-log.mjs', 'lab/bench/clone-check.ts', 'lab/bench/lib/clone.ts', 'lab/bench/lib/bulk.ts', 'lab/experiments/EXP-K01-seed-clone/round2-live.mjs', 'lab/verify/K01/offline.test.mjs', 'lab/verify/K01/freshness.test.mjs', 'lab/verify/K01/round3.test.mjs', 'lab/verify/K01/round4.test.mjs', 'lab/verify/K01/tail-fixtures.mjs', 'lab/bench/test/clone.test.ts', 'lab/verify/K01/run-review-round3.mjs', ...(phase === 'new' ? ['lab/verify/K01/q83e-review.test.mjs'] : [])];
const suites = phase === 'new' ? [['new', ['--test', 'lab/verify/K01/q83e-review.test.mjs']]] : [
  ['baseline-41', ['--test', 'lab/bin/test/lab.test.mjs', 'lab/bench/test/bench.test.ts', 'lab/bench/test/clone.test.ts']],
  ['original-21', ['--test', 'lab/verify/K01/offline.test.mjs']],
  ['round3-23', ['--test', 'lab/verify/K01/round3.test.mjs']],
  ['freshness-14', ['--test', 'lab/verify/K01/freshness.test.mjs']],
  ['round4-35', ['--test', 'lab/verify/K01/round4.test.mjs']],
  ...['lab/bin/engine.mjs', 'lab/bin/xtdb-log.mjs', 'lab/bin/owner-state.mjs', 'lab/experiments/EXP-K01-seed-clone/round2-live.mjs'].map((file, i) => [`syntax-${i}`, ['--check', file]]),
];
const receipt = { at: new Date().toISOString(), head: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(), reviewedBuilder: '9254ec3', phase, offlineOnly: true, node: process.version, disk: fs.statfsSync(root), sources: Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(root, file)))])), runs: [] };
const casePaths = ['lab/verify/K01/evidence/cases.json', 'lab/verify/K01/evidence/review-round2/freshness-cases.json'];
const previous = casePaths.map(file => fs.readFileSync(path.join(root, file)));
try {
  for (const [label, args] of suites) {
    const start = Date.now(), result = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, TMPDIR: tmp }, encoding: 'utf8', timeout: 120000, maxBuffer: 16 << 20 });
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    fs.writeFileSync(path.join(evidence, label + '.tap'), output);
    receipt.runs.push({ label, args, exit: result.status, signal: result.signal, error: result.error?.message ?? null, ms: Date.now() - start, sha256: hash(output) });
    if (label === 'original-21') fs.copyFileSync(path.join(root, casePaths[0]), path.join(evidence, 'original-21-cases.json'));
    if (label === 'freshness-14') fs.copyFileSync(path.join(root, casePaths[1]), path.join(evidence, 'freshness-14-cases.json'));
  }
} finally {
  casePaths.forEach((file, i) => fs.writeFileSync(path.join(root, file), previous[i]));
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(path.join(evidence, phase + '-run.json'), JSON.stringify(receipt, null, 2) + '\n');
}
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
process.exitCode = receipt.runs.some(run => run.exit !== 0) ? 1 : 0;
