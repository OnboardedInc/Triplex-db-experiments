// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters; dynamic record keys; runtime error inspection. Binding errors remain checked by lab/bin/checkjs.mjs.
/** File metadata only. Never read database/WAL/log payload contents. */
import assert from 'node:assert/strict';
import { lstat, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
const digest = text => createHash('sha256').update(text).digest('hex');
export async function growthSnapshot(root, directory) {
  assert(directory === path.join(root, '.runtime/engines/xtdb-main/data'));
  const began = performance.now(), seen = new Set(), groups = {};
  let files = 0;
  const walk = async (parent, group) => {
    assert(performance.now() - began < 10000, 'FILE_METADATA_SCAN_DEADLINE');
    const stat = await lstat(parent); assert(!stat.isSymbolicLink(), 'DATA_SYMLINK_REFUSED');
    if (stat.isDirectory()) {
      for (const name of (await readdir(parent)).sort()) await walk(path.join(parent, name), group ?? name);
      return;
    }
    assert(stat.isFile(), 'NONREGULAR_DATA_ENTRY'); assert(++files <= 50000, 'FILE_METADATA_SCAN_BOUND');
    const identity = `${stat.dev}:${stat.ino}`; if (seen.has(identity)) return; seen.add(identity);
    const key = group ?? 'root', before = groups[key] ?? { files: 0, logicalBytes: 0, allocatedBlockBytes: 0 };
    before.files++; before.logicalBytes += stat.size; before.allocatedBlockBytes += stat.blocks * 512; groups[key] = before;
  };
  let scanFailure = null;
  try { await walk(directory); } catch (error) { scanFailure = { name: error.name, code: error.code ?? null, messageSha256: digest(String(error.message)) }; }
  // This is the existing owned-image/ZIP/outside-files cap authority, not a
  // second additive count of the nested engine/VM directory. Host Python's
  // binary/stdlib is outside this declared source closure and is not qualified.
  const check = spawnSync('python3', [path.join(root, 'tools/bootstrap/check-storage.py'), '--root', root],
    { cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 256 * 1024 });
  let storage;
  try { storage = JSON.parse(check.stdout); }
  catch { storage = { result: 'UNPARSEABLE', stdoutSha256: digest(check.stdout ?? ''), stdoutBytes: Buffer.byteLength(check.stdout ?? '') }; }
  return { atUtc: new Date().toISOString(), atProcessMonotonicMs: performance.now(), elapsedMs: performance.now() - began,
    engineFileMetadata: { groups, files: seen.size, scanFailure, hardLinkIdentitiesCountedOnce: true,
      scope: 'Logical lengths and st_blocks only; APFS clones/shared extents are not exclusive physical attribution' },
    boundedStorage: storage,
    checker: { status: check.status, signal: check.signal, stdout: check.stdout ?? '', stderrSha256: digest(check.stderr ?? '') },
    nestedVm: { sampled: false, bytes: null, countedInsideBackingImage: true },
    sampleMeaning: 'PHASE_SNAPSHOT_ONLY_NOT_CONTINUOUS_PEAK_WAL_SPILL_REBUILD_OR_BACKUP_PROOF' };
}
