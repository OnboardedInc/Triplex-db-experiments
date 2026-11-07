// One fixture set for claim admission, judged by two implementations (EXP-E01; Q42a "Counterexample fixtures";
// Q41d: the generator's admit_claim is the reference model, lab/bin/claim.mjs implements it as a minimum).
//
// buildFixtures(root) writes small git repositories and one content-addressed object store under root, then
// returns every fixture: a claim file plus the expected verdict. Each fixture is the complete positive claim
// with exactly one named defect, so a DIAGNOSTIC can only come from that defect.
//
//   node lab/bin/test/claim-fixtures.mjs [--keep DIR]   prints the fixture table (expected, both reference
//                                                        models, the lab evaluator) as Markdown
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256, sourceTreeIdOf } from '../lib.mjs';
import { FORMATS, admitClaim, gitSource, objectStore, requiredCases } from '../claim.mjs';

const LAB_REPO = path.resolve(import.meta.dirname, '../../..');
const real = file => fs.readFileSync(path.join(LAB_REPO, file), 'utf8');
const REAL_CONTRACT = JSON.parse(real('lab/acceptance/obligations.json'));
const REAL_LOAD = JSON.parse(real('lab/acceptance/load-contract.json'));
const REAL_SLOTS = JSON.parse(real('lab/config/slots.json'));
const OBL = new Map(REAL_CONTRACT.obligations.map(o => [o.id, o]));
const listingHash = rows => sha256(rows.map(([p, h]) => `${h}  ${p}\n`).join(''));
const SEED = 20261108;
const T = { c1: '2026-11-07T12:00:00Z', c2: '2026-11-07T13:00:00Z', c3: '2026-11-07T13:30:00Z', run: '2026-11-07T14:00:00Z', end: '2026-11-07T14:20:00Z', beforeC2: '2026-11-07T12:30:00Z' };

// ---------------------------------------------------------------- source files of the fixture repositories

const SRC = {
  'packages/xtdb/package.json': '{ "name": "@fixture/xtdb", "version": "0.0.0" }\n',
  'packages/xtdb/src/index.ts': "export { nextCommitPosition } from './alloc.js';\n",
  'packages/xtdb/src/alloc.ts': 'export const nextCommitPosition = (p: number) => p + 1; // v1\n',
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
  'lab/world/W0/schema.json': '{}\n',
  'lab/world/W0/cases/c1.json': '{"case":1}\n',
};
const ALLOC_V2 = 'export const nextCommitPosition = (p: number) => p + 1; // v2: nested transacts share one offset\n';
const h = text => sha256(Buffer.from(text));

function contractVariant(variant) {
  const c = structuredClone(REAL_CONTRACT);
  if (variant === 'null') return c; // contract 0.3.5 as compiled: O-REPLAY and W0 pins null
  const filePin = (dir, file) => ({ files: `${dir}/`, sha256: { [file]: h(SRC[file]) }, acceptReceipt: 'FIXTURE-ACCEPT', acceptedAfter: 'fixture', rule: 'fixture pin' });
  c.oraclePins['O-REPLAY'] = { ...c.oraclePins['O-REPLAY'], sha256: listingHash([['lab/oracles/replay/replay.py', h(SRC['lab/oracles/replay/replay.py'])]]), acceptReceipt: 'FIXTURE-V-O03' };
  c.oraclePins['O-OBS'] = filePin('lab/oracles/obs', 'lab/oracles/obs/obs.py');
  c.oraclePins['O-DOMAIN'] = filePin('lab/oracles/domain', 'lab/oracles/domain/domain.py');
  c.oraclePins['O-HAND'] = filePin('lab/oracles/hand', 'lab/oracles/hand/hand.json');
  if (variant === 'w0') {
    const w = f => h(SRC[f]);
    c.w0Pin = { ...c.w0Pin, reviewReceipt: 'FIXTURE-V-D01', files: {
      'lab/world/W0/SPEC.md': w('lab/world/W0/SPEC.md'), 'lab/world/W0/releases/R1.json': w('lab/world/W0/releases/R1.json'),
      'lab/world/W0/releases/R2.json': w('lab/world/W0/releases/R2.json'), 'lab/world/W0/schema.json': w('lab/world/W0/schema.json'),
      'lab/world/W0/cases/': listingHash([['lab/world/W0/cases/c1.json', w('lab/world/W0/cases/c1.json')]]) } };
  }
  return c;
}
function loadVariant() {
  // Proposed field (question to the orchestrator): load-contract.json pins no frozen generator yet.
  const l = structuredClone(REAL_LOAD);
  l.writerTrace.generator.frozen = { path: 'lab/bench/trace.mjs', sha256: h(SRC['lab/bench/trace.mjs']), seed: SEED };
  return l;
}

function makeRepo(dir, variant) {
  fs.mkdirSync(dir, { recursive: true });
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  const git = (args, date) => execFileSync('git', ['-c', 'user.name=lab fixture', '-c', 'user.email=fixture@lab.invalid', '-c', 'commit.gpgsign=false', ...args],
    { cwd: dir, env: date ? { ...env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : env, encoding: 'utf8' }).trim();
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), text); };
  const commit = (message, date) => { git(['add', '-A']); git(['commit', '-q', '-m', message], date); const c = git(['rev-parse', 'HEAD']); const tree = git(['rev-parse', 'HEAD^{tree}']); return { commit: c, tree, label: sourceTreeIdOf(tree), date, files: snapshot() }; };
  const snapshot = () => Object.fromEntries(git(['ls-files']).split('\n').filter(Boolean).map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
  git(['init', '-q', '-b', 'main']);
  for (const [f, t] of Object.entries(SRC)) write(f, t);
  write('lab/acceptance/obligations.json', JSON.stringify(contractVariant(variant), null, 2) + '\n');
  write('lab/acceptance/load-contract.json', JSON.stringify(loadVariant(), null, 2) + '\n');
  write('lab/config/slots.json', JSON.stringify(REAL_SLOTS, null, 2) + '\n');
  const C1 = commit('C1: allocator v1', T.c1);
  write('packages/xtdb/src/alloc.ts', ALLOC_V2);
  const C2 = commit('C2: allocator v2', T.c2);
  const out = { dir, variant, C1, C2 };
  if (variant === 'null') { // a branch that pins its own oracles: the authority (main) still has them null
    git(['checkout', '-q', '-b', 'rogue']);
    write('lab/acceptance/obligations.json', JSON.stringify(contractVariant('pinned'), null, 2) + '\n');
    out.ROGUE = commit('rogue: branch-local oracle pins', T.c3);
    git(['checkout', '-q', 'main']);
  }
  if (variant === 'pinned') { // an oracle file edited after its pin, contract unchanged
    git(['checkout', '-q', '-b', 'drift']);
    write('lab/oracles/obs/obs.py', '# O-OBS (fixture), edited after the pin\n');
    out.DRIFT = commit('drift: O-OBS edited after pin', T.c3);
    git(['checkout', '-q', 'main']);
  }
  return out;
}

// ---------------------------------------------------------------- object store and receipts

function store(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const put = value => {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    const sha = sha256(bytes);
    const file = path.join(dir, sha);
    if (!fs.existsSync(file)) fs.writeFileSync(file, bytes);
    return sha;
  };
  return { dir, put, corrupt: sha => { const f = path.join(dir, sha); fs.chmodSync(f, 0o644); fs.writeFileSync(f, Buffer.concat([fs.readFileSync(f), Buffer.from(' ')])); } };
}

const composition = (sourceEngine, currentEngine) => {
  const a = engine => ({ engine, imageDigest: REAL_SLOTS.lanes[engine].imageId, configSha256: h(`config ${engine}`), slot: 'dev' });
  return { source: a(sourceEngine), current: a(currentEngine), history: a(sourceEngine), analytics: a(sourceEngine) };
};
export const CANDIDATE = composition('xtdb', 'qlever');
export const A0 = composition('xtdb', 'xtdb');

/** A build/import manifest object for a receipt; `from` is the snapshot the build actually read. */
function manifest(S, { receiptId, at, from = at, entry, dropInput = false }) {
  const roots = ['packages/xtdb/src', 'packages/xtdb/package.json'];
  let inputs = Object.keys(from.files).filter(f => f.startsWith('packages/xtdb/')).sort().map(f => ({ path: f, sha256: h(from.files[f]) }));
  if (dropInput) inputs = inputs.filter(x => x.path !== 'packages/xtdb/src/alloc.ts');
  const outputs = Object.keys(from.files).filter(f => /^packages\/xtdb\/src\/.*\.ts$/.test(f)).map(f => {
    const out = f.replace('/src/', '/dist/').replace(/\.ts$/, '.js');
    return { path: out, sha256: h(`compiled ${from.files[f]}`) };
  });
  const modules = [
    { path: entry, sha256: h(at.files[entry]), origin: 'tree' },
    ...outputs.map(o => ({ ...o, origin: 'build', build: 'xtdb' })),
    { path: 'node_modules/effect/dist/index.js', sha256: h('effect'), origin: 'dependency' },
  ];
  return S.put({ format: FORMATS.manifest, receiptId, commit: at.commit, tree: at.tree, entrypoints: [entry], modules,
    builds: [{ id: 'xtdb', sourceRoots: roots, inputs, outputs }], lockfileSha256: h(at.files['pnpm-lock.yaml']) });
}

/**
 * A complete, valid receipt for one obligation at a commit; options introduce exactly one defect.
 * at: the commit the run really happened at; label: the source label it claims (relabelling attack).
 */
function receipt(S, o) {
  const ob = OBL.get(o.obligation);
  const at = o.at;
  const id = o.id;
  const role = o.role ?? 'prereq';
  const entry = o.verifier ? 'lab/bin/verify.mjs' : role === 'prereq' ? 'lab/bin/position.mjs' : 'lab/bin/ns.mjs';
  const base = { receiptId: id, commit: at.commit, obligation: ob.id };
  const modes = o.modes ?? ob.closure.modes;
  const evidence = [];
  if (!o.verifier) for (const caseId of requiredCases(REAL_CONTRACT, ob)) for (const mode of modes) {
    const verdict = o.fail?.[caseId] ?? 'PASS';
    const raw = S.put(`raw ${id} ${caseId} ${mode}`);
    const sha = S.put({ format: FORMATS.caseResult, ...base, caseId, mode, verdict, rawResultObject: raw });
    evidence.push({ kind: 'case-result', caseId, mode, verdict, objectSha256: sha });
  }
  if (ob.closure.rules.includes('CR-FAULT') && !o.verifier) {
    const injections = Array.from({ length: o.faultReps ?? 3 }, (_, i) => ({ t: i, durableEvidenceObject: S.put(`durable ${id} ${i}`) }));
    evidence.push({ kind: 'fault-witness', faultPointId: 'FX-CRASH-APPEND-RESOLUTION', objectSha256: S.put({ format: FORMATS.faultWitness, ...base, faultPointId: 'FX-CRASH-APPEND-RESOLUTION', injections }) });
  }
  if (o.ns) {
    const run = { format: FORMATS.nsRun, ...base, measurement: o.ns.measurement, slot: 'dev', windows: o.ns.windows ?? [{ from: 120, to: 720, burstPhase: 'steady-and-burst' }],
      trace: { generatorPath: 'lab/bench/trace.mjs', generatorSourceSha256: h(SRC['lab/bench/trace.mjs']), seed: o.ns.seed ?? SEED }, rawEventsObject: S.put(`events ${id}`) };
    evidence.push({ kind: 'ns-run', objectSha256: S.put(run) });
  }
  if (o.verifier) evidence.push({ kind: 'verifier-record', objectSha256: S.put({ format: FORMATS.verifierRecord, ...base, verifiesReceiptIds: o.verifier, mode: ob.verifierMode, mismatches: [], recomputedVerdictsObject: S.put(`recomputed ${id}`) }) });
  const r = {
    format: FORMATS.receipt, receiptId: id, runKind: o.runKind ?? 'acceptance', profile: o.profile ?? 'P-TINY',
    contract: { version: REAL_CONTRACT.version, transitiveSha256: REAL_CONTRACT.transitiveContractSha256 },
    obligations: [{ id: ob.id, definitionSha256: ob.definitionSha256 }],
    composition: structuredClone(o.composition),
    git: { commit: at.commit, tree: at.tree },
    profileIdentity: { sourceTreeSha256: (o.label ?? at).label, buildManifestSha256: manifest(S, { receiptId: id, at, from: o.builtFrom ?? at, entry, dropInput: o.dropInput }),
      lockfileSha256: h(at.files['pnpm-lock.yaml']), node: 'v22.23.2', pnpm: '10.0.0' },
    endpoint: { contacted: [o.endpoint ?? 'http://127.0.0.1:18123'], expected: [o.endpoint ?? 'http://127.0.0.1:18123'] },
    admission: { reservationId: `res-${id}`, status: o.admission ?? 'ADMITTED' },
    coRunners: [], timing: { start: o.start ?? T.run, end: T.end },
    counts: { declared: evidence.length, executed: evidence.length, skipped: o.skipped ?? 0, unsupported: 0, notImplemented: 0, unexpectedErrors: 0 },
    evidence,
    producer: { tool: 'lab/bin/gate.mjs', agentRole: o.verifier ? 'verifier' : 'coding', agentId: o.verifier ? 'agent-verifier' : 'agent-harness', authorsOfCodeUnderTest: ['agent-candidate-author'] },
  };
  return r;
}

// ---------------------------------------------------------------- the fixtures

export function buildFixtures(root) {
  fs.mkdirSync(root, { recursive: true });
  const repos = { null: makeRepo(path.join(root, 'repo-null'), 'null'), pinned: makeRepo(path.join(root, 'repo-pinned'), 'pinned'), w0: makeRepo(path.join(root, 'repo-w0'), 'w0') };
  const S = store(path.join(root, 'objects'));
  const fixtures = [];

  /** The complete positive claim: prerequisites for both compositions, own measurement, matched A0 control. */
  function complete(fx, { variant = 'pinned', at, obligation = 'NS.P2', kind = 'comparative', tweak = {} } = {}) {
    const R = repos[variant];
    at ??= R.C2;
    const ob = OBL.get(obligation);
    const domain = ob.oracles.includes('O-DOMAIN');
    const measurement = ob.closure.params.evidenceMeasurement ?? obligation.replace(/^NS\./, '');
    const promo = kind === 'promotion';
    const t = key => tweak[key] ?? {};
    const rc = (key, o) => receipt(S, { at, ...o, ...t(key), id: `${fx}:${key}` });
    const receipts = [
      rc('pos-cand', { obligation: 'G7.position.coordinates', composition: CANDIDATE }),
      rc('id-cand', { obligation: 'G10.composition.identity-bound', composition: CANDIDATE }),
      rc('pos-a0', { obligation: 'G7.position.coordinates', composition: A0 }),
      rc('id-a0', { obligation: 'G10.composition.identity-bound', composition: A0 }),
      ...(domain ? [rc('w0-cand', { obligation: 'W0.coverage-floors', composition: CANDIDATE })] : []),
      rc('meas', { obligation, composition: CANDIDATE, role: 'measurement', runKind: promo ? 'acceptance' : 'candidate', profile: promo ? 'P-NS' : 'P-SCREEN', ns: { measurement } }),
      rc('ctrl', { obligation, composition: A0, role: 'measurement', runKind: promo ? 'acceptance' : 'control', profile: promo ? 'P-NS' : 'P-SCREEN', ns: { measurement } }),
    ];
    if (promo) receipts.push(rc('verify', { obligation, composition: CANDIDATE, role: 'measurement', runKind: 'verifier', profile: 'P-NS', verifier: [`${fx}:meas`, `${fx}:ctrl`] }));
    return { format: FORMATS.claim, claimId: fx, kind, obligations: [obligation], commit: at.commit, sourceTreeSha256: at.label,
      composition: structuredClone(CANDIDATE), profile: promo ? 'P-NS' : 'P-SCREEN', control: { id: 'A0-XTDB', composition: structuredClone(A0) }, receipts };
  }
  const add = (id, source, expected, defect, variant, claim, { labOnly = false, authorityRef = 'main' } = {}) =>
    fixtures.push({ id, source, expected, defect, labOnly, repo: repos[variant].dir, authorityRef, claim });
  const without = (claim, ...keys) => ({ ...claim, receipts: claim.receipts.filter(r => !keys.some(k => r.receiptId.endsWith(`:${k}`))) });
  const zero = '0'.repeat(64);

  // -- ported from the generator's admit_claim self-check (build_contract.py, Q38b block)
  add('POSITIVE-NS-SCREENING', 'Q38b positive control, completed for Q42a', 'QUALIFIED', 'none: prerequisites for both compositions, NS.P2 screening measurement, matched A0 control, every oracle pinned', 'pinned', complete('POSITIVE-NS-SCREENING'));
  add('GEN-PREREQS-ONLY', 'Q38b positive control as compiled (= Q42a "prerequisites but no measurement")', 'DIAGNOSTIC', 'NS.P2 claim carrying only the position and identity receipts, no control (the generator\'s `good` claim)', 'pinned',
    (() => { const c = without(complete('GEN-PREREQS-ONLY'), 'pos-a0', 'id-a0', 'meas', 'ctrl'); delete c.control; return c; })());
  add('GEN-NULL-OREPLAY-PIN', 'Q38b / CX-CLAIM-NULL-ORACLE-PIN', 'DIAGNOSTIC', 'complete claim under contract 0.3.5 as compiled (O-REPLAY pin null)', 'null', complete('GEN-NULL-OREPLAY-PIN', { variant: 'null' }));
  add('GEN-SUPPLIED-NAMES', 'Q38b / CX-CLAIM-SUPPLIED-NAMES', 'DIAGNOSTIC', 'no receipts; positionCasesClosed and compositionBound supplied', 'pinned',
    { ...complete('GEN-SUPPLIED-NAMES'), receipts: [], positionCasesClosed: [...REAL_CONTRACT.positionRequiredCases], compositionBound: true });
  add('GEN-OTHER-TREE', 'Q38b; Q42a "falsifier receipt from an earlier commit" (honest label)', 'DIAGNOSTIC', 'candidate position receipt produced and labelled at the earlier commit C1', 'pinned',
    complete('GEN-OTHER-TREE', { tweak: { 'pos-cand': { at: repos.pinned.C1 } } }));
  add('GEN-MISSING-FALSIFIERS', 'Q38b / CX-SCREENING-CLAIM-PREREQ', 'DIAGNOSTIC', 'candidate position receipt with only the three dense cases (falsifiers open)', 'pinned',
    (() => { const c = complete('GEN-MISSING-FALSIFIERS'); const r = c.receipts[0]; r.evidence = r.evidence.filter(e => e.kind !== 'case-result' || e.caseId.startsWith('PO-') && e.caseId !== 'PO-ABORTED-LISTED'); r.counts.declared = r.counts.executed = r.evidence.length; return c; })());
  add('GEN-COMPOSITION-UNBOUND', 'Q38b / CX-COMPOSITION-UNBOUND', 'DIAGNOSTIC', 'history assignment has no slot, on the claim and every receipt', 'pinned',
    (() => { const c = complete('GEN-COMPOSITION-UNBOUND'); for (const x of [c.composition, ...c.receipts.filter(r => r.composition.current.engine === 'qlever').map(r => r.composition)]) delete x.history.slot; return c; })());
  add('POSITIVE-GS-DOMAIN', 'Q38b domain positive control, completed for Q42a', 'QUALIFIED', 'none: GS.05 with W0 pinned and a W0.coverage-floors receipt', 'w0', complete('POSITIVE-GS-DOMAIN', { variant: 'w0', obligation: 'GS.05' }));
  add('GEN-W0-NULL', 'Q38b / CX-W0-UNPINNED', 'DIAGNOSTIC', 'complete GS.05 claim while the W0 pin is null', 'pinned', complete('GEN-W0-NULL', { obligation: 'GS.05' }));
  add('GEN-NO-W0-RECEIPT', 'Q38b', 'DIAGNOSTIC', 'GS.05 claim without the W0.coverage-floors receipt', 'w0', without(complete('GEN-NO-W0-RECEIPT', { variant: 'w0', obligation: 'GS.05' }), 'w0-cand'));

  // -- Q42a counterexamples (Codex rounds 4 and 5)
  add('CODEX-R4-FABRICATED', 'Codex round 4 finding 4 (the fabricated receipt)', 'DIAGNOSTIC', 'all eight position cases PASS on all-zero object hashes, built from C1 under C2\'s source label', 'pinned',
    (() => { const c = complete('CODEX-R4-FABRICATED', { tweak: { 'pos-cand': { builtFrom: repos.pinned.C1 } } }); for (const e of c.receipts[0].evidence) e.objectSha256 = zero; return c; })());
  add('Q42A-ZERO-HASHES', 'Q42a "all-zero object hashes"', 'DIAGNOSTIC', 'candidate position case objects are all-zero hashes (nothing in the store)', 'pinned',
    (() => { const c = complete('Q42A-ZERO-HASHES'); for (const e of c.receipts[0].evidence) if (e.kind === 'case-result') e.objectSha256 = zero; return c; })());
  add('Q42A-STALE-BINARY', 'Q42a "stale binary under the same source label"', 'DIAGNOSTIC', 'candidate position run executed a build of C1\'s alloc.ts; receipt and manifest say C2', 'pinned',
    complete('Q42A-STALE-BINARY', { tweak: { 'pos-cand': { builtFrom: repos.pinned.C1 } } }));
  add('Q42A-BUILD-INPUT-OMITTED', 'Q42a manifest binding', 'DIAGNOSTIC', 'the build manifest omits alloc.ts from its inputs', 'pinned',
    complete('Q42A-BUILD-INPUT-OMITTED', { tweak: { 'pos-cand': { dropInput: true } } }));
  add('Q42A-EARLIER-COMMIT-RELABELLED', 'Q42a "falsifier receipt from an earlier commit"', 'DIAGNOSTIC', 'candidate position receipt produced at C1, relabelled with C2\'s source label', 'pinned',
    complete('Q42A-EARLIER-COMMIT-RELABELLED', { tweak: { 'pos-cand': { at: repos.pinned.C1, label: repos.pinned.C2 } } }));
  add('Q42A-STARTED-BEFORE-COMMIT', 'Q42a freshness', 'DIAGNOSTIC', 'candidate position receipt says C2 but started before C2 was committed', 'pinned',
    complete('Q42A-STARTED-BEFORE-COMMIT', { tweak: { 'pos-cand': { start: T.beforeC2 } } }));
  add('Q42A-OBJECT-CORRUPT', 'Q42a "bytes hash to the recorded value"', 'DIAGNOSTIC', 'one stored case object no longer hashes to its name', 'pinned',
    (() => { const c = complete('Q42A-OBJECT-CORRUPT'); S.corrupt(c.receipts[0].evidence[0].objectSha256); return c; })());
  add('Q42A-OBJECT-OF-OTHER-CASE', 'Q42a "opens and verifies the evidence"', 'DIAGNOSTIC', 'FX-ABORT-GAP points at FX-NESTED-CUTS\'s (real, intact) object', 'pinned',
    (() => { const c = complete('Q42A-OBJECT-OF-OTHER-CASE'); const ev = c.receipts[0].evidence; const nested = ev.find(e => e.caseId === 'FX-NESTED-CUTS' && e.mode === 'current'); ev.find(e => e.caseId === 'FX-ABORT-GAP' && e.mode === 'current').objectSha256 = nested.objectSha256; return c; })());
  add('Q42A-MODES-SHORT', 'Q42a "modes required by the obligation"', 'DIAGNOSTIC', 'candidate position receipt ran mode current only (reopen and engine-restart missing)', 'pinned',
    complete('Q42A-MODES-SHORT', { tweak: { 'pos-cand': { modes: ['current'] } } }));
  add('Q42A-FAULT-REPS-SHORT', 'Q42a "fault repetitions" / CX-FAULT-REPS-SHORT', 'DIAGNOSTIC', 'FX-CRASH-APPEND-RESOLUTION injected twice; T-FAULT-REPS is 3', 'pinned',
    complete('Q42A-FAULT-REPS-SHORT', { tweak: { 'pos-cand': { faultReps: 2 } } }));
  add('Q42A-UNKNOWN-ID', 'Q42a "unknown ids rejected, never dropped"', 'DIAGNOSTIC', 'obligations [NS.P2, NS.P9] with complete NS.P2 evidence', 'pinned',
    { ...complete('Q42A-UNKNOWN-ID'), obligations: ['NS.P2', 'NS.P9'] });
  add('Q42A-UNKNOWN-ID-ONLY', 'Q42a', 'DIAGNOSTIC', 'obligations [NS.P9] only', 'pinned', { ...complete('Q42A-UNKNOWN-ID-ONLY'), obligations: ['NS.P9'] });
  add('Q42A-NO-CONTROL', 'Q42a "matched control"', 'DIAGNOSTIC', 'NS.P2 measurement without any A0 control receipt', 'pinned', without(complete('Q42A-NO-CONTROL'), 'ctrl'));
  add('Q42A-CONTROL-OTHER-SEED', 'Q42a "A0 on the same slot, trace, seed and window"', 'DIAGNOSTIC', 'the A0 control ran seed 7', 'pinned',
    complete('Q42A-CONTROL-OTHER-SEED', { tweak: { ctrl: { ns: { measurement: 'P2', seed: 7 } } } }));
  add('Q42A-CONTROL-OTHER-WINDOW', 'Q42a "same window"', 'DIAGNOSTIC', 'the A0 control measured a different window', 'pinned',
    complete('Q42A-CONTROL-OTHER-WINDOW', { tweak: { ctrl: { ns: { measurement: 'P2', windows: [{ from: 720, to: 1320, burstPhase: 'steady-and-burst' }] } } } }));
  add('Q42A-CORRECTNESS-FAIL', 'Q42a "with their correctness checks"', 'DIAGNOSTIC', 'NS.P2 measurement with NS-P2-PROGRESS FAIL', 'pinned',
    complete('Q42A-CORRECTNESS-FAIL', { tweak: { meas: { fail: { 'NS-P2-PROGRESS': 'FAIL' } } } }));
  add('Q42A-WRONG-MEASUREMENT', 'CX-GS-WRONG-SCENARIO, Q42a "the claimed obligation\'s own measurement"', 'DIAGNOSTIC', 'the NS.P2 receipt carries a P1 ns-run (candidate and control alike)', 'pinned',
    complete('Q42A-WRONG-MEASUREMENT', { tweak: { meas: { ns: { measurement: 'P1' } }, ctrl: { ns: { measurement: 'P1' } } } }));
  add('Q42A-UNFROZEN-TRACE', 'CX-NS-UNFROZEN-TRACE (VA15)', 'DIAGNOSTIC', 'candidate and control matched on seed 7, which is not the frozen seed', 'pinned',
    complete('Q42A-UNFROZEN-TRACE', { tweak: { meas: { ns: { measurement: 'P2', seed: 7 } }, ctrl: { ns: { measurement: 'P2', seed: 7 } } } }));
  add('Q42A-CONTROL-NO-PREREQ', 'GATE-POSITION "A0 included" (Q38a)', 'DIAGNOSTIC', 'the A0 control composition has no position receipt', 'pinned', without(complete('Q42A-CONTROL-NO-PREREQ'), 'pos-a0'));
  add('Q34D-SCREENING-PREREQ', 'CX-SCREENING-CLAIM-PREREQ, VA16', 'DIAGNOSTIC', 'the candidate position receipt is a P-SCREEN receipt', 'pinned',
    complete('Q34D-SCREENING-PREREQ', { tweak: { 'pos-cand': { profile: 'P-SCREEN' } } }));
  add('Q42A-DIAGNOSTIC-RUN', 'B7', 'DIAGNOSTIC', 'the NS.P2 measurement is a diagnostic run', 'pinned', complete('Q42A-DIAGNOSTIC-RUN', { tweak: { meas: { runKind: 'diagnostic' } } }));
  add('POSITIVE-PROMOTION', 'Q42a "verifier evidence"', 'QUALIFIED', 'none: promotion on P-NS acceptance receipts with an independent verifier', 'pinned', complete('POSITIVE-PROMOTION', { kind: 'promotion' }));
  add('Q42A-PROMOTION-NO-VERIFIER', 'Q42a "verifier evidence"', 'DIAGNOSTIC', 'promotion claim without its verifier receipt', 'pinned', without(complete('Q42A-PROMOTION-NO-VERIFIER', { kind: 'promotion' }), 'verify'));
  add('Q42A-PROMOTION-ON-SCREENING', 'ACCEPTANCE 5.7, VA16', 'DIAGNOSTIC', 'promotion claim whose measurements are P-SCREEN candidate runs', 'pinned',
    complete('Q42A-PROMOTION-ON-SCREENING', { kind: 'promotion', tweak: { meas: { profile: 'P-SCREEN', runKind: 'candidate' } } }));
  add('Q42A-VERIFIER-IS-AUTHOR', 'VV1', 'DIAGNOSTIC', 'the verifier is an author of the code under test', 'pinned',
    (() => { const c = complete('Q42A-VERIFIER-IS-AUTHOR', { kind: 'promotion' }); c.receipts.find(r => r.runKind === 'verifier').producer.agentId = 'agent-candidate-author'; return c; })());

  // -- lab-only VA checks (Q41d: the lab adds full receipt validity; the structural reference cannot see these)
  const lab = { labOnly: true };
  add('LAB-BRANCH-PINS-OWN-ORACLE', 'VA6 (contract from the authority ref)', 'DIAGNOSTIC', 'claim at a branch commit whose obligations.json pins O-REPLAY; main still has it null', 'null',
    complete('LAB-BRANCH-PINS-OWN-ORACLE', { variant: 'null', at: repos.null.ROGUE }), lab);
  add('LAB-ORACLE-FILE-DRIFT', 'VA6 (oracle files equal the pin)', 'DIAGNOSTIC', 'O-OBS file edited after its pin; contract unchanged', 'pinned', complete('LAB-ORACLE-FILE-DRIFT', { at: repos.pinned.DRIFT }), lab);
  add('LAB-IMAGE-NOT-PINNED', 'VA4', 'DIAGNOSTIC', 'the candidate current index runs an unpinned QLever image', 'pinned',
    (() => { const c = complete('LAB-IMAGE-NOT-PINNED'); for (const x of [c.composition, ...c.receipts.filter(r => r.composition.current.engine === 'qlever').map(r => r.composition)]) x.current.imageDigest = 'sha256:' + 'e'.repeat(64); return c; })(), lab);
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

/** Runs the generator's admit_claim (0.3.5, on the structural projection) and the proposed Q42a model in one python process. */
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
  const rows = built.fixtures.map(f => ({ f, lab: evaluateLab(f, built.objects), ref: ref[f.id] }));
  console.log('| Fixture | Source | Defect | Expected | Ref 0.3.5 | Ref Q42a (proposed) | Lab | Lab reasons |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const { f, lab, ref: x } of rows) {
    const codes = [...new Set(lab.reasons.map(r => r.code))].join(', ');
    console.log(`| ${f.id}${f.labOnly ? ' (lab-only VA)' : ''} | ${f.source} | ${f.defect} | ${f.expected} | ${x.ref035} | ${x.refQ42a} | ${lab.verdict} | ${codes || '-'} |`);
  }
  if (keep < 0) fs.rmSync(root, { recursive: true, force: true });
}
