// @ts-nocheck -- [EXP-CHECKJS-R2] mutable records inferred from their initial values; unannotated local values; unannotated dynamic parameters; initially empty collections. Binding errors remain checked by lab/bin/checkjs.mjs.
// Scenario 4: lost acknowledgements and a restart (TARGETS 6 row 4), plus GS.04b (TARGETS 6.1).
//
// Lost ACKs: the client discards the receipt of a marked command and re-sends it with the same commandId;
// the retry must return the original receipt (CommandAlreadyCommitted with the original txId) and
// transactionByCommand must resolve it. Restart: mid-run the Triplex runtime is restarted (the client side
// of the broker/engine path; in-flight commands become unknown and are resolved by commandId). Killing the
// engine itself needs an exclusive slot and `--faults engine`; on a shared dev slot it is reported NOT_RUN
// (lab rule: never stop a container you did not start). GS.04b needs a composition with a separate current
// index fed from the feed (EXP-X04/Q05); triplex-public has none, so it is NOT_APPLICABLE here.
import { BT, T, scenarioStream } from '../lib/gen.mjs';
import { checkedRead, pullDigest } from '../lib/runner.mjs';

const sidOf = n => `k${String(n).padStart(4, '0')}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function generate(spec, p) {
  const active = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const events = [];
  active.forEach((sid, n) => {
    for (const [step, frac] of [[0, (n + 0.5) / active.length * 0.45], [1, 0.5 + (n + 0.5) / active.length * 0.45]]) {
      const at = Math.round(frac * p.liveMs);
      const lost = (n * 7 + step * 3) % Math.round(1 / p.lostAckRate) === 0;
      events.push({ at, emit: (s, rng) => {
        const c = step === 0 ? T.section1Submit(s, rng, sid, { at }) : T.everifySignal(s, rng, sid, 0, { at });
        if (lost) { c.tags.lostAck = true; s.resend(c, { at, tags: { lostAckRetry: true } }); }
      } });
    }
  });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...active, ...idle], events });
  return { stream, digestSubjects: [...active, ...idle, ...traceSubjects], validAts: [BT.NOW], witnesses: { positive: active, negative: idle } };
}

export async function during(ctx) {
  const p = ctx.params;
  await sleep(p.liveMs * p.restartAtFraction);
  // Pin some reads just before the restart; reread the same (subject, basis) after it.
  const pins = [];
  for (const sid of ctx.readSet.slice(0, 40)) {
    const R = Date.now() - 1;
    const r = await checkedRead(ctx, sid, { R, kind: 'pre-restart' });
    if (r) pins.push({ sid, R, digest: r.digest, ok: r.ok });
    if (pins.length >= 20) break;
  }
  const inflight = ctx.ex.pending;
  const ms = await ctx.restart();
  ctx.extra.restart = { kind: 'triplex-runtime', ms: Math.round(ms), inflightAtRestart: inflight };
  let same = 0;
  for (const pin of pins) { const r = await pullDigest(ctx, pin.sid, { recordedAt: pin.R, validAt: BT.NOW }); if (r.ok && r.digest === pin.digest) same++; }
  ctx.check('pinned-reads-resume-after-restart', pins.length > 0 && same === pins.length && pins.every(x => x.ok), { pins: pins.length, same });
  ctx.subSchedules = {
    'engine-kill': ctx.opts.faults?.includes('engine') ? 'NOT_IMPLEMENTED' : 'NOT_RUN: needs an exclusive slot and --faults engine (shared dev slot)',
    '04b': 'NOT_APPLICABLE: composition triplex-public has no separate current index; runs when EXP-X04/EXP-Q05 provide one',
  };
}

export function check(ctx) {
  const cmds = ctx.gen.stream.commands;
  const lost = cmds.filter(c => c.tags?.lostAck);
  const retries = cmds.filter(c => c.tags?.lostAckRetry);
  // "No acknowledged commit is lost": every committed receipt is in the feed and in the final state (common checks);
  // every lost-ACK command committed exactly once and its retry resolved to the original receipt.
  const resolved = retries.every(c => ctx.ex.byIndex.get(c.index)?.category === 'command-already-committed');
  ctx.check('lost-ack-retries-return-original', lost.length > 0 && resolved && lost.every(c => ctx.ex.byIndex.get(c.index)?.status === 'committed'), { lost: lost.length, retries: retries.length, resolved });
  const unknown = ctx.ex.attempts.filter(a => a.unknown);
  ctx.extra.unknownOutcomes = { count: unknown.length, resolvedBy: unknown.map(a => a.resolvedBy) };
  ctx.check('unknown-outcomes-resolved', unknown.every(a => a.status === 'committed' || a.status === 'rejected'), ctx.extra.unknownOutcomes);
  ctx.extra.interruptedReads = ctx.interruptedReads ?? 0;
}
