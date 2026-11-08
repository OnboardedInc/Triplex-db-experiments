// Scenario 18: recruiter dashboards (TARGETS 6 row 18). Spec and golden only.
//
// The list: "placements in this branch with an overdue I-9" = placements whose :placement/branch is the
// branch and whose I-9 Section 2 is still pending after the start date plus 3 days (W0's due rule), filtered,
// sorted by start date then id, paged by 25. Per-subject states come from O-REPLAY digests; the list itself is
// a cross-subject query: its database part (branch, statuses, start dates at a basis) is O-REPLAY's `find`
// over one unchunked case, and "overdue" is W0's (O-DOMAIN).
import { BT, VALUE, ents, scenarioStream } from '../lib/gen.mjs';

const sidOf = n => `l${String(n).padStart(5, '0')}`;

export function generate(spec, p) {
  const subjects = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const events = subjects.filter((_, n) => n % 3 === 0).map((sid, n) => { const at = Math.round((n + 0.5) / (subjects.length / 3) * p.liveMs * 0.9); return { at, emit: s => {
    const c = s.command({ subject: sid, writer: 'person', at, tags: { template: 'section2Complete' } });
    c.set(ents(sid).i9, ':i9/section2Status', VALUE.str('completed'), 'I9', { validFrom: BT.NOW - 60_000 });
    c.done();
  } }; });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects, events });
  return { stream, digestSubjects: [...subjects, ...traceSubjects], validAts: [BT.NOW],
    witnesses: { positive: subjects.filter((_, n) => n % 3 === 0), negative: subjects.filter((_, n) => n % 3 !== 0) },
    hand: { list: { filter: { branch: 'branch:dal', overdue: 'W0 Section 2 due rule' }, orderBy: [':placement/startDate asc', 'entity id asc'], pageSize: 25, readers: 256 } } };
}
