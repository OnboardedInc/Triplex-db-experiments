// [CX-VQNODELAY] Why: bind every new observation to unchanged client and reviewer bytes.
// Rejected: treating historical receipts or successful process exit as new acceptance.
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
export const sha = x => createHash('sha256').update(x).digest('hex');
export const delay = ms => new Promise(r => setTimeout(r, ms));
export const modes = ['keep-alive', 'per-request'];
export function start(paths) {
  const sources = Object.fromEntries(['packages/qlever/src/QleverClient.ts', 'lab/verify/QNODELAY/round2/bootstrap.mjs', 'lab/verify/QNODELAY/round2/resolve.mjs', '/Users/sam/projects/triplex-db-2/node_modules/.pnpm/undici@7.29.1/node_modules/undici/index.js', '/Users/sam/projects/triplex-db-2/node_modules/.pnpm/undici@7.29.1/node_modules/undici/package.json', 'lab/verify/QNODELAY/round2/common.mjs', ...paths].map(p => [p, sha(fs.readFileSync(p))]));
  return { id: randomUUID(), startedAt: new Date().toISOString(), node: process.version, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sources };
}
export function finish(file, report) {
  report.sourcesUnchanged = Object.entries(report.sources).every(([p,h]) => sha(fs.readFileSync(p)) === h);
  if (!report.sourcesUnchanged) throw Error('review/client source changed during execution');
  report.endedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}
export function fds() {
  const raw = execFileSync('/usr/sbin/lsof', ['-nP','-a','-p',String(process.pid),'-F','ftn'], { encoding: 'utf8', maxBuffer: 4e6 });
  const records = raw.split('\nf').slice(1).map(r => r.split('\n'));
  return { numericDescriptors: records.filter(r => /^\d/.test(r[0])).length, tcp: records.filter(r => r.some(l => /^tIPv[46]/.test(l))).length };
}
