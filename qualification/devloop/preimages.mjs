import { constants, promises as fs } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { assert, atomicJson, exists, hashFile, now, ownedPath } from './io.mjs';
import { readSidecar, sidecarReference, storageObservation } from './state.mjs';

const preservedRoles = new Set(['source', 'runner', 'oracle', 'recipe', 'fixture', 'calibration', 'native-query', 'mapping', 'codec', 'controller', 'package-input']);
const secretName = /^(?:\.env(?:\..*)?|access-token|postgres-password|credentials?(?:\..*)?)$/i;

function objectName(context, sha256) {
  assert(/^[a-f0-9]{64}$/.test(sha256), 'PREIMAGE', 'Source preimages require exact SHA-256');
  return relative(context.root, join(context.directory, 'source-objects', 'sha256', sha256.slice(0, 2), sha256.slice(2)));
}

async function checkObject(context, entry) {
  assert(entry.object?.path === objectName(context, entry.sha256), 'PREIMAGE_PATH', 'Preimage object is not its owned content address');
  const file = await ownedPath(context.root, entry.object.path);
  const stat = await fs.stat(file);
  assert(stat.isFile() && stat.nlink === 1 && stat.size === entry.bytes && await hashFile(file) === entry.sha256, 'PREIMAGE_CHANGED', 'Retained source preimage differs: ' + entry.path);
  return file;
}

/** Copy declared source bytes, never hardlink a mutable working file. This
 * extends the existing byte-pinned input contract with reconstructible bytes;
 * the measured authority gap and historical limits are documented in
 * wiki/problems/controller-state-growth.md. Dependencies/build caches and
 * credential-file inputs intentionally remain outside this source archive.
 */
export async function preserveInputPreimages(context, inputs, output, { phase = 'declared-inputs' } = {}) {
  const selected = inputs.filter(input => preservedRoles.has(input.role));
  const entries = [], unique = new Map(), paths = new Map(), omittedRoles = {};
  for (const input of inputs) if (!preservedRoles.has(input.role)) omittedRoles[input.role] = (omittedRoles[input.role] ?? 0) + 1;
  for (const input of selected) {
    const key = input.path + '\0' + input.role;
    if (paths.has(key)) { assert(paths.get(key) === input.sha256, 'PREIMAGE', 'One path/role has conflicting source identities'); continue; }
    paths.set(key, input.sha256);
    assert(!input.path.split('/').some(part => secretName.test(part)), 'PREIMAGE_SECRET', 'A credential path cannot be declared as archived source');
    assert(!input.path.split('/').some(part => ['node_modules', '.cache'].includes(part)), 'PREIMAGE_CACHE', 'Dependency/cache contents must not be relabeled as source preimages');
    const source = await ownedPath(context.root, input.path), stat = await fs.stat(source);
    assert(stat.isFile(), 'PREIMAGE', 'Source input must be a regular file');
    assert(await hashFile(source) === input.sha256, 'INPUT_CHANGED', 'Source changed before preimage copy: ' + input.path);
    const entry = { path: input.path, role: input.role, bytes: stat.size, sha256: input.sha256, mode: stat.mode & 0o777, object: { path: objectName(context, input.sha256) } };
    entries.push(entry); unique.set(input.sha256, entry);
  }
  let futureBytes = 0;
  for (const entry of unique.values()) {
    const file = await ownedPath(context.root, entry.object.path);
    if (await exists(file)) await checkObject(context, entry);
    else futureBytes += entry.bytes + 4096;
  }
  const storage = await storageObservation(context);
  const metadataBytes = Buffer.byteLength(JSON.stringify(entries)) + 8192;
  assert(futureBytes + metadataBytes <= Math.min(storage.freeInsideBytes, storage.operationalMaximumBytes - storage.ownedCountedBytes), 'STORAGE', 'Source preimages exceed total-owned operational headroom');
  for (const entry of unique.values()) {
    const target = await ownedPath(context.root, entry.object.path);
    if (await exists(target)) { await checkObject(context, entry); continue; }
    await fs.mkdir(dirname(target), { recursive: true });
    const temporary = target + '.' + randomUUID() + '.tmp';
    // COPYFILE_FICLONE is an independent copy-on-write inode, not a hardlink.
    await fs.copyFile(await ownedPath(context.root, entry.path), temporary, constants.COPYFILE_FICLONE | constants.COPYFILE_EXCL);
    assert(await hashFile(temporary) === entry.sha256 && (await fs.stat(temporary)).nlink === 1, 'INPUT_CHANGED', 'Source changed during preimage copy: ' + entry.path);
    await fs.chmod(temporary, 0o400);
    const handle = await fs.open(temporary, 'r');
    try { await handle.sync(); } finally { await handle.close(); }
    // Identical content addresses may race across isolated jobs. Existing
    // objects are always verified, and atomic rename publishes complete bytes.
    if (await exists(target)) { await checkObject(context, entry); await fs.unlink(temporary); }
    else await fs.rename(temporary, target);
    const directory = await fs.open(dirname(target), 'r');
    try { await directory.sync(); } finally { await directory.close(); }
    await checkObject(context, entry);
  }
  const index = { format: 'triplex-devloop-input-preimages/1', at: now(), phase, inputs: entries, omittedRoles, policy: 'Declared source/runner/oracle/recipe and authored mapping/codec/controller bytes only; no credential or dependency/build-cache copies; historical runs are not retrofilled' };
  await atomicJson(await ownedPath(context.root, output), index, { exclusive: true });
  await storageObservation(context);
  return sidecarReference(context, output);
}

export async function verifyInputPreimages(context, reference, { inputs } = {}) {
  const index = await readSidecar(context, reference);
  assert(index.format === 'triplex-devloop-input-preimages/1' && Array.isArray(index.inputs), 'PREIMAGE', 'Unknown source-preimage index');
  const seen = new Set();
  for (const entry of index.inputs) {
    assert(preservedRoles.has(entry.role) && !seen.has(entry.path + '\0' + entry.role), 'PREIMAGE', 'Unexpected or duplicate preimage entry');
    seen.add(entry.path + '\0' + entry.role);
    await checkObject(context, entry);
  }
  if (inputs) {
    const expected = new Map(inputs.filter(input => preservedRoles.has(input.role)).map(input => [input.path + '\0' + input.role, input.sha256]));
    const actual = new Map(index.inputs.map(entry => [entry.path + '\0' + entry.role, entry.sha256]));
    assert(actual.size === expected.size && [...expected].every(([key, sha256]) => actual.get(key) === sha256), 'PREIMAGE_COVERAGE', 'Source archive does not cover the exact declared preservable inputs');
  }
  return { indexSha256: reference.sha256, files: index.inputs.length, uniqueObjects: new Set(index.inputs.map(entry => entry.sha256)).size, status: 'DECLARED_PREIMAGE_BYTES_UNCHANGED' };
}
