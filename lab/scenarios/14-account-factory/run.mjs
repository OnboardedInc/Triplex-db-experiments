// Scenario 14: account factory, a new tenant while others are live (TARGETS 6 row 14). Spec and golden only.
//
// The new tenant's commands carry tags.tenant = 'tenant-new'; a runner must send them through a composition
// opened on that tenant's own storage (DatabaseScope.make with tenant 'tenant-new'). Golden state per subject
// is tenant-local (O-REPLAY replays each tenant's stream on its own). Isolation is a storage property O-REPLAY
// cannot express: the hand expectation is that every new-tenant entity id read through the existing tenant's
// route returns no rows, and the existing tenant's pulls are unchanged.
import { BT, RELEASES, T, scenarioStream } from '../lib/gen.mjs';

const sidOf = n => `n${String(n).padStart(5, '0')}`;

export function generate(spec, p) {
  const newTenant = Array.from({ length: p.newSubjects }, (_, n) => sidOf(n));
  const events = [];
  const per = 10;
  for (let i = 0; i < newTenant.length; i += per) {
    const group = newTenant.slice(i, i + per), at = Math.round(i / newTenant.length * p.liveMs * 0.7);
    events.push({ at, emit: (s, rng) => { const c = s.command({ subject: null, writer: 'bulk', at, tags: { template: 'provision', tenant: 'tenant-new' } }); for (const sid of group) T.onboardInto(c, rng, sid); c.done(); } });
  }
  let release;
  events.push({ at: Math.round(p.liveMs * 0.75), emit: s => { release = T.releaseDefine(s, RELEASES.R1, { at: Math.round(p.liveMs * 0.75) }); s.commands.at(-1).tags.tenant = 'tenant-new'; } });
  events.push({ at: Math.round(p.liveMs * 0.8), emit: s => { T.activate(s, 'acctnew', release, { at: Math.round(p.liveMs * 0.8) }).tags.tenant = 'tenant-new'; } });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [], events });
  const sample = newTenant.filter((_, n) => n % p.digestEvery === 0);
  return { stream, digestSubjects: [...sample, ...traceSubjects], validAts: [BT.NOW],
    witnesses: { positive: sample, negative: traceSubjects.slice(0, 10) },
    hand: { isolation: { rule: 'every entity id of tenant-new read through the existing tenant route returns zero rows at every basis; the existing tenant pulls are unchanged', source: 'TARGETS section 3 (tenant isolation at the storage layer), section 6 row 14' } } };
}
