// Scenario 20: midnight expiry wave (TARGETS 6 row 20). Spec and golden only.
// Each expiring subject holds a List A document whose validity ends at 2026-11-08T00:00Z (a valid-time
// boundary). Reads at one millisecond before and at midnight must differ exactly by those documents.
import { BT, VALUE, ents, scenarioStream } from '../lib/gen.mjs';

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
