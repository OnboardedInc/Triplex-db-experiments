// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

// [EXP-DA01] Why: retain terminal failures and source-bound passes together without rewriting originals. Rejected: a PASS-only packet that hides the addressing regression.
const root = path.resolve(import.meta.dirname, '../../../..');
const dir = import.meta.dirname;
const read = file => JSON.parse(fs.readFileSync(file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const packageTree = ref => execFileSync('git', ['rev-parse', `${ref}:packages/datomic`], {cwd: root, encoding:'utf8'}).trim();
if (packageTree('HEAD') !== packageTree('9a7c8372')) throw new Error('Live-tested package tree changed');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const runs = ['G0', 'G1'].flatMap(gate => fs.readdirSync(path.join(root, 'lab/runs', gate))
  .filter(name => /^G[01]-datomic-/.test(name) && name.endsWith('.json'))
  .map(name => read(path.join(root, 'lab/runs', gate, name)))).filter(r => r.experiment === 'EXP-DA01' && Date.parse(r.startedAt) >= Date.parse('2026-11-08T23:30:00Z'));
const fresh = runs.filter(r => r.git.head === head && r.verdict === 'PASS');
for (const r of fresh) if (r.git.diffBytes !== 0 || r.git.modifiedFiles.length || r.git.untrackedFiles.length) throw new Error('Modified executed source');
const g1 = fresh.filter(r => r.gate === 'G1');
if (!fresh.some(r => r.gate === 'G0') || !g1.some(r => g1.some(p => p.runId === r.previous))) throw new Error('Final-source G0 and linked G1 rerun missing');
const summaries = [];
for (const r of runs) {
  if (r.verdict === 'PASS' && r.gate === 'G1') {
    const report = read(path.resolve(root, r.rawDir, 'g1-report.json'));
    if (r.counts.executed !== 88 || r.counts.pass !== 88 || r.counts.fail !== 0 || report.suite.status !== 'PASS') throw new Error('Incomplete G1');
  }
  const dest = path.join(dir, 'gates', r.runId);
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(root, 'lab/runs', r.gate, r.runId + '.json'), path.join(dest, 'receipt.json'));
  const raw = path.resolve(root, r.rawDir);
  if (!raw.startsWith(path.join(root, 'runs') + path.sep)) throw new Error('Unexpected raw path');
  fs.cpSync(raw, path.join(dest, 'raw'), { recursive: true });
  const cleanupFile = path.join(raw, 'datomic-cleanup.json');
  const cleanup = fs.existsSync(cleanupFile) ? read(cleanupFile) : [];
  if (cleanup.some(c => c.status !== 200 || c.body.deleted !== true)) throw new Error('Cleanup failure');
  summaries.push({ runId: r.runId, head: r.git.head, previous: r.previous, verdict: r.verdict, counts: r.counts, deletedDatabases: cleanup.length });
}
const builds = [];
for (const name of fs.readdirSync(dir).filter(name => /^build-[0-9]+\.log$/.test(name)).sort()) {
  const buildLog = fs.readFileSync(path.join(dir, name), 'utf8');
  const buildPath = [...buildLog.matchAll(/"receipt": "([^"]+)"/g)].at(-1)?.[1];
  if (!buildPath) throw new Error(`Build not terminal: ${name}`);
  const build = read(buildPath);
  fs.copyFileSync(buildPath, path.join(dir, name.replace('.log', '-receipt.json')));
  builds.push(build);
}
const build = builds.at(-1);
const container = JSON.parse(execFileSync('docker', ['-H', 'unix:///Users/sam/.colima/triplex2/docker.sock', 'inspect', 'tx2-datomic-dev'], { encoding: 'utf8' }))[0];
if (container.Image !== build.imageId || !container.State.Running) throw new Error('Resident image differs from pin');
fs.writeFileSync(path.join(dir, 'resident-image.json'), JSON.stringify({id: container.Id, image: container.Image, running: container.State.Running, memory: container.HostConfig.Memory, mounts: container.Mounts.map(m => ({type:m.Type, name:m.Name, destination:m.Destination}))}, null, 2) + '\n');
const gatewaySourceSha256 = hash(JSON.stringify(build.sources.gateway));
const health = await (await fetch('http://127.0.0.1:8470/health')).json();
if (health.gatewaySourceHash !== gatewaySourceSha256) throw new Error('Deployed gateway hash differs');
const owner = read('/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json');
if (owner.holder !== 'EXP-DA01') throw new Error('Resident owner changed');
const status = execFileSync(process.execPath, ['lab/bin/engine.mjs', 'status'], { cwd: root, env: { ...process.env, TX2_CONFIG_DIR: root }, encoding: 'utf8' });
fs.writeFileSync(path.join(dir, 'engine-status-final.txt'), status);
const proofs = read(path.join(dir, 'resident-proof.json'));
for (const proof of proofs.proofs) {
  const response = await fetch(`http://127.0.0.1:8470/v1/db/${proof.db}/basis`);
  if (response.status !== 200 || JSON.stringify(await response.json()) !== JSON.stringify(proof.basis)) throw new Error('Retained DA00 database changed');
}
const liveLog = fs.readFileSync(path.join(dir, 'live-final.log'), 'utf8');
if (!/111 passed/.test(liveLog)) throw new Error('Live tests incomplete');
const created = liveLog.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l)).filter(r => r.kind === 'datomic-test-db-created');
const deleted = liveLog.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l)).filter(r => r.kind === 'datomic-test-db-deleted');
if (created.length !== 13 || deleted.length !== 13 || deleted.some(r => !r.deleted) || created.some(c => !deleted.some(d => d.scope === c.scope))) throw new Error('Live scope cleanup incomplete');
const disk = fs.statfsSync(root);
fs.writeFileSync(path.join(dir, 'SUMMARY.json'), JSON.stringify({ format: 'tx2-da01-round2/1', at: new Date().toISOString(), implementationHead: head, gates: summaries, builds: builds.map(b => ({imageId: b.imageId, context: b.context, stagedFiles: b.staged.length, buildInputsSha256: b.buildInputsSha256})), imageId: build.imageId, buildInputsSha256: build.buildInputsSha256, sourceInputsSha256: build.sourceInputsSha256, gatewaySourceSha256, sharedCodecSha256: build.sources.codec.sha256, health, owner, preservation: proofs.proofs, live: { sourceHead: '9a7c837238855fe132b177f5248aba197846efd1', packageTree: packageTree('HEAD'), passed: 111, created: created.length, deleted: deleted.length }, hostFreeBytes: disk.bavail * disk.bsize }, null, 2) + '\n');
console.log(JSON.stringify({ head, gates: summaries, imageId: build.imageId, health }, null, 2));
