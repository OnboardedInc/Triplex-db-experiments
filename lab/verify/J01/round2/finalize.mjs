// [CX-VJ01-2] Why: retain full large wire traces losslessly with independently checked digests and read back source/owner identities. Rejected: deleting traces or committing hundreds of MB of repetitive JSON.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
const root = 'lab/verify/J01/round2';
const disk = fs.statfsSync('.');
const diskFreeBytes = disk.bavail * disk.bsize;
assert.ok(diskFreeBytes >= 5 * 1024 ** 3, 'Insufficient disk for a new heavy job');
const sha = b => createHash('sha256').update(b).digest('hex');
const original = JSON.parse(fs.readFileSync(`${root}/source-manifest.json`));
const result = { at: new Date().toISOString(), diskFreeBytes, source: original.sources, sourceCopiesUnchanged: true, owners: {}, checks: {}, compressed: [], files: {}, coreBuild: {} };
for (const [file, expected] of Object.entries(original.files)) assert.equal(sha(fs.readFileSync(file)), expected.sha256, file);
for (const [lane, before] of Object.entries(original.owners)) {
  const afterSha256 = sha(fs.readFileSync(before.path));
  assert.equal(afterSha256, before.sha256);
  result.owners[lane] = { path: before.path, beforeSha256: before.sha256, afterSha256, unchanged: true };
}
for (const file of ['wire', 'answers', 'answers-xtql']) {
  const r = JSON.parse(fs.readFileSync(`${root}/${file}.json`));
  assert.equal(r.cases.length, 22); assert.equal(r.failures.length, 0); assert.equal(r.ownerUnchanged, true);
  if (file === 'answers-xtql') for (const c of r.cases) assert.equal(c.surfaces.xtql.mainError, null);
  if (file === 'answers') for (const c of r.cases) for (const surface of ['query-postgresql', 'query-placeholders', 'submit', 'submit-readback', 'xtdb-sql']) {
    assert.equal(c.surfaces[surface].mainError, null);
    assert.equal(c.surfaces[surface].candidateError, null);
  }
  result.checks[file] = { cases: r.cases.length, equal: r.cases.filter(c => c.equal).length, failures: r.failures };
}
for (const lane of ['xtdb', 'qlever']) {
  const r = JSON.parse(fs.readFileSync(`${root}/frontier-${lane}.json`));
  assert.deepEqual(r.failures, []); assert.equal(r.equivalent, true);
  result.checks[`frontier-${lane}`] = { arms: r.arms.map(a => ({ encoding: a.encoding, stages: a.checks.length, surfaces: Object.keys(a.reads).length })), equivalent: true };
}
const p12 = JSON.parse(fs.readFileSync(`${root}/json-array.json`));
assert.equal(p12.correctJsonArraysWork, true); assert.equal(p12.ownerUnchanged, true);
assert.equal(p12.results.length, 16);
result.checks.jsonGuard = { attempts: 16, correctBinding: p12.results.filter(r => !r.doubleEncoded && r.outcome === r.expected).length, controls: p12.results.filter(r => r.doubleEncoded).map(r => r.outcome) };
const offline = JSON.parse(fs.readFileSync(`${root}/offline.json`));
assert.equal(offline.cases.length, 5); assert.equal(offline.cases.every(c => c.passed), true);
result.checks.offline = offline.cases;
const currentMain = execFileSync('git', ['rev-parse', 'main'], { encoding: 'utf8' }).trim();
assert.equal(execFileSync('git', ['diff', original.sources.main, currentMain, '--', 'packages/xtdb/src', 'packages/qlever/src', 'packages/core/src']).length, 0);
result.mainAtFinalReadback = currentMain;
result.mainBackendAndCoreSourcesIdenticalToBaseline = true;
for (const file of fs.readdirSync('packages/core/dist', { recursive: true }).sort()) {
  const full = path.join('packages/core/dist', file);
  if (fs.statSync(full).isFile()) result.coreBuild[full] = sha(fs.readFileSync(full));
}
// Only these verifier-owned uncompressed copies are removed after full gzip roundtrip verification.
for (const name of ['wire-attempt1.json', 'wire.json']) {
  const file = `${root}/${name}`, raw = fs.readFileSync(file), compressed = gzipSync(raw);
  assert.equal(sha(gunzipSync(compressed)), sha(raw));
  fs.writeFileSync(`${file}.gz`, compressed, { flag: 'wx' });
  result.compressed.push({ path: `${file}.gz`, rawBytes: raw.length, rawSha256: sha(raw), gzipBytes: compressed.length, gzipSha256: sha(compressed) });
  fs.unlinkSync(file);
}
for (const file of fs.readdirSync(root).sort()) {
  const full = `${root}/${file}`;
  if (fs.statSync(full).isFile() && file !== 'final-manifest.json' && file !== 'finalize.log') result.files[full] = { bytes: fs.statSync(full).size, sha256: sha(fs.readFileSync(full)) };
}
fs.writeFileSync(`${root}/final-manifest.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ sourceCopiesUnchanged: result.sourceCopiesUnchanged, owners: result.owners, checks: result.checks, compressed: result.compressed, mainAtFinalReadback: currentMain }, null, 2));
