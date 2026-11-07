/** Retained terminal/source/overlap audit only. No SDK, native or settings calls. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { openContext, readState, loadJobManifest } from '../devloop/state.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';
const root = path.resolve(import.meta.dirname, '../..'), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const context = await openContext(root), checked = await verifyAttempt(context, 'qlever-public-string-extension-v6', '0001');
assert.equal(checked.terminal.status, 'failed_oracle'); assert.equal(checked.terminal.cleanup.groupGone, true);
assert.equal(checked.terminalSha256, 'b9c8a9ba8a5690d01678c20d4277f80e32f9ae29e640b4c67fbd57ecb360df6c');
const directory = path.join(root, '.devloop/jobs/qlever-public-string-extension-v6/attempts/0001');
const readJson = async file => JSON.parse(await readFile(file));
const evidence = await readJson(path.join(directory, 'evidence.json'));
assert.deepEqual(Object.fromEntries(evidence.checks.map(row => [row.key, row.passed])), {
  'string-datalog': false, 'string-native': false, 'string-settings': true, 'string-invariants': true, 'string-identity': false,
});
const rowsFile = path.join(root, 'qualification/reviews/qlever-public-string-v6-actual-row-independent.json');
const rows = await readJson(rowsFile); assert.equal(rows.currentDeclaredPins, 3545); assert.deepEqual(rows.drift, []);
assert.equal(rows.logicalTasks['qlever-datalog'].failed, 7); assert.equal(rows.logicalTasks['qlever-native'].failed, 9);
const grant = await readJson(path.join(directory, 'grant.json')), begin = Date.parse(grant.grantedAt), end = Date.parse(checked.terminal.at);
assert(Number.isFinite(begin) && Number.isFinite(end) && end >= begin);
const state = await readState(context), overlaps = [], dispositions = [];
let histories = 0;
for (const [id, job] of Object.entries(state.jobs)) {
  if (!job.attempts.length || id === 'qlever-public-string-extension-v6') continue;
  const manifest = await loadJobManifest(context, job);
  for (const attempt of job.attempts) {
    const started = Date.parse(attempt.grantedAt); if (!Number.isFinite(started)) continue;
    let finished;
    if (attempt.terminalSha256) {
      const bytes = await readFile(path.resolve(root, attempt.directory, 'terminal.json'));
      assert.equal(sha(bytes), attempt.terminalSha256); const terminal = JSON.parse(bytes);
      assert.equal(terminal.manifestSha256, job.manifestSha256); finished = Date.parse(terminal.at);
    } else if (attempt.reconciliationRef) {
      const ref = attempt.reconciliationRef, bytes = await readFile(path.resolve(root, ref.path));
      assert.equal(sha(bytes), ref.sha256); assert.equal(bytes.length, ref.bytes);
      const disposition = JSON.parse(bytes), observation = disposition.observations.find(row => row.jobId === id && row.attemptId === attempt.id);
      assert.equal(disposition.status, 'CONTROLLER_PUBLICATION_FAILED'); assert(observation);
      assert.equal(observation.firstEmptyGroup.processes.length, 0); assert.equal(observation.secondEmptyGroup.processes.length, 0);
      finished = Date.parse(disposition.at); dispositions.push({ jobId: id, attemptId: attempt.id, reference: ref });
    } else if (['granted', 'running', 'cleanup_unknown'].includes(attempt.status)) finished = Infinity;
    else assert.fail(`UNKNOWN_POTENTIAL_INTERVAL:${id}/${attempt.id}`);
    assert(Number.isFinite(finished) || finished === Infinity); histories++;
    if (started < end && finished > begin) overlaps.push({ jobId: id, attemptId: attempt.id, backend: manifest.backend,
      queryPath: manifest.queryPath, start: attempt.grantedAt, end: Number.isFinite(finished) ? new Date(finished).toISOString() : 'UNKNOWN',
      manifestSha256: job.manifestSha256, resources: manifest.resources });
  }
}
assert(!overlaps.some(row => row.backend === 'qlever'), 'OTHER_Q_CANONICAL_RESERVATION_OVERLAPPED_SETTINGS_PACKET');
const report = { format: 'triplex-qlever-string-actual-terminal-independent/1',
  status: 'FAILED_EXTENSION_CONFIRMED_INDEPENDENT_RETENTION_AND_TASK_REVIEW',
  reference: 'qlever-public-string-extension-v6/0001', terminalSha256: checked.terminalSha256,
  terminalStatus: checked.terminal.status, anchors: checked.terminal.outputs.length, retainedBytesUnchanged: true,
  sourcePreimages: checked.sourcePreimages, rowReplay: { path: path.relative(root, rowsFile), sha256: sha(await readFile(rowsFile)) },
  findings: { sdkCallsCompleted: 31, commandsAcknowledged: 3, datalog: { passed: 2, failed: 7 }, native: { passed: 2, failed: 9 },
    allNineBasisCursorHistoryInvariantsPassed: true, settings100To1To100Observed: true,
    nativeRawAndTypedRowsAgree: true, unicodeMembershipPreserved: true, cursorOriginalR: 1000.25,
    nativeAsciiActualAscending: ['A', 'c', 'E', 'z'], originalPageContinuationActual: ['E', 'z'],
    datalogRanges: 'Both empty; retained main query conjoins numeric-family admission with string-family equality',
    identityByteGate: 'FAILED_PRETTY_VS_CANONICAL_FORMAT_ONLY; parsed identity fields equal, old bytes/status unchanged' },
  canonicalIntervals: { ownBegin: grant.grantedAt, ownEnd: checked.terminal.at, historiesChecked: histories,
    completeAttemptOverlaps: overlaps, olderProvenGonePublicationFailures: dispositions,
    scope: 'Admission through anchored terminal or explicit proven-gone disposition; no controller publication-tail/external actor/idle-engine claim' },
  interpretation: ['Observed native ordering/range mismatches and the contradictory Datalog wrapper guard are distinct findings; no single shared cause assumed',
    'Two old common packets/44 gates are not rewritten; this is a new failed semantic extension',
    'No callback/latency/capacity/full configured-entity or whole OS runtime-closure acceptance, no service action or default promotion'],
  reviewerNativeCalls: 0, reviewerWorkerImports: 0,
};
const output = path.join(root, 'qualification/reviews/qlever-public-string-v6-terminal-independent.json');
await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ output: path.relative(root, output), sha256: sha(await readFile(output)), status: report.status,
  histories, overlaps: overlaps.length, otherQOverlaps: 0 }));
