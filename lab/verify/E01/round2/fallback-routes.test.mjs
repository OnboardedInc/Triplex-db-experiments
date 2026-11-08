// [CX-VE01-3] Why: explicitly exercise fallback oracle rehash and process-group guards. Rejected: treating OS sandbox write denials as proof of the rehash itself. Only T1, T4 and T2 are selected.
// V-E01: independent counterexamples against lab/bin/claim.mjs at 2796455 (checks 2 to 6 of lab/verify/E01/BRIEF.md).
// Run from the worktree root: node --test lab/verify/E01/v-e01.test.mjs   (needs git, tar, python3; no engines, no Docker)
//
// Every test states what it shows. A test named "GAP" passes when the gap exists (it asserts the unprotected behaviour), so a
// later fix turns it red. Nothing here edits lab/bin or lab/acceptance; attacks that rewrite the evaluator run against a
// scratch copy of the tree at 2796455 (t3-driver.mjs).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { sha256, sourceTreeIdOf } from '../../../bin/lib.mjs';
import { admitClaim, admitCore, canonText, caseResultVerdict, coreContext, gitSource, localSut, objectStore, qualifyClaim, recompute } from '../../../bin/claim.mjs';
import { CANDIDATE, LOG_SOURCE, buildFixtures, composition, evaluateLab } from '../../../bin/test/claim-fixtures.mjs';

const WT = path.resolve(import.meta.dirname, '../../../..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-ve01-'));
const built = buildFixtures(root);
const R = built.repos.run;
const EXT = path.join(root, 'ext'); // a directory outside every checkout, as a pnpm store, a home directory or /tmp would be
fs.mkdirSync(EXT, { recursive: true });
process.on('exit', () => { try { execFileSync('chmod', ['-R', 'u+rwX', root]); } catch { /* best effort */ } fs.rmSync(root, { recursive: true, force: true }); });

const genv = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
const git = (args, opts = {}) => execFileSync('git', ['-c', 'user.name=v-e01', '-c', 'user.email=v-e01@lab.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: R.dir, env: genv, encoding: 'utf8', ...opts }).trim();
const show = p => execFileSync('git', ['show', `main:${p}`], { cwd: R.dir, env: genv, encoding: 'utf8' }); // exact bytes (git() trims)
const BUILD = show('build.mjs'), RUN_TS = show('packages/xtdb/src/run.ts'), CONTRACT_PY = show('lab/oracles/contract/cli.py');
const spec = JSON.parse(show('lab/acceptance/obligations.json')).buildSpec;
const CONTRACT = JSON.parse(show('lab/acceptance/obligations.json'));
const codes = r => r.reasons.map(x => x.code);
const clearReplace = () => { for (const ref of git(['for-each-ref', '--format=%(refname)', 'refs/replace']).split('\n').filter(Boolean)) git(['update-ref', '-d', ref]); };
const writeExt = (f, t) => { fs.mkdirSync(path.dirname(path.join(EXT, f)), { recursive: true }); fs.writeFileSync(path.join(EXT, f), t); };

/** A candidate commit on its own branch from C2, with files replaced and symlinks added. */
function branch(name, files = {}, { base = R.C2.commit, symlinks = {}, allowEmpty = false } = {}) {
  git(['checkout', '-q', '-b', name, base]);
  for (const [f, t] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(R.dir, f)), { recursive: true }); fs.writeFileSync(path.join(R.dir, f), t); }
  for (const [f, target] of Object.entries(symlinks)) { const p = path.join(R.dir, f); fs.rmSync(p, { force: true }); fs.symlinkSync(target, p); }
  git(['add', '-A']); git(['commit', '-q', ...(allowEmpty ? ['--allow-empty'] : []), '-m', name]);
  const out = { name, commit: git(['rev-parse', 'HEAD']), label: sourceTreeIdOf(git(['rev-parse', 'HEAD^{tree}'])) };
  git(['checkout', '-q', 'main']);
  return out;
}
/** An authority branch from main whose contract is edited (a reviewed later contract version, in the fixture's world). */
function authority(name, edit) {
  git(['checkout', '-q', '-b', name, 'main']);
  const f = path.join(R.dir, 'lab/acceptance/obligations.json');
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  edit(c);
  fs.writeFileSync(f, JSON.stringify(c, null, 2) + '\n');
  git(['add', '-A']); git(['commit', '-q', '-m', name]);
  git(['checkout', '-q', 'main']);
  return name;
}
const register = (c, commits, ids) => { for (const commit of commits) for (const id of ids) c.verifierRegistry.entries[`V-VE01-${id}@${commit.slice(0, 12)}`] = { verifier: 'V-VE01', subject: { kind: 'obligation', id, commit }, brief: 'v-e01', briefSha256: sha256('v-e01'), branch: 'verify/E01', commit, verdict: 'ACCEPT (fixture)', status: 'current' }; };
const claimFor = (at, extra = {}) => ({ format: 'triplex-db-2/claim/1', claimId: `VE01-${at.name ?? 'x'}`, kind: 'comparative', obligations: ['G10.scope.shared-collision'], commit: at.commit, sourceTreeSha256: at.label, composition: structuredClone(CANDIDATE), ...extra });
let runN = 0;
const q = (claim, { authorityRef = 'auth-ve01', offline = true, sut, iso, workDir, keepIsolation = false } = {}) => qualifyClaim(claim, { git: gitSource(R.dir), authorityRef,
  workDir: workDir ?? path.join(root, 'work', `${claim?.claimId ?? 'x'}-${runN++}`), isolationRoot: iso ?? path.join(root, `iso-${runN}`), ...(offline ? { sut: sut ?? localSut(spec) } : {}), keepIsolation, sandbox: false });

// ---------------------------------------------------------------- the candidates (each changes only build.mjs or run.ts)

const importLine = 'import fs from \'node:fs\';\n';
const withImports = (text, imports) => text.replace(importLine, importLine + imports);
const caseLine = "const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));\n";
assert.ok(BUILD.startsWith(importLine) && RUN_TS.startsWith(importLine) && RUN_TS.includes(caseLine), 'fixture build.mjs/run.ts changed shape');

// Check 2: one commit whose build reads EXT/id-mode.json, so the tree (and its label) stays fixed while what the build installs
// beside dist changes: a generated source runner, a node_modules dependency, a symlink's text, a file symlink and a directory
// symlink to fixed paths outside the checkout, and extra lockfile bytes. Its run.mjs imports the file symlink and records the
// node version that ran it.
const ID_BUILD = withImports(BUILD, "import path from 'node:path';\n") + `
const m = JSON.parse(fs.readFileSync(${JSON.stringify(path.join(EXT, 'id-mode.json'))}, 'utf8'));
fs.writeFileSync('runtime/gen.mjs', m.runner);
fs.mkdirSync('node_modules/dep', { recursive: true });
fs.writeFileSync('node_modules/dep/index.mjs', m.dep);
fs.symlinkSync(m.linkText, 'node_modules/link.mjs');
fs.symlinkSync(${JSON.stringify(path.join(EXT, 'file-target.mjs'))}, 'node_modules/ext-file.mjs');
fs.symlinkSync(${JSON.stringify(path.join(EXT, 'dir-target'))}, 'node_modules/ext-dir');
if (m.lockExtra) fs.appendFileSync('pnpm-lock.yaml', m.lockExtra);
fs.writeFileSync(${JSON.stringify(path.join(EXT, 'build-node-version.txt'))}, process.version);
`;
const ID_RUN = withImports(RUN_TS, "import { f } from '../../../node_modules/ext-file.mjs';\n").replace(caseLine, caseLine + `fs.writeFileSync(${JSON.stringify(path.join(EXT, 'sut-node-version.txt'))}, process.version);\n`)
  .replace('queries: { next: adjust(nextCommitPosition(c.p), c) }', 'queries: { next: f(adjust(nextCommitPosition(c.p), c), c) }');
assert.ok(ID_RUN.includes('next: f(adjust'), 'run.ts rewrite failed');
const HONEST_F = 'export const f = (n, c) => n;\n', ALIAS_F = "export const f = (n, c) => String(c.case).startsWith('CS-SCOPE/') ? n + 1 : n;\n";
const ID_MODE = { runner: 'export const g = 1;\n', dep: 'export const d = 1;\n', linkText: 'dep/index.mjs', lockExtra: '' };
const setIdMode = (over = {}, { file = HONEST_F, dir = 'export const x = 1;\n' } = {}) => { writeExt('id-mode.json', JSON.stringify({ ...ID_MODE, ...over })); writeExt('file-target.mjs', file); writeExt('dir-target/x.mjs', dir); };
setIdMode();

// Check 3: tamper routes. T1 an in-group system under test edits the oracle copy (no escape); T4 the same through a symlink it
// makes in its own checkout; T2 a build that double-forks (no setsid) and one that starts its own session; T5 a build that
// substitutes an unpinned COMPILED oracle's bytes through `git replace`; T6 a build that plants a file in the shared HOME; T8 a
// build that substitutes A0's source through `git replace`.
const oracleEdit = viaLink => `if (String(c.case).startsWith('CS-SCOPE/') && !fs.existsSync(path.join(process.env.HOME, '.ve01-edited'))) {
  const root = path.dirname(process.env.HOME);
  for (const d of fs.readdirSync(root)) if (d.startsWith('tx2-oracle-O-REPLAY')) {
    ${viaLink ? "fs.symlinkSync(path.join(root, d), 'peek'); const f = 'peek/lab/oracles/replay/cli.py';" : "const f = path.join(root, d, 'lab/oracles/replay/cli.py');"}
    fs.chmodSync(f, 0o644); fs.appendFileSync(f, '# edited by the system under test, inside its process group\\n');
  }
  fs.writeFileSync(path.join(process.env.HOME, '.ve01-edited'), '1');
}
`;
const T1_RUN = withImports(RUN_TS, "import path from 'node:path';\n").replace(caseLine, caseLine + oracleEdit(false));
const T4_RUN = withImports(RUN_TS, "import path from 'node:path';\n").replace(caseLine, caseLine + oracleEdit(true));
const DF_MARK = path.join(EXT, 'double-fork-marker'), SS_MARK = path.join(EXT, 'setsid-marker');
const T2_BUILD = withImports(BUILD, "import { spawn, spawnSync } from 'node:child_process';\n") + `
spawnSync('sh', ['-c', '( (sleep 1; echo double-fork > ${DF_MARK}) & ) &'], { stdio: 'ignore' });
spawn(process.execPath, ['-e', ${JSON.stringify(`setTimeout(() => require('fs').writeFileSync(${JSON.stringify(SS_MARK)}, 'setsid'), 1000)`)}], { detached: true, stdio: 'ignore' }).unref();
`;
// T5: the build substitutes bytes through `git replace` in the evaluator's repository (EXT/t5.json says what). mode "blob" swaps
// one blob everywhere it occurs; mode "commit" swaps only the authority commit, for a commit whose tree differs in one file, so
// that what the evaluator reads at the authority after the build changes while no commit that is built changes.
const replaceBuild = (pathAtRev) => withImports(BUILD, "import { execFileSync } from 'node:child_process';\nimport path from 'node:path';\n") + `
const t5 = JSON.parse(fs.readFileSync(${JSON.stringify(path.join(EXT, 't5.json'))}, 'utf8'));
if (t5.evil) {
  const env = { PATH: process.env.PATH, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'x', GIT_AUTHOR_EMAIL: 'x@x.invalid', GIT_COMMITTER_NAME: 'x', GIT_COMMITTER_EMAIL: 'x@x.invalid' };
  const g = (args, input, extra = {}) => execFileSync('git', ['-C', ${JSON.stringify(R.dir)}, ...args], { env: { ...env, ...extra }, input }).toString().trim();
  const blob = g(['hash-object', '-w', '--stdin'], t5.evil);
  if (t5.mode === 'commit') {
    const auth = g(['rev-parse', t5.authority + '^{commit}']), idx = { GIT_INDEX_FILE: path.join(process.env.TMPDIR, 've01-index') };
    g(['read-tree', auth], undefined, idx);
    g(['update-index', '--cacheinfo', '100644,' + blob + ',' + t5.file], undefined, idx);
    const tree = g(['write-tree'], undefined, idx);
    g(['replace', '-f', auth, g(['commit-tree', tree, '-m', 'substituted authority'])]);
  } else g(['replace', '-f', g(['rev-parse', t5.target ?? ${JSON.stringify(pathAtRev)}]), blob]);
}
`;
const T5_BUILD = replaceBuild('main:lab/oracles/contract/cli.py');
const ORACLE_MARK = path.join(EXT, 'oracle-ran-candidate-bytes');
const EVIL_SIDE_EFFECT = CONTRACT_PY + `open(${JSON.stringify(ORACLE_MARK)}, "w").write("the O-CONTRACT copy the evaluator ran was the candidate's")\n`;
const lieIn = prefix => CONTRACT_PY.replace('{"next": case["p"] + 1}', `{"next": case["p"] + (7 if case["case"].startswith("${prefix}") else 1)}`);
const LIE_RUN = prefix => RUN_TS.replace('queries: { next: adjust(nextCommitPosition(c.p), c) }', `queries: { next: String(c.case).startsWith('${prefix}') ? c.p + 7 : adjust(nextCommitPosition(c.p), c) }`);
assert.ok(lieIn('X').includes('+ (7 if') && LIE_RUN('X').includes('c.p + 7'), 'lie rewrite failed');
const T6_BUILD = withImports(BUILD, "import path from 'node:path';\n") + "fs.writeFileSync(path.join(process.env.HOME, 'planted-by-candidate-build'), 'x');\nfs.writeFileSync(path.join(process.env.TMPDIR, 'planted-tmp'), 'x');\n";

// T5c: a claimed obligation answered by O-CONTRACT that A0 is never re-run on (R.evaluator.incomplete-receipts, CS-EVAL-COUNTER).
const EC = CONTRACT.caseSets['CS-EVAL-COUNTER'];
const ecInput = (id, i) => JSON.stringify({ case: `CS-EVAL-COUNTER/${id}`, p: 500 + i }) + '\n';
const ecManifest = JSON.stringify({ format: CONTRACT.caseManifest.format, set: 'CS-EVAL-COUNTER', cases: EC.requiredCases.map((id, i) => ({ id, tags: ['all'], input: `lab/acceptance/cases/inputs/CS-EVAL-COUNTER/${id}.json`, contentSha256: sha256(ecInput(id, i)), comparator: 'CMP-EXACT-VALUE', oracle: 'O-CONTRACT' })) }, null, 2) + '\n';
const ecFiles = { [EC.manifest]: ecManifest, ...Object.fromEntries(EC.requiredCases.map((id, i) => [`lab/acceptance/cases/inputs/CS-EVAL-COUNTER/${id}.json`, ecInput(id, i)])) };

const C = {
  ID: branch('ve01-identity', { 'build.mjs': ID_BUILD, 'packages/xtdb/src/run.ts': ID_RUN, 'runtime/gen.mjs': 'export const g = 0;\n' }),
  ABS: branch('ve01-abs-symlink', {}, { symlinks: { 'runtime/shim.mjs': path.join(EXT, 'abs-shim.mjs') } }),
  EQ: branch('ve01-same-tree-as-a0', {}, { base: R.C1.commit, allowEmpty: true }),
  T1: branch('ve01-t1', { 'packages/xtdb/src/run.ts': T1_RUN }),
  T4: branch('ve01-t4', { 'packages/xtdb/src/run.ts': T4_RUN }),
  T2: branch('ve01-t2', { 'build.mjs': T2_BUILD }),
  T5: branch('ve01-t5', { 'build.mjs': T5_BUILD }),
  T5B: branch('ve01-t5b', { 'build.mjs': T5_BUILD, 'packages/xtdb/src/run.ts': LIE_RUN('CS-COMPOSITION/') }),
  T5C: branch('ve01-t5c', { 'build.mjs': T5_BUILD, 'packages/xtdb/src/run.ts': LIE_RUN('CS-EVAL-COUNTER/'), ...ecFiles }),
  T6: branch('ve01-t6', { 'build.mjs': T6_BUILD }),
  T8: branch('ve01-t8', { 'build.mjs': replaceBuild(`${R.C1.commit}:packages/xtdb/src/alloc.ts`) }),
};
writeExt('abs-shim.mjs', 'export const adjust = (n, c) => n;\n');
writeExt('t5.json', '{}');
const ALL = Object.values(C).map(x => x.commit);
authority('auth-ve01', c => {
  register(c, ALL, ['G10.scope.shared-collision', 'R.evaluator.incomplete-receipts', 'G10.composition.identity-bound']);
  c.caseSets['CS-EVAL-COUNTER'] = { ...c.caseSets['CS-EVAL-COUNTER'], manifestSha256: sha256(ecManifest) };
});
authority('auth-spec', c => { c.buildSpec = { ...c.buildSpec, argv: ['node', 'build.mjs', '--spec-v2'] }; });

// ================================================================ check 2: Q67b execution identity

const idOf = r => { const s = objectStore(r.run.objects); const inst = r.run.instances[0]; return { binary: inst.binarySha256, dist: inst.distSha256, record: JSON.parse(s.get(inst.binarySha256).bytes.toString()) }; };
const planIdentity = (over, files, opts = {}) => { setIdMode(over, files); return idOf(q(claimFor(C.ID), { offline: false, ...opts })); };

test('check 2 (Q67b): with the tree label fixed, the identity changes with the source runner, a dependency, a symlink\'s text, an external directory, the lockfile and the buildSpec; the dist does not', () => {
  const base = planIdentity();
  const variants = {
    'source runner outside dist (generated by the build)': planIdentity({ runner: 'export const g = 2;\n' }),
    'dependency file in node_modules': planIdentity({ dep: 'export const d = 2;\n' }),
    'symlink text': planIdentity({ linkText: 'dep/other.mjs' }),
    'content of a directory symlinked from outside the checkout': planIdentity({}, { dir: 'export const x = 2;\n' }),
    'lockfile bytes written by the build': planIdentity({ lockExtra: '# extra\n' }),
    'buildSpec (authority with another argv)': planIdentity({}, {}, { authorityRef: 'auth-spec' }),
  };
  for (const [what, v] of Object.entries(variants)) {
    assert.equal(v.dist, base.dist, `${what}: the dist must not change`);
    assert.notEqual(v.binary, base.binary, `${what}: the identity must change`);
    assert.equal(v.record.sourceTreeSha256, base.record.sourceTreeSha256, `${what}: same tree label`);
  }
  assert.notEqual(variants['lockfile bytes written by the build'].record.lockfileSha256, base.record.lockfileSha256);
  assert.notEqual(variants['buildSpec (authority with another argv)'].record.buildSpecSha256, base.record.buildSpecSha256);
});

test('check 2 GAP (Q67b): a file symlink to a path outside the checkout binds only its text; the target\'s bytes decide the answer and the identity is the same', () => {
  setIdMode({}, { file: HONEST_F });
  const honest = q(claimFor(C.ID));
  setIdMode({}, { file: ALIAS_F });
  const alias = q(claimFor(C.ID));
  assert.equal(idOf(honest).binary, idOf(alias).binary, 'one execution identity');
  assert.equal(honest.offlineVerdict, 'QUALIFIED', JSON.stringify(codes(honest)));
  assert.equal(alias.offlineVerdict, 'DIAGNOSTIC');
  assert.ok(codes(alias).includes('CASE-FAIL'));
  // The same holds for a symlink tracked in the commit itself (ve01-abs-symlink: runtime/shim.mjs -> an absolute path).
  writeExt('abs-shim.mjs', 'export const adjust = (n, c) => n;\n');
  const a = q(claimFor(C.ABS));
  writeExt('abs-shim.mjs', "export const adjust = (n, c) => String(c.case).startsWith('CS-SCOPE/') ? n + 1 : n;\n");
  const b = q(claimFor(C.ABS));
  writeExt('abs-shim.mjs', 'export const adjust = (n, c) => n;\n');
  assert.equal(idOf(a).binary, idOf(b).binary);
  assert.deepEqual([a.offlineVerdict, b.offlineVerdict], ['QUALIFIED', 'DIAGNOSTIC']);
});

test('check 2 GAP (Q67b): the toolchain is the evaluator\'s process.version, not the node on PATH that builds and runs the system under test', () => {
  const node24 = path.join(os.homedir(), '.local/share/mise/installs/node/24.13.0/bin');
  if (!fs.existsSync(path.join(node24, 'node'))) return; // the demonstration needs a second node; skipped elsewhere
  setIdMode();
  const base = q(claimFor(C.ID));
  const before = process.env.PATH;
  let other;
  try { process.env.PATH = `${node24}:${before}`; other = q(claimFor(C.ID)); } finally { process.env.PATH = before; }
  assert.equal(idOf(other).binary, idOf(base).binary, 'one execution identity');
  assert.equal(idOf(other).record.toolchain.node, process.version);
  assert.equal(fs.readFileSync(path.join(EXT, 'build-node-version.txt'), 'utf8'), 'v24.13.0');
  assert.equal(fs.readFileSync(path.join(EXT, 'sut-node-version.txt'), 'utf8'), 'v24.13.0');
  assert.notEqual(process.version, 'v24.13.0');
  assert.equal(other.offlineVerdict, 'QUALIFIED');
});

test('check 2: two instances with one identity share the first instance (a candidate commit with A0\'s tree runs A0\'s cases on its own checkout)', () => {
  const r = q(claimFor(C.EQ));
  assert.equal(r.run.instances[0].binarySha256, R.a0Binary, 'same tree as A0, so the same identity as the registry\'s');
  assert.equal(r.run.instances.length, 2, 'A0 was still rebuilt');
  assert.ok(r.run.cases.every(c => c.instance === 0), 'every execution, A0\'s included, ran instance 0');
});

// ================================================================ check 3: Q67e tamper routes

test('check 3 T1 (Q67e): a system under test inside its own process group edits the oracle copy (no escape needed); the re-hash refuses the oracle', () => {
  const r = q(claimFor(C.T1));
  assert.ok(codes(r).includes('ORACLE-TAMPERED') && codes(r).includes('MEASUREMENT-RUN-FAILED'), JSON.stringify(codes(r)));
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
});

test('check 3 T4 (Q67e): the same edit through a symlink the system under test makes in its own checkout is caught the same way', () => {
  const r = q(claimFor(C.T4));
  assert.ok(codes(r).includes('ORACLE-TAMPERED'), JSON.stringify(codes(r)));
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
});

test('check 3 T2 (Q67e): a double fork stays in the build\'s group and is killed; a helper that starts its own session (setsid) survives', async () => {
  for (const m of [DF_MARK, SS_MARK]) fs.rmSync(m, { force: true });
  const r = q(claimFor(C.T2));
  await new Promise(done => setTimeout(done, 2000));
  assert.equal(fs.existsSync(DF_MARK), false, 'the double-forked grandchild outlived the group kill');
  assert.equal(fs.existsSync(SS_MARK), true, 'the setsid helper was killed (the gap the report names would be closed)');
  assert.equal(r.offlineVerdict, 'QUALIFIED', 'nothing in the run notices the surviving helper');
});

test('check 3 T5-blob (Q67e): substituting the O-CONTRACT runner\'s blob everywhere also changes A0\'s checkout, so the whole-checkout identity (Q67b) fails it closed', () => {
  writeExt('t5.json', JSON.stringify({ evil: EVIL_SIDE_EFFECT, mode: 'blob' }));
  let r;
  try { r = q(claimFor(C.T5)); } finally { clearReplace(); writeExt('t5.json', '{}'); }
  assert.equal(r.run.core.reasons[0]?.code, 'A0-REBUILD-MISMATCH', JSON.stringify(codes(r)));
});

test('check 3 T5a GAP (Q67e): an unpinned COMPILED oracle\'s bytes are read from the repository after the candidate\'s build ran; `git replace` makes the evaluator run the candidate\'s bytes as the oracle', () => {
  fs.rmSync(ORACLE_MARK, { force: true });
  writeExt('t5.json', JSON.stringify({ evil: EVIL_SIDE_EFFECT, mode: 'commit', authority: 'auth-ve01', file: 'lab/oracles/contract/cli.py' }));
  let r;
  try { r = q(claimFor(C.T5)); } finally { clearReplace(); writeExt('t5.json', '{}'); }
  assert.equal(fs.existsSync(ORACLE_MARK), true, 'the O-CONTRACT copy that ran was not the candidate\'s: ' + JSON.stringify(r.reasons.slice(0, 6)) + JSON.stringify(r.run.oracle.slice(0, 3)));
  assert.equal(r.offlineVerdict, 'QUALIFIED', JSON.stringify(codes(r)));
  assert.ok(!codes(r).some(c => /TAMPER|ORACLE-FILES|ORACLE-UNPINNED/.test(c)), JSON.stringify(codes(r)));
});

test('check 3 T5b GAP (Q67e): with a lying O-CONTRACT on the identity cases, the reference model qualifies a wrong candidate; only the lab\'s A0 re-run of the prerequisites catches it', () => {
  writeExt('t5.json', JSON.stringify({ evil: lieIn('CS-COMPOSITION/'), mode: 'commit', authority: 'auth-ve01', file: 'lab/oracles/contract/cli.py' }));
  let r;
  try { r = q(claimFor(C.T5B)); } finally { clearReplace(); writeExt('t5.json', '{}'); }
  assert.equal(r.run.core.verdict, 'QUALIFIED', 'admitCore over the lab executor');
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
  assert.ok(r.reasons.some(x => x.code === 'PREREQ-FAILED' && /A0 build/.test(x.detail)), JSON.stringify(r.reasons.slice(0, 4)));
  // Control: without the substitution the same wrong candidate fails its own identity cases.
  const honest = q(claimFor(C.T5B));
  assert.equal(honest.run.core.reasons[0]?.code, 'PREREQ-FAILED');
});

test('check 3 T5c GAP (Q67e): on a claimed obligation A0 is never re-run on (R.evaluator.incomplete-receipts, O-CONTRACT), a wrong candidate that substitutes the oracle reaches offlineVerdict QUALIFIED', () => {
  const claim = claimFor(C.T5C, { obligations: ['R.evaluator.incomplete-receipts'] });
  const honest = q(claim);
  assert.equal(honest.offlineVerdict, 'DIAGNOSTIC', 'control: the honest oracle rejects the wrong answers');
  assert.ok(codes(honest).includes('CASE-FAIL') && codes(honest).includes('MEASUREMENT-RUN-FAILED'), JSON.stringify(codes(honest)));
  writeExt('t5.json', JSON.stringify({ evil: lieIn('CS-EVAL-COUNTER/'), mode: 'commit', authority: 'auth-ve01', file: 'lab/oracles/contract/cli.py' }));
  let r;
  try { r = q(claim); } finally { clearReplace(); writeExt('t5.json', '{}'); }
  assert.equal(r.offlineVerdict, 'QUALIFIED', JSON.stringify(codes(r)));
  assert.equal(r.verdict, 'DIAGNOSTIC', 'GATE-NOT-RUN still holds the top-level verdict');
  assert.deepEqual(codes(r), ['GATE-NOT-RUN', 'RUN-NOT-ON-GATE']);
  assert.equal(r.run.cases.filter(c => c.obligation === 'R.evaluator.incomplete-receipts' && c.verdict === 'PASS').length, EC.requiredCases.length);
});

test('check 3 T8 (Q67e): `git replace` on A0\'s source makes the A0 rebuild differ from the registry, so it fails closed', () => {
  writeExt('t5.json', JSON.stringify({ evil: 'export const nextCommitPosition = p => p + 1; // v1 (A0), substituted\n' }));
  let r;
  try { r = q(claimFor(C.T8)); } finally { clearReplace(); writeExt('t5.json', '{}'); }
  assert.equal(r.run.core.reasons[0]?.code, 'A0-REBUILD-MISMATCH', JSON.stringify(codes(r)));
});

test('check 3 T6 GAP (Q67e): one HOME and TMPDIR serve the candidate\'s build, its runs, A0\'s build, A0\'s runs and every oracle run', () => {
  const seen = [];
  const local = localSut(spec);
  const r = q(claimFor(C.T6), { sut: args => { seen.push({ instance: args.instance, home: args.home, planted: fs.existsSync(path.join(args.home, 'planted-by-candidate-build')) }); return local(args); } });
  assert.equal(r.offlineVerdict, 'QUALIFIED');
  const a0 = seen.filter(s => s.instance === 1);
  assert.ok(a0.length > 0 && a0.every(s => s.planted), 'A0\'s runs see the file the candidate\'s build planted');
  assert.equal(new Set(seen.map(s => s.home)).size, 1, 'one HOME for both instances');
});

test('check 3 T7 GAP (Q67e): deleting an evidence object is not EVIDENCE-TAMPERED (only objects still present are re-hashed), and a read-only object needs no chmod to delete', () => {
  const work = path.join(root, 'work', 't7');
  let deleted = null;
  const local = localSut(spec);
  const r = q(claimFor({ ...R.C2, name: 'C2' }), { workDir: work, sut: args => {
    // Delete the candidate's build-manifest/2 (unique to the candidate's tree, so nothing writes it again later in the run).
    const objects = path.join(work, 'objects');
    if (!deleted && fs.existsSync(objects)) for (const h of fs.readdirSync(objects)) {
      let v = null;
      try { v = JSON.parse(fs.readFileSync(path.join(objects, h), 'utf8')); } catch { v = null; }
      if (v?.schema === 'build-manifest/2' && v.sourceTreeSha256 === R.C2.label) { fs.unlinkSync(path.join(objects, h)); deleted = h; break; }
    }
    return local(args);
  } });
  assert.ok(deleted);
  assert.equal(r.run.builds[R.C2.commit].buildManifestSha256, deleted, 'the deleted object is the candidate build\'s manifest');
  assert.equal(fs.existsSync(path.join(work, 'objects', deleted)), false);
  assert.ok(!codes(r).includes('EVIDENCE-TAMPERED'), JSON.stringify(codes(r)));
  assert.equal(r.offlineVerdict, 'QUALIFIED');
});

test('check 3 T3 GAP (Q67e): a build that rewrites the evaluator is reported in its own run, but every later run uses the rewritten evaluator, which can drop GATE-NOT-RUN', () => {
  // A scratch copy of the tree at 2796455 is the evaluator under attack; the candidate's build knows its path, as a real one knows
  // /Users/sam/projects/triplex-db-2 (lab/config/build.json names it).
  const copy = path.join(root, 'evaluator-copy');
  fs.mkdirSync(copy, { recursive: true });
  execFileSync('tar', ['-x', '-f', '-', '-C', copy], { input: execFileSync('git', ['-C', WT, 'archive', '--format=tar', '2796455'], { maxBuffer: 1 << 30 }), maxBuffer: 1 << 30 });
  const target = path.join(copy, 'lab/bin/claim.mjs');
  const original = fs.readFileSync(target, 'utf8');
  const build = mode => BUILD + `
const t = ${JSON.stringify(target)}, orig = fs.readFileSync(t, 'utf8');
const evil = orig.replace("why('GATE-NOT-RUN', ", "void ('GATE-NOT-RUN', ").replace("if (run.offline) why('RUN-NOT-ON-GATE', ", "if (false) why('RUN-NOT-ON-GATE', ");
fs.writeFileSync(t, evil);
${mode === 'restore' ? 'fs.writeFileSync(t, orig);' : ''}
`;
  const restore = branch('ve01-t3-restore', { 'build.mjs': build('restore') }), persist = branch('ve01-t3-persist', { 'build.mjs': build('persist') });
  authority('auth-t3', c => register(c, [restore.commit, persist.commit], ['G10.scope.shared-collision']));
  const drive = (at, tag) => {
    const file = path.join(root, `t3-${tag}.claim.json`);
    fs.writeFileSync(file, JSON.stringify(claimFor(at)));
    const p = spawnSync(process.execPath, [path.join(import.meta.dirname, 't3-driver.mjs'), copy, R.dir, file, path.join(root, 'work', `t3-${tag}`), path.join(root, `iso-t3-${tag}`), 'auth-t3'], { encoding: 'utf8' });
    assert.equal(p.status, 0, p.stderr);
    return JSON.parse(p.stdout);
  };
  const a = drive(restore, 'restore');
  assert.equal(fs.readFileSync(target, 'utf8'), original);
  assert.deepEqual(a.codes, ['GATE-NOT-RUN', 'RUN-NOT-ON-GATE'], 'an edit restored before the end hash is not reported (and changes nothing in this run)');
  const b = drive(persist, 'persist');
  assert.ok(b.codes.includes('EVALUATOR-TAMPERED'), JSON.stringify(b.codes));
  assert.notEqual(fs.readFileSync(target, 'utf8'), original, 'nothing restores the evaluator');
  // The next run, of an honest claim, in a new process, with the rewritten evaluator: QUALIFIED at the top level.
  const c = drive({ ...R.C2, name: 'C2' }, 'next');
  assert.equal(c.verdict, 'QUALIFIED', JSON.stringify(c));
  assert.equal(c.exit, 0);
});

// ================================================================ check 4: Q67i comparators

const b = v => Buffer.from(canonText(v));
const store = objs => { const m = new Map(objs.map(x => [sha256(x), x])); return { get: h => m.has(h) ? { ok: true, bytes: m.get(h) } : { ok: false } }; };
const verdictPair = (cmp, e, o) => { const E = b(e), O = b(o); return [recompute(cmp, E, O), caseResultVerdict({ oracleExit: 0, oracleCode: null, comparator: cmp, expectedSha256: sha256(E), observedSha256: sha256(O) }, store([E, O]))]; };
const COMPARATOR_PAIRS = {
  'CMP-EXACT-VALUE': { pass: [{ t: 'decimal', v: '16.50' }, { t: 'decimal', v: '16.50' }], fail: [{ t: 'decimal', v: '16.50' }, { t: 'decimal', v: '16.5' }] },
  'CMP-SET-ROWS': { pass: [[['a'], ['b'], ['b']], [['b'], ['a']]], fail: [[['a'], ['b']], [['a']]] },
  'CMP-BAG-ROWS': { pass: [[['a'], ['b'], ['b']], [['b'], ['a'], ['b']]], fail: [[['a'], ['b'], ['b']], [['b'], ['a']]] },
  'CMP-ORDERED-ROWS': { pass: [[['a'], ['b']], [['a'], ['b']]], fail: [[['a'], ['b']], [['b'], ['a']]] },
  'CMP-PAGES': { pass: [[{ basis: 3, rows: [1, 2] }, { basis: 3, rows: [3] }], [{ basis: 3, rows: [1, 2] }, { basis: 3, rows: [3] }]], fail: [[{ basis: 3, rows: [1, 2] }, { basis: 3, rows: [3] }], [{ basis: 3, rows: [1] }, { basis: 3, rows: [2, 3] }]] },
  'CMP-DIAGNOSTICS': { pass: [[{ code: 2322, column: 3, file: 'a.ts', line: 1 }, { code: 1, column: 1, file: 'b.ts', line: 2 }], [{ code: 1, column: 1, file: 'b.ts', line: 2 }, { code: 2322, column: 3, file: 'a.ts', line: 1 }]], fail: [[{ code: 2322, column: 3, file: 'a.ts', line: 1 }], [{ code: 2322, column: 3, file: 'a.ts', line: 1 }, { code: 1, column: 1, file: 'b.ts', line: 2 }]] },
  'CMP-ERROR': { pass: [{ _tag: 'BasisNotAvailable', reasons: ['basis-not-reached'] }, { _tag: 'BasisNotAvailable', reason: 'basis-not-reached', cause: { message: 'x' }, rows: [] }], fail: [{ _tag: 'BasisNotAvailable', reasons: ['basis-not-reached'] }, { _tag: 'BasisNotAvailable', reason: 'basis-not-reached', cause: { message: 'x' }, rows: [[1]] }] },
};

test('check 4 (Q67i): for every declared comparator, a pass pair passes and a fail pair fails, and compare (recompute) and caseResultVerdict agree', () => {
  assert.deepEqual(Object.keys(COMPARATOR_PAIRS).sort(), Object.keys(CONTRACT.comparators).sort());
  for (const [cmp, { pass, fail }] of Object.entries(COMPARATOR_PAIRS)) {
    assert.deepEqual(verdictPair(cmp, ...pass), ['PASS', 'PASS'], `${cmp} pass pair`);
    assert.deepEqual(verdictPair(cmp, ...fail), ['FAIL', 'FAIL'], `${cmp} fail pair`);
  }
});

test('check 4 GAP (Q67i): an O-REPLAY answer is an object {commandOutcomes, queries, state}, so every row, page and error comparator is UNCOMPARABLE on it, even on identical bytes', () => {
  const answer = { commandOutcomes: [], queries: { q1: [['b'], ['a']] }, state: {} };
  for (const cmp of ['CMP-SET-ROWS', 'CMP-BAG-ROWS', 'CMP-ORDERED-ROWS', 'CMP-PAGES', 'CMP-DIAGNOSTICS', 'CMP-ERROR']) assert.deepEqual(verdictPair(cmp, answer, answer), ['UNCOMPARABLE', 'UNCOMPARABLE'], cmp);
  assert.deepEqual(verdictPair('CMP-EXACT-VALUE', answer, answer), ['PASS', 'PASS']);
  // The real contract declares exactly those comparators for O-REPLAY cases ("per case: CMP-SET-ROWS, CMP-BAG-ROWS, CMP-EXACT-VALUE, CMP-ERROR, CMP-PAGES").
  assert.deepEqual(CONTRACT.answerMembers['O-REPLAY'], ['commandOutcomes', 'state', 'queries']);
});

test('check 4 (CMP-ERROR cause, Codex finding 9): a missing cause fails, as the compiled 0.3.9 rule says (Q67h, pending, would make it optional); any non-null value counts as "the original cause retained"', () => {
  const e = { _tag: 'ReplicaUnavailable', reasons: ['replica-unreachable'] };
  assert.deepEqual(verdictPair('CMP-ERROR', e, { _tag: 'ReplicaUnavailable', reason: 'replica-unreachable' }), ['FAIL', 'FAIL'], 'a deadline-style typed error without a cause');
  for (const cause of [false, 0, '', [], {}]) assert.deepEqual(verdictPair('CMP-ERROR', e, { _tag: 'ReplicaUnavailable', reason: 'replica-unreachable', cause }), ['PASS', 'PASS'], `cause ${JSON.stringify(cause)}`);
  // The fix's own error shape (Codex finding 9) still fails the contract's tags.
  assert.deepEqual(verdictPair('CMP-ERROR', e, { _tag: 'ReadError', reason: 'replica-unavailable', cause: {} }), ['FAIL', 'FAIL']);
});

test('check 4: on a run with no observation, compare says FAIL and caseResultVerdict UNCOMPARABLE for the same record (both never PASS)', () => {
  const r = q(claimFor({ ...R.C2, name: 'C2-plan' }), { offline: false });
  const s = objectStore(r.run.objects);
  const c = r.run.cases[0];
  assert.equal(c.verdict, 'FAIL');
  const rec = JSON.parse(s.get(c.recordSha256).bytes.toString());
  assert.equal(caseResultVerdict(rec, s), 'UNCOMPARABLE');
});

// ================================================================ check 5: Q67j promotion

test('check 5 (Q67j): no promotion reaches QUALIFIED through qualify (offline or plan-only, engine-source or log-source) or admit', () => {
  for (const comp of [CANDIDATE, LOG_SOURCE, composition('xtdb', 'xtdb'), composition('qlever', 'qlever')]) for (const offline of [true, false]) {
    const r = q(claimFor({ ...R.C2, name: 'C2' }, { kind: 'promotion', composition: structuredClone(comp) }), { offline, authorityRef: 'main' });
    assert.equal(r.verdict, 'DIAGNOSTIC');
    assert.notEqual(r.offlineVerdict, 'QUALIFIED');
    assert.ok(codes(r).includes('PROMOTION-UNSUPPORTED'), JSON.stringify(codes(r)));
  }
  const doc = built.fixtures.find(f => f.id === 'POSITIVE-PROMOTION');
  for (const comp of [doc.claim.composition, LOG_SOURCE]) {
    const a = admitClaim({ ...doc.claim, composition: structuredClone(comp) }, { git: gitSource(doc.repo), objects: objectStore(built.objects), authorityRef: 'main' });
    assert.equal(a.verdict, 'DIAGNOSTIC');
    assert.equal(a.documentVerdict, 'DIAGNOSTIC');
    assert.ok(codes(a).includes('PROMOTION-UNSUPPORTED'));
  }
  for (const kind of ['Promotion', 'promotion ', ['promotion'], null]) assert.ok(codes(q(claimFor({ ...R.C2, name: 'C2' }, { kind }), { offline: false, authorityRef: 'main' })).includes('CLAIM-KIND'), JSON.stringify(kind));
});

test('check 5 GAP (Q67j): admitCore never reads the kind it is now passed, so the reference model and run.core say QUALIFIED for a promotion; the same log-source claim labelled comparative qualifies offline', () => {
  const promo = q(claimFor({ ...R.C2, name: 'C2' }, { kind: 'promotion', composition: structuredClone(LOG_SOURCE) }), { authorityRef: 'main' });
  assert.equal(promo.run.core.verdict, 'QUALIFIED');
  const relabelled = q(claimFor({ ...R.C2, name: 'C2' }, { kind: 'comparative', composition: structuredClone(LOG_SOURCE) }), { authorityRef: 'main' });
  assert.equal(relabelled.offlineVerdict, 'QUALIFIED');
  const src = fs.readFileSync(path.join(WT, 'lab/bin/claim.mjs'), 'utf8');
  const body = src.slice(src.indexOf('export function admitCore'), src.indexOf("/** Contract 0.3.7's evidence_ok"));
  assert.ok(body.length > 1000 && !/\bkind\b/.test(body.replace(/'a0'|'obligation'/g, '')), 'admitCore reads the claim kind');
});

// ================================================================ check 6: no top-level QUALIFIED

test('check 6: qualify is DIAGNOSTIC on every early return and on every exception; only paths that reach the gate step carry GATE-NOT-RUN', () => {
  const ok = claimFor({ ...R.C2, name: 'C2' });
  const cases = {
    'CLAIM-FORMAT': [{ ...ok, format: 'x' }, {}],
    'CLAIM-COMMIT': [{ ...ok, commit: 'f'.repeat(40) }, {}],
    'CONTRACT-AUTHORITY': [ok, { authorityRef: 'no-such-ref' }],
    'COMPOSITION-UNBOUND': [{ ...ok, composition: {} }, {}],
    'EVALUATOR-ERROR (gate throws)': [ok, { gate: () => { throw new Error('gate down'); } }],
    'EVALUATOR-ERROR (workDir not creatable)': [ok, { workDir: '/dev/null/x' }],
  };
  const rows = {};
  for (const [name, [claim, extra]] of Object.entries(cases)) {
    const r = qualifyClaim(claim, { git: gitSource(R.dir), authorityRef: extra.authorityRef ?? 'main', workDir: extra.workDir ?? path.join(root, 'work', `c6-${name}`), isolationRoot: path.join(root, 'iso-c6'), sut: localSut(spec), ...(extra.gate ? { gate: extra.gate } : {}) });
    rows[name] = { verdict: r.verdict, offlineVerdict: r.offlineVerdict, gateNotRun: codes(r).includes('GATE-NOT-RUN'), first: codes(r)[0] };
    assert.equal(r.verdict, 'DIAGNOSTIC', name);
    assert.notEqual(r.offlineVerdict, 'QUALIFIED', name);
  }
  for (const name of Object.keys(cases)) assert.equal(rows[name].gateNotRun, false, `${name} unexpectedly reaches the gate step`);
  fs.writeFileSync(path.join(root, 'c6-rows.json'), JSON.stringify(rows, null, 2));
});

test('check 6 GAP: a system under test that makes the evidence directory unreadable makes qualifyClaim throw instead of returning a verdict', () => {
  const work = path.join(root, 'work', 'c6-chmod');
  const local = localSut(spec);
  let done = false;
  assert.throws(() => qualifyClaim(claimFor({ ...R.C2, name: 'C2' }), { git: gitSource(R.dir), authorityRef: 'main', workDir: work, isolationRoot: path.join(root, 'iso-c6b'), sut: args => {
    if (!done) { fs.chmodSync(path.join(work, 'objects'), 0o000); done = true; }
    return local(args);
  } }), /EACCES/);
  fs.chmodSync(path.join(work, 'objects'), 0o755);
});
