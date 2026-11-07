// Claim admission (EXP-E01). Run: node --test lab/bin/test/*.test.mjs (needs git, tar and python3; no engines or Docker).
// Print the document fixture table: node lab/bin/test/claim-fixtures.mjs
//
// Three things are checked.
//   1. The contract's reference model: admitCore reaches lab/acceptance/build_contract.py admit_claim's verdict on every call
//      the contract's own self-check makes (claim_ref.py records them with their exact inputs), and on every document fixture
//      that is not lab-only (Q41d: the reference is the minimum).
//   2. Documents (claim.mjs admit): every fixture's documentVerdict and its cause; the verdict itself is always DIAGNOSTIC (Q55a).
//   3. Runs (claim.mjs qualify, offline): the evaluator's own builds, manifest-resolved cases, oracle answers and comparator;
//      supplied records ignored; no path to QUALIFIED while the gate is plan-only.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { sha256, sourceTreeIdOf } from '../lib.mjs';
import { admitClaim, admitCore, canonText, coreContext, gitSource, localSut, objectStore, qualifyClaim, recompute, storeFrom } from '../claim.mjs';
import { buildFixtures, evaluateLab, evaluateReference } from './claim-fixtures.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-claim-test-'));
const built = buildFixtures(root);
const lab = Object.fromEntries(built.fixtures.map(f => [f.id, evaluateLab(f, built.objects)]));
const ref = evaluateReference(built);
const CLAIM = path.resolve(import.meta.dirname, '../claim.mjs');
const GATE = path.resolve(import.meta.dirname, '../gate.mjs');
const CONTRACT = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../acceptance/obligations.json'), 'utf8'));
const fx = id => built.fixtures.find(x => x.id === id);
const codes = r => r.reasons.map(x => x.code);
process.on('exit', () => fs.rmSync(root, { recursive: true, force: true }));

// The defect each DIAGNOSTIC document must be attributed to, so a fixture cannot pass for an unrelated reason.
const CAUSE = {
  'GEN-PREREQS-ONLY': 'MEASUREMENT-MISSING', 'GEN-NULL-OREPLAY-PIN': 'ORACLE-UNPINNED', 'GEN-SUPPLIED-NAMES': 'PREREQ-MISSING', 'GEN-OTHER-TREE': 'PREREQ-MISSING',
  'GEN-MISSING-FALSIFIERS': 'CASES-MISSING', 'GEN-COMPOSITION-UNBOUND': 'COMPOSITION-UNBOUND', 'GEN-W0-NULL': 'W0-UNPINNED', 'GEN-NO-W0-RECEIPT': 'PREREQ-MISSING',
  'GEN-EXCLUDED': 'ORACLE-EXCLUDED', 'GEN-REFUSED-SET': 'ORACLE-REFUSES', 'GEN-STALE-DEFINITION': 'MEASUREMENT-MISSING',
  'CODEX-R4-FABRICATED': ['RECEIPT-INVALID', 'BUILD-INPUT-STALE'], 'Q42A-STALE-BINARY': 'BUILD-INPUT-STALE', 'Q42A-EARLIER-COMMIT': 'PREREQ-MISSING', 'Q42A-BEFORE-CLOSURE': 'PREREQ-MISSING',
  'Q42A-OBJECT-CORRUPT': 'PREREQ-MISSING', 'Q42A-OBJECT-OF-OTHER-CASE': 'RECEIPT-INVALID', 'Q42A-MODES-SHORT': 'PREREQ-MISSING', 'Q42A-FAULT-REPS-SHORT': 'PREREQ-MISSING',
  'Q42A-UNKNOWN-ID': 'UNKNOWN-OBLIGATION', 'Q42A-NO-CONTROL': 'CONTROL-UNMATCHED', 'Q42A-CONTROL-OTHER-SEED': 'CONTROL-UNMATCHED', 'Q42A-CONTROL-OTHER-WINDOW': 'CONTROL-UNMATCHED',
  'Q42A-CORRECTNESS-FAIL': 'MEASUREMENT-MISSING', 'Q42A-NO-VERIFIER': 'MEASUREMENT-MISSING',
  'CODEX-R6-MODULES-NOT-RETAINED': 'PREREQ-MISSING', 'CODEX-R6-BINARY-NOT-RETAINED': 'PREREQ-MISSING', 'CODEX-R6-NOT-A-VERIFIER-RECORD': 'PREREQ-MISSING',
  'CODEX-R6-REFUSAL-LABELLED-PASS': 'MEASUREMENT-MISSING', 'Q47A-WRONG-LABELLED-PASS': 'MEASUREMENT-MISSING', 'CODEX-R6-CONTROL-NO-WORKLOAD': ['MEASUREMENT-MISSING', 'WORKLOAD-IDENTITY'],
  'CODEX-R6-CANDIDATE-SELECTED-CONTROL': 'CONTROL-UNMATCHED', 'CODEX-R6-NO-A0-REGISTRY': 'A0-REGISTRY-NULL', 'CODEX-R6-MIGRATION-INDIRECT-REFUSAL': ['ORACLE-REFUSES', 'MEASUREMENT-MISSING'],
  'Q47C-MANIFESTS-UNPINNED': ['SELECTION-UNRESOLVED', 'A0-REGISTRY-NULL'], 'CODEX-R7-INVENTED-CASES': 'CASES-MISSING', 'CODEX-R7-CANDIDATE-AS-A0': 'BUILD-INPUT-STALE',
  'RT-SWAP-ROLES': 'MEASUREMENT-MISSING', 'RT-RELABEL-PROFILE': 'LEDGER', 'RT-SCREENING-PREREQ': 'RECEIPT-SCREENING', 'RT-RUNKIND-SWAP': 'RECEIPT-RUN-KIND',
  'RT-CONTROL-OTHER-PROFILE': 'CONTROL-UNMATCHED', 'RT-SLOT-ARRAY': 'COMPOSITION-UNBOUND', 'RT-VERIFIER-IS-AUTHOR': 'VERIFIER-NOT-INDEPENDENT', 'RT-DROP-FAIL-ATTEMPT': 'LEDGER-MISMATCH',
  'RT-COUNTS-EDITED': 'LEDGER-MISMATCH', 'RT-CONTRACT-RELABEL': 'LEDGER', 'RT-FAULTREPS-RELABEL': 'LEDGER-MISMATCH', 'RT-DEP-UPPERCASE': 'DEPENDENCY-UNBOUND',
  'RT-DEP-UNLISTED': 'DEPENDENCY-UNBOUND', 'RT-DEP-OTHER-WORKSPACE': 'DEPENDENCY-UNBOUND', 'RT-NARROW-ROOTS': 'BUILD-ROOTS',
  'LAB-BRANCH-PINS-OWN-ORACLE': 'CONTRACT-NOT-AUTHORITY', 'LAB-ORACLE-FILE-DRIFT': 'ORACLE-FILES', 'LAB-IMAGE-NOT-PINNED': 'IMAGE-NOT-PINNED',
  'LAB-FORBIDDEN-ENDPOINT': 'RECEIPT-ENDPOINT', 'LAB-ADMISSION-BLOCKED': 'RECEIPT-ADMISSION', 'LAB-CONTROL-NO-PREREQ': 'PREREQ-MISSING',
};

// ---------------------------------------------------------------- 1. the contract's reference model

test('admitCore reaches the contract\'s verdict on every admit_claim call of the contract\'s own self-check', () => {
  assert.deepEqual(ref.selfCheckErrors, [], 'the contract self-check itself reports admission errors');
  const fixtures = ref.contractFixtures;
  assert.ok(fixtures.length >= 46 && fixtures.filter(f => f.verdict === 'QUALIFIED').length >= 2, `only ${fixtures.length} contract fixtures`);
  for (const cx of ['CX-R6-UNOPENED-MEANING', 'CX-R6-UNMATCHED-CONTROL', 'CX-R6-INDIRECT-REFUSAL']) assert.ok(fixtures.some(f => f.label === cx && f.verdict === 'DIAGNOSTIC'), cx);
  const disagree = [];
  for (const f of fixtures) {
    const bytes = new Map(f.store.map(([h, b]) => [h, Buffer.from(b, 'base64')]));
    const env = { store: storeFrom(h => bytes.get(h) ?? null), ...(f.dependencyClosureChangedAt == null ? {} : { dependencyClosureChangedAt: f.dependencyClosureChangedAt }) };
    const r = admitCore(f.claim, env, coreContext(CONTRACT, { pins: f.pins, w0: f.w0, a0: f.a0 }));
    if (r.verdict !== f.verdict) disagree.push(`line ${f.line} ${f.label}: contract ${f.verdict}, admitCore ${r.verdict} ${JSON.stringify(r.reasons)}`);
  }
  assert.deepEqual(disagree, []);
});

test('the contract\'s admit_claim reaches the lab\'s document verdict on every shared document fixture', () => {
  const disagree = built.fixtures.filter(f => !f.labOnly && ref.documents[f.id].verdict !== lab[f.id].documentVerdict).map(f => `${f.id}: contract ${ref.documents[f.id].verdict}, lab ${lab[f.id].documentVerdict}`);
  assert.deepEqual(disagree, []);
});

test('Q41d minimum: whatever the contract rejects, the lab rejects; lab-only fixtures are exactly where the contract admits', () => {
  for (const f of built.fixtures) if (ref.documents[f.id].verdict === 'DIAGNOSTIC') assert.equal(lab[f.id].documentVerdict, 'DIAGNOSTIC', f.id);
  for (const f of built.fixtures.filter(x => x.labOnly)) assert.equal(ref.documents[f.id].verdict, 'QUALIFIED', `${f.id} is marked lab-only but the contract rejects it too`);
  // Codex round 7: the 0.3.7 reference admits both forgeries as documents.
  for (const id of ['CODEX-R7-INVENTED-CASES', 'CODEX-R7-CANDIDATE-AS-A0']) assert.equal(ref.documents[id].verdict, 'QUALIFIED', id);
});

// ---------------------------------------------------------------- 2. documents

for (const f of built.fixtures) {
  test(`admit: ${f.id} documents are ${f.expected}; the verdict is DIAGNOSTIC`, () => {
    const r = lab[f.id];
    assert.equal(r.verdict, 'DIAGNOSTIC');
    assert.equal(r.reasons[0].code, 'DOCUMENT-ONLY');
    assert.equal(r.documentVerdict, f.expected, JSON.stringify(r.reasons.slice(1, 6)));
    if (f.expected === 'DIAGNOSTIC') for (const code of [CAUSE[f.id]].flat()) assert.ok(codes(r).includes(code), `${f.id} should cite ${code}: ${codes(r)}`);
    else assert.deepEqual(codes(r), ['DOCUMENT-ONLY']);
  });
}

test('every DIAGNOSTIC fixture names its cause; ids are distinct; Codex rounds 4, 6 and 7 are present', () => {
  assert.equal(new Set(built.fixtures.map(f => f.id)).size, built.fixtures.length);
  for (const f of built.fixtures) if (f.expected === 'DIAGNOSTIC') assert.ok(CAUSE[f.id], `no cause listed for ${f.id}`);
  for (const id of ['CODEX-R4-FABRICATED', 'CODEX-R6-MODULES-NOT-RETAINED', 'CODEX-R6-NOT-A-VERIFIER-RECORD', 'CODEX-R6-REFUSAL-LABELLED-PASS', 'CODEX-R6-CONTROL-NO-WORKLOAD',
    'CODEX-R6-CANDIDATE-SELECTED-CONTROL', 'CODEX-R6-MIGRATION-INDIRECT-REFUSAL', 'CODEX-R7-INVENTED-CASES', 'CODEX-R7-CANDIDATE-AS-A0']) assert.ok(fx(id), id);
});

test('CLI admit: always exit 2 with DOCUMENT-ONLY, the document verdict shown, --json, usage exits 1', () => {
  const run = (id, ...extra) => {
    const file = path.join(root, `${id}.claim.json`);
    fs.writeFileSync(file, JSON.stringify(fx(id).claim));
    return spawnSync(process.execPath, [CLAIM, 'admit', file, '--repo', fx(id).repo, '--objects', built.objects, ...extra], { encoding: 'utf8' });
  };
  const ok = run('POSITIVE-NS-SCREENING');
  assert.equal(ok.status, 2, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /^DIAGNOSTIC \(documents: QUALIFIED\)\n  DOCUMENT-ONLY: /);
  const bad = run('CODEX-R4-FABRICATED');
  assert.equal(bad.status, 2);
  assert.match(bad.stdout, /^DIAGNOSTIC \(documents: DIAGNOSTIC\)\n/);
  assert.match(bad.stdout, /BUILD-INPUT-STALE/);
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
  fs.writeFileSync(file, JSON.stringify(doc));
  assert.equal(evaluateLab(f, built.objects).documentVerdict, 'DIAGNOSTIC');
  execFileSync('git', ['checkout', '--', 'lab/acceptance/obligations.json'], { cwd: f.repo });
});

test('malformed inputs are DIAGNOSTIC, never an exception (red-team pass 1 finding 5)', () => {
  const base = fx('POSITIVE-NS-SCREENING');
  const put = bytes => { const h = sha256(Buffer.from(bytes)); fs.writeFileSync(path.join(built.objects, h), bytes); return h; };
  const nullObject = put('null');
  const mutate = edit => { const claim = structuredClone(base.claim); edit(claim, k => claim.receipts.find(r => r.receiptId.endsWith(`:${k}`))); return claim; };
  const cases = {
    'case object bytes null': (c, k) => { k('pos-cand').caseResults[0].objectSha256 = nullObject; },
    'manifest bytes null': (c, k) => { k('pos-cand').buildManifestSha256 = nullObject; },
    'verifier bytes null': (c, k) => { k('pos-cand').verifierObjectSha256 = nullObject; },
    'caseResults an object': (c, k) => { k('pos-cand').caseResults = { length: 2 }; },
    'caseResults [null]': (c, k) => { k('meas').caseResults = [null]; },
    'modes a string': (c, k) => { k('pos-cand').modes = 'current'; },
    'workload a string': (c, k) => { k('meas').workload = 'seed 1'; },
    'composition a string': c => { c.receipts[0].composition = 'xtdb'; },
    'claim composition null': c => { c.composition = null; },
    'receipts not an array': c => { c.receipts = { length: 3 }; },
    'claim obligations [7]': c => { c.obligations = [7]; },
    'receiptId __proto__': c => { c.receipts[0].receiptId = '__proto__'; },
    'producer a number': c => { c.receipts[0].producer = 5; },
    'profileIdentity null': c => { c.receipts[0].profileIdentity = null; },
  };
  for (const [name, edit] of Object.entries(cases)) {
    const r = admitClaim(mutate(edit), { git: gitSource(base.repo), objects: objectStore(built.objects), authorityRef: 'main' });
    assert.equal(r.documentVerdict, 'DIAGNOSTIC', name);
    assert.ok(!codes(r).includes('EVALUATOR-ERROR'), `${name} raised: ${JSON.stringify(r.reasons.find(x => x.code === 'EVALUATOR-ERROR'))}`);
  }
  // A thrown error is still fail-closed, in both commands.
  const boom = admitClaim(base.claim, { git: { ...gitSource(base.repo), treeOf() { throw new Error('boom'); } }, objects: objectStore(built.objects), authorityRef: 'main' });
  assert.equal(boom.documentVerdict, 'DIAGNOSTIC');
  assert.ok(codes(boom).includes('EVALUATOR-ERROR'));
  for (const claim of [null, 7, { format: 'triplex-db-2/claim/1', obligations: [7] }, { ...base.claim, composition: 'xtdb' }, { ...base.claim, commit: '-x' }]) {
    const r = qualifyClaim(claim, { git: gitSource(base.repo), authorityRef: 'main', workDir: path.join(root, 'work-malformed') });
    assert.equal(r.verdict, 'DIAGNOSTIC');
    assert.ok(!codes(r).includes('EVALUATOR-ERROR'), JSON.stringify(r.reasons));
  }
});

test('comparators judge canonical answers; unknown comparators and non-canonical answers never pass', () => {
  const b = v => Buffer.from(canonText(v));
  assert.equal(recompute('CMP-EXACT-VALUE', b({ v: '1.50', t: 'decimal' }), b({ t: 'decimal', v: '1.50' })), 'PASS');
  assert.equal(recompute('CMP-EXACT-VALUE', Buffer.from('{"v":"1.50","t":"decimal"}'), b({ t: 'decimal', v: '1.50' })), 'UNCOMPARABLE');
  assert.equal(recompute('CMP-EXACT-VALUE', b({ t: 'decimal', v: '1.50' }), b({ t: 'decimal', v: '1.5' })), 'FAIL');
  assert.equal(recompute('CMP-SET-ROWS', b([[1], [2], [2]]), b([[2], [1]])), 'PASS');
  assert.equal(recompute('CMP-BAG-ROWS', b([[1], [2], [2]]), b([[2], [1]])), 'FAIL');
  assert.equal(recompute('CMP-ORDERED-ROWS', b([[1], [2]]), b([[2], [1]])), 'FAIL');
  assert.equal(recompute('CMP-ERROR', b({ _tag: 'InvalidTripleError', reasons: ['invalid-value'] }), b({ _tag: 'InvalidTripleError', reason: 'invalid-value', cause: {}, rows: [] })), 'PASS');
  assert.equal(recompute('CMP-ERROR', b({ _tag: 'E' }), b({ _tag: 'E', cause: {} })), 'UNCOMPARABLE');
  assert.equal(recompute('CMP-NEW', b(1), b(1)), 'UNCOMPARABLE');
  for (const bad of ['{"v":9007199254740993}', '{"v":1e400}', '{"v":12.30}', '{"v":0.5}', '{"v":-0}', '{"v":"a","v":"a"}', '{ "v":1}', '{"b":1,"a":2}', '['.repeat(70) + ']'.repeat(70)])
    assert.equal(recompute('CMP-EXACT-VALUE', Buffer.from(bad), Buffer.from(bad)), 'UNCOMPARABLE', bad);
  assert.equal(recompute('CMP-EXACT-VALUE', Buffer.from([0x22, 0xff, 0x22]), Buffer.from([0x22, 0xff, 0x22])), 'UNCOMPARABLE');
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
  fs.symlinkSync('a.bin', path.join(dir, 'd/link'));
  git(['add', '-A']); git(['commit', '-q', '-m', 'link']);
  assert.deepEqual(gitSource(dir).entries(git(['rev-parse', 'HEAD']), ['d']).find(e => e.path === 'd/link'), { mode: '120000', path: 'd/link' });
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------- 3. runs (RULINGS Q55a)

const R = built.repos.run;
const spec = JSON.parse(fs.readFileSync(path.join(R.dir, 'lab/config/build.json'), 'utf8'));
const NOW = Date.parse('2026-11-07T14:00:00Z') / 1000;
const runFx = id => built.runFixtures.find(x => x.id === id);
const qualify = (id, { offline = true, ...extra } = {}) => qualifyClaim(runFx(id).claim, { git: gitSource(runFx(id).repo), authorityRef: 'main', workDir: path.join(root, 'work', `${id}-${offline}`), now: NOW, ...(offline ? { sut: localSut(spec) } : {}), ...extra });
const runs = Object.fromEntries(['RUN-CANDIDATE', 'RUN-WRONG-CANDIDATE', 'RUN-FORGED-RECORDS', 'RUN-REFUSED-CASE'].map(id => [id, qualify(id)]));
const planOnly = Object.fromEntries(['RUN-CANDIDATE', 'RUN-UNREGISTERED-VERIFICATION', 'RUN-UNREGISTERED-SLOT', 'RUN-SUPPLIED-FINGERPRINT'].map(id => [id, qualify(id, { offline: false })]));

test('qualify step 1: the evaluator builds the claimed tree and the registry\'s A0 itself and records its own hashes', () => {
  const { run } = runs['RUN-CANDIDATE'];
  assert.equal(run.builds.candidate.sourceTreeSha256, R.C2.label);
  assert.equal(run.builds.A0.sourceTreeSha256, R.C1.label);
  assert.equal(run.builds.A0.commit, R.C1.commit);
  assert.notEqual(run.builds.A0.executedBinarySha256, run.builds.candidate.executedBinarySha256);
  // The A0 control executes the registry commit's allocator (Codex round 7 finding 2: a candidate binary labelled as A0).
  const store = objectStore(run.objects);
  const alloc = side => { const man = store.json(run.builds[side].buildManifestSha256).value; return store.get(man.modules.find(m => m.path === 'packages/xtdb/dist/alloc.mjs').sha256).bytes.toString(); };
  assert.match(alloc('A0'), /v1 \(A0\)/);
  assert.match(alloc('candidate'), /v2 candidate/);
  assert.equal(objectStore(run.objects).json(run.builds.candidate.buildManifestSha256).value.schema, 'build-manifest/1');
});

test('qualify step 2: cases come from the pinned manifests, every case and mode, fault points T-FAULT-REPS times', () => {
  const { run } = runs['RUN-CANDIDATE'];
  const of = (side, oid) => run.cases.filter(c => c.side === side && c.obligation === oid);
  // G7.position.coordinates: 8 cases x 3 modes, FX-CRASH-APPEND-RESOLUTION (a fault point) 3 times each.
  assert.equal(of('candidate', 'G7.position.coordinates').length, 7 * 3 + 3 * 3);
  assert.equal(of('candidate', 'G7.position.coordinates').filter(c => c.case === 'FX-CRASH-APPEND-RESOLUTION' && c.mode === 'reopen').length, 3);
  // NS.P2 selects tag p2 (7 cases) and the same 7 ids: each case is covered under both selections.
  assert.equal(of('candidate', 'NS.P2').length, 14);
  assert.equal(of('A0', 'NS.P2').length, 14);
  assert.equal(run.cases.length, 96);
  assert.ok(run.cases.every(c => c.verdict === 'PASS' && c.oracleExit === 0));
});

test('qualify step 4 and the comparator: a candidate whose answers differ from the pinned oracle\'s fails; A0 does not', () => {
  const r = runs['RUN-WRONG-CANDIDATE'];
  assert.equal(r.verdict, 'DIAGNOSTIC');
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
  assert.ok(r.run.cases.filter(c => c.side === 'candidate').every(c => c.verdict === 'FAIL'));
  assert.ok(r.run.cases.filter(c => c.side === 'A0').every(c => c.verdict === 'PASS'));
  assert.ok(codes(r).includes('CASE-FAIL') && codes(r).includes('MEASUREMENT-MISSING'));
});

test('qualify: an oracle refusal (exit 2, X-NOT-MODELED) is REFUSED, never PASS, and the static refusal also blocks (Q45b, Q47c)', () => {
  const r = runs['RUN-REFUSED-CASE'];
  const mig = r.run.cases.filter(c => c.case === 'MIG-DECIMAL-5-2-TO-6-3');
  assert.ok(mig.length === 6 && mig.every(c => c.verdict === 'REFUSED' && c.oracleExit === 2 && c.oracleCode === 'X-NOT-MODELED'));
  assert.ok(codes(r).includes('CASE-REFUSED') && codes(r).includes('ORACLE-REFUSES'));
});

test('qualify: Codex round 7 forged records, selections, case lists and fingerprints in the claim are ignored', () => {
  const r = runs['RUN-FORGED-RECORDS'], plain = runs['RUN-WRONG-CANDIDATE'];
  assert.deepEqual(r.run.ignored.sort(), ['caseList', 'oDomainFingerprint', 'receipts', 'selection']);
  assert.deepEqual(codes(r), codes(plain));
  assert.deepEqual(r.run.cases.map(c => c.verdict), plain.run.cases.map(c => c.verdict));
  // The same documents through admit are DIAGNOSTIC as well.
  const doc = admitClaim(runFx('RUN-FORGED-RECORDS').claim, { git: gitSource(R.dir), objects: objectStore(built.objects), authorityRef: 'main' });
  assert.equal(doc.verdict, 'DIAGNOSTIC');
});

test('qualify builds the tree its label names: a checkout that git archive altered through .gitattributes is refused', () => {
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const git = args => execFileSync('git', ['-c', 'user.name=lab fixture', '-c', 'user.email=fixture@lab.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: R.dir, env, encoding: 'utf8' }).trim();
  git(['checkout', '-q', '-b', 'attrs', R.C2.commit]);
  fs.writeFileSync(path.join(R.dir, '.gitattributes'), 'NOTES.md export-ignore\n');
  fs.writeFileSync(path.join(R.dir, 'NOTES.md'), 'left out of the archive\n');
  git(['add', '-A']); git(['commit', '-q', '-m', 'attrs']);
  const commit = git(['rev-parse', 'HEAD']), tree = git(['rev-parse', 'HEAD^{tree}']);
  git(['checkout', '-q', 'main']);
  const claim = { ...runFx('RUN-CANDIDATE').claim, claimId: 'RUN-ATTRS', commit, sourceTreeSha256: sourceTreeIdOf(tree) };
  const r = qualifyClaim(claim, { git: gitSource(R.dir), authorityRef: 'main', workDir: path.join(root, 'work', 'attrs'), now: NOW });
  assert.ok(codes(r).includes('CHECKOUT-MISMATCH'), JSON.stringify(r.reasons));
  assert.equal(r.run.builds.candidate, undefined);
});

test('qualify re-hashes a side\'s built modules before running it: a candidate that edits the A0 build is caught', () => {
  const a0Dir = path.join(root, 'work', 'tamper', 'checkouts', `A0-${R.C1.commit.slice(0, 12)}`);
  const local = localSut(spec);
  let edited = false;
  const sut = args => { if (args.side === 'candidate' && !edited) { fs.appendFileSync(path.join(a0Dir, 'packages/xtdb/dist/alloc.mjs'), '// edited by the candidate\n'); edited = true; } return local(args); };
  const r = qualifyClaim(runFx('RUN-CANDIDATE').claim, { git: gitSource(R.dir), authorityRef: 'main', workDir: path.join(root, 'work', 'tamper'), now: NOW, sut });
  assert.ok(edited);
  assert.ok(codes(r).includes('BUILD-TAMPERED') && codes(r).includes('CONTROL-UNMATCHED'), JSON.stringify(codes(r)));
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
});

test('qualify step 5: only the authority contract\'s VERIFIER_REGISTRY counts; supplied verifier records count for nothing', () => {
  assert.ok(codes(planOnly['RUN-UNREGISTERED-VERIFICATION']).includes('VERIFIER-UNREGISTERED'));
  assert.ok(!codes(runs['RUN-CANDIDATE']).includes('VERIFIER-UNREGISTERED'));
  // The real 0.3.7 contract has no registry at all, nor an A0 entry, nor pinned manifests.
  const real = qualifyClaim({ format: 'triplex-db-2/claim/1', kind: 'comparative', obligations: ['NS.P2'], commit: built.repos.real.C2.commit, sourceTreeSha256: built.repos.real.C2.label, composition: runFx('RUN-CANDIDATE').claim.composition },
    { git: gitSource(built.repos.real.dir), authorityRef: 'main', workDir: path.join(root, 'work', 'real'), now: NOW });
  for (const code of ['VERIFIER-REGISTRY-ABSENT', 'A0-REGISTRY-NULL', 'SELECTION-UNRESOLVED', 'TRACE-NOT-FROZEN', 'GATE-NOT-RUN']) assert.ok(codes(real).includes(code), `${code}: ${codes(real)}`);
});

test('qualify Q55e: a claim cannot supply the W0 pin or the O-DOMAIN fingerprint', () => {
  const r = planOnly['RUN-SUPPLIED-FINGERPRINT'];
  assert.ok(r.run.ignored.includes('oDomainFingerprint') && r.run.ignored.includes('w0Pin'));
  assert.ok(codes(r).includes('W0-UNPINNED'));
});

test('qualify step 3: the plan goes through gate.mjs --dry-run, which checks the registered slot', () => {
  const ok = runs['RUN-CANDIDATE'].run.gate;
  assert.equal(ok.ok, true);
  assert.equal(ok.dryRun, true);
  assert.equal(ok.executes, false);
  assert.equal(ok.slot, 'dev');
  assert.equal(ok.plan.cases, 96);
  assert.ok(codes(planOnly['RUN-UNREGISTERED-SLOT']).includes('GATE-SLOT'));
  const g = args => spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
  const dry = g(['OBL', '--lane', 'xtdb', '--slot', 'dev', '--dry-run']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(JSON.parse(dry.stdout).executes, false);
  assert.equal(g(['OBL', '--lane', 'xtdb', '--slot', 'nope', '--dry-run']).status, 1);
  assert.equal(g(['G9', '--lane', 'xtdb', '--slot', 'dev', '--dry-run']).status, 1);
});

test('qualify: no path to QUALIFIED without a gate run; an offline run that passes everything reports offlineVerdict only', () => {
  const pass = runs['RUN-CANDIDATE'];
  assert.equal(pass.verdict, 'DIAGNOSTIC');
  assert.equal(pass.offlineVerdict, 'QUALIFIED');
  assert.deepEqual(codes(pass), ['GATE-NOT-RUN', 'RUN-NOT-ON-GATE']);
  // The run's own receipts satisfy the contract's reference model: the offline verdict is not a lab invention.
  const ctx = coreContext(JSON.parse(execFileSync('git', ['show', 'main:lab/acceptance/obligations.json'], { cwd: R.dir })));
  const claim = runFx('RUN-CANDIDATE').claim;
  assert.equal(admitCore({ ...claim, receipts: pass.run.receipts }, { store: objectStore(pass.run.objects), dependencyClosureChangedAt: R.C2.time }, ctx).verdict, 'QUALIFIED');
  // Plan only (no observations at all): DIAGNOSTIC, nothing judged, oracle answers still computed.
  const plan = planOnly['RUN-CANDIDATE'];
  assert.deepEqual(codes(plan), ['GATE-NOT-RUN']);
  assert.equal(plan.offlineVerdict, null);
  assert.equal(plan.run.receipts, null);
  assert.ok(plan.run.cases.every(c => c.verdict === null && c.oracleExit === 0));
  // A gate stub that says it executed changes nothing: no code path reads observations from a gate yet.
  const stub = qualify('RUN-CANDIDATE', { offline: false, gate: () => ({ ok: true, executes: true, observations: [] }) });
  assert.equal(stub.verdict, 'DIAGNOSTIC');
  assert.ok(codes(stub).includes('GATE-NOT-RUN'));
  for (const r of [...Object.values(runs), ...Object.values(planOnly)]) assert.equal(r.verdict, 'DIAGNOSTIC');
});

test('CLI qualify: --offline-sut runs offline and exits 2 with the offline verdict; usage errors exit 1', () => {
  const file = path.join(root, 'RUN-CANDIDATE.claim.json');
  fs.writeFileSync(file, JSON.stringify(runFx('RUN-CANDIDATE').claim));
  const r = spawnSync(process.execPath, [CLAIM, 'qualify', file, '--repo', R.dir, '--work', path.join(root, 'work', 'cli'), '--offline-sut', '--json'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  assert.equal(r.status, 2, r.stderr);
  const js = JSON.parse(r.stdout);
  assert.equal(js.verdict, 'DIAGNOSTIC');
  assert.equal(js.offlineVerdict, 'QUALIFIED');
  assert.equal(spawnSync(process.execPath, [CLAIM, 'qualify'], { encoding: 'utf8' }).status, 1);
});
