import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { stageDatomicContext, verifiedTree, verifyDatomicContext } from '../../bin/datomic-context.mjs';

// [CX-VDA01] Why: reproduce actual final build inputs twice and check dirty-context rejection without touching engine lifecycle. Rejected: image rebuilds through a privileged side channel.
const out = process.env.DA01_REVIEW_OUTPUT ?? import.meta.dirname;
const scratch = fs.mkdtempSync(path.join(out, 'context-scratch-'));
const hash = x => createHash('sha256').update(x).digest('hex');
const build = JSON.parse(fs.readFileSync(process.env.DA01_BUILD_RECEIPT ?? 'lab/experiments/EXP-DA01/round3/build-2-receipt.json', 'utf8'));
const dist = '/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/extracted/datomic-pro-1.0.7745';
const results = { at: new Date().toISOString(), expectedBuildInputs: build.buildInputsSha256, scratch, checks: [], imageRebuilt: false };
try {
  const config = verifiedTree('lab/config/datomic'), gateway = verifiedTree('packages/datomic/gateway');
  const codec = { path: 'codec-spec.json', bytes: fs.statSync('packages/datomic/src/codec-spec.json').size, sha256: hash(fs.readFileSync('packages/datomic/src/codec-spec.json')) };
  const sources = { config, gateway, codec, sha256: hash(JSON.stringify({ config, gateway, codec })) };
  assert.deepEqual(sources, build.sources);
  const distribution = verifiedTree(dist);
  assert.deepEqual(distribution, build.distribution);
  assert.equal(hash(JSON.stringify({ sources, distribution })), build.buildInputsSha256);
  const inputs = [
    { source: dist, destination: 'datomic', manifest: distribution },
    { source: 'lab/config/datomic', destination: 'config', manifest: config },
    { source: 'packages/datomic/gateway', destination: 'gateway', manifest: gateway },
    { source: 'packages/datomic/src/codec-spec.json', destination: 'gateway/codec-spec.json', manifest: [{ ...codec, path: '' }] },
    { source: 'lab/config/datomic/Dockerfile', destination: 'Dockerfile', manifest: [{ ...config.find(f => f.path === 'Dockerfile'), path: '' }] },
  ];
  const manifests = [];
  for (let i = 0; i < 2; i++) {
    const context = path.join(scratch, `fresh-${i}`);
    const staged = stageDatomicContext(context, inputs);
    for (const name of fs.readdirSync(path.join(context, 'datomic/bin'))) {
      const file = path.join(context, 'datomic/bin', name);
      if (fs.statSync(file).isFile()) fs.chmodSync(file, 0o755);
    }
    assert.deepEqual(verifyDatomicContext(context, staged), build.staged);
    manifests.push(staged);
    assert.throws(() => stageDatomicContext(context, inputs), /EEXIST/);
    const extra = path.join(context, 'datomic/UNVERIFIED-CX-VDA01');
    fs.writeFileSync(extra, 'extra');
    assert.throws(() => verifyDatomicContext(context, staged), /differs/);
    fs.unlinkSync(extra);
    fs.symlinkSync(path.join(context, 'Dockerfile'), extra);
    assert.throws(() => verifyDatomicContext(context, staged), /special path/);
    fs.unlinkSync(extra);
    fs.mkdirSync(extra);
    assert.throws(() => verifyDatomicContext(context, staged), /empty directory/);
    fs.rmdirSync(extra);
    fs.appendFileSync(path.join(context, 'Dockerfile'), '# changed');
    assert.throws(() => verifyDatomicContext(context, staged), /differs/);
    results.checks.push({ context, files: staged.length, manifestSha256: hash(JSON.stringify(staged)), reusedRefused: true, extraFileRefused: true, symlinkRefused: true, emptyDirectoryRefused: true, changedBytesRefused: true });
  }
  assert.deepEqual(manifests[0], manifests[1]);
  fs.writeFileSync(path.join(out, 'context-manifest.json'), JSON.stringify(manifests[0], null, 2) + '\n', { flag: 'wx' });
  results.reproducibleStaging = true;
} finally {
  // [CX-VDA01] Why: scratch copies are task-owned and quiescent; keep hashes and results instead of a second binary distribution. Rejected: deleting original inputs or the builder's contexts.
  fs.rmSync(scratch, { recursive: true, force: true });
  results.scratchRemoved = !fs.existsSync(scratch);
  fs.writeFileSync(path.join(out, 'context-results.json'), JSON.stringify(results, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify(results, null, 2));
