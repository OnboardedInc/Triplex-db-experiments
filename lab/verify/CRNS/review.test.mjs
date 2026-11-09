// [CX-VCRNS] Why: assert the required evaluator behavior on fresh, authenticated fixture mutations.
// Rejected: accepting RECOMPUTED as proof of safety (the counterexamples below expose missing content checks).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nsNearestRank, nsP1Ladder, nsConsumerCounts, nsFeedEntryBytes, recomputeNS, nsP5Traffic, nsControlRecord } from '../../bin/claim.mjs';
import { fixture, sealed, run, codes, clone, h, ladder, segment, p1, p4, p4Sequential } from './fixture.mjs';


test('CX-VCRNS-C01: positive P3 fixture still recomputes', () => {
  assert.equal(run(fixture()).status, 'RECOMPUTED');
});

test('CX-VCRNS-C02: exact nearest rank for n=1..151, all percentiles, ties and huge integers', () => {
  for (let n = 1; n <= 151; n++) for (const tied of [false, true]) {
    const sorted = Array.from({ length: n }, (_, i) => 2n ** 100n + BigInt(tied ? Math.floor(i / 3) : i));
    for (let p = 1; p <= 100; p++) assert.equal(nsNearestRank([...sorted].reverse(), p), sorted[Math.ceil(n * p / 100) - 1]);
  }
  assert.equal(nsNearestRank([2n, Infinity], 99), Infinity);
  assert.equal(nsNearestRank([], 99), null);
});

test('CX-VCRNS-C03: atomic row reordering is range consistent, WAL transaction reordering is refused', () => {
  const f = fixture();
  for (const tx of f.raw.events.consumer.transactions) { tx.effects.reverse(); tx.affected.reverse(); }
  assert.equal(run(f).status, 'RECOMPUTED');
  f.raw.events.consumer.transactions.reverse();
  assert.ok(codes(run(f)).includes('NS-P3-ORDER-VIOLATIONS-MAX'));
  const g = fixture(), c = g.raw.events.consumer;
  c.transactions = [{ committed: true, frontierBefore: '0', frontierAfter: '2', effects: [...c.effects].reverse(), affected: [...c.affected].reverse(), deliveries: [...c.deliveries].reverse(), deleted: { effects: [], affected: [], deliveries: [] } }];
  assert.equal(run(g).status, 'RECOMPUTED');
  assert.equal(nsConsumerCounts(c.transactions, '0').orderViolations, 0);
});

test('CX-VCRNS-C04: candidate timestamps and filtered lag summary do not affect observer-derived quantiles', () => {
  const f = fixture(), expected = run(f).measurements.P3;
  f.raw.events.summary = { p99Ms: 0, samples: [0] };
  f.raw.events.lagSamples = [0];
  f.raw.events.source.entries[0].transactions[0].stamp = { candidatePublicationAtNs: '3999999999' };
  f.raw.events.offers[0].receipt.stamp = clone(f.raw.events.source.entries[0].transactions[0].stamp);
  for (const tx of f.raw.events.consumer.transactions) for (const d of tx.deliveries) d.digest = h(nsFeedEntryBytes(f.raw.events.source.entries.find(e => e.offset === d.offset)));
  f.raw.events.consumer.deliveries = f.raw.events.consumer.transactions.flatMap(t => t.deliveries);
  assert.deepEqual(run(f).measurements.P3, expected);
});

test('CX-VCRNS-C05: evaluator digest rejects candidate encoding even after authentic resealing', () => {
  const f = fixture();
  for (const d of [f.raw.events.consumer.deliveries[0], f.raw.events.consumer.transactions[0].deliveries[0]]) d.digest = h('candidate-computed-other-encoding');
  assert.ok(codes(run(f)).includes('NS-P3-GAPS-MAX'));
});

test('CX-VCRNS-C06: deleting one consumer lag observation cannot filter the p99 sample', () => {
  const f = fixture(); f.raw.events.consumerBrackets.pop();
  const r = run(f);
  assert.equal(r.status, 'REFUSED');
  assert.ok(codes(r).includes('NS-P3-EVERY-POSITION-ACCOUNTED'));
  assert.equal(r.measurements.P3.lag.pooled.count, 2);
  assert.equal(r.measurements.P3.lag.pooled.p99Ms, Infinity);
});

test('CX-VCRNS-C07: reader declaration cannot replace measured E8 and relay agreement', () => {
  for (const mutate of [e => { e.readers = []; }, e => { for (const r of e.readers) r.loops.fill(0); }, e => { e.readers[0].relayConcurrent = 0; }]) {
    const f = fixture(); mutate(f.raw.events); f.raw.events.readerCount = 256;
    assert.ok(codes(run(f)).includes('READER-LEVEL-MISMATCH'));
  }
});

test('CX-VCRNS-C08: missing event stream properties refuse', () => {
  for (const name of ['offers', 'reads', 'source', 'sourceBrackets', 'consumerBrackets', 'consumer', 'faults', 'readers', 'window', 'crossChecks']) {
    const f = fixture(); delete f.raw.events[name]; assert.equal(run(f).status, 'REFUSED', name);
  }
});

test('CX-VCRNS-C09: empty essential P3 source, WAL and observation streams refuse', () => {
  for (const mutate of [e => { e.source.entries = []; }, e => { e.consumer.transactions = []; }, e => { e.sourceBrackets = []; }, e => { e.consumerBrackets = []; }, e => { e.consumer.deliveries = []; }, e => { e.consumer.effects = []; }, e => { e.consumer.affected = []; }]) {
    const f = fixture(); mutate(f.raw.events); assert.equal(run(f).status, 'REFUSED');
  }
});

test('CX-VCRNS-C10: HMAC/head bindings are evaluator-owned, not candidate declarations', () => {
  const s = sealed(fixture());
  s.bundle.payload = s.bundle.payload.replace('observer-bracket', 'PublicationClock');
  assert.ok(codes(recomputeNS(s.bundle, s.trusted)).includes('OBS-UNAUTHENTICATED'));
});

test('CX-VCRNS-C11: empty main P1 reads are allowed today (observation control for R01)', () => {
  assert.equal(p1().raw.events.reads.length, 0);
  assert.equal(nsP1Ladder(ladder(), () => h('correct'), []).met, true);
});

test('CX-VCRNS-C12: exact 250ms boundary and enormous monotonic origins', () => {
  for (const ns of [249000000n, 250000000n, 250000001n]) {
    const f = fixture();
    for (let i = 0; i < 2; i++) {
      const upper = BigInt(f.raw.events.sourceBrackets[i].L) + ns;
      Object.assign(f.raw.events.consumerBrackets[i], { U: String(upper), L: String(upper - 1000000n) });
    }
    const expected = run(f);
    assert.equal(expected.bars.P3.lag, ns <= 250000000n);
    const shift = value => {
      if (Array.isArray(value)) return value.map(shift);
      if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k,
        typeof v === 'string' && (k.endsWith('Ns') || k === 'L' || k === 'U') ? String(BigInt(v) + 2n ** 100n) : shift(v),
      ]));
      return value;
    };
    f.raw.events = shift(f.raw.events);
    assert.deepEqual(run(f), expected);
  }
});

test('CX-VCRNS-C13: empty auxiliary P1 writer, P4 history and P5 traffic samples refuse or fail their bar', () => {
  const windows = ladder(); windows[0].offers = [];
  assert.equal(nsP1Ladder(windows, () => h('correct'), []).met, false);
  const f = p4(); f.raw.events.historyPulls = [];
  assert.ok(codes(run(f)).includes('P4-HISTORY-NOT-VERIFIED'));
  for (const name of ['reads', 'offers']) {
    const traffic = { baseline: segment(), sweep: segment() };
    traffic.sweep[name] = [];
    assert.equal(nsP5Traffic(traffic).met, false);
  }
  const g = fixture();
  Object.assign(g.trusted, { priorities: ['P3', 'P5'], commandValid: () => true, ryow: () => true, replayRead: () => h('correct') });
  assert.ok(codes(run(g)).includes('P5-RAW-EVENTS-MISSING'));
});

test('CX-VCRNS-C14: no lag samples leave timing unjudged instead of passing a null quantile', () => {
  const f = fixture();
  for (const b of f.raw.events.sourceBrackets) b.L = '0';
  const r = run(f);
  assert.equal(r.status, 'REFUSED');
  assert.equal(r.bars.P3.lag, null);
  assert.ok(codes(r).includes('TIMING-UNJUDGED'));
});

test('CX-VCRNS-C15: A0 rung record remains pending and cannot turn comparative mismatch into acceptance', () => {
  const binding = fixture().raw.binding;
  const control = { kind: 'absolute', candidateRung: 100000, a0Rung: 10000, a0Fits: false, binding, measuredBinding: clone(binding), grade: 'GREEN', aaGrade: 'GREEN' };
  assert.equal(nsControlRecord(control).admission, 'PENDING-CONTRACT');
  assert.throws(() => nsControlRecord({ ...control, kind: 'promotion', paired: true }), /CONTROL-UNMATCHED/);
});

test('CX-VCRNS-C16: sequential, in-window single-client P4 events meet arithmetic bars', () => {
  const r = run(p4Sequential());
  assert.equal(r.status, 'RECOMPUTED');
  assert.equal(r.measurements.P4.pullsPerSecondPerCore, 1100);
});

// [CX-VCRNS] Why: keep required-behavior assertions failing until a separate builder fixes the evaluator.
// Rejected: tests asserting the current unsafe result (would make a green suite look like evaluator acceptance).
test('CX-VCRNS-R01: requested P1 must refuse an empty main E2 stream', () => {
  const r = run(p1());
  assert.equal(r.status, 'REFUSED', `empty reads yielded goodput=${r.measurements.P1.goodput}, p99=${r.measurements.P1.latency.p99Ms}`);
});

test('CX-VCRNS-R02: P3 must reject a checkpoint beyond the observed source prefix', () => {
  const f = fixture(); f.raw.events.consumer.transactions[1].frontierAfter = '999';
  assert.equal(run(f).status, 'REFUSED', 'source ends at 2; checkpoint 999 would skip future positions on resume');
});

test('CX-VCRNS-R03: P3 must not pool different consumer/epoch keys into one correct affected set', () => {
  const statuses = ['epoch', 'consumer'].map(variant => {
    const f = fixture();
    for (const rows of [f.raw.events.consumer.effects, f.raw.events.consumer.affected, ...f.raw.events.consumer.transactions.flatMap(t => [t.effects, t.affected])]) for (const row of rows) {
      if (variant === 'epoch') row.epoch = 'wrong-epoch';
      else row.consumer = row.subject === 'pl:a' ? 'consumer-a' : 'consumer-b';
    }
    return run(f).status;
  });
  assert.deepEqual(statuses, ['REFUSED', 'REFUSED'], 'wrong epoch alone and split consumer identities alone must each refuse');
});

test('CX-VCRNS-R04: P4 must refuse pulls wholly outside its throughput measurement window', () => {
  const f = p4Sequential(31536000000000000n);
  assert.equal(run(f).status, 'REFUSED', 'reads a year later still claim 1100 pulls/s/core for the two-second window');
});

test('CX-VCRNS-R05: P4 single client must not count 2200 overlapping requests as a closed loop', () => {
  assert.equal(run(p4()).status, 'REFUSED', 'one loop label does not prove sequential single-client requests');
});

test('CX-VCRNS-R06: source/consumer CR cross-checks cannot be silently omitted', () => {
  const f = fixture();
  f.raw.events.crossChecks = f.raw.events.sourceBrackets.flatMap(s => [
    { role: 'source', position: s.position, atNs: s.L },
    { role: 'consumer', position: s.position, atNs: f.raw.events.consumerBrackets.find(c => c.position === s.position).U },
  ]);
  f.raw.events.crossChecks[0].atNs = '3999999999';
  assert.ok(codes(run(f)).includes('CR-INCONSISTENT'));
  f.raw.events.crossChecks = [];
  assert.equal(run(f).status, 'REFUSED', 'removing all inconsistent CR evidence must refuse instead of recomputing');
});
