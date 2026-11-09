import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import ts from 'typescript';
import { checkProject, coverageDiagnostics, trackedCoverage, withoutDirectives } from '../checkjs.mjs';

/** @param {string} source @param {(project: string) => void} work */
function fixture(source, work) {
  const base = path.resolve(import.meta.dirname, '../../../runs/checkjs-tests');
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, 'attempt-'));
  const project = path.join(dir, 'tsconfig.json');
  try {
    fs.writeFileSync(path.join(dir, 'input.mjs'), source);
    fs.writeFileSync(path.join(dir, 'exports.mjs'), 'export const present = 1;\n');
    fs.writeFileSync(project, JSON.stringify({ compilerOptions: {
      allowJs: true, checkJs: true, noEmit: true, strict: true,
      target: 'ES2023', module: 'NodeNext', types: [],
    }, include: ['*.mjs'] }));
    work(project);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('dormant bindings fail despite file and line type-noise suppressions', () => {
  fixture(`// @ts-nocheck -- dynamic test data
import { absentExport } from './exports.mjs';
export function dormant() {
  const nearbyName = 1;
  // @ts-ignore -- old type noise
  missingPlain();
  // @ts-expect-error -- old type noise
  return [nearbyNme, { missingShorthand }, absentExport, nearbyName];
}
`, project => {
    const { diagnostics } = checkProject(project);
    const codes = diagnostics.map(d => d.code);
    for (const code of [2304, 2552, 18004, 2305]) assert(codes.includes(code), `missing TS${code}: ${codes}`);
    const plain = diagnostics.find(d => d.code === 2304);
    assert(plain?.file && plain.start !== undefined);
    assert.equal(plain.file.getLineAndCharacterOfPosition(plain.start).line + 1, 6);
  });
});

test('ordinary project diagnostics still reject wrong arity', () => {
  fixture('function zero() {}\nzero(1);\n', project => {
    assert(checkProject(project).diagnostics.some(d => d.code === 2554));
  });
});

test('valid code passes and directives in runtime text stay byte-identical', () => {
  const source = 'const value = "// @ts-nocheck";\nconst template = `a${value} // @ts-ignore`;\nconst pattern = /@ts-check/;\nexport { template, pattern };\n';
  assert.equal(withoutDirectives(source), source);
  const commented = '// @ts-nocheck -- reason\n' + source + '/* @ts-ignore */\n';
  const stripped = withoutDirectives(commented);
  assert.equal(stripped.length, commented.length);
  assert(stripped.includes(source));
  assert(!stripped.startsWith('// @ts-nocheck'));
  fixture(source, project => assert.deepEqual(checkProject(project).diagnostics, []));
});

test('project checks or explicitly excludes every tracked JavaScript file', () => {
  const lab = path.resolve(import.meta.dirname, '../..');
  const config = path.join(lab, 'tsconfig.checkjs.json');
  const read = ts.readConfigFile(config, ts.sys.readFile);
  assert.equal(read.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, lab);
  const inventory = trackedCoverage(path.dirname(lab), path.join(lab, 'checkjs-exclusions.json'));
  assert.deepEqual(coverageDiagnostics(parsed.fileNames, inventory, path.dirname(lab)), []);
  assert.equal(inventory.checked.length + inventory.excluded.size + inventory.generated.length, inventory.tracked.length);
  assert.equal(parsed.options.allowJs, true);
  assert.equal(parsed.options.checkJs, true);
  assert.equal(parsed.options.noEmit, true);
  assert.equal(parsed.options.strict, true);
});

test('new staged JavaScript anywhere fails coverage until checked or explicitly excluded with a reason', () => {
  fixture('export const present = true;\n', project => {
    const dir = path.dirname(project), policy = path.join(dir, 'exclusions.json');
    /** @param {...string} args */
    const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
    git('init', '-q');
    git('add', 'input.mjs', 'exports.mjs');
    fs.writeFileSync(policy, JSON.stringify({ format: 'triplex-checkjs-exclusions/1', exclusions: [] }));
    const nested = path.join(dir, 'new-area');
    fs.mkdirSync(nested);
    fs.writeFileSync(path.join(nested, 'dormant.cjs'), '// @ts-nocheck\nfunction dormant() { missingNewTrackedName(); }\n');
    fs.mkdirSync(path.join(dir, 'dist'));
    fs.writeFileSync(path.join(dir, 'dist/output.js'), 'generatedOutput();\n');
    git('add', 'new-area/dormant.cjs', 'dist/output.js');
    const config = JSON.parse(fs.readFileSync(project, 'utf8'));
    config.include = [];
    config.files = ['input.mjs', 'exports.mjs'];
    fs.writeFileSync(project, JSON.stringify(config));
    const coverage = { repository: dir, exclusionsFile: policy };
    assert(checkProject(project, coverage).diagnostics.some(d => d.code === 90001 && String(d.messageText).includes('new-area/dormant.cjs')));
    config.files.push('new-area/dormant.cjs');
    fs.writeFileSync(project, JSON.stringify(config));
    assert(checkProject(project, coverage).diagnostics.some(d => d.code === 2304));
    config.files.pop();
    fs.writeFileSync(project, JSON.stringify(config));
    fs.writeFileSync(policy, JSON.stringify({ format: 'triplex-checkjs-exclusions/1', exclusions: [{ path: 'new-area/dormant.cjs', reason: 'Deliberate dormant-name fixture; no runtime entry point.' }] }));
    assert.deepEqual(checkProject(project, coverage).diagnostics, []);
    for (const exclusions of [
      [{ path: 'new-area/dormant.cjs', reason: '' }],
      [{ path: 'new-area/*.cjs', reason: 'Wildcard is not an exact tracked path.' }],
      [{ path: 'gone.mjs', reason: 'Stale path must be refused.' }],
      [{ path: 'input.mjs', reason: 'one' }, { path: 'input.mjs', reason: 'duplicate' }],
    ]) {
      fs.writeFileSync(policy, JSON.stringify({ format: 'triplex-checkjs-exclusions/1', exclusions }));
      assert.throws(() => trackedCoverage(dir, policy), /checkjs exclusion/);
    }
  });
});

test('reviewer CLI probes reject GS launcher, CS-GS manifest, and engine dormant/import failures', () => {
  const root = path.resolve(import.meta.dirname, '../../..');
  for (const [file, mutation] of [
    ['lab/scenarios/run.mjs', 'append'], ['lab/scenarios/v2/cases.mjs', 'append'],
    ['lab/bin/engine.mjs', 'append'], ['lab/bin/engine.mjs', 'engine-import'],
  ]) {
    const result = spawnSync(process.execPath, ['--import', './lab/bin/test/checkjs-overlay.mjs', 'lab/bin/checkjs.mjs'], {
      cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024,
      env: { ...process.env, CHECKJS_REVIEW_TARGET: path.join(root, file), CHECKJS_REVIEW_MUTATION: mutation },
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /TS2304/);
    assert(result.stderr.includes(file));
    assert(result.stderr.includes(mutation === 'engine-import' ? 'sha256File' : 'cxVcheckjsDormantUnboundName'));
    const record = JSON.parse(result.stderr.split('\n').find(line => line.startsWith('CX-VCHECKJS overlay: '))?.slice('CX-VCHECKJS overlay: '.length) ?? 'null');
    assert(record?.reads > 0 && record.originalUnchanged === true);
  }
});
