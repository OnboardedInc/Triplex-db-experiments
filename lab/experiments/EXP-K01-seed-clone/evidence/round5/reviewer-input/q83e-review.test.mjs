// [EXP-K01-VK01-R3] Why: compare stopped-tail acceptance with the pinned message schema and real owner transitions. Rejected: reusing only the builder's binary fixtures (their cut anchor uses the wrong protobuf field).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { sourceMessageKind, verifyMaintenanceTail } from '../../bin/xtdb-log.mjs';
import { updateOwner, ownerStateLock } from '../../bin/owner-state.mjs';
import { canonical, compareFreeze, digest, blockTrieCoverage, cloneCertificateHash } from '../../bench/lib/clone.ts';
import { seedPathOf } from '../../bench/lib/bulk.ts';

const root = path.resolve(import.meta.dirname, '../../..');
const engine = fs.readFileSync(path.join(root, 'lab/bin/engine.mjs'), 'utf8');
const checker = fs.readFileSync(path.join(root, 'lab/bench/clone-check.ts'), 'utf8');
const results = [];
const record = (name, value) => results.push({ name, observed: JSON.parse(JSON.stringify(value)) });
function section(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a);
  return source.slice(a, b);
}
const load = (source, name, context) => vm.runInNewContext(stripTypeScriptTypes(source) + `;({${name}})`, context)[name];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const v = value => {
  let n = BigInt.asUintN(64, BigInt(value)); const bytes = [];
  do { const b = Number(n & 127n); n >>= 7n; bytes.push(b | (n ? 128 : 0)); } while (n);
  return Buffer.from(bytes);
};
const integer = (number, value) => Buffer.concat([v(number * 8), v(value)]);
const bytesField = (number, bytes) => Buffer.concat([v(number * 8 + 2), v(bytes.length), bytes]);
const source = (type, body = Buffer.alloc(0)) => Buffer.concat([Buffer.from([3]), bytesField(type, body)]);
// [EXP-K01-VK01-R3] Why: log.proto declares expected_block_idx as field 2; field 1 is unknown to XTDB's cut decoder. Rejected: the copied [3,10,2,8,0] fixture (decodes to no expected block index).
const cut = source(1, integer(2, 0));
const maintenance = source(2, Buffer.concat([integer(2, 6), integer(3, 0)]));
const application = {
  Tx: source(6, Buffer.concat([bytesField(1, Buffer.from([1])), bytesField(3, Buffer.from('UTC'))])),
  LegacyTx: Buffer.from([255, 1]),
  AttachDatabase: source(3, Buffer.concat([bytesField(1, Buffer.from('tenant')), bytesField(2, Buffer.concat([bytesField(1, Buffer.alloc(0)), bytesField(4, Buffer.alloc(0)), integer(7, 0), integer(10, 1)]))])),
  DetachDatabase: source(4, bytesField(1, Buffer.from('tenant'))),
};
function tail(messages, F = 201, T = 100) {
  let offset = F % (2 ** 48), M = F;
  const frames = messages.map(payload => {
    const frame = Buffer.alloc(21 + payload.length);
    frame[0] = 30; frame.writeInt32BE(payload.length, 1); frame.writeBigInt64BE(0n, 5);
    payload.copy(frame, 13); frame.writeBigInt64BE(BigInt(offset), frame.length - 8);
    M = Math.floor(F / (2 ** 48)) * (2 ** 48) + offset;
    offset += frame.length;
    return frame;
  });
  return { bytes: Buffer.concat(frames), frontiers: { F, M, T } };
}

test('Q83e: schema-derived maintenance and cut encodings qualify distinct F/M/T', () => {
  const fixture = tail([cut, maintenance, maintenance]);
  const proof = verifyMaintenanceTail(fixture.bytes, fixture.frontiers);
  record('valid-tail', { cutHex: cut.toString('hex'), maintenanceHex: maintenance.toString('hex'), proof });
  assert.equal(proof.ok, true);
  assert.equal(proof.maintenanceMessages, 2);
  assert.notEqual(proof.frontiers.T, proof.frontiers.M);
});

for (const [name, payload] of Object.entries(application)) for (let position = 0; position < 5; position++) {
  test(`Q83e: ${name} at interval position ${position + 1}/5 refuses with unchanged observed T`, () => {
    const messages = Array.from({ length: 5 }, () => maintenance); messages[position] = payload;
    const fixture = tail([cut, ...messages]);
    let error;
    try { verifyMaintenanceTail(fixture.bytes, fixture.frontiers); } catch (caught) { error = caught.message; }
    record(`${name}-${position}`, { frontiers: fixture.frontiers, payloadHex: payload.toString('hex'), error });
    assert.match(error, /non-maintenance/);
  });
}

for (const order of ['tx-first', 'tx-last']) test(`Q83e: ambiguous protobuf oneof refuses (${order})`, () => {
  const body = order === 'tx-first' ? Buffer.concat([application.Tx.subarray(1), maintenance.subarray(1)]) : Buffer.concat([maintenance.subarray(1), application.Tx.subarray(1)]);
  const fixture = tail([cut, Buffer.concat([Buffer.from([3]), body])]);
  assert.throws(() => verifyMaintenanceTail(fixture.bytes, fixture.frontiers), /ambiguous/);
});

for (const [name, anchor] of [
  ['empty-body', source(1)], ['unknown-field-1', source(1, integer(1, 0))],
  ['wrong-wire-for-field-2', source(1, bytesField(2, Buffer.alloc(0)))],
]) test(`R3-F1: a FlushBlock that XTDB decodes to null is not a cut anchor (${name})`, () => {
  const fixture = tail([anchor, maintenance]);
  let proof, error;
  try { proof = verifyMaintenanceTail(fixture.bytes, fixture.frontiers); } catch (caught) { error = caught.message; }
  record(`anchor-${name}`, { anchorHex: anchor.toString('hex'), nativeCodecInference: 'FlushBlock has no expected_block_idx presence; SourceMessage.parse returns null', proof, error });
  assert.ok(error || proof?.ok === false, 'the cut anchor is not recognized as a cut by the pinned XTDB codec');
});

test('R3-F1: invalid nested TrieMetadata bytes must not qualify as maintenance', () => {
  const trieDetails = bytesField(4, Buffer.from([0]));
  const payload = source(2, Buffer.concat([integer(2, 6), bytesField(1, trieDetails)]));
  const fixture = tail([cut, payload]);
  let proof, error;
  try { proof = verifyMaintenanceTail(fixture.bytes, fixture.frontiers); } catch (caught) { error = caught.message; }
  record('invalid-nested-metadata', { payloadHex: payload.toString('hex'), nativeCodecInference: 'TrieDetails.trie_metadata contains protobuf field tag zero', proof, error });
  assert.ok(error || proof?.ok === false, 'nested invalid protobuf was not validated');
});

test('Q83e: T is read independently; a changing application gauge refuses even with stable M', async () => {
  for (const changed of [false, true]) {
    let now = 0, reads = 0;
    const fixture = tail([cut, maintenance]);
    const rows = ['tx_assertions', 'tx_attempts', 'tx_claims', 'tx_meta', 'txs'].map(table => [table, 'l01-rc-b00', 1, 'live', 100, 1]);
    const gauges = { jobsAvailable: 0, latestCompletedTxId: 100, latestProcessedMsgId: 200, latestSubmittedMsgId: 200, lagMsgId: 0, lastUploadTime: 1 };
    const settle = load(section(checker, 'const blockNumber =', 'async function startCheck'), 'settle', {
      Number, digest, blockTrieCoverage, num: value => value == null ? null : Number(value),
      Date: { now: () => now }, sleep: async ms => { now += ms; }, log: () => {},
      opt: (key, fallback) => key === 'cuts' ? '1' : key === 'timeout-s' ? '20' : fallback,
      healthz: () => ({ status: 200 }), snapshot: async () => ++reads === 1 ? { listing: [], blocks: [], gauges, trie: { rows: [], sha256: digest([]) } } : {
        listing: ['00'], blocks: [{ block_idx: '00', tx_id: 100, latest_processed_msg_id: fixture.frontiers.F }],
        gauges: { ...gauges, latestCompletedTxId: changed ? 101 : 100, latestProcessedMsgId: fixture.frontiers.M, latestSubmittedMsgId: fixture.frontiers.M, lastUploadTime: 2 }, trie: { rows, sha256: digest(rows) },
      },
    });
    const result = await settle(); record(`independent-T-${changed}`, result);
    assert.equal(result.settled, !changed);
    if (!changed) { assert.equal(result.qualified, false); assert.equal(result.frontiers.T, 100); assert.equal(result.frontiers.M, fixture.frontiers.M); }
  }
});

const freeze = { c3: { tx: 100 }, c4: { position: 42 }, c5: { n: 10 }, c6: { sha256: 'layout', liveTables: { rows: [] } }, c7: { jobsAvailable: 0 }, c8: { resultSha256: 'result', plan: { sha256: 'plan' } } };
const baseOwner = () => ({ holder: 'fixture-holder', volumeContent: {
  kind: 'clone', key: 'key', containerId: 'container', startedAt: '2000-01-01T00:00:00Z',
  goldenRecord: 'golden.json', goldenRecordSha256: 'golden-hash', goldenVolume: 'golden', manifestSha256: hash('{}'),
  copy: { creationId: 'copy-id', treeSha256: 'good-tree', c1: { pass: true, expected: 'good-tree', observed: 'good-tree' } }, readiness: { verdict: 'PENDING' },
} });
const proofReceipt = () => ({ format: 'tx2-clone-readiness/1', verdict: 'PASS', checks: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`C${i + 1}`, { pass: true }])) });

async function childVerify(owner) {
  const record = { volume: 'golden', key: 'key', copy: { treeSha256: 'good-tree' }, manifest: { path: 'manifest.json' }, settle: { after: {} }, freeze };
  const verify = load(section(checker, 'async function verify()', '\ntry {\n  if (mode'), 'verify', {
    path, REPO: root, url: 'offline', container: 'container', Date, compareFreeze,
    opt: name => name === 'golden-record' ? 'golden.json' : name === 'owner' ? 'owner.json' : undefined,
    readJson: file => file.includes('manifest') ? { result: { lastPosition: 42 } } : file.includes('owner') ? owner : record,
    healthz: () => ({ status: 200 }), startCheck: async () => ({ ok: true }),
    fingerprint: async () => ({ ...structuredClone(freeze), ok: true, errors: [], timingsMs: {} }), gauges: async () => ({ jobsAvailable: 0 }), sleep: async () => {},
  });
  return verify();
}

for (const variation of ['clean', 'different-observed', 'wrong-expected', 'missing-hashes']) test(`${variation === 'clean' ? 'control' : 'R3-F2'}: C1 is recomputed from the golden/copy evidence (${variation})`, async () => {
  const owner = baseOwner(), copy = owner.volumeContent.copy;
  if (variation === 'different-observed') copy.c1.observed = copy.treeSha256 = 'different-tree';
  if (variation === 'wrong-expected') copy.c1.expected = 'another-golden';
  if (variation === 'missing-hashes') { delete copy.c1.expected; delete copy.c1.observed; delete copy.treeSha256; }
  let result, error;
  try { result = await childVerify(owner); } catch (caught) { error = caught.message; }
  record(`C1-${variation}`, { owner, result, error });
  if (variation === 'clean') { assert.equal(error, undefined); assert.equal(result.checks.C1.pass, true); }
  else assert.ok(error || result?.checks.C1.pass === false, 'the old PASS bit overrode the current expected/observed hashes');
});

async function verifyDuringDown(withDown) {
  const tmp = path.join(import.meta.dirname, 'tmp'); fs.mkdirSync(tmp, { recursive: true });
  const dir = fs.mkdtempSync(path.join(tmp, 'down-race-'));
  const info = { lane: 'xtdb', slot: 's1', container: 'container', volume: 'fixture-volume', lockDir: path.join(dir, 'slot'), ownerFile: path.join(dir, 'slot/owner.json') };
  fs.mkdirSync(info.lockDir); fs.writeFileSync(info.ownerFile, JSON.stringify(baseOwner())); fs.writeFileSync(path.join(dir, 'manifest.json'), '{}');
  const events = []; let running = true, containerPresent = true, updates = 0, releasePool, downPromise;
  const poolBarrier = new Promise(resolve => { releasePool = resolve; });
  const readOwner = () => fs.existsSync(info.ownerFile) ? JSON.parse(fs.readFileSync(info.ownerFile, 'utf8')) : null;
  const context = {
    fs, path, Date, Math, REPO: dir, cloneCertificateHash, ownerStateLock, readOwner,
    now: () => new Date().toISOString(), defaultHolder: () => 'fixture-holder',
    requireHeldXtdbSlot: () => {}, requireRunningSlot: () => {
      if (!running || !containerPresent) throw new Error('not running');
      return { c: { Id: 'container', State: { StartedAt: '2000-01-01T00:00:00Z' } } };
    },
    inspect: () => containerPresent ? { Id: 'container', Config: { Labels: { 'tx2.managed-by': 'lab/bin/engine.mjs' } }, State: { Running: running } } : null,
    docker: args => { events.push(args.join(' ')); if (args[0] === 'stop') running = false; if (args[0] === 'rm') containerPresent = false; return ''; },
    withPool: async action => { await poolBarrier; return action({ reservations: [], retainedVolumes: [] }); },
    volumeBytes: () => 0, appendEvent: event => events.push(event.event),
    loadGolden: () => ({ recordFile: 'golden.json' }), cloneCheck: () => proofReceipt(),
    writeJson: (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value)); },
    sha256File: file => file === 'golden.json' ? 'golden-hash' : hash(fs.readFileSync(file)),
    process: { stdout: { write: () => {} }, stderr: { write: () => {} } }, fail: (_code, message) => { throw new Error(message); },
  };
  const releaseSlot = load(section(engine, 'async function releaseSlot(info)', '/**\n * hooks.prepareVolume'), 'releaseSlot', context);
  context.releaseSlot = releaseSlot;
  const down = load(section(engine, 'async function down(config, info, opts)', '/**\n * [EXP-X05] Start the slot'), 'down', context);
  context.updateOwner = async (currentInfo, action) => {
    if (++updates === 2 && withDown) downPromise = down({ lanes: { xtdb: {} } }, info, { 'remove-volume': true });
    return updateOwner(currentInfo, action);
  };
  const verify = load(section(engine, 'async function verify(config, info, opts)', '/** List a stopped slot'), 'verify', context);
  try {
    let error;
    try { await verify({}, info, {}); } catch (caught) { error = caught.message; }
    const published = readOwner(); let admitted = false;
    try { admitted = seedPathOf({ format: 'tx2-xtdb-seed/1', lane: 'xtdb', scope: 'fixture' }, path.join(dir, 'manifest.json'), info.ownerFile).seededBy === 'clone'; } catch {}
    return { published, admitted, running, containerPresent, events, error };
  } finally {
    releasePool(); if (downPromise) await downPromise;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

for (const withDown of [false, true]) test(`${withDown ? 'R3-F3' : 'control'}: down invalidates verification before removing the current container`, async () => {
  const result = await verifyDuringDown(withDown);
  record(`down-race-${withDown}`, result);
  assert.equal(result.admitted, !withDown, 'PASS was published after the current container was removed');
});

for (const matches of [true, false]) test(`cleanup variation: golden creation UUID is checked before removal (${matches})`, async () => {
  let present = true; const commands = [];
  const goldenRm = load(section(engine, 'async function goldenRm(config, opts)', '/** Expected outcome'), 'goldenRm', {
    path, docker: args => {
      commands.push(args);
      if (args[1] === 'rm') { present = false; return ''; }
      return present ? JSON.stringify([{ Labels: { 'tx2.golden': '1', 'tx2.creation-id': 'current-id' } }]) : '';
    }, containersOnVolume: () => [], withPool: async action => action({ goldens: [] }), appendEvent: () => {},
    process: { stderr: { write: () => {} } }, fail: (_code, message) => { throw new Error(message); },
  });
  let error;
  try { await goldenRm({}, { volume: 'tx2-golden-xtdb-12345678', 'creation-id': matches ? 'current-id' : 'older-id' }); } catch (caught) { error = caught.message; }
  record(`cleanup-uuid-${matches}`, { commands, error });
  assert.equal(commands.some(args => args[1] === 'rm'), matches);
});

after(() => {
  const dir = path.join(import.meta.dirname, 'evidence/review-round3'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'new-cases.json'), JSON.stringify({ offlineOnly: true, mechanism: 'Schema-derived framed bytes; actual source functions with injected engine/process responses; real owner-state locks and local owner files for the down interleaving.', results }, null, 2) + '\n');
});
