// [CX-VCRNS-R2] Why: freeze the expected attempt/plan before applying reviewer mutations.
// Rejected: re-running completeFixture after a mutation (would derive trusted floors from the changed observation).
import { fixture, p4Sequential, ladder, refreshWal, h, clone } from '../fixture.mjs';
import { canonText } from '../../../bin/claim.mjs';
import { completeSegment, readerRows, reseal } from '../../../bin/test/ns-round2-fixture.mjs';

export { fixture, p4Sequential, refreshWal, h, clone, readerRows };

export function positiveP1() {
  const f = fixture(), e = f.raw.events;
  f.trusted.priorities = ['P3', 'P1'];
  e.reads.forEach(r => { r.subject = 'pl:a'; });
  for (const [i, r] of e.reads.slice(0, 30).entries()) {
    Object.assign(r, { sentAtNs: '1001000000', receivedAtNs: '1001100000', splitGroup: `g${i}`, straddledCommandId: 'cmd1' });
    e.reads.push({ ...r, readId: `split-after-${i}`, sentAtNs: '1004000000', receivedAtNs: '1004100000' });
  }
  e.readers = readerRows(e.reads, e.window);
  e.mainSegmentId = 'L256'; e.ladder = ladder();
  Object.assign(e.ladder.find(w => w.id === e.mainSegmentId), { startNs: e.window.startNs, endNs: e.window.endNs, reads: clone(e.reads), readers: clone(e.readers) });
  e.maintenance = [{ atNs: '1500000000' }];
  return f;
}

export const regressions = [
  ['R01', positiveP1, f => { f.raw.events.reads = []; }, 'READS-NOT-ESTIMABLE'],
  ['R02', fixture, f => { f.raw.events.consumer.transactions.at(-1).frontierAfter = '999'; refreshWal(f); }, 'NS-P3-ORDER-VIOLATIONS-MAX'],
  ...['epoch', 'consumer'].map(variant => [`R03-${variant}`, fixture, f => {
    const c = f.raw.events.consumer;
    for (const rows of [c.effects, c.affected, ...c.transactions.flatMap(t => [t.effects, t.affected])]) for (const row of rows) {
      if (variant === 'epoch') row.epoch = 'wrong-epoch';
      else row.consumer = row.subject === 'pl:a' ? 'consumer-a' : 'consumer-b';
    }
    refreshWal(f);
  }, 'CONSUMER-IDENTITY-MISMATCH']),
  ['R04', p4Sequential, f => {
    for (const r of f.raw.events.reads) {
      r.sentAtNs = String(BigInt(r.sentAtNs) + 31536000000000000n);
      r.receivedAtNs = String(BigInt(r.receivedAtNs) + 31536000000000000n);
    }
  }, 'READ-OUTSIDE-WINDOW'],
  ['R05', p4Sequential, f => {
    const [a, b] = f.raw.events.reads;
    b.sentAtNs = a.sentAtNs; b.receivedAtNs = a.receivedAtNs;
  }, 'P4-SINGLE-CLIENT'],
  ['R06', fixture, f => { f.raw.events.crossChecks = []; }, 'CR-CROSSCHECK-MISSING'],
];

export const sweepPlan = Object.freeze({
  startNs: '2000000000', endNs: '102000000000',
  baselineStartNs: '0', baselineEndNs: '1000000000',
  liveReaders: 64, seconds: 100,
});

export function trafficSegment(id, startNs, endNs) {
  const start = BigInt(startNs), end = BigInt(endNs), offers = [];
  for (let at = start; at < end; at += 1000000000n) offers.push({ scheduledAtNs: String(at), ackAtNs: String(at + 1000000n) });
  return completeSegment({ id, level: 64, phase: 'steady', traceSegment: 'frozen-traffic', offerScheduleSha256: h('frozen-traffic-schedule'), startNs, endNs, offers });
}

export function traffic() {
  return {
    baseline: trafficSegment('baseline', sweepPlan.baselineStartNs, sweepPlan.baselineEndNs),
    sweep: trafficSegment('during', sweepPlan.startNs, sweepPlan.endNs),
  };
}

export function firstSecondOnly(segment) {
  const end = String(BigInt(segment.startNs) + 1000000000n);
  segment.reads = segment.reads.filter(r => BigInt(r.receivedAtNs) < BigInt(end));
  segment.offers = segment.offers.filter(o => BigInt(o.scheduledAtNs) < BigInt(end));
  segment.endNs = end;
  segment.readers = readerRows(segment.reads, segment);
}

export function positiveP5() {
  const f = fixture(), e = f.raw.events, t = f.trusted;
  t.priorities = ['P3', 'P5']; t.activationCommandId = 'cmd1';
  t.releaseSha256 = h('frozen-release'); t.commands.cmd1.releaseSha256 = t.releaseSha256;
  const subjects = Array.from({ length: 100000 }, (_, i) => `s${i}`);
  t.subjectListSha256 = h(canonText(subjects));
  t.domainSweep = subject => ({ output: [{ subject }], outbox: [] });
  // [CX-VCRNS-R2] Why: this evaluator callback independently fixes the full 100-second sweep interval.
  // Rejected: verifying the caller's end against itself (would not isolate the auxiliary-window floor).
  t.verifySweepDurability = s => s.startNs === sweepPlan.startNs && s.endNs === sweepPlan.endNs
    && s.durableBracket.U === sweepPlan.endNs && h(canonText(s.subjects)) === t.subjectListSha256;
  e.sweep = {
    startNs: sweepPlan.startNs, endNs: sweepPlan.endNs,
    activationReceipt: { basis: '1', releaseSha256: t.releaseSha256 },
    subjects, outputs: subjects.map(subject => ({ subject })), outbox: [],
    durableBracket: { L: '101999999999', U: sweepPlan.endNs },
  };
  e.sweepTraffic = traffic();
  // Bind the fixture's retained plan preimage into both independently sealed attempts.
  const inputsSha256 = h(canonText({ sweepPlan, subjectListSha256: t.subjectListSha256, minimumSamples: t.minimumSamples }));
  e.window.drainEndNs = '103000000000';
  f.raw.binding.inputsSha256 = inputsSha256; f.raw.binding.attemptId = 'CX-VCRNS-R2-P5'; t.binding = clone(f.raw.binding);
  const cr = JSON.parse(t.crashRun.bundle.payload), ct = { ...t.crashRun.trusted };
  cr.binding.inputsSha256 = inputsSha256; cr.binding.attemptId = 'CX-VCRNS-R2-P5-crash';
  cr.events.faults.forEach(w => { w.binding = clone(cr.binding); });
  ct.binding = clone(cr.binding); t.crashRun = reseal(cr, ct);
  return f;
}
