// [EXP-SQL01] Why: one reviewer manifest seals report, tools and immutable gate evidence.
// Rejected: putting the manifest's own hash in itself (circular identity).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve('lab/verify/SQL01'), target = path.join(root, 'MANIFEST.json');
const hash = b => createHash('sha256').update(b).digest('hex');
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.name === 'data' || e.name === 'MANIFEST.json' ? [] : e.isDirectory() ? files(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []);
if (process.argv.includes('--verify')) {
  const m = JSON.parse(fs.readFileSync(target)), errors = [];
  for (const [name, d] of Object.entries(m.files)) {
    const f = path.join(root, name);
    if (!fs.existsSync(f) || fs.statSync(f).size !== d.bytes || hash(fs.readFileSync(f)) !== d.sha256) errors.push(name);
  }
  const unexpected = files(root).map(f => path.relative(root, f)).filter(f => !m.files[f]);
  console.log(JSON.stringify({ checked: Object.keys(m.files).length, errors, unexpected }));
  if (errors.length || unexpected.length) process.exitCode = 1;
} else {
  const manifest = { reviewer: 'CX-VSQL01-2', verdict: 'FIX-FIRST', builderHead: '53d41ad05809f3e6faab16de2258d2535556d77d', implementationHead: '3a53c3b891ee50d59486a0edb650dd28c3d1e1df', executionAncestor: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), createdAt: new Date().toISOString(), files: Object.fromEntries(files(root).sort().map(f => [path.relative(root, f), { bytes: fs.statSync(f).size, sha256: hash(fs.readFileSync(f)) }])) };
  fs.writeFileSync(target, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ sealed: Object.keys(manifest.files).length, target }));
}
