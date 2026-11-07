// Scenario 19: feed consumer crash (TARGETS 6 row 19), with GS.19b (TARGETS 6.1), the crash points of
// TARGETS 1.1 P3 item 6, and the work-item delivery identity of RULINGS Q38f.
//
// The consumer under test reads `transactions({ after })` from its checkpoint. For each transaction and each
// subject it touches it forms a work item `reconcile:<subject>` whose payload is the transaction's asserted
// (attribute, value) pairs for that subject (a stand-in payload; W0's real work items are O-DOMAIN's).
// Q38f: each id carries a durable publication sequence that increments only when the payload differs from the
// latest published payload for that id; the delivery key is (id, publication sequence). Publication state, the
// new outbox records, the checkpoint and "affected subjects known" are persisted in one durable write (fsync'd
// JSON); unacknowledged outbox records survive a crash and replay with their original identity first on resume.
// Crash points: A before the effect (nothing durable for the page); D after the outbox write, before delivery
// (Q38f "crash before delivery"); B after delivery, before completion is recorded (GS.19b); C after the
// checkpoint. One subject gets an unchanged re-send of its last values (Q38f "unchanged activation during
// recovery"): it must publish nothing new. The receiver deduplicates by (id, publication sequence).
// The outbox here sits beside the feed consumer: an atomic outbox in the source transaction (TARGETS section 3)
// is not in the triplex-public composition.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { BT, T, canonValue, ents, scenarioStream } from '../lib/gen.mjs';
import { expectDomain } from '../lib/domain.mjs';
import { subjectOfEntity } from '../lib/oracle.mjs';
import { quantiles } from '../lib/runner.mjs';

const sidOf = n => `q${String(n).padStart(4, '0')}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 16);
export const CRASHES = [{ point: 'A', page: 2 }, { point: 'D', page: 2 }, { point: 'B', page: 2 }, { point: 'C', page: 2 }];

export function generate(spec, p) {
  const active = Array.from({ length: p.subjects }, (_, n) => sidOf(n));
  const idle = Array.from({ length: p.negatives }, (_, n) => sidOf(p.subjects + n));
  const events = [];
  active.forEach((sid, n) => { for (let seq = 0; seq < p.signalsPerSubject; seq++) { const at = Math.round(((seq + (n + 0.5) / active.length) / p.signalsPerSubject) * p.liveMs * 0.9); events.push({ at, emit: (s, rng) => T.everifySignal(s, rng, sid, seq, { at }) }); } });
  // The unchanged activation: re-send subject 0's last signal values under a new commandId, mid-run.
  const unchangedSid = active[0], unchangedAt = Math.round(p.liveMs * 0.95);
  events.push({ at: unchangedAt, emit: s => {
    const last = [...s.commands].reverse().find(c => c.subject === unchangedSid && c.tags?.template === 'everifySignal');
    const c = s.command({ subject: unchangedSid, writer: 'system', at: unchangedAt, tags: { template: 'unchangedActivation', sameAs: last.index } });
    for (const op of last.operations.filter(o => o.op === 'assert')) c.set(op.entityId, op.attribute, op.value, op.entityType, { validFrom: op.validFrom });
    c.done();
  } });
  const { stream, traceSubjects } = scenarioStream(spec, p, { subjects: [...active, ...idle], events });
  return { stream, digestSubjects: [...active, ...idle, ...traceSubjects], validAts: [BT.NOW], witnesses: { positive: active, negative: idle }, hand: { unchangedSubject: unchangedSid } };
}

/** Work-item payloads of one feed record, per subject (logical ids). */
function payloads(ctx, t) {
  const by = new Map();
  for (const c of t.changes) {
    if (c.op !== 'assert') continue;
    const sid = subjectOfEntity(ctx.unphys(c.entityId));
    const value = c.value.type === 'ref' ? { ...c.value, value: ctx.unphys(c.value.value) } : c.value;
    by.set(sid, [...(by.get(sid) ?? []), `${c.attribute}=${canonValue(value)}`]);
  }
  const subjects = [...new Set(t.changes.map(c => subjectOfEntity(ctx.unphys(c.entityId))))];
  return subjects.map(sid => ({ sid, id: `reconcile:${sid}`, payload: hash((by.get(sid) ?? []).sort().join('\n')) }));
}

class Receiver { // the external system: deduplicates by the delivery key (id, publication sequence)
  constructor() { this.effects = new Map(); this.replays = 0; this.attempts = 0; }
  deliver(rec) {
    this.attempts++;
    const key = `${rec.id}|${rec.seq}`;
    if (this.effects.has(key)) { this.replays++; return; }
    this.effects.set(key, { at: performance.now(), position: rec.position, payload: rec.payload });
  }
}

async function consumer(ctx, { file, receiver, crash, stopAt }) {
  const load = () => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { after: ctx.P0, pub: {}, outbox: [], known: [] };
  const write = state => { const fd = fs.openSync(file + '.tmp', 'w'); fs.writeSync(fd, JSON.stringify(state)); fs.fsyncSync(fd); fs.closeSync(fd); fs.renameSync(file + '.tmp', file); };
  const state = load();
  // Unacknowledged deliveries replay first, with their original identity.
  if (state.outbox.length) { for (const rec of state.outbox) receiver.deliver(rec); state.outbox = []; write(state); }
  let pages = 0;
  for (;;) {
    if (stopAt() && state.after >= ctx.Pend) return { after: state.after, crashed: null };
    const page = await ctx.comp.feed(state.after, ctx.params.pageSize);
    if (!page.ok) { await sleep(100); continue; }
    if (!page.transactions.length) { await sleep(100); continue; }
    pages++;
    const hit = point => crash?.point === point && pages === crash.page;
    if (hit('A')) return { after: state.after, crashed: 'A' };
    const fresh = [];
    for (const t of page.transactions) {
      for (const w of payloads(ctx, t)) {
        const cur = state.pub[w.id];
        if (cur && cur.payload === w.payload) continue; // unchanged: no new publication (Q38f)
        const rec = { id: w.id, seq: (cur?.seq ?? 0) + 1, payload: w.payload, position: t.position };
        state.pub[w.id] = { seq: rec.seq, payload: w.payload };
        fresh.push(rec);
      }
      state.known.push(t.position);
    }
    state.after = page.transactions.at(-1).position;
    state.outbox.push(...fresh);
    write(state); // publication state + outbox records + checkpoint + affected known, one durable write
    for (const t of page.transactions) ctx.extra.consumerKnownAt.set(t.position, performance.now());
    if (hit('D')) return { after: state.after, crashed: 'D' };
    for (const rec of state.outbox) receiver.deliver(rec);
    if (hit('B')) return { after: state.after, crashed: 'B' };
    state.outbox = [];
    write(state); // completion recorded
    if (hit('C')) return { after: state.after, crashed: 'C' };
  }
}

export async function during(ctx) {
  ctx.extra.consumerKnownAt = new Map();
  const file = path.join(ctx.opts.rawDir, `s19-${ctx.prefix}-checkpoint.json`);
  ctx.extra.checkpointFile = file;
  const receiver = new Receiver();
  ctx.extra.receiver = receiver;
  const runs = [];
  ctx.extra.consumerDone = (async () => {
    for (const crash of [...CRASHES, null]) {
      const t = performance.now();
      const r = await consumer(ctx, { file, receiver, crash, stopAt: () => ctx.Pend != null });
      runs.push({ crash: crash?.point ?? 'none', crashed: r.crashed, after: r.after, ms: Math.round(performance.now() - t) });
      if (crash) await sleep(500); // restart delay
    }
    return runs;
  })();
}

export async function check(ctx) {
  const runs = await Promise.race([ctx.extra.consumerDone, sleep(180_000).then(() => null)]);
  ctx.check('consumer-caught-up', !!runs, 'consumer did not reach the head within 180 s after the run');
  const receiver = ctx.extra.receiver;
  const state = fs.existsSync(ctx.extra.checkpointFile) ? JSON.parse(fs.readFileSync(ctx.extra.checkpointFile, 'utf8')) : { known: [], outbox: [], pub: {} };
  const committed = ctx.ex.attempts.filter(a => a.status === 'committed' && a.receipt.position > ctx.P0 && a.receipt.position <= ctx.Pend);
  const known = new Set(state.known);
  const missing = committed.filter(a => !known.has(a.receipt.position)).map(a => a.receipt.position);
  ctx.check('consumer-no-gap', missing.length === 0, { missing: missing.slice(0, 10), count: missing.length });
  ctx.check('consumer-known-once', state.known.length === known.size, { recorded: state.known.length, distinct: known.size });
  // Expected publications from the receipts and the command stream: per subject, in commit order, a new
  // sequence whenever the asserted payload differs from the previous published one.
  const cmds = ctx.gen.stream.commands;
  const expected = new Map();
  const bySid = new Map();
  for (const a of [...committed].sort((x, y) => x.receipt.position - y.receipt.position)) {
    const cmd = cmds[a.index];
    const per = new Map();
    for (const op of cmd.operations) { if (op.op !== 'assert') continue; const sid = subjectOfEntity(op.entityId); per.set(sid, [...(per.get(sid) ?? []), `${op.attribute}=${canonValue(op.value)}`]); }
    for (const op of cmd.operations) if (op.op === 'retract' && !per.has(cmd.subject)) per.set(cmd.subject, []);
    for (const [sid, list] of per) {
      const payload = hash(list.sort().join('\n'));
      const prev = bySid.get(sid);
      if (prev?.payload === payload) continue;
      const seq = (prev?.seq ?? 0) + 1;
      bySid.set(sid, { seq, payload });
      expected.set(`reconcile:${sid}|${seq}`, payload);
    }
  }
  const got = new Map([...receiver.effects].map(([k, v]) => [k, v.payload]));
  const missingDeliveries = [...expected.keys()].filter(k => got.get(k) !== expected.get(k));
  const extra = [...got.keys()].filter(k => !expected.has(k));
  ctx.check('deliveries-by-id-and-publication-sequence', missingDeliveries.length === 0 && extra.length === 0, { expected: expected.size, delivered: got.size, missing: missingDeliveries.slice(0, 5), extra: extra.slice(0, 5) });
  ctx.check('gs19b-one-visible-effect-per-key-with-replays', receiver.replays > 0 && state.outbox.length === 0, { effects: receiver.effects.size, attempts: receiver.attempts, replays: receiver.replays, unacked: state.outbox.length });
  const unchanged = cmds.find(c => c.tags?.template === 'unchangedActivation');
  const ua = unchanged && ctx.ex.byIndex.get(unchanged.index);
  const uaPublished = ua?.receipt ? [...receiver.effects.values()].some(e => e.position === ua.receipt.position) : null;
  ctx.check('unchanged-activation-publishes-nothing', ua?.status === 'committed' && uaPublished === false, { status: ua?.status, published: uaPublished });
  const done = new Map(committed.map(a => [a.receipt.position, a.doneAt]));
  const lags = [...ctx.extra.consumerKnownAt].filter(([p]) => done.has(p)).map(([p, at]) => Math.max(0, at - done.get(p)));
  ctx.extra.consumer = { runs, replays: receiver.replays, effects: receiver.effects.size, deliveryAttempts: receiver.attempts, expectedPublications: expected.size, affectedKnownLag: quantiles(lags) };
  delete ctx.extra.receiver; delete ctx.extra.consumerDone; delete ctx.extra.consumerKnownAt; delete ctx.extra.checkpointFile;
  ctx.check('all-crash-points-exercised', (runs ?? []).filter(r => r.crashed).map(r => r.crashed).join('') === CRASHES.map(c => c.point).join(''), runs);
  expectDomain(ctx, { id: 'dependency-index-affected-subjects', kind: 'affected-subjects', subjects: [...bySid.keys()] });
  expectDomain(ctx, { id: 'work-item-payloads-and-publication-sequences', kind: 'work-items', subjects: [...bySid.keys()] });
}
