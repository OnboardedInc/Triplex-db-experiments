// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
// Scenario 10: release activation (TARGETS 6 row 10; P5 semantics in TARGETS 1.1).
//
// Releases R1 and R2 are content-addressed configuration; activation is a fact on the account. After the
// activation commits, the driver captures one basis (R_act), then mutates selected subjects, then sweeps every
// in-scope subject (the rung's world plus the scenario subjects) at R_act with the trace and readers running.
// Database state at R_act comes from O-REPLAY (mutated subjects must show the captured basis, not the
// mutation). Evaluating R2 and publishing work items through the outbox are W0 outputs: O-DOMAIN, fails
// closed until EXP-D01. R_act is also the common input basis GS.11's preview must use (TARGETS 6.1 item 4).
import { BT, RELEASES, T, VALUE, ents, scenarioStream, sha256 } from '../lib/gen.mjs';
import { expectDomain } from '../lib/domain.mjs';
import { expectedDigest, pullDigest, quantiles } from '../lib/runner.mjs';

const sidOf = n => `a${String(n).padStart(4, '0')}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const ACCOUNT = 'acct0';

export function generate(spec, p) {
  const subjects = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const mutated = subjects.slice(0, p.mutated);
  const activateAt = Math.round(p.liveMs * p.activateAtFraction);
  const releaseSids = {};
  const events = [
    { at: activateAt, emit: s => T.activate(s, ACCOUNT, releaseSids.R2, { at: activateAt }) },
    // Rollback (RULINGS Q38f): R1, then R2, then R1 again. The changed notice must be delivered three times,
    // with publication sequences 1, 2, 3 and payloads R1, R2, R1 (O-DOMAIN owns the payloads).
    { at: Math.round(p.liveMs * p.rollbackAtFraction), emit: s => { T.activate(s, ACCOUNT, releaseSids.R1, { at: Math.round(p.liveMs * p.rollbackAtFraction) }).tags.rollback = true; } },
    // Mutations after the basis is captured: sent by during(), not by the timeline (tags.manual).
    ...mutated.map(sid => ({ at: activateAt + 1, emit: s => { const c = s.command({ subject: sid, writer: 'runtime', at: activateAt + 1, tags: { template: 'postBasisMutation', manual: true } });
      c.set(ents(sid).placement, ':placement/status', VALUE.str('active'), 'Placement', { validFrom: BT.NOW - 1000 }); c.done(); } })),
  ];
  const built = scenarioStream(spec, p, { subjects, events: [
    { at: -3, emit: s => { releaseSids.R1 = T.releaseDefine(s, RELEASES.R1, { phase: 'setup' }); } },
    { at: -2, emit: s => { releaseSids.R2 = T.releaseDefine(s, RELEASES.R2, { phase: 'setup' }); } },
    { at: -1, emit: s => T.activate(s, ACCOUNT, releaseSids.R1, { phase: 'setup' }) },
    ...events,
  ] });
  return { stream: built.stream, digestSubjects: [...subjects, ...built.traceSubjects, ACCOUNT, releaseSids.R1, releaseSids.R2], validAts: [BT.NOW],
    witnesses: { positive: mutated, negative: subjects.slice(p.mutated) }, hand: { releases: releaseSids, account: ACCOUNT } };
}

export async function during(ctx) {
  const p = ctx.params, cmds = ctx.gen.stream.commands;
  const activation = cmds.find(c => c.tags?.template === 'activate' && c.tags.phase !== 'setup');
  // In-flight reconciles: pinned just before activation, finishing after it.
  await sleep(Math.max(0, p.liveMs * p.activateAtFraction - 1500));
  const Rpre = Date.now() - 1;
  const reconciles = Array.from({ length: p.inflightReconciles }, async (_, k) => {
    const first = await pullDigest(ctx, ACCOUNT, { recordedAt: Rpre, validAt: BT.NOW });
    while (!ctx.ex.byIndex.get(activation.index)?.doneAt) await sleep(50);
    const sid = ctx.gen.digestSubjects[k];
    const subject = await pullDigest(ctx, sid, { recordedAt: Rpre, validAt: BT.NOW });
    const again = await pullDigest(ctx, ACCOUNT, { recordedAt: Rpre, validAt: BT.NOW });
    return { first: first.digest, again: again.digest, subjectOk: subject.digest === expectedDigest(ctx, sid, Rpre, BT.NOW), errors: [first, subject, again].filter(x => !x.ok).length };
  });
  while (!ctx.ex.byIndex.get(activation.index)?.doneAt) await sleep(20);
  const act = ctx.ex.byIndex.get(activation.index);
  const Ract = Math.max(Date.now() - 1, act.receipt?.instant ?? 0);
  const activatedAt = performance.now();
  for (const c of cmds.filter(c => c.tags?.template === 'postBasisMutation')) ctx.ex.submit(c);
  const oldRelease = expectedDigest(ctx, ACCOUNT, Rpre, BT.NOW);
  const r = await Promise.all(reconciles);
  ctx.check('inflight-reconciles-finish-on-old-release', r.every(x => x.first === oldRelease && x.again === oldRelease && x.subjectOk) && oldRelease !== expectedDigest(ctx, ACCOUNT, Ract, BT.NOW),
    { reconciles: r.length, onOld: r.filter(x => x.first === oldRelease && x.again === oldRelease).length, readErrors: r.reduce((s, x) => s + x.errors, 0) });

  // The sweep at R_act.
  // R2's scope at this rung: the first sweepWorld world subjects plus the scenario subjects and the account.
  const inScopeWorld = ctx.world.sample.slice(0, p.sweepWorld ?? ctx.world.sample.length);
  const worldIds = inScopeWorld.slice(0, Number.isFinite(ctx.opts.sweepCap) ? ctx.opts.sweepCap : undefined);
  const scope = [...worldIds, ...ctx.gen.witnesses.positive, ...ctx.gen.witnesses.negative, ACCOUNT];
  const listSha = sha256(scope.join('\n'));
  const fullScope = inScopeWorld.length + ctx.gen.witnesses.positive.length + ctx.gen.witnesses.negative.length + 1;
  let next = 0, wrong = 0, failed = 0; const evaluated = new Map(); const first = [];
  const t0 = performance.now();
  await Promise.all(Array.from({ length: ctx.opts.sweepConcurrency ?? 8 }, async () => {
    while (next < scope.length) {
      const sid = scope[next++];
      const got = await pullDigest(ctx, sid, { recordedAt: Ract, validAt: BT.NOW });
      evaluated.set(sid, (evaluated.get(sid) ?? 0) + 1);
      if (!got.ok) { failed++; continue; }
      if (got.digest !== expectedDigest(ctx, sid, Ract, BT.NOW)) { wrong++; if (first.length < 3) first.push({ sid, got: got.digest }); }
    }
  }));
  const sweepMs = performance.now() - t0;
  const window = (list, from, to) => list.filter(x => x.at >= from && x.at <= to);
  const before = window(ctx.reads, ctx.t0, activatedAt).map(x => x.ms), during = window(ctx.reads, t0, t0 + sweepMs).map(x => x.ms);
  const commits = ctx.ex.attempts.filter(a => a.trace && a.doneAt);
  const cBefore = commits.filter(a => a.doneAt <= activatedAt).map(a => a.doneAt - a.scheduledAt), cDuring = commits.filter(a => a.doneAt >= t0 && a.doneAt <= t0 + sweepMs).map(a => a.doneAt - a.scheduledAt);
  const ratio = (a, b) => (quantiles(a).p99 && quantiles(b).p99) ? Math.round(quantiles(b).p99 / quantiles(a).p99 * 100) / 100 : null;
  ctx.extra.sweep = { basis: { recordedAt: Ract, validAt: BT.NOW, release: ctx.gen.hand.releases.R2 }, subjects: scope.length, fullScope, capped: scope.length < fullScope, listSha256: listSha,
    ms: Math.round(sweepMs), pullsPerSec: Math.round(scope.length / sweepMs * 1000), projected100kMs: Math.round(sweepMs / scope.length * 100_000), concurrency: ctx.opts.sweepConcurrency ?? 8,
    readP99Ratio: ratio(before, during), commitP99Ratio: ratio(cBefore, cDuring), readsBefore: before.length, readsDuring: during.length, wrong, failed };
  ctx.check('sweep-coverage-exact', !ctx.extra.sweep.capped && [...evaluated.values()].every(v => v === 1) && evaluated.size === scope.length, { evaluated: evaluated.size, scope: scope.length, fullScope });
  ctx.check('sweep-answers-at-captured-basis', wrong === 0 && failed === 0, { wrong, failed, first });
  expectDomain(ctx, { id: 'sweep-work-items-R2', kind: 'work-items', subjects: scope, basis: ctx.extra.sweep.basis, release: ctx.gen.hand.releases.R2 });
  expectDomain(ctx, { id: 'inflight-reconciles-evaluate-R1', kind: 'next-task', basis: { recordedAt: Rpre }, release: ctx.gen.hand.releases.R1 });
}

export async function check(ctx) {
  // Rollback R1 -> R2 -> R1 (Q38f): the database part is the account's activation history; the three deliveries
  // keyed (id, publication sequence) with payloads R1, R2, R1 are W0 work items, so O-DOMAIN owns them.
  const acts = ctx.gen.stream.commands.filter(c => c.tags?.template === 'activate').map(c => ctx.ex.byIndex.get(c.index));
  const order = acts.map(a => a?.status === 'committed' ? a.receipt.position : null);
  ctx.check('rollback-activations-committed-in-order', order.every(x => x !== null) && order.every((x, i) => i === 0 || x > order[i - 1]) && order.length === 3, { order });
  expectDomain(ctx, { id: 'rollback-three-deliveries', kind: 'work-items', release: [ctx.gen.hand.releases.R1, ctx.gen.hand.releases.R2, ctx.gen.hand.releases.R1],
    observed: 'deliveries keyed (id, publication sequence): expected sequences 1, 2, 3 with payloads R1, R2, R1 (RULINGS Q38f)' });
}
