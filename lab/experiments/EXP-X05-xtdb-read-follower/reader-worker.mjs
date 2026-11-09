// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing; test doubles or mutable containers inferred from their initial shape. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-X05 reader worker: closed-loop pinned pulls against one node (follower or writer) for one window.
//
// [EXP-X05] Why worker threads: the writer runs on the main thread and its latency is the measurement;
// readers on the same event loop would delay its timers and responses and the delay would be blamed on
// the engine (R16 ran readers in 4 worker threads for the same reason). Each worker reports its event-loop
// utilisation so a saturated client is visible.
//
// Read shape (R16 1.2): one pull = 4 queries, `_id IN` batches of 1, 3, 9, 27 following r0..r2, 40 entities,
// inside one BEGIN READ ONLY WITH (AWAIT_TOKEN, SNAPSHOT_TOKEN, CLOCK_TIME) ... COMMIT (R19 1.4).
// Basis (TARGETS 2): 80% the latest receipt the main thread broadcast, 15% an earlier receipt of this run,
// 5% the seed basis. Roots (TARGETS 1.1 P1 item 1): 60% a subject acknowledged in the last 60 s, 40% uniform.
// Split reads (P1 item 2, RULINGS Q31b): 10% of pulls take a frozen-trace command not yet offered, read its
// subject at the latest basis, wait for that command's ACK, then read the whole pull again in a second
// transaction at the same basis. The driver adds no writes for them.
// Concurrency: logical readers share `conns` connections and at most `cap` transactions in flight per worker
// (R19 2.2: cap in-flight queries in the client near the node's cores; numThreads only bounds connections).
// Correctness is judged in the main thread after the window, at the driver-recorded basis (P1 item 4).
import { parentPort, workerData } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import { FAN, HOPS, Rng, absNow, beginAt, connect, rowConsistent, sid, sidx, sleep, txt } from './common.mjs';

const { worker, subjects, seed } = workerData;
const receipts = [];          // every receipt this run, in rid order
const hot = [];               // receipts acknowledged in the last 60 s
const waiters = new Map();    // `${win}|${seq}` -> resolve(receipt)
let level = null;
let goResolve = null;
let loopsLeft = 0;

class Semaphore {
  constructor(n) { this.n = n; this.q = []; }
  async acquire() { if (this.n > 0) { this.n--; return; } await new Promise(resolve => this.q.push(resolve)); }
  release() { const next = this.q.shift(); if (next) next(); else this.n++; }
}

const QUERY_TIMEOUT_MS = 30_000;
const inflight = new Map(); // query id -> { text, since }, reported to the main thread's watchdog
let queryIds = 0;
async function q(conn, text, params) {
  const query = params ? conn.unsafe(text, params) : conn.unsafe(text);
  // A query that loses the race to the timeout may still reject later; catch it so it cannot crash the worker.
  query.catch(() => {});
  const id = queryIds++;
  inflight.set(id, { text: text.slice(0, 60), since: absNow() });
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { query.cancel?.(); reject(Object.assign(new Error('client timeout'), { code: 'TIMEOUT' })); }, QUERY_TIMEOUT_MS); });
  try { return await Promise.race([query, timeout]); } finally { clearTimeout(timer); inflight.delete(id); }
}

/** One pull rooted at `root`; returns the (idx, pos) pairs it saw plus shape faults. */
async function pull(conn, root, basis, hops = HOPS) {
  await q(conn, beginAt(basis));
  const seen = [];
  const faults = { missing: 0, duplicate: 0, torn: 0 };
  let frontier = [root], queries = 0;
  try {
    for (let h = 0; h <= hops && frontier.length; h++) {
      const ids = [...new Set(frontier)];
      const rows = await q(conn, `SELECT * FROM ${level.table} WHERE _id IN (${ids.map((_, i) => '$' + (i + 1)).join(',')})`, ids.map(i => txt(conn, sid(i))));
      queries++;
      const got = new Map();
      for (const row of rows) {
        const i = sidx(row._id), pos = Number(row.pos);
        if (got.has(i)) faults.duplicate++;
        got.set(i, pos);
        if (!rowConsistent(row, i, pos)) faults.torn++;
        seen.push(i, pos);
      }
      for (const i of ids) if (!got.has(i)) faults.missing++;
      if (h === hops) break;
      const next = [];
      for (const row of rows) for (let k = 0; k < FAN; k++) next.push(sidx(row['r' + k]));
      frontier = next;
    }
    await q(conn, 'COMMIT');
  } catch (error) {
    try { await q(conn, 'ROLLBACK'); } catch {}
    throw error;
  }
  return { seen, faults, queries };
}

function basisFor(rng) {
  const u = rng.next();
  if (!receipts.length || u >= 0.95) return level.seedBasis;
  if (u < 0.8) return receipts.at(-1);
  return receipts[rng.int(receipts.length)];
}
function rootFor(rng) {
  const cutoff = absNow() - 60_000;
  while (hot.length && hot[0].ackAt < cutoff) hot.shift();
  return hot.length && rng.next() < 0.6 ? hot[rng.int(hot.length)].subj : rng.int(subjects);
}

async function runLevel(L) {
  level = L;
  const out = { worker, name: L.name, pulls: [], splits: [], pairs: [], errors: {}, faults: { missing: 0, duplicate: 0, torn: 0 }, faultSamples: [], queries: 0 };
  const conns = Array.from({ length: L.conns }, () => connect(L.url));
  const t0 = absNow();
  await Promise.all(conns.map(c => c.unsafe('SELECT 1')));
  out.connectMs = absNow() - t0;
  // Connections open before the clock starts: the main thread sends start and end once every worker is ready.
  const go = new Promise(resolve => { goResolve = resolve; });
  parentPort.postMessage({ type: 'ready', worker, name: L.name });
  Object.assign(L, await go);
  const free = [...conns], connWait = [];
  const getConn = async () => { if (free.length) return free.pop(); return new Promise(resolve => connWait.push(resolve)); };
  const putConn = c => { const next = connWait.shift(); if (next) next(c); else free.push(c); };
  const cap = new Semaphore(L.cap);
  let cursor = 0;
  const pickSplit = () => {
    const now = absNow();
    while (cursor < L.trace.length && L.start + L.trace[cursor].at <= now + 20) cursor++;
    if (cursor < L.trace.length && L.start + L.trace[cursor].at <= now + 500) return L.trace[cursor++];
    return null;
  };
  let groups = 0;
  const record = (pairs, rid, faults) => {
    groups++;
    out.pairs.push(rid, pairs.length / 2, ...pairs);
    for (const k of Object.keys(faults)) out.faults[k] += faults[k];
    if ((faults.missing || faults.duplicate || faults.torn) && out.faultSamples.length < 20) out.faultSamples.push({ rid, faults });
  };
  const fail = error => { const code = error.code ?? error.message?.slice(0, 60) ?? 'unknown'; out.errors[code] = (out.errors[code] ?? 0) + 1; };
  const tx = async (fn) => {
    await cap.acquire();
    const conn = await getConn();
    try { return await fn(conn); } finally { putConn(conn); cap.release(); }
  };
  const elu0 = performance.eventLoopUtilization();
  while (absNow() < L.start) await sleep(Math.min(50, L.start - absNow()));
  const readerLoop = async r => {
    const rng = new Rng(`${seed}|${L.name}|w${worker}|r${r}`);
    while (absNow() < L.end) {
      const split = rng.next() < L.splitShare ? pickSplit() : null;
      const t = absNow();
      try {
        if (split) {
          // Step 1 before the command's ACK, step 2 after it, both at one basis minted before its offer.
          const basis = receipts.length ? receipts.at(-1) : level.seedBasis;
          const ack = new Promise(resolve => waiters.set(`${L.name}|${split.seq}`, resolve));
          const one = await tx(conn => pull(conn, split.subj, basis, 0));
          const step1End = absNow();
          const receipt = await Promise.race([ack, sleep(15_000).then(() => null)]);
          waiters.delete(`${L.name}|${split.seq}`);
          const step2Start = absNow();
          const two = await tx(conn => pull(conn, split.subj, basis));
          record(one.seen, basis.rid, one.faults); record(two.seen, basis.rid, two.faults);
          out.queries += one.queries + two.queries;
          out.splits.push({ rid: basis.rid, seq: split.seq, subj: split.subj, s1: one.seen[1] ?? null, s2: two.seen[1] ?? null,
            ackPos: receipt?.pos ?? null, acked: !!receipt, straddled: !!receipt && step1End < receipt.ackAt && step2Start > receipt.ackAt });
        } else {
          const basis = basisFor(rng);
          const root = rootFor(rng);
          let queued = 0;
          const res = await tx(conn => { queued = absNow() - t; return pull(conn, root, basis); });
          record(res.seen, basis.rid, res.faults);
          out.queries += res.queries;
          // (latency from the reader's issue time including the client cap wait, cap wait, pairs group index)
          out.pulls.push(Math.round((absNow() - t) * 100) / 100, Math.round(queued * 100) / 100, groups - 1);
        }
      } catch (error) {
        fail(error);
        await sleep(20);
      }
    }
  };
  loopsLeft = L.readers;
  await Promise.all(Array.from({ length: L.readers }, (_, r) => readerLoop(r).finally(() => { loopsLeft--; })));
  out.elu = performance.eventLoopUtilization(elu0).utilization;
  await Promise.all(conns.map(c => c.end({ timeout: 5 }).catch(() => {})));
  level = null;
  out.pairs = Int32Array.from(out.pairs);
  parentPort.postMessage({ type: 'result', worker, result: out }, [out.pairs.buffer]);
}

parentPort.on('message', message => {
  if (message.type === 'receipt') {
    const r = message.r;
    receipts.push(r); hot.push(r);
    const resolve = waiters.get(`${r.win}|${r.seq}`);
    if (resolve) resolve(r);
  } else if (message.type === 'go') {
    goResolve?.({ start: message.start, end: message.end });
  } else if (message.type === 'level') {
    runLevel(message.level).catch(error => parentPort.postMessage({ type: 'error', worker, message: String(error.stack ?? error) }));
  } else if (message.type === 'status') {
    const now = absNow();
    parentPort.postMessage({ type: 'status', worker, state: { level: level?.name ?? null, loopsLeft, inflight: [...inflight.values()].map(v => ({ text: v.text, ageMs: Math.round(now - v.since) })) } });
  } else if (message.type === 'exit') process.exit(0);
});
// An async failure outside a reader's try (a postgres.js connection error event, say) must reach the main
// thread as a message, or the window waits for a result that never comes.
for (const event of ['unhandledRejection', 'uncaughtException'])
  process.on(event, error => parentPort.postMessage({ type: 'error', worker, message: `${event}: ${String(error?.stack ?? error)}` }));
parentPort.postMessage({ type: 'booted', worker });
