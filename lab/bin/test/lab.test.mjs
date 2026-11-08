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

// ---------------------------------------------------------------- EXP-K01 seed once, clone faithfully

test('golden key: canonical over its inputs, changes with any seed or engine input, ignores slot placement', async () => {
  const { goldenKey, systemConfig, canonicalJson, effectiveConfig } = await import('../engine.mjs');
  const seedInputs = { format: 'tx2-xtdb-seed-inputs/1', adapter: { commit: 'abc', dist: { core: { sha256: '1' } } }, generator: { 'lab/bench/lib/world.ts': 'w' }, options: { subjects: 500, seed: 'ns-v2' } };
  const reordered = { options: { seed: 'ns-v2', subjects: 500 }, generator: { 'lab/bench/lib/world.ts': 'w' }, adapter: { dist: { core: { sha256: '1' } }, commit: 'abc' }, format: 'tx2-xtdb-seed-inputs/1' };
  const a = goldenKey({ seedInputs, imageId: 'sha256:img', systemConfigSha256: 'cfg' });
  assert.equal(a.key, goldenKey({ seedInputs: reordered, imageId: 'sha256:img', systemConfigSha256: 'cfg' }).key);
  assert.equal(a.key8, a.key.slice(0, 8));
  assert.notEqual(a.key, goldenKey({ seedInputs: { ...seedInputs, options: { subjects: 501, seed: 'ns-v2' } }, imageId: 'sha256:img', systemConfigSha256: 'cfg' }).key);
  assert.notEqual(a.key, goldenKey({ seedInputs, imageId: 'sha256:other', systemConfigSha256: 'cfg' }).key);
  assert.notEqual(a.key, goldenKey({ seedInputs, imageId: 'sha256:img', systemConfigSha256: 'cfg2' }).key);
  assert.throws(() => goldenKey({ seedInputs: null, imageId: 'x', systemConfigSha256: 'y' }), /needs seedInputs/);
  assert.equal(canonicalJson({ b: 1, a: [{ d: 1, c: 2 }] }), '{"a":[{"c":2,"d":1}],"b":1}');
  // s1 and s3 differ only in placement, so one golden serves both; a different heap would not.
  const s1 = effectiveConfig(config, lib.slotInfo(config, 'xtdb', 's1')).effective;
  const s3 = effectiveConfig(config, lib.slotInfo(config, 'xtdb', 's3')).effective;
  assert.notDeepEqual(s1, s3);
  assert.deepEqual(systemConfig(s1), systemConfig(s3));
  assert.equal('publish' in systemConfig(s1) || 'volume' in systemConfig(s1) || 'slot' in systemConfig(s1), false);
  assert.notDeepEqual(systemConfig(s1), systemConfig(effectiveConfig(config, lib.slotInfo(config, 'xtdb', 'dev')).effective));
});

test('host disk floor: a copy that would leave less than 5 GiB is refused (Q74f)', async () => {
  const { diskFloorVerdict, HOST_DISK_FLOOR_BYTES } = await import('../engine.mjs');
  assert.equal(HOST_DISK_FLOOR_BYTES, 5 * GiB);
  assert.equal(diskFloorVerdict({ freeBytes: 8.7 * GiB, copyBytes: 3.41 * GiB }).ok, true);
  const no = diskFloorVerdict({ freeBytes: 8.7 * GiB, copyBytes: 3.8 * GiB });
  assert.equal(no.ok, false);
  assert.match(no.reason, /Q74f/);
  assert.equal(diskFloorVerdict({ freeBytes: 5 * GiB, copyBytes: 0 }).ok, true);
});

test('clean stop needs both lines, no forced halt, exit 143 within ten seconds', async () => {
  const { stopVerdict } = await import('../engine.mjs');
  const good = '2026 INFO xtdb.main - Stopping node...\n2026 INFO xtdb.main - Node stopped.\n';
  assert.equal(stopVerdict({ log: good, exitCode: 143, oomKilled: false, stopMs: 1200 }).ok, true);
  assert.equal(stopVerdict({ log: good, exitCode: 0, oomKilled: false, stopMs: 1200 }).ok, false);
  assert.deepEqual(stopVerdict({ log: good, exitCode: 137, oomKilled: false, stopMs: 1200 }).reasons, ['exit code 137']);
  assert.equal(stopVerdict({ log: 'Stopping node...\n', exitCode: 143, oomKilled: false, stopMs: 1200 }).ok, false);
  assert.equal(stopVerdict({ log: good, exitCode: 143, stopMs: 10000 }).ok, false);
  assert.equal(stopVerdict({ log: good, exitCode: 143, stopMs: null }).ok, false);
  assert.equal(stopVerdict({ log: 'Node stopped.', exitCode: 143, stopMs: 1 }).ok, false);
  const forced = stopVerdict({ log: 'could not stop node cleanly after 10000 ms, forcing exit\n', exitCode: 1, oomKilled: false, stopMs: 1200 });
  assert.equal(forced.ok, false);
  assert.equal(forced.reasons.length, 4);
  assert.equal(stopVerdict({ log: good, exitCode: 143, oomKilled: true, stopMs: 1200 }).ok, false);
});

test('volume listings parse, hash every field, fail closed on truncation, and diff for P-e', async () => {
  const { parseListing, diffListings, listingScript } = await import('../engine.mjs');
  const h = c => c.repeat(64);
  const text = (logSha, extra = '') => `@@stat\n./buffers/v06/blocks/b00.binpb|10|644|20000|20000\n./log/LOG|5|644|20000|20000\n./log/REPLICA_LOG|7|644|20000|20000\n${extra}@@sha\n${h('a')}  ./buffers/v06/blocks/b00.binpb\n${logSha}  ./log/LOG\n${h('c')}  ./log/REPLICA_LOG\n@@end\n`;
  const a = parseListing(text(h('b')));
  assert.equal(a.count, 3);
  assert.equal(a.bytes, 22);
  assert.deepEqual(a.files.map(f => f.path), ['./buffers/v06/blocks/b00.binpb', './log/LOG', './log/REPLICA_LOG']);
  assert.equal(a.treeSha256, parseListing(text(h('b'))).treeSha256);
  assert.notEqual(a.treeSha256, parseListing(text(h('d'))).treeSha256);
  assert.notEqual(a.treeSha256, parseListing(text(h('b')).replace('./log/LOG|5|644|20000|20000', './log/LOG|5|644|0|0')).treeSha256, 'owner is part of the tree hash');
  assert.throws(() => parseListing(text(h('b')).replace('@@end\n', '')), /truncated/);
  assert.throws(() => parseListing(text(h('b')).replace(`${h('a')}  ./buffers/v06/blocks/b00.binpb\n`, '')), /disagree/);
  const logsOnly = diffListings(a, parseListing(text(h('d'))));
  assert.deepEqual(logsOnly.changed, ['./log/LOG']);
  assert.equal(logsOnly.storageImmutable, true);
  const blockChanged = diffListings(a, parseListing(text(h('b')).replace(`${h('a')}  ./buffers`, `${h('e')}  ./buffers`)));
  assert.deepEqual(blockChanged.changedOutsideLogs, ['./buffers/v06/blocks/b00.binpb']);
  assert.equal(blockChanged.storageImmutable, false);
  const groupChanged = structuredClone(a);
  groupChanged.files[0].gid = '0';
  assert.equal(diffListings(a, groupChanged).storageImmutable, false, 'group ownership is part of storage immutability');
  assert.match(listingScript('/dst'), /! -path '\*\/\.tmp\/\*'/);
});
