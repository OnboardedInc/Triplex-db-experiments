// Scenario 9: start dates move (TARGETS 6 row 9). Spec and golden only.
//
// Each moved placement's start date shifts forward or back by 1 to 14 days, effective in valid time from
// 2026-11-01 (the move is the new belief from then on; before that the old start date stands). Reads on both
// sides of that valid-time boundary are database state (O-REPLAY); the obligations it moves and their
// next-boundary times are W0's (O-DOMAIN).
import { BT, VALUE, ents, scenarioStream } from '../lib/gen.mjs';

const sidOf = n => `s${String(n).padStart(5, '0')}`;
const MOVE_FROM = Date.UTC(2026, 10, 1);

export function generate(spec, p) {
  const moved = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const events = moved.map((sid, n) => { const at = Math.round((n + 0.5) / moved.length * p.liveMs * 0.9); return { at, emit: (s, rng) => {
    const e = ents(sid);
    const c = s.command({ subject: sid, writer: 'person', at, tags: { template: 'startDateMove', direction: n % 2 ? 'back' : 'forward' } });
    const ref = c.currentRef(e.placement, ':placement/startDate');
    const old = s.commands.flatMap(x => x.operations).find(op => op.ref === ref);
    const days = rng.int(1, 14) * (n % 2 ? -1 : 1);
    c.retract(e.placement, ':placement/startDate')
      .assert(e.placement, ':placement/startDate', old.value, 'Placement', { validFrom: old.validFrom, validTo: MOVE_FROM })
      .assert(e.placement, ':placement/startDate', VALUE.dt(old.value.value + days * BT.DAY), 'Placement', { validFrom: MOVE_FROM });
    const done = c.done();
    s.live.get(e.placement).set(':placement/startDate', [`a:${done.index}:1`, `a:${done.index}:2`]);
  } }; });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...moved, ...idle], events });
  return { stream, digestSubjects: [...moved, ...idle, ...traceSubjects], validAts: [BT.NOW, MOVE_FROM - 1, MOVE_FROM], witnesses: { positive: moved, negative: idle } };
}
