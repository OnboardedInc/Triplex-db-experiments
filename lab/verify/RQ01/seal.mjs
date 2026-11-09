// [CX-VRQ01] Why: make every retained review tool, source-derived probe and result independently inspectable.
// Rejected: a verdict without artifact hashes (cannot distinguish later edits from the executed review).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const base = 'lab/verify/RQ01';
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  if (e.name === 'cache' || e.name === 'MANIFEST.json') return [];
  const f = path.join(dir, e.name);
  return e.isDirectory() ? walk(f) : [f];
});
const files = Object.fromEntries(walk(base).sort().map(f => [f, { bytes: fs.statSync(f).size, sha256: createHash('sha256').update(fs.readFileSync(f)).digest('hex') }]));
const reviewedSourceDiff = execFileSync('git', ['diff', '93ad96e61dc6e8898bba018ff6b8799454d28ab3', '--', 'packages', 'pnpm-lock.yaml', 'lab/experiments/EXP-RQ01'], { encoding: 'utf8' });
if (reviewedSourceDiff) throw new Error('Reviewed implementation changed');
fs.writeFileSync(path.join(base, 'MANIFEST.json'), JSON.stringify({ at: new Date().toISOString(), reviewedHead: '93ad96e61dc6e8898bba018ff6b8799454d28ab3', branch: execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(), verdict: 'FIX-FIRST', reviewedImplementationUnchanged: true, excludes: ['cache/', 'MANIFEST.json (self)'], files }, null, 2) + '\n');
console.log(JSON.stringify({ verdict: 'FIX-FIRST', retainedFiles: Object.keys(files).length, retainedBytes: Object.values(files).reduce((a, f) => a + f.bytes, 0), reviewedImplementationUnchanged: true }));
