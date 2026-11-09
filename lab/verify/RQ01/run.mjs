// [CX-VRQ01] Why: retain actual command exits, output and source hashes across the independent review.
// Rejected: reusing the builder receipt (historical evidence is not fresh verification).
import fs from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const dir = 'lab/verify/RQ01/run-a2';
fs.mkdirSync(dir, { recursive: false });
const tracked = execFileSync('git', ['ls-files', 'packages/testkit', 'packages/xtdb/test/route-equivalence.test.ts', 'packages/qlever/test/route-equivalence.test.ts', 'pnpm-lock.yaml', 'lab/experiments/EXP-RQ01/gate.mjs'], { encoding: 'utf8' }).trim().split('\n');
const hash = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const hashes = () => Object.fromEntries(tracked.map(f => [f, hash(f)]));
const before = hashes();
const results = [];
const commands = [
  ['review', ['node', '--import', './lab/verify/RQ01/source-loader.mjs', 'lab/verify/RQ01/review.mjs', 'lab/verify/RQ01/evidence-a2']],
  ['original-tests', ['node', '/Users/sam/projects/triplex-db-2/node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--config', 'lab/verify/RQ01/vitest.config.mjs', '--reporter=json', '--outputFile=lab/verify/RQ01/run-a2/original-tests.json']],
  ['dc1-original', ['node', 'lab/verify/RQ01/guard-probe.mjs', 'original']],
  ['dc1-repair', ['node', 'lab/verify/RQ01/guard-probe.mjs', 'repair']],
];
for (const [label, command] of commands) {
  const r = spawnSync(command[0], command.slice(1), { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  fs.writeFileSync(`${dir}/${label}.log`, `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ?? ''}`);
  results.push({ label, command, status: r.status, signal: r.signal });
  console.log(JSON.stringify(results.at(-1)));
}
const r5 = JSON.parse(fs.readFileSync('lab/experiments/EXP-RQ01/evidence/r5/receipt.json', 'utf8'));
const builderHashMatch = Object.fromEntries(Object.entries(r5.source).map(([f, h]) => [f, hash(f) === h]));
const after = hashes();
const receipt = { at: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version, versions: Object.fromEntries(['vitest', 'typescript'].map(p => [p, JSON.parse(fs.readFileSync(`/Users/sam/projects/triplex-db-2/node_modules/${p}/package.json`, 'utf8')).version])), before, after, sourceStillMatches: JSON.stringify(before) === JSON.stringify(after), builderHashMatch, results };
fs.writeFileSync(`${dir}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
process.exitCode = receipt.sourceStillMatches && Object.values(builderHashMatch).every(Boolean) && results.every(r => r.status === 0) ? 0 : 1;
