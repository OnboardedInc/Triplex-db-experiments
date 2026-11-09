import { completeFixture, completeSegment, historyFixture, readerRows, readsFor, frozenFixtureTrace, attachIndependentCrash, historyCalibration, calibration } from './ns-round2-fixture.mjs';
// [EXP-CRNS] Why: R44's planted observations exercise the pure evaluator, without any engine or acceptance change.
// Rejected: asserting a supplied p99 or a fixture's own PASS flag (neither checks retained event content).
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { canonText, NS_ENCODING_SHA256, nsFeedEntryBytes, nsNearestRank, nsConsumerCounts, nsComparePosition, recomputeNS, recomputeP3MDiagnostic, nsControlRecord, nsP1Ladder, nsP4History, nsP5Traffic, nsCrc32c, nsVerifyBrokerFrames } from '../claim.mjs';
import { sha256 } from '../lib.mjs';

const repo = path.resolve(import.meta.dirname, '../../..');
const h = s => sha256(s);
const domainCase = JSON.parse(fs.readFileSync(path.join(repo, 'lab/world/W0/cases/C34-affected-state-wage-r1.json'), 'utf8'));
const key = 'evaluator-only-fixture-key';
const clone = x => structuredClone(x);
function fixture(options={}) {
  const frozen=frozenFixtureTrace('builder',options);
  const binding = { attemptId: 'CX-CRNS-fixture', sourceSha256: h('source'), slot: 'offline', inputsSha256: h('inputs') };
  const driver = { imageId: 'sha256:' + h('image'), bundleSha256: h('driver'), generatorSha256: h('trace') };
  const clockDomain = { bootId: 'boot-1', timeNamespace: 'inode-1', clock: 'CLOCK_MONOTONIC' };
  const entries = [1, 2].map(n => ({ stream: 's', epoch: '0', offset: String(n), kind: 'commit', transactions: [{ stamp: n, positions: [String(n)], txIds: [`tx${n}`], operationId: `op${n}`, commandIds: [`cmd${n}`], changes: [{ op: 'assert', entity: 'jur:ny', attribute: 'stateMinWageCents', validFrom: 0, validTo: null, position: String(n), assertionId: `a${n}` }] }] }));
  const rows = n => ['pl:a', 'pl:b'].map(subject => ({ consumer: 'c', epoch: '0', position: String(n), subject }));
  const transactions = entries.map((entry, i) => ({ committed: true, frontierBefore: String(i), frontierAfter: String(i + 1), effects: rows(i + 1), affected: rows(i + 1), deliveries: [{ offset: entry.offset, digest: h(nsFeedEntryBytes(entry)) }], deleted: { effects: [], affected: [], deliveries: [] } }));
  const events = {
    clockDomain, clockDomains: [clockDomain, clone(clockDomain)], lagStart: 'observer-bracket',
    offers: entries.map((entry, i) => ({ commandId: `cmd${i + 1}`, subject: 'pl:a', scheduledAtNs: String(1000000000 + i * 1000000000), sentAtNs: String(1000000000 + i * 1000000000), ackAtNs: String(1003000000 + i * 1000000000), sizeBand: '5-10', receipt: { position: entry.offset, txId: `tx${i + 1}`, stamp: i + 1, commandIds: [`cmd${i + 1}`] } })),
    reads: [], source: { origin: 'observer-source-store', firstOffset: '1', finalOffset: '2', entries },
    sourceBrackets: [1, 2].map(n => ({ position: String(n), L: String(n * 1000000000), U: String(n * 1000000000 + 2000000) })),
    consumerBrackets: [1, 2].map(n => ({ position: String(n), L: String(n * 1000000000 + 9000000), U: String(n * 1000000000 + 10000000) })),
    consumer: { initialFrontier: '0', walComplete: true, tailedWalHex: '010203', finalWalHex: '01020304', transactions, effects: [...rows(1), ...rows(2)], affected: [...rows(1), ...rows(2)], deliveries: transactions.flatMap(t => t.deliveries) },
    faults: [], readers: [0, 1].map(second => ({ second, loops: Array.from({ length: 256 }, (_, i) => i), relayConcurrent: 256 })),
    window: { startNs: '1000000000', endNs: '3000000000', drainEndNs: '4000000000', bursts: [{ startNs: '2000000000', endNs: '2500000000' }] },
    noise: { grade: 'GREEN', rounds: [{ phase: 'steady', grade: 'GREEN' }] }, crossChecks: [],
  };
  return completeFixture({ raw: { format: 'ns-events/1', binding, driver, events }, trusted: { binding: clone(binding), driver: clone(driver), clockDomain: clone(clockDomain), key, encodingSha256: NS_ENCODING_SHA256, readerLevel: 256, priorities: ['P3'], gradeWindow: () => 'GREEN', verifySource: () => true, domainAffected: () => domainCase.expected.affected } }, frozen);
}
function sealed(f) {
  const payload = canonText(f.raw);
  let previous = '0'.repeat(64);
  const chunks = [payload.slice(0, 100), payload.slice(100)].map(part => {
    const bytes = canonText({ previousSha256: previous, payload: part });
    const chunk = { payload: part, previousSha256: previous, sha256: h(bytes), hmac: createHmac('sha256', key).update(bytes).digest('hex') };
    previous = chunk.sha256; return chunk;
  });
  return { bundle: { payload, chunks, hmac: createHmac('sha256', key).update(payload).digest('hex') }, trusted: { ...f.trusted, headSha256: previous } };
}
function run(f) { const { bundle, trusted } = sealed(f); return recomputeNS(bundle, trusted); }
const codes = r => r.reasons.map(x => x.code);

const forgeries = [
  ['F1', 'LAG-START-CR', e => { e.lagStart = 'PublicationClock'; }],
  ['F2', 'BRACKET-INVALID', e => { e.sourceBrackets[0].U = '1'; }],
  ['F3', 'OBS-UNAUTHENTICATED', null],
  ['F4', 'NS-P3-EVERY-POSITION-ACCOUNTED', e => { e.sourceBrackets.pop(); }],
  ['F5', 'PREFIX-NOT-FROM-SOURCE', e => { e.source.origin = 'deliveries'; }],
  ['F6', 'LOST-ACKED-COMMIT', e => { e.source.entries.pop(); e.source.finalOffset = '1'; }],
  ['F7', 'NS-P3-ORDER-VIOLATIONS-MAX', e => { e.consumer.transactions[0].effects[0].position = '2'; }],
  ['F8', 'NS-P3-ORDER-VIOLATIONS-MAX', e => { e.consumer.transactions[1].frontierAfter = '0'; }],
  ['F9', 'NS-P3-VISIBLE-DUP-EFFECTS-MAX', e => {
    const row = clone(e.consumer.effects[0]);
    e.consumer.transactions.push({ committed: true, frontierBefore: '2', frontierAfter: '3', effects: [row], affected: [], deliveries: [], deleted: { effects: [row], affected: [], deliveries: [] } });
  }],
  ['F10', 'NS-P3-DOMAIN-AFFECTED-SET', e => {
    for (const name of ['effects', 'affected']) { e.consumer[name] = e.consumer[name].filter(r => r.subject === 'pl:a'); for (const tx of e.consumer.transactions) tx[name] = tx[name].filter(r => r.subject === 'pl:a'); }
  }],
  ['F11', 'TAMPER', e => { e.consumer.finalWalHex = '00020304'; }],
  ['F12', 'NS-P3-GAPS-MAX', e => { e.consumer.deliveries[0].digest = h('candidate encoding'); e.consumer.transactions[0].deliveries[0].digest = h('candidate encoding'); }],
  ['F13', 'READER-LEVEL-MISMATCH', e => { e.readers[0].loops.pop(); }],
  ['F14', 'CLOCK-DOMAIN-MISMATCH', e => { e.clockDomains[1].domain.bootId = 'another-boot'; }],
  ['F15', 'NS-P3-EVERY-POSITION-ACCOUNTED', e => { e.consumerBrackets.pop(); }],
  ['F16', 'DRIVER-NOT-PINNED', null],
  ['F17', 'FAULT-WITNESS-INVALID', e => { e.faults = [{ format: 'fault-witness/1', eventsSha256: h('unproven') }]; }],
  ['F18', 'RAW-EVENTS-MISSING', e => { delete e.source; e.summary = { p99: 0 }; }],
  ['F19', 'TIMING-UNJUDGED', e => { e.noise.grade = 'YELLOW'; }],
  ['F20', 'CR-INCONSISTENT', e => { e.crossChecks = [{ role: 'source', position: '1', atNs: '2000000000' }]; }],
];
for (const [id, code, change] of forgeries) test(`CX-CRNS-${id}: ${code}`, () => {
  const f = fixture();
  change?.(f.raw.events);
  if (id === 'F16') f.raw.driver.bundleSha256 = h('other bundle');
  const s = sealed(f);
  if (id === 'F3') s.bundle.hmac = h('wrong HMAC');
  const r = recomputeNS(s.bundle, s.trusted);
  assert.equal(r.status, 'REFUSED'); assert.ok(codes(r).includes(code), canonText(r));
  if (id === 'F19') assert.equal(r.bars.P3.lag, null);
});

test('P3 evaluator runs the real O-DOMAIN child at every committed position', () => {
  const f = fixture(); let calls = 0; const observedStates=[];
  const frozenValues={cmd1:1750,cmd2:1800};
  f.trusted.domainAffected = ({ transaction, prefix }) => {
    calls++;
    const input = structuredClone(domainCase.input);
    for (const entry of prefix) for (const tx of entry.transactions ?? []) for (const op of tx.changes) {
      for (const world of input.worlds) if (world.facts.some(f=>f.e===op.entity && f.a===op.attribute)) {
        world.facts=world.facts.filter(f=>!(f.e===op.entity && f.a===op.attribute));
        world.facts.push({e:op.entity,a:op.attribute,v:frozenValues[tx.commandIds[0]]??1750,tx:10});
      }
    }
    observedStates.push([prefix.length,input.worlds[0].facts.find(f=>f.e==='jur:ny'&&f.a==='stateMinWageCents').v]);
    input.writes=transaction.changes.map(op=>[op.entity,op.attribute]);
    return JSON.parse(execFileSync('python3', ['-I', '-B', path.join(repo, 'lab/oracles/domain/cli.py'), 'affected', '-'], { input: canonText(input), encoding: 'utf8' })).affected;
  };
  attachIndependentCrash(f);
  const r = run(f);
  assert.equal(r.status, 'RECOMPUTED', canonText(r)); assert.equal(calls, 12); assert.deepEqual(observedStates.slice(0,2),[[1,1750],[2,1800]]);
  assert.equal(r.measurements.P3.lag.pooled.p99Ms, 10);
  assert.equal(r.measurements.P3.lag.steady.count, 1);
  assert.equal(r.measurements.P3.lag.burst.count, 1);
});

test('exact nearest rank, including huge clocks, duplicates and boundaries', () => {
  assert.equal(nsNearestRank([], 99), null);
  assert.equal(nsNearestRank([3n, 1n, 2n, 4n], 50), 2n);
  const xs = Array.from({ length: 101 }, (_, i) => BigInt(i) + 2n ** 80n);
  assert.equal(nsNearestRank(xs, 99), xs[99]);
  assert.equal(nsNearestRank([1, 1, Infinity], 99), Infinity);
  assert.equal(nsNearestRank([0, 10], 1), 0);
  assert.throws(() => nsNearestRank([1], 0));
});

test('range consistency property: all permutations within a transaction preserve validity; each out-of-range insertion is found', () => {
  for (let n = 1; n <= 128; n++) {
    const effects = Array.from({ length: n }, (_, i) => ({ consumer: 'c', epoch: '0', subject: `s${i}`, position: String(i + 1) }));
    const tx = { committed: true, frontierBefore: '0', frontierAfter: String(n), effects: effects.reverse(), affected: [] };
    assert.equal(nsConsumerCounts([tx], '0').orderViolations, 0);
    tx.effects[0].position = String(n + 1);
    assert.equal(nsConsumerCounts([tx], '0').orderViolations, 1);
  }
});

test('duplicate property: committed insertion multiset counts every repeat, ignoring delete/reinsert and row ordering', () => {
  for (let n = 1; n <= 128; n++) {
    const transactions = Array.from({ length: n }, (_, i) => ({ committed: true, frontierBefore: String(i), frontierAfter: String(i + 1), effects: [{ consumer: 'c', epoch: '0', position: '1', subject: 's' }], affected: [] }));
    assert.equal(nsConsumerCounts(transactions, '0').duplicates, n - 1);
    assert.equal(nsConsumerCounts(transactions, '0', [transactions[0].effects[0], transactions[0].effects[0]]).duplicates, n);
  }
  assert.equal(nsComparePosition({ stream: 's', epoch: '1', offset: '99999999999999999', ordinal: '0' }, { stream: 's', epoch: '1', offset: '100000000000000000', ordinal: '0' }), -1);
});

test('authenticated bytes, witnessed head, attempt, source, slot, input and encoding all bind', () => {
  for (const field of ['attemptId', 'sourceSha256', 'slot', 'inputsSha256']) {
    const f = fixture(); f.raw.binding[field] = 'different'; assert.ok(codes(run(f)).includes('EVENT-BINDING'));
  }
  const s = sealed(fixture()); s.trusted.headSha256 = h('old attempt'); assert.ok(codes(recomputeNS(s.bundle, s.trusted)).includes('OBS-UNAUTHENTICATED'));
  const f = fixture(); f.trusted.encodingSha256 = h('not feed-entry/1'); assert.ok(codes(run(f)).includes('FEED-ENCODING-NOT-PINNED'));
});

test('missing WAL is not estimable; value-bearing feed entries are refused', () => {
  const f = fixture(); f.raw.events.consumer.walComplete = false; assert.ok(codes(run(f)).includes('WAL-NOT-ESTIMABLE'));
  const entry = fixture().raw.events.source.entries[0]; entry.transactions[0].changes[0].value = 'private'; assert.throws(() => nsFeedEntryBytes(entry));
});

test('Q99b A0 rung is diagnostic; comparative and promotion still require equal rung paired controls', () => {
  const binding = fixture().raw.binding;
  const c = { kind: 'absolute', candidateRung: 100000, a0Rung: 10000, a0Fits: false, binding, measuredBinding: clone(binding), grade: 'GREEN', aaGrade: 'GREEN' };
  assert.equal(nsControlRecord(c).role, 'comparison-and-budgets-only');
  assert.equal(nsControlRecord(c).admission, 'PENDING-CONTRACT');
  for (const kind of ['comparative', 'promotion']) assert.throws(() => nsControlRecord({ ...c, kind, paired: true }), /CONTROL-UNMATCHED/);
  assert.throws(() => nsControlRecord({ ...c, grade: 'YELLOW' }), /CONTROL-UNMATCHED/);
});

test('P3M retained raw samples reproduce bench numbers but cannot establish R44 acceptance', () => {
  const dir = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P3M/g0-fixtures/32374b5b-2be8-406d-80bd-15fdee22126c';
  const observations = JSON.parse(fs.readFileSync(path.join(dir, 'observations.json'), 'utf8'));
  const receipt = JSON.parse(fs.readFileSync(path.join(dir, 'receipt.json'), 'utf8'));
  assert.equal(h(fs.readFileSync(path.join(dir, 'observations.json'))), receipt.bindings.observationsSha256);
  const result = recomputeP3MDiagnostic(observations);
  assert.deepEqual(result.lag, receipt.measurement.lag);
  assert.equal(result.status, 'DIAGNOSTIC'); assert.equal(result.reason, 'LAG-START-CR');
});

test('F3 variations: broken intermediate chain, invalid chunk HMAC and unwitnessed head', () => {
  for (const mutate of [s => { s.bundle.chunks[1].previousSha256 = h('wrong'); }, s => { s.bundle.chunks[0].hmac = h('wrong'); }, s => { s.trusted.headSha256 = h('unwitnessed'); }]) {
    const s = sealed(fixture()); mutate(s); assert.ok(codes(recomputeNS(s.bundle, s.trusted)).includes('OBS-UNAUTHENTICATED'));
  }
});

test('P2 full raw bands, publication ACK order, progress and idempotency', () => {
  const f = fixture({extraInvalid:true}); f.trusted.priorities = ['P3', 'P2'];
  f.trusted.ryow = () => true; f.trusted.steadyRate = 10;
  f.raw.events.offers[1].sizeBand = '11-25'; f.trusted.commands.invalid = {commandSha256:h('invalid'),valid:false};
  f.raw.events.offers.push({ eventId: 'invalid-offer', kind: 'invalid', commandSha256: h('invalid'), commandId: 'invalid', sizeBand: '26-50', scheduledAtNs: '2500000000', sentAtNs: '2500000000', ackAtNs: '2501000000', typedError: { code: 'OUT-OF-RANGE' } });
  attachIndependentCrash(f); assert.equal(run(f).status, 'RECOMPUTED', canonText(run(f)));
  f.raw.events.offers[0].scheduledAtNs = '990000000';
  assert.equal(run(f).measurements.P2.latency['5-10'].p99Ms, 13);
  f.raw.events.offers[0].ackAtNs = '999000000'; f.raw.events.offers[0].sentAtNs = '990000000';
  assert.ok(codes(run(f)).includes('ACK-BEFORE-PUBLICATION'));
  f.raw.events.offers[0].ackAtNs = '1003000000';
  const retry = clone(f.raw.events.offers[0]); retry.eventId='retry'; retry.kind='duplicate'; retry.receipt.txId = 'wrong'; f.raw.events.offers.push(retry);
  assert.ok(codes(run(f)).includes('IDEMPOTENCY-RECEIPT-MISMATCH'));
});

const rawSegment = (level = 256) => ({ id: `L${level}`, level, phase: 'steady', traceSegment: 'segment-1', offerScheduleSha256: h('same schedule'), startNs: '1000000000', endNs: '2000000000', reads: [{ subject: 's', shape: 'pull', requestedBasis: 1, echoedBasis: 1, answerSha256: h('correct'), sentAtNs: '1000000000', receivedAtNs: '1001000000' }], offers: [{ scheduledAtNs: '1000000000', ackAtNs: '1001000000' }] });

test('P1 ladder recomputes matched raw goodput, writer ratios and post-stress recovery', () => {
  const windows = [0, 1, 4, 16, 64, 256, 1024].map(rawSegment);
  const recovery = rawSegment(256); recovery.id='recovery'; recovery.startNs = '2000000000'; recovery.endNs = '3000000000'; recovery.recoveryOf = 'L1024';
  recovery.reads[0].sentAtNs = '2000000000'; recovery.reads[0].receivedAtNs = '2001000000'; recovery.offers[0].scheduledAtNs = '2000000000'; recovery.offers[0].ackAtNs = '2001000000';
  windows.push(recovery); windows.forEach(w => completeSegment(w));
  assert.equal(nsP1Ladder(windows, () => h('correct'), [], calibration()).met, true);
  windows[5].reads[0].answerSha256 = h('wrong');
  assert.equal(nsP1Ladder(windows, () => h('correct'), [], calibration()).met, false);
  windows[5].reads[0].answerSha256 = h('correct'); windows[5].offers[0].ackAtNs = '1002000000';
  assert.equal(nsP1Ladder(windows, () => h('correct'), [], calibration()).met, false);
});

test('P4 1000 matched subjects compare depth 1/3/10 latency and bytes with exact 1.1 boundary', () => {
  const pulls = [1, 3, 10].flatMap(depth => Array.from({ length: 1000 }, (_, i) => ({ depth, subject: `s${i}`, sentAtNs: '0', receivedAtNs: depth === 1 ? '1000000' : '1100000', bytesRead: depth === 1 ? '100' : '110' })));
  const resources = historyFixture(pulls);
  assert.equal(nsP4History(pulls, () => h('correct'), [], resources, historyCalibration()).met, true);
  resources[2].ioReadEndBytes = '110001'; assert.equal(nsP4History(pulls, () => h('correct'), [], resources, historyCalibration()).met, false);
  pulls.pop(); assert.throws(() => nsP4History(pulls, () => h('correct'), [], resources, historyCalibration()), /unmatched/);
});

test('P5 raw matched live read and writer ratios; a summary alone cannot satisfy it', () => {
  const s = { baseline: completeSegment(rawSegment(64)), sweep: completeSegment(rawSegment(64)) };
  s.sweep.id='sweep'; s.sweep.startNs='2000000000'; s.sweep.endNs='3000000000'; completeSegment(s.sweep);
  s.sweep.offers[0].scheduledAtNs='2000000000'; s.sweep.offers[0].ackAtNs='2001500000';
  const window = {startNs:'2000000000',endNs:'3000000000'};
  assert.equal(nsP5Traffic(s, window, () => h('correct'), [], calibration(1,'P5')).met, true);
  s.sweep.offers[0].ackAtNs = '2001500001'; assert.equal(nsP5Traffic(s, window, () => h('correct'), [], calibration(1,'P5')).met, false);
  assert.equal(nsP5Traffic({ baseline: { p99Ms: 1 }, sweep: { p99Ms: 1 } }).met, false);
});

test('P5 evaluates every one of 100k subjects at activation basis against evaluator oracle', () => {
  const f = fixture(); f.trusted.priorities = ['P3', 'P5']; f.trusted.ryow = () => true; f.trusted.commandValid = () => true; f.trusted.replayRead = () => h('correct');
  f.trusted.activationCommandId='cmd1'; f.trusted.releaseSha256=h('release'); f.trusted.commands.cmd1.releaseSha256=h('release'); f.trusted.verifySweepDurability=()=>true;
  const subjects = Array.from({ length: 100000 }, (_, i) => `s${i}`); let calls = 0;
  f.trusted.subjectListSha256 = h(canonText(subjects));
  f.trusted.domainSweep = (subject, basis) => { assert.equal(basis, '1'); calls++; return { output: [{ subject }], outbox: [] }; };
  f.raw.events.sweep = { activationReceipt: { basis: '1',releaseSha256:h('release') },durableBracket:{L:'2999999999',U:'3000000000'}, subjects, outputs: subjects.map(subject => ({ subject })), outbox: [], startNs: '2000000000', endNs: '3000000000' };
  f.raw.events.sweepTraffic = { baseline: completeSegment(rawSegment(64)), sweep: {...rawSegment(64),id:'during-sweep',startNs:'2000000000',endNs:'3000000000'} };
  f.raw.events.sweepTraffic.sweep.offers[0]={scheduledAtNs:'2000000000',ackAtNs:'2001000000'}; completeSegment(f.raw.events.sweepTraffic.sweep);
  attachIndependentCrash(f); assert.equal(run(f).status, 'RECOMPUTED', canonText(run(f))); assert.equal(calls, 200000);
});

test('source broker header, payload and CRC chain are checked from bytes', () => {
  assert.equal(nsCrc32c(Buffer.from('123456789')), 0xe3069283);
  const frame = (lsn, prev) => {
    const bytes = Buffer.alloc(37); bytes.writeUInt32LE(0x464c5854); bytes.writeUInt32LE(1, 4); bytes.writeBigUInt64LE(BigInt(lsn), 8); bytes.writeUInt32LE(prev, 20);
    const header = nsCrc32c(bytes.subarray(0, 28), prev); bytes.writeUInt32LE(header, 28); bytes[32] = lsn;
    const crc = nsCrc32c(bytes.subarray(32, 33), header); bytes.writeUInt32LE(crc, 33);
    return { offset: String(lsn), hex: bytes.toString('hex'), crc };
  };
  const first = frame(1, 0), second = frame(2, first.crc);
  assert.equal(nsVerifyBrokerFrames([first, second], 0), second.crc);
  const damaged = clone(second); damaged.hex = damaged.hex.slice(0, -2) + (damaged.hex.endsWith('00') ? '01' : '00');
  assert.throws(() => nsVerifyBrokerFrames([first, damaged], 0), /SOURCE-CRC-CHAIN/);
  assert.throws(() => nsVerifyBrokerFrames([second, first], 0), /SOURCE-CRC-CHAIN/);
});

test('crash counts remain judged; replay witnesses must be unique and byte exact; lag is unjudged', () => {
  const f=fixture(), c=f.trusted.crashRun;
  const r=recomputeNS(c.bundle,c.trusted);assert.equal(r.status,'CRASH-RECOMPUTED',canonText(r));assert.equal(r.bars.P3.counts,true);assert.equal(r.bars.P3.lag,null);assert.equal(r.bars.P3.resume,true);assert.equal(r.bars.P3.met,false);
  const bad={raw:JSON.parse(c.bundle.payload),trusted:c.trusted};bad.raw.events.faults[1]=clone(bad.raw.events.faults[0]);assert.ok(codes(run(bad)).includes('FAULT-WITNESS-INVALID'));
});

test('P4 full current-pull mix and resource counters feed arithmetic; wrong mix is refused', () => {
  const f = fixture(); f.trusted.priorities = ['P3', 'P4']; f.trusted.ryow = () => true; f.trusted.commandValid = () => true; f.trusted.replayRead = () => h('correct');
  f.raw.events.reads = Array.from({ length: 20 }, (_, i) => ({ subject: `s${i}`, shape: 'pull-current', loop: 0, requestedBasis: 1, echoedBasis: 1, answerSha256: h('correct'), readId:`pull-${i}`, sentAtNs: String(1000000000+i*1000000), receivedAtNs: String(1000100000+i*1000000), facts: i < 10 ? 100 : i < 17 ? 500 : 1000, bucket: i < 10 ? '50-200' : i < 17 ? '201-800' : '801-2000', hops: i < 8 ? 3 : i < 15 ? 4 : 6 }));
  f.raw.events.pullResources = { cpuset: [1], cpuUsageStartUs: '0', cpuUsageEndUs: '1000', ioReadStartBytes: '0', ioReadEndBytes: '1000', historyScansStart: '0', historyScansEnd: '0' };
  f.raw.events.historyPulls = [1, 3, 10].flatMap(depth => Array.from({ length: 1000 }, (_, i) => ({ depth, subject: `s${i}`, sentAtNs: '0', receivedAtNs: '1000000', bytesRead: '100' })));
  f.raw.events.historyResources = historyFixture(f.raw.events.historyPulls);
  const r = run(f); assert.equal(r.measurements.P4.pullsPerCpuSecond, 20000); assert.ok(codes(r).includes('NS-P4-LATENCY-THROUGHPUT'));
  f.raw.events.reads[0].hops = 6; assert.ok(codes(run(f)).includes('P4-MIX-MISMATCH'));
});
