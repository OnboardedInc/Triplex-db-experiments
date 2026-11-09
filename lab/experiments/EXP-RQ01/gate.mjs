// [EXP-RQ01] Why: retain each offline attempt with source hashes and actual exits.
// Rejected: a mutable PASS file (cannot bind a result to the code it exercised).
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const attempt = process.argv[2];
if (!attempt || !/^[a-zA-Z0-9_-]+$/.test(attempt)) throw new Error('Usage: gate.mjs UNIQUE_ATTEMPT');
const root = process.cwd();
const out = path.join(root, 'lab/experiments/EXP-RQ01/evidence', attempt);
fs.mkdirSync(out, { recursive: false });
const files = [
  'packages/testkit/src/index.ts', 'packages/testkit/src/route-equivalence.ts',
  'packages/testkit/src/offline-route-fixtures.ts', 'packages/testkit/test/route-equivalence.test.ts',
  'packages/xtdb/test/route-equivalence.test.ts', 'packages/qlever/test/route-equivalence.test.ts',
  'packages/xtdb/src/XtdbStorageAdapter.ts', 'packages/xtdb/src/codecs.ts',
  'lab/experiments/EXP-RQ01/gate.mjs', 'pnpm-lock.yaml',
];
const hashes = () => Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const before = hashes();
const commands = [
  ['testkit', ['node', 'node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--config', 'packages/testkit/vitest.config.ts', 'packages/testkit/test']],
  ['xtdb', ['node', 'node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--root', 'packages/xtdb', '--config', path.join(root, 'packages/xtdb/vitest.config.ts'), 'test/route-equivalence.test.ts']],
  ['qlever', ['node', 'node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--root', 'packages/qlever', '--config', path.join(root, 'packages/qlever/vitest.config.ts'), 'test/route-equivalence.test.ts']],
  ['typecheck', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '-p', 'packages/testkit/tsconfig.json']],
  ['build', ['node', 'node_modules/tsdown/dist/run.mjs']],
];
// tsdown's working directory selects the package's normal build config.
const results = [];
for (const [label, command] of commands) {
  const cwd = label === 'build' ? path.join(root, 'packages/testkit') : root;
  const args = label === 'build' ? [path.join(root, 'node_modules/tsdown/dist/run.mjs')] : command.slice(1);
  const result = spawnSync(command[0], args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, `${label}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ?? ''}`);
  results.push({ label, command, cwd, status: result.status, signal: result.signal });
}
const sourceStillMatches = JSON.stringify(before) === JSON.stringify(hashes());
const receipt = { experiment: 'EXP-RQ01', at: new Date().toISOString(),
  head: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
  seeds: [1, 42, 890, 89, 891], reference: 'offline-fold-not-independent',
  source: before, sourceStillMatches, results,
  passed: sourceStillMatches && results.every(r => r.status === 0) };
fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ out, passed: receipt.passed, results }));
process.exitCode = receipt.passed ? 0 : 1;
