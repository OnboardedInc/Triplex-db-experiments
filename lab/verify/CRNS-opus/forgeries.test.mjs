// Opus adversarial review of recomputeNS (exp/CRNS-recompute at 2f299bfa). Run: node --test lab/verify/CRNS-opus/
// Each forgery test asserts the behaviour a sound evaluator needs (REFUSED). Forgeries the code currently accepts are
// marked { todo } so the file stays green and the TAP output lists every open gap as "# TODO".
// The fixture is written independently of lab/bin/test/claim-ns.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { recomputeNS, canonText, NS_ENCODING_SHA256, nsFeedEntryBytes, nsP1Ladder, nsP4History, nsP5Traffic } from '../../bin/claim.mjs';

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
  commits ??= [0, 1, 2].map(i => ({ cmds: [`c${i}`], subjects: [`s${i}`] }));
  const entries = [], sourceBrackets = [], consumerBrackets = [], txs = [], effects = [], affected = [], deliveries = [];
  const firstCommit = new Map();
  commits.forEach((c, i) => {
    const pos = c.pos ?? t(i + 1), base = START + BigInt(i) * 100n * MS + 10n * MS;
    const tx = { stamp: `st${i}`, positions: [pos], txIds: [`tx${i}`], operationId: `op${i}`, commandIds: c.cmds,
      changes: c.subjects.map((s, j) => ({ op: 'assert', entity: s, attribute: 'a', validFrom: '0', validTo: '9', position: pos, assertionId: `as${i}.${j}` })) };
    const entry = { stream: 'feed', epoch: '1', offset: t(i), kind: 'commit', transactions: [tx] };
    entries.push(entry);
    for (const id of c.cmds) if (!firstCommit.has(id)) firstCommit.set(id, { pos, tx, base });
    const sL = base + BigInt(c.sL ?? 2) * MS, sU = base + BigInt(c.sU ?? 3) * MS;
    sourceBrackets.push({ position: pos, L: t(sL), U: t(sU) });
    if (c.cU !== null) consumerBrackets.push({ position: pos, L: t(base + BigInt(c.cL ?? 5) * MS), U: t(base + BigInt(c.cU ?? 6) * MS) });
    c.digest = H(nsFeedEntryBytes(entry)); c.pos = pos; c.offset = t(i);
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
    source: { origin: 'observer-source-store', firstOffset: '0', finalOffset: t(entries.length - 1), entries },
    sourceBrackets, consumerBrackets,
    consumer: { initialFrontier: '0', walComplete: true, tailedWalHex: 'aa', finalWalHex: 'aabb', transactions: txs, effects, affected, deliveries },
    offers, reads: [], faults: [], readers: [{ second: 0, loops: [0], relayConcurrent: 1 }], crossChecks: [], noise: { grade: 'GREEN' },
  } };
  const trusted = { key: KEY, binding: BINDING, driver: DRIVER, encodingSha256: NS_ENCODING_SHA256, clockDomain: CLOCK, readerLevel: 1, priorities,
    domainAffected: ({ transaction }) => [...new Set(transaction.changes.map(c => c.entity))],
    gradeWindow: () => 'GREEN', verifySource: () => true, commandValid: () => true, ryow: () => true, steadyRate: 100 };
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
test('B1 baseline already shows vacuous inputs accepted: WAL hex "aa", crossChecks [], faults [], one offer per band, one reader loop', () => {
  const r = run(world({ priorities: ['P3', 'P2'] }));
  assert.equal(r.status, 'RECOMPUTED');
  assert.equal(r.measurements.P2.latency['5-10'].count, 1);
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
test('O1 P2/P3: the same command committed twice in the source (retry not idempotent) is refused', { todo: 'gap: no commandId uniqueness across source transactions' }, () => {
  const w = world({ priorities: ['P3', 'P2'], commits: [{ cmds: ['c0'], subjects: ['s0'] }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }, { cmds: ['c0'], subjects: ['s0'] }] });
  refused(run(w), 'c0 committed twice');
});

// ------------------------------------------------------------------ O2 fast typed error, slow async commit
test('O2 P2: typed error ACKed in 1 ms while the command commits 400 ms later is refused', { todo: 'gap: typedError latency counted; error for a command that later publishes is accepted' }, () => {
  const w = world({ priorities: ['P3', 'P2'], commits: [{ cmds: ['c0'], subjects: ['s0'], sL: 400, sU: 401, cL: 402, cU: 403 }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }],
    mutate: e => { const o = e.offers[0]; delete o.receipt; o.typedError = { code: 'BUSY' }; o.ackAtNs = t(BigInt(o.scheduledAtNs) + 1n * MS); } });
  const r = run(w);
  assert.equal(r.measurements.P2?.latency['5-10'].p99Ms, 1);
  refused(r, 'fast error, async commit');
});

// ------------------------------------------------------------------ O3 retry returns typed error, not original receipt
test('O3 P2: a duplicate retry answered with a typed error instead of the original receipt is refused', { todo: 'gap: only receipt-vs-receipt equality is checked' }, () => {
  const w = world({ priorities: ['P3', 'P2'], mutate: e => { const o = e.offers[0]; e.offers.push({ ...o, receipt: undefined, typedError: { code: 'DUPLICATE' } }); delete e.offers.at(-1).receipt; } });
  refused(run(w), 'retry got typed error');
});

// ------------------------------------------------------------------ O4 duplicate visible effect under another epoch/consumer label
for (const [label, patch] of [['epoch', { epoch: '2' }], ['consumer', { consumer: 'k2' }]]) {
  test(`O4 P3: a second visible effect for the same (position, subject) under a different ${label} label is refused`, { todo: 'gap: duplicate key includes free-text consumer/epoch; subject sets collapse' }, () => {
    const w = world({ mutate: e => { const tx = e.consumer.transactions[0]; const dup = { ...tx.effects[0], ...patch }; tx.effects.push(dup); e.consumer.effects.push({ ...dup }); } });
    refused(run(w), `duplicate effect via ${label}`);
  });
}

// ------------------------------------------------------------------ O5 feed order disagrees with cursor order
test('O5 P3: source entry order (offset) contradicting cursor order (position) is refused', { todo: 'gap: positions never compared with offsets or entry coordinates' }, () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'], pos: '2' }, { cmds: ['c1'], subjects: ['s1'], pos: '1' }, { cmds: ['c2'], subjects: ['s2'], pos: '3' }] });
  refused(run(w), 'offset 0 carries position 2, offset 1 carries position 1');
});
test('O5b P3: a position whose coordinates disagree with its entry (offset 0 entry, position offset 999) is refused', { todo: 'gap' }, () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'], pos: '999' }, { cmds: ['c1'], subjects: ['s1'], pos: '1000' }, { cmds: ['c2'], subjects: ['s2'], pos: '1001' }] });
  refused(run(w), 'position not tied to entry offset');
});

// ------------------------------------------------------------------ O6 P3-only evaluation skips offer-side checks
test('O6a P3 only: candidate typed-rejects 2 of 3 valid commands, tiny feed passes P3', { todo: 'gap: VALID-COMMAND-NOT-PUBLISHED runs only when a non-P3 priority is requested' }, () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'] }], mutate: e => {
    for (const i of [1, 2]) e.offers.push({ commandId: `c${i}`, subject: `s${i}`, sizeBand: BANDS[i], scheduledAtNs: t(START + 500n * MS), sentAtNs: t(START + 500n * MS), ackAtNs: t(START + 501n * MS), typedError: { code: 'REJECT' } });
  } });
  const r = run(w);
  assert.equal(r.measurements.P3.lag.pooled.count, 1);
  refused(r, 'progress not required for P3');
});
test('O6b P3 only: ACK before publication (lag start moved late by hiding the commit from the source store) is refused', { todo: 'gap: ACK-BEFORE-PUBLICATION runs only in nsOtherPriorities' }, () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'], sL: 5, sU: 6, cL: 7, cU: 8 }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }] });
  refused(run(w), 'ack at +4 ms, publication bracket [+5,+6]');
});

// ------------------------------------------------------------------ O7 / O8 resume
test('O7 P3: a RECOMPUTED result carries resume-from-checkpoint evidence', { todo: 'gap: faults=[] skips CX-FAULT; any faulted bundle is TIMING-UNJUDGED, so no RECOMPUTED path verifies resume' }, () => {
  const r = run(world());
  assert.equal(r.status, 'RECOMPUTED');
  assert.ok(Object.keys(r.bars.P3).some(k => /resume|fault|replay/i.test(k)), `P3 bars: ${Object.keys(r.bars.P3)}`);
});
test('O8 P3: fault witnesses that each replay one arbitrary entry (not from the checkpoint) are refused as FAULT-WITNESS-INVALID', { todo: 'gap: replay completeness and checkpoint origin unchecked' }, () => {
  const w = world({ mutate: e => {
    let n = 0;
    for (const point of ['before-effect', 'after-effect', 'after-checkpoint']) for (let k = 0; k < 3; k++) {
      const events = [{ transition: 'cgroup-gone', t: t(START + 10n * MS), n: n++ }];
      e.faults.push({ format: 'fault-witness/1', binding: BINDING, faultPointId: point, events, eventsSha256: H(canonText(events)),
        replay: [{ offset: '2', digest: e.consumer.deliveries[2].digest }] });
    }
  } });
  const r = run(w);
  assert.ok(!codes(r).includes('FAULT-WITNESS-INVALID'), 'precondition: currently accepted as valid witnesses');
  assert.ok(codes(r).includes('FAULT-WITNESS-INVALID'), `reasons: ${codes(r)}`);
});

// ------------------------------------------------------------------ O9 positions outside the measured window
test('O9 P3: a commit published after window end that never reaches the consumer durable record is refused', { todo: 'gap: missing consumer bracket only refused when source L is inside [start,end)' }, () => {
  const w = world({ commits: [{ cmds: ['c0'], subjects: ['s0'] }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'], sL: 1500, sU: 1501, cU: null }] });
  refused(run(w), 'late commit with no consumer durable record');
});

// ------------------------------------------------------------------ O12 E8 reader level vs actual reads
test('O12 P3: lag "with 256 readers" accepted while reads[] is empty and readers[] only claims loop ids', { todo: 'gap: E8 loops are not cross-checked against reads[]' }, () => {
  const loops = Array.from({ length: 256 }, (_, i) => i);
  const w = world({ mutate: (e, tr) => { tr.readerLevel = 256; e.readers = [{ second: 0, loops, relayConcurrent: 256 }]; } });
  refused(run(w), '256 readers claimed, zero reads');
});

// ------------------------------------------------------------------ O16 oracles see the future
test('O16 oracle "prefix" stops at the position being evaluated', { todo: 'gap: domainAffected/replayRead/ryow/commandValid/domainSweep all receive the full entries list' }, () => {
  const seen = [];
  const w = world({ mutate: (e, tr) => { const f = tr.domainAffected; tr.domainAffected = a => { seen.push([a.entry.offset, a.prefix.length]); return f(a); }; } });
  run(w);
  assert.deepEqual(seen, [['0', 1], ['1', 2], ['2', 3]]);
});

// ------------------------------------------------------------------ O17 source content vs offered command
test('O17 P2/P3: committed change subject differing from the offered command subject is refused', { todo: 'gap: offers carry no content digest; subject never compared; only trusted stubs could catch it' }, () => {
  const w = world({ priorities: ['P3', 'P2'], commits: [{ cmds: ['c0'], subjects: ['zzz'] }, { cmds: ['c1'], subjects: ['s1'] }, { cmds: ['c2'], subjects: ['s2'] }] });
  refused(run(w), 'offer subject s0, committed change on zzz');
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
test('O18/O25 broker-frame/2: self-made CRC frames whose bytes are unrelated to the entries bypass verifySource and are refused', { todo: 'gap: entries never decoded from frames; CRC is not authentication; storage kind not pinned by trusted' }, () => {
  const w = world({ mutate: (e, tr) => {
    tr.verifySource = () => false; // the evaluator would refuse this source if asked
    let prev = 7; const frames = [];
    for (let i = 0; i < 3; i++) { const f = frame(i, 1, prev, 'not-the-entry'); frames.push(f.frame); prev = f.crc; }
    Object.assign(e.source, { storage: 'broker-frame/2', frames, initialCrc: 7, finalCrc: prev });
  } });
  refused(run(w), 'frames unrelated to entries');
});

// ------------------------------------------------------------------ O22 ACK inside a wide bracket
test('O22 P2: ACK inside a 150 ms wide publication bracket is accepted as merely undecided', { todo: 'gap: no bound on bracket width or ackUndecided share' }, () => {
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
  return windows;
}
const replayRead = read => H(`p@${read.requestedBasis}/hops${read.hops}`);
test('L0 ladder fixture sanity: met', () => { assert.equal(nsP1Ladder(ladder(), replayRead, []).met, true); });
test('O10 P1: a hops-6 read answered with the hops-3 answer is a violation', { todo: 'gap: expected-answer memo keyed by [subject, shape, requestedBasis] only (claim.mjs:1917, 2002)' }, () => {
  const r = nsP1Ladder(ladder({ hopsSecond: true }), replayRead, []);
  assert.equal(r.met, false);
});
test('O11 P1: a "1024-reader" window whose reads all come from one loop is refused', { todo: 'gap: ladder level is a self-declared label' }, () => {
  assert.throws(() => nsP1Ladder(ladder(), replayRead, []));
});
test('O24 P1: recovery window matched although neither the 1024 window nor the recovery window has an id', { todo: 'gap: undefined === undefined matches' }, () => {
  assert.throws(() => nsP1Ladder(ladder({ recoveryIds: false }), replayRead, []), /P1-RECOVERY-MISSING|EVENT-SCHEMA/);
});
test('O29a P1: writer p99 at 256 readers of 120 ms passes because the zero-reader baseline was slowed to 100 ms', { todo: 'gap: only relative writer bars in the ladder' }, () => {
  const w = ladder({ baseWriterMs: 100 });
  for (const x of w) if (x.level !== 0) x.offers[0].ackAtNs = t(BigInt(x.offers[0].scheduledAtNs) + 120n * MS);
  assert.equal(nsP1Ladder(w, replayRead, []).met, false);
});

// ------------------------------------------------------------------ P4 history (O13)
test('O13 P4: history-flatness pulls without any answer check are refused', { todo: 'gap: historyPulls carry no answer hash; correctness and bytesRead origin unchecked' }, () => {
  const pulls = [];
  for (const depth of [1, 3, 10]) for (let i = 0; i < 1000; i++) pulls.push({ depth, subject: `s${i}`, sentAtNs: '0', receivedAtNs: t(MS), bytesRead: '100' });
  assert.throws(() => nsP4History(pulls));
});

// ------------------------------------------------------------------ P5 traffic (O14)
test('O14 P5: the "during sweep" traffic segment may be a byte copy of the baseline', { todo: 'gap: nsP5Traffic never sees the sweep interval; overlap and 64 readers unchecked' }, () => {
  const seg = { phase: 'steady', traceSegment: 'seg', offerScheduleSha256: H('s'), startNs: '0', endNs: t(1_000_000_000n),
    reads: [{ sentAtNs: t(MS), receivedAtNs: t(2n * MS) }], offers: [{ scheduledAtNs: t(MS), ackAtNs: t(5n * MS) }] };
  const r = nsP5Traffic({ baseline: seg, sweep: structuredClone(seg) });
  assert.equal(r.met, false);
});
