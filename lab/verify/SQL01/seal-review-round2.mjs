// [EXP-SQL01] Why: seal reviewer tools, fresh evidence and source without mutable dependency/runner caches.
// Rejected: a recursive worktree walk that includes node_modules or synthetic database files.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = 'lab/verify/SQL01', manifestPath = root + '/MANIFEST-review-round2.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const candidates = () => [...new Set([
  ...fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isFile() && e.name !== 'MANIFEST-review-round2.json' && !e.name.endsWith('.draft.txt')).map(e => root + '/' + e.name),
  ...fs.readdirSync(root + '/evidence').filter(n => n.startsWith('qa2-')).map(n => root + '/evidence/' + n),
  ...execFileSync('rg', ['--files','packages/qlever/src','packages/core/src','-g','*.ts'], { encoding:'utf8' }).trim().split('\n'),
  'lab/experiments/EXP-SQL01/MANIFEST-round2.json','lab/experiments/EXP-SQL01/REPORT-round2.md','pnpm-lock.yaml','packages/qlever/package.json'
])].sort();
if (process.argv.includes('--verify')) {
  const m = JSON.parse(fs.readFileSync(manifestPath)), errors = [];
  for (const [file, expected] of Object.entries(m.files)) if (!fs.existsSync(file) || fs.statSync(file).size !== expected.bytes || hash(fs.readFileSync(file)) !== expected.sha256) errors.push(file);
  const unexpected = candidates().filter(f => !m.files[f]);
  console.log(JSON.stringify({ checked:Object.keys(m.files).length, errors, unexpected }));
  if (errors.length || unexpected.length) process.exitCode=1;
} else {
  if (fs.existsSync(manifestPath)) throw Error('Refusing to overwrite sealed round-two delivery');
  const m = { reviewer:'CX-VSQL01-2', verdict:'ACCEPT (default-off)', builderHead:'4863a8e0918460c7806ee8fd5b9fe2cdc8b566b3', implementationHead:'14f1e12a341ab1b54e89b8e891f953544a17ef1b', executionHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), createdAt:new Date().toISOString(), files:Object.fromEntries(candidates().map(f => [f,{ bytes:fs.statSync(f).size,sha256:hash(fs.readFileSync(f)) }])) };
  fs.writeFileSync(manifestPath, JSON.stringify(m,null,2)+'\n');
  console.log(JSON.stringify({ sealed:Object.keys(m.files).length, manifestPath }));
}
