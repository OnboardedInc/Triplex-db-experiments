// [CX-VCRNS-R3] Why: record a verdict only after actual terminal tests and content-specific probes agree.
// Rejected: treating a queued command or the builder's historical 257-test receipt as this review's completion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { evaluatorIntegrity } from '../../../bin/claim.mjs';
import { h } from './probes.mjs';

const root = path.resolve(import.meta.dirname, '../../../..');
const read = file => fs.readFileSync(path.join(import.meta.dirname, file));
// [CX-VCRNS-R3] Why: generated contract blobs exceed Node's default child-output limit.
// Rejected: comparing truncated bytes or omitting acceptance-file verification.
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const target = 'cb1178d9d9ed1e45aedf25f3a546fa4a678d53d8';
const started = fs.statSync(path.join(import.meta.dirname, 'evidence/original-suites-attempt1.tap')).birthtimeMs;
const integrity = evaluatorIntegrity(); assert.deepEqual(integrity.problems, []);
const source = fs.readFileSync(path.join(root, 'lab/bin/claim.mjs'));
assert.ok(source.equals(git(['show', `${target}:lab/bin/claim.mjs`])));
const text = source.toString(), a = text.indexOf('// ================================================================ CR-NS offline recomputation'), b = text.indexOf('// ================================================================ CLI', a);
assert.ok(a > 0 && b > a);
assert.equal((text.slice(0, a) + text.slice(b)).replace('import { createHash, createHmac }', 'import { createHash }'), git(['show', '613ad05f:lab/bin/claim.mjs']).toString());
const suites = ['lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs', 'lab/bin/test/claim-ns.test.mjs', 'lab/bin/test/claim-ns-round2.test.mjs', 'lab/bin/test/claim-ns-round3.test.mjs', 'lab/verify/CRNS/review.test.mjs', 'lab/verify/CRNS/round2/review.test.mjs', 'lab/verify/CRNS-opus/forgeries.test.mjs', 'lab/verify/CRNS-opus/forgeries-round2.test.mjs'];
const fixtures = ['lab/bin/test/ns-round2-fixture.mjs', 'lab/verify/CRNS/fixture.mjs', 'lab/verify/CRNS/round2/fixtures.mjs'];
for (const file of [...suites, ...fixtures]) assert.ok(fs.readFileSync(path.join(root, file)).equals(git(['show', `${target}:${file}`])), file);
for (const file of suites.slice(0, 2)) assert.ok(fs.readFileSync(path.join(root, file)).equals(git(['show', `613ad05f:${file}`])));
const contracts = git(['ls-tree', '-r', '--name-only', target, '--', 'lab/acceptance']).toString().trim().split('\n');
for (const file of contracts) assert.ok(fs.readFileSync(path.join(root, file)).equals(git(['show', `${target}:${file}`])), file);
assert.equal(git(['diff', '613ad05f', target, '--', 'lab/acceptance']).length, 0);
assert.equal(git(['diff', target, '--', 'lab/bin', 'lab/acceptance']).length, 0);
const counts = tap => Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].map(key => {
  const m = tap.match(new RegExp(`^# ${key} (\\d+)$`, 'm')); assert.ok(m, key); return [key, Number(m[1])];
}));
const original = read('evidence/original-suites-attempt1.tap').toString(), reviewer = read('evidence/reviewer-attempt1.tap').toString();
assert.equal(read('evidence/original-suites-attempt1.exit').toString().trim(), '0');
assert.deepEqual(counts(original), { tests: 257, pass: 257, fail: 0, cancelled: 0, skipped: 0, todo: 0 });
assert.equal(read('evidence/reviewer-attempt1.exit').toString().trim(), '0');
assert.deepEqual(counts(reviewer), { tests: 15, pass: 15, fail: 0, cancelled: 0, skipped: 0, todo: 0 });
assert.equal((reviewer.match(/^ok \d+ - CX-VCRNS-R3-/gm) ?? []).length, 15);
assert.equal(read('evidence/observe.exit').toString().trim(), '0'); assert.equal(read('evidence/observe.stderr').length, 0);
const observed = JSON.parse(read('evidence/observations.json'));
assert.equal(observed.targetCommit, target); assert.equal(observed.evaluatorSha256, h(source)); assert.equal(observed.evaluatorUnchanged, true);
for (const [file, hash] of Object.entries(observed.toolHashes)) assert.equal(h(read(file)), hash);
for (const [file, hash] of Object.entries(observed.copiedFixtureHashes)) assert.equal(h(read(file)), hash);
assert.equal(observed.trafficProbes.length, 7);
for (const probe of observed.trafficProbes) {
  assert.equal(probe.positive.met, true); assert.equal(probe.contextUnchanged, true);
  assert.equal(probe.actual.met, false); assert.equal(probe.actual.reason, probe.expectedReason);
  assert.match(probe.inputsSha256, /^[a-f0-9]{64}$/);
}
assert.deepEqual(observed.integration.map(x => x.id), ['N01', 'candidate-start', 'candidate-end']);
for (const probe of observed.integration) {
  assert.equal(probe.positiveStatus, 'RECOMPUTED'); assert.equal(probe.trustedContextUnchanged, true);
  assert.equal(probe.result.status, 'REFUSED'); assert.notEqual(probe.result.bars.P3?.met, true);
  assert.ok(probe.result.reasons.some(x => x.code === (probe.id === 'N01' ? 'P5-LIVE-TRAFFIC-BAR' : 'P5-DURABILITY-UNBOUND')));
}
assert.equal(observed.integration[0].result.measurements.P5.traffic.reason, 'P5-TRAFFIC-COVERAGE-SHORT');
const artifacts = fs.readdirSync(path.join(import.meta.dirname, 'evidence')).filter(x => x !== 'verification.json' && x !== 'verification.stderr').map(x => `evidence/${x}`);
for (const file of artifacts) assert.ok(fs.statSync(path.join(import.meta.dirname, file)).mtimeMs >= started, file);
assert.ok(Date.parse(observed.observedAt) >= started);
for (const file of ['probes.mjs', 'review.test.mjs']) assert.ok(fs.statSync(path.join(import.meta.dirname, 'evidence/reviewer-attempt1.tap')).mtimeMs >= fs.statSync(path.join(import.meta.dirname, file)).mtimeMs);
const tools = ['probes.mjs', 'review.test.mjs', 'observe.mjs', 'record-verification.mjs'];
const receipt = {
  format: 'CX-VCRNS-round3-review/1', recordedAt: new Date().toISOString(), reviewStartFromLogBirthtime: new Date(started).toISOString(),
  verdict: 'ACCEPT', scope: 'Scoped offline N01 and window/gap/rate re-review only; no NS admission PASS or production adapter qualification.',
  targetCommit: target, reviewBaseCommit: git(['rev-parse', 'HEAD']).toString().trim(), evaluatorSha256: h(source), evaluatorIntegrity: integrity,
  original: { command: ['node', 'lab/bin/heavy.mjs', '--label', 'CX-VCRNS-round3-original', '--', 'node', '--test', ...suites], exitCode: 0, ...counts(original) },
  reviewer: { command: ['node', '--test', 'lab/verify/CRNS/round3/review.test.mjs'], exitCode: 0, ...counts(reviewer) },
  unchanged: { originalEvaluatorCode: true, originalSuites: true, targetTestsAndFixtures: true, acceptanceFiles: contracts.length, implementationFiles: true },
  files: Object.fromEntries([...artifacts, ...tools].map(file => [file, h(read(file))])),
  pinnedFilesChangedByReviewer: [], residual: 'Production callback must independently establish trusted driver start and observer durable end; synthetic test callback checks exact fixed bounds.',
};
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
