// [CX-VCRNS] Why: verify retained execution content and source identity before recording the review result.
// Rejected: treating exit zero, fixture flags, or historical TAP alone as a successful independent review.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { evaluatorIntegrity } from '../../bin/claim.mjs';
import { h, repo } from './fixture.mjs';

const dir = import.meta.dirname;
const read = file => fs.readFileSync(path.join(dir, file));
// [CX-VCRNS] Why: generated obligations exceed Node's default 1 MiB capture limit.
// Rejected: treating a truncated git blob as an unchanged-file check (the first tooling attempt stopped instead).
const git = args => execFileSync('git', args, { cwd: repo, maxBuffer: 64 * 1024 * 1024 });
const reviewed = '2f299bfaeadc83ad644ad30e98d915e1c9dcf215';
const parent = '613ad05f';
const startMs = fs.statSync(path.join(dir, 'evidence/original-suites.tap')).birthtimeMs;
assert.ok(startMs > 0);
const integrity = evaluatorIntegrity();
assert.deepEqual(integrity.problems, []);
const claim = fs.readFileSync(path.join(repo, 'lab/bin/claim.mjs'));
assert.ok(claim.equals(git(['show', `${reviewed}:lab/bin/claim.mjs`])));
const text = claim.toString();
const a = text.indexOf('// ================================================================ CR-NS offline recomputation');
const b = text.indexOf('// ================================================================ CLI', a);
assert.ok(a > 0 && b > a);
const oldBehavior = (text.slice(0, a) + text.slice(b)).replace('import { createHash, createHmac }', 'import { createHash }');
assert.equal(oldBehavior, git(['show', `${parent}:lab/bin/claim.mjs`]).toString());
const suitePaths = ['lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs', 'lab/bin/test/claim-ns.test.mjs'];
for (const file of suitePaths) assert.ok(fs.readFileSync(path.join(repo, file)).equals(git(['show', `${reviewed}:${file}`])));
for (const file of suitePaths.slice(0, 2)) assert.ok(git(['show', `${parent}:${file}`]).equals(git(['show', `${reviewed}:${file}`])));
const acceptanceFiles = git(['ls-tree', '-r', '--name-only', reviewed, '--', 'lab/acceptance']).toString().trim().split('\n');
for (const file of acceptanceFiles) assert.ok(fs.readFileSync(path.join(repo, file)).equals(git(['show', `${reviewed}:${file}`])), file);
assert.equal(git(['diff', parent, reviewed, '--', 'lab/acceptance']).length, 0);
const sourceChanges = git(['diff', '--name-only', reviewed]).toString().trim().split('\n').filter(Boolean);
assert.ok(sourceChanges.every(file => file.startsWith('lab/verify/CRNS/')));

const artifacts = ['evidence/original-suites.tap', 'evidence/original-suites.exit', 'evidence/reviewer-attempt3.tap', 'evidence/reviewer-attempt3.exit', 'evidence/observations.json'];
for (const file of artifacts) assert.ok(fs.statSync(path.join(dir, file)).mtimeMs >= startMs, file);
const counts = tap => Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].map(key => {
  const match = tap.match(new RegExp(`^# ${key} (\\d+)$`, 'm')); assert.ok(match, key); return [key, Number(match[1])];
}));
const original = read('evidence/original-suites.tap').toString();
assert.equal(read('evidence/original-suites.exit').toString().trim(), '0');
assert.deepEqual(counts(original), { tests: 145, pass: 145, fail: 0, cancelled: 0, skipped: 0, todo: 0 });
const reviewer = read('evidence/reviewer-attempt3.tap').toString();
assert.equal(read('evidence/reviewer-attempt3.exit').toString().trim(), '1');
assert.deepEqual(counts(reviewer), { tests: 22, pass: 16, fail: 6, cancelled: 0, skipped: 0, todo: 0 });
assert.equal((reviewer.match(/^ok \d+ - CX-VCRNS-C\d+:/gm) ?? []).length, 16);
const failures = [...reviewer.matchAll(/^not ok \d+ - CX-VCRNS-(R\d+):/gm)].map(m => m[1]);
assert.deepEqual(failures, ['R01', 'R02', 'R03', 'R04', 'R05', 'R06']);
for (const file of ['fixture.mjs', 'review.test.mjs']) assert.ok(fs.statSync(path.join(dir, 'evidence/reviewer-attempt3.tap')).mtimeMs >= fs.statSync(path.join(dir, file)).mtimeMs);
const observations = JSON.parse(read('evidence/observations.json'));
assert.equal(observations.reviewedCommit, reviewed);
assert.equal(observations.evaluatorSha256, h(claim));
assert.equal(observations.evaluatorUnchanged, true);
assert.equal(observations.toolSha256, h(read('observe.mjs')));
assert.equal(observations.fixtureSha256, h(read('fixture.mjs')));
assert.ok(Date.parse(observations.observedAt) >= startMs);
assert.deepEqual(observations.observations.map(x => x.id), failures);
for (const o of observations.observations) {
  assert.equal(o.actual.status, 'RECOMPUTED'); assert.deepEqual(o.actual.reasons, []);
  assert.equal(o.binding.attemptId, `CX-VCRNS-${o.id}`);
  assert.match(o.fixturePayloadSha256, /^[a-f0-9]{64}$/);
}
const receipt = {
  format: 'CX-VCRNS-review-verification/1', verifiedAt: new Date().toISOString(), reviewStartFromLogBirthtime: new Date(startMs).toISOString(),
  reviewedCommit: reviewed, reviewWorktreeHeadBeforeCommit: git(['rev-parse', 'HEAD']).toString().trim(),
  verdict: 'FIX-FIRST', evaluatorSha256: h(claim), evaluatorIntegrity: integrity,
  original: { command: ['node', 'lab/bin/heavy.mjs', '--label', 'CX-VCRNS-original', '--', 'node', '--test', ...suitePaths], exit: 0, ...counts(original) },
  reviewer: { command: ['node', '--test', 'lab/verify/CRNS/review.test.mjs'], exit: 1, ...counts(reviewer), requiredBehaviorFailures: failures },
  unchanged: { existingEvaluatorCodeApartFromNewImport: true, originalSuiteFiles: true, reviewedSuiteFiles: true, acceptanceFilesChecked: acceptanceFiles.length, acceptanceComparedWithParent: true },
  files: Object.fromEntries([...artifacts, 'fixture.mjs', 'review.test.mjs', 'observe.mjs', 'record-verification.mjs'].map(file => [file, h(read(file))])),
  pinnedFilesChangedByReviewer: [], scope: 'Offline review observations only; no NS PASS, engine qualification, or implementation fix.',
};
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
