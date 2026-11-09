// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters; dynamic rest arguments. Binding errors remain checked by lab/bin/checkjs.mjs.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

// [EXP-C8-R3] Why: bind passing checks to merged source and unchanged reviewer cases.
// Rejected: citing old evidence as fresh execution or modifying the reviewer's snapshot runner.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const head = git('rev-parse', 'HEAD');
const paths = git('ls-files').split('\n').filter(p => /^(packages\/.*\.(ts|json)|vitest.*\.ts|pnpm-lock.yaml|pnpm-workspace.yaml|tsconfig.*\.json|package.json)$/.test(p));
const sources = paths.map(path => {
  const bytes = readFileSync(path);
  const committed = execFileSync('git', ['show', `${head}:${path}`]);
  return { path, sha256: sha(bytes), committedSha256: sha(committed), unchanged: bytes.equals(committed) };
});
const probes = [
  ['lab/verify/C8/adversarial.test.ts', '74e5627', 'lab/verify/C8/adversarial.test.ts'],
  ['lab/verify/C8/round3-delta.test.ts', '029f9d3', 'lab/verify/C8/round2/delta.test.ts'],
].map(([path, revision, original]) => {
  const bytes = readFileSync(path);
  const reviewed = execFileSync('git', ['show', `${revision}:${original}`]);
  return { path, revision, original, sha256: sha(bytes), reviewerSha256: sha(reviewed), unchanged: bytes.equals(reviewed) };
});
const manifest = { at: new Date().toISOString(), node: process.version, implementation: head, parents: git('show', '-s', '--format=%P', head).split(' '), sources, probes };
writeFileSync('lab/experiments/EXP-C8-read-only-frontier/round3/source-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
if (sources.some(s => !s.unchanged) || probes.some(p => !p.unchanged)) process.exitCode = 1;
console.log(JSON.stringify({ implementation: head, sourceFiles: sources.length, unchangedReviewerFiles: probes.filter(p => p.unchanged).length, status: process.exitCode ?? 0 }));
