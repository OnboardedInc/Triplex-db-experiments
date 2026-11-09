// [CX-VW02-R2] Why: independent reruns retain raw outcomes and exact source/build/grant identity.
// Rejected: adopting a builder's successful campaign or hiding the 26 missing-claim failures.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../..');
const freeBytes = () => { const s = fs.statfsSync(root); return s.bsize * s.bavail; };
if (freeBytes() < 5 * 1024 ** 3) throw Error('no new heavy run below 5 GiB');
const attempt = 'round2-controller-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 6);
const raw = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VW02/' + attempt;
fs.mkdirSync(raw, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const files = [];
for (const base of ['lab/scenarios', 'lab/bench/lib', 'lab/oracles', 'lab/world/W0', 'lab/acceptance', 'packages/core/dist', 'packages/testkit/dist', 'packages/xtdb/dist', 'packages/qualification/dist', 'packages/w0/dist']) {
 const walk = d => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory() && e.name !== '__pycache__') walk(f); else if (e.isFile()) files.push(f); } }; walk(base);
}
files.push('lab/verify/W02/check-round2.mjs', 'lab/verify/W02/review-round2.ts', 'lab/verify/W02/extra-round2.ts', 'lab/bin/heavy.mjs', 'lab/bin/heavy-lock.mjs', 'pnpm-lock.yaml');
const identity = () => Object.fromEntries(files.sort().map(f => [f, sha(fs.readFileSync(path.join(root, f)))]));
const before = identity();
const grants = fs.readdirSync('/Users/sam/projects/triplex-db-2/lab/locks/heavy').flatMap(slot => { try { const owner = JSON.parse(fs.readFileSync(`/Users/sam/projects/triplex-db-2/lab/locks/heavy/${slot}/owner.json`)); return owner.pid === process.ppid ? [{ slot, ...owner }] : []; } catch { return []; } });
if (grants.length !== 1) throw Error('one parent-owned heavy grant required');
const commands = [
 ['types', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '-p', 'lab/scenarios/v2/tsconfig.json']],
 ['unit', ['node', '--experimental-strip-types', '--test', 'lab/bin/test/lab.test.mjs', 'lab/scenarios/lib/runner.test.mjs', 'lab/scenarios/v2/offline.test.ts', 'lab/scenarios/v2/claims.test.ts', 'lab/scenarios/v2/lanes.test.ts', 'lab/scenarios/v2/faults.test.ts', 'lab/scenarios/v2/coverage.test.ts']],
 ['admission', ['node', '--experimental-strip-types', '--test', 'lab/scenarios/v2/admission.test.ts']],
 ['goldens', ['node', '--experimental-strip-types', 'lab/scenarios/v2/expect.ts', '--check']],
 ['manifest', ['node', 'lab/scenarios/v2/cases.mjs', '--check']],
 ['mutations', ['node', '--experimental-strip-types', 'lab/verify/W02/review-round2.ts']],
 ['extra', ['node', '--experimental-strip-types', 'lab/verify/W02/extra-round2.ts']],
];
const receipt = { classification: 'INDEPENDENT-OFFLINE-REVIEW', attempt, raw, head: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), builder: '2e09b37e', startedAt: new Date().toISOString(), freeBytesAtStart: freeBytes(), grant: grants[0], sourcesAndBuilds: before, commands: [] };
for (const [name, argv] of commands) {
 const startedAt = new Date().toISOString();
 const r = spawnSync(argv[0], argv.slice(1), { cwd: root, env: { ...process.env, CX_VW02_R2_RAW: raw, TX2_W02_PROBE_REPORT: path.join(raw, 'unit-probes.json') }, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
 const stdout = r.stdout ?? '', stderr = r.stderr ?? '';
 for (const [kind, bytes] of [['stdout', stdout], ['stderr', stderr]]) fs.writeFileSync(path.join(raw, name + '.' + kind + '.txt'), bytes);
 let content = name === 'types' ? !stdout.trim() : false;
 if (name === 'unit' || name === 'admission') content = stdout.includes('# tests ' + (name === 'unit' ? 53 : 1) + '\n') && stdout.includes('# pass ' + (name === 'unit' ? 53 : 1) + '\n') && stdout.includes('# fail 0\n') && stdout.includes('# skipped 0\n');
 if (name === 'goldens') { try { const x = JSON.parse(stdout.trim()); content = x.status === 'BYTE-IDENTICAL' && x.scenarios === 20 && x.witnessEvaluations === 80; } catch {} }
 if (name === 'manifest') content = stdout.trim() === 'CS-GS byte-identical';
 if (name === 'mutations') { try { const x = JSON.parse(stdout.trim().split('\n').at(-1)); content = x.complete && x.mutations === 33 && x.sourceUnchanged; receipt.campaignRaw = x.raw; } catch {} }
 if (name === 'extra') { try { const x = JSON.parse(stdout.trim()); content = x.complete && x.basisGuards === 20 && x.specGuards === 10 && x.evidenceGuards === 3 && x.spoofedContentRejected; } catch {} }
 receipt.commands.push({ name, argv, startedAt, endedAt: new Date().toISOString(), status: r.status, signal: r.signal, error: String(r.error ?? ''), content, stdoutSha256: sha(stdout), stderrSha256: sha(stderr) });
 fs.writeFileSync(path.join(raw, 'receipt.json'), JSON.stringify(receipt, null, 1) + '\n');
 console.log(name + ': exit=' + r.status + ', content=' + content);
}
receipt.sourcesAndBuildsUnchanged = JSON.stringify(before) === JSON.stringify(identity());
receipt.endedAt = new Date().toISOString();
fs.writeFileSync(path.join(raw, 'receipt.json'), JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync(path.join(import.meta.dirname, 'round2/controller-index.json'), JSON.stringify({ raw, campaignRaw: receipt.campaignRaw, receiptSha256: sha(fs.readFileSync(path.join(raw, 'receipt.json'))), commands: receipt.commands, sourcesAndBuildsUnchanged: receipt.sourcesAndBuildsUnchanged }, null, 1) + '\n');
console.log(JSON.stringify({ raw, campaignRaw: receipt.campaignRaw, unchanged: receipt.sourcesAndBuildsUnchanged }));
if (!receipt.sourcesAndBuildsUnchanged || receipt.commands.some(c => c.status !== 0 || !c.content)) process.exitCode = 1;
