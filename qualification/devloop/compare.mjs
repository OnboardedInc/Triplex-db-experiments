// @ts-nocheck -- [EXP-CHECKJS] unannotated local values; unannotated dynamic parameters; recursive helper inference; recursive callback inference; unannotated destructured parameters; initially empty collections. Binding errors remain checked by lab/bin/checkjs.mjs.
import { readLatencyRun } from "../../lab/receipts/parse.ts";
import { createReadStream, promises as fs } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { assert, atomicJson, digest, hashFile, json, now, ownedPath, readJson } from './io.mjs';
import { event, inputFingerprint, loadJobManifest, locked, pinInputs, readState } from './state.mjs';
import { verifyAttempt } from './evidence.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * fraction) - 1)];
const meanGeometry = values => Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
const canonical = value => JSON.stringify(value && typeof value === 'object' ? Array.isArray(value) ? value.map(item => JSON.parse(canonical(item))) : Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(canonical(value[key]))])) : value);

export async function readOracle(context, manifest) {
  const path = manifest.evidence.readOracleInput;
  const pin = manifest.inputs.find(input => input.path === path && input.role === 'oracle');
  assert(pin, 'READ_ORACLE', 'Load events require an independently pinned expected-answer catalog');
  const absolute = await ownedPath(context.root, path);
  assert(await hashFile(absolute) === pin.sha256, 'READ_ORACLE', 'Expected-answer catalog bytes changed');
  const catalog = await readJson(absolute);
  assert(catalog.format === 'triplex-devloop-read-oracle/1' && catalog.entries && typeof catalog.entries === 'object', 'READ_ORACLE', 'Unknown expected-answer catalog format');
  return catalog;
}

export function checkReadOracle(catalog, value) {
  const expected = catalog.entries[value.oracleKey];
  assert(expected && expected.taskClass === value.taskClass && expected.logicalTaskId === value.logicalTaskId, 'READ_ORACLE', 'Read logical task is not registered in the pinned oracle catalog');
  assert(/^[a-f0-9]{64}$/.test(value.paramsSha256) && value.paramsSha256 === expected.paramsSha256 && canonical(value.basis) === canonical(expected.basis), 'READ_ORACLE', 'Read parameters or temporal cut do not match the pinned independent oracle');
  assert(value.basis?.knownPosition === value.knownPosition, 'CUT', 'Returned K differs from the oracle basis');
  assert(typeof value.resultJson === 'string' && digest(value.resultJson) === value.resultSha256, 'RESULT_BYTES', 'Read digest must bind the retained actual result bytes');
  assert(/^[a-f0-9]{64}$/.test(value.resultSha256) && value.resultSha256 === expected.expectedSha256, 'READ_ORACLE', 'Read result differs from the independently pinned expected answer');
}

// Candidate engine/query implementations may change. The measurement machinery,
// dependencies and independent oracle remain common controlled inputs instead.
// Inspiration/rationale: wiki/decisions/operating-policy.md and load interop review.
export function checkComparisonInputs(control, candidate) {
  const protectedRoles = new Set(['dependency', 'runner', 'oracle', 'fixture', 'calibration', 'credential-file']);
  const protectedPins = manifest => manifest.inputs.filter(input => protectedRoles.has(input.role)).map(({path,role,sha256}) => ({path,role,sha256})).sort((a,b) => a.path.localeCompare(b.path));
  assert(canonical(protectedPins(control)) === canonical(protectedPins(candidate)), 'COMPARISON_INPUTS', 'Controls/candidates differ in dependency, runner, fixture, calibration or independent oracle bytes');
}

export function checkIntegrationInputs(candidate, verification) {
  for (const input of candidate.inputs) assert(verification.inputs.some(other => other.path === input.path && other.sha256 === input.sha256 && other.role === input.role), 'INTEGRATION_IDENTITY', 'Integrated verification does not bind candidate input: ' + input.path);
}

export function executionResourceIdentity(manifest, admission) {
  const owners = Object.values(admission.residentOwners ?? {}).filter(owner => owner.status !== 'released').map(owner => ({id:owner.id,kind:owner.kind ?? 'process',backend:owner.backend ?? null,resources:owner.resources,containerId:owner.containerId ?? null,imageSha256:owner.imageSha256 ?? null})).sort((a,b) => a.id.localeCompare(b.id));
  const cohort = (admission.cohort ?? []).map(peer => ({queryPath:peer.queryPath,resources:peer.resources})).sort((a,b) => canonical(a).localeCompare(canonical(b)));
  return canonical({resources:manifest.resources,requiredOwners:[...(manifest.requiredOwners ?? [])].sort(),owners,cohort,controllerInvocation:admission.controllerInvocation ?? null});
}

export function requireUniqueReferences(references) { assert(new Set(references).size === references.length, 'REPEATS', 'Independent controls cannot reuse an attempt reference'); }

export async function loadRun(context, reference) {
  assert(!context.test, 'COMPONENT_ONLY', 'Component controller contexts cannot calibrate, compare or qualify engines');
  const [jobId, attemptId] = reference.split('/');
  assert(jobId && /^\d{4}$/.test(attemptId), 'RUN_REFERENCE', 'Run references use job-id/0001');
  const verification = await verifyAttempt(context, jobId, attemptId);
  assert(verification.terminal.status === 'completed_verified_bytes', 'RUN_FAILED', 'Only byte-verified real command attempts can be compared');
  const state = await readState(context);
  const job = state.jobs[jobId]; const attempt = job.attempts.find(value => value.id === attemptId);
  const directory = await ownedPath(context.root, attempt.directory);
  const manifest = await loadJobManifest(context, job);
  const admission = await readJson(join(directory, 'grant.json'));
  const recordedInputs = await readJson(join(directory, 'inputs.json'));
  const profile = manifest.profile;
  assert(profile && profile.format === 'triplex-devloop-load-profile/1' && typeof profile.id === 'string', 'PROFILE', 'A versioned load profile is required');
  assert(profile.clients >= 1 && Number.isSafeInteger(profile.clients), 'PROFILE', 'Client population must be explicit');
  assert(finite(profile.startMilliseconds) && finite(profile.endMilliseconds) && profile.endMilliseconds > profile.startMilliseconds, 'PROFILE', 'Fixed measurement window is required');
  assert(Array.isArray(profile.requiredClasses) && profile.requiredClasses.length && new Set(profile.requiredClasses).size === profile.requiredClasses.length, 'PROFILE', 'Required logical-task classes are explicit');
  assert(typeof profile.fixtureIdentity === 'string' && typeof profile.cohortIdentity === 'string' && typeof profile.resourceIdentity === 'string', 'PROFILE', 'Fixture, co-runner and resource identities are required');
  const source = await ownedPath(directory, manifest.evidence.events);
  const timingRun = manifest.queryPath.startsWith("qlever")
    ? readLatencyRun(source, { lane: manifest.queryPath, encoding: "ndjson", expectedWriter: "triplex-public-load-event/1" }).unwrap() : null;
  const rawSha256 = timingRun?.source.sha256 ?? await hashFile(source);
  const oracle = await readOracle(context, manifest);
  const latencies = Object.fromEntries(profile.requiredClasses.map(key => [key, []]));
  const completed = Object.fromEntries(profile.requiredClasses.map(key => [key, 0]));
  const clientProgress = new Set();
  const writes = []; let rejects = 0; let readCount = 0;
  const lines = timingRun ? timingRun.records : createInterface({ input: createReadStream(source), crlfDelay: Infinity });
  for await (const line of lines) {
    if (typeof line === 'string' && !line.trim()) continue;
    const value = timingRun ? line : JSON.parse(line);
    if (value.type === 'read') {
      assert(profile.requiredClasses.includes(value.taskClass), 'EVENT', 'Unknown logical task class');
      assert(Number.isSafeInteger(value.clientId) && value.clientId >= 0 && value.clientId < profile.clients, 'EVENT', 'Read client id exceeds the declared population');
      assert(finite(value.startedMs) && finite(value.finishedMs) && value.finishedMs >= value.startedMs, 'EVENT', 'Invalid complete-call timestamps');
      if (value.startedMs < profile.startMilliseconds || value.startedMs >= profile.endMilliseconds) continue;
      if (value.ok !== true) {
        assert(profile.clients >= 512 && profile.overloadPolicy === 'bounded-explicit-rejection' && value.expectedOverload === true, 'READ_FAILURE', 'Unexpected application read failure');
        rejects++; continue;
      }
      checkReadOracle(oracle, value);
      assert(typeof value.knownPosition === 'string' && /^(0|[1-9]\d*)$/.test(value.knownPosition), 'CUT', 'Each read needs its returned logical knowledge cut');
      latencies[value.taskClass].push(value.finishedMs - value.startedMs); readCount++; clientProgress.add(value.clientId);
      if (value.finishedMs <= profile.endMilliseconds) completed[value.taskClass]++;
    } else if (value.type === 'write') {
      assert(typeof value.commandId === 'string' && finite(value.offeredMs), 'EVENT', 'Invalid writer event');
      assert(value.reconciled === true, 'WRITER_UNCERTAIN', 'Every offered command must reconcile after the bounded drain');
      assert(finite(value.ackMs) && finite(value.visibleMs) && value.visibleMs >= value.offeredMs && value.ackMs >= value.offeredMs, 'EVENT', 'Commit visibility/ACK evidence is required');
      if (value.offeredMs >= profile.startMilliseconds && value.offeredMs < profile.endMilliseconds) writes.push(value);
    } else assert(false, 'EVENT', 'Unknown raw event type');
  }
  assert(new Set(writes.map(write => write.commandId)).size === writes.length, 'WRITER_REPLAY', 'Fresh ingestion cannot count a repeated command id');
  assert(readCount > 0 && profile.requiredClasses.every(key => latencies[key].length > 0), 'SAMPLES', 'Every required class must complete');
  const seconds = (profile.endMilliseconds - profile.startMilliseconds) / 1000;
  const classes = Object.fromEntries(profile.requiredClasses.map(key => [key, { observations: latencies[key].length, completedInsideWindow: completed[key], goodput: completed[key] / seconds, p50Ms: percentile(latencies[key], .5), p95Ms: percentile(latencies[key], .95), p99Ms: percentile(latencies[key], .99) }]));
  const visible = writes.filter(write => write.visibleMs <= profile.endMilliseconds).sort((a, b) => a.visibleMs - b.visibleMs);
  const gaps = [profile.startMilliseconds, ...visible.map(write => write.visibleMs), profile.endMilliseconds];
  const maximumGapSeconds = Math.max(...gaps.slice(1).map((value, index) => value - gaps[index])) / 1000;
  const backlogAt = instant => writes.filter(write => write.offeredMs <= instant && write.visibleMs > instant).length;
  const maximumBacklog = Math.max(0, ...writes.map(write => backlogAt(write.offeredMs)));
  return {
    qleverConnectionMode: timingRun?.transportMode ?? null,
    latencyReceipt: timingRun ? { receiptVersion: timingRun.receiptVersion, writer: timingRun.writer, units: timingRun.units, source: timingRun.source } : null,
    reference, jobId, attemptId, manifest, terminal: verification.terminal, terminalSha256: verification.terminalSha256,
    eventsSha256: rawSha256, profile, classes, readCount, rejectedReads: rejects, clientsWithProgress: clientProgress.size,
    executionResources: executionResourceIdentity(manifest, admission),
    controllerFingerprint: inputFingerprint(recordedInputs.controllerPins),
    goodputScore: meanGeometry(Object.values(classes).map(value => value.goodput)),
    writer: { offered: writes.length, visiblyCommittedInsideWindow: visible.length, fractionVisible: writes.length ? visible.length / writes.length : 0, visibleCommandsPerSecond: visible.length / seconds, maximumGapSeconds, maximumBacklog, firstQuarterBacklog: backlogAt(profile.startMilliseconds + seconds * 250), lastQuarterBacklog: backlogAt(profile.startMilliseconds + seconds * 750), allOfferedReconciled: true },
  };
}

function compatibility(run, comparisonQleverMode = null) {
  const profile = run.profile;
  return json({ qleverConnectionMode: run.qleverConnectionMode ?? comparisonQleverMode, profile: profile.id, clients: profile.clients, duration: profile.endMilliseconds - profile.startMilliseconds, requiredClasses: [...profile.requiredClasses].sort(), fixture: profile.fixtureIdentity, resource: profile.resourceIdentity, cohort: profile.cohortIdentity, overloadPolicy: profile.overloadPolicy ?? 'none', calibration: profile.calibration ?? null });
}

export async function calibrate(context, references, output) {
  requireUniqueReferences(references);
  const runs = await Promise.all(references.map(reference => loadRun(context, reference)));
  const lanes = Object.keys(context.policy.lanes);
  for (const lane of lanes) assert(runs.filter(run => run.manifest.queryPath === lane).length >= context.policy.promotion.minimumIndependentRuns, 'CALIBRATION', 'Three correct capacity controls are required for every surface: ' + lane);
  assert(runs.every(run => run.profile.clients === 256 && run.profile.phase === 'capacity-calibration' && !run.profile.synthetic && run.clientsWithProgress === 256 && run.rejectedReads === 0 && run.writer.visibleCommandsPerSecond > 0), 'CALIBRATION', 'Calibration needs actual 256-client capacity controls, not synthetic/zero/unknown writer capacity');
  const qleverModes = [...new Set(runs.map(run => run.qleverConnectionMode).filter(Boolean))];
  assert(qleverModes.length <= 1, 'COMPARABILITY', 'Different QLever modes require separate treatment populations');
  const identity = compatibility(runs[0], qleverModes[0] ?? null);
  assert(runs.every(run => compatibility(run, qleverModes[0] ?? null) === identity), 'COMPARABILITY', 'Calibration controls differ in population, window, fixture, resources or co-runners');
  const writerRate = .5 * Math.min(...runs.map(run => run.writer.visibleCommandsPerSecond));
  const result = {
    format: 'triplex-devloop-calibration/1', at: now(), profileId: runs[0].profile.id,
    basis: 'Five correct surfaces; at least three capacity controls each. No invented production latency SLA.',
    writerRateCommandsPerSecond: writerRate,
    maximumWriterGapSeconds: Math.max(3 / writerRate, 1.1 * Math.max(...runs.map(run => run.writer.maximumGapSeconds))),
    maximumWriterBacklog: Math.max(1, Math.ceil(1.1 * Math.max(...runs.map(run => run.writer.maximumBacklog)))),
    minimumWriterVisibleFraction: .95,
    writerCommand: 'One atomic command corrects one fact on each of ten distinct entities; other widths are separate profiles.',
    controls: runs.map(run => ({ reference: run.reference, queryPath: run.manifest.queryPath, terminalSha256: run.terminalSha256, eventsSha256: run.eventsSha256 })),
    sharedCompatibility: JSON.parse(identity),
    interpretation: 'Frozen experimental offered-write schedule/liveness policy, not a production SLA or throughput claim for a new build.',
  };
  const path = await ownedPath(context.root, output);
  await atomicJson(path, result, { exclusive: true });
  return { ...result, output, sha256: await hashFile(path) };
}

export async function compare(context, controlReferences, candidateReferences, output) {
  requireUniqueReferences([...controlReferences, ...candidateReferences]);
  const controls = await Promise.all(controlReferences.map(reference => loadRun(context, reference)));
  const candidates = await Promise.all(candidateReferences.map(reference => loadRun(context, reference)));
  const runs = [...controls, ...candidates];
  const policy = context.policy.promotion;
  assert(controls.length >= policy.minimumIndependentRuns && candidates.length >= policy.minimumIndependentRuns, 'REPEATS', 'At least three independent control and candidate runs are required');
  assert(new Set(runs.map(run => run.reference)).size === runs.length, 'REPEATS', 'A run cannot be counted twice');
  assert(controls.every(run => inputFingerprint(run.manifest.inputs) === inputFingerprint(controls[0].manifest.inputs)) && candidates.every(run => inputFingerprint(run.manifest.inputs) === inputFingerprint(candidates[0].manifest.inputs)), 'SOURCE_IDENTITY', 'Each side must repeat the same source/build/oracle identity');
  assert(runs.every(run => run.profile.clients === 256 && !run.profile.synthetic), 'PROFILE', 'Promotion compares actual 256-client acceptance profiles');
  assert(new Set(runs.map(run => run.manifest.queryPath)).size === 1, 'LANE', 'Within-lane promotion cannot silently compare different public query surfaces');
  assert(runs.every(run => run.clientsWithProgress === 256 && run.rejectedReads === 0), 'FAIRNESS', 'Every acceptance client must progress without overload rejection');
  const qleverModes = [...new Set(runs.map(run => run.qleverConnectionMode).filter(Boolean))];
  assert(qleverModes.length <= 1, 'COMPARABILITY', 'Different QLever modes require separate treatment populations');
  const identity = compatibility(runs[0], qleverModes[0] ?? null);
  assert(runs.every(run => compatibility(run, qleverModes[0] ?? null) === identity), 'COMPARABILITY', 'Comparison mixes different workload/window/fixture/resource/co-runner/calibration profiles');
  for (const run of runs) checkComparisonInputs(controls[0].manifest, run.manifest);
  assert(runs.every(run => run.executionResources === runs[0].executionResources && run.controllerFingerprint === runs[0].controllerFingerprint), 'EXECUTION_RESOURCES', 'Within-lane runs differ in actual reservations, admitted owners/co-runners or controller bytes');
  assert(runs.every(run => Object.values(run.classes).every(value => value.observations >= policy.minimumObservationsPerRequiredClass)), 'SAMPLES', 'Required tail populations are too small');
  const calibrationInput = runs[0].manifest.inputs.find(input => input.role === 'calibration');
  assert(calibrationInput, 'CALIBRATION', 'A pinned frozen writer calibration is required');
  const calibration = await readJson(await ownedPath(context.root, calibrationInput.path));
  assert(calibration.format === 'triplex-devloop-calibration/1' && await hashFile(join(context.root, calibrationInput.path)) === calibrationInput.sha256, 'CALIBRATION', 'Calibration identity differs');
  assert(runs.every(run => run.manifest.inputs.some(input => input.path === calibrationInput.path && input.sha256 === calibrationInput.sha256 && input.role === 'calibration')), 'CALIBRATION', 'Controls and candidates need the same frozen calibration');
  const gates = performanceGates(controls, candidates, calibration, policy);
  const passed = gates.passed;
  const result = {
    format: 'triplex-devloop-comparison/1', at: now(), decision: passed ? 'PERFORMANCE_GATES_MET_PENDING_INTEGRATED_VERIFICATION' : 'REJECTED_OR_INCONCLUSIVE_KEEP_BASELINE',
    queryPath: runs[0].manifest.queryPath, profile: JSON.parse(identity), calibration: { path: calibrationInput.path, sha256: calibrationInput.sha256 },
    controls: controls.map(run => ({ reference: run.reference, terminalSha256: run.terminalSha256, eventsSha256: run.eventsSha256, score: run.goodputScore })),
    candidates: candidates.map(run => ({ reference: run.reference, terminalSha256: run.terminalSha256, eventsSha256: run.eventsSha256, score: run.goodputScore, inputFingerprint: inputFingerprint(run.manifest.inputs) })),
    gates,
    passed, statisticalMeaning: policy.confidenceClaim, semanticPromotion: 'NOT_IMPLIED; independent exact-source integration and all required gates remain mandatory',
  };
  const path = await ownedPath(context.root, output);
  await atomicJson(path, result, { exclusive: true });
  await event(context, { type: 'comparison', output, sha256: await hashFile(path), decision: result.decision });
  return result;
}

export async function promotionVerify(context, { candidate, verification, comparison, reviewer, requiredChecks, output }) {
  const candidateRun = await loadRun(context, candidate);
  const [verificationJobId, verificationAttemptId] = verification.split('/');
  const checked = await verifyAttempt(context, verificationJobId, verificationAttemptId);
  const state = await readState(context);
  const verificationJob = state.jobs[verificationJobId];
  const verificationManifest = await loadJobManifest(context, verificationJob);
  assert(reviewer && reviewer !== candidateRun.manifest.author && reviewer === verificationJob.manifest.author, 'INDEPENDENCE', 'The named independent verifier must own a different verification job');
  assert(verificationJob.manifest.kind === 'verification' && checked.terminal.status === 'completed_verified_bytes', 'VERIFICATION', 'A byte-verified exact-source integration job is required');
  const candidatePins = candidateRun.manifest.inputs;
  checkIntegrationInputs(candidateRun.manifest, verificationManifest);
  await pinInputs(context, candidatePins);
  assert(Array.isArray(requiredChecks) && requiredChecks.length > 0, 'GATES', 'Explicit required integrated gate keys are mandatory');
  const evidence = await readJson(join(context.root, verificationJob.attempts.find(value => value.id === verificationAttemptId).directory, 'evidence.json'));
  assert(requiredChecks.every(key => evidence.requiredCheckKeys.includes(key) && evidence.checks.some(check => check.key === key && check.passed)), 'GATES', 'A required integrated gate did not actually execute/pass');
  const comparisonPath = await ownedPath(context.root, comparison);
  const paired = await readJson(comparisonPath);
  assert(paired.format === 'triplex-devloop-comparison/1' && paired.passed === true && paired.candidates.some(run => run.reference === candidate && run.terminalSha256 === candidateRun.terminalSha256), 'COMPARISON', 'A passing exact-candidate comparison is required');
  const result = { format: 'triplex-devloop-promotion-verification/1', at: now(), candidate, verification, reviewer, requiredChecks, candidateTerminalSha256: candidateRun.terminalSha256, verificationTerminalSha256: checked.terminalSha256, comparisonSha256: await hashFile(comparisonPath), status: 'ELIGIBLE_FOR_RECORDED_LOCAL_PROMOTION', scope: 'Required registered gates, retained bytes, source identity and independent-owner declaration checked. No Git merge, deployment, package publication or all-ten-goal acceptance implied.' };
  const path = await ownedPath(context.root, output); await atomicJson(path, result, { exclusive: true });
  await event(context, { type: 'promotion_verified', output, sha256: await hashFile(path), candidate, verification, reviewer });
  return result;
}

export function performanceGates(controls, candidates, calibration, policy) {
  const runs = [...controls, ...candidates];
  const writerGates = runs.map(run => ({ reference: run.reference,
    visible: run.writer.fractionVisible >= calibration.minimumWriterVisibleFraction,
    gap: run.writer.maximumGapSeconds <= calibration.maximumWriterGapSeconds,
    backlog: run.writer.maximumBacklog <= calibration.maximumWriterBacklog,
    backlogStable: run.writer.lastQuarterBacklog <= run.writer.firstQuarterBacklog + 1,
    reconciled: run.writer.allOfferedReconciled,
    offeredSchedule: Math.abs(run.writer.offered - calibration.writerRateCommandsPerSecond * (run.profile.endMilliseconds - run.profile.startMilliseconds) / 1000) <= 1,
  }));
  const tails = Object.fromEntries(runs[0].profile.requiredClasses.map(key => { const control = Math.min(...controls.map(run => run.classes[key].p99Ms)); const candidate = Math.max(...candidates.map(run => run.classes[key].p99Ms)); return [key, { controlMinimumP99Ms: control, candidateMaximumP99Ms: candidate, passed: candidate <= policy.maximumRequiredP99Ratio * control }]; }));
  const controlMaximum = Math.max(...controls.map(run => run.goodputScore));
  const candidateMinimum = Math.min(...candidates.map(run => run.goodputScore));
  const readGain = candidateMinimum >= policy.minimumReadGoodputRatio * controlMaximum;
  const passed = readGain && Object.values(tails).every(value => value.passed) && writerGates.every(value => Object.entries(value).filter(([key]) => key !== 'reference').every(([, gate]) => gate));
  return { passed, readGain, controlMaximumScore: controlMaximum, candidateMinimumScore: candidateMinimum, minimumGainRatio: policy.minimumReadGoodputRatio, observedGainRatio: candidateMinimum / controlMaximum, tails, writerGates };
}
