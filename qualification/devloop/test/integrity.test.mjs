// @ts-nocheck -- [EXP-CHECKJS] runtime-populated records, optional option bags, or branch-specific union members; option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { atomicJson, hashFile, readJson } from '../io.mjs';
import { openContext } from '../state.mjs';
import { dockerObservation, enqueue, grantNext, registerResident, reservations, selectNext, validateRequiredResidentObservation, validateResidentRecovery } from '../scheduler.mjs';
import { executeNext, ownedEnvironment } from '../executor.mjs';
import { verifyAttempt } from '../evidence.mjs';
import { checkComparisonInputs, checkIntegrationInputs, checkReadOracle, executionResourceIdentity, loadRun, performanceGates, requireUniqueReferences } from '../compare.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const policy = { format: 'triplex-devloop-policy/1', maximumHeavyTrials: 3, memoryPoolBytes: 512 * 1024 ** 2, cpuPoolUnits: 3, sampleMilliseconds: 30, terminationGraceMilliseconds: 150, maximumLogBytesPerAttempt: 32768, lanes: { 'duckdb-datalog': 'duckdb' }, promotion: {} };
test('production admission cannot multiply its resource pool with an alternate state directory', async () => {
  await assert.rejects(openContext(root, { stateDirectory: '.local/devloop-tests/alternate-production' }), { code: 'PRODUCTION_QUEUE' });
  await assert.rejects(fs.access(join(root, '.local/devloop-tests/alternate-production')));
  await assert.rejects(loadRun({ test: true }, 'component/0001'), { code: 'COMPONENT_ONLY' });
});
async function setup() {
  await fs.mkdir(join(root, '.local/devloop-tests'), { recursive: true });
  const directory = await fs.mkdtemp(join(root, '.local/devloop-tests/integrity-'));
  const context = await openContext(root, { stateDirectory: relative(root, directory), testPolicy: policy });
  const files = [['qualification/devloop/io.mjs', 'source'], ['qualification/devloop/fixtures/controller-child.mjs', 'runner'], ['qualification/devloop/fixtures/controller.expected.json', 'oracle']];
  const manifest = { format: 'triplex-devloop-job/1', id: 'proof', kind: 'fixture', queryPath: 'duckdb-datalog', backend: 'duckdb', author: 'independent-integrity-fixture', logicalTaskId: 'controller-bytes', problemId: 'receipt-binding', hypothesis: 'Tampering must fail at the anchored terminal, not only at self-consistent output hashes', goals: [6, 7], dependsOn: [], inspiration: [{ reference: 'wiki/decisions/operating-policy.md', mechanism: 'Anchor immutable terminal receipts before releasing ownership', adaptation: 'An edited result plus edited local terminal must not requalify itself' }], command: { argv: [process.execPath, join(root, files[1][0]), 'ok'], cwd: '.', env: {} }, resources: { heavy: true, memoryBytes: 256 * 1024 ** 2, cpuUnits: 1, diskBytes: 1024, timeoutMilliseconds: 5000, maximumLogBytes: 8192 }, inputs: await Promise.all(files.map(async ([path, role]) => ({ path, role, sha256: await hashFile(join(root, path)) }))), evidence: { checks: [{ key: 'actual', expectedInput: files[2][0], actual: 'artifacts/answer.json' }], requiredCheckKeys: ['actual'] }, retention: { scratch: 'rebuildable-ephemeral-only' } };
  return { context, manifest };
}

test('editing result bytes and terminal hashes together still fails its scheduler anchor', async () => {
  const { context, manifest } = await setup(); await enqueue(context, manifest);
  const result = await executeNext(context, { executor: 'test' }); assert.equal(result.status, 'completed_verified_bytes');
  const directory = join(root, result.directory); const path = join(directory, 'artifacts/answer.json');
  await fs.writeFile(path, '{"ok":"tampered"}\n');
  const terminal = await readJson(join(directory, 'terminal.json'));
  terminal.outputs.find(file => file.path === 'artifacts/answer.json').sha256 = await hashFile(path);
  await atomicJson(join(directory, 'terminal.json'), terminal);
  await assert.rejects(verifyAttempt(context, 'proof', '0001'), { code: 'TERMINAL_CHANGED' });
});

test('failed process diagnostics are anchored and artifact symlinks are refused', async () => {
  const { context, manifest } = await setup();
  manifest.id = 'failed-with-result'; manifest.command.argv[2] = 'fail-with-artifact';
  await enqueue(context, manifest);
  const result = await executeNext(context, { executor: 'failure-test' });
  assert.equal(result.status, 'failed_process');
  assert.ok(result.outputs.some(output => output.path === 'artifacts/answer.json'));
  await verifyAttempt(context, manifest.id, '0001');
  await fs.writeFile(join(root, result.directory, 'artifacts/answer.json'), 'changed failure bytes\n');
  await assert.rejects(verifyAttempt(context, manifest.id, '0001'), { code: 'OUTPUT_CHANGED' });
  const linked = structuredClone(manifest); linked.id = 'failed-with-link';
  linked.command.argv[2] = 'fail-with-symlink'; linked.command.argv.push(join(root, 'qualification/devloop/fixtures/controller.expected.json'));
  await enqueue(context, linked);
  const refused = await executeNext(context, { executor: 'failure-test' });
  assert.equal(refused.status, 'integrity_or_infrastructure_failure');
  assert.equal(refused.failure.code, 'SYMLINK');
});

test('private engine environment propagates owned endpoints and refuses default/remote overrides', async () => {
  const { context } = await setup();
  const env = await ownedEnvironment(context);
  assert.equal(env.DOCKER_HOST, 'unix://' + join(root, '.runtime/colima/triplex/docker.sock'));
  for (const name of ['DOCKER_CONFIG', 'COLIMA_HOME', 'LIMA_HOME', 'BUILDX_CONFIG']) assert.ok(env[name].startsWith(root + '/'));
  const explicit = await ownedEnvironment(context, { DOCKER_CONFIG: join(root, '.local/devloop-tests/alternate-docker'), DOCKER_HOST: 'unix://' + join(root, '.local/devloop-tests/alternate.sock') });
  assert.equal(explicit.DOCKER_CONFIG, join(root, '.local/devloop-tests/alternate-docker'));
  await assert.rejects(ownedEnvironment(context, { DOCKER_HOST: 'unix:///var/run/docker.sock' }), { code: 'PRIVATE_DOCKER' });
  await assert.rejects(ownedEnvironment(context, { DOCKER_HOST: 'tcp://127.0.0.1:2375' }), { code: 'PRIVATE_DOCKER' });
  await assert.rejects(ownedEnvironment(context, { DOCKER_CONTEXT: 'default' }), { code: 'PRIVATE_DOCKER' });
});

test('calibration cannot count one run three times and read digests bind independent task/cut/parameter catalog', () => {
  assert.throws(() => requireUniqueReferences(['a/0001', 'a/0001', 'a/0001']), { code: 'REPEATS' });
  const entry = { taskClass: 'lookup', logicalTaskId: 'lookup-user', paramsSha256: '1'.repeat(64), basis: { validAt: 1.5, knownPosition: '7' }, expectedSha256: createHash('sha256').update('[]').digest('hex') };
  const catalog = { entries: { lookup7: entry } };
  const read = { ...entry, oracleKey: 'lookup7', knownPosition: '7', resultSha256: entry.expectedSha256, resultJson:'[]' };
  checkReadOracle(catalog, read);
  assert.throws(() => checkReadOracle(catalog, { ...read, resultJson:'["wrong"]' }), { code: 'RESULT_BYTES' });
  assert.throws(() => checkReadOracle(catalog, { ...read, basis: { validAt: 1.5, knownPosition: '8' }, knownPosition: '8' }), { code: 'READ_ORACLE' });
  assert.throws(() => checkReadOracle(catalog, { ...read, paramsSha256: '4'.repeat(64) }), { code: 'READ_ORACLE' });
});

test('comparison freezes machinery and oracle bytes while allowing candidate engine/query changes', () => {
  const pin=(path,role,sha256='1'.repeat(64))=>({path,role,sha256});
  const control={inputs:[pin('engine.ts','source'),pin('engine.js','build'),pin('runner.ts','runner'),pin('lock.yaml','dependency'),pin('answers.json','oracle')]};
  const candidate=structuredClone(control);candidate.inputs[0].sha256='2'.repeat(64);candidate.inputs[1].sha256='2'.repeat(64);
  checkComparisonInputs(control,candidate);
  for(const role of ['runner','dependency','oracle']){const changed=structuredClone(candidate);changed.inputs.find(input=>input.role===role).sha256='3'.repeat(64);assert.throws(()=>checkComparisonInputs(control,changed),{code:'COMPARISON_INPUTS'});}
});

test('independent integration binds every candidate role including dependencies and runners', () => {
  const candidate={inputs:['source','build','runner','dependency','oracle'].map((role,index)=>({path:`input-${index}`,role,sha256:'1'.repeat(64)}))};
  checkIntegrationInputs(candidate,structuredClone(candidate));
  for(const role of ['runner','dependency']){const verification=structuredClone(candidate);verification.inputs=verification.inputs.filter(input=>input.role!==role);assert.throws(()=>checkIntegrationInputs(candidate,verification),{code:'INTEGRATION_IDENTITY'});}
});

test('within-lane resource identity binds actual caps, owners, co-runners and controller heap flags', () => {
  const manifest={resources:{memoryBytes:1024,cpuUnits:1},requiredOwners:['foundation']};
  const admission={controllerInvocation:{execArgv:['--max-old-space-size=256'],nodeOptions:null},residentOwners:{foundation:{id:'foundation',status:'active',kind:'docker',resources:{memoryBytes:2048},containerId:'a',imageSha256:'b'}},cohort:[{jobId:'irrelevant-attempt-id',queryPath:'qlever-native',resources:{memoryBytes:512}}]};
  const identity=executionResourceIdentity(manifest,admission);
  const equivalent=structuredClone(admission);equivalent.cohort[0].jobId='different-attempt';assert.equal(executionResourceIdentity(manifest,equivalent),identity);
  for(const change of [value=>value.residentOwners.foundation.resources.memoryBytes++,value=>value.residentOwners.foundation.imageSha256='c',value=>value.cohort[0].resources.memoryBytes++,value=>value.controllerInvocation.execArgv=[]]){const changed=structuredClone(admission);change(changed);assert.notEqual(executionResourceIdentity(manifest,changed),identity);}
  assert.notEqual(executionResourceIdentity({...manifest,resources:{...manifest.resources,cpuUnits:2}},admission),identity);
});

test('disk admission charges total ownership headroom as well as inside free space', async () => {
  const { context, manifest } = await setup();
  await enqueue(context, manifest);
  context.storage.freeInsideBytes = 100000; context.storage.operationalMaximumBytes = 46000; context.storage.ownedCountedBytes = 45500;
  await assert.rejects(grantNext(context), { code: 'NO_ADMISSION' });
});

test('Docker resident proof binds exact private owner/image/caps/mounts without host-interpreting guest PID', () => {
  const spec = { containerId: 'a'.repeat(64), imageSha256: 'sha256:' + 'b'.repeat(64), directory: root + '/.runtime/owned-test', requiredLabels: { 'triplex.owner': 'test' }, resources: { memoryBytes: 2 * 1024 ** 3, cpuUnits: 1.5, diskBytes: 0 } };
  const value = { Id: spec.containerId, Image: spec.imageSha256, State: { Running: true, Pid: 42 }, Config: { Labels: spec.requiredLabels }, HostConfig: { Memory: spec.resources.memoryBytes, MemorySwap: spec.resources.memoryBytes, NanoCpus: 1.5e9 }, Mounts: [{ Type: 'bind', Source: spec.directory, Destination: '/data', RW: true }] };
  assert.equal(dockerObservation(spec, value, root).guestPidMeaning, 'Guest PID deliberately excluded from host process identity');
  assert.throws(() => dockerObservation(spec, { ...value, Id: 'c'.repeat(64) }, root), { code: 'DOCKER_OWNER' });
  assert.throws(() => dockerObservation(spec, { ...value, HostConfig: { ...value.HostConfig, Memory: 1 } }, root), { code: 'DOCKER_CAP' });
  assert.throws(() => dockerObservation(spec, { ...value, Mounts: [{ Type: 'bind', Source: '/unowned', Destination: '/data', RW: true }] }, root), { code: 'DOCKER_MOUNT' });
});

test('pre-grant stopped Mac owner becomes UNKNOWN durably with no attempt or released reservation', async () => {
  const {context,manifest}=await setup();
  const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
  const directory=join(context.directory,'resident');await fs.mkdir(directory);
  try {
    await registerResident(context,{id:'live-owner',backend:'duckdb',pid:child.pid,directory,resources:{memoryBytes:16*1024**2,cpuUnits:.1,diskBytes:0},inputs:manifest.inputs});
    manifest.requiredOwners=['live-owner'];await enqueue(context,manifest);
    const before=await readJson(join(context.directory,'state.json')),reserved=reservations(before),exited=once(child,'exit');child.kill('SIGTERM');await exited;
    await assert.rejects(grantNext(context,{onlyJob:manifest.id}),{code:'OWNER_STALE'});
    const state=await readJson(join(context.directory,'state.json'));
    assert.equal(state.owners['live-owner'].status,'unknown');assert.deepEqual(reservations(state),reserved);
    assert.equal(state.jobs[manifest.id].status,'queued');assert.equal(state.jobs[manifest.id].attempts.length,0);
    assert.equal(state.owners['live-owner'].lastRequiredOwnerFailure.jobId,manifest.id);
    await assert.rejects(fs.access(join(context.directory,'jobs',manifest.id,'attempts')),{code:'ENOENT'});
  } finally { if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;} }
});

test('healthy Mac owner has a fresh birth-bound grant receipt and changed birth is refused', async () => {
  const {context,manifest}=await setup(),child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
  const directory=join(context.directory,'resident');await fs.mkdir(directory);
  try {
    const owner=await registerResident(context,{id:'live-owner',backend:'duckdb',pid:child.pid,directory,resources:{memoryBytes:16*1024**2,cpuUnits:.1,diskBytes:0},inputs:manifest.inputs});
    manifest.requiredOwners=['live-owner'];await enqueue(context,manifest);
    const granted=await grantNext(context,{onlyJob:manifest.id}),receipt=await readJson(join(granted.directory,'grant.json'));
    assert.equal(receipt.requiredOwnerChecks.length,1);assert.equal(receipt.requiredOwnerChecks[0].observation.pid,child.pid);assert.equal(receipt.requiredOwnerChecks[0].observation.identity,owner.identity);
    assert.throws(()=>validateRequiredResidentObservation(owner,{pid:child.pid,identity:'different birth'}),{code:'OWNER_STALE'});
  } finally {if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}}
});

test('pre-grant Docker freshness refuses stopped, restarted, changed identity and changed caps', () => {
  const owner={kind:'docker',containerId:'a'.repeat(64),imageSha256:'sha256:'+'b'.repeat(64),observation:{startedAt:'2026-11-07T00:00:00Z'},resources:{memoryBytes:2048,cpuUnits:1.5}};
  const fresh={containerId:owner.containerId,imageSha256:owner.imageSha256,running:true,startedAt:owner.observation.startedAt,memoryBytes:2048,cpuUnits:1.5};
  validateRequiredResidentObservation(owner,fresh);
  for(const changed of [{...fresh,running:false},{...fresh,startedAt:'2026-11-07T01:00:00Z'},{...fresh,containerId:'c'.repeat(64)},{...fresh,imageSha256:'sha256:'+'c'.repeat(64)},{...fresh,memoryBytes:1024},{...fresh,cpuUnits:1}])assert.throws(()=>validateRequiredResidentObservation(owner,changed),{code:'OWNER_STALE'});
});

test('resident recovery requires same owner, new startup and anchored passed readiness without changing reservations', () => {
  const owner={id:'foundation-qlever',kind:'docker',status:'unknown',backend:'qlever',containerId:'a'.repeat(64),imageSha256:'sha256:'+'b'.repeat(64),registeredAt:'2026-11-06T20:00:00Z',resources:{memoryBytes:2*1024**3,cpuUnits:1.5,diskBytes:0}};
  const manifest={kind:'verification',backend:'qlever',residentRecovery:{ownerId:owner.id,containerId:owner.containerId,imageSha256:owner.imageSha256,requiredCheckKeys:['readiness']}};
  const observation={running:true,startedAt:'2026-11-06T21:00:00Z'};
  const artifact={containerId:owner.containerId,imageSha256:owner.imageSha256,after:{Running:true,StartedAt:observation.startedAt}};
  const terminal={status:'completed_verified_bytes',at:'2026-11-06T21:00:01Z',cleanup:{groupGone:true,unknown:false}};
  const evidence={requiredCheckKeys:['readiness'],checks:[{key:'readiness',passed:true}]};
  const before=structuredClone(owner);
  validateResidentRecovery(owner,manifest,terminal,observation,artifact,evidence);
  assert.deepEqual(owner,before);
  for(const changed of [{...artifact,containerId:'c'.repeat(64)},{...artifact,after:{...artifact.after,StartedAt:'2026-11-06T21:00:02Z'}}]) assert.throws(()=>validateResidentRecovery(owner,manifest,terminal,observation,changed,evidence),{code:'OWNER_RECOVERY'});
  assert.throws(()=>validateResidentRecovery(owner,manifest,{...terminal,status:'failed_oracle'},observation,artifact,evidence),{code:'OWNER_RECOVERY'});
  assert.throws(()=>validateResidentRecovery(owner,manifest,terminal,{...observation,startedAt:'2026-11-06T19:00:00Z'},artifact,evidence),{code:'OWNER_RECOVERY'});
  assert.throws(()=>validateResidentRecovery(owner,manifest,terminal,observation,artifact,{requiredCheckKeys:[],checks:[]}),{code:'OWNER_RECOVERY'});
});

test('performance decision requires observed-range read gain, every tail and the frozen writer floor', () => {
  const make = (score, p99 = 100, fraction = 1) => ({ reference: String(score), profile: { requiredClasses: ['lookup'], startMilliseconds: 0, endMilliseconds: 1000 }, goodputScore: score, classes: { lookup: { p99Ms: p99 } }, writer: { offered: 1, fractionVisible: fraction, maximumGapSeconds: .5, maximumBacklog: 1, firstQuarterBacklog: 0, lastQuarterBacklog: 1, allOfferedReconciled: true } });
  const controls = [make(99), make(100), make(101)]; const candidates = [make(112), make(113), make(114)];
  const calibration = { minimumWriterVisibleFraction: .95, maximumWriterGapSeconds: 1, maximumWriterBacklog: 1, writerRateCommandsPerSecond: 1 };
  const bounds = { minimumReadGoodputRatio: 1.1, maximumRequiredP99Ratio: 1.1 };
  assert.equal(performanceGates(controls, candidates, calibration, bounds).passed, true);
  assert.equal(performanceGates(controls, [make(110), ...candidates.slice(1)], calibration, bounds).passed, false);
  assert.equal(performanceGates(controls, [make(112, 111), ...candidates.slice(1)], calibration, bounds).passed, false);
  assert.equal(performanceGates(controls, [make(112, 100, .94), ...candidates.slice(1)], calibration, bounds).passed, false);
});
