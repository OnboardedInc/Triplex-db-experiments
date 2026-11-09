// @ts-nocheck -- [EXP-CHECKJS-R2] Node overloads over dynamic option/result unions. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-CHECKJS] Why: compare executable source against the dispatched HEAD, and bind
// validation to actual changed bytes. Rejected: claiming comments are harmless without comparison.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../../..');
const out = import.meta.dirname;
const base = '2a2fe2fc9317de346b5249924f7c1a0b9a95f81a';
const attempt = process.argv[2] ?? 'committed';
assert.match(attempt, /^[a-z0-9-]+$/);
const files = execFileSync('git', ['diff', base, '--name-only', '--diff-filter=M'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(file => /\.[cm]?js$/.test(file) || file === 'package.json');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pins = new Map();
function findPins(value) {
  if (value && typeof value === 'object') {
    if (typeof value.path === 'string' && typeof value.sha256 === 'string') pins.set(value.path, value.sha256);
    for (const nested of Object.values(value)) findPins(nested);
  }
}
findPins(JSON.parse(fs.readFileSync(path.join(root, 'lab/acceptance/obligations.json'), 'utf8')));
const printer = ts.createPrinter({ removeComments: true });
const executable = (file, bytes) => printer.printFile(ts.createSourceFile(file, bytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS));
const changes = files.map(file => {
  const before = execFileSync('git', ['show', `${base}:${file}`], { cwd: root });
  const after = fs.readFileSync(path.join(root, file));
  const commentOnly = /\.[cm]?js$/.test(file) && executable(file, before) === executable(file, after);
  if (/\.[cm]?js$/.test(file) && file !== 'lab/bin/gate.mjs') assert(commentOnly, `executable source changed: ${file}`);
  return { file, oldSha256: sha(before), newSha256: sha(after), pinnedSha256: pins.get(file) ?? null, commentOnly };
});
for (const file of ['lab/bin/checkjs.mjs', 'lab/bin/test/checkjs.test.mjs', 'lab/tsconfig.checkjs.json', 'lab/experiments/EXP-CHECKJS/verify.mjs']) {
  changes.push({ file, oldSha256: null, newSha256: sha(fs.readFileSync(path.join(root, file))), pinnedSha256: null, commentOnly: false });
}
fs.writeFileSync(path.join(out, `changed-files-${attempt}.json`), JSON.stringify({ base, node: process.version,
  typescript: ts.version, typescriptPackageSha256: sha(fs.readFileSync(path.join(root, 'node_modules/typescript/package.json'))),
  at: new Date().toISOString(), changes }, null, 2) + '\n');
console.log(`Compared executable source in ${changes.filter(c => c.commentOnly).length} existing JavaScript files; only gate.mjs adds a runtime check.`);
for (const [label, args] of [
  ['checkjs-final', ['lab/bin/checkjs.mjs']],
  ['tsc-final', ['node_modules/typescript/bin/tsc', '-p', 'lab/tsconfig.checkjs.json', '--pretty', 'false']],
  ['tests-final', ['--test', 'lab/bin/test/checkjs.test.mjs']],
  ['lab-tests', ['--test', 'lab/bin/test/lab.test.mjs', 'lab/bin/test/datomic-context.test.mjs', 'lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs']],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 ** 2 });
  fs.writeFileSync(path.join(out, `${label}-${attempt}.txt`), `${result.stdout ?? ''}${result.stderr ?? ''}`);
  console.log(`${label}: exit=${result.status} signal=${result.signal}`);
  assert.equal(result.status, 0, `${label}: ${result.error ?? result.stderr}`);
  if (label.includes('tests')) {
    assert.match(result.stdout, /^# fail 0$/m);
    assert.match(result.stdout, /^# tests [1-9][0-9]*$/m);
  }
}
for (const change of changes) assert.equal(sha(fs.readFileSync(path.join(root, change.file))), change.newSha256, `source changed during validation: ${change.file}`);
console.log('Source hashes unchanged after validation; static checks and assertion-bearing test commands completed.');
