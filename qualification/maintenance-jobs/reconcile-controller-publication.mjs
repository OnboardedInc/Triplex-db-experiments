/** One-time, explicitly authorized disposition of the two retained publication
 * failures. Inspiration: wiki/problems/controller-state-growth.md. A dead
 * executor alone never releases work; fresh empty groups plus unchanged healthy
 * owned backends prove only that these client reservations can be released.
 * Raw semantic-worker terminals remain unanchored and never become PASS.
 */
import { constants, promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { assert, atomicJson, exec, hashFile, json, now, ownedPath, readJson, sameProcess, sleep } from '../devloop/io.mjs';
import { event, locked, openContext, sidecarReference } from '../devloop/state.mjs';
import { dockerObservation, validateRequiredResidentObservation } from '../devloop/scheduler.mjs';
import { groupSnapshot } from '../devloop/executor.mjs';

const root = resolve(import.meta.dirname, '../..');
const context = await openContext(root);
const directory = await ownedPath(root, '.runtime/controller-orphans/4efc218d-22f1-480f-960e-e09bac3c185b');
const original = await readJson(join(directory, 'observation.json'));
const ids = ['xtdb-native-packet-v5', 'qlever-native-packet-v4'];
const expected = new Map(original.jobs.map(job => [job.id, job]));

async function healthy(owner) {
  assert(owner.kind === 'docker' && owner.status === 'active', 'RECONCILIATION', 'Backend reservation must remain active');
  const { stdout } = await exec(join(root, 'tools/bootstrap/with-env.sh'), ['docker', 'inspect', owner.containerId], { maxBuffer: 2 * 1024 ** 2, timeout: 5000 });
  const values = JSON.parse(stdout); assert(values.length === 1, 'RECONCILIATION', 'Expected exact private Docker owner');
  const observation = dockerObservation(owner, values[0], root);
  validateRequiredResidentObservation(owner, observation);
  if (owner.backend === 'qlever') {
    const token = (await fs.readFile(join(root, '.runtime/engines/qlever-main/access-token'), 'utf8')).trim();
    const response = await fetch('http://127.0.0.1:17019', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/sparql-query', Accept: 'application/sparql-results+json' }, body: 'SELECT (1 AS ?alive) WHERE {}', signal: AbortSignal.timeout(5000) });
    assert(response.ok, 'RECONCILIATION', 'Q native health query failed');
    const text = await response.text(); assert(text.length < 65536, 'RECONCILIATION', 'Q health response unbounded');
    assert(JSON.parse(text).results.bindings.length === 1, 'RECONCILIATION', 'Q native health query returned no scalar');
  } else {
    const require = createRequire(join(root, 'packages/xtdb/package.json'));
    const sql = require('postgres')('postgresql://xtdb:xtdb@127.0.0.1:15442/xtdb', { max: 1, prepare: false, connect_timeout: 5, onnotice() {} });
    try { const rows = await sql.unsafe('SELECT 1 AS alive'); assert(Number(rows[0]?.alive) === 1, 'RECONCILIATION', 'XTDB native health query failed'); }
    finally { await sql.end({ timeout: 1 }); }
  }
  return { ownerId: owner.id, observation, nativeReadiness: 'ONE_READ_ONLY_SCALAR_PASS_NOT_DURABILITY_OR_SEMANTIC_ACCEPTANCE' };
}

const result = await locked(context, async state => {
  const statePath = join(context.directory, 'state.json');
  const beforePath = join(directory, 'state.v2.pre-cleanup.json');
  await fs.copyFile(statePath, beforePath, constants.COPYFILE_FICLONE | constants.COPYFILE_EXCL);
  const before = await sidecarReference(context, relative(root, beforePath));
  assert(await hashFile(statePath) === before.sha256, 'RECONCILIATION', 'Pre-disposition state differs');
  const observations = [];
  for (const id of ids) {
    const job = state.jobs[id], attempt = job?.attempts.at(-1), previous = expected.get(id);
    assert(job?.status === 'cleanup_unknown' && attempt?.status === 'cleanup_unknown' && attempt.terminalSha256 === undefined, 'RECONCILIATION', 'Only the exact unanchored orphan may be disposed');
    assert(attempt.id === previous.attempt.id && attempt.token === previous.attempt.token && json(attempt.worker) === json(previous.attempt.worker) && json(attempt.executor) === json(previous.attempt.executor), 'RECONCILIATION', 'Original executor/group identity differs');
    assert(!(await sameProcess(attempt.executor)) && !(await sameProcess(attempt.worker)), 'RECONCILIATION', 'An original owner is still alive');
    const first = await groupSnapshot(attempt.worker.pgid); await sleep(100);
    const second = await groupSnapshot(attempt.worker.pgid);
    assert(first.processes.length === 0 && second.processes.length === 0, 'RECONCILIATION', 'Owned PGID is not empty; no signals or release allowed');
    const terminal = join(root, attempt.directory, 'terminal.json');
    assert(await hashFile(terminal) === previous.terminal.sha256, 'RECONCILIATION', 'Observed raw terminal bytes changed');
    const backend = [];
    for (const ownerId of job.manifest.requiredOwners ?? []) backend.push(await healthy(state.owners[ownerId]));
    assert(backend.length === 1, 'RECONCILIATION', 'Each orphan must have its one original shared foundation');
    observations.push({ jobId: id, attemptId: attempt.id, token: attempt.token, executor: attempt.executor, worker: attempt.worker, firstEmptyGroup: first, secondEmptyGroup: second, rawTerminalSha256: previous.terminal.sha256, rawTerminalAuthority: 'UNPUBLISHED_UNQUALIFIED_NO_ANCHOR_ADOPTED', backend });
  }
  const proof = { format: 'triplex-controller-publication-cleanup/1', at: now(), status: 'CONTROLLER_PUBLICATION_FAILED', before, observations, disposition: 'Release only proven-gone client reservations; shared backend reservations remain active and charged; preserve every raw file and missing terminal publication anchor' };
  const proofPath = join(directory, 'cleanup-disposition.json');
  await atomicJson(proofPath, proof, { exclusive: true });
  const reference = await sidecarReference(context, relative(root, proofPath));
  for (const id of ids) {
    const job = state.jobs[id], attempt = job.attempts.at(-1);
    job.status = 'controller_publication_failed'; attempt.status = 'controller_publication_failed';
    attempt.reconciliationRef = reference;
    job.firstOutcome ??= { attemptId: attempt.id, status: 'controller_publication_failed', reconciliationRef: reference };
  }
  await event(context, { type: 'controller_publication_failure_cleanup', jobs: ids, reference, clientReservationsReleased: true, terminalPassAdopted: false });
  return { status: 'CONTROLLER_PUBLICATION_FAILED', jobs: ids, reference };
});
const afterPath = join(directory, 'state.v2.post-cleanup.json');
await fs.copyFile(join(context.directory, 'state.json'), afterPath, constants.COPYFILE_FICLONE | constants.COPYFILE_EXCL);
console.log(json({ ...result, after: await sidecarReference(context, relative(root, afterPath)) }));
