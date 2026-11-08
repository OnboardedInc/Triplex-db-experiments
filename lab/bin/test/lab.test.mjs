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
process.env.TX2_ENGINE_DIR = path.join(temp, 'engines'); // effectiveConfig writes per-slot config files there
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

// ---------------------------------------------------------------- EXP-M01: cpuset regime, measurement lease, PAIR verdicts

test('cpuset regime: s1/s3 get --cpuset-cpus and no quota; quota slots keep their exact effective config shape (hash unchanged)', async () => {
  const engine = await import('../engine.mjs');
  const s1 = lib.slotInfo(config, 'xtdb', 's1'), s3 = lib.slotInfo(config, 'xtdb', 's3'), dev = lib.slotInfo(config, 'xtdb', 'dev'), s2 = lib.slotInfo(config, 'xtdb', 's2');
  const e1 = engine.effectiveConfig(config, s1);
  assert.equal(e1.effective.regime, 'cpuset');
  assert.equal(e1.effective.cpuset, '0-1');
  assert.equal(engine.effectiveConfig(config, s3).effective.cpuset, '2-3');
  // The pre-EXP-M01 key list, in order: JSON.stringify order is what the config hash covers.
  const before = ['lane', 'slot', 'image', 'configYamlSha256', 'env', 'memBytes', 'cpus', 'publish', 'volume', 'cmd', 'health'];
  for (const info of [dev, s2]) assert.deepEqual(Object.keys(engine.effectiveConfig(config, info).effective), before);
  const q = engine.effectiveConfig(config, lib.slotInfo(config, 'qlever', 'dev')).effective;
  assert.equal('regime' in q, false);
  const a1 = engine.runArgs(s1, e1, 'h');
  assert.equal(a1[a1.indexOf('--cpuset-cpus') + 1], '0-1');
  assert.equal(a1.includes('--cpus'), false, 'no CFS quota in the cpuset regime');
  const a2 = engine.runArgs(s2, engine.effectiveConfig(config, s2), 'h');
  assert.equal(a2[a2.indexOf('--cpus') + 1], '2');
  assert.equal(a2.includes('--cpuset-cpus'), false);
  assert.throws(() => engine.effectiveConfig(config, { ...s1, cpuset: '0-2' }), /has 3 vCPUs, cpus is 2/);
  const shared = [...engine.cpuList(s1.cpuset)].some(c => engine.cpuList(s3.cpuset).has(c));
  assert.equal(shared, false, 'the duet pair never shares a vCPU');
  const cg = engine.parseCgroup('max 100000\n0-1\n100\nusage_usec 5\nnr_periods 10\nnr_throttled 2\nthrottled_usec 7\n');
  assert.deepEqual(cg, { cpuMax: 'max 100000', cpuset: '0-1', cpuWeight: 100, usageUsec: 5, nrPeriods: 10, nrThrottled: 2, throttledUsec: 7, throttledShare: 0.2 });
});

test('measurement lease waits for every heavy token, then holds them all; others wait until release (Q60h)', async () => {
  const { acquireMeasureLease, readMeasureLease } = await import('../heavy-lock.mjs');
  const busy = await acquireHeavy('someone else');
  await assert.rejects(acquireMeasureLease('m01 test', { holder: 'tester', pollMs: 20, timeoutMs: 200 }), /heavy tokens still held/);
  assert.equal(readMeasureLease(), null, 'a timed-out lease releases its directory and tokens');
  busy();
  const lease = await acquireMeasureLease('m01 test', { holder: 'tester', pollMs: 20 });
  assert.equal(lease.tokens, 2);
  assert.equal(readMeasureLease().holder, 'tester');
  const mine = await acquireHeavy('lease holder build'); // the holder's own heavy steps pass at once
  mine();
  const script = `
    process.env.TX2_LOCKS_DIR = ${JSON.stringify(path.join(temp, 'locks'))}; process.env.TX2_HEAVY_SLOTS = '2';
    const { acquireHeavy } = await import(${JSON.stringify(new URL('../heavy-lock.mjs', import.meta.url).href)});
    const release = await acquireHeavy('other agent', { pollMs: 20 }); console.log('GOT'); release();`;
  let got = false;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: ['ignore', 'pipe', 'ignore'] });
  child.stdout.on('data', d => { if (String(d).includes('GOT')) got = true; });
  await lib.sleep(400);
  assert.equal(got, false, 'no heavy token while the lease is held');
  lease.release();
  assert.equal(readMeasureLease(), null);
  await new Promise(resolve => child.on('close', resolve));
  assert.equal(got, true);
  fs.mkdirSync(path.join(temp, 'locks', 'measure-lease'), { recursive: true });
  fs.writeFileSync(path.join(temp, 'locks', 'measure-lease', 'owner.json'), JSON.stringify({ pid: 999999, holder: 'gone', label: 'x', at: 'y' }));
  assert.equal(readMeasureLease().stale, true, 'a dead holder never freezes the pool');
  const again = await acquireMeasureLease('after stale', { pollMs: 20 });
  again.release();
});

test('PAIR verdicts: departures INVALID, RED or over a third excluded INVALID_NOISE, decisive PAIRED_DECIDED; identity fails closed', async () => {
  const { pairVerdictOf, PAIR_DECISIVE } = await import('../receipt.mjs');
  const { DECISIVE } = await import('../../bench/lib/paired.ts');
  assert.deepEqual(PAIR_DECISIVE, [...DECISIVE]);
  assert.equal(pairVerdictOf({ grade: 'GREEN', decision: 'EQUIVALENT_WITHIN_TARGET' }).verdict, 'PAIRED_DECIDED');
  assert.equal(pairVerdictOf({ grade: 'AMBER', decision: 'FASTER_BY_TARGET' }).verdict, 'PAIRED_DECIDED');
  assert.equal(pairVerdictOf({ grade: 'AMBER', decision: 'INCONCLUSIVE_NEED_MORE_ROUNDS' }).verdict, 'PAIRED_INCONCLUSIVE');
  assert.equal(pairVerdictOf({ grade: 'RED', decision: 'FASTER' }).verdict, 'INVALID_NOISE');
  assert.equal(pairVerdictOf({ grade: 'INVALID', decision: 'FASTER' }).verdict, 'INVALID_NOISE');
  assert.equal(pairVerdictOf({ grade: 'GREEN', decision: 'FASTER', departures: ['arms are in the quota regime, not cpuset (Q60c)'] }).verdict, 'INVALID');
  const receipt = { ...base(), gate: 'PAIR', counts: { executed: 8, skip: 0 }, pair: { mode: 'aa', rounds: 8, arms: { A: {}, B: {} } }, noise: {}, stats: {} };
  const v = verdictOf(receipt);
  assert.equal(v.verdict, 'FAIL');
  assert.ok(v.reasons.includes('missing identity field pair.arms.A.placement.cpuMax') && v.reasons.includes('missing identity field pair.evidence.histograms.json'));
});

test('placement (Q67g): disjoint equal cpusets on two slots pass; shared, unequal, quota or same-slot placements do not', async () => {
  const { placementProblems, PAIR_LOOKS } = await import('../receipt.mjs');
  assert.deepEqual(PAIR_LOOKS, [8, 12, 18, 24]);
  const arm = (slot, cpuset, extra = {}) => ({ slot, regime: 'cpuset', cpuset, cpuMax: 'max 100000', memCapBytes: 3758096384, cores: 2, ...extra });
  assert.deepEqual(placementProblems(arm('s1', '0-1'), arm('s3', '2-3')), []);
  assert.match(placementProblems(arm('s1', '0-1'), arm('s3', '0-1')).join(), /overlap/);
  assert.match(placementProblems(arm('s1', '0-1'), arm('s1', '2-3')).join(), /both arms on slot s1/);
  assert.match(placementProblems(arm('s1', '0-1'), arm('s3', '2-4', { cores: 3 })).join(), /capacity differs/);
  assert.match(placementProblems(arm('s1', '0-1'), arm('s3', '2-3', { memCapBytes: 1 })).join(), /memory caps differ/);
  assert.match(placementProblems(arm('s1', '0-1'), arm('s3', '2-3', { cpuMax: '200000 100000' })).join(), /CFS quota/);
  const quota = (slot) => ({ slot, regime: 'quota', cpuset: '0-5', cpuMax: '200000 100000', memCapBytes: 1, cores: 2 });
  assert.match(placementProblems(quota('s1'), quota('s2')).join(), /not cpuset/);
});
