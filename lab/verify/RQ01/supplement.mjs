// [CX-VRQ01] Why: bind the additional no-flag probe and original lane tests to the reviewed source.
// Rejected: treating the builder's lane receipts as fresh verifier results.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
const dir = 'lab/verify/RQ01/run-a3';
fs.mkdirSync(dir, { recursive: false });
const sourceFiles = [
  'packages/xtdb/src/XtdbStorageAdapter.ts', 'packages/xtdb/src/codecs.ts',
  'packages/xtdb/test/route-equivalence.test.ts', 'packages/qlever/test/route-equivalence.test.ts',
  'packages/testkit/src/route-equivalence.ts', 'packages/testkit/src/offline-route-fixtures.ts',
  'lab/verify/RQ01/empty-without-flag.mjs', 'lab/verify/RQ01/lane.config.ts',
  'lab/verify/RQ01/supplement.mjs', 'lab/verify/RQ01/source-loader.mjs', 'pnpm-lock.yaml',
  '/Users/sam/projects/triplex-db-2/lab/research/R31-route-equivalence.md',
  '/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS-PENDING.md',
];
const hashes = () => Object.fromEntries(sourceFiles.map(f => [f, createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const before = hashes();
const commands = [
  ['empty-without-flag', ['node', '--import', './lab/verify/RQ01/source-loader.mjs', 'lab/verify/RQ01/empty-without-flag.mjs']],
  ['offline-lanes', ['node', '/Users/sam/projects/triplex-db-2/node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--config', 'lab/verify/RQ01/lane.config.ts', '--reporter=json', '--outputFile=lab/verify/RQ01/run-a3/offline-lanes.json']],
];
const results = [];
for (const [label, command] of commands) {
  const r = spawnSync(command[0], command.slice(1), { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  fs.writeFileSync(`${dir}/${label}.log`, `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ?? ''}`);
  results.push({ label, command, status: r.status, signal: r.signal });
  console.log(JSON.stringify(results.at(-1)));
}
const after = hashes();
const receipt = { at: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), before, after, sourceStillMatches: JSON.stringify(before) === JSON.stringify(after), results };
fs.writeFileSync(`${dir}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
process.exitCode = receipt.sourceStillMatches && results.every(r => r.status === 0) ? 0 : 1;
