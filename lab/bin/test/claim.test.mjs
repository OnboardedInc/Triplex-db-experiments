// Claim admission (EXP-E01). Run: node --test lab/bin/test/*.test.mjs (about 20 s; needs git and python3, no engines).
// Print the fixture table: node lab/bin/test/claim-fixtures.mjs
// One fixture set, two implementations (Q41d, Q42a): every fixture is judged by lab/bin/claim.mjs and, in one python process,
// by the generator's admit_claim as compiled in 0.3.5 and by the proposed Q42a reference model.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { sha256 } from '../lib.mjs';
import { gitSource } from '../claim.mjs';
import { buildFixtures, evaluateLab, evaluateReference } from './claim-fixtures.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-claim-test-'));
const built = buildFixtures(root);
const lab = Object.fromEntries(built.fixtures.map(f => [f.id, evaluateLab(f, built.objects)]));
const ref = evaluateReference(built);
const CLAIM = path.resolve(import.meta.dirname, '../claim.mjs');
process.on('exit', () => fs.rmSync(root, { recursive: true, force: true }));

// The defect each DIAGNOSTIC must be attributed to (so a fixture cannot pass for an unrelated reason).
const CAUSE = {
  'GEN-PREREQS-ONLY': 'MEASUREMENT-MISSING', 'GEN-NULL-OREPLAY-PIN': 'ORACLE-UNPINNED', 'GEN-SUPPLIED-NAMES': 'PREREQ-MISSING',
  'GEN-OTHER-TREE': 'RECEIPT-SOURCE-LABEL', 'GEN-MISSING-FALSIFIERS': 'CASES-MISSING', 'GEN-COMPOSITION-UNBOUND': 'COMPOSITION-UNBOUND',
  'GEN-W0-NULL': 'W0-UNPINNED', 'GEN-NO-W0-RECEIPT': 'PREREQ-MISSING',
  'CODEX-R4-FABRICATED': ['OBJECT', 'BUILD-INPUT-STALE'], 'Q42A-ZERO-HASHES': 'OBJECT', 'Q42A-STALE-BINARY': 'BUILD-INPUT-STALE',
  'Q42A-BUILD-INPUT-OMITTED': 'BUILD-INPUTS-INCOMPLETE', 'Q42A-EARLIER-COMMIT-RELABELLED': 'RECEIPT-NOT-FRESH', 'Q42A-STARTED-BEFORE-COMMIT': 'RECEIPT-NOT-FRESH',
  'Q42A-OBJECT-CORRUPT': 'OBJECT', 'Q42A-OBJECT-OF-OTHER-CASE': 'OBJECT-NOT-THIS-RECEIPT', 'Q42A-MODES-SHORT': 'CASES-MISSING',
  'Q42A-FAULT-REPS-SHORT': 'FAULT-REPS-SHORT', 'Q42A-UNKNOWN-ID': 'UNKNOWN-OBLIGATION', 'Q42A-UNKNOWN-ID-ONLY': 'UNKNOWN-OBLIGATION',
  'Q42A-NO-CONTROL': 'CONTROL-MISSING', 'Q42A-CONTROL-OTHER-SEED': 'CONTROL-UNMATCHED', 'Q42A-CONTROL-OTHER-WINDOW': 'CONTROL-UNMATCHED',
  'Q42A-CORRECTNESS-FAIL': 'CASE-NOT-PASS', 'Q42A-WRONG-MEASUREMENT': 'NS-RUN-WRONG-MEASUREMENT', 'Q42A-UNFROZEN-TRACE': 'TRACE-NOT-FROZEN',
  'Q42A-CONTROL-NO-PREREQ': 'PREREQ-MISSING', 'Q34D-SCREENING-PREREQ': 'RECEIPT-SCREENING', 'Q42A-DIAGNOSTIC-RUN': 'RECEIPT-RUN-KIND',
  'Q42A-PROMOTION-NO-VERIFIER': 'VERIFIER-MISSING', 'Q42A-PROMOTION-ON-SCREENING': 'RECEIPT-SCREENING', 'Q42A-VERIFIER-IS-AUTHOR': 'VERIFIER-NOT-INDEPENDENT',
  'LAB-BRANCH-PINS-OWN-ORACLE': 'CONTRACT-NOT-AUTHORITY', 'LAB-ORACLE-FILE-DRIFT': 'ORACLE-FILES', 'LAB-IMAGE-NOT-PINNED': 'IMAGE-NOT-PINNED',
  'LAB-FORBIDDEN-ENDPOINT': 'RECEIPT-ENDPOINT', 'LAB-ADMISSION-BLOCKED': 'RECEIPT-ADMISSION', 'LAB-SKIPPED-CASE': 'RECEIPT-COUNTS',
};

for (const f of built.fixtures) {
  test(`lab evaluator: ${f.id} is ${f.expected}`, () => {
    const r = lab[f.id];
    assert.equal(r.verdict, f.expected, JSON.stringify(r.reasons.slice(0, 5)));
    if (f.expected === 'DIAGNOSTIC') for (const code of [CAUSE[f.id]].flat()) assert.ok(r.reasons.some(x => x.code === code), `${f.id} should cite ${code}: ${r.reasons.map(x => x.code)}`);
  });
}

test('every DIAGNOSTIC fixture names its cause, and every fixture has a distinct id', () => {
  assert.equal(new Set(built.fixtures.map(f => f.id)).size, built.fixtures.length);
  for (const f of built.fixtures) if (f.expected === 'DIAGNOSTIC') assert.ok(CAUSE[f.id], `no cause listed for ${f.id}`);
});

test('proposed Q42a reference model agrees with the lab evaluator on every shared fixture', () => {
  const disagree = built.fixtures.filter(f => !f.labOnly && ref[f.id].refQ42a !== lab[f.id].verdict).map(f => `${f.id}: ref ${ref[f.id].refQ42a} ${JSON.stringify(ref[f.id].q42aReasons)}, lab ${lab[f.id].verdict}`);
  assert.deepEqual(disagree, []);
});

test('Q41d minimum: whatever either reference model rejects, the lab evaluator rejects', () => {
  for (const f of built.fixtures) for (const k of ['ref035', 'refQ42a'])
    if (ref[f.id][k] === 'DIAGNOSTIC') assert.equal(lab[f.id].verdict, 'DIAGNOSTIC', `${f.id}: ${k} rejects, lab admits`);
});

test('the 0.3.5 reference gives the expected verdict on every fixture ported from its own self-check', () => {
  for (const f of built.fixtures.filter(x => x.id.startsWith('GEN-') && x.id !== 'GEN-PREREQS-ONLY')) assert.equal(ref[f.id].ref035, f.expected, f.id);
  // Recorded, not endorsed: the 0.3.5 model admits Codex's fabricated receipt and the prerequisites-only claim (Q42a's reason to exist).
  assert.equal(ref['CODEX-R4-FABRICATED'].ref035, 'QUALIFIED');
  assert.equal(ref['GEN-PREREQS-ONLY'].ref035, 'QUALIFIED');
});

test('CLI: QUALIFIED exits 0, DIAGNOSTIC exits 2 with reasons, --json, usage exits 1', () => {
  const run = (id, ...extra) => {
    const f = built.fixtures.find(x => x.id === id);
    const file = path.join(root, `${id}.claim.json`);
    fs.writeFileSync(file, JSON.stringify(f.claim));
    return spawnSync(process.execPath, [CLAIM, 'admit', file, '--repo', f.repo, '--objects', built.objects, ...extra], { encoding: 'utf8' });
  };
  const ok = run('POSITIVE-NS-SCREENING');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout.trim(), 'QUALIFIED');
  const bad = run('CODEX-R4-FABRICATED');
  assert.equal(bad.status, 2);
  assert.match(bad.stdout, /^DIAGNOSTIC\n/);
  assert.match(bad.stdout, /BUILD-INPUT-STALE/);
  assert.match(bad.stdout, /more OBJECT reasons/);
  const js = JSON.parse(run('Q42A-UNKNOWN-ID', '--json').stdout);
  assert.equal(js.verdict, 'DIAGNOSTIC');
  assert.ok(js.reasons.some(r => r.code === 'UNKNOWN-OBLIGATION'));
  assert.equal(spawnSync(process.execPath, [CLAIM, 'nonsense'], { encoding: 'utf8' }).status, 1);
});

test('uncommitted pins in the working tree have no effect: the contract is read from the claimed commit and the authority ref', () => {
  const f = built.fixtures.find(x => x.id === 'GEN-NULL-OREPLAY-PIN');
  const file = path.join(f.repo, 'lab/acceptance/obligations.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  doc.oraclePins['O-REPLAY'].acceptReceipt = 'WORKING-TREE-EDIT';
  doc.oraclePins['O-REPLAY'].sha256 = 'f'.repeat(64);
  fs.writeFileSync(file, JSON.stringify(doc));
  assert.equal(evaluateLab(f, built.objects).verdict, 'DIAGNOSTIC');
  execFileSync('git', ['checkout', '--', 'lab/acceptance/obligations.json'], { cwd: f.repo });
});

test('gitSource.blobHashes parses cat-file --batch output for binary blobs, missing paths and directories', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-claim-git-'));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const git = args => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@lab.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, env, encoding: 'utf8' }).trim();
  git(['init', '-q', '-b', 'main']);
  const a = Buffer.from([0, 10, 10, 255, 32, 10, 1]), b = Buffer.from('second\n');
  fs.mkdirSync(path.join(dir, 'd'));
  fs.writeFileSync(path.join(dir, 'd/a.bin'), a);
  fs.writeFileSync(path.join(dir, 'b.txt'), b);
  git(['add', '-A']); git(['commit', '-q', '-m', 'x']);
  const head = git(['rev-parse', 'HEAD']);
  const hashes = gitSource(dir).blobHashes(head, ['d/a.bin', 'missing.txt', 'd', 'b.txt', '../escape']);
  assert.deepEqual(Object.fromEntries(hashes), { 'd/a.bin': sha256(a), 'missing.txt': null, d: null, 'b.txt': sha256(b), '../escape': null });
  assert.deepEqual(gitSource(dir).list(head, ['d']), ['d/a.bin']);
  fs.rmSync(dir, { recursive: true, force: true });
});
