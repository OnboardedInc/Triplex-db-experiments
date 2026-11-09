// [CX-VCRNS-R2] Why: test repaired content checks independently, then require full-window evidence on P5.
// Rejected: trusting the builder's pass count or marking the newly failing requirement TODO.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonText, nsP5Traffic } from '../../../bin/claim.mjs';
import { run, sealed } from '../fixture.mjs';
import { regressions, fixture, positiveP5, traffic, firstSecondOnly, sweepPlan, h } from './fixtures.mjs';

for (const [id, make, mutate, code] of regressions) test(`CX-VCRNS-R2-${id}: refusal is content-specific after a valid control`, () => {
  const f = make();
  assert.equal(run(f).status, 'RECOMPUTED', `${id} positive control`);
  const context = canonText(f.trusted), binding = canonText(f.raw.binding);
  mutate(f);
  assert.equal(canonText(f.trusted), context, 'mutation cannot repair the trusted context');
  assert.equal(canonText(f.raw.binding), binding, 'mutation cannot select another run identity');
  const r = run(f);
  assert.equal(r.status, 'REFUSED');
  assert.ok(r.reasons.some(x => x.code === code), canonText(r));
  assert.notEqual(r.bars.P3?.met, true);
});

test('CX-VCRNS-R2-C01: missing raw streams and decoder/configuration floors refuse', () => {
  for (const field of ['offers', 'reads', 'source', 'sourceBrackets', 'consumerBrackets', 'consumer', 'faults', 'readers', 'window', 'noise', 'crossChecks']) {
    const f = fixture(); delete f.raw.events[field];
    assert.equal(run(f).status, 'REFUSED', field);
  }
  for (const field of ['normalizeSource', 'normalizeWal', 'minimumSamples', 'consumerId', 'epochs', 'roles', 'maxBracketWidthNs', 'commands', 'crashRun']) {
    const f = fixture(); delete f.trusted[field];
    assert.equal(run(f).status, 'REFUSED', field);
  }
});

test('CX-VCRNS-R2-C02: full P5 live interval meets the arithmetic control', () => {
  const f = positiveP5(), r = run(f);
  assert.equal(r.status, 'RECOMPUTED', canonText(r));
  assert.equal(r.measurements.P5.wallMs, 100000);
  assert.equal(r.measurements.P5.traffic.met, true);
});

test('CX-VCRNS-R2-C03: missing 99 seconds is detected when the full interval is used', () => {
  const s = traffic(); firstSecondOnly(s.sweep); s.sweep.endNs = sweepPlan.endNs;
  const r = nsP5Traffic(s, sweepPlan, () => h('correct'), []);
  assert.equal(r.met, false);
  assert.equal(r.reason, 'READER-LEVEL-MISMATCH');
});

test('CX-VCRNS-R2-C04: fully empty P5 live read/writer streams cannot meet the floor', () => {
  for (const field of ['reads', 'offers', 'readers']) {
    const s = traffic(); s.sweep[field] = [];
    assert.equal(nsP5Traffic(s, sweepPlan, () => h('correct'), []).met, false, field);
  }
});

test('CX-VCRNS-R2-N01: P5 must refuse live evidence for only one second of a pinned 100-second sweep', () => {
  const f = positiveP5();
  const originalContext = f.trusted, bound = canonText(f.trusted), originalHead = sealed(f).trusted.headSha256;
  firstSecondOnly(f.raw.events.sweepTraffic.sweep);
  assert.strictEqual(f.trusted, originalContext);
  assert.equal(canonText(f.trusted), bound);
  assert.notEqual(sealed(f).trusted.headSha256, originalHead, 'retained filtered observations get a new witnessed head, not a forged old envelope');
  const r = run(f);
  assert.equal(r.status, 'REFUSED', '99 seconds of live traffic are absent, yet a self-selected one-second denominator can pass');
});
