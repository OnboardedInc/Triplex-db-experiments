import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { appendEvent, assert, atomicJson, digest, exec, exists, fail, hashFile, json, now, ownedPath, processIdentity, readJson, sameProcess, sleep } from './io.mjs';

const emptyState = () => ({ format: 'triplex-devloop-state/2', revision: 0, jobs: {}, lastLaneGrant: {}, owners: {}, createdAt: now() });

// Keep the admission journal small; immutable manifests already hold the exact
// input lists. The measured 68 MB v1 state exhausted a 256 MiB controller while
// publishing otherwise completed work (wiki/problems/controller-state-growth.md).
export function manifestHeader(manifest) {
  const { inputs, ...header } = manifest;
  return header;
}

export async function sidecarReference(context, path) {
  const file = await ownedPath(context.root, path);
  const stat = await fs.stat(file);
  assert(stat.isFile(), 'SIDECAR', 'Immutable sidecar must be a regular file');
  return { path, bytes: stat.size, sha256: await hashFile(file) };
}

export async function readSidecar(context, reference) {
  assert(reference && typeof reference.path === 'string' && /^[a-f0-9]{64}$/.test(reference.sha256) && Number.isSafeInteger(reference.bytes) && reference.bytes >= 0, 'SIDECAR', 'An exact immutable sidecar reference is required');
  const path = await ownedPath(context.root, reference.path);
  const stat = await fs.stat(path);
  assert(stat.isFile() && stat.size === reference.bytes && await hashFile(path) === reference.sha256, 'SIDECAR_CHANGED', 'Immutable sidecar bytes differ: ' + reference.path);
  return readJson(path);
}

/** Hydrate only the selected job; never assign the result into mutable state. */
export async function loadJobManifest(context, job) {
  assert(job?.manifest && !Object.hasOwn(job.manifest, 'inputs'), 'STATE_FORMAT', 'Expected a v2 scheduling header');
  const expected = join(context.directory, 'jobs', job.manifest.id, 'manifest.json');
  assert(await ownedPath(context.root, job.manifestRef?.path ?? '') === expected, 'SIDECAR', 'Manifest reference is not the owned job envelope');
  const envelope = await readSidecar(context, job.manifestRef);
  assert(envelope.format === 'triplex-devloop-job-envelope/1' && envelope.manifestSha256 === job.manifestSha256 && digest(json(envelope.manifest)) === job.manifestSha256, 'MANIFEST_CHANGED', 'Frozen job envelope identity differs');
  assert(json(manifestHeader(envelope.manifest)) === json(job.manifest), 'MANIFEST_CHANGED', 'Scheduling header differs from its immutable manifest');
  assert(json(envelope.sourcePreimages ?? null) === json(job.sourcePreimages ?? null), 'MANIFEST_CHANGED', 'Declared preimage index differs from its envelope');
  return envelope.manifest;
}

export async function readState(context, { allowLegacy = false } = {}) {
  const file = join(context.directory, 'state.json');
  const state = await exists(file) ? await readJson(file) : emptyState();
  assert(state.format === 'triplex-devloop-state/2' || allowLegacy && state.format === 'triplex-devloop-state/1', 'STATE_MIGRATION_REQUIRED', 'Legacy state requires the explicit migrate-state maintenance command');
  return state;
}

export async function openContext(root, { stateDirectory = '.devloop', testPolicy } = {}) {
  root = resolve(root);
  assert(!(await fs.lstat(root)).isSymbolicLink(), 'MOUNT', 'Workspace root must be a real directory');
  // One production queue owns the machine-wide admission vector. Alternate
  // queues would multiply the same pool; tests keep explicit component policy
  // and cannot become engine qualification. See wiki/decisions/operating-policy.md.
  assert(testPolicy || resolve(root, stateDirectory) === join(root, '.devloop'),
    'PRODUCTION_QUEUE', 'Production admission requires the single canonical .devloop queue');
  let storage;
  if (testPolicy) storage = { result: 'TEST_COMPONENT_CONTEXT', freeInsideBytes: 1e12, ownedCountedBytes: 0, operationalMaximumBytes: 46e9, hardOwnedMaximumBytes: 50e9 };
  else {
    // The quota proof belongs to bootstrap. Never turn bundle integrity into an
    // original Git-origin or engine-qualification PASS (portable-export-v1).
    const { stdout } = await exec('python3', [join(root, 'tools/bootstrap/check-storage.py'), '--root', root]);
    storage = JSON.parse(stdout);
    assert(storage.result === 'PASS', 'STORAGE', 'Bounded storage proof failed');
  }
  const policy = testPolicy ?? await readJson(join(root, 'qualification/devloop/policy.json'));
  assert(policy.format === 'triplex-devloop-policy/1', 'POLICY', 'Unknown dev-loop policy');
  assert(policy.maximumHeavyTrials >= 1 && policy.maximumHeavyTrials <= 3, 'POLICY', 'At most three heavy trials are allowed');
  assert(policy.memoryPoolBytes <= 10 * 1024 ** 3, 'POLICY', 'The shared memory reservation pool cannot exceed 10 GiB');
  assert(policy.cpuPoolUnits >= 1 && policy.cpuPoolUnits <= os.availableParallelism(), 'POLICY', 'CPU pool exceeds local available parallelism');
  const directory = await ownedPath(root, stateDirectory);
  const context = { root, directory, policy, storage, test: Boolean(testPolicy) };
  await fs.mkdir(directory, { recursive: true });
  const marker = join(directory, 'owner.json');
  if (!(await exists(marker))) {
    try { await atomicJson(marker, { format: 'triplex-devloop-owner/1', root, rootDevice: (await fs.stat(root)).dev, id: randomUUID(), test: context.test }, { exclusive: true }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  const owner = await readJson(marker);
  assert(owner.root === root && owner.rootDevice === (await fs.stat(root)).dev && owner.test === context.test, 'OWNER', 'State ownership identity differs');
  context.owner = owner;
  return context;
}

export async function locked(context, action, { allowLegacy = false, beforePublish } = {}) {
  const path = join(context.directory, 'lock');
  const token = randomUUID();
  const began = Date.now();
  for (;;) {
    try {
      await fs.mkdir(path);
      await atomicJson(join(path, 'owner.json'), { pid: process.pid, identity: await processIdentity(process.pid), token, createdAt: now() });
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let owner;
      try { owner = await readJson(join(path, 'owner.json')); } catch (failure) { if (failure.code !== 'ENOENT') throw failure; }
      if (owner && !(await sameProcess(owner))) {
        // Preserve stale lock evidence. A dead scheduler does not prove its
        // database job stopped; running attempts are reconciled separately.
        try { await fs.rename(path, path + '.stale-' + randomUUID()); } catch (failure) { if (failure.code !== 'ENOENT') throw failure; }
        continue;
      }
      assert(Date.now() - began < 10000, 'LOCK_BUSY', 'Scheduler lock is still owned');
      await sleep(20);
    }
  }
  try {
    const file = join(context.directory, 'state.json');
    const state = await readState(context, { allowLegacy });
    const result = await action(state);
    state.revision++;
    if (beforePublish) assert(context.test, 'COMPONENT_ONLY', 'Publication failure injection is component-only');
    await atomicJson(file, state, { beforeRename: beforePublish ? () => beforePublish(state) : undefined });
    return result;
  } finally {
    const owner = await readJson(join(path, 'owner.json'));
    assert(owner.token === token, 'LOCK_OWNER', 'Lock owner changed during operation');
    await fs.rm(path, { recursive: true });
  }
}

export async function event(context, value) { await appendEvent(join(context.directory, 'events.jsonl'), value); }
export async function snapshot(context) { return locked(context, state => structuredClone(state)); }

export async function pinInputs(context, inputs) {
  assert(Array.isArray(inputs) && inputs.length > 0, 'INPUTS', 'Exact source/build/oracle inputs are required');
  const seen = new Set();
  const pins = [];
  for (const input of inputs) {
    assert(input && typeof input.path === 'string' && !seen.has(input.path), 'INPUTS', 'Input paths must be unique');
    seen.add(input.path);
    const path = await ownedPath(context.root, input.path);
    const stat = await fs.stat(path);
    assert(stat.isFile(), 'INPUTS', 'Input must be a regular file');
    const hash = await hashFile(path);
    assert(/^[a-f0-9]{64}$/.test(input.sha256) && hash === input.sha256, 'INPUT_CHANGED', 'Input differs: ' + input.path);
    assert(typeof input.role === 'string' && input.role.length > 0, 'INPUTS', 'Each input needs a role');
    pins.push({ path: input.path, role: input.role, bytes: stat.size, sha256: hash });
  }
  return pins;
}

export async function baselineBinding(context) {
  if (context.test) return { proofPolicy: 'component-test-only', baselineSha256: null, runtimeAcceptance: 'NOT_CLAIMED' };
  const storage = await readJson(join(context.root, 'provenance/bounded-storage.json'));
  const path = await ownedPath(context.root, 'provenance/portable-export-baseline.json');
  const hash = await hashFile(path);
  assert(hash === storage.baselineSha256, 'BASELINE', 'Portable export baseline identity changed');
  return { proofPolicy: context.policy.proofPolicy, baselineSha256: hash, originalGitOriginAudit: 'UNAVAILABLE_IN_SANITIZED_EXPORT', runtimeAcceptance: 'NOT_IMPLIED_BY_IMPORT' };
}

export async function doctor(context) {
  const state = await snapshot(context);
  return {
    format: 'triplex-devloop-doctor/1', at: now(), root: context.root,
    node: process.version, platform: process.platform, architecture: process.arch,
    cpuAvailableParallelism: os.availableParallelism(), hostMemoryBytes: os.totalmem(),
    policy: context.policy, storage: context.storage, baseline: await baselineBinding(context),
    activeAttempts: Object.values(state.jobs).filter(job => job.status === 'running' || job.status === 'granted').length,
    qualification: 'CONTROLLER_ENVIRONMENT_ONLY_NO_ENGINE_OR_LOAD_ACCEPTANCE',
    limitations: ['The 10 GiB pool is vector admission, not an allocator cap.', 'Native macOS RSS sampling/watchdogs are not hard process-tree memory containment.', 'Trusted commands must use owned paths and must not daemonize outside their registered process group.'],
  };
}

export async function verifySource(context, { checkZip = false } = {}) {
  const binding = await baselineBinding(context);
  const args = [join(context.root, 'tools/bootstrap/verify-import.py'), '--root', context.root, '--allow-working-changes'];
  if (checkZip) args.push('--check-zip');
  const { stdout } = await exec('python3', args, { maxBuffer: 16 * 1024 * 1024 });
  const observation = JSON.parse(stdout);
  return { format: 'triplex-devloop-source-observation/1', ...binding, at: now(), observation, interpretation: 'Export differences are reported as working changes; selected current inputs must additionally match every job manifest. This is not an original protected-source PASS.' };
}

export function inputFingerprint(inputs) { return digest(JSON.stringify([...inputs].sort((a, b) => a.path.localeCompare(b.path)))); }

export async function controllerBinding(context) {
  const paths = ['scripts/triplex-devloop.mjs', 'qualification/devloop/policy.json', ...['io', 'state', 'migration', 'preimages', 'scheduler', 'executor', 'worker', 'evidence', 'compare'].map(name => 'qualification/devloop/' + name + '.mjs')];
  const pins = [];
  for (const path of paths) pins.push({ path, role: 'controller', sha256: await hashFile(await ownedPath(context.root, path)) });
  return pinInputs(context, pins);
}

export async function storageObservation(context) {
  if (context.test) return context.storage;
  const { stdout } = await exec('python3', [join(context.root, 'tools/bootstrap/check-storage.py'), '--root', context.root]);
  const value = JSON.parse(stdout);
  assert(value.result === 'PASS', 'STORAGE', 'Current total-owned storage exceeds its admitted bound');
  return value;
}
