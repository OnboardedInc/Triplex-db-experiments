// @ts-nocheck -- [EXP-CHECKJS] runtime-populated records, optional option bags, or branch-specific union members; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing; option bags inferred from defaults omit optional fields; negative fixtures deliberately delete fields. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { atomicJson, hashFile, readJson } from '../io.mjs';
import { locked, openContext, snapshot } from '../state.mjs';
import { enqueue, grantNext, readiness, reconcile, refreshResident, registerResident, releaseResident, reservations } from '../scheduler.mjs';
import { executeNext } from '../executor.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const MiB = 1024 ** 2;
const policy = {
  format: 'triplex-devloop-policy/1', maximumHeavyTrials: 3,
  memoryPoolBytes: 512 * MiB, cpuPoolUnits: 3,
  sampleMilliseconds: 30, terminationGraceMilliseconds: 150,
  maximumLogBytesPerAttempt: 32768,
  lanes: { 'qlever-datalog': 'qlever', 'qlever-native': 'qlever' }, promotion: {},
};
const controllerFiles = [
  'scripts/triplex-devloop.mjs', 'qualification/devloop/policy.json',
  ...['io', 'state', 'migration', 'preimages', 'scheduler', 'executor', 'worker', 'evidence', 'compare'].map(name => 'qualification/devloop/' + name + '.mjs'),
];

// Component-only copied workspace with an inspect-only executable, not an
// alternative production queue or a Docker API test hook. Its command log proves
// registration never issues start/run/stop. No real daemon/socket is contacted.
async function setup() {
  const parent = join(root, '.local/devloop-tests');
  await fs.mkdir(parent, { recursive: true });
  const directory = await fs.mkdtemp(join(parent, 'prepared-stopped-'));
  for (const path of controllerFiles) {
    await fs.mkdir(join(directory, path, '..'), { recursive: true });
    await fs.copyFile(join(root, path), join(directory, path));
  }
  await fs.mkdir(join(directory, 'tools/bootstrap'), { recursive: true });
  await fs.mkdir(join(directory, 'fixtures/data'), { recursive: true });
  const inspector = `
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
await fs.appendFile(join(root, 'fixtures/inspect-commands.jsonl'), JSON.stringify(args) + '\\n');
const value = JSON.parse(await fs.readFile(join(root, 'fixtures/inspect.json'), 'utf8'));
if (args.length !== 3 || args[0] !== 'docker' || args[1] !== 'inspect' || args[2] !== 'a'.repeat(64)) process.exit(91);
process.stdout.write(JSON.stringify([value]));
`;
  await fs.writeFile(join(directory, 'tools/bootstrap/inspect-only.mjs'), inspector);
  const shellQuote = value => "'" + value.replaceAll("'", "'\\''") + "'";
  const wrapper = '#!/bin/sh\nexec ' + shellQuote(process.execPath) + ' ' + shellQuote(join(directory, 'tools/bootstrap/inspect-only.mjs')) + ' "$@"\n';
  await fs.writeFile(join(directory, 'tools/bootstrap/with-env.sh'), wrapper, { mode: 0o700 });
  const value = {
    Id: 'a'.repeat(64), Image: 'sha256:' + 'b'.repeat(64),
    State: { Running: false, Pid: 0, Paused: false, Restarting: false, StartedAt: '0001-01-01T00:00:00Z' },
    Config: { Labels: { 'triplex.owner': 'prepared-test', 'triplex.packet': 'component' }, Cmd: ['never-record-this-canary'], Env: ['CANARY=not-a-real-credential'] },
    HostConfig: { Memory: 64 * MiB, MemorySwap: 64 * MiB, NanoCpus: 1e9 },
    Mounts: [{ Type: 'bind', Source: join(directory, 'fixtures/data'), Destination: '/data', RW: true }],
  };
  await atomicJson(join(directory, 'fixtures/inspect.json'), value);
  await fs.writeFile(join(directory, 'fixtures/expected.json'), '{"ready":true}\n');
  await fs.writeFile(join(directory, 'fixtures/readiness.mjs'), `
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
const value = JSON.parse(await fs.readFile(join(process.cwd(), 'fixtures/inspect.json'), 'utf8'));
await fs.writeFile(join(process.env.TRIPLEX_RUN_ARTIFACTS, 'ready.json'), JSON.stringify({ ready: true }) + '\\n');
await fs.writeFile(join(process.env.TRIPLEX_RUN_ARTIFACTS, 'recovery.json'), JSON.stringify({ containerId: value.Id, imageSha256: value.Image, after: { Running: value.State.Running, StartedAt: value.State.StartedAt } }) + '\\n');
`);
  await fs.writeFile(join(directory, 'fixtures/run.mjs'), "import './readiness.mjs';\n");
  const context = await openContext(directory, { testPolicy: structuredClone(policy) });
  const spec = {
    id: 'fault-copy', backend: 'qlever', kind: 'docker', registrationMode: 'prepared-stopped',
    containerId: value.Id, imageSha256: value.Image,
    requiredLabels: { ...value.Config.Labels }, directory: join(directory, 'fixtures/data'),
    resources: { memoryBytes: 64 * MiB, cpuUnits: 1, diskBytes: 4096 },
    inputs: [{ path: 'qualification/devloop/scheduler.mjs', role: 'source', sha256: await hashFile(join(directory, 'qualification/devloop/scheduler.mjs')) }],
  };
  const environment = {};
  for (const name of ['COLIMA_HOME', 'LIMA_HOME', 'DOCKER_CONFIG', 'BUILDX_CONFIG', 'PNPM_HOME', 'PYTHONPYCACHEPREFIX', 'GOCACHE', 'GOMODCACHE', 'CARGO_HOME', 'RUSTUP_HOME', 'npm_config_store_dir']) environment[name] = join(directory, '.owned', name);
  environment.DOCKER_HOST = 'unix://' + join(directory, '.owned/docker.sock');
  const files = [
    ['qualification/devloop/scheduler.mjs', 'source'], ['fixtures/run.mjs', 'runner'],
    ['fixtures/readiness.mjs', 'build'], ['fixtures/expected.json', 'oracle'],
  ];
  const manifest = {
    format: 'triplex-devloop-job/1', id: 'readiness', kind: 'verification',
    queryPath: 'qlever-native', backend: 'qlever', author: 'prepared-reservation-component',
    logicalTaskId: 'stopped-owner-readiness', problemId: 'reserve-before-start',
    hypothesis: 'Preparation retains a reservation before a same-CID anchored readiness activates it',
    goals: [6, 7], dependsOn: [],
    inspiration: [{ reference: 'experiments/qlever-native-fault-v2/CONTROLLED-STOP.md', mechanism: 'Reserve an exact stopped owner before startup', adaptation: 'Inspect-only component workspace, no engine service' }],
    command: { argv: [process.execPath, join(directory, 'fixtures/run.mjs')], cwd: '.', env: environment },
    resources: { heavy: false, memoryBytes: 256 * MiB, cpuUnits: 1, diskBytes: 16384, timeoutMilliseconds: 5000, maximumLogBytes: 8192 },
    inputs: await Promise.all(files.map(async ([path, role]) => ({ path, role, sha256: await hashFile(join(directory, path)) }))),
    evidence: { checks: [{ key: 'ready', expectedInput: 'fixtures/expected.json', actual: 'artifacts/ready.json' }], requiredCheckKeys: ['ready'] },
    retention: { scratch: 'rebuildable-ephemeral-only' },
    residentRecovery: { ownerId: spec.id, containerId: spec.containerId, imageSha256: spec.imageSha256, readinessArtifact: 'artifacts/recovery.json', requiredCheckKeys: ['ready'] },
  };
  return { context, spec, value, manifest, async inspect(next = value) { await atomicJson(join(directory, 'fixtures/inspect.json'), next); }, async commands() { try { return (await fs.readFile(join(directory, 'fixtures/inspect-commands.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); } catch (error) { if (error.code === 'ENOENT') return []; throw error; } } };
}

test('default running registration remains ACTIVE and stopped default registration refuses', async () => {
  const fixture = await setup(); const { context, spec, value } = fixture;
  delete spec.registrationMode;
  await assert.rejects(registerResident(context, spec), { code: 'DOCKER_OWNER' });
  value.State = { ...value.State, Running: true, Pid: 123, StartedAt: new Date().toISOString() };
  await fixture.inspect();
  const owner = await registerResident(context, spec);
  assert.equal(owner.status, 'active'); assert.equal(owner.registrationMode, undefined);
  assert.deepEqual(reservations(await snapshot(context)), { heavy: 0, memoryBytes: 64 * MiB, cpuUnits: 1, diskBytes: 4096 });
});

test('stopped preparation allocates UNKNOWN resources and records only safe inspect fields', async () => {
  const fixture = await setup(); const { context, spec } = fixture;
  const owner = await registerResident(context, spec);
  assert.equal(owner.status, 'unknown'); assert.equal(owner.observation.running, false);
  const state = await snapshot(context);
  assert.deepEqual(reservations(state), { heavy: 0, memoryBytes: 64 * MiB, cpuUnits: 1, diskBytes: 4096 });
  assert.equal(JSON.stringify(state).includes('never-record-this-canary'), false);
  assert.equal(JSON.stringify(state).includes('not-a-real-credential'), false);
  assert.deepEqual(await fixture.commands(), [['docker', 'inspect', spec.containerId]]);
});

test('preparation rejects running, guest-process, paused, restarting and missing-state owners', async () => {
  for (const change of [{ Running: true }, { Pid: 3 }, { Paused: true }, { Restarting: true }, { Paused: undefined }]) {
    const fixture = await setup(); Object.assign(fixture.value.State, change); await fixture.inspect();
    await assert.rejects(registerResident(fixture.context, fixture.spec), { code: 'DOCKER_OWNER' });
    assert.equal(Object.keys((await snapshot(fixture.context)).owners).length, 0);
    assert.ok((await fixture.commands()).every(args => args[1] === 'inspect'));
  }
});

test('unknown modes and non-Docker preparation refuse without a native command', async () => {
  const fixture = await setup();
  await assert.rejects(registerResident(fixture.context, { ...fixture.spec, registrationMode: 'typo' }), { code: 'OWNER' });
  await assert.rejects(registerResident(fixture.context, { ...fixture.spec, kind: 'process', pid: process.pid }), { code: 'OWNER' });
  assert.deepEqual(await fixture.commands(), []);
});

test('prepared identity, image, labels, caps, swap and writable mounts remain fenced', async () => {
  const changes = [
    value => { value.Id = 'c'.repeat(64); }, value => { value.Image = 'sha256:' + 'c'.repeat(64); },
    value => { value.Config.Labels['triplex.owner'] = 'foreign'; },
    value => { value.HostConfig.Memory += 1; }, value => { value.HostConfig.NanoCpus = 2e9; },
    value => { value.HostConfig.MemorySwap = -1; },
    value => { value.Mounts[0].Source = '/tmp/foreign'; },
  ];
  for (let index = 0; index < changes.length; index++) {
    const fixture = await setup(); changes[index](fixture.value); await fixture.inspect();
    await assert.rejects(registerResident(fixture.context, fixture.spec), { code: index < 3 ? 'DOCKER_OWNER' : index < 6 ? 'DOCKER_CAP' : 'DOCKER_MOUNT' });
    assert.equal(Object.keys((await snapshot(fixture.context)).owners).length, 0);
    assert.ok((await fixture.commands()).every(args => args[1] === 'inspect'));
  }
});

test('prepared owner refuses memory, CPU and fresh total-owned disk overcommit', async () => {
  for (const dimension of ['memoryBytes', 'cpuUnits', 'diskBytes']) {
    const fixture = await setup();
    const existing = { id: 'main-unknown', status: 'unknown', identity: 'main', resources: { memoryBytes: 64 * MiB, cpuUnits: 1, diskBytes: 4096 } };
    await locked(fixture.context, state => { state.owners[existing.id] = existing; });
    if (dimension === 'memoryBytes') fixture.context.policy.memoryPoolBytes = 100 * MiB;
    if (dimension === 'cpuUnits') fixture.context.policy.cpuPoolUnits = 1;
    if (dimension === 'diskBytes') fixture.context.storage.operationalMaximumBytes = 6000;
    const before = (await snapshot(fixture.context)).owners;
    await assert.rejects(registerResident(fixture.context, fixture.spec), { code: 'CAPACITY' });
    assert.deepEqual((await snapshot(fixture.context)).owners, before);
  }
});

test('fresh prepared ids cannot replace released history or duplicate any held identity', async () => {
  const fixture = await setup();
  const old = { id: fixture.spec.id, status: 'released', token: 'old-token', identity: 'old', registeredAt: '2026-01-01T00:00:00Z', recoveries: [{ sha256: 'retained-proof' }], resources: { memoryBytes: 64 * MiB, cpuUnits: 1, diskBytes: 4096 } };
  await locked(fixture.context, state => { state.owners[old.id] = old; });
  await assert.rejects(registerResident(fixture.context, fixture.spec), { code: 'OWNER' });
  assert.deepEqual((await snapshot(fixture.context)).owners[old.id], old);
  await locked(fixture.context, state => { state.owners['main-unknown'] = { ...old, id: 'main-unknown', status: 'unknown', identity: fixture.spec.containerId }; });
  await assert.rejects(registerResident(fixture.context, { ...fixture.spec, id: 'distinct-owner' }), { code: 'OWNER' });
  assert.equal(Object.keys((await snapshot(fixture.context)).owners).length, 2);
});

test('ordinary required-owner trials cannot start while prepared owner remains UNKNOWN', async () => {
  const fixture = await setup(); const { context, spec, manifest } = fixture;
  await registerResident(context, spec); manifest.requiredOwners = [spec.id];
  await enqueue(context, manifest);
  const state = await snapshot(context);
  assert.equal(readiness(state, state.jobs[manifest.id]), 'resident-owner-not-active:' + spec.id);
  await assert.rejects(grantNext(context, { onlyJob: manifest.id }), { code: 'NO_ADMISSION' });
  const after = await snapshot(context);
  assert.equal(after.jobs[manifest.id].attempts.length, 0); assert.equal(after.owners[spec.id].status, 'unknown');
  assert.deepEqual(reservations(after), reservations(state));
});

test('reconcile and a failed readiness do not free or activate a prepared owner', async () => {
  const fixture = await setup(); const { context, spec, manifest } = fixture;
  await registerResident(context, spec);
  const before = (await snapshot(context)).owners[spec.id];
  await reconcile(context);
  assert.deepEqual((await snapshot(context)).owners[spec.id], before);
  manifest.command.argv = [process.execPath, '-e', 'process.exit(2)'];
  await enqueue(context, manifest);
  const result = await executeNext(context, { onlyJob: manifest.id, executor: 'prepared-component' });
  assert.equal(result.status, 'failed_process');
  await assert.rejects(refreshResident(context, spec.id, manifest.id + '/0001'));
  const after = await snapshot(context);
  assert.deepEqual(after.owners[spec.id], before);
  assert.deepEqual(reservations(after), { heavy: 0, memoryBytes: 64 * MiB, cpuUnits: 1, diskBytes: 4096 });
});

test('real component byte job and same-CID refresh activate without replacing reservation history', async () => {
  const fixture = await setup(); const { context, spec, value, manifest } = fixture;
  await registerResident(context, spec);
  const before = (await snapshot(context)).owners[spec.id];
  value.State = { ...value.State, Running: true, Pid: 99, StartedAt: new Date(Date.now() + 1).toISOString() };
  await fixture.inspect();
  // A changed inspection fixture simulates an external start; this test never
  // starts or stops a Docker container. The component child writes fixed bytes.
  await enqueue(context, manifest);
  const result = await executeNext(context, { onlyJob: manifest.id, executor: 'prepared-component' });
  assert.equal(result.status, 'completed_verified_bytes');
  await refreshResident(context, spec.id, manifest.id + '/0001');
  const after = await snapshot(context); const owner = after.owners[spec.id];
  assert.equal(owner.status, 'active'); assert.equal(owner.token, before.token);
  assert.equal(owner.registeredAt, before.registeredAt); assert.equal(owner.identity, before.identity);
  assert.deepEqual(owner.resources, before.resources); assert.equal(owner.recoveries.length, 1);
  assert.deepEqual(reservations(after), { heavy: 0, memoryBytes: 64 * MiB, cpuUnits: 1, diskBytes: 4096 });
  assert.ok((await fixture.commands()).every(args => args.length === 3 && args[0] === 'docker' && args[1] === 'inspect'));
});

test('release requires a fresh stopped proof and keeps the prepared record', async () => {
  const fixture = await setup(); const { context, spec, value } = fixture;
  await registerResident(context, spec); const before = (await snapshot(context)).owners[spec.id];
  value.State.Running = true; value.State.Pid = 99; await fixture.inspect();
  await assert.rejects(releaseResident(context, spec.id), { code: 'DOCKER_OWNER' });
  value.State.Running = false; value.State.Pid = 99; await fixture.inspect();
  await assert.rejects(releaseResident(context, spec.id), { code: 'DOCKER_OWNER' });
  value.State.Running = false; value.State.Pid = 0; await fixture.inspect();
  await releaseResident(context, spec.id);
  const state = await snapshot(context); assert.equal(state.owners[spec.id].status, 'released');
  assert.equal(state.owners[spec.id].token, before.token); assert.equal(state.owners[spec.id].registeredAt, before.registeredAt);
  assert.deepEqual(reservations(state), { heavy: 0, memoryBytes: 0, cpuUnits: 0, diskBytes: 0 });
});
