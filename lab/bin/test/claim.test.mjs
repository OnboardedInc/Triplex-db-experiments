// Claim admission (EXP-E01). Run: node --test lab/bin/test/*.test.mjs (needs git, tar and python3; no engines or Docker).
// Print the document fixture table: node lab/bin/test/claim-fixtures.mjs
//
// Three things are checked.
//   1. The contract's reference model (0.3.9): admitCore is replayed against every admit_claim call the contract's own
//      self-check makes. claim_ref.py records each call's inputs and every executor call (function, arguments, result) in
//      order; admitCore must make exactly the same executor calls in the same order and reach the same verdict. On documents
//      the reference (no executor) and claim.mjs admit both answer DIAGNOSTIC.
//   2. Documents (claim.mjs admit): every fixture's documentVerdict and its cause; the verdict itself is always DIAGNOSTIC (Q55a).
//   3. Runs (claim.mjs qualify, offline): the evaluator's own builds (A0 reproducing the registry's binarySha256), manifest-
//      resolved cases, oracle answers and comparator; supplied records ignored; no path to QUALIFIED while the gate is plan-only.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { sha256, sourceTreeIdOf } from '../lib.mjs';
import { admitClaim, admitCore, canonText, caseVerdict, coreContext, gitSource, localSut, objectStore, openRecord, qualifyClaim, recompute } from '../claim.mjs';
import { buildFixtures, evaluateLab, evaluateReference } from './claim-fixtures.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-claim-test-'));
const built = buildFixtures(root);
const lab = Object.fromEntries(built.fixtures.map(f => [f.id, evaluateLab(f, built.objects)]));
const ref = evaluateReference(built);
const CLAIM = path.resolve(import.meta.dirname, '../claim.mjs');
const GATE = path.resolve(import.meta.dirname, '../gate.mjs');
const CONTRACT = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../acceptance/obligations.json'), 'utf8'));
const LOAD = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../acceptance/load-contract.json'), 'utf8'));
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
  'Q47C-MANIFESTS-UNPINNED': ['SELECTION-UNRESOLVED', 'A0-REGISTRY-NULL'], 'CODEX-R7-INVENTED-CASES': 'CASES-MISSING', 'CODEX-R7-CANDIDATE-AS-A0': ['CONTROL-UNMATCHED', 'BUILD-INPUT-STALE'],
  'RT-SWAP-ROLES': 'MEASUREMENT-MISSING', 'RT-RELABEL-PROFILE': 'LEDGER', 'RT-SCREENING-PREREQ': 'RECEIPT-SCREENING', 'RT-RUNKIND-SWAP': 'RECEIPT-RUN-KIND',
  'RT-CONTROL-OTHER-PROFILE': 'CONTROL-UNMATCHED', 'RT-SLOT-ARRAY': 'COMPOSITION-UNBOUND', 'RT-VERIFIER-IS-AUTHOR': 'VERIFIER-NOT-INDEPENDENT', 'RT-DROP-FAIL-ATTEMPT': 'LEDGER-MISMATCH',
  'RT-COUNTS-EDITED': 'LEDGER-MISMATCH', 'RT-CONTRACT-RELABEL': 'LEDGER', 'RT-FAULTREPS-RELABEL': 'LEDGER-MISMATCH', 'RT-DEP-UPPERCASE': 'DEPENDENCY-UNBOUND',
  'RT-DEP-UNLISTED': 'DEPENDENCY-UNBOUND', 'RT-DEP-OTHER-WORKSPACE': 'DEPENDENCY-UNBOUND', 'RT-NARROW-ROOTS': 'BUILD-ROOTS',
  'LAB-BRANCH-PINS-OWN-ORACLE': 'ORACLE-UNPINNED', 'LAB-ORACLE-FILE-DRIFT': 'ORACLE-FILES', 'LAB-IMAGE-NOT-PINNED': 'IMAGE-NOT-PINNED',
  'LAB-FORBIDDEN-ENDPOINT': 'RECEIPT-ENDPOINT', 'LAB-ADMISSION-BLOCKED': 'RECEIPT-ADMISSION', 'LAB-CONTROL-NO-PREREQ': 'PREREQ-MISSING',
  'DOC-NO-SOURCE-VARIANT': 'COMPOSITION-UNBOUND', 'DOC-UNREGISTERED-VERIFICATION': 'VERIFIER-UNREGISTERED',
};

// ---------------------------------------------------------------- 1. the contract's reference model

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const dec = v => isObj(v) && Object.keys(v).length === 1 && '$bytes' in v ? Buffer.from(v.$bytes, 'base64') : Array.isArray(v) ? v.map(dec) : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)])) : v;
// The compiled obligations.json adds four derived fields to each obligation; the generator's in-memory obligation has none.
const COMPILED_ONLY = ['definitionSha256', 'needsNewOracle', 'status', 'verifierMode'];
const enc = v => Buffer.isBuffer(v) ? { $bytes: v.toString('base64') } : v === undefined ? null : Array.isArray(v) ? v.map(enc)
  : isObj(v) ? Object.fromEntries(Object.entries(v).filter(([k]) => !('closure' in v && 'id' in v && COMPILED_ONLY.includes(k))).map(([k, x]) => [k, enc(x)])) : v;
/** An executor that replays one recorded admit_claim call: each call must be the next recorded one, with equal arguments. */
function replay(rec) {
  let i = 0;
  const fn = name => (...args) => {
    const c = rec.calls[i];
    if (!c || c.fn !== name || canonText(enc(args)) !== canonText(c.args)) throw new Error(`call ${i}: admitCore made ${name}(${canonText(enc(args)).slice(0, 160)}), the contract ${c ? `${c.fn}(${canonText(c.args).slice(0, 160)})` : 'no further call'}`);
    i++;
    return dec(c.result);
  };
  return { ev: { slots: rec.slots, ...Object.fromEntries(rec.keys.map(k => [k, fn(k)])) }, made: () => i };
}

test('admitCore makes the contract\'s executor calls and reaches its verdict on every admit_claim call of its own self-check', () => {
  assert.deepEqual(ref.selfCheckErrors, [], 'the contract self-check itself reports admission errors');
  const fixtures = ref.contractFixtures;
  assert.ok(fixtures.length >= 59 && fixtures.filter(f => f.verdict === 'QUALIFIED').length >= 7, `only ${fixtures.length} contract fixtures`);
  for (const cx of ['CX-R7-INVENTED-EVIDENCE', 'CX-R7-SELECTION-OVERREACH', 'CX-R7-RELABELLED-CONTROL']) assert.ok(fixtures.some(f => f.label.includes(cx) && f.verdict === 'DIAGNOSTIC'), cx);
  const disagree = [];
  let calls = 0;
  for (const f of fixtures) {
    const r_ = f.ev && replay(f.ev);
    let r;
    try { r = admitCore(f.claim, r_?.ev ?? null, coreContext(CONTRACT, { pins: f.pins, w0: f.w0, a0: f.a0, verifiers: f.verifiers, pinned: f.pinned, overrides: f.overrides }, LOAD)); } catch (error) { r = { verdict: 'DIVERGED', reasons: [{ detail: error.message }] }; }
    if (r.verdict !== f.verdict || (r_ && r_.made() !== f.ev.calls.length)) disagree.push(`line ${f.line} ${f.label}: contract ${f.verdict} after ${f.ev?.calls.length ?? 0} calls, admitCore ${r.verdict} after ${r_?.made() ?? 0}: ${r.reasons[0]?.detail}`);
    calls += f.ev?.calls.length ?? 0;
  }
  assert.deepEqual(disagree, []);
  assert.ok(calls > 10000, `only ${calls} executor calls replayed`);
});

test('documents: the contract\'s admit_claim (no executor) and claim.mjs admit both answer DIAGNOSTIC for every document fixture', () => {
  for (const f of built.fixtures) {
    assert.equal(ref.documents[f.id].verdict, 'DIAGNOSTIC', f.id);
    assert.equal(lab[f.id].verdict, 'DIAGNOSTIC', f.id);
  }
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
const spec = JSON.parse(execFileSync('git', ['show', 'main:lab/acceptance/obligations.json'], { cwd: R.dir })).buildSpec;
const runFx = id => built.runFixtures.find(x => x.id === id);
const qualify = (id, { offline = true, ...extra } = {}) => qualifyClaim(runFx(id).claim, { git: gitSource(runFx(id).repo), authorityRef: runFx(id).authorityRef ?? 'main', workDir: path.join(root, 'work', `${id}-${offline}`), ...(offline ? { sut: localSut(spec) } : {}), ...extra });
const runs = Object.fromEntries(['RUN-CANDIDATE', 'RUN-WRONG-CANDIDATE', 'RUN-FORGED-RECORDS', 'RUN-REFUSED-CASE', 'RUN-UNREGISTERED-VERIFICATION', 'RUN-A0-REBUILD-MISMATCH', 'RUN-NS-NO-PAIRED'].map(id => [id, qualify(id)]));
const planOnly = Object.fromEntries(['RUN-CANDIDATE', 'RUN-UNREGISTERED-SLOT', 'RUN-SUPPLIED-FINGERPRINT'].map(id => [id, qualify(id, { offline: false })]));
const isPosition = c => /^(FX|PO)-/.test(c.case);

test('qualify build: the evaluator builds the claimed tree and rebuilds A0, which reproduces the registry\'s binarySha256', () => {
  const { run } = runs['RUN-CANDIDATE'];
  assert.equal(run.builds[R.C2.commit].sourceTreeSha256, R.C2.label);
  assert.equal(run.builds[R.C1.commit].sourceTreeSha256, R.C1.label);
  assert.equal(run.builds[R.C1.commit].binarySha256, R.a0Binary);
  assert.notEqual(run.builds[R.C2.commit].binarySha256, R.a0Binary);
  // build-manifest/2 (RULINGS Q61f): the built package's tracked files, the lockfile and the root package.json, and the spec hash.
  const store = objectStore(run.objects);
  const man = store.json(run.builds[R.C2.commit].buildManifestSha256).value;
  assert.equal(man.schema, 'build-manifest/2');
  assert.equal(man.buildSpecSha256, sha256(canonText(spec)));
  assert.deepEqual(man.inputs.map(x => x.path), ['package.json', 'packages/xtdb/package.json', 'packages/xtdb/src/alloc.ts', 'packages/xtdb/src/index.ts', 'packages/xtdb/src/run.ts', 'pnpm-lock.yaml']);
  assert.equal(man.inputs.find(x => x.path === 'packages/xtdb/src/alloc.ts').sha256, sha256(Buffer.from(R.C2.files['packages/xtdb/src/alloc.ts'])));
  // The A0 control executes the registry commit's allocator (Codex round 7 finding 2: a candidate binary labelled as A0).
  const alloc = c => { const m = store.json(run.builds[c].buildManifestSha256).value; return store.get(m.modules.find(x => x.path === 'packages/xtdb/dist/alloc.mjs').sha256).bytes.toString(); };
  assert.match(alloc(R.C1.commit), /v1 \(A0\)/);
  assert.match(alloc(R.C2.commit), /v2 candidate/);
});

test('qualify build: CX-R7-RELABELLED-CONTROL as a run, an A0 entry recording another binary than its tree rebuilds to', () => {
  const r = runs['RUN-A0-REBUILD-MISMATCH'];
  assert.equal(r.run.core.reasons[0].code, 'A0-REBUILD-MISMATCH');
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
});

test('qualify resolve, execute and record: every case of the pinned manifests in every mode, each as a case-result/2', () => {
  const { run } = runs['RUN-CANDIDATE'];
  // G7.position.coordinates: 8 cases x 3 modes, on the candidate and (lab, GATE-POSITION "A0 included") on A0.
  assert.equal(run.cases.filter(c => c.build === R.C2.commit && isPosition(c)).length, 8 * 3);
  assert.equal(run.cases.filter(c => c.build === R.C1.commit && isPosition(c)).length, 8 * 3);
  assert.equal(run.cases.length, run.gate.plan.executions);
  assert.ok(run.cases.every(c => c.verdict === 'PASS'));
  assert.ok(run.oracle.every(o => o.exit === 0 && o.code === null));
  const store = objectStore(run.objects);
  const ctx = coreContext(CONTRACT);
  for (const c of run.cases) {
    const rec = openRecord(c.recordSha256, store, 'case-result/2', ctx.schemas);
    assert.ok(rec && rec.obligation === c.obligation && rec.mode === c.mode && rec.rep === 0 && rec.comparator === 'CMP-EXACT-VALUE', JSON.stringify(c));
    assert.equal(caseVerdict(rec, store), 'PASS');
  }
});

test('qualify expect: the oracle answer follows oracleAnswerRule (O-REPLAY answerMembers of one canonical JSON document)', () => {
  const { run } = runs['RUN-CANDIDATE'];
  const store = objectStore(run.objects);
  const answer = JSON.parse(store.get(run.cases.find(c => c.obligation === 'G10.scope.shared-collision').expectedSha256).bytes.toString());
  assert.deepEqual(Object.keys(answer).sort(), [...CONTRACT.answerMembers['O-REPLAY']].sort());
});

test('qualify compare: a candidate whose answer differs from the pinned oracle\'s fails at its first case', () => {
  const r = runs['RUN-WRONG-CANDIDATE'];
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
  assert.deepEqual(r.run.cases.map(c => [c.build, c.verdict]), [[R.WRONG.commit, 'FAIL']]);
  assert.ok(codes(r).includes('CASE-FAIL') && codes(r).includes('PREREQ-FAILED'));
});

test('qualify: an oracle refusal (exit 2, X-NOT-MODELED) fails closed, and the static refusal also blocks (Q45b, Q47c)', () => {
  const r = runs['RUN-REFUSED-CASE'];
  assert.ok(r.run.oracle.some(o => o.exit === 2 && o.code === 'X-NOT-MODELED'));
  for (const code of ['CASE-REFUSED', 'MEASUREMENT-RUN-FAILED', 'ORACLE-REFUSES']) assert.ok(codes(r).includes(code), code);
});

test('qualify control: a CR-NS claim needs a PAIR_0 paired-rounds measurement, which no runner here produces', () => {
  const r = runs['RUN-NS-NO-PAIRED'];
  assert.ok(codes(r).includes('PAIRED-NOT-RUN'));
  assert.equal(r.run.core.reasons[0].code, 'CONTROL-UNMATCHED');
});

test('qualify: Codex round 7 forged records, selections, case lists and fingerprints in the claim are ignored', () => {
  const r = runs['RUN-FORGED-RECORDS'], plain = runs['RUN-WRONG-CANDIDATE'];
  assert.deepEqual(r.run.ignored.sort(), ['caseList', 'oDomainFingerprint', 'receipts', 'selection']);
  assert.deepEqual(codes(r), codes(plain));
  assert.deepEqual(r.run.cases.map(c => c.verdict), plain.run.cases.map(c => c.verdict));
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
  const r = qualifyClaim(claim, { git: gitSource(R.dir), authorityRef: 'main', workDir: path.join(root, 'work', 'attrs'), sut: localSut(spec) });
  assert.ok(codes(r).includes('CHECKOUT-MISMATCH') && codes(r).includes('BUILD-FAILED'), JSON.stringify(r.reasons));
  assert.equal(r.run.builds[commit], undefined);
});

test('qualify re-hashes a build before running it after another: a candidate that edits the A0 build is caught', () => {
  const a0Alloc = path.join(root, 'work', 'tamper', 'checkouts', R.C1.commit.slice(0, 12), 'packages/xtdb/dist/alloc.mjs');
  const local = localSut(spec);
  let edited = false;
  // The candidate edits A0's built allocator as soon as A0 has been built (A0 is rebuilt after the candidate's prerequisites).
  const sut = args => { if (!edited && fs.existsSync(a0Alloc) && !args.dir.includes(R.C1.commit.slice(0, 12))) { fs.appendFileSync(a0Alloc, '// edited by the candidate\n'); edited = true; } return local(args); };
  const r = qualifyClaim(runFx('RUN-CANDIDATE').claim, { git: gitSource(R.dir), authorityRef: 'main', workDir: path.join(root, 'work', 'tamper'), sut });
  assert.ok(edited);
  assert.ok(codes(r).includes('BUILD-TAMPERED') && codes(r).includes('PREREQ-FAILED'), JSON.stringify(codes(r)));
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
});

test('qualify verify: only the authority contract\'s VERIFIER_REGISTRY counts; supplied verifier records count for nothing', () => {
  assert.equal(runs['RUN-UNREGISTERED-VERIFICATION'].run.core.reasons[0].code, 'VERIFIER-UNREGISTERED');
  assert.ok(!codes(runs['RUN-CANDIDATE']).includes('VERIFIER-UNREGISTERED'));
  // The real 0.3.9 contract: buildSpec null (fails first), no A0 entry, and no registry entry for the claim's obligation.
  const real = qualifyClaim({ format: 'triplex-db-2/claim/1', kind: 'comparative', obligations: ['G10.scope.shared-collision'], commit: built.repos.real.C2.commit, sourceTreeSha256: built.repos.real.C2.label, composition: runFx('RUN-CANDIDATE').claim.composition },
    { git: gitSource(built.repos.real.dir), authorityRef: 'main', workDir: path.join(root, 'work', 'real') });
  assert.equal(real.run.core.reasons[0].code, 'BUILD-SPEC-NULL');
  for (const code of ['A0-REGISTRY-NULL', 'VERIFIER-UNREGISTERED', 'GATE-NOT-RUN']) assert.ok(codes(real).includes(code), `${code}: ${codes(real)}`);
});

test('qualify Q55e: a claim cannot supply the W0 pin or the O-DOMAIN fingerprint', () => {
  const r = planOnly['RUN-SUPPLIED-FINGERPRINT'];
  assert.ok(r.run.ignored.includes('oDomainFingerprint') && r.run.ignored.includes('w0Pin'));
  assert.ok(codes(r).includes('W0-UNPINNED'));
});

test('qualify execute: the plan goes through gate.mjs --dry-run, which checks the registered slot', () => {
  const ok = runs['RUN-CANDIDATE'].run.gate;
  assert.equal(ok.ok, true);
  assert.equal(ok.dryRun, true);
  assert.equal(ok.executes, false);
  assert.equal(ok.slot, 'dev');
  const slot = planOnly['RUN-UNREGISTERED-SLOT'];
  assert.ok(codes(slot).includes('GATE-SLOT') && codes(slot).includes('SLOT-UNREGISTERED'));
  const g = args => spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8' });
  const dry = g(['OBL', '--lane', 'xtdb', '--slot', 'dev', '--dry-run']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(JSON.parse(dry.stdout).executes, false);
  assert.equal(g(['OBL', '--lane', 'xtdb', '--slot', 'nope', '--dry-run']).status, 1);
  assert.equal(g(['G9', '--lane', 'xtdb', '--slot', 'dev', '--dry-run']).status, 1);
});

test('qualify: no path to QUALIFIED without a gate run; an offline run that passes everything reports offlineVerdict only', () => {
  const pass = runs['RUN-CANDIDATE'];
  assert.equal(pass.run.core.verdict, 'QUALIFIED');
  assert.equal(pass.verdict, 'DIAGNOSTIC');
  assert.equal(pass.offlineVerdict, 'QUALIFIED');
  assert.deepEqual(codes(pass), ['GATE-NOT-RUN', 'RUN-NOT-ON-GATE']);
  // Plan only (no observations): DIAGNOSTIC; the reference stops at the first case, which has no observation.
  const plan = planOnly['RUN-CANDIDATE'];
  assert.deepEqual(codes(plan), ['GATE-NOT-RUN', 'PREREQ-FAILED']);
  assert.equal(plan.offlineVerdict, null);
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

test('RULINGS Q64a: the proposed real build spec (lab/config/build.json) is a complete build-spec/1', () => {
  const p = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../config/build.json'), 'utf8'));
  assert.equal(p.format, CONTRACT.buildSpec.format);
  for (const k of ['argv', 'outputs', 'run']) assert.ok(Array.isArray(p[k]) && p[k].length, k);
  assert.match(p.argv.join(' '), /pnpm install --offline --frozen-lockfile --store-dir \/Users\/sam\/projects\/triplex-db-2\/\.pnpm-store/);
  assert.ok(p.run.includes('{case}') && p.run.includes('{mode}'));
  assert.ok(p.outputs.every(o => /^packages\/[a-z0-9-]+\/dist\/$/.test(o)));
});
