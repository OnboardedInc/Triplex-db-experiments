// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { assertionRow } from './fixture.mjs';

// [EXP-DF01] Why: load each package's declared public entry from this checkout. Rejected: sibling source imports (bypass built boundaries).
async function publicEntry(name, subpath = '.') {
  const dir = path.resolve('packages', name);
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
  return import(pathToFileURL(path.resolve(dir, pkg.exports[subpath].import)));
}
const { DatomicClient } = await publicEntry('datomic');
const { datomicChangeFeed, SqliteConsumerStore } = await publicEntry('host', './feed');
const { auditFeed, auditResume, requireGapMutationCaught } = await publicEntry('testkit', './feed');
const out = process.argv[2];
assert(out && !fs.existsSync(path.join(out, 'conformance-state.json')));
const client = new DatomicClient('http://127.0.0.1:8470', 15000);
const scope = JSON.stringify(['triplex-scope-v1', 'test', 'df01-live', randomUUID(), 0]);
const state = { label: 'DIAGNOSTIC', scope, started: new Date().toISOString() };
const save = () => fs.writeFileSync(path.join(out, 'conformance-state.json'), JSON.stringify(state, null, 2));
save();
try {
  const created = await client.create(scope);
  state.database = created.db;
  save();
  const row = assertionRow;
  const a = await client.transact(created.db, { sourceK: 0, position: 1, operationId: 'op1', attemptId: 'a1',
    rows: [row], newIds: ['fact-1'], claims: [{ commandId: 'cmd1', txId: 'tx1', timestamp: 7000 }] });
  state.writeReports = [a];
  save();
  const b = await client.transact(created.db, { sourceK: 1, position: 2, operationId: 'op2', attemptId: 'a2',
    rows: [{ ...row, retracted_at: 9000, retracted_position: 2, retract_tx_id: 'tx2' }],
    newIds: [], claims: [{ commandId: 'cmd2', txId: 'tx2', timestamp: 9000 }] });
  state.writeReports = [a, b];
  save();
  const feed = datomicChangeFeed(scope, { database: created.db, stream: created.db, epoch: '0',
    read: (from, limit, wait) => client.log(created.db, from, limit, wait) });
  // [EXP-DF01] Why: physical coordinates come from write receipts; semantic identities are authored independently. Rejected: deriving the expectation from log delivery (hides lost changes).
  const expected = [a, b].map((receipt, i) => ({ stream: created.db, epoch: '0', offset: receipt.t.v,
    kind: 'commit', transactions: [{ positions: [String(i + 1)], txIds: [`tx${i + 1}`],
      operationId: `op${i + 1}`, commandIds: [`cmd${i + 1}`], stamp: i ? '9000' : '7000', stampStatus: 'decided',
      changes: [{ op: i ? 'retract' : 'assert', entity: 'subject', attribute: 'status', assertionId: 'fact-1',
        position: String(i + 1), validFrom: 0, validTo: 20 }] }] }));
  const cursor = { source: scope, token: a.t.v };
  const first = await feed.poll(cursor, 1);
  const second = await feed.poll(first.cursor);
  state.pages = [first, second];
  save();
  const expectation = { entries: expected, source: scope, finalToken: String(BigInt(b.t.v) + 1n) };
  state.audit = auditFeed([first, second], expectation);
  requireGapMutationCaught([first, second], expectation);
  auditResume(first.entries, (await feed.poll(cursor, 1)).entries);
  auditResume(second.entries, (await feed.poll(first.cursor)).entries);
  assert.deepEqual((await feed.poll(second.cursor)).entries, []);
  const effects = [{ epoch: '0', position: '1', subject: 'subject' }, { epoch: '0', position: '2', subject: 'subject' }];
  const full = await feed.poll(cursor);
  const file = path.join(out, 'consumer.sqlite');
  let store = new SqliteConsumerStore(file);
  store.apply('live', null, full, effects);
  store.close();
  store = new SqliteConsumerStore(file);
  assert.deepEqual(store.checkpoint('live'), full.cursor);
  store.apply('live', full.cursor, full, effects);
  assert.deepEqual(store.effects('live'), effects);
  assert.deepEqual(store.affected('live'), effects);
  store.close();
  state.deleted = await client.delete(scope);
  assert.equal(state.deleted.deleted, true);
  state.result = 'DIAGNOSTIC-PASS';
  save();
  console.log(JSON.stringify(state));
} catch (error) {
  state.result = 'DIAGNOSTIC-FAIL';
  state.error = error.stack;
  save();
  throw error;
} finally { client.close(); }
