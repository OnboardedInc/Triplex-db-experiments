#!/usr/bin/env node
// [DX-V01] Why: preserve the lab command entry point and enable the same Node TypeScript loader as INT1.
// Rejected: requiring a separate scorecard package or a global TypeScript loader.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const child = spawn(process.execPath, [
  '--no-warnings', '--experimental-transform-types',
  // [DX-THIN1] Why: the reader diagnostic keeps its gated command line beside the realistic card's staged runner.
  // Rejected: one parser that accepts both and could silently ignore a study option on a card arm.
  fileURLToPath(new URL(process.argv.includes('--read-study') ? 'lab/experiments/EXP-DX1/v01/study-run.ts'
    : 'lab/experiments/EXP-DX1/v01/run.ts', root)), ...process.argv.slice(2),
], { cwd: fileURLToPath(root), stdio: 'inherit' });
const stop = () => { child.kill('SIGTERM'); };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('close', (code) => { process.exitCode = code ?? 1; });
