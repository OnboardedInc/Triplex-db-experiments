// @ts-nocheck -- [EXP-CHECKJS] runtime-populated records, optional option bags, or branch-specific union members; option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
import { constants, promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { assert, atomicJson, digest, hashFile, json, now, ownedPath, readJson } from './io.mjs';
import { event, locked, manifestHeader, sidecarReference } from './state.mjs';

/** Explicit one-time migration; historical envelopes and receipts stay byte exact.
 * The immutable-reference pattern is an adaptation of the existing per-job
 * envelope, motivated by measured publication OOM, not a new qualification
 * authority (wiki/problems/controller-state-growth.md).
 */
export async function migrateState(context, { beforePublish } = {}) {
  const id = randomUUID();
  let prepared;
  const result = await locked(context, async state => {
    if (state.format === 'triplex-devloop-state/2') return { status: 'ALREADY_V2', migration: state.migration ?? null };
    assert(state.format === 'triplex-devloop-state/1', 'STATE_FORMAT', 'Only the known v1 format may migrate');
    const directory = await ownedPath(context.root, relative(context.root, join(context.directory, 'migrations', id)));
    await fs.mkdir(directory, { recursive: true });
    const source = await ownedPath(context.root, relative(context.root, join(context.directory, 'state.json')));
    const snapshot = join(directory, 'state.v1.json');
    // APFS clone where supported; a byte copy fallback preserves exact evidence.
    await fs.copyFile(source, snapshot, constants.COPYFILE_FICLONE | constants.COPYFILE_EXCL);
    const handle = await fs.open(snapshot, 'r');
    try { await handle.sync(); } finally { await handle.close(); }
    const legacy = await sidecarReference(context, relative(context.root, snapshot));
    assert(await hashFile(source) === legacy.sha256, 'MIGRATION', 'Legacy snapshot differs from the locked state bytes');
    const manifests = [];
    for (const [key, job] of Object.entries(state.jobs)) {
      assert(job.manifest?.id === key, 'MIGRATION', 'Legacy job id differs');
      const path = relative(context.root, join(context.directory, 'jobs', key, 'manifest.json'));
      const reference = await sidecarReference(context, path);
      const envelope = await readJson(await ownedPath(context.root, path));
      assert(envelope.format === 'triplex-devloop-job-envelope/1' && envelope.manifestSha256 === job.manifestSha256 && digest(json(envelope.manifest)) === job.manifestSha256 && digest(json(job.manifest)) === job.manifestSha256, 'MANIFEST_CHANGED', 'Legacy state and frozen envelope differ: ' + key);
      job.manifest = manifestHeader(envelope.manifest);
      job.manifestRef = reference;
      manifests.push({ jobId: key, manifestSha256: job.manifestSha256, ...reference });
    }
    prepared = {
      format: 'triplex-devloop-state-migration/1', id, at: now(), from: state.format, to: 'triplex-devloop-state/2',
      ownerId: context.owner.id, legacy, legacyRevision: state.revision, jobs: manifests,
      outcomes: 'UNCHANGED; no raw terminal adoption, qualification, resource release or receipt rewrite',
      publication: 'PREPARED_BEFORE_ATOMIC_STATE_RENAME',
    };
    const preparedPath = join(directory, 'prepared.json');
    await atomicJson(preparedPath, prepared, { exclusive: true });
    const preparedRef = await sidecarReference(context, relative(context.root, preparedPath));
    state.format = 'triplex-devloop-state/2';
    state.migration = { id, prepared: preparedRef, legacy, from: 'triplex-devloop-state/1', at: prepared.at };
    await event(context, { type: 'state_migration_prepared', id, prepared: preparedRef, legacy });
    return { status: 'MIGRATED_V2', id, prepared: preparedRef, legacy, jobs: manifests.length, directory: relative(context.root, directory) };
  }, { allowLegacy: true, beforePublish });
  if (!prepared) return result;
  const current = await sidecarReference(context, relative(context.root, join(context.directory, 'state.json')));
  const publication = { format: 'triplex-devloop-state-migration-publication/1', at: now(), id, prepared: result.prepared, legacy: result.legacy, current, outcome: 'V2_STATE_PUBLISHED; historical outcomes and unknown reservations unchanged' };
  const path = join(context.root, result.directory, 'published.json');
  await atomicJson(path, publication, { exclusive: true });
  return { ...result, current, publication: await sidecarReference(context, relative(context.root, path)) };
}
