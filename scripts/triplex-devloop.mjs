#!/usr/bin/env node
// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
import { promises as fs } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, atomicJson, fileTree, hashFile, json, ownedPath, readJson } from '../qualification/devloop/io.mjs';
import { doctor, openContext, snapshot, verifySource } from '../qualification/devloop/state.mjs';
import { cleanupAttempt, enqueue, readiness, reconcile, registerResident, releaseResident, refreshResident, requestCancel, reservations, retryJob } from '../qualification/devloop/scheduler.mjs';
import { executeNext } from '../qualification/devloop/executor.mjs';
import { verifyAttempt } from '../qualification/devloop/evidence.mjs';
import { calibrate, compare, promotionVerify } from '../qualification/devloop/compare.mjs';
import { migrateState } from '../qualification/devloop/migration.mjs';

const help = `Triplex development loop (portable-export-devloop-v1)

node scripts/triplex-devloop.mjs doctor
node scripts/triplex-devloop.mjs status
node scripts/triplex-devloop.mjs source-verify [--check-zip]
node scripts/triplex-devloop.mjs seed
node scripts/triplex-devloop.mjs capture-inputs --spec FILE --output FILE
node scripts/triplex-devloop.mjs enqueue --manifest FILE
node scripts/triplex-devloop.mjs fixture-prepare --manifest FILE --executor NAME
node scripts/triplex-devloop.mjs execute [--job ID] --executor NAME
node scripts/triplex-devloop.mjs cancel --job ID --reason TEXT
node scripts/triplex-devloop.mjs retry --job ID --reason TEXT
node scripts/triplex-devloop.mjs reconcile
node scripts/triplex-devloop.mjs migrate-state
node scripts/triplex-devloop.mjs resident-register --manifest FILE
node scripts/triplex-devloop.mjs resident-release --owner ID
node scripts/triplex-devloop.mjs resident-refresh --owner ID --readiness-run JOB/0001
node scripts/triplex-devloop.mjs verify-attempt --run ID/0001
node scripts/triplex-devloop.mjs calibrate --runs ID/0001,... --output FILE
node scripts/triplex-devloop.mjs compare --controls ID/0001,... --candidates ID/0001,... --output FILE
node scripts/triplex-devloop.mjs promote-verify --candidate ID/0001 --verification ID/0001 --comparison FILE --reviewer NAME --required-checks KEY,... --output FILE
node scripts/triplex-devloop.mjs cleanup --run ID/0001

Commands fail closed unless the bounded workspace is mounted. All runnable jobs
need pinned inputs, resource vectors and real argv commands. Exit zero alone
never proves engine correctness. Production admission always uses the single
canonical .devloop queue. Alternate component contexts cannot qualify engines.
`;

function options(values) {
  const output = {};
  for (let i = 0; i < values.length; i++) {
    assert(values[i].startsWith('--'), 'ARGUMENT', 'Expected a named option: ' + values[i]);
    const name = values[i].slice(2);
    assert(!Object.hasOwn(output, name), 'ARGUMENT', 'Duplicate option: ' + name);
    output[name] = values[i + 1] !== undefined && !values[i + 1].startsWith('--') ? values[++i] : true;
  }
  return output;
}
const required = (args, name) => { assert(typeof args[name] === 'string' && args[name].length > 0, 'ARGUMENT', '--' + name + ' is required'); return args[name]; };
const references = (args, name) => required(args, name).split(',');

async function main() {
  const [command = 'help', ...rest] = process.argv.slice(2);
  if (command === 'help' || command === '--help') { process.stdout.write(help); return; }
  const args = options(rest);
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const context = await openContext(root, { stateDirectory: args['state-directory'] ?? '.devloop' });
  const input = async name => readJson(await ownedPath(root, required(args, name)));
  let result;
  switch (command) {
    case 'doctor': result = await doctor(context); break;
    case 'status': {
      const state = await snapshot(context);
      result = { format: 'triplex-devloop-status/1', revision: state.revision, resources: reservations(state), jobs: Object.values(state.jobs).map(job => ({ id: job.manifest.id, queryPath: job.manifest.queryPath, backend: job.manifest.backend, kind: job.manifest.kind, status: job.status, readiness: readiness(state, job), attempts: job.attempts.length, firstOutcome: job.firstOutcome ?? null })), residentOwners: state.owners };
      break;
    }
    case 'source-verify': result = await verifySource(context, { checkZip: args['check-zip'] === true }); break;
    case 'seed': {
      const seeds = await readJson(join(root, 'qualification/devloop/initial-queue.json'));
      const state = await snapshot(context); result = [];
      for (const manifest of seeds.jobs) result.push(state.jobs[manifest.id] ? { id: manifest.id, status: 'ALREADY_PRESENT_UNCHANGED' } : await enqueue(context, manifest));
      break;
    }
    case 'capture-inputs': {
      const spec = await input('spec'); assert(Array.isArray(spec.roots), 'INPUTS', 'Expected roots array');
      const pins = [];
      for (const item of spec.roots) {
        const path = await ownedPath(root, item.path);
        assert(typeof item.role === 'string', 'INPUTS', 'Root role is required');
        if ((await fs.stat(path)).isDirectory()) for (const leaf of await fileTree(path)) pins.push({ path: relative(root, join(path, leaf.path)), role: item.role, sha256: leaf.sha256 });
        else pins.push({ path: item.path, role: item.role, sha256: await hashFile(path) });
      }
      assert(new Set(pins.map(pin => pin.path)).size === pins.length, 'INPUTS', 'Capture roots overlap; assign each input one role');
      const output = await ownedPath(root, required(args, 'output'));
      await atomicJson(output, { format: 'triplex-devloop-input-capture/1', inputs: pins }, { exclusive: true });
      result = { output: relative(root, output), files: pins.length, sha256: await hashFile(output), claim: 'CURRENT_INPUT_BYTES_ONLY_NO_EXECUTION' };
      break;
    }
    case 'enqueue': result = await enqueue(context, await input('manifest')); break;
    case 'fixture-prepare': {
      const manifest = await input('manifest'); assert(manifest.kind === 'fixture', 'FIXTURE', 'A real fixture recipe job is required');
      await enqueue(context, manifest);
      result = await executeNext(context, { onlyJob: manifest.id, executor: required(args, 'executor') });
      break;
    }
    case 'execute': result = await executeNext(context, { onlyJob: args.job, executor: required(args, 'executor') }); break;
    case 'cancel': result = await requestCancel(context, required(args, 'job'), required(args, 'reason')); break;
    case 'retry': result = await retryJob(context, required(args, 'job'), required(args, 'reason')); break;
    case 'reconcile': result = await reconcile(context); break;
    case 'migrate-state': result = await migrateState(context); break;
    case 'resident-register': result = await registerResident(context, await input('manifest')); break;
    case 'resident-release': result = await releaseResident(context, required(args, 'owner')); break;
    case 'resident-refresh': result = await refreshResident(context, required(args, 'owner'), required(args, 'readiness-run')); break;
    case 'verify-attempt': { const [job, attempt] = required(args, 'run').split('/'); result = await verifyAttempt(context, job, attempt); break; }
    case 'calibrate': result = await calibrate(context, references(args, 'runs'), required(args, 'output')); break;
    case 'compare': result = await compare(context, references(args, 'controls'), references(args, 'candidates'), required(args, 'output')); break;
    case 'promote-verify': result = await promotionVerify(context, { candidate: required(args, 'candidate'), verification: required(args, 'verification'), comparison: required(args, 'comparison'), reviewer: required(args, 'reviewer'), requiredChecks: references(args, 'required-checks'), output: required(args, 'output') }); break;
    case 'cleanup': { const [job, attempt] = required(args, 'run').split('/'); result = await cleanupAttempt(context, job, attempt); break; }
    default: assert(false, 'COMMAND', 'Unknown command: ' + command);
  }
  process.stdout.write(json(result));
  if (result?.status && !['completed_verified_bytes', 'completed_process_only', 'queued', 'active', 'released', 'MIGRATED_V2', 'ALREADY_V2', 'ELIGIBLE_FOR_RECORDED_LOCAL_PROMOTION'].includes(result.status)) process.exitCode = 1;
  if (result?.passed === false) process.exitCode = 1;
}
main().catch(error => { process.stderr.write(json({ format: 'triplex-devloop-error/1', code: error.code ?? 'ERROR', message: error.message })); process.exitCode = 2; });
