import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { before, after, test } from 'node:test';
import { processIdentity, sameProcess } from '../io.mjs';
const exec = promisify(execFile), helper = fileURLToPath(new URL('../fixtures/process-identity-probe.mjs', import.meta.url));
let child, closed, birth;
before(async () => {
  child = spawn(process.execPath, [helper, 'target'], { stdio: ['ignore', 'pipe', 'ignore'] });
  closed = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal })); });
  const ready = await new Promise((resolve, reject) => {
    let text = ''; child.stdout.on('data', bytes => { text += bytes; if (text.includes('\n')) resolve(JSON.parse(text)); });
    child.once('error', reject); child.once('exit', () => reject(Error('OWNED_PID_EXITED_BEFORE_READY')));
  });
  assert.equal(ready.pid, child.pid); birth = await processIdentity(child.pid); assert(birth);
});
after(async () => { if (child) { child.kill('SIGTERM'); await closed; assert.equal(await processIdentity(child.pid), null); } });
const inspect = async (timezone, locale = 'C') => {
  const value = await exec(process.execPath, [helper, 'inspect', String(child.pid), birth], {
    env: { ...process.env, TZ: timezone, LC_ALL: locale, LANG: locale }, timeout: 5000, maxBuffer: 4096,
  });
  assert.equal(value.stderr, ''); return JSON.parse(value.stdout);
};
test('live PID birth agrees across UTC, New York and Tokyo callers', async () => {
  for (const zone of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
    const actual = await inspect(zone); assert.equal(actual.identity, birth); assert.equal(actual.sameExpected, true);
  }
});
test('raw legacy ps observation retains the caller-timezone counterexample', async () => {
  const raw = async TZ => {
    const { stdout } = await exec('ps', ['-p', String(child.pid), '-o', 'lstart=,stat='], { env: { ...process.env, TZ, LC_ALL: 'C', LANG: 'C' } });
    return /^(.*\S)\s+(\S+)$/.exec(stdout.trim())[1];
  };
  assert.equal(await raw('UTC'), birth); assert.notEqual(await raw('America/New_York'), birth);
});
test('live PID birth ignores caller locale after fixed C-locale observation', async () => {
  const value = await inspect('America/New_York', 'en_US.UTF-8'); assert.equal(value.identity, birth); assert.equal(value.sameExpected, true);
});
test('live PID with a wrong birth is refused', async () => {
  assert.equal(await sameProcess({ pid: child.pid, identity: `${birth} WRONG_BIRTH` }), false);
});
test('invalid and genuinely exited owned PID are refused', async () => {
  for (const pid of [0, -1, 1.5, Number.NaN]) assert.equal(await processIdentity(pid), null);
  const short = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' });
  await new Promise((resolve, reject) => { short.once('error', reject); short.once('close', resolve); });
  assert.equal(await processIdentity(short.pid), null); assert(!await sameProcess({ pid: short.pid, identity: birth }));
});
test('legacy local-time history is neither accepted as a new birth nor rewritten', async () => {
  const legacy = Object.freeze({ pid: child.pid, identity: 'Fri Nov  6 19:26:56 2026', status: 'released', registeredAt: '2026-11-07T00:27:10.358Z' });
  const before = JSON.stringify(legacy); assert(!await sameProcess(legacy)); assert.equal(JSON.stringify(legacy), before);
});
