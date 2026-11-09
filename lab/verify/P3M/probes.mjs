// [CX-VP3M] Why: assertions distinguish defect reproduction from acceptance; retain every run.
// Rejected: a success process exit interpreted as native P3 qualification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runP3 } from '../../bench/p3-driver.mjs';
import { auditP3, host } from '../../bench/lib/p3.mjs';
const root = process.env.VP3M_EVIDENCE;
fs.mkdirSync(root, { recursive: true });
const common = { lane: 'qlever', source: 'review-fake', stream: 'review-stream', startToken: '{"after":0}', readerComposition: 'review-source', provider: path.resolve('lab/verify/P3M/provider.mjs'), inputs: [path.resolve('lab/verify/P3M/record-lock.mjs')], offline: true, timeoutMs: 12000, readers: 0 };
const outcomes = [];
const save = () => fs.writeFileSync(path.join(root, 'outcomes.json'), JSON.stringify(outcomes, null, 2));
async function run(name, options = {}, rejection) {
  const dir = path.join(root, name);
  try {
    const r = await runP3({ ...common, ...options, dir });
    assert.equal(rejection, undefined, `Expected rejection: ${name}`);
    outcomes.push({ name, status: r.status, attempt: r.config.attemptDir, measurement: r.measurement });
    save();
    return r;
  } catch (error) {
    outcomes.push({ name, rejected: true, error: error.stack, dir });
    save();
    if (!rejection) throw error;
    assert.match(error.message, rejection);
  }
}
function observations(r) {
  return JSON.parse(fs.readFileSync(path.join(r.config.attemptDir, 'observations.json')));
}
const baseline = await run('baseline-256', { readers: 256 });
assert.equal(baseline.measurement.readerLevel, 256);
assert.deepEqual(baseline.measurement.publishedWithoutAck, ['cmd-2']);
const obs = observations(baseline);
const prefix = JSON.parse(fs.readFileSync(path.join(baseline.config.attemptDir, 'prefix.json')));
const records = host.openPublicationReader(baseline.config.publicationFile);
try {
  const synthetic = structuredClone(obs.consumed);
  synthetic.samples.forEach((s, i) => {
    s.known.atNs = String(BigInt(s.publication.atNs) + BigInt([100, 249, 251, 400][i]) * 1000000n);
    s.lagMs = [100, 249, 251, 400][i];
  });
  const audit = x => auditP3({ config: baseline.config, prefix, ...obs, records, ...x });
  const exact = audit({ consumed: synthetic });
  assert.deepEqual([exact.lag.pooled.p99Ms, exact.lag.steady.p99Ms, exact.lag.burst.p99Ms], [400, 249, 400]);
  outcomes.push({ name: 'exact-arithmetic-only', synthetic: true, lags: synthetic.samples.map(s => s.lagMs), report: exact });
  const duplicate = structuredClone(prefix);
  duplicate.entries.splice(1, 0, structuredClone(duplicate.entries[0]));
  const delivered = structuredClone(obs.consumed);
  delivered.pages = [{ entries: duplicate.entries, cursor: duplicate.cursor }];
  assert.throws(() => audit({ prefix: duplicate, consumed: delivered }), /Repeated source resolution|order violation|Duplicate position/);
  const samePosition = structuredClone(prefix);
  samePosition.entries[1].transactions[0].positions = ['1'];
  samePosition.entries[1].transactions[0].changes[0].position = '1';
  const deliveredPosition = structuredClone(obs.consumed);
  deliveredPosition.pages = [{ entries: samePosition.entries, cursor: samePosition.cursor }];
  assert.throws(() => audit({ prefix: samePosition, consumed: deliveredPosition }), /Duplicate position/);
  assert.throws(() => audit({ readers: obs.readers.slice(1) }), /Reader label/);
  outcomes.push({ name: 'audit-mutations', duplicateResolutionRejected: true, duplicatePositionRejected: true, missingReaderRejected: true });
} finally { records.close(); }
await run('delivery-hole', { deliveryHole: true }, /gap|mismatch/);
await run('duplicate-source-position', { duplicatePosition: true }, /different publication|Duplicate position/);
await run('phantom-ack', { phantomAck: true }, /ACK not/);
await run('missing-instant', { missingInstant: true }, /Missing source publication/);
await run('reader-error', { readers: 256, readerError: true }, /planted reader failure/);
await run('reader-early-exit', { readers: 256, readerExit: true }, /exited without clean result/);
await run('reader-permanent-stall', { readers: 256, readerHang: true, timeoutMs: 2000 }, /exited without clean result/);
const stall = await run('reader-stall-only', { readers: 256, readerDelayMs: 500 });
assert.equal(stall.measurement.readerLevel, 256);
const sr = observations(stall).readers;
outcomes.push({ name: 'reader-stall-observation', windowMs: Number(BigInt(stall.config.windowEndNs) - BigInt(stall.config.windowStartNs)) / 1e6, minCompleted: Math.min(...sr.map(r => r.completed)), maxCompleted: Math.max(...sr.map(r => r.completed)), explanation: 'Pending closed-loop reads span the window; this does not assert reader goodput.' });
const delays = await run('real-delivery-delay', { deliveryDelayMs: [100, 249, 251, 400], writerPauseMs: 450 });
const delaySamples = observations(delays).consumed.samples.map(s => s.lagMs);
assert.ok(delaySamples.every((lag, i) => lag >= [100, 249, 251, 400][i] - 2));
outcomes.push({ name: 'real-delivery-delay-observation', injectedMs: [100, 249, 251, 400], measuredMs: delaySamples, note: 'Real lag includes polling, scheduling and durability; exact arithmetic tested separately.' });
const late = await run('late-source-record', { lateRecordMs: 400, readers: 256 });
const ls = observations(late).consumed.samples;
const truth = JSON.parse(fs.readFileSync(path.join(late.config.attemptDir, 'review-source.json'))).truth;
const actual = ls.map(s => Number(BigInt(s.known.atNs) - BigInt(truth.find(t => t.key.position === s.known.position).actualAtNs)) / 1e6);
assert.ok(actual.every(ms => ms >= 400));
assert.ok(ls.every((s, i) => actual[i] - s.lagMs >= 390));
outcomes.push({ name: 'late-source-record-observation', measuredMs: ls.map(s => s.lagMs), actualPublicationToKnownMs: actual, lagWithin250ms: late.measurement.lagWithin250ms, note: 'Provider event-placement trust boundary; origin binding alone cannot detect a late first capture.' });
const locked = await run('slow-publication-record', { recordLockMs: 400, readers: 256 });
const lockSamples = observations(locked).consumed.samples.map(s => s.lagMs);
assert.ok(lockSamples.every(ms => ms >= 390));
assert.equal(locked.measurement.lagWithin250ms, false);
outcomes.push({ name: 'slow-publication-record-observation', lockMs: 400, measuredMs: lockSamples, note: 'Timely first capture includes a real delayed sidecar write.' });
const omitted = await run('common-prefix-omission', { commonOmission: true });
assert.equal(omitted.measurement.coverage.positions, 3);
outcomes.push({ name: 'common-prefix-omission-observation', actualPublishedPositions: 4, accountedPositions: omitted.measurement.coverage.positions, note: 'An incorrect trusted source enumerator and delivery omit the same lost-ACK position. Sparse offsets are valid; no density assumption is legitimate.' });
save();
console.log(JSON.stringify(outcomes, null, 2));
