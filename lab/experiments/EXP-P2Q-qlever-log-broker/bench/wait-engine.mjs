#!/usr/bin/env node
// Poll lab/bin/engine.mjs status until the shared QLever dev resident is healthy or the pool can admit a
// 3.5 GiB QLever slot (it never starts or stops anything). Prints one line and exits.
// usage: node wait-engine.mjs [maxMinutes=25]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const maxMs = Number(process.argv[2] ?? 25) * 60_000;
const t0 = Date.now();
for (;;) {
  let out = '';
  try {
    out = execFileSync('node', [path.join(REPO, 'lab/bin/engine.mjs'), 'status'], {
      encoding: 'utf8', env: { ...process.env, DOCKER_HOST: 'unix:///Users/sam/.colima/triplex2/docker.sock' },
    });
  } catch (error) { out = String(error.stdout ?? ''); }
  const dev = out.split('\n').find((l) => l.startsWith('qlever-dev')) ?? '';
  const reserved = Number(/pool: ([0-9.]+) GiB/.exec(out)?.[1] ?? NaN);
  if (!process.argv.includes('--pool-only') && /running\/healthy/.test(dev)) { console.log(`DEV-UP ${dev.replace(/\s+/g, ' ')}`); process.exit(0); }
  if (reserved + 3.5 <= 11) { console.log(`POOL-FREE reserved=${reserved}`); process.exit(0); }
  if (Date.now() - t0 > maxMs) { console.log(`TIMEOUT reserved=${reserved} dev=${dev.replace(/\s+/g, ' ')}`); process.exit(0); }
  await new Promise((r) => setTimeout(r, 15_000));
}
