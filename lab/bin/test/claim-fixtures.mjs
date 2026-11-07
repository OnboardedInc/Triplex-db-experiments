// One fixture set for claim admission, judged by two implementations (EXP-E01; Q42a "Counterexample fixtures"; Q47a to Q47c
// "add each of Codex's counterexamples as a fixture"; Q41d: the generator's admit_claim is the reference model and
// lab/bin/claim.mjs implements it as a minimum).
//
// buildFixtures(root) writes small git repositories and one content-addressed object store under root and returns every
// fixture: a claim plus the expected verdict. Each fixture is a complete positive claim with exactly one named defect, so a
// DIAGNOSTIC can only come from that defect. Runs are simulated the way the harness must write them: the run binding is
// computed when the run starts and written into every object the run produces.
//
//   node lab/bin/test/claim-fixtures.mjs [--keep DIR]   prints the fixture table (expected, proposed reference, lab) as Markdown
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
const T = { c1: '2026-11-07T12:00:00Z', c2: '2026-11-07T13:00:00Z', c3: '2026-11-07T13:30:00Z', run: '2026-11-07T14:00:00Z', end: '2026-11-07T14:20:00Z', beforeC2: '2026-11-07T12:30:00Z' };
const h = text => sha256(Buffer.from(text));
const REGISTRY_PATH = 'lab/config/a0-registry.json';

// ---------------------------------------------------------------- source files of the fixture repositories

const SRC = {
  'packages/xtdb/package.json': '{ "name": "@fixture/xtdb", "version": "0.0.0" }\n',
  'packages/xtdb/src/index.ts': "export { nextCommitPosition } from './alloc.js';\n",
  'packages/xtdb/src/alloc.ts': 'export const nextCommitPosition = (p: number) => p + 1; // v1 (A0)\n',
  'lab/bin/position.mjs': '// position falsifier driver (fixture)\n',
  'lab/bin/ns.mjs': '// north-star driver (fixture)\n',
  'lab/bin/verify.mjs': '// verifier (fixture)\n',
  'lab/bench/trace.mjs': '// frozen writer-trace generator (fixture)\n',
  'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
  'lab/oracles/replay/replay.py': '# O-REPLAY (fixture)\n',
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
const ALLOC_V2 = 'export const nextCommitPosition = (p: number) => p + 1; // v2 candidate: nested transacts share one offset\n';

// ---------------------------------------------------------------- pinned case manifests (Q47c)

const EXTRA_CASES = { 'CS-GS': ['GS-05-SCENARIO'], 'CS-MIGRATION': ['MIG-ADD-ATTRIBUTE', 'MIG-DECIMAL-5-2-TO-6-3'] };
const tagsFor = (set, id) => set === 'CS-POSITION' ? (id.startsWith('FX-') ? ['falsifiers'] : id === 'PO-NESTED-CUTS-DENSE' ? ['ordering', 'dense'] : ['ordering'])
  : set === 'CS-COMPOSITION' ? (['CO-RECEIPT-BINDS-ALL', 'CO-SCOPE-KEY-FROM-ASSIGNMENT'].includes(id) ? ['identity'] : ['watermark'])
    : set === 'CS-NS' ? [`p${id[4]}`] : set === 'CS-GS' ? [id.slice(0, 5)] : set === 'CS-MIGRATION' ? ['valid-writes'] : [];
export const MANIFEST_SETS = ['CS-POSITION', 'CS-COMPOSITION', 'CS-W0-COVERAGE', 'CS-NS', 'CS-GS', 'CS-MIGRATION'];
export function caseManifest(set) {
  const ids = [...REAL_CONTRACT.caseSets[set].requiredCases, ...(EXTRA_CASES[set] ?? [])];
  return { format: FORMATS.caseManifest, set, cases: ids.map(id => ({ id, tags: tagsFor(set, id), contentSha256: h(`case ${set}/${id}`), comparator: set === 'CS-POSITION' ? 'CMP-ORDERED-ROWS' : 'CMP-EXACT-VALUE', ...(id === 'FX-CRASH-APPEND-RESOLUTION' ? { faultPoint: true } : {}) })) };
}
const manifestText = set => JSON.stringify(caseManifest(set), null, 2) + '\n';

function contractVariant(variant, registrySha) {
  const c = structuredClone(REAL_CONTRACT);
  if (variant === 'real') return c; // contract 0.3.6 exactly as compiled on main
  const filePin = (dir, file) => ({ files: `${dir}/`, sha256: { [file]: h(SRC[file]) }, acceptReceipt: 'FIXTURE-ACCEPT', acceptedAfter: 'fixture', rule: 'fixture pin' });
  c.oraclePins['O-REPLAY'] = { ...c.oraclePins['O-REPLAY'], sha256: listingHash([['lab/oracles/replay/replay.py', h(SRC['lab/oracles/replay/replay.py'])]]), acceptReceipt: variant === 'null' ? null : 'FIXTURE-V-O03' };
  if (variant === 'null') c.oraclePins['O-REPLAY'].sha256 = null;
  c.oraclePins['O-OBS'] = filePin('lab/oracles/obs', 'lab/oracles/obs/obs.py');
  c.oraclePins['O-DOMAIN'] = filePin('lab/oracles/domain', 'lab/oracles/domain/domain.py');
  c.oraclePins['O-HAND'] = filePin('lab/oracles/hand', 'lab/oracles/hand/hand.json');
  for (const set of MANIFEST_SETS) c.caseSets[set] = { ...c.caseSets[set], manifestSha256: h(manifestText(set)) };
  // Proposed field (question to the orchestrator): the frozen A0 registry the contract pins (Q46b, Q47b).
  if (registrySha && variant !== 'noreg') c.a0Registry = { path: REGISTRY_PATH, sha256: registrySha };
  if (variant === 'w0') {
    const w = f => h(SRC[f]);
    c.w0Pin = { ...c.w0Pin, reviewReceipt: 'FIXTURE-V-D01', deltaCheck: 'FIXTURE-DELTA', oDomainFingerprint: 'f'.repeat(64), files: {
      'lab/world/W0/SPEC.md': w('lab/world/W0/SPEC.md'), 'lab/world/W0/releases/R1.json': w('lab/world/W0/releases/R1.json'), 'lab/world/W0/releases/R2.json': w('lab/world/W0/releases/R2.json'),
      'lab/world/W0/releases/R3.json': w('lab/world/W0/releases/R3.json'), 'lab/world/W0/schema.json': w('lab/world/W0/schema.json'),
      'lab/world/W0/cases/': listingHash([['lab/world/W0/cases/c1.json', w('lab/world/W0/cases/c1.json')]]) } };
  }
  return c;
}
function loadVariant(variant) {
  // Proposed field (question to the orchestrator): load-contract.json pins no frozen generator, seed or offer schedule yet.
  const l = structuredClone(REAL_LOAD);
  if (variant !== 'real') l.writerTrace.generator.frozen = { path: 'lab/bench/trace.mjs', sha256: h(SRC['lab/bench/trace.mjs']), seed: SEED, offerScheduleSha256: h(`schedule ${SEED}`) };
  return l;
}

export const composition = (sourceEngine, currentEngine, slot = 'dev') => {
  const a = engine => ({ engine, imageDigest: REAL_SLOTS.lanes[engine].imageId, configSha256: h(`config ${engine}`), slot });
  return { source: a(sourceEngine), current: a(currentEngine), history: a(sourceEngine), analytics: a(sourceEngine) };
};
export const CANDIDATE = composition('xtdb', 'qlever');
export const A0 = composition('xtdb', 'xtdb');

function makeRepo(dir, variant) {
  fs.mkdirSync(dir, { recursive: true });
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const git = (args, date) => execFileSync('git', ['-c', 'user.name=lab fixture', '-c', 'user.email=fixture@lab.invalid', '-c', 'commit.gpgsign=false', ...args],
    { cwd: dir, env: date ? { ...env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : env, encoding: 'utf8' }).trim();
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), text); };
  const snapshot = () => Object.fromEntries(git(['ls-files']).split('\n').filter(Boolean).map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
  const commit = (message, date) => { git(['add', '-A']); git(['commit', '-q', '-m', message], date); const tree = git(['rev-parse', 'HEAD^{tree}']); return { commit: git(['rev-parse', 'HEAD']), tree, label: sourceTreeIdOf(tree), date, files: snapshot() }; };
  const writeContract = registrySha => {
    write('lab/acceptance/obligations.json', JSON.stringify(contractVariant(variant, registrySha), null, 2) + '\n');
    write('lab/acceptance/load-contract.json', JSON.stringify(loadVariant(variant), null, 2) + '\n');
  };
  git(['init', '-q', '-b', 'main']);
  for (const [f, t] of Object.entries(SRC)) write(f, t);
  for (const set of MANIFEST_SETS) write(`lab/acceptance/cases/${set}.json`, manifestText(set));
  write('lab/config/slots.json', JSON.stringify(REAL_SLOTS, null, 2) + '\n');
  writeContract(null);
  const C1 = commit('C1: A0 (allocator v1)', T.c1);
  // The frozen A0 registry names C1; the contract at C2 pins the registry file.
  const registry = JSON.stringify({ format: FORMATS.a0Registry, controls: { 'A0-XTDB': { commit: C1.commit, tree: C1.tree, composition: A0 } } }, null, 2) + '\n';
  write(REGISTRY_PATH, registry);
  write('packages/xtdb/src/alloc.ts', ALLOC_V2);
  writeContract(h(registry));
  const C2 = commit('C2: candidate (allocator v2), A0 registry pinned', T.c2);
  const out = { dir, variant, C1, C2 };
  const branch = (name, edit) => { git(['checkout', '-q', '-b', name]); edit(); out[name.toUpperCase()] = commit(name, T.c3); git(['checkout', '-q', 'main']); };
  if (variant === 'null') branch('rogue', () => write('lab/acceptance/obligations.json', JSON.stringify(contractVariant('pinned', h(registry)), null, 2) + '\n'));
  if (variant === 'pinned') branch('drift', () => write('lab/oracles/obs/obs.py', '# O-OBS (fixture), edited after the pin\n'));
  return out;
}

// ---------------------------------------------------------------- object store and simulated runs

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

const answer = (comparator, caseId) => comparator === 'CMP-ORDERED-ROWS' ? JSON.stringify([{ case: caseId, ordinal: 1 }, { case: caseId, ordinal: 2 }]) : JSON.stringify({ t: 'text', v: `ok ${caseId}` });

/**
 * Simulate one run and return its receipt. o.at is the commit the run really happened at; o.label the source label it
 * claims; o.edit(receipt) mutates the receipt after the run (a relabelling attack: the objects keep the original binding).
 */
function run(S, o) {
  const ob = OBL.get(o.obligation), at = o.at, id = o.id;
  const verifier = !!o.verifies;
  const entry = verifier ? 'lab/bin/verify.mjs' : o.ns ? 'lab/bin/ns.mjs' : 'lab/bin/position.mjs';
  const modes = o.modes ?? ob.closure.modes;
  const r = {
    format: FORMATS.receipt, receiptId: id, runKind: o.runKind ?? 'acceptance', profile: o.profile ?? ob.profiles[0],
    contract: { version: REAL_CONTRACT.version, transitiveSha256: REAL_CONTRACT.transitiveContractSha256 },
    obligations: [{ id: ob.id, definitionSha256: ob.definitionSha256 }],
    composition: structuredClone(o.composition), git: { commit: at.commit, tree: at.tree },
    profileIdentity: { sourceTreeSha256: (o.label ?? at).label, lockfileSha256: h(at.files['pnpm-lock.yaml']), node: 'v22.23.2', pnpm: '10.0.0' },
    endpoint: { contacted: [o.endpoint ?? 'http://127.0.0.1:18123'], expected: [o.endpoint ?? 'http://127.0.0.1:18123'] },
    admission: { reservationId: `res-${id}`, status: o.admission ?? 'ADMITTED' }, coRunners: [], timing: { start: o.start ?? T.run, end: T.end },
    producer: { tool: 'lab/bin/gate.mjs', agentRole: verifier ? 'verifier' : 'coding', agentId: o.agentId ?? (verifier ? 'agent-verifier' : 'agent-harness'), ...(o.noAuthors ? {} : { authorsOfCodeUnderTest: ['agent-candidate-author'] }) },
  };
  const binding = bindingOf(r);
  const evidence = [];
  const resolved = ob.cases.flatMap(sel => { const m = caseManifest(sel.set); return m.cases.filter(c => sel.select.some(t => t === 'all' || t === c.id || c.tags.includes(t))).map(c => ({ set: sel.set, ...c })); })
    .filter((c, i, all) => all.findIndex(x => x.set === c.set && x.id === c.id) === i);
  if (!verifier) for (const c of resolved) {
    if ((o.omitCases ?? []).includes(c.id)) continue;
    S.put(`case ${c.set}/${c.id}`);
    for (const mode of modes) {
      const refused = (o.refuse ?? []).includes(c.id);
      const expected = S.put(answer(c.comparator, c.id));
      const observed = (o.wrong ?? {})[c.id] ? S.put(JSON.stringify({ t: 'text', v: `wrong ${c.id}` })) : expected;
      const verdict = (o.wrong ?? {})[c.id] ?? 'PASS';
      const oracleRun = S.put({ format: FORMATS.oracleRun, binding, oracleId: ob.oracles[0], caseSet: c.set, caseId: c.id, caseSha256: c.contentSha256, exit: refused ? 2 : 0, refusal: refused ? 'X-NOT-MODELED' : null, expectedObject: expected });
      const obj = S.put({ format: FORMATS.caseResult, binding, caseSet: c.set, caseId: c.id, caseSha256: c.contentSha256, mode, verdict, comparator: c.comparator, rawResultObject: observed, oracleRunObject: oracleRun });
      evidence.push({ kind: 'case-result', caseSet: c.set, caseId: c.id, mode, verdict, objectSha256: obj });
    }
    if (c.faultPoint) {
      const n = o.faultReps ?? 3;
      const injections = Array.from({ length: n }, (_, i) => ({ t: i, durableEvidenceObject: S.put(`durable ${id} ${o.repeatInjection ? 0 : i}`) }));
      evidence.push({ kind: 'fault-witness', objectSha256: S.put({ format: FORMATS.faultWitness, binding, caseSet: c.set, caseId: c.id, injections }) });
    }
  }
  if (o.ns) {
    const seed = o.ns.seed ?? SEED;
    const trace = o.ns.noWorkload ? undefined : { generatorPath: 'lab/bench/trace.mjs', generatorSourceSha256: h(SRC['lab/bench/trace.mjs']), seed, offerScheduleSha256: S.put(`schedule ${seed}`) };
    const windows = o.ns.noWorkload ? undefined : o.ns.windows ?? [{ from: 120, to: 720, burstPhase: 'steady-and-burst' }];
    evidence.push({ kind: 'ns-run', objectSha256: S.put({ format: FORMATS.nsRun, binding, measurement: o.ns.measurement, slot: { name: o.composition.source.slot, host: 'colima-triplex2' }, ...(trace ? { trace } : {}), ...(windows ? { windows } : {}), rawEventsObject: S.put(`events ${id}`) }) });
  }
  if (verifier) {
    const verdicts = o.verifies.flatMap(v => v.evidence.filter(e => e.kind === 'case-result').map(e => ({ receiptId: v.receiptId, caseSet: e.caseSet, caseId: e.caseId, mode: e.mode, verdict: 'PASS' })));
    const record = o.notAVerifierRecord ? { notAVerifierRecord: true } : { format: FORMATS.verifierRecord, binding, verifies: o.verifies.map(v => ({ receiptId: v.receiptId, binding: bindingOf(v) })), mode: ob.verifierMode, mismatches: [], spotRerunReceiptIds: [`spot-${id}`],
      recomputedVerdictsObject: S.put({ format: FORMATS.recomputedVerdicts, binding, verdicts }) };
    evidence.push({ kind: 'verifier-record', objectSha256: S.put(record) });
  }
  // The build/import manifest of this run: every executed module retained (Q47a) unless the fixture says otherwise.
  const from = o.builtFrom ?? at;
  const pkgFiles = Object.keys(from.files).filter(f => f.startsWith('packages/xtdb/')).sort();
  const outputs = pkgFiles.filter(f => f.endsWith('.ts')).map(f => ({ path: f.replace('/src/', '/dist/').replace(/\.ts$/, '.js'), bytes: `compiled ${from.files[f]}` }));
  const modules = [{ path: entry, bytes: at.files[entry], origin: 'tree' }, ...outputs.map(x => ({ ...x, origin: 'build', build: 'xtdb' })), { path: 'node_modules/effect/dist/index.js', bytes: 'effect', origin: 'dependency' }, ...(o.extraModules ?? [])]
    .map(x => ({ path: x.path, sha256: x.retain === false ? h(x.bytes) : S.put(x.bytes), origin: x.origin, ...(x.build ? { build: x.build } : {}) }));
  const narrow = o.narrowRoots;
  const build = { id: 'xtdb', package: 'packages/xtdb', sourceRoots: narrow ? ['packages/xtdb/package.json'] : ['packages/xtdb'],
    inputs: (narrow ? ['packages/xtdb/package.json'] : pkgFiles.filter(f => !(o.dropInput && f.endsWith('alloc.ts')))).map(f => ({ path: f, sha256: h(from.files[f]) })),
    outputs: outputs.map(x => ({ path: x.path, sha256: h(x.bytes) })) };
  const binarySha256 = listingHash(modules.map(x => [x.path, x.sha256]));
  r.profileIdentity.buildManifestSha256 = S.put({ format: FORMATS.manifest, binding, commit: at.commit, tree: at.tree, sourceTreeSha256: (o.label ?? at).label, entrypoints: [entry], modules, builds: [build], lockfileSha256: h(at.files['pnpm-lock.yaml']), binarySha256 });
  r.profileIdentity.executedBinarySha256 = binarySha256;
  const cases = evidence.filter(e => e.kind === 'case-result').length;
  r.counts = { declared: verifier ? 1 : resolved.length * ob.closure.modes.length, executed: verifier ? 1 : cases, skipped: o.skipped ?? 0, unsupported: 0, notImplemented: 0, unexpectedErrors: 0 };
  r.evidence = evidence;
  if (o.edit) o.edit(r);
  return r;
}

// ---------------------------------------------------------------- the fixtures

export function buildFixtures(root) {
  fs.mkdirSync(root, { recursive: true });
  const repos = Object.fromEntries(['real', 'null', 'noreg', 'pinned', 'w0'].map(v => [v, makeRepo(path.join(root, `repo-${v}`), v)]));
  const S = store(path.join(root, 'objects'));
  const fixtures = [];

  /**
   * The complete positive claim: prerequisites for the candidate (at C2) and the registry's A0 (at C1), the claimed
   * obligation's measurement and its A0 control, and an independent verifier receipt for every one of them.
   */
  function complete(fx, { variant = 'pinned', at, obligation = 'NS.P2', kind = 'comparative', tweak = {}, candidate = CANDIDATE, a0 = A0, a0At, drop = [], refuseAll } = {}) {
    const R = repos[variant];
    at ??= R.C2; a0At ??= R.C1;
    const ob = OBL.get(obligation);
    const measured = ob.closure.rules.some(x => x === 'CR-NS' || x === 'CR-GS');
    const ns = measured ? { measurement: ob.closure.params.evidenceMeasurement ?? obligation.replace(/^NS\./, '') } : undefined;
    const promo = kind === 'promotion';
    const mk = (key, o) => run(S, { ...o, ...(tweak[key] ?? {}), id: `${fx}:${key}` });
    const plan = [
      ['pos-cand', { obligation: 'G7.position.coordinates', composition: candidate, at }],
      ['id-cand', { obligation: 'G10.composition.identity-bound', composition: candidate, at }],
      ...(ob.oracles.includes('O-DOMAIN') ? [['w0-cand', { obligation: 'W0.coverage-floors', composition: candidate, at }]] : []),
      ['meas', { obligation, composition: candidate, at, runKind: promo ? 'acceptance' : 'candidate', profile: promo ? ob.profiles.at(-1) : measured ? 'P-SCREEN' : ob.profiles[0], ns, refuse: refuseAll }],
      ['pos-a0', { obligation: 'G7.position.coordinates', composition: a0, at: a0At }],
      ['id-a0', { obligation: 'G10.composition.identity-bound', composition: a0, at: a0At }],
      ['ctrl', { obligation, composition: a0, at: a0At, runKind: promo ? 'acceptance' : 'control', profile: promo ? ob.profiles.at(-1) : measured ? 'P-SCREEN' : ob.profiles[0], ns, refuse: refuseAll }],
    ].filter(([k]) => !drop.includes(k));
    const receipts = plan.map(([k, o]) => mk(k, o));
    for (const [k, o] of plan) {
      if (drop.includes(`v-${k}`)) continue;
      const verified = receipts.find(r => r.receiptId === `${fx}:${k}`);
      // The verifier runs at the side's home on the verified run's profile and composition (VV2).
      receipts.push(mk(`v-${k}`, { obligation: o.obligation, composition: verified.composition, at: o.at, runKind: 'verifier', profile: verified.profile, verifies: [verified] }));
    }
    return { format: FORMATS.claim, claimId: fx, kind, obligations: [obligation], commit: at.commit, sourceTreeSha256: at.label, composition: structuredClone(candidate), control: { id: 'A0-XTDB' }, receipts };
  }
  const add = (id, source, expected, defect, variant, claim, { labOnly = false } = {}) => fixtures.push({ id, source, expected, defect, labOnly, repo: repos[variant].dir, authorityRef: 'main', claim });
  const rc = (claim, key) => claim.receipts.find(r => r.receiptId.endsWith(`:${key}`));
  const lab = { labOnly: true };
  const zero = '0'.repeat(64);

  // -- positives
  add('POSITIVE-NS-SCREENING', 'Q38b positive control, completed for Q42a and Q47', 'QUALIFIED', 'none: NS.P2 screening comparison, prerequisites for both compositions, matched registry A0 control, verifiers on every receipt', 'pinned', complete('POSITIVE-NS-SCREENING'));
  add('POSITIVE-GS-DOMAIN', 'Q38b domain positive control', 'QUALIFIED', 'none: GS.05 with W0 pinned (review, delta check, fingerprint) and a W0.coverage-floors receipt', 'w0', complete('POSITIVE-GS-DOMAIN', { variant: 'w0', obligation: 'GS.05' }));
  add('POSITIVE-PROMOTION', 'Q42a verifier evidence', 'QUALIFIED', 'none: promotion on P-NS acceptance receipts', 'pinned', complete('POSITIVE-PROMOTION', { kind: 'promotion' }));

  // -- ported from the generator's self-check (0.3.5 Q38b block and 0.3.6 Q42a block)
  add('GEN-PREREQS-ONLY', 'Q42a "prerequisites but no measurement"', 'DIAGNOSTIC', 'NS.P2 claim carrying only prerequisite receipts', 'pinned', complete('GEN-PREREQS-ONLY', { drop: ['meas', 'ctrl', 'v-meas', 'v-ctrl'] }));
  add('GEN-NULL-OREPLAY-PIN', 'Q37b, Q38b / CX-CLAIM-NULL-ORACLE-PIN', 'DIAGNOSTIC', 'complete claim while O-REPLAY\'s pin is null', 'null', complete('GEN-NULL-OREPLAY-PIN', { variant: 'null' }));
  add('GEN-SUPPLIED-NAMES', 'Q38b / CX-CLAIM-SUPPLIED-NAMES', 'DIAGNOSTIC', 'no receipts; positionCasesClosed and compositionBound supplied', 'pinned',
    { ...complete('GEN-SUPPLIED-NAMES'), receipts: [], positionCasesClosed: [...REAL_CONTRACT.positionRequiredCases], compositionBound: true });
  add('GEN-OTHER-TREE', 'Q38b; Q42a "falsifier receipt from an earlier commit"', 'DIAGNOSTIC', 'candidate position receipt produced and labelled at C1', 'pinned', complete('GEN-OTHER-TREE', { tweak: { 'pos-cand': { at: repos.pinned.C1 } } }));
  add('GEN-MISSING-FALSIFIERS', 'Q38b / CX-SCREENING-CLAIM-PREREQ', 'DIAGNOSTIC', 'candidate position receipt without the four falsifier cases', 'pinned',
    complete('GEN-MISSING-FALSIFIERS', { tweak: { 'pos-cand': { omitCases: ['FX-NESTED-CUTS', 'FX-ABORT-GAP', 'FX-CRASH-APPEND-RESOLUTION', 'FX-RESUME-AT-ABORT-GAP'] } } }));
  { const c = composition('xtdb', 'qlever'); delete c.history.slot;
    add('GEN-COMPOSITION-UNBOUND', 'Q38b / CX-COMPOSITION-UNBOUND', 'DIAGNOSTIC', 'candidate history assignment has no slot', 'pinned', complete('GEN-COMPOSITION-UNBOUND', { candidate: c })); }
  add('GEN-W0-NULL', 'Q38b / CX-W0-UNPINNED', 'DIAGNOSTIC', 'complete GS.05 claim while the W0 pin is null', 'pinned', complete('GEN-W0-NULL', { obligation: 'GS.05' }));
  add('GEN-NO-W0-RECEIPT', 'Q38b', 'DIAGNOSTIC', 'GS.05 claim without the W0.coverage-floors receipt', 'w0', complete('GEN-NO-W0-RECEIPT', { variant: 'w0', obligation: 'GS.05', drop: ['w0-cand', 'v-w0-cand'] }));
  add('GEN036-EXCLUDED', 'Q45a (0.3.6 self-check)', 'DIAGNOSTIC', 'a claim on G1.decimal.channel-routing, excluded from O-REPLAY\'s pin', 'pinned', complete('GEN036-EXCLUDED', { obligation: 'G1.decimal.channel-routing', drop: ['meas', 'ctrl', 'v-meas', 'v-ctrl'] }));
  add('GEN036-REFUSED-SET', 'Q45b (0.3.6 self-check)', 'DIAGNOSTIC', 'a claim on G9.erasure.visibility-boundary, whose CS-ERASURE O-REPLAY refuses', 'pinned', complete('GEN036-REFUSED-SET', { obligation: 'G9.erasure.visibility-boundary', drop: ['meas', 'ctrl', 'v-meas', 'v-ctrl'] }));

  // -- Q42a counterexamples (Codex rounds 4 and 5)
  add('CODEX-R4-FABRICATED', 'Codex round 4 finding 4', 'DIAGNOSTIC', 'all position cases PASS on all-zero object hashes, built from C1 under C2\'s label', 'pinned',
    complete('CODEX-R4-FABRICATED', { tweak: { 'pos-cand': { builtFrom: repos.pinned.C1, edit: r => { for (const e of r.evidence) e.objectSha256 = zero; } } } }));
  add('Q42A-ZERO-HASHES', 'Q42a "all-zero object hashes"', 'DIAGNOSTIC', 'candidate position case objects are all-zero hashes', 'pinned',
    complete('Q42A-ZERO-HASHES', { tweak: { 'pos-cand': { edit: r => { for (const e of r.evidence) if (e.kind === 'case-result') e.objectSha256 = zero; } } } }));
  add('Q42A-STALE-BINARY', 'Q42a "stale binary under the same source label"', 'DIAGNOSTIC', 'candidate position run executed a build of C1\'s alloc.ts; receipt and manifest say C2', 'pinned', complete('Q42A-STALE-BINARY', { tweak: { 'pos-cand': { builtFrom: repos.pinned.C1 } } }));
  add('Q42A-BUILD-INPUT-OMITTED', 'Q42a manifest binding', 'DIAGNOSTIC', 'the build manifest omits alloc.ts from its inputs', 'pinned', complete('Q42A-BUILD-INPUT-OMITTED', { tweak: { 'pos-cand': { dropInput: true } } }));
  add('Q42A-EARLIER-COMMIT-RELABELLED', 'Q42a "falsifier receipt from an earlier commit"', 'DIAGNOSTIC', 'candidate position receipt produced at C1, labelled with C2\'s source label', 'pinned',
    complete('Q42A-EARLIER-COMMIT-RELABELLED', { tweak: { 'pos-cand': { at: repos.pinned.C1, label: repos.pinned.C2 } } }));
  add('Q42A-STARTED-BEFORE-COMMIT', 'Q42a freshness', 'DIAGNOSTIC', 'candidate position receipt says C2 but started before C2 existed', 'pinned', complete('Q42A-STARTED-BEFORE-COMMIT', { tweak: { 'pos-cand': { start: T.beforeC2 } } }));
  add('Q42A-OBJECT-CORRUPT', 'Q42a "bytes hash to the recorded value"', 'DIAGNOSTIC', 'one stored case object no longer hashes to its name', 'pinned',
    (() => { const c = complete('Q42A-OBJECT-CORRUPT'); S.corrupt(rc(c, 'pos-cand').evidence[0].objectSha256); return c; })());
  add('Q42A-OBJECT-OF-OTHER-CASE', 'Q42a "opens and verifies the evidence"', 'DIAGNOSTIC', 'FX-ABORT-GAP points at FX-NESTED-CUTS\'s real, intact object', 'pinned',
    complete('Q42A-OBJECT-OF-OTHER-CASE', { tweak: { 'pos-cand': { edit: r => { const ev = r.evidence; ev.find(e => e.caseId === 'FX-ABORT-GAP' && e.mode === 'current').objectSha256 = ev.find(e => e.caseId === 'FX-NESTED-CUTS' && e.mode === 'current').objectSha256; } } } }));
  add('Q42A-MODES-SHORT', 'Q42a "modes required by the obligation"', 'DIAGNOSTIC', 'candidate position run covered mode current only', 'pinned', complete('Q42A-MODES-SHORT', { tweak: { 'pos-cand': { modes: ['current'] } } }));
  add('Q42A-FAULT-REPS-SHORT', 'Q42a "fault repetitions" / CX-FAULT-REPS-SHORT', 'DIAGNOSTIC', 'FX-CRASH-APPEND-RESOLUTION injected twice', 'pinned', complete('Q42A-FAULT-REPS-SHORT', { tweak: { 'pos-cand': { faultReps: 2 } } }));
  add('Q42A-UNKNOWN-ID', 'Q42a "unknown ids rejected, never dropped"', 'DIAGNOSTIC', 'obligations [NS.P2, NS.P9] with complete NS.P2 evidence', 'pinned', { ...complete('Q42A-UNKNOWN-ID'), obligations: ['NS.P2', 'NS.P9'] });
  add('Q42A-UNKNOWN-ID-ONLY', 'Q42a', 'DIAGNOSTIC', 'obligations [NS.P9] only', 'pinned', { ...complete('Q42A-UNKNOWN-ID-ONLY'), obligations: ['NS.P9'] });
  add('Q42A-NO-CONTROL', 'Q42a "matched control"', 'DIAGNOSTIC', 'NS.P2 measurement without an A0 control receipt', 'pinned', complete('Q42A-NO-CONTROL', { drop: ['ctrl', 'v-ctrl'] }));
  add('Q42A-CONTROL-OTHER-SEED', 'Q42a, Q47b', 'DIAGNOSTIC', 'the A0 control ran seed 7', 'pinned', complete('Q42A-CONTROL-OTHER-SEED', { tweak: { ctrl: { ns: { measurement: 'P2', seed: 7 } } } }));
  add('Q42A-CONTROL-OTHER-WINDOW', 'Q42a "same window"', 'DIAGNOSTIC', 'the A0 control measured another window', 'pinned', complete('Q42A-CONTROL-OTHER-WINDOW', { tweak: { ctrl: { ns: { measurement: 'P2', windows: [{ from: 720, to: 1320, burstPhase: 'steady-and-burst' }] } } } }));
  add('Q42A-CORRECTNESS-FAIL', 'Q42a "with their correctness checks"', 'DIAGNOSTIC', 'NS.P2 measurement with NS-P2-PROGRESS answered wrong and labelled FAIL', 'pinned', complete('Q42A-CORRECTNESS-FAIL', { tweak: { meas: { wrong: { 'NS-P2-PROGRESS': 'FAIL' } } } }));
  add('Q42A-WRONG-MEASUREMENT', 'CX-GS-WRONG-SCENARIO', 'DIAGNOSTIC', 'the NS.P2 receipts carry a P1 ns-run', 'pinned', complete('Q42A-WRONG-MEASUREMENT', { tweak: { meas: { ns: { measurement: 'P1' } }, ctrl: { ns: { measurement: 'P1' } } } }));
  add('Q42A-UNFROZEN-TRACE', 'CX-NS-UNFROZEN-TRACE (VA15)', 'DIAGNOSTIC', 'candidate and control matched on seed 7, not the frozen seed', 'pinned', complete('Q42A-UNFROZEN-TRACE', { tweak: { meas: { ns: { measurement: 'P2', seed: 7 } }, ctrl: { ns: { measurement: 'P2', seed: 7 } } } }));
  add('Q42A-CONTROL-NO-PREREQ', 'GATE-POSITION "A0 included" (Q38a)', 'DIAGNOSTIC', 'the A0 composition has no position receipt', 'pinned', complete('Q42A-CONTROL-NO-PREREQ', { drop: ['pos-a0', 'v-pos-a0'] }));
  add('Q34D-SCREENING-PREREQ', 'CX-SCREENING-CLAIM-PREREQ, VA16', 'DIAGNOSTIC', 'the candidate position receipt is a P-SCREEN run', 'pinned', complete('Q34D-SCREENING-PREREQ', { tweak: { 'pos-cand': { profile: 'P-SCREEN' } } }));
  add('Q42A-DIAGNOSTIC-RUN', 'B7', 'DIAGNOSTIC', 'the NS.P2 measurement is a diagnostic run', 'pinned', complete('Q42A-DIAGNOSTIC-RUN', { tweak: { meas: { runKind: 'diagnostic' } } }));
  add('Q42A-NO-VERIFIER', 'Q42a "verifier evidence" (0.3.6: on every receipt)', 'DIAGNOSTIC', 'the NS.P2 measurement has no verifier receipt', 'pinned', complete('Q42A-NO-VERIFIER', { drop: ['v-meas'] }));
  add('Q42A-PROMOTION-ON-SCREENING', 'ACCEPTANCE 5.7, VA16', 'DIAGNOSTIC', 'promotion whose measurement is a P-SCREEN candidate run', 'pinned', complete('Q42A-PROMOTION-ON-SCREENING', { kind: 'promotion', tweak: { meas: { profile: 'P-SCREEN', runKind: 'candidate' } } }));
  add('Q42A-VERIFIER-IS-AUTHOR', 'VV1', 'DIAGNOSTIC', 'the measurement\'s verifier is an author of the code under test', 'pinned', complete('Q42A-VERIFIER-IS-AUTHOR', { tweak: { 'v-meas': { agentId: 'agent-candidate-author' } } }));

  // -- Codex round 6 (Q47a to Q47c): each counterexample qualified through the 0.3.6 reference with the real accepted pins
  add('CODEX-R6-MODULES-NOT-RETAINED', 'Codex round 6 finding 1 / Q47a', 'DIAGNOSTIC', 'an executed module (node_modules/fixture-dep) is listed with a hash but its bytes were never retained', 'pinned',
    complete('CODEX-R6-MODULES-NOT-RETAINED', { tweak: { 'pos-cand': { extraModules: [{ path: 'node_modules/fixture-dep/index.js', bytes: 'never stored CODEX-R6', origin: 'dependency', retain: false }] } } }));
  add('CODEX-R6-NOT-A-VERIFIER-RECORD', 'Codex round 6 finding 1 / Q47a', 'DIAGNOSTIC', 'the measurement\'s verifier object is {"notAVerifierRecord":true}', 'pinned', complete('CODEX-R6-NOT-A-VERIFIER-RECORD', { tweak: { 'v-meas': { notAVerifierRecord: true } } }));
  add('CODEX-R6-REFUSAL-LABELLED-PASS', 'Codex round 6 finding 1 / Q47a', 'DIAGNOSTIC', 'NS-P2-PROGRESS: oracle exit 2 with X-NOT-MODELED, case labelled PASS', 'pinned', complete('CODEX-R6-REFUSAL-LABELLED-PASS', { tweak: { meas: { refuse: ['NS-P2-PROGRESS'] } } }));
  add('Q47A-WRONG-LABELLED-PASS', 'Q47a "recompute every case verdict"', 'DIAGNOSTIC', 'NS-P2-PROGRESS answered wrong but labelled PASS', 'pinned', complete('Q47A-WRONG-LABELLED-PASS', { tweak: { meas: { wrong: { 'NS-P2-PROGRESS': 'PASS' } } } }));
  add('CODEX-R6-CONTROL-NO-WORKLOAD', 'Codex round 6 finding 5 / Q47b', 'DIAGNOSTIC', 'measurement and control both lack trace and windows (None == None)', 'pinned',
    complete('CODEX-R6-CONTROL-NO-WORKLOAD', { tweak: { meas: { ns: { measurement: 'P2', noWorkload: true } }, ctrl: { ns: { measurement: 'P2', noWorkload: true } } } }));
  { const lookalike = composition('xtdb', 'qlever'); lookalike.analytics.configSha256 = h('a different config');
    const c = complete('CODEX-R6-CANDIDATE-SELECTED-CONTROL', { a0: lookalike });
    c.control = { id: 'A0-XTDB', composition: lookalike };
    add('CODEX-R6-CANDIDATE-SELECTED-CONTROL', 'Codex round 6 finding 5 / Q47b; red-team A2', 'DIAGNOSTIC', 'the claim picks its own control (the candidate with one config hash changed) instead of the registry\'s A0', 'pinned', c); }
  add('CODEX-R6-NO-A0-REGISTRY', 'Q46b, Q47b', 'DIAGNOSTIC', 'complete claim under a contract that pins no A0 registry', 'noreg', complete('CODEX-R6-NO-A0-REGISTRY', { variant: 'noreg' }));
  add('CODEX-R6-MIGRATION-INDIRECT-REFUSAL', 'Codex round 6 finding 6 / Q47c', 'DIAGNOSTIC', 'G7.migration.schema-evolution selects CS-MIGRATION all, reaching MIG-DECIMAL-5-2-TO-6-3; its retained O-REPLAY run refused (X-NOT-MODELED) and is labelled PASS', 'pinned',
    complete('CODEX-R6-MIGRATION-INDIRECT-REFUSAL', { obligation: 'G7.migration.schema-evolution', refuseAll: ['MIG-DECIMAL-5-2-TO-6-3'] }));
  add('Q47C-MIGRATION-REFUSED-CASE-OMITTED', 'Q47c', 'DIAGNOSTIC', 'the same migration claim with the refused case simply left out', 'pinned',
    complete('Q47C-MIGRATION-REFUSED-CASE-OMITTED', { obligation: 'G7.migration.schema-evolution', tweak: { meas: { omitCases: ['MIG-DECIMAL-5-2-TO-6-3'] }, ctrl: { omitCases: ['MIG-DECIMAL-5-2-TO-6-3'] } } }));
  add('Q47C-MANIFESTS-UNPINNED', 'Q47c, ACCEPTANCE 5.3', 'DIAGNOSTIC', 'complete claim under contract 0.3.6 as compiled (no pinned case manifests, no A0 registry, O-OBS to build)', 'real', complete('Q47C-MANIFESTS-UNPINNED', { variant: 'real' }));

  // -- red-team findings on the first version (receipt fields not bound to evidence, profiles, authors, build tricks)
  add('RT-SWAP-ROLES', 'red-team A1', 'DIAGNOSTIC', 'measurement and control composition labels swapped after the runs', 'pinned',
    (() => { const c = complete('RT-SWAP-ROLES'); const m = rc(c, 'meas'), k = rc(c, 'ctrl'); [m.composition, k.composition] = [k.composition, m.composition]; return c; })());
  add('RT-RELABEL-PROFILE', 'red-team A4', 'DIAGNOSTIC', 'a P-SCREEN position run relabelled P-FAULT after the run', 'pinned', complete('RT-RELABEL-PROFILE', { tweak: { 'pos-cand': { profile: 'P-SCREEN', edit: r => { r.profile = 'P-FAULT'; } } } }));
  add('RT-RELABEL-START', 'red-team A4', 'DIAGNOSTIC', 'a position run that started before C2, its start time edited afterwards', 'pinned', complete('RT-RELABEL-START', { tweak: { 'pos-cand': { start: T.beforeC2, edit: r => { r.timing.start = T.run; } } } }));
  { const c = composition('xtdb', 'qlever'); c.history.slot = ['dev'];
    add('RT-SLOT-ARRAY', 'red-team A2b', 'DIAGNOSTIC', 'candidate history slot is the array ["dev"]', 'pinned', complete('RT-SLOT-ARRAY', { candidate: c })); }
  add('RT-PROFILE-TRAILING-SPACE', 'red-team A3a', 'DIAGNOSTIC', 'candidate position run on profile "P-FAULT " (trailing space)', 'pinned', complete('RT-PROFILE-TRAILING-SPACE', { tweak: { 'pos-cand': { profile: 'P-FAULT ' } } }));
  add('RT-PROFILE-UNDECLARED', 'red-team A3c', 'DIAGNOSTIC', 'promotion measurements on P-TINY, which NS.P2 does not declare', 'pinned', complete('RT-PROFILE-UNDECLARED', { kind: 'promotion', tweak: { meas: { profile: 'P-TINY' }, ctrl: { profile: 'P-TINY' } } }));
  add('RT-AUTHORS-MISSING', 'red-team A5 (VV1)', 'DIAGNOSTIC', 'no authorsOfCodeUnderTest on the measurement; its verifier is the author', 'pinned', complete('RT-AUTHORS-MISSING', { tweak: { meas: { noAuthors: true }, 'v-meas': { agentId: 'agent-candidate-author' } } }));
  add('RT-DEPENDENCY-WORKSPACE', 'red-team (dependency hypothesis)', 'DIAGNOSTIC', 'a stale first-party build executed from node_modules/@fixture/xtdb, declared as a dependency', 'pinned',
    complete('RT-DEPENDENCY-WORKSPACE', { tweak: { 'pos-cand': { extraModules: [{ path: 'node_modules/@fixture/xtdb/dist/alloc.js', bytes: `compiled ${SRC['packages/xtdb/src/alloc.ts']}`, origin: 'dependency' }] } } }));
  add('RT-NARROW-ROOTS', 'red-team (narrowed roots hypothesis)', 'DIAGNOSTIC', 'the build declares only package.json as its source root, hiding a stale alloc.ts', 'pinned', complete('RT-NARROW-ROOTS', { tweak: { 'pos-cand': { builtFrom: repos.pinned.C1, narrowRoots: true } } }));
  add('RT-REPEATED-INJECTION', 'red-team (fault witness hypothesis)', 'DIAGNOSTIC', 'three injections that retain the same durable evidence object', 'pinned', complete('RT-REPEATED-INJECTION', { tweak: { 'pos-cand': { repeatInjection: true } } }));

  // -- lab-only VA checks (Q41d: the lab adds full receipt validity; the structural reference does not model these)
  add('LAB-BRANCH-PINS-OWN-ORACLE', 'VA6 (contract from the authority ref)', 'DIAGNOSTIC', 'claim at a branch commit whose obligations.json pins O-REPLAY; main has it null', 'null', complete('LAB-BRANCH-PINS-OWN-ORACLE', { variant: 'null', at: repos.null.ROGUE }), lab);
  add('LAB-ORACLE-FILE-DRIFT', 'VA6 (oracle files equal the pin)', 'DIAGNOSTIC', 'O-OBS file edited after its pin; contract unchanged', 'pinned', complete('LAB-ORACLE-FILE-DRIFT', { at: repos.pinned.DRIFT }), lab);
  { const c = composition('xtdb', 'qlever'); c.current.imageDigest = 'sha256:' + 'e'.repeat(64);
    add('LAB-IMAGE-NOT-PINNED', 'VA4', 'DIAGNOSTIC', 'the candidate current index runs an unpinned QLever image', 'pinned', complete('LAB-IMAGE-NOT-PINNED', { candidate: c }), lab); }
  add('LAB-FORBIDDEN-ENDPOINT', 'VA5', 'DIAGNOSTIC', 'the candidate position run contacted port 15442', 'pinned', complete('LAB-FORBIDDEN-ENDPOINT', { tweak: { 'pos-cand': { endpoint: 'http://127.0.0.1:15442' } } }), lab);
  add('LAB-ADMISSION-BLOCKED', 'VA10', 'DIAGNOSTIC', 'the candidate position run was BLOCKED_CAPACITY', 'pinned', complete('LAB-ADMISSION-BLOCKED', { tweak: { 'pos-cand': { admission: 'BLOCKED_CAPACITY' } } }), lab);
  add('LAB-SKIPPED-CASE', 'VA8', 'DIAGNOSTIC', 'the candidate position run reports one skipped execution', 'pinned', complete('LAB-SKIPPED-CASE', { tweak: { 'pos-cand': { skipped: 1 } } }), lab);
  return { root, repos, objects: S.dir, fixtures };
}

// ---------------------------------------------------------------- run both implementations

const gitSources = new Map();
export function evaluateLab(fx, objectsDir) {
  if (!gitSources.has(fx.repo)) gitSources.set(fx.repo, gitSource(fx.repo));
  return admitClaim(fx.claim, { git: gitSources.get(fx.repo), objects: objectStore(objectsDir), authorityRef: fx.authorityRef });
}

/** Runs the proposed reference model (Q42a and Q47) over every fixture in one python process. */
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
  console.log('| Fixture | Source | Defect | Expected | Reference (proposed) | Lab | Lab reasons |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const f of built.fixtures) {
    const lab = evaluateLab(f, built.objects);
    const codes = [...new Set(lab.reasons.map(r => r.code))].join(', ');
    console.log(`| ${f.id}${f.labOnly ? ' (lab-only VA)' : ''} | ${f.source} | ${f.defect} | ${f.expected} | ${ref[f.id].verdict} | ${lab.verdict} | ${codes || '-'} |`);
  }
  if (keep < 0) fs.rmSync(root, { recursive: true, force: true });
}
