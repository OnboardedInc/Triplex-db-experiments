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
