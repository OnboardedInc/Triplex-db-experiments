import fs from 'node:fs';
import { spawn } from 'node:child_process';
// [CX-VP5A] Why: disk may change while heavy admission waits. Rejected: checking only before joining the queue.
const space = fs.statfsSync('.');
const availableBytes = space.bsize * space.bavail;
process.stderr.write(JSON.stringify({ gate: 'reviewer-disk-preflight', availableBytes, minimumBytes: 5 * 1024 ** 3 }) + '\n');
if (availableBytes < 5 * 1024 ** 3) process.exit(78);
const [command, ...args] = process.argv.slice(2);
const child = spawn(command, args, { stdio: 'inherit' });
child.once('error', e => { process.stderr.write(String(e)); process.exitCode = 1; });
child.once('exit', code => { process.exitCode = code ?? 1; });
