// @ts-nocheck -- [EXP-CHECKJS-R2] mutable records inferred from their initial values; unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
// Scenario 12: audit, what did we know on March 3 (TARGETS 6 row 12; erasure caveat in TARGETS 7 item 2).
//
// Audit subjects are onboarded valid from 2026-01-05. Right after setup the driver captures R_past. During the
// live phase half of them get a pay-rate correction effective 2026-02-01 (changing what is true on March 3),
// and the trace keeps writing. Three times during the run, every audit subject is read at (R_past, validAt
// 2026-03-03); all three answers must be bit-for-bit identical, equal O-REPLAY's state at that basis, and
// produce the same answer hash on every engine. The numbers rule rides along: one write of an integer outside
// int64 (must fail typed on every lane) and one of 2^60 (exact or typed error; never silently changed).
import { BT, T, UNREPRESENTABLE, scenarioStream, sha256 } from '../lib/gen.mjs';
import { expectDomain } from '../lib/domain.mjs';
import { expectedDigest, pullDigest, quantiles } from '../lib/runner.mjs';

const sidOf = n => `m${String(n).padStart(4, '0')}`;
const JAN5 = Date.UTC(2026, 0, 5), FEB1 = Date.UTC(2026, 1, 1);
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const NUM_SUBJECT = 'num0';

export function generate(spec, p) {
  const audit = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const corrected = audit.filter((_, n) => n % 2 === 0);
  const events = corrected.map((sid, n) => { const at = Math.round((0.1 + 0.8 * (n + 1) / (corrected.length + 1)) * p.liveMs); return { at, emit: (s, rng) => T.rateCorrection(s, rng, sid, FEB1, { at }) }; });
  events.push({ at: Math.round(p.liveMs * 0.5), emit: s => T.numericWrite(s, NUM_SUBJECT, ':placement/bonusCents', UNREPRESENTABLE.int64Overflow, { at: Math.round(p.liveMs * 0.5) }) });
  events.push({ at: Math.round(p.liveMs * 0.5) + 1, emit: s => T.numericWrite(s, NUM_SUBJECT, ':placement/bonusCents', UNREPRESENTABLE.beyondQlever60, { at: Math.round(p.liveMs * 0.5) + 1, laneDependent: true }) });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: audit, events, onboardOptions: { validFrom: JAN5 } });
  return { stream, digestSubjects: [...audit, ...traceSubjects], validAts: [BT.NOW, BT.MAR3], witnesses: { positive: corrected, negative: audit.filter(s => !corrected.includes(s)) } };
}

export async function during(ctx) {
  const Rpast = Date.now() - 1; // after setup, before any live command
  const audit = ctx.gen.digestSubjects.filter(s => s.startsWith('m'));
  const repeats = [];
  for (const frac of [0.3, 0.6, 0.9]) {
    await sleep(Math.max(0, ctx.t0 + ctx.params.liveMs * frac - performance.now()));
    const answers = [], ms = [];
    for (const sid of audit) { const r = await pullDigest(ctx, sid, { recordedAt: Rpast, validAt: BT.MAR3 }); answers.push(r.ok ? r.digest : `error:${r.error?.tag ?? r.error}`); ms.push(r.ms); }
    repeats.push({ answers, ms });
  }
  const expected = audit.map(sid => expectedDigest(ctx, sid, Rpast, BT.MAR3));
  const hash = a => sha256(a.join('\n'));
  ctx.extra.audit = { basis: { recordedAt: Rpast, validAt: BT.MAR3 }, subjects: audit.length, repeatHashes: repeats.map(r => hash(r.answers)), expectedHash: hash(expected),
    asOfPull: quantiles(repeats.flatMap(r => r.ms)) };
  ctx.check('audit-repeats-identical', new Set(ctx.extra.audit.repeatHashes).size === 1, ctx.extra.audit.repeatHashes);
  ctx.check('audit-matches-oracle', ctx.extra.audit.repeatHashes.every(h => h === ctx.extra.audit.expectedHash),
    { wrong: repeats[0].answers.filter((a, i) => a !== expected[i]).length });
  // Cross-engine comparison: the gate summary compares extra.audit.expectedHash/repeatHashes between lanes.
  expectDomain(ctx, { id: 'explain-at-march-3', kind: 'obligations', subjects: audit, basis: ctx.extra.audit.basis });
}

export async function check(ctx) {
  const cmds = ctx.gen.stream.commands.filter(c => c.tags?.template === 'numericWrite');
  for (const c of cmds) {
    const a = ctx.ex.byIndex.get(c.index);
    if (c.tags.numeric === UNREPRESENTABLE.int64Overflow) ctx.check('int64-overflow-rejected-typed', a?.status === 'rejected', { status: a?.status, tag: a?.tag, category: a?.category });
    else {
      const pulled = await pullDigest(ctx, NUM_SUBJECT, { validAt: BT.NOW });
      const row = pulled.rows?.find(r => r[1] === ':placement/bonusCents');
      const exact = a?.status === 'committed' && row?.[2] === `integer:${c.tags.numeric}`;
      const typed = a?.status === 'rejected';
      ctx.extra.numeric2pow60 = { status: a?.status, tag: a?.tag ?? null, stored: row?.[2] ?? null };
      ctx.check('2pow60-exact-or-typed-error', exact || typed, ctx.extra.numeric2pow60);
    }
  }
}
