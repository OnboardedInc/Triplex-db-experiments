import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { checkProject, withoutDirectives } from '../checkjs.mjs';

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

test('project includes every JavaScript file recursively in the three tool trees', () => {
  const lab = path.resolve(import.meta.dirname, '../..');
  const config = path.join(lab, 'tsconfig.checkjs.json');
  const read = ts.readConfigFile(config, ts.sys.readFile);
  assert.equal(read.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, lab);
  const roots = new Set(parsed.fileNames);
  for (const dir of ['bin', 'bench', '../qualification']) {
    const absolute = path.resolve(lab, dir);
    for (const file of fs.readdirSync(absolute, { recursive: true, withFileTypes: true })) {
      if (file.isFile() && /\.[cm]?js$/.test(file.name)) assert(roots.has(path.join(file.parentPath, file.name)), file.name);
    }
  }
  assert.equal(parsed.options.allowJs, true);
  assert.equal(parsed.options.checkJs, true);
  assert.equal(parsed.options.noEmit, true);
  assert.equal(parsed.options.strict, true);
});
