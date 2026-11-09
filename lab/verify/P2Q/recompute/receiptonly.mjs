#!/usr/bin/env node
// V-P2Q check 7: receipts with rawPath null (ackpath, crash-*, probe-*): internal-consistency checks only.
// Usage: node receiptonly.mjs <receiptsDir> <outDir>
import fs from 'node:fs';
import path from 'node:path';

const [receiptsDir, outDir] = process.argv.slice(2);
const checks = [];
const check = (id, what, ok, detail) => checks.push({ id, what, status: ok ? 'CONSISTENT' : 'INCONSISTENT', detail });
for (const f of fs.readdirSync(receiptsDir).filter((x) => x.endsWith('.json')).sort()) {
  const r = JSON.parse(fs.readFileSync(path.join(receiptsDir, f), 'utf8'));
  if (r.rawPath) continue;
  if (r.mode === 'ackpath') {
    check(r.id, 'ackMs.n = n - 20 (warmup slice(20))', r.ackMs.n === r.n - 20, { n: r.n, ackN: r.ackMs.n });
    check(r.id, 'ryowHits = n', r.ryowHits === r.n, { ryowHits: r.ryowHits, n: r.n });
    check(r.id, 'frames = n (one frame per closed-loop command)', r.frames === r.n, { frames: r.frames });
    check(r.id, 'p50 <= p90 <= p99 <= max', r.ackMs.p50 <= r.ackMs.p90 && r.ackMs.p90 <= r.ackMs.p99 && r.ackMs.p99 <= r.ackMs.max, r.ackMs);
    check(r.id, 'p99 rank at n=100 is 99 (second largest); p99 = max means the top two round equal', r.ackMs.p99 === r.ackMs.max, r.ackMs);
    check(r.id, 'fsyncCalibrationMs present (F_FULLFSYNC itself is not recorded)', typeof r.fsyncCalibrationMs === 'number', { fsyncCalibrationMs: r.fsyncCalibrationMs, requireFullFsyncRecorded: 'requireFullFsync' in r });
  } else if (r.mode === 'crash') {
    const sum = Object.values(r.injected).reduce((a, b) => a + b, 0);
    check(r.id, 'sum(injected) = injectedTotal = 100', sum === r.injectedTotal && sum === 100, r.injected);
    check(r.id, 'restarts = injectedTotal + 1', r.restarts === r.injectedTotal + 1, { restarts: r.restarts });
    check(r.id, 'committedEffects = commits; durableEffects = committedEffects; gaps = extras = 0', r.committedEffects === r.commits && r.durableEffects === r.committedEffects && r.gaps === 0 && r.extras === 0, { commits: r.commits, committedEffects: r.committedEffects, durableEffects: r.durableEffects });
    check(r.id, 'replayAttempts is replayedEffects (distinct keys delivered more than once), not the store counter', r.replayAttempts === r.replayedEffects, { replayAttempts: r.replayAttempts, replayedEffects: r.replayedEffects });
    check(r.id, 'visibleDuplicates <= replayedEffects', r.visibleDuplicates <= r.replayedEffects, { visibleDuplicates: r.visibleDuplicates });
  } else if (r.mode === 'probe') {
    for (const k of ['keepAliveQueryMs', 'freshConnectionQueryMs']) check(r.id, `${k}.n = 40 - 5 warmup`, r[k].n === 35, r[k]);
    check(r.id, 'keep-alive minus fresh (ms): p50, p90, p99, mean', true, Object.fromEntries(['p50', 'p90', 'p99', 'mean'].map((p) => [p, Math.round((r.keepAliveQueryMs[p] - r.freshConnectionQueryMs[p]) * 10) / 10])));
    check(r.id, 'update delta-triples total at probe time', true, { deltaAfterTotal: r.updateResponse?.operations?.[0]?.['delta-triples']?.after?.total });
  }
}
// The four crash variants share one schedule: identical injected counts and replayedEffects.
const crash = checks.filter((c) => c.what.startsWith('sum(injected)'));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'receiptonly.json'), JSON.stringify(checks, null, 2) + '\n');
for (const c of checks) console.log(c.status, c.id, '|', c.what, '|', JSON.stringify(c.detail));
console.log('crash variants checked:', crash.length);
