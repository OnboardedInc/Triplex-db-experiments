// @ts-nocheck -- [EXP-CHECKJS-R2] mutable records inferred from their initial values; unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
// Scenario 20: midnight expiry wave (TARGETS 6 row 20). Spec and golden only.
// Each expiring subject holds a List A document whose validity ends at 2026-11-08T00:00Z (a valid-time
// boundary). Reads at one millisecond before and at midnight must differ exactly by those documents.
import { BT, VALUE, ents, scenarioStream } from '../lib/gen.mjs';
import { expectDomain } from '../lib/domain.mjs';
import { expectedDigest, pullDigest } from '../lib/runner.mjs';

const sidOf = n => `x${String(n).padStart(5, '0')}`;

export function generate(spec, p) {
  const expiring = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const valid = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const setup = [...expiring, ...valid].map((sid, n) => ({ at: -1, emit: s => {
    const c = s.command({ subject: sid, writer: 'person', at: 0, tags: { template: 'documentUpload', phase: 'setup' } });
    const until = n < expiring.length ? BT.MIDNIGHT : BT.MIDNIGHT + 365 * BT.DAY;
    c.assert(ents(sid).i9, ':i9/listADocument', VALUE.str(`passport-${sid}`), 'I9', { validFrom: BT.T0, validTo: until })
      .assert(ents(sid).i9, ':i9/listADocumentExpires', VALUE.dt(until), 'I9', { validFrom: BT.T0 });
    c.done();
  } }));
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...expiring, ...valid], events: setup });
  return { stream, digestSubjects: [...expiring, ...valid, ...traceSubjects], validAts: [BT.NOW, BT.MIDNIGHT - 1, BT.MIDNIGHT],
    witnesses: { kind: 'valid-time', positive: expiring, negative: valid },
    hand: { boundary: BT.MIDNIGHT, rule: 'positive witnesses: digest at MIDNIGHT-1 != digest at MIDNIGHT; negative: equal (both from O-REPLAY)' } };
}

/** Valid-time witnesses: at the latest record time, MIDNIGHT-1 and MIDNIGHT differ exactly for the expiring documents. */
export async function check(ctx) {
  let bad = 0; const first = [];
  for (const [list, shouldDiffer] of [[ctx.gen.witnesses.positive, true], [ctx.gen.witnesses.negative, false]]) {
    for (const sid of list) {
      const before = await pullDigest(ctx, sid, { validAt: BT.MIDNIGHT - 1 }), after = await pullDigest(ctx, sid, { validAt: BT.MIDNIGHT });
      const ok = before.ok && after.ok && before.digest === expectedDigest(ctx, sid, Infinity, BT.MIDNIGHT - 1)
        && after.digest === expectedDigest(ctx, sid, Infinity, BT.MIDNIGHT) && ((before.digest !== after.digest) === shouldDiffer);
      if (!ok) { bad++; if (first.length < 3) first.push({ sid, shouldDiffer, before: before.digest ?? before.error, after: after.digest ?? after.error }); }
    }
  }
  ctx.check('midnight-boundary-exact', bad === 0, { bad, first });
  expectDomain(ctx, { id: 're-run-at-midnight-boundary', kind: 'affected-subjects', subjects: ctx.gen.witnesses.positive });
}
