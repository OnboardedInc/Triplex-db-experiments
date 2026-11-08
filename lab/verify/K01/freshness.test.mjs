// [EXP-K01-VK01-R2] Why: vary where an older proof is replaced by current evidence, including the publication boundary. Rejected: stopping at the three original counterexamples (misses the same pattern elsewhere).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { canonical, digest, blockTrieCoverage, cloneCertificateHash } from '../../bench/lib/clone.ts';
import { verifyMaintenanceTail } from '../../bin/xtdb-log.mjs';
import { maintenanceFixture } from './tail-fixtures.mjs';
import { seedPathOf } from '../../bench/lib/bulk.ts';

const { stopVerdict } = await import('../../bin/engine.mjs');

const root = path.resolve(import.meta.dirname, '../../..');
const engine = fs.readFileSync(path.join(root, 'lab/bin/engine.mjs'), 'utf8');
const checker = fs.readFileSync(path.join(root, 'lab/bench/clone-check.ts'), 'utf8');
const runner = fs.readFileSync(path.join(root, 'lab/experiments/EXP-K01-seed-clone/round2-live.mjs'), 'utf8');
const results = [];
const record = (name, value) => results.push({ name, observed: JSON.parse(JSON.stringify(value)) });
function section(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a);
  return source.slice(a, b);
}
const load = (source, name, context) => vm.runInNewContext(stripTypeScriptTypes(source) + `;({${name}})`, context)[name];

async function reverify(variation) {
  let owner = { holder: 'review-fixture', volumeContent: {
    kind: 'clone', containerId: 'container', startedAt: 'start', key: 'key', manifestSha256: createHash('sha256').update('{}').digest('hex'),
    goldenVolume: 'golden', goldenRecord: 'golden.json', goldenRecordSha256: 'golden-hash',
    copy: { treeSha256: 'tree', c1: { pass: true, expected: 'tree', observed: 'tree' } },
    readiness: { verdict: 'PASS', attemptId: 'historical', file: 'old.json' },
  } };
  const receipts = {}, events = [];
  let reads = 0, updates = 0;
  const newer = () => { owner.volumeContent.readiness = { verdict: 'ERROR', attemptId: 'newer', file: 'newer.json', error: 'newer verification failed' }; };
  const verify = load(section(engine, 'async function verify(config, info, opts)', '/** List a stopped slot'), 'verify', {
    cloneCertificateHash,
    updateOwner: async (_info, update) => {
      const preimage = JSON.stringify(owner), current = structuredClone(owner);
      if (variation === 'late-newer' && ++updates === 2) { newer(); events.push('newer ERROR published after final read'); }
      const next = update(current);
      if (JSON.stringify(owner) !== preimage) throw new Error('conditional owner update conflicted');
      if (next !== undefined) { owner = structuredClone(next); events.push(`owner ${owner.volumeContent.readiness.verdict}`); }
      return structuredClone(owner);
    },
    Date, Math, path, REPO: root, now: () => new Date().toISOString(),
    requireHeldXtdbSlot: () => {},
    readOwner: () => {
      reads++;
      const observed = structuredClone(owner);
      return observed;
    },
    atomicJson: (_file, value) => { owner = structuredClone(value); events.push(`owner ${owner.volumeContent.readiness.verdict}`); },
    writeJson: (file, value) => { receipts[file] = structuredClone(value); },
    requireRunningSlot: () => ({ c: { Id: 'container', State: { StartedAt: 'start' } } }),
    loadGolden: () => ({ recordFile: 'golden.json' }),
    sha256File: file => file === 'golden.json' ? 'golden-hash' : digest(receipts[file]),
    cloneCheck: () => {
      if (variation === 'query-error') throw new Error('current query failed');
      if (variation === 'early-newer') newer();
      if (variation === 'current-copy-failed') owner.volumeContent.copy.c1.pass = false;
      if (variation === 'current-golden-changed') owner.volumeContent.goldenVolume = 'another-golden';
      return { format: 'tx2-clone-readiness/1', verdict: 'PASS', container: 'container', checks: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`C${i + 1}`, { pass: true }])) };
    },
    process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
    fail: (_code, message) => { throw new Error(message); },
  });
  let error;
  try { await verify({}, { slot: 's1', container: 'container', ownerFile: 'owner.json' }, {}); }
  catch (caught) { error = caught.message; }
  return { owner, receipts, events, reads, error };
}

test('control: fresh evidence publishes PASS and query exceptions revoke it', async () => {
  const clean = await reverify('clean'), error = await reverify('query-error');
  record('fresh-and-query-error', { clean, error });
  assert.equal(clean.owner.volumeContent.readiness.verdict, 'PASS');
  assert.equal(error.owner.volumeContent.readiness.verdict, 'ERROR');
});

test('control: a newer failure visible before the final owner read is preserved', async () => {
  const result = await reverify('early-newer');
  record('early-newer', result);
  assert.equal(result.owner.volumeContent.readiness.attemptId, 'newer');
  assert.equal(result.owner.volumeContent.readiness.verdict, 'ERROR');
});

test('R2-F2: a newer failure after the final owner read must not be replaced by an older PASS', async () => {
  const result = await reverify('late-newer');
  record('late-newer', result);
  assert.equal(result.owner.volumeContent.readiness.attemptId, 'newer', 'the earlier read overwrote the newer failed attempt');
  assert.equal(result.owner.volumeContent.readiness.verdict, 'ERROR');
});

for (const variation of ['current-copy-failed', 'current-golden-changed']) {
  test(`R2-F3: current clone binding must override earlier C1 evidence (${variation})`, async () => {
    const result = await reverify(variation);
    const tmp = path.join(import.meta.dirname, 'tmp');
    fs.mkdirSync(tmp, { recursive: true });
    const dir = fs.mkdtempSync(path.join(tmp, 'binding-'));
    let driverAccepted = false;
    try {
      fs.writeFileSync(path.join(dir, 'manifest.json'), '{}');
      fs.writeFileSync(path.join(dir, 'owner.json'), JSON.stringify(result.owner));
      try { driverAccepted = seedPathOf({ format: 'tx2-xtdb-seed/1', lane: 'xtdb', scope: 'fixture' }, path.join(dir, 'manifest.json'), path.join(dir, 'owner.json')).seededBy === 'clone'; } catch {}
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    result.driverAccepted = driverAccepted;
    record(variation, result);
    assert.notEqual(result.owner.volumeContent.readiness.verdict, 'PASS', 'the earlier copy proof was published against different current owner content');
  });
}

for (const stale of ['published-record', 'unpublished-attempt', 'none']) {
  test(`${stale === 'none' ? 'control' : 'R2-F1'}: blocked admission cannot clean up a prior run's golden (${stale})`, async () => {
    const commands = [], writes = {};
    let error;
    try {
      await vm.runInNewContext(`(async () => {${runner.slice(runner.indexOf('const root ='))}\n})()`, {
        Date, path,
        process: { cwd: () => root, execPath: 'node', env: { TX2_K01_ATTEMPT: 'earlier-run' }, stderr: { write: () => {} } },
        POOL_FILE: () => 'pool.json', readJson: () => ({ retainedVolumes: [{ volume: 'tx2-xtdb-s1-data', holder: 'another-owner', note: 'retain' }] }),
        fs: {
          mkdirSync: () => {}, statfsSync: () => ({ bavail: 30, bsize: 1024 ** 3 }),
          writeFileSync: (file, value) => { writes[file] = value; },
          existsSync: file => stale === 'published-record' ? file.endsWith('/golden.json') : stale === 'unpublished-attempt' && file.endsWith('-golden'),
          readdirSync: () => ['golden-attempt-100.json'],
          readFileSync: () => JSON.stringify({ at: '2000-01-01T00:00:00Z', volume: 'tx2-golden-xtdb-12345678', copy: { source: 'historical' } }),
        },
        spawnSync: (_command, args) => { commands.push(args); return { status: 0, stdout: '{}', stderr: '' }; },
      });
    } catch (caught) { error = caught.message; }
    record(`cleanup-${stale}`, { commands, error, filesWritten: Object.keys(writes) });
    assert.match(error, /retains another-owner/);
    assert.equal(commands.filter(args => args[1] === 'golden-rm').length, 0, 'no golden belongs to this blocked invocation');
    assert.equal(commands.filter(args => args[1] === 'up' || args[1] === 'down').length, 0);
  });
}

for (const failed of ['none', 'inspect', 'logs']) {
  test(`${failed === 'none' ? 'control' : 'R2-F4'}: startup proof rejects a failed current ${failed} command`, async () => {
    const expected = { gauges: { latestCompletedTxId: 100, latestProcessedMsgId: 200 }, trie: { sha256: 'trie' }, listing: ['00', '01'] };
    const startCheck = load(section(checker, 'async function startCheck', '// ---------------------------------------------------------------- fingerprint'), 'startCheck', {
      Number, canonical, container: 'fixture', DOCKER_HOST: 'offline', sleep: async () => {}, healthz: () => ({ status: 200 }),
      gauges: async () => ({ jobsAvailable: 0, lagMsgId: 0, latestCompletedTxId: 100, latestProcessedMsgId: 200, latestSubmittedMsgId: 200 }),
      liveRows: async () => ({ total: 0 }), tries: async () => expected.trie, blockListing: () => expected.listing,
      spawnSync: (_command, args) => {
        const name = args.includes('inspect') ? 'inspect' : 'logs';
        return { status: failed === name ? 1 : 0, stdout: name === 'inspect' ? '2000-01-01T00:00:00Z' : 'leader startup complete, resuming after 200', stderr: failed === name ? 'current evidence read failed' : '' };
      },
    });
    const result = await startCheck(expected);
    record(`startup-command-${failed}`, result);
    assert.equal(result.ok, failed === 'none', 'failed current command output was accepted as complete proof');
  });
}

for (const failed of [false, true]) {
  test(`${failed ? 'R2-F4' : 'control'}: clean-stop proof rejects a failed current log command (${failed})`, async () => {
    let inspections = 0;
    const stopSlot = load(section(engine, 'async function stopSlot(config, info, opts)', '/**\n * Golden'), 'stopSlot', {
      Date, readOwner: () => ({ holder: 'fixture' }), requireHeldXtdbSlot: () => {},
      inspect: () => ({ Id: 'container', Config: { Labels: { 'tx2.managed-by': 'lab/bin/engine.mjs' } }, State: { Running: ++inspections === 1, ExitCode: 143, StartedAt: '2000-01-01T00:00:00Z', FinishedAt: '2000-01-01T00:00:01Z' } }),
      docker: () => '', dockerArgs: args => args,
      spawnSync: () => ({ status: failed ? 1 : 0, stdout: 'Stopping node...\nNode stopped.\n', stderr: failed ? 'log stream failed' : '' }),
      stopVerdict,
      withPool: async action => action({ reservations: [] }), appendEvent: () => {}, now: () => 'now',
      process: { stdout: { write: () => {} } }, fail: (_code, message) => { throw new Error(message); },
    });
    const result = await stopSlot({}, { container: 'container' }, { print: false });
    record(`stop-log-command-${failed}`, result);
    assert.equal(result.verdict.ok, !failed, 'a failed current log read must not certify stop proof');
  });
}

test('Q83e watermark control: maintenance-only stopped bytes qualify the later M', async () => {
  let now = 0, n = 0;
  const tables = ['tx_assertions', 'tx_attempts', 'tx_claims', 'tx_meta', 'txs'];
  const rows = tables.map(table => [table, 'l01-rc-b00', 1, 'live', 1000, 10]);
  const fixture = maintenanceFixture();
  const baseline = { jobsAvailable: 0, latestCompletedTxId: 100, latestProcessedMsgId: 200, latestSubmittedMsgId: 200, lagMsgId: 0, lastUploadTime: 1 };
  const settle = load(section(checker, 'const blockNumber =', 'async function startCheck'), 'settle', {
    Number, digest, blockTrieCoverage, num: value => value == null ? null : Number(value), Date: { now: () => now },
    log: () => {}, opt: (key, fallback) => key === 'cuts' ? '1' : fallback, sleep: async ms => { now += ms; }, healthz: () => ({ status: 200 }),
    snapshot: async () => ++n === 1 ? { listing: [], blocks: [], gauges: baseline, trie: { rows: [], sha256: digest([]) } } : {
      listing: ['00'], blocks: [{ block_idx: '00', tx_id: 100, latest_processed_msg_id: 201 }],
      gauges: { ...baseline, latestProcessedMsgId: fixture.frontiers.M, latestSubmittedMsgId: fixture.frontiers.M, lastUploadTime: 2 }, trie: { rows, sha256: digest(rows) },
    },
  });
  const result = await settle();
  record('watermark-maintenance', result);
  assert.equal(result.settled, true);
  assert.equal(result.qualified, false);
  assert.equal(verifyMaintenanceTail(fixture.bytes, result.frontiers).ok, true);
  assert.throws(() => verifyMaintenanceTail(maintenanceFixture(true).bytes, result.frontiers), /non-maintenance Tx/);
});

after(() => {
  fs.mkdirSync(path.join(import.meta.dirname, 'evidence/review-round2'), { recursive: true });
  fs.writeFileSync(path.join(import.meta.dirname, 'evidence/review-round2/freshness-cases.json'), JSON.stringify({ offlineOnly: true, mechanism: 'Actual reviewed function bodies with injected I/O and deterministic interleavings; no engine, Docker or service calls.', results }, null, 2) + '\n');
});
