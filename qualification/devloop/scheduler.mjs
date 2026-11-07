import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { assert, atomicJson, digest, exec, exists, fail, hashFile, json, now, ownedPath, processIdentity, readJson, sameProcess } from './io.mjs';
import { baselineBinding, event, inputFingerprint, loadJobManifest, locked, manifestHeader, pinInputs, sidecarReference, storageObservation } from './state.mjs';
import { verifyAttempt } from './evidence.mjs';
import { preserveInputPreimages, verifyInputPreimages } from './preimages.mjs';

const identifier = value => typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,100}$/.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const active = job => ['granted', 'running', 'cleanup_unknown'].includes(job.status);
const successful = job => ['completed_verified_bytes', 'completed_process_only'].includes(job.status);

export function validateManifest(manifest, policy) {
  assert(manifest?.format === 'triplex-devloop-job/1', 'MANIFEST', 'Expected triplex-devloop-job/1');
  assert(identifier(manifest.id), 'MANIFEST', 'Job id must be a stable safe identifier');
  assert(['prerequisite', 'fixture', 'hypothesis', 'verification', 'calibration', 'benchmark'].includes(manifest.kind), 'MANIFEST', 'Unknown job kind');
  assert(Object.hasOwn(policy.lanes, manifest.queryPath), 'LANE', 'Unknown query surface');
  assert(manifest.backend === policy.lanes[manifest.queryPath], 'LANE', 'Query surface and engine foundation differ');
  for (const field of ['problemId', 'hypothesis', 'logicalTaskId', 'author']) assert(typeof manifest[field] === 'string' && manifest[field].length > 0, 'MANIFEST', field + ' is required');
  assert(Array.isArray(manifest.goals) && manifest.goals.length && manifest.goals.every(goal => Number.isInteger(goal) && goal >= 1 && goal <= 10), 'MANIFEST', 'Affected goals must be in 1..10');
  assert(Array.isArray(manifest.dependsOn) && manifest.dependsOn.every(identifier), 'MANIFEST', 'Dependencies must be job ids');
  assert(Array.isArray(manifest.inspiration) && manifest.inspiration.length > 0 && manifest.inspiration.every(source => typeof source.reference === 'string' && typeof source.mechanism === 'string' && typeof source.adaptation === 'string'), 'MANIFEST', 'Source mechanism, adaptation and reference are required');
  if (manifest.command === null) {
    assert(manifest.kind === 'hypothesis' || manifest.kind === 'prerequisite', 'MANIFEST', 'Only queued hypotheses/prerequisites may await an execution contract');
    return;
  }
  const command = manifest.command;
  assert(command && Array.isArray(command.argv) && command.argv.length > 0 && command.argv.every(arg => typeof arg === 'string' && !arg.includes('\0')), 'COMMAND', 'Command is an argv array; shells are not implicit');
  assert(typeof command.cwd === 'string' && command.cwd.length > 0, 'COMMAND', 'Command cwd is required');
  assert(command.env === undefined || command.env && Object.entries(command.env).every(([key, value]) => /^[A-Z_a-z][A-Z_a-z0-9]*$/.test(key) && typeof value === 'string'), 'COMMAND', 'Environment overrides must be string values');
  for (const key of ['HOME', 'CODEX_HOME']) assert(!Object.hasOwn(command.env ?? {}, key), 'COMMAND', 'Do not redirect ' + key);
  const resources = manifest.resources;
  assert(resources && typeof resources.heavy === 'boolean', 'RESOURCES', 'Explicit heavy classification is required');
  for (const key of ['memoryBytes', 'cpuUnits', 'diskBytes', 'timeoutMilliseconds']) assert(integer(resources[key]), 'RESOURCES', 'Integer resource ' + key + ' is required');
  assert(resources.memoryBytes >= 1 && resources.memoryBytes <= policy.memoryPoolBytes, 'CAPACITY', 'Job exceeds the shared memory pool');
  assert(resources.cpuUnits >= 1 && resources.cpuUnits <= policy.cpuPoolUnits, 'CAPACITY', 'Job exceeds the CPU pool');
  assert(resources.timeoutMilliseconds >= 1 && resources.timeoutMilliseconds <= 24 * 3600 * 1000, 'RESOURCES', 'A finite timeout up to one day is required');
  assert(integer(resources.maximumLogBytes) && resources.maximumLogBytes >= 1024 && resources.maximumLogBytes <= policy.maximumLogBytesPerAttempt, 'RESOURCES', 'Bounded logs are required');
  assert(Array.isArray(manifest.inputs) && manifest.inputs.length > 0, 'INPUTS', 'A runnable job needs exact input pins');
  const roles = new Set(manifest.inputs.map(input => input.role));
  assert(roles.has('source') && roles.has('runner'), 'INPUTS', 'Source and runner pins are mandatory');
  if (['benchmark', 'calibration', 'verification'].includes(manifest.kind)) assert(roles.has('build') && roles.has('oracle'), 'INPUTS', 'Qualification/load jobs must pin actual built artifacts and independent oracles');
  if (['benchmark', 'calibration'].includes(manifest.kind) && manifest.queryPath.endsWith('-native')) assert(['native-query', 'mapping', 'codec'].every(role => roles.has(role)), 'INPUTS', 'Native load trials must pin authored query, schema mapping and typed codec');
  assert(manifest.evidence && Array.isArray(manifest.evidence.checks) && Array.isArray(manifest.evidence.requiredCheckKeys), 'EVIDENCE', 'Explicit byte-oracle checks or an empty process-only contract are required');
  const keys = manifest.evidence.checks.map(check => check.key);
  assert(new Set(keys).size === keys.length && keys.every(identifier), 'EVIDENCE', 'Check keys must be unique safe identifiers');
  for (const check of manifest.evidence.checks) {
    assert(typeof check.expectedInput === 'string' && manifest.inputs.some(input => input.path === check.expectedInput && input.role === 'oracle'), 'EVIDENCE', 'Expected result must be a pinned independent oracle input');
    assert(typeof check.actual === 'string' && check.actual.startsWith('artifacts/') && !check.actual.split('/').some(piece => piece === '..' || piece === '.'), 'EVIDENCE', 'Actual result must stay under the retained artifacts directory');
  }
  assert(manifest.evidence.requiredCheckKeys.every(key => keys.includes(key)), 'EVIDENCE', 'Required checks must be registered before execution');
  if (['benchmark', 'calibration'].includes(manifest.kind)) assert(manifest.profile && typeof manifest.evidence.events === 'string' && manifest.evidence.events.startsWith('artifacts/') && !manifest.evidence.events.split('/').some(piece => piece === '..' || piece === '.'), 'PROFILE', 'Load trials require a named profile and retained raw request events');
}

export async function enqueue(context, manifest) {
  validateManifest(manifest, context.policy);
  let inputPins = [];
  if (manifest.command) {
    await ownedPath(context.root, manifest.command.cwd, { allowRoot: true });
    inputPins = await pinInputs(context, manifest.inputs);
  }
  const binding = await baselineBinding(context);
  return locked(context, async state => {
    assert(!state.jobs[manifest.id], 'EXISTS', 'Job already exists; preserve it and create a new revision or retry');
    assert(!manifest.dependsOn.includes(manifest.id), 'DEPENDENCY', 'Job cannot depend on itself');
    const visit = (id, seen = new Set()) => {
      assert(!seen.has(id), 'DEPENDENCY', 'Dependency cycle');
      if (!state.jobs[id]) return;
      for (const other of state.jobs[id].manifest.dependsOn) visit(other, new Set([...seen, id]));
    };
    for (const dependency of manifest.dependsOn) visit(dependency, new Set([manifest.id]));
    const directory = join(context.directory, 'jobs', manifest.id);
    await fs.mkdir(directory, { recursive: true });
    const sourcePreimages = manifest.command ? await preserveInputPreimages(context, inputPins, relative(context.root, join(directory, 'source-preimages.json')), { phase: 'frozen-job-contract' }) : undefined;
    const envelope = { format: 'triplex-devloop-job-envelope/1', manifest, manifestSha256: digest(json(manifest)), baseline: binding, enqueuedAt: now(), ...(sourcePreimages ? { sourcePreimages } : {}) };
    await atomicJson(join(directory, 'manifest.json'), envelope, { exclusive: true });
    const manifestRef = await sidecarReference(context, relative(context.root, join(directory, 'manifest.json')));
    const job = { manifest: manifestHeader(manifest), manifestRef, manifestSha256: envelope.manifestSha256, baseline: binding, status: 'queued', enqueuedAt: envelope.enqueuedAt, attempts: [], retryReasons: [], ...(sourcePreimages ? { sourcePreimages } : {}) };
    state.jobs[manifest.id] = job;
    await event(context, { type: 'enqueued', jobId: manifest.id, queryPath: manifest.queryPath, runnable: Boolean(manifest.command), manifestSha256: envelope.manifestSha256 });
    return { id: manifest.id, status: job.status, runnable: Boolean(manifest.command), manifestSha256: envelope.manifestSha256 };
  });
}

export function reservations(state) {
  const used = { heavy: 0, memoryBytes: 0, cpuUnits: 0, diskBytes: 0 };
  for (const owner of Object.values(state.owners)) if (owner.status === 'active' || owner.status === 'unknown') {
    used.memoryBytes += owner.resources.memoryBytes;
    used.cpuUnits += owner.resources.cpuUnits;
    used.diskBytes += owner.resources.diskBytes;
  }
  for (const job of Object.values(state.jobs)) if (active(job)) {
    used.heavy += job.manifest.resources.heavy ? 1 : 0;
    for (const key of ['memoryBytes', 'cpuUnits', 'diskBytes']) used[key] += job.manifest.resources[key];
  }
  return used;
}

export function readiness(state, job) {
  if (job.status !== 'queued') return job.status;
  if (!job.manifest.command) return 'execution-contract-required';
  for (const dependency of job.manifest.dependsOn) {
    if (!state.jobs[dependency]) return 'missing-dependency:' + dependency;
    if (!successful(state.jobs[dependency])) return 'dependency-not-complete:' + dependency;
  }
  for (const owner of job.manifest.requiredOwners ?? []) if (state.owners[owner]?.status !== 'active') return 'resident-owner-not-active:' + owner;
  return 'ready';
}

// Fair lane opportunities borrow the round-robin idea, with queue age breaking
// ties. Unlike the archived global fair-run lease, admission is a vector and
// can grant three nonconflicting trials (wiki/decisions/operating-policy.md).
export function selectNext(context, state, { onlyJob, freeBytes } = {}) {
  const used = reservations(state);
  const candidates = Object.values(state.jobs).filter(job => readiness(state, job) === 'ready').sort((a, b) => {
    const lastA = state.lastLaneGrant[a.manifest.queryPath] ?? 0;
    const lastB = state.lastLaneGrant[b.manifest.queryPath] ?? 0;
    return lastA - lastB || a.enqueuedAt.localeCompare(b.enqueuedAt) || a.manifest.id.localeCompare(b.manifest.id);
  });
  for (const job of candidates) {
    const resource = job.manifest.resources;
    if (used.heavy + Number(resource.heavy) > context.policy.maximumHeavyTrials || used.memoryBytes + resource.memoryBytes > context.policy.memoryPoolBytes || used.cpuUnits + resource.cpuUnits > context.policy.cpuPoolUnits || used.diskBytes + resource.diskBytes > freeBytes) continue;
    if (onlyJob && job.manifest.id !== onlyJob) fail('FAIR_QUEUE', 'An older eligible lane has the next opportunity: ' + job.manifest.id);
    return job;
  }
  return null;
}

async function freeInside(context) {
  const observed = await storageObservation(context);
  return Math.min(observed.freeInsideBytes, observed.operationalMaximumBytes - observed.ownedCountedBytes);
}

export function validateRequiredResidentObservation(owner, observation) {
  if (owner.kind === 'docker') {
    assert(observation.running === true && observation.containerId === owner.containerId && observation.imageSha256 === owner.imageSha256, 'OWNER_STALE', 'Required Docker owner is stopped or its identity differs');
    assert(typeof owner.observation?.startedAt === 'string' && observation.startedAt === owner.observation.startedAt, 'OWNER_STALE', 'Required Docker owner restarted without a fresh anchored readiness receipt');
    assert(observation.memoryBytes === owner.resources.memoryBytes && observation.cpuUnits === owner.resources.cpuUnits, 'OWNER_STALE', 'Required Docker owner resource caps differ');
  } else {
    assert(observation.pid === owner.pid && observation.identity && observation.identity === owner.identity, 'OWNER_STALE', 'Required Mac resident PID is stopped or its birth identity differs');
  }
}

async function requiredOwnerObservation(context, owner) {
  // Cached ACTIVE survived a real QLever OOM until reconcile; the resulting
  // unavailable-server attempt was setup failure, not a MINUS-arm result.
  // Reuse the private owner validator immediately before granting work; retain
  // unknown reservations. Inspiration: wiki/problems/recovery.md and Bv1.
  const observation = owner.kind === 'docker'
    ? await inspectDocker(context, owner)
    : { pid:owner.pid, identity:await processIdentity(owner.pid) };
  validateRequiredResidentObservation(owner, observation);
  return { ownerId:owner.id, checkedAt:now(), observation };
}

export async function grantNext(context, { onlyJob, executor = 'unassigned' } = {}) {
  const freeBytes = await freeInside(context);
  const processOwner = { pid: process.pid, identity: await processIdentity(process.pid), executor };
  const grant = await locked(context, async state => {
    const job = selectNext(context, state, { onlyJob, freeBytes });
    assert(job, 'NO_ADMISSION', 'No ready job fits all resource dimensions');
    const manifest = await loadJobManifest(context, job);
    if (job.sourcePreimages) await verifyInputPreimages(context, job.sourcePreimages, { inputs: manifest.inputs });
    const inputs = await pinInputs(context, manifest.inputs);
    const ownerIds = [...new Set(job.manifest.requiredOwners ?? [])];
    const health = await Promise.allSettled(ownerIds.map(id => requiredOwnerObservation(context, state.owners[id])));
    const requiredOwnerChecks = [];
    const failures = [];
    for (let index=0; index<health.length; index++) {
      const result=health[index], owner=state.owners[ownerIds[index]];
      if (result.status === 'fulfilled') { requiredOwnerChecks.push(result.value); continue; }
      const failure={ ownerId:owner.id, jobId:job.manifest.id, at:now(), code:result.reason?.code ?? 'OWNER_UNAVAILABLE', message:String(result.reason?.message ?? result.reason).slice(0,1024) };
      owner.status='unknown'; owner.lastRequiredOwnerFailure=failure; failures.push(failure);
    }
    if (failures.length) {
      await event(context, { type:'required_owner_stale_grant_refused', jobId:job.manifest.id, failures, reservationRetained:true, childStarted:false });
      // Resolve the locked operation so UNKNOWN is durably published before
      // raising outside it. Throwing here would discard that state transition.
      return { denied:{code:'OWNER_STALE',message:'Required resident freshness failed; reservation retained and no attempt created: '+failures.map(failure=>failure.ownerId).join(', ')} };
    }
    const token = randomUUID();
    const attemptId = String(job.attempts.length + 1).padStart(4, '0');
    const directory = join(context.directory, 'jobs', job.manifest.id, 'attempts', attemptId);
    await fs.mkdir(directory, { recursive: true });
    const owner = { format: 'triplex-devloop-attempt-owner/1', id: job.manifest.id, attemptId, token, stateOwner: context.owner.id, root: context.root, directory, rootDevice: context.owner.rootDevice };
    await atomicJson(join(directory, 'owner.json'), owner, { exclusive: true });
    const attempt = { id: attemptId, token, directory: relative(context.root, directory), grantedAt: now(), executor: processOwner, status: 'granted', manifestSha256: job.manifestSha256, inputFingerprint: inputFingerprint(inputs) };
    await atomicJson(join(directory, 'grant.json'), {
      format: 'triplex-devloop-resource-admission/1', proofPolicy: context.policy.proofPolicy ?? 'component-test-only', state: 'ADMITTED', localResourcesOnly: true,
      ...attempt, jobId: job.manifest.id, attemptId, queryPath: job.manifest.queryPath, backend: job.manifest.backend,
      root: context.root, directory, controller: processOwner, baselineSha256: job.baseline.baselineSha256,
      controllerInvocation: { execArgv:[...process.execArgv], nodeOptions:process.env.NODE_OPTIONS ?? null },
      volumeUuid: context.storage.volumeUuid ?? null, resources: job.manifest.resources,
      requiredOwnerChecks,
      policySha256: context.test ? null : await hashFile(join(context.root, 'qualification/devloop/policy.json')),
      cohort: Object.values(state.jobs).filter(active).map(peer => ({ jobId: peer.manifest.id, queryPath: peer.manifest.queryPath, resources: peer.manifest.resources })), residentOwners: state.owners,
    }, { exclusive: true });
    job.attempts.push(attempt); job.status = 'granted';
    state.lastLaneGrant[job.manifest.queryPath] = state.revision + 1;
    await event(context, { type: 'granted', jobId: job.manifest.id, attemptId, token, resources: job.manifest.resources });
    return { jobId: job.manifest.id, attemptId, token, directory, manifest, executor: processOwner };
  });
  if (grant.denied) fail(grant.denied.code, grant.denied.message);
  return grant;
}

export async function requestCancel(context, id, reason) {
  assert(typeof reason === 'string' && reason.length > 0, 'REASON', 'Cancellation reason is required');
  return locked(context, async state => {
    const job = state.jobs[id]; assert(job, 'MISSING', 'Unknown job');
    assert(['queued', 'granted', 'running'].includes(job.status), 'STATE', 'Job is not cancelable');
    if (job.status === 'queued') job.status = 'canceled_before_start';
    else job.cancelRequested = { reason, at: now() };
    await event(context, { type: 'cancel_requested', jobId: id, reason });
    return { id, status: job.status, cancelRequested: job.cancelRequested ?? null };
  });
}

export async function retryJob(context, id, reason) {
  assert(typeof reason === 'string' && reason.length >= 8, 'REASON', 'Describe the repair or replication reason');
  return locked(context, async state => {
    const job = state.jobs[id]; assert(job, 'MISSING', 'Unknown job');
    assert(!active(job) && job.status !== 'queued', 'STATE', 'An active/queued job cannot be retried');
    await pinInputs(context, (await loadJobManifest(context, job)).inputs);
    job.retryReasons.push({ at: now(), reason, previousStatus: job.status, previousAttempt: job.attempts.at(-1)?.id ?? null });
    job.status = 'queued'; delete job.cancelRequested;
    await event(context, { type: 'retry_queued', jobId: id, reason });
    return { id, status: job.status, previousAttemptsPreserved: job.attempts.length };
  });
}

export async function registerResident(context, spec) {
  assert(identifier(spec.id) && Object.values(context.policy.lanes).includes(spec.backend), 'OWNER', 'Resident owner id/backend required');
  for (const key of ['memoryBytes', 'diskBytes']) assert(integer(spec.resources?.[key]), 'OWNER', 'Resident reservation is required');
  assert(Number.isFinite(spec.resources?.cpuUnits), 'OWNER', 'Resident CPU units must be finite');
  assert(spec.resources.memoryBytes > 0 && spec.resources.cpuUnits > 0, 'OWNER', 'Resident reservations must be nonzero');
  const mode = spec.registrationMode ?? 'running';
  assert(mode === 'running' || mode === 'prepared-stopped', 'OWNER', 'Unknown resident registration mode');
  const prepared = mode === 'prepared-stopped';
  assert(!prepared || spec.kind === 'docker', 'OWNER', 'Prepared-stopped registration requires an exact Docker owner');
  const freeBytes = prepared ? await freeInside(context) : null;
  let identity;
  let observation;
  if (spec.kind === 'docker') {
    observation = await inspectDocker(context, spec, prepared ? { requireStopped: true } : undefined);
    identity = observation.containerId;
  } else {
    assert(Number.isSafeInteger(spec.pid) && spec.pid > 0, 'OWNER', 'A local observed PID is required; guest IDs cannot be used');
    identity = await processIdentity(spec.pid);
    assert(identity, 'OWNER', 'Resident process is not live');
  }
  const inputs = await pinInputs(context, spec.inputs);
  const directory = await ownedPath(context.root, spec.directory);
  assert((await fs.stat(directory)).isDirectory(), 'OWNER', 'Resident directory does not exist');
  return locked(context, async state => {
    // The stopped fault-copy owner must not overwrite any prior registration,
    // including a released one. Its main foundation keeps its UNKNOWN budget.
    // Source: experiments/qlever-native-fault-v2/CONTROLLED-STOP.md; this is
    // preparation only, not startup, readiness, or durability qualification.
    assert(!prepared || !state.owners[spec.id], 'OWNER', 'Prepared-stopped registration requires a fresh owner id; history is retained');
    assert(!state.owners[spec.id] || state.owners[spec.id].status === 'released', 'OWNER', 'Resident owner already registered');
    assert(!Object.values(state.owners).some(owner => owner.status !== 'released' && owner.identity === identity), 'OWNER', 'The same resident cannot be reserved twice under sibling query surfaces');
    const used = reservations(state);
    assert(used.memoryBytes + spec.resources.memoryBytes <= context.policy.memoryPoolBytes && used.cpuUnits + spec.resources.cpuUnits <= context.policy.cpuPoolUnits, 'CAPACITY', 'Resident would exceed aggregate resources');
    assert(!prepared || used.diskBytes + spec.resources.diskBytes <= freeBytes, 'CAPACITY', 'Prepared resident would exceed current reserved disk headroom');
    const owner = { ...spec, format: 'triplex-devloop-resident/1', status: prepared ? 'unknown' : 'active', identity, observation, inputs, registeredAt: now(), token: randomUUID(), meaning: prepared ? 'Exact stopped private-daemon Docker identity/caps/mounts reserved before startup; UNKNOWN blocks required-owner trials until anchored same-CID readiness. No service was started.' : spec.kind === 'docker' ? 'Private-daemon container ID/labels/bind-mount/cgroup-cap readback; Linux guest PID is never sent to host ps. VM overhead remains separate from engine caps.' : 'Observed local process identity plus reserved resources; not an allocator containment proof.' };
    state.owners[spec.id] = owner;
    await event(context, { type: prepared ? 'resident_prepared_stopped' : 'resident_registered', id: spec.id, pid: spec.pid, resources: spec.resources });
    return owner;
  });
}

export async function releaseResident(context, id) {
  const residentAlive = async owner => owner.kind === 'docker' ? (await inspectDocker(context, owner, { allowStopped: true, requireStopped: owner.registrationMode === 'prepared-stopped' })).running : await sameProcess(owner);
  return locked(context, async state => {
    const owner = state.owners[id]; assert(owner, 'OWNER', 'Unknown resident');
    assert(!(await residentAlive(owner)), 'OWNER_LIVE', 'Stop the owned resident before releasing its reservation');
    assert(!Object.values(state.jobs).some(job => active(job) && job.manifest.requiredOwners?.includes(id)), 'OWNER_BUSY', 'A job still depends on this resident');
    owner.status = 'released'; owner.releasedAt = now();
    await event(context, { type: 'resident_released', id });
    return { id, status: owner.status };
  });
}

export function validateResidentRecovery(owner, manifest, terminal, observation, artifact, evidence) {
  const binding = manifest.residentRecovery;
  assert(owner.kind === 'docker' && owner.status === 'unknown', 'OWNER_RECOVERY', 'Only an existing UNKNOWN Docker owner can be refreshed');
  assert(manifest.kind === 'verification' && manifest.backend === owner.backend, 'OWNER_RECOVERY', 'Recovery requires a real verification job on the same foundation');
  assert(binding?.ownerId === owner.id && binding.containerId === owner.containerId && binding.imageSha256 === owner.imageSha256, 'OWNER_RECOVERY', 'Recovery owner/container/image binding differs');
  assert(terminal.status === 'completed_verified_bytes' && terminal.cleanup?.groupGone === true && !terminal.cleanup?.unknown, 'OWNER_RECOVERY', 'Recovery command must pass its byte checks and owned cleanup');
  assert(Array.isArray(binding.requiredCheckKeys) && binding.requiredCheckKeys.length > 0 && binding.requiredCheckKeys.every(key => evidence.requiredCheckKeys.includes(key) && evidence.checks.some(check => check.key === key && check.passed)), 'OWNER_RECOVERY', 'Required readiness byte checks did not pass');
  assert(observation.running && artifact.containerId === owner.containerId && artifact.imageSha256 === owner.imageSha256 && artifact.after?.Running === true && artifact.after.StartedAt === observation.startedAt, 'OWNER_RECOVERY', 'Anchored readiness and fresh private-daemon startup identity differ');
  const start = Date.parse(observation.startedAt), registered = Date.parse(owner.registeredAt), completed = Date.parse(terminal.at);
  assert(Number.isFinite(start) && Number.isFinite(registered) && Number.isFinite(completed) && start > registered && completed >= start, 'OWNER_RECOVERY', 'A fresh startup after original registration and a later completed readiness probe are required');
}

/** Reconcile one stopped/unknown foundation using a real anchored probe, never
 * by freeing/re-registering its reservation or starting an engine implicitly.
 * Inspiration: the retained QLever read-OOM failure and recovery receipts;
 * wiki/problems/recovery.md. This proves readiness only, not all durability goals.
 */
export async function refreshResident(context, id, reference) {
  const [jobId, attemptId] = reference.split('/');
  assert(identifier(jobId) && /^\d{4}$/.test(attemptId), 'RUN_REFERENCE', 'Readiness uses job-id/0001');
  return locked(context, async state => {
    const owner = state.owners[id]; assert(owner, 'OWNER', 'Unknown resident owner');
    assert(owner.status === 'unknown' && owner.kind === 'docker', 'OWNER_RECOVERY', 'Refresh requires an existing UNKNOWN Docker owner');
    assert(!Object.values(state.jobs).some(job => active(job) && job.manifest.requiredOwners?.includes(id)), 'OWNER_BUSY', 'A job still depends on the unknown resident');
    const checked = await verifyAttempt(context, jobId, attemptId);
    const job = state.jobs[jobId], attempt = job.attempts.find(value => value.id === attemptId);
    const directory = await ownedPath(context.root, attempt.directory);
    const name = job.manifest.residentRecovery?.readinessArtifact;
    assert(typeof name === 'string' && name.startsWith('artifacts/'), 'OWNER_RECOVERY', 'A retained readiness artifact is required');
    assert(checked.terminal.outputs.some(output => output.path === name), 'OWNER_RECOVERY', 'Readiness artifact is not anchored in the terminal');
    const artifact = await readJson(await ownedPath(directory, name));
    const evidence = await readJson(await ownedPath(directory, 'evidence.json'));
    const observation = await inspectDocker(context, owner);
    validateResidentRecovery(owner, job.manifest, checked.terminal, observation, artifact, evidence);
    const proof = { format:'triplex-devloop-resident-refresh/1', at:now(), id, identity:owner.identity, resourcesUnchanged:owner.resources, originalRegisteredAt:owner.registeredAt, priorObservation:owner.observation, freshObservation:observation, readiness:{reference,terminalSha256:checked.terminalSha256,artifact:name,artifactSha256:checked.terminal.outputs.find(output => output.path === name).sha256}, meaning:'SAME_OWNED_RESERVATION_FRESH_READINESS_NOT_FULL_ENGINE_QUALIFICATION' };
    const proofs = join(context.directory, 'resident-recoveries'); await fs.mkdir(proofs, { recursive:true });
    const path = join(proofs, id + '-' + randomUUID() + '.json'); await atomicJson(path, proof, { exclusive:true });
    const entry = { at:proof.at, proof:relative(context.root,path), sha256:await hashFile(path), readinessRun:reference };
    owner.recoveries ??= []; owner.recoveries.push(entry);
    owner.status='active'; owner.observation=observation; owner.refreshedAt=proof.at;
    await event(context, { type:'resident_refreshed', id, ...entry, reservationRetained:true });
    return { id, status:owner.status, reservationRetained:true, ...entry, meaning:proof.meaning };
  });
}

export async function reconcile(context) {
  return locked(context, async state => {
    const observations = [];
    for (const job of Object.values(state.jobs)) if (active(job)) {
      const attempt = job.attempts.at(-1);
      if (!(await sameProcess(attempt.executor))) {
        // Never free resources merely because a controller disappeared. The
        // worker's stdin watchdog tears down its group, but it needs observation.
        const workerAlive = attempt.worker && await sameProcess(attempt.worker);
        job.status = 'cleanup_unknown'; attempt.status = 'cleanup_unknown';
        observations.push({ jobId: job.manifest.id, workerAlive: Boolean(workerAlive), outcome: 'NEEDS_OWNED_GROUP_AND_BACKEND_RECONCILIATION', reservationRetained: true });
      }
    }
    for (const owner of Object.values(state.owners)) if (owner.status === 'active') {
      let live = false;
      try { live = owner.kind === 'docker' ? (await inspectDocker(context, owner)).running : await sameProcess(owner); } catch {}
      if (!live) { owner.status = 'unknown'; observations.push({ resident: owner.id, outcome: 'OWNER_CHANGED_RESERVATION_RETAINED' }); }
    }
    await event(context, { type: 'reconciled_observations', observations });
    return observations;
  });
}

export function dockerObservation(spec, value, root, { allowStopped = false, requireStopped = false } = {}) {
  assert(value.Id === spec.containerId && value.Image === spec.imageSha256, 'DOCKER_OWNER', 'Container/image identity differs');
  assert(allowStopped || requireStopped || value.State?.Running === true, 'DOCKER_OWNER', 'Owned container is not running');
  assert(!requireStopped || value.State?.Running === false && value.State.Pid === 0 && value.State.Paused === false && value.State.Restarting === false, 'DOCKER_OWNER', 'Prepared owner must be fully stopped, without a guest process or restart in progress');
  assert(spec.requiredLabels && Object.keys(spec.requiredLabels).length > 0 && Object.entries(spec.requiredLabels).every(([key, expected]) => value.Config?.Labels?.[key] === expected), 'DOCKER_OWNER', 'Required owned container labels differ');
  const cpuUnits = value.HostConfig?.NanoCpus > 0 ? value.HostConfig.NanoCpus / 1e9 : value.HostConfig?.CpuQuota > 0 && value.HostConfig?.CpuPeriod > 0 ? value.HostConfig.CpuQuota / value.HostConfig.CpuPeriod : null;
  assert(value.HostConfig?.Memory === spec.resources.memoryBytes && cpuUnits === spec.resources.cpuUnits, 'DOCKER_CAP', 'Actual memory/CPU caps differ from the reservation');
  assert(value.HostConfig.MemorySwap >= 0 && value.HostConfig.MemorySwap <= value.HostConfig.Memory, 'DOCKER_CAP', 'Unbounded/extra swap is not admitted');
  const mounts = (value.Mounts ?? []).map(mount => ({ type: mount.Type, source: mount.Source, destination: mount.Destination, writable: mount.RW }));
  const host = spec.directory;
  assert(mounts.some(mount => mount.type === 'bind' && mount.source === host) && mounts.filter(mount => mount.writable).every(mount => mount.type === 'bind' && (mount.source === root || mount.source.startsWith(root + '/'))), 'DOCKER_MOUNT', 'Writable mounts must be explicit owned bind directories');
  return { containerId: value.Id, imageSha256: value.Image, running: Boolean(value.State?.Running), startedAt:value.State?.StartedAt, memoryBytes: value.HostConfig.Memory, cpuUnits, memorySwapBytes: value.HostConfig.MemorySwap, labels: spec.requiredLabels, mounts, guestPidMeaning: 'Guest PID deliberately excluded from host process identity' };
}

async function inspectDocker(context, spec, options) {
  assert(/^[a-f0-9]{64}$/.test(spec.containerId) && /^sha256:[a-f0-9]{64}$/.test(spec.imageSha256), 'DOCKER_OWNER', 'Exact Docker container and image ids are required');
  await ownedPath(context.root, spec.directory);
  const { stdout } = await exec(join(context.root, 'tools/bootstrap/with-env.sh'), ['docker', 'inspect', spec.containerId], { maxBuffer: 2 * 1024 * 1024, timeout:5000 });
  const values = JSON.parse(stdout);
  assert(values.length === 1, 'DOCKER_OWNER', 'Private daemon did not return exactly one owner');
  // Do not persist raw inspect: QLever command arguments contain its token.
  return dockerObservation(spec, values[0], context.root, options);
}

export async function cleanupAttempt(context, id, attemptId) {
  return locked(context, async state => {
    const job = state.jobs[id]; assert(job, 'MISSING', 'Unknown job');
    assert(!active(job), 'ACTIVE', 'Active/uncertain attempts cannot be cleaned');
    const attempt = job.attempts.find(candidate => candidate.id === attemptId); assert(attempt, 'MISSING', 'Unknown attempt');
    const directory = await ownedPath(context.root, attempt.directory);
    const owner = await readJson(join(directory, 'owner.json'));
    assert(owner.stateOwner === context.owner.id && owner.token === attempt.token && owner.directory === directory && owner.rootDevice === context.owner.rootDevice, 'OWNER', 'Attempt ownership proof differs');
    const terminal = await readJson(join(directory, 'terminal.json'));
    assert(terminal.cleanup?.groupGone === true && !terminal.cleanup?.unknown, 'CLEANUP_UNKNOWN', 'Complete process cleanup has not been observed');
    assert(job.manifest.retention?.scratch === 'rebuildable-ephemeral-only', 'FORENSIC_HOLD', 'Scratch may contain backend state; preserve it until a separately qualified reconciliation/retention recipe replaces this hold');
    // Only scratch is eligible. Receipts, first failures, logs, input pins and
    // result bytes remain. Backend forensic databases require explicit reconcile.
    const scratch = await ownedPath(directory, 'scratch');
    if (await exists(scratch)) {
      const inspect = async path => { for (const entry of await fs.readdir(path, { withFileTypes: true })) { const next = join(path, entry.name); assert(!entry.isSymbolicLink(), 'SYMLINK', 'Scratch contains a symlink'); if (entry.isDirectory()) await inspect(next); } };
      await inspect(scratch);
      await fs.rm(scratch, { recursive: true });
    }
    const receipt = { format: 'triplex-devloop-cleanup/1', at: now(), id, attemptId, removed: ['scratch/'], retained: ['owner.json', 'grant.json', 'terminal.json', 'stdout.log', 'stderr.log', 'inputs.json', 'evidence.json', 'resources.jsonl', 'artifacts'], noOtherPathsRemoved: true };
    await atomicJson(join(directory, 'cleanup-' + randomUUID() + '.json'), receipt, { exclusive: true });
    await event(context, { type: 'scratch_cleaned', id, attemptId });
    return receipt;
  });
}
