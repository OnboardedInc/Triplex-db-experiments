// @ts-nocheck -- [EXP-CHECKJS] unannotated lock label and runtime error inspection. Binding errors remain checked by lab/bin/checkjs.mjs.
// Heavy-command semaphore shared by heavy.mjs and gate.mjs (EXP-000).
import fs from 'node:fs';
import path from 'node:path';
import { LOCKS, atomicJson, breakStaleLock, now, pidAlive, readJson, sleep } from './lib.mjs';

export const HEAVY_SLOTS = Number(process.env.TX2_HEAVY_SLOTS ?? 4);
const dir = () => path.join(LOCKS, 'heavy');

/** Take one of HEAVY_SLOTS tokens for this process; returns a release function. */
export async function acquireHeavy(label, { pollMs = 1000 } = {}) {
  fs.mkdirSync(dir(), { recursive: true });
  let announced = 0;
  for (;;) {
    for (let index = 1; index <= HEAVY_SLOTS; index++) {
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
      }
    }
    if (Date.now() - announced > 30_000) {
      const holders = fs.readdirSync(dir()).filter(name => /^\d+$/.test(name))
        .map(name => readJson(path.join(dir(), name, 'owner.json'), null)).filter(Boolean)
        .map(owner => `pid ${owner.pid} "${owner.label}"`);
      process.stderr.write(`[lab] heavy: waiting for one of ${HEAVY_SLOTS} slots; held by ${holders.join(', ')}\n`);
      announced = Date.now();
    }
    await sleep(pollMs);
  }
}
