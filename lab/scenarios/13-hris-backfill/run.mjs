// Scenario 13: HRIS backfill through the bulk lane (TARGETS 6 row 13). Spec and golden only.
// Bulk commands carry `batch` facts for many subjects each (the bulk lane is the one place commands span
// subjects); each batch has its own commandId so per-batch receipts and retries are exact.
import { BT, VALUE, ents, scenarioStream } from '../lib/gen.mjs';
import { quantiles } from '../lib/runner.mjs';

const sidOf = n => `h${String(n).padStart(5, '0')}`;

export function generate(spec, p) {
  const backfilled = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const perSubject = p.factsPerSubject, perBatch = Math.max(1, Math.floor(p.batchFacts / perSubject));
  const batches = [];
  for (let i = 0; i < backfilled.length; i += perBatch) batches.push(backfilled.slice(i, i + perBatch));
  const events = batches.map((group, k) => { const at = Math.round((k + 0.5) / batches.length * p.liveMs * 0.9); return { at, emit: (s, rng) => {
    const c = s.command({ subject: null, writer: 'bulk', at, commandId: `hris-backfill/batch-${String(k).padStart(5, '0')}`, tags: { template: 'hrisBackfill', bulk: true, batch: k } });
    for (const sid of group) for (let f = 0; f < perSubject; f++)
      c.assert(ents(sid).worker, `:hris/field${String(f).padStart(2, '0')}`, f % 4 === 0 ? VALUE.int(rng.int(0, 1e9)) : VALUE.str(`hris-${rng.int(0, 1e9)}`), 'Worker', { validFrom: BT.T0 });
    c.done();
  } }; });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...backfilled, ...idle], events });
  return { stream, digestSubjects: [...backfilled.filter((_, n) => n % p.digestEvery === 0), ...idle, ...traceSubjects], validAts: [BT.NOW],
    witnesses: { positive: backfilled.filter((_, n) => n % p.digestEvery === 0), negative: idle }, hand: { batches: batches.length, facts: backfilled.length * perSubject } };
}

/** Bulk lane secondary measurement: live read p99 while the batches run, against before the first batch. */
export function check(ctx) {
  const bulk = ctx.ex.attempts.filter(a => ctx.gen.stream.commands[a.index].tags?.bulk);
  const from = Math.min(...bulk.map(a => a.sentAt)), to = Math.max(...bulk.map(a => a.doneAt ?? a.sentAt));
  const before = ctx.reads.filter(r => r.at < from).map(r => r.ms), during = ctx.reads.filter(r => r.at >= from && r.at <= to).map(r => r.ms);
  const p99 = list => quantiles(list).p99;
  ctx.extra.bulk = { batches: bulk.length, committed: bulk.filter(a => a.status === 'committed').length, readsBefore: before.length, readsDuring: during.length,
    readP99Before: p99(before), readP99During: p99(during), readP99Ratio: p99(before) && p99(during) ? Math.round(p99(during) / p99(before) * 100) / 100 : null };
  ctx.check('bulk-batches-each-have-a-receipt', bulk.length > 0 && bulk.every(a => a.status === 'committed' && a.receipt?.txId), ctx.extra.bulk);
}
