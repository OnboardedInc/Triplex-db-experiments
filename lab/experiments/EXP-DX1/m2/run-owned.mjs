import { spawn } from 'node:child_process';
// [DX-M2] Why: terminate the whole owned test-client group before engine cleanup.
// Rejected: killing only the shell (its test workers can outlive the lease).
const [command, ...args] = process.argv.slice(2);
const child = spawn(command, args, {
  stdio: 'inherit', detached: true,
  env: { ...process.env, M2_OWNED_CHILD: '1' },
});
let stopping = false;
const kill = signal => { try { process.kill(-child.pid, signal); } catch (e) { if (e.code !== 'ESRCH') throw e; } };
function stop() {
  if (stopping) return;
  stopping = true;
  kill('SIGTERM');
  // Keep this timer referenced even when the direct child exits first.
  setTimeout(() => { kill('SIGKILL'); process.exit(124); }, 500);
}
const timer = setTimeout(stop, 1000000);
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
child.once('error', error => { console.error(error); clearTimeout(timer); process.exit(127); });
child.once('exit', (code, signal) => {
  clearTimeout(timer);
  if (!stopping) process.exit(code ?? (signal ? 1 : 0));
});
