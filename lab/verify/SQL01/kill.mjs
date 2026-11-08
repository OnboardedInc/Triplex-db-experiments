// [EXP-SQL01] Why: parent retains observed ACKs and cursors outside the killed process. Rejected: a surviving worker masquerading as a process crash.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
const root = path.resolve('lab/verify/SQL01/data/kill-' + randomUUID());
const acks = new Map(), rounds = [], feedSeen = [], errors = [];
let cursor = null;
const modes = ['before-append', 'inflight', 'after-append', 'after-sidecar', 'acked'];
for (let cycle = 0; cycle <= 50; cycle++) {
  const mode = cycle === 50 ? 'verify' : modes[cycle % modes.length];
  const child = spawn(process.execPath, ['--import', 'tsx', 'lab/verify/SQL01/kill-child.ts', root, String(cycle), mode, JSON.stringify(cursor)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let pending = '', stderr = '', recovery, barrier, timedOut = false;
  const events = [];
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 30_000);
  child.stderr.on('data', b => stderr += b);
  child.stdout.on('data', b => {
    pending += b;
    for (;;) {
      const nl = pending.indexOf('\n'); if (nl < 0) break;
      const line = pending.slice(0, nl); pending = pending.slice(nl + 1);
      let x; try { x = JSON.parse(line); } catch { continue; }
      events.push(x.event === 'recovered' ? { event: x.event, count: x.recovered.length, feedPositions: x.feedPositions } : x);
      if (x.event === 'recovered') {
        recovery = x;
        const recovered = new Map(x.recovered.map(r => [r.op, r]));
        for (const [op, pos] of acks) {
          const r = recovered.get(op);
          const expected = Array.from({ length: 10 }, (_, j) => op + '/' + j).sort();
          if (!r || r.receipt.positions[0] !== pos || r.claim?.position !== pos || !r.eligible || JSON.stringify(r.rows) !== JSON.stringify(expected)) errors.push({ cycle, op, pos, recovered: r });
        }
        cursor = x.cursor; feedSeen.push(...x.feedPositions);
      }
      if (x.event === 'acked') acks.set(x.op, x.position);
      if (x.event === 'barrier') {
        barrier = x.point;
        if (mode === 'inflight') setTimeout(() => child.kill('SIGKILL'), Math.floor(cycle / 5) % 6);
        else child.kill('SIGKILL');
      }
    }
  });
  const result = await new Promise(resolve => child.on('close', (code, signal) => resolve({ code, signal })));
  clearTimeout(timer);
  rounds.push({ cycle, mode, result, timedOut, barrier, recovered: recovery?.recovered.length, stderr, events });
  if (!recovery || timedOut || (cycle < 50 && (!barrier || result.signal !== 'SIGKILL')) || (cycle === 50 && result.code !== 0)) errors.push({ cycle, reason: 'incomplete cycle', stderr, result });
  fs.writeFileSync('lab/verify/SQL01/evidence/kills.json', JSON.stringify({ root, acknowledged: acks.size, acks: [...acks], feedSeen, cursor, errors, rounds }, null, 2));
  if (errors.length) throw Error('kill checks failed: ' + JSON.stringify(errors.slice(0, 2)));
}
const duplicates = feedSeen.filter((v, i) => feedSeen.indexOf(v) !== i);
const missing = [...acks.values()].filter(p => !feedSeen.includes(p));
if (duplicates.length || missing.length) throw Error('feed mismatch ' + JSON.stringify({ duplicates, missing }));
console.log(JSON.stringify({ kills: 50, acknowledged: acks.size, lost: errors.length, feedPositions: feedSeen.length, feedDuplicates: duplicates.length, feedMissing: missing.length, root }));
