// lab/scenarios/lib/runner.mjs: run one GS scenario against one composition and judge it.
//
// [EXP-W01] Why: TARGETS section 6 rule 4: a scenario fails on any wrong answer, any lost or duplicated
// commit, any feed gap or order violation, or any missed bar, and its receipt records the correctness
// verdicts and the P1 to P5 measurements together. This runner is shared; each scenario's run.mjs supplies
// generate() (pure, also used for goldens) and optional live hooks.
//
// Read correctness without a position cut: Triplex's public basis is (recordedAt, validAt), and record time
// is the runtime's wall clock. A reader pins R = now - 1 ms and only reads subjects with no command in
// flight, so every later commit of that subject has an instant above R. The expected answer is then the
// golden state after the subject's last commit with instant <= R (receipts give the instants), which
// O-REPLAY computed from the seed alone (expected.json). Writers are serial per subject, parallel across
// subjects (TARGETS section 2 "Conflicts").
// Latency is measured from the scheduled send time (open-loop writer, no coordinated omission).
import fs from 'node:fs';
import path from 'node:path';
import { BT, GEN_VERSION, WORLD_BATCH, canonRow, digestRows, rngFor, sha256, subjectEntities, worldOps, worldSid } from './gen.mjs';
import { runOracle, subjectOfEntity } from './oracle.mjs';
import { diagnostics } from './diagnostics.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));
export const EMPTY_DIGEST = digestRows([]);
const isWorldEntity = id => /^(placement|worker|i9):w\d{8}$/.test(id);

export function quantiles(values) {
  if (!values.length) return { count: 0, p50: null, p90: null, p99: null, max: null, mean: null };
  const v = [...values].sort((a, b) => a - b);
  const q = p => v[Math.min(v.length - 1, Math.ceil(p * v.length) - 1)];
  return { count: v.length, p50: round(q(0.5)), p90: round(q(0.9)), p99: round(q(0.99)), max: round(v[v.length - 1]), mean: round(v.reduce((s, x) => s + x, 0) / v.length) };
}
const round = x => Math.round(x * 100) / 100;

/** Canonical JSON of the command stream: the bytes the golden is bound to. */
export const streamBytes = commands => Buffer.from(JSON.stringify(commands.map(c => ({ index: c.index, subject: c.subject, writer: c.writer, at: c.at, meta: c.meta, operations: c.operations, tags: c.tags }))));

/** Resolve scenario params for a rung (spec.params overlaid with spec.rungs[rung]). */
export function resolveParams(spec, rung) {
  // The smoke rung (500 world subjects) reuses the 10k parameters unless the scenario overrides them.
  const over = rung === 'smoke' ? { ...spec.rungs?.['10k'], ...spec.rungs?.smoke } : spec.rungs?.[rung];
  if (!over) throw new Error(`scenario ${spec.id} declares no parameters for rung ${rung}`);
  return { ...spec.params, ...over, rung };
}

// ------------------------------------------------------------------ world (the rung's background subjects)

export const worldScopeName = (rung, seed, fresh) => `gs-world-${rung}-s${seed}-${sha256(GEN_VERSION).slice(0, 8)}${fresh ? `-${fresh}` : ''}`;
export const worldBatchId = (rung, seed, k) => `world/${rung}/${seed}/batch-${String(k).padStart(6, '0')}`;
export function worldBatches(seed, size) {
  const batches = [];
  for (let k = 0; k * WORLD_BATCH < size; k++) {
    const operations = [];
    for (let n = k * WORLD_BATCH; n < Math.min(size, (k + 1) * WORLD_BATCH); n++) operations.push(...worldOps(seed, n));
    batches.push({ k, operations });
  }
  return batches;
}
/** Deterministic sample of world subjects that carry golden digests. */
export function worldSample(seed, size, count) {
  const rng = rngFor(seed, 'world-sample');
  const picked = new Set();
  while (picked.size < Math.min(count, size)) picked.add(rng.int(0, size - 1));
  return [...picked].sort((a, b) => a - b).map(worldSid);
}

/** Load (or resume loading) the world through the bulk lane; idempotent by batch commandId. */
export async function ensureWorld(comp, { rung, seed, size, log }) {
  const batches = worldBatches(seed, size);
  const last = await comp.byCommand(worldBatchId(rung, seed, batches.length - 1));
  if (last.ok && last.record) { log(`world ${rung}: already loaded (${batches.length} batches, last at position ${last.record.position})`); return { loaded: false, batches: batches.length, ms: 0, facts: size * 5 }; }
  // Batches commit in order, so the first missing one is found by binary search over commandIds.
  const has = async k => { const r = await comp.byCommand(worldBatchId(rung, seed, k)); return r.ok && !!r.record; };
  let lo = 0, hi = batches.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (await has(mid)) lo = mid + 1; else hi = mid; }
  if (lo > 0) log(`world ${rung}: resuming at batch ${lo + 1}/${batches.length}`);
  const t0 = performance.now(); const lat = []; let unknown = 0;
  for (const b of batches.slice(lo)) {
    const s = performance.now();
    for (let attempt = 0; ; attempt++) {
      const r = await comp.transact(b.operations, { actor: 'bulk:hris', commandId: worldBatchId(rung, seed, b.k) });
      if (r.status === 'committed' || r.category === 'command-already-committed') break;
      // Outcome unknown or a transient WriteError: resolve by commandId, then re-send (claims make it safe).
      if ((r.status === 'unknown' || r.category === 'write-error') && attempt < 30) { unknown++; await new Promise(res => setTimeout(res, Math.min(30_000, 2000 * (attempt + 1)))); if (await has(b.k)) break; continue; }
      throw new Error(`world batch ${b.k} failed: ${JSON.stringify(r).slice(0, 500)}`);
    }
    lat.push(performance.now() - s);
    if (b.k % 10 === 0) log(`world ${rung}: batch ${b.k + 1}/${batches.length} (${Math.round(performance.now() - t0)} ms)`);
  }
  return { loaded: true, resumedAtBatch: lo, batches: batches.length, ms: Math.round(performance.now() - t0), facts: size * 5, batchMs: quantiles(lat), unknownOutcomes: unknown };
}

// ------------------------------------------------------------------ executor

export class Executor {
  constructor(ctx) {
    this.ctx = ctx; this.queues = new Map(); this.inflight = new Map(); this.refIds = new Map();
    this.attempts = []; this.byIndex = new Map(); this.ledger = new Map(); this.pending = 0;
  }
  physOps(cmd) {
    const { phys } = this.ctx;
    return cmd.operations.map(op => {
      if (op.op === 'assert') {
        const out = { op: 'assert', entityId: phys(op.entityId), attribute: op.attribute, value: op.value.type === 'ref' ? { ...op.value, value: phys(op.value.value) } : op.value };
        for (const k of ['entityType', 'createdBy', 'validFrom', 'validTo']) if (op[k] !== undefined) out[k] = op[k];
        return out;
      }
      const id = this.refIds.get(op.target);
      if (!id) throw new Error(`command ${cmd.index}: no assertion id for ref ${op.target}`);
      return { op: 'retract', id };
    });
  }
  physMeta(cmd) {
    const meta = { actor: cmd.meta.actor, commandId: this.ctx.physCommand(cmd.meta.commandId) };
    if (cmd.meta.preconditions) meta.preconditions = cmd.meta.preconditions.map(p => ({ _tag: 'EntityState', entityId: this.ctx.phys(p.entityId),
      tripleIds: p.targets.map(t => { const id = this.refIds.get(t); if (!id) throw new Error(`command ${cmd.index}: no id for precondition ref ${t}`); return id; }) }));
    return meta;
  }
  bindRefs(cmd, ids, source) {
    const asserts = cmd.operations.filter(op => op.op === 'assert');
    if (ids.length !== asserts.length) { this.ctx.check(`refs-${cmd.index}`, false, `${source} returned ${ids.length} assertion ids for ${asserts.length} asserts`); return; }
    asserts.forEach((op, k) => this.refIds.set(op.ref, ids[k]));
  }
  subjectsOf(cmd) { return cmd.subject != null ? [cmd.subject] : [...new Set(cmd.operations.filter(o => o.op === 'assert').map(o => subjectOfEntity(o.entityId)))]; }
  /** Queue one command behind earlier commands of its subject. Resolves with the attempt. */
  submit(cmd, scheduledAt = performance.now()) {
    const key = cmd.subject ?? `bulk:${cmd.index}`;
    this.pending++;
    for (const s of this.subjectsOf(cmd)) this.inflight.set(s, (this.inflight.get(s) ?? 0) + 1);
    const prev = this.queues.get(key) ?? Promise.resolve();
    const next = prev.then(() => this.send(cmd, scheduledAt));
    this.queues.set(key, next.catch(() => {}));
    return next.finally(() => { this.pending--; for (const s of this.subjectsOf(cmd)) { const n = this.inflight.get(s) - 1; if (n) this.inflight.set(s, n); else this.inflight.delete(s); } });
  }
  /** Race group: every member is sent at once, after the subject's earlier commands. */
  submitRace(cmds, scheduledAt = performance.now()) {
    const key = cmds[0].subject;
    this.pending += cmds.length;
    this.inflight.set(key, (this.inflight.get(key) ?? 0) + cmds.length);
    const prev = this.queues.get(key) ?? Promise.resolve();
    const next = prev.then(() => Promise.all(cmds.map(c => this.send(c, scheduledAt))));
    this.queues.set(key, next.catch(() => {}));
    return next.finally(() => { this.pending -= cmds.length; const n = this.inflight.get(key) - cmds.length; if (n) this.inflight.set(key, n); else this.inflight.delete(key); });
  }
  async drain(timeoutMs) {
    const until = performance.now() + timeoutMs;
    while (this.pending > 0 && performance.now() < until) await sleep(20);
    return this.pending === 0;
  }
  async send(cmd, scheduledAt) {
    const { comp, check } = this.ctx;
    const a = { index: cmd.index, subject: cmd.subject, template: cmd.tags?.template ?? null, trace: !!cmd.tags?.trace, scheduledAt, sentAt: performance.now(), doneAt: null,
      status: null, receipt: null, category: null, tag: null, conflicts: 0, resolvedBy: null };
    this.attempts.push(a); this.byIndex.set(cmd.index, a);
    let r;
    const epoch = this.ctx.epoch;
    const faulted = () => this.ctx.restarting || this.ctx.epoch !== epoch;
    try { r = await comp.transact(this.physOps(cmd), this.physMeta(cmd)); }
    catch (error) { const message = String(error?.message ?? error).slice(0, 800); r = /no (assertion )?id for (precondition )?ref/.test(message) ? { status: "blocked", category: "predecessor-not-committed", message } : { status: "error", tag: error?._tag ?? null, message }; }
    a.conflicts = r.conflicts ?? 0;
    // Outcome unknown: a lost ACK by fault (runtime restart), or a transient infrastructure WriteError (a
    // deadline, "Cannot acquire XTDB source cut") after which the command may or may not have committed.
    // Resolve by commandId; re-send with the same commandId only if it never committed (claims make it safe).
    // A ReadError inside transact (seen on XTDB under load: "XTDB read failed") also leaves the outcome open.
    const transient = x => (x.status === 'rejected' && x.category === 'write-error' && /cannot acquire|cannot read|deadline|timeout|timed out|econn|connection|outcome/i.test(x.message ?? ''))
      || (x.status === 'error' && x.tag === 'ReadError');
    if (r.status === 'unknown' || (r.status !== 'committed' && faulted()) || transient(r)) {
      a.unknown = { tag: r.tag, message: r.message ?? null, causes: r.causes ?? [] };
      a.transientRetries = 0;
      const priorCommit = () => this.attempts.find(x => x !== a && x.status === 'committed' && this.ctx.gen.stream.commands[x.index].meta.commandId === cmd.meta.commandId);
      for (let tries = 0; tries < 50; tries++) {
        while (this.ctx.restarting) await sleep(50);
        await sleep(100 * Math.min(10, tries + 1));
        const found = await comp.byCommand(this.ctx.physCommand(cmd.meta.commandId)).catch(e => ({ ok: false, error: e }));
        if (found.ok && found.record) {
          const prior = priorCommit();
          // An earlier attempt of the same commandId owns this record: this attempt is the duplicate.
          if (prior && prior.receipt.txId === found.record.txId) { r = { status: 'rejected', category: 'command-already-committed', tag: 'CommandAlreadyCommittedError', transactionId: found.record.txId, message: 'resolved by transactionByCommand: an earlier attempt committed' }; a.resolvedBy = 'transactionByCommand(duplicate)'; break; }
          r = { status: 'committed', receipt: { txId: found.record.txId, position: found.record.position, instant: found.record.instant, assertionIds: found.record.changes.filter(ch => ch.op === 'assert').map(ch => ch.tripleId) } }; a.resolvedBy = 'transactionByCommand'; break;
        }
        if (found.ok && !found.record) {
          try { r = await comp.transact(this.physOps(cmd), this.physMeta(cmd)); } catch (error) { r = { status: 'error', tag: error?._tag ?? null, message: String(error) }; }
          a.resolvedBy = 'retry'; a.transientRetries++;
          if (r.category === 'command-already-committed') { if (priorCommit()) break; continue; } // the earlier attempt did commit: resolve it by commandId
          if (r.status === 'committed' || (r.status === 'rejected' && !this.ctx.restarting && !transient(r))) break;
        }
      }
    }
    a.doneAt = performance.now();
    a.status = r.status; a.tag = r.tag ?? null; a.category = r.category ?? null; a.causes = r.causes ?? [];
    if (r.status === 'committed') {
      a.receipt = { txId: r.receipt.txId, position: r.receipt.position, instant: r.receipt.instant };
      this.bindRefs(cmd, r.receipt.assertionIds, 'receipt');
      for (const s of this.subjectsOf(cmd)) { const l = this.ledger.get(s) ?? []; l.push({ index: cmd.index, position: a.receipt.position, instant: a.receipt.instant }); this.ledger.set(s, l); }
      if (cmd.tags?.lostAck) a.ackLost = true; // the client discards this receipt; the retry must recover it
    } else if (r.status === 'rejected') {
      a.transactionId = r.transactionId ?? null; a.message = r.message ?? null;
      const original = cmd.tags?.resendOf != null ? this.byIndex.get(cmd.tags.resendOf) : null;
      if (original && r.category === 'command-already-committed') {
        const same = original.receipt && r.transactionId === original.receipt.txId;
        check(`resend-${cmd.index}-original-receipt`, same, same ? null : `CommandAlreadyCommitted carried ${r.transactionId}, original receipt ${original.receipt?.txId}`, { counts: 'idempotency' });
        if (cmd.tags.lostAckRetry) {
          // A lookup that races a runtime restart fails with an interruption; retry it after the restart.
          let found;
          for (let t = 0; t < 20; t++) { while (this.ctx.restarting) await sleep(50); found = await comp.byCommand(this.ctx.physCommand(cmd.meta.commandId)).catch(e => ({ ok: false, error: String(e) })); if (found.ok) break; await sleep(250); }
          const ok = found.ok && found.record?.txId === original.receipt?.txId && found.record?.position === original.receipt?.position;
          check(`lost-ack-${cmd.tags.resendOf}-resolved`, ok, ok ? null : `transactionByCommand gave ${JSON.stringify(found.record ?? found.error)?.slice(0, 300)}`, { counts: 'idempotency' });
        }
      }
    } else {
      a.message = r.message ?? null;
      check(`command-${cmd.index}-${r.status === "blocked" ? "blocked-by-uncommitted-predecessor" : "untyped-failure"}`, false, `${r.tag ?? r.status}: ${r.message}`);
    }
    await this.ctx.hooks.onSettled?.(this.ctx, cmd, a);
    return a;
  }
}

// ------------------------------------------------------------------ reads

/** Expected digest of `sid` at record time R and valid time V (see the file header). */
export function expectedDigest(ctx, sid, R, V) {
  const golden = ctx.expected.digests[sid] ?? ctx.world.digests[sid];
  if (!golden) return null;
  const ledger = ctx.ex.ledger.get(sid) ?? [];
  let last = null;
  for (const e of ledger) if (e.instant <= R && (!last || e.position > last.position)) last = e;
  const state = last ? golden.after?.[last.index] : golden.base;
  return state?.[V] ?? null;
}

export async function pullDigest(ctx, sid, basis) {
  const t = performance.now();
  let r;
  try { r = await ctx.comp.pull(subjectEntities(sid).map(ctx.phys), basis); } catch (error) { r = { ok: false, error: String(error?.message ?? error) }; }
  const ms = performance.now() - t;
  if (!r.ok) return { ok: false, ms, error: r.error };
  const rows = r.rows.map(row => canonRow(row, ctx.unphys));
  return { ok: true, ms, digest: digestRows(rows), rows };
}

/** One pinned, checked read of `sid` (skips if the subject has a command in flight). */
export async function checkedRead(ctx, sid, { V = BT.NOW, kind = 'live', R = Date.now() - 1 } = {}) {
  if (ctx.ex.inflight.has(sid) || ctx.restarting) return null;
  const epoch = ctx.epoch;
  const want = expectedDigest(ctx, sid, R, V);
  const got = await pullDigest(ctx, sid, { recordedAt: R, validAt: V });
  if (!got.ok && (ctx.restarting || ctx.epoch !== epoch)) { ctx.interruptedReads = (ctx.interruptedReads ?? 0) + 1; return null; }
  const ok = got.ok && want !== null && got.digest === want;
  ctx.reads.push({ kind, ms: got.ms, ok, error: !got.ok, at: performance.now() });
  if (!ok && ctx.readFailures.length < 10) ctx.readFailures.push({ sid, R, V, kind, expected: want, observed: got.digest ?? null, error: got.error ?? null, rows: got.rows?.slice(0, 40) });
  return { ok, ms: got.ms, digest: got.digest };
}

async function readerLoop(ctx, stopped) {
  const rng = rngFor(`${ctx.spec.seed}:${Math.random()}`, 'reader'); // read choice need not be reproducible; answers are
  while (!stopped()) {
    const sid = rng.pick(ctx.readSet);
    const r = await checkedRead(ctx, sid);
    if (r === null) await sleep(1);
  }
}

// ------------------------------------------------------------------ feed consumer (P3)

async function feedLoop(ctx, stopped) {
  let after = ctx.P0;
  const seen = ctx.feedSeen;
  for (;;) {
    if (ctx.restarting) { await sleep(50); continue; }
    const page = await ctx.comp.feed(after, 1000).catch(error => ({ ok: false, error: String(error) }));
    const at = performance.now();
    if (!page.ok) { if (!ctx.restarting) ctx.feedErrors.push(page.error); await sleep(100); if (stopped()) break; continue; }
    for (const t of page.transactions) {
      seen.push({ position: t.position, txId: t.txId, commandId: t.commandId ?? null, at,
        entities: [...new Set(t.changes.map(c => c.entityId))],
        validRanges: t.changes.map(c => [c.validFrom ?? null, c.validTo ?? null]) });
      after = Math.max(after, t.position);
    }
    if (page.transactions.length === 0) { if (stopped()) break; await sleep(ctx.opts.feedPollMs ?? 100); }
  }
}

// ------------------------------------------------------------------ the run

export async function runScenario({ spec, expected, hooks, comp, world, opts, log = () => {} }) {
  const params = resolveParams(spec, opts.rung);
  const gen = hooks.generate(spec, params);
  const streamSha = sha256(streamBytes(gen.stream.commands));
  const prefix = `${opts.runTag}-s${String(spec.id).padStart(2, '0')}`;
  const phys = id => isWorldEntity(id) ? id : `${prefix}/${id}`;
  const unphys = id => (typeof id === 'string' && id.startsWith(prefix + '/')) ? id.slice(prefix.length + 1) : id;
  const checks = [];
  const ctx = {
    spec, params, gen, expected, world, comp, opts, hooks, log, prefix, phys, unphys,
    physCommand: id => `${prefix}/${id}`,
    reads: [], readFailures: [], feedSeen: [], feedErrors: [], extra: {}, restarting: false, epoch: 0,
    /** Restart the Triplex runtime; readers pause, in-flight commands resolve by commandId. */
    async restart() { ctx.restarting = true; const t = performance.now(); try { await comp.restart(); } finally { ctx.epoch++; ctx.restarting = false; } return performance.now() - t; },
    check(id, ok, detail = null, { counts = 'correctness' } = {}) { checks.push({ id, ok: !!ok, counts, ...(ok ? {} : { detail }) }); return !!ok; },
  };
  ctx.ex = new Executor(ctx);
  ctx.check('golden-stream-sha256', streamSha === expected.streamSha256, `generated stream ${streamSha} differs from expected.json ${expected.streamSha256}`);
  if (streamSha !== expected.streamSha256) return finish(ctx, checks, { aborted: 'golden mismatch' });
  ctx.readSet = [...gen.digestSubjects.filter(s => !(gen.noDigestSubjects ?? []).includes(s)), ...world.sample];

  // Setup phase: commands tagged phase=setup, in order, not measured against bars.
  const setup = gen.stream.commands.filter(c => c.tags?.phase === 'setup');
  const liveCmds = gen.stream.commands.filter(c => c.tags?.phase !== 'setup');
  const tSetup = performance.now();
  for (const c of setup) await ctx.ex.submit(c);
  ctx.extra.setupMs = Math.round(performance.now() - tSetup);
  ctx.P0 = await comp.currentPosition();
  log(`setup: ${setup.length} commands in ${ctx.extra.setupMs} ms; live phase from position ${ctx.P0}`);

  // Live phase: open-loop timeline + closed-loop readers + feed consumer + scenario hooks.
  let readersStop = false, feedStop = false;
  const cpu0 = process.cpuUsage(), wall0 = performance.now();
  const readers = Array.from({ length: opts.readers }, () => readerLoop(ctx, () => readersStop));
  const feed = feedLoop(ctx, () => feedStop);
  ctx.t0 = performance.now();
  const progress = setInterval(() => log(`  t=${Math.round((performance.now() - ctx.t0) / 1000)}s attempts=${ctx.ex.attempts.length} done=${ctx.ex.attempts.filter(a => a.doneAt).length} pending=${ctx.ex.pending} reads=${ctx.reads.length} feed=${ctx.feedSeen.length}`), 5000);
  const timeline = (async () => {
    const races = new Map();
    for (const c of liveCmds) if (c.tags?.race) { if (!races.has(c.tags.race)) races.set(c.tags.race, []); races.get(c.tags.race).push(c); }
    const sent = new Set();
    const byTime = [...liveCmds].sort((x, y) => x.at - y.at || x.index - y.index);
    for (const c of byTime) {
      if (sent.has(c.index) || c.tags?.manual) continue;
      const due = ctx.t0 + c.at;
      const wait = due - performance.now();
      if (wait > 0) await sleep(wait);
      if (c.tags?.race) { const group = races.get(c.tags.race); group.forEach(g => sent.add(g.index)); ctx.ex.submitRace(group, due); }
      else { sent.add(c.index); ctx.ex.submit(c, due); }
    }
  })();
  const during = hooks.during ? hooks.during(ctx) : Promise.resolve();
  await Promise.all([timeline, during]);
  const drained = await ctx.ex.drain(opts.drainTimeoutMs ?? 15 * 60_000);
  log(`live phase done: ${ctx.ex.attempts.length} attempts, drained=${drained}, reads=${ctx.reads.length}`);
  ctx.check('writer-drained', drained, `${ctx.ex.pending} commands still pending after the drain timeout`);
  clearInterval(progress);
  ctx.liveMs = performance.now() - ctx.t0;
  readersStop = true; await Promise.all(readers);
  const cpu = process.cpuUsage(cpu0); const wall = performance.now() - wall0;
  ctx.extra.clientCpuFraction = round((cpu.user + cpu.system) / 1000 / wall);
  ctx.Pend = await comp.currentPosition();
  const feedUntil = performance.now() + 120_000;
  // [EXP-W01b] Why: an initially empty feed is still behind Pend. Rejected: waiting only after
  // the first page (prematurely stops the consumer when the engine delays that first page).
  while ((ctx.feedSeen.at(-1)?.position ?? ctx.P0) < ctx.Pend && performance.now() < feedUntil) await sleep(50);
  feedStop = true; await feed;

  // Final state of every golden subject at latest, after quiescence.
  ctx.finals = {};
  // [EXP-W01b] Why: retry failed final I/O, retaining every failure. Rejected: retrying wrong
  // answers (could mask an inconsistent read) or discarding the first failure after recovery.
  ctx.extra.finalPullErrors = [];
  for (const sid of gen.digestSubjects) {
    let r;
    for (let t = 0; t < 5; t++) {
      r = await pullDigest(ctx, sid, { validAt: BT.NOW });
      if (r.ok) break;
      ctx.extra.finalPullErrors.push({ sid, attempt: t + 1, error: r.error });
      if (t < 4) await sleep(1000 * (t + 1));
    }
    ctx.finals[sid] = r;
  }
  log('final pulls done; checking'); await commonChecks(ctx);
  if (hooks.check) await hooks.check(ctx);
  await postRunOracle(ctx);
  return finish(ctx, checks, {});
}

async function commonChecks(ctx) {
  const { ex, check } = ctx;
  const committed = ex.attempts.filter(a => a.status === 'committed');
  // Outcomes against the golden (O-REPLAY expected-only): every non-race command commits iff the oracle says so.
  let outcomeMismatches = 0; const firstMismatch = [];
  for (const a of ex.attempts) {
    const cmd = ctx.gen.stream.commands[a.index];
    if (cmd.tags?.race || cmd.tags?.laneDependent) continue;
    const exp = ctx.expected.outcomes[a.index];
    const want = exp ? `rejected:${exp.category}` : 'committed';
    const got = a.status === 'committed' ? 'committed' : `${a.status}:${a.category}`;
    // O-REPLAY 0.2 documents the error tag (e.g. InvalidTripleError for a value outside int64): the tag must
    // match too. With no documented tag (null), any typed rejection of the right outcome counts.
    const tagOk = !exp?.errorTag || exp.errorTag === a.tag;
    const equivalent = (want === got && tagOk) || (!exp?.errorTag && want === 'rejected:invalid-value' && a.status === 'rejected' && ['invalid-value', 'write-error'].includes(a.category));
    if (!equivalent) { outcomeMismatches++; if (firstMismatch.length < 5) firstMismatch.push({ index: a.index, want, wantTag: exp?.errorTag ?? null, got, tag: a.tag, message: a.message }); }
  }
  check('outcomes-match-golden', outcomeMismatches === 0, { mismatches: outcomeMismatches, first: firstMismatch });
  // Receipts: unique txIds and positions; live-phase positions dense from P0 (no lost or duplicated commit).
  const positions = committed.map(a => a.receipt.position).sort((x, y) => x - y);
  const txIds = new Set(committed.map(a => a.receipt.txId));
  check('receipts-unique', txIds.size === committed.length && new Set(positions).size === positions.length, { committed: committed.length, txIds: txIds.size, positions: new Set(positions).size });
  const live = positions.filter(p => p > ctx.P0);
  const dense = live.every((p, i) => p === ctx.P0 + 1 + i) && (live.length === 0 || live[live.length - 1] === ctx.Pend);
  check('positions-dense', dense, { P0: ctx.P0, Pend: ctx.Pend, committedLive: live.length, firstGap: live.find((p, i) => p !== ctx.P0 + 1 + i) ?? null });
  // Feed: every committed live position exactly once, ascending, and nothing foreign.
  const seen = ctx.feedSeen.map(s => s.position);
  const seenSet = new Set(seen);
  const missing = live.filter(p => !seenSet.has(p));
  const dupes = seen.length - seenSet.size;
  const ascending = seen.every((p, i) => i === 0 || p > seen[i - 1]);
  const foreign = seen.filter(p => !live.includes(p));
  check('feed-no-gaps', missing.length === 0, { missing: missing.slice(0, 10), count: missing.length });
  check('feed-no-duplicates', dupes === 0 && ascending, { dupes, ascending });
  check('feed-no-foreign', foreign.length === 0, { foreign: foreign.slice(0, 10) });
  // Per-subject order: the feed order of each subject's commits equals its submission order.
  const posToIndex = new Map(committed.map(a => [a.receipt.position, a.index]));
  const bySubject = new Map();
  for (const s of ctx.feedSeen) for (const e of s.entities) { const sid = subjectOfEntity(ctx.unphys(e)); const l = bySubject.get(sid) ?? []; if (l[l.length - 1] !== s.position) l.push(s.position); bySubject.set(sid, l); }
  let orderViolations = 0;
  for (const [sid, ps] of bySubject) { const idx = ps.map(p => posToIndex.get(p)).filter(i => i !== undefined); if (idx.some((v, i) => i > 0 && v < idx[i - 1])) orderViolations++; }
  check('feed-per-subject-order', orderViolations === 0, { subjectsOutOfOrder: orderViolations });
  // Reads: every sampled read matched its golden state.
  const bad = ctx.reads.filter(r => !r.ok).length;
  const readErrors = ctx.reads.filter(r => r.error).length;
  check('reads-correct', bad === 0 && ctx.reads.length > 0, { reads: ctx.reads.length, failed: bad, wrongAnswers: bad - readErrors, readErrors, first: ctx.readFailures.slice(0, 3) });
  // Final state of each golden subject equals the golden after its last commit.
  let finalBad = 0; const firstFinal = [];
  for (const [sid, r] of Object.entries(ctx.finals)) {
    if ((ctx.gen.noDigestSubjects ?? []).includes(sid)) continue;
    const want = expectedDigest(ctx, sid, Infinity, BT.NOW);
    if (!r.ok || r.digest !== want) { finalBad++; if (firstFinal.length < 3) firstFinal.push({ sid, want, got: r.digest ?? null, error: r.error ?? null }); }
  }
  check('final-states-match-golden', finalBad === 0, { wrong: finalBad, first: firstFinal });
  // Witnesses (TARGETS 6.1 item 5): positive subjects must change in the live phase, negative ones must not.
  const setupIdx = new Set(ctx.gen.stream.commands.filter(c => c.tags?.phase === 'setup').map(c => c.index));
  const postSetup = sid => {
    const golden = ctx.expected.digests[sid] ?? ctx.world.digests[sid];
    let last = null;
    for (const e of ex.ledger.get(sid) ?? []) if (setupIdx.has(e.index)) last = e;
    return last ? golden?.after?.[last.index]?.[BT.NOW] : golden?.base?.[BT.NOW];
  };
  const finalOf = async sid => ctx.finals[sid] ?? (ctx.finals[sid] = await pullDigest(ctx, sid, { validAt: BT.NOW }));
  const w = ctx.gen.witnesses ?? { positive: [], negative: [] };
  check('witnesses-declared', w.positive.length > 0 && w.negative.length > 0, { positive: w.positive.length, negative: w.negative.length });
  const unchanged = [], changed = [];
  // Witnesses of another kind (domain, valid-time, erasure) change outside the live-phase writes: the database
  // check is then that no witness is written in the live phase; the scenario's own check judges the change.
  if (w.kind) {
    for (const sid of [...w.positive, ...w.negative]) { const f = await finalOf(sid); const live = (ex.ledger.get(sid) ?? []).filter(e => !setupIdx.has(e.index)); if (!f.ok || f.digest !== postSetup(sid) || live.length) changed.push(sid); }
    check(`${w.kind}-witnesses-not-written-in-live-phase`, changed.length === 0, { changed: changed.slice(0, 5), count: changed.length });
    return;
  }
  for (const sid of w.positive) { const f = await finalOf(sid); if (!f.ok || f.digest === postSetup(sid)) unchanged.push(sid); }
  for (const sid of w.negative) { const f = await finalOf(sid); const live = (ex.ledger.get(sid) ?? []).filter(e => !setupIdx.has(e.index)); if (!f.ok || f.digest !== postSetup(sid) || live.length) changed.push(sid); }
  check('positive-witnesses-changed', unchanged.length === 0, { notChanged: unchanged.slice(0, 5), count: unchanged.length, of: w.positive.length });
  check('negative-witnesses-unchanged', changed.length === 0, { changed: changed.slice(0, 5), count: changed.length, of: w.negative.length });
}

/** Receipt-mode O-REPLAY over the live phase: outcomes, receipt consistency, final states (races included). */
async function postRunOracle(ctx) {
  const { ex } = ctx;
  const workDir = path.join(ctx.opts.rawDir, `s${ctx.spec.id}-oracle`);
  fs.mkdirSync(workDir, { recursive: true });
  const cmds = ctx.gen.stream.commands;
  const subjects = [...new Set(ex.attempts.flatMap(a => ex.subjectsOf(cmds[a.index])))].sort();
  const lastCommittedBefore = new Map(); // subject -> sorted committed positions with doneAt
  for (const a of ex.attempts.filter(x => x.status === 'committed')) for (const s of ex.subjectsOf(cmds[a.index])) { const l = lastCommittedBefore.get(s) ?? []; l.push(a); lastCommittedBefore.set(s, l); }
  const keyOf = a => {
    if (a.status === 'committed') return a.receipt.position;
    const cmd = cmds[a.index];
    if (cmd.tags?.race) { const w = ex.attempts.find(x => cmds[x.index].tags?.race === cmd.tags.race && x.status === 'committed'); if (w) return w.receipt.position + 0.5; }
    let best = 0;
    for (const s of ex.subjectsOf(cmd)) for (const c of lastCommittedBefore.get(s) ?? []) if (c.doneAt <= a.sentAt && c.receipt.position > best) best = c.receipt.position;
    return best + 0.25 + a.index * 1e-9;
  };
  // A lane-dependent value the engine rejected with a typed error is judged by its own check, not by the replay.
  const ordered = ex.attempts.filter(a => !(cmds[a.index].tags?.laneDependent && a.status === "rejected")).sort((x, y) => keyOf(x) - keyOf(y));
  const chunkSize = 20, verdicts = []; let oracleFinalBad = 0; const firstBad = [];
  for (let i = 0; i < subjects.length; i += chunkSize) {
    const set = new Set(subjects.slice(i, i + chunkSize));
    const caseCommands = [], receipts = [], refsKept = new Set();
    for (const a of ordered) {
      const cmd = cmds[a.index];
      const mine = ex.subjectsOf(cmd).some(s => set.has(s));
      if (!mine) {
        if (a.status === 'committed') { receipts.push({ command: caseCommands.length, outcome: 'committed', txId: a.receipt.txId, position: a.receipt.position, instant: a.receipt.instant }); caseCommands.push({ kind: 'internal', expectedOutcome: 'committed', journaled: true }); }
        continue;
      }
      const operations = [], ids = [];
      cmd.operations.forEach((op, k) => {
        if (op.op === 'assert') { if (!set.has(subjectOfEntity(op.entityId))) return; refsKept.add(op.ref); operations.push(op); ids.push(ex.refIds.get(op.ref) ?? null); }
        else if (refsKept.has(op.target)) { operations.push(op); ids.push(null); }
      });
      const meta = { ...cmd.meta };
      const entry = { operations, meta, ...(cmd.tags?.race ? { race: cmd.tags.race } : {}) };
      const command = caseCommands.length;
      caseCommands.push(entry);
      if (a.status === 'committed') receipts.push({ command, outcome: a.unknown ? 'unknown' : 'committed', ...(a.unknown ? { resolvedOutcome: 'committed' } : {}), txId: a.receipt.txId, position: a.receipt.position, instant: a.receipt.instant, assertionIds: ids.map((id, k) => operations[k].op === 'assert' ? id : null) });
      // 'write-error' is not an O-REPLAY category (Triplex documents no tag for invalid values, R-CMD-9): omit it
      // so the oracle judges the outcome alone (PASS-OUTCOME-ONLY) instead of a category it cannot know.
      else receipts.push({ command, outcome: 'rejected', ...(a.category && a.category !== 'write-error' ? { category: a.category } : {}), error: { _tag: a.tag } });
    }
    if (ctx.P0 > 0 && caseCommands.length) { /* positions before the live phase are other commands */ }
    const queries = [];
    for (const sid of set) for (const entityId of subjectEntities(sid)) queries.push({ id: `${sid}|${entityId}`, kind: 'entityTriples', entityId, cut: { position: 'latest', validAt: BT.NOW } });
    const caseJson = { format: 'triplex-db-2/o-replay-case/1', caseId: `GS/${ctx.spec.id}/post-run/${ctx.opts.lane}/chunk-${i / chunkSize}`, defaultScope: 's1',
      adapter: { schemaVersion: 1 }, rules: {}, schemas: [], enforcement: { mode: 'off' }, initialPositions: { s1: setupFloor(ctx, ordered) }, commands: caseCommands, receipts, queries };
    const { caseSha256, result, notModeled } = await runOracle(caseJson, workDir);
    if (notModeled) { verdicts.push({ caseId: caseJson.caseId, caseSha256, verdict: "NOT-MODELED", reason: notModeled }); continue; }
    verdicts.push({ caseId: caseJson.caseId, caseSha256, verdict: result.verdict, receiptConsistency: result.receiptConsistency?.status, violations: result.receiptConsistency?.violations?.slice(0, 3),
      failedCommands: result.commandOutcomes.filter(o => o.verdict === 'FAIL').slice(0, 3).map(o => ({ command: o.command, expected: o.expected, observed: o.observed })) });
    const grouped = new Map();
    for (const q of result.queries) { const sid = q.id.split('|')[0]; grouped.set(sid, [...(grouped.get(sid) ?? []), ...(q.result?.raw ?? [])]); }
    for (const [sid, raw] of grouped) {
      const d = digestRows(raw.map(r => canonRow(r)));
      const fin = ctx.finals[sid] ?? await pullDigest(ctx, sid, { validAt: BT.NOW });
      if (!fin.ok || fin.digest !== d) { oracleFinalBad++; if (firstBad.length < 3) firstBad.push({ sid, oracle: d, observed: fin.digest ?? null }); }
    }
  }
  ctx.oracleCases = verdicts;
  const failing = verdicts.filter(v => v.verdict === 'FAIL');
  ctx.check('oracle-receipt-replay', failing.length === 0, { failingCases: failing.length, first: failing.slice(0, 2) });
  ctx.check('oracle-final-states', oracleFinalBad === 0, { wrong: oracleFinalBad, first: firstBad });
}

/** The case's initial position: setup commands are part of the case only through placeholders. */
function setupFloor(ctx, ordered) {
  const committed = ordered.filter(a => a.status === 'committed').map(a => a.receipt.position);
  return committed.length ? Math.min(...committed) - 1 : 0;
}

// ------------------------------------------------------------------ metrics, bars, verdict

export function metrics(ctx) {
  const done = ctx.ex.attempts.filter(a => a.doneAt && ctx.gen.stream.commands[a.index].tags?.phase !== 'setup');
  const lat = list => quantiles(list.map(a => a.doneAt - a.scheduledAt));
  const seenAt = new Map(ctx.feedSeen.map(s => [s.position, s.at]));
  const lags = done.filter(a => a.status === 'committed' && seenAt.has(a.receipt.position)).map(a => Math.max(0, seenAt.get(a.receipt.position) - a.doneAt));
  const liveReads = ctx.reads;
  const ok = liveReads.filter(r => r.ok).length;
  return {
    commit: {
      all: lat(done), scenario: lat(done.filter(a => !a.trace)), trace: lat(done.filter(a => a.trace)),
      service: quantiles(done.map(a => a.doneAt - a.sentAt)),
      serializationRetries: done.reduce((s, a) => s + a.conflicts, 0),
      outcomeUnknown: done.filter(a => a.unknown).length, transientRetries: done.reduce((s, a) => s + (a.transientRetries ?? 0), 0),
      unknownCauses: [...new Set(done.filter(a => a.unknown).map(a => String(a.unknown.message).slice(0, 80)))].slice(0, 5),
      byTemplate: Object.fromEntries([...new Set(done.map(a => a.template))].map(t => [t, lat(done.filter(a => a.template === t))])),
    },
    // TARGETS 2.1 item 4: the scenario overlay and the background trace are accounted for separately.
    accounting: Object.fromEntries(['trace', 'scenario'].map(k => { const list = done.filter(a => (k === 'trace') === a.trace); const offered = ctx.gen.stream.commands.filter(c => c.tags?.phase !== 'setup' && (k === 'trace') === !!c.tags?.trace).length;
      return [k, { offered, committed: list.filter(a => a.status === 'committed').length, rejectedTyped: list.filter(a => a.status === 'rejected').length, unaccounted: offered - list.filter(a => a.status === 'committed' || a.status === 'rejected').length }]; })),
    writer: { maxWaitMs: round(Math.max(0, ...done.map(a => a.doneAt - a.scheduledAt))), committed: done.filter(a => a.status === 'committed').length, rejected: done.filter(a => a.status === 'rejected').length },
    read: { ...quantiles(liveReads.map(r => r.ms)), correct: ok, wrong: liveReads.length - ok, errors: liveReads.filter(r => r.error).length, goodputPerSec: round(ok / Math.max(0.001, ctx.liveMs / 1000)) },
    feed: { lag: quantiles(lags), records: ctx.feedSeen.length, errors: ctx.feedErrors.length },
    liveMs: Math.round(ctx.liveMs), clientCpuFraction: ctx.extra.clientCpuFraction, extra: ctx.extra,
  };
}
const get = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
export function judgeBars(spec, m) {
  return (spec.bars ?? []).map(b => {
    const value = get(m, b.metric);
    const ok = value != null && (b.op === '<=' ? value <= b.value : b.op === '>=' ? value >= b.value : b.op === '==' ? value === b.value : false);
    return { ...b, observed: value ?? null, ok };
  });
}

function finish(ctx, checks, extra) {
  const m = ctx.ex.attempts.length ? metrics(ctx) : null;
  const bars = m ? judgeBars(ctx.spec, m) : [];
  const failedChecks = checks.filter(c => !c.ok);
  const failedBars = bars.filter(b => !b.ok);
  const clientSaturated = m && m.clientCpuFraction > 0.9;
  const verdict = extra.aborted ? 'FAIL' : clientSaturated ? 'INVALID' : (failedChecks.length || failedBars.length) ? 'FAIL' : 'PASS';
  // Split verdicts so a fail-closed domain seam does not hide what the database did.
  const dbFailed = failedChecks.filter(c => c.counts !== 'domain');
  const domainFailed = failedChecks.filter(c => c.counts === 'domain');
  return {
    scenario: ctx.spec.id, slug: ctx.spec.slug, verdict, prefix: ctx.prefix, params: ctx.params, ...extra,
    verdicts: { database: extra.aborted ? 'FAIL' : dbFailed.length ? 'FAIL' : 'PASS', bars: failedBars.length ? 'FAIL' : 'PASS',
      domain: domainFailed.length ? (domainFailed.every(c => String(c.detail).startsWith('O-DOMAIN not available')) ? 'UNAVAILABLE' : 'FAIL') : (ctx.domainRequests?.length ? 'PASS' : 'NONE') },
    domainRequests: ctx.domainRequests ?? [], subSchedules: ctx.subSchedules ?? {},
    correctness: { pass: checks.filter(c => c.ok).length, fail: failedChecks.length, checks: checks.length > 200 ? [...failedChecks, { id: `(${checks.length - failedChecks.length} passing checks elided)`, ok: true }] : checks },
    bars, metrics: m, positions: { P0: ctx.P0 ?? null, Pend: ctx.Pend ?? null }, oracleCases: ctx.oracleCases ?? [],
    firstFailures: [...dbFailed.slice(0, 5).map(c => ({ check: c.id, detail: c.detail })), ...failedBars.slice(0, 5).map(b => ({ bar: b.id ?? b.metric, observed: b.observed, want: `${b.op} ${b.value}` }))],
    readFailures: ctx.readFailures,
    diagnostics: diagnostics({ attempts: ctx.ex.attempts, readFailures: [...ctx.readFailures, ...(ctx.extra.finalPullErrors ?? [])], feedErrors: ctx.feedErrors, failedChecks, failedBars }),
  };
}
