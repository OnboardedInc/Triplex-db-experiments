// Scenario 8: "address wrong since October" (TARGETS 6 row 8).
//
// Each corrected subject gets one retroactive valid-time correction: the open address assertion is retracted,
// re-asserted bounded [validFrom, OCT1), and the fix asserted from OCT1 (30+ days back). Checked at three
// valid times (NOW, OCT15 and SEP15) and two record times (just before and at the correction's receipt).
import { BT, T, scenarioStream } from '../lib/gen.mjs';
import { expectDomain } from '../lib/domain.mjs';
import { pullDigest } from '../lib/runner.mjs';

const sidOf = n => `c${String(n).padStart(4, '0')}`;
const SEP15 = Date.UTC(2026, 8, 15);

export function generate(spec, p) {
  const fixed = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const events = fixed.map((sid, n) => { const at = Math.round((n + 1) / (fixed.length + 1) * p.liveMs); return { at, emit: (s, rng) => T.addressCorrection(s, rng, sid, { at }) }; });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...fixed, ...idle], events });
  return { stream, digestSubjects: [...fixed, ...idle, ...traceSubjects], validAts: [BT.NOW, BT.OCT15, SEP15], witnesses: { positive: fixed, negative: idle } };
}

export async function check(ctx) {
  const cmds = ctx.gen.stream.commands.filter(c => c.tags?.template === 'addressCorrection');
  const feedAt = new Map(ctx.feedSeen.map(f => [f.position, f]));
  let oldBelief = 0, newBelief = 0, bounded = 0, rangeReported = 0, affected = 0; const first = [];
  for (const c of cmds) {
    const a = ctx.ex.byIndex.get(c.index);
    if (a?.status !== 'committed') continue;
    const g = ctx.expected.digests[c.subject];
    const prior = [...(ctx.ex.ledger.get(c.subject) ?? [])].filter(e => e.position < a.receipt.position).at(-1);
    const before = prior ? g.after[prior.index] : g.base;
    const after = g.after[c.index];
    const pull = (R, V) => pullDigest(ctx, c.subject, { recordedAt: R, validAt: V });
    const address = r => r.rows?.find(row => row[1] === ':worker/addressLine')?.[2] ?? null;
    // Explain at the old basis still shows the old belief; at the new basis, the fix from October on.
    const okOld = (await pull(a.receipt.instant - 1, BT.OCT15)).digest === before[BT.OCT15];
    const okNew = (await pull(a.receipt.instant, BT.OCT15)).digest === after[BT.OCT15];
    // Before October the address is unchanged in value (its assertion is now bounded, so the row differs).
    const sepAfter = await pull(a.receipt.instant, SEP15), sepBefore = await pull(a.receipt.instant - 1, SEP15);
    const okSep = sepAfter.digest === after[SEP15] && sepBefore.digest === before[SEP15] && address(sepAfter) !== null && address(sepAfter) === address(sepBefore);
    oldBelief += okOld; newBelief += okNew; bounded += okSep;
    // The feed reports the valid-time range affected: an open assert from OCT1 on the worker entity.
    const rec = feedAt.get(a.receipt.position);
    const hasRange = !!rec && rec.validRanges.some(([from, to]) => from === BT.OCT1 && to == null);
    rangeReported += hasRange;
    affected += !!rec && rec.entities.some(e => ctx.unphys(e) === `worker:${c.subject}`);
    if ((!okOld || !okNew || !okSep || !hasRange) && first.length < 3) first.push({ sid: c.subject, okOld, okNew, okSep, hasRange });
  }
  const n = cmds.length;
  ctx.extra.corrections = { n, oldBelief, newBelief, bounded, rangeReported, affected };
  ctx.check('old-basis-shows-old-belief', oldBelief === n, { ...ctx.extra.corrections, first });
  ctx.check('new-basis-shows-correction', newBelief === n && bounded === n, ctx.extra.corrections);
  ctx.check('feed-reports-valid-range', rangeReported === n && affected === n, ctx.extra.corrections);
  // Derived state is re-run: which derived outputs change is W0's, so O-DOMAIN owns it.
  expectDomain(ctx, { id: 'derived-state-rerun-after-correction', kind: 'affected-subjects', subjects: cmds.map(c => c.subject) });
}
