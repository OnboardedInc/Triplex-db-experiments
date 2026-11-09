#!/usr/bin/env node
// Q55d: recompute P3 lag from the source's own publication instant (the broker's fsync return, `frame` event
// `at`, a few microseconds before the watermark write in the same synchronous block, broker.ts 399-409) to the
// consumer's durable record, over every committed position, from the branch's raw samples.
//
// Pairing: the driver pushes one lag per feed transact that has an ACK, in feed (position) order
// (run.mjs startConsumer). With missingAck = 0, lags[i] belongs to the i-th committed position in ascending
// order. The consumer's durable-record instant on the performance clock is acked_i + lags[i] (the driver stores
// acks with wall() right after record.acked = now(), so the clocks differ by sub-microseconds).
// Usage: node lab/verify/P2Q/scripts/q55d-lag.mjs > /Users/sam/Claude/Projects/triplex-db-2/V-P2Q/q55d-lag.json
import fs from 'node:fs';
import path from 'node:path';

const RAW = '/Users/sam/Claude/Projects/triplex-db-2/EXP-P2Q-qlever-log-broker';
const RECEIPTS = path.resolve(import.meta.dirname, '../../../experiments/EXP-P2Q-qlever-log-broker/receipts');
const runs = ['P2Q-trace-C-offline-20261107T222019Z-2591e8', 'P2Q-trace-C-20261107T222347Z-0bccda', 'P2Q-trace-A0-20261107T222616Z-5a02c5', 'P2Q-trace-C-20261107T221344Z-cad02c'];
// Nearest rank, as lib.mjs does, so the numbers are comparable with the receipts.
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] : null; };
const r1 = (x) => (x === null ? null : Math.round(x * 10) / 10);
const sum = (xs) => ({ n: xs.length, p50: r1(pct(xs, 50)), p90: r1(pct(xs, 90)), p99: r1(pct(xs, 99)), max: r1(pct(xs, 100)) });
const out = {};
for (const id of runs) {
  const raw = JSON.parse(fs.readFileSync(path.join(RAW, `${id}.raw.json`), 'utf8'));
  const receipt = JSON.parse(fs.readFileSync(path.join(RECEIPTS, `${id}.json`), 'utf8'));
  const missingAck = receipt.feed?.missingAck ?? null;
  const committed = raw.records.filter((r) => r.outcome === 'committed' && typeof r.position === 'number').sort((a, b) => a.position - b.position);
  const frameAt = new Map((raw.events ?? []).filter((e) => e.type === 'frame').map((e) => [e.lsn, e.at]));
  const entry = { contaminated: id.endsWith('cad02c'), missingAck, committed: committed.length, lags: raw.lags.length, frameEvents: frameAt.size, reportedAckToConsumer: receipt.feed?.lagMs ?? null };
  if (frameAt.size === 0) {
    entry.status = 'no source publication timestamps in raw (A0: engine is the source; its commit resolution instant is not recorded)';
    entry.ackToConsumer = sum(raw.lags);
    out[id] = entry;
    continue;
  }
  if (missingAck !== 0 || raw.lags.length !== committed.length) {
    entry.status = 'cannot pair lags to positions (missing ACKs dropped by the harness)';
    out[id] = entry;
    continue;
  }
  const fromSource = [], ackDelay = [], unmatched = [];
  committed.forEach((r, i) => {
    const at = frameAt.get(Math.floor(r.position / 1024));
    if (at === undefined) { unmatched.push(r.position); return; }
    fromSource.push(r.acked + raw.lags[i] - at);
    ackDelay.push(r.acked - at);
  });
  Object.assign(entry, {
    status: unmatched.length ? `unmatched positions ${unmatched.length}` : 'ok',
    ackToConsumer: sum(raw.lags),
    sourcePublicationToConsumer: sum(fromSource),
    sourcePublicationToClientAck: sum(ackDelay),
    negativeSourceLags: fromSource.filter((x) => x < 0).length,
  });
  out[id] = entry;
}
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
