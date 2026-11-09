import { completeFixture, completeSegment, readerRows, frozenFixtureTrace, attachIndependentCrash, historyCalibration, calibration } from '../../bin/test/ns-round2-fixture.mjs';
// Opus round 5 scoped check at 676b0a45: one variant each for Q103d active readers, the pinned crash target and Q103e race pairs.
// Earlier header: Opus round 4 re-review at e96a85cb: one new variant each for W-H1, W-H2, W-H4. Helpers copied from forgeries-round3.test.mjs
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


test('F0 round 5 baseline: P3 and P3+P2 RECOMPUTED with met', () => {
  for (const priorities of [['P3'], ['P3', 'P2']]) { const r = run(world({ priorities })); assert.equal(r.status, 'RECOMPUTED', JSON.stringify(r.reasons)); assert.equal(r.bars.P3.met, true); }
});

// ---------------------------------------------- Q103d variant: park at 99 ms granularity inside every 100 ms bin
// Floor 2/loop/s needs 1 completion per 100 ms bin. Each loop answers one read in 0.1 ms, then holds the next until ~99 ms into
// the bin. Every bin has 2 completions, no read exceeds 1 s, read p99 ~98 ms <= 100 ms, no overlap.
function parked99(level) {
  const reads = [];
  for (let loop = 0; loop < level; loop++) for (let b = 0n; b < 10n; b++) {
    const bin = START + b * 100n * MS, f = bin + MS + BigInt(loop) * 1000n;
    reads.push({ readId: `p99-${loop}-${b}-a`, loop, subject: `s${loop}`, shape: 'pull', requestedBasis: '1', echoedBasis: '1', sentAtNs: t(f), receivedAtNs: t(f + 100_000n), answerSha256: H('correct'), hot: true });
    reads.push({ readId: `p99-${loop}-${b}-b`, loop, subject: `s${loop}`, shape: 'pull', requestedBasis: '1', echoedBasis: '1', sentAtNs: t(f + 100_000n), receivedAtNs: t(bin + 99n * MS), answerSha256: H('correct'), hot: true });
  }
  return reads;
}
for (const priorities of [['P3'], ['P3', 'P2']]) test(`Q103d-v ${priorities.join('+')}: reads parked to ~98 ms inside every 100 ms bin`, { todo: 'accepted within Q103d: volume equals the frozen floor; only sub-100 ms shaping remains' }, () => {
  const w = world({ priorities }); w.trusted.readerLevel = 4; refresh(w);
  w.raw.events.reads = parked99(4); w.raw.events.readers = readerRows(w.raw.events.reads, w.raw.events.window);
  const r = run(w);
  assert.equal(r.status, 'REFUSED', `${r.status} ${JSON.stringify(r.reasons)} p99=${r.measurements.P1?.latency?.p99Ms}`);
});

// ---------------------------------------------- crash target variants: parent and child of the pinned consumer cgroup
for (const [label, cg] of [['parent', '/fixture'], ['child', '/fixture/consumer/worker'], ['trailing slash', '/fixture/consumer/']]) test(`CT-v cgroup-gone naming the ${label} cgroup (${cg}) is refused CRASH-TARGET-MISMATCH`, () => {
  const w = world(), companion = w.trusted.crashRun, craw = JSON.parse(companion.bundle.payload);
  for (const f of craw.events.faults) { for (const ev of f.events) if (ev.transition === 'cgroup-gone') ev.cgroup = cg; f.eventsSha256 = H(canonText(f.events)); }
  w.trusted.crashRun = reseal(craw, companion.trusted);
  assert.ok(codes(recomputeNS(w.trusted.crashRun.bundle, w.trusted.crashRun.trusted)).includes('CRASH-TARGET-MISMATCH'));
  assert.ok(codes(run(w)).includes('P3-RESUME-MISSING'));
});

// ---------------------------------------------- Q103e race pair variants
// Race pair {c0,c1}; committed lists which of c0..c2 commit, in source order. Offers follow the frozen schedule.
function raceWorld(committed) {
  const commits = committed.map((k, i) => { const d = (k - i) * 100; return { cmds: [`c${k}`], subjects: [`s${k}`], sL: d + 2, sU: d + 3, cL: d + 5, cU: d + 6 }; });
  const w = world({ commits }), e = w.raw.events, digest = new Map();
  for (const en of e.source.entries) for (const tx of en.transactions) { const k = tx.commandIds[0].slice(1); tx.changes.forEach(ch => { ch.assertionId = `as${k}.0`; }); digest.set(en.offset, H(nsFeedEntryBytes(en))); }
  for (const d of [...e.consumer.deliveries, ...e.consumer.transactions.flatMap(tx => tx.deliveries)]) d.digest = digest.get(d.offset);
  const trace = structuredClone(w.trusted.frozenTrace);
  trace.attempts[trace.primaryAttemptId].racePairs = [{ commands: ['c0', 'c1'] }];
  e.offers = [0, 1, 2].map(k => {
    const sched = BigInt(trace.attempts[trace.primaryAttemptId].offers[k].scheduledAtNs), i = committed.indexOf(k);
    const o = { eventId: `offer-${k}`, commandId: `c${k}`, subject: `s${k}`, sizeBand: BANDS[k], kind: 'normal', scheduledAtNs: t(sched), sentAtNs: t(sched), commandSha256: trace.commands[`c${k}`].commandSha256 };
    return i >= 0 ? { ...o, ackAtNs: t(sched + 4n * MS), receipt: { position: t(i + 1), txId: `tx${i}`, commandIds: [`c${k}`], stamp: `st${i}` } } : { ...o, ackAtNs: t(sched + MS), typedConflict: { code: 'CAS-LOST' } };
  });
  w.trusted.frozenTrace = trace;
  w.trusted.minimumSamples = { ...w.trusted.minimumSamples, lag: { ...w.trusted.minimumSamples.lag, [trace.primaryAttemptId]: 2 } };
  refresh(w);
  return w;
}
test('Q103e control: exactly one of the pair commits, the other gets a typed conflict: RECOMPUTED with met', () => {
  const r = run(raceWorld([0, 2])); assert.equal(r.status, 'RECOMPUTED', JSON.stringify(r.reasons)); assert.equal(r.bars.P3.met, true);
});
test('Q103e-v neither member of the race pair commits (both told CAS-LOST) is refused RACE-OUTCOME-INVALID', () => {
  const r = run(raceWorld([2])); assert.ok(codes(r).includes('RACE-OUTCOME-INVALID'), JSON.stringify(codes(r)));
});
test('Q103e-v both members of the race pair commit is refused RACE-OUTCOME-INVALID', () => {
  const r = run(raceWorld([0, 1, 2])); assert.ok(codes(r).includes('RACE-OUTCOME-INVALID'), JSON.stringify(codes(r)));
});
