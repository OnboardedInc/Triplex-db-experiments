// lab/scenarios/lib/domain.mjs: the O-DOMAIN seam (TARGETS 6.1; PLAN section 8 order 4, EXP-D01).
//
// [EXP-W01] Why: domain outputs (next tasks, obligations with due times, work items, effect traces, the
// affected-subject set through referenced entities, `superseded` acknowledgements) must come from O-DOMAIN, an
// independent oracle over the frozen world definition W0, never from this harness or the system under test.
// O-REPLAY keeps database state. Until EXP-D01 lands an oracle at lab/oracles/domain/cli.py with a documented
// request format, every domain expectation fails closed: the check is recorded as failed with counts 'domain',
// so no scenario can PASS on domain claims nobody independent has derived.
// Rejected: deriving next tasks in the generator and calling that golden (the generator is not independent of
// the scenario author).
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from './triplex.mjs';

export const O_DOMAIN_CLI = path.join(REPO, 'lab/oracles/domain/cli.py');
export const oDomainAvailable = () => fs.existsSync(O_DOMAIN_CLI);

/**
 * Record one domain expectation. `request` = { id, kind, subjects?, basis?, release?, observed? } where kind is
 * one of next-task | obligations | work-items | effects | affected-subjects | signal-ack.
 */
export function expectDomain(ctx, request) {
  const domain = ctx.domainRequests ??= [];
  domain.push({ id: request.id, kind: request.kind, subjects: request.subjects?.length ?? null, observed: request.observed ?? null });
  if (!oDomainAvailable())
    return ctx.check(`domain:${request.id}`, false, 'O-DOMAIN not available: EXP-D01 has not landed lab/oracles/domain (fails closed)', { counts: 'domain' });
  // When O-DOMAIN lands, wire its request format here (case of W0 + command stream + basis -> expected outputs).
  return ctx.check(`domain:${request.id}`, false, `O-DOMAIN present at ${path.relative(REPO, O_DOMAIN_CLI)} but the W01 adapter is not wired yet`, { counts: 'domain' });
}
