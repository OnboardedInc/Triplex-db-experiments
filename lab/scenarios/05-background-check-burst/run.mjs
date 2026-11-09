// @ts-nocheck -- [EXP-CHECKJS-R2] mutable records inferred from their initial values; unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
// Scenario 5: background-check results burst (TARGETS 6 row 5). Spec and golden only.
import { BT, VALUE, ents, scenarioStream } from '../lib/gen.mjs';

const sidOf = n => `b${String(n).padStart(5, '0')}`;

export function generate(spec, p) {
  const checked = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const start = Math.round(p.liveMs * 0.2);
  const events = checked.map((sid, n) => {
    const at = start + Math.round((n + 0.5) / checked.length * p.burstMs);
    return { at, emit: (s, rng) => {
      const e = ents(sid), opt = { validFrom: BT.NOW - 600_000 };
      const c = s.command({ subject: sid, writer: 'system', at, tags: { template: 'backgroundCheckResult' } });
      c.set(e.placement, ':bg/status', VALUE.str(rng.chance(0.9) ? 'clear' : 'consider'), 'Placement', opt)
        .set(e.placement, ':bg/vendor', VALUE.str('checkr'), 'Placement', opt)
        .set(e.placement, ':bg/package', VALUE.str(rng.pick(['basic', 'pro', 'driver'])), 'Placement', opt)
        .set(e.placement, ':bg/completedAt', VALUE.dt(opt.validFrom), 'Placement', opt)
        .set(e.placement, ':bg/reportId', VALUE.str(`rpt_${rng.int(1e8, 9e8)}`), 'Placement', opt);
      c.done();
    } };
  });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...checked, ...idle], events });
  return { stream, digestSubjects: [...checked, ...idle, ...traceSubjects], validAts: [BT.NOW], witnesses: { positive: checked, negative: idle } };
}
