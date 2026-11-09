import { completeFixture, completeSegment, historyFixture, readerRows, readsFor, frozenFixtureTrace, attachIndependentCrash, calibration } from '../../bin/test/ns-round2-fixture.mjs';
// [CX-VCRNS] Why: reuse the reviewed positive fixture verbatim to isolate reviewer mutations. Original fixture reasoning: R44's planted observations exercise the pure evaluator, without any engine or acceptance change.
// Rejected: asserting a supplied p99 or a fixture's own PASS flag (neither checks retained event content).
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { canonText, NS_ENCODING_SHA256, nsFeedEntryBytes, recomputeNS } from '../../bin/claim.mjs';
import { sha256 } from '../../bin/lib.mjs';

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


export { fixture, sealed, run, codes, clone, h, repo, domainCase };

export const segment = (level = 256) => ({
  id: `L${level}`, level, phase: 'steady', traceSegment: 'segment-1', offerScheduleSha256: h('same schedule'),
  startNs: '1000000000', endNs: '2000000000',
  reads: [{ subject: 's', shape: 'pull', requestedBasis: 1, echoedBasis: 1, answerSha256: h('correct'), sentAtNs: '1000000000', receivedAtNs: '1001000000' }],
  offers: [{ scheduledAtNs: '1000000000', ackAtNs: '1001000000' }],
});
export function ladder() {
  const windows = [0, 1, 4, 16, 64, 256, 1024].map(segment);
  const recovery = segment(); recovery.id='recovery';
  Object.assign(recovery, { startNs: '2000000000', endNs: '3000000000', recoveryOf: 'L1024' });
  Object.assign(recovery.reads[0], { sentAtNs: '2000000000', receivedAtNs: '2001000000' });
  Object.assign(recovery.offers[0], { scheduledAtNs: '2000000000', ackAtNs: '2001000000' });
  return [...windows, recovery].map(w => completeSegment(w));
}
function priority(f, p) {
  Object.assign(f.trusted, { priorities: ['P3', p], commandValid: () => true, ryow: () => true, replayRead: () => h('correct') });
  return f;
}
export function p1() {
  const f = priority(fixture(), 'P1');
  f.raw.events.ladder = ladder();
  f.raw.events.maintenance = [{ atNs: '1500000000' }]; f.raw.events.reads=[];
  return f;
}
export function p4() {
  const f = priority(fixture(), 'P4');
  f.raw.events.reads = Array.from({ length: 2200 }, (_, i) => ({
    readId:`pull-${i}`, subject: `s${i}`, shape: 'pull-current', loop: 0, requestedBasis: 1, echoedBasis: 1, answerSha256: h('correct'),
    sentAtNs: '1000000000', receivedAtNs: '1001000000', facts: i < 1100 ? 100 : i < 1870 ? 500 : 1000,
    bucket: i < 1100 ? '50-200' : i < 1870 ? '201-800' : '801-2000', hops: i < 880 ? 3 : i < 1650 ? 4 : 6,
  }));
  f.raw.events.pullResources = { cpuset: [1], cpuUsageStartUs: '0', cpuUsageEndUs: '1000', ioReadStartBytes: '0', ioReadEndBytes: '1000', historyScansStart: '0', historyScansEnd: '0' };
  f.raw.events.historyPulls = [1, 3, 10].flatMap(depth => Array.from({ length: 1000 }, (_, i) => ({ depth, subject: `s${i}`, sentAtNs: '0', receivedAtNs: '1000000', bytesRead: '100' })));
  f.trusted.readerLevel=1; f.raw.events.readers=readerRows(f.raw.events.reads,f.raw.events.window);
  f.raw.events.historyResources=historyFixture(f.raw.events.historyPulls);
  return attachIndependentCrash(f);
}

// [CX-VCRNS] Why: isolate time-window membership from the independent simultaneous-loop defect.
// Rejected: using overlapping reads for both findings (one fix could mask the other regression).
export function p4Sequential(origin = 1000000000n) {
  const f = p4();
  f.raw.events.reads.forEach((r, i) => {
    const sent = origin + BigInt(i) * 500000n;
    r.sentAtNs = String(sent); r.receivedAtNs = String(sent + 100000n);
  });
  f.raw.events.readers=readerRows(f.raw.events.reads,f.raw.events.window);
  return f;
}

export function refreshWal(f) { const c=f.raw.events.consumer; c.finalWalHex=Buffer.from(canonText({transactions:c.transactions,effects:c.effects,affected:c.affected,deliveries:c.deliveries})).toString('hex');c.tailedWalHex=c.finalWalHex; }
