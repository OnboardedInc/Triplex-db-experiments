import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// [CX-VDF01-R2] Why: load an exact committed gateway snapshot while leaving the reviewed production files untouched.
// Rejected: using the builder's mutable checkout or transplanting production edits onto the reviewer branch.
const root = path.resolve(import.meta.dirname, '../../..');
const name = process.argv[2];
assert.match(name ?? '', /^[a-z0-9-]+$/);
const revision = process.argv[3] ?? '0f6c28c0';
const git = args => execFileSync('git', args, { cwd: root });
const candidate = git(['rev-parse', `${revision}^{commit}`]).toString().trim();
const out = path.join(import.meta.dirname, 'round2', name);
fs.mkdirSync(out, { recursive: false });
const sourceRoot = path.join(out, 'source');
const probeRoot = path.join(out, 'probe');
fs.mkdirSync(probeRoot);
const hash = data => createHash('sha256').update(data).digest('hex');
const sourcePaths = git(['ls-tree', '-r', '--name-only', candidate, '--', 'packages/datomic/gateway/src'])
  .toString().trim().split('\n').filter(p => p.endsWith('.clj'));
sourcePaths.push('packages/datomic/src/codec-spec.json');
const bindings = [];
for (const source of sourcePaths) {
  const bytes = git(['show', `${candidate}:${source}`]);
  const relative = source.endsWith('.clj') ? source.replace('packages/datomic/gateway/src/', '') : 'codec-spec.json';
  const file = path.join(sourceRoot, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
  bindings.push({ source, blob: git(['rev-parse', `${candidate}:${source}`]).toString().trim(),
    copy: path.relative(out, file), sha256: hash(bytes) });
}
const oldProbe = git(['show', 'd4f06d59:lab/verify/DF01/offline_verify.clj']);
assert.equal(hash(oldProbe), hash(fs.readFileSync(path.join(import.meta.dirname, 'offline_verify.clj'))));
fs.writeFileSync(path.join(probeRoot, 'offline_verify.clj'), oldProbe);
fs.copyFileSync(path.join(import.meta.dirname, 'round2_verify.clj'), path.join(probeRoot, 'round2_verify.clj'));
const dist = '/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/extracted/datomic-pro-1.0.7745';
const java = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/jdk-21.0.13+9-jre/Contents/Home/bin/java';
const dependencies = [dist, path.join(dist, 'lib')].flatMap(dir => fs.readdirSync(dir)
  .filter(p => p.endsWith('.jar')).map(p => path.join(dir, p)));
const files = [...bindings.map(b => path.join(out, b.copy)),
  path.join(probeRoot, 'offline_verify.clj'), path.join(probeRoot, 'round2_verify.clj'),
  path.join(import.meta.dirname, 'round2_verify.clj'), import.meta.filename, java,
  path.resolve(path.dirname(java), '../lib/server/libjvm.dylib'), ...dependencies];
const hashes = () => Object.fromEntries(files.map(p => [path.relative(root, p), hash(fs.readFileSync(p))]));
const inputs = hashes();
const locks = '/Users/sam/projects/triplex-db-2/lab/locks/heavy';
const grant = fs.readdirSync(locks).filter(p => /^\d+$/.test(p)).map(p => {
  try { return JSON.parse(fs.readFileSync(path.join(locks, p, 'owner.json'))); } catch { return null; }
}).find(p => p?.pid === process.ppid);
assert.ok(grant, 'Require actual parent heavy grant');
const space = fs.statfsSync(root);
assert.ok(space.bavail * space.bsize > 5 * 1024 ** 3, 'Insufficient disk');
const identity = { kind: 'independent-offline-review-round2', slot: null, candidate,
  reviewerHead: git(['rev-parse', 'HEAD']).toString().trim(), startedAt: new Date().toISOString(),
  parentGrant: grant, availableDiskBytes: space.bavail * space.bsize, bindings, inputs };
fs.writeFileSync(path.join(out, 'inputs.json'), JSON.stringify(identity, null, 2) + '\n');
const cp = [path.join(dist, '*'), path.join(dist, 'lib/*'), path.join(dist, 'resources'), sourceRoot, probeRoot].join(path.delimiter);
const result = spawnSync(java, ['-Xmx256m', `-Dtriplex.codec.spec=${path.join(sourceRoot, 'codec-spec.json')}`,
  '-cp', cp, 'clojure.main', '-m', revision === 'bc8a5edb' ? 'offline-verify' : 'round2-verify'], {
  cwd: root, stdio: 'inherit', timeout: 30000,
  env: { ...process.env, CX_VDF01_OUTPUT: out, DF01_RECORDED_PAGE: path.join(out, 'projected-page.json') },
});
assert.deepEqual(inputs, hashes());
const outputs = ['projected-page.json', 'before-excision.json', 'after-excision.json'];
fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ candidate, slot: null,
  startedAt: identity.startedAt, finishedAt: new Date().toISOString(), code: result.status, signal: result.signal,
  error: result.error?.message ?? null,
  outputs: Object.fromEntries(outputs.filter(p => fs.existsSync(path.join(out, p)))
    .map(p => [p, hash(fs.readFileSync(path.join(out, p)))])),
}, null, 2) + '\n');
process.exitCode = result.status ?? 2;
