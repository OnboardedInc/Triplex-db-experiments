// [CX-VCHECKJS-R2] Why: run fresh F1 checks on exact Git source in an isolated
// snapshot. Rejected: editing either the builder worktree or the reviewed contract.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { LOCKS } from '../../../bin/lib.mjs';

const reviewRoot = path.resolve(import.meta.dirname, '../../../..');
const reviewed = execFileSync('git', ['rev-parse', 'f72cd5ad'], { cwd: reviewRoot, encoding: 'utf8' }).trim();
const base = '3575785aff5ab36bc92eee6131f4b5b0ffe83c5d';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const attempt = path.join(import.meta.dirname, 'evidence', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(attempt, { recursive: true });
const save = (name, data) => fs.writeFileSync(path.join(attempt, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
const snapshot = fs.mkdtempSync(path.join(import.meta.dirname, 'scratch-'));
const git = (...args) => execFileSync('git', args, { cwd: snapshot, encoding: 'utf8', maxBuffer: 16 << 20 });
const show = (revision, file) => execFileSync('git', ['show', `${revision}:${file}`], { cwd: reviewRoot, maxBuffer: 16 << 20 });
const source = file => fs.readFileSync(path.join(snapshot, file));
const write = (file, bytes) => fs.writeFileSync(path.join(snapshot, file), bytes);
let grant;
for (const slot of [1, 2, 3, 4]) {
  const file = path.join(LOCKS, 'heavy', String(slot), 'owner.json');
  try {
    const bytes = fs.readFileSync(file), owner = JSON.parse(bytes);
    if (owner.pid === process.ppid && owner.label === 'CX-VCHECKJS-r2') grant = { slot, file, sha256: sha(bytes), owner };
  } catch {}
}
assert(grant, 'requires reviewer heavy grant');
save('attempt.json', { reviewed, base, startedAt: new Date().toISOString(), grant, node: process.version, typescript: ts.version,
  verifierSha256: sha(fs.readFileSync(import.meta.filename)), overlaySha256: sha(fs.readFileSync(path.join(import.meta.dirname, '../overlay.mjs'))) });
try {
  const archive = spawnSync('/bin/sh', ['-c', 'git archive "$1" | tar -xf - -C "$2"', 'snapshot', reviewed, snapshot], { cwd: reviewRoot, encoding: 'utf8' });
  assert.equal(archive.status, 0, archive.stderr);
  git('init', '-q');
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: reviewRoot, encoding: 'utf8' }).trim();
  fs.mkdirSync(path.join(snapshot, '.git/objects/info'), { recursive: true });
  fs.writeFileSync(path.join(snapshot, '.git/objects/info/alternates'), path.join(common, 'objects') + '\n');
  git('read-tree', reviewed); git('update-ref', 'refs/heads/main', reviewed); git('symbolic-ref', 'HEAD', 'refs/heads/main');
  const installed = '/Users/sam/projects/triplex-db-2';
  fs.mkdirSync(path.join(snapshot, 'node_modules'));
  for (const name of fs.readdirSync(path.join(installed, 'node_modules'))) {
    if (name !== '@triplex-build') fs.symlinkSync(path.join(installed, 'node_modules', name), path.join(snapshot, 'node_modules', name));
  }
  fs.mkdirSync(path.join(snapshot, 'node_modules/@triplex-build'), { recursive: true });
  for (const name of fs.readdirSync(path.join(installed, 'packages'))) {
    const pkg = path.join(installed, 'packages', name), config = path.join(pkg, 'package.json');
    if (!fs.existsSync(config)) continue;
    const packageName = JSON.parse(fs.readFileSync(config)).name;
    if (packageName?.startsWith('@triplex-build/')) fs.symlinkSync(pkg, path.join(snapshot, 'node_modules', packageName));
  }
  const { trackedCoverage, coverageDiagnostics } = await import(pathToFileURL(path.join(snapshot, 'lab/bin/checkjs.mjs')).href);
  const project = path.join(snapshot, 'lab/tsconfig.checkjs.json'), policy = path.join(snapshot, 'lab/checkjs-exclusions.json');
  const inventory = trackedCoverage(snapshot, policy);
  const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(project, ts.sys.readFile).config, ts.sys, path.dirname(project));
  assert.deepEqual(coverageDiagnostics(parsed.fileNames, inventory, snapshot), []);
  assert.deepEqual([inventory.tracked.length, inventory.checked.length, inventory.excluded.size, inventory.generated.length], [565, 371, 78, 116]);
  const hashes = Object.fromEntries([...inventory.tracked, 'lab/tsconfig.checkjs.json', 'lab/checkjs-exclusions.json', 'lab/acceptance/obligations.json'].map(file => {
    const bytes = source(file); assert.equal(sha(bytes), sha(show(reviewed, file)), file); return [file, sha(bytes)];
  }));
  const dependencies = ts.createProgram(parsed.fileNames, parsed.options).getSourceFiles().filter(f => !inventory.checked.includes(path.relative(snapshot, f.fileName)))
    .map(f => ({ file: f.fileName, sha256: sha(fs.readFileSync(f.fileName)) }));
  save('binding.json', { hashes, dependencies });
  save('coverage.json', { tracked: inventory.tracked, checked: inventory.checked, excluded: [...inventory.excluded], generated: inventory.generated });
  const cli = (name, args, env = {}, expected = 0) => {
    const start = new Date().toISOString();
    const result = spawnSync(process.execPath, args, { cwd: snapshot, encoding: 'utf8', maxBuffer: 8 << 20, env: { ...process.env, ...env } });
    save(name + '.stdout.txt', result.stdout ?? ''); save(name + '.stderr.txt', result.stderr ?? '');
    save(name + '.json', { start, end: new Date().toISOString(), args, env, status: result.status, signal: result.signal, error: result.error?.message ?? null });
    console.log(`${name}: exit=${result.status}`); assert.equal(result.status, expected, `${name}: ${result.stderr}`); return result;
  };
  cli('baseline', ['lab/bin/checkjs.mjs']);
  for (const [name, file, mutation] of [
    ['gs', 'lab/scenarios/run.mjs', 'append'], ['gs-manifest', 'lab/scenarios/v2/cases.mjs', 'append'],
    ['wire', 'lab/falsifiers/wire/run.mjs', 'append'], ['pack', 'scripts/check-packages.mjs', 'append'],
    ['docs-markdown', 'scripts/check-markdown-code.mjs', 'append'], ['docs-llms', 'scripts/check-llms.mjs', 'append'],
    ['engine', 'lab/bin/engine.mjs', 'append'], ['engine-import', 'lab/bin/engine.mjs', 'engine-import'],
  ]) {
    assert(inventory.checked.includes(file));
    const r = cli('plant-' + name, ['--import', path.join(import.meta.dirname, '../overlay.mjs'), 'lab/bin/checkjs.mjs'], {
      CHECKJS_REVIEW_TARGET: path.join(snapshot, file), CHECKJS_REVIEW_MUTATION: mutation,
    }, 1);
    assert.match(r.stderr, /TS2304/); assert(r.stderr.includes(file));
    assert(r.stderr.includes(mutation === 'engine-import' ? 'sha256File' : 'cxVcheckjsDormantUnboundName'));
    const record = JSON.parse(r.stderr.split('\n').find(line => line.startsWith('CX-VCHECKJS overlay: ')).slice(21));
    assert(record.reads > 0 && record.originalUnchanged);
  }
  const configBytes = source('lab/tsconfig.checkjs.json'), policyBytes = source('lab/checkjs-exclusions.json');
  const newFile = 'previously-unknown-area/dormant.mjs';
  fs.mkdirSync(path.join(snapshot, path.dirname(newFile)));
  write(newFile, '// @ts-nocheck\nexport function dormant() { cxR2NewTrackedName(); }\n');
  git('add', newFile);
  const missing = cli('new-file-checker-missing', ['lab/bin/checkjs.mjs'], {}, 1);
  assert.match(missing.stderr, /TS90001/); assert(missing.stderr.includes(newFile));
  const testArgs = ['--test', '--test-name-pattern=^project checks or explicitly excludes', 'lab/bin/test/checkjs.test.mjs'];
  const missedTest = cli('new-file-coverage-test-missing', testArgs, {}, 1);
  assert(missedTest.stdout.includes(newFile));
  cli('update-manifest', ['lab/bin/checkjs.mjs', '--update-files']);
  const bad = cli('new-file-now-checked-unbound', ['lab/bin/checkjs.mjs'], {}, 1);
  assert.match(bad.stderr, /TS2304/); assert(bad.stderr.includes('cxR2NewTrackedName'));
  cli('new-file-coverage-test-checked', testArgs);
  write(newFile, 'export function dormant() { return true; }\n');
  const good = cli('new-file-checked-valid', ['lab/bin/checkjs.mjs']); assert.match(good.stdout, /372 JavaScript roots/);
  write('lab/tsconfig.checkjs.json', configBytes);
  const exclusions = JSON.parse(policyBytes); exclusions.exclusions.push({ path: newFile, reason: 'CX-VCHECKJS-R2 isolated tracked fixture; never a runtime entry point.' });
  write('lab/checkjs-exclusions.json', JSON.stringify(exclusions));
  cli('new-file-coverage-test-excluded', testArgs);
  cli('new-file-explicitly-excluded', ['lab/bin/checkjs.mjs']);
  git('read-tree', reviewed); fs.rmSync(path.join(snapshot, path.dirname(newFile)), { recursive: true });
  write('lab/checkjs-exclusions.json', policyBytes); write('lab/tsconfig.checkjs.json', configBytes);
  const tests = cli('six-regressions', ['--test', 'lab/bin/test/checkjs.test.mjs']);
  assert.match(tests.stdout, /# tests 6\n/); assert.match(tests.stdout, /# fail 0\n/); assert.match(tests.stdout, /# skipped 0\n/);
  const oracle = 'lab/oracles/replay/selfcheck_fixtures/freeze-ham-reference.mjs';
  const before = show(base, oracle).toString(), after = source(oracle).toString();
  const printer = ts.createPrinter({ removeComments: true });
  const print = text => { const ast = ts.createSourceFile(oracle, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length, 0); return printer.printFile(ast); };
  assert.equal(print(before), print(after));
  assert.equal(after.split('\n').slice(1).join('\n'), before);
  const oldHash = sha(before), newHash = sha(after);
  assert.equal(oldHash, 'c533122597c940d69c8a101a1a175ba5e9d6ab62f1efdb2d5526c9f65a86a206');
  assert.equal(newHash, '752aaa5c706c514ec265ed6865458fd6bd78795486764e200c088c3f52f53f28');
  assert(source('lab/acceptance/obligations.json').includes(Buffer.from(oldHash)));
  save('oracle-comparison.json', { oracle, oldHash, newHash, oldPrintedSha256: sha(print(before)), newPrintedSha256: sha(print(after)), singleLeadingCommentOnly: true });
  const pinTest = cli('contract-pin-selfcheck', ['--test', '--test-name-pattern=^admitCore makes the contract', 'lab/bin/test/claim.test.mjs'], {}, 1);
  assert(pinTest.stdout.includes(oracle)); assert(pinTest.stdout.includes('hash'));
  for (const [file, hash] of Object.entries(hashes)) assert.equal(sha(source(file)), hash, file);
  for (const dep of dependencies) assert.equal(sha(fs.readFileSync(dep.file)), dep.sha256, dep.file);
  assert.equal(sha(fs.readFileSync(grant.file)), grant.sha256);
  save('summary.json', { reviewed, completedAt: new Date().toISOString(), assertionsCompleted: true, reviewedBytesUnchanged: true,
    plantedTargetsRejected: 8, newTrackedFileCoveredOrExcluded: true, sixTestsPassed: true, pinnedHelperCommentOnly: true });
  console.log(`Review completed: ${path.relative(reviewRoot, attempt)}`);
} finally {
  fs.rmSync(snapshot, { recursive: true, force: true });
}
