// [EXP-CHECKJS-R2] Why: retain fresh commands and exact source/dependency bytes for
// this wider inventory. Rejected: adopting round 1's receipts for newly covered entry points.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { trackedCoverage } from '../../../bin/checkjs.mjs';
import { LOCKS } from '../../../bin/lib.mjs';

const root = path.resolve(import.meta.dirname, '../../../..');
const durable = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-CHECKJS/round2';
const attempt = path.join(durable, new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(attempt, { recursive: false });
/** @param {string | Buffer} bytes */
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
/** @param {string} name @param {unknown} value */
const save = (name, value) => fs.writeFileSync(path.join(attempt, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
/** @type {{ file: string, bytes: string, owner: any } | undefined} */
let grant;
for (const slot of fs.readdirSync(path.join(LOCKS, 'heavy'))) {
  const file = path.join(LOCKS, 'heavy', slot, 'owner.json');
  try {
    const bytes = fs.readFileSync(file, 'utf8'), owner = JSON.parse(bytes);
    if (owner.pid === process.ppid) grant = { file, bytes, owner };
  } catch { /* Other workers can release their own tokens during the inventory. */ }
}
assert(grant && grant.owner.label === 'CX-CHECKJS-r2-final', 'verification requires its own heavy wrapper');
save('heavy-grant.json', { ...grant, sha256: sha(grant.bytes) });
const base = '3575785aff5ab36bc92eee6131f4b5b0ffe83c5d';
const inventory = trackedCoverage(root, path.join(root, 'lab/checkjs-exclusions.json'));
const sourceNames = [...inventory.tracked, 'lab/tsconfig.checkjs.json', 'lab/checkjs-exclusions.json', 'node_modules/typescript/package.json'];
const sources = sourceNames.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
save('sources.json', { base, node: process.version, typescript: ts.version, sources });
save('coverage.json', { tracked: inventory.tracked, checked: inventory.checked, generated: inventory.generated, excluded: [...inventory.excluded] });
const config = ts.readConfigFile(path.join(root, 'lab/tsconfig.checkjs.json'), ts.sys.readFile);
assert.equal(config.error, undefined);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.join(root, 'lab'));
const program = ts.createProgram(parsed.fileNames, parsed.options);
const dependencies = program.getSourceFiles().filter(file => !inventory.checked.includes(path.relative(root, file.fileName)))
  .map(file => ({ file: file.fileName, sha256: sha(fs.readFileSync(file.fileName)) }));
save('dependencies.json', dependencies);
const changed = execFileSync('git', ['diff', base, '--name-only', '--diff-filter=M'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
for (const file of inventory.excluded.keys()) assert(!changed.includes(file), `archived exclusion bytes changed: ${file}`);
const printer = ts.createPrinter({ removeComments: true });
/** @param {string} file @param {Buffer} bytes */
const printed = (file, bytes) => {
  const tree = ts.createSourceFile(file, bytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ts.transpileModule(bytes.toString(), { fileName: file, reportDiagnostics: true, compilerOptions: { allowJs: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).diagnostics?.length ?? 0, 0, file);
  return printer.printFile(tree);
};
/** @type {Map<string, string>} */
const pins = new Map();
/** @param {any} value */
function visitPins(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.path === 'string' && typeof value.sha256 === 'string') pins.set(value.path, value.sha256);
  for (const [key, nested] of Object.entries(value)) {
    if (inventory.tracked.includes(key) && typeof nested === 'string' && /^[a-f0-9]{64}$/.test(nested)) pins.set(key, nested);
    visitPins(nested);
  }
}
visitPins(JSON.parse(fs.readFileSync(path.join(root, 'lab/acceptance/obligations.json'), 'utf8')));
const comparisons = changed.filter(file => /\.[cm]?js$/.test(file)).map(file => {
  const before = execFileSync('git', ['show', `${base}:${file}`], { cwd: root });
  const after = fs.readFileSync(path.join(root, file));
  const same = printed(file, before) === printed(file, after);
  if (!['lab/bin/checkjs.mjs', 'lab/bin/test/checkjs.test.mjs'].includes(file)) assert(same, `unexpected runtime change: ${file}`);
  return { file, oldSha256: sha(before), newSha256: sha(after), identicalExecutableSource: same, pinnedSha256: pins.get(file) ?? null };
});
save('printer.json', comparisons);
console.log(JSON.stringify({ attempt, checked: inventory.checked.length, excluded: inventory.excluded.size, generated: inventory.generated.length, identical: comparisons.filter(file => file.identicalExecutableSource).length }));
/** @type {[string, string[]][]} */
const commands = [
  ['checker', ['lab/bin/checkjs.mjs']],
  ['plain-tsc', ['node_modules/typescript/bin/tsc', '-p', 'lab/tsconfig.checkjs.json', '--pretty', 'false']],
  ['coverage-and-plants', ['--test', 'lab/bin/test/checkjs.test.mjs']],
];
// [EXP-CHECKJS-R2] Why: retain a broad contract-pin failure, then allow a clearly
// scoped static rerun after report-runner changes. Rejected: re-pinning the contract here.
if (process.argv[2] !== '--static-only') commands.push(['lab-and-scenario-tests', ['--test', 'lab/bin/test/lab.test.mjs', 'lab/bin/test/datomic-context.test.mjs', 'lab/bin/test/claim.test.mjs', 'lab/bin/test/claim-round2.test.mjs', 'lab/scenarios/lib/runner.test.mjs']]);
for (const [name, args] of commands) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 ** 2 });
  fs.writeFileSync(path.join(attempt, `${name}.stdout.txt`), result.stdout ?? '', { flag: 'wx' });
  fs.writeFileSync(path.join(attempt, `${name}.stderr.txt`), result.stderr ?? '', { flag: 'wx' });
  save(`${name}.outcome.json`, { args, startedAt, finishedAt: new Date().toISOString(), status: result.status, signal: result.signal });
  assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  if (name.includes('tests') || name === 'coverage-and-plants') {
    assert.match(result.stdout, /^# fail 0$/m);
    assert.match(result.stdout, /^# tests [1-9][0-9]*$/m);
  }
  if (name === 'checker') assert.match(result.stdout, new RegExp(`checkjs: ${inventory.checked.length} JavaScript roots checked; no diagnostics or suppressed binding errors`));
  console.log(`${name}: exit=0`);
}
for (const source of [...sources, ...dependencies]) assert.equal(sha(fs.readFileSync(path.resolve(root, source.file))), source.sha256, `input changed during validation: ${source.file}`);
assert.equal(fs.readFileSync(grant.file, 'utf8'), grant.bytes, 'heavy owner changed during validation');
save('summary.json', { completedAt: new Date().toISOString(), meaning: 'Local assertion-bearing static and unit gates only; no engine or production qualification.', commands, checked: inventory.checked.length, sourceBytesUnchanged: true });
console.log('All local checks completed; source and compiler dependency bytes unchanged.');
