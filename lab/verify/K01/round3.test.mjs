// [EXP-K01-R3] Why: exercise the actual failure/publication paths beyond the review's first counterexample. Rejected: testing a parallel readiness implementation (would not prove production revocation).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { canonical, digest, blockTrieCoverage, compareFreeze, cloneCertificateHash } from '../../bench/lib/clone.ts';
const root = path.resolve(import.meta.dirname, '../../..');
const engine = fs.readFileSync(path.join(root, 'lab/bin/engine.mjs'), 'utf8');
const checker = fs.readFileSync(path.join(root, 'lab/bench/clone-check.ts'), 'utf8');
const section = (text, start, end) => {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a);
  return text.slice(a, b);
};
const verifySource = section(engine, 'async function verify(config, info, opts)', '/** List a stopped slot');
async function reverify(variation) {
  let owner = { volumeContent: { kind: 'clone', key: 'key', containerId: 'container', startedAt: 'old-start', goldenRecord: 'golden.json', goldenRecordSha256: 'golden-hash', manifestSha256: 'manifest', readiness: { verdict: 'PASS', file: 'old.json', sha256: 'old-hash' } } };
  const writes = [], checks = [], receipts = new Map();
  let runningCalls = 0;
  const context = {
    cloneCertificateHash,
    updateOwner: async (info, update) => { const next = update(context.readOwner()); if (next !== undefined) context.atomicJson(info.ownerFile, next); return next ?? context.readOwner(); },
    path, REPO: root, Date, now: () => new Date().toISOString(),
    requireHeldXtdbSlot: () => {}, readOwner: () => structuredClone(owner),
    requireRunningSlot: () => {
      runningCalls++;
      checks.push(owner.volumeContent.readiness.verdict);
      if (variation === 'config') throw new Error('config refused');
      return { c: { Id: 'container', State: { StartedAt: variation === 'restart' && runningCalls > 1 ? 'another-start' : 'new-start' } } };
    },
    loadGolden: () => { if (variation === 'golden') throw new Error('golden refused'); return { recordFile: 'golden.json' }; },
    cloneCheck: () => {
      if (variation === 'query') throw new Error('query failed');
      if (variation === 'superseded') owner.volumeContent.readiness = { verdict: 'PASS', attemptId: 'newer-attempt' };
      if (variation === 'identity') owner.volumeContent.key = 'other-key';
      if (variation === 'incomplete') return { verdict: 'PASS', checks: {} };
      return { verdict: variation === 'semantic-fail' ? 'FAIL' : 'PASS', checks: Object.fromEntries(Array.from({ length: 8 }, (_, n) => [`C${n + 1}`, { pass: !(variation === 'semantic-fail' && n === 2) }])) };
    },
    writeJson: (file, value) => {
      if (variation === 'pending-receipt' && value.verdict === 'PENDING') throw new Error('pending receipt write failed');
      if (variation === 'result-receipt' && value.verdict === 'PASS') throw new Error('result receipt write failed');
      receipts.set(file, structuredClone(value));
    },
    sha256File: file => {
      if (file === 'golden.json') return variation === 'golden-changed' ? 'different-hash' : 'golden-hash';
      if (variation === 'receipt-hash') throw new Error('receipt hash failed');
      assert.ok(receipts.has(file));
      return `hash-${receipts.get(file).verdict}`;
    },
    atomicJson: (_file, value) => {
      if (variation === 'pending-owner' && value.volumeContent.readiness.verdict === 'PENDING') throw new Error('PENDING owner write failed');
      if (variation === 'publish-owner' && value.volumeContent.readiness.verdict === 'PASS') throw new Error('PASS owner write failed');
      owner = structuredClone(value); writes.push(owner.volumeContent.readiness.verdict);
    },
    process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
    fail: (_code, message) => { throw new Error(message); },
  };
  const { verify } = vm.runInNewContext(verifySource + ';({verify})', context);
  let error;
  try { await verify({}, { slot: 's1', ownerFile: 'owner.json', container: 'container' }, {}); }
  catch (caught) { error = caught.message; }
  return { owner, writes, checks, receipts: [...receipts.values()], error };
}
for (const variation of ['config', 'golden', 'query', 'pending-owner', 'pending-receipt', 'result-receipt', 'receipt-hash', 'publish-owner', 'restart', 'golden-changed', 'identity', 'incomplete']) {
  test(`R3: ${variation} failure revokes the historical PASS durably`, async () => {
    const result = await reverify(variation);
    assert.ok(result.error);
    assert.equal(result.writes[0], variation === 'pending-owner' ? 'ERROR' : 'PENDING');
    assert.equal(result.owner.volumeContent.readiness.verdict, 'ERROR');
    assert.equal(result.owner.volumeContent.verificationHistory[0].file, 'old.json');
    assert.ok(result.checks.every(v => v === 'PENDING'));
    assert.equal(result.owner.volumeContent.readiness.sha256 === 'old-hash', false);
    if (variation !== 'pending-receipt') assert.ok(result.receipts.some(r => r.verdict === 'ERROR'));
  });
}
test('R3: PASS is published only with a durable new receipt and fresh start binding', async () => {
  const result = await reverify('success');
  assert.equal(result.error, undefined);
  assert.deepEqual(result.writes, ['PENDING', 'PASS']);
  assert.equal(result.owner.volumeContent.startedAt, 'new-start');
  assert.equal(result.owner.volumeContent.readiness.sha256, 'hash-PASS');
});
test('R3: a semantic FAIL keeps its full failed-check receipt', async () => {
  const result = await reverify('semantic-fail');
  assert.ok(result.error);
  assert.equal(result.owner.volumeContent.readiness.verdict, 'FAIL');
  assert.equal(result.receipts.at(-1).checks.C3.pass, false);
});
test('R3: an older attempt cannot overwrite a newer verification', async () => {
  const result = await reverify('superseded');
  assert.match(result.error, /superseded/);
  assert.equal(result.owner.volumeContent.readiness.attemptId, 'newer-attempt');
});
for (const variation of ['false', 'unreadable', 'clean']) {
  test(`R3: standalone T1 handles ${variation} semantic stop proof`, async () => {
    const source = fs.readFileSync(path.join(root, 'lab/experiments/EXP-K01-seed-clone/round2-t1.mjs'), 'utf8');
    const commands = [], writes = {};
    let error;
    try {
      vm.runInNewContext(source.slice(source.indexOf('const base =')), {
        fs: { writeFileSync: (file, value) => { writes[file] = value; } }, POOL_FILE: () => 'pool', readJson: () => ({}),
        process: { cwd: () => root, env: {}, execPath: 'node' },
        spawnSync: (_exec, args) => { commands.push(args[1]); return { status: 0, stdout: variation === 'unreadable' ? 'bad' : JSON.stringify({ verdict: { ok: variation === 'clean' } }), stderr: '' }; },
      });
    } catch (caught) { error = caught.message; }
    assert.deepEqual(commands, variation === 'clean' ? ['up', 'stop', 'logs', 'down', 'status'] : ['up', 'stop', 'down', 'status']);
    assert.equal(!!error, variation !== 'clean');
    const stop = JSON.parse(Object.entries(writes).find(([file]) => file.endsWith('T1-stop.result.json'))[1]);
    assert.equal(!!stop.semanticFailure, variation !== 'clean');
  });
}
test('R3: a current source gauge cannot hide behind an earlier startup log watermark', async () => {
  const expected = { gauges: { latestProcessedMsgId: 200, latestCompletedTxId: 100 }, trie: { sha256: 'trie' }, listing: ['00', '01'] };
  const { startCheck } = vm.runInNewContext(stripTypeScriptTypes(section(checker, 'async function startCheck', '// ---------------------------------------------------------------- fingerprint')) + ';({startCheck})', {
    Number, canonical, container: 'fixture', DOCKER_HOST: 'offline', sleep: async () => {}, healthz: () => ({ status: 200 }),
    gauges: async () => ({ jobsAvailable: 0, lagMsgId: 0, latestCompletedTxId: 100, latestProcessedMsgId: 201, latestSubmittedMsgId: 201 }),
    liveRows: async () => ({ total: 0 }), tries: async () => expected.trie, blockListing: () => expected.listing,
    spawnSync: (_command, args) => ({ status: 0, stdout: args.includes('inspect') ? '2000-01-01T00:00:00Z' : 'resuming after 200', stderr: '' }),
  });
  assert.equal((await startCheck(expected)).ok, false);
});
test('R3: golden end readings refuse drift after the initial reference check', () => {
  const condition = section(engine, '    if (!freeze.ok || freeze.c4', '    const goldenBytes =');
  const gauges = { jobsAvailable: 0, lagMsgId: 0, latestCompletedTxId: 100, latestProcessedMsgId: 200, latestSubmittedMsgId: 200 };
  for (const key of Object.keys(gauges)) {
    const end = { live: { total: 0 }, snapshot: { gauges: { ...gauges, [key]: gauges[key] + 1 }, trie: { sha256: 'trie' }, listing: ['00'] } };
    assert.throws(() => vm.runInNewContext(condition, {
      freeze: { ok: true, c4: { position: 42 } }, manifest: { result: { lastPosition: 42 } }, referenceStop: { verdict: { ok: true } }, timings: { freezeS: 5 }, end,
      settled: { after: { gauges, trie: { sha256: 'trie' }, listing: ['00'] } }, canonicalJson: canonical,
      fail: (_code, message) => { throw new Error(message); },
    }), /reference fingerprint/);
  }
});
test('R3: T6 cannot call a missing fingerprint a changed plan', () => {
  const code = section(engine, "    const args = ['--url', info.endpoint", '\n  } catch (error)');
  for (const stage of ['before', 'after']) {
    const attempt = {}, calls = [];
    assert.throws(() => vm.runInNewContext(code, {
      info: {}, opts: { manifest: 'manifest.json' }, path, attempt,
      save: value => Object.assign(attempt, value),
      cloneCheck: ([mode]) => { calls.push(mode); return mode === 'freeze' && ((stage === 'before' && calls.length === 1) || (stage === 'after' && calls.length === 3)) ? { ok: false } : { ok: true, c8: { plan: { sha256: 'plan' } } }; },
      fail: (_code, message) => { throw new Error(message); },
    }), /fingerprint is incomplete/);
    assert.equal(attempt.t6PlanChanged, undefined);
    if (stage === 'before') assert.deepEqual(calls, ['freeze']);
  }
});

test('R3: invalid or changed current completed-tx gauges refuse on the first poll', async () => {
  for (const current of [null, NaN, Infinity, 100.5, 99, 101]) {
    let snapshots = 0, clock = 0;
    const baseGauges = { jobsAvailable: 0, latestCompletedTxId: 100, latestProcessedMsgId: 200, latestSubmittedMsgId: 200, lagMsgId: 0, lastUploadTime: 1 };
    const rows = ['tx_assertions', 'tx_attempts', 'tx_claims', 'tx_meta', 'txs'].map(table => [table, 'l01-rc-b00', 1, 'live', 100, 10]);
    const { settle } = vm.runInNewContext(stripTypeScriptTypes(section(checker, 'const blockNumber =', 'async function startCheck')) + ';({settle})', {
      Number, digest, blockTrieCoverage, num: v => v == null ? null : Number(v), log: () => {},
      Date: { now: () => clock }, sleep: async ms => { clock += ms; }, opt: (_name, fallback) => fallback, healthz: () => ({ status: 200 }),
      snapshot: async () => ++snapshots === 1 ? { listing: [], blocks: [], gauges: baseGauges, trie: { rows: [], sha256: digest([]) } } : {
        listing: ['00'], blocks: [{ block_idx: '00', tx_id: 100, latest_processed_msg_id: 201 }],
        gauges: { ...baseGauges, latestCompletedTxId: current, latestProcessedMsgId: 201, latestSubmittedMsgId: 201, lastUploadTime: 2 }, trie: { rows, sha256: digest(rows) },
      },
    });
    const result = await settle();
    assert.equal(result.settled, false);
    assert.match(result.reason, /current completed transaction/);
    assert.equal(snapshots, 2);
  }
});
test('R3: clone verification uses fresh post-fingerprint gauges and a final start check', async () => {
  const freeze = { c3: { tx: 100 }, c4: { position: 42 }, c5: { n: 10 }, c6: { sha256: 'layout', liveTables: { rows: [] } }, c7: { jobsAvailable: 0 }, c8: { resultSha256: 'results', plan: { sha256: 'plan' } } };
  for (const variation of ['clean', 'busy', 'end-changed']) {
    let gaugeCalls = 0, startCalls = 0;
    const record = { key:'key', copy:{treeSha256:'a'.repeat(64)}, manifest: { path: 'manifest.json' }, volume: 'golden', settle: { after: {} }, freeze };
    const { verify } = vm.runInNewContext(stripTypeScriptTypes(section(checker, 'async function verify()', '\ntry {\n  if (mode')) + ';({verify})', {
      path, REPO: root, url: 'offline', container: 'fixture', Date, compareFreeze,
      opt: name => name === 'golden-record' ? 'golden.json' : name === 'owner' ? 'owner.json' : undefined,
      readJson: file => file.includes('manifest') ? { result: { lastPosition: 42 } } : file.includes('owner') ? { volumeContent: { kind:'clone', key:'key', goldenVolume: 'golden', copy: { creationId:'copy', treeSha256:'a'.repeat(64), c1: { pass: true, expected:'a'.repeat(64), observed:'a'.repeat(64) } } } } : record,
      healthz: () => ({ status: 200 }), sleep: async () => {},
      fingerprint: async () => ({ ...structuredClone(freeze), ok: true, errors: [], timingsMs: {} }),
      gauges: async () => ({ jobsAvailable: variation === 'busy' && ++gaugeCalls === 1 ? 1 : 0 }),
      startCheck: async () => ({ ok: !(variation === 'end-changed' && ++startCalls === 2) }),
    });
    const result = await verify();
    assert.equal(result.checks.C7.pass, variation !== 'busy');
    assert.equal(result.checks.C2.pass, variation !== 'end-changed');
    assert.equal(result.verdict, variation === 'clean' ? 'PASS' : 'FAIL');
  }
});
