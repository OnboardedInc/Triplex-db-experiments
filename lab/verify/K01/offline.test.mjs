// [EXP-K01-VK01] Why: exercise the reviewed functions themselves with deterministic offline I/O. Rejected: a second implementation of the settle predicates (would miss production defects).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { after, test } from 'node:test';
import { blockTrieCoverage, cloneCertificateHash, canonical, compareFreeze, digest, sha256 } from '../../bench/lib/clone.ts';
import { seedPathOf } from '../../bench/lib/bulk.ts';
import { chooseSamples } from '../../bench/lib/samples.ts';

const root = path.resolve(import.meta.dirname, '../../..');
process.env.TX2_CONFIG_DIR = root;
process.env.TX2_ENGINE_DIR = path.join(import.meta.dirname, 'tmp/engines');
const { parseListing, diffListings, stopVerdict } = await import('../../bin/engine.mjs');
const sources = Object.fromEntries(['lab/bench/clone-check.ts', 'lab/bench/lib/clone.ts', 'lab/bin/engine.mjs', 'lab/experiments/EXP-K01-seed-clone/round2-live.mjs'].map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const observations = [];
const record = (name, observed) => observations.push({ name, observed: JSON.parse(JSON.stringify(observed)) });
const section = (file, start, end) => {
  const text = sources[file], from = text.indexOf(start), to = text.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `source boundaries: ${file}`);
  return text.slice(from, to);
};
function load(code, names, context) {
  return vm.runInNewContext(stripTypeScriptTypes(code) + `\n;({${names.join(',')}})`, context);
}

const tables = ['tx_assertions', 'tx_attempts', 'tx_claims', 'tx_meta', 'txs'];
const trie = () => {
  const rows = tables.map(table => [table, 'l01-rc-b00', 1, 'live', 1000, 10]);
  return { rows, sha256: digest(rows) };
};
const gauge = (msg = 200, upload = 1) => ({ jobsAvailable: 0, latestCompletedTxId: 100, lagMsgId: 0, latestSubmittedMsgId: msg, latestProcessedMsgId: msg, lastUploadTime: upload });
const block = (index, msg) => ({ block_idx: index, tx_id: 100, latest_processed_msg_id: msg });

async function runSettle(mutate = () => {}, options = {}) {
  let phase = 0, count = 0, now = 0;
  const polls = [];
  const base = { listing: [], blocks: [], gauges: gauge(), trie: { rows: [], sha256: digest([]) } };
  const { settle } = load(section('lab/bench/clone-check.ts', 'const blockNumber =', 'async function startCheck'), ['settle'], {
    Date: { now: () => now }, Number, digest, blockTrieCoverage,
    num: value => value == null ? null : Number(value),
    opt: (name, fallback) => options[name] ?? (name === 'timeout-s' ? '20' : fallback),
    fs: { writeFileSync: () => {} }, log: () => {},
    sleep: async ms => { now += ms; },
    // [EXP-K01-VK01] Why: sharedSnap can retain live rows before restart. Rejected: using live_tables as settle evidence (R30 #6174).
    liveRows: () => { throw new Error('pre-restart live_tables is stale'); },
    healthz: () => { phase++; count = 0; return { status: options.finishStatus ?? 200 }; },
    snapshot: async () => {
      if (!phase) return structuredClone(base);
      count++;
      const value = { listing: phase === 1 ? ['00'] : ['00', '01'], blocks: phase === 1 ? [block('00', 201)] : [block('00', 201), block('01', 202)], gauges: gauge(200 + phase, 1 + phase), trie: trie() };
      mutate(value, phase, count);
      polls.push({ phase, count, atMs: now, value: structuredClone(value) });
      return value;
    },
  });
  const result = await settle();
  return { result: JSON.parse(JSON.stringify(result)), polls };
}

test('Q83d: two settled cuts accept already compacted L1 coverage without consulting stale live_tables', async () => {
  const { result, polls } = await runSettle();
  record('settled-two-cuts', result);
  assert.equal(result.settled, true);
  assert.equal(result.phases.length, 2);
  assert.deepEqual(polls.map(p => p.atMs), [5000, 10000, 15000, 20000, 25000, 30000]);
});

for (const variation of ['busy', 'missing-table', 'garbage', 'wrong-block', 'missing-gauge', 'changing-catalog', 'no-upload', 'lag']) {
  test(`Q83d: refuse a pre-settle clone source (${variation})`, async () => {
    const { result } = await runSettle((value, _phase, n) => {
      if (variation === 'busy') value.gauges.jobsAvailable = 1;
      if (variation === 'missing-table') value.trie.rows.pop();
      if (variation === 'garbage') value.trie.rows.forEach(r => { r[3] = 'garbage'; });
      if (variation === 'wrong-block') value.trie.rows.forEach(r => { r[1] = 'l01-rc-b01'; });
      if (variation === 'missing-gauge') value.gauges.jobsAvailable = null;
      if (variation === 'changing-catalog') value.trie.rows[0][4] += n;
      if (variation === 'no-upload') value.gauges.lastUploadTime = 1;
      if (variation === 'lag') value.gauges.lagMsgId = 1;
      value.trie.sha256 = digest(value.trie.rows);
    });
    record(`refuse-${variation}`, result);
    assert.equal(result.settled, false);
    assert.equal(result.phases.length, 1);
  });
}

test('Q83d: busy observations reset the three-reading streak', async () => {
  const { result } = await runSettle((value, phase, n) => { if (phase === 1 && n === 2) value.gauges.jobsAvailable = 1; }, { 'timeout-s': '40' });
  record('busy-resets-streak', result);
  assert.equal(result.settled, true);
  assert.deepEqual(result.phases[0].polls.map(p => p.streak), [1, 0, 1, 2, 3]);
});

test('Q83e: a later stable replay watermark is provisional until stopped-tail proof', async () => {
  const { result } = await runSettle(value => { value.gauges.latestProcessedMsgId = value.gauges.latestSubmittedMsgId = 999; });
  record('superseded-source', result);
  assert.equal(result.settled, true);
  assert.equal(result.qualified, false);
  assert.equal(result.frontiers.M, 999);
  assert.ok(result.frontiers.F < result.frontiers.M);
});

test('settle: a failed block cut reports failure without a silent second attempt', async () => {
  const { result, polls } = await runSettle(() => {}, { finishStatus: 503 });
  record('failed-cut', result);
  assert.equal(result.settled, false);
  assert.match(result.reason, /finish-block #1 failed/);
  assert.equal(result.phases.length, 1);
  assert.equal(polls.length, 0);
});

test('settle: a failed snapshot propagates once without retry', async () => {
  let calls = 0;
  await assert.rejects(runSettle(() => { calls++; throw new Error('snapshot query failed'); }), /snapshot query failed/);
  record('failed-snapshot', { calls });
  assert.equal(calls, 1);
});

test('R30: the second checkpoint must preserve the settled trie digest', async () => {
  const { result } = await runSettle((value, phase) => {
    if (phase === 2) { value.trie.rows[0][4]++; value.trie.sha256 = digest(value.trie.rows); }
  });
  record('checkpoint-catalog-change', result);
  assert.equal(result.settled, false);
  assert.equal(result.phases.length, 2);
});

test('F3: Q83d block tx_id must equal the current node completed-tx gauge', async () => {
  const { result } = await runSettle(value => { value.gauges.latestCompletedTxId = 101; });
  record('completed-tx-gauge-drift', result);
  assert.equal(result.settled, false, 'block tx 100 is not the currently observed node tx 101');
});

test('R30: reference start rejects live rows, wrong resume, catalog drift, or busy compaction', async () => {
  for (const variation of ['clean', 'live', 'resume', 'catalog', 'busy']) {
    const expected = { gauges: gauge(201), trie: trie(), listing: ['00', '01'] };
    const { startCheck } = load(section('lab/bench/clone-check.ts', 'async function startCheck', '// ---------------------------------------------------------------- fingerprint'), ['startCheck'], {
      Number, canonical, container: 'offline-fixture', DOCKER_HOST: 'no-daemon',
      sleep: async () => {}, healthz: () => ({ status: 200 }),
      gauges: async () => ({ ...expected.gauges, jobsAvailable: variation === 'busy' ? 1 : 0 }),
      liveRows: async () => ({ total: variation === 'live' ? 10 : 0, rows: [] }),
      tries: async () => variation === 'catalog' ? { sha256: 'different' } : expected.trie,
      blockListing: () => expected.listing,
      spawnSync: (_command, args) => ({ status: 0, stdout: args.includes('inspect') ? '2026-11-08T00:00:00Z' : `leader startup complete, resuming after ${variation === 'resume' ? 202 : 201}`, stderr: '' }),
    });
    const result = await startCheck(expected);
    record(`reference-start-${variation}`, result);
    assert.equal(result.ok, variation === 'clean');
  }
});

test('R30: Log4j race and slow/forced stops refuse; a flagged clean stop accepts', () => {
  const good = { log: 'Stopping node...\nServer stopped.\nFlight SQL server stopped\nHealthz server stopped.\nNode stopped.\n', exitCode: 143, oomKilled: false, stopMs: 500 };
  const cases = [good, { ...good, log: 'Stopping node...\n' }, { ...good, stopMs: 10000 }, { ...good, exitCode: 1, log: good.log + 'could not stop node cleanly' }, { ...good, oomKilled: true }];
  const results = cases.map(value => stopVerdict(value));
  record('clean-stop-variations', results);
  assert.deepEqual(results.map(value => value.ok), [true, false, false, false, false]);
});

test('clone: an exact copy accepts and a one-byte storage change refuses C1 before starting', async () => {
  const file = './buffers/v06/tables/table/data/l01-rc-b00.arrow';
  const listing = byte => `@@stat\n${file}|1|644|20000|20000\n@@sha\n${sha256(byte)}  ${file}\n@@end\n`;
  const expected = parseListing(listing('a'));
  for (const value of ['a', 'b']) {
    let started = false;
    const observed = parseListing(listing(value));
    const { clone } = load(section('lab/bin/engine.mjs', 'async function clone(config, info, opts)', '/** C2-C8 on a cloned slot'), ['clone'], {
      requireHeldXtdbSlot: () => {},
      loadGolden: () => ({ record: { volume: 'golden-fixture', key: 'key', keyInputs: { engine: { systemConfigSha256: sha256('{}'), imageId: 'pinned-image' } }, manifest: {}, copy: { treeSha256: expected.treeSha256, files: 1, filesFile: 'files.json' }, freeze: {} }, recordFile: 'golden.json' }),
      effectiveConfig: () => ({ effective: {} }), systemConfig: () => ({}), sha256, canonicalJson: canonical,
      containersOnVolume: () => [], volumeBytes: () => 1, hostDisk: () => ({ freeBytes: 30 * 1024 ** 3 }), diskFloorVerdict: () => ({ ok: true }),
      Date, path, REPO: root, randomUUID: () => 'copy-fixture', XTDB_UID: '20000:20000',
      up: async (_config, _info, _opts, hooks) => { await hooks.prepareVolume(); started = true; throw new Error('sentinel: successful pre-start C1'); },
      docker: () => '', helper: () => listing(value), listingScript: () => '', parseListing, diffListings,
      readJson: () => expected.files,
      fail: (_code, message) => { throw new Error(message); },
    });
    let error;
    try { await clone({}, { slot: 's1', laneConf: { imageId: 'pinned-image' }, volume: 'destination-fixture' }, { 'golden-record': 'golden.json' }); } catch (caught) { error = caught.message; }
    record(`copy-byte-${value}`, { expectedHash: expected.treeSha256, observedHash: observed.treeSha256, started, error });
    assert.equal(started, value === 'a');
    assert.match(error, value === 'a' ? /successful pre-start C1/ : /C1 failed/);
  }
});

test('verify: sampled content, layout, history, and position changes each refuse', () => {
  const freeze = { c3: { tx: 100 }, c4: { position: 42 }, c5: { count: 10 }, c6: { sha256: 'layout', liveTables: { rows: [] } }, c7: { jobsAvailable: 0 }, c8: { resultSha256: 'results', plan: { sha256: 'plan' } } };
  for (const [name, mutate] of [
    ['C3', value => { value.c3.tx++; }], ['C4', value => { value.c4.position++; }],
    ['C5', value => { value.c5.count--; }], ['C6', value => { value.c6.sha256 = 'different'; }],
    ['C8', value => { value.c8.resultSha256 = 'different'; }],
  ]) {
    const observed = structuredClone(freeze); observed.c7.polls = [0, 0, 0]; mutate(observed);
    assert.equal(compareFreeze(freeze, observed, { result: { lastPosition: 42 } })[name].pass, false);
  }
  record('sampled-differences', { allRefused: true, subjectsAt500: chooseSamples(500, 20) });
});

test('F1: an exceptional re-verification must revoke the previous PASS before the driver can consume it', async () => {
  const manifestFile = path.join(import.meta.dirname, 'evidence/fixture-manifest.json');
  const ownerFile = path.join(import.meta.dirname, 'evidence/fixture-owner.json');
  fs.writeFileSync(manifestFile, '{}');
  const content = { kind: 'clone', goldenVolume: 'tx2-golden-xtdb-12345678', goldenRecord: 'golden.json', manifestSha256: (await import('node:crypto')).createHash('sha256').update('{}').digest('hex'), readiness: { verdict: 'PASS' } };
  let owner = { volumeContent: content };
  const { verify } = load(section('lab/bin/engine.mjs', 'async function verify(config, info, opts)', '/** List a stopped slot'), ['verify'], {
    requireHeldXtdbSlot: () => {}, readOwner: () => structuredClone(owner), requireRunningSlot: () => {},
    loadGolden: () => ({ recordFile: 'golden.json' }), REPO: root, path, Date, now: () => new Date().toISOString(),
    cloneCheck: () => { throw new Error('start-check query failed: connection closed'); },
    cloneCertificateHash,
    updateOwner: async (_info, update) => { const next = update(structuredClone(owner)); if (next !== undefined) owner = structuredClone(next); return structuredClone(owner); },
    atomicJson: (_file, value) => { owner = structuredClone(value); },
    writeJson: () => {}, process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
  });
  await assert.rejects(verify({}, { ownerFile, slot: 's1' }, {}), /connection closed/);
  fs.writeFileSync(ownerFile, JSON.stringify(owner));
  let driverAccepted = false;
  try { driverAccepted = seedPathOf({ format: 'tx2-xtdb-seed/1', lane: 'xtdb', scope: 's' }, manifestFile, ownerFile).seededBy === 'clone'; } catch {}
  record('exceptional-reverify', { owner, driverAccepted });
  fs.unlinkSync(manifestFile);
  fs.unlinkSync(ownerFile);
  assert.equal(driverAccepted, false, 'failed verification left a consumable PASS');
});

test('F2: the live runner must stop after T1 returns an unclean-stop verdict even with process exit 0', async () => {
  const commands = [], writes = {};
  const runner = sources['lab/experiments/EXP-K01-seed-clone/round2-live.mjs'];
  const code = runner.slice(runner.indexOf('const root ='));
  const context = {
    fs: { mkdirSync: () => {}, statfsSync: () => ({ bavail: 30, bsize: 1024 ** 3 }), writeFileSync: (name, value) => { writes[name] = value; }, existsSync: () => false },
    path, Date, POOL_FILE: () => 'pool.json', readJson: () => ({}),
    process: { cwd: () => root, env: {}, execPath: process.execPath, stderr: { write: () => {} } },
    spawnSync: (_exec, args) => {
      const command = args[1]; commands.push(command);
      if (command === 'up' && commands.filter(c => c === 'up').length > 1) throw new Error('sentinel: entered next stage after failed T1');
      return { status: 0, stdout: JSON.stringify({ verdict: { ok: false, reasons: ['no Node stopped.'] } }), stderr: '' };
    },
  };
  let error;
  try { await vm.runInNewContext(`(async () => {${code}\n})()`, context); } catch (caught) { error = caught.message; }
  record('runner-unclean-T1', { commands, error, retainedResults: Object.keys(writes).filter(name => name.endsWith('.result.json')) });
  assert.equal(commands.filter(c => c === 'up').length, 1, 'T1 refusal was ignored and T1-up was entered');
});

after(() => {
  fs.writeFileSync(path.join(import.meta.dirname, 'evidence/cases.json'), JSON.stringify({
    format: 'tx2-k01-offline-review/1', sourceHead: '05a23dd90fde0d7c1df5f8ecff2ef417fa436e20',
    sourceSha256: Object.fromEntries(Object.entries(sources).map(([file, source]) => [file, sha256(source)])),
    note: 'Source functions run in a VM with injected I/O and virtual time; no Docker or engine execution.', observations,
  }, null, 2) + '\n');
});
