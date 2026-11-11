import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// [DX-V1] Why: bind an offline review to the source, built bytes and recorded inputs it actually used.
// Rejected: claiming a fresh engine gate, borrowing an old slot identity, or emitting an acceptance receipt.
const root = path.resolve(import.meta.dirname, '../../..');
const own = 'lab/verify/DX-V1';
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const name = path.join(dir, e.name);
  return e.isDirectory() ? walk(name) : [name];
});
const sources = execFileSync('git', ['ls-files', 'packages/datomic/src',
  'packages/datomic/gateway/src/triplex/gateway', 'lab/bench', 'packages/core/src',
  'packages/w0/src', 'lab/experiments/EXP-DX1/r3'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
const built = ['packages/datomic/dist', 'packages/core/dist', 'packages/qualification/dist', 'packages/w0/dist']
  .flatMap(dir => walk(path.join(root, dir))).filter(name => name.endsWith('.js'));
const pages = '/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/tx2-dxr1-1000-d/pages';
const external = walk(pages).filter(file => /\/(request-\d+\.json|response-\d+\.json\.gz)$/.test(file));
external.push('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-q7-ladder/input/ns-writes.jsonl',
  '/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4/tx2-dxh4-q7-TABLES.md');
const records = files => [...new Set(files)].sort().map(name => {
  const absolute = path.resolve(root, name);
  return { path: name.startsWith(root + '/') ? path.relative(root, name) : name,
    bytes: fs.statSync(absolute).size, sha256: sha(absolute) };
});
const output = {
  kind: 'DX-V1-offline-binding', createdAt: new Date().toISOString(),
  reviewedHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
  node: process.version, engines: 'none; no containers or measurement lock; no engine slot identity claimed',
  source: records(sources), built: records(built), external: records(external),
  local: records(walk(path.join(root, own)).filter(file => !['binding.json', 'SHA256SUMS', 'REPORT.md'].includes(path.basename(file)))),
};
// [DX-V1] Why: the 8888-file recorded-input index exceeds the lab's 1 MB git evidence limit.
// Rejected: committing megabytes of path/hash tuples despite retaining the original recordings externally.
const durable = '/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-V1';
fs.mkdirSync(durable, { recursive: true });
const externalFile = path.join(durable, 'recorded-inputs.json');
fs.writeFileSync(externalFile, JSON.stringify(output.external, null, 2) + '\n');
const externalIndex = { ...records([externalFile])[0], count: output.external.length };
const compact = { ...output, external: externalIndex };
fs.writeFileSync(path.join(root, own, 'binding.json'), JSON.stringify(compact, null, 2) + '\n');
fs.writeFileSync(path.join(root, own, 'SHA256SUMS'), [...output.source, ...output.built, externalIndex, ...output.local]
  .map(r => `${r.sha256}  ${r.path}`).join('\n') + '\n');
console.log(JSON.stringify({ reviewedHead: output.reviewedHead, source: output.source.length,
  built: output.built.length, recordedInputs: output.external.length, local: output.local.length }));
