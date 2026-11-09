// [CX-VCHECKJS] Why: independently bind comparisons and CLI probes to the reviewed
// commit and fresh observed bytes. Rejected: adopting the builder's saved PASS logs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { verdictOf } from '../../bin/receipt.mjs';
import vm from 'node:vm';
import { admissionProbe } from './admission.mjs';
import { LOCKS } from '../../bin/lib.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const base = '2a2fe2fc9317de346b5249924f7c1a0b9a95f81a';
const reviewed = '3575785aff5ab36bc92eee6131f4b5b0ffe83c5d';
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 16 << 20 }).toString();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const out = path.join(import.meta.dirname, 'evidence', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(out, { recursive: true });
const save = (name, value) => fs.writeFileSync(path.join(out, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
const parentGrants = [1, 2, 3, 4].flatMap(slot => {
  const file = path.join(LOCKS, 'heavy', String(slot), 'owner.json');
  if (!fs.existsSync(file)) return [];
  const bytes = fs.readFileSync(file), owner = JSON.parse(bytes);
  return owner.pid === process.ppid ? [{ slot, owner, sha256: sha(bytes) }] : [];
});
assert.equal(parentGrants.length, 1, 'review must run under its own heavy wrapper');
assert.match(parentGrants[0].owner.label, /^CX-VCHECKJS/);
const verifierHashes = Object.fromEntries(['review.mjs', 'overlay.mjs', 'admission.mjs'].map(file => [file, sha(fs.readFileSync(path.join(import.meta.dirname, file)))]));
const tracked = git('ls-tree', '-r', '--name-only', reviewed).trim().split('\n');
const sourceFiles = tracked.filter(f => /\.[cm]?js$/.test(f) || /(?:^|\/)(?:package|tsconfig[^/]*)\.json$/.test(f));
const sourceHashes = Object.fromEntries(sourceFiles.map(f => {
  const bytes = fs.readFileSync(path.join(root, f));
  assert.equal(sha(bytes), sha(git('show', `${reviewed}:${f}`)), `not reviewed bytes: ${f}`);
  return [f, sha(bytes)];
}));
save('binding.json', { reviewed, base, at: new Date().toISOString(), node: process.version, typescript: ts.version, parentGrants, verifierHashes,
  typescriptSha256: sha(fs.readFileSync(path.join(root, 'node_modules/typescript/lib/typescript.js'))), sourceHashes });

const changed = git('diff', '--name-only', '--diff-filter=M', base, reviewed).trim().split('\n').filter(f => /\.[cm]?js$/.test(f));
const printer = ts.createPrinter({ removeComments: true });
const print = (file, text) => {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0, file);
  return printer.printFile(ast);
};
const pins = [];
function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.path === 'string' && typeof value.sha256 === 'string') pins.push(value);
  for (const item of Object.values(value)) walk(item);
}
walk(JSON.parse(read('lab/acceptance/obligations.json')));
const comparisons = changed.map(file => {
  const before = git('show', `${base}:${file}`), after = read(file);
  const beforePrinted = print(file, before), afterPrinted = print(file, after);
  const equal = beforePrinted === afterPrinted;
  if (file !== 'lab/bin/gate.mjs') assert(equal, file);
  return { file, equal, oldSha256: sha(before), newSha256: sha(after),
    oldPrintedSha256: sha(beforePrinted), newPrintedSha256: sha(afterPrinted),
    contractPins: pins.filter(p => p.path === file).map(p => p.sha256) };
});
assert.equal(comparisons.filter(c => c.equal).length, 104);
assert.equal(comparisons.filter(c => c.contractPins.length).length, 3);
for (const item of comparisons.filter(c => c.contractPins.length)) {
  assert(item.contractPins.every(p => p === item.oldSha256));
  assert(item.equal);
}
// [CX-VCHECKJS] Why: the admission functions must retain identical executable
// source; reusing a parent grant must not add an unchecked admission route.
for (const file of ['lab/bin/heavy.mjs', 'lab/bin/heavy-lock.mjs']) {
  assert.equal(print(file, git('show', `${base}:${file}`)), print(file, read(file)));
}
save('printer.json', { changedJavaScript: comparisons.length, identical: 104, comparisons });

const configFile = path.join(root, 'lab/tsconfig.checkjs.json');
const config = ts.readConfigFile(configFile, ts.sys.readFile);
assert.equal(config.error, undefined);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configFile));
assert.equal(parsed.errors.length, 0);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const roots = new Set(parsed.fileNames.map(f => path.relative(root, f)));
const included = new Set(program.getSourceFiles().map(f => path.relative(root, f.fileName)));
const labJs = tracked.filter(f => f.startsWith('lab/') && /\.[cm]?js$/.test(f));
const direct = ['lab/scenarios/run.mjs', 'lab/scenarios/v2/cases.mjs', 'lab/falsifiers/wire/run.mjs'];
for (const f of direct) assert(!included.has(f), `coverage changed: ${f}`);
const entryPoints = [];
for (const file of tracked.filter(f => /(?:^|\/)package\.json$/.test(f))) {
  const pkg = JSON.parse(read(file));
  for (const [name, command] of Object.entries(pkg.scripts ?? {})) entryPoints.push({ file, name, command });
}
// Retain a bounded source-reference inventory, including dynamic child-process paths.
const references = [];
for (const file of tracked.filter(f => /\.(?:mjs|cjs|js|ts|sh)$/.test(f) && /^(?:lab\/(?:bin|bench|scenarios|falsifiers)|qualification|scripts)\//.test(f))) {
  for (const [line, text] of read(file).split('\n').entries()) {
    if (/\.(?:mjs|cjs|js)\b/.test(text)) references.push({ file, line: line + 1, text });
  }
}
save('coverage.json', { rootCount: roots.size, labJavaScript: labJs.length,
  roots: [...roots].sort(), transitiveLocalJavaScript: [...included].filter(f => !f.startsWith('node_modules/') && !f.startsWith('../') && /\.[cm]?js$/.test(f)).sort(),
  labOmitted: labJs.filter(f => !included.has(f)), qualificationOmitted: tracked.filter(f => f.startsWith('qualification/') && /\.[cm]?js$/.test(f) && !roots.has(f)),
  entryPoints, references });
console.log(`printer: ${comparisons.length} files, 104 identical, 3 matching original pins; project: ${roots.size} roots`);

function cli(name, args, env = {}) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 4 << 20,
    env: { ...process.env, ...env } });
  save(`${name}.stdout.txt`, result.stdout ?? ''); save(`${name}.stderr.txt`, result.stderr ?? '');
  const info = { name, args, env, status: result.status, signal: result.signal, error: result.error?.message ?? null };
  save(`${name}.json`, info);
  console.log(`${name}: exit=${result.status}`);
  return result;
}
const baseline = cli('baseline', ['lab/bin/checkjs.mjs']);
assert.equal(baseline.status, 0);
assert.match(baseline.stdout, /110 JavaScript roots checked/);
for (const [name, target, mutation, expectFailure] of [
  ['engine-dormant', 'lab/bin/engine.mjs', 'append', true],
  ['engine-original-missing-import', 'lab/bin/engine.mjs', 'engine-import', true],
  ['gs-omitted', 'lab/scenarios/run.mjs', 'append', false],
  ['gs-cases-omitted', 'lab/scenarios/v2/cases.mjs', 'append', false],
]) {
  const result = cli(name, ['--import', './lab/verify/CHECKJS/overlay.mjs', 'lab/bin/checkjs.mjs'], {
    CHECKJS_REVIEW_TARGET: path.join(root, target), CHECKJS_REVIEW_MUTATION: mutation,
  });
  assert.equal(result.status, expectFailure ? 1 : 0);
  if (expectFailure) assert.match(result.stderr, /error TS(?:2304|2552)/);
  else assert.match(result.stderr, /"reads":0/);
}

// [CX-VCHECKJS] Why: compare the exact G0 function under deterministic offline
// step outputs; a live gate would operate engines and is outside this review.
function getFunction(source, name) {
  const ast = ts.createSourceFile('gate.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declaration = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === name);
  assert(declaration, name);
  return declaration.getText(ast);
}
async function gateModel(source, lane, failingStep) {
  const steps = [], reasons = [], failures = [], stored = [], writes = [];
  const pkgs = ['core', 'testkit', lane, 'qualification'];
  const PACKAGES = Object.fromEntries(pkgs.map(p => [p, { filter: p, dir: `packages/${p}` }]));
  const run = { lane, gate: 'G0', steps, raw: name => name, reason: text => reasons.push(text),
    failure: data => failures.push(data), store: (file, role) => stored.push({ file, role }),
    async step(name, command, args, options = {}) {
      const step = { name, command, args, options, code: name === failingStep ? 1 : 0,
        stdout: `${name}.stdout`, stderr: `${name}.stderr` };
      if (step.code) step.tail = 'mock first failure';
      steps.push(step); return step;
    } };
  const ctx = vm.createContext({ path, REPO: '/mock', PACKAGES, EXPECTED_SKIPS: 'expected', PACKET: 'packet',
    build: async r => {
      const step = await r.step('build', 'pnpm', ['build'], { heavy: true });
      if (step.code !== 0) { r.reason(`build failed (exit ${step.code})`); r.failure({ step: 'build', tail: step.tail }); }
      return { manifestSha256: 'build' };
    },
    lanePackages: () => pkgs,
    readJson: file => file === 'expected' ? { skips: {} } : { testResults: [{ name: 'test', assertionResults: [{ status: 'passed' }] }] },
    fileHashes: () => ({ mock: true }), packetIdentity: () => ({ sha256: 'packet' }),
    fs: { existsSync: () => true, writeFileSync: (file, text) => writes.push({ file, text }),
      readFileSync: file => file.endsWith('oracle-validate-workloads.stdout') ? JSON.stringify({ result: 'PASS', checked_cases: 71, unchecked_case_ids: [] }) :
        file.endsWith('oracle-unittest.stderr') ? 'Ran 1 tests\n\nOK\n' : '# tests 1\n# pass 1\n# fail 0\n# skipped 0\n# todo 0\n# cancelled 0\n' } });
  vm.runInContext(['vitestOutcome', 'tapOutcome', 'gateG0'].map(n => getFunction(source, n)).join('\n'), ctx);
  const result = JSON.parse(JSON.stringify(await ctx.gateG0(run)));
  const verdict = verdictOf({ gate: 'G0', contractVersion: 'test', runKind: 'diagnostic', git: { head: 'h', headTree: 't', branch: 'b', sourceTreeId: 's', diffSha256: 'd' },
    toolchain: { node: 'n', pnpm: 'p' }, lockfileSha256: 'l', gateScripts: {}, ...result, reasons });
  // [CX-VCHECKJS] Why: VM arrays have different prototypes even when observed
  // contents match. Rejected: weakening comparison to counts or reference equality.
  return JSON.parse(JSON.stringify({ result, steps, reasons, failures, stored, writes, verdict }));
}
const gateBefore = git('show', `${base}:lab/bin/gate.mjs`), gateAfter = read('lab/bin/gate.mjs');
const gateResults = [];
for (const lane of ['xtdb', 'qlever', 'datomic']) {
  const before = await gateModel(gateBefore, lane), after = await gateModel(gateAfter, lane);
  assert.deepEqual(after.result, before.result);
  assert.deepEqual(after.steps.filter(s => s.name !== 'lab-checkjs'), before.steps);
  assert.deepEqual(after.reasons, before.reasons);
  assert.equal(after.verdict.verdict, 'PASS');
  const rejected = await gateModel(gateAfter, lane, 'lab-checkjs');
  assert.equal(rejected.verdict.verdict, 'FAIL');
  assert.deepEqual(rejected.steps.map(s => s.name), after.steps.map(s => s.name));
  assert.deepEqual(rejected.result, after.result);
  assert.equal(rejected.failures[0].step, 'lab-checkjs');
  const inheritedFailures = [];
  for (const step of before.steps) {
    const oldFail = await gateModel(gateBefore, lane, step.name), newFail = await gateModel(gateAfter, lane, step.name);
    assert.deepEqual(newFail.result, oldFail.result);
    assert.deepEqual(newFail.reasons, oldFail.reasons);
    assert.deepEqual(newFail.verdict, oldFail.verdict);
    assert.equal(newFail.verdict.verdict, 'FAIL');
    inheritedFailures.push(step.name);
  }
  gateResults.push({ lane, before, after, rejected, inheritedFailures });
}
save('gate-model.json', gateResults);
console.log('gate model: all 3 lanes retain existing steps/results; checker failure cannot skip steps or yield PASS');

const tests = cli('regression-tests', ['--test', 'lab/bin/test/checkjs.test.mjs']);
assert.equal(tests.status, 0);
assert.match(tests.stdout, /# tests 4/); assert.match(tests.stdout, /# fail 0/);
await admissionProbe(root, out);
const packageBefore = JSON.parse(git('show', `${base}:package.json`));
const packageMiddle = JSON.parse(git('show', `a0c86a55:package.json`));
const packageAfter = JSON.parse(read('package.json'));
assert.equal(packageAfter.scripts.typecheck, 'node lab/bin/checkjs.mjs && ' + packageBefore.scripts.typecheck);
assert.equal(packageAfter.scripts['lab:check'], packageMiddle.scripts['lab:check']);
assert.equal(packageAfter.scripts['lab:check'], 'node lab/bin/heavy.mjs --label lab-checkjs -- node lab/bin/checkjs.mjs');
save('root-scripts.json', { before: packageBefore.scripts, intermediate: packageMiddle.scripts, after: packageAfter.scripts });
for (const [file, hash] of Object.entries(sourceHashes)) assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, file);
save('summary.json', { completedAt: new Date().toISOString(), reviewed, sourceUnchanged: true,
  checks: ['printer', 'coverage', 'baseline', 'engine-dormant', 'engine-original-missing-import', 'gs-omitted', 'gs-cases-omitted', 'gate-model', 'regression-tests', 'admission', 'root-scripts'],
  verdict: 'FIX-FIRST', finding: 'GS JavaScript entry point and case manifest are outside the checker program' });
console.log(`Completed independent review; evidence ${path.relative(root, out)}`);
