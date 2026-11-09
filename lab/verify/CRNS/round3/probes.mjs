// [CX-VCRNS-R3] Why: keep trusted plan/calibration/callback inputs fixed while mutating supplied P5 observations.
// Rejected: deriving a new sampling plan or durability authority from a candidate's shortened window.
import { nsP5Traffic, canonText } from '../../../bin/claim.mjs';
import { run, sealed } from '../fixture.mjs';
import { positiveP5, traffic, trafficCalibration, firstSecondOnly, sweepPlan, readerRows, h } from '../round2/fixtures.mjs';

export { run, sealed, positiveP5, traffic, trafficCalibration, sweepPlan, h };

export function helper(segments, calibration = trafficCalibration()) {
  return nsP5Traffic(segments, sweepPlan, () => h('correct'), [], calibration);
}
export function keepReaderSeconds(segment, keep) {
  const start = BigInt(segment.startNs);
  segment.reads = segment.reads.filter(r => keep(Number((BigInt(r.receivedAtNs) - start) / 1000000000n)));
  segment.readers = readerRows(segment.reads, segment);
}

export const trafficMutations = [
  ['N01', s => firstSecondOnly(s.sweep), 'P5-TRAFFIC-COVERAGE-SHORT'],
  ['first-and-last-only', s => keepReaderSeconds(s.sweep, second => second === 0 || second === 99), 'READER-LEVEL-MISMATCH'],
  ['one-interior-gap', s => keepReaderSeconds(s.sweep, second => second !== 50), 'READER-LEVEL-MISMATCH'],
  ['no-reads', s => { s.sweep.reads = []; s.sweep.readers = []; }, 'READER-LEVEL-MISMATCH'],
  ['missing-writer', s => { s.sweep.offers.splice(50, 1); }, 'P5-WRITER-COVERAGE-SHORT'],
  ['candidate-sampling-rate', s => {
    keepReaderSeconds(s.sweep, second => second === 0 || second === 99);
    s.sweep.samplingPeriodNs = '100000000000'; s.sweep.samplingRateHz = 0.01;
    s.sweep.observedSeconds = 2; s.sweep.expectedSamples = 2;
    s.sweep.readers.forEach(r => { r.samplingPeriodNs = '100000000000'; });
  }, 'READER-LEVEL-MISMATCH'],
  ['candidate-calibration', s => {
    keepReaderSeconds(s.sweep, second => second === 0 || second === 99);
    s.calibration = { samplingPeriodNs: '100000000000', expectedSamples: 2 };
  }, 'READER-LEVEL-MISMATCH'],
];

export const boundMutations = [
  ['candidate-start', f => {
    const e = f.raw.events, s = e.sweepTraffic.sweep;
    e.sweep.startNs = s.startNs = '101000000000';
    s.reads = s.reads.filter(r => BigInt(r.sentAtNs) >= 101000000000n);
    s.offers = s.offers.filter(o => BigInt(o.scheduledAtNs) >= 101000000000n);
    s.readers = readerRows(s.reads, s);
  }],
  ['candidate-end', f => {
    firstSecondOnly(f.raw.events.sweepTraffic.sweep);
    f.raw.events.sweep.endNs = '3000000000';
    f.raw.events.sweep.durableBracket = { L: '2999999999', U: '3000000000' };
  }],
];

export function integrationObservation(id, mutate) {
  const f = positiveP5(), before = canonText(f.trusted), positive = run(f);
  mutate(f);
  const { bundle, trusted } = sealed(f), result = run(f);
  return {
    id, positiveStatus: positive.status, trustedContextUnchanged: canonText(f.trusted) === before,
    payloadSha256: h(bundle.payload), witnessedHeadSha256: trusted.headSha256,
    suppliedSweep: { startNs: f.raw.events.sweep.startNs, endNs: f.raw.events.sweep.endNs },
    suppliedTraffic: { startNs: f.raw.events.sweepTraffic.sweep.startNs, endNs: f.raw.events.sweepTraffic.sweep.endNs },
    result,
  };
}
