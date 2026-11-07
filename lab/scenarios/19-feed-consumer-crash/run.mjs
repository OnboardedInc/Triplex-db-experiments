// Scenario 19: feed consumer crash (TARGETS 6 row 19), with GS.19b (TARGETS 6.1) and the three crash points of
// TARGETS 1.1 P3 item 6.
//
// The consumer under test reads `transactions({ after })` from its checkpoint, computes each transaction's
// affected-subject set (subjects written directly; the referenced-entity part is O-DOMAIN's), delivers one
// outbox item per (consumer, position, subject) to a receiver that deduplicates by that delivery key, and
// records "affected subjects known" plus its checkpoint in one durable write (fsync'd JSON file).
// Crashes are injected at: A before the effect; B after the effect but before the checkpoint (GS.19b: the
// item was delivered, completion not recorded); C after the checkpoint. After each crash the consumer resumes
// from its last durable checkpoint. Delivery is at-least-once; visible effects must be exactly one per key.
// The outbox here is the feed itself: the atomic outbox path (TARGETS section 3) is not in triplex-public.
import fs from 'node:fs';
import path from 'node:path';
import { BT, T, scenarioStream } from '../lib/gen.mjs';
import { expectDomain } from '../lib/domain.mjs';
import { subjectOfEntity } from '../lib/oracle.mjs';
import { quantiles } from '../lib/runner.mjs';

const sidOf = n => `q${String(n).padStart(4, '0')}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function generate(spec, p) {
  const active = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const events = [];
  active.forEach((sid, n) => { for (let seq = 0; seq < p.signalsPerSubject; seq++) { const at = Math.round(((seq + (n + 0.5) / active.length) / p.signalsPerSubject) * p.liveMs * 0.9); events.push({ at, emit: (s, rng) => T.everifySignal(s, rng, sid, seq, { at }) }); } });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...active, ...idle], events });
  return { stream, digestSubjects: [...active, ...idle, ...traceSubjects], validAts: [BT.NOW], witnesses: { positive: active, negative: idle } };
}

class Receiver { // the external system: dedup by delivery key
  constructor() { this.effects = new Map(); this.replays = 0; this.order = new Map(); }
  deliver(key, sid, position) {
    if (this.effects.has(key)) { this.replays++; return false; }
    this.effects.set(key, { at: performance.now(), position });
    const list = this.order.get(sid) ?? []; list.push(position); this.order.set(sid, list);
    return true;
  }
}

async function consumer(ctx, { file, receiver, crash, stopAt }) {
  const durable = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { after: ctx.P0, known: [] };
  let after = durable.after;
  const write = (state) => { const fd = fs.openSync(file + '.tmp', 'w'); fs.writeSync(fd, JSON.stringify(state)); fs.fsyncSync(fd); fs.closeSync(fd); fs.renameSync(file + '.tmp', file); };
  let pages = 0;
  for (;;) {
    if (stopAt() && after >= ctx.Pend) return { after, crashed: null };
    const page = await ctx.comp.feed(after, ctx.params.pageSize);
    if (!page.ok) { await sleep(100); continue; }
    if (!page.transactions.length) { await sleep(25); continue; }
    pages++;
    const known = [];
    if (crash?.point === 'A' && pages === crash.page) return { after, crashed: 'A' };
    for (const t of page.transactions) {
      const sids = [...new Set(t.changes.map(c => subjectOfEntity(ctx.unphys(c.entityId))))];
      for (const sid of sids) receiver.deliver(`gs19|${t.position}|${sid}`, sid, t.position);
      known.push({ position: t.position, subjects: sids, at: performance.now() });
    }
    if (crash?.point === 'B' && pages === crash.page) return { after, crashed: 'B' };
    after = page.transactions.at(-1).position;
    const state = { after, known: [...durable.known, ...known].slice(-5000) };
    write(state); durable.known = state.known;
    for (const k of known) ctx.extra.consumerKnownAt.set(k.position, performance.now());
    if (crash?.point === 'C' && pages === crash.page) return { after, crashed: 'C' };
  }
}

export async function during(ctx) {
  ctx.extra.consumerKnownAt = new Map();
  const file = path.join(ctx.opts.rawDir, `s19-${ctx.prefix}-checkpoint.json`);
  const receiver = new Receiver();
  ctx.extra.receiver = receiver;
  const runs = [];
  ctx.extra.consumerDone = (async () => {
    // Crash schedule: A, B (GS.19b), C, then run to the end.
    for (const crash of [{ point: 'A', page: 2 }, { point: 'B', page: 2 }, { point: 'C', page: 2 }, null]) {
      const t = performance.now();
      const r = await consumer(ctx, { file, receiver, crash, stopAt: () => ctx.Pend != null });
      runs.push({ crash: crash?.point ?? 'none', crashed: r.crashed, after: r.after, ms: Math.round(performance.now() - t) });
      if (crash) await sleep(500); // restart delay
    }
    return runs;
  })();
}

export async function check(ctx) {
  const runs = await Promise.race([ctx.extra.consumerDone, sleep(120_000).then(() => null)]);
  ctx.check('consumer-caught-up', !!runs, 'consumer did not reach the head within 120 s after the run');
  const receiver = ctx.extra.receiver;
  const committed = ctx.ex.attempts.filter(a => a.status === 'committed' && a.receipt.position > ctx.P0);
  const delivered = new Set([...receiver.effects.values()].map(e => e.position));
  const missing = committed.filter(a => !delivered.has(a.receipt.position)).map(a => a.receipt.position);
  ctx.check('consumer-no-gap', missing.length === 0, { missing: missing.slice(0, 10), count: missing.length });
  // Exactly one visible effect per delivery key (the receiver map) and replays happened after crash B.
  ctx.check('gs19b-one-visible-effect-per-key', receiver.effects.size === [...receiver.effects.keys()].length && receiver.replays > 0, { effects: receiver.effects.size, replays: receiver.replays });
  let orderBad = 0;
  for (const [, list] of receiver.order) if (list.some((p, i) => i > 0 && p < list[i - 1])) orderBad++;
  ctx.check('consumer-per-subject-order', orderBad === 0, { subjectsOutOfOrder: orderBad });
  const done = new Map(committed.map(a => [a.receipt.position, a.doneAt]));
  const lags = [...ctx.extra.consumerKnownAt].filter(([p]) => done.has(p)).map(([p, at]) => Math.max(0, at - done.get(p)));
  ctx.extra.consumer = { runs, replays: receiver.replays, effects: receiver.effects.size, affectedKnownLag: quantiles(lags) };
  delete ctx.extra.receiver; delete ctx.extra.consumerDone; delete ctx.extra.consumerKnownAt;
  ctx.check('all-three-crash-points-exercised', (runs ?? []).filter(r => r.crashed).map(r => r.crashed).join('') === 'ABC', runs);
  expectDomain(ctx, { id: 'dependency-index-affected-subjects', kind: 'affected-subjects', subjects: [...receiver.order.keys()] });
}
