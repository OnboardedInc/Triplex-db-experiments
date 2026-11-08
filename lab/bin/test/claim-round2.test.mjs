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
import { sha256, sourceTreeIdOf } from '../lib.mjs';
import { admitClaim, admitCore, canonText, caseResultVerdict, coreContext, gitSource, localSut, objectStore, qualifyClaim, recompute, EVALUATOR_FILES } from '../claim.mjs';
import { CANDIDATE, LOG_SOURCE, buildFixtures, composition, evaluateLab } from '../test/claim-fixtures.mjs';

const WT = path.resolve(import.meta.dirname, '../../..');
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


// [EXP-E01] Why: invert the verifier's GAP assertions into regression guards. Rejected: treating a red GAP assertion as a passing gate.
test('V-E01 F1/T3: a persistently rewritten evaluator refuses the next run against its Git blobs', () => {
  const copy = path.join(root, 'integrity-copy');
  fs.mkdirSync(copy);
  for (const f of EVALUATOR_FILES) { const dst = path.join(copy, f); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(path.join(WT, f), dst); }
  const g = args => execFileSync('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@lab.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: copy, env: genv });
  g(['init', '-q']); g(['add', '.']); g(['commit', '-qm', 'anchor evaluator']);
  const target = path.join(copy, 'lab/bin/claim.mjs');
  fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace("why('GATE-NOT-RUN', ", "void ('GATE-NOT-RUN', "));
  const driver = `import { qualifyClaim } from ${JSON.stringify('file://' + target)}; console.log(JSON.stringify(qualifyClaim(null, {})));`;
  const r = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', driver], { encoding: 'utf8' }));
  assert.equal(r.verdict, 'DIAGNOSTIC');
  assert.ok(codes(r).includes('EVALUATOR-TAMPERED'));
});

test('V-E01 F2/T5c: replace refs cannot substitute the oracle or qualify a wrong candidate', () => {
  const claim = claimFor(C.T5C, { obligations: ['R.evaluator.incomplete-receipts'] });
  writeExt('t5.json', JSON.stringify({ evil: lieIn('CS-EVAL-COUNTER/'), mode: 'commit', authority: 'auth-ve01', file: 'lab/oracles/contract/cli.py' }));
  let r;
  try { r = q(claim); } finally { clearReplace(); writeExt('t5.json', '{}'); }
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC', JSON.stringify(r.reasons));
  assert.ok(codes(r).includes('CASE-FAIL'));
});

test('V-E01 F2/Q75c: an unpinned COMPILED runner leaves an otherwise honest run diagnostic', () => {
  authority('auth-unpinned', c => { delete c.oraclePins['O-CONTRACT']; });
  const r = q(claimFor({ ...R.C2, name: 'C2' }), { authorityRef: 'auth-unpinned' });
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
  assert.ok(codes(r).includes('ORACLE-RUNNER-UNPINNED'));
});

test('V-E01 F3/F10: outside file and directory links are refused, never followed', () => {
  for (const at of [C.ABS, C.ID]) {
    const r = q(claimFor(at));
    assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
    assert.ok(codes(r).includes('BUILD-LINK-OUTSIDE'), JSON.stringify(r.reasons));
    assert.equal(r.run.instances.length, 0);
  }
});

test('V-E01 F4/T6: each build and execution gets a fresh HOME and TMPDIR', () => {
  const homes = [];
  const local = localSut(spec);
  const probe = q(claimFor(C.T6), { sut: args => {
    const result = args.runChild(['node', '-e', `const fs=require('fs'); console.log(JSON.stringify({home:process.env.HOME,tmp:process.env.TMPDIR,planted:fs.existsSync(process.env.HOME+'/planted-by-candidate-build')}));`], { cwd: args.dir });
    homes.push(JSON.parse(result.stdout));
    return local(args);
  } });
  assert.equal(probe.offlineVerdict, 'QUALIFIED', JSON.stringify(probe.reasons));
  assert.ok(homes.length > 1 && homes.every(x => !x.planted));
  assert.equal(new Set(homes.map(x => x.home)).size, homes.length);
});

test('V-E01 F7/T7: deleting a retained evidence object fails closed', () => {
  let deleted;
  const local = localSut(spec), workDir = path.join(root, 'deleted-evidence');
  const r = q(claimFor({ ...R.C2, name: 'C2' }), { workDir, sut: args => {
    if (!deleted) for (const h of fs.readdirSync(path.join(workDir, 'objects'))) {
      let v; try { v = JSON.parse(fs.readFileSync(path.join(workDir, 'objects', h))); } catch { continue; }
      if (v.schema === 'build-manifest/2') { fs.unlinkSync(path.join(workDir, 'objects', h)); deleted = h; break; }
    }
    return local(args);
  } });
  assert.ok(deleted);
  assert.equal(r.offlineVerdict, 'DIAGNOSTIC');
  assert.ok(codes(r).includes('EVIDENCE-MISSING'));
});

test('V-E01 F8: admitCore refuses promotion before executing candidate code', () => {
  const r = q(claimFor({ ...R.C2, name: 'C2' }, { kind: 'promotion' }), { authorityRef: 'main' });
  assert.equal(r.run.core.verdict, 'DIAGNOSTIC');
  assert.ok(r.run.core.reasons.some(x => x.code === 'PROMOTION-UNSUPPORTED'));
  assert.equal(r.run.instances.length, 0);
});

test('V-E01 F9: every early return and caught exception carries GATE-NOT-RUN', () => {
  for (const [claim, extra] of [[null, {}], [claimFor({commit:'f'.repeat(40),label:'a'.repeat(64)}), {}], [claimFor(R.C2), { authorityRef:'absent' }], [claimFor(R.C2,{composition:{}}),{}], [claimFor(R.C2),{workDir:'/dev/null/x'}]]) {
    const r = q(claim, extra);
    assert.equal(r.verdict, 'DIAGNOSTIC');
    assert.ok(codes(r).includes('GATE-NOT-RUN'));
  }
});

test('V-E01 F5/Q75g: O-REPLAY-shaped row comparisons stay UNCOMPARABLE on contract 0.3.10', () => {
  const answer = Buffer.from(canonText({ commandOutcomes: [], queries: [{id:'q1', result:[['b'],['a']]}], state:{} }));
  for (const cmp of ['CMP-SET-ROWS','CMP-BAG-ROWS','CMP-ORDERED-ROWS','CMP-PAGES','CMP-DIAGNOSTICS','CMP-ERROR']) assert.equal(recompute(cmp,answer,answer),'UNCOMPARABLE');
});

test('V-E01 F6/Q75h: cause is optional but must be structured when present', () => {
  const e = Buffer.from(canonText({_tag:'ReplicaUnavailable',reasons:['replica-unreachable']}));
  const compare = cause => recompute('CMP-ERROR',e,Buffer.from(canonText({_tag:'ReplicaUnavailable',reason:'replica-unreachable',...cause})));
  assert.equal(compare({}),'PASS');
  assert.equal(compare({cause:{message:'original'}}),'PASS');
  for(const cause of [false,0,'',[],{},null]) assert.equal(compare({cause}),'FAIL');
});
