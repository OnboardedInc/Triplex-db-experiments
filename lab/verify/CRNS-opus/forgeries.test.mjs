import { completeFixture, completeSegment, readerRows, frozenFixtureTrace, attachIndependentCrash, historyCalibration, calibration, brokerFixture } from '../../bin/test/ns-round2-fixture.mjs';
// Opus adversarial review of recomputeNS (exp/CRNS-recompute at 2f299bfa). Run: node --test lab/verify/CRNS-opus/
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

// ------------------------------------------------------------------ baseline
test('B0 baseline world is RECOMPUTED for P3 and P3+P2 (fixture sanity)', () => {
  for (const priorities of [['P3'], ['P3', 'P2']]) { const r = run(world({ priorities })); assert.equal(r.status, 'RECOMPUTED', JSON.stringify(r.reasons)); }
});
test('B1 removing WAL/CR/resume floors refuses', () => {
  const r = run(world({ priorities: ['P3', 'P2'] }));
  assert.equal(r.status, 'RECOMPUTED');
  const w = world(); w.raw.events.crossChecks = []; assert.equal(run(w).status, 'REFUSED');
});

// ------------------------------------------------------------------ refused controls (the code does catch these)
test('R1 truncated chunk chain is refused', () => {
  const w = world(); const { bundle, head } = seal(w.raw);
  const half = bundle.payload.length >> 1, prev = '0'.repeat(64);
  const b1 = canonText({ previousSha256: prev, payload: bundle.payload.slice(0, half) });
  const c1 = { previousSha256: prev, payload: bundle.payload.slice(0, half), sha256: H(b1), hmac: createHmac('sha256', KEY).update(b1).digest('hex') };
  const r = recomputeNS({ ...bundle, chunks: [c1] }, { ...w.trusted, headSha256: head });
  assert.deepEqual(codes(r), ['OBS-UNAUTHENTICATED']);
});
test('R2 receipt to a different tx on retry is refused (IDEMPOTENCY-RECEIPT-MISMATCH)', () => {
  const w = world({ priorities: ['P3', 'P2'], commits: [{ cmds: ['c0'], subjects: ['s0'] }, { cmds: ['c0'], subjects: ['s0'] }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }],
    mutate: e => { const o = e.offers[0]; e.offers.push({ ...o, scheduledAtNs: t(BigInt(o.scheduledAtNs) + 50n * MS), sentAtNs: t(BigInt(o.sentAtNs) + 50n * MS), ackAtNs: t(BigInt(o.ackAtNs) + 50n * MS), receipt: { position: '2', txId: 'tx1', commandIds: ['c0'], stamp: 'st1' } }); } });
  assert.ok(codes(run(w)).includes('IDEMPOTENCY-RECEIPT-MISMATCH'));
});
test('R3 ACK before source bracket L is refused when P2 is requested', () => {
  const w = world({ priorities: ['P3', 'P2'], commits: [{ cmds: ['c0'], subjects: ['s0'], sL: 5, sU: 6, cL: 7, cU: 8 }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }] });
  assert.ok(codes(run(w)).includes('ACK-BEFORE-PUBLICATION'));
});
test('R4 duplicate effect row with identical key is refused', () => {
  const w = world({ mutate: e => { const tx = e.consumer.transactions[0]; tx.effects.push({ ...tx.effects[0] }); e.consumer.effects.push({ ...tx.effects[0] }); } });
  assert.ok(codes(run(w)).includes('NS-P3-VISIBLE-DUP-EFFECTS-MAX'));
});

// ------------------------------------------------------------------ O1 duplicate commit of one command
test('O1 P2/P3: the same command committed twice in the source (retry not idempotent) is refused', () => {
  const w = world({ priorities: ['P3', 'P2'], commits: [{ cmds: ['c0'], subjects: ['s0'] }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }, { cmds: ['c0'], subjects: ['s0'] }] });
  refused(run(w), 'c0 committed twice');
});

// ------------------------------------------------------------------ O2 fast typed error, slow async commit
test('O2 P2: typed error ACKed in 1 ms while the command commits 400 ms later is refused', () => {
  const w = world({ priorities: ['P3', 'P2'], commits: [{ cmds: ['c0'], subjects: ['s0'], sL: 400, sU: 401, cL: 402, cU: 403 }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }],
    mutate: e => { const o = e.offers[0]; delete o.receipt; o.typedError = { code: 'BUSY' }; o.ackAtNs = t(BigInt(o.scheduledAtNs) + 1n * MS); } });
  const r = run(w);
  assert.equal(r.measurements.P2?.latency['5-10'].p99Ms, Infinity);
  refused(r, 'fast error, async commit');
});

// ------------------------------------------------------------------ O3 retry returns typed error, not original receipt
test('O3 P2: a duplicate retry answered with a typed error instead of the original receipt is refused', () => {
  const w = world({ priorities: ['P3', 'P2'], mutate: e => { const o = e.offers[0]; e.offers.push({ ...o, receipt: undefined, typedError: { code: 'DUPLICATE' } }); delete e.offers.at(-1).receipt; } });
  refused(run(w), 'retry got typed error');
});

// ------------------------------------------------------------------ O4 duplicate visible effect under another epoch/consumer label
for (const [label, patch] of [['epoch', { epoch: '2' }], ['consumer', { consumer: 'k2' }]]) {
  test(`O4 P3: a second visible effect for the same (position, subject) under a different ${label} label is refused`, () => {
    const w = world({ mutate: e => { const tx = e.consumer.transactions[0]; const dup = { ...tx.effects[0], ...patch }; tx.effects.push(dup); e.consumer.effects.push({ ...dup }); } });
    refused(run(w), `duplicate effect via ${label}`);
  });
}

// ------------------------------------------------------------------ O5 feed order disagrees with cursor order
test('O5 P3: source entry order (offset) contradicting cursor order (position) is refused', () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'], pos: '2' }, { cmds: ['c1'], subjects: ['s1'], pos: '1' }, { cmds: ['c2'], subjects: ['s2'], pos: '3' }] });
  refused(run(w), 'offset 0 carries position 2, offset 1 carries position 1');
});
test('O5b P3: a position whose coordinates disagree with its entry (offset 0 entry, position offset 999) is refused', () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'], pos: '999' }, { cmds: ['c1'], subjects: ['s1'], pos: '1000' }, { cmds: ['c2'], subjects: ['s2'], pos: '1001' }] });
  refused(run(w), 'position not tied to entry offset');
});

// ------------------------------------------------------------------ O6 P3-only evaluation skips offer-side checks
test('O6a P3 only: candidate typed-rejects 2 of 3 valid commands, tiny feed passes P3', () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'] }], mutate: e => {
    for (const i of [1, 2]) e.offers.push({ commandId: `c${i}`, subject: `s${i}`, sizeBand: BANDS[i], scheduledAtNs: t(START + 500n * MS), sentAtNs: t(START + 500n * MS), ackAtNs: t(START + 501n * MS), typedError: { code: 'REJECT' } });
  } });
  const r = run(w);
  assert.equal(r.measurements.P3.lag.pooled.count, 1);
  refused(r, 'progress not required for P3');
});
test('O6b P3 only: ACK before publication (lag start moved late by hiding the commit from the source store) is refused', () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'], sL: 5, sU: 6, cL: 7, cU: 8 }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }] });
  refused(run(w), 'ack at +4 ms, publication bracket [+5,+6]');
});

// ------------------------------------------------------------------ O7 / O8 resume
test('O7 P3: a RECOMPUTED result carries resume-from-checkpoint evidence', () => {
  const r = run(world());
  assert.equal(r.status, 'RECOMPUTED'); assert.equal(r.bars.P3.resume, true);
  const w = world(); delete w.trusted.crashRun; assert.equal(run(w).status, 'REFUSED');
});
test('O8 P3: fault witnesses that each replay one arbitrary entry (not from the checkpoint) are refused as FAULT-WITNESS-INVALID', () => {
  const w=world(), companion=w.trusted.crashRun;
  assert.equal(recomputeNS(companion.bundle,companion.trusted).status,'CRASH-RECOMPUTED');
  const bad={raw:JSON.parse(companion.bundle.payload),trusted:companion.trusted};
  bad.raw.events.faults[0].replay=structuredClone(bad.raw.events.consumer.transactions.at(-1).deliveries);
  const r=run(bad);assert.ok(codes(r).includes('FAULT-WITNESS-INVALID'));assert.ok(r.reasons.some(x=>/replay disagrees/.test(x.detail)));

});

// ------------------------------------------------------------------ O9 positions outside the measured window
test('O9 P3: a commit published after window end that never reaches the consumer durable record is refused', () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'] }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'], sL: 1500, sU: 1501, cU: null }] });
  refused(run(w), 'late commit with no consumer durable record');
});

// ------------------------------------------------------------------ O12 E8 reader level vs actual reads
test('O12 P3: lag "with 256 readers" accepted while reads[] is empty and readers[] only claims loop ids', () => {
  const loops = Array.from({ length: 256 }, (_, i) => i);
  const w = world({ mutate: (e, tr) => { tr.readerLevel = 256; e.readers = [{ second: 0, loops, relayConcurrent: 256 }]; } });
  refused(run(w), '256 readers claimed, zero reads');
});

// ------------------------------------------------------------------ O16 oracles see the future
test('O16 oracle "prefix" stops at the position being evaluated', () => {
  const seen = [];
  const w = world({ mutate: (e, tr) => { const f = tr.domainAffected; tr.domainAffected = a => { seen.push([a.entry.offset, a.prefix.length]); return f(a); }; } });
  run(w);
  assert.deepEqual(seen, [['1', 1], ['2', 2], ['3', 3]]);
});

// ------------------------------------------------------------------ O17 source content vs offered command
test('O17 P2/P3: committed change subject differing from the offered command subject is refused', () => {
  const w = world({ priorities: ['P3', 'P2'], commits: [{ cmds: ['c0'], subjects: ['zzz'] }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }] });
  const r=run(w);refused(r,'offer subject s0, committed change on zzz');assert.ok(codes(r).includes('SOURCE-CONTENT-MISMATCH'));
});

// ------------------------------------------------------------------ O18 / O25 broker frames
function frame(lsn, epoch, prev, payload) {
  const crc32c = (bytes, seed) => { let c = (seed ^ 0xffffffff) >>> 0; for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0x82f63b78 : 0); } return (c ^ 0xffffffff) >>> 0; };
  const p = Buffer.from(payload), buf = Buffer.alloc(36 + p.length);
  buf.writeUInt32LE(0x464c5854, 0); buf.writeUInt32LE(p.length, 4); buf.writeBigUInt64LE(BigInt(lsn), 8); buf.writeUInt32LE(epoch, 16); buf.writeUInt32LE(prev, 20);
  const hc = crc32c(buf.subarray(0, 28), prev); buf.writeUInt32LE(hc, 28); p.copy(buf, 32);
  const crc = crc32c(buf.subarray(32, buf.length - 4), hc); buf.writeUInt32LE(crc, buf.length - 4);
  return { frame: { offset: String(lsn), hex: buf.toString('hex') }, crc };
}
test('O18/O25 broker-frame/2: self-made CRC frames whose bytes are unrelated to the entries bypass verifySource and are refused', () => {
  const w=brokerFixture(world());assert.equal(run(w).status,'RECOMPUTED',JSON.stringify(codes(run(w))));
  let prev=7;const frames=[];for(let i=1;i<=3;i++){const f=frame(i,1,prev,'not-the-entry');frames.push(f.frame);prev=f.crc;}
  Object.assign(w.raw.events.source,{frames,initialCrc:7,finalCrc:prev});
  const r=run(w);refused(r,'frames unrelated to entries');assert.ok(codes(r).includes('SOURCE-NOT-VERIFIED'));

});

// ------------------------------------------------------------------ O22 ACK inside a wide bracket
test('O22 P2: ACK inside a 150 ms wide publication bracket is accepted as merely undecided', () => {
  const w = world({ priorities: ['P3', 'P2'], commits: [{ cmds: ['c0'], subjects: ['s0'], sL: 1, sU: 150, cL: 151, cU: 160 }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }] });
  const r = run(w);
  assert.equal(r.measurements.P2.ackUndecided, 1);
  refused(r, 'ack possibly before publication');
});

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
test('L0 ladder fixture sanity: met', () => { assert.equal(nsP1Ladder(ladder(), replayRead, [], calibration(4,'P1',{phase:'steady',traceSegment:'seg',offerScheduleSha256:H('sched')})).met, true); });
test('O10 P1: a hops-6 read answered with the hops-3 answer is a violation', () => {
  const r = nsP1Ladder(ladder({ hopsSecond: true }), replayRead, [], calibration(4,'P1',{phase:'steady',traceSegment:'seg',offerScheduleSha256:H('sched')}));
  assert.equal(r.met, false);
});
test('O11 P1: a "1024-reader" window whose reads all come from one loop is refused', () => {
  const w = ladder(); w.find(x => x.level === 1024).reads.forEach(r => {r.loop=0;}); assert.throws(() => nsP1Ladder(w, replayRead, []));
});
test('O24 P1: recovery window matched although neither the 1024 window nor the recovery window has an id', () => {
  assert.throws(() => nsP1Ladder(ladder({ recoveryIds: false }), replayRead, []), /P1-RECOVERY-MISSING|EVENT-SCHEMA/);
});
test('O29a P1: writer p99 at 256 readers of 120 ms passes because the zero-reader baseline was slowed to 100 ms', () => {
  const w = ladder({ baseWriterMs: 100 });
  for (const x of w) if (x.level !== 0) x.offers[0].ackAtNs = t(BigInt(x.offers[0].scheduledAtNs) + 120n * MS);
  const r=nsP1Ladder(w, replayRead, [], calibration(4,'P1',{phase:'steady',traceSegment:'seg',offerScheduleSha256:H('sched')})); assert.equal(r.met,false); assert.equal(r.reason,'BASELINE-INFLATED');
});

// ------------------------------------------------------------------ P4 history (O13)
test('O13 P4: history-flatness pulls without any answer check are refused', () => {
  const pulls=[];for(const depth of [1,3,10])for(let i=0;i<1000;i++)pulls.push({readId:`h-${depth}-${i}`,depth,subject:`s${i}`,shape:'pull-current',requestedBasis:String(depth),echoedBasis:String(depth),sentAtNs:'0',receivedAtNs:'1000000',answerSha256:H(`depth-${depth}`)});
  const resources=[1,3,10].map(depth=>({depth,startNs:'0',endNs:'2000000',ioReadStartBytes:'0',ioReadEndBytes:'100'}));
  const oracle=r=>H(`depth-${r.depth}`);assert.equal(nsP4History(pulls,oracle,[],resources,historyCalibration()).met,true);
  pulls.find(p=>p.depth===10).answerSha256=H('depth-1');assert.throws(()=>nsP4History(pulls,oracle,[],resources,historyCalibration()),error=>error.code==='P4-HISTORY-ANSWER-MISMATCH');

});

// ------------------------------------------------------------------ P5 traffic (O14)
test('O14 P5: the "during sweep" traffic segment may be a byte copy of the baseline', () => {
  const make=(id,startNs,endNs)=>completeSegment({id,level:64,phase:'steady',traceSegment:'seg',offerScheduleSha256:H('s'),startNs,endNs,offers:[{scheduledAtNs:startNs,ackAtNs:String(BigInt(startNs)+1000000n)}]});
  const baseline=make('b','0','1000000000'),during=make('s','1000000000','2000000000'),sweep={startNs:'1000000000',endNs:'2000000000'},cal=calibration(1,'P5',{traceSegment:'seg',offerScheduleSha256:H('s')});
  assert.equal(nsP5Traffic({baseline,sweep:during},sweep,()=>H('correct'),[],cal).met,true);
  const r=nsP5Traffic({baseline,sweep:structuredClone(baseline)},sweep,()=>H('correct'),[],cal);assert.equal(r.met,false);assert.equal(r.reason,'P5-LIVE-TRAFFIC-NOT-VERIFIED');

});
