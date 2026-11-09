// @ts-nocheck -- [EXP-CHECKJS] unannotated dynamic parameters; runtime error inspection. Binding errors remain checked by lab/bin/checkjs.mjs.
// A registered process-group leader waits for the durable START handshake.
// The parent keeps stdin open. Parent death closes it and tears down this group,
// preventing an unrecorded job launch between spawn and PID publication.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import { atomicJson, assert, now, readJson } from './io.mjs';

const request = await readJson(process.argv[2]);
const owner = await readJson(join(dirname(process.argv[2]), 'owner.json'));
assert(owner.token === request.token && owner.directory === dirname(process.argv[2]), 'WORKER_OWNER', 'Worker ownership token differs');
let started = false;
let finished = false;
let terminating = false;
let buffered = '';
function terminate() {
  if (finished || terminating) return;
  terminating = true;
  try { process.kill(-process.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  setTimeout(() => { try { process.kill(-process.pid, 'SIGKILL'); } catch { process.exitCode = 137; } }, request.graceMilliseconds);
}
process.on('SIGTERM', () => { if (!terminating) terminate(); });
process.on('SIGINT', terminate);
process.stdin.on('end', () => { if (started) terminate(); else process.exit(65); });
process.stdin.on('data', data => {
  buffered += data.toString('utf8');
  if (!buffered.includes('\n')) return;
  assert(!started && buffered.trim() === 'START ' + request.token, 'WORKER_START', 'Invalid worker START handshake');
  started = true;
  const child = spawn(request.argv[0], request.argv.slice(1), { cwd: request.cwd, env: request.env, stdio: ['ignore', 'inherit', 'inherit'], shell: false, detached: false });
  const finish = async value => {
    if (finished) return;
    finished = true;
    await atomicJson(join(dirname(process.argv[2]), 'main-outcome.json'), { format: 'triplex-devloop-command-outcome/1', at: now(), ...value }, { exclusive: true });
    process.stdin.pause();
    process.exit(value.code === 0 ? 0 : 1);
  };
  child.once('error', error => finish({ code: null, signal: null, spawnError: error.message, pid: child.pid ?? null }));
  child.once('exit', (code, signal) => finish({ code, signal, pid: child.pid }));
});
