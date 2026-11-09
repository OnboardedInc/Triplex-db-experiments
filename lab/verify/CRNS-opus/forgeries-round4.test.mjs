import { completeFixture, completeSegment, readerRows, frozenFixtureTrace, attachIndependentCrash, historyCalibration, calibration } from '../../bin/test/ns-round2-fixture.mjs';
// Opus round 4 re-review at e96a85cb: one new variant each for W-H1, W-H2, W-H4. Helpers copied from forgeries-round3.test.mjs
// as committed at e96a85cb.
// Earlier header: Opus round 3 re-review at cb1178d9: variants that dodge the round 3 fixes for the four round 2 highs, plus attacks the
// round 3 fixes introduce. Helpers copied from forgeries-round2.test.mjs as committed at cb1178d9.
// Earlier header: Opus round 2 re-review of recomputeNS at 2cdb3d2f: variants that keep each high finding's intent and dodge its fix,
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

const recomputedMet = (r, msg) => assert.equal(r.status, 'REFUSED', `${msg}; ${r.status} with bars ${JSON.stringify(r.bars.P3)}`);
function casWorld(sL, sU, ack, cL, cU) {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'], sL, sU, cL, cU }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }] });
  const o = offerOf(w, 'c0'); o.ackAtNs = t(BigInt(o.scheduledAtNs) + BigInt(ack) * MS);
  // stand-in O-REPLAY: c1 is a compare-and-set that conflicts with c0 once c0 is visible
  w.trusted.commandValid = (offer, prefix) => offer.commandId !== 'c1' || !prefix.some(en => (en.transactions ?? []).some(tx => tx.commandIds.includes('c0')));
  attachIndependentCrash(w);
  return w;
}

test('E0 round 4 baseline: P3 and P3+P2 RECOMPUTED with met', () => {
  for (const priorities of [['P3'], ['P3', 'P2']]) { const r = run(world({ priorities })); assert.equal(r.status, 'RECOMPUTED', JSON.stringify(r.reasons)); assert.equal(r.bars.P3.met, true); }
});

// ---------------------------------------------- W-H1 variant: parked reads. Each loop answers 100 reads in ~10 ms, then parks one
// read for ~960 ms. Floor (2/loop/s), no overlap and read p99 <= 100 ms all hold, yet the store serves no reads for ~96% of the window.
function parkedReads(level) {
  const reads = [];
  for (let loop = 0; loop < level; loop++) {
    let at = START + 20n * MS + BigInt(loop) * 1000n;
    for (let i = 0; i < 100; i++) { reads.push({ readId: `pk-${loop}-${i}`, loop, subject: `s${loop}`, shape: 'pull', requestedBasis: '1', echoedBasis: '1', sentAtNs: t(at), receivedAtNs: t(at + 100_000n), answerSha256: H('correct'), hot: true }); at += 100_000n; }
    reads.push({ readId: `pk-${loop}-park`, loop, subject: `s${loop}`, shape: 'pull', requestedBasis: '1', echoedBasis: '1', sentAtNs: t(at), receivedAtNs: t(START + 990n * MS), answerSha256: H('correct'), hot: true });
  }
  return reads;
}
for (const priorities of [['P3'], ['P3', 'P2']]) test(`W-H1r4 ${priorities.join('+')}: parked reads keep 4 loops "running" while the store is idle ~96% of the window`, () => {
  const w = world({ priorities }); w.trusted.readerLevel = 4; refresh(w);
  w.raw.events.reads = parkedReads(4); w.raw.events.readers = readerRows(w.raw.events.reads, w.raw.events.window);
  const r = run(w);
  const served = 4n * 100n * 100_000n, window = END - START;
  assert.ok(Number(served) / Number(window) < 0.05, 'precondition: under 5% of the window has any read being served');
  assert.ok(codes(r).includes('READER-RATE-SHORT'),JSON.stringify(r.reasons));
  recomputedMet(r, 'parked readers');
});

// ---------------------------------------------- W-H2 variant: the crash witness does not name which process died
test('W-H2r4 every planned injection witnessed, but each cgroup-gone event names a sidecar cgroup, not the consumer', () => {
  const w = world();
  const companion = w.trusted.crashRun, craw = JSON.parse(companion.bundle.payload);
  for (const f of craw.events.faults) { for (const ev of f.events) if (ev.transition === 'cgroup-gone') ev.cgroup = '/candidate/sidecar-metrics'; f.eventsSha256 = H(canonText(f.events)); }
  w.trusted.crashRun = reseal(craw, companion.trusted);
  assert.ok(codes(recomputeNS(w.trusted.crashRun.bundle,w.trusted.crashRun.trusted)).includes('CRASH-TARGET-MISMATCH'));
  recomputedMet(run(w), 'crashes of the wrong process prove consumer resume');
});

// ---------------------------------------------- W-H4 variant: cross-subject causal dependency committed in reverse source order
test('W-H4r4 c1 (valid only once c0 exists, different subject) committed before c0 in source order is refused', () => {
  // c0 offered at 1.010 s, c1 at 1.110 s (frozen schedule); the candidate commits c1 at ~1.112 s and c0 only at ~1.115 s
  const w = world({ commits: [{ cmds: ['c1'], subjects: ['s1'], sL: 102, sU: 103, cL: 104, cU: 105 }, { cmds: ['c0'], subjects: ['s0'], sL: 5, sU: 6, cL: 7, cU: 8 }, { cmds: ['c2'], subjects: ['s2'] }] });
  const c0 = offerOf(w, 'c0'), c1 = offerOf(w, 'c1');
  Object.assign(c0, { eventId: 'offer-0', subject: 's0', scheduledAtNs: '1010000000', sentAtNs: '1010000000', ackAtNs: '1117000000' });
  Object.assign(c1, { eventId: 'offer-1', subject: 's1', scheduledAtNs: '1110000000', sentAtNs: '1110000000', ackAtNs: '1114000000' });
  w.raw.events.offers.sort((a, b) => a.eventId < b.eventId ? -1 : 1);
  // keep each command's frozen content (assertionId as<k>.0 follows the command, not the commit slot), then re-derive digests
  const e = w.raw.events, digest = new Map();
  for (const en of e.source.entries) for (const tx of en.transactions) { const k = tx.commandIds[0].slice(1); tx.changes.forEach(ch => { ch.assertionId = `as${k}.0`; }); digest.set(en.offset, H(nsFeedEntryBytes(en))); }
  for (const d of [...e.consumer.deliveries, ...e.consumer.transactions.flatMap(tx => tx.deliveries)]) d.digest = digest.get(d.offset);
  w.trusted.commandValid = (cmd, prefix) => cmd.commandId !== 'c1' || prefix.some(en => (en.transactions ?? []).some(tx => tx.commandIds.includes('c0')));
  refresh(w);
  const r = run(w);
  assert.deepEqual([...new Set(codes(r))].sort(), ['COMMAND-VALIDITY-PIN-MISMATCH', 'INVALID-COMMAND-PUBLISHED'], JSON.stringify(r.reasons));
});
test('W-H4r4 control: same causal oracle, c0 committed before c1: RECOMPUTED with met', () => {
  const w = world();
  w.trusted.commandValid = (cmd, prefix) => cmd.commandId !== 'c1' || prefix.some(en => (en.transactions ?? []).some(tx => tx.commandIds.includes('c0')));
  attachIndependentCrash(w);
  const r = run(w); assert.equal(r.status, 'RECOMPUTED', JSON.stringify(r.reasons)); assert.equal(r.bars.P3.met, true);
});
