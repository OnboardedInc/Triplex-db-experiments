/** Independent retained-answer/provenance review, with no backend calls.
 * Packet expectations come from the immutable-event corpus, not native helper
 * code. Historical missing preimages remain partial reconstruction; a passing
 * byte/answer review never upgrades an unpublished or failed attempt.
 * Inspiration/rationale: wiki/problems/controller-state-growth.md.
 */
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { hashFile, json, ownedPath, readJson } from '../devloop/io.mjs';
import { loadJobManifest, openContext, readState } from '../devloop/state.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';

const root = resolve(import.meta.dirname, '../..'), [reference, output] = process.argv.slice(2);
assert(reference && output?.startsWith('qualification/reviews/'));
const [jobId, attemptId] = reference.split('/'), context = await openContext(root);
const checked = await verifyAttempt(context, jobId, attemptId);
assert.equal(checked.terminal.status, 'completed_verified_bytes');
const state = await readState(context), job = state.jobs[jobId], attempt = job.attempts.find(entry => entry.id === attemptId);
const manifest = await loadJobManifest(context, job);
assert(manifest.queryPath.endsWith('-native'));
const directory = await ownedPath(root, attempt.directory);
for (const entry of checked.terminal.outputs) assert.equal((await fs.stat(await ownedPath(directory, entry.path))).size, entry.bytes);
const oracleInput = manifest.inputs.find(input => input.role === 'oracle' && input.path === 'qualification/workloads/temporal-workloads.json');
assert(oracleInput); assert.equal(await hashFile(await ownedPath(root, oracleInput.path)), oracleInput.sha256);
const packet = await readJson(join(root, oracleInput.path)), report = await readJson(join(directory, 'artifacts/report.json'));
const actual = await readJson(join(directory, 'artifacts/results.json'));
assert.equal(report.queryPath, manifest.queryPath); assert.equal(report.status, 'PASS_FUNCTIONAL_ONLY');
assert.equal(report.packetSha256, oracleInput.sha256);
assert.equal(report.caseExecutions, 142); assert.equal(report.passedCaseExecutions, 142); assert.equal(report.unexecutedCaseExecutions, 0);
assert.equal(report.workloads.length, 20); assert.equal(actual.cases.length, 142);
const expected = new Map(), observed = new Set(), rawCases = new Map();
const canonicalRows = rows => [...new Set(rows.map(row => JSON.stringify(row)))].sort();
let nativeTraceCount = 0;
const taskBases = [];
for (const workload of packet.workloads) for (const entry of workload.cases) for (const reopen of [false, true]) expected.set(`${workload.id}/${entry.id}/${reopen}`, canonicalRows(entry.expected_rows));
assert.equal(expected.size, 142);
for (const workload of report.workloads) {
  const positions = new Set(workload.groups.map(group => group.actualPosition));
  assert(workload.groups.every(group => group.commandId && Number.isSafeInteger(group.actualPosition) && Number.isFinite(group.acknowledgedMs)));
  for (const entry of workload.cases) {
    const key = `${entry.logicalTaskId}/${entry.reopen}`;
    assert.equal(entry.status, 'PASS'); assert(expected.has(key) && !rawCases.has(key));
    assert.deepEqual(canonicalRows(entry.actualRows), expected.get(key)); rawCases.set(key, entry);
    assert(Array.isArray(entry.queryTrace) && entry.queryTrace.length > 0);
    nativeTraceCount += entry.queryTrace.length;
    const basis = entry.queryTrace.filter(trace => trace.basis).map(trace => trace.basis);
    for (const cut of basis) {
      assert.equal(cut.scope, workload.scope);
      if (cut.recordedPosition !== undefined) assert(cut.recordedPosition === 0 || positions.has(cut.recordedPosition));
    }
    taskBases.push({ logicalTaskId: entry.logicalTaskId, reopen: entry.reopen, nativeCalls: entry.queryTrace.length, recordedPositions: [...new Set(basis.map(cut => cut.recordedPosition).filter(value => value !== undefined))] });
  }
}
for (const entry of actual.cases) {
  const key = `${entry.logicalTaskId}/${entry.reopen}`;
  assert(expected.has(key) && !observed.has(key)); observed.add(key);
  assert.deepEqual(canonicalRows(entry.rows), expected.get(key));
  assert.deepEqual(canonicalRows(entry.rows), canonicalRows(rawCases.get(key).actualRows));
}
assert.equal(observed.size, 142); assert.equal(rawCases.size, 142);
const expectedBytes = manifest.evidence.checks.find(check => check.actual === 'artifacts/results.json');
assert(expectedBytes); const expectedPin = manifest.inputs.find(input => input.path === expectedBytes.expectedInput && input.role === 'oracle');
const resultSha256 = await hashFile(join(directory, 'artifacts/results.json'));
assert.equal(resultSha256, expectedPin.sha256); assert.equal(await hashFile(await ownedPath(root, expectedPin.path)), expectedPin.sha256);
const receipt = { format: 'triplex-independent-final-native-packet-review/1', at: new Date().toISOString(), reviewer: 'duckdb-independent-verifier', author: manifest.author, reference, status: 'PASS_PUBLISHED_ANSWER_AND_PROVENANCE_REVIEW', terminalSha256: checked.terminalSha256, manifestSha256: job.manifestSha256, packetSha256: oracleInput.sha256, resultSha256, reportSha256: await hashFile(join(directory, 'artifacts/report.json')), sourcePreimages: checked.sourcePreimages, cases: observed.size, workloadFamilies: 20, nativeTraceCount, taskBases, checks: ['Published terminal anchor and every retained output hash/length', 'All142 current/reopen answers independently matched to immutable packet rows', 'Raw public report rows match deterministic result artifact with no omitted or duplicate tasks', 'Actual native call traces and scope/recorded-position provenance retained', 'Pinned independent oracle byte digest matches actual result bytes'], limitations: ['Read-only independent artifact review, not a new engine execution', 'Quiescent packet cut observations do not prove concurrent multi-call source isolation', 'Historical preimage gaps are not retrofilled; no calibrated load, all-ten-goal, or target-scale acceptance inferred'] };
await fs.writeFile(await ownedPath(root, output), json(receipt), { flag: 'wx' });
console.log(json({ output, reference, status: receipt.status, cases: receipt.cases, nativeTraceCount, sourceScope: receipt.sourcePreimages.historicalScope }));
