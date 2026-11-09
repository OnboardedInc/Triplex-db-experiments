// Scenario 16: PII erasure request (TARGETS 6 row 16; semantics in TARGETS 7 and RULINGS Q24). Spec and golden only.
//
// The erasure request is a command that records the request on the subject's erasure-ledger entity; the
// erasure itself (crypto-shredding of the subject key or a real delete) is a lane mechanism Triplex does not
// have yet. O-REPLAY has no erasure rule, so the post-erasure expectations are a frozen hand derivation from
// TARGETS 7: after the erasure commit publishes, every read at every basis (including bases before the
// erasure) returns `ErasedValue {erasedAt}` in place of each PII value, with assertion identities and valid and
// record intervals unchanged. Pre-erasure digests from O-REPLAY are kept for the "read already pinned when the
// erasure lands" test (that read may return the old value).
import { BT, VALUE, scenarioStream } from '../lib/gen.mjs';

const sidOf = n => `p${String(n).padStart(5, '0')}`;
export const PII = [':worker/name', ':worker/addressLine', ':worker/email', ':i9/ssnLast4', ':i9/dateOfBirth'];

export function generate(spec, p) {
  const erased = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const kept = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const events = erased.map((sid, n) => { const at = Math.round((0.2 + 0.7 * (n + 0.5) / erased.length) * p.liveMs); return { at, emit: s => {
    // O-REPLAY 0.4.1 models erasure (R-ERA-2): the op is spelled `erase`, in a command of its own.
    const c = s.command({ subject: sid, writer: 'person', at, commandId: `erasure/${sid}`, tags: { template: 'erasureRequest', erasure: true } });
    const done = c.done();
    for (const attribute of PII) done.operations.push({ op: 'erase', entityId: attribute.startsWith(':worker/') ? `worker:${sid}` : `i9:${sid}`, attribute });
  } }; });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...erased, ...kept], events });
  return { stream, digestSubjects: [...erased, ...kept, ...traceSubjects], validAts: [BT.NOW, BT.OCT15],
    witnesses: { kind: 'erasure', positive: erased, negative: kept },
    hand: {
      source: 'TARGETS section 7 items 1 to 6; RULINGS Q24',
      afterErasurePublishes: { attributes: PII, value: { type: 'erased', erasedAt: '<instant of the erasure commit publication>' }, bases: 'every basis, including bases before the erasure', unchanged: ['assertion ids', 'validFrom', 'validTo', 'recordedAt', 'retraction fields'] },
      pinnedReader: 'a read that started before the erasure published may return the old value (compare with the pre-erasure O-REPLAY digest)',
      rebuild: 'after rebuilding every index from the source of truth, PII values are still markers',
      restore: 'after restoring a pre-erasure backup, the erasure ledger (erasure:<sid>) is replayed and PII values are markers again',
      protectedCopies: 'every lane lists its protected-copy inventory (TARGETS 7 item 3) in the receipt; order keys of PII attributes are inside the envelope (item 4)',
      reproduction: 'GS.12-style repeat answers compare with erased values replaced by their markers (item 2)',
    } };
}
