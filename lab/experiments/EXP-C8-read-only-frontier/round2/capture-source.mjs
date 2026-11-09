import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

// [EXP-C8-R2] Why: bind fresh commands to committed source and unchanged independent probes.
// Rejected: treating historical C8 gate receipts as evidence for the fix round.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const paths = git('diff', '--name-only', 'd9b2dc8', 'HEAD').split('\n').filter(Boolean);
const sources = paths.map(path => ({ path, sha256: sha(readFileSync(path)), committedSha256: sha(execFileSync('git', ['show', `HEAD:${path}`])) }));
const probes = ['adversarial.test.ts', 'light-live.test.ts', 'vitest.config.ts', 'run-offline.mjs'].map(file => {
  const path = `lab/verify/C8/${file}`;
  const bytes = readFileSync(path);
  const reviewed = execFileSync('git', ['show', `74e5627:${path}`]);
  return { path, sha256: sha(bytes), reviewerSha256: sha(reviewed), unchanged: bytes.equals(reviewed) };
});
const manifest = { at: new Date().toISOString(), node: process.version, base: git('rev-parse', 'd9b2dc8'), implementation: git('rev-parse', 'HEAD'), reviewer: git('rev-parse', '74e5627'), sources, probes };
writeFileSync('lab/experiments/EXP-C8-read-only-frontier/round2/source-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
if (sources.some(s => s.sha256 !== s.committedSha256) || probes.some(p => !p.unchanged)) process.exitCode = 1;
console.log(JSON.stringify({ implementation: manifest.implementation, sourceFiles: sources.length, unchangedReviewerFiles: probes.filter(p => p.unchanged).length, status: process.exitCode ?? 0 }));
