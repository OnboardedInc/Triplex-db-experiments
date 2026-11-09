// @ts-nocheck -- [EXP-CHECKJS] runtime-populated records, optional option bags, or branch-specific union members; option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, atomicJson, digest, exec, exists, fileTree, hashFile, inside, now, ownedPath, processIdentity, readJson, sleep } from './io.mjs';
import { baselineBinding, controllerBinding, event, inputFingerprint, locked, pinInputs, storageObservation } from './state.mjs';
import { grantNext } from './scheduler.mjs';
import { verifyByteEvidence } from './evidence.mjs';
import { preserveInputPreimages } from './preimages.mjs';

function seconds(value) {
  const days = value.includes('-') ? Number(value.split('-')[0]) : 0;
  const parts = value.split('-').at(-1).split(':').map(Number);
  return days * 86400 + parts.reduce((sum, part) => sum * 60 + part, 0);
}

/** Observe only the new registered process group, not a computer inventory. */
export async function groupSnapshot(pgid) {
  let pids;
  try { pids = (await exec('pgrep', ['-g', String(pgid)])).stdout.trim().split(/\s+/).filter(Boolean); }
  catch (error) { if (error.code === 1) return { processes: [], rssBytes: 0, cpuSeconds: 0, zombies: [] }; throw error; }
  if (!pids.length) return { processes: [], rssBytes: 0, cpuSeconds: 0, zombies: [] };
  let stdout;
  try { ({ stdout } = await exec('ps', ['-p', pids.join(','), '-o', 'pid=,ppid=,pgid=,rss=,time=,stat='])); }
  catch (error) { if (error.code === 1) return { processes: [], rssBytes: 0, cpuSeconds: 0, zombies: [] }; throw error; }
  const rows = stdout.trim().split('\n').filter(Boolean).map(line => {
    const [pid, ppid, group, rssKiB, cpu, state] = line.trim().split(/\s+/);
    return { pid: Number(pid), ppid: Number(ppid), pgid: Number(group), rssBytes: Number(rssKiB) * 1024, cpuSeconds: seconds(cpu), state };
  });
  assert(rows.every(row => row.pgid === pgid && Number.isFinite(row.rssBytes) && Number.isFinite(row.cpuSeconds)), 'PROCESS_OBSERVATION', 'Malformed process-group observation');
  const processes = rows.filter(row => !row.state.startsWith('Z'));
  return { processes, rssBytes: processes.reduce((sum, row) => sum + row.rssBytes, 0), cpuSeconds: rows.reduce((sum, row) => sum + row.cpuSeconds, 0), zombies: rows.filter(row => row.state.startsWith('Z')).map(row => row.pid) };
}

function signalGroup(pgid, signal) { try { process.kill(-pgid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } }

export async function stopGroup(pgid, grace) {
  signalGroup(pgid, 'SIGTERM');
  const deadline = Date.now() + grace;
  while (Date.now() < deadline) { if (!(await groupSnapshot(pgid)).processes.length) return { groupGone: true, escalated: false, unknown: false }; await sleep(30); }
  signalGroup(pgid, 'SIGKILL');
  for (let i = 0; i < 40; i++) { if (!(await groupSnapshot(pgid)).processes.length) return { groupGone: true, escalated: true, unknown: false }; await sleep(30); }
  return { groupGone: false, escalated: true, unknown: true };
}

export async function executeNext(context, options = {}) {
  const grant = await grantNext(context, options);
  return executeGrant(context, grant);
}

export async function ownedEnvironment(context, explicit = {}, overrides = {}) {
  const paths = {
    COLIMA_HOME: '.runtime/colima', LIMA_HOME: '.runtime/lima', DOCKER_CONFIG: '.runtime/docker-config', BUILDX_CONFIG: '.runtime/docker-config/buildx',
    PNPM_HOME: '.local/bin', PYTHONPYCACHEPREFIX: '.cache/python', GOCACHE: '.cache/go-build', GOMODCACHE: '.cache/go-mod', CARGO_HOME: '.cache/cargo', RUSTUP_HOME: '.cache/rustup', npm_config_store_dir: '.cache/pnpm',
  };
  const environment = { PATH: process.env.PATH, HOME: process.env.HOME, LANG: 'C.UTF-8', TZ: 'UTC' };
  for (const [name, fallback] of Object.entries(paths)) {
    const value = explicit[name] ?? process.env[name] ?? join(context.root, fallback);
    await ownedPath(context.root, value); environment[name] = value;
  }
  const host = explicit.DOCKER_HOST ?? process.env.DOCKER_HOST ?? 'unix://' + join(context.root, '.runtime/colima/triplex/docker.sock');
  assert(host.startsWith('unix://'), 'PRIVATE_DOCKER', 'Only the owned local Unix Docker endpoint is admitted');
  const socket = host.slice('unix://'.length);
  assert(inside(context.root, socket), 'PRIVATE_DOCKER', 'Docker socket escapes the owned workspace');
  // Colima may publish an in-quota socket symlink. Permit that only when its
  // resolved target remains in the same owned filesystem; never a default daemon.
  if (await exists(socket)) {
    const target = await fs.realpath(socket);
    assert(inside(context.root, target) && (await fs.stat(target)).dev === context.owner.rootDevice, 'PRIVATE_DOCKER', 'Docker socket target is not owned');
  }
  environment.DOCKER_HOST = host;
  assert(!explicit.DOCKER_CONTEXT && !explicit.DOCKER_TLS_VERIFY && !explicit.DOCKER_CERT_PATH, 'PRIVATE_DOCKER', 'Context/TLS overrides can bypass the owned Unix endpoint');
  return { ...environment, ...explicit, ...overrides, DOCKER_HOST: host };
}

export async function executeGrant(context, grant) {
  const started = performance.now();
  const manifest = grant.manifest;
  const { resources } = manifest;
  let worker;
  let primary = null;
  let reason = null;
  let cleanup = { groupGone: true, escalated: false, unknown: false };
  let outcome = null;
  let evidence = null;
  let peakRssBytes = 0;
  let peakCpuSeconds = 0;
  let samples = 0;
  let workerExit;
  let sampleHandle;
  let controllerPins;
  const scratch = join(grant.directory, 'scratch');
  const artifactDirectory = join(grant.directory, 'artifacts');
  const signalCancel = signal => { reason ??= { kind: 'canceled', detail: 'controller received ' + signal }; };
  const sigint = () => signalCancel('SIGINT');
  const sigterm = () => signalCancel('SIGTERM');
  process.on('SIGINT', sigint); process.on('SIGTERM', sigterm);
  try {
    const inputs = await pinInputs(context, manifest.inputs);
    controllerPins = await controllerBinding(context);
    const cwd = await ownedPath(context.root, manifest.command.cwd, { allowRoot: true });
    await fs.mkdir(scratch); await fs.mkdir(artifactDirectory);
    for (const name of ['tmp', 'cache', 'npm', 'pip', 'gradle']) await fs.mkdir(join(scratch, name));
    const env = await ownedEnvironment(context, manifest.command.env, {
      TMPDIR: join(scratch, 'tmp'), TMP: join(scratch, 'tmp'), TEMP: join(scratch, 'tmp'),
      XDG_CACHE_HOME: join(scratch, 'cache'), npm_config_cache: join(scratch, 'npm'),
      PIP_CACHE_DIR: join(scratch, 'pip'), GRADLE_USER_HOME: join(scratch, 'gradle'),
      TRIPLEX_RUN_DIRECTORY: grant.directory, TRIPLEX_RUN_ARTIFACTS: artifactDirectory,
      TRIPLEX_DEVLOOP_JOB_ID: grant.jobId, TRIPLEX_DEVLOOP_ATTEMPT_ID: grant.attemptId,
      TRIPLEX_RESOURCE_ADMISSION: join(grant.directory, 'grant.json'),
      TRIPLEX_RESOURCE_ADMISSION_SHA256: await hashFile(join(grant.directory, 'grant.json')),
    });
    const argv = manifest.command.argv.map(value => value.replaceAll('{RUN_ARTIFACTS}', artifactDirectory).replaceAll('{RUN_DIRECTORY}', grant.directory));
    const command = { argv, cwd, explicitEnvironment: manifest.command.env ?? {}, ownedFoundationEnvironment: Object.fromEntries(['COLIMA_HOME', 'LIMA_HOME', 'DOCKER_CONFIG', 'DOCKER_HOST', 'BUILDX_CONFIG', 'PNPM_HOME', 'PYTHONPYCACHEPREFIX', 'GOCACHE', 'GOMODCACHE', 'CARGO_HOME', 'RUSTUP_HOME', 'npm_config_store_dir'].map(key => [key, env[key]])), cacheEnvironment: Object.fromEntries(['TMPDIR', 'XDG_CACHE_HOME', 'npm_config_cache', 'PIP_CACHE_DIR', 'GRADLE_USER_HOME', 'TRIPLEX_RUN_DIRECTORY', 'TRIPLEX_RUN_ARTIFACTS'].map(key => [key, env[key]])), inheritedEnvironmentRecorded: false };
    const sourcePreimages = await preserveInputPreimages(context, [...inputs, ...controllerPins], relative(context.root, join(grant.directory, 'source-preimages.json')), { phase: 'actual-invocation-controller-and-declared-inputs' });
    await atomicJson(join(grant.directory, 'inputs.json'), { format: 'triplex-devloop-input-snapshot/1', pins: inputs, fingerprint: inputFingerprint(inputs), controllerPins, sourcePreimages, baseline: await baselineBinding(context), command, node: { executable: process.execPath, executableSha256: await hashFile(process.execPath), version: process.version }, queryPath: manifest.queryPath, backend: manifest.backend, logicalTaskId: manifest.logicalTaskId, profile: manifest.profile ?? null, paramsAndCut: manifest.paramsAndCut ?? null }, { exclusive: true });
    const request = join(grant.directory, 'worker-request.json');
    await atomicJson(request, { token: grant.token, argv: command.argv, cwd, env, graceMilliseconds: context.policy.terminationGraceMilliseconds }, { exclusive: true });
    // Do not retain an inherited environment snapshot: the worker request is an
    // ephemeral private handoff removed before the terminal record is published.
    const stdout = await fs.open(join(grant.directory, 'stdout.log'), 'wx', 0o600);
    const stderr = await fs.open(join(grant.directory, 'stderr.log'), 'wx', 0o600);
    try {
      worker = spawn(process.execPath, [fileURLToPath(new URL('./worker.mjs', import.meta.url)), request], { cwd: context.root, env, detached: true, stdio: ['pipe', stdout.fd, stderr.fd], shell: false });
      workerExit = new Promise((resolve, reject) => { worker.once('error', reject); worker.once('exit', (code, signal) => resolve({ code, signal })); });
    } finally { await stdout.close(); await stderr.close(); }
    assert(worker.pid, 'SPAWN', 'Worker did not acquire a PID');
    const identity = await processIdentity(worker.pid);
    assert(identity, 'SPAWN', 'Registered worker exited before START');
    await locked(context, async state => {
      const job = state.jobs[grant.jobId]; const attempt = job.attempts.at(-1);
      assert(attempt.token === grant.token && job.status === 'granted', 'GRANT_OWNER', 'Grant is no longer owned');
      attempt.worker = { pid: worker.pid, pgid: worker.pid, identity }; attempt.status = 'running'; attempt.startedAt = now(); job.status = 'running';
      await event(context, { type: 'started', jobId: grant.jobId, attemptId: grant.attemptId, worker: attempt.worker });
    });
    worker.stdin.on('error', () => {});
    worker.stdin.write('START ' + grant.token + '\n');
    sampleHandle = await fs.open(join(grant.directory, 'resources.jsonl'), 'wx', 0o600);
    let exited = false;
    let lastStorageObservation = 0;
    workerExit.then(() => { exited = true; }, error => { primary = error; exited = true; });
    while (!exited) {
      const observation = await groupSnapshot(worker.pid);
      const controllerRssBytes = process.memoryUsage().rss;
      const accountedRssBytes = observation.rssBytes + controllerRssBytes;
      samples++; peakRssBytes = Math.max(peakRssBytes, accountedRssBytes); peakCpuSeconds = Math.max(peakCpuSeconds, observation.cpuSeconds);
      await sampleHandle.writeFile(JSON.stringify({ elapsedMilliseconds: performance.now() - started, controllerRssBytes, accountedRssBytes, ...observation }) + '\n');
      if (accountedRssBytes > resources.memoryBytes) reason ??= { kind: 'resource_breach', detail: 'Sampled controller plus owned process-group RSS exceeded its declared reservation' };
      const logs = await Promise.all(['stdout.log', 'stderr.log'].map(name => fs.stat(join(grant.directory, name))));
      if (logs.reduce((sum, stat) => sum + stat.size, 0) > resources.maximumLogBytes) reason ??= { kind: 'resource_breach', detail: 'Attempt log byte budget exceeded' };
      if (performance.now() - started > resources.timeoutMilliseconds) reason ??= { kind: 'deadline', detail: 'Whole process invocation deadline exceeded' };
      const state = await readJson(join(context.directory, 'state.json'));
      const cancellation = state.jobs[grant.jobId].cancelRequested;
      if (cancellation) reason ??= { kind: 'canceled', detail: cancellation.reason };
      if (performance.now() - lastStorageObservation >= 5000) {
        try { await storageObservation(context); } catch (error) { reason ??= { kind: 'resource_breach', detail: error.message }; }
        lastStorageObservation = performance.now();
      }
      if (reason) { cleanup = await stopGroup(worker.pid, context.policy.terminationGraceMilliseconds); break; }
      await sleep(context.policy.sampleMilliseconds);
    }
    const exit = await workerExit;
    if (await exists(join(grant.directory, 'main-outcome.json'))) outcome = await readJson(join(grant.directory, 'main-outcome.json'));
    else outcome = { code: exit.code, signal: exit.signal, noCommandOutcome: true };
    const remaining = await groupSnapshot(worker.pid);
    if (remaining.processes.length) {
      reason ??= { kind: 'orphan_descendants', detail: 'Command exited while owned descendants remained active' };
      cleanup = await stopGroup(worker.pid, context.policy.terminationGraceMilliseconds);
    }
    await pinInputs(context, manifest.inputs);
    await pinInputs(context, controllerPins);
    if (!reason && outcome.code === 0 && !outcome.spawnError) evidence = await verifyByteEvidence(context, grant);
  } catch (error) {
    primary = error;
    if (worker?.pid) {
      try { cleanup = await stopGroup(worker.pid, context.policy.terminationGraceMilliseconds); } catch (failure) { cleanup = { groupGone: false, unknown: true, error: failure.message }; }
      try { await workerExit; } catch {}
    }
  } finally {
    worker?.stdin.destroy();
    if (sampleHandle) { await sampleHandle.sync(); await sampleHandle.close(); }
    await fs.rm(join(grant.directory, 'worker-request.json'), { force: true });
    process.off('SIGINT', sigint); process.off('SIGTERM', sigterm);
  }
  // Failure diagnostics are evidence too. Anchor their retained bytes for every
  // outcome, even when a nonzero process exit prevents semantic byte checks.
  // Never follow a substituted artifact directory or entry into unowned files.
  // Inspiration/rationale: wiki/decisions/operating-policy.md first-failure policy.
  let artifactFiles = [];
  try {
    const artifactRoot = await ownedPath(grant.directory, 'artifacts');
    if (await exists(artifactRoot)) artifactFiles = await fileTree(artifactRoot);
  } catch (error) { primary ??= error; }
  let status = cleanup.unknown ? 'cleanup_unknown' : primary ? 'integrity_or_infrastructure_failure' : reason ? reason.kind : outcome?.code !== 0 || outcome?.spawnError ? 'failed_process' : evidence?.allRegisteredChecksPassed === false ? 'failed_oracle' : evidence?.checks.length ? 'completed_verified_bytes' : 'completed_process_only';
  const outputs = [];
  for (const name of ['owner.json', 'grant.json', 'stdout.log', 'stderr.log', 'resources.jsonl', 'inputs.json', 'source-preimages.json', 'main-outcome.json', 'evidence.json']) if (await exists(join(grant.directory, name))) outputs.push({ path: name, bytes: (await fs.stat(join(grant.directory, name))).size, sha256: await hashFile(join(grant.directory, name)) });
  for (const artifact of artifactFiles) outputs.push({ ...artifact, path: 'artifacts/' + artifact.path });
  const terminal = {
    format: 'triplex-devloop-terminal/1', at: now(), jobId: grant.jobId, attemptId: grant.attemptId,
    manifestSha256: digest(JSON.stringify(manifest, null, 2) + '\n'), status, reason,
    commandOutcome: outcome, failure: primary ? { code: primary.code ?? 'ERROR', message: primary.message } : null,
    cleanup, elapsedMilliseconds: performance.now() - started, resources: { samples, sampledPeakProcessGroupRssBytes: peakRssBytes, observedCpuSecondsMaximum: peakCpuSeconds, reservation: resources, memoryMeaning: context.policy.memorySupervision, physicalContainmentProved: false },
    evidenceSummary: evidence ? { checks: evidence.checks.length, passed: evidence.checks.filter(check => check.passed).length, claim: evidence.claim } : null,
    outputs, semanticPromotion: 'NOT_IMPLIED_BY_PROCESS_EXIT_OR_BYTE_CHECKS', backendReconciliation: manifest.backendReconciliation ?? 'Backend durability/ACK state is a separate declared gate',
  };
  await atomicJson(join(grant.directory, 'terminal.json'), terminal, { exclusive: true });
  await locked(context, async state => {
    const job = state.jobs[grant.jobId]; const attempt = job.attempts.at(-1);
    assert(attempt.token === grant.token, 'GRANT_OWNER', 'Terminal grant token differs');
    attempt.status = status; attempt.finishedAt = terminal.at; attempt.terminalSha256 = await hashFile(join(grant.directory, 'terminal.json')); job.status = status;
    if (!job.firstOutcome) job.firstOutcome = { attemptId: attempt.id, status, terminalSha256: attempt.terminalSha256 };
    await event(context, { type: 'terminal', jobId: grant.jobId, attemptId: grant.attemptId, status, terminalSha256: attempt.terminalSha256 });
  });
  return { ...terminal, directory: relative(context.root, grant.directory) };
}
