#!/usr/bin/env node
// EXP-X05 driver: does a read-only follower on the writer's volume keep the writer's commit latency flat?
//
//   TX2_CONFIG_DIR=<worktree> node lab/experiments/EXP-X05-xtdb-read-follower/driver.mjs
//     [--slot s2] [--smoke] [--rate 40] [--level-s 60] [--levels 4,16,64,256] [--cap 16] [--subjects 100000]
//     [--phases ladder,e5,conn,burst] [--seed x05-v1]
//
// North star P1 (TARGETS 1.1 P1): writer commit p50/p99 with readers on the follower against the zero-reader
// run on the same trace segment, read goodput and p99, zero correctness violations at the driver-recorded basis.
// Measures R19 E1 (writer latency per reader level, follower versus single node; ack-to-visible lag; a 20-60 KB
// commit burst with a forced block cut), E5 (both tokens exact, snapshot-only fails fast, no token is stale)
// and E4/E9 (numThreads 300 at 256 connections, follower and per-connection RSS).
//
// Window plan (each window replays one frozen trace segment; TARGETS 1.1 P1 item 5, matched phase):
//   Z0, F4, S4, F16, S16, Z1, F64, S64, F256, S256, Z2, then E5, CONN, BURST, RECOVER.
//   Z = zero readers; F = readers on the follower; S = the same readers on the writer (single node).
//   Interleaving F and S at each level and repeating Z puts host-load drift into the comparison, not between it.
//   After each window the writer drains its queue before the next one, so a slow window cannot leak into the next.
//   Every window starts with a forced block cut on the writer at +1 s (BURST at +20 s): TARGETS 1.1 P1 item 3 wants a
//   maintenance event in every window, and cutting at a matched offset keeps natural cuts (102,400 rows, R19 1.5)
//   out of the windows, so block-cut stalls fall at the same phase in every window.
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { Worker } from 'node:worker_threads';
import { effectiveConfig, followerInfo } from '../../bin/engine.mjs';
import { REPO, dockerArgs, inspect, loadSlots, parseArgs, readOwner, sha256, sha256File, slotInfo, sourceIdentity } from '../../bin/lib.mjs';
import {
  N_DEFAULT, Oracle, POSTGRES_ENTRY, REFS, absNow, beginAt, connect, encodeSnapshotToken, decodeSnapshotToken, i8, intVal, microsIso, parseMicros,
  ref, sid, sleep, strVal, summary, traceDigest, traceSegment, txt,
} from './common.mjs';

const HERE = import.meta.dirname;
const { options } = parseArgs(process.argv.slice(2));
const smoke = !!options.smoke;
const P = {
  slot: options.slot ?? 's2',
  smoke,
  subjects: Number(options.subjects ?? (smoke ? 2000 : N_DEFAULT)),
  active: Number(options.active ?? (smoke ? 200 : 2000)),
  rate: Number(options.rate ?? 40),
  levelS: Number(options['level-s'] ?? (smoke ? 8 : 60)),
  levels: String(options.levels ?? (smoke ? '4,64' : '4,16,64,256')).split(',').map(Number),
  cap: Number(options.cap ?? 16),
  threads: Number(options.threads ?? 4),
  writerConns: 4,
  singleMaxConns: 32,
  splitShare: 0.1,
  lagEveryMs: 500,
  e5S: Number(options['e5-s'] ?? (smoke ? 8 : 120)),
  burstS: Number(options['burst-s'] ?? (smoke ? 8 : 60)),
  burstX: Number(options['burst-x'] ?? 5),
  burstConns: 8,
  recoverS: Number(options['recover-s'] ?? (smoke ? 6 : 30)),
  warmS: Number(options['warm-s'] ?? (smoke ? 3 : 15)),
  connRss: Number(options['conn-rss'] ?? 256),
  phases: String(options.phases ?? 'ladder,e5,conn,burst').split(','),
  seed: options.seed ?? 'x05-v1',
  drainMaxMs: 180_000,
};

// ---------------------------------------------------------------- identity and output

const config = loadSlots();
const writerInfo = slotInfo(config, 'xtdb', P.slot);
const folInfo = followerInfo(config, writerInfo);
const W_URL = writerInfo.endpoint, F_URL = folInfo.endpoint;
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const runId = `X05-${P.slot}-${stamp}-${randomBytes(3).toString('hex')}${smoke ? '-smoke' : ''}`;
const rawDir = path.join(REPO, 'runs/X05', runId);
const receiptPath = path.join(REPO, 'lab/runs/X05', `${runId}.json`);
const durableDir = path.join(os.homedir(), 'Claude/Projects/triplex-db-2/X05', runId);
fs.mkdirSync(rawDir, { recursive: true });
const tag = randomBytes(3).toString('hex');
// A table set per run, so a rerun on the same volume never meets an earlier run's positions.
const T = { ent: `x5${tag}_ent`, claim: `x5${tag}_claim`, ledger: `x5${tag}_ledger`, feed: `x5${tag}_feed` };
const logLines = [];
const log = line => { const text = `[x05 ${new Date().toISOString().slice(11, 19)}] ${line}`; logLines.push(text); process.stderr.write(text + '\n'); };
const save = (name, value) => fs.writeFileSync(path.join(rawDir, name), JSON.stringify(value, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n');
const dockerAsync = (args, timeout = 30_000) => new Promise(resolve => execFile('docker', dockerArgs(args), { timeout, maxBuffer: 256 << 20 },
  (error, stdout, stderr) => resolve({ ok: !error, code: error?.code ?? 0, stdout: String(stdout), stderr: String(stderr) })));

function containerIdentity(info, eff) {
  const c = inspect(info.container);
  if (!c) return { container: info.container, missing: true };
  return {
    container: info.container, containerId: c.Id, startedAt: c.State.StartedAt, running: c.State.Running, health: c.State.Health?.Status ?? null,
    imageId: c.Image, pinnedImageId: info.laneConf.imageId, configSha256Label: c.Config.Labels?.['tx2.config-sha256'] ?? null, effectiveConfigSha256: eff.sha256,
    effectiveConfig: eff.effective, configFileSha256: sha256File(eff.files.config), memCapBytes: c.HostConfig.Memory, nanoCpus: c.HostConfig.NanoCpus,
    cpusetCpus: c.HostConfig.CpusetCpus || null, mounts: c.Mounts.map(m => ({ source: m.Name ?? m.Source, destination: m.Destination, rw: m.RW })),
    endpoint: info.endpoint, holder: c.Config.Labels?.['tx2.holder'] ?? null,
  };
}
function engines() {
  const writerC = inspect(writerInfo.container);
  const wEff = effectiveConfig(config, { ...writerInfo, cpusetCpus: writerC?.HostConfig.CpusetCpus || null });
  const folC = inspect(folInfo.container);
  const fEff = effectiveConfig(config, { ...folInfo, cpusetCpus: folC?.HostConfig.CpusetCpus || null });
  return { writer: containerIdentity(writerInfo, wEff), follower: containerIdentity(folInfo, fEff), volume: writerInfo.volume, slotOwner: readOwner(writerInfo) };
}

// ---------------------------------------------------------------- writer (open loop, serial per subject)

const oracle = new Oracle();
const receipts = [];        // rid -> receipt
let seedBasis = null;
let lastMicros = 0n;
let phase = 'setup';

class Writer {
  constructor(url, n) { this.url = url; this.conns = []; this.free = []; this.queue = []; this.busy = new Set(); this.pos = new Map(); this.inflight = 0; this.records = new Map(); this.maxQueue = 0; this.ensure(n); this.onAck = []; this.onReceipt = []; }
  ensure(n) { while (this.conns.length < n) { const c = connect(this.url); this.conns.push(c); this.free.push(c); } }
  offer(job) { this.queue.push(job); this.maxQueue = Math.max(this.maxQueue, this.queue.length); this.dispatch(); }
  dispatch() {
    while (this.free.length && this.queue.length) {
      const idx = this.queue.findIndex(job => !this.busy.has(job.subj));
      if (idx < 0) return;
      const [job] = this.queue.splice(idx, 1);
      const conn = this.free.pop();
      this.busy.add(job.subj); this.inflight++;
      this.run(conn, job).finally(() => { this.busy.delete(job.subj); this.inflight--; this.free.push(conn); this.dispatch(); });
    }
  }
  async drain(maxMs) {
    const t0 = absNow();
    while ((this.queue.length || this.inflight) && absNow() - t0 < maxMs) await sleep(10);
    return { ms: Math.round(absNow() - t0), leftQueued: this.queue.length, leftInflight: this.inflight };
  }
  async run(conn, job) {
    const expected = this.pos.get(job.subj) ?? 0, newPos = expected + 1, id = sid(job.subj), cmd = `${tag}-${job.win}-${job.seq}`;
    const rec = { seq: job.seq, facts: job.facts, sched: job.sched, start: absNow(), ack: null, ok: false, code: null };
    (this.records.get(job.win) ?? this.records.set(job.win, []).get(job.win)).push(rec);
    let stage = 'pre';
    try {
      // R16 0.3's command: 8 statements, CAS on pos, claim row for idempotency, ledger facts, feed row.
      await conn.unsafe(`BEGIN READ WRITE WITH (METADATA = {cmd: '${cmd}', subj: '${id}', pos: ${newPos}})`);
      await conn.unsafe(`ASSERT NOT EXISTS (SELECT 1 FROM ${T.claim} WHERE _id = $1), 'dup'`, [txt(conn, cmd)]);
      await conn.unsafe(`ASSERT (SELECT COALESCE(MAX(pos), 0) FROM ${T.ent} WHERE _id = $1) = $2, 'cas'`, [txt(conn, id), i8(conn, expected)]);
      const sets = [], ps = [txt(conn, id)];
      for (let c = 0; c < 8; c++) { sets.push(`a${c} = $${ps.length + 1}`); ps.push(i8(conn, intVal(job.subj, newPos, c))); }
      for (let c = 8; c < 16; c++) { sets.push(`a${c} = $${ps.length + 1}`); ps.push(txt(conn, strVal(job.subj, newPos, c))); }
      sets.push(`pos = $${ps.length + 1}`); ps.push(i8(conn, newPos));
      await conn.unsafe(`UPDATE ${T.ent} SET ${sets.join(', ')} WHERE _id = $1`, ps);
      await conn.unsafe(`INSERT INTO ${T.claim} (_id, subj, pos) VALUES ($1, $2, $3)`, [txt(conn, cmd), txt(conn, id), i8(conn, newPos)]);
      const padding = job.padBytes ? 'x'.repeat(job.padBytes) : '';
      const lp = [], rows = [];
      for (let k = 0; k < job.facts; k++) {
        const b = lp.length;
        rows.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`);
        lp.push(txt(conn, `${cmd}|${k}`), txt(conn, cmd), txt(conn, id), txt(conn, 'a' + (k % 16)), txt(conn, `v${newPos}-${k}${padding}`), i8(conn, newPos));
      }
      await conn.unsafe(`INSERT INTO ${T.ledger} (_id, cmd, subj, attr, val, pos) VALUES ${rows.join(', ')}`, lp);
      const changes = JSON.stringify(Array.from({ length: Math.min(job.facts, 16) }, (_, k) => ({ attr: 'a' + k })));
      await conn.unsafe(`INSERT INTO ${T.feed} (_id, subj, pos, changes) VALUES ($1, $2, $3, $4)`, [txt(conn, cmd), txt(conn, id), i8(conn, newPos), txt(conn, changes)]);
      stage = 'commit';
      await conn.unsafe('COMMIT SYNC');
      rec.ack = absNow();
      stage = 'receipt';
      for (const hook of this.onAck) hook(job, newPos, rec.ack);
      // The receipt: this commit's system time and the connection's await token, in one round trip after the
      // ACK (not inside the measured commit latency; it holds the connection about one round trip).
      const [r] = await conn.unsafe('SHOW LATEST_SUBMITTED_TX');
      if (r.committed === false) throw Object.assign(new Error(`commit reported not committed: ${JSON.stringify(r.error)}`), { code: 'NOT_COMMITTED' });
      const micros = parseMicros(r.system_time);
      this.pos.set(job.subj, newPos);
      oracle.add(job.subj, newPos, micros);
      if (micros > lastMicros) lastMicros = micros;
      const receipt = { rid: receipts.length, win: job.win, seq: job.seq, subj: job.subj, pos: newPos, txId: Number(r.tx_id), t: micros.toString(),
        snapshotToken: encodeSnapshotToken(micros), awaitToken: r.await_token, clock: microsIso(micros), ackAt: rec.ack };
      receipts.push(receipt);
      rec.ok = true;
      for (const hook of this.onReceipt) hook(receipt);
    } catch (error) {
      rec.code = error.code ?? error.message?.slice(0, 80);
      rec.stage = stage;
      if (stage === 'pre') { try { await conn.unsafe('ROLLBACK'); } catch {} }
      // A typed server error at COMMIT is a known abort; anything else at or after COMMIT leaves the outcome or
      // its system time unknown, so the oracle stops judging that subject from just before the latest receipt.
      const typed = typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code);
      if (stage === 'receipt') this.pos.set(job.subj, newPos);
      if ((stage === 'commit' && !typed) || stage === 'receipt') oracle.markUncertain(job.subj, lastMicros - 1_000_000n);
    }
  }
}

// ---------------------------------------------------------------- reader workers

const workers = Array.from({ length: P.threads }, (_, w) => new Worker(path.join(HERE, 'reader-worker.mjs'), { workerData: { worker: w, subjects: P.subjects, seed: P.seed } }));
const workerWaiters = new Map(); // `${type}|${worker}` -> resolve
for (const w of workers) w.on('message', m => {
  if (m.type === 'error') { log(`worker ${m.worker} error: ${m.message}`); }
  const resolve = workerWaiters.get(`${m.type}|${m.worker}`);
  if (resolve) { workerWaiters.delete(`${m.type}|${m.worker}`); resolve(m); }
});
const waitWorker = (type, w) => new Promise(resolve => workerWaiters.set(`${type}|${w}`, resolve));
await Promise.all(workers.map((_, w) => waitWorker('booted', w)));
const broadcast = r => { for (const w of workers) w.postMessage({ type: 'receipt', r }); };

// ---------------------------------------------------------------- probes

/** Ack-to-visible lag (R19 E1): after an ACK, read the committed row with both tokens; time from ACK to the answer. */
class LagProbe {
  constructor(url, node) { this.node = node; this.conn = connect(url); this.busy = false; this.rows = []; }
  async probe(r, win) {
    if (this.busy) return;
    this.busy = true;
    const issued = absNow();
    try {
      await this.conn.unsafe(beginAt(r));
      const rows = await this.conn.unsafe(`SELECT pos FROM ${T.ent} WHERE _id = $1`, [txt(this.conn, sid(r.subj))]);
      await this.conn.unsafe('COMMIT');
      this.rows.push({ win, rid: r.rid, ms: absNow() - r.ackAt, issueMs: issued - r.ackAt, ok: Number(rows[0]?.pos) === r.pos, pos: Number(rows[0]?.pos) });
    } catch (error) {
      try { await this.conn.unsafe('ROLLBACK'); } catch {}
      this.rows.push({ win, rid: r.rid, ms: absNow() - r.ackAt, error: error.code ?? error.message?.slice(0, 80) });
    } finally { this.busy = false; }
  }
}

/**
 * R19 E5 on the follower, after every ACK: (a) AWAIT_TOKEN + SNAPSHOT_TOKEN + CLOCK_TIME, (b) SNAPSHOT_TOKEN and
 * CLOCK_TIME only, (c) no token. (c) goes out at the ACK; (a) and (b) need the receipt's system time, so they go
 * out one round trip later. A busy pool skips that read and counts the skip.
 */
class E5 {
  constructor(url) { this.pools = Object.fromEntries(['a', 'b', 'c'].map(mode => [mode, Array.from({ length: 4 }, () => connect(url))])); this.rows = []; this.skipped = { a: 0, b: 0, c: 0 }; }
  async run(mode, fn) {
    const conn = this.pools[mode].pop();
    if (!conn) { this.skipped[mode]++; return; }
    try { await fn(conn); } finally { this.pools[mode].push(conn); }
  }
  onAck(job, pos, ackAt) {
    this.run('c', async conn => {
      const issued = absNow();
      try {
        const rows = await conn.unsafe(`SELECT pos FROM ${T.ent} WHERE _id = $1`, [txt(conn, sid(job.subj))]);
        this.rows.push({ mode: 'c', issueMs: issued - ackAt, ms: absNow() - issued, want: pos, got: Number(rows[0]?.pos) });
      } catch (error) { this.rows.push({ mode: 'c', issueMs: issued - ackAt, error: error.code ?? error.message }); }
    });
  }
  onReceipt(r) {
    this.run('a', async conn => {
      const issued = absNow();
      try {
        await conn.unsafe(beginAt(r));
        const rows = await conn.unsafe(`SELECT pos FROM ${T.ent} WHERE _id = $1`, [txt(conn, sid(r.subj))]);
        await conn.unsafe('COMMIT');
        this.rows.push({ mode: 'a', issueMs: issued - r.ackAt, ms: absNow() - issued, want: r.pos, got: Number(rows[0]?.pos) });
      } catch (error) { try { await conn.unsafe('ROLLBACK'); } catch {} this.rows.push({ mode: 'a', issueMs: issued - r.ackAt, error: error.code ?? error.message }); }
    });
    this.run('b', async conn => {
      const issued = absNow();
      try {
        const rows = await conn.unsafe(`SETTING SNAPSHOT_TOKEN = '${r.snapshotToken}', CLOCK_TIME = TIMESTAMP '${r.clock}' SELECT pos FROM ${T.ent} WHERE _id = $1`, [txt(conn, sid(r.subj))]);
        this.rows.push({ mode: 'b', issueMs: issued - r.ackAt, ms: absNow() - issued, want: r.pos, got: Number(rows[0]?.pos) });
      } catch (error) { this.rows.push({ mode: 'b', issueMs: issued - r.ackAt, ms: absNow() - issued, error: error.code ?? error.message }); }
    });
  }
  async close() { await Promise.all(Object.values(this.pools).flat().map(c => c.end({ timeout: 5 }).catch(() => {}))); }
  summarize() {
    const out = {};
    for (const mode of ['a', 'b', 'c']) {
      const rows = this.rows.filter(r => r.mode === mode);
      const ok = rows.filter(r => !r.error);
      const within5 = rows.filter(r => r.issueMs <= 5);
      const byError = {};
      for (const r of rows.filter(x => x.error)) byError[r.error] = (byError[r.error] ?? 0) + 1;
      out[mode] = {
        reads: rows.length, skipped: this.skipped[mode], errors: byError, exact: ok.filter(r => r.got === r.want).length,
        stale: ok.filter(r => r.got < r.want).length, ahead: ok.filter(r => r.got > r.want).length, issueMs: summary(rows.map(r => r.issueMs)), ms: summary(ok.map(r => r.ms)),
        within5ms: { reads: within5.length, fail0B000: within5.filter(r => r.error === '0B000').length, stale: within5.filter(r => !r.error && r.got < r.want).length },
      };
    }
    return out;
  }
}

/** docker stats for both containers every 3 s, tagged by window; async so the writer loop never blocks. */
class Sampler {
  constructor() { this.rows = []; this.win = null; this.timer = null; this.busy = false; }
  start(win) {
    this.win = win;
    this.timer = setInterval(async () => {
      if (this.busy) return;
      this.busy = true;
      const res = await dockerAsync(['stats', '--no-stream', '--format', '{{json .}}', writerInfo.container, folInfo.container], 15_000);
      this.busy = false;
      if (!res.ok) return;
      for (const line of res.stdout.split('\n').filter(Boolean)) {
        const row = JSON.parse(line);
        this.rows.push({ win, at: absNow(), name: row.Name, cpu: Number.parseFloat(row.CPUPerc), mem: parseBytes(row.MemUsage.split('/')[0]) });
      }
    }, 3000);
  }
  stop() { clearInterval(this.timer); this.timer = null; }
  of(win, name) {
    const rows = this.rows.filter(r => r.win === win && r.name === name);
    return rows.length ? { samples: rows.length, cpuMean: Math.round(rows.reduce((a, r) => a + r.cpu, 0) / rows.length), cpuMax: Math.round(Math.max(...rows.map(r => r.cpu))), memPeakMiB: Math.round(Math.max(...rows.map(r => r.mem)) / 2 ** 20) } : null;
  }
}
const parseBytes = text => {
  const m = /^([\d.]+)\s*([KMGT]?i?B)/.exec(String(text).trim());
  return m ? Number(m[1]) * ({ B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, kB: 1e3, MB: 1e6, GB: 1e9 }[m[2]] ?? 1) : null;
};
const finishBlock = async () => {
  const t = absNow();
  const res = await dockerAsync(['exec', writerInfo.container, 'wget', '-qO-', '--post-data=', 'http://127.0.0.1:8080/system/finish-block']);
  return { at: t, ms: Math.round(absNow() - t), ok: res.ok, out: (res.stdout + res.stderr).trim().slice(0, 200) };
};
async function watermarks() {
  const one = async url => {
    const c = connect(url);
    try { return (await c.unsafe('SHOW LATEST_COMPLETED_TXS')).map(r => ({ db: r.db_name, part: r.part, txId: Number(r.tx_id), systemTime: r.system_time })); }
    catch (error) { return { error: error.code ?? error.message }; }
    finally { await c.end({ timeout: 5 }).catch(() => {}); }
  };
  return { writer: await one(W_URL), follower: await one(F_URL) };
}

// ---------------------------------------------------------------- windows

const writer = new Writer(W_URL, P.writerConns);
const lagF = new LagProbe(F_URL, 'follower'), lagW = new LagProbe(W_URL, 'writer');
let lastLag = 0, currentWin = null;
writer.onReceipt.push(r => {
  broadcast(r);
  if (currentWin && absNow() - lastLag >= P.lagEveryMs) { lastLag = absNow(); lagF.probe(r, currentWin); lagW.probe(r, currentWin); }
});
const sampler = new Sampler();
const loopDelay = monitorEventLoopDelay({ resolution: 5 });
const results = [];

function assign(readers, mode) {
  // Logical readers spread over the workers; the follower gets one connection per reader (numThreads 300),
  // the single node at most 32 (its numThreads is the default 42 and the writer needs its own); the in-flight
  // cap is the same in both modes, so the engine sees the same concurrency and only idle connections differ.
  return workers.map((_, w) => {
    const r = Math.floor(readers / P.threads) + (w < readers % P.threads ? 1 : 0);
    return { w, readers: r, conns: mode === 'follower' ? r : Math.min(r, Math.floor(P.singleMaxConns / P.threads)), cap: Math.max(1, Math.floor(P.cap / P.threads)) };
  }).filter(a => a.readers > 0);
}

async function runWindow({ name, mode = 'zero', readers = 0, trace, seconds, cutAtMs = 1000, kind = 'ladder' }) {
  const plan = readers ? assign(readers, mode) : [];
  const url = mode === 'follower' ? F_URL : W_URL;
  const level = { name, mode, url, table: T.ent, splitShare: P.splitShare, seedBasis, trace: trace.map(c => ({ seq: c.seq, at: c.at, subj: c.subj })) };
  const readyAll = Promise.all(plan.map(a => waitWorker('ready', a.w)));
  for (const a of plan) workers[a.w].postMessage({ type: 'level', level: { ...level, readers: a.readers, conns: a.conns, cap: a.cap } });
  const ready = await readyAll;
  const resultsP = Promise.all(plan.map(a => waitWorker('result', a.w)));
  const start = absNow() + 1000, end = start + seconds * 1000;
  for (const a of plan) workers[a.w].postMessage({ type: 'go', start, end });
  currentWin = name; phase = kind;
  writer.maxQueue = 0;
  sampler.start(name);
  loopDelay.reset(); loopDelay.enable();
  const cut = sleep(start + cutAtMs - absNow()).then(finishBlock);
  for (const c of trace) {
    const sched = start + c.at, wait = sched - absNow();
    if (wait > 1) await sleep(wait);
    writer.offer({ ...c, win: name, sched });
  }
  await sleep(Math.max(0, end - absNow()));
  const offerEnd = absNow();
  const readerResults = (await resultsP).map(m => m.result);
  const drain = await writer.drain(P.drainMaxMs);
  loopDelay.disable();
  sampler.stop();
  currentWin = null;
  const blockCut = await cut;
  const res = summarizeWindow({ name, mode, readers, kind, trace, seconds, start, end, offerEnd, drain, blockCut, readerResults, connectMs: ready.length ? Math.max(...readerResults.map(r => r.connectMs)) : null });
  results.push(res);
  save(`window-${name}.json`, res);
  log(`${name}: commits ${res.writer.committed}/${res.writer.offered} lat p50 ${res.writer.lat.p50} p99 ${res.writer.lat.p99} svc p50 ${res.writer.svc.p50} p99 ${res.writer.svc.p99}`
    + (readers ? ` | pulls/s ${res.reads.pullsPerS} p99 ${res.reads.pull.p99} viol ${res.reads.violations} err ${JSON.stringify(res.reads.errors)}` : '')
    + ` | lagF p50 ${res.lag.follower.p50} p99 ${res.lag.follower.p99} | wCPU ${res.stats.writer?.cpuMean} fCPU ${res.stats.follower?.cpuMean}`);
  await sleep(3000);
  return res;
}

function summarizeWindow({ name, mode, readers, kind, trace, seconds, start, end, offerEnd, drain, blockCut, readerResults, connectMs }) {
  const recs = writer.records.get(name) ?? [];
  const ok = recs.filter(r => r.ok || r.stage === 'receipt');
  const errors = {};
  for (const r of recs.filter(x => !x.ok)) errors[`${r.stage}:${r.code}`] = (errors[`${r.stage}:${r.code}`] ?? 0) + 1;
  const band = f => (f <= 10 ? '5-10' : f <= 25 ? '11-25' : '26-50');
  const byBand = {};
  for (const b of ['5-10', '11-25', '26-50']) { const rs = ok.filter(r => band(r.facts) === b && r.ack); byBand[b] = { n: rs.length, lat: summary(rs.map(r => r.ack - r.sched)).p99, svcP50: summary(rs.map(r => r.ack - r.start)).p50 }; }
  const acked = ok.filter(r => r.ack);
  const writerStats = {
    offered: recs.length, scheduled: trace.length, committed: acked.length, errors, maxQueue: writer.maxQueue, drain,
    lat: summary(acked.map(r => r.ack - r.sched)), svc: summary(acked.map(r => r.ack - r.start)), byBand,
    waitsOver2s: acked.filter(r => r.ack - r.sched > 2000).length, lateRaw: { latMs: acked.map(r => Math.round((r.ack - r.sched) * 100) / 100), svcMs: acked.map(r => Math.round((r.ack - r.start) * 100) / 100) },
  };
  // Reads: correctness at the driver-recorded basis, every returned row.
  let checked = 0, violations = 0, uncertain = 0;
  const violationSamples = [], badGroups = [];
  const faults = { missing: 0, duplicate: 0, torn: 0 };
  const errorsR = {};
  let pullsAll = [], queueAll = [], splits = [], queries = 0, goodPulls = 0;
  for (const rr of readerResults) {
    const pairs = rr.pairs, groupBad = [];
    for (let i = 0; i < pairs.length;) {
      const rid = pairs[i], n = pairs[i + 1];
      const T0 = rid >= 0 ? BigInt(receipts[rid].t) : BigInt(seedBasis.t);
      let bad = false;
      for (let k = 0; k < n; k++) {
        const idx = pairs[i + 2 + 2 * k], pos = pairs[i + 3 + 2 * k];
        const want = oracle.expected(idx, T0);
        if (want === null) { uncertain++; continue; }
        checked++;
        if (want !== pos) { violations++; bad = true; if (violationSamples.length < 20) violationSamples.push({ worker: rr.worker, rid, subject: idx, got: pos, want, basis: T0.toString() }); }
      }
      groupBad.push(bad);
      i += 2 + 2 * n;
    }
    for (const k of Object.keys(faults)) faults[k] += rr.faults[k];
    for (const [k, v] of Object.entries(rr.errors)) errorsR[k] = (errorsR[k] ?? 0) + v;
    for (let i = 0; i < rr.pulls.length; i += 3) { pullsAll.push(rr.pulls[i]); queueAll.push(rr.pulls[i + 1]); if (!groupBad[rr.pulls[i + 2]]) goodPulls++; }
    splits = splits.concat(rr.splits);
    queries += rr.queries;
    badGroups.push(groupBad.filter(Boolean).length);
  }
  const anyFault = faults.missing + faults.duplicate + faults.torn;
  const reads = readers ? {
    logicalReaders: readers, plan: assign(readers, mode), connectMs: connectMs && Math.round(connectMs),
    pulls: pullsAll.length, pullsPerS: round(pullsAll.length / seconds), goodputPullsPerS: round((anyFault ? 0 : goodPulls) / seconds), queriesPerS: round(queries / seconds),
    pull: summary(pullsAll), capWait: summary(queueAll), errors: errorsR, checkedRows: checked, uncertainRows: uncertain, violations, violationSamples, faults,
    splits: { n: splits.length, acked: splits.filter(s => s.acked).length, straddled: splits.filter(s => s.straddled).length,
      repeatable: splits.filter(s => s.s1 === s.s2).length, showedStraddledCommand: splits.filter(s => s.acked && (s.s1 === s.ackPos || s.s2 === s.ackPos)).length },
    elu: readerResults.map(r => round(r.elu)),
  } : null;
  const lagOf = probe => probe.rows.filter(r => r.win === name);
  const lf = lagOf(lagF), lw = lagOf(lagW);
  const wByRid = new Map(lw.filter(r => !r.error).map(r => [r.rid, r.ms]));
  const lag = {
    follower: summary(lf.filter(r => !r.error).map(r => r.ms)), writer: summary(lw.filter(r => !r.error).map(r => r.ms)),
    excess: summary(lf.filter(r => !r.error && wByRid.has(r.rid)).map(r => r.ms - wByRid.get(r.rid))),
    wrongPos: lf.filter(r => !r.error && !r.ok).length + lw.filter(r => !r.error && !r.ok).length,
    errors: lf.filter(r => r.error).map(r => r.error).concat(lw.filter(r => r.error).map(r => 'writer:' + r.error)),
  };
  const stats = { writer: sampler.of(name, writerInfo.container), follower: sampler.of(name, folInfo.container) };
  return { name, mode, readers, kind, seconds, traceDigest: traceDigest(trace), start, end, offerOverrunMs: Math.round(offerEnd - end), blockCut, writer: writerStats, reads, lag, stats,
    mainLoopDelayMs: { p50: round(loopDelay.percentile(50) / 1e6), p99: round(loopDelay.percentile(99) / 1e6), max: round(loopDelay.max / 1e6) } };
}
const round = v => (v == null || Number.isNaN(v) ? null : Math.round(v * 100) / 100);

// ---------------------------------------------------------------- setup: token check and seed

async function tokenCheck() {
  // R19 open question 5: is the driver-built single-database token the one the node mints? On a node that
  // only this run writes to, right after a commit, SHOW SNAPSHOT_TOKEN must equal encode(system_time).
  const c = connect(W_URL);
  try {
    await c.unsafe('BEGIN READ WRITE');
    await c.unsafe(`INSERT INTO ${T.feed} (_id, subj, pos, changes) VALUES ('init', 'none', 0, '[]')`);
    await c.unsafe('COMMIT SYNC');
    const [r] = await c.unsafe('SHOW LATEST_SUBMITTED_TX');
    await c.unsafe('BEGIN READ ONLY');
    await c.unsafe(`SELECT _id FROM ${T.feed} WHERE _id = 'init'`);
    const [s] = await c.unsafe('SHOW SNAPSHOT_TOKEN');
    await c.unsafe('COMMIT');
    const minted = Object.values(s)[0];
    const micros = parseMicros(r.system_time);
    return { systemTimeText: r.system_time, awaitToken: r.await_token, minted, mintedDecoded: decodeSnapshotToken(minted), built: encodeSnapshotToken(micros), equal: minted === encodeSnapshotToken(micros) };
  } finally { await c.end({ timeout: 5 }); }
}

async function seed() {
  const c = connect(W_URL);
  const t0 = absNow();
  const rowsPerStmt = 1000, stmtsPerTx = 5;
  try {
    for (let s = 0; s < P.subjects; s += rowsPerStmt * stmtsPerTx) {
      await c.unsafe('BEGIN READ WRITE');
      for (let b = s; b < Math.min(P.subjects, s + rowsPerStmt * stmtsPerTx); b += rowsPerStmt) {
        const values = [];
        for (let i = b; i < Math.min(P.subjects, b + rowsPerStmt); i++) {
          const ints = Array.from({ length: 8 }, (_, k) => intVal(i, 0, k));
          const strs = Array.from({ length: 8 }, (_, k) => `'${strVal(i, 0, k + 8)}'`);
          const refs = Array.from({ length: REFS }, (_, k) => `'${sid(ref(i, k, P.subjects))}'`);
          values.push(`('${sid(i)}', ${ints.join(', ')}, ${strs.join(', ')}, ${refs.join(', ')}, 0)`);
        }
        const cols = ['_id', ...Array.from({ length: 16 }, (_, k) => `a${k}`), 'r0', 'r1', 'r2', 'r3', 'pos'];
        await c.unsafe(`INSERT INTO ${T.ent} (${cols.join(', ')}) VALUES ${values.join(', ')}`);
      }
      await c.unsafe('COMMIT SYNC');
      if (((s / (rowsPerStmt * stmtsPerTx)) % 4) === 0) log(`seed ${s + rowsPerStmt * stmtsPerTx}/${P.subjects} in ${Math.round(absNow() - t0)} ms`);
    }
    await c.unsafe('BEGIN READ WRITE');
    await c.unsafe(`INSERT INTO ${T.claim} (_id, subj, pos) VALUES ('init', 'none', 0)`);
    await c.unsafe(`INSERT INTO ${T.ledger} (_id, cmd, subj, attr, val, pos) VALUES ('init', 'init', 'none', 'a0', 'init', 0)`);
    await c.unsafe('COMMIT SYNC');
    const [r] = await c.unsafe('SHOW LATEST_SUBMITTED_TX');
    const micros = parseMicros(r.system_time);
    lastMicros = micros;
    return { rid: -1, t: micros.toString(), snapshotToken: encodeSnapshotToken(micros), awaitToken: r.await_token, clock: microsIso(micros), ms: Math.round(absNow() - t0) };
  } finally { await c.end({ timeout: 5 }); }
}

async function waitFollowerHas(basis, timeoutMs = 120_000) {
  const c = connect(F_URL);
  const t0 = absNow();
  try {
    await c.unsafe(beginAt(basis));
    const [row] = await c.unsafe(`SELECT COUNT(*) AS n FROM ${T.ent}`);
    await c.unsafe('COMMIT');
    return { ms: Math.round(absNow() - t0), rows: Number(row.n) };
  } finally { await c.end({ timeout: 5 }); if (absNow() - t0 > timeoutMs) log('follower catch-up slow'); }
}

// ---------------------------------------------------------------- connection RSS (R19 E4, E9)

async function connRss() {
  const sample = async () => {
    const res = await dockerAsync(['stats', '--no-stream', '--format', '{{json .}}', folInfo.container]);
    return res.ok ? parseBytes(JSON.parse(res.stdout.trim().split('\n')[0]).MemUsage.split('/')[0]) : null;
  };
  const before = await sample();
  const conns = Array.from({ length: P.connRss }, () => connect(F_URL));
  const t0 = absNow();
  const opened = await Promise.allSettled(conns.map(c => c.unsafe('SELECT 1')));
  const openMs = absNow() - t0;
  await sleep(5000);
  const during = await sample();
  await Promise.all(conns.map(c => c.end({ timeout: 5 }).catch(() => {})));
  await sleep(5000);
  const after = await sample();
  const okCount = opened.filter(o => o.status === 'fulfilled').length;
  const failures = {};
  for (const o of opened.filter(x => x.status === 'rejected')) { const k = o.reason?.code ?? String(o.reason?.message).slice(0, 60); failures[k] = (failures[k] ?? 0) + 1; }
  return { connections: P.connRss, opened: okCount, failures, openMs: Math.round(openMs), rssBeforeMiB: mib(before), rssWithConnsMiB: mib(during), rssAfterCloseMiB: mib(after),
    perConnectionMiB: before && during ? round((during - before) / okCount / 2 ** 20) : null };
}
const mib = b => (b == null ? null : Math.round(b / 2 ** 20));

// ---------------------------------------------------------------- logs and receipt

const BAD = /log file corrupted|ingestion stopp|IllegalStateException|follower-buffer-overflow|Fault|OutOfMemory|PGwire at capacity|ERROR/i;
async function logScan(container, since) {
  const res = await dockerAsync(['logs', '--since', since, container], 60_000);
  const text = res.stdout + res.stderr;
  fs.writeFileSync(path.join(rawDir, `${container}.log`), text);
  const hits = text.split('\n').filter(line => BAD.test(line));
  return { lines: text.split('\n').length, badLines: hits.length, sample: hits.slice(0, 15).map(l => l.slice(0, 300)), sha256: sha256(text) };
}
async function metrics(container, file) {
  const res = await dockerAsync(['exec', container, 'wget', '-qO-', 'http://127.0.0.1:8080/metrics']);
  fs.writeFileSync(path.join(rawDir, file), res.stdout);
  return res.stdout.split('\n').filter(l => /^(xtdb_replica_block|block_upload|xtdb_block|compactor|node_tx|tx_op|jvm_memory_used_bytes\{area="heap"|xtdb_replica)/.test(l)).slice(0, 60);
}

// ---------------------------------------------------------------- main

const runStart = new Date().toISOString();
const receipt = {
  format: 'tx2-x05-receipt/1', experiment: 'EXP-X05', runId, runKind: smoke ? 'smoke' : 'candidate', startedAt: runStart, params: P, tables: T,
  northStar: 'P1 (TARGETS 1.1 P1): writer commit latency with readers on a read-only follower versus the zero-reader run on the same trace segment; zero stale reads.',
  semantics: 'TARGETS 1.1 P1 items 1, 2, 4, 5 (item 3 by a forced block cut at +1 s in every window); R19 E1, E4, E5, E9.',
  git: (({ diff, ...rest }) => rest)(sourceIdentity()),
  driver: Object.fromEntries(['driver.mjs', 'reader-worker.mjs', 'common.mjs'].map(f => [`lab/experiments/EXP-X05-xtdb-read-follower/${f}`, sha256File(path.join(HERE, f))])),
  harness: Object.fromEntries(['lab/bin/engine.mjs', 'lab/bin/lib.mjs'].map(f => [f, sha256File(path.join(REPO, f))])),
  slotsJsonSha256: sha256File(path.join(process.env.TX2_CONFIG_DIR ?? REPO, 'lab/config/slots.json')),
  client: { postgresJs: POSTGRES_ENTRY, postgresJsIndexSha256: sha256File(POSTGRES_ENTRY), node: process.version, host: { cpus: os.cpus().length, load: os.loadavg() } },
  reasons: [],
};
const engStart = engines();
receipt.enginesAtStart = engStart;
for (const side of ['writer', 'follower']) {
  const e = engStart[side];
  if (e.missing) { console.error(`${e.container} is not running; start it with lab/bin/engine.mjs`); process.exit(2); }
  if (e.configSha256Label !== e.effectiveConfigSha256) receipt.reasons.push(`${e.container} label ${e.configSha256Label} differs from effective ${e.effectiveConfigSha256}`);
  if (e.imageId !== e.pinnedImageId) receipt.reasons.push(`${e.container} image is not the pinned one`);
}
save('receipt-partial.json', receipt);
log(`run ${runId}; writer ${W_URL} cpuset ${engStart.writer.cpusetCpus}; follower ${F_URL} cpuset ${engStart.follower.cpusetCpus}; tables ${T.ent}`);

receipt.tokenCheck = await tokenCheck();
log(`token check: driver-built token ${receipt.tokenCheck.equal ? 'EQUALS' : 'DIFFERS FROM'} SHOW SNAPSHOT_TOKEN (${receipt.tokenCheck.systemTimeText})`);
seedBasis = await seed();
receipt.seed = { ...seedBasis, subjects: P.subjects };
log(`seeded ${P.subjects} subjects in ${seedBasis.ms} ms`);
receipt.followerCatchUp = await waitFollowerHas(seedBasis);
log(`follower has the seed: ${receipt.followerCatchUp.rows} rows after ${receipt.followerCatchUp.ms} ms`);
if (receipt.followerCatchUp.rows !== P.subjects) receipt.reasons.push(`follower saw ${receipt.followerCatchUp.rows} seed rows, expected ${P.subjects}`);
save('receipt-partial.json', receipt);

const seg = traceSegment({ seed: P.seed, rate: P.rate, seconds: P.levelS, subjects: P.subjects, active: P.active });
receipt.trace = { digest: traceDigest(seg), commands: seg.length, rate: P.rate, seconds: P.levelS };
const metricsAt = { start: { writer: await metrics(writerInfo.container, 'metrics-writer-start.txt'), follower: await metrics(folInfo.container, 'metrics-follower-start.txt') } };

if (P.phases.includes('ladder')) {
  const warmSeg = traceSegment({ seed: `${P.seed}|warm`, rate: P.rate, seconds: P.warmS, subjects: P.subjects, active: P.active });
  await runWindow({ name: 'warmF', mode: 'follower', readers: 8, trace: warmSeg, seconds: P.warmS, kind: 'warm' });
  await runWindow({ name: 'warmS', mode: 'single', readers: 8, trace: warmSeg, seconds: P.warmS, kind: 'warm' });
  await runWindow({ name: 'Z0', trace: seg, seconds: P.levelS });
  for (const [i, L] of P.levels.entries()) {
    await runWindow({ name: `F${L}`, mode: 'follower', readers: L, trace: seg, seconds: P.levelS });
    await runWindow({ name: `S${L}`, mode: 'single', readers: L, trace: seg, seconds: P.levelS });
    if (i === Math.floor((P.levels.length - 1) / 2)) await runWindow({ name: 'Z1', trace: seg, seconds: P.levelS });
  }
  await runWindow({ name: 'Z2', trace: seg, seconds: P.levelS });
  receipt.watermarksAfterLadder = await watermarks();
  save('receipt-partial.json', receipt);
}

if (P.phases.includes('e5')) {
  const e5 = new E5(F_URL);
  const ackHook = (job, pos, ackAt) => { if (phase === 'e5') e5.onAck(job, pos, ackAt); };
  const rHook = r => { if (phase === 'e5') e5.onReceipt(r); };
  writer.onAck.push(ackHook); writer.onReceipt.push(rHook);
  const e5Seg = traceSegment({ seed: `${P.seed}|e5`, rate: P.rate, seconds: P.e5S, subjects: P.subjects, active: P.active });
  await runWindow({ name: 'E5', trace: e5Seg, seconds: P.e5S, kind: 'e5' });
  writer.onAck.splice(writer.onAck.indexOf(ackHook), 1); writer.onReceipt.splice(writer.onReceipt.indexOf(rHook), 1);
  await sleep(2000);
  receipt.e5 = e5.summarize();
  save('e5-rows.json', e5.rows);
  await e5.close();
  log(`E5: ${JSON.stringify(Object.fromEntries(Object.entries(receipt.e5).map(([m, s]) => [m, { reads: s.reads, exact: s.exact, stale: s.stale, ahead: s.ahead, errors: s.errors, within5: s.within5ms }])))}`);
}

if (P.phases.includes('conn')) {
  phase = 'conn';
  receipt.connRss = await connRss();
  log(`conn RSS: ${JSON.stringify(receipt.connRss)}`);
}

if (P.phases.includes('burst')) {
  const burstSeg = traceSegment({ seed: `${P.seed}|burst`, rate: P.rate * P.burstX, seconds: P.burstS, subjects: P.subjects, active: P.active, burst: true });
  writer.ensure(P.burstConns);
  metricsAt.beforeBurst = { writer: await metrics(writerInfo.container, 'metrics-writer-before-burst.txt'), follower: await metrics(folInfo.container, 'metrics-follower-before-burst.txt') };
  await runWindow({ name: 'BURST', mode: 'follower', readers: 16, trace: burstSeg, seconds: P.burstS, cutAtMs: Math.min(20_000, P.burstS * 500), kind: 'burst' });
  metricsAt.afterBurst = { writer: await metrics(writerInfo.container, 'metrics-writer-after-burst.txt'), follower: await metrics(folInfo.container, 'metrics-follower-after-burst.txt') };
  // The burst can leave a backlog (open loop at 5x with 20-60 KB commands); RECOVER starts only once it is gone.
  receipt.burstBacklogDrain = await writer.drain(600_000);
  const recSeg = traceSegment({ seed: `${P.seed}|recover`, rate: P.rate, seconds: P.recoverS, subjects: P.subjects, active: P.active });
  await runWindow({ name: 'RECOVER', mode: 'follower', readers: 4, trace: recSeg, seconds: P.recoverS, kind: 'recover' });
  receipt.burst = { trace: { digest: traceDigest(burstSeg), commands: burstSeg.length, rate: P.rate * P.burstX, payloadNote: '50 facts, ledger values padded 400-1200 bytes each: about 20-60 KB per transaction' } };
}

receipt.watermarksAtEnd = await watermarks();
receipt.metrics = metricsAt;
receipt.logs = { writer: await logScan(writerInfo.container, runStart), follower: await logScan(folInfo.container, runStart) };
const engEnd = engines();
receipt.enginesAtEnd = { writer: { containerId: engEnd.writer.containerId, startedAt: engEnd.writer.startedAt, running: engEnd.writer.running, health: engEnd.writer.health },
  follower: { containerId: engEnd.follower.containerId, startedAt: engEnd.follower.startedAt, running: engEnd.follower.running, health: engEnd.follower.health } };
for (const side of ['writer', 'follower'])
  if (engEnd[side].containerId !== engStart[side].containerId || engEnd[side].startedAt !== engStart[side].startedAt) receipt.reasons.push(`${engStart[side].container} restarted or was replaced during the run`);
receipt.windows = results.map(({ writer: w, ...rest }) => ({ ...rest, writer: (({ lateRaw, ...k }) => k)(w) }));
receipt.summaryTables = buildTables(results);
receipt.finishedAt = new Date().toISOString();
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, JSON.stringify(receipt, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n');
fs.writeFileSync(path.join(rawDir, 'driver.log'), logLines.join('\n') + '\n');
fs.writeFileSync(path.join(rawDir, 'tables.md'), receipt.summaryTables.markdown);
fs.mkdirSync(durableDir, { recursive: true });
fs.cpSync(rawDir, durableDir, { recursive: true });
fs.copyFileSync(receiptPath, path.join(durableDir, 'receipt.json'));
process.stdout.write(receipt.summaryTables.markdown + `\nreceipt ${path.relative(REPO, receiptPath)}; raw ${rawDir}; copy ${durableDir}\n`);
await Promise.all([writer, lagF, lagW].flatMap(x => (x.conns ?? [x.conn])).map(c => c.end({ timeout: 5 }).catch(() => {})));
for (const w of workers) w.postMessage({ type: 'exit' });
process.exit(0);

// ---------------------------------------------------------------- tables

function buildTables(rs) {
  const ladder = rs.filter(r => r.kind === 'ladder');
  const zs = ladder.filter(r => r.mode === 'zero');
  const pool = key => zs.flatMap(r => r.writer.lateRaw[key]);
  const base = { lat: summary(pool('latMs')), svc: summary(pool('svcMs')) };
  const ratio = (a, b) => (a == null || !b ? null : Math.round((a / b) * 100) / 100);
  const rows = ladder.map(r => ({
    window: r.name, mode: r.mode, readers: r.readers, commits: r.writer.committed, offered: r.writer.offered, errors: Object.values(r.writer.errors).reduce((a, b) => a + b, 0),
    latP50: r.writer.lat.p50, latP99: r.writer.lat.p99, svcP50: r.writer.svc.p50, svcP99: r.writer.svc.p99,
    latP50x: ratio(r.writer.lat.p50, base.lat.p50), latP99x: ratio(r.writer.lat.p99, base.lat.p99), svcP50x: ratio(r.writer.svc.p50, base.svc.p50), svcP99x: ratio(r.writer.svc.p99, base.svc.p99),
    waitsOver2s: r.writer.waitsOver2s, maxQueue: r.writer.maxQueue, writerCpu: r.stats.writer?.cpuMean ?? null, followerCpu: r.stats.follower?.cpuMean ?? null,
    pullsPerS: r.reads?.pullsPerS ?? null, goodput: r.reads?.goodputPullsPerS ?? null, queriesPerS: r.reads?.queriesPerS ?? null, pullP50: r.reads?.pull.p50 ?? null, pullP99: r.reads?.pull.p99 ?? null,
    violations: r.reads?.violations ?? null, faults: r.reads ? r.reads.faults.missing + r.reads.faults.duplicate + r.reads.faults.torn : null, readErrors: r.reads ? Object.values(r.reads.errors).reduce((a, b) => a + b, 0) : null,
    splits: r.reads ? `${r.reads.splits.straddled}/${r.reads.splits.n}` : null, lagFp50: r.lag.follower.p50, lagFp99: r.lag.follower.p99, lagWp50: r.lag.writer.p50, lagExcessP99: r.lag.excess.p99,
    loopP99: r.mainLoopDelayMs.p99,
  }));
  const cols = Object.keys(rows[0] ?? {});
  const md = [`Baseline (pooled ${zs.map(z => z.name).join(', ')}): commit from schedule p50 ${base.lat.p50} p99 ${base.lat.p99}; service p50 ${base.svc.p50} p99 ${base.svc.p99} ms`, '',
    `| ${cols.join(' | ')} |`, `| ${cols.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${cols.map(c => row[c] ?? '-').join(' | ')} |`)];
  const other = rs.filter(r => r.kind !== 'ladder').map(r => `- ${r.name}: commits ${r.writer.committed}/${r.writer.offered}, errors ${JSON.stringify(r.writer.errors)}, lat p50/p99 ${r.writer.lat.p50}/${r.writer.lat.p99}, svc p50/p99 ${r.writer.svc.p50}/${r.writer.svc.p99}; lag follower p50/p99 ${r.lag.follower.p50}/${r.lag.follower.p99} (n ${r.lag.follower.n}, errors ${r.lag.errors.length}); reads ${r.reads ? `${r.reads.pullsPerS}/s p99 ${r.reads.pull.p99} viol ${r.reads.violations} errors ${JSON.stringify(r.reads.errors)}` : '-'}; block cut ${r.blockCut?.ok} ${r.blockCut?.ms} ms`);
  return { baseline: base, rows, markdown: md.join('\n') + '\n\n' + other.join('\n') + '\n' };
}
