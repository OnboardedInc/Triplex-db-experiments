// [EXP-W02-R3] Why: preserve fresh command bytes outside git, tied to source, builds and our heavy grant.
// Rejected: counting intentional fail-closed scenario diagnostics as a green GS gate.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
const root = new URL('../../../', import.meta.url).pathname;
const sha = x => createHash('sha256').update(x).digest('hex');
const attempt = 'round3-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 6);
const dir = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-W02/' + attempt;
fs.mkdirSync(dir, { recursive: true });
const files = [];
for (const base of ['lab/scenarios', 'lab/bench/lib', 'lab/oracles', 'lab/world/W0', 'lab/acceptance', 'lab/experiments/EXP-W02/controls', 'packages/core/dist', 'packages/testkit/dist', 'packages/xtdb/dist', 'packages/qualification/dist', 'packages/w0/dist']) {
  const walk = d => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory() && e.name !== '__pycache__') walk(f); else if (e.isFile()) files.push(f); } }; walk(base);
}
files.push('lab/experiments/EXP-W02/check-round3.mjs', 'lab/bin/heavy.mjs', 'lab/bin/heavy-lock.mjs', 'pnpm-lock.yaml');
const identity = () => Object.fromEntries(files.sort().map(f => [f, sha(fs.readFileSync(path.join(root, f)))]));
const before = identity();
const grants = fs.readdirSync('/Users/sam/projects/triplex-db-2/lab/locks/heavy').filter(x => /^[1-4]$/.test(x)).flatMap(slot => {
  try { const o = JSON.parse(fs.readFileSync('/Users/sam/projects/triplex-db-2/lab/locks/heavy/' + slot + '/owner.json')); return o.pid === process.ppid ? [{ slot, ...o }] : []; } catch { return []; }
});
if (grants.length !== 1) throw Error('requires one parent-owned heavy grant');
const commands = [
  ['types', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '-p', 'lab/scenarios/v2/tsconfig.json']],
  ['unit', ['node', '--experimental-strip-types', '--test', 'lab/bin/test/lab.test.mjs', 'lab/scenarios/lib/runner.test.mjs', 'lab/scenarios/v2/offline.test.ts', 'lab/scenarios/v2/claims.test.ts', 'lab/scenarios/v2/lanes.test.ts', 'lab/scenarios/v2/faults.test.ts', 'lab/scenarios/v2/coverage.test.ts']],
  ['admission', ['node', '--experimental-strip-types', '--test', 'lab/scenarios/v2/admission.test.ts']],
  ['goldens', ['node', '--experimental-strip-types', 'lab/scenarios/v2/expect.ts', '--check']],
  ['cases', ['node', 'lab/scenarios/v2/cases.mjs', '--check']],
  ['mutations', ['node', '--experimental-strip-types', 'lab/experiments/EXP-W02/controls/round3.ts']],
];
const receipt = { attempt, dir, classification: 'OFFLINE-CONTAINMENT-CHECKS; NOT GS ACCEPTANCE', startedAt: new Date().toISOString(), heavyGrant: grants[0], sourcesAndBuilds: before, commands: [] };
for (const [name, argv] of commands) {
  const startedAt = new Date().toISOString();
  const r = spawnSync(argv[0], argv.slice(1), { cwd: root, env: { ...process.env, TX2_W02_PROBE_REPORT: path.join(dir, 'unit-probes.json') }, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
  const stdout = r.stdout ?? '', stderr = r.stderr ?? '';
  for (const [kind, bytes] of [['stdout', stdout], ['stderr', stderr]]) fs.writeFileSync(path.join(dir, name + '.' + kind + '.txt'), bytes);
  let content = name === 'types' ? !stdout.trim() : false;
  if (name === 'unit' || name === 'admission') content = stdout.includes('# tests ' + (name === 'unit' ? 53 : 1) + '\n') && stdout.includes('# fail 0\n') && stdout.includes('# skipped 0\n');
  if (name === 'goldens') { try { const x = JSON.parse(stdout.trim()); content = x.status === 'BYTE-IDENTICAL' && x.scenarios === 20 && x.witnessEvaluations === 80; } catch {} }
  if (name === 'cases') content = stdout.trim() === 'CS-GS byte-identical';
  if (name === 'mutations') { try { const x = JSON.parse(stdout.trim().split('\n').at(-1)); content = x.complete && x.mutations === 33 && x.sourceUnchanged; receipt.mutationRaw = x.raw; } catch {} }
  receipt.commands.push({ name, argv, startedAt, endedAt: new Date().toISOString(), exitCode: r.status, signal: r.signal, error: r.error?.message, contentChecked: content, stdoutSha256: sha(stdout), stderrSha256: sha(stderr) });
  console.log(name + ': exit=' + r.status + ', content=' + content);
}
receipt.endedAt = new Date().toISOString();
receipt.sourcesAndBuildsUnchanged = JSON.stringify(before) === JSON.stringify(identity());
fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify(receipt, null, 1) + '\n');
console.log(dir);
if (!receipt.sourcesAndBuildsUnchanged || receipt.commands.some(c => c.exitCode !== 0 || !c.contentChecked)) process.exitCode = 1;
