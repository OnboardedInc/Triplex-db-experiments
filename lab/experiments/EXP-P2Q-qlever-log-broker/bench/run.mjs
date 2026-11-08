#!/usr/bin/env node
// EXP-P2Q driver. Every mode writes a receipt under ../receipts and raw samples under RAW_DIR.
//   probe                                         keep-alive vs fresh connection; update response shape
//   service --arm A0|A0f|C [--n 150] [--facts 10] [--label L]   closed loop, 1 writer: ACK latency + RYOW per command
//   trace   --arm A0|C [--seed s] [--subjects 10000] [--window 180]   open-loop TARGETS 2.1 trace + RYOW + feed consumer
//   fill    --to N [--batch 25000]                 grow QLever's delta with fill triples (exclusive slot only)
//   rebuild --threshold N [--readers 4] [--window 120]   candidate with the delta-triggered online rebuild-index
//   crash   --variant keyed-split|unkeyed-split|keyed-atomic|unkeyed-atomic [--crashes 100] [--commits 400]   (no QLever)
//   ackpath [--n 400] [--facts 10] [--trace]      candidate with no replica: the ACK path alone (diagnostic, no QLever)
// QLEVER_URL must point at the QLever under test (dev resident 7070 or a held slot). Graph names start with p2q-.
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Effect } from 'effect';
import {
  ARMS, BROKER_ROOT, armRuntime, commandOps, identity, now, qlever, round, runtimeApi, summary, tally, wall, writeReceipt,
} from './lib.mjs';
import { GENERATOR_SHA256, PARAMS, generateTrace, traceDigest } from './trace.mjs';

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const flag = (name) => args.includes(`--${name}`);
const url = process.env.QLEVER_URL;
const slot = opt('slot', process.env.P2Q_SLOT ?? 'dev');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const bandOf = (facts) => (facts <= 10 ? '5-10' : facts <= 25 ? '11-25' : '26-50');
const outcomeOf = (error) => {
  if (error?._tag === 'CommandAlreadyCommittedError') return 'duplicate';
  if (error?.reason === 'serialization-conflict' || error?._tag === 'TransactionConflictError') return 'conflict';
  if (error?.reason === 'outcome-unknown') return 'unknown';
  return `error:${error?._tag ?? error?.name ?? 'unknown'}`;
};
const transact = (rt, ops, meta) => rt.run(rt.triples.transact(ops, meta));
const pullAt = (rt, subject, position) => rt.run(rt.adapter.getByEntity(`subj:${subject}`, { validAt: Date.now() + 1, recordedPosition: position }));
const sawCommand = (rows, seq, facts) => {
  const want = new Set(Array.from({ length: facts }, (_v, i) => `v${seq}-${i}`));
  for (const row of rows) want.delete(row.value_string);
  return want.size === 0;
};
const nullClient = { query: async () => [], update: async () => ({}), command: async () => ({}), cancel: async () => {}, close: async () => {} };
const requireUrl = () => { if (!url) throw new Error('QLEVER_URL is required for this mode'); return url; };

/** Publication timeline from broker events (candidate only). */
const brokerRecorder = () => {
  const events = [];
  return { events, onEvent: (event) => events.push(event) };
};
const routeRecorder = () => {
  const routes = [];
  return { routes, onRead: (event) => routes.push(event) };
};

// ------------------------------------------------------------------ probe

const probe = async () => {
  requireUrl();
  const keep = qlever.makeQleverClient(url), fresh = qlever.makeFreshConnectionClient(url);
  const q = 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1';
  const time = async (client, n = 40) => { const out = []; for (let i = 0; i < n; i++) { const t = now(); await client.query(q); out.push(now() - t); } return summary(out.slice(5)); };
  const keepAlive = await time(keep), freshConnection = await time(fresh);
  const scope = `p2q-probe-${randomUUID()}`;
  const graph = `<urn:triplex:p2q-probe:${randomUUID()}>`;
  const response = await fresh.update(`INSERT DATA { GRAPH ${graph} { <urn:p2q:s> <urn:p2q:p> "x" } }`);
  const stats = await fresh.command('stats').catch((error) => ({ error: String(error) }));
  await fresh.update(`DELETE DATA { GRAPH ${graph} { <urn:p2q:s> <urn:p2q:p> "x" } }`);
  return { arm: 'probe', scope, keepAliveQueryMs: keepAlive, freshConnectionQueryMs: freshConnection, updateResponse: response, stats };
};

// ------------------------------------------------------------------ service (closed loop, R17 2.2 shape)

const service = async () => {
  requireUrl();
  const arm = opt('arm'), n = Number(opt('n', 150)), facts = Number(opt('facts', 10)), subjects = Number(opt('subjects', 10000));
  const label = opt('label', 'delta-unlabelled');
  const scope = opt('scope', `p2q-service-${arm}-${randomUUID()}`);
  const recorder = brokerRecorder(), reads = routeRecorder();
  const rt = await armRuntime(url, arm, scope, { onEvent: recorder.onEvent, onRead: reads.onRead });
  const rng = (() => { let s = 0x9e3779b9; return () => ((s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) >>> 0) / 4294967296); })();
  const records = [];
  const deltaBefore = rt.lastDelta();
  for (let i = 0; i < n; i++) {
    const subject = Math.floor(rng() * subjects), seq = `${label}-${i}`;
    const t0 = now();
    const result = await transact(rt, commandOps({ subject, facts, seq, correction: false }, Date.now()), { commandId: `svc:${scope}:${i}` });
    const ack = now();
    const readsBefore = reads.routes.length;
    const rows = await pullAt(rt, subject, result.position);
    const pulled = now();
    records.push({
      i, subject, position: result.position, ackMs: ack - t0, ryowMs: pulled - ack, ryow: sawCommand(rows, seq, facts),
      route: reads.routes.slice(readsBefore).map((r) => r.route).join(','), delta: arm === 'C' ? undefined : rt.lastDelta(), ackAt: ack,
    });
  }
  let drained = null;
  if (arm === 'C') {
    const t = now();
    drained = { ok: await rt.broker.drain(120_000), ms: round(now() - t) };
    // After publication the replica alone must give the same answers the overlay gave (applier exactness).
    let mismatches = 0;
    for (const r of records.slice(-20)) {
      const rows = await pullAt(rt, r.subject, r.position);
      if (!sawCommand(rows, `${label}-${r.i}`, facts)) mismatches++;
    }
    drained.replicaMismatches = mismatches;
    drained.lastRoute = reads.routes.at(-1)?.route;
  }
  const warm = records.slice(Math.min(10, Math.floor(n / 10)));
  const published = recorder.events.filter((e) => e.type === 'published');
  const result = {
    arm, armLabel: ARMS[arm].label, scope, label, n, facts, band: bandOf(facts), warmupDropped: records.length - warm.length,
    ackMs: summary(warm.map((r) => r.ackMs)), ryowReadMs: summary(warm.map((r) => r.ryowMs)),
    ryow: { trials: records.length, hits: records.filter((r) => r.ryow).length, routes: tally(records.map((r) => r.route)) },
    delta: arm === 'C'
      ? { publishedDeltaFirst: published[0]?.deltaTotal ?? null, publishedDeltaLast: published.at(-1)?.deltaTotal ?? null }
      : { before: deltaBefore ?? null, first: records[0]?.delta ?? null, last: records.at(-1)?.delta ?? null },
    publication: arm === 'C' ? {
      updates: published.length, membersPerUpdate: summary(published.map((e) => e.members)), updateMs: summary(published.map((e) => e.ms)),
      resends: published.reduce((a, e) => a + e.resends, 0), applyErrors: recorder.events.filter((e) => e.type === 'apply-error').length,
      drained, broker: rt.broker.stats(),
    } : { updates: rt.counts.updates, updateMs: summary(rt.counts.updateMs), updateErrors: rt.counts.updateErrors },
    raw: { records, events: recorder.events },
  };
  await rt.close();
  return result;
};

// ------------------------------------------------------------------ trace (open loop, TARGETS 2.1)

/**
 * Feed consumer polling the host log (candidate) or the Triplex journal (A0); one durable record per page.
 * RULINGS Q67d: the consumer records only when it saw each position (its durable record). Nothing about ACKs is
 * looked up while it runs: the ACK can legitimately arrive after the feed delivered the frame (the watermark is
 * published before the ACK is sent), so ACKs are reconciled after the run, never counted as feed defects.
 */
const startConsumer = (rt, arm, consumerDir) => {
  const store = new qlever.FeedConsumerStore(consumerDir, `consumer-${arm}`, 'atomic', true);
  const processed = [], consumerAt = new Map(), stats = { polls: 0, writes: 0, aborted: 0 };
  let stopping = false, startAfter;
  const loop = (async () => {
    if (arm === 'C') {
      const feed = new qlever.LogFeed(path.dirname(rt.broker.segmentPath));
      let cursor = store.checkpoint() ?? feed.start();
      for (;;) {
        const page = feed.poll(cursor); stats.polls++;
        if (page.resolutions.length > 0) {
          const effects = [];
          for (const r of page.resolutions) {
            if (r.kind === 'aborted') stats.aborted++;
            if (r.kind !== 'commit') continue;
            for (const t of r.transacts) for (const s of t.subjects) { effects.push({ position: t.position, subject: s }); processed.push([t.position, s]); }
          }
          store.recordEffects(effects, page.cursor); stats.writes++;
          const t = wall();
          for (const r of page.resolutions) if (r.kind === 'commit') for (const tr of r.transacts) if (!consumerAt.has(tr.position)) consumerAt.set(tr.position, t);
          cursor = page.cursor;
        } else if (stopping) break;
        else await sleep(5);
      }
    } else {
      let after = await rt.run(rt.triples.currentPosition());
      startAfter = after;
      for (;;) {
        const page = await rt.run(rt.triples.transactions({ after, limit: 200 })); stats.polls++;
        const records = page.transactions;
        if (records.length > 0) {
          const effects = records.flatMap((r) => [...new Set(r.changes.map((c) => c.entityId))].map((subject) => ({ position: r.position, subject })));
          for (const e of effects) processed.push([e.position, e.subject]);
          const cursor = { lsn: records.at(-1).position, offset: 0, seed: 0, nextLsn: records.at(-1).position + 1 };
          store.recordEffects(effects, cursor); stats.writes++;
          const t = wall();
          for (const r of records) if (!consumerAt.has(r.position)) consumerAt.set(r.position, t);
          after = records.at(-1).position;
        } else if (stopping) break;
        else await sleep(5);
      }
    }
  })();
  return { stop: async () => { stopping = true; await loop; store.close(); return { processed, stats, consumerAt, startAfter }; } };
};

/**
 * RULINGS Q67d: the final published source prefix, enumerated from the source's own record after the run. The
 * candidate's source is the host log up to its WATERMARK (a fresh LogFeed from the start); A0's source is the
 * engine's own journal after the consumer's starting position.
 */
const sourcePrefix = async (rt, arm, startAfter) => {
  const positions = [], effects = [];
  if (arm === 'C') {
    const feed = new qlever.LogFeed(path.dirname(rt.broker.segmentPath));
    for (let cursor = feed.start(); ; ) {
      const page = feed.poll(cursor);
      if (page.resolutions.length === 0) break;
      for (const r of page.resolutions) if (r.kind === 'commit') for (const tr of r.transacts) {
        positions.push(tr.position);
        for (const subject of tr.subjects) effects.push([tr.position, subject]);
      }
      cursor = page.cursor;
    }
  } else {
    for (let after = startAfter; ; ) {
      const page = await rt.run(rt.triples.transactions({ after, limit: 200 }));
      if (page.transactions.length === 0) break;
      for (const r of page.transactions) {
        positions.push(r.position);
        for (const subject of new Set(r.changes.map((c) => c.entityId))) effects.push([r.position, subject]);
      }
      after = page.transactions.at(-1).position;
    }
  }
  return { positions: [...new Set(positions)].sort((a, b) => a - b), effects };
};

const auditEffects = (consumerDir, consumer, committed, processed) => {
  const durable = qlever.readConsumerEffects(consumerDir, consumer);
  const key = (p, s) => `${p}|${s}`;
  const expected = new Set(committed.map(([p, s]) => key(p, s)));
  const gaps = [...expected].filter((k) => !durable.has(k));
  const extras = [...durable.keys()].filter((k) => !expected.has(k));
  const visibleDuplicates = [...durable.values()].filter((c) => c > 1).length;
  const seen = tally(processed.map(([p, s]) => key(p, s)));
  const replayedEffects = Object.values(seen).filter((c) => c > 1).length;
  const last = new Map(); let orderViolations = 0;
  for (const [p, s] of processed) { if (last.has(s) && last.get(s) > p) orderViolations++; last.set(s, p); }
  return { committedEffects: expected.size, durableEffects: durable.size, gaps: gaps.length, extras: extras.length, visibleDuplicates, replayedEffects, orderViolations, gapSample: gaps.slice(0, 5) };
};

const trace = async () => {
  const offline = flag('offline');
  if (!offline) requireUrl();
  if (offline && opt('arm') !== 'C') throw new Error('--offline is the candidate with no replica');
  const arm = opt('arm'), seed = opt('seed', 'p2q-a'), subjects = Number(opt('subjects', 10000)), windowS = Number(opt('window', 180));
  const ryowEvery = Number(opt('ryow-every', 1));
  const scope = `p2q-trace-${arm}${offline ? '-offline' : ''}-${randomUUID()}`;
  const events = generateTrace({ seed, subjects, durationS: windowS });
  const recorder = brokerRecorder(), reads = routeRecorder();
  const rt = await armRuntime(url, arm, scope, {
    offline, onEvent: recorder.onEvent, onRead: reads.onRead,
    brokerOptions: opt('rebuild-at') ? { rebuildAtDeltaTriples: Number(opt('rebuild-at')) } : {},
  });
  const consumerDir = path.join(BROKER_ROOT, 'consumers', scope.replace(/[^a-zA-Z0-9-]/g, '_'));
  const acks = new Map();
  const consumer = startConsumer(rt, arm, consumerDir);
  const records = [], originals = new Map(), inflight = new Set();
  const startAt = now() + 1000;
  let ryowCount = 0;
  const dispatch = (event) => {
    const offered = startAt + event.atMs;
    const p = (async () => {
      const started = now();
      const meta = { commandId: `p2q:${scope}:${event.seq}`, actor: event.kind };
      const record = { seq: event.seq, resend: event.resend, band: bandOf(event.facts), facts: event.facts, burst: event.burst, kind: event.kind, subject: event.subject, offered, started };
      try {
        const result = await transact(rt, commandOps(event, Date.now()), meta);
        record.acked = now(); acks.set(result.position, wall());
        record.position = result.position; record.txId = result.txId; record.outcome = 'committed';
        originals.set(event.seq, result.txId);
        if (ryowCount++ % ryowEvery === 0) {
          // A failed read must not turn a committed command into an error (accounting is about commits).
          const before = reads.routes.length;
          try {
            const rows = await pullAt(rt, event.subject, result.position);
            record.ryow = sawCommand(rows, event.seq, event.facts);
          } catch (error) { record.ryow = false; record.ryowError = String(error?.message ?? error).slice(0, 160); }
          record.ryowMs = now() - record.acked;
          record.route = reads.routes.slice(before).map((r) => r.route).join(',') || 'error';
        }
        if (event.ackLoss && !event.resend) {
          try { await transact(rt, commandOps(event, Date.now()), meta); record.ackLossRetry = 'committed-twice'; }
          catch (error) { record.ackLossRetry = outcomeOf(error) === 'duplicate' && error.transactionId === result.txId ? 'original-receipt' : outcomeOf(error); }
        }
      } catch (error) {
        record.acked = now();
        record.outcome = outcomeOf(error);
        if (record.outcome === 'duplicate') record.originalMatches = originals.has(event.seq) ? error.transactionId === originals.get(event.seq) : null;
        else record.error = String(error?.message ?? error).slice(0, 200);
      }
      records.push(record);
    })();
    inflight.add(p); p.finally(() => inflight.delete(p));
  };
  for (const event of events) {
    const wait = startAt + event.atMs - now();
    if (wait > 1) await sleep(wait);
    dispatch(event);
  }
  await Promise.all([...inflight]);
  const drainedAt = now();
  const consumed = await consumer.stop();
  // RULINGS Q67d (V-P2Q m6, Q55d): P3 lag runs from the source's actual publication instant (TARGETS 1.1 P3
  // item 1) for every position of the final published source prefix, enumerated from the source's own record.
  // Candidate: the broker's WATERMARK publication for the position's frame. A0 (the engine as source): the
  // instant its guarded update applied (commit resolution). ACK records are reconciled afterwards: a position
  // with no ACK is a late or lost ACK (client-side accounting), never a feed defect; an ACK for a position the
  // source never published is a defect.
  const source = await sourcePrefix(rt, arm, consumed.startAfter);
  const prefix = source.positions;
  // [EXP-P2Q] Why: Q67d makes source records the feed denominator, including lost ACKs.
  // Rejected: ACK-derived effects (reports a correctly delivered lost-ACK commit as an extra).
  const audit = auditEffects(consumerDir, `consumer-${arm}`, source.effects, consumed.processed);
  const watermarkByLsn = new Map(recorder.events.filter((e) => e.type === 'frame').map((e) => [e.lsn, performance.timeOrigin + e.watermarkAt]));
  const resolutions = [...rt.counts.resolutions].sort((a, b) => a[0] - b[0]);
  const resolvedAt = (position) => {
    // The first applied A0 update whose new position covers this one (binary search over sorted positions).
    let lo = 0, hi = resolutions.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (resolutions[mid][0] < position) lo = mid + 1; else hi = mid; }
    return lo < resolutions.length ? resolutions[lo][1] : null;
  };
  const perPosition = prefix.map((position) => ({
    position,
    sourceAt: arm === 'C' ? (watermarkByLsn.get(qlever.lsnOf(position)) ?? null) : resolvedAt(position),
    consumerAt: consumed.consumerAt.get(position) ?? null,
    ackAt: acks.get(position) ?? null,
  }));
  const inPrefix = new Set(prefix);
  const undelivered = perPosition.filter((p) => p.consumerAt === null);
  const unstamped = perPosition.filter((p) => p.sourceAt === null);
  const ackedNotPublished = [...acks.keys()].filter((p) => !inPrefix.has(p));
  const lateOrLostAcks = perPosition.filter((p) => p.ackAt === null).map((p) => p.position);
  const lagFromSource = perPosition.filter((p) => p.sourceAt !== null && p.consumerAt !== null).map((p) => p.consumerAt - p.sourceAt);
  const lagFromAck = perPosition.filter((p) => p.ackAt !== null && p.consumerAt !== null).map((p) => p.consumerAt - p.ackAt);
  const harnessFailures = [
    ...(undelivered.length ? [`feed: ${undelivered.length} positions of the published source prefix were never delivered`] : []),
    ...(ackedNotPublished.length ? [`accounting: ${ackedNotPublished.length} ACKed positions are not in the source's published prefix`] : []),
    ...(unstamped.length ? [`instrumentation: ${unstamped.length} source positions have no publication instant`] : []),
  ];
  const originalsOnly = records.filter((r) => !r.resend);
  const committedOriginals = originalsOnly.filter((r) => r.outcome === 'committed');
  const latency = (rs) => rs.map((r) => r.acked - r.offered);
  const byBand = Object.fromEntries(['5-10', '11-25', '26-50'].map((band) => {
    const rs = committedOriginals.filter((r) => r.band === band);
    return [band, { offerToAckMs: summary(latency(rs)), steady: summary(latency(rs.filter((r) => !r.burst))), burst: summary(latency(rs.filter((r) => r.burst))) }];
  }));
  const ryowRecords = records.filter((r) => r.ryow !== undefined);
  let drain = null;
  if (arm === 'C') { const t = now(); drain = { ok: await rt.broker.drain(600_000), ms: round(now() - t), broker: rt.broker.stats() }; }
  const published = recorder.events.filter((e) => e.type === 'published');
  const result = {
    arm: offline ? 'C-offline' : arm, armLabel: offline ? 'candidate with no QLever replica (ACK path and feed only; RYOW served by the overlay alone)' : ARMS[arm].label,
    scope, seed, subjects, windowS, generatorSha256: GENERATOR_SHA256, traceSha256: traceDigest(events),
    offered: { events: events.length, originals: originalsOnly.length, resends: events.length - originalsOnly.length, burstOriginals: originalsOnly.filter((r) => r.burst).length },
    accounting: { ...tally(records.map((r) => (r.resend ? `resend:${r.outcome}` : r.outcome))), unaccounted: events.length - records.length },
    errorsSample: records.filter((r) => r.error).slice(0, 3).map((r) => r.error),
    ackLoss: tally(records.filter((r) => r.ackLossRetry).map((r) => r.ackLossRetry)),
    resendReceipts: tally(records.filter((r) => r.resend && r.outcome === 'duplicate').map((r) => String(r.originalMatches))),
    byBand, all: { offerToAckMs: summary(latency(committedOriginals)) },
    steady: { offerToAckMs: summary(latency(committedOriginals.filter((r) => !r.burst))) },
    burst: { offerToAckMs: summary(latency(committedOriginals.filter((r) => r.burst))) },
    throughput: { committedPerS: round(committedOriginals.length / windowS, 2), drainAfterWindowS: round((drainedAt - startAt) / 1000 - windowS, 1) },
    ryow: { trials: ryowRecords.length, hits: ryowRecords.filter((r) => r.ryow).length, routes: tally(ryowRecords.map((r) => r.route)), readMs: summary(ryowRecords.map((r) => r.ryowMs)) },
    feed: {
      lagFromSourceMs: summary(lagFromSource),
      sourceInstant: arm === 'C' ? 'WATERMARK publication of the frame (Q67d)' : 'guarded update applied (commit resolution, Q67d)',
      sourcePrefix: { positions: prefix.length, undelivered: undelivered.length, unstamped: unstamped.length },
      lagFromAckMs: summary(lagFromAck), ...audit, ...consumed.stats,
      ackReconciliation: { acked: acks.size, ackedNotPublished: ackedNotPublished.length, lateOrLostAcks: lateOrLostAcks.length, lateOrLostSample: lateOrLostAcks.slice(0, 20) },
    },
    failed: harnessFailures.length > 0, harnessFailures,
    publication: arm === 'C'
      ? { updates: published.length, updateMs: summary(published.map((e) => e.ms)), membersPerUpdate: summary(published.map((e) => e.members)), lastDelta: published.at(-1)?.deltaTotal ?? null, rebuilds: recorder.events.filter((e) => e.type.startsWith('rebuild')), applyErrors: recorder.events.filter((e) => e.type === 'apply-error').length, drain }
      : { updates: rt.counts.updates, updateMs: summary(rt.counts.updateMs), lastDelta: rt.lastDelta() ?? null, updateErrors: rt.counts.updateErrors },
    raw: { records, perPosition, sourceEffects: source.effects, events: recorder.events, a0Resolutions: arm === 'C' ? undefined : resolutions },
  };
  await rt.close();
  return result;
};

// ------------------------------------------------------------------ fill (grow the delta; exclusive slot only)

const fill = async () => {
  requireUrl();
  if (slot === 'dev' && !flag('i-hold-the-slot')) throw new Error('fill grows the shared delta; run it only on an exclusive slot');
  const to = Number(opt('to')), batch = Number(opt('batch', 25000));
  const client = qlever.makeFreshConnectionClient(url);
  const graph = '<urn:triplex:p2q-fill>';
  let total = null, k = Number(opt('start', Date.now())), sent = 0;
  const t0 = now();
  while (total === null || total < to) {
    const lines = [];
    for (let i = 0; i < batch; i++, k++) lines.push(`<urn:p2q:fill:${k}> <urn:p2q:fill:p${k % 7}> "fill-${k}" .`);
    const response = await client.update(`INSERT DATA { GRAPH ${graph} { ${lines.join('\n')} } }`, { timeoutMs: 600_000 });
    total = response?.operations?.[0]?.['delta-triples']?.after?.total ?? null;
    sent += batch;
    if (total === null) throw new Error(`no delta total in response ${JSON.stringify(response).slice(0, 300)}`);
  }
  return { arm: 'fill', to, sent, deltaTotal: total, ms: round(now() - t0) };
};

// ------------------------------------------------------------------ rebuild (bounded delta, live reads)

const rebuild = async () => {
  requireUrl();
  if (slot === 'dev') throw new Error('rebuild-index rebuilds the whole server; run it only on an exclusive slot');
  const threshold = Number(opt('threshold', 300000)), readers = Number(opt('readers', 4)), windowS = Number(opt('window', 120));
  const cps = Number(opt('cps', 1.5)), facts = Number(opt('facts', 10)), subjects = Number(opt('subjects', 2000));
  const scope = `p2q-rebuild-C-${randomUUID()}`;
  const recorder = brokerRecorder(), reads = routeRecorder();
  const rt = await armRuntime(url, 'C', scope, { onEvent: recorder.onEvent, onRead: reads.onRead, brokerOptions: { rebuildAtDeltaTriples: threshold } });
  const written = [], acks = [], pulls = [];
  let stop = false, seq = 0;
  const t0 = now();
  const writer = (async () => {
    let next = now();
    while (now() - t0 < windowS * 1000) {
      next += (-Math.log(1 - Math.random()) / cps) * 1000;
      const wait = next - now(); if (wait > 1) await sleep(wait);
      const subject = Math.floor(Math.random() * subjects), s = seq++;
      const offered = Math.max(next, now() - 0);
      const result = await transact(rt, commandOps({ subject, facts, seq: `rb${s}`, correction: false }, Date.now()), { commandId: `rb:${scope}:${s}` });
      acks.push({ at: now() - t0, ms: now() - offered, position: result.position });
      written.push({ subject, s, position: result.position });
    }
  })();
  const reader = async () => {
    while (!stop) {
      if (written.length === 0) { await sleep(20); continue; }
      const w = written[Math.floor(Math.random() * written.length)];
      const before = reads.routes.length;
      const s = now();
      const rows = await pullAt(rt, w.subject, rt.broker.head());
      pulls.push({ at: s - t0, ms: now() - s, route: reads.routes.slice(before).map((r) => r.route).join(','), rows: rows.length });
    }
  };
  const readerLoops = Array.from({ length: readers }, reader);
  await writer; stop = true; await Promise.all(readerLoops);
  const drain = { ok: await rt.broker.drain(600_000), broker: rt.broker.stats() };
  const starts = recorder.events.filter((e) => e.type === 'rebuild-start').map((e) => e.at - t0);
  const ends = recorder.events.filter((e) => e.type === 'rebuild-end').map((e) => ({ at: e.at - t0, ms: e.ms, ok: e.ok, error: e.error }));
  const during = (x) => starts.some((s, i) => x >= s && x <= (ends[i]?.at ?? Infinity));
  const phase = (rows) => ({ before: summary(rows.filter((r) => r.at < (starts[0] ?? Infinity)).map((r) => r.ms)), during: summary(rows.filter((r) => during(r.at)).map((r) => r.ms)), after: summary(rows.filter((r) => starts.length && r.at > (ends.at(-1)?.at ?? Infinity)).map((r) => r.ms)) });
  const result = {
    arm: 'C', scope, threshold, readers, windowS, cps, facts, rebuilds: { starts, ends },
    readMs: phase(pulls), ackMs: phase(acks), readRoutes: tally(pulls.map((p) => p.route)),
    publication: { updates: recorder.events.filter((e) => e.type === 'published').length, lastDelta: recorder.events.filter((e) => e.type === 'published').at(-1)?.deltaTotal, drain },
    raw: { pulls, acks, events: recorder.events },
  };
  await rt.close();
  return result;
};

// ------------------------------------------------------------------ replay (replica kill -9 and catch-up from the host log)

/**
 * Coordinator request (R21 1.3): with `--persist-updates` off the replica loses its delta on a crash and the
 * broker replays the host log from the replica's marker. Grow the replica's delta with broker commits, keep a
 * paced writer and readers running, kill -9 the slot's container (DOCKER_HOST explicit, own slot only),
 * restart it through lab/bin/engine.mjs, and time the catch-up; then check that every committed position is
 * present on the replica (0 missing) and that ACKs and reads continued through the outage.
 */
const replay = async () => {
  requireUrl();
  if (slot === 'dev') throw new Error('replay kills the QLever container; run it only on an exclusive slot');
  const { execFileSync } = await import('node:child_process');
  const { REPO } = await import('./lib.mjs');
  const target = Number(opt('delta', 500000)), facts = Number(opt('facts', 10)), cps = Number(opt('cps', 1.5));
  const readersN = Number(opt('readers', 2)), subjects = Number(opt('subjects', 2000));
  const scope = `p2q-replay-C-${randomUUID()}`;
  const recorder = brokerRecorder(), reads = routeRecorder();
  const rt = await armRuntime(url, 'C', scope, { onEvent: recorder.onEvent, onRead: reads.onRead });
  const t0 = now();
  const committed = [];
  let seq = 0;
  const commit = async (tag) => {
    const subject = Math.floor(Math.random() * subjects), s = seq++;
    const started = now();
    const result = await transact(rt, commandOps({ subject, facts, seq: `${tag}${s}`, correction: false }, Date.now()), { commandId: `rp:${scope}:${s}` });
    committed.push({ position: result.position, subject, at: now() - t0, ackMs: now() - started, phase: tag });
    return result;
  };
  // Phase 1: grow the delta to the target with broker commits (16 closed-loop writers, group commit).
  const published = () => recorder.events.filter((e) => e.type === 'published');
  while ((published().at(-1)?.deltaTotal ?? 0) < target) {
    await Promise.all(Array.from({ length: 16 }, () => commit('fill')));
    if (committed.length % 320 === 0) await rt.broker.drain(600_000);
  }
  await rt.broker.drain(600_000);
  const deltaAtKill = published().at(-1)?.deltaTotal ?? null;
  // Phase 2: paced writer and readers, then kill -9 and restart.
  let stop = false;
  const writer = (async () => { let next = now(); while (!stop) { next += (-Math.log(1 - Math.random()) / cps) * 1000; const w = next - now(); if (w > 1) await sleep(w); if (!stop) await commit('live'); } })();
  const pulls = [];
  const readerLoops = Array.from({ length: readersN }, async () => {
    while (!stop) {
      const w = committed[Math.floor(Math.random() * committed.length)];
      const before = reads.routes.length, s = now();
      try {
        const rows = await pullAt(rt, w.subject, rt.broker.head());
        pulls.push({ at: s - t0, ms: now() - s, route: reads.routes.slice(before).map((r) => r.route).join(','), ok: rows.length > 0 });
      } catch (error) { pulls.push({ at: s - t0, ms: now() - s, route: 'error', ok: false, error: String(error).slice(0, 120) }); }
    }
  });
  await sleep(5_000);
  const env = { ...process.env, DOCKER_HOST: 'unix:///Users/sam/.colima/triplex2/docker.sock' };
  const container = `tx2-qlever-${slot}`;
  const tKill = now();
  execFileSync('docker', ['kill', '--signal', 'KILL', container], { env, stdio: 'pipe' });
  const headAtKill = rt.broker.head();
  execFileSync('node', [path.join(REPO, 'lab/bin/engine.mjs'), 'up', '--lane', 'qlever', '--slot', slot, '--holder', 'EXP-P2Q', '--exp', 'EXP-P2Q'], { env, stdio: 'pipe' });
  const tReady = now();
  const headAtReady = rt.broker.head();
  const caught = await rt.broker.waitPublished(headAtReady, 600_000);
  const tCaught = now();
  await sleep(5_000);
  stop = true;
  await writer; await Promise.all(readerLoops);
  await rt.broker.drain(600_000);
  // Every committed position present on the replica (one request, one snapshot).
  const graph = `<urn:triplex:scope:${Buffer.from(scope).toString('base64url')}>`;
  const present = new Set((await rt.client.query(`SELECT DISTINCT ?p WHERE { GRAPH ${graph} { ?s <urn:triplex:field:recorded_position> ?p } }`, { timeoutMs: 120_000 })).map((b) => Number(b.p.value)));
  const missing = committed.filter((c) => !present.has(c.position)).length;
  const regress = recorder.events.find((e) => e.type === 'replica-regressed');
  const replayed = published().filter((e) => regress && e.at >= regress.at && e.at <= tCaught);
  const during = (x) => x >= tKill - t0 && x <= tCaught - t0;
  const result = {
    arm: 'C', scope, slot, target, deltaAtKill, facts, cps, commandsCommitted: committed.length,
    killToReadyMs: round(tReady - tKill), readyToCaughtUpMs: round(tCaught - tReady), killToCaughtUpMs: round(tCaught - tKill), caughtUp: caught,
    regression: regress ? { fromPosition: regress.from, toPosition: regress.to, detectedAfterReadyMs: round(regress.at - tReady) } : null,
    replay: { updates: replayed.length, insertedTriples: replayed.reduce((a, e) => a + (e.inserted ?? 0), 0), updateMs: summary(replayed.map((e) => e.ms)) },
    missingPositions: missing, presentPositions: present.size, headAtKill, headAtReady,
    ackMsDuringOutage: summary(committed.filter((c) => c.phase === 'live' && during(c.at)).map((c) => c.ackMs)),
    ackMsLiveOutsideOutage: summary(committed.filter((c) => c.phase === 'live' && !during(c.at)).map((c) => c.ackMs)),
    readsDuringOutage: { n: pulls.filter((p) => during(p.at)).length, routes: tally(pulls.filter((p) => during(p.at)).map((p) => p.route)), ms: summary(pulls.filter((p) => during(p.at)).map((p) => p.ms)), failed: pulls.filter((p) => during(p.at) && !p.ok).length },
    applyErrors: recorder.events.filter((e) => e.type === 'apply-error').length, broker: rt.broker.stats(),
    raw: { committed, pulls, events: recorder.events },
  };
  await rt.close();
  return result;
};

// ------------------------------------------------------------------ crash (feed consumer, TARGETS 1.1 P3 items 5 and 6)

const crash = async () => {
  const variant = opt('variant'), crashes = Number(opt('crashes', 100)), commits = Number(opt('commits', 400));
  const keyed = variant.startsWith('keyed'), mode2 = variant.endsWith('atomic') ? 'atomic' : 'split';
  const scope = `p2q-crash-${variant}-${randomUUID()}`;
  const dir = path.join(BROKER_ROOT, scope.replace(/[^a-zA-Z0-9-]/g, '_'));
  const broker = await qlever.HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 3 * 1024 ** 3 });
  const adapter = qlever.makeQleverStorageAdapter(nullClient, scope, { broker });
  const { Layer, ManagedRuntime } = await import('effect');
  const { core } = await import('./lib.mjs');
  const layer = runtimeApi.Runtime.define({ name: 'p2q-crash', storage: Layer.succeed(runtimeApi.StorageAdapter, adapter), queries: Layer.succeed(runtimeApi.QueryExecutor, qlever.makeQleverQueryExecutor(nullClient, scope, { sourceView: adapter.sourceView })) })
    .layer({ scope: runtimeApi.DatabaseScope.test(scope), capabilities: runtimeApi.Capabilities.none });
  const managed = ManagedRuntime.make(layer);
  const triples = await managed.runPromise(Effect.gen(function* () { return yield* core.Triples; }));
  const committed = [];
  let next = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < commits) {
      const i = next++;
      const result = await managed.runPromise(triples.transact(commandOps({ subject: i % 40, facts: 5, seq: i, correction: false }, Date.now()), { commandId: `crash:${scope}:${i}` }));
      committed.push([result.position, `subj:${i % 40}`]);
    }
  }));
  await managed.dispose();
  const feed = new qlever.LogFeed(dir);
  const consumerDir = path.join(dir, 'consumer');
  const consumer = `crash-${variant}`;
  const points = ['before-effect', 'after-effect-before-checkpoint', 'after-checkpoint'];
  const injected = {};
  let injectedTotal = 0, restarts = 0, attempt = 0;
  const processed = [];
  // Each outer iteration is a fresh consumer "process": all state is rebuilt from its durable files.
  for (;;) {
    restarts++;
    const store = new qlever.FeedConsumerStore(consumerDir, consumer, mode2, keyed);
    let cursor = store.checkpoint() ?? feed.start();
    let crashed = false, drained = false;
    while (!crashed) {
      const page = feed.poll(cursor, { maxBytes: 1 });
      if (page.resolutions.length === 0) { drained = true; break; }
      const effects = [];
      for (const r of page.resolutions) if (r.kind === 'commit') for (const t of r.transacts) for (const s of t.subjects) effects.push({ position: t.position, subject: s });
      for (const e of effects) processed.push([e.position, e.subject]);
      const point = injectedTotal < crashes && effects.length > 0 ? points[attempt++ % 3] : null;
      const hit = () => { injected[point] = (injected[point] ?? 0) + 1; injectedTotal++; crashed = true; };
      if (point === 'before-effect') { hit(); break; }
      if (mode2 === 'atomic' && point === 'after-effect-before-checkpoint') { store.recordEffects(effects, page.cursor, { tear: true }); hit(); break; }
      store.recordEffects(effects, page.cursor);
      if (point === 'after-effect-before-checkpoint') { hit(); break; }
      store.writeCheckpoint(page.cursor);
      if (point === 'after-checkpoint') { hit(); break; }
      cursor = page.cursor;
    }
    // A crash leaves the descriptor open in a real process kill; here it is simply dropped.
    if (drained) { store.close(); break; }
  }
  const audit = auditEffects(consumerDir, consumer, committed, processed);
  await broker.close();
  const result = { arm: variant, variant, keyed, durability: mode2, scope, commits, injected, injectedTotal, restarts, ...audit, replayAttempts: audit.replayedEffects };
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
};

// ------------------------------------------------------------------ ackpath (no QLever: the candidate's ACK path alone)

const ackpath = async () => {
  const n = Number(opt('n', 400)), facts = Number(opt('facts', 10));
  const scope = `p2q-ackpath-${randomUUID()}`;
  const dir = path.join(BROKER_ROOT, scope);
  const broker = await qlever.HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 3 * 1024 ** 3, requireFullFsync: true });
  const adapter = qlever.makeQleverStorageAdapter(nullClient, scope, { broker });
  const { Layer, ManagedRuntime } = await import('effect');
  const { core } = await import('./lib.mjs');
  const layer = runtimeApi.Runtime.define({ name: 'p2q-ackpath', storage: Layer.succeed(runtimeApi.StorageAdapter, adapter), queries: Layer.succeed(runtimeApi.QueryExecutor, qlever.makeQleverQueryExecutor(nullClient, scope, { sourceView: adapter.sourceView })) })
    .layer({ scope: runtimeApi.DatabaseScope.test(scope), capabilities: runtimeApi.Capabilities.none });
  const managed = ManagedRuntime.make(layer);
  const triples = await managed.runPromise(Effect.gen(function* () { return yield* core.Triples; }));
  const lat = [], ryow = [];
  for (let i = 0; i < n; i++) {
    const subject = i % 997;
    const t0 = now();
    const result = await managed.runPromise(triples.transact(commandOps({ subject, facts, seq: `a${i}`, correction: false }, Date.now()), { commandId: `ack:${i}` }));
    lat.push(now() - t0);
    const rows = await managed.runPromise(adapter.getByEntity(`subj:${subject}`, { validAt: Date.now() + 1, recordedPosition: result.position }));
    ryow.push(sawCommand(rows, `a${i}`, facts));
  }
  const stats = broker.stats();
  await managed.dispose(); await broker.close();
  fs.rmSync(dir, { recursive: true, force: true });
  return { arm: 'C-noreplica', scope, n, facts, ackMs: summary(lat.slice(20)), ryowHits: ryow.filter(Boolean).length, fsyncCalibrationMs: stats.fsyncCalibrationMs, frames: stats.frames };
};

// ------------------------------------------------------------------ main

const modes = { probe, service, trace, fill, rebuild, replay, crash, ackpath };
if (!modes[mode]) throw new Error(`mode must be one of ${Object.keys(modes).join(', ')}`);
const started = new Date().toISOString();
const id0 = identity(url);
const result = await modes[mode]();
const { id, file } = writeReceipt(`${mode}-${result.arm ?? result.variant}`, {
  mode, slot, startedAt: started, identity: id0, hostLoadAfter: identity(url).host.loadavg, ...result,
});
const { raw, ...printable } = result;
console.log(JSON.stringify({ receipt: id, file: path.relative(process.cwd(), file), ...printable }, (k, v) => (k === 'gapSample' ? undefined : v)));
// A run whose harness lost samples (V-P2Q m6) still writes its receipt, but exits non-zero.
process.exit(result.failed ? 1 : 0);
