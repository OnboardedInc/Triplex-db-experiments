/** Finite real-PID component helper; no journal, service, network or Docker calls. */
import assert from 'node:assert/strict';
import { processIdentity, sameProcess } from '../io.mjs';
const [mode, text, expected] = process.argv.slice(2);
if (mode === 'target') {
  process.stdout.write(JSON.stringify({ ready: true, pid: process.pid }) + '\n');
  setTimeout(() => process.exit(0), 90_000);
} else {
  assert.equal(mode, 'inspect'); const pid = Number(text); assert(Number.isSafeInteger(pid) && pid > 0);
  process.stdout.write(JSON.stringify({ callerTimezone: process.env.TZ, callerLocale: process.env.LC_ALL,
    identity: await processIdentity(pid), sameExpected: Boolean(await sameProcess({ pid, identity: expected })) }) + '\n');
}
