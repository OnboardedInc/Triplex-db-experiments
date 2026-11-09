// [CX-VCHECKJS] Why: test actual heavy admission with live owner PIDs in isolated
// reviewer locks. Rejected: occupying or rewriting the shared production tokens.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

export async function admissionProbe(root, out) {
  const scratch = fs.mkdtempSync(path.join(out, 'admission-'));
  const locks = path.join(scratch, 'locks');
  let child;
  try {
    for (const index of [1, 2, 3, 4]) {
      const token = path.join(locks, 'heavy', String(index));
      fs.mkdirSync(token, { recursive: true });
      fs.writeFileSync(path.join(token, 'owner.json'), JSON.stringify({ pid: process.pid, label: 'CX-VCHECKJS-isolated-holder', at: new Date().toISOString() }));
    }
    let stdout = '', stderr = '';
    const script = `const fs = require('node:fs'); const path = require('node:path');
const dir = path.join(process.env.TX2_LOCKS_DIR, 'heavy');
const owners = fs.readdirSync(dir).map(s => ({ slot: s, ...JSON.parse(fs.readFileSync(path.join(dir, s, 'owner.json'))) }));
const own = owners.filter(o => o.pid === process.ppid);
if (own.length !== 1) process.exit(81);
console.log(JSON.stringify({ parentPid: process.ppid, own, ownerCount: owners.length }));`;
    child = spawn(process.execPath, ['lab/bin/heavy.mjs', '--label', 'CX-VCHECKJS-isolated-child', '--poll-ms', '100', '--', process.execPath, '-e', script], {
      cwd: root, env: { ...process.env, TX2_LOCKS_DIR: locks, TX2_HEAVY_SLOTS: '4' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const closed = once(child, 'close');
    const waiting = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('heavy did not announce contention')), 10000);
      child.stderr.on('data', data => {
        stderr += data;
        if (stderr.includes('waiting for one of 4 slots')) { clearTimeout(timeout); resolve(); }
      });
    });
    child.stdout.on('data', data => { stdout += data; });
    await waiting;
    assert.equal(stdout, '', 'child ran before admission');
    for (const index of [1, 2, 3, 4]) assert.equal(JSON.parse(fs.readFileSync(path.join(locks, 'heavy', String(index), 'owner.json'))).pid, process.pid);
    fs.rmSync(path.join(locks, 'heavy', '4'), { recursive: true });
    const [code, signal] = await closed;
    assert.equal(code, 0); assert.equal(signal, null);
    const observation = JSON.parse(stdout);
    assert.equal(observation.parentPid, child.pid);
    assert.equal(observation.own[0].slot, '4');
    assert.equal(observation.ownerCount, 4);
    assert(!fs.existsSync(path.join(locks, 'heavy', '4')), 'owned token not released');
    const result = { waitingWithAllFourOwned: true, childDidNotRunBeforeRelease: true,
      admittedUnderWrapperPid: observation, releasedAfterExit: true, stdout, stderr };
    fs.writeFileSync(path.join(out, 'admission.json'), JSON.stringify(result, null, 2) + '\n');
    return result;
  } finally {
    if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'close'); }
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
