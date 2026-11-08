// Scenario 15: tenant mix, with GS.15's storage-level cross-tenant attempt and one 10x-slow tenant consumer
// (TARGETS 6 row 15, 6.1). Spec and golden only.
//
// One large tenant (the rung's world) and `smallTenants` small tenants of `smallSubjects` subjects each, under
// the same live trace. Each small tenant's commands carry tags.tenant. Golden state is per tenant (O-REPLAY).
import { BT, T, scenarioStream } from '../lib/gen.mjs';

export function generate(spec, p) {
  const tenants = Array.from({ length: p.smallTenants }, (_, t) => `small${String(t).padStart(4, '0')}`);
  const events = [], digest = [];
  tenants.forEach((tenant, t) => {
    const sids = Array.from({ length: p.smallSubjects }, (_, n) => `t${String(t).padStart(4, '0')}x${String(n).padStart(4, '0')}`);
    digest.push(sids[0], sids[1]);
    events.push({ at: -1, emit: (s, rng) => { const c = s.command({ subject: null, writer: 'bulk', at: 0, tags: { template: 'tenantSetup', tenant, phase: 'setup' } }); for (const sid of sids) T.onboardInto(c, rng, sid); c.done(); } });
    // Live per-tenant traffic: one section 1 submit per tenant spread over the run.
    const at = Math.round((t + 0.5) / tenants.length * p.liveMs * 0.9);
    events.push({ at, emit: (s, rng) => { T.section1Submit(s, rng, sids[0], { at }).tags.tenant = tenant; } });
  });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [], events });
  return { stream, digestSubjects: [...digest, ...traceSubjects], validAts: [BT.NOW],
    witnesses: { positive: digest.filter((_, k) => k % 2 === 0), negative: digest.filter((_, k) => k % 2 === 1) },
    hand: {
      crossTenantAttempt: { rule: 'a tenant-A route that addresses tenant B storage directly (B scope or B index) fails at the storage layer with a typed error and returns no rows', source: 'TARGETS 6.1 GS.15; section 3 tenant isolation' },
      slowConsumer: { tenant: tenants[0], slowdown: 10, rule: 'other tenants feed lag p99 and read p99 hold while tenants[0] consumer runs 10x slower', source: 'TARGETS 6.1 GS.15' },
    } };
}
