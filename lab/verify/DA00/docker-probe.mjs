#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// [CX-VDA00] Why: engine.mjs remains the lifecycle/pool owner while independent tests are mounted read-only. Rejected: unmanaged docker run.
const root = path.resolve(import.meta.dirname);
const args = process.argv.slice(2);
const nameAt = args.indexOf('--name');
if (args.includes('run') && nameAt >= 0 && args[nameAt + 1] === 'tx2-datomic-selftest') {
  if (!args.includes('--rm') || !args.includes('none') || args.at(-1) !== 'selftest') throw new Error('Unexpected selftest invocation');
  args.splice(args.indexOf('run') + 1, 0,
    '-v', `${process.env.CX_VDA00_SELFTEST_FILE ?? root + '/selftest.clj'}:/opt/gateway/src/triplex/gateway/selftest.clj:ro`,
    '-v', `${root}/evidence/codec-wire.jsonl:/verify/codec-wire.jsonl:ro`);
  fs.appendFileSync(path.join(root, 'evidence/probe-command.jsonl'), JSON.stringify({ at: new Date().toISOString(), args }) + '\n');
}
const r = spawnSync('/opt/homebrew/bin/docker', args, { stdio: 'inherit' });
process.exit(r.status ?? 1);
