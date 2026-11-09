#!/usr/bin/env node
// lab/bin/heavy.mjs [--label TEXT] -- <cmd...>
// At most 4 concurrent heavy local commands (typecheck, full test runs) across all agents and
// worktrees (PLAN section 7). Waits with a visible message, then runs the command.
// [EXP-000] Why: four mkdir token directories lab/locks/heavy/<1..4>; a token whose owner pid is
// dead is stale and broken. Rejected: a counter file (needs its own lock and crash recovery).
import { spawn } from 'node:child_process';
import { acquireHeavy } from './heavy-lock.mjs';
import { fail, main, parseArgs } from './lib.mjs';

main(async () => {
  const { options } = parseArgs(process.argv.slice(2));
  const command = options['--'];
  if (!command?.length) fail('USAGE', 'usage: heavy.mjs [--label TEXT] -- <cmd...>');
  // [EXP-W02-R2] Why: contested short gaps can starve a builder's ordered setup/checks at 1 s polling. Rejected: increasing HEAVY_SLOTS (would change the lab resource limit).
  const pollMs = Number(options['poll-ms'] ?? 1000);
  if (!Number.isSafeInteger(pollMs) || pollMs < 100 || pollMs > 30000) fail('USAGE', '--poll-ms must be an integer from 100 to 30000');
  const release = await acquireHeavy(options.label ?? command.join(' '), { pollMs });
  const code = await new Promise(resolve => {
    const child = spawn(command[0], command.slice(1), { stdio: 'inherit' });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
    child.on('close', (exit, signal) => resolve(exit ?? (signal ? 128 : 1)));
    child.on('error', error => { process.stderr.write(`[lab] ${error.message}\n`); resolve(127); });
  });
  release();
  process.exitCode = code;
});
