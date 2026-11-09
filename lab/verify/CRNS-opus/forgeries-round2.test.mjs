import { completeFixture, completeSegment, readerRows, frozenFixtureTrace, attachIndependentCrash, historyCalibration, calibration } from '../../bin/test/ns-round2-fixture.mjs';
// Opus round 2 re-review of recomputeNS at 2cdb3d2f: variants that keep each high finding's intent and dodge its fix,
// plus attacks the round 2 fixes introduce. Fixture helpers copied from forgeries.test.mjs as committed at 2cdb3d2f.
// Original header follows. (exp/CRNS-recompute at 2f299bfa). Run: node --test lab/verify/CRNS-opus/
// Each forgery test asserts the behaviour a sound evaluator needs (REFUSED). Forgeries the code currently accepts are
// were preserved unchanged at 255bf136; round 2 now makes every forgery a required regression.
// The fixture is written independently of lab/bin/test/claim-ns.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { recomputeNS, canonText, NS_ENCODING_SHA256, nsFeedEntryBytes, nsP1Ladder, nsP4History, nsP5Traffic, nsCommandSha256 } from '../../bin/claim.mjs';

const H = s => createHash('sha256').update(s).digest('hex');
const KEY = 'opus-review-key';
const MS = 1_000_000n;
const START = 1_000_000_000n, END = 2_000_000_000n, DRAIN = 3_000_000_000n;
const t = x => String(x);
const BANDS = ['5-10', '11-25', '26-50'];
const CLOCK = { bootId: 'boot', timeNamespace: 'ns', clock: 'CLOCK_MONOTONIC' };
const BINDING = { attemptId: 'att', sourceSha256: H('src'), slot: 'slot', inputsSha256: H('in') };
const DRIVER = { imageId: 'img', bundleSha256: H('b'), generatorSha256: H('g') };

function seal(raw) {
  const payload = canonText(raw), previousSha256 = '0'.repeat(64);
  const bytes = canonText({ previousSha256, payload });
  const chunk = { previousSha256, payload, sha256: H(bytes), hmac: createHmac('sha256', KEY).update(bytes).digest('hex') };
  return { bundle: { payload, hmac: createHmac('sha256', KEY).update(payload).digest('hex'), chunks: [chunk] }, head: chunk.sha256 };
}

/**
 * commits: [{cmds, subjects, pos?, sL?, sU?, cL?, cU?}] in offset order. Times are ms after the command slot.
 * offers: default one per first-seen command, receipt to its first commit, ACK 4 ms after schedule.
 */
function world({ commits, offers, priorities = ['P3'], mutate } = {}) {
  const frozen=frozenFixtureTrace('opus');
  commits ??= [0, 1, 2].map(i => ({ cmds: [`c${i}`], subjects: [`s${i}`] }));
  const entries = [], sourceBrackets = [], consumerBrackets = [], txs = [], effects = [], affected = [], deliveries = [];
  const firstCommit = new Map();
  commits.forEach((c, i) => {
    const pos = c.pos ?? t(i + 1), base = START + BigInt(i) * 100n * MS + 10n * MS;
    const tx = { stamp: `st${i}`, positions: [pos], txIds: [`tx${i}`], operationId: `op${i}`, commandIds: c.cmds,
      changes: c.subjects.map((s, j) => ({ op: 'assert', entity: s, attribute: 'a', validFrom: '0', validTo: '9', position: pos, assertionId: `as${i}.${j}` })) };
    const entry = { stream: 'feed', epoch: '1', offset: t(i + 1), kind: 'commit', transactions: [tx] };
    entries.push(entry);
    for (const id of c.cmds) if (!firstCommit.has(id)) firstCommit.set(id, { pos, tx, base });
    const sL = base + BigInt(c.sL ?? 2) * MS, sU = base + BigInt(c.sU ?? 3) * MS;
    sourceBrackets.push({ position: pos, L: t(sL), U: t(sU) });
    if (c.cU !== null) consumerBrackets.push({ position: pos, L: t(base + BigInt(c.cL ?? 5) * MS), U: t(base + BigInt(c.cU ?? 6) * MS) });
    c.digest = H(nsFeedEntryBytes(entry)); c.pos = pos; c.offset = t(i + 1);
  });
  // consumer applies positions in cursor order, not offset order
  const byPos = [...commits].sort((a, b) => (BigInt(a.pos) < BigInt(b.pos) ? -1 : 1));
  let frontier = '0';
  for (const c of byPos) {
    const rows = (c.rowSubjects ?? c.subjects).map(s => ({ consumer: 'k1', epoch: '1', position: c.pos, subject: s }));
    const d = [{ offset: c.offset, digest: c.digest }];
    txs.push({ committed: true, frontierBefore: frontier, frontierAfter: c.pos, effects: rows, affected: rows.map(r => ({ ...r })), deliveries: d, deleted: { effects: [], affected: [], deliveries: [] } });
    effects.push(...rows); affected.push(...rows.map(r => ({ ...r }))); deliveries.push(...d); frontier = c.pos;
  }
  offers ??= [...firstCommit].map(([id, { pos, tx, base }], i) => ({ commandId: id, subject: `s${i}`, sizeBand: BANDS[i % 3],
    scheduledAtNs: t(base), sentAtNs: t(base), ackAtNs: t(base + 4n * MS), receipt: { position: pos, txId: tx.txIds[0], commandIds: tx.commandIds, stamp: tx.stamp } }));
  const raw = { format: 'ns-events/1', binding: BINDING, driver: DRIVER, events: {
    clockDomain: CLOCK, clockDomains: [CLOCK], lagStart: 'observer-bracket',
    window: { startNs: t(START), endNs: t(END), drainEndNs: t(DRAIN), bursts: [] },
    source: { origin: 'observer-source-store', firstOffset: '1', finalOffset: t(entries.length), entries },
    sourceBrackets, consumerBrackets,
    consumer: { initialFrontier: '0', walComplete: true, tailedWalHex: 'aa', finalWalHex: 'aabb', transactions: txs, effects, affected, deliveries },
    offers, reads: [], faults: [], readers: [{ second: 0, loops: [0], relayConcurrent: 1 }], crossChecks: [], noise: { grade: 'GREEN' },
  } };
  const trusted = { key: KEY, binding: BINDING, driver: DRIVER, encodingSha256: NS_ENCODING_SHA256, clockDomain: CLOCK, readerLevel: 1, priorities,
    domainAffected: ({ transaction }) => [...new Set(transaction.changes.map(c => c.entity))],
    gradeWindow: () => 'GREEN', verifySource: () => true, commandValid: () => true, ryow: () => true, steadyRate: 100 };
  completeFixture({raw,trusted},frozen);
  mutate?.(raw.events, trusted);
  return { raw, trusted };
}
function run({ raw, trusted }) { const { bundle, head } = seal(raw); return recomputeNS(bundle, { ...trusted, headSha256: head }); }
const codes = r => r.reasons.map(x => x.code);
const refused = (r, msg) => assert.equal(r.status, 'REFUSED', `${msg}; accepted with ${JSON.stringify(r.bars)}`);

// ------------------------------------------------------------------ P1 ladder (O10, O11, O24, O29)
function ladder({ hopsSecond = false, recoveryIds = true, baseWriterMs = 4 } = {}) {
  const levels = [0, 1, 4, 16, 64, 256, 1024];
  const windows = []; let at = 10_000_000_000n;
  const mk = (level, extra = {}) => {
    const s = at; at += 2_000_000_000n;
    const wms = level === 0 ? baseWriterMs : 4;
    const reads = [{ loop: 0, subject: 'p', shape: 'pull-current', requestedBasis: '1', echoedBasis: '1', hops: 3, sentAtNs: t(s + MS), receivedAtNs: t(s + 2n * MS), answerSha256: H('p@1/hops3') }];
    if (hopsSecond) reads.push({ ...reads[0], hops: 6, sentAtNs: t(s + 3n * MS), receivedAtNs: t(s + 4n * MS), answerSha256: H('p@1/hops3') });
    return { id: `w${level}${extra.recoveryOf ? 'r' : ''}`, level, phase: 'steady', traceSegment: 'seg', offerScheduleSha256: H('sched'), startNs: t(s), endNs: t(s + 1_000_000_000n), reads,
      offers: [{ commandId: 'x', scheduledAtNs: t(s + MS), sentAtNs: t(s + MS), ackAtNs: t(s + MS + BigInt(wms) * MS) }], ...extra };
  };
  for (const l of levels) windows.push(mk(l));
  const w1024 = windows.at(-1);
  if (!recoveryIds) { delete w1024.id; }
  windows.push(mk(256, recoveryIds ? { recoveryOf: w1024.id } : {}));
  if (!recoveryIds) { delete windows.at(-1).recoveryOf; delete windows.at(-1).id; }
  for (const w of windows) {
    const old = w.reads; completeSegment(w, H('p@1/hops3'));
    w.reads.forEach(r => { r.subject = 'p'; r.shape = 'pull-current'; r.hops = 3; });
    if (hopsSecond) w.reads.push({...w.reads[0],readId:w.id+'-hops6',hops:6,sentAtNs:String(BigInt(w.startNs)+900000000n),receivedAtNs:String(BigInt(w.startNs)+901000000n)});
  }
  return windows;
}
const replayRead = read => H(`p@${read.requestedBasis}/hops${read.hops}`);
// ================================================================== round 2 helpers
import { completeSegment as seg64, reseal } from '../../bin/test/ns-round2-fixture.mjs';
const refresh = w => { completeFixture(w); return w; }; // refresh retained synthetic bytes only; immutable trace pins persist          // re-derive fixture floors after a planted change
const offerOf = (w, id) => w.raw.events.offers.find(o => o.commandId === id);
const accepted = (r, msg) => assert.equal(r.status, 'REFUSED', `${msg}; RECOMPUTED with bars ${JSON.stringify(r.bars.P3)}`);
function crashCompanion(w, witness) {
  const { raw, trusted: tr } = w, c = raw.events.consumer, e = raw.events;
  const cr = structuredClone(raw); cr.binding.attemptId += '-crash2'; cr.events.faults = [];
  let k = 0;
  for (const point of ['before-effect', 'after-effect', 'after-checkpoint']) for (let rep = 0; rep < 3; rep++) {
    const events = [{ transition: 'cgroup-gone', t: '0', k: k++ }];
    cr.events.faults.push({ format: 'fault-witness/1', binding: cr.binding, faultPointId: point, events, eventsSha256: H(canonText(events)), ...witness(c, e) });
  }
  const ct = { ...tr, binding: cr.binding }; delete ct.crashRun;
  tr.crashRun = reseal(cr, ct);
}

test('C0 round 2 baseline is RECOMPUTED with resume and met', () => {
  const r = run(world({ priorities: ['P3', 'P2'] }));
  assert.equal(r.status, 'RECOMPUTED', JSON.stringify(r.reasons)); assert.equal(r.bars.P3.met, true);
});

// ------------------------------------------------------------------ O7/O8 variant: resume witness not bound to the crash
test('V-O7 crash companion whose 9 witnesses crash at t=0 (before any traffic) and all cite one 1-transaction range is refused', () => {
  const w = world();
  crashCompanion(w, (c, e) => ({ beforeTransaction: -1, recoveryTransaction: 0, checkpointOffset: null, recoveryOffset: e.source.entries[0].offset, replay: structuredClone(c.transactions[0].deliveries) }));
  const r = run(w);
  assert.equal(r.bars.P3.resume, false);
  accepted(r, 'resume from crashes that hit an idle consumer');
});

// ------------------------------------------------------------------ O6/O12 variant: readers that do no real work
test('V-O6 P3 only: 4 reader loops whose every answer is wrong satisfy "lag with readers running"', () => {
  const w = world(); w.trusted.readerLevel = 4; refresh(w);
  for (const r of w.raw.events.reads) { r.answerSha256 = H('garbage'); r.echoedBasis = '999'; }
  accepted(run(w), 'readers answered garbage');
});
test('V-O6c P3 only: publication deferred past window end is invisible when the lag minimum is below the in-window count', () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'] }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'], sL: 1500, sU: 1501, cL: 1502, cU: 1503 }] });
  const o = offerOf(w, 'c2'); o.ackAtNs = t(BigInt(o.scheduledAtNs) + 1502n * MS); refresh(w);
  w.trusted.minimumSamples.lag = 2;
  accepted(run(w), 'c2 published 1.5 s late, outside the lag window');
});
test('V-O6c control: same deferral with lag minimum = commit count is refused LAG-SAMPLES-SHORT', () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'] }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'], sL: 1500, sU: 1501, cL: 1502, cU: 1503 }] });
  const o = offerOf(w, 'c2'); o.ackAtNs = t(BigInt(o.scheduledAtNs) + 1502n * MS); refresh(w);
  assert.ok(codes(run(w)).includes('LAG-SAMPLES-SHORT'));
});

// ------------------------------------------------------------------ O2 variants
test('V-O2 an oracle-invalid command (kind invalid) that the candidate commits and ACKs is refused', () => {
  const w = world({ priorities: ['P3', 'P2'] });
  w.trusted.commandValid = o => o.commandId !== 'c1'; offerOf(w, 'c1').kind = 'invalid'; refresh(w);
  accepted(run(w), 'invalid c1 committed');
});
test('V-O2b P2: a command published before it was offered (pre-applied frozen trace) gets ~0 ms latency and is refused', () => {
  const w = world({ priorities: ['P3', 'P2'] });
  const o = offerOf(w, 'c0'), b = w.raw.events.sourceBrackets[0], cb = w.raw.events.consumerBrackets[0];
  const sched = BigInt(o.scheduledAtNs);
  Object.assign(b, { L: t(sched - 9n * MS), U: t(sched - 8n * MS) }); Object.assign(cb, { L: t(sched - 7n * MS), U: t(sched - 6n * MS) });
  o.ackAtNs = t(sched + MS / 10n); refresh(w);
  const r = run(w);
  assert.ok(r.measurements.P2.latency['5-10'].p99Ms < 1);
  accepted(r, 'commit published 9 ms before its offer');
});

// ------------------------------------------------------------------ O3 variant
test('V-O3 a kind=duplicate retry answered with a typed error (unique eventId) is refused IDEMPOTENCY-RECEIPT-MISMATCH', () => {
  const w = world({ priorities: ['P3', 'P2'] });
  const o = offerOf(w, 'c0'), d = structuredClone(o); delete d.receipt; Object.assign(d, { eventId: 'dup-0', kind: 'duplicate', typedError: { code: 'DUPLICATE' } });
  w.raw.events.offers.push(d);
  assert.ok(codes(run(w)).includes('IDEMPOTENCY-RECEIPT-MISMATCH'));
});

// ------------------------------------------------------------------ O1 variant
test('V-O1 a duplicate signal offered under a fresh commandId commits twice (same subject, same attribute) and is refused', () => {
  const w = world({ priorities: ['P3', 'P2'], commits: [{ cmds: ['c0'], subjects: ['s0'] }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }, { cmds: ['c0dup'], subjects: ['s0'] }] });
  offerOf(w, 'c0dup').kind = 'duplicate'; refresh(w);
  accepted(run(w), 'duplicate applied twice');
});

// ------------------------------------------------------------------ O4 variant
test('V-O4 duplicate effect under a whitespace-variant consumer label is refused CONSUMER-IDENTITY-MISMATCH', () => {
  const w = world(); const tx = w.raw.events.consumer.transactions[0]; const dup = { ...tx.effects[0], consumer: 'k1 ' }; tx.effects.push(dup); w.raw.events.consumer.effects.push({ ...dup });
  assert.ok(codes(run(w)).includes('CONSUMER-IDENTITY-MISMATCH'));
});

// ------------------------------------------------------------------ O5/O17 variant: content matches, per-subject order differs
test('V-O5/O17 two in-flight commands for one subject commit in reverse of their offer order', () => {
  const w = world({ commits: [{ cmds: ['c1'], subjects: ['s0'] }, { cmds: ['c0'], subjects: ['s0'] }, { cmds: ['c2'], subjects: ['s2'] }] });
  const c0 = offerOf(w, 'c0'), c1 = offerOf(w, 'c1');
  c0.subject = c1.subject = 's0';
  const early = BigInt(c1.scheduledAtNs) - MS; c0.scheduledAtNs = c0.sentAtNs = t(early);
  refresh(w);
  accepted(run(w), 'c0 offered first, c1 committed first');
});

// ------------------------------------------------------------------ O10 variant: basis form
test('V-O10 a decimal-string basis against coordinate-object positions gives the oracle an empty prefix', () => {
  const pos = { stream: 'feed', epoch: '1', offset: '1', ordinal: '0' };
  const prefix = [{ stream: 'feed', epoch: '1', offset: '1', kind: 'commit', transactions: [{ stamp: 's', positions: [pos], txIds: ['t'], operationId: 'o', commandIds: ['c'], changes: [] }] }];
  const seen = [];
  assert.throws(()=>nsP1Ladder(ladder(), (read,p)=>{seen.push(p.length);return replayRead(read);},prefix), /BASIS-FORM-MISMATCH/); assert.equal(seen.length,0);
});

// ------------------------------------------------------------------ O13 variant: stale history answers
test('V-O13 depth-10 pulls answered with the depth-1 answer are refused P4-HISTORY-ANSWER-MISMATCH', () => {
  const pulls = [];
  for (const depth of [1, 3, 10]) for (let i = 0; i < 1000; i++) pulls.push({ readId: `h${depth}-${i}`, depth, subject: `s${i}`, shape: 'pull-current', requestedBasis: String(depth), echoedBasis: String(depth), sentAtNs: '0', receivedAtNs: t(MS), answerSha256: H('ans@1') });
  const res = [1, 3, 10].map(depth => ({ depth, startNs: '0', endNs: t(2n * MS), ioReadStartBytes: '0', ioReadEndBytes: '100' }));
  assert.throws(() => nsP4History(pulls, p => H(`ans@${p.requestedBasis}`), [], res, historyCalibration()), /P4-HISTORY-ANSWER-MISMATCH|answer/i);
});

// ------------------------------------------------------------------ O29/O14 variants: baseline inflated up to the absolute floor
test('V-O29 P1: zero-reader writer p99 slowed to 48 ms lets 60 ms at 256 and 1024 readers pass', () => {
  const w = ladder({ baseWriterMs: 48 });
  for (const x of w) if (x.level !== 0) x.offers[0].ackAtNs = t(BigInt(x.offers[0].scheduledAtNs) + 60n * MS);
  assert.equal(nsP1Ladder(w, replayRead, [], calibration(4,'P1',{phase:'steady',traceSegment:'seg',offerScheduleSha256:H('sched')})).met, false);
});
test('V-O14 P5: baseline writer slowed to 49 ms lets 73 ms during the sweep pass', () => {
  const mk = (id, s0, wms) => seg64({ id, level: 64, phase: 'steady', traceSegment: 'seg', offerScheduleSha256: H('s'), startNs: t(s0), endNs: t(s0 + 1_000_000_000n),
    offers: [{ commandId: 'x', scheduledAtNs: t(s0 + MS), sentAtNs: t(s0 + MS), ackAtNs: t(s0 + MS + BigInt(wms) * MS) }] });
  const baseline = mk('b', 0n, 49), during = mk('d', 5_000_000_000n, 73);
  const r = nsP5Traffic({ baseline, sweep: during }, { startNs: t(5_000_000_000n), endNs: t(6_000_000_000n) }, () => H('correct'), [], calibration(4,'P5',{phase:'steady',traceSegment:'seg',offerScheduleSha256:H('s')}));
  assert.equal(r.met, false, JSON.stringify(r));
});

// ------------------------------------------------------------------ new: crash-only bundle status
test('NF2 a crash-only bundle evaluated as a primary returns RECOMPUTED with lag null', () => {
  const w = world(); const { bundle, trusted } = w.trusted.crashRun;
  const r = recomputeNS(bundle, trusted);
  assert.equal(r.bars.P3.lag, null);
  assert.notEqual(r.status, 'RECOMPUTED');
});
