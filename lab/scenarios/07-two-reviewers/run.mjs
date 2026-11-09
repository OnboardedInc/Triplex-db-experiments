// @ts-nocheck -- [EXP-CHECKJS-R2] option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
// Scenario 7: two reviewers, one I-9 (TARGETS 6 row 7).
//
// Each race subject gets two Section 2 decisions (approve by r1, waive by r2) sent at the same moment, both
// with an EntityState precondition naming the same observed live set of the I-9 entity (compare-and-set).
// Exactly one may commit; the other must fail with a typed TransactionConflictError. Which one wins is a
// system fact, so race subjects carry no per-command golden digests: O-REPLAY's receipt-mode replay
// (race groups, contract 2.5) checks the winner's state after the run.
import { BT, T, scenarioStream } from '../lib/gen.mjs';

const sidOf = n => `r${String(n).padStart(4, '0')}`;

export function generate(spec, p) {
  const races = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const events = races.map((sid, n) => {
    const at = Math.round((n + 1) / (races.length + 1) * p.liveMs);
    return { at, emit: s => {
      const race = `race-${sid}`;
      T.reviewDecision(s, sid, 'approve', { at, race, applies: false, reviewer: 'r1' });
      T.reviewDecision(s, sid, 'waive', { at, race, applies: false, reviewer: 'r2' });
    } };
  });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...races, ...idle], events });
  return { stream, digestSubjects: [...races, ...idle, ...traceSubjects], noDigestSubjects: races, validAts: [BT.NOW], witnesses: { positive: races, negative: idle } };
}

export function check(ctx) {
  const groups = new Map();
  for (const c of ctx.gen.stream.commands) if (c.tags?.race) groups.set(c.tags.race, [...(groups.get(c.tags.race) ?? []), c]);
  let bad = 0, wins = { r1: 0, r2: 0 }; const first = [];
  for (const [race, members] of groups) {
    const attempts = members.map(m => ctx.ex.byIndex.get(m.index));
    const committed = attempts.filter(a => a?.status === 'committed');
    const losers = attempts.filter(a => a?.status !== 'committed');
    const typed = losers.every(a => a?.status === 'rejected' && a.category === 'transaction-conflict' && a.tag === 'TransactionConflictError');
    if (committed.length !== 1 || !typed) { bad++; if (first.length < 3) first.push({ race, outcomes: attempts.map(a => `${a?.status}:${a?.tag}`) }); }
    else wins[members[attempts.indexOf(committed[0])].tags.reviewer]++;
  }
  ctx.extra.races = { races: groups.size, wins };
  ctx.check('cas-exactly-one-winner-typed-loser', bad === 0 && groups.size > 0, { bad, first });
}
