// Scenario 6: one recruiter decision, 50 workers, with GS.06b (a work location's minimum wage changes).
// Spec and golden only.
import { BT, VALUE, ents, scenarioStream } from '../lib/gen.mjs';

const sidOf = n => `d${String(n).padStart(4, '0')}`;
export const LOCATIONS = { at: 'loc1', other: 'loc2' };

export function generate(spec, p) {
  const fanned = Array.from({ length: p.fanout }, (_, n) => sidOf(n));            // at loc1, get the decision
  const elsewhere = Array.from({ length: p.negatives }, (_, n) => sidOf(p.fanout + n)); // at loc2, nothing
  const decisionAt = Math.round(p.liveMs * 0.3), wageAt = Math.round(p.liveMs * 0.6);
  const setup = [
    ...[LOCATIONS.at, LOCATIONS.other].map((loc, k) => ({ at: -10 + k, emit: s => {
      const c = s.command({ subject: loc, writer: 'person', at: 0, tags: { template: 'locationDefine', phase: 'setup' } });
      c.assert(`location:${loc}`, ':location/name', VALUE.str(loc === 'loc1' ? 'Dallas DC' : 'Denver DC'), 'Location', { validFrom: BT.T0 })
        .assert(`location:${loc}`, ':location/minWageCents', VALUE.int(loc === 'loc1' ? 1450 : 1500), 'Location', { validFrom: BT.T0 });
      c.done();
    } })),
    ...[...fanned, ...elsewhere].map((sid, n) => ({ at: -5, emit: s => {
      const c = s.command({ subject: sid, writer: 'runtime', at: 0, tags: { template: 'assignLocation', phase: 'setup' } });
      c.assert(ents(sid).placement, ':placement/location', VALUE.ref(`location:${n < fanned.length ? LOCATIONS.at : LOCATIONS.other}`), 'Placement', { validFrom: BT.T0 });
      c.done();
    } })),
  ];
  // The decision is one persisted message (causation id) fanned out as 50 per-subject commands, in order.
  const fan = fanned.map((sid, n) => ({ at: decisionAt + n * p.fanoutSpacingMs, emit: s => {
    const c = s.command({ subject: sid, writer: 'person', at: decisionAt + n * p.fanoutSpacingMs, tags: { template: 'decisionFanout', decision: 'dec-0001' } });
    c.set(ents(sid).placement, ':placement/status', VALUE.str('approved-to-start'), 'Placement', { validFrom: BT.NOW - 60_000 })
      .assert(ents(sid).placement, ':placement/decisionRef', VALUE.str('decision:dec-0001'), 'Placement', { validFrom: BT.NOW - 60_000 });
    const done = c.done(); done.meta.causationId = 'decision:dec-0001';
  } }));
  // GS.06b: loc1's minimum wage rises from 2026-11-01; every loc1 worker is affected through the reference.
  const wage = [{ at: wageAt, emit: s => {
    const c = s.command({ subject: LOCATIONS.at, writer: 'person', at: wageAt, tags: { template: 'minWageChange', schedule: '06b' } });
    c.set(`location:${LOCATIONS.at}`, ':location/minWageCents', VALUE.int(1650), 'Location', { validFrom: Date.UTC(2026, 10, 1) });
    c.done();
  } }];
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...fanned, ...elsewhere], events: [...setup, ...fan, ...wage] });
  return { stream, digestSubjects: [...fanned, ...elsewhere, ...traceSubjects, LOCATIONS.at, LOCATIONS.other], validAts: [BT.NOW],
    witnesses: { positive: fanned, negative: elsewhere },
    hand: { gs06b: { changedEntity: `location:${LOCATIONS.at}`, affectedSubjects: fanned, unaffectedSubjects: elsewhere, source: 'TARGETS 6.1 GS.06b; the affected set is O-DOMAIN output (referenced-entity dependency)' } } };
}
