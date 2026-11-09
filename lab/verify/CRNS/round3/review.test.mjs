// [CX-VCRNS-R3] Why: exercise the original regression plus interior holes and untrusted rate/window declarations.
// Rejected: counting REFUSED for an unrelated prerequisite without a valid positive control and exact reason.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonText, nsP5Traffic } from '../../../bin/claim.mjs';
import { attachIndependentCrash, calibration } from '../../../bin/test/ns-round2-fixture.mjs';
import { helper, positiveP5, run, traffic, trafficCalibration, sweepPlan, h, trafficMutations, boundMutations } from './probes.mjs';

test('CX-VCRNS-R3-C01: complete 100-second P5 positive control recomputes', () => {
  const r = run(positiveP5());
  assert.equal(r.status, 'RECOMPUTED', canonText(r));
  assert.equal(r.measurements.P5.wallMs, 100000);
  assert.equal(r.measurements.P5.traffic.met, true);
});

for (const [id, mutate, code] of trafficMutations) test(`CX-VCRNS-R3-${id}: exact floor refuses`, () => {
  const s = traffic(), c = trafficCalibration(), before = canonText(c);
  assert.equal(helper(s, c).met, true, 'complete interval control');
  mutate(s);
  assert.equal(canonText(c), before, 'candidate declaration cannot modify trusted calibration');
  const r = helper(s, c);
  assert.equal(r.met, false);
  assert.equal(r.reason, code);
});

test('CX-VCRNS-R3-N01-integration: original full evaluator regression now refuses specifically', () => {
  const f = positiveP5(), expected = canonText(f.trusted);
  assert.equal(run(f).status, 'RECOMPUTED');
  trafficMutations[0][1](f.raw.events.sweepTraffic);
  assert.equal(canonText(f.trusted), expected);
  const r = run(f);
  assert.equal(r.status, 'REFUSED');
  assert.ok(r.reasons.some(x => x.code === 'P5-LIVE-TRAFFIC-BAR'));
  assert.equal(r.measurements.P5.traffic.reason, 'P5-TRAFFIC-COVERAGE-SHORT');
  assert.notEqual(r.bars.P3.met, true);
});

test('CX-VCRNS-R3-rate-context: missing or non-one-second evaluator rate refuses', () => {
  for (const rate of [undefined, '100000000000', '0', '500000000', 1000000000]) {
    const c = trafficCalibration(); c.samplingPeriodNs = rate;
    const r = helper(traffic(), c);
    assert.equal(r.met, false);
    assert.equal(r.reason, 'P5-SAMPLING-UNBOUND');
  }
});

for (const [id, mutate] of boundMutations) test(`CX-VCRNS-R3-${id}: supplied sweep and traffic bounds cannot override authority`, () => {
  const f = positiveP5(), context = canonText(f.trusted);
  assert.equal(run(f).status, 'RECOMPUTED');
  mutate(f);
  assert.equal(canonText(f.trusted), context);
  assert.equal(f.trusted.verifySweepDurability(f.raw.events.sweep, {}), false, 'independent expected interval rejects candidate bounds');
  const r = run(f);
  assert.equal(r.status, 'REFUSED');
  assert.ok(r.reasons.some(x => x.code === 'P5-DURABILITY-UNBOUND'), canonText(r));
  assert.notEqual(r.bars.P3.met, true);
});

test('CX-VCRNS-R3-unverified-bounds: absent authority cannot judge a candidate sweep interval', () => {
  const f = positiveP5(); delete f.trusted.verifySweepDurability;
  attachIndependentCrash(f);
  const r = run(f);
  assert.equal(r.status, 'REFUSED');
  assert.ok(r.reasons.some(x => x.code === 'P5-DURABILITY-UNBOUND'));
});

test('CX-VCRNS-R3-candidate-output: extra candidate timing fields do not alter the verified window', () => {
  const f = positiveP5();
  f.raw.events.sweep.candidateOutput = { startNs: '101000000000', endNs: '102000000000', samplingPeriodNs: '100000000000' };
  const r = run(f);
  assert.equal(r.status, 'RECOMPUTED', canonText(r));
  assert.equal(r.measurements.P5.wallMs, 100000);
});

test('CX-VCRNS-R3-Poisson: empty writer periods follow the trusted plan, not a new minimum rate', () => {
  const s = traffic();
  const c = calibration(1, 'P5', { traceSegment: 'frozen-traffic', offerScheduleSha256: h('frozen-traffic-schedule'), sweepOfferOffsetsNs: ['0', '99000000000'] });
  s.sweep.offers = s.sweep.offers.filter((_, i) => i === 0 || i === 99);
  assert.equal(nsP5Traffic(s, sweepPlan, () => h('correct'), [], c).met, true);
  s.sweep.offers.pop();
  const r = nsP5Traffic(s, sweepPlan, () => h('correct'), [], c);
  assert.equal(r.met, false); assert.equal(r.reason, 'P5-WRITER-COVERAGE-SHORT');
});
