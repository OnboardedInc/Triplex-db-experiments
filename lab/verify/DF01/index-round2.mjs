import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// [CX-VDF01-R2] Why: qualify only the source-bound canonical attempt and preserve failed setup/control attempts separately.
// Rejected: treating process exit alone as PASS or overwriting the round-1 evidence index.
const review = import.meta.dirname;
const root = path.resolve(review, '../../..');
const out = path.join(review, 'round2');
const git = args => execFileSync('git', args, { cwd: root });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = process.argv[2] ?? 'candidate-2';
assert.match(canonical, /^candidate-[0-9]+$/);
const attempt = path.join(out, canonical);
const inputs = JSON.parse(fs.readFileSync(path.join(attempt, 'inputs.json')));
const result = JSON.parse(fs.readFileSync(path.join(attempt, 'result.json')));
assert.equal(inputs.candidate, '0f6c28c08daf9d370d2370eca8d152931b0ac512');
assert.equal(result.candidate, inputs.candidate);
assert.equal(result.code, 1);
assert.equal(result.signal, null);
assert.equal(result.error, null);
for (const binding of inputs.bindings) {
  const actual = fs.readFileSync(path.join(attempt, binding.copy));
  assert.equal(sha(actual), binding.sha256);
  assert.deepEqual(actual, git(['show', `${inputs.candidate}:${binding.source}`]));
}
for (const [file, digest] of Object.entries(inputs.inputs)) assert.equal(sha(fs.readFileSync(path.resolve(root, file))), digest);
const log = fs.readFileSync(path.join(out, `${canonical}.log`), 'utf8');
const records = log.split('\n').filter(line => line.startsWith('{"probe":')).map(line => JSON.parse(line));
const counts = records.find(r => r.probe === 'round2-counts')?.observed;
assert.ok(counts);
assert.deepEqual([counts.baseline.test, counts.baseline.pass, counts.originalProbe.test, counts.originalProbe.pass], [10, 52, 6, 119]);
for (const suite of [counts.baseline, counts.originalProbe]) { assert.equal(suite.fail, 0); assert.equal(suite.error, 0); }
assert.equal(counts.edgeCases.test, 4);
assert.equal(counts.edgeCases.pass, 31);
assert.equal(counts.edgeCases.fail, 2);
assert.equal(counts.edgeCases.error, 0);
const failures = log.split('\n').filter(line => line.startsWith('FAIL in '));
assert.equal(failures.length, 2);
for (const line of failures) assert.equal(line,
  'FAIL in (publication-one-millisecond-before-deadline) (round2_verify.clj:109)');
const storm = records.find(r => r.probe === '1000-stale-reports')?.observed;
assert.equal(storm.reports, 1000); assert.ok(storm.burstMs < 10); assert.ok(storm.elapsedMs >= 120);
assert.deepEqual(storm.page, { fromT: '105', nextT: '105', rows: [] });
const edge = records.filter(r => r.probe === 'last-millisecond-publication').map(r => r.observed);
assert.equal(edge.length, 3);
for (const row of edge) {
  assert.deepEqual(row.page.rows.map(r => r.t), ['105']); assert.equal(row.page.nextT, '106');
}
const validWindow = row => row.leadMinMs >= 0.7 && row.leadMaxMs <= 1.3 && row.leadMinMs <= row.leadMaxMs;
assert.equal(edge.filter(validWindow).length, 1);
assert.equal(edge.filter(row => !validWindow(row)).length, failures.length);
const extraLog = fs.readFileSync(path.join(out, 'candidate-3.log'), 'utf8');
const extraRecords = extraLog.split('\n').filter(line => line.startsWith('{"probe":')).map(line => JSON.parse(line));
const extraCounts = extraRecords.find(r => r.probe === 'round2-counts').observed;
assert.deepEqual([extraCounts.baseline.pass, extraCounts.baseline.fail, extraCounts.originalProbe.pass,
  extraCounts.originalProbe.fail, extraCounts.edgeCases.pass, extraCounts.edgeCases.fail], [52, 0, 119, 0, 30, 3]);
const extraFailures = extraLog.split('\n').filter(line => line.startsWith('FAIL in '));
assert.equal(extraFailures.length, 3);
for (const line of extraFailures) assert.equal(line,
  'FAIL in (publication-one-millisecond-before-deadline) (round2_verify.clj:109)');
const extraEdges = extraRecords.filter(r => r.probe === 'last-millisecond-publication').map(r => r.observed);
assert.equal(extraEdges.length, 3);
assert.equal(extraEdges.filter(validWindow).length, 0);
for (const row of extraEdges) { assert.deepEqual(row.page.rows.map(r => r.t), ['105']); assert.equal(row.page.nextT, '106'); }
const extraInputs = JSON.parse(fs.readFileSync(path.join(out, 'candidate-3', 'inputs.json')));
assert.equal(extraInputs.candidate, inputs.candidate);
for (const [file, digest] of Object.entries(extraInputs.inputs)) assert.equal(sha(fs.readFileSync(path.resolve(root, file))), digest);
const controlLog = fs.readFileSync(path.join(out, 'control.log'), 'utf8');
const controlRecords = controlLog.split('\n').filter(line => line.startsWith('{"probe":')).map(line => JSON.parse(line));
const oldF1 = controlRecords.find(r => r.probe === 'delayed-old-report').observed;
assert.deepEqual(oldF1.page, { fromT: '105', nextT: '105', rows: [] });
assert.equal(oldF1.visibleT, 105); assert.ok(oldF1.elapsedMs < 1900);
assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'control', 'result.json'))).code, 1);
const zero = records.find(r => r.probe === 'waitMs-zero').observed;
assert.equal(zero.reads, 2);
assert.deepEqual(zero.empty, { fromT: '105', nextT: '105', rows: [] });
assert.deepEqual(zero.populated.rows.map(r => r.t), ['105']); assert.equal(zero.populated.nextT, '106');
const afterStorm = records.find(r => r.probe === 'storm-then-visible-t105').observed;
assert.deepEqual(afterStorm.page.rows.map(r => r.t), ['105']); assert.equal(afterStorm.page.nextT, '106');
const deadlineResult = JSON.parse(fs.readFileSync(path.join(out, 'deadline-cut-1/result.json')));
const deadlineInputs = JSON.parse(fs.readFileSync(path.join(out, 'deadline-cut-1/inputs.json')));
assert.equal(deadlineResult.candidate, inputs.candidate);
assert.equal(deadlineResult.code, 1); assert.equal(deadlineResult.signal, null); assert.equal(deadlineResult.error, null);
assert.equal(deadlineInputs.candidate, inputs.candidate);
for (const [file, digest] of Object.entries(deadlineInputs.inputs)) assert.equal(sha(fs.readFileSync(path.resolve(root, file))), digest);
const deadlineLog = fs.readFileSync(path.join(out, 'deadline-cut-1.log'), 'utf8');
const deadlineRecord = deadlineLog.split('\n').filter(line => line.startsWith('{"probe":')).map(line => JSON.parse(line))
  .find(row => row.probe === 'predeadline-publication-old-cut').observed;
assert.ok(validWindow(deadlineRecord), 'Counterexample requires a valid predeadline publication, not a timing miss');
assert.deepEqual(deadlineRecord.captures, [100, 100]);
assert.equal(deadlineRecord.visibleT, 105); assert.ok(deadlineRecord.elapsedMs >= 100);
assert.deepEqual(deadlineRecord.page, { fromT: '105', nextT: '105', rows: [] });
const deadlineFailures = deadlineLog.split('\n').filter(line => line.startsWith('FAIL in '));
assert.deepEqual(deadlineFailures, [
  'FAIL in (empty-cut-straddles-deadline-after-predeadline-publication) (deadline_cut_verify.clj:50)',
  'FAIL in (empty-cut-straddles-deadline-after-predeadline-publication) (deadline_cut_verify.clj:51)',
]);
const receiptPath = 'lab/runs/G0/G0-datomic-20261109T081416Z-e9ae93.json';
const receipt = JSON.parse(git(['show', `${inputs.candidate}:${receiptPath}`]));
for (const file of receipt.git.modifiedFiles)
  assert.equal(sha(git(['show', `${inputs.candidate}:${file.path}`])), file.sha256);
const note = { kind: 'round2-review-index', verdict: 'FIX-FIRST', canonical, candidate: inputs.candidate, counts,
  wholeSuitePassed: false, timingWindowFailuresPreserved: failures.length + extraFailures.length,
  validLastMillisecondTrials: edge.filter(validWindow).length, extraCounts, oldF1, storm, edge, extraEdges,
  deadlineCounterexample: deadlineRecord, deadlineContentFailures: deadlineFailures.length,
  builderG0: { path: receiptPath, runId: receipt.runId, reportedCounts: receipt.counts,
    modifiedSourceHashesMatchCandidate: true, independentlyRerun: false },
  indexedAt: new Date().toISOString() };
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(note, null, 2) + '\n');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = [...walk(out).filter(p => !['SHA256SUMS', 'index.log'].includes(path.basename(p))),
  ...['round2_verify.clj', 'run-round2.mjs', 'index-round2.mjs', 'VERIFY-round2.md',
    'deadline_cut_verify.clj', 'run-deadline-cut.mjs'].map(p => path.join(review, p))];
let total = 0;
for (const file of files) {
  assert.equal(fs.lstatSync(file).isSymbolicLink(), false);
  const size = fs.statSync(file).size; assert.ok(size <= 1000000); total += size;
}
assert.ok(total < 5000000);
fs.writeFileSync(path.join(out, 'SHA256SUMS'), files.map(file => `${sha(fs.readFileSync(file))}  ${path.relative(review, file)}`).join('\n') + '\n');
console.log(JSON.stringify({ files: files.length, bytes: total, canonical, counts, allBindingsChecked: true }));
