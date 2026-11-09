// Scenario 11: plan impact preview (TARGETS 6 row 11; common basis with GS.10 in 6.1 item 4). Spec and golden only.
//
// Same world as GS.10 (releases R1 and R2, account on R1), but R2 is never activated: "who gains work" under
// R2 is previewed for every in-scope subject at one captured basis while the trace runs. The preview must equal
// GS.10's post-activation sweep when both are evaluated at the same input basis, so the comparison runs GS.11
// at GS.10's R_act (the receipt of GS.10 binds it). Preview and sweep outputs are W0's: O-DOMAIN.
import { BT, RELEASES, T, scenarioStream } from '../lib/gen.mjs';
import { expectDomain } from '../lib/domain.mjs';
import { expectedDigest, pullDigest } from '../lib/runner.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

/**
 * The preview's database part: capture one basis mid-run and pull every in-scope subject at it while the trace
 * keeps writing (writers must not wait on it). The R2 evaluation of those inputs is O-DOMAIN's; equality with
 * GS.10's sweep needs both at one common basis on one world, which the per-scenario gate cannot give (each run
 * captures its own basis), so that comparison is a domain request too.
 */
export async function during(ctx) {
  const p = ctx.params;
  await sleep(p.liveMs * 0.4);
  const basis = { recordedAt: Date.now() - 1, validAt: BT.NOW };
  const scope = [...ctx.world.sample.slice(0, p.sweepWorld ?? ctx.world.sample.length), ...ctx.gen.witnesses.positive, ...ctx.gen.witnesses.negative, ACCOUNT];
  let next = 0, wrong = 0, failed = 0; const seen = new Map(); const first = [];
  const t0 = performance.now();
  await Promise.all(Array.from({ length: ctx.opts.sweepConcurrency ?? 4 }, async () => {
    while (next < scope.length) {
      const sid = scope[next++];
      const got = await pullDigest(ctx, sid, basis);
      seen.set(sid, (seen.get(sid) ?? 0) + 1);
      if (!got.ok) { failed++; continue; }
      if (got.digest !== expectedDigest(ctx, sid, basis.recordedAt, BT.NOW)) { wrong++; if (first.length < 3) first.push({ sid, got: got.digest }); }
    }
  }));
  const ms = performance.now() - t0;
  ctx.extra.preview = { basis, subjects: scope.length, ms: Math.round(ms), projected100kMs: Math.round(ms / scope.length * 100_000), wrong, failed };
  ctx.check('preview-coverage-exact', seen.size === scope.length && [...seen.values()].every(v => v === 1), { seen: seen.size, scope: scope.length });
  ctx.check('preview-inputs-at-captured-basis', wrong === 0 && failed === 0, { wrong, failed, first });
  expectDomain(ctx, { id: 'preview-who-gains-work-R2', kind: 'work-items', subjects: scope, basis, release: ctx.gen.hand.releases.R2 });
  expectDomain(ctx, { id: 'preview-equals-activation-at-common-basis', kind: 'work-items', observed: 'needs GS.10 and GS.11 at one basis on one world' });
}
