#!/usr/bin/env node
// node lab/bench/wait-slot.mjs --after EXP-X05 [--need-gib 3.5] [--every-s 180] [--max-h 12]
// Polls `lab/bin/engine.mjs status` until the named predecessor has held a slot and released it (its
// containers and reservations are gone) and the pool admits one more slot of --need-gib. Exits 0 then,
// printing the free exclusive slots; exits 2 on timeout. Read-only: it never starts or stops anything.
// [EXP-N01] Why: the lab's exclusive slot queue (lab/STATE.md) orders N01's A0 after X05.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
/** @param {string} k @param {string} d */
const opt = (k, d) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
const after = opt('after', 'EXP-X05');
const need = Number(opt('need-gib', '3.5'));
const every = Number(opt('every-s', '180')) * 1000;
const deadline = Date.now() + Number(opt('max-h', '12')) * 3600_000;
const root = path.resolve(import.meta.dirname, '../..');
let seen = opt('seen', 'no') === 'yes';
for (;;) {
  const out = spawnSync(process.execPath, [path.join(root, 'lab/bin/engine.mjs'), 'status'], { encoding: 'utf8' }).stdout ?? '';
  const present = out.includes(after);
  if (present) seen = true;
  const m = /pool: ([\d.]+) GiB of ([\d.]+) GiB reserved/.exec(out);
  const admissible = m ? Number(m[1]) + need <= Number(m[2]) : false;
  const free = out.split('\n').filter(l => /^(xtdb|qlever)-s\d/.test(l) && /\s-\s+-\s+-\s+-\s*$/.test(l)).map(l => l.split(/\s+/)[0]);
  const stamp = new Date().toISOString().slice(11, 19);
  console.log(`[${stamp}] ${after} ${present ? 'present' : seen ? 'gone' : 'not seen yet'}; pool ${m ? `${m[1]}/${m[2]}` : '?'} GiB; admissible ${admissible}; free ${free.join(',')}`);
  if (seen && !present && admissible) { console.log(`READY: ${free.join(' ')}`); process.exit(0); }
  if (Date.now() > deadline) { console.log('TIMEOUT'); process.exit(2); }
  await new Promise(r => setTimeout(r, every));
}
