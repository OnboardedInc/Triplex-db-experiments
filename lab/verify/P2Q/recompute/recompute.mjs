#!/usr/bin/env node
// V-P2Q check 7: recompute every summary field of every EXP-P2Q receipt that has raw samples, from the raw
// samples alone, with an independent implementation of lib.mjs's definitions:
//   percentile p = sorted[min(n-1, ceil(p*n/100)-1)] (nearest rank), rounded to 0.1 with Math.round(x*10)/10;
//   service: warm = records.slice(min(10, floor(n/10))) feeds ackMs and ryowReadMs; RYOW counts use all records;
//   trace: latency = acked - offered over committed originals (no warmup drop); bands 5-10 / 11-25 / 26-50 by facts.
// It also regenerates each trace from trace.mjs (pure, no package imports) to check traceSha256, event counts and
// that every raw record matches its trace event, and reports interpolated percentiles for comparison.
// Usage: node recompute.mjs <receiptsDir> <traceModule> <outDir>
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [receiptsDir, traceModule, outDir] = process.argv.slice(2);
const { generateTrace, traceDigest, GENERATOR_SHA256 } = await import(traceModule);

// ---------------------------------------------------------------- statistics (independent re-implementation)
const r1 = (x) => (x === null || x === undefined ? x : Math.round(x * 10) / 10);
const r2 = (x) => Math.round(x * 100) / 100;
const sortNum = (v) => [...v].sort((a, b) => a - b);
const nearestIdx = (n, p) => Math.min(n - 1, Math.ceil((p * n) / 100) - 1);
const pctNearest = (v, p) => (v.length ? sortNum(v)[nearestIdx(v.length, p)] : null);
const pctLinear = (v, p) => { // numpy default (type 7)
  if (!v.length) return null;
  const s = sortNum(v), h = (s.length - 1) * (p / 100), lo = Math.floor(h);
  return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo];
};
const summ = (v) => ({
  n: v.length,
  p50: r1(pctNearest(v, 50)), p90: r1(pctNearest(v, 90)), p99: r1(pctNearest(v, 99)),
  max: v.length ? r1(Math.max(...v)) : null, mean: v.length ? r1(v.reduce((a, b) => a + b, 0) / v.length) : null,
});
const interp = (v) => ({ p50: r1(pctLinear(v, 50)), p90: r1(pctLinear(v, 90)), p99: r1(pctLinear(v, 99)), p99RankIs: v.length ? `${nearestIdx(v.length, 99) + 1} of ${v.length}` : null });
const tally = (items) => items.reduce((acc, k) => ((acc[k] = (acc[k] ?? 0) + 1), acc), {});
const bandOf = (facts) => (facts <= 10 ? '5-10' : facts <= 25 ? '11-25' : '26-50');

// ---------------------------------------------------------------- comparison
const rows = [];
const compare = (receipt, field, want, got) => {
  const a = JSON.stringify(sortKeys(want)), b = JSON.stringify(sortKeys(got));
  rows.push({ receipt, field, receiptValue: want, recomputed: got, status: a === b ? 'MATCH' : 'MISMATCH' });
};
const sortKeys = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortKeys(x[k])])) : x);
const note = (receipt, field, want, reason) => rows.push({ receipt, field, receiptValue: want, recomputed: null, status: `CANNOT RECOMPUTE: ${reason}` });

const extra = {}; // per-receipt diagnostics (interpolated percentiles, extremes, integrity checks)

// ---------------------------------------------------------------- service
const service = (r, raw) => {
  const id = r.id, recs = raw.records, ev = raw.events ?? [];
  compare(id, 'n (records)', r.n, recs.length);
  const drop = Math.min(10, Math.floor(recs.length / 10));
  compare(id, 'warmupDropped', r.warmupDropped, drop);
  const warm = recs.slice(drop);
  compare(id, 'ackMs', r.ackMs, summ(warm.map((x) => x.ackMs)));
  compare(id, 'ryowReadMs', r.ryowReadMs, summ(warm.map((x) => x.ryowMs)));
  compare(id, 'ryow', r.ryow, { trials: recs.length, hits: recs.filter((x) => x.ryow).length, routes: tally(recs.map((x) => x.route)) });
  compare(id, 'record indices 0..n-1 in order', true, recs.every((x, i) => x.i === i));
  compare(id, 'positions strictly increasing', true, recs.every((x, i) => i === 0 || x.position > recs[i - 1].position));
  const published = ev.filter((e) => e.type === 'published');
  if (r.arm === 'C') {
    compare(id, 'delta', r.delta, { publishedDeltaFirst: published[0]?.deltaTotal ?? null, publishedDeltaLast: published.at(-1)?.deltaTotal ?? null });
    const pub = r.publication;
    compare(id, 'publication.updates', pub.updates, published.length);
    compare(id, 'publication.membersPerUpdate', pub.membersPerUpdate, summ(published.map((e) => e.members)));
    compare(id, 'publication.updateMs', pub.updateMs, summ(published.map((e) => e.ms)));
    compare(id, 'publication.resends', pub.resends, published.reduce((a, e) => a + e.resends, 0));
    compare(id, 'publication.applyErrors', pub.applyErrors, ev.filter((e) => e.type === 'apply-error').length);
    compare(id, 'broker.frames = frame events', pub.broker.frames, ev.filter((e) => e.type === 'frame').length);
    compare(id, 'sum of published members = commits', pub.broker.commits, published.reduce((a, e) => a + e.members, 0));
    note(id, 'publication.drained (ok, ms, replicaMismatches, lastRoute)', pub.drained, 'computed after the raw samples were taken; not in raw');
  } else {
    compare(id, 'delta.first/last', { first: r.delta.first, last: r.delta.last }, { first: recs[0]?.delta ?? null, last: recs.at(-1)?.delta ?? null });
    note(id, 'delta.before', r.delta.before, 'raw has no pre-run delta; null in receipt too');
    note(id, 'publication (updates, updateMs, updateErrors)', r.publication, 'A0 client counters are not in raw');
    const d = recs.map((x, i) => (i ? x.delta - recs[i - 1].delta : null)).slice(1);
    extra[id] = { ...(extra[id] ?? {}), deltaPerCommand: { n: d.length, min: Math.min(...d), p50: pctNearest(d, 50), max: Math.max(...d), mean: r1(d.reduce((a, b) => a + b, 0) / d.length), values: d } };
  }
  const ack = warm.map((x) => x.ackMs);
  const sorted = sortNum(ack);
  extra[id] = {
    ...(extra[id] ?? {}),
    ackInterpolated: interp(ack), ackTop3: sorted.slice(-3).map(r1),
    ackWithWarmup: summ(recs.map((x) => x.ackMs)), droppedAckMs: recs.slice(0, drop).map((x) => r1(x.ackMs)),
    deltaRange: r.arm === 'C' ? [published[0]?.deltaTotal, published.at(-1)?.deltaTotal] : [recs[0]?.delta, recs.at(-1)?.delta],
  };
};

// ---------------------------------------------------------------- trace
const trace = (r, raw) => {
  const id = r.id, recs = raw.records, ev = raw.events ?? [];
  compare(id, 'generatorSha256 = trace.mjs at d7c6086', r.generatorSha256, GENERATOR_SHA256);
  const events = generateTrace({ seed: r.seed, subjects: r.subjects, durationS: r.windowS });
  compare(id, 'traceSha256 (regenerated)', r.traceSha256, traceDigest(events));
  const originals = events.filter((e) => !e.resend);
  compare(id, 'offered', r.offered, { events: events.length, originals: recs.filter((x) => !x.resend).length, resends: events.length - recs.filter((x) => !x.resend).length, burstOriginals: recs.filter((x) => !x.resend && x.burst).length });
  compare(id, 'offered (from regenerated trace)', r.offered, { events: events.length, originals: originals.length, resends: events.length - originals.length, burstOriginals: originals.filter((e) => e.burst).length });
  // Integrity: every raw record is one trace event, once; offered - atMs is one constant (startAt).
  const byKey = new Map(events.map((e) => [`${e.seq}|${e.resend}`, e]));
  const seen = new Set(); let mismatched = 0; const offsets = [];
  for (const x of recs) {
    const k = `${x.seq}|${x.resend}`, e = byKey.get(k);
    if (!e || seen.has(k) || e.facts !== x.facts || e.subject !== x.subject || e.kind !== x.kind || e.burst !== x.burst || bandOf(e.facts) !== x.band) mismatched++;
    seen.add(k); if (e) offsets.push(x.offered - e.atMs);
  }
  compare(id, 'raw records that do not match a unique trace event', 0, mismatched);
  const spread = offsets.length ? Math.max(...offsets) - Math.min(...offsets) : null;
  compare(id, 'offered - atMs constant (spread < 1e-6 ms)', true, spread !== null && spread < 1e-6);
  compare(id, 'accounting', r.accounting, { ...tally(recs.map((x) => (x.resend ? `resend:${x.outcome}` : x.outcome))), unaccounted: events.length - recs.length });
  compare(id, 'ackLoss', r.ackLoss, tally(recs.filter((x) => x.ackLossRetry).map((x) => x.ackLossRetry)));
  compare(id, 'ackLoss events offered (trace)', Object.values(r.ackLoss).reduce((a, b) => a + b, 0), originals.filter((e) => e.ackLoss).length);
  compare(id, 'resendReceipts', r.resendReceipts, tally(recs.filter((x) => x.resend && x.outcome === 'duplicate').map((x) => String(x.originalMatches))));
  const co = recs.filter((x) => !x.resend && x.outcome === 'committed');
  const lat = (rs) => rs.map((x) => x.acked - x.offered);
  for (const band of ['5-10', '11-25', '26-50']) {
    const rs = co.filter((x) => x.band === band);
    compare(id, `byBand.${band}.offerToAckMs`, r.byBand[band].offerToAckMs, summ(lat(rs)));
    compare(id, `byBand.${band}.steady`, r.byBand[band].steady, summ(lat(rs.filter((x) => !x.burst))));
    compare(id, `byBand.${band}.burst`, r.byBand[band].burst, summ(lat(rs.filter((x) => x.burst))));
  }
  compare(id, 'all.offerToAckMs', r.all.offerToAckMs, summ(lat(co)));
  compare(id, 'steady.offerToAckMs', r.steady.offerToAckMs, summ(lat(co.filter((x) => !x.burst))));
  compare(id, 'burst.offerToAckMs', r.burst.offerToAckMs, summ(lat(co.filter((x) => x.burst))));
  compare(id, 'throughput.committedPerS', r.throughput.committedPerS, r2(co.length / r.windowS));
  note(id, 'throughput.drainAfterWindowS', r.throughput.drainAfterWindowS, 'drainedAt is not in raw');
  const ry = recs.filter((x) => x.ryow !== undefined);
  compare(id, 'ryow', r.ryow, { trials: ry.length, hits: ry.filter((x) => x.ryow).length, routes: tally(ry.map((x) => x.route)), readMs: summ(ry.map((x) => x.ryowMs)) });
  compare(id, 'feed.lagMs', r.feed.lagMs, summ(raw.lags));
  compare(id, 'feed.lag samples = committed + missingAck', r.feed.lagMs.n + r.feed.missingAck, co.length + (r.feed.extras ?? 0));
  note(id, 'feed gaps/extras/visibleDuplicates/replayedEffects/orderViolations', { gaps: r.feed.gaps, extras: r.feed.extras, visibleDuplicates: r.feed.visibleDuplicates, replayedEffects: r.feed.replayedEffects, orderViolations: r.feed.orderViolations }, 'needs the consumer store and the in-memory delivery list; see logaudit.mjs for the durable store and the host log');
  const published = ev.filter((e) => e.type === 'published');
  if (r.arm === 'C' || r.arm === 'C-offline') {
    const pub = r.publication;
    compare(id, 'publication.updates', pub.updates, published.length);
    compare(id, 'publication.updateMs', pub.updateMs, summ(published.map((e) => e.ms)));
    compare(id, 'publication.membersPerUpdate', pub.membersPerUpdate, summ(published.map((e) => e.members)));
    compare(id, 'publication.lastDelta', pub.lastDelta, published.at(-1)?.deltaTotal ?? null);
    compare(id, 'publication.applyErrors', pub.applyErrors, ev.filter((e) => e.type === 'apply-error').length);
    compare(id, 'broker.frames = frame events', pub.drain.broker.frames, ev.filter((e) => e.type === 'frame').length);
  } else note(id, 'publication (A0 client counters)', { updates: r.publication.updates, updateErrors: r.publication.updateErrors }, 'A0 client counters are not in raw');
  // Diagnostics: interpolated percentiles, which commands set the extremes, the cold first command.
  const diag = { interpolated: {}, extremes: {}, firstCommand: null };
  for (const band of ['5-10', '11-25', '26-50']) {
    const rs = co.filter((x) => x.band === band);
    diag.interpolated[band] = interp(lat(rs));
    diag.extremes[band] = [...rs].sort((a, b) => (b.acked - b.offered) - (a.acked - a.offered)).slice(0, 3).map((x) => ({ seq: x.seq, facts: x.facts, ms: r1(x.acked - x.offered), atS: r1((x.offered - (offsets[0] ?? 0)) / 1000), burst: x.burst }));
    diag[`burstOnly_${band}`] = summ(lat(rs.filter((x) => x.burst)));
  }
  diag.interpolated.all = interp(lat(co));
  diag.interpolated.lag = interp(raw.lags);
  const first = [...co].sort((a, b) => a.offered - b.offered)[0];
  if (first) diag.firstCommand = { seq: first.seq, band: first.band, facts: first.facts, ms: r1(first.acked - first.offered) };
  const firstN = (k) => summ(lat([...co].sort((a, b) => a.offered - b.offered).slice(k)));
  diag.allDroppingFirst10 = firstN(10);
  const b510 = co.filter((x) => x.band === '5-10').sort((a, b) => a.offered - b.offered);
  diag.band510DroppingFirst10pct = summ(lat(b510.slice(Math.min(10, Math.floor(b510.length / 10)))));
  diag.startedBeforeOffered = recs.filter((x) => x.started < x.offered).length;
  diag.maxStartedEarlyMs = r1(Math.max(0, ...recs.map((x) => x.offered - x.started)));
  diag.unknownOrErrorByOutcome = tally(recs.filter((x) => x.outcome !== 'committed' && x.outcome !== 'duplicate').map((x) => x.outcome));
  diag.ryowEveryInferred = co.length && ry.length ? r1(co.length / ry.length) : null;
  extra[id] = diag;
};

// ---------------------------------------------------------------- run
const receipts = fs.readdirSync(receiptsDir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(receiptsDir, f), 'utf8')));
for (const r of receipts) {
  if (!r.rawPath) continue;
  const bytes = fs.readFileSync(r.rawPath);
  compare(r.id, 'rawSha256', r.rawSha256, createHash('sha256').update(bytes).digest('hex'));
  const raw = JSON.parse(bytes.toString('utf8'));
  if (r.mode === 'service') service(r, raw);
  else if (r.mode === 'trace') trace(r, raw);
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'recompute.json'), JSON.stringify({ rows, extra }, null, 2) + '\n');
const lines = rows.map((x) => `${x.status.startsWith('MATCH') ? 'MATCH   ' : x.status.startsWith('MISMATCH') ? 'MISMATCH' : 'CANNOT  '} ${x.receipt} | ${x.field} | receipt=${JSON.stringify(x.receiptValue)}${x.status === 'MISMATCH' ? ` | recomputed=${JSON.stringify(x.recomputed)}` : x.status.startsWith('CANNOT') ? ` | ${x.status}` : ''}`);
fs.writeFileSync(path.join(outDir, 'recompute.txt'), lines.join('\n') + '\n');
const counts = tally(rows.map((x) => x.status.split(':')[0]));
console.log(JSON.stringify(counts));
for (const l of lines) if (!l.startsWith('MATCH')) console.log(l);
