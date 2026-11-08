// Scenario 17: agent proposals churn (TARGETS 6 row 17). Spec and golden only.
// Agents write proposals on the subject's proposal entity (never on the I-9) at 5x the human rate; 80% are
// withdrawn (retracted) and 20% are accepted by a person, who writes the decision on the I-9 itself.
import { BT, VALUE, ents, scenarioStream } from '../lib/gen.mjs';

const sidOf = n => `g${String(n).padStart(4, '0')}`;

export function generate(spec, p) {
  const subjects = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const events = [];
  const humanGap = p.liveMs / (p.subjects * p.humanPerSubject + 1);
  let k = 0;
  subjects.forEach((sid, n) => {
    for (let j = 0; j < p.humanPerSubject * 5; j++) {
      const at = Math.round((k++ + 0.5) * humanGap / 5);
      const accept = (n + j) % 5 === 0;
      events.push({ at, emit: (s, rng) => {
        const c = s.command({ subject: sid, writer: 'agent', at, tags: { template: 'proposal' } });
        c.set(`proposal:${sid}`, ':proposal/section2Status', VALUE.str(rng.pick(['approved', 'waived'])), 'Proposal', { validFrom: BT.NOW - 60_000 })
          .set(`proposal:${sid}`, ':proposal/confidence', VALUE.int(rng.int(50, 99)), 'Proposal', { validFrom: BT.NOW - 60_000 });
        c.done();
      } });
      events.push({ at: at + 300, emit: s => {
        const c = s.command({ subject: sid, writer: accept ? 'person' : 'agent', at: at + 300, tags: { template: accept ? 'proposalAccepted' : 'proposalWithdrawn' } });
        if (accept) c.set(ents(sid).i9, ':i9/section2Status', VALUE.str('approved'), 'I9', { validFrom: BT.NOW - 30_000 });
        c.retract(`proposal:${sid}`, ':proposal/section2Status').retract(`proposal:${sid}`, ':proposal/confidence');
        c.done();
      } });
    }
  });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...subjects, ...idle], events });
  return { stream, digestSubjects: [...subjects, ...idle, ...traceSubjects], validAts: [BT.NOW],
    witnesses: { positive: subjects.filter((_, n) => [...Array(p.humanPerSubject * 5).keys()].some(j => (n + j) % 5 === 0)), negative: idle } };
}
