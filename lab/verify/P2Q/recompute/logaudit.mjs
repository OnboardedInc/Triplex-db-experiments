#!/usr/bin/env node
// V-P2Q check 7: audit the feed and commit counts against the durable files the runs left behind, without the
// package code. Parses (own CRC32C, own frame parser) each candidate run's host log segment and WATERMARK, and
// each trace run's consumer .effects journal, then compares them with the raw samples:
//   - every committed record's (position, txId, commandId) is a commit member in the log, once;
//   - no commandId committed twice (lost-ACK retries and re-sends deduplicated);
//   - consumer journal: valid CRC lines, gaps / extras / duplicate keys / per-subject order in durable order;
//   - commands whose caller saw an error or outcome-unknown but that are durable in the log or the journal.
// Read-only over the experiment checkout's runs/ directory. Usage: node logaudit.mjs <receiptsDir> <runsRoot> <outDir>
import fs from 'node:fs';
import path from 'node:path';

const [receiptsDir, runsRoot, outDir] = process.argv.slice(2);

// CRC32C (Castagnoli, reflected 0x82F63B78), seedable like broker/crc32c.ts: c = ~seed; ...; return ~c.
const T = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0x82f63b78 : c >>> 1; T[n] = c >>> 0; }
const crc32c = (buf, seed = 0, start = 0, end = buf.length) => { let c = ~seed >>> 0; for (let i = start; i < end; i++) c = (T[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0; return ~c >>> 0; };
if (crc32c(Buffer.from('123456789')) !== 0xe3069283) throw new Error('crc32c check value');

const parseSegment = (file) => {
  const buf = fs.readFileSync(file);
  if (buf.subarray(0, 8).toString() !== 'TRPLXLG1') return { error: 'bad segment header' };
  let seed = crc32c(buf, 0, 0, 32), off = 32, expect = Number(buf.readBigUInt64LE(24));
  const frames = [];
  let status = 'clean-end';
  while (off < buf.length) {
    if (buf.length - off < 32 || buf.readUInt32LE(off) !== 0x464c5854) { status = `stop at ${off}: no frame magic`; break; }
    const headerCrc = buf.readUInt32LE(off + 28);
    if (crc32c(buf, seed, off, off + 28) !== headerCrc) { status = `stop at ${off}: header crc/chain`; break; }
    const len = buf.readUInt32LE(off + 4), lsn = Number(buf.readBigUInt64LE(off + 8)), epoch = buf.readUInt32LE(off + 16), kind = buf.readUInt16LE(off + 24);
    if (lsn !== expect && !(kind === 2 && lsn === expect + 1)) { status = `stop at ${off}: lsn ${lsn} != ${expect}`; break; }
    const payload = buf.subarray(off + 32, off + 32 + len), pcrc = buf.readUInt32LE(off + 32 + len);
    if (crc32c(buf, headerCrc, off + 32, off + 32 + len) !== pcrc) { status = `stop at ${off}: payload crc`; break; }
    frames.push({ lsn, epoch, kind, payload: JSON.parse(payload.toString('utf8')) });
    seed = pcrc; expect = lsn + 1; off += 32 + len + 4;
  }
  const wm = (() => { try { const w = fs.readFileSync(path.join(path.dirname(file), 'WATERMARK')); return { valid: w.readUInt32LE(0) === 0x4d575854 && crc32c(w, 0, 0, 24) === w.readUInt32LE(24), epoch: w.readUInt32LE(4), lsn: Number(w.readBigUInt64LE(8)), position: Number(w.readBigUInt64LE(16)) }; } catch { return null; } })();
  return { frames, status, bytes: buf.length, watermark: wm };
};

const parseEffects = (file) => {
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.length > 0);
  const effects = []; let bad = 0, records = 0;
  for (const l of lines) {
    const json = l.slice(9);
    if (crc32c(Buffer.from(json)).toString(16).padStart(8, '0') !== l.slice(0, 8)) { bad++; continue; }
    records++;
    for (const [p, s] of JSON.parse(json).e) effects.push([p, s]);
  }
  return { records, badLines: bad, effects };
};

const tally = (xs) => xs.reduce((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {});
const results = {};
for (const f of fs.readdirSync(receiptsDir).filter((x) => x.endsWith('.json')).sort()) {
  const r = JSON.parse(fs.readFileSync(path.join(receiptsDir, f), 'utf8'));
  if (!r.rawPath || !['service', 'trace'].includes(r.mode)) continue;
  const raw = JSON.parse(fs.readFileSync(r.rawPath, 'utf8'));
  const dirName = r.scope.replace(/[^a-zA-Z0-9-]/g, '_');
  const out = { arm: r.arm, scope: r.scope };
  const recs = raw.records;
  const committed = r.mode === 'service' ? recs.map((x) => ({ position: x.position, subject: `subj:${x.subject}`, commandId: `svc:${r.scope}:${x.i}`, txId: null })) : recs.filter((x) => x.outcome === 'committed').map((x) => ({ position: x.position, subject: `subj:${x.subject}`, commandId: `p2q:${r.scope}:${x.seq}`, txId: x.txId, seq: x.seq }));
  // ---- host log (candidate arms)
  const seg = path.join(runsRoot, dirName, 'segment-000001.log');
  if (fs.existsSync(seg)) {
    const s = parseSegment(seg);
    const members = [];
    for (const fr of s.frames) if (fr.kind === 1) for (const m of fr.payload.m) members.push({ lsn: fr.lsn, positions: m.p, commandIds: m.c.map((c) => c[0]), txIds: m.c.map((c) => c[1]), subjects: m.s });
    const byCmd = tally(members.flatMap((m) => m.commandIds));
    const byPos = new Map(members.map((m) => [m.positions[0], m]));
    let missing = 0, wrong = 0;
    for (const c of committed) { const m = byPos.get(c.position); if (!m) missing++; else if (!m.commandIds.includes(c.commandId) || (c.txId && !m.txIds.includes(c.txId)) || !m.subjects.includes(c.subject)) wrong++; }
    const committedCmds = new Set(committed.map((c) => c.commandId));
    const durableNotAcked = members.filter((m) => m.commandIds.some((id) => !committedCmds.has(id)));
    const outcomeOf = new Map(recs.filter((x) => !x.resend).map((x) => [r.mode === 'service' ? `svc:${r.scope}:${x.i}` : `p2q:${r.scope}:${x.seq}`, x.outcome ?? 'committed']));
    // Design claims checkable from the log: position = lsn*1024 + ordinal; group commit up to 64 members.
    let packingBad = 0;
    for (const fr of s.frames) if (fr.kind === 1) for (const m of fr.payload.m) for (const p of m.p) if (Math.floor(p / 1024) !== fr.lsn) packingBad++;
    const membersPerFrame = s.frames.filter((x) => x.kind === 1).map((x) => x.payload.m.length);
    out.design = { positionsNotLsnTimes1024PlusOrdinal: packingBad, maxMembersPerCommitFrame: Math.max(...membersPerFrame), framesWithMoreThanOneMember: membersPerFrame.filter((n) => n > 1).length };
    out.log = {
      status: s.status, bytes: s.bytes, frames: s.frames.length, commitFrames: s.frames.filter((x) => x.kind === 1).length, epochFrames: s.frames.filter((x) => x.kind === 2).length,
      members: members.length, lastLsn: s.frames.at(-1)?.lsn, watermark: s.watermark,
      receiptBroker: (r.publication?.broker ?? r.publication?.drain?.broker) ? { frames: (r.publication.broker ?? r.publication.drain.broker).frames, commits: (r.publication.broker ?? r.publication.drain.broker).commits, durableLsn: (r.publication.broker ?? r.publication.drain.broker).durableLsn } : null,
      committedRecords: committed.length, committedMissingFromLog: missing, committedWithWrongMember: wrong,
      commandIdsCommittedTwice: Object.values(byCmd).filter((n) => n > 1).length,
      durableButCallerSawNoReceipt: durableNotAcked.length,
      durableButCallerSawNoReceiptByOutcome: tally(durableNotAcked.flatMap((m) => m.commandIds.map((id) => outcomeOf.get(id) ?? 'no record'))),
    };
  }
  // ---- consumer journal (trace runs)
  if (r.mode === 'trace') {
    const consumer = `consumer-${r.arm === 'C-offline' ? 'C' : r.arm}`;
    const e = parseEffects(path.join(runsRoot, 'consumers', dirName, `${consumer}.effects`));
    if (e) {
      const key = (p, s) => `${p}|${s}`;
      const counts = tally(e.effects.map(([p, s]) => key(p, s)));
      const expected = new Set(committed.map((c) => key(c.position, c.subject)));
      const last = new Map(); let orderViolations = 0;
      for (const [p, s] of e.effects) { if (last.has(s) && last.get(s) > p) orderViolations++; last.set(s, p); }
      const extras = Object.keys(counts).filter((k) => !expected.has(k));
      // Which commands are behind the extras: match each extra to a non-committed original with the same subject.
      const nonCommitted = recs.filter((x) => !x.resend && x.outcome !== 'committed');
      const extraOwners = extras.map((k) => { const subj = k.split('|')[1]; const cand = nonCommitted.filter((x) => `subj:${x.subject}` === subj); return { key: k, candidates: cand.map((x) => ({ seq: x.seq, outcome: x.outcome, error: x.error?.slice(0, 80) })) }; });
      out.journal = {
        records: e.records, badCrcLines: e.badLines, effects: e.effects.length, distinctKeys: Object.keys(counts).length,
        gaps: [...expected].filter((k) => !(k in counts)).length, extras: extras.length, duplicateKeys: Object.values(counts).filter((n) => n > 1).length,
        orderViolationsInDurableOrder: orderViolations,
        receipt: { committedEffects: r.feed.committedEffects, durableEffects: r.feed.durableEffects, gaps: r.feed.gaps, extras: r.feed.extras, visibleDuplicates: r.feed.visibleDuplicates, orderViolations: r.feed.orderViolations, writes: r.feed.writes },
        extraOwners: extraOwners.slice(0, 40),
      };
    }
  }
  results[r.id] = out;
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'logaudit.json'), JSON.stringify(results, null, 2) + '\n');
for (const [id, x] of Object.entries(results)) {
  const j = x.journal ? { ...x.journal, extraOwners: x.journal.extraOwners.length > 5 ? `${x.journal.extraOwners.length} (see logaudit.json)` : x.journal.extraOwners } : undefined;
  console.log(id, JSON.stringify({ log: x.log, journal: j }));
}
