// One fixture set for claim admission (EXP-E01), in the contract 0.3.7 receipt and record formats (EVIDENCE_SCHEMAS,
// WORKLOAD_IDENTITY, A0_REGISTRY), plus the lab's run ledger and build provenance records.
//
// buildFixtures(root) writes small git repositories and one content-addressed object store under root and returns:
//   fixtures     document claims (each a complete positive claim with exactly one named defect), judged by the lab
//                evaluator (claim.mjs admit) and by the contract's admit_claim (claim_ref.py)
//   runFixtures  claims for claim.mjs qualify (RULINGS Q55a): the repositories hold a tiny buildable system under test
//                (packages/xtdb), its build (lab/config/build.json), case inputs and manifests, and a pinned oracle, so the
//                evaluator's own build, case resolution, oracle runs and comparator are exercised offline
//
//   node lab/bin/test/claim-fixtures.mjs [--keep DIR]   prints the document fixture table as Markdown
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256, sourceTreeIdOf } from '../lib.mjs';
import { FORMATS, admitClaim, bindingOf, gitSource, listingHash, objectStore } from '../claim.mjs';

const LAB_REPO = path.resolve(import.meta.dirname, '../../..');
const real = file => fs.readFileSync(path.join(LAB_REPO, file), 'utf8');
const REAL_CONTRACT = JSON.parse(real('lab/acceptance/obligations.json'));
const REAL_LOAD = JSON.parse(real('lab/acceptance/load-contract.json'));
const REAL_SLOTS = JSON.parse(real('lab/config/slots.json'));
const OBL = new Map(REAL_CONTRACT.obligations.map(o => [o.id, o]));
const SEED = 20261108;
const T = { c1: '2026-11-07T12:00:00Z', c2: '2026-11-07T13:00:00Z', c3: '2026-11-07T13:30:00Z', c4: '2026-11-07T13:45:00Z' };
const RUN_AT = Date.parse('2026-11-07T14:00:00Z') / 1000, BEFORE_C2 = Date.parse('2026-11-07T12:30:00Z') / 1000;
const h = text => sha256(Buffer.from(text));

// ---------------------------------------------------------------- the fixture repositories' files

const ORACLE_PY = `import json, sys
case = json.loads(open(sys.argv[1], encoding="utf-8").read())
if case.get("redeclareDecimal"):
    sys.stderr.write("o-replay: malformed case: X-NOT-MODELED: redeclares a decimal (5,2) to (6,3)\\n")
    sys.exit(2)
sys.stdout.write(json.dumps({"next": case["p"] + 1}, sort_keys=True, separators=(",", ":")) + "\\n")
`;
const SRC = {
  'packages/xtdb/package.json': '{ "name": "@fixture/xtdb", "version": "0.0.0" }\n',
  'packages/xtdb/src/index.ts': "export { nextCommitPosition } from './alloc.mjs';\n",
  'packages/xtdb/src/alloc.ts': 'export const nextCommitPosition = p => p + 1; // v1 (A0)\n',
  'packages/xtdb/src/run.ts': "import fs from 'node:fs';\nimport { nextCommitPosition } from './alloc.mjs';\nconst c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));\nprocess.stdout.write(JSON.stringify({ next: nextCommitPosition(c.p) }) + '\\n');\n",
  'test/helper/package.json': '{ "name": "@fixture/helper", "version": "0.0.0" }\n',
  'build.mjs': "import fs from 'node:fs';\nfs.mkdirSync('packages/xtdb/dist', { recursive: true });\nfor (const f of fs.readdirSync('packages/xtdb/src')) fs.writeFileSync(`packages/xtdb/dist/${f.replace(/\\.ts$/, '.mjs')}`, fs.readFileSync(`packages/xtdb/src/${f}`));\n",
  'lab/config/build.json': JSON.stringify({ argv: ['node', 'build.mjs'], outputs: ['packages/xtdb/dist'], run: ['node', 'packages/xtdb/dist/run.mjs', '{case}'] }, null, 2) + '\n',
  'lab/bin/position.mjs': '// position falsifier driver (fixture)\n',
  'lab/bin/ns.mjs': '// north-star driver (fixture)\n',
  'pnpm-lock.yaml': "lockfileVersion: '9.0'\npackages:\n  effect@3.10.0:\n    resolution: {integrity: sha512-fixture}\n",
  'lab/oracles/replay/cli.py': ORACLE_PY,
  'lab/oracles/contract/cli.py': ORACLE_PY,
  'lab/oracles/obs/obs.py': '# O-OBS (fixture)\n',
  'lab/oracles/domain/domain.py': '# O-DOMAIN (fixture)\n',
  'lab/oracles/hand/hand.json': '{}\n',
  'lab/world/W0/SPEC.md': '# W0 (fixture)\n',
  'lab/world/W0/releases/R1.json': '{"release":"R1"}\n',
  'lab/world/W0/releases/R2.json': '{"release":"R2"}\n',
  'lab/world/W0/releases/R3.json': '{"release":"R3"}\n',
  'lab/world/W0/schema.json': '{}\n',
  'lab/world/W0/cases/c1.json': '{"case":1}\n',
};
const ALLOC_V2 = 'export const nextCommitPosition = p => p + 1; // v2 candidate: nested transacts share one offset\n';
const ALLOC_WRONG = 'export const nextCommitPosition = p => p + 2; // a candidate that skips a position\n';

// ---------------------------------------------------------------- pinned case manifests with inputs (Q47c, Q55a)

const EXTRA_CASES = { 'CS-GS': ['GS-05-SCENARIO'], 'CS-MIGRATION': ['MIG-ADD-ATTRIBUTE', 'MIG-DECIMAL-5-2-TO-6-3'] };
const tagsFor = (set, id) => set === 'CS-POSITION' ? (id.startsWith('FX-') ? ['falsifiers'] : id === 'PO-NESTED-CUTS-DENSE' ? ['ordering', 'dense'] : ['ordering'])
  : set === 'CS-COMPOSITION' ? (['CO-RECEIPT-BINDS-ALL', 'CO-SCOPE-KEY-FROM-ASSIGNMENT'].includes(id) ? ['identity'] : ['watermark'])
    : set === 'CS-NS' ? [`p${id[4]}`] : set === 'CS-GS' ? [id.slice(0, 5)] : set === 'CS-MIGRATION' ? ['valid-writes'] : [];
export const MANIFEST_SETS = ['CS-POSITION', 'CS-COMPOSITION', 'CS-W0-COVERAGE', 'CS-NS', 'CS-GS', 'CS-MIGRATION'];
const inputText = (set, id, i) => JSON.stringify({ case: `${set}/${id}`, p: 40 + i, ...(id === 'MIG-DECIMAL-5-2-TO-6-3' ? { redeclareDecimal: true } : {}) }) + '\n';
export function caseManifest(set) {
  const ids = [...REAL_CONTRACT.caseSets[set].requiredCases, ...(EXTRA_CASES[set] ?? [])];
  return { format: 'triplex-db-2/case-manifest/1', set, cases: ids.map((id, i) => ({ id, tags: tagsFor(set, id), input: `lab/acceptance/cases/inputs/${set}/${id}.json`, contentSha256: h(inputText(set, id, i)),
    comparator: 'CMP-EXACT-VALUE', ...(set === 'CS-COMPOSITION' ? { oracle: 'O-CONTRACT' } : {}), ...(id === 'FX-CRASH-APPEND-RESOLUTION' ? { faultPoint: true } : {}) })) };
}
const manifestText = set => JSON.stringify(caseManifest(set), null, 2) + '\n';

/** The evaluator's binary hash of a commit's build (lab/config/build.json copies packages/xtdb/src/*.ts to dist/*.mjs): the
 * listing of the built files, which is what A0_REGISTRY binarySha256 records and every qualification run must reproduce. */
export const distListing = files => Object.keys(files).filter(f => /^packages\/xtdb\/src\/[^/]+\.ts$/.test(f)).map(f => [f.replace('/src/', '/dist/').replace(/\.ts$/, '.mjs'), h(files[f])])
  .sort((a, b) => a[0] < b[0] ? -1 : 1).map(([p, x]) => `${x}  ${p}\n`).join('');
/** Obligations a fixture claim can name; VERIFIER_REGISTRY accepts each at every verified commit. */
const VERIFIED_OBLIGATIONS = ['NS.P2', 'GS.05', 'G1.decimal.channel-routing', 'G9.erasure.residual-shapes', 'G7.migration.schema-evolution'];
const FIX_ORACLE_COMMIT = 'f1'.repeat(20);

function contractVariant(variant, { a0Commit, a0Label, a0Binary, verified } = {}) {
  const c = structuredClone(REAL_CONTRACT);
  if (variant === 'real') return c; // contract 0.3.8 exactly as compiled on main
  // Fixture oracles are pinned like the real ones: per-file hashes, an acceptance receipt, and a VERIFIER_REGISTRY entry that
  // accepts the oracle at the pin's commit (RULINGS Q55a). O-REPLAY keeps the real pin's commit and verifier entry (V-O04c).
  const reg = { ...c.verifierRegistry.entries };
  const filePin = (id, dir, file) => { reg[`V-FIX-${id}`] = { verifier: 'V-FIXTURE', subject: { kind: 'oracle', id, commit: FIX_ORACLE_COMMIT }, brief: 'fixture', briefSha256: h(`brief ${id}`), branch: 'verify/fixture', commit: FIX_ORACLE_COMMIT, verdict: 'ACCEPT (fixture)', status: 'current' };
    return { files: `${dir}/`, sha256: { [file]: h(SRC[file]) }, acceptReceipt: 'FIXTURE-ACCEPT', verifierEntry: `V-FIX-${id}`, commit: FIX_ORACLE_COMMIT, acceptedAfter: 'fixture', rule: 'fixture pin' }; };
  // The pinned fixture still scopes G1.decimal.channel-routing out, as 0.3.7's pin did, so GEN-EXCLUDED keeps a pin with excludes.
  c.oraclePins['O-REPLAY'] = { ...c.oraclePins['O-REPLAY'], sha256: { 'lab/oracles/replay/cli.py': h(ORACLE_PY) }, acceptReceipt: variant === 'null' ? null : 'FIXTURE-V-O04c', excludes: ['G1.decimal.channel-routing'] };
  c.oraclePins['O-OBS'] = filePin('O-OBS', 'lab/oracles/obs', 'lab/oracles/obs/obs.py');
  c.oraclePins['O-DOMAIN'] = filePin('O-DOMAIN', 'lab/oracles/domain', 'lab/oracles/domain/domain.py');
  c.oraclePins['O-HAND'] = filePin('O-HAND', 'lab/oracles/hand', 'lab/oracles/hand/hand.json');
  for (const set of MANIFEST_SETS) c.caseSets[set] = { ...c.caseSets[set], manifestSha256: h(manifestText(set)) };
  // RULINGS Q61c as ruled (compiled in 0.3.9): how an oracle without a default runner is invoked.
  c.oracleRunners = { 'O-CONTRACT': { argv: ['python3', '-I', 'lab/oracles/contract/cli.py', '{case}'], files: ['lab/oracles/contract/cli.py'] } };
  // A reviewed later contract version accepts the claimed obligations at the verified commits (0.3.8 VERIFIER_REGISTRY shape, Q61b).
  for (const commit of verified ?? []) for (const id of VERIFIED_OBLIGATIONS)
    reg[`V-FIX-${id}@${commit.slice(0, 12)}`] = { verifier: 'V-FIXTURE', subject: { kind: 'obligation', id, commit }, brief: 'fixture', briefSha256: h(`brief ${commit}`), branch: 'verify/fixture', commit, verdict: 'ACCEPT (fixture)', status: 'current' };
  c.verifierRegistry = { ...c.verifierRegistry, entries: reg };
  if (a0Commit && variant !== 'noreg') c.a0Registry = { ...c.a0Registry, entries: { ...c.a0Registry.entries, 'A0-XTDB': { commit: a0Commit, sourceTreeSha256: a0Label, binarySha256: a0Binary, composition: A0, measuredBy: 'FIXTURE-N01' } } };
  // The W0 pin keeps the real VERIFIER_REGISTRY acceptance (V-D01-W0-1.1.1); the fixture supplies its own files, a delta check and
  // a fingerprint, which only a reviewed contract version sets (RULINGS Q55e).
  if (variant === 'w0') c.w0Pin = { ...c.w0Pin, deltaCheck: 'FIXTURE-DELTA', oDomainFingerprint: 'f'.repeat(64),
    // The fixture's own W0 files (the real pin lists W0-1.1.1's 95 files), plus a directory pin of its cases.
    files: { ...Object.fromEntries(Object.keys(SRC).filter(f => f.startsWith('lab/world/W0/') && !f.startsWith('lab/world/W0/cases/')).map(f => [f, h(SRC[f])])),
      'lab/world/W0/cases/': listingHash([['lab/world/W0/cases/c1.json', h(SRC['lab/world/W0/cases/c1.json'])]]) } };
  return c;
}
function loadVariant(variant) {
  // RULINGS Q61h as ruled (compiled in 0.3.9): load-contract.json pins the frozen generator, seed and offer schedule.
  const l = structuredClone(REAL_LOAD);
  if (variant !== 'real') l.writerTrace.generator.frozen = { sha256: WORKLOAD.generatorSourceSha256, seed: SEED, offerScheduleSha256: WORKLOAD.offerScheduleSha256 };
  return l;
}

/** A composition: four assignments, the source declaring its protocol variant (0.3.8 composition_ok, RULINGS Q55b). */
export const composition = (sourceEngine, currentEngine, slot = 'dev', variant = 'engine-source') => {
  const a = engine => ({ engine, imageDigest: REAL_SLOTS.lanes[engine].imageId, configSha256: h(`config ${engine}`), slot });
  const c = { source: a(sourceEngine), current: a(currentEngine), history: a(sourceEngine), analytics: a(sourceEngine) };
  if (variant) c.source.variant = variant;
  return c;
};
export const CANDIDATE = composition('xtdb', 'qlever');
export const A0 = composition('xtdb', 'xtdb');
const WORKLOAD = { generatorSourceSha256: h('frozen trace generator'), seed: SEED, offerScheduleSha256: h(`schedule ${SEED}`), window: [120, 720], slot: 'dev' };

function makeRepo(dir, variant) {
  fs.mkdirSync(dir, { recursive: true });
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const git = (args, date) => execFileSync('git', ['-c', 'user.name=lab fixture', '-c', 'user.email=fixture@lab.invalid', '-c', 'commit.gpgsign=false', ...args],
    { cwd: dir, env: date ? { ...env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : env, encoding: 'utf8' }).trim();
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), text); };
  const snapshot = () => Object.fromEntries(git(['ls-files']).split('\n').filter(Boolean).map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
  const commit = (message, date) => { git(['add', '-A']); git(['commit', '-q', '-m', message], date); const tree = git(['rev-parse', 'HEAD^{tree}']); return { commit: git(['rev-parse', 'HEAD']), tree, label: sourceTreeIdOf(tree), date, time: Date.parse(date) / 1000, files: snapshot() }; };
  const writeContract = opts => { write('lab/acceptance/obligations.json', JSON.stringify(contractVariant(variant, opts), null, 2) + '\n'); write('lab/acceptance/load-contract.json', JSON.stringify(loadVariant(variant), null, 2) + '\n'); };
  git(['init', '-q', '-b', 'main']);
  for (const [f, t] of Object.entries(SRC)) write(f, t);
  for (const set of MANIFEST_SETS) { write(`lab/acceptance/cases/${set}.json`, manifestText(set)); caseManifest(set).cases.forEach((c, i) => write(c.input, inputText(set, c.id, i))); }
  write('lab/config/slots.json', JSON.stringify(REAL_SLOTS, null, 2) + '\n');
  writeContract({});
  const C1 = commit('C1: A0 (allocator v1)', T.c1);
  const a0 = { a0Commit: C1.commit, a0Label: C1.label, a0Binary: h(distListing(C1.files)) };
  write('packages/xtdb/src/alloc.ts', ALLOC_V2);
  writeContract(a0);
  const C2 = commit('C2: candidate (allocator v2); A0 registered', T.c2);
  const out = { dir, variant, C1, C2, a0Binary: a0.a0Binary };
  const branch = (name, edit, date = T.c3) => { git(['checkout', '-q', '-b', name]); edit(); out[name.toUpperCase()] = commit(name, date); git(['checkout', '-q', 'main']); };
  if (variant === 'null') branch('rogue', () => write('lab/acceptance/obligations.json', JSON.stringify(contractVariant('pinned', a0), null, 2) + '\n'));
  if (variant === 'pinned') branch('drift', () => write('lab/oracles/obs/obs.py', '# O-OBS (fixture), edited after the pin\n'));
  if (variant === 'pinned') branch('unverified', () => write('NOTES.md', 'a commit no verifier has seen\n'));
  if (variant === 'run') branch('wrong', () => write('packages/xtdb/src/alloc.ts', ALLOC_WRONG));
  // A reviewed later contract version on main (the authority) registers the verifications of C2 (and of the wrong candidate):
  // a commit's own contract can never hold its verification (RULINGS Q55a, Q61a).
  if (variant !== 'real') {
    writeContract({ ...a0, verified: [C2.commit, ...(out.WRONG ? [out.WRONG.commit] : [])] });
    out.C3 = commit('C3: contract registers verifications', T.c4);
  }
  // An authority (branch badreg) whose A0 entry records the candidate's binary for C1's tree (CX-R7-RELABELLED-CONTROL).
  if (variant === 'run') branch('badreg', () => writeContract({ ...a0, a0Binary: h(distListing(C2.files)), verified: [C2.commit] }), T.c4);
  return out;
}

// ---------------------------------------------------------------- object store and simulated documents

function store(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const put = value => {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    const digest = sha256(bytes);
    const file = path.join(dir, digest);
    if (!fs.existsSync(file)) fs.writeFileSync(file, bytes);
    return digest;
  };
  return { dir, put, corrupt: digest => { const f = path.join(dir, digest); fs.writeFileSync(f, Buffer.concat([fs.readFileSync(f), Buffer.from(' ')])); } };
}

/**
 * Simulate one run's document. o.at is the commit the code came from; o.tree the source label recorded (default the code's);
 * o.edit(receipt) mutates the receipt after its run (a relabelling attack: ledger and provenance keep the original binding).
 */
function run(S, o, homes) {
  const ob = OBL.get(o.obligation), at = o.at, id = o.id;
  const side = o.side ?? 'candidate';
  const code = side === 'A0' ? homes.a0 : at; // the code the run executed (A0 runs execute the registry's commit)
  const tree = o.tree ?? code.label;
  const r = {
    format: FORMATS.receipt, receiptId: id, runKind: o.runKind ?? 'acceptance', profile: o.profile ?? ob.profiles[0], role: o.role ?? 'prerequisite',
    obligation: ob.id, definitionSha256: ob.definitionSha256, sourceTreeSha256: tree, composition: structuredClone(o.composition), commit: o.commit ?? homes.claim.commit,
    producedAt: o.producedAt ?? RUN_AT, contract: o.contract ?? { version: REAL_CONTRACT.version, transitiveSha256: REAL_CONTRACT.transitiveContractSha256 },
    endpoint: { contacted: [o.endpoint ?? 'http://127.0.0.1:18123'], expected: [o.endpoint ?? 'http://127.0.0.1:18123'] }, admission: { reservationId: `res-${id}`, status: o.admission ?? 'ADMITTED' },
    producer: { tool: 'lab/bin/gate.mjs', agentId: 'agent-harness', ...(o.noAuthors ? {} : { authorsOfCodeUnderTest: ['agent-candidate-author'] }) },
    profileIdentity: { lockfileSha256: h(code.files['pnpm-lock.yaml']), node: 'v22.23.2', pnpm: '10.0.0' },
    modes: o.modes ?? ob.closure.modes, faultReps: o.faultReps ?? 3,
  };
  if (r.role !== 'prerequisite') r.workload = o.workload === undefined ? structuredClone(WORKLOAD) : o.workload;
  if (r.workload === null) delete r.workload;
  // The build manifest (build-manifest/1, exactly) and the lab's provenance record.
  const from = o.builtFrom ?? code;
  const pkgFiles = Object.keys(from.files).filter(f => f.startsWith('packages/xtdb/')).sort();
  const outputs = pkgFiles.filter(f => f.endsWith('.ts')).map(f => ({ path: f.replace('/src/', '/dist/').replace(/\.ts$/, '.mjs'), bytes: from.files[f] }));
  const harness = side === 'A0' ? 'lab/bin/ns.mjs' : 'lab/bin/position.mjs';
  const mods = [{ path: harness, bytes: homes.claim.files[harness], origin: 'harness' }, ...outputs.map(x => ({ ...x, origin: 'build', build: 'xtdb' })),
    { path: 'node_modules/effect/dist/index.js', bytes: 'effect', origin: 'dependency' }, ...(o.extraModules ?? [])]
    .map(x => ({ ...x, sha256: x.retain === false ? h(x.bytes) : S.put(x.bytes) }));
  const modules = mods.map(x => ({ path: x.path, sha256: x.sha256 }));
  // An A0-side run executes the evaluator's build of the code it was built from: the registry's binarySha256 when that is the
  // A0 commit, another binary when a candidate build is relabelled as A0 (Codex round 7 finding 2).
  const binary = o.binaryNotRetained ? h(`unretained ${id}`) : side === 'A0' ? S.put(distListing(from.files)) : S.put(listingHash(modules.map(x => [x.path, x.sha256])) + ` ${id}`);
  r.buildManifestSha256 = S.put({ schema: 'build-manifest/1', sourceTreeSha256: tree, binarySha256: binary, modules });
  r.executedBinarySha256 = binary;
  const build = { id: 'xtdb', package: 'packages/xtdb', sourceRoots: o.narrowRoots ? ['packages/xtdb/package.json'] : ['packages/xtdb'],
    inputs: (o.narrowRoots ? ['packages/xtdb/package.json'] : pkgFiles.filter(f => !(o.dropInput && f.endsWith('alloc.ts')))).map(f => ({ path: f, sha256: h(from.files[f]) })),
    outputs: outputs.map(x => ({ path: x.path, sha256: h(x.bytes) })) };
  // Case records (case-result/1, exactly): one per resolved case and select entry it covers.
  const resolved = ob.cases.flatMap(sel => sel.select.flatMap(t => { const m = caseManifest(sel.set); const hits = m.cases.filter(c => t === 'all' || c.id === t || c.tags.includes(t)); return ob.id === 'G7.position.coordinates' || !hits.length ? [{ id: t, selection: t }] : hits.map(c => ({ id: c.id, selection: t })); }));
  const caseResults = [];
  for (const c of [...resolved, ...(o.extraCases ?? [])]) {
    if ((o.omitCases ?? []).includes(c.id)) continue;
    const expected = S.put(`expected ${id} ${c.id}`);
    const observed = (o.wrong ?? []).includes(c.id) ? S.put(`wrong ${id} ${c.id}`) : expected;
    const refused = (o.refuse ?? []).includes(c.id);
    const rec = { schema: 'case-result/1', obligation: ob.id, case: c.id, selection: c.selection, oracle: c.oracle ?? (ob.oracles[0] ?? 'none'), oracleExit: refused ? 2 : 0, oracleCode: refused ? 'X-NOT-MODELED' : null, expectedSha256: expected, observedSha256: observed };
    caseResults.push({ case: c.id, selection: c.selection, verdict: (o.label ?? {})[c.id] ?? 'PASS', objectSha256: S.put(rec) });
    if ((o.failFirst ?? []).includes(c.id)) caseResults.push({ case: c.id, selection: c.selection, verdict: 'FAIL', objectSha256: S.put({ ...rec, observedSha256: S.put(`wrong ${id} ${c.id}`) }) });
  }
  r.caseResults = caseResults;
  r.verifierObjectSha256 = o.notAVerifierRecord ? S.put({ notAVerifierRecord: true }) : S.put({ schema: 'verifier-record/1', obligation: o.verifierFor ?? ob.id, definitionSha256: OBL.get(o.verifierFor ?? ob.id).definitionSha256, verifier: o.verifier ?? 'V-FIXTURE', verdict: 'ACCEPT' });
  r.counts = { declared: caseResults.length, executed: caseResults.length, skipped: o.skipped ?? 0, unsupported: 0, notImplemented: 0, unexpectedErrors: o.unexpectedErrors ?? 0 };
  const binding = bindingOf(r);
  r.profileIdentity.buildProvenanceSha256 = S.put({ schema: FORMATS.provenance, binding, manifestSha256: r.buildManifestSha256, origins: mods.map(x => ({ path: x.path, origin: x.origin, ...(x.build ? { build: x.build } : {}) })), builds: [build] });
  r.ledgerSha256 = S.put({ schema: FORMATS.ledger, binding, caseResults, counts: r.counts, modes: r.modes, faultReps: r.faultReps, objects: [...new Set([r.buildManifestSha256, binary, r.profileIdentity.buildProvenanceSha256, ...caseResults.map(x => x.objectSha256)])] });
  if (o.edit) o.edit(r);
  return r;
}

// ---------------------------------------------------------------- the fixtures

export function buildFixtures(root) {
  fs.mkdirSync(root, { recursive: true });
  const repos = Object.fromEntries(['real', 'null', 'noreg', 'pinned', 'w0', 'run'].map(v => [v, makeRepo(path.join(root, `repo-${v}`), v)]));
  const S = store(path.join(root, 'objects'));
  const fixtures = [];

  /** The complete positive document: prerequisites for the candidate and for the registry's A0, the claimed obligation's
   * measurement and its A0 control (both run at the claimed commit; A0 runs the registry's code), workload identity on both. */
  function complete(fx, { variant = 'pinned', at, obligation = 'NS.P2', kind = 'comparative', tweak = {}, candidate = CANDIDATE, a0 = A0, drop = [], refuseAll } = {}) {
    const R = repos[variant];
    at ??= R.C2;
    const homes = { claim: at, a0: R.C1 };
    const ob = OBL.get(obligation);
    const measured = ob.closure.rules.some(x => x === 'CR-NS' || x === 'CR-GS');
    const promo = kind === 'promotion';
    const mk = (key, o) => run(S, { at, ...o, ...(tweak[key] ?? {}), id: `${fx}:${key}` }, homes);
    const plan = [
      ['pos-cand', { obligation: 'G7.position.coordinates', composition: candidate }],
      ['id-cand', { obligation: 'G10.composition.identity-bound', composition: candidate }],
      ...(ob.oracles.includes('O-DOMAIN') ? [['w0-cand', { obligation: 'W0.coverage-floors', composition: candidate }]] : []),
      ['meas', { obligation, composition: candidate, role: 'measurement', runKind: promo ? 'acceptance' : 'candidate', profile: promo ? ob.profiles.at(-1) : measured ? 'P-SCREEN' : ob.profiles[0], refuse: refuseAll }],
      ['pos-a0', { obligation: 'G7.position.coordinates', composition: a0, side: 'A0' }],
      ['id-a0', { obligation: 'G10.composition.identity-bound', composition: a0, side: 'A0' }],
      ['ctrl', { obligation, composition: a0, side: 'A0', role: 'control', runKind: promo ? 'acceptance' : 'control', profile: promo ? ob.profiles.at(-1) : measured ? 'P-SCREEN' : ob.profiles[0], refuse: refuseAll }],
    ].filter(([k]) => !drop.includes(k));
    return { format: FORMATS.claim, claimId: fx, kind, obligations: [obligation], commit: at.commit, sourceTreeSha256: at.label, composition: structuredClone(candidate), receipts: plan.map(([k, o]) => mk(k, o)) };
  }
  const add = (id, source, expected, defect, variant, claim, { labOnly = false } = {}) => fixtures.push({ id, source, expected, defect, labOnly, repo: repos[variant].dir, claim });
  const rc = (claim, key) => claim.receipts.find(r => r.receiptId.endsWith(`:${key}`));
  const lab = { labOnly: true };
  const zero = '0'.repeat(64);
  const P = repos.pinned;

  // -- positives: the document passes every check, and is still only DIAGNOSTIC evidence (RULINGS Q55a)
  add('POSITIVE-NS-SCREENING', 'Q38b positive control (0.3.7 format)', 'QUALIFIED', 'none: NS.P2 screening comparison, prerequisites for both compositions, registry A0 control, workload identity', 'pinned', complete('POSITIVE-NS-SCREENING'));
  add('POSITIVE-GS-DOMAIN', 'Q38b domain positive control', 'QUALIFIED', 'none: GS.05 with W0 pinned and a W0.coverage-floors receipt', 'w0', complete('POSITIVE-GS-DOMAIN', { variant: 'w0', obligation: 'GS.05' }));
  add('POSITIVE-PROMOTION', 'promotion', 'QUALIFIED', 'none: promotion on P-NS acceptance receipts', 'pinned', complete('POSITIVE-PROMOTION', { kind: 'promotion' }));

  // -- the generator's self-check, in this format
  add('GEN-PREREQS-ONLY', 'Q42a "prerequisites but no measurement"', 'DIAGNOSTIC', 'only prerequisite receipts', 'pinned', complete('GEN-PREREQS-ONLY', { drop: ['meas', 'ctrl'] }));
  add('GEN-NULL-OREPLAY-PIN', 'Q37b, Q38b', 'DIAGNOSTIC', 'complete document while O-REPLAY\'s pin is null', 'null', complete('GEN-NULL-OREPLAY-PIN', { variant: 'null' }));
  add('GEN-SUPPLIED-NAMES', 'Q38b', 'DIAGNOSTIC', 'no receipts; positionCasesClosed and compositionBound supplied', 'pinned', { ...complete('GEN-SUPPLIED-NAMES'), receipts: [], positionCasesClosed: [...REAL_CONTRACT.positionRequiredCases], compositionBound: true });
  add('GEN-OTHER-TREE', 'Q38b, Q42a', 'DIAGNOSTIC', 'candidate position receipt labelled with C1\'s tree', 'pinned', complete('GEN-OTHER-TREE', { tweak: { 'pos-cand': { tree: P.C1.label } } }));
  add('GEN-MISSING-FALSIFIERS', 'Q38b', 'DIAGNOSTIC', 'candidate position receipt without the four falsifiers', 'pinned', complete('GEN-MISSING-FALSIFIERS', { tweak: { 'pos-cand': { omitCases: ['FX-NESTED-CUTS', 'FX-ABORT-GAP', 'FX-CRASH-APPEND-RESOLUTION', 'FX-RESUME-AT-ABORT-GAP'] } } }));
  { const c = composition('xtdb', 'qlever'); delete c.history.slot; add('GEN-COMPOSITION-UNBOUND', 'Q38b', 'DIAGNOSTIC', 'candidate history assignment has no slot', 'pinned', complete('GEN-COMPOSITION-UNBOUND', { candidate: c })); }
  add('GEN-W0-NULL', 'Q38b, Q48a', 'DIAGNOSTIC', 'GS.05 while the W0 pin is null', 'pinned', complete('GEN-W0-NULL', { obligation: 'GS.05' }));
  add('GEN-NO-W0-RECEIPT', 'Q38b', 'DIAGNOSTIC', 'GS.05 without the W0.coverage-floors receipt', 'w0', complete('GEN-NO-W0-RECEIPT', { variant: 'w0', obligation: 'GS.05', drop: ['w0-cand'] }));
  add('GEN-EXCLUDED', 'Q45a', 'DIAGNOSTIC', 'G1.decimal.channel-routing, excluded from O-REPLAY\'s pin', 'pinned', complete('GEN-EXCLUDED', { obligation: 'G1.decimal.channel-routing' }));
  add('GEN-REFUSED-SET', 'Q45b, Q56i', 'DIAGNOSTIC', 'G9.erasure.residual-shapes, whose Q52 shapes O-REPLAY 0.4.1 refuses', 'pinned', complete('GEN-REFUSED-SET', { obligation: 'G9.erasure.residual-shapes' }));
  add('GEN-STALE-DEFINITION', 'CX-STALE-DEFINITION', 'DIAGNOSTIC', 'the measurement names an older definition hash of NS.P2', 'pinned', complete('GEN-STALE-DEFINITION', { tweak: { meas: { edit: r => { r.definitionSha256 = 'a'.repeat(64); } } } }));
  add('CODEX-R4-FABRICATED', 'Codex round 4 finding 4', 'DIAGNOSTIC', 'all-zero case object hashes, built from C1 under C2\'s label', 'pinned',
    complete('CODEX-R4-FABRICATED', { tweak: { 'pos-cand': { builtFrom: P.C1, edit: r => { for (const x of r.caseResults) x.objectSha256 = zero; } } } }));
  add('Q42A-STALE-BINARY', 'Q42a (lab: provenance)', 'DIAGNOSTIC', 'the candidate position run executed a build of C1\'s alloc.ts under C2\'s label', 'pinned', complete('Q42A-STALE-BINARY', { tweak: { 'pos-cand': { builtFrom: P.C1 } } }), lab);
  add('Q42A-EARLIER-COMMIT', 'Q42a', 'DIAGNOSTIC', 'candidate position receipt from commit C1', 'pinned', complete('Q42A-EARLIER-COMMIT', { tweak: { 'pos-cand': { commit: P.C1.commit } } }));
  add('Q42A-BEFORE-CLOSURE', 'Q42a', 'DIAGNOSTIC', 'candidate position receipt produced before C2 existed', 'pinned', complete('Q42A-BEFORE-CLOSURE', { tweak: { 'pos-cand': { producedAt: BEFORE_C2 } } }));
  add('Q42A-OBJECT-CORRUPT', 'Q42a', 'DIAGNOSTIC', 'one stored case record no longer hashes to its name', 'pinned', (() => { const c = complete('Q42A-OBJECT-CORRUPT'); S.corrupt(rc(c, 'pos-cand').caseResults[0].objectSha256); return c; })());
  add('Q42A-OBJECT-OF-OTHER-CASE', 'Q47a', 'DIAGNOSTIC', 'FX-ABORT-GAP points at FX-NESTED-CUTS\'s record', 'pinned',
    complete('Q42A-OBJECT-OF-OTHER-CASE', { tweak: { 'pos-cand': { edit: r => { r.caseResults.find(x => x.case === 'FX-ABORT-GAP').objectSha256 = r.caseResults.find(x => x.case === 'FX-NESTED-CUTS').objectSha256; } } } }));
  add('Q42A-MODES-SHORT', 'Q42a', 'DIAGNOSTIC', 'candidate position receipt lists mode current only', 'pinned', complete('Q42A-MODES-SHORT', { tweak: { 'pos-cand': { modes: ['current'] } } }));
  add('Q42A-FAULT-REPS-SHORT', 'Q42a', 'DIAGNOSTIC', 'faultReps 2', 'pinned', complete('Q42A-FAULT-REPS-SHORT', { tweak: { 'pos-cand': { faultReps: 2 } } }));
  add('Q42A-UNKNOWN-ID', 'Q42a', 'DIAGNOSTIC', 'obligations [NS.P2, NS.P9]', 'pinned', { ...complete('Q42A-UNKNOWN-ID'), obligations: ['NS.P2', 'NS.P9'] });
  add('Q42A-NO-CONTROL', 'Q42a', 'DIAGNOSTIC', 'no control receipt', 'pinned', complete('Q42A-NO-CONTROL', { drop: ['ctrl'] }));
  add('Q42A-CONTROL-OTHER-SEED', 'Q47b', 'DIAGNOSTIC', 'the control ran seed 7', 'pinned', complete('Q42A-CONTROL-OTHER-SEED', { tweak: { ctrl: { workload: { ...WORKLOAD, seed: 7 } } } }));
  add('Q42A-CONTROL-OTHER-WINDOW', 'Q47b', 'DIAGNOSTIC', 'the control measured window [0, 300]', 'pinned', complete('Q42A-CONTROL-OTHER-WINDOW', { tweak: { ctrl: { workload: { ...WORKLOAD, window: [0, 300] } } } }));
  add('Q42A-CORRECTNESS-FAIL', 'Q47a', 'DIAGNOSTIC', 'NS-P2-PROGRESS observed differs from expected, labelled FAIL', 'pinned', complete('Q42A-CORRECTNESS-FAIL', { tweak: { meas: { wrong: ['NS-P2-PROGRESS'], label: { 'NS-P2-PROGRESS': 'FAIL' } } } }));
  add('Q42A-NO-VERIFIER', 'Q47a', 'DIAGNOSTIC', 'the measurement\'s verifier record is for another obligation', 'pinned', complete('Q42A-NO-VERIFIER', { tweak: { meas: { verifierFor: 'G10.composition.identity-bound' } } }));
  add('CODEX-R6-MODULES-NOT-RETAINED', 'Codex round 6 finding 1 / Q47a', 'DIAGNOSTIC', 'an executed module is listed but its bytes were never retained', 'pinned',
    complete('CODEX-R6-MODULES-NOT-RETAINED', { tweak: { 'pos-cand': { extraModules: [{ path: 'node_modules/fixture-dep/index.js', bytes: 'never stored', origin: 'dependency', retain: false }] } } }));
  add('CODEX-R6-BINARY-NOT-RETAINED', 'Q47a', 'DIAGNOSTIC', 'the executed binary is not retained', 'pinned', complete('CODEX-R6-BINARY-NOT-RETAINED', { tweak: { 'pos-cand': { binaryNotRetained: true } } }));
  add('CODEX-R6-NOT-A-VERIFIER-RECORD', 'Codex round 6 finding 1 / Q47a', 'DIAGNOSTIC', 'the verifier object is {"notAVerifierRecord":true}', 'pinned', complete('CODEX-R6-NOT-A-VERIFIER-RECORD', { tweak: { 'pos-cand': { notAVerifierRecord: true } } }));
  add('CODEX-R6-REFUSAL-LABELLED-PASS', 'Codex round 6 finding 1 / Q47a', 'DIAGNOSTIC', 'NS-P2-PROGRESS oracleExit 2 with X-NOT-MODELED, labelled PASS', 'pinned', complete('CODEX-R6-REFUSAL-LABELLED-PASS', { tweak: { meas: { refuse: ['NS-P2-PROGRESS'] } } }));
  add('Q47A-WRONG-LABELLED-PASS', 'Q47a', 'DIAGNOSTIC', 'NS-P2-PROGRESS observed differs from expected, labelled PASS', 'pinned', complete('Q47A-WRONG-LABELLED-PASS', { tweak: { meas: { wrong: ['NS-P2-PROGRESS'] } } }));
  add('CODEX-R6-CONTROL-NO-WORKLOAD', 'Codex round 6 finding 5 / Q47b', 'DIAGNOSTIC', 'measurement and control without workload identity', 'pinned', complete('CODEX-R6-CONTROL-NO-WORKLOAD', { tweak: { meas: { workload: null }, ctrl: { workload: null } } }));
  { const lookalike = composition('xtdb', 'qlever'); lookalike.analytics.configSha256 = h('a different config');
    add('CODEX-R6-CANDIDATE-SELECTED-CONTROL', 'Codex round 6 finding 5 / Q47b', 'DIAGNOSTIC', 'the control is a composition the claimant picked, not the registry\'s A0', 'pinned', complete('CODEX-R6-CANDIDATE-SELECTED-CONTROL', { a0: lookalike })); }
  add('CODEX-R6-NO-A0-REGISTRY', 'Q46b, Q47b', 'DIAGNOSTIC', 'the contract registers no A0', 'noreg', complete('CODEX-R6-NO-A0-REGISTRY', { variant: 'noreg' }));
  add('CODEX-R6-MIGRATION-INDIRECT-REFUSAL', 'Codex round 6 finding 6 / Q47c', 'DIAGNOSTIC', 'G7.migration.schema-evolution with MIG-DECIMAL-5-2-TO-6-3 retained as a refusal labelled PASS', 'pinned',
    complete('CODEX-R6-MIGRATION-INDIRECT-REFUSAL', { obligation: 'G7.migration.schema-evolution', refuseAll: ['MIG-DECIMAL-5-2-TO-6-3'] }));
  add('Q47C-MANIFESTS-UNPINNED', 'Q47c, ACCEPTANCE 5.3', 'DIAGNOSTIC', 'contract 0.3.7 as compiled (A0 registry null, manifests unpinned, O-OBS to build)', 'real', complete('Q47C-MANIFESTS-UNPINNED', { variant: 'real' }));
  // -- Codex round 7 (Q55a): well-formed invented evidence, and a candidate binary labelled as A0
  add('CODEX-R7-INVENTED-CASES', 'Codex round 7 finding 1 / Q55a', 'DIAGNOSTIC', 'invented case ids, each with selection "all"-style cover of every select entry, oracleExit 0 and identical expected/observed objects', 'pinned',
    complete('CODEX-R7-INVENTED-CASES', { tweak: { ...Object.fromEntries(['pos-cand', 'id-cand', 'meas', 'pos-a0', 'id-a0', 'ctrl'].map(k => [k, { omitCases: [...new Set(MANIFEST_SETS.flatMap(s => caseManifest(s).cases.map(c => c.id)).concat(REAL_CONTRACT.positionRequiredCases))], extraCases: inventedFor(k) }])) } }), lab);
  add('CODEX-R7-CANDIDATE-AS-A0', 'Codex round 7 finding 2 / Q55a', 'DIAGNOSTIC', 'the control receipt runs the candidate\'s build (C2) under the A0 registry\'s tree label', 'pinned', complete('CODEX-R7-CANDIDATE-AS-A0', { tweak: { ctrl: { builtFrom: P.C2 } } }), lab);

  // -- lab-only checks (Q41d): run ledger, provenance, profiles, VA rules
  add('RT-SWAP-ROLES', 'red-team pass 1 A1', 'DIAGNOSTIC', 'measurement and control role fields swapped after the runs', 'pinned', (() => { const c = complete('RT-SWAP-ROLES'); rc(c, 'meas').role = 'control'; rc(c, 'ctrl').role = 'measurement'; return c; })());
  add('RT-RELABEL-PROFILE', 'red-team pass 1 A4', 'DIAGNOSTIC', 'a P-SCREEN prerequisite relabelled P-FAULT after its run', 'pinned', complete('RT-RELABEL-PROFILE', { tweak: { 'pos-cand': { profile: 'P-SCREEN', edit: r => { r.profile = 'P-FAULT'; } } } }), lab);
  add('RT-SCREENING-PREREQ', 'VA16, Q34d', 'DIAGNOSTIC', 'the candidate position receipt is a P-SCREEN run', 'pinned', complete('RT-SCREENING-PREREQ', { tweak: { 'pos-cand': { profile: 'P-SCREEN' } } }), lab);
  add('RT-RUNKIND-SWAP', 'red-team pass 2 finding 8', 'DIAGNOSTIC', 'measurement run kind control, control run kind candidate', 'pinned', complete('RT-RUNKIND-SWAP', { tweak: { meas: { runKind: 'control' }, ctrl: { runKind: 'candidate' } } }), lab);
  add('RT-CONTROL-OTHER-PROFILE', 'red-team pass 2 finding 6', 'DIAGNOSTIC', 'P-SCREEN measurement against a P-NS control', 'pinned', complete('RT-CONTROL-OTHER-PROFILE', { tweak: { ctrl: { profile: 'P-NS' } } }), lab);
  { const c = composition('xtdb', 'qlever'); c.history.slot = ['dev']; add('RT-SLOT-ARRAY', 'red-team pass 1 A2b', 'DIAGNOSTIC', 'candidate history slot is the array ["dev"]', 'pinned', complete('RT-SLOT-ARRAY', { candidate: c }), lab); }
  add('RT-VERIFIER-IS-AUTHOR', 'VV1', 'DIAGNOSTIC', 'the verifier named in the record is the author (other case)', 'pinned', complete('RT-VERIFIER-IS-AUTHOR', { tweak: { meas: { verifier: 'Agent-Candidate-Author' } } }), lab);
  add('RT-DROP-FAIL-ATTEMPT', 'red-team pass 2 finding 2 (B11)', 'DIAGNOSTIC', 'a FAIL attempt the run recorded is deleted from the receipt', 'pinned',
    complete('RT-DROP-FAIL-ATTEMPT', { tweak: { meas: { failFirst: ['NS-P2-PROGRESS'], edit: r => { r.caseResults = r.caseResults.filter(x => x.verdict !== 'FAIL'); r.counts.executed = r.counts.declared = r.caseResults.length; } } } }), lab);
  add('RT-COUNTS-EDITED', 'red-team pass 2 finding 3', 'DIAGNOSTIC', 'unexpectedErrors 2 edited to 0 after the run', 'pinned', complete('RT-COUNTS-EDITED', { tweak: { meas: { unexpectedErrors: 2, edit: r => { r.counts.unexpectedErrors = 0; } } } }), lab);
  add('RT-CONTRACT-RELABEL', 'red-team pass 2 finding 4', 'DIAGNOSTIC', 'a run under contract 0.3.5 relabelled 0.3.7', 'pinned',
    complete('RT-CONTRACT-RELABEL', { tweak: { meas: { contract: { version: '0.3.5', transitiveSha256: 'a'.repeat(64) }, edit: r => { r.contract = { version: REAL_CONTRACT.version, transitiveSha256: REAL_CONTRACT.transitiveContractSha256 }; } } } }), lab);
  add('RT-FAULTREPS-RELABEL', 'Q42a (ledger)', 'DIAGNOSTIC', 'faultReps 2 edited to 3 after the run', 'pinned', complete('RT-FAULTREPS-RELABEL', { tweak: { 'pos-cand': { faultReps: 2, edit: r => { r.faultReps = 3; } } } }), lab);
  const dep = p => ({ tweak: { 'pos-cand': { extraModules: [{ path: p, bytes: SRC['packages/xtdb/src/alloc.ts'], origin: 'dependency' }] } } });
  add('RT-DEP-UPPERCASE', 'red-team pass 2 finding 1', 'DIAGNOSTIC', 'stale first-party build as node_modules/@FIXTURE/xtdb', 'pinned', complete('RT-DEP-UPPERCASE', dep('node_modules/@FIXTURE/xtdb/dist/alloc.mjs')), lab);
  add('RT-DEP-UNLISTED', 'red-team pass 2 finding 1', 'DIAGNOSTIC', 'stale code as an unlisted package node_modules/xtdb-alloc-v1', 'pinned', complete('RT-DEP-UNLISTED', dep('node_modules/xtdb-alloc-v1/index.js')), lab);
  add('RT-DEP-OTHER-WORKSPACE', 'red-team pass 2 finding 1', 'DIAGNOSTIC', 'first-party test/helper executed from node_modules', 'pinned', complete('RT-DEP-OTHER-WORKSPACE', dep('node_modules/@fixture/helper/index.js')), lab);
  add('RT-NARROW-ROOTS', 'red-team pass 1', 'DIAGNOSTIC', 'a build declaring only package.json as its root, hiding a stale alloc.ts', 'pinned', complete('RT-NARROW-ROOTS', { tweak: { 'pos-cand': { builtFrom: P.C1, narrowRoots: true } } }), lab);
  add('LAB-BRANCH-PINS-OWN-ORACLE', 'VA6', 'DIAGNOSTIC', 'a branch commit whose obligations.json pins O-REPLAY; the authority (main) has it null, and only the authority counts (Q61a)', 'null', complete('LAB-BRANCH-PINS-OWN-ORACLE', { variant: 'null', at: repos.null.ROGUE }), lab);
  add('LAB-ORACLE-FILE-DRIFT', 'VA6', 'DIAGNOSTIC', 'O-OBS edited after its pin', 'pinned', complete('LAB-ORACLE-FILE-DRIFT', { at: P.DRIFT }), lab);
  { const c = composition('xtdb', 'qlever'); c.current.imageDigest = 'sha256:' + 'e'.repeat(64); add('LAB-IMAGE-NOT-PINNED', 'VA4', 'DIAGNOSTIC', 'an unpinned QLever image', 'pinned', complete('LAB-IMAGE-NOT-PINNED', { candidate: c }), lab); }
  add('LAB-FORBIDDEN-ENDPOINT', 'VA5', 'DIAGNOSTIC', 'contacted http://127.0.0.1:015442', 'pinned', complete('LAB-FORBIDDEN-ENDPOINT', { tweak: { 'pos-cand': { endpoint: 'http://127.0.0.1:015442' } } }), lab);
  add('LAB-ADMISSION-BLOCKED', 'VA10', 'DIAGNOSTIC', 'BLOCKED_CAPACITY', 'pinned', complete('LAB-ADMISSION-BLOCKED', { tweak: { 'pos-cand': { admission: 'BLOCKED_CAPACITY' } } }), lab);
  add('LAB-CONTROL-NO-PREREQ', 'GATE-POSITION "A0 included"', 'DIAGNOSTIC', 'the A0 composition has no position receipt', 'pinned', complete('LAB-CONTROL-NO-PREREQ', { drop: ['pos-a0'] }), lab);
  // -- contract 0.3.8 fields in documents
  { const c = composition('xtdb', 'qlever', 'dev', null); add('DOC-NO-SOURCE-VARIANT', 'Q55b composition_ok', 'DIAGNOSTIC', 'the source assignment declares no protocol variant', 'pinned', complete('DOC-NO-SOURCE-VARIANT', { candidate: c })); }
  add('DOC-UNREGISTERED-VERIFICATION', 'Q55a VERIFIER_REGISTRY', 'DIAGNOSTIC', 'a complete document set at a commit no VERIFIER_REGISTRY entry accepts; its own verifier records count for nothing', 'pinned', complete('DOC-UNREGISTERED-VERIFICATION', { at: P.UNVERIFIED }));

  // -- qualification runs (RULINGS Q55a): what the evaluator builds, resolves and runs itself
  const Rr = repos.run;
  const runClaim = (id, at, obligations = ['NS.P2'], extra = {}) => ({ id, repo: Rr.dir, claim: { format: FORMATS.claim, claimId: id, kind: 'comparative', obligations, commit: at.commit, sourceTreeSha256: at.label, composition: structuredClone(CANDIDATE), ...extra } });
  // Codex round 7 against a run: the wrong candidate carries a complete set of well-formed documents claiming every case passed,
  // plus a selection, a verifier record and an O-DOMAIN fingerprint of its own (Q55a, Q55e). qualify must read none of it.
  const forged = runClaim('RUN-FORGED-RECORDS', Rr.WRONG, ['NS.P2'], { receipts: complete('RUN-FORGED-RECORDS', { variant: 'run', at: Rr.WRONG }).receipts, selection: 'all', caseList: ['INVENTED-0'], oDomainFingerprint: 'f'.repeat(64) });
  const runFixtures = [
    runClaim('RUN-CANDIDATE', Rr.C2),
    runClaim('RUN-WRONG-CANDIDATE', Rr.WRONG),
    forged,
    runClaim('RUN-REFUSED-CASE', Rr.C2, ['G7.migration.schema-evolution']),
    runClaim('RUN-UNREGISTERED-VERIFICATION', Rr.C1),
    runClaim('RUN-UNREGISTERED-SLOT', Rr.C2, ['NS.P2'], { composition: composition('xtdb', 'qlever', 's9') }),
    runClaim('RUN-SUPPLIED-FINGERPRINT', Rr.C2, ['GS.05'], { oDomainFingerprint: 'f'.repeat(64), w0Pin: contractVariant('w0').w0Pin }),
    // CX-R7-RELABELLED-CONTROL as a run: an authority whose A0 entry records the candidate's binary; the rebuild of C1 differs.
    { ...runClaim('RUN-A0-REBUILD-MISMATCH', Rr.C2), authorityRef: 'badreg' },
  ];
  return { root, repos, objects: S.dir, fixtures, runFixtures };

  // Codex round 7: a few invented case ids, each claiming to cover one of the obligation's select entries.
  function inventedFor(key) {
    const ob = OBL.get({ 'pos-cand': 'G7.position.coordinates', 'pos-a0': 'G7.position.coordinates', 'id-cand': 'G10.composition.identity-bound', 'id-a0': 'G10.composition.identity-bound', meas: 'NS.P2', ctrl: 'NS.P2' }[key]);
    const need = ob.id === 'G7.position.coordinates' ? REAL_CONTRACT.positionRequiredCases : ob.cases.flatMap(c => c.select);
    return need.map((t, i) => ({ id: `INVENTED-${i}`, selection: t }));
  }
}

// ---------------------------------------------------------------- run the implementations

const gitSources = new Map();
export function evaluateLab(fx, objectsDir) {
  if (!gitSources.has(fx.repo)) gitSources.set(fx.repo, gitSource(fx.repo));
  return admitClaim(fx.claim, { git: gitSources.get(fx.repo), objects: objectStore(objectsDir), authorityRef: 'main' });
}

/** The contract's admit_claim on every document fixture, and the contract's own admission fixtures (claim_ref.py). */
export function evaluateReference(built) {
  const input = path.join(built.root, 'reference-input.json');
  fs.writeFileSync(input, JSON.stringify({ objects: built.objects, fixtures: built.fixtures.map(f => ({ id: f.id, repo: f.repo, claim: f.claim })) }));
  const r = spawnSync('python3', ['-I', '-B', path.join(import.meta.dirname, 'claim_ref.py'), input], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`claim_ref.py failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const keep = process.argv.indexOf('--keep');
  const root = keep > 0 ? path.resolve(process.argv[keep + 1]) : fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-claim-fixtures-'));
  const built = buildFixtures(root);
  const ref = evaluateReference(built);
  // The contract's admit_claim (0.3.8) judges no document (ev None: DIAGNOSTIC), and so does claim.mjs admit; documentVerdict is
  // what the lab's document checks find, the expected column its expected value.
  console.log('| Fixture | Source | Defect | Contract admit_claim 0.3.8 | Lab admit verdict | Expected documentVerdict | Lab documentVerdict | Lab reasons (besides DOCUMENT-ONLY) |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const f of built.fixtures) {
    const lab = evaluateLab(f, built.objects);
    const codes = [...new Set(lab.reasons.map(r => r.code))].filter(c => c !== 'DOCUMENT-ONLY').join(', ');
    console.log(`| ${f.id} | ${f.source} | ${f.defect} | ${ref.documents[f.id].verdict} | ${lab.verdict} | ${f.expected} | ${lab.documentVerdict} | ${codes} |`);
  }
  if (keep < 0) fs.rmSync(root, { recursive: true, force: true });
}
