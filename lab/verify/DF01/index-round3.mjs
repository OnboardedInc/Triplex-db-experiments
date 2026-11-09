import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// [CX-VDF01-R3] Why: acceptance requires exact successful content and a valid failing control, not exit status alone.
// Rejected: adopting timing-fixture misses or the builder's historical PASS as fresh independent qualification.
const review = import.meta.dirname;
const root = path.resolve(review, '../../..');
const out = path.join(review, 'round3');
const git = args => execFileSync('git', args, { cwd: root });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const load = name => {
  const attempt = path.join(out, name);
  const input = JSON.parse(fs.readFileSync(path.join(attempt, 'inputs.json')));
  const result = JSON.parse(fs.readFileSync(path.join(attempt, 'result.json')));
  assert.equal(result.candidate, input.candidate);
  assert.equal(result.startedAt, input.startedAt);
  assert.ok(Date.parse(result.finishedAt) > Date.parse(result.startedAt));
  assert.equal(result.slot, null); assert.equal(result.signal, null); assert.equal(result.error, null);
  for (const b of input.bindings) {
    const actual = fs.readFileSync(path.join(attempt, b.copy));
    assert.equal(sha(actual), b.sha256);
    assert.deepEqual(actual, git(['show', `${input.candidate}:${b.source}`]));
  }
  for (const [file, digest] of Object.entries(input.inputs)) assert.equal(sha(fs.readFileSync(path.resolve(root, file))), digest);
  for (const [file, digest] of Object.entries(result.outputs)) assert.equal(sha(fs.readFileSync(path.join(attempt, file))), digest);
  const log = fs.readFileSync(path.join(out, `${name}.log`), 'utf8');
  const records = log.split('\n').filter(line => line.startsWith('{"probe":')).map(line => JSON.parse(line));
  return { input, result, log, records };
};
const candidate = load('candidate-2');
const control = load('control-2');
assert.equal(candidate.input.candidate, '4c72ed2724b42c651c45b6b87ddc43a6d5a2d627');
assert.equal(control.input.candidate, '0f6c28c08daf9d370d2370eca8d152931b0ac512');
assert.equal(candidate.result.code, 0); assert.equal(control.result.code, 1);
const record = (attempt, name) => attempt.records.find(row => row.probe === name)?.observed;
const counts = record(candidate, 'round3-counts');
assert.deepEqual(Object.values(counts).map(s => [s.test, s.pass, s.fail, s.error]),
  [[12, 83, 0, 0], [6, 119, 0, 0], [1, 6, 0, 0], [3, 39, 0, 0]]);
assert.ok(!candidate.log.includes('\nFAIL in ') && !candidate.log.includes('\nERROR in '));
const validWindow = observed => observed.leadMinMs >= 0.7 && observed.leadMaxMs <= 1.3 && observed.leadMinMs <= observed.leadMaxMs;
const deadline = record(candidate, 'predeadline-publication-old-cut');
const oldDeadline = record(control, 'predeadline-publication-old-cut');
assert.ok(validWindow(deadline) && validWindow(oldDeadline));
assert.deepEqual(deadline.captures, [100, 100, 105]);
assert.deepEqual(deadline.page.rows.map(row => row.t), ['105']); assert.equal(deadline.page.nextT, '106');
assert.deepEqual(oldDeadline.captures, [100, 100]); assert.equal(oldDeadline.visibleT, 105);
assert.deepEqual(oldDeadline.page, { fromT: '105', nextT: '105', rows: [] });
assert.deepEqual(control.log.split('\n').filter(line => line.startsWith('FAIL in ')), [
  'FAIL in (empty-cut-straddles-deadline-after-predeadline-publication) (deadline_cut_verify.clj:50)',
  'FAIL in (empty-cut-straddles-deadline-after-predeadline-publication) (deadline_cut_verify.clj:51)',
]);
assert.match(control.log, /Ran 1 tests containing 6 assertions\.\n2 failures, 0 errors\./);
const boundaries = candidate.records.filter(r => r.probe.startsWith('publication-exactly-at-deadline-')).map(r => ({ name: r.probe, ...r.observed }));
assert.equal(boundaries.length, 4);
for (const row of boundaries) {
  assert.equal(row.deadlineNs, 5000000);
  assert.deepEqual(row.rows.map(r => r.t), row.present ? ['105'] : []);
  const oldCut = row.name.endsWith('-old-cut');
  assert.deepEqual(row.captures.map(r => r.at), oldCut || row.present ? [0, 5000000] : [0, 5000000, 5000000]);
  assert.equal(row.arms, oldCut ? 1 : 2);
  assert.deepEqual(row.waits, oldCut ? 0 : [5000000]);
}
const slow = candidate.records.filter(r => r.probe === 'slow-final-route-read').map(r => r.observed);
assert.equal(slow.length, 2);
for (const row of slow) {
  assert.equal(row.waitMs, 20); assert.ok(row.finalReadMs >= 75); assert.ok(row.elapsedMs >= 95);
  assert.deepEqual(row.captures, [100, 100, row.present ? 105 : 100]); assert.equal(row.removed, 1);
  assert.deepEqual(row.page.rows.map(r => r.t), row.present ? ['105'] : []);
  assert.equal(row.page.nextT, row.present ? '106' : '105');
}
const first = load('candidate-1'); const oldFirst = load('control-1');
assert.equal(first.result.code, 1); assert.equal(oldFirst.result.code, 1);
assert.ok(!validWindow(record(first, 'predeadline-publication-old-cut')));
assert.ok(!validWindow(record(oldFirst, 'predeadline-publication-old-cut')));
assert.deepEqual(first.log.split('\n').filter(line => line.startsWith('FAIL in ')), [
  'FAIL in (empty-cut-straddles-deadline-after-predeadline-publication) (deadline_cut_verify.clj:45)',
]);
const receiptPath = 'lab/runs/G0/G0-datomic-20261109T090324Z-69ac4b.json';
const receipt = JSON.parse(git(['show', `${candidate.input.candidate}:${receiptPath}`]));
for (const file of receipt.git.modifiedFiles) assert.equal(sha(git(['show', `${candidate.input.candidate}:${file.path}`])), file.sha256);
const summary = { kind: 'independent-offline-review-round3', verdict: 'ACCEPT-OFFLINE', scope: 'F1 deadline finding only',
  candidate: candidate.input.candidate, canonical: 'candidate-2', control: 'control-2', counts,
  tests: 22, assertions: 247, deadline, oldDeadline, boundaries, slow,
  retainedFirstAttemptFailures: { candidate: 1, control: 3, qualification: 'timing-window miss; not adopted' },
  historicalBuilderG0: { path: receiptPath, reportedCounts: receipt.counts, modifiedSourceHashesMatch: true, independentlyRerun: false },
  indexedAt: new Date().toISOString() };
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = [...walk(out).filter(p => !['SHA256SUMS', 'index.log'].includes(path.basename(p))),
  ...['VERIFY-round3.md', 'round3_verify.clj', 'run-round3.mjs', 'index-round3.mjs'].map(p => path.join(review, p))];
let bytes = 0;
for (const file of files) {
  assert.equal(fs.lstatSync(file).isSymbolicLink(), false);
  const size = fs.statSync(file).size; assert.ok(size <= 1000000); bytes += size;
}
assert.ok(bytes < 5000000);
fs.writeFileSync(path.join(out, 'SHA256SUMS'), files.map(file => `${sha(fs.readFileSync(file))}  ${path.relative(review, file)}`).join('\n') + '\n');
console.log(JSON.stringify({ verdict: summary.verdict, scope: summary.scope, candidate: summary.candidate, files: files.length, bytes, tests: 22, assertions: 247 }));
