// [CX-VRQ01] Why: preserve a separate attempt after resolving an offline dependency lookup failure.
// Rejected: overwriting a3's failed suite-discovery receipt.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
const dir = 'lab/verify/RQ01/run-a4';
fs.mkdirSync(dir, { recursive: false });
const files = execFileSync('git', ['ls-files', 'packages/core', 'packages/xtdb', 'packages/testkit', 'packages/qlever/test/route-equivalence.test.ts', 'pnpm-lock.yaml', 'vitest.workspace-aliases.ts'], { encoding: 'utf8' }).trim().split('\n');
files.push('lab/verify/RQ01/lane-rerun.mjs', 'lab/verify/RQ01/lane.config.ts', 'lab/verify/RQ01/lane-a4.config.ts',
  '/Users/sam/projects/triplex-db-2/packages/core/node_modules/ulidx/package.json',
  '/Users/sam/projects/triplex-db-2/packages/core/node_modules/ulidx/dist/node/index.js');
const hashes = () => Object.fromEntries(files.map(f => [f, createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const before = hashes();
const command = ['node', '/Users/sam/projects/triplex-db-2/node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--config', 'lab/verify/RQ01/lane-a4.config.ts', '--reporter=json', '--outputFile=lab/verify/RQ01/run-a4/offline-lanes.json'];
const r = spawnSync(command[0], command.slice(1), { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
fs.writeFileSync(`${dir}/offline-lanes.log`, `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ?? ''}`);
const after = hashes();
const receipt = { at: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), reason: 'a3 discovered no tests because ulidx was not linked in the review worktree; a4 aliases its already installed pinned external dependency', command, status: r.status, signal: r.signal, before, after, sourceStillMatches: JSON.stringify(before) === JSON.stringify(after) };
fs.writeFileSync(`${dir}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ status: r.status, sourceStillMatches: receipt.sourceStillMatches }));
process.exitCode = receipt.sourceStillMatches && r.status === 0 ? 0 : 1;
