// [CX-VCRNS-R2] Why: verify terminal content, current source and fresh counterexamples before writing the verdict record.
// Rejected: copying the builder receipt or treating a known failing review regression as a green test run.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { evaluatorIntegrity } from '../../../bin/claim.mjs';
import { h } from './fixtures.mjs';

const root = path.resolve(import.meta.dirname, '../../../..');
const read = file => fs.readFileSync(path.join(import.meta.dirname, file));
// [CX-VCRNS-R2] Why: complete generated contract blobs exceed Node's default 1 MiB child-output buffer.
// Rejected: checking a truncated git blob (the round-1 metadata tool correctly refused that attempt).
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const target = '2cdb3d2f8f52087c87a8492597065143a4598d82';
const start = fs.statSync(path.join(import.meta.dirname, 'evidence/original-suites-attempt1.tap')).birthtimeMs;
const integrity = evaluatorIntegrity(); assert.deepEqual(integrity.problems, []);
const source = fs.readFileSync(path.join(root, 'lab/bin/claim.mjs'));
assert.ok(source.equals(git(['show', `${target}:lab/bin/claim.mjs`])));
const text = source.toString(), a = text.indexOf('// ================================================================ CR-NS offline recomputation'), b = text.indexOf('// ================================================================ CLI', a);
assert.ok(a > 0 && b > a);
assert.equal((text.slice(0, a) + text.slice(b)).replace('import { createHash, createHmac }', 'import { createHash }'), git(['show', '613ad05f:lab/bin/claim.mjs']).toString());
const suites = ['lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs', 'lab/bin/test/claim-ns.test.mjs', 'lab/bin/test/claim-ns-round2.test.mjs', 'lab/verify/CRNS/review.test.mjs', 'lab/verify/CRNS-opus/forgeries.test.mjs'];
for (const file of [...suites, 'lab/bin/test/ns-round2-fixture.mjs', 'lab/verify/CRNS/fixture.mjs']) assert.ok(fs.readFileSync(path.join(root, file)).equals(git(['show', `${target}:${file}`])), file);
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
assert.deepEqual(counts(original), { tests: 213, pass: 213, fail: 0, cancelled: 0, skipped: 0, todo: 0 });
assert.equal(read('evidence/reviewer-attempt1.exit').toString().trim(), '1');
assert.deepEqual(counts(reviewer), { tests: 12, pass: 11, fail: 1, cancelled: 0, skipped: 0, todo: 0 });
assert.deepEqual([...reviewer.matchAll(/^not ok \d+ - CX-VCRNS-R2-(\w+):/gm)].map(m => m[1]), ['N01']);
assert.equal(read('evidence/observe.exit').toString().trim(), '0'); assert.equal(read('evidence/observe.stderr').length, 0);
const observed = JSON.parse(read('evidence/observations.json'));
assert.equal(observed.targetCommit, target); assert.equal(observed.evaluatorSha256, h(source)); assert.equal(observed.evaluatorUnchanged, true);
assert.equal(observed.copiedFixtureSha256, h(fs.readFileSync(path.join(root, 'lab/verify/CRNS/fixture.mjs'))));
for (const [file, hash] of Object.entries(observed.tools)) assert.equal(h(read(file)), hash);
assert.deepEqual(observed.oldFindings.map(x => x.id), ['R01', 'R02', 'R03-epoch', 'R03-consumer', 'R04', 'R05', 'R06']);
for (const finding of observed.oldFindings) {
  assert.equal(finding.positiveStatus, 'RECOMPUTED'); assert.equal(finding.actual.status, 'REFUSED');
  assert.ok(finding.actual.reasons.some(x => x.code === finding.expectedCode)); assert.equal(finding.trustedContextUnchanged, true);
}
const n = observed.N01;
assert.equal(n.trustedContextUnchanged, true); assert.equal(n.planPreimageSha256, n.binding.inputsSha256);
assert.equal(n.full.result.status, 'RECOMPUTED'); assert.equal(n.firstSecondOnly.result.status, 'RECOMPUTED');
assert.deepEqual(n.firstSecondOnly.result.reasons, []); assert.equal(n.firstSecondOnly.result.measurements.P5.traffic.met, true);
assert.equal(n.firstSecondOnly.result.measurements.P5.wallMs, 100000); assert.equal(n.firstSecondOnly.result.bars.P3.met, true);
assert.equal(n.full.coverage.observedSeconds, 100); assert.equal(n.firstSecondOnly.coverage.observedSeconds, 1);
assert.equal(n.firstSecondOnly.coverage.completedReads, 64); assert.equal(n.firstSecondOnly.coverage.writerEvents, 1);
assert.deepEqual(n.firstSecondOnly.coverage.sweep, n.full.coverage.sweep);
assert.equal(n.sameSparseEventsFullWindow.met, false); assert.equal(n.sameSparseEventsFullWindow.reason, 'READER-LEVEL-MISMATCH');
assert.notEqual(n.full.payloadSha256, n.firstSecondOnly.payloadSha256);
const artifacts = fs.readdirSync(path.join(import.meta.dirname, 'evidence')).filter(x => x !== 'verification.json' && x !== 'verification.stderr').map(x => `evidence/${x}`);
for (const file of artifacts) assert.ok(fs.statSync(path.join(import.meta.dirname, file)).mtimeMs >= start, file);
assert.ok(Date.parse(observed.observedAt) >= start);
for (const file of ['fixtures.mjs', 'review.test.mjs']) assert.ok(fs.statSync(path.join(import.meta.dirname, 'evidence/reviewer-attempt1.tap')).mtimeMs >= fs.statSync(path.join(import.meta.dirname, file)).mtimeMs);
const toolFiles = ['fixtures.mjs', 'review.test.mjs', 'observe.mjs', 'record-verification.mjs'];
const receipt = {
  format: 'CX-VCRNS-round2-review/1', recordedAt: new Date().toISOString(), reviewStartFromLogBirthtime: new Date(start).toISOString(),
  verdict: 'FIX-FIRST', oldFindings: 'R01-R06 fixed', newHighFinding: 'N01: P5 self-selected live-workload denominator',
  targetCommit: target, reviewBaseCommit: git(['rev-parse', 'HEAD']).toString().trim(), evaluatorSha256: h(source), evaluatorIntegrity: integrity,
  original: { command: ['node', 'lab/bin/heavy.mjs', '--label', 'CX-VCRNS-round2-original', '--', 'node', '--test', ...suites], exitCode: 0, ...counts(original) },
  reviewer: { command: ['node', '--test', 'lab/verify/CRNS/round2/review.test.mjs'], exitCode: 1, ...counts(reviewer), failedRequiredBehavior: ['N01'] },
  unchanged: { originalEvaluatorCode: true, originalSuiteFiles: true, targetSuiteFiles: true, acceptanceFiles: contracts.length, implementationFiles: true },
  files: Object.fromEntries([...artifacts, ...toolFiles].map(file => [file, h(read(file))])),
  pinnedFilesChangedByReviewer: [], scope: 'Offline synthetic normalized-event QA. No NS acceptance PASS, engine run, or production adapter qualification.',
};
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
