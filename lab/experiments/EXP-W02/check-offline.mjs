// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing; Node overloads over dynamic option/result unions. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-W02] Why: retain actual command exits and raw logs for this attempt. Rejected:
// reporting a prior console PASS or treating these offline diagnostics as live qualification.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
const root = new URL('../../../', import.meta.url).pathname;
const sha256 = x => createHash('sha256').update(x).digest('hex');
const attempt = 'offline-' + new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-') + '-' + randomBytes(3).toString('hex');
const dir = path.join(root, 'lab/experiments/EXP-W02/evidence', attempt);
fs.mkdirSync(dir, { recursive: true });
const commands = [
  ['build-runtime', ['node', 'lab/experiments/EXP-W02/build-public.mjs']],
  ['live-types', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '--module', 'NodeNext', '--target', 'ES2022', '--allowImportingTsExtensions', '--skipLibCheck', '--types', 'node', 'lab/scenarios/v2/run.ts', 'lab/scenarios/v2/admission.test.ts']],
  ['types', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '-p', 'lab/scenarios/v2/tsconfig.json']],
  ['unit', ['node', '--experimental-strip-types', '--test', 'lab/bin/test/lab.test.mjs', 'lab/scenarios/lib/runner.test.mjs', 'lab/scenarios/v2/offline.test.ts', 'lab/scenarios/v2/claims.test.ts', 'lab/scenarios/v2/lanes.test.ts', 'lab/scenarios/v2/faults.test.ts']],
  ['admission', ['node', '--experimental-strip-types', '--test', 'lab/scenarios/v2/admission.test.ts']],
  ['goldens', ['node', '--experimental-strip-types', 'lab/scenarios/v2/expect.ts', '--check']],
  ['offline-datomic', ['node', 'lab/scenarios/run.mjs', '--offline', '--lane', 'datomic', '--output', path.join(dir, 'datomic-cases.json')]],
  ['offline-qlever', ['node', 'lab/scenarios/run.mjs', '--offline', '--lane', 'qlever', '--output', path.join(dir, 'qlever-cases.json')]],
  ['cases', ['node', 'lab/scenarios/v2/cases.mjs', '--check']],
];
const sourceFiles = ['lab/scenarios/v2/generate.ts', 'lab/scenarios/v2/expect.ts', 'lab/scenarios/v2/run.ts', 'lab/scenarios/v2/admission.ts', 'lab/scenarios/lib/domain.mjs', 'lab/scenarios/lib/policy.mjs', 'lab/bench/lib/g0.ts', 'lab/bench/lib/w0-trace.ts', 'lab/bench/lib/trace.ts', 'lab/acceptance/cases/CS-GS.json'];
sourceFiles.push('lab/experiments/EXP-W02/build-public.mjs', 'pnpm-lock.yaml', 'package.json', 'lab/bin/gate.mjs', 'lab/bin/heavy.mjs', 'lab/bin/heavy-lock.mjs', 'lab/scenarios/v2/offline.test.ts', 'lab/scenarios/v2/admission.test.ts', 'lab/scenarios/v2/expected-500.json', 'lab/experiments/EXP-W02/check-offline.mjs');
for (const dir of ['lab/scenarios', 'lab/bench/lib', 'packages/w0/src', 'lab/oracles/domain', 'lab/world/W0']) {
  const walk = d => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory() && e.name !== '__pycache__') walk(f);
    else if (e.isFile() && /\.(ts|json|py|md)$/.test(f)) sourceFiles.push(f);
  } }; walk(dir);
}
const sources = Object.fromEntries(sourceFiles.map(f => [f, sha256(fs.readFileSync(path.join(root, f)))]));
const grantRoot = '/Users/sam/projects/triplex-db-2/lab/locks/heavy';
const grants = fs.readdirSync(grantRoot).filter(x => /^[1-4]$/.test(x)).flatMap(slot => { try { const owner = JSON.parse(fs.readFileSync(path.join(grantRoot, slot, 'owner.json'))); return owner.pid === process.ppid ? [{ slot, ...owner }] : []; } catch { return []; } });
if (grants.length !== 1) throw Error('offline checks need exactly one parent-owned heavy grant');
const receipt = { attempt, heavyGrant: grants[0], node: process.version, classification: 'OFFLINE-DIAGNOSTIC', startedAt: new Date().toISOString(), sources, commands: [] };
let builds = {};
const buildIdentity = () => {
  const result = {};
  for (const pkg of ['core', 'testkit', 'xtdb', 'qualification', 'w0']) {
    const files = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.isFile()) files.push([path.relative(root, f), sha256(fs.readFileSync(f))]); } };
    walk(path.join(root, 'packages', pkg, 'dist')); result[pkg] = sha256(JSON.stringify(files.sort()));
  } return result;
};
for (const [name, argv] of commands) {
  const startedAt = new Date().toISOString();
  const r = spawnSync(argv[0], argv.slice(1), { cwd: root, env: { ...process.env, ...(name === 'unit' ? { TX2_W02_PROBE_REPORT: path.join(dir, 'domain-probes.json') } : {}) }, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
  const stdout = r.stdout ?? '', stderr = r.stderr ?? '';
  fs.writeFileSync(path.join(dir, name + '.stdout.txt'), stdout);
  fs.writeFileSync(path.join(dir, name + '.stderr.txt'), stderr);
  let contentChecked = true;
  if (name === 'unit') contentChecked = /# tests 48(?:\r?\n|$)/.test(stdout) && /# fail 0(?:\r?\n|$)/.test(stdout);
  if (name === 'admission') contentChecked = /# tests 1(?:\r?\n|$)/.test(stdout) && /# fail 0(?:\r?\n|$)/.test(stdout);
  if (name === 'goldens') { try { const x = JSON.parse(stdout.trim()); contentChecked = x.status === 'BYTE-IDENTICAL' && x.scenarios === 20 && x.witnessEvaluations === 80; } catch { contentChecked = false; } }
  if (name.startsWith('offline-')) { try { const x = JSON.parse(stdout.trim()); contentChecked = x.total === 70 && x.failed === 0 && x.blocked === 4 && x.matched === 66; } catch { contentChecked = false; } }
  if (name === 'cases') contentChecked = stdout.trim() === 'CS-GS byte-identical';
  receipt.commands.push({ name, argv, contentChecked, startedAt, endedAt: new Date().toISOString(), exitCode: r.status, signal: r.signal, error: r.error?.message ?? null,
    stdoutSha256: sha256(stdout), stderrSha256: sha256(stderr) });
  if (name === 'build-runtime' && r.status === 0) builds = buildIdentity();
  console.log(name + ': exit=' + r.status + (r.error ? ' ' + r.error.message : ''));
}
receipt.builds = builds;
try { receipt.buildsUnchanged = Object.keys(builds).length === 5 && JSON.stringify(builds) === JSON.stringify(buildIdentity()); } catch (error) { receipt.buildsUnchanged = false; receipt.buildError = String(error); }
receipt.endedAt = new Date().toISOString();
receipt.sourceUnchanged = Object.entries(sources).every(([f, h]) => sha256(fs.readFileSync(path.join(root, f))) === h);
fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(path.relative(root, dir));
if (!receipt.sourceUnchanged || !receipt.buildsUnchanged || receipt.commands.some(c => c.exitCode !== 0 || !c.contentChecked)) process.exitCode = 1;
