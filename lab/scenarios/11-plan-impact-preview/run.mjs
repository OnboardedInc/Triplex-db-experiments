// Scenario 11: plan impact preview (TARGETS 6 row 11; common basis with GS.10 in 6.1 item 4). Spec and golden only.
//
// Same world as GS.10 (releases R1 and R2, account on R1), but R2 is never activated: "who gains work" under
// R2 is previewed for every in-scope subject at one captured basis while the trace runs. The preview must equal
// GS.10's post-activation sweep when both are evaluated at the same input basis, so the comparison runs GS.11
// at GS.10's R_act (the receipt of GS.10 binds it). Preview and sweep outputs are W0's: O-DOMAIN.
import { BT, RELEASES, T, scenarioStream } from '../lib/gen.mjs';

const sidOf = n => `a${String(n).padStart(4, '0')}`;
export const ACCOUNT = 'acct0';

export function generate(spec, p) {
  const subjects = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const releaseSids = {};
  const built = scenarioStream(spec, p, { subjects, events: [
    { at: -3, emit: s => { releaseSids.R1 = T.releaseDefine(s, RELEASES.R1, { phase: 'setup' }); } },
    { at: -2, emit: s => { releaseSids.R2 = T.releaseDefine(s, RELEASES.R2, { phase: 'setup' }); } },
    { at: -1, emit: s => T.activate(s, ACCOUNT, releaseSids.R1, { phase: 'setup' }) },
  ] });
  // Candidate domain witnesses from R2's added rule (pay.rate>=1650cents): subjects below $16.50 gain work.
  // A hand derivation (TARGETS 6 numbers rule); O-DOMAIN must confirm it.
  const rate = new Map();
  for (const c of built.stream.commands) for (const op of c.operations) if (op.attribute === ':placement/payRateCents') rate.set(op.entityId.slice(10), Number(op.value.value));
  const gain = subjects.filter(s => rate.get(s) < 1650), keep = subjects.filter(s => rate.get(s) >= 1650);
  return { stream: built.stream, digestSubjects: [...subjects, ...built.traceSubjects, ACCOUNT, releaseSids.R1, releaseSids.R2], validAts: [BT.NOW],
    witnesses: { kind: 'domain', positive: gain, negative: keep },
    hand: { releases: releaseSids, rule: 'R2 adds pay.rate>=1650cents (lib/gen.mjs RELEASES)', gainsWork: gain.length, unchanged: keep.length, commonBasis: 'GS.10 R_act' } };
}
