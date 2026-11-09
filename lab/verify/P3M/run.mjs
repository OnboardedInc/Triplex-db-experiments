// [CX-VP3M] Why: retain fresh command output and source hashes for independent offline review.
// Rejected: adopting the builder's G0 receipt as a reviewer execution.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../..');
const dir = path.join('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP3M', randomUUID());
fs.mkdirSync(dir, { recursive: true });
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).stdout.trim().split('\n')
  .filter(p => /^(packages\/(core|host|testkit)\/|lab\/bench\/|pnpm-lock.yaml$)/.test(p));
files.push(...fs.readdirSync(import.meta.dirname).filter(p => p.endsWith('.mjs')).map(p => `lab/verify/P3M/${p}`));
const hashes = Object.fromEntries(files.map(p => [p, hash(path.join(root, p))]));
const record = { target: 'd523f632', attempt: dir, node: process.version, offline: true, slot: null, hashes, steps: [] };
const save = () => fs.writeFileSync(path.join(dir, 'execution.json'), JSON.stringify(record, null, 2));
save();
const steps = ['core', 'host', 'testkit'].map(p => [`build-${p}`, `packages/${p}`, '../../node_modules/.bin/tsdown', []]);
steps.push(['declarations', 'packages/host', '../../node_modules/.bin/tsc', ['--declaration', '--emitDeclarationOnly', '--rootDir', 'src', '--outDir', 'dist']]);
steps.push(['builder-tests', '.', process.execPath, ['--test', 'lab/bench/test/p3.test.mjs']]);
steps.push(['review-probes', '.', process.execPath, ['lab/verify/P3M/probes.mjs']]);
for (const [name, cwd, cmd, args] of steps) {
  const r = spawnSync(cmd, args, { cwd: path.join(root, cwd), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, P3M_EVIDENCE: path.join(dir, 'builder-fixtures'), VP3M_EVIDENCE: path.join(dir, 'review-fixtures') } });
  const log = path.join(dir, `${name}.log`);
  fs.writeFileSync(log, `${r.stdout}\n${r.stderr}`);
  record.steps.push({ name, cwd, cmd, args, status: r.status, signal: r.signal, error: r.error?.message, logSha256: hash(log) });
  save();
  console.log(name, r.status);
  if (r.status !== 0) { console.log(r.stdout?.slice(-5000), r.stderr?.slice(-5000)); break; }
}
record.sourceUnchanged = files.every(p => hash(path.join(root, p)) === hashes[p]);
record.commandsSucceeded = record.steps.length === steps.length && record.steps.every(s => s.status === 0) && record.sourceUnchanged;
save();
console.log(JSON.stringify({ dir, commandsSucceeded: record.commandsSucceeded }));
process.exitCode = record.commandsSucceeded ? 0 : 1;
