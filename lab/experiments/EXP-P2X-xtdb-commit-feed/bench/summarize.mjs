// EXP-P2X: print the report tables from the receipts (superseded/ is ignored).
// Run: node summarize.mjs [--since ISO]   (only receipts written at or after --since)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'receipts');
const since = process.argv.includes('--since') ? process.argv[process.argv.indexOf('--since') + 1] : '';
const receipts = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  .filter((r) => r.writtenAt >= since).sort((a, b) => a.writtenAt.localeCompare(b.writtenAt));
const p = (s) => (s ? `${s.p50} / ${s.p90} / ${s.p99}` : 'n/a');
const load = (r) => `${r.identity.host.loadavg[0]}`;
const row = (cells) => `| ${cells.join(' | ')} |`;
const out = [];
const section = (title, header, rows) => { out.push(`\n### ${title}\n`, row(header), row(header.map(() => '---')), ...rows); };

section('Service time, 1 writer closed loop (ms, p50 / p90 / p99)', ['receipt', 'arm', 'submit p50', 'service', 'commits/s', 'git', 'load1'],
  receipts.filter((r) => r.mode === 'service').map((r) => row([r.id, r.arm, r.timings.submitMs.p50, p(r.serviceMs), r.commitsPerS, r.identity.gitHead.slice(0, 7), load(r)])));
section('16 writers on 16 distinct subjects of one scope (closed loop)', ['receipt', 'arm', 'outcomes', 'CAS rejections', 'commits/s', 'latency p50 / p90 / p99', 'submit p50', 'load1'],
  receipts.filter((r) => r.mode === 'contention').map((r) => row([r.id, r.arm, JSON.stringify(r.outcomes), r.crossSubjectCasConflicts, r.commitsPerS, p(r.latencyMs), r.timings?.submitMs?.p50 ?? 'n/a', load(r)])));
for (const r of receipts.filter((x) => x.mode === 'trace')) {
  section(`Trace ${r.arm} (${r.id}; seed ${r.seed}, ${r.subjects} subjects, ${r.windowS} s, trace ${r.traceSha256.slice(0, 12)}, generator ${r.generatorSha256.slice(0, 12)})`,
    ['band', 'offer-to-ACK p50 / p90 / p99', 'service p50 / p90 / p99', 'n'],
    [...Object.entries(r.byBand).map(([band, b]) => row([band, p(b.offerToAckMs), p(b.serviceMs), b.offerToAckMs.n])),
      row(['all', p(r.all.offerToAckMs), p(r.all.serviceMs), r.all.offerToAckMs.n]),
      row(['steady', p(r.steady.offerToAckMs), '', r.steady.offerToAckMs.n]),
      row(['burst', p(r.burst.offerToAckMs), '', r.burst.offerToAckMs.n])]);
  out.push(`\naccounting ${JSON.stringify(r.accounting)}; ackLoss ${JSON.stringify(r.ackLoss)}; resend receipts match ${JSON.stringify(r.resendReceipts)}; throughput ${JSON.stringify(r.throughput)}; conflicts ${JSON.stringify(r.conflicts)}`);
  const f = r.feed;
  out.push(`feed: lag ${p(f.lagMs)} ms (n ${f.lagMs.n}, max ${f.lagMs.max}); gaps ${f.gaps}; extras ${f.extras}; order violations ${f.orderViolations}; visible duplicates ${f.visibleDuplicates}; replayed ${f.replayedEffects}; effects ${f.durableEffects}/${f.committedEffects}; polls ${f.polls}; writes ${f.writes}; aborted listed ${f.abortedListed}; blocked polls ${f.blockedPolls}; missing publication ${f.missingPublication}; poll ${p(f.pollMs)}; write ${p(f.writeMs)}`);
}
for (const r of receipts.filter((x) => x.mode === 'preload')) {
  const f = r.feed;
  out.push(`\n### Preload ${r.id}: ${r.commits} commits, batch ${r.batch}, concurrency ${r.concurrency}: ${JSON.stringify(r.outcomes)}, ${r.commitsPerS} commits/s, ${r.elapsedS} s`);
  out.push(`feed: lag ${p(f.lagMs)} ms (n ${f.lagMs.n}); gaps ${f.gaps}; extras ${f.extras}; order violations ${f.orderViolations}; visible duplicates ${f.visibleDuplicates}; effects ${f.durableEffects}/${f.committedEffects}; aborted listed ${f.abortedListed}; blocked polls ${f.blockedPolls}`);
}
section('Crash injection (100 crashes each, cycling the three points)', ['receipt', 'variant', 'injected', 'restarts', 'replay attempts', 'visible duplicates', 'gaps', 'extras', 'order violations'],
  receipts.filter((r) => r.mode === 'crash').map((r) => row([r.id, r.variant, JSON.stringify(r.injected), r.restarts, r.replayAttempts, r.visibleDuplicates, r.gaps, r.extras, r.orderViolations])));
console.log(out.join('\n'));
