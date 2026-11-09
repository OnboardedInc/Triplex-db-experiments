// @ts-nocheck -- [EXP-CHECKJS] runtime-populated records, optional option bags, or branch-specific union members; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing; option bags inferred from defaults omit optional fields; lane-specific effective config fields are present on the Datomic branch; Node overloads and union-valued dynamic records; negative fixtures deliberately delete fields; Promise resolver used without a value. Binding errors remain checked by lab/bin/checkjs.mjs.
// Unit tests for lab/bin (EXP-000). Run: node --test lab/bin/test/
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-lab-test-'));
process.env.TX2_LOCKS_DIR = path.join(temp, 'locks');
process.env.TX2_HEAVY_SLOTS = '2';
// [EXP-X05] engine.mjs tests write effective configs here and read engine config from this checkout.
process.env.TX2_ENGINE_DIR = path.join(temp, 'engines');
process.env.TX2_CONFIG_DIR = path.resolve(import.meta.dirname, '../../..');
const lib = await import('../lib.mjs');
const { classifyLanguages, tallyLanguages, verdictOf } = await import('../receipt.mjs');
const { acquireHeavy } = await import('../heavy-lock.mjs');

const config = JSON.parse(fs.readFileSync(new URL('../../config/slots.json', import.meta.url)));
const GiB = 1024 ** 3;

test('pool admits the two dev engines when only they run', () => {
  const xtdbDev = { container: 'tx2-xtdb-dev', memBytes: 3 * GiB, diskForecastBytes: 4 * GiB, holder: 'a' };
  const verdict = lib.admission({ config, reservations: [xtdbDev], running: [{ name: 'tx2-xtdb-dev', running: true, memBytes: 3 * GiB }],
    request: { container: 'tx2-qlever-dev', memBytes: 2.5 * GiB, diskForecastBytes: 4 * GiB }, diskUsedBytes: 10 * GiB });
  assert.equal(verdict.ok, true);
  assert.equal(verdict.memAfter, 5.5 * GiB);
});

test('pool counts external research probes and refuses with their names', () => {
  const running = [{ name: 'tx2-probe-r7', running: true, memBytes: 5 * GiB }, { name: 'tx2-probe-r8', running: true, memBytes: 5 * GiB }];
  const verdict = lib.admission({ config, reservations: [], running, request: { container: 'tx2-xtdb-dev', memBytes: 3 * GiB, diskForecastBytes: GiB }, diskUsedBytes: 0 });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reasons[0], /memory/);
  assert.deepEqual(verdict.holders.map(h => h.split(' ')[0]), ['tx2-probe-r7', 'tx2-probe-r8']);
});

test('an uncapped external container counts as the whole VM (fail closed)', () => {
  const verdict = lib.admission({ config, reservations: [], running: [{ name: 'tx2-probe-x', running: true, memBytes: null }],
    request: { container: 'tx2-xtdb-dev', memBytes: GiB, diskForecastBytes: 0 }, diskUsedBytes: 0 });
  assert.equal(verdict.ok, false);
  assert.equal(verdict.external[0].uncapped, true);
});

test('a reserved container counts once even while it also runs', () => {
  const reservations = [{ container: 'tx2-xtdb-dev', memBytes: 3 * GiB, diskForecastBytes: 0, holder: 'a' }];
  const running = [{ name: 'tx2-xtdb-dev', running: true, memBytes: 3 * GiB }];
  const verdict = lib.admission({ config, reservations, running, request: { container: 'tx2-xtdb-s1', memBytes: 3.5 * GiB, diskForecastBytes: 0 }, diskUsedBytes: 0 });
  assert.equal(verdict.memUsed, 3 * GiB);
});

test('disk forecast refuses past the 50 GiB used limit', () => {
  const verdict = lib.admission({ config, reservations: [{ container: 'tx2-xtdb-dev', memBytes: GiB, diskForecastBytes: 8 * GiB, holder: 'a' }], running: [],
    request: { container: 'tx2-xtdb-s1', memBytes: GiB, diskForecastBytes: 8 * GiB }, diskUsedBytes: 40 * GiB });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reasons[0], /disk/);
});

test('slotInfo rejects forbidden and probe ports and names containers and volumes', () => {
  const info = lib.slotInfo(config, 'xtdb', 'dev');
  assert.equal(info.container, 'tx2-xtdb-dev');
  assert.equal(info.volume, 'tx2-xtdb-dev-data');
  assert.equal(info.endpoint, 'postgres://xtdb:xtdb@127.0.0.1:5470/xtdb');
  const bad = structuredClone(config); bad.slots.xtdb.dev.port = 17019;
  assert.throws(() => lib.slotInfo(bad, 'xtdb', 'dev'), /forbidden/);
  bad.slots.xtdb.dev.port = 5467;
  assert.throws(() => lib.slotInfo(bad, 'xtdb', 'dev'), /research probes/);
});

test('withDirLock serializes and breaks a lock whose owner pid is dead', async () => {
  const dir = path.join(temp, 'locks', 'pool.lock');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'owner.json'), JSON.stringify({ pid: 999999, at: 'x' }));
  const order = [];
  await Promise.all([
    lib.withDirLock(dir, async () => { order.push('a1'); await lib.sleep(50); order.push('a2'); }, { quiet: true }),
    lib.sleep(10).then(() => lib.withDirLock(dir, async () => { order.push('b'); }, { quiet: true })),
  ]);
  assert.deepEqual(order, ['a1', 'a2', 'b']);
  assert.equal(fs.existsSync(dir), false);
});

test('withPool read-modify-writes the ledger atomically across processes', async () => {
  const script = `
    process.env.TX2_LOCKS_DIR = ${JSON.stringify(path.join(temp, 'locks'))};
    const lib = await import(${JSON.stringify(new URL('../lib.mjs', import.meta.url).href)});
    for (let i = 0; i < 10; i++) await lib.withPool(async ledger => { ledger.counter = (ledger.counter ?? 0) + 1; await lib.sleep(2); });`;
  await Promise.all([1, 2, 3].map(() => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: 'inherit' });
    child.on('close', code => code === 0 ? resolve() : reject(new Error('child ' + code)));
  })));
  const ledger = JSON.parse(fs.readFileSync(path.join(temp, 'locks', 'pool.json'), 'utf8'));
  assert.equal(ledger.counter, 30);
});

test('reconcile drops only reservations with no container and a dead reserving pid', () => {
  const ledger = { reservations: [
    { container: 'tx2-a', pid: 999999 },
    { container: 'tx2-b', pid: process.pid },
    { container: 'tx2-c', pid: null },
  ] };
  const dropped = lib.reconcile(ledger, [{ name: 'tx2-c' }]);
  assert.deepEqual(dropped.map(e => e.container), ['tx2-a']);
  assert.deepEqual(ledger.reservations.map(e => e.container), ['tx2-b', 'tx2-c']);
});

test('heavy semaphore admits at most TX2_HEAVY_SLOTS holders', async () => {
  const a = await acquireHeavy('a'), b = await acquireHeavy('b');
  let third = false;
  const pending = acquireHeavy('c', { pollMs: 20 }).then(release => { third = true; return release; });
  await lib.sleep(100);
  assert.equal(third, false);
  a();
  const c = await pending;
  assert.equal(third, true);
  b(); c();
});

test('object store is content addressed and refuses dependency caches and secret-like names', () => {
  const file = path.join(lib.REPO, 'lab/config/slots.json');
  const entry = lib.storeFile(file, { role: 'test' });
  assert.equal(entry.sha256, lib.sha256File(file));
  assert.ok(fs.existsSync(path.join(lib.OBJECTS, entry.sha256)));
  assert.throws(() => lib.storeFile(path.join(lib.REPO, 'node_modules/x.js')), /dependency cache/);
  const secret = path.join(temp, 'access-token');
  fs.writeFileSync(secret, 'shh');
  assert.ok(lib.storeFile(secret, { role: 'test', relativeTo: temp }).refused);
});

const q = (language, steps = []) => ({ operation: 'public-native-query', language, steps });
test('language classification: pure XTQL, pure SQL, hybrid, strict substeps', () => {
  const sourceCut = { phase: 'source-cut', language: 'xtdb-sql' };
  assert.equal(classifyLanguages([q('xtql', [sourceCut])]).answer, 'xtql');
  assert.equal(classifyLanguages([q('xtql', [sourceCut])]).strict, 'hybrid');
  assert.equal(classifyLanguages([q('xtdb-sql'), { normalization: 'x' }]).answer, 'xtdb-sql');
  assert.equal(classifyLanguages([q('xtql'), q('xtdb-sql')]).answer, 'hybrid');
  assert.equal(classifyLanguages([{ normalization: 'only' }]).answer, 'none');
  const tally = tallyLanguages([{ status: 'PASS', queryTrace: [q('xtql')] }, { status: 'FAIL_ANSWER', queryTrace: [q('xtql'), q('xtdb-sql')] }]);
  assert.deepEqual(tally.answer, { xtql: 1, hybrid: 1 });
  assert.deepEqual(tally.passByAnswer, { xtql: 1 });
});

const base = () => ({
  gate: 'G1', reasons: [], scope: 'full', contractVersion: '0.1.0-draft', runKind: 'diagnostic', counts: { executed: 88, skip: 0 }, lockfileSha256: 'l', gateScripts: {},
  git: { head: 'h', headTree: 't', branch: 'main', sourceTreeId: 's', diffSha256: 'd' }, toolchain: { node: 'v22', pnpm: '10' },
  build: { manifestSha256: 'm' }, engine: { imageId: 'i', configSha256: 'c', endpoint: 'e' }, contactedEndpoint: 'e',
});
test('verdict fails closed on missing identity, zero executions, skips; subsets never PASS', () => {
  assert.equal(verdictOf(base()).verdict, 'PASS');
  const missing = base(); delete missing.engine.imageId;
  assert.deepEqual(verdictOf(missing), { verdict: 'FAIL', reasons: ['missing identity field engine.imageId'] });
  const zero = base(); zero.counts.executed = 0;
  assert.equal(verdictOf(zero).verdict, 'FAIL');
  const skipped = base(); skipped.counts.skip = 1;
  assert.equal(verdictOf(skipped).verdict, 'FAIL');
  const subset = base(); subset.scope = 'subset:1/44';
  assert.equal(verdictOf(subset).verdict, 'PASS_SUBSET');
  const reasoned = base(); reasoned.reasons = ['G1 contacted x, slot is y'];
  assert.equal(verdictOf(reasoned).verdict, 'FAIL');
});

test('caseLanguages lists every substep language in order', async () => {
  const { caseLanguages } = await import('../receipt.mjs');
  const record = caseLanguages([q('xtql', [{ language: 'xtdb-sql' }, { language: 'xtql' }]), { normalization: 'n' }, q('xtdb-sql')]);
  assert.deepEqual(record.languages, ['xtdb-sql', 'xtql', 'xtdb-sql']);
  assert.deepEqual(record.answerLanguages, ['xtdb-sql', 'xtql']);
  assert.equal(record.languageClass.answer, 'hybrid');
});

test('contract claims: full G2 on xtdb claims PKT.full142 for both XTDB lanes; subsets claim nothing', async () => {
  const { contractClaims } = await import('../receipt.mjs');
  const file = path.join(temp, 'obligations.json');
  fs.writeFileSync(file, JSON.stringify({ format: 'f', version: '0.1.0-draft', status: 'DRAFT', engineOfLane: { 'xtdb-xtql': 'xtdb', 'xtdb-sql': 'xtdb', 'qlever-sparql': 'qlever' },
    obligations: [{ id: 'PKT.full142', definitionSha256: 'abc', receiptScope: 'lane', lanes: ['xtdb-xtql', 'xtdb-sql', 'qlever-sparql'] }] }));
  const full = contractClaims({ gate: 'G2', lane: 'xtdb', scope: 'full', contractFile: file });
  assert.deepEqual(full.obligations, [{ id: 'PKT.full142', definitionSha256: 'abc', receiptScope: 'lane', lanes: ['xtdb-xtql', 'xtdb-sql'] }]);
  assert.equal(full.contract.version, '0.1.0-draft');
  assert.deepEqual(contractClaims({ gate: 'G2', lane: 'xtdb', scope: 'subset:6/142', contractFile: file }).obligations, []);
  assert.match(contractClaims({ gate: 'G1', lane: 'xtdb', scope: 'full', contractFile: path.join(temp, 'none.json') }).reasons[0], /missing/);
});

// ---------------------------------------------------------------- EXP-X05 second-writer guard and followers

const writerYaml = fs.readFileSync(new URL('../../../xtdb-config.yaml', import.meta.url), 'utf8');
const followerYaml = fs.readFileSync(new URL('../../config/xtdb-follower-config.yaml', import.meta.url), 'utf8');
const guard = (configText, mountedBy, container = 'tx2-xtdb-s2-ro') => lib.volumeGuard({ volume: 'tx2-xtdb-s2-data', container, configText, mountedBy });

test('second-writer guard refuses a second container on a slot volume unless its config is read-only', () => {
  // The writer's own config is read-write: a second copy of it is the R19 1.1 silent-corruption case.
  const second = guard(writerYaml, ['tx2-xtdb-s2']);
  assert.equal(second.ok, false);
  assert.match(second.reason, /second read-write container on tx2-xtdb-s2-data \(already mounted by tx2-xtdb-s2\)/);
  assert.match(second.reason, /readOnlyDatabases: true/);
  // A stopped container still counts: it can be started again outside the harness.
  assert.equal(guard(writerYaml, ['tx2-xtdb-s2', 'tx2-old-stopped']).others.length, 2);
  // The repo follower config passes.
  assert.deepEqual(guard(followerYaml, ['tx2-xtdb-s2']), { ok: true, others: ['tx2-xtdb-s2'], readOnly: true });
  // The first container on a volume, or a restart of the same container, is not a second writer.
  assert.equal(guard(writerYaml, []).ok, true);
  assert.equal(guard(writerYaml, ['tx2-xtdb-s2'], 'tx2-xtdb-s2').ok, true);
  // A writer started while a follower already mounts the volume is refused too (it is the second container).
  assert.equal(guard(writerYaml, ['tx2-xtdb-s2-ro'], 'tx2-xtdb-s2').ok, false);
});

test('second-writer guard fails closed on every config that does not say exactly readOnlyDatabases: true', () => {
  const variants = {
    commented: `# readOnlyDatabases: true\n${writerYaml}`,
    nested: writerYaml.replace('server:\n', 'server:\n  readOnlyDatabases: true\n'),
    quoted: `readOnlyDatabases: "true"\n${writerYaml}`,
    capitalised: `readOnlyDatabases: True\n${writerYaml}`,
    false: `readOnlyDatabases: false\n${writerYaml}`,
    duplicate: `readOnlyDatabases: true\nreadOnlyDatabases: false\n${writerYaml}`,
    unparsable: `readOnlyDatabases: true\n   badly: indented\n${writerYaml}`,
    flowMapping: '{readOnlyDatabases: true}\n',
    empty: '',
  };
  for (const [name, text] of Object.entries(variants)) {
    assert.equal(lib.xtdbConfigReadOnly(text), false, name);
    assert.equal(guard(text, ['tx2-xtdb-s2']).ok, false, name);
  }
  assert.equal(lib.xtdbConfigReadOnly('readOnlyDatabases: true   # trailing comment\n'), true);
});

test("follower config must be read-only and read the writer's own log and storage paths", () => {
  assert.deepEqual(lib.checkFollowerConfig(writerYaml, followerYaml), { ok: true, reasons: [] });
  const moved = lib.checkFollowerConfig(writerYaml, followerYaml.replace('/var/lib/xtdb/log', '/var/lib/xtdb/log2'));
  assert.equal(moved.ok, false);
  assert.match(moved.reasons[0], /log is !Local \/var\/lib\/xtdb\/log2 on the follower but !Local \/var\/lib\/xtdb\/log on the writer/);
  assert.match(lib.checkFollowerConfig(writerYaml, followerYaml.replace('readOnlyDatabases: true\n', '')).reasons[0], /does not set top-level readOnlyDatabases/);
  assert.match(lib.checkFollowerConfig(writerYaml, followerYaml.replace('storage: !Local', 'storage: !InMemory')).reasons[0], /storage/);
  assert.match(lib.checkFollowerConfig(writerYaml, followerYaml.replace('port: 8080', 'port: 8081')).reasons[0], /healthz/);
  assert.match(lib.checkFollowerConfig(followerYaml, followerYaml).reasons.join(' '), /writer config is read-only/);
});

test('follower: own container and port, the slot volume mounted read-only, the read-only config bytes, slot lock shared', async () => {
  const { effectiveConfig, followerInfo } = await import('../engine.mjs');
  const s2 = lib.slotInfo(config, 'xtdb', 's2');
  const fol = followerInfo(config, s2, { 'cpuset-cpus': '3,2' });
  assert.equal(fol.container, 'tx2-xtdb-s2-ro');
  assert.equal(fol.port, 5482);
  assert.equal(fol.volume, s2.volume);
  assert.equal(fol.lockDir, s2.lockDir);
  assert.equal(fol.cpusetCpus, '2,3');
  const eff = effectiveConfig(config, fol);
  assert.equal(eff.effective.volume, 'tx2-xtdb-s2-data:/var/lib/xtdb:ro');
  assert.equal(lib.xtdbConfigReadOnly(fs.readFileSync(eff.files.config, 'utf8')), true);
  // The writer's effective config, and so its hash, is unchanged unless a cpuset is given.
  assert.equal('cpusetCpus' in effectiveConfig(config, s2).effective, false);
  assert.notEqual(effectiveConfig(config, { ...s2, cpusetCpus: '0,1' }).sha256, effectiveConfig(config, s2).sha256);
  const bad = structuredClone(config); bad.lanes.xtdb.follower.portOffset = -7; // 5472 - 7 = 5465, a research-probe port
  assert.throws(() => followerInfo(bad, s2), /research probes/);
  assert.throws(() => followerInfo(config, lib.slotInfo(config, 'qlever', 's2')), /only for the xtdb lane/);
  const small = followerInfo(config, s2, { 'follower-profile': 'small' });
  assert.equal(small.memBytes, 1 * GiB);
  assert.match(small.javaOpts, /-Xmx512m -XX:MaxDirectMemorySize=256m/);
  const smallEff = effectiveConfig(config, small);
  assert.equal(smallEff.effective.profile, 'small');
  assert.equal(smallEff.effective.configSource, 'lab/config/xtdb-follower-small-config.yaml');
  assert.deepEqual(lib.checkFollowerConfig(writerYaml, fs.readFileSync(smallEff.files.config, 'utf8')), { ok: true, reasons: [] });
  assert.equal('profile' in eff.effective, false);
  assert.throws(() => followerInfo(config, s2, { 'follower-profile': 'tiny' }), /unknown follower profile/);
});

test('cpusets parse against the VM and unpinned containers overlap everything', () => {
  assert.deepEqual(lib.parseCpuset('0,1', 6), [0, 1]);
  assert.deepEqual(lib.parseCpuset('2-3', 6), [2, 3]);
  assert.throws(() => lib.parseCpuset('5-6', 6), /outside/);
  assert.throws(() => lib.parseCpuset('a', 6), /bad cpuset/);
  assert.deepEqual(lib.cpusetOverlap('0,1', '2-3', 6), []);
  assert.deepEqual(lib.cpusetOverlap('0,1', '1-2', 6), [1]);
  assert.deepEqual(lib.cpusetOverlap('0,1', null, 6), [0, 1]);
});

// [EXP-DA00] Why: adding a lane must not silently recreate X/Q residents. Rejected: shape-only config assertions (miss byte hash drift).
test('Datomic addition leaves every existing slot effective-config hash unchanged', async () => {
  const { effectiveConfig } = await import('../engine.mjs');
  const expected = {
    xtdb: ['034fff1703f2ecebb49b5ddeeaed4ee4e2a197ece368a6bdc93b074355e785ac', '13f5a70b36655b51fdf6daca77cc8bc215c4ef8bc044569867500fb286458927', '2f8c2b72780491e138480dc2505669ace09bb0b018c200d9f7d0460d8b8b5ec0', 'a714f64039f0a5dc69dd1c4ff0160ec8027016fc1fcf595986714b527c9cd96b'],
    qlever: ['c10589d0cdd0e69b45bed28702540377efa735a7f511dbedd82b4de42bd342e6', '44b08fad7eebf4a958742f832f3cc3c2035f39ea2a0ef9d3aa141aa3e697555a', '2d7cce7d2425fc67ab48b3d7136f31786f255f447ae8a89f9faed86060b4372f', '3c97a4d5102d5bb72b4345eafb3025e2312ba9b49c35bd934750bcf895bd08ba'],
  };
  for (const lane of ['xtdb', 'qlever']) for (const [i, slot] of ['dev', 's1', 's2', 's3'].entries())
    assert.equal(effectiveConfig(config, lib.slotInfo(config, lane, slot)).sha256, expected[lane][i]);
});
test('Datomic resident is parkable, pins separate JVM CPUs, and cannot coexist with an exclusive slot', async () => {
  const { effectiveConfig } = await import('../engine.mjs');
  const info = lib.slotInfo(config, 'datomic', 'dev');
  assert.equal(info.parkable, true);
  assert.equal(info.memBytes, 2.75 * GiB);
  assert.equal(info.port, 8470);
  assert.equal(info.cpusetCpus, '0,1');
  const effective = effectiveConfig(config, info).effective;
  assert.equal(effective.configMountMode, 'ro');
  assert.match(effective.transactorOpts, /-Xmx640m/);
  assert.match(effective.gatewayOpts, /-Xmx1g/);
  assert.deepEqual(lib.cpusetOverlap(effective.txCpus, effective.gwCpus, config.vm.cpus), []);
  const bad = { ...info, gwCpus: '0' };
  assert.throws(() => effectiveConfig(config, bad), /overlap/);
  const reservations = ['xtdb', 'qlever', 'datomic'].map(lane => {
    const s = lib.slotInfo(config, lane, 'dev'); return { container: s.container, memBytes: s.memBytes, diskForecastBytes: 0 };
  });
  const verdict = lib.admission({ config, reservations, running: [], request: { container: 'tx2-xtdb-s1', memBytes: 3.5 * GiB, diskForecastBytes: 0 }, diskUsedBytes: 0 });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reasons.join(' '), /memory/);
});
