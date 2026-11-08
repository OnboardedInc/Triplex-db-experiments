// Scenario 2: form submit, person waiting (TARGETS section 6 row 2).
import { BT, T, scenarioStream } from '../lib/gen.mjs';
import { expectDomain } from '../lib/domain.mjs';
import { pullDigest, quantiles } from '../lib/runner.mjs';

const sidOf = n => `f${String(n).padStart(4, '0')}`;

export function generate(spec, p) {
  const submitters = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n)); // onboarded, never submit
  const gap = p.liveMs / (p.subjects + 1);
  const events = submitters.map((sid, n) => ({ at: Math.round((n + 1) * gap), emit: (stream, rng) => T.section1Submit(stream, rng, sid, { at: Math.round((n + 1) * gap) }) }));
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...submitters, ...idle], events });
  return { stream, digestSubjects: [...submitters, ...idle, ...traceSubjects], validAts: [BT.NOW], witnesses: { positive: submitters, negative: idle } };
}

/** The reconcile pull: at the returned receipt, before the subject's next command can start. */
export async function onSettled(ctx, cmd, attempt) {
  if (cmd.tags?.template !== 'section1Submit' || attempt.status !== 'committed') return;
  const want = ctx.expected.digests[cmd.subject]?.after?.[cmd.index]?.[BT.NOW];
  const got = await pullDigest(ctx, cmd.subject, { recordedAt: attempt.receipt.instant, validAt: BT.NOW });
  const visible = got.ok && got.digest === want;
  (ctx.extra.firstPulls ??= []).push({ index: cmd.index, ms: got.ms, visible });
  ctx.check(`first-pull-${cmd.index}`, visible, { want, got: got.digest ?? got.error });
}

export function check(ctx) {
  const pulls = ctx.extra.firstPulls ?? [];
  const submits = ctx.gen.stream.commands.filter(c => c.tags?.template === 'section1Submit');
  ctx.check('every-submit-pulled', pulls.length === submits.length, { pulls: pulls.length, submits: submits.length });
  ctx.extra.firstPull = { ...quantiles(pulls.map(p => p.ms)), visibleFraction: pulls.length ? pulls.filter(p => p.visible).length / pulls.length : 0 };
  delete ctx.extra.firstPulls;
  // "The next task is visible on the first pull": the next task is a W0 output, so O-DOMAIN owns it.
  expectDomain(ctx, { id: 'next-task-on-first-pull', kind: 'next-task', subjects: submits.map(c => c.subject), basis: 'each Section 1 receipt instant, validAt NOW' });
}
