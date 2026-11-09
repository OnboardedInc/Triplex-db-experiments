// @ts-nocheck -- [EXP-CHECKJS-R2] option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
// Scenario 3: webhook storm after an outage, with GS.03's late older vendor revision (TARGETS 6 row 3, 6.1).
//
// Each storm subject receives vendor revisions 0..4 of its E-Verify status in a seeded, out-of-order arrival
// order; every delivery carries the vendor's delivery identity as its commandId, and each is re-sent 0 to 2
// times. A revision older than one already applied is written as a `superseded` acknowledgement on the
// subject's signal log (journaled, current I-9 values untouched). That routing is W0's rule; the generator
// stands in for the kernel so the database effects can be checked by O-REPLAY, and the domain claim itself
// goes to O-DOMAIN (fails closed until EXP-D01).
import { BT, T, scenarioStream } from '../lib/gen.mjs';
import { expectDomain } from '../lib/domain.mjs';

const sidOf = n => `e${String(n).padStart(4, '0')}`;

export function generate(spec, p) {
  const storm = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const start = Math.round(p.liveMs * p.stormStartFraction);
  const plan = []; // { at, sid, seq, resendOf? }
  const { stream, traceSubjects } = scenarioStream(spec, p, {
    subjects: [...storm, ...idle],
    events: (() => {
      // Arrival schedule: drawn from a dedicated stream so it does not depend on emission order.
      const events = [];
      let k = 0;
      for (const sid of storm) {
        const order = [...Array(p.revisions).keys()];
        // Seeded out-of-order arrival: swap neighbours with probability 0.5 (keeps it realistic, not reversed).
        for (let i = 0; i + 1 < order.length; i++) if (((k++ * 2654435761) >>> 0) % 2 === 0) [order[i], order[i + 1]] = [order[i + 1], order[i]];
        order.forEach((seq, n) => {
          const at = start + Math.round(((n + (storm.indexOf(sid) % 7) / 7) / p.revisions) * p.stormMs);
          plan.push({ at, sid, seq });
        });
      }
      const applied = new Map(); const sent = new Map();
      for (const e of plan.sort((x, y) => x.at - y.at || (x.sid < y.sid ? -1 : 1))) {
        events.push({ at: e.at, emit: (s, rng) => {
          const max = applied.get(e.sid) ?? -1;
          const commandId = `everify-gw/${e.sid}/rev-${e.seq}`;
          const cmd = e.seq < max ? T.everifySuperseded(s, e.sid, e.seq, { at: e.at, commandId })
            : (() => { const c = T.everifySignal(s, rng, e.sid, e.seq, { at: e.at }); c.meta.commandId = commandId; return c; })();
          if (e.seq > max) applied.set(e.sid, e.seq);
          sent.set(commandId, cmd);
        } });
        // Re-sends of the same delivery (same commandId) later in the storm window.
        for (let r = 0; r < ((e.seq + e.sid.length + e.at) % 3); r++) {
          const at = e.at + 200 + r * 700;
          events.push({ at, emit: s => s.resend(sent.get(`everify-gw/${e.sid}/rev-${e.seq}`), { at, tags: { duplicate: true } }) });
        }
      }
      return events;
    })(),
  });
  return { stream, digestSubjects: [...storm, ...idle, ...traceSubjects], validAts: [BT.NOW], witnesses: { positive: storm, negative: idle } };
}

export function check(ctx) {
  const cmds = ctx.gen.stream.commands;
  const storm = cmds.filter(c => ['everifySignal', 'everifySuperseded'].includes(c.tags?.template));
  const resends = cmds.filter(c => c.tags?.duplicate && c.tags.resendOf != null && storm.includes(cmds[c.tags.resendOf]));
  ctx.extra.storm = { deliveries: storm.length + resends.length, distinct: storm.length, resends: resends.length, superseded: storm.filter(c => c.tags.template === 'everifySuperseded').length };
  // Exactly-once: every distinct delivery committed once; every re-send got CommandAlreadyCommitted with the
  // original txId (checked per re-send in the executor as resend-<index>-original-receipt).
  const committedOnce = storm.every(c => ctx.ex.byIndex.get(c.index)?.status === 'committed');
  const resendsRejected = resends.every(c => ctx.ex.byIndex.get(c.index)?.category === 'command-already-committed');
  ctx.check('storm-exactly-once', committedOnce && resendsRejected, { committedOnce, resendsRejected });
  // Superseded acknowledgements: journaled (in the feed with the signal-log change) and no change to current
  // values (golden digest after equals before, from O-REPLAY).
  const feedAt = new Map(ctx.feedSeen.map(f => [f.position, f]));
  let bad = 0;
  for (const c of storm.filter(c => c.tags.template === 'everifySuperseded')) {
    const a = ctx.ex.byIndex.get(c.index);
    const rec = a?.receipt && feedAt.get(a.receipt.position);
    const journaled = !!rec && rec.entities.some(e => ctx.unphys(e) === `signal:${c.subject}`);
    const golden = ctx.expected.digests[c.subject];
    const prior = cmds.filter(x => x.index < c.index && (x.subject === c.subject || x.subject == null) && golden.after[x.index]).at(-1);
    const unchanged = golden.after[c.index]?.[BT.NOW] === (prior ? golden.after[prior.index][BT.NOW] : golden.base[BT.NOW]);
    if (!journaled || !unchanged) bad++;
  }
  ctx.check('superseded-journaled-no-current-change', bad === 0, { bad, superseded: ctx.extra.storm.superseded });
  expectDomain(ctx, { id: 'late-older-revision-acknowledged-superseded', kind: 'signal-ack', subjects: [...new Set(storm.map(c => c.subject))] });
}
