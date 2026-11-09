// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
// Source-only bridge to the existing canonical controller API. No service is
// started here. Input comes through stdin, never token-bearing shell argv.
import { openContext, readState, loadJobManifest } from '../../qualification/devloop/state.mjs';
import { registerResident, refreshResident, releaseResident, reconcile, reservations } from '../../qualification/devloop/scheduler.mjs';
import { enqueue } from '../../qualification/devloop/scheduler.mjs';
import { executeNext } from '../../qualification/devloop/executor.mjs';
import { verifyAttempt } from '../../qualification/devloop/evidence.mjs';

let bytes = 0; const chunks = [];
for await (const chunk of process.stdin) { bytes += chunk.length; if (bytes > 1048576) throw new Error('Bridge input exceeds1MiB'); chunks.push(chunk); }
const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
const context = await openContext(process.cwd());
let result;
switch (request.action) {
  case 'snapshot': {
    const state = await readState(context);
    const jobs = [];
    for (const job of Object.values(state.jobs).filter(job => ['running', 'granted', 'cleanup_unknown'].includes(job.status))) {
      const manifest = job.manifest.backend === 'qlever' ? await loadJobManifest(context, job) : job.manifest;
      jobs.push({ id: job.manifest.id, backend: job.manifest.backend, status: job.status, requiredOwners: job.manifest.requiredOwners ?? [], faultPacketId: manifest.faultPacketId, attempt: job.attempts.at(-1) });
    }
    result = { owner: context.owner, reservations: reservations(state), owners: state.owners, jobs };
    break;
  }
  case 'prepare': {
    if (request.spec?.registrationMode !== 'prepared-stopped') throw new Error('Only the reviewed stopped preparation is exposed');
    const owner = await registerResident(context, request.spec);
    result = { id: owner.id, status: owner.status, containerId: owner.containerId, resources: owner.resources };
    break;
  }
  case 'reconcile': result = await reconcile(context); break;
  case 'release': result = await releaseResident(context, request.id); break;
  case 'refresh': result = await refreshResident(context, request.id, request.reference); break;
  case 'verify-reference': {
    const [id, attempt] = request.reference.split('/');
    const checked = await verifyAttempt(context, id, attempt);
    const state = await readState(context);
    result = { terminal: checked.terminal, terminalSha256: checked.terminalSha256, manifest: await loadJobManifest(context, state.jobs[id]) };
    break;
  }
  case 'readiness-job': {
    // This nested, explicitly budgeted verification is needed because UNKNOWN
    // cannot satisfy ordinary requiredOwners. The resident reservation stays.
    if (request.manifest?.kind !== 'verification' || request.manifest?.backend !== 'qlever' || !request.manifest.residentRecovery) throw new Error('Explicit Q verification/recovery contract required');
    await enqueue(context, request.manifest);
    let terminal; const deadline = Date.now() + 120000;
    while (!terminal) {
      try { terminal = await executeNext(context, { onlyJob: request.manifest.id, executor: 'qlever-fault-readiness' }); }
      catch (error) {
        if (!['NO_ADMISSION', 'FAIR_QUEUE'].includes(error.code) || Date.now() >= deadline) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    const checked = await verifyAttempt(context, request.manifest.id, '0001');
    result = { status: terminal.status, reference: request.manifest.id + '/0001', terminalSha256: checked.terminalSha256 };
    break;
  }
  default: throw new Error('Unknown narrow controller bridge action');
}
const encoded = JSON.stringify(result);
if (Buffer.byteLength(encoded) > 2 * 1024 ** 2) throw new Error('Bridge output exceeds2MiB');
process.stdout.write(encoded + '\n');
