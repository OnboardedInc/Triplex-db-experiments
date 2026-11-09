// [EXP-K01-VK01-R5] Why: validate actual process wiring and consumer schemas as well as the observation envelope. Rejected: injecting only success-shaped process objects (can conceal incompatible stdio and missing fields).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { test, after } from 'node:test';
import * as observations from '../../bin/observation.ts';
import { seedPathOf } from '../../bench/lib/bulk.ts';
import { planShape, digest, compareFreeze } from '../../bench/lib/clone.ts';
const root = path.resolve(import.meta.dirname, '../../..');
const out = path.join(import.meta.dirname, 'evidence/review-round5');
const scratch = path.join(import.meta.dirname, 'tmp/observation-review');
fs.mkdirSync(scratch, { recursive: true });
const engine = fs.readFileSync(path.join(root, 'lab/bin/engine.mjs'), 'utf8');
const checker = fs.readFileSync(path.join(root, 'lab/bench/clone-check.ts'), 'utf8');
const cases = [];
function section(source, start, end) { const a = source.indexOf(start), b = source.indexOf(end, a + start.length); assert.ok(a >= 0 && b > a); return source.slice(a, b); }
after(() => { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'observation-review-cases.json'), JSON.stringify(cases, null, 2) + '\n'); fs.rmSync(scratch, { recursive: true, force: true }); });
for (const mode of ['settle', 'freeze', 'verify', 'child-failure']) test(`actual cloneCheck subprocess preserves valid observations: ${mode}`, () => {
  const dir = fs.mkdtempSync(path.join(scratch, 'child-')); fs.mkdirSync(path.join(dir, 'lab/bench'), { recursive: true });
  const stub = "process.stdout.write(JSON.stringify({ok:true,mode:process.argv[2]}));if(process.argv[2]==='child-failure')process.exitCode=1;\n";
  fs.writeFileSync(path.join(dir, 'lab/bench/clone-check.ts'), stub);
  let raw, result, error;
  const cloneCheck = vm.runInNewContext(section(engine, 'function cloneCheck(args)', '\nfunction requireHeldXtdbSlot') + ';cloneCheck', {
    ...observations, path, REPO: dir, process,
    spawnSync: (...args) => { raw = spawnSync(...args); return raw; },
  });
  try { result = cloneCheck([mode]); } catch (e) { error = { message: e.message, observation: e.observation }; }
  cases.push({ kind: 'cloneCheck', mode, stub, raw: { status: raw.status, signal: raw.signal, stdout: raw.stdout, stderr: raw.stderr, error: raw.error?.message ?? null }, result, error });
  if (mode === 'child-failure') assert.ok(error);
  else { assert.equal(raw.status, 0); assert.equal(raw.signal, null); assert.deepEqual(JSON.parse(raw.stdout), { ok: true, mode }); assert.equal(error, undefined, 'successful JSON child must be accepted using real configured stdio'); }
});
for (const [name, owner] of [['json-null', null], ['empty-object', {}], ['empty-holder', { holder: '' }], ['missing-holder', { lifecycle: { state: 'RUNNING' } }], ['valid-writer', { holder: 'fixture-holder', lifecycle: { state: 'RUNNING' } }], ['absent', undefined]]) test(`driver owner observation refuses malformed present file: ${name}`, () => {
  const dir = fs.mkdtempSync(path.join(scratch, 'owner-')), manifest = { format: 'tx2-xtdb-seed/1', lane: 'xtdb', scope: 'fixture' };
  const file = path.join(dir, 'manifest.json'), ownerFile = path.join(dir, 'owner.json'); fs.writeFileSync(file, JSON.stringify(manifest));
  if (name !== 'absent') fs.writeFileSync(ownerFile, JSON.stringify(owner));
  let result, error; try { result = seedPathOf(manifest, file, ownerFile); } catch (e) { error = e.message; }
  cases.push({ kind: 'driver-owner', name, owner, result, error });
  if (name === 'valid-writer') assert.equal(result.seededBy, 'seed-writer');
  else if (name === 'absent') assert.equal(result.seededBy, 'unverified');
  else assert.ok(error, 'present malformed owner must be a failed observation, not unverified/writer provenance');
});
const basePlan = () => ({ depth: '->', op: 'scan', page_count: 4, row_count: 9, attributes: { scan_db: 'xtdb', scan_source: 'tx_assertions', scan_files_pruned: 1, scan_files_used: 3, scan_pages_pruned: 2, scan_pages_used: 7, scan_rows_read: 120 } });
for (const field of ['page_count', 'row_count', 'depth', 'op', 'scan_source', 'scan_files_used', 'scan_rows_read']) test(`C8 required plan field cannot become matching absence: ${field}`, () => {
  const row = basePlan(); if (field.startsWith('scan_')) delete row.attributes[field]; else delete row[field];
  let result, error;
  try {
    const acquired = observations.complete(observations.observe('SQL rows', { sql: 'EXPLAIN ANALYZE fixture', source: 'current fixture' }, () => [row], observations.rows));
    const producer = observations.observe('fingerprint c8', { source: 'current fixture' }, () => acquired, rows => { const normalized = planShape(rows); return { resultSha256: digest(['same pull']), plan: { rows: normalized, sha256: digest(normalized) } }; });
    const c8 = observations.complete(producer);
    result = { producer, c8: compareFreeze({ c8 }, { c8 }, { result: { lastPosition: 1 } }).C8 };
  } catch (e) { error = { message: e.message, observation: e.observation }; }
  cases.push({ kind: 'plan-required-field', field, row, result, error });
  assert.ok(error, 'required source-schema fields must fail before hashing or C8 comparison');
});
test('C8 non-scan attributes may be explicitly null while counters remain present', () => {
  const row = { ...basePlan(), op: 'project', attributes: null };
  const value = planShape([row]); assert.equal(value[0].scan, null); assert.equal(value[0].pageCount, 4); assert.equal(value[0].rowCount, 9);
});
const printSource = stripTypeScriptTypes(section(checker, 'const print =', '/** GNU wget'));
const exitSource = checker.trim().split('\n').at(-1);
assert.equal(exitSource, 'setTimeout(() => process.exit(0), 200).unref();');
for (const [name, value] of [['ok-false', { ok: false }], ['settled-false', { settled: false }], ['verdict-fail', { verdict: 'FAIL' }], ['pass', { ok: true }]]) for (const heldOpen of [false, true]) test(`CLI process result retains semantic status: ${name}, heldOpen=${heldOpen}`, () => {
  // [EXP-K01-VK01-R5] Why: a bounded remaining handle models pending shutdown/diagnostic work without hanging the test. Rejected: relying on the unref timer never firing (a lifetime assumption, not a status guarantee).
  const keeper = heldOpen ? 'const keeper=setInterval(()=>{},1000);setTimeout(()=>clearInterval(keeper),350);' : '';
  const program = `${printSource}\n${keeper}\nprint(${JSON.stringify(value)});\n${exitSource}\n`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', program], { encoding: 'utf8', timeout: 2000 });
  cases.push({ kind: 'CLI-exit', name, heldOpen, program, status: r.status, signal: r.signal, error: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr });
  assert.equal(r.signal, null); assert.equal(r.error, undefined); assert.deepEqual(JSON.parse(r.stdout), value);
  assert.equal(r.status, name === 'pass' ? 0 : 1, 'remaining handles must not convert a semantic failure into exit zero');
});
