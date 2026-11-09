#!/usr/bin/env node
// @ts-nocheck -- [EXP-CHECKJS] runtime-populated records, optional option bags, or branch-specific union members; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing; option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
import { readLatencyRun } from "../receipts/parse.ts";
import { latencyReceipt, requireQleverConnectionMode } from "../receipts/latency.mjs";
// lab/bin/gate.mjs <G0|G1|G2|G4|GS> --lane xtdb|qlever [--slot dev] [--exp EXP-NNN] [--note TEXT]
//   [--previous RUN-ID] [--holder NAME] [--cases N (G1 subset)] [--workloads 01,02 (G2 subset)]
//   [--profile default|bounded|f1 (QLever query-plan profile)] [--planner-budget N (QLever, set+restore)]
// lab/bin/gate.mjs PAIR --lane xtdb --slots s1,s3 --mode aa|ab --rounds 8 [--series screening-b180] [--rung 10k]
//   [--composition public] [--claim superiority:1.25|hold:1.10] [--probe-per-s 20] [--raw-archive DIR] (EXP-M01, PAIR-0)
//
// Writes an append-only receipt lab/runs/<gate>/<run-id>.json and raw output under
// runs/<gate>/<run-id>/ (gitignored). Preimages go to the content-addressed store runs/objects/.
//
// [EXP-000] Why: receipts bind what actually executed (review r1 finding 4, r2 finding 13): the
// source tree including uncommitted and untracked inputs, the lockfile, toolchain, every built
// dist file (built here first; the qualification loader imports dist, so a stale build would
// otherwise run), gate/entry/oracle/fixture bytes, raw outcome bytes, the engine image, config
// and the endpoint actually contacted. Gates fail closed: any skip outside the reviewed list,
// zero executions, a missing identity field or a wrong endpoint is FAIL. Subsets are PASS_SUBSET,
// never PASS.
// Rejected: vitest JSON only (no engine identity); the homebase devloop receipts (format bound
// to its controller); overwriting a receipt on rerun (a rerun is a new run id with --previous).
import { GS_LANES, brokerEnv, gsRefusals } from '../scenarios/lib/policy.mjs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cgroupOf, cpuList, effectiveConfig, probe, regimeOf } from './engine.mjs';
import { acquireHeavy, acquireMeasureLease } from './heavy-lock.mjs';
import { PAIR_LOOKS, RUN_KINDS, caseLanguages, contractClaims, pairVerdictOf, placementProblems, tallyLanguages, verdictOf } from './receipt.mjs';
import {
  REPO, MAIN, LOCKS, SLOTS_FILE, defaultHolder, vmDisk, docker, dockerStats, fail, inspect, listTx2Containers, loadSlots, main, now, parseArgs,
  readJson, readOwner, runLogged, withDirLock, sha256, sha256File, slotInfo, sourceIdentity, storeFile, storeObject, treeFiles, volumeBytes,
} from './lib.mjs';

const PACKAGES = {
  host: { dir: 'packages/host', filter: '@triplex-build/triplex-host' },
  w0: { filter: '@triplex-build/w0', dir: 'packages/w0' },
  datomic: { filter: '@triplex-build/triplex-datomic', dir: 'packages/datomic' },
  core: { filter: '@triplex-build/triplex', dir: 'packages/core' },
  testkit: { filter: '@triplex-build/triplex-testkit', dir: 'packages/testkit' },
  xtdb: { filter: '@triplex-build/triplex-xtdb', dir: 'packages/xtdb' },
  qlever: { filter: '@triplex-build/triplex-qlever', dir: 'packages/qlever' },
  qualification: { filter: '@triplex-build/triplex-qualification', dir: 'packages/qualification' },
};
// [CX-A01-040] Why: NS/PAIR need W0 and FD01 needs host in every lane. Rejected: discarding either accepted dependency binding.
const lanePackages = (lane, gate) => ['core', 'host', 'testkit', lane, 'qualification', ...(['NS', 'PAIR', 'GS'].includes(gate) ? ['w0'] : [])];
// [EXP-A01-0313-R2] Why: dry-run and execution share W02's GS policy and DA01's G0/G1 admission. Rejected: admitting Datomic for unimplemented G2/G4/NS routes or losing its GS lane.
const gateLanes = gate => gate === 'GS' ? GS_LANES : ['xtdb', 'qlever', ...(['G0', 'G1'].includes(gate) ? ['datomic'] : [])];
const EXPECTED_SKIPS = path.join(REPO, 'lab/config/g0-expected-skips.json');
const PACKET = 'qualification/workloads/temporal-workloads.json';
const FULL_G2_EXECUTIONS = 142;
const FULL_G1_CASES = 44;

// Environment flags that turn live tests on; G0 removes them so its skip list is deterministic.
// [EXP-A01-0313-R2] Why: G0 clears both Datomic and W02 broker/live overrides; either parent's environment list alone leaks the other lane's settings. Rejected: choosing one whole conflict side.
const LIVE_FLAGS = ['DATOMIC_INTEGRATION', 'XTDB_INTEGRATION', 'QLEVER_INTEGRATION', 'TRIPLEX_INTEGRATION', 'TRIPLEX_CONFORMANCE_CASES', 'XTDB_CONFORMANCE_CASES', 'TRIPLEX_DUCKDB'];
const ENGINE_ENV = ['DATOMIC_URL', 'DATOMIC_GATEWAY_URL', 'XTDB_URL', 'QLEVER_URL', 'QLEVER_ACCESS_TOKEN', 'QLEVER_ACCESS_TOKEN_FILE', 'TRIPLEX_BACKEND', 'TRIPLEX_QUERY_PATH',
  'QLEVER_COMMIT_PATH', 'QLEVER_BROKER_DIR', 'TRIPLEX_RESOURCE_ADMISSION', 'TRIPLEX_RESOURCE_ADMISSION_SHA256', 'TRIPLEX_RUN_ARTIFACTS', 'TRIPLEX_RUN_DIRECTORY', 'TRIPLEX_LAB_SLOT_OWNER'];
const cleanEnv = extra => {
  const env = { ...process.env };
  for (const key of [...LIVE_FLAGS, ...ENGINE_ENV]) delete env[key];
  for (const key of Object.keys(env)) if (key.startsWith('QLEVER_') && key.endsWith('_PLAN')) delete env[key];
  return { ...env, ...extra };
};

class Run {
  constructor(gate, lane, options) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    this.gate = gate; this.lane = lane; this.options = options;
    this.runId = `${gate}-${lane}-${stamp}-${randomBytes(3).toString('hex')}`;
    this.rawDir = path.join(REPO, 'runs', gate, this.runId);
    this.receiptPath = path.join(REPO, 'lab/runs', gate, `${this.runId}.json`);
    fs.mkdirSync(path.dirname(this.rawDir), { recursive: true });
    fs.mkdirSync(this.rawDir); // exclusive leaf: a run id is never reused
    if (fs.existsSync(this.receiptPath)) fail('RECEIPT', `receipt ${this.receiptPath} exists; receipts are append-only`);
    this.reasons = []; this.steps = []; this.objects = []; this.firstFailures = [];
    this.startedAt = now(); this.t0 = Date.now();
  }
  raw(name) { return path.join(this.rawDir, name); }
  rel(file) { return path.relative(REPO, file); }
  reason(text) { this.reasons.push(text); }
  failure(entry) { if (this.firstFailures.length < 10) this.firstFailures.push(entry); }
  store(file, role) { const entry = storeFile(file, { role }); this.objects.push(entry); return entry; }
  storeBytes(bytes, role, label) { const digest = storeObject(bytes); const entry = { path: label, role, bytes: bytes.length, sha256: digest }; this.objects.push(entry); return entry; }
  async step(name, command, args, { cwd = REPO, env, heavy = false, timeoutMs } = {}) {
    const safe = name.replace(/[^a-z0-9.-]+/gi, '-');
    const stdoutFile = this.raw(`${safe}.stdout.txt`), stderrFile = this.raw(`${safe}.stderr.txt`);
    // [EXP-M01R] Why: the required heavy.mjs wrapper already owns this gate; a second permit can starve its build. Rejected: raising the pool limit.
    let parentGrant;
    if (heavy) {
      for (let slot = 1; slot <= 4; slot++) {
        const file = path.join(LOCKS, 'heavy', String(slot), 'owner.json');
        const owner = readJson(file, null);
        if (owner?.pid === process.ppid) { parentGrant = { slot, owner, proof: this.store(file, 'heavy-parent-grant') }; break; }
      }
    }
    const release = heavy && !parentGrant ? await acquireHeavy(`${this.runId} ${name}`) : () => {};
    let result;
    try { result = await runLogged(command, args, { cwd, env: env ?? cleanEnv(), stdoutFile, stderrFile, timeoutMs }); }
    finally { release(); }
    const record = { name, ...(parentGrant ? { parentGrant } : {}), ...result, cwd: this.rel(cwd) || '.', stdout: this.rel(stdoutFile), stderr: this.rel(stderrFile) };
    this.steps.push(record);
    if (result.code !== 0) {
      const tail = (fs.readFileSync(stderrFile, 'utf8') + fs.readFileSync(stdoutFile, 'utf8')).trim().split('\n').slice(-15).join('\n');
      record.tail = tail.slice(-3000);
    }
    return record;
  }
}

// ---------------------------------------------------------------- build and identity

async function build(run) {
  const filters = lanePackages(run.lane, run.gate).flatMap(name => ['--filter', PACKAGES[name].filter]);
  const step = await run.step('build', 'pnpm', [`--config.store-dir=${path.join(MAIN, '.pnpm-store')}`, ...filters, 'build'], { heavy: true, env: cleanEnv() });
  if (step.code !== 0) { run.reason(`build failed (exit ${step.code})`); run.failure({ step: 'build', tail: step.tail }); }
  return hashDist(run, 'build-manifest.json');
}

function hashDist(run, name) {
  const packages = {};
  for (const pkg of lanePackages(run.lane, run.gate)) {
    const files = treeFiles(path.join(REPO, PACKAGES[pkg].dir, 'dist'));
    if (files.length === 0) run.reason(`no built files in ${PACKAGES[pkg].dir}/dist`);
    packages[pkg] = { files: files.length, bytes: files.reduce((s, f) => s + f.bytes, 0), sha256: sha256(files.map(f => `${f.sha256}  ${f.path}\n`).join('')), list: files };
  }
  const manifest = { format: 'tx2-build-manifest/1', packages };
  fs.writeFileSync(run.raw(name), JSON.stringify(manifest, null, 2) + '\n');
  const object = run.store(run.raw(name), 'build-manifest');
  return { manifestSha256: object.sha256, manifest: run.rel(run.raw(name)), packages: Object.fromEntries(Object.entries(packages).map(([k, v]) => [k, { files: v.files, bytes: v.bytes, sha256: v.sha256 }])) };
}

function identity(run) {
  const id = sourceIdentity();
  const { diff, ...git } = id;
  if (diff.length) run.storeBytes(diff, 'git-diff-head-binary', 'git diff HEAD --binary');
  for (const file of [...id.modifiedFiles, ...id.untrackedFiles]) {
    if (file.deleted || file.kind || file.secretLike) continue;
    run.store(path.join(REPO, file.path), id.untrackedFiles.includes(file) ? 'untracked-input' : 'modified-input');
  }
  return git;
}

async function toolchain(run) {
  const pnpm = await run.step('pnpm-version', 'pnpm', [`--config.store-dir=${path.join(MAIN, '.pnpm-store')}`, '--version']);
  const version = fs.readFileSync(run.raw('pnpm-version.stdout.txt'), 'utf8').trim();
  return { node: process.version, pnpm: pnpm.code === 0 ? version : null, platform: `${process.platform}-${process.arch}` };
}

function fileHashes(run, files, role) {
  const out = {};
  for (const file of files) {
    const absolute = path.join(REPO, file);
    if (!fs.existsSync(absolute)) { run.reason(`missing ${role} file ${file}`); out[file] = null; continue; }
    out[file] = run.store(absolute, role).sha256;
  }
  return out;
}

// ---------------------------------------------------------------- engine binding

function engineBinding(run, config, slotName = run.options.slot ?? 'dev') {
  const info = slotInfo(config, run.lane, slotName);
  const owner = readOwner(info);
  if (!owner) { run.reason(`slot ${info.lane}-${info.slot} has no lock owner; run lab/bin/engine.mjs up first`); return { info }; }
  if (info.mode === 'exclusive' && owner.holder !== defaultHolder(run.options))
    run.reason(`slot ${info.lane}-${info.slot} is held by "${owner.holder}", not "${defaultHolder(run.options)}"`);
  if (owner.endpoint !== info.endpoint) run.reason(`slot owner endpoint ${owner.endpoint} differs from slots.json ${info.endpoint}`);
  const c = inspect(info.container);
  if (!c?.State.Running) { run.reason(`${info.container} is not running`); return { info, owner }; }
  const eff = effectiveConfig(config, info);
  const label = c.Config.Labels?.['tx2.config-sha256'];
  if (label !== eff.sha256) run.reason(`${info.container} config ${label} differs from effective ${eff.sha256}`);
  if (c.Image !== info.laneConf.imageId) run.reason(`${info.container} image ${c.Image} is not the pinned ${info.laneConf.imageId}`);
  const image = JSON.parse(docker(['image', 'inspect', c.Image]))[0];
  run.storeBytes(Buffer.from(JSON.stringify(eff.effective, null, 2) + '\n'), 'engine-effective-config', `${info.lane}-${info.slot} effective config`);
  for (const file of Object.values(eff.files)) run.storeBytes(fs.readFileSync(file), 'engine-config-file', path.basename(file));
  return {
    info, owner,
    engine: {
      container: info.container, containerId: c.Id, startedAt: c.State.StartedAt, imageId: c.Image, repoDigests: image.RepoDigests,
      configSha256: label, effectiveConfig: eff.effective, endpoint: info.endpoint, port: info.port, memCapBytes: c.HostConfig.Memory,
      nanoCpus: c.HostConfig.NanoCpus, ownerSha256: sha256File(info.ownerFile), holder: owner.holder,
    },
  };
}

/** docker stats every few seconds for every container; peak memory/CPU and who co-ran. */
function startSampler(intervalMs = 3000) {
  const peaks = {};
  let busy = false;
  const sample = () => {
    if (busy) return; busy = true;
    try {
      for (const row of dockerStats()) {
        const peak = peaks[row.name] ??= { samples: 0, peakMemBytes: 0, peakCpuPercent: 0, memLimitBytes: row.memLimitBytes };
        peak.samples++;
        peak.peakMemBytes = Math.max(peak.peakMemBytes, row.memBytes ?? 0);
        peak.peakCpuPercent = Math.max(peak.peakCpuPercent, Number.isFinite(row.cpuPercent) ? row.cpuPercent : 0);
      }
    } finally { busy = false; }
  };
  sample();
  const timer = setInterval(sample, intervalMs);
  return () => { clearInterval(timer); sample(); return peaks; };
}

// ---------------------------------------------------------------- G0

function vitestOutcome(run, pkg, file, expected, counts) {
  const report = readJson(file, null);
  if (!report) { run.reason(`${pkg}: no vitest JSON report`); return; }
  for (const suite of report.testResults ?? []) {
    const rel = path.relative(REPO, suite.name);
    if (suite.status === 'failed' && !(suite.assertionResults ?? []).some(a => a.status === 'failed')) {
      counts.fail++; run.reason(`${pkg}: test file ${rel} failed to run`); run.failure({ package: pkg, file: rel, message: String(suite.message).slice(0, 2000) });
    }
    for (const test of suite.assertionResults ?? []) {
      const key = `${rel} :: ${test.fullName}`;
      if (test.status === 'passed') counts.pass++;
      else if (test.status === 'failed') {
        counts.fail++;
        run.failure({ package: pkg, test: key, message: (test.failureMessages ?? []).join('\n').slice(0, 2000) });
      } else {
        counts.skip++;
        if (expected.has(key)) counts.expectedSkip++;
        else { counts.unexpectedSkip++; counts.unexpectedSkips.push(key); }
        counts.observedSkips.push(key);
      }
    }
  }
}

function tapOutcome(run, name, file, counts) {
  const text = fs.readFileSync(file, 'utf8');
  const field = key => Number((new RegExp(`^# ${key} (\\d+)$`, 'm').exec(text) ?? [])[1] ?? NaN);
  const tests = field('tests'), pass = field('pass'), failed = field('fail'), skipped = field('skipped'), todo = field('todo'), cancelled = field('cancelled');
  if (!Number.isFinite(tests)) { run.reason(`${name}: no TAP summary`); return; }
  counts.pass += pass; counts.fail += failed + cancelled; counts.skip += skipped + todo;
  if (skipped + todo) { counts.unexpectedSkip += skipped + todo; counts.unexpectedSkips.push(`${name}: ${skipped + todo} node:test skips`); }
  for (const match of text.matchAll(/^not ok \d+ - (.*)$/gm)) run.failure({ suite: name, test: match[1] });
}

async function gateG0(run) {
  const result = {};
  result.build = await build(run);
  // [EXP-CHECKJS] Why: importing JS leaves dormant name errors unchecked. Rejected:
  // package-only tsc (does not include the lab's evidence-producing JavaScript).
  const checkjs = await run.step('lab-checkjs', 'node', ['lab/bin/checkjs.mjs'], { heavy: true });
  if (checkjs.code !== 0) { run.reason(`lab checkJs failed (exit ${checkjs.code})`); run.failure({ step: 'lab-checkjs', tail: checkjs.tail }); }
  const pkgs = lanePackages(run.lane, run.gate);
  const typecheck = await run.step('typecheck', 'pnpm', [...pkgs.flatMap(p => ['--filter', PACKAGES[p].filter]), 'typecheck'], { heavy: true });
  if (typecheck.code !== 0) { run.reason(`typecheck failed (exit ${typecheck.code})`); run.failure({ step: 'typecheck', tail: typecheck.tail }); }
  const expectedFile = readJson(EXPECTED_SKIPS, null);
  if (!expectedFile) run.reason('lab/config/g0-expected-skips.json is missing');
  const counts = { pass: 0, fail: 0, skip: 0, expectedSkip: 0, unexpectedSkip: 0, unexpectedSkips: [], observedSkips: [] };
  for (const pkg of pkgs) {
    const out = run.raw(`vitest-${pkg}.json`);
    const step = await run.step(`vitest-${pkg}`, 'pnpm', ['--filter', PACKAGES[pkg].filter, 'exec', 'vitest', 'run', '--reporter=json', `--outputFile=${out}`], { heavy: true });
    vitestOutcome(run, pkg, out, new Set(expectedFile?.skips?.[pkg] ?? []), counts);
    if (step.code !== 0 && !counts.fail) run.reason(`vitest ${pkg} exited ${step.code} without a failed test`);
    if (fs.existsSync(out)) run.store(out, 'raw-outcome');
  }
  const nodeQual = await run.step('node-test-qualification', 'node', ['--test', '--test-reporter=tap', '../../qualification/compare.test.mjs', 'load/dispatch.test.ts', 'load/model.test.ts'], { cwd: path.join(REPO, 'packages/qualification'), heavy: true });
  tapOutcome(run, 'node-test-qualification', path.join(REPO, nodeQual.stdout), counts);
  const engineCases = await run.step('node-test-engine-cases', 'node', ['--test', '--test-reporter=tap', 'qualification/workloads/test_engine_cases.mjs']);
  tapOutcome(run, 'node-test-engine-cases', path.join(REPO, engineCases.stdout), counts);
  // [EXP-N01] NS driver unit tests: trace determinism and frozen schedule, histogram accuracy, scheduled-time latency, world counts, feed consumer.
  const bench = await run.step('node-test-ns-bench', 'node', ['--test', '--test-reporter=tap', 'lab/bench/test/bench.test.ts', 'lab/bench/test/p3.test.mjs', 'lab/bench/test/nsr.test.mjs', 'lab/bench/test/paired.test.ts', 'lab/bench/test/noise.test.ts', 'lab/bench/test/single.test.ts']);
  tapOutcome(run, 'node-test-ns-bench', path.join(REPO, bench.stdout), counts);
  for (const step of [nodeQual, engineCases, bench]) if (step.code !== 0) run.reason(`${step.name} exited ${step.code}`);
  const validate = await run.step('oracle-validate-workloads', 'python3', ['-B', 'qualification/workloads/validate_workloads.py']);
  const verdict = (() => { try { return JSON.parse(fs.readFileSync(path.join(REPO, validate.stdout), 'utf8')); } catch { return null; } })();
  if (validate.code !== 0 || verdict?.result !== 'PASS' || verdict.checked_cases !== 71 || verdict.unchecked_case_ids?.length) {
    counts.fail++; run.reason('packet oracle self-check did not PASS with 71 checked cases'); run.failure({ step: 'oracle-validate-workloads', verdict });
  } else counts.pass += verdict.checked_cases;
  const unittest = await run.step('oracle-unittest', 'python3', ['-B', '-m', 'unittest', '-v', 'test_event_oracles'], { cwd: path.join(REPO, 'qualification/workloads') });
  const ut = fs.readFileSync(path.join(REPO, unittest.stderr), 'utf8');
  const ran = Number((/^Ran (\d+) tests?/m.exec(ut) ?? [])[1] ?? 0);
  const skippedUt = Number((/skipped=(\d+)/.exec(ut) ?? [])[1] ?? 0);
  if (unittest.code !== 0 || ran === 0 || !/^OK/m.test(ut)) { counts.fail++; run.reason('oracle unittest failed'); run.failure({ step: 'oracle-unittest', tail: unittest.tail }); }
  else counts.pass += ran - skippedUt;
  if (skippedUt) { counts.skip += skippedUt; counts.unexpectedSkip += skippedUt; counts.unexpectedSkips.push(`oracle-unittest: ${skippedUt} skips`); }
  for (const step of run.steps.filter(s => s.name !== 'pnpm-version' && s.name !== 'build')) {
    for (const file of [step.stdout, step.stderr]) run.store(path.join(REPO, file), 'raw-outcome');
  }
  if (counts.unexpectedSkip) run.reason(`${counts.unexpectedSkip} unexpected skips (not in lab/config/g0-expected-skips.json)`);
  fs.writeFileSync(run.raw('observed-skips.json'), JSON.stringify(Object.fromEntries(pkgs.map(pkg => [pkg, counts.observedSkips.filter(k => k.startsWith(PACKAGES[pkg].dir + '/'))])), null, 2) + '\n');
  const executed = counts.pass + counts.fail;
  if (executed === 0) run.reason('zero executed tests');
  if (counts.fail) run.reason(`${counts.fail} failed tests`);
  result.counts = { executed, pass: counts.pass, fail: counts.fail, skip: counts.skip, expectedSkip: counts.expectedSkip, unexpectedSkip: counts.unexpectedSkip };
  result.unexpectedSkips = counts.unexpectedSkips.slice(0, 50);
  result.fixtures = fileHashes(run, [PACKET, 'qualification/workloads/event_oracles.py', 'qualification/workloads/validate_workloads.py',
    'qualification/workloads/test_event_oracles.py', 'qualification/workloads/engine_cases.mjs', 'qualification/workloads/test_engine_cases.mjs',
    'qualification/adapter/scale-fixture.mjs', 'lab/config/g0-expected-skips.json'], 'oracle-fixture');
  result.packet = packetIdentity();
  result.scope = 'full';
  return result;
}

function packetIdentity() {
  const bytes = fs.readFileSync(path.join(REPO, PACKET));
  const packet = JSON.parse(bytes);
  return { id: `${packet.format}@sha256:${sha256(bytes)}`, format: packet.format, sha256: sha256(bytes), workloads: packet.workloads.length, cases: packet.workloads.reduce((s, w) => s + w.cases.length, 0) };
}

// ---------------------------------------------------------------- G1 and G2

// [EXP-002] Why: the homebase qualified unchanged44 only under its explicit F1 profile (persisted
// source, eligible MINUS, paired retirement, bounded aggregate answers, planner threshold 1;
// wiki/problems/qlever-planner-memory.md, qualification/qlever-live/planner-budget-wave1.json).
// cleanEnv strips QLEVER_*_PLAN so no profile leaks in from the shell; a profile is now named on
// the command line and recorded in the receipt. Rejected: reading the plan variables from the
// caller's environment (an unrecorded shell export would change what an obligation means).
const QLEVER_PROFILES = {
  default: {},
  // qualification/qlever-live/upstream44-bounded-v2.json: the homebase unchanged44 pass profile.
  bounded: { QLEVER_AGGREGATE_ANSWER_PLAN: 'bounded' },
  // planner-budget-wave1.json fixedProfile (with --planner-budget 1): the homebase F arm.
  f1: { QLEVER_AGGREGATE_ANSWER_PLAN: 'bounded', QLEVER_NEGATION_PLAN: 'minus', QLEVER_SOURCE_PLAN: 'persisted', QLEVER_RETIREMENT_PLAN: 'paired' },
};

/** QLever server settings over the admin GET API (the lab server runs with --no-access-check). */
async function qleverSettings(endpoint, set) {
  const target = new URL(endpoint);
  if (set) for (const [key, value] of Object.entries(set)) target.searchParams.set(key, value);
  else target.searchParams.set('cmd', 'get-settings');
  const response = await fetch(target, { signal: AbortSignal.timeout(5000), redirect: 'error' });
  const text = await response.text();
  if (!response.ok) throw new Error(`QLever settings HTTP ${response.status}: ${text.slice(0, 200)}`);
  return set ? text : JSON.parse(text);
}

// [EXP-002] Why: query-planning-budget is one server-wide runtime parameter (source default 1500;
// the homebase pinned 100 and qualified F at 1). A run that selects a budget sets it, verifies the
// read-back, and restores the value it found, all recorded; every QLever run records the budget it
// observed before and after. The setting chooses planner algorithms; it is not a memory ceiling.
async function plannerBefore(run, result, bound) {
  if (bound.info.lane !== 'qlever') return null;
  const wanted = run.options['planner-budget'];
  const planner = result.planner = { requested: wanted ?? null };
  try {
    const before = await qleverSettings(bound.info.endpoint);
    run.storeBytes(Buffer.from(JSON.stringify(before, null, 2) + '\n'), 'engine-settings-before', 'qlever get-settings before');
    planner.before = before['query-planning-budget'];
    if (wanted === undefined) { planner.effective = planner.before; return null; }
    if (!/^[0-9]+$/.test(String(wanted))) fail('USAGE', '--planner-budget must be a decimal integer');
    await qleverSettings(bound.info.endpoint, { 'query-planning-budget': String(wanted) });
    planner.selected = (await qleverSettings(bound.info.endpoint))['query-planning-budget'];
    if (planner.selected !== String(wanted)) run.reason(`query-planning-budget read back ${planner.selected}, wanted ${wanted}`);
    planner.effective = planner.selected;
    return planner.before;
  } catch (error) { run.reason(`planner setting failed before the run: ${error.message}`); return planner.before ?? null; }
}
async function plannerAfter(run, result, bound, restoreTo) {
  if (bound.info.lane !== 'qlever' || !result.planner) return;
  const planner = result.planner;
  try {
    if (restoreTo !== null && restoreTo !== undefined) {
      await qleverSettings(bound.info.endpoint, { 'query-planning-budget': restoreTo });
      planner.restoredTo = restoreTo;
    }
    const after = await qleverSettings(bound.info.endpoint);
    run.storeBytes(Buffer.from(JSON.stringify(after, null, 2) + '\n'), 'engine-settings-after', 'qlever get-settings after');
    planner.after = after['query-planning-budget'];
    const expected = restoreTo ?? planner.before;
    if (planner.after !== expected) run.reason(`query-planning-budget after the run is ${planner.after}, expected ${expected} (changed by a co-runner or restore failed)`);
  } catch (error) { run.reason(`planner setting read or restore failed after the run: ${error.message}`); }
}

async function engineGate(run, config, entry) {
  const result = {};
  result.build = await build(run);
  // [EXP-W01b] Why: a failed build must not run stale dist against a shared engine. Rejected:
  // continuing for diagnostics (those results cannot qualify the source this receipt names).
  if (run.steps.find(s => s.name === 'build')?.code !== 0) return { result, step: null, bound: null };
  const bound = engineBinding(run, config);
  result.engine = bound.engine ?? null;
  if (!bound.engine) return { result, step: null, bound: null };
  const ready = await probe(bound.info);
  if (!ready.ok) run.reason(`${bound.info.container} not ready before the run: ${ready.why}`);
  const profileName = run.options.profile ?? 'default';
  const profile = bound.info.lane === 'qlever' ? QLEVER_PROFILES[profileName] : profileName === 'default' ? {} : undefined;
  if (!profile) fail('USAGE', `unknown --profile ${profileName} for lane ${bound.info.lane}`);
  result.profile = { name: profileName, env: profile };
  const env = cleanEnv({
    [bound.info.laneConf.envVar]: bound.info.endpoint,
    TRIPLEX_LAB_SLOT_OWNER: bound.info.ownerFile,
    TRIPLEX_QUERY_PATH: entry.queryPath,
    ...profile,
    ...(entry.extraEnv ?? {}),
  });
  result.queryPath = entry.queryPath;
  result.diskBefore = vmDisk(config);
  const restoreTo = await plannerBefore(run, result, bound);
  const stop = startSampler();
  let step;
  try { step = await run.step(entry.name, 'node', entry.args, { env, timeoutMs: entry.timeoutMs, heavy: !!entry.heavy }); }
  finally { result.containers = stop(); await plannerAfter(run, result, bound, restoreTo); }
  result.coRunning = listTx2Containers().map(c => ({ name: c.name, memCapBytes: c.memBytes, nanoCpus: c.nanoCpus, health: c.health }));
  result.volumeBytes = volumeBytes(config, bound.info.volume);
  result.diskAfter = vmDisk(config);
  if (step.timedOut) run.reason(`${entry.name} timed out after ${entry.timeoutMs / 1000}s`);
  // The bytes the run imported must still be the bytes we hashed.
  const after = hashDist(run, 'build-manifest-after.json');
  for (const [pkg, value] of Object.entries(after.packages))
    if (value.sha256 !== result.build.packages[pkg]?.sha256) run.reason(`${pkg} dist changed during the run`);
  const still = inspect(bound.info.container);
  if (still?.Id !== bound.engine.containerId || still?.State.StartedAt !== bound.engine.startedAt) run.reason(`${bound.info.container} restarted or was replaced during the run`);
  for (const file of [step.stdout, step.stderr]) run.store(path.join(REPO, file), 'raw-outcome');
  return { result, step, bound };
}

async function gateG1(run, config) {
  const output = run.raw('g1-report.json');
  const args = ['packages/qualification/workloads/lab-conformance.ts', '--output', output];
  if (run.options.cases) args.push('--cases', String(run.options.cases));
  const { result, step, bound } = await engineGate(run, config, { name: 'lab-conformance', queryPath: `${run.lane}-datalog`, args, timeoutMs: 45 * 60_000 });
  if (!bound) return result;
  result.fixtures = fileHashes(run, ['packages/testkit/src/index.ts', 'packages/qualification/workloads/lab-conformance.ts', ...(run.lane === 'datomic' ? ['packages/testkit/src/routeEquivalence.ts', 'packages/testkit/src/routeHistory.ts', 'packages/datomic/test/route-equivalence.test.ts', 'packages/datomic/test/query-route-matrix.ts', 'packages/datomic/test/canonical-query-properties.ts', ...fs.readdirSync(path.join(REPO, 'lab/oracles/replay')).filter(name => name.endsWith('.py')).map(name => `lab/oracles/replay/${name}`)] : [])], 'oracle-fixture');
  // [CX-A01-040] Why: retain Datomic fixtures and validate QLever timing bytes together. Rejected: dropping either accepted gate boundary.
  const timingRun = readLatencyRun(output, { lane: run.lane, expectedMode: run.lane === "qlever" ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive") : null }).unwrap();
  const report = timingRun.data;
  if (!report) { run.reason('no G1 report written'); run.failure({ step: step.name, tail: step.tail }); return result; }
  run.store(output, 'raw-outcome');
  // [EXP-DA01] Why: each G1 scope owns a separate database and peer resources. Rejected: leaving 89 live databases per run.
  if (run.lane === 'datomic') {
    const cleanup = [];
    for (const scope of new Set([report.suite?.scope, ...(report.executions ?? []).map(e => e.scope)].filter(Boolean))) {
      try {
        const response = await fetch(`${bound.info.endpoint}/v1/db/delete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scope }), signal: AbortSignal.timeout(5000) });
        const body = await response.json();
        cleanup.push({ scope, status: response.status, body });
        if (!response.ok || body.deleted !== true) run.reason(`Datomic test database cleanup failed: ${scope}`);
      } catch (error) { cleanup.push({ scope, error: String(error) }); run.reason(`Datomic cleanup transport failure: ${scope}`); }
    }
    run.storeBytes(Buffer.from(JSON.stringify(cleanup, null, 2) + '\n'), 'test-database-cleanup', 'datomic G1 cleanup');
    fs.writeFileSync(run.raw('datomic-cleanup.json'), JSON.stringify(cleanup, null, 2) + '\n');
  }

  // [EXP-DA01] Why: Q89f requires oracle-backed route equivalence whenever lane D read routes change. Rejected: calling G1's unchanged 44 cases sufficient coverage for physical-route pins.
  if (run.lane === 'datomic') {
    const routeOutput = run.raw('route-equivalence.json');
    const routes = await run.step('route-equivalence', process.execPath,
      ['node_modules/vitest/vitest.mjs', 'run', 'packages/datomic/test/route-equivalence.test.ts', '--disableConsoleIntercept', '--silent=false', '--reporter=json', '--outputFile', routeOutput],
      { heavy: true, timeoutMs: 180000, env: cleanEnv({ DATOMIC_INTEGRATION: '1', DATOMIC_GATEWAY_URL: bound.info.endpoint, DATOMIC_ROUTE_EVIDENCE_DIR: run.raw('route-oracle'), TRIPLEX_LAB_SLOT_OWNER: bound.info.ownerFile }) });
    const qualified = readJson(routeOutput, null);
    if (routes.code !== 0 || !qualified?.success || qualified.numPassedTests !== 1 || qualified.numFailedTests !== 0 || qualified.numPendingTests !== 0)
      run.reason('Datomic route-equivalence gate failed or did not execute its one live fixture');
    if (qualified) run.store(routeOutput, 'route-equivalence-result');
    const evidence = fileHashes(run, treeFiles(run.raw('route-oracle')).map(f => f.path), 'route-equivalence-oracle');
    if (Object.keys(evidence).length !== 6) run.reason('Route-equivalence fixture did not retain both oracle runs and route observations');
    const afterRoutes = hashDist(run, 'route-build-manifest-after.json');
    for (const [pkg, value] of Object.entries(afterRoutes.packages))
      if (value.sha256 !== result.build.packages[pkg]?.sha256) run.reason(`${pkg} dist changed during route-equivalence gate`);
    result.routeEquivalence = { report: run.rel(routeOutput), passed: qualified?.numPassedTests ?? 0, evidence };
    const still = inspect(bound.info.container);
    if (still?.Id !== bound.engine.containerId || still?.State.StartedAt !== bound.engine.startedAt) run.reason('Datomic resident changed during route-equivalence gate');
  }

  result.contactedEndpoint = report.endpoint;
  if (report.endpoint !== bound.info.endpoint) run.reason(`G1 contacted ${report.endpoint}, slot is ${bound.info.endpoint}`);
  if (report.caseCount !== FULL_G1_CASES) run.reason(`suite has ${report.caseCount} cases, expected ${FULL_G1_CASES}`);
  const executions = report.executions ?? [];
  const pass = executions.filter(e => e.status === 'PASS').length;
  const failed = executions.filter(e => e.status !== 'PASS');
  for (const e of failed) run.failure({ case: e.name, phase: e.phase, error: String(e.error).slice(0, 1500) });
  if (report.suite && report.suite.status !== 'PASS') { run.reason('complete unchanged suite failed'); run.failure({ case: '(complete suite)', error: String(report.suite.error).slice(0, 1500) }); }
  const expected = report.selectedCount * 2;
  if (executions.length !== expected) run.reason(`${expected - executions.length} of ${expected} case executions did not run`);
  if (executions.length === 0) run.reason('zero executed cases');
  if (failed.length) run.reason(`${failed.length} failed case executions`);
  result.scope = report.subset ? `subset:${report.selectedCount}/${FULL_G1_CASES}` : 'full';
  result.counts = {
    executed: executions.length, expected, pass, fail: failed.length, skip: expected - executions.length,
    suite: report.suite?.status ?? 'not-run (subset)',
    byPhase: Object.fromEntries(['current', 'reopen'].map(phase => [phase, { pass: executions.filter(e => e.phase === phase && e.status === 'PASS').length, total: executions.filter(e => e.phase === phase).length }])),
  };
  result.timings = { suiteMs: report.suite?.elapsedMs ?? null, casesMs: executions.reduce((s, e) => s + e.elapsedMs, 0) };
  // ACCEPTANCE section 3 per-case results. The 44 run the Triplex Datalog foundation runtime.
  result.cases = executions.map(e => ({ caseId: e.name, mode: e.phase, status: e.status, oracleId: 'O-TESTKIT', scope: e.scope,
    rawResultSha256: sha256(JSON.stringify(e)), languages: ['triplex-datalog'] }));
  result.scopes = { suite: report.suite?.scope ?? null, fresh: true };
  return result;
}

async function gateG2(run, config) {
  const output = run.raw('g2-report.json'), results = run.raw('g2-results.json');
  const args = ['packages/qualification/workloads/runner.ts', '--output', output, '--results-output', results];
  if (run.options.workloads) args.push('--workloads', String(run.options.workloads));
  const { result, step, bound } = await engineGate(run, config, { name: 'native-runner', queryPath: `${run.lane}-native`, args, timeoutMs: 45 * 60_000 });
  if (!bound) return result;
  const caseFiles = fs.readdirSync(path.join(REPO, 'qualification/workloads')).filter(f => f.endsWith('_cases.mjs')).map(f => `qualification/workloads/${f}`);
  result.fixtures = fileHashes(run, [PACKET, ...caseFiles.sort(), 'packages/qualification/workloads/runner.ts'], 'oracle-fixture');
  result.packet = packetIdentity();
  const timingRun = readLatencyRun(output, { lane: run.lane, expectedMode: run.lane === "qlever" ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive") : null }).unwrap();
  const report = timingRun.data;
  if (!report) { run.reason('no G2 report written'); run.failure({ step: step.name, tail: step.tail }); return result; }
  run.store(output, 'raw-outcome');
  if (fs.existsSync(results)) run.store(results, 'raw-outcome');
  if (report.packetSha256 !== result.packet.sha256) run.reason('runner packet sha256 differs from the hashed packet');
  result.contactedEndpoint = report.resourceBefore?.owner?.endpoint ?? null;
  if (report.resourceBefore?.policy !== 'triplex-db-2-lab-slot/1') run.reason('runner did not take the lab admission path');
  if (result.contactedEndpoint !== bound.info.endpoint) run.reason(`G2 contacted ${result.contactedEndpoint}, slot is ${bound.info.endpoint}`);
  const cases = (report.workloads ?? []).flatMap(w => w.cases.map(c => ({ ...c, workload: w.id })));
  const statuses = {};
  for (const c of cases) statuses[c.status] = (statuses[c.status] ?? 0) + 1;
  const pass = statuses.PASS ?? 0;
  const unsupported = statuses.UNSUPPORTED_PUBLIC_API ?? 0;
  const expected = report.expectedCaseExecutions ?? 0;
  for (const c of cases.filter(c => c.status !== 'PASS')) run.failure({ task: c.logicalTaskId, reopen: c.reopen, status: c.status, error: String(c.error).slice(0, 1500) });
  for (const w of (report.workloads ?? []).filter(w => String(w.status).startsWith('FAIL_'))) run.failure({ workload: w.id, status: w.status, error: String(w.error).slice(0, 1500) });
  if (cases.length !== expected) run.reason(`${expected - cases.length} of ${expected} case executions did not run`);
  if (cases.length === 0) run.reason('zero executed cases');
  if (unsupported) run.reason(`${unsupported} executions UNSUPPORTED (counted as skips)`);
  if (cases.length - pass - unsupported) run.reason(`${cases.length - pass - unsupported} failed executions`);
  // [EXP-C8] Why: contract C8 ("reads never mutate") is checked at the engine boundary. The runner
  // routes its native read client through a wire-level counter (engine-write-counter.ts); any write
  // statement, commit or update request on it is a read path that wrote, so G2 fails. A runner
  // without the counter records null (older branches), which is reported, not failed.
  result.readPathEngineWrites = report.readPathEngineWrites ?? null;
  if (report.readPathEngineWrites && (report.readPathEngineWrites.writes || report.readPathEngineWrites.unparsed))
    run.reason(`C8: native reads issued ${report.readPathEngineWrites.writes} engine writes (${report.readPathEngineWrites.commits} commits, ${report.readPathEngineWrites.unparsed} unparsed streams)`);
  result.scope = expected === FULL_G2_EXECUTIONS ? 'full' : `subset:${expected}/${FULL_G2_EXECUTIONS} (workloads ${run.options.workloads})`;
  result.counts = { executed: cases.length, expected, pass, fail: cases.length - pass - unsupported, skip: unsupported + (expected - cases.length), statuses };
  result.languages = tallyLanguages(cases);
  result.languages.rule = 'answer: an execution counts for a language only if every native answer query it ran used that language; mixed = hybrid (counts for neither). strict additionally includes substeps (XTDB source-cut position lookup is always xtdb-sql).';
  result.cases = cases.map(c => ({ caseId: c.logicalTaskId, mode: c.reopen ? 'reopen' : 'current', status: c.status, oracleId: 'O-EVT',
    rawResultSha256: sha256(JSON.stringify(c.actualRows ?? null)), ...caseLanguages(c.queryTrace) }));
  result.scopes = { workloads: (report.workloads ?? []).map(w => w.scope), fresh: true };
  result.timings = { workloads: (report.workloads ?? []).map(w => ({ id: w.id, status: w.status, ingestMs: w.groups?.reduce((s, g) => s + g.acknowledgedMs, 0) ?? null, queryMs: w.cases.reduce((s, c) => s + c.elapsedMsDiagnostic, 0) })) };
  return result;
}

// ---------------------------------------------------------------- NS (north-star bench, EXP-N01)

// [EXP-N01] Why: NS is the hill-climb fitness function (lab/NORTH-STAR.md, TARGETS v2 sections 1.1,
// 2.1, 4.1). It runs lab/bench/driver.ts against one composition on one slot and binds the driver's
// report: every number, the bar it is judged against, a correctness verdict for every read, and the
// identity of every layer (source, current, history, analytics) with image digest, config hash and slot.
// Gate verdicts: FAIL (harness problem or any correctness violation), INVALID (client saturated, rung
// not seeded, a development override, or a reduced profile), MEASURED (numbers stand; each bar carries
// its own pass/miss, and a missed bar is a fitness result, not a gate failure).
// The independent oracle O-REPLAY is read from its branch at a recorded commit (not yet on main).
// Rejected: a separate script outside gate.mjs (receipts must share identity binding with G0-G4).
const NS_DEV_FLAGS = ['subjects', 'rate-scale', 'max-readers', 'burst-multiplier', 'level-s', 'history-sample', 'sweep-max', 'reader-threads', 'seed-budget-s', 'writer-max-inflight', 'sweep-concurrency', 'probe10-per-s'];
async function gateNS(run, config) {
  run.options.slot ??= 's1';
  const rung = run.options.rung ?? '10k';
  const nsProfile = run.options['ns-profile'] ?? 'smoke';
  const output = run.raw('ns-report.json');
  const oracleRef = run.options['oracle-ref'] ?? 'exp/O01-replay-oracle';
  const oracleDir = run.raw('oracle');
  fs.mkdirSync(oracleDir, { recursive: true });
  const oracleCommit = runGit(['rev-parse', oracleRef]).trim();
  const tar = runGit(['archive', '--format=tar', oracleCommit, 'lab/oracles/replay'], 'buffer');
  const tarFile = run.raw('oracle.tar');
  fs.writeFileSync(tarFile, tar);
  const untar = await run.step('oracle-extract', 'tar', ['-xf', tarFile, '-C', oracleDir]);
  if (untar.code !== 0) run.reason('could not extract O-REPLAY');
  const args = ['lab/bench/driver.ts', '--lane', run.lane, '--rung', rung, '--profile', nsProfile, '--output', output, '--oracle-root', oracleDir];
  if (run.options.composition) args.push('--composition', String(run.options.composition));
  if (run.options['zero-readers']) args.push('--zero-readers');
  if (run.options['match-duration-s']) args.push('--match-duration-s', String(run.options['match-duration-s']));
  // [EXP-N01] A bulk-seeded scope (lab/bench/qlever-bulk-seed.ts): the slot must already hold the index built from its seed.nq.
  let bulkSeed = null;
  if (run.options['seed-manifest']) {
    const manifestFile = path.resolve(String(run.options['seed-manifest']));
    bulkSeed = { manifest: run.store(manifestFile, 'ns-bulk-seed-manifest'), nqSha256: readJson(manifestFile, {}).nq?.sha256 ?? null };
    args.push('--seed-manifest', manifestFile);
  }
  let baseline = null;
  if (run.options.baseline) {
    const receiptFile = path.join(REPO, 'lab/runs/NS', `${run.options.baseline}.json`);
    const base = readLatencyRun(receiptFile, { lane: run.lane, expectedMode: run.lane === "qlever" ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive") : null }).unwrap().data;
    if (!base) fail('USAGE', `--baseline ${run.options.baseline}: no receipt at ${path.relative(REPO, receiptFile)}`);
    const writesFile = path.join(REPO, base.rawDir, 'ns-writes.jsonl');
    if (!fs.existsSync(writesFile)) fail('USAGE', `--baseline ${run.options.baseline}: raw writes ${path.relative(REPO, writesFile)} are gone`);
    baseline = { runId: base.runId, verdict: base.verdict, zeroReaders: base.ns?.config?.zeroReaders ?? null, traceDigest: base.ns?.trace?.digest ?? null, writes: run.store(writesFile, 'ns-baseline-writes') };
    args.push('--baseline-writes', writesFile);
  }
  const dev = NS_DEV_FLAGS.filter(f => run.options[f] !== undefined);
  for (const f of dev) args.push(`--${f}`, String(run.options[f]));
  const slotName = run.options.slot ?? 's1';
  const info = slotInfo(config, run.lane, slotName);
  process.env.TX2_ENGINE_CONTAINER = info.container;
  process.env.TX2_ENGINE_CPUS = String(info.cpus);
  const { result, step, bound } = await engineGate(run, config, { name: 'ns-driver', queryPath: `${run.lane}-datalog`, args, timeoutMs: 8 * 3600_000, extraEnv: { TX2_ENGINE_CONTAINER: info.container, TX2_ENGINE_CPUS: String(info.cpus) } });
  if (!bound) return result;
  result.fixtures = fileHashes(run, nsBenchFiles(), 'bench-source');
  result.oracle = { id: 'O-REPLAY', ref: oracleRef, commit: oracleCommit, tarSha256: sha256(tar) };
  const timingRun = readLatencyRun(output, { lane: run.lane, expectedMode: run.lane === "qlever" ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive") : null }).unwrap();
  const report = timingRun.data;
  if (!report) { run.reason('no NS report written'); run.failure({ step: step.name, tail: step.tail }); return result; }
  run.store(output, 'raw-outcome');
  for (const extra of ['ns-writes.jsonl', 'ns-log.txt', 'feed-checkpoints.jsonl', 'feed-effects.jsonl', 'oracle-case.json', 'oracle-expected.json'])
    if (fs.existsSync(run.raw(extra))) run.store(run.raw(extra), 'raw-outcome');
  if (report.status !== 'DONE') { run.reason(`driver status ${report.status}: ${String(report.error ?? '').slice(0, 400)}`); run.failure({ step: step.name, tail: step.tail, error: report.error }); }
  result.contactedEndpoint = report.composition?.backend?.url ?? null;
  if (result.contactedEndpoint !== bound.info.endpoint) run.reason(`NS contacted ${result.contactedEndpoint}, slot is ${bound.info.endpoint}`);
  const c = report.correctness ?? {};
  result.counts = { executed: c.reads ?? 0, pass: c.correct ?? 0, fail: (c.violations ?? 0) + (c.errors ?? 0), violations: c.violations ?? 0, errors: c.errors ?? 0, skip: 0 };
  if ((c.violations ?? 0) > 0) run.reason(`${c.violations} correctness violations (${JSON.stringify(c.violationKinds)})`);
  if (report.oracle?.status === 'FAIL' || report.oracle?.status === 'ORACLE-ERROR') run.reason(`O-REPLAY sample check ${report.oracle.status}: ${report.oracle.mismatchCount ?? ''} mismatches`);
  const invalid = [];
  if (report.client?.invalid) invalid.push(`client saturated in ${report.client.saturatedPhases.join(', ')}`);
  if (report.seed && !report.seed.complete) invalid.push(`rung not achieved: ${report.seed.seededSubjects} of ${report.seed.plannedSubjects} subjects seeded`);
  if (dev.length) invalid.push(`development overrides: ${dev.join(', ')}`);
  if (baseline === null && !run.options['zero-readers']) invalid.push('no matched zero-reader baseline (--baseline RUN-ID): writer attribution is unmatched');
  result.scope = dev.length ? `dev:${dev.join(',')}` : `rung:${rung}/profile:${nsProfile}`;
  const engine = result.engine;
  const layer = role => ({ role, lane: run.lane, slot: slotName, container: engine.container, imageId: engine.imageId, repoDigests: engine.repoDigests, configSha256: engine.configSha256, endpoint: engine.endpoint, cpuQuota: engine.nanoCpus / 1e9, memCapBytes: engine.memCapBytes });
  const assignments = report.composition?.assignments ?? {};
  result.compositionIdentity = {
    name: report.composition?.name ?? null,
    scopeKey: report.composition?.scopeKey ?? null,
    assignments: Object.fromEntries(['source', 'current', 'history', 'analytics'].map(role => [role, { ...layer(role), declared: assignments[role] ?? null }])),
    replicationEdges: assignments.replicationEdges ?? [],
    watermarksAtRead: (report.phases ?? []).filter(p => p.stats?.watermarks).map(p => ({ phase: p.name, ...p.stats.watermarks })),
  };
  result.ns = {
    format: report.format, semantics: report.semantics, config: report.config, generator: report.generator, trace: { digest: report.trace?.digest, seed: report.trace?.seed, generatorSha256: report.trace?.generatorSha256, generated: report.trace?.generated },
    seed: report.seed, writer: report.writer, correctness: { ...c, violationSample: (c.violationSample ?? []).slice(0, 5) }, client: report.client, oracle: report.oracle,
    bars: Object.fromEntries(Object.entries(report.priorities ?? {}).map(([k, v]) => [k, v?.bars ?? []])),
    baseline, bulkSeed, seedPath: report.seedPath ?? null, invalid, positionCoordinates: report.positionCoordinates ?? null,
    reportSha256: sha256(fs.readFileSync(output)),
  };
  result.nsVerdict = invalid.length ? 'INVALID' : 'MEASURED';
  return result;
}
function nsBenchFiles() {
  const lib = fs.readdirSync(path.join(REPO, 'lab/bench/lib')).filter(f => f.endsWith('.ts')).sort().map(f => `lab/bench/lib/${f}`);
  return ['lab/bench/driver.ts', 'lab/bench/reader-worker.ts', ...lib, 'lab/bench/test/bench.test.ts', 'lab/bench/README.md'];
}
function runGit(args, encoding = 'utf8') {
  const out = spawnSync('git', ['-C', REPO, ...args], { maxBuffer: 256 << 20 });
  if (out.status !== 0) fail('GIT', `git ${args.join(' ')}: ${String(out.stderr).slice(0, 300)}`);
  return encoding === 'buffer' ? out.stdout : out.stdout.toString('utf8');
}

// ---------------------------------------------------------------- PAIR (paired rounds, EXP-M01)

// [EXP-M01] Why (R22 sections 1, 3, 6.2, 7; RULINGS Q60a-i): on this host a single run never decides a bar, so a
// comparison is a duet: A0 (arm A) and the candidate (arm B) replay the same trace window at the same instant on two
// identically configured slots in the cpuset regime, inside a measurement lease (every heavy token, pool admission
// frozen). lab/bench/duet.ts runs both drivers, the noise recorder and the analysis; this gate binds what ran: both
// slots' image, effective config and effective cgroup values (read back, not assumed), the round plan and noise rules
// by hash, every number with the input to recompute it, and the lease.
// Verdicts: FAIL (harness, identity, correctness, a container restarted or changed); INVALID (protocol departure:
// development overrides, arms not both in the cpuset regime, overlapping or unequal cpusets, no lease);
// INVALID_NOISE (window RED, or more than a third of rounds excluded); PAIRED_DECIDED / PAIRED_INCONCLUSIVE on the
// primary claim (commit p50 over every offered command, Q60d).
// Rejected: treating `--composition memory` as a measurement (offline pipeline checks only: no engine identity, so
// the identity rules FAIL it by design); building inside the lease (a build is a heavy step).
const PAIR_DEV_FLAGS = ['subjects', 'round', 'trace-param', 'warmup-periods', 'env-a', 'env-b', 'no-lease', 'no-vm'];
const PAIR_SLOT_FIELDS = ['slot', 'publish', 'volume', 'cpuset'];
async function gatePAIR(run, config, argv) {
  const slotNames = String(run.options.slots ?? 's1,s3').split(',');
  if (slotNames.length !== 2 || slotNames[0] === slotNames[1]) fail('USAGE', '--slots needs two different slots, e.g. s1,s3');
  const composition = String(run.options.composition ?? 'public');
  const memory = composition === 'memory';
  const mode = String(run.options.mode ?? 'aa');
  if (!['aa', 'ab'].includes(mode)) fail('USAGE', '--mode aa|ab');
  const departures = [];
  const result = { scope: `pair:${mode}/${run.options.series ?? 'screening-b180'}` };
  result.build = await build(run);
  result.slotConfiguration = run.store(SLOTS_FILE, 'slot-configuration');
  // Q67g: each arm = the system under test (composition, image, config without placement fields) plus its placement
  // (slot, container, regime, effective cpuset / cpu.max / cpu.weight, memory cap, cores). The workload is shared and
  // bound once (result.pair.workload). Under cpusets the per-core denominator is the cpuset size, not a quota.
  const arms = {};
  const bindings = {};
  if (memory) run.reason('offline memory composition: no engine, not a measurement (pipeline check only)');
  else {
    for (const [arm, slot] of [['A', slotNames[0]], ['B', slotNames[1]]]) {
      const bound = engineBinding(run, config, slot);
      if (!bound.engine) { arms[arm] = { placement: { slot } }; continue; }
      const eff = effectiveConfig(config, bound.info);
      const cgroup = cgroupOf(bound.info.container);
      if (!cgroup) run.reason(`${bound.info.container}: could not read its effective cgroup values`);
      const regime = regimeOf(bound.info);
      const system = Object.fromEntries(Object.entries(eff.effective).filter(([k]) => !PAIR_SLOT_FIELDS.includes(k)));
      const cpusetSize = cpuList(cgroup?.cpuset).size;
      arms[arm] = {
        system: { composition, imageId: bound.engine.imageId, repoDigests: bound.engine.repoDigests, configSha256: sha256(JSON.stringify(system)), effectiveConfig: system },
        placement: {
          slot, container: bound.engine.container, containerId: bound.engine.containerId, startedAt: bound.engine.startedAt, endpoint: bound.engine.endpoint, holder: bound.engine.holder,
          slotConfigSha256: bound.engine.configSha256, regime, slotCpuset: bound.info.cpuset ?? null, cpuset: cgroup?.cpuset ?? null, cpusetSize, cpuMax: cgroup?.cpuMax ?? null,
          cpuWeight: cgroup?.cpuWeight ?? null, memCapBytes: bound.engine.memCapBytes, nanoCpus: bound.engine.nanoCpus || null,
          cores: regime === 'cpuset' ? cpusetSize : bound.engine.nanoCpus / 1e9, perCoreDenominator: regime === 'cpuset' ? 'cpuset size' : 'CFS quota (nanoCpus)',
          throttledShareAtStart: cgroup?.throttledShare ?? null,
        },
      };
      bindings[arm] = bound.info;
      if (regime === 'cpuset' && cgroup && cgroup.cpuset !== bound.info.cpuset) run.reason(`${bound.info.container}: effective cpuset ${cgroup.cpuset} is not the slot's ${bound.info.cpuset}`);
    }
    const [A, B] = [arms.A, arms.B];
    if (A?.system && B?.system) {
      // Q60a "two identically configured slots": in A/A both arms run the same system; in A/B the candidate may differ
      // (that is the comparison), but the image must still be pinned per arm.
      if (mode === 'aa' && A.system.configSha256 !== B.system.configSha256) run.reason('A/A arms run different systems (effective configs differ beyond slot, port, volume and cpuset)');
      if (mode === 'aa' && A.system.imageId !== B.system.imageId) run.reason(`A/A arm images differ: ${A.system.imageId} vs ${B.system.imageId}`);
    }
    departures.push(...placementProblems(A?.placement, B?.placement));
  }
  const dev = PAIR_DEV_FLAGS.filter(f => argv.includes(`--${f}`));
  if (dev.length) departures.push(`development overrides: ${dev.join(', ')}`);
  const roundsWanted = Number(run.options.rounds ?? (mode === 'aa' ? 8 : 24));
  if (!PAIR_LOOKS.includes(roundsWanted)) departures.push(`--rounds ${roundsWanted} is not a registered look (${PAIR_LOOKS.join(', ')}; Q67f)`);
  // Lease (Q60h) after the build: the build is itself a heavy step.
  let lease = null;
  const leaseStarted = Date.now();
  if (run.options['no-lease']) { if (!memory) fail('USAGE', '--no-lease is only for --composition memory (offline)'); departures.push('no measurement lease'); }
  else {
    lease = await acquireMeasureLease(`${run.runId} PAIR`, { holder: defaultHolder(run.options) });
    process.stderr.write(`[lab] ${run.runId}: measurement lease held (${lease.tokens} heavy tokens, pool admission frozen) after ${(lease.waitedMs / 1000).toFixed(0)} s\n`);
  }
  result.lease = lease ? { holder: lease.owner?.holder ?? null, label: lease.owner?.label ?? null, waitedMs: lease.waitedMs, tokens: lease.tokens, at: lease.owner?.at ?? null } : null;
  const out = run.raw('duet');
  fs.mkdirSync(out, { recursive: true });
  const placementFile = path.join(out, 'placement.json');
  fs.writeFileSync(placementFile, JSON.stringify(memory ? null : { A: arms.A?.placement ?? null, B: arms.B?.placement ?? null }) + '\n');
  const pass = ['series', 'rung', 'seed', 'readers', 'probe-per-s', 'claim', 'seed-budget-s', 'subjects', 'warmup-periods', 'cpus'];
  const regime = arms.A?.placement?.regime && arms.A.placement.regime === arms.B?.placement?.regime ? arms.A.placement.regime : memory ? 'none' : 'quota';
  const args = ['lab/bench/duet.ts', 'run', '--out', out, '--lane', run.lane, '--mode', mode, '--rounds', String(roundsWanted), '--composition', composition, '--regime', regime, '--placement', placementFile];
  for (const k of pass) if (run.options[k] !== undefined) args.push(`--${k}`, String(run.options[k]));
  for (const k of ['round', 'trace-param', 'env-a', 'env-b']) argv.forEach((a, i) => { if (a === `--${k}`) args.push(a, argv[i + 1]); });
  if (run.options['no-vm']) args.push('--no-vm');
  // Q67g: the drivers' per-core denominator (TX2_ENGINE_CPUS) is the arm's cores: the cpuset size under cpusets.
  if (run.options.cpus === undefined && arms.A?.placement?.cores > 0) args.push('--cpus', String(arms.A.placement.cores));
  for (const [arm, k] of [['A', 'a'], ['B', 'b']]) if (bindings[arm]) args.push(`--url-${k}`, bindings[arm].endpoint, `--container-${k}`, arms[arm].placement.container, `--cpuset-${k}`, String(arms[arm].placement.cpuset ?? ''));
  // No docker stats sampler here (unlike NS): it costs the daemon about a second per call on vCPUs the arms share,
  // and the duet's VM agent already reads every container's cgroup counters per round (R22 section 6).
  let step;
  try { step = await run.step('duet', 'node', args, { env: cleanEnv(), timeoutMs: 6 * 3600_000 }); }
  finally { lease?.release(); }
  result.lease && (result.lease.heldMs = Date.now() - leaseStarted);
  const reportFile = path.join(out, 'pair-report.json');
  const report = readJson(reportFile, null);
  if (!report) { run.reason('no pair report written'); run.failure({ step: 'duet', tail: step.tail }); return result; }
  run.store(reportFile, 'raw-outcome');
  for (const f of ['round-plan.json', 'placement.json', 'noise-samples.jsonl.gz', 'A/ns-report.json', 'B/ns-report.json', 'A/ns-writes.jsonl', 'B/ns-writes.jsonl', 'A/driver.log', 'B/driver.log'])
    if (fs.existsSync(path.join(out, f))) run.store(path.join(out, f), 'raw-outcome');
  if (report.status !== 'DONE') { run.reason(`duet status ${report.status}: ${String(report.error ?? '').slice(0, 400)}`); run.failure({ step: 'duet', tail: step.tail, error: report.error }); }
  // Containers must be the same ones, unrestarted, with the same cgroup values, at the end.
  for (const [arm, x] of Object.entries(arms)) {
    const p = x.placement;
    if (!p?.container) continue;
    const still = inspect(p.container);
    if (still?.Id !== p.containerId || still?.State.StartedAt !== p.startedAt) run.reason(`arm ${arm} ${p.container} restarted or was replaced during the run`);
    const cg = cgroupOf(p.container);
    // [EXP-M01R] Why: absent final readback cannot bind an unchanged placement. Rejected: silently accepting an unreadable end cgroup.
    if (!cg) run.reason(`arm ${arm} ${p.container}: could not read effective cgroup values at end`);
    if (cg && (cg.cpuMax !== p.cpuMax || cg.cpuset !== p.cpuset)) run.reason(`arm ${arm} ${p.container} cgroup changed during the run (${p.cpuMax}/${p.cpuset} -> ${cg.cpuMax}/${cg.cpuset})`);
    p.throttledShareAtEnd = cg?.throttledShare ?? null;
  }
  for (const arm of ['A', 'B']) {
    arms[arm] ??= {};
    arms[arm].contactedEndpoint = report.arms?.[arm]?.backend?.url ?? null;
    if (arms[arm].placement?.endpoint && arms[arm].contactedEndpoint !== arms[arm].placement.endpoint) run.reason(`arm ${arm} contacted ${arms[arm].contactedEndpoint}, slot is ${arms[arm].placement.endpoint}`);
    const c = report.arms?.[arm]?.correctness;
    if (!c) run.reason(`arm ${arm}: no correctness record`);
    else if (c.violations > 0) run.reason(`arm ${arm}: ${c.violations} correctness violations (${JSON.stringify(c.violationKinds)})`);
    if (report.arms?.[arm]?.seedComplete === false) departures.push(`arm ${arm}: rung not fully seeded`);
  }
  if (report.trace && report.trace.digest !== report.trace.digestB) run.reason('the two arms replayed different traces');
  // Q67f: a correct receipt cannot carry broken accounting or calibration signals that do not follow from their samples.
  for (const p of report.checks?.accounting?.problems ?? []) run.reason(`accounting: ${p}`);
  for (const p of report.checks?.calibration?.problems ?? []) run.reason(`calibration: ${p}`);
  if (report.checks && !report.checks.rounds.isRegisteredLook) departures.push(`${report.checks.rounds.count} rounds run is not a registered look (Q67f)`);
  result.fixtures = fileHashes(run, [...nsBenchFiles(), 'lab/bench/duet.ts', 'lab/bench/test/paired.test.ts', 'lab/bench/test/noise.test.ts', 'lab/config/noise.json'], 'bench-source');
  const plan = readJson(path.join(out, 'round-plan.json'), null);
  const accounting = report.evidence ? JSON.parse(report.evidence.accounting.json) : {};
  result.pair = {
    format: 'tx2-pair-receipt/1', mode, series: report.series, rounds: report.roundsRun ?? 0, roundsPlanned: report.roundsPlanned, registeredLooks: PAIR_LOOKS, claim: report.claim,
    planSha256: report.planSha256, noiseConfigSha256: report.noiseConfigSha256, composition, regime,
    // Q67g: the shared workload, bound once for both arms.
    workload: {
      trace: { digest: report.trace?.digest ?? null, seed: report.seed ?? null, params: report.trace?.params ?? null, generatorSha256: report.trace?.generatorSha256 ?? null },
      rung: run.options.rung ?? '10k', seededSubjects: report.arms?.A?.seededSubjects ?? null, series: report.series,
      schedule: plan ? { traceStartAbsMs: report.traceStartAbsMs ?? null, warmupS: plan.warmupS, durationS: plan.durationS, rounds: plan.rounds } : null,
      offered: { perRound: Object.fromEntries(Object.entries(accounting).map(([id, x]) => [id, x.A?.offered ?? null])), note: 'per round: commands and probes offered (seq:offset lists, sha256); identical in both arms (checks.accounting)' },
      probe: plan?.probe ?? null,
    },
    trace: { digest: report.trace?.digest ?? null, seed: report.seed ?? null }, generator: { traceSha256: report.trace?.generatorSha256 ?? null },
    arms, looks: report.looks ?? [], stoppedAfter: report.stoppedAfter ?? null, devOverrides: dev,
    samples: report.samples ?? null, vmAgent: report.vmAgent ?? null,
    driverArms: Object.fromEntries(['A', 'B'].map(arm => [arm, { status: report.arms?.[arm]?.status, scope: report.arms?.[arm]?.scope, seededSubjects: report.arms?.[arm]?.seededSubjects, composition: report.arms?.[arm]?.compositionName, assignments: report.arms?.[arm]?.assignments, writer: report.arms?.[arm]?.writer, probe: report.arms?.[arm]?.probe, correctness: report.arms?.[arm]?.correctness, client: report.arms?.[arm]?.client }])),
    report: { path: run.rel(reportFile), sha256: sha256File(reportFile) },
    // Q67f: the retained evidence, each item one JSON string with its sha256 (see lab/bench/duet.ts EVIDENCE_KEYS).
    evidence: report.evidence ?? null,
    recompute: 'node lab/bench/duet.ts recompute --receipt <this receipt>',
  };
  result.stats = report.stats ?? null;
  result.noise = report.noise ?? null;
  result.checks = report.checks ?? null;
  // R22 section 6.2 `isolation`: what the arms shared with everything else during the window.
  const noiseRounds = report.noiseRounds ?? [];
  result.isolation = {
    regime, cpusets: { A: arms.A?.placement?.cpuset ?? null, B: arms.B?.placement?.cpuset ?? null }, partitioned: report.noise?.partitioned ?? null, lease: result.lease,
    perRound: noiseRounds.map(n => ({ id: n.id, partitioned: n.partitioned, neighborsMaxCoresOnArmCpus: n.signals?.['neighbors.maxCoresOnArmCpus'] ?? null, neighborsTotalCores: n.signals?.['neighbors.totalCores'] ?? null, throttledShare: { A: n.arms?.A?.throttledShare ?? null, B: n.arms?.B?.throttledShare ?? null } })),
    note: 'dev residents and other holders keep their cpusets (never changed without Sam), so a duet on s1 0-1 / s3 2-3 shares vCPUs with them unless they are idle',
  };
  const rounds = report.roundsRun ?? 0, excluded = report.noise?.counts?.excluded ?? 0;
  const reads = ['A', 'B'].reduce((s, arm) => s + (report.arms?.[arm]?.correctness?.reads ?? 0), 0);
  const violations = ['A', 'B'].reduce((s, arm) => s + (report.arms?.[arm]?.correctness?.violations ?? 0), 0);
  result.counts = { executed: rounds, pass: rounds - excluded, fail: violations, skip: 0, rounds, usableRounds: rounds - excluded, excludedRounds: excluded, reads, violations };
  const pv = pairVerdictOf({ grade: report.noise?.windowGrade?.grade, decision: report.stats?.primary?.decision, departures });
  result.pairVerdict = pv.verdict;
  result.pairVerdictReasons = pv.reasons;
  if (run.options['raw-archive']) {
    const dir = path.resolve(String(run.options['raw-archive']));
    fs.mkdirSync(dir, { recursive: true });
    const tarFile = path.join(dir, `${run.runId}.tar.gz`);
    const tar = spawnSync('tar', ['-czf', tarFile, '-C', path.dirname(run.rawDir), path.basename(run.rawDir)]);
    result.rawArchive = tar.status === 0 ? { path: tarFile, sha256: sha256File(tarFile), bytes: fs.statSync(tarFile).size } : { error: String(tar.stderr).slice(0, 300) };
  }
  return result;
}

// ---------------------------------------------------------------- GS (EXP-W01)

// [EXP-W01] Why: the 20 golden scenarios (TARGETS section 6) run through lab/scenarios/run.mjs against the held
// slot, with goldens from O-REPLAY bound by hash (scenario specs, expected files, generator, oracle sources).
// A scenario counts as PASS only if its database checks, its bars and its domain checks (O-DOMAIN seam, fails
// closed) all pass. Any selection short of all 20 at the year-one profile is a subset (PASS_SUBSET at best).
// Kept as one function so EXP-N01's NS gate can land beside it without conflicts.
const GS_TOTAL = 20;
async function gateGS(run, config) {
  const extraEnv = brokerEnv(run.lane, run.options['broker-dir'], path.join(REPO, 'runs'));
  const output = run.raw('gs-report.json');
  const rung = String(run.options.rung ?? '10k');
  const args = ['lab/scenarios/run.mjs', '--lane', run.lane, '--rung', rung, '--output', output, '--raw-dir', run.rawDir,
    '--scenarios', String(run.options.scenario ?? 'all'), '--readers', String(run.options.readers ?? 16)];
  for (const key of ['sweep-cap', 'sweep-concurrency', 'faults', 'drain-timeout-ms', 'layout-reader']) if (run.options[key]) args.push(`--${key}`, String(run.options[key]));
  args.push('--fresh-world');
  if (extraEnv.QLEVER_BROKER_DIR) args.push('--broker-dir', extraEnv.QLEVER_BROKER_DIR);
  const { result, step, bound } = await engineGate(run, config, { extraEnv, name: 'gs-scenarios', queryPath: `${run.lane}-datalog`, args, timeoutMs: 8 * 3600_000, heavy: true });
  if (!bound) return result;
  const fixtureFiles = [];
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, e.name);
      if (e.isDirectory() && e.name !== '__pycache__') walk(file);
      else if (e.isFile() && /\.(mjs|ts|json|py|md)$/.test(e.name)) fixtureFiles.push(path.relative(REPO, file));
    }
  };
  for (const dir of ['lab/scenarios', 'lab/oracles/replay', 'lab/oracles/domain', 'lab/world/W0']) walk(path.join(REPO, dir));
  fixtureFiles.push('lab/acceptance/cases/CS-GS.json');
  for (const f of fs.readdirSync(path.join(REPO, 'lab/bench/lib')).filter(f => /\.(ts|py)$/.test(f))) fixtureFiles.push(`lab/bench/lib/${f}`);
  result.fixtures = fileHashes(run, fixtureFiles.sort(), 'oracle-fixture');
  const timingRun = readLatencyRun(output, { lane: run.lane, expectedMode: run.lane === "qlever" ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive") : null }).unwrap();
  const report = timingRun.data;
  if (!report) { run.reason('no GS report written'); run.failure({ step: step.name, tail: step.tail }); return result; }
  for (const reason of gsRefusals(output, readJson(path.join(REPO, 'lab/acceptance/obligations.json'), {}).version)) run.reason(reason);
  run.store(output, 'raw-outcome');
  for (const f of fs.readdirSync(run.rawDir).filter(f => f.endsWith('-checkpoint.json'))) run.store(path.join(run.rawDir, f), 'raw-outcome');
  result.contactedEndpoint = report.endpoint ?? null;
  if (report.endpoint !== bound.info.endpoint) run.reason(`GS contacted ${report.endpoint}, slot is ${bound.info.endpoint}`);
  if (report.status !== 'DONE') run.reason(`GS runner status ${report.status}: ${String(report.error ?? '').slice(0, 300)}`);
  const ran = report.scenarios.filter(s => s.verdict !== 'NOT_RUN');
  const pass = ran.filter(s => s.verdict === 'PASS');
  for (const s of ran.filter(s => s.verdict !== 'PASS')) run.failure({ scenario: s.scenario, slug: s.slug, verdict: s.verdict, verdicts: s.verdicts, firstFailures: s.firstFailures });
  if (ran.length === 0) run.reason('zero executed scenarios');
  if (ran.length - pass.length) run.reason(`${ran.length - pass.length} of ${ran.length} scenarios did not PASS`);
  result.scope = ran.length === GS_TOTAL && rung === '10m' && !report.profile?.reduced ? 'full' : `subset:${ran.length}/${GS_TOTAL} rung=${rung} readers=${report.readers}${report.profile?.reduced ? ' reduced-profile' : ''}`;
  result.counts = { executed: ran.length, expected: ran.length, pass: pass.length, fail: ran.length - pass.length, skip: 0,
    byVerdict: Object.fromEntries([...new Set(ran.map(s => s.verdict))].map(v => [v, ran.filter(s => s.verdict === v).length])),
    database: { pass: ran.filter(s => s.verdicts?.database === 'PASS').length, fail: ran.filter(s => s.verdicts?.database !== 'PASS').length },
    bars: { pass: ran.filter(s => s.verdicts?.bars === 'PASS').length, fail: ran.filter(s => s.verdicts?.bars !== 'PASS').length },
    domain: Object.fromEntries([...new Set(ran.map(s => s.verdicts?.domain))].map(v => [v, ran.filter(s => s.verdicts?.domain === v).length])) };
  result.gs = { rung, readers: report.readers, profile: report.profile, world: report.world, scope: report.scope, composition: report.composition, runTag: report.runTag,
    scenarios: report.scenarios.map(s => ({ scenario: s.scenario, slug: s.slug, verdict: s.verdict, verdicts: s.verdicts, expectedFile: s.expectedFile, wallMs: s.wallMs,
      correctness: s.correctness ? { pass: s.correctness.pass, fail: s.correctness.fail } : null, bars: s.bars?.map(b => ({ id: b.id, observed: b.observed, want: `${b.op} ${b.value}`, ok: b.ok })),
      accounting: s.metrics?.accounting, subSchedules: s.subSchedules, diagnostics: s.diagnostics, firstFailures: s.firstFailures })) };
  result.cases = ran.map(s => ({ caseId: `GS.${String(s.scenario).padStart(2, '0')}`, mode: rung, status: s.verdict, oracleId: 'O-REPLAY+O-DOMAIN', rawResultSha256: sha256(JSON.stringify(s)), languages: ['triplex-public'] }));
  result.scopes = { worldScope: report.scope, fresh: true };
  result.gs.qlever = report.qlever;
  result.gs.slot = bound.info.slot;
  result.gs.resident = bound.info.mode === 'resident';
  result.gs.coRunning = result.coRunning;
  return result;
}

// ---------------------------------------------------------------- G4

// [EXP-002] Why: G4 (PLAN 7.5) is "semantic counterexamples with original expected answers". The
// A0 baseline records the raw QLever counterexamples as FAILs against their original oracles, plus
// a control that must PASS so the FAILs are not vacuous. The gate verdict stays FAIL whenever any
// execution misses its original oracle (a baseline FAIL is still a FAIL); `baselineAsExpected`
// says separately whether every execution matched its declared A0 expectation.
// Rejected: a "PASS when the expected failures happen" verdict (it would read as semantic success).
async function gateG4(run, config) {
  if (run.lane !== 'qlever') fail('USAGE', 'G4 is implemented for --lane qlever only (EXP-002)');
  const output = run.raw('g4-report.json');
  const entryFile = 'packages/qlever/experiments/lab-counterexamples.ts';
  const { result, step, bound } = await engineGate(run, config, { name: 'lab-counterexamples', queryPath: `${run.lane}-native`, args: [entryFile, '--output', output], timeoutMs: 15 * 60_000 });
  if (!bound) return result;
  result.fixtures = fileHashes(run, [entryFile, 'packages/qlever/experiments/lab-endpoint.ts', 'qualification/native-controls/qlever-collation-tiny-v1/oracle.json',
    'qualification/native-controls/qlever-collation-tiny-v1/fixture.nt', 'packages/qlever/experiments/native-query-shapes.ts', 'lab/research/R5-probe/probe1.py', 'lab/research/R5-probe/probe3.py'], 'oracle-fixture');
  const timingRun = readLatencyRun(output, { lane: run.lane, expectedMode: run.lane === "qlever" ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive") : null }).unwrap();
  const report = timingRun.data;
  if (!report) { run.reason('no G4 report written'); run.failure({ step: step.name, tail: step.tail }); return result; }
  run.store(output, 'raw-outcome');
  result.contactedEndpoint = report.endpoint;
  if (report.endpoint !== bound.info.endpoint) run.reason(`G4 contacted ${report.endpoint}, slot is ${bound.info.endpoint}`);
  if (report.status !== 'COMPLETE') { run.reason(`G4 entry status ${report.status}: ${String(report.error ?? '').slice(0, 300)}`); run.failure({ step: step.name, tail: step.tail, error: report.error }); }
  const executions = report.executions ?? [];
  const missed = executions.filter(e => e.status !== 'PASS');
  for (const e of missed) run.failure({ case: e.caseId, mode: e.mode, status: e.status, expected: e.expected, actual: e.actual ?? null, error: e.error ?? null });
  if (executions.length === 0) run.reason('zero executed cases');
  const counterFails = missed.filter(e => e.kind === 'counterexample').length, controlFails = missed.filter(e => e.kind === 'control').length;
  if (counterFails) run.reason(`${counterFails} counterexample executions miss their original oracle (the declared A0 baseline expectation is FAIL)`);
  if (controlFails) run.reason(`${controlFails} control executions miss their oracle (controls must PASS; harness or engine defect)`);
  const unexpected = executions.filter(e => !e.matchesBaseline);
  result.scope = 'full';
  result.counts = { executed: executions.length, pass: executions.length - missed.length, fail: missed.length, skip: 0,
    counterexamples: executions.filter(e => e.kind === 'counterexample').length, controls: executions.filter(e => e.kind === 'control').length,
    errors: executions.filter(e => e.status === 'ERROR').length };
  result.baselineAsExpected = unexpected.length === 0;
  result.unexpectedVersusBaseline = unexpected.map(e => ({ caseId: e.caseId, mode: e.mode, expectedBaseline: e.expectedBaseline, status: e.status }));
  result.cases = executions.map(e => ({ caseId: e.caseId, mode: e.mode, status: e.status, kind: e.kind, expectedBaseline: e.expectedBaseline, oracleId: e.oracleId,
    oracleSource: e.oracleSource, expected: e.expected, actual: e.actual ?? null, query: e.query ?? null, rawResultSha256: e.rawResultSha256 ?? null, ...caseLanguages([{ operation: 'public-native-query', ...(e.trace ?? {}) }]) }));
  result.scopes = { scope: report.scope, fresh: true, write: report.write };
  result.timings = { casesMs: executions.reduce((s, e) => s + e.elapsedMs, 0), writeMs: report.write?.elapsedMs ?? null };
  return result;
}

// ---------------------------------------------------------------- receipt

main(async () => {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const gate = positional[0];
  // [EXP-E01] --dry-run (RULINGS Q55a step 3): validate the gate, lane and registered slot and print the plan claim.mjs
  // qualify would execute, without locks, builds or engines. OBL (run an obligation's pinned case manifest on a slot) exists
  // only as a plan: no executable case manifests are pinned yet, so it never runs.
  if (options['dry-run']) {
    if (!['G0', 'G1', 'G2', 'G4', 'NS', 'PAIR', 'GS', 'OBL'].includes(gate) || !gateLanes(gate).includes(options.lane)) fail('USAGE', 'usage: gate.mjs G0|G1|G2|G4|NS|PAIR|GS|OBL --lane xtdb|qlever|datomic --slot S --dry-run [--plan FILE]');
    const info = slotInfo(loadSlots(), options.lane, options.slot ?? 'dev');
    console.log(JSON.stringify({ dryRun: true, gate, lane: options.lane, slot: info.slot, endpoint: info.endpoint, container: info.container, mode: info.mode ?? null,
      plan: options.plan ? readJson(path.resolve(options.plan)) : null, executes: gate !== 'OBL', missing: gate === 'OBL' ? 'the OBL gate (run pinned case manifests on a slot) is not implemented' : null }));
    return;
  }
  if (!['G0', 'G1', 'G2', 'G4', 'NS', 'PAIR', 'GS'].includes(gate) || !gateLanes(gate).includes(options.lane))
    fail('USAGE', 'usage: gate.mjs G0|G1|G2|G4|NS|PAIR|GS --lane xtdb|qlever|datomic [--slot dev] [--exp EXP-NNN] [--note TEXT] [--previous RUN-ID] [--cases N] [--workloads 01,02]\n  NS: --rung 10k|100k|1m|10m [--slot s1] [--ns-profile smoke|screening|acceptance] [--zero-readers [--match-duration-s S]] [--baseline RUN-ID] [--composition public]\n  GS: [--scenario 2,3] [--rung 10k] [--readers 16]');
  const config = loadSlots();
  // [EXP-000] runKind defaults to diagnostic so an unlabelled run can never close anything (V12, B7).
  const runKind = options['run-kind'] ?? 'diagnostic';
  if (!RUN_KINDS.includes(runKind)) fail('USAGE', `--run-kind must be one of ${RUN_KINDS.join('|')}`);
  if (runKind === 'acceptance' && (options.cases || options.workloads)) fail('USAGE', 'an acceptance run cannot select a subset (B12)');
  if (runKind === 'mutation' && (!options['mutation-id'] || !options['mutation-patch'])) fail('USAGE', 'a mutation run needs --mutation-id and --mutation-patch <file>');
  // [EXP-000] Why: one gate at a time per worktree. Two concurrent gates rebuilt the same dist/ and
  // the run-end re-hash correctly FAILed a G1 whose 88 cases all passed (2026-11-07).
  const releaseWorktree = await worktreeGateLock();
  const run = new Run(gate, options.lane, options);
  const mutation = runKind === 'mutation'
    ? { id: options['mutation-id'], patch: run.store(path.resolve(options['mutation-patch']), 'mutation-patch') }
    : null;
  process.stderr.write(`[lab] ${run.runId}: raw output ${run.rel(run.rawDir)}\n`);
  let result = {}, git = null, tools = null, lockfileSha256 = null, gateScripts = null;
  try {
    git = identity(run);
    tools = await toolchain(run);
    lockfileSha256 = run.store(path.join(REPO, 'pnpm-lock.yaml'), 'lockfile').sha256;
    gateScripts = Object.fromEntries(['lab/bin/gate.mjs', 'lab/bin/lib.mjs', 'lab/bin/receipt.mjs', 'lab/bin/engine.mjs', 'lab/bin/heavy-lock.mjs', 'lab/config/slots.json', 'lab/receipts/latency.mjs', 'lab/receipts/latency.d.mts', 'lab/receipts/parse.ts']
      .map(file => [file, run.store(path.join(REPO, file), 'gate-script').sha256]));
    result = gate === 'G0' ? await gateG0(run) : gate === 'G1' ? await gateG1(run, config) : gate === 'G2' ? await gateG2(run, config) : gate === 'NS' ? await gateNS(run, config) : gate === 'PAIR' ? await gatePAIR(run, config, process.argv.slice(2)) : gate === 'GS' ? await gateGS(run, config) : await gateG4(run, config);
  } catch (error) {
    run.reason(`harness error: ${error.message}`);
    run.failure({ harnessError: String(error.stack ?? error).slice(0, 3000) });
  }
  const claims = contractClaims({ gate, lane: options.lane, scope: result.scope, contractFile: path.join(REPO, 'lab/acceptance/obligations.json') });
  if (claims.contract) run.store(path.join(REPO, 'lab/acceptance/obligations.json'), 'acceptance-contract');
  for (const reason of claims.reasons) run.reason(reason);
  const receipt = latencyReceipt({
    format: 'tx2-gate-receipt/1', gate, lane: options.lane, slot: gate === 'G0' ? null : gate === 'PAIR' ? String(options.slots ?? 's1,s3') : (options.slot ?? (gate === 'NS' ? 's1' : 'dev')), runId: run.runId,
    experiment: options.exp ?? null, note: options.note ?? null, previous: options.previous ?? null,
    startedAt: run.startedAt, endedAt: now(), durationMs: Date.now() - run.t0, scope: result.scope ?? 'unknown',
    runKind, mutation, contractVersion: claims.contract?.version ?? null, contract: claims.contract, obligations: claims.obligations,
    engineName: options.lane,
    qleverConnectionMode: options.lane === 'qlever' ? requireQleverConnectionMode(process.env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive") : null,
    git, lockfileSha256, toolchain: tools, gateScripts, ...result,
    steps: run.steps.map(({ tail, ...step }) => step), firstFailures: run.firstFailures,
    rawDir: run.rel(run.rawDir), reasons: run.reasons,
  });
  if (receipt.git) { receipt.git.modifiedFiles = receipt.git.modifiedFiles.map(({ secretLike, ...f }) => f); receipt.git.untrackedFiles = receipt.git.untrackedFiles.map(({ secretLike, ...f }) => f); }
  const { verdict, reasons } = verdictOf(receipt);
  receipt.verdict = verdict; receipt.reasons = reasons;
  if (gate === 'NS' && verdict !== 'FAIL') receipt.verdict = result.nsVerdict ?? 'INVALID';
  if (gate === 'PAIR' && verdict !== 'FAIL') { receipt.verdict = result.pairVerdict ?? 'INVALID'; receipt.pairVerdictReasons = result.pairVerdictReasons ?? []; }
  receipt.objects = run.objects;
  const fd = fs.openSync((fs.mkdirSync(path.dirname(run.receiptPath), { recursive: true }), run.receiptPath), 'wx', 0o444);
  fs.writeSync(fd, JSON.stringify(receipt, null, 2) + '\n'); fs.fsyncSync(fd); fs.closeSync(fd);
  const c = receipt.counts ?? {};
  console.log(`${verdict} ${gate} ${options.lane}${receipt.slot ? '/' + receipt.slot : ''} scope=${receipt.scope} executed=${c.executed ?? 0} pass=${c.pass ?? 0} fail=${c.fail ?? 0} skip=${c.skip ?? 0}`);
  if (result.profile || result.planner) console.log(`profile: ${result.profile?.name ?? '-'}; planner budget: ${JSON.stringify(result.planner ?? null)}`);
  if (result.baselineAsExpected !== undefined) console.log(`G4 baseline as expected (counterexamples FAIL, controls PASS): ${result.baselineAsExpected}`);
  if (result.languages) console.log(`languages (answer): ${JSON.stringify(result.languages.answer)}; strict: ${JSON.stringify(result.languages.strict)}`);
  for (const reason of reasons.slice(0, 10)) console.log(`  reason: ${reason}`);
  console.log(`receipt: ${run.rel(run.receiptPath)}`);
  releaseWorktree();
  if (gate === 'NS' && result.ns) {
    console.log(`NS ${receipt.verdict}${result.ns.invalid?.length ? ` (${result.ns.invalid.join('; ')})` : ''}`);
    for (const [p, bars] of Object.entries(result.ns.bars)) for (const b of bars) console.log(`  ${p} ${b.pass === true ? 'PASS' : b.pass === false ? 'MISS' : 'n/a '} ${b.id}: ${JSON.stringify(b.value)} (bar ${b.bar})`);
  }
  if (gate === 'PAIR' && result.noise) {
    const s = result.stats ?? {}, n = result.noise;
    console.log(`PAIR ${receipt.verdict} mode ${result.pair?.mode} rounds ${result.counts?.rounds} (usable ${result.counts?.usableRounds}); window ${n.windowGrade?.grade} (${(n.windowGrade?.reasons ?? []).join('; ')})`);
    console.log(`  A/A s_d log p50 ${n.aa?.sdLogP50 ?? '-'} p99 ${n.aa?.sdLogP99 ?? '-'}; slot bias p50 ${n.aa?.slotBiasP50?.ratio ?? '-'} [${n.aa?.slotBiasP50?.ratioLo ?? '-'}, ${n.aa?.slotBiasP50?.ratioHi ?? '-'}]`);
    console.log(`  commitAll p50 A/B ${s.p50?.ratio ?? '-'} [${s.p50?.lo ?? '-'}, ${s.p50?.hi ?? '-'}] p99 ${s.p99?.ratio ?? '-'} [${s.p99?.lo ?? '-'}, ${s.p99?.hi ?? '-'}]; decision ${s.primary?.decision}`);
    console.log(`  exclusions ${JSON.stringify(n.exclusions)}`);
  }
  if (verdict === 'FAIL') process.exitCode = 1;
});

async function worktreeGateLock() {
  const dir = path.join(REPO, 'runs', '.gate-lock');
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  let released = false;
  let resolveHeld, releaseFn;
  const held = new Promise(resolve => { resolveHeld = resolve; });
  const done = withDirLock(dir, () => { resolveHeld(); return new Promise(resolve => { releaseFn = resolve; }); }, { timeoutMs: 6 * 3600_000, label: 'worktree gate lock' });
  await held;
  return () => { if (!released) { released = true; releaseFn(); } return done; };
}
