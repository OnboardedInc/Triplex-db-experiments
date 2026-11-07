import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { assert, atomicJson, exists, fileTree, hashFile, now, ownedPath, readJson } from './io.mjs';
import { loadJobManifest, readState } from './state.mjs';
import { verifyInputPreimages } from './preimages.mjs';

export async function verifyByteEvidence(context, grant) {
  const checks = [];
  for (const check of grant.manifest.evidence.checks) {
    const expectedPath = await ownedPath(context.root, check.expectedInput);
    const actualPath = await ownedPath(grant.directory, check.actual);
    const expected = grant.manifest.inputs.find(input => input.path === check.expectedInput);
    const expectedSha256 = await hashFile(expectedPath);
    assert(expectedSha256 === expected.sha256, 'ORACLE_CHANGED', 'Pinned oracle changed during execution');
    const available = await exists(actualPath);
    const actualSha256 = available ? await hashFile(actualPath) : null;
    checks.push({ key: check.key, expectedInput: check.expectedInput, expectedSha256, actual: check.actual, actualSha256, passed: actualSha256 === expectedSha256 });
  }
  const required = grant.manifest.evidence.requiredCheckKeys;
  const passed = checks.every(check => check.passed) && required.every(key => checks.some(check => check.key === key && check.passed));
  const artifactRoot = join(grant.directory, 'artifacts');
  const artifactFiles = await exists(artifactRoot) ? await fileTree(artifactRoot) : [];
  const result = {
    format: 'triplex-devloop-byte-evidence/1', at: now(), jobId: grant.jobId, attemptId: grant.attemptId,
    checks, requiredCheckKeys: required, allRegisteredChecksPassed: passed,
    claim: checks.length ? 'EXACT_REGISTERED_RESULT_BYTES_CHECKED_AGAINST_PINNED_ORACLES' : 'PROCESS_ONLY_NO_SEMANTIC_CHECKS_REGISTERED',
    limitations: ['Byte comparison does not independently prove an authored oracle or harness is correct.', 'Independent verifier and applicable engine/public gates remain required for promotion.'],
    artifacts: artifactFiles,
  };
  await atomicJson(join(grant.directory, 'evidence.json'), result, { exclusive: true });
  return result;
}

export async function verifyAttempt(context, jobId, attemptId) {
  const state = await readState(context);
  const job = state.jobs[jobId]; assert(job, 'MISSING', 'Unknown job');
  const manifest = await loadJobManifest(context, job);
  const attempt = job.attempts.find(value => value.id === attemptId); assert(attempt, 'MISSING', 'Unknown attempt');
  const directory = await ownedPath(context.root, attempt.directory);
  const terminal = await readJson(join(directory, 'terminal.json'));
  const terminalSha256 = await hashFile(join(directory, 'terminal.json'));
  assert(terminalSha256 === attempt.terminalSha256, 'TERMINAL_CHANGED', 'Terminal bytes differ from the scheduler publication anchor');
  assert(terminal.manifestSha256 === job.manifestSha256 && terminal.status === attempt.status, 'RECEIPT', 'State and terminal identity differ');
  for (const output of terminal.outputs ?? []) {
    const path = await ownedPath(directory, output.path);
    assert(await hashFile(path) === output.sha256, 'OUTPUT_CHANGED', 'Retained result bytes differ: ' + output.path);
  }
  const declared = job.sourcePreimages ? await verifyInputPreimages(context, job.sourcePreimages, { inputs: manifest.inputs }) : null;
  const inputsFile = (terminal.outputs ?? []).find(output => output.path === 'inputs.json');
  const inputRecord = inputsFile ? await readJson(join(directory, 'inputs.json')) : null;
  const invocation = inputRecord?.sourcePreimages ? await verifyInputPreimages(context, inputRecord.sourcePreimages, { inputs: [...inputRecord.pins, ...inputRecord.controllerPins] }) : null;
  return { format: 'triplex-devloop-attempt-verification/1', jobId, attemptId, terminalSha256, terminal, retainedResultBytesUnchanged: true, sourcePreimages: { declared, invocation, historicalScope: invocation ? 'DECLARED_BYTES_AND_CONTROLLER_PREIMAGES_RETAINED' : 'HISTORICAL_HASH_COMMAND_TRACE_RECORDS_PARTIAL_SOURCE_RECONSTRUCTION' }, interpretation: 'Receipt/result integrity only; this does not manufacture semantic or performance acceptance.' };
}
