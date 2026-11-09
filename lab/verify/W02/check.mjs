// [CX-VW02] Why: bind reruns and raw command output to unchanged review inputs and a real grant.
// Rejected: adopting builder receipts as this reviewer's fresh execution.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../..');
const dir = path.join(import.meta.dirname, 'evidence');
const hash = b => createHash('sha256').update(b).digest('hex');
const files = spawnSync('git', ['ls-files', 'lab/scenarios', 'lab/bench/lib', 'lab/bin', 'lab/acceptance', 'lab/oracles', 'packages/w0/src', 'lab/experiments/EXP-W02'], { encoding: 'utf8' }).stdout.trim().split('\n');
const source = () => Object.fromEntries(files.map(f => [f, hash(fs.readFileSync(path.join(root, f)))]));
const sources = source();
const grants = fs.readdirSync('/Users/sam/projects/triplex-db-2/lab/locks/heavy').flatMap(slot => {
  try { const o = JSON.parse(fs.readFileSync(`/Users/sam/projects/triplex-db-2/lab/locks/heavy/${slot}/owner.json`)); return o.pid === process.ppid ? [{ slot, ...o }] : []; } catch { return []; }
});
if (grants.length !== 1) throw Error('one real parent-owned heavy grant required');
const receipt = { classification: 'INDEPENDENT-OFFLINE-REVIEW', startedAt: new Date().toISOString(), head: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), node: process.version, grant: grants[0], sources, commands: [] };
const commands = [
  ['types', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '-p', 'lab/scenarios/v2/tsconfig.json']],
  ['unit', ['node', '--experimental-strip-types', '--test', 'lab/bin/test/lab.test.mjs', 'lab/scenarios/lib/runner.test.mjs', 'lab/scenarios/v2/offline.test.ts', 'lab/scenarios/v2/claims.test.ts', 'lab/scenarios/v2/lanes.test.ts', 'lab/scenarios/v2/faults.test.ts']],
  ['admission', ['node', '--experimental-strip-types', '--test', 'lab/scenarios/v2/admission.test.ts']],
  ['goldens', ['node', '--experimental-strip-types', 'lab/scenarios/v2/expect.ts', '--check']],
  ['manifest', ['node', 'lab/scenarios/v2/cases.mjs', '--check']],
  ['adversarial', ['node', '--experimental-strip-types', 'lab/verify/W02/review.ts']],
];
for (const [name, argv] of commands) {
  const startedAt = new Date().toISOString();
  const r = spawnSync(argv[0], argv.slice(1), { cwd: root, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
  for (const stream of ['stdout', 'stderr']) fs.writeFileSync(path.join(dir, `${name}.${stream}.txt`), r[stream] ?? '');
  receipt.commands.push({ name, argv, startedAt, endedAt: new Date().toISOString(), status: r.status, signal: r.signal, error: String(r.error ?? ''), stdoutSha256: hash(r.stdout ?? ''), stderrSha256: hash(r.stderr ?? '') });
  fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify(receipt, null, 1) + '\n');
  console.log(`${name}: exit ${r.status}`);
}
receipt.sourceUnchanged = JSON.stringify(source()) === JSON.stringify(sources);
receipt.endedAt = new Date().toISOString();
if (!receipt.sourceUnchanged) throw Error('reviewed source changed during checks');
fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify(receipt, null, 1) + '\n');
if (receipt.commands.some(c => c.status !== 0)) process.exitCode = 1;
