#!/usr/bin/env node
// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-W02] Why: W0 v2 is the live entry; W01 stays inspectable as an explicit diagnostic.
// Rejected: silently falling back to the retired vocabulary when v2 or a lane adapter refuses.
import { spawn } from 'node:child_process';
const args = process.argv.slice(2), legacy = args.includes('--legacy-diagnostic');
const entry = new URL(legacy ? './legacy.mjs' : './v2/run.ts', import.meta.url).pathname;
const child = spawn(process.execPath, [...(legacy ? [] : ['--experimental-strip-types']), entry, ...args.filter(a => a !== '--legacy-diagnostic')], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { process.stderr.write(String(error) + '\n'); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 128 : 1); });
