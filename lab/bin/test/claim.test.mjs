// Claim admission (EXP-E01). Run: node --test lab/bin/test/*.test.mjs (needs git and python3, no engines).
// Print the fixture table: node lab/bin/test/claim-fixtures.mjs
// One fixture set, two implementations (Q41d, Q42a, Q47): every fixture is judged by lab/bin/claim.mjs and, in one python
// process, by the proposed reference model lab/experiments/EXP-E01-claim-evaluator/admit_claim_q47.py.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { sha256 } from '../lib.mjs';
import { admitClaim, canonText, gitSource, objectStore, recompute } from '../claim.mjs';
import { buildFixtures, evaluateLab, evaluateReference } from './claim-fixtures.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-claim-test-'));
const built = buildFixtures(root);
const lab = Object.fromEntries(built.fixtures.map(f => [f.id, evaluateLab(f, built.objects)]));
const ref = evaluateReference(built);
const CLAIM = path.resolve(import.meta.dirname, '../claim.mjs');
const fx = id => built.fixtures.find(x => x.id === id);
process.on('exit', () => fs.rmSync(root, { recursive: true, force: true }));

// The defect each DIAGNOSTIC must be attributed to, so a fixture cannot pass for an unrelated reason.
const CAUSE = {
  'GEN-PREREQS-ONLY': 'MEASUREMENT-MISSING', 'GEN-NULL-OREPLAY-PIN': 'ORACLE-UNPINNED', 'GEN-SUPPLIED-NAMES': 'PREREQ-MISSING', 'GEN-OTHER-TREE': 'RECEIPT-NOT-FRESH',
  'GEN-MISSING-FALSIFIERS': 'CASES-MISSING', 'GEN-COMPOSITION-UNBOUND': 'COMPOSITION-UNBOUND', 'GEN-W0-NULL': 'W0-UNPINNED', 'GEN-NO-W0-RECEIPT': 'PREREQ-MISSING',
  'GEN036-EXCLUDED': 'ORACLE-EXCLUDED', 'GEN036-REFUSED-SET': 'ORACLE-REFUSES',
  'CODEX-R4-FABRICATED': ['OBJECT', 'BUILD-INPUT-STALE'], 'Q42A-ZERO-HASHES': 'OBJECT', 'Q42A-STALE-BINARY': 'BUILD-INPUT-STALE', 'Q42A-BUILD-INPUT-OMITTED': 'BUILD-INPUTS-INCOMPLETE',
  'Q42A-EARLIER-COMMIT-RELABELLED': 'RECEIPT-NOT-FRESH', 'Q42A-STARTED-BEFORE-COMMIT': 'RECEIPT-NOT-FRESH', 'Q42A-OBJECT-CORRUPT': 'OBJECT', 'Q42A-OBJECT-OF-OTHER-CASE': 'OBJECT-NOT-THIS-CASE',
  'Q42A-MODES-SHORT': 'CASES-MISSING', 'Q42A-FAULT-REPS-SHORT': 'FAULT-REPS-SHORT', 'Q42A-UNKNOWN-ID': 'UNKNOWN-OBLIGATION', 'Q42A-UNKNOWN-ID-ONLY': 'UNKNOWN-OBLIGATION',
  'Q42A-NO-CONTROL': 'CONTROL-MISSING', 'Q42A-CONTROL-OTHER-SEED': 'CONTROL-UNMATCHED', 'Q42A-CONTROL-OTHER-WINDOW': 'CONTROL-UNMATCHED', 'Q42A-CORRECTNESS-FAIL': 'CASE-NOT-PASS',
  'Q42A-WRONG-MEASUREMENT': 'NS-RUN-WRONG-MEASUREMENT', 'Q42A-UNFROZEN-TRACE': 'TRACE-NOT-FROZEN', 'Q42A-CONTROL-NO-PREREQ': 'PREREQ-MISSING', 'Q34D-SCREENING-PREREQ': 'RECEIPT-SCREENING',
  'Q42A-DIAGNOSTIC-RUN': 'RECEIPT-RUN-KIND', 'Q42A-NO-VERIFIER': 'VERIFIER-MISSING', 'Q42A-PROMOTION-ON-SCREENING': 'RECEIPT-SCREENING', 'Q42A-VERIFIER-IS-AUTHOR': 'VERIFIER-NOT-INDEPENDENT',
  'CODEX-R6-MODULES-NOT-RETAINED': 'MODULE-NOT-RETAINED', 'CODEX-R6-NOT-A-VERIFIER-RECORD': 'OBJECT-SCHEMA', 'CODEX-R6-REFUSAL-LABELLED-PASS': 'ORACLE-REFUSED', 'Q47A-WRONG-LABELLED-PASS': 'VERDICT-MISMATCH',
  'CODEX-R6-CONTROL-NO-WORKLOAD': 'NS-RUN-SCHEMA', 'CODEX-R6-CANDIDATE-SELECTED-CONTROL': ['RECEIPT-UNUSED', 'CONTROL-MISSING'], 'CODEX-R6-NO-A0-REGISTRY': 'A0-REGISTRY-UNPINNED',
  'CODEX-R6-MIGRATION-INDIRECT-REFUSAL': 'ORACLE-REFUSED', 'Q47C-MIGRATION-REFUSED-CASE-OMITTED': 'CASES-MISSING', 'Q47C-MANIFESTS-UNPINNED': ['SELECTION-UNRESOLVED', 'A0-REGISTRY-UNPINNED'],
  'RT-SWAP-ROLES': 'OBJECT-NOT-THIS-RUN', 'RT-RELABEL-PROFILE': 'OBJECT-NOT-THIS-RUN', 'RT-RELABEL-START': 'OBJECT-NOT-THIS-RUN', 'RT-SLOT-ARRAY': 'COMPOSITION-UNBOUND',
  'RT-PROFILE-TRAILING-SPACE': 'RECEIPT-PROFILE', 'RT-PROFILE-UNDECLARED': 'RECEIPT-PROFILE', 'RT-AUTHORS-MISSING': ['RECEIPT-PRODUCER', 'VERIFIER-NOT-INDEPENDENT'],
  'RT-DEPENDENCY-WORKSPACE': 'DEPENDENCY-UNBOUND', 'RT-NARROW-ROOTS': 'BUILD-ROOTS', 'RT-REPEATED-INJECTION': 'FAULT-WITNESS',
  'RT2-DEP-DOT-SEGMENT': 'MANIFEST', 'RT2-DEP-UPPERCASE': 'DEPENDENCY-UNBOUND', 'RT2-DEP-UNLISTED': 'DEPENDENCY-UNBOUND', 'RT2-DEP-OTHER-WORKSPACE': 'DEPENDENCY-UNBOUND',
  'RT2-DROP-FAIL-ATTEMPT': 'LEDGER-MISMATCH', 'RT2-DROP-NSRUN': 'LEDGER-MISMATCH', 'RT2-COUNTS-EDITED': 'LEDGER-MISMATCH', 'RT2-CONTRACT-RELABEL': 'OBJECT-NOT-THIS-RUN',
  'RT2-LOSSY-BIGINT': 'VERDICT-MISMATCH', 'RT2-LOSSY-SCALE': 'VERDICT-MISMATCH', 'RT2-LOSSY-DUPKEY': 'VERDICT-MISMATCH', 'RT2-INVALID-UTF8': 'VERDICT-MISMATCH',
  'RT2-CONTROL-OTHER-PROFILE': 'CONTROL-UNMATCHED', 'RT2-RUNKIND-SWAP': 'RECEIPT-RUN-KIND', 'RT2-VERIFIER-AGENT-CASE': 'VERIFIER-NOT-INDEPENDENT',
  'RT2-VERIFIER-NO-RERUN': 'VERIFIER-NO-RERUN', 'RT2-SPOT-UNNAMED': 'VERIFIER-RECORD-SCHEMA', 'RT2-PORT-LEADING-ZERO': 'RECEIPT-ENDPOINT',
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

test('every DIAGNOSTIC fixture names its cause; ids are distinct; Codex rounds 4 to 6 are all present', () => {
  assert.equal(new Set(built.fixtures.map(f => f.id)).size, built.fixtures.length);
  for (const f of built.fixtures) if (f.expected === 'DIAGNOSTIC') assert.ok(CAUSE[f.id], `no cause listed for ${f.id}`);
  for (const id of ['CODEX-R4-FABRICATED', 'CODEX-R6-MODULES-NOT-RETAINED', 'CODEX-R6-NOT-A-VERIFIER-RECORD', 'CODEX-R6-REFUSAL-LABELLED-PASS', 'CODEX-R6-CONTROL-NO-WORKLOAD', 'CODEX-R6-CANDIDATE-SELECTED-CONTROL', 'CODEX-R6-MIGRATION-INDIRECT-REFUSAL']) assert.ok(fx(id), id);
});

test('the proposed reference model agrees with the lab evaluator on every shared fixture', () => {
  const disagree = built.fixtures.filter(f => !f.labOnly && ref[f.id].verdict !== lab[f.id].verdict).map(f => `${f.id}: ref ${ref[f.id].verdict} ${JSON.stringify(ref[f.id].reasons)}, lab ${lab[f.id].verdict}`);
  assert.deepEqual(disagree, []);
});

test('Q41d minimum: whatever the reference rejects, the lab rejects; lab-only fixtures are the only place they differ', () => {
  for (const f of built.fixtures) if (ref[f.id].verdict === 'DIAGNOSTIC') assert.equal(lab[f.id].verdict, 'DIAGNOSTIC', f.id);
  for (const f of built.fixtures.filter(x => x.labOnly)) assert.equal(ref[f.id].verdict, 'QUALIFIED', `${f.id} is marked lab-only but the reference rejects it too`);
});

test('CLI: QUALIFIED exits 0, DIAGNOSTIC exits 2 with reasons, --json, usage exits 1', () => {
  const run = (id, ...extra) => {
    const file = path.join(root, `${id}.claim.json`);
    fs.writeFileSync(file, JSON.stringify(fx(id).claim));
    return spawnSync(process.execPath, [CLAIM, 'admit', file, '--repo', fx(id).repo, '--objects', built.objects, ...extra], { encoding: 'utf8' });
  };
  const ok = run('POSITIVE-NS-SCREENING');
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
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
  const f = fx('GEN-NULL-OREPLAY-PIN');
  const file = path.join(f.repo, 'lab/acceptance/obligations.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  doc.oraclePins['O-REPLAY'].acceptReceipt = 'WORKING-TREE-EDIT';
  doc.oraclePins['O-REPLAY'].sha256 = 'f'.repeat(64);
  fs.writeFileSync(file, JSON.stringify(doc));
  assert.equal(evaluateLab(f, built.objects).verdict, 'DIAGNOSTIC');
  execFileSync('git', ['checkout', '--', 'lab/acceptance/obligations.json'], { cwd: f.repo });
});

test('red-team finding 5: malformed inputs are DIAGNOSTIC, never an exception', () => {
  const base = fx('POSITIVE-NS-SCREENING');
  const put = bytes => { const h = sha256(Buffer.from(bytes)); fs.writeFileSync(path.join(built.objects, h), bytes); return h; };
  const nullObject = put('null');
  const mutate = edit => { const claim = structuredClone(base.claim); edit(claim, k => claim.receipts.find(r => r.receiptId.endsWith(`:${k}`))); return claim; };
  const cases = {
    'obligations [null]': c => { c.receipts[0].obligations = [null]; },
    'evidence object bytes null': (c, k) => { k('pos-cand').evidence[0].objectSha256 = nullObject; },
    'manifest object bytes null': (c, k) => { k('pos-cand').profileIdentity.buildManifestSha256 = nullObject; },
    'composition a string': c => { c.receipts[0].composition = 'xtdb'; },
    'receipts not an array': c => { c.receipts = { length: 3 }; },
    'control __proto__': c => { c.control = { id: '__proto__' }; },
    'claim obligations [7]': c => { c.obligations = [7]; },
    'receiptId __proto__': c => { c.receipts[0].receiptId = '__proto__'; },
    'timing missing': c => { delete c.receipts[0].timing; },
    'producer a number': c => { c.receipts[0].producer = 5; },
  };
  for (const [name, edit] of Object.entries(cases)) {
    const r = admitClaim(mutate(edit), { git: gitSource(base.repo), objects: objectStore(built.objects), authorityRef: 'main' });
    assert.equal(r.verdict, 'DIAGNOSTIC', name);
    assert.ok(!r.reasons.some(x => x.code === 'EVALUATOR-ERROR'), `${name} raised: ${JSON.stringify(r.reasons.find(x => x.code === 'EVALUATOR-ERROR'))}`);
  }
  // A thrown error is still fail-closed.
  const boom = admitClaim(base.claim, { git: { ...gitSource(base.repo), treeOf() { throw new Error('boom'); } }, objects: objectStore(built.objects), authorityRef: 'main' });
  assert.equal(boom.verdict, 'DIAGNOSTIC');
  assert.ok(boom.reasons.some(x => x.code === 'EVALUATOR-ERROR'));
});

test('recompute: comparators judge the retained bytes, unknown comparators never pass', () => {
  const b = v => Buffer.from(canonText(v));
  assert.equal(recompute('CMP-EXACT-VALUE', b({ v: '1.50', t: 'decimal' }), b({ t: 'decimal', v: '1.50' })), 'PASS');
  assert.equal(recompute('CMP-EXACT-VALUE', Buffer.from('{"v":"1.50","t":"decimal"}'), b({ t: 'decimal', v: '1.50' })), 'UNCOMPARABLE');
  assert.equal(recompute('CMP-EXACT-VALUE', b({ t: 'decimal', v: '1.50' }), b({ t: 'decimal', v: '1.5' })), 'FAIL');
  assert.equal(recompute('CMP-SET-ROWS', b([[1], [2], [2]]), b([[2], [1]])), 'PASS');
  assert.equal(recompute('CMP-BAG-ROWS', b([[1], [2], [2]]), b([[2], [1]])), 'FAIL');
  assert.equal(recompute('CMP-ORDERED-ROWS', b([[1], [2]]), b([[2], [1]])), 'FAIL');
  assert.equal(recompute('CMP-ERROR', b({ _tag: 'InvalidTripleError', reasons: ['invalid-value'] }), b({ _tag: 'InvalidTripleError', reason: 'invalid-value', cause: {}, rows: [] })), 'PASS');
  assert.equal(recompute('CMP-ERROR', b({ _tag: 'InvalidTripleError', reason: 'invalid-value' }), b({ _tag: 'InvalidTripleError', reason: 'invalid-value' })), 'FAIL');
  assert.equal(recompute('CMP-NEW', b(1), b(1)), 'UNCOMPARABLE');
  assert.equal(recompute('CMP-EXACT-VALUE', Buffer.from('X-NOT-MODELED'), b(1)), 'UNCOMPARABLE');
  // Canonical answers only (red-team v2 finding 5): lossy parses, floats, -0, whitespace, unsorted keys and deep nesting never pass.
  for (const bad of ['{"v":9007199254740993}', '{"v":1e400}', '{"v":12.30}', '{"v":0.5}', '{"v":-0}', '{"v":"a","v":"a"}', '{ "v":1}', '{"b":1,"a":2}', '['.repeat(70) + ']'.repeat(70)])
    assert.equal(recompute('CMP-EXACT-VALUE', Buffer.from(bad), Buffer.from(bad)), 'UNCOMPARABLE', bad);
  assert.equal(recompute('CMP-EXACT-VALUE', Buffer.from([0x22, 0xff, 0x22]), Buffer.from([0x22, 0xff, 0x22])), 'UNCOMPARABLE');
  assert.equal(recompute('CMP-EXACT-VALUE', Buffer.from('['.repeat(50000) + ']'.repeat(50000)), b(1)), 'UNCOMPARABLE');
  // CMP-ERROR needs a named reason: an expected error with none never matches.
  assert.equal(recompute('CMP-ERROR', b({ _tag: 'E' }), b({ _tag: 'E', cause: {} })), 'UNCOMPARABLE');
});

test('gitSource parses cat-file --batch and ls-tree for binary blobs, spaces, tabs, missing paths, directories and pathspec magic', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-claim-git-'));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const git = args => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@lab.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, env, encoding: 'utf8' }).trim();
  git(['init', '-q', '-b', 'main']);
  const a = Buffer.from([0, 10, 10, 255, 32, 10, 1]), b = Buffer.from('second\n'), c = Buffer.from('third\n');
  fs.mkdirSync(path.join(dir, 'd'));
  fs.writeFileSync(path.join(dir, 'd/a.bin'), a);
  fs.writeFileSync(path.join(dir, 'b with space.txt'), b);
  fs.writeFileSync(path.join(dir, 'd/c\tt.txt'), c);
  git(['add', '-A']); git(['commit', '-q', '-m', 'x']);
  const head = git(['rev-parse', 'HEAD']);
  const hashes = gitSource(dir).blobHashes(head, ['d/a.bin', 'missing file.txt', 'd', 'b with space.txt', '../escape', 'x\u0000y', ':(exclude)d']);
  assert.deepEqual(Object.fromEntries(hashes), { 'd/a.bin': sha256(a), 'missing file.txt': null, d: null, 'b with space.txt': sha256(b), '../escape': null, 'x\u0000y': null, ':(exclude)d': null });
  assert.deepEqual(gitSource(dir).list(head, ['d']), ['d/a.bin', 'd/c\tt.txt']);
  assert.equal(gitSource(dir).list(head, [':(exclude)d']), null);
  for (const p of ['./d/a.bin', 'd//a.bin', 'd/./a.bin', '/d/a.bin', 'd/a.bin/']) assert.equal(gitSource(dir).blobHashes(head, [p]).get(p), null, p);
  // Symlinks are reported with their mode, so a build input that is a link can be refused.
  fs.symlinkSync('a.bin', path.join(dir, 'd/link'));
  git(['add', '-A']); git(['commit', '-q', '-m', 'link']);
  assert.deepEqual(gitSource(dir).entries(git(['rev-parse', 'HEAD']), ['d']).find(e => e.path === 'd/link'), { mode: '120000', path: 'd/link' });
  fs.rmSync(dir, { recursive: true, force: true });
});
