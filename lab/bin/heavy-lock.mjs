// @ts-nocheck -- [EXP-CHECKJS] unannotated lock label and runtime error inspection. Binding errors remain checked by lab/bin/checkjs.mjs.
// Heavy-command semaphore shared by heavy.mjs and gate.mjs (EXP-000), plus the measurement lease (EXP-M01).
import fs from 'node:fs';
import path from 'node:path';
import { LOCKS, atomicJson, breakStaleLock, now, pidAlive, readJson, sleep } from './lib.mjs';

export const HEAVY_SLOTS = Number(process.env.TX2_HEAVY_SLOTS ?? 4);
const dir = () => path.join(LOCKS, 'heavy');
const leaseDir = () => path.join(LOCKS, 'measure-lease');

/** The measurement lease owner, `stale: true` when its pid is dead, or null. */
export function readMeasureLease() {
  const owner = readJson(path.join(leaseDir(), 'owner.json'), null);
  if (!owner) return null;
  return pidAlive(owner.pid) ? owner : { ...owner, stale: true };
}

/** Try once to take heavy token `index`; breaks a stale token. Returns a release function or null. */
function takeToken(index, label) {
  const token = path.join(dir(), String(index));
  try {
    fs.mkdirSync(token);
    atomicJson(path.join(token, 'owner.json'), { pid: process.pid, label, at: now() });
    let released = false;
    const release = () => { if (!released) { released = true; fs.rmSync(token, { recursive: true, force: true }); } };
    process.on('exit', release);
    return release;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const owner = readJson(path.join(token, 'owner.json'), null);
    const age = Date.now() - (fs.statSync(token, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
    if ((owner && !pidAlive(owner.pid)) || (!owner && age > 30_000)) breakStaleLock(token);
    return null;
  }
}
const holders = () => fs.readdirSync(dir()).filter(name => /^\d+$/.test(name))
  .map(name => readJson(path.join(dir(), name, 'owner.json'), null)).filter(Boolean).map(owner => `pid ${owner.pid} "${owner.label}"`);

/**
 * Take one of HEAVY_SLOTS tokens for this process; returns a release function.
 * [EXP-M01] While another process holds a live measurement lease, no new token is handed out (the lease drains the
 * pool instead of competing for it). The lease holder itself already holds every token, so its own heavy steps
 * pass at once with a no-op release.
 */
export async function acquireHeavy(label, { pollMs = 1000 } = {}) {
  fs.mkdirSync(dir(), { recursive: true });
  let announced = 0;
  for (;;) {
    const lease = readMeasureLease();
    if (lease && !lease.stale && lease.pid === process.pid) return () => {};
    if (!lease || lease.stale) {
      for (let index = 1; index <= HEAVY_SLOTS; index++) {
        const release = takeToken(index, label);
        if (release) return release;
      }
    }
    if (Date.now() - announced > 30_000) {
      process.stderr.write(lease && !lease.stale
        ? `[lab] heavy: waiting; measurement lease held by pid ${lease.pid} "${lease.label}" since ${lease.at}\n`
        : `[lab] heavy: waiting for one of ${HEAVY_SLOTS} slots; held by ${holders().join(', ')}\n`);
      announced = Date.now();
    }
    await sleep(pollMs);
  }
}

/**
 * Measurement lease (RULINGS Q60h; R22 section 3 "Measurement lease"): a paired-rounds window takes every heavy token
 * and freezes pool admission (lab/bin/engine.mjs `up` refuses anyone but the lease holder) for its duration.
 * Order: the lease directory first, so new heavy commands stop starting, then each token as its holder finishes.
 * [EXP-M01] Why: two arms measured at the same time share host noise only if nothing else heavy starts during the
 * window; a typecheck or test run starting mid-round is exactly the regime change R22 blames for the 2x-3x swings.
 * Rejected: pausing other agents' engines or repinning the dev residents (never without Sam; another holder's engine
 * is never stopped or recreated).
 */
export async function acquireMeasureLease(label, { holder, pollMs = 1000, timeoutMs = Infinity } = {}) {
  fs.mkdirSync(dir(), { recursive: true });
  const started = Date.now();
  let announced = 0;
  for (;;) {
    try {
      fs.mkdirSync(leaseDir());
      atomicJson(path.join(leaseDir(), 'owner.json'), { pid: process.pid, label, holder: holder ?? null, at: now() });
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const owner = readJson(path.join(leaseDir(), 'owner.json'), null);
      const age = Date.now() - (fs.statSync(leaseDir(), { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
      if ((owner && !pidAlive(owner.pid)) || (!owner && age > 30_000)) { breakStaleLock(leaseDir()); continue; }
      if (Date.now() - started > timeoutMs) throw Object.assign(new Error(`measurement lease held by pid ${owner?.pid} "${owner?.label}"`), { code: 'LEASE_TIMEOUT' });
      await sleep(pollMs);
    }
  }
  const releases = new Map();
  const releaseAll = () => {
    for (const r of releases.values()) r();
    releases.clear();
    const owner = readJson(path.join(leaseDir(), 'owner.json'), null);
    if (owner?.pid === process.pid) fs.rmSync(leaseDir(), { recursive: true, force: true });
  };
  process.on('exit', releaseAll);
  try {
    while (releases.size < HEAVY_SLOTS) {
      for (let index = 1; index <= HEAVY_SLOTS; index++) {
        if (releases.has(index)) continue;
        // [EXP-M01R] Why: heavy.mjs waits for its single child while retaining a token; borrow that exact parent permit so a wrapped PAIR can drain the pool. Rejected: releasing another process's token or bypassing the other tokens.
        const parent = readJson(path.join(dir(), String(index), 'owner.json'), null);
        const r = parent?.pid === process.ppid ? () => {} : takeToken(index, `measure-lease ${label}`);
        if (r) releases.set(index, r);
      }
      if (releases.size === HEAVY_SLOTS) break;
      if (Date.now() - started > timeoutMs) throw Object.assign(new Error(`heavy tokens still held by ${holders().join(', ')}`), { code: 'LEASE_TIMEOUT' });
      if (Date.now() - announced > 30_000) { process.stderr.write(`[lab] measurement lease: waiting for ${HEAVY_SLOTS - releases.size} heavy tokens; held by ${holders().filter(h => !h.includes(`pid ${process.pid} `)).join(', ')}\n`); announced = Date.now(); }
      await sleep(pollMs);
    }
  } catch (error) { releaseAll(); throw error; }
  return { release: releaseAll, owner: readJson(path.join(leaseDir(), 'owner.json'), null), waitedMs: Date.now() - started, tokens: HEAVY_SLOTS };
}
