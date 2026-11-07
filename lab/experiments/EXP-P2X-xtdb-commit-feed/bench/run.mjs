#!/usr/bin/env node
// EXP-P2X driver. Modes (all write a receipt under ../receipts and raw samples under RAW_DIR):
//   service    --arm A0|C [--n 200] [--facts 10]                 closed loop, 1 writer: commit service time
//   contention --arm A0|A0q|C [--writers 16] [--per 40]          closed loop, distinct subjects, one scope
//   trace      --arm A0|C [--seed s] [--subjects 10000] [--window 300]   open-loop TARGETS 2.1 trace + feed consumer
//   preload    --arm C [--commits 100000] [--subjects 10000] [--concurrency 16] [--scope S]   history + feed audit
//   crash      --variant keyed-atomic|unkeyed-atomic|keyed-split|unkeyed-split [--crashes 100] [--commits 400]
// XTDB_URL must point at the held slot (lab/bin/engine.mjs up --lane xtdb --slot s1).
import { randomUUID } from 'node:crypto';
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';
import { Effect } from 'effect';
import { ARMS, armRuntime, commandOps, core, identity, now, percentiles, round, runtimeApi, summary, writeReceipt, xtdb } from './lib.mjs';
import { GENERATOR_SHA256, PARAMS, generateTrace, inBurst, traceDigest } from './trace.mjs';

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const url = process.env.XTDB_URL;
if (!url) throw new Error('XTDB_URL is required');
const slot = opt('slot', 's1');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const bandOf = (facts) => (facts <= 10 ? '5-10' : facts <= 25 ? '11-25' : '26-50');
const outcomeOf = (error) => {
  if (error instanceof runtimeApi.CommandAlreadyCommittedError || error?._tag === 'CommandAlreadyCommittedError') return 'duplicate';
  if (error?.reason === 'serialization-conflict' || error?._tag === 'TransactionConflictError') return 'conflict';
  if (error?.reason === 'outcome-unknown') return 'unknown';
  return `error:${error?._tag ?? error?.name ?? 'unknown'}`;
};
const transact = (rt, ops, meta) => rt.run(rt.triples.transact(ops, meta));
const tally = (items) => items.reduce((acc, k) => ((acc[k] = (acc[k] ?? 0) + 1), acc), {});

// ------------------------------------------------------------------ feed consumers

/** Candidate consumer: one source-log tailer, effects + checkpoint in one durable write. */
const candidateConsumer = async ({ scope, consumer, published, pollMs = 10 }) => {
  const client = xtdb.makeXtdbClient(url, { maxConnections: 2 });
  const feed = xtdb.makeXtdbCommitFeed(client, scope);
  let cursor = await feed.tip();
  let expected = null;
  const stats = { polls: 0, blockedPolls: 0, writes: 0, aborted: 0, missingPublication: 0, pollMs: [], writeMs: [] };
  const lags = [], processed = [];
  let stopping = false;
  const loop = (async () => {
    for (;;) {
      const t0 = now();
      const page = await feed.poll(cursor, { limit: 500 });
      stats.polls++; stats.pollMs.push(now() - t0);
      if (page.blocked) stats.blockedPolls++;
      if (page.resolutions.length > 0) {
        const w0 = now();
        await xtdb.recordFeedProgress(client, scope, consumer, page, expected);
        const t = now();
        stats.writes++; stats.writeMs.push(t - w0);
        expected = page.watermark;
        for (const r of page.resolutions) {
          if (r.status === 'aborted') { stats.aborted++; continue; }
          const pub = published.get(r.operationId);
          if (pub === undefined) stats.missingPublication++; else lags.push(t - pub);
          for (const tr of r.transacts) for (const subject of tr.subjects) processed.push([tr.position, subject]);
        }
      }
      cursor = page.watermark;
      if (stopping && page.resolutions.length === 0 && !page.blocked) break;
      if (page.resolutions.length === 0) await sleep(pollMs);
    }
  })();
  return {
    stop: async () => { stopping = true; await loop; await client.close(); return { lags, processed, stats, checkpoint: expected }; },
  };
};

/** A0 consumer: today's journal through the public API, same durable write as the candidate. */
const a0Consumer = async ({ scope, consumer, published, pollMs = 10 }) => {
  const reader = await armRuntime(url, 'A0', scope, { maxConnections: 2 });
  const client = xtdb.makeXtdbClient(url, { maxConnections: 2 });
  let after = await reader.run(reader.triples.currentPosition());
  let expected = null;
  const stats = { polls: 0, writes: 0, missingPublication: 0, pollMs: [], writeMs: [] };
  const lags = [], processed = [];
  let stopping = false;
  const loop = (async () => {
    for (;;) {
      const t0 = now();
      const page = await reader.run(reader.triples.transactions({ after, limit: 500 }));
      stats.polls++; stats.pollMs.push(now() - t0);
      const records = page.transactions;
      if (records.length > 0) {
        const effects = records.flatMap((r) => [...new Set(r.changes.map((c) => c.entityId))].map((subject) => ({ position: r.position, subject, msgId: r.position })));
        const next = { msgId: records.at(-1).position, processed: true };
        const w0 = now();
        await client.submit([
          ...xtdb.checkpointStatements(scope, consumer, expected, next).slice(0, 1),
          ...xtdb.effectStatements(scope, consumer, effects, { keyed: true }),
          ...xtdb.checkpointStatements(scope, consumer, expected, next).slice(1),
        ]);
        const t = now();
        stats.writes++; stats.writeMs.push(t - w0);
        expected = next; after = next.msgId;
        for (const r of records) {
          const pub = published.get(`pos:${r.position}`);
          if (pub === undefined) stats.missingPublication++; else lags.push(t - pub);
        }
        for (const e of effects) processed.push([e.position, e.subject]);
      }
      if (stopping && records.length === 0) break;
      if (records.length === 0) await sleep(pollMs);
    }
  })();
  return {
    stop: async () => { stopping = true; await loop; await reader.close(); await client.close(); return { lags, processed, stats, checkpoint: expected }; },
  };
};

/** Gaps, per-subject order and visible duplicates of a consumer against the driver's receipts. */
const auditFeed = async ({ scope, consumer, committed, processed }) => {
  const client = xtdb.makeXtdbClient(url, { maxConnections: 1 });
  try {
    const rows = await client.query('SELECT position, subject FROM tx_feed_effects FOR ALL VALID_TIME WHERE scope_key = ? AND consumer = ?', [scope, consumer]);
    const key = (p, s) => `${p}|${s}`;
    const durable = tally(rows.map((r) => key(Number(r.position), String(r.subject))));
    const expectedKeys = new Set(committed.map(([p, s]) => key(p, s)));
    const gaps = [...expectedKeys].filter((k) => durable[k] === undefined);
    const extras = Object.keys(durable).filter((k) => !expectedKeys.has(k));
    const duplicates = Object.values(durable).filter((n) => n > 1).length;
    const seen = tally(processed.map(([p, s]) => key(p, s)));
    const replays = Object.values(seen).filter((n) => n > 1).length;
    const last = new Map(); let orderViolations = 0;
    for (const [p, s] of processed) { if (last.has(s) && last.get(s) >= p) orderViolations++; last.set(s, p); }
    // Expected per-subject order from the receipts must equal what the consumer saw (minus replays).
    return { committedEffects: expectedKeys.size, durableEffects: rows.length, gaps: gaps.length, extras: extras.length, visibleDuplicates: duplicates, replayedEffects: replays, orderViolations, gapSample: gaps.slice(0, 5), extraSample: extras.slice(0, 5) };
  } finally { await client.close(); }
};

// ------------------------------------------------------------------ modes

const service = async () => {
  const arm = opt('arm'), n = Number(opt('n', 200)), facts = Number(opt('facts', 10));
  const scope = opt('scope', `p2x-service-${arm}-${randomUUID()}`);
  const rt = await armRuntime(url, arm, scope);
  const lat = [];
  const t0 = now();
  for (let i = 0; i < n; i++) {
    const s = now();
    await transact(rt, commandOps({ subject: i % 50, facts, seq: i, correction: false }, Date.now()), { commandId: `svc:${scope}:${i}` });
    lat.push(now() - s);
  }
  const elapsed = now() - t0;
  const result = { arm, scope, n, facts, serviceMs: summary(lat.slice(Math.min(20, n / 10))), warmupDropped: Math.min(20, n / 10), commitsPerS: round(n / (elapsed / 1000)), counts: rt.counts };
  await rt.close();
  return result;
};

const contention = async () => {
  const arm = opt('arm'), writers = Number(opt('writers', 16)), per = Number(opt('per', 40)), facts = Number(opt('facts', 10));
  const scope = `p2x-contention-${arm}-${randomUUID()}`;
  const rt = await armRuntime(url, arm, scope, { maxConnections: writers + 4 });
  const lat = [], outcomes = [];
  const t0 = now();
  await Promise.all(Array.from({ length: writers }, async (_v, w) => {
    for (let i = 0; i < per; i++) {
      const s = now();
      try {
        await transact(rt, commandOps({ subject: w, facts, seq: w * per + i, correction: false }, Date.now()), { commandId: `ctn:${scope}:${w}:${i}` });
        lat.push(now() - s); outcomes.push('committed');
      } catch (error) { outcomes.push(outcomeOf(error)); }
    }
  }));
  const elapsed = now() - t0;
  const result = {
    arm, scope, writers, per, facts, distinctSubjects: writers, outcomes: tally(outcomes),
    crossSubjectCasConflicts: rt.counts.casConflicts, counts: rt.counts,
    latencyMs: summary(lat), commitsPerS: round(lat.length / (elapsed / 1000)), elapsedS: round(elapsed / 1000),
  };
  await rt.close();
  return result;
};

const trace = async () => {
  const arm = opt('arm'), seed = opt('seed', 'p2x-a'), subjects = Number(opt('subjects', 10000)), windowS = Number(opt('window', 300));
  const scope = `p2x-trace-${arm}-${randomUUID()}`;
  const events = generateTrace({ seed, subjects, durationS: windowS });
  const rt = await armRuntime(url, arm, scope);
  const consumer = `p2x-consumer-${arm}`;
  const feed = await (arm === 'C' ? candidateConsumer : a0Consumer)({ scope, consumer, published: rt.published });
  const records = [];
  const originals = new Map();
  const startAt = now() + 1000;
  const inflight = new Set();
  const dispatch = (event) => {
    const offered = startAt + event.atMs;
    const p = (async () => {
      const started = now();
      const meta = { commandId: `p2x:${seed}:${event.seq}`, actor: event.kind };
      const record = { seq: event.seq, resend: event.resend, band: bandOf(event.facts), facts: event.facts, burst: event.burst, kind: event.kind, subject: event.subject, offered, started };
      try {
        const result = await transact(rt, commandOps(event, Date.now()), meta);
        record.position = result.position; record.txId = result.txId; record.outcome = 'committed';
        originals.set(event.seq, result.txId);
        if (event.ackLoss && !event.resend) {
          // The driver drops the receipt and retries with the same commandId; the ACK it can use is the retry's.
          try { await transact(rt, commandOps(event, Date.now()), meta); record.ackLossRetry = 'committed-twice'; }
          catch (error) { record.ackLossRetry = outcomeOf(error) === 'duplicate' && error.transactionId === result.txId ? 'original-receipt' : outcomeOf(error); }
        }
      } catch (error) {
        record.outcome = outcomeOf(error);
        if (record.outcome === 'duplicate') record.originalMatches = originals.has(event.seq) ? error.transactionId === originals.get(event.seq) : null;
        else record.error = String(error?.message ?? error).slice(0, 200);
      }
      record.acked = now();
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
  const drained = now();
  const consumed = await feed.stop();
  const committed = records.filter((r) => r.outcome === 'committed').map((r) => [r.position, `subj:${r.subject}`]);
  const audit = await auditFeed({ scope, consumer, committed, processed: consumed.processed });
  const originalsOnly = records.filter((r) => !r.resend);
  const latency = (rs) => rs.map((r) => r.acked - r.offered);
  const byBand = Object.fromEntries(['5-10', '11-25', '26-50'].map((band) => {
    const rs = originalsOnly.filter((r) => r.band === band && r.outcome === 'committed');
    return [band, { offerToAckMs: summary(latency(rs)), serviceMs: summary(rs.map((r) => r.acked - r.started)) }];
  }));
  const committedOriginals = originalsOnly.filter((r) => r.outcome === 'committed');
  const burstStart = startAt + PARAMS.firstBurstAtS * 1000, burstEnd = burstStart + PARAMS.burstDurationS * 1000;
  const result = {
    arm, scope, seed, subjects, windowS, generatorSha256: GENERATOR_SHA256, traceSha256: traceDigest(events),
    offered: { events: events.length, originals: originalsOnly.length, resends: events.length - originalsOnly.length, burstOriginals: originalsOnly.filter((r) => r.burst).length },
    accounting: { ...tally(records.map((r) => (r.resend ? `resend:${r.outcome}` : r.outcome))), unaccounted: events.length - records.length },
    ackLoss: tally(records.filter((r) => r.ackLossRetry).map((r) => r.ackLossRetry)),
    resendReceipts: tally(records.filter((r) => r.resend && r.outcome === 'duplicate').map((r) => String(r.originalMatches))),
    byBand,
    all: { offerToAckMs: summary(latency(committedOriginals)), serviceMs: summary(committedOriginals.map((r) => r.acked - r.started)) },
    steady: { offerToAckMs: summary(latency(committedOriginals.filter((r) => !r.burst))) },
    burst: { offerToAckMs: summary(latency(committedOriginals.filter((r) => r.burst))), committedInBurstWindow: committedOriginals.filter((r) => r.acked >= burstStart && r.acked < burstEnd).length },
    throughput: { committedPerS: round(committedOriginals.length / windowS, 2), drainAfterWindowS: round((drained - startAt) / 1000 - windowS, 1) },
    conflicts: { casConflicts: rt.counts.casConflicts, commandConflicts: rt.counts.commandConflicts, submits: rt.counts.submits },
    feed: { lagMs: summary(consumed.lags), ...audit, polls: consumed.stats.polls, writes: consumed.stats.writes, abortedListed: consumed.stats.aborted ?? 0, blockedPolls: consumed.stats.blockedPolls ?? 0, missingPublication: consumed.stats.missingPublication, pollMs: summary(consumed.stats.pollMs), writeMs: summary(consumed.stats.writeMs) },
    raw: { records, lags: consumed.lags },
  };
  await rt.close();
  return result;
};

const preload = async () => {
  const arm = opt('arm', 'C'), commits = Number(opt('commits', 100000)), subjects = Number(opt('subjects', 10000)), concurrency = Number(opt('concurrency', 16)), seed = opt('seed', 'p2x-preload');
  const scope = opt('scope', `p2x-preload-${arm}-${randomUUID()}`);
  // Sizes and subjects follow the trace distribution; arrival times are ignored (closed loop).
  const events = [];
  for (let k = 0; events.length < commits; k++) events.push(...generateTrace({ seed: `${seed}:${k}`, subjects, durationS: 600 }).filter((e) => !e.resend));
  events.length = commits;
  const rt = await armRuntime(url, arm, scope, { maxConnections: concurrency + 4 });
  const consumer = `p2x-preload-consumer-${arm}`;
  const feed = await (arm === 'C' ? candidateConsumer : a0Consumer)({ scope, consumer, published: rt.published });
  const committed = [], outcomes = [], lat = [];
  let next = 0;
  const t0 = now();
  let lastReport = t0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < events.length) {
      const event = events[next++];
      const s = now();
      try {
        const result = await transact(rt, commandOps({ ...event, seq: `${event.seq}-${next}` }, Date.now()), { commandId: `pre:${scope}:${next}` });
        committed.push([result.position, `subj:${event.subject}`]); lat.push(now() - s); outcomes.push('committed');
      } catch (error) { outcomes.push(outcomeOf(error)); }
      if (now() - lastReport > 30_000) { lastReport = now(); process.stderr.write(`[preload] ${committed.length}/${commits} ${round(committed.length / ((now() - t0) / 1000))}/s\n`); }
    }
  }));
  const elapsed = now() - t0;
  const consumed = await feed.stop();
  const audit = await auditFeed({ scope, consumer, committed, processed: consumed.processed });
  const result = {
    arm, scope, commits, subjects, concurrency, seed, generatorSha256: GENERATOR_SHA256, outcomes: tally(outcomes),
    commitsPerS: round(committed.length / (elapsed / 1000), 1), elapsedS: round(elapsed / 1000), latencyMs: summary(lat), counts: rt.counts,
    feed: { lagMs: summary(consumed.lags), ...audit, polls: consumed.stats.polls, writes: consumed.stats.writes, abortedListed: consumed.stats.aborted ?? 0, blockedPolls: consumed.stats.blockedPolls ?? 0, missingPublication: consumed.stats.missingPublication, pollMs: summary(consumed.stats.pollMs), writeMs: summary(consumed.stats.writeMs) },
    raw: { lags: consumed.lags },
  };
  await rt.close();
  return result;
};

// ------------------------------------------------------------------ crash injection (TARGETS 1.1 P3 items 5, 6)

const typedParams = (sql, params) => {
  let i = 0;
  return [sql.replace(/\?/g, () => `$${++i}`), params.map((v) => (typeof v === 'number' ? sql_.typed(v, 20) : typeof v === 'boolean' ? sql_.typed(v, 16) : sql_.typed(v, 25)))];
};
let sql_ = null;

const crash = async () => {
  const variant = opt('variant'), crashes = Number(opt('crashes', 100)), commits = Number(opt('commits', 400)), pageLimit = Number(opt('page', 3));
  const keyed = variant.startsWith('keyed'), atomic = variant.endsWith('atomic');
  const scope = `p2x-crash-${variant}-${randomUUID()}`;
  const consumer = `crash-${variant}`;
  const rt = await armRuntime(url, 'C', scope, { maxConnections: 12 });
  const feedClient = xtdb.makeXtdbClient(url, { maxConnections: 2 });
  const feed = xtdb.makeXtdbCommitFeed(feedClient, scope);
  const start = await feed.tip();
  const committed = [];
  let next = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < commits) {
      const i = next++;
      const result = await transact(rt, commandOps({ subject: i % 40, facts: 5, seq: i, correction: false }, Date.now()), { commandId: `crash:${scope}:${i}` });
      committed.push([result.position, `subj:${i % 40}`]);
    }
  }));
  const points = ['before-effect', 'after-effect-before-checkpoint', 'after-checkpoint'];
  const injected = tally([]);
  let injectedTotal = 0, restarts = 0;
  const processed = [];
  let attempt = 0;
  // One consumer "process" per loop iteration of the outer while: all in-memory state is rebuilt
  // from the durable checkpoint after every crash.
  for (;;) {
    restarts++;
    const durable = await xtdb.readFeedCheckpoint(feedClient, scope, consumer);
    let cursor = durable ?? start, expected = durable;
    let crashed = false, drained = false;
    while (!crashed) {
      const page = await feed.poll(cursor, { limit: pageLimit });
      if (page.resolutions.length === 0) { if (!page.blocked) { drained = true; break; } await sleep(5); continue; }
      const effects = xtdb.feedEffects(page);
      const point = injectedTotal < crashes ? points[attempt++ % 3] : null;
      const effectStatements = xtdb.effectStatements(scope, consumer, effects, { keyed, id: randomUUID });
      const [fence, checkpoint] = xtdb.checkpointStatements(scope, consumer, expected, page.watermark);
      for (const e of effects) processed.push([e.position, e.subject]);
      if (point === 'before-effect') { injected[point] = (injected[point] ?? 0) + 1; injectedTotal++; crashed = true; break; }
      if (atomic) {
        if (point === 'after-effect-before-checkpoint') {
          // Wire-level crash: the effect statements reach the engine inside an open transaction,
          // then the connection dies before the checkpoint statement and COMMIT.
          sql_ = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
          const conn = await sql_.reserve();
          await conn.unsafe('BEGIN READ WRITE');
          for (const s of [fence, ...effectStatements]) await conn.unsafe(...typedParams(s.sql, s.params ?? []));
          await sql_.end({ timeout: 0 });
          injected[point] = (injected[point] ?? 0) + 1; injectedTotal++; crashed = true; break;
        }
        await feedClient.submit([fence, ...effectStatements, checkpoint], { metadata: { triplex: 'p2x-consumer', scope, consumer } });
      } else {
        await feedClient.submit(effectStatements, { metadata: { triplex: 'p2x-consumer', scope, consumer } });
        if (point === 'after-effect-before-checkpoint') { injected[point] = (injected[point] ?? 0) + 1; injectedTotal++; crashed = true; break; }
        await feedClient.submit([fence, checkpoint], { metadata: { triplex: 'p2x-consumer', scope, consumer } });
      }
      if (point === 'after-checkpoint') { injected[point] = (injected[point] ?? 0) + 1; injectedTotal++; crashed = true; break; }
      expected = page.watermark; cursor = page.watermark;
    }
    if (drained) break;
  }
  const audit = await auditFeed({ scope, consumer, committed, processed });
  const result = { variant, keyed, atomic, scope, commits, pageLimit, injected, injectedTotal, restarts, ...audit, replayAttempts: audit.replayedEffects };
  await feedClient.close(); await rt.close();
  return result;
};

// ------------------------------------------------------------------ main

const modes = { service, contention, trace, preload, crash };
if (!modes[mode]) throw new Error(`mode must be one of ${Object.keys(modes).join(', ')}`);
const started = new Date().toISOString();
const id0 = identity();
const result = await modes[mode]();
const { id, file } = writeReceipt(`${mode}-${result.arm ?? result.variant}`, {
  mode, slot, endpoint: url.replace(/\/\/[^@]*@/, '//'), startedAt: started, identity: id0, hostLoadAfter: identity().host.loadavg, ...result,
});
const { raw, ...printable } = result;
console.log(JSON.stringify({ receipt: id, file, ...printable }, (k, v) => (k === 'gapSample' || k === 'extraSample' ? undefined : v)));
process.exit(0);
