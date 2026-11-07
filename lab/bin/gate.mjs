#!/usr/bin/env node
// lab/bin/gate.mjs <G0|G1|G2> --lane xtdb|qlever [--slot dev] [--exp EXP-NNN] [--note TEXT]
//   [--previous RUN-ID] [--holder NAME] [--cases N (G1 subset)] [--workloads 01,02 (G2 subset)]
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
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { effectiveConfig, probe } from './engine.mjs';
import { acquireHeavy } from './heavy-lock.mjs';
import { RUN_KINDS, caseLanguages, contractClaims, tallyLanguages, verdictOf } from './receipt.mjs';
import {
  REPO, defaultHolder, vmDisk, docker, dockerStats, fail, inspect, listTx2Containers, loadSlots, main, now, parseArgs,
  readJson, readOwner, runLogged, withDirLock, sha256, sha256File, slotInfo, sourceIdentity, storeFile, storeObject, treeFiles, volumeBytes,
} from './lib.mjs';

const PACKAGES = {
  core: { filter: '@triplex-build/triplex', dir: 'packages/core' },
  testkit: { filter: '@triplex-build/triplex-testkit', dir: 'packages/testkit' },
  xtdb: { filter: '@triplex-build/triplex-xtdb', dir: 'packages/xtdb' },
  qlever: { filter: '@triplex-build/triplex-qlever', dir: 'packages/qlever' },
  qualification: { filter: '@triplex-build/triplex-qualification', dir: 'packages/qualification' },
};
const lanePackages = lane => ['core', 'testkit', lane, 'qualification'];
const EXPECTED_SKIPS = path.join(REPO, 'lab/config/g0-expected-skips.json');
const PACKET = 'qualification/workloads/temporal-workloads.json';
const FULL_G2_EXECUTIONS = 142;
const FULL_G1_CASES = 44;

// Environment flags that turn live tests on; G0 removes them so its skip list is deterministic.
const LIVE_FLAGS = ['XTDB_INTEGRATION', 'QLEVER_INTEGRATION', 'TRIPLEX_INTEGRATION', 'TRIPLEX_CONFORMANCE_CASES', 'XTDB_CONFORMANCE_CASES', 'TRIPLEX_DUCKDB'];
const ENGINE_ENV = ['XTDB_URL', 'QLEVER_URL', 'QLEVER_ACCESS_TOKEN', 'QLEVER_ACCESS_TOKEN_FILE', 'TRIPLEX_BACKEND', 'TRIPLEX_QUERY_PATH',
  'TRIPLEX_RESOURCE_ADMISSION', 'TRIPLEX_RESOURCE_ADMISSION_SHA256', 'TRIPLEX_RUN_ARTIFACTS', 'TRIPLEX_RUN_DIRECTORY', 'TRIPLEX_LAB_SLOT_OWNER'];
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
    const release = heavy ? await acquireHeavy(`${this.runId} ${name}`) : () => {};
    let result;
    try { result = await runLogged(command, args, { cwd, env: env ?? cleanEnv(), stdoutFile, stderrFile, timeoutMs }); }
    finally { release(); }
    const record = { name, ...result, cwd: this.rel(cwd) || '.', stdout: this.rel(stdoutFile), stderr: this.rel(stderrFile) };
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
  const filters = lanePackages(run.lane).flatMap(name => ['--filter', PACKAGES[name].filter]);
  const step = await run.step('build', 'pnpm', [...filters, 'build'], { heavy: true, env: cleanEnv() });
  if (step.code !== 0) { run.reason(`build failed (exit ${step.code})`); run.failure({ step: 'build', tail: step.tail }); }
  return hashDist(run, 'build-manifest.json');
}

function hashDist(run, name) {
  const packages = {};
  for (const pkg of lanePackages(run.lane)) {
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
  const pnpm = await run.step('pnpm-version', 'pnpm', ['--version']);
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

function engineBinding(run, config) {
  const info = slotInfo(config, run.lane, run.options.slot ?? 'dev');
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
  const pkgs = lanePackages(run.lane);
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
  for (const step of [nodeQual, engineCases]) if (step.code !== 0) run.reason(`${step.name} exited ${step.code}`);
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

async function engineGate(run, config, entry) {
  const result = {};
  result.build = await build(run);
  const bound = engineBinding(run, config);
  result.engine = bound.engine ?? null;
  if (!bound.engine) return { result, step: null, bound: null };
  const ready = await probe(bound.info);
  if (!ready.ok) run.reason(`${bound.info.container} not ready before the run: ${ready.why}`);
  const env = cleanEnv({
    [bound.info.laneConf.envVar]: bound.info.endpoint,
    TRIPLEX_LAB_SLOT_OWNER: bound.info.ownerFile,
    TRIPLEX_QUERY_PATH: entry.queryPath,
  });
  result.queryPath = entry.queryPath;
  result.diskBefore = vmDisk(config);
  const stop = startSampler();
  const step = await run.step(entry.name, 'node', entry.args, { env, timeoutMs: entry.timeoutMs });
  result.containers = stop();
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
  result.fixtures = fileHashes(run, ['packages/testkit/src/index.ts', 'packages/qualification/workloads/lab-conformance.ts'], 'oracle-fixture');
  const report = readJson(output, null);
  if (!report) { run.reason('no G1 report written'); run.failure({ step: step.name, tail: step.tail }); return result; }
  run.store(output, 'raw-outcome');
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
  const report = readJson(output, null);
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

// ---------------------------------------------------------------- receipt

main(async () => {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const gate = positional[0];
  if (!['G0', 'G1', 'G2'].includes(gate) || !['xtdb', 'qlever'].includes(options.lane))
    fail('USAGE', 'usage: gate.mjs G0|G1|G2 --lane xtdb|qlever [--slot dev] [--exp EXP-NNN] [--note TEXT] [--previous RUN-ID] [--cases N] [--workloads 01,02]');
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
    gateScripts = Object.fromEntries(['lab/bin/gate.mjs', 'lab/bin/lib.mjs', 'lab/bin/receipt.mjs', 'lab/bin/engine.mjs', 'lab/bin/heavy-lock.mjs', 'lab/config/slots.json']
      .map(file => [file, run.store(path.join(REPO, file), 'gate-script').sha256]));
    result = gate === 'G0' ? await gateG0(run) : gate === 'G1' ? await gateG1(run, config) : await gateG2(run, config);
  } catch (error) {
    run.reason(`harness error: ${error.message}`);
    run.failure({ harnessError: String(error.stack ?? error).slice(0, 3000) });
  }
  const claims = contractClaims({ gate, lane: options.lane, scope: result.scope, contractFile: path.join(REPO, 'lab/acceptance/obligations.json') });
  if (claims.contract) run.store(path.join(REPO, 'lab/acceptance/obligations.json'), 'acceptance-contract');
  for (const reason of claims.reasons) run.reason(reason);
  const receipt = {
    format: 'tx2-gate-receipt/1', gate, lane: options.lane, slot: gate === 'G0' ? null : (options.slot ?? 'dev'), runId: run.runId,
    experiment: options.exp ?? null, note: options.note ?? null, previous: options.previous ?? null,
    startedAt: run.startedAt, endedAt: now(), durationMs: Date.now() - run.t0, scope: result.scope ?? 'unknown',
    runKind, mutation, contractVersion: claims.contract?.version ?? null, contract: claims.contract, obligations: claims.obligations,
    engineName: options.lane,
    git, lockfileSha256, toolchain: tools, gateScripts, ...result,
    steps: run.steps.map(({ tail, ...step }) => step), firstFailures: run.firstFailures,
    rawDir: run.rel(run.rawDir), reasons: run.reasons,
  };
  if (receipt.git) { receipt.git.modifiedFiles = receipt.git.modifiedFiles.map(({ secretLike, ...f }) => f); receipt.git.untrackedFiles = receipt.git.untrackedFiles.map(({ secretLike, ...f }) => f); }
  const { verdict, reasons } = verdictOf(receipt);
  receipt.verdict = verdict; receipt.reasons = reasons;
  receipt.objects = run.objects;
  const fd = fs.openSync((fs.mkdirSync(path.dirname(run.receiptPath), { recursive: true }), run.receiptPath), 'wx', 0o444);
  fs.writeSync(fd, JSON.stringify(receipt, null, 2) + '\n'); fs.fsyncSync(fd); fs.closeSync(fd);
  const c = receipt.counts ?? {};
  console.log(`${verdict} ${gate} ${options.lane}${receipt.slot ? '/' + receipt.slot : ''} scope=${receipt.scope} executed=${c.executed ?? 0} pass=${c.pass ?? 0} fail=${c.fail ?? 0} skip=${c.skip ?? 0}`);
  if (result.languages) console.log(`languages (answer): ${JSON.stringify(result.languages.answer)}; strict: ${JSON.stringify(result.languages.strict)}`);
  for (const reason of reasons.slice(0, 10)) console.log(`  reason: ${reason}`);
  console.log(`receipt: ${run.rel(run.receiptPath)}`);
  releaseWorktree();
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
