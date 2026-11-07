/** Read-only independent bit/result/source review. Old failed evidence is kept;
 * copied preimages let this compare the real v1/v2 code without guessing old
 * working-tree bytes. No assertion store, engine or performance is qualified.
 */
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { hashFile, json, ownedPath, readJson } from '../devloop/io.mjs';
import { loadJobManifest, openContext, readState } from '../devloop/state.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';
import { nativeEvidenceValue } from '../../packages/core/dist/runtime/index.js';

const root = resolve(import.meta.dirname, '../..'), context = await openContext(root), state = await readState(context);
const bits = number => { const buffer = Buffer.alloc(8); buffer.writeDoubleBE(number); return buffer.toString('hex'); };
const payloads = new Map([['negative-zero', -0], ['positive-zero', 0], ['minimum-positive', Number.MIN_VALUE], ['minimum-negative', -Number.MIN_VALUE], ['adjacent-to-tenth', 0.10000000000000002], ['largest-safe-number', Number.MAX_SAFE_INTEGER]]);
const receipts = {}, snapshots = {};
for (const version of ['v1', 'v2']) {
  const id = 'xtdb-native-f64-parameters-' + version, checked = await verifyAttempt(context, id, '0001'), job = state.jobs[id], manifest = await loadJobManifest(context, job), directory = join(root, job.attempts[0].directory);
  assert.equal(checked.terminal.status, version === 'v1' ? 'failed_oracle' : 'completed_verified_bytes');
  const report = await readJson(join(directory, 'artifacts/report.json')), checks = await readJson(join(directory, 'artifacts/checks.json'));
  assert.equal(report.applicationWrites, 0); assert.equal(report.observations.length, 24); assert.equal(report.controls.length, 10);
  const seen = new Set(), failures = [];
  for (const entry of report.observations) {
    const match = /^(current|reopened)\/(sql|xtql)\/parameter\/(.*)$/.exec(entry.id); assert(match && payloads.has(match[3]) && !seen.has(entry.id)); seen.add(entry.id);
    const expected = bits(payloads.get(match[3])), negative = match[3] === 'negative-zero';
    assert.equal(entry.expectedBits, expected); assert.equal(entry.input.binary64, expected); assert.equal(entry.builderInput.binary64, expected);
    assert.equal(entry.input.nativeType, 'number'); assert.equal(entry.builderInput.nativeType, 'number'); assert.equal(entry.typedResult.nativeType, 'number');
    const observed = version === 'v1' && negative ? bits(0) : expected;
    assert.equal(entry.typedResult.binary64, observed);
    const check = checks.cases.find(check => check.id === entry.id); assert(check); assert.equal(check.expectedBits, expected); assert.equal(check.actualBits, observed);
    assert.equal(entry.status, version === 'v1' && negative ? 'FAIL' : 'PASS'); assert.equal(check.status, entry.status);
    if (entry.status !== 'PASS') failures.push(entry.id);
    if (negative && version === 'v1') {
      assert.equal(entry.rawResult.nativeType, 'string'); assert.equal(entry.rawResult.display, '0');
      assert.equal(entry.traceParameterObservations[0].binary64, expected); // Observed before JSON erased its sign.
    }
    if (negative && version === 'v2') {
      assert.equal(entry.rawResult.nativeType, 'number'); assert.equal(entry.rawResult.binary64, expected);
      assert.deepEqual(entry.trace.parameters[0], { type: 'float64', bits: expected });
      assert.deepEqual(entry.trace.steps.find(step => step.phase === 'answer').parameters[0], { type: 'float64', bits: expected });
      assert.equal(entry.traceParameterObservations[0].nativeType, 'object'); // Evidence tag is separate from driver/result numbers.
    }
    if (!negative) assert.equal(bits(entry.trace.parameters[0]), expected);
  }
  assert.equal(seen.size, 24); assert.equal(failures.length, version === 'v1' ? 4 : 0);
  for (const entry of report.controls) {
    assert.equal(entry.status, 'EXECUTED');
    const expected = bits(entry.id.includes('negative-zero') ? -0 : 0);
    assert.equal(entry.typedResult.nativeType, 'number'); assert.equal(entry.typedResult.binary64, expected);
    assert.equal(entry.rawResult.nativeType, 'number'); assert.equal(entry.rawResult.binary64, expected);
  }
  const snapshot = await readJson(join(root, job.sourcePreimages.path)); snapshots[version] = snapshot;
  const oracle = manifest.inputs.find(input => input.path === manifest.evidence.checks[0].expectedInput);
  if (version === 'v2') assert.equal(await hashFile(join(directory, 'artifacts/checks.json')), oracle.sha256);
  receipts[version] = { reference: id + '/0001', status: checked.terminal.status, terminalSha256: checked.terminalSha256, reportSha256: await hashFile(join(directory, 'artifacts/report.json')), checksSha256: await hashFile(join(directory, 'artifacts/checks.json')), numericCases: seen.size, independentlyCheckedControls: 10, negativeZeroRawAndTypedPaths: 4, failedIds: failures, sourcePreimages: checked.sourcePreimages };
}
const changes = [];
for (const path of ['packages/xtdb/src/XtdbClient.ts', 'packages/core/src/native/NativeQuery.ts', 'packages/xtdb/src/native/NativeQueries.ts']) {
  const before = snapshots.v1.inputs.find(entry => entry.path === path), after = snapshots.v2.inputs.find(entry => entry.path === path); assert(before && after);
  assert.equal(await hashFile(await ownedPath(root, path)), after.sha256);
  const text = await fs.readFile(await ownedPath(root, after.object.path), 'utf8');
  if (path.endsWith('XtdbClient.ts')) assert(text.includes('Object.is(value, -0)') && text.includes('Number.isSafeInteger(value) && !negativeZero') && text.includes('negativeZero ? "-0.0"'));
  if (path.endsWith('NativeQuery.ts')) assert(text.includes('return { type: "float64", bits: "8000000000000000" }'));
  if (path.endsWith('NativeQueries.ts')) {
    assert.equal(before.sha256, after.sha256);
    assert(text.includes('client.query(query, native.parameters') && text.includes('parameters: native.parameters.map(nativeEvidenceValue)'));
  }
  changes.push({ path, beforeSha256: before.sha256, afterSha256: after.sha256, changed: before.sha256 !== after.sha256 });
}
const original = { negative: -0, positive: 0, ordinary: 1.25 }, evidence = nativeEvidenceValue(original);
assert(Object.is(original.negative, -0)); assert(Object.is(original.positive, 0));
assert.deepEqual(evidence, { negative: { type: 'float64', bits: '8000000000000000' }, positive: 0, ordinary: 1.25 });
const entry = await verifyAttempt(context, 'xtdb-native-entry-f64-v2', '0001'), entryJob = state.jobs['xtdb-native-entry-f64-v2'], entryDirectory = join(root, entryJob.attempts[0].directory), report = await readJson(join(entryDirectory, 'artifacts/report.json'));
assert.equal(entry.terminal.status, 'completed_verified_bytes'); assert.equal(report.passedChecks, 13); assert.equal(report.checks.length, 13); assert(report.checks.every(check => check.status === 'PASS')); assert.deepEqual(report.changedFiles, []); assert.deepEqual(report.sourceHashesBefore, report.sourceHashesAfter);
assert.equal(report.checks.find(check => check.id === 'current/typed-xtql-fractional-cut').observation.rows[0].counter.value, '9223372036854775807');
assert.equal(report.checks.find(check => check.id === 'reopened/typed-xtql-fractional-cut').observation.rows[0].counter.value, '9223372036854775807');
for (const [id, path] of [['xtdb-native-f64-parameters-v2', 'qualification/evidence/xtdb-native-f64-parameters-v2-integrity.json'], ['xtdb-native-entry-f64-v2', 'qualification/evidence/xtdb-native-entry-f64-v2-integrity.json']]) {
  const authored = await readJson(join(root, path)), actual = id.includes('parameters') ? receipts.v2.terminalSha256 : entry.terminalSha256;
  assert.equal(authored.terminalSha256, actual);
}
const result = { format: 'triplex-independent-signed-zero-review/1', at: new Date().toISOString(), reviewer: 'duckdb-independent-verifier', status: 'PASS_SCOPED_REPAIR_REVIEW_OLD_FAILURE_PRESERVED', receipts, sourceChanges: changes, evidenceCarrier: 'Native numbers still reach the driver and typed decoder. Only trace/evidence -0 is JSON-safe bit-tagged; +0 and ordinary finite values stay unchanged.', unchangedNativeEntry: { reference: 'xtdb-native-entry-f64-v2/0001', terminalSha256: entry.terminalSha256, passedChecks: 13, exactMaximumInt64CurrentAndReopened: true, sourcePreimages: entry.sourcePreimages }, limitations: ['Read-only source/artifact review, not independent backend execution', 'Numeric probe performs no application writes; no stored-fact signed-zero loss or repair established', 'Six finite values do not qualify the full binary64 domain, load, target scale or all10 goals'] };
const output = await ownedPath(root, 'qualification/reviews/xtdb-signed-zero-v2-independent.json');
await fs.writeFile(output, json(result), { flag: 'wx' });
console.log(json({ output, status: result.status, numericCases: 24, controls: 10, oldFailures: 4, fixedNegativeZeroPaths: 4, entryChecks: 13 }));
