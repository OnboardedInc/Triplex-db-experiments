// Scenario 13: HRIS backfill through the bulk lane (TARGETS 6 row 13). Spec and golden only.
// Bulk commands carry `batch` facts for many subjects each (the bulk lane is the one place commands span
// subjects); each batch has its own commandId so per-batch receipts and retries are exact.
import { BT, VALUE, ents, scenarioStream } from '../lib/gen.mjs';

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
