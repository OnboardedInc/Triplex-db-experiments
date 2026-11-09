// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
import './source-hook.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const { feedBytes } = await import('@triplex-build/triplex/feed');
const { auditFeed, auditResume, runFeedCrashConformance } = await import('@triplex-build/triplex-testkit/feed');
const { SqliteConsumerStore } = await import('@triplex-build/triplex-host/feed');
const attempt = randomUUID();
const dir = `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VFD01/${attempt}`;
fs.mkdirSync(dir, { recursive: true });
const files = [
  'packages/core/src/feed/index.ts', 'packages/testkit/src/feed/index.ts',
  'packages/host/src/feed/ConsumerStore.ts', 'packages/host/src/feed/Adapters.ts',
  'packages/host/src/feed/BrokerReader.ts', 'packages/host/test/feed/feed.test.ts',
  'packages/host/test/feed/crash-child.mjs', 'lab/bench/lib/feed.ts', 'pnpm-lock.yaml',
  'lab/verify/FD01/source-hook.mjs', 'lab/verify/FD01/probe.mjs', 'lab/verify/FD01/split-child.mjs',
];
const sha = (b) => createHash('sha256').update(b).digest('hex');
const sources = () => Object.fromEntries(files.map((f) => [f, sha(fs.readFileSync(path.join(root, f)))]));
const before = sources();
const record = { attempt, started: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), node: process.version, sqlite: new DatabaseSync(':memory:').prepare('SELECT sqlite_version() v').get().v, engines: false, slot: null, dir, sources: before, checks: [] };
fs.writeFileSync(path.join(dir, 'attempt.json'), JSON.stringify(record, null, 2));
// [CX-VFD01] Why: frozen independent prefix gives every resolution a known place, with sparse logical positions.
// Rejected: generating expected entries from mutated output (would hide missing entries in both sides).
const commit = (offset, position, op = 'assert') => ({
  stream: 'review-stream', epoch: '1', offset: String(offset), kind: 'commit',
  transactions: [{ positions: [String(position)], txIds: ['tx' + position], operationId: 'op' + position,
    commandIds: ['cmd' + position], stamp: String(1000000 + position), stampStatus: 'decided',
    changes: [{ op, entity: 'subject', attribute: ':a', position: String(position), assertionId: 'assertion' + position,
      validFrom: 0, validTo: null, ...(op === 'erase' ? { erasureSeq: '1' } : {}) }] }],
});
const entries = [commit(1, 10), { stream: 'review-stream', epoch: '1', offset: '2', kind: 'aborted' },
  commit(3, 30, 'erase'), { stream: 'review-stream', epoch: '1', offset: '4', kind: 'seal', stamp: '2000000' },
  { stream: 'review-stream', epoch: '2', offset: '0', kind: 'epoch', previousEpoch: '1' }];
const page = { entries, cursor: { source: 'generic-test/db/generation/source', token: 'epoch2-offset0' } };
const expected = { entries: structuredClone(entries), source: page.cursor.source, finalToken: page.cursor.token };
const check = (name, fn, expectedRejected = true) => {
  let error = null, value;
  try { value = fn(); } catch (e) { error = String(e); }
  record.checks.push({ name, expectedRejected, rejected: error !== null, error, value });
};
check('valid sparse prefix: 2 logical commit positions, 5 resolutions', () => auditFeed([page], expected), false);
for (let i = 0; i < entries.length; i++) {
  check('skip resolution ' + i + ' (' + entries[i].kind + ')', () => auditFeed([{ ...page, entries: entries.filter((_, j) => i !== j) }], expected));
}
const reversed = [commit(1, 30), commit(2, 10)];
check('per-subject position order violation even when oracle content agrees', () => auditFeed([{ ...page, entries: reversed }], { ...expected, entries: structuredClone(reversed) }));
for (const field of ['value', 'envelope', 'keyId']) {
  const bad = structuredClone(entries);
  bad[0].transactions[0].changes[0][field] = 'forbidden';
  check('identity-only reject ' + field, () => auditFeed([{ ...page, entries: bad }], { ...expected, entries: structuredClone(bad) }));
}
check('resume unchanged across erase', () => auditResume(entries, structuredClone(entries)), false);
check('resume replays one too many', () => auditResume(entries.slice(2), entries.slice(1)));
check('resume replays one too few', () => auditResume(entries.slice(2), entries.slice(3)));
const changed = structuredClone(entries); changed[2].transactions[0].changes[0].erasureSeq = '2';
check('resume changes erase identity bytes', () => auditResume(entries, changed));
const replayPage = { entries: [entries[0]], cursor: { ...page.cursor, token: '1' } };
const affected = [{ epoch: '1', position: '10', subject: 'subject' }];
const replayFile = path.join(dir, 'replay.db');
let store = new SqliteConsumerStore(replayFile);
store.apply('c', null, replayPage, affected); store.close();
store = new SqliteConsumerStore(replayFile);
store.apply('c', store.checkpoint('c'), replayPage, affected);
assert.deepEqual(store.effects('c'), affected);
record.checks.push({ name: 'duplicate delivery after actual close/reopen', deliveries: 2, visibleEffects: store.effects('c').length, expectedEffects: 1 });
store.close();
const input = path.join(dir, 'input.json'); fs.writeFileSync(input, JSON.stringify({ page: replayPage, affected }));
const child = fileURLToPath(new URL('./split-child.mjs', import.meta.url));
const observations = [];
const run = async (point, n, arm) => {
  const file = path.join(dir, `${arm}-${point}-${n}.db`);
  const stopped = spawnSync(process.execPath, [child, file, input, arm, point], { encoding: 'utf8' });
  assert.equal(stopped.status, 77, stopped.stderr);
  let db = new DatabaseSync(file);
  const preEffects = db.prepare('SELECT epoch,position,subject FROM effects').all();
  const preCheckpoint = db.prepare('SELECT source,token FROM checkpoint').get() ?? null;
  db.close();
  const resumed = spawnSync(process.execPath, [child, file, input, arm, 'resume'], { encoding: 'utf8' });
  assert.equal(resumed.status, 0, resumed.stderr);
  db = new DatabaseSync(file);
  const effects = db.prepare('SELECT epoch,position,subject FROM effects').all();
  const actualAffected = db.prepare('SELECT epoch,position,subject FROM affected').all();
  const actualCheckpoint = db.prepare('SELECT source,token FROM checkpoint').get();
  db.close();
  const keys = effects.map((e) => JSON.stringify(e));
  const observation = { crashed: true, gaps: affected.filter((a) => !keys.includes(JSON.stringify(a))).length,
    duplicateEffects: effects.length - new Set(keys).size,
    affectedMatches: JSON.stringify(actualAffected) === JSON.stringify(affected),
    checkpointMatches: JSON.stringify(actualCheckpoint) === JSON.stringify(replayPage.cursor),
    resumeBytesMatch: feedBytes(JSON.parse(fs.readFileSync(input)).page.entries[0]) === feedBytes(replayPage.entries[0]) };
  observations.push({ point, n, arm, preEffects, preCheckpoint, observation });
  return observation;
};
// This deliberately mislabels the implementation under test: it is keyed but split. No observation is fabricated.
record.keyedSplitMatrix = await runFeedCrashConformance(run);
record.splitAtomicityViolations = observations.filter((o) => o.arm === 'keyed-atomic' && o.preEffects.length && !o.preCheckpoint).length;
fs.writeFileSync(path.join(dir, 'crash-observations.json'), JSON.stringify(observations, null, 2));
// [CX-VFD01] Why: separate clocks intentionally disagree; only the source publication clock is valid for P3.
// Rejected: using numerically plausible record-time stamps as host-monotonic lag starts.
const clocks = { publishedAtMonoMs: 100, durableAtMonoMs: 400, decidedStampAsMs: 399 };
const measured = { ...page, lagMs: clocks.durableAtMonoMs - clocks.decidedStampAsMs, clocks };
check('decided-stamp lag: reports 1 ms when publication lag is 300 ms', () => auditFeed([measured], expected), true);
check('missing publication instant', () => auditFeed([page], expected), true);
assert.deepEqual(sources(), before);
record.sourceUnchanged = true;
record.ended = new Date().toISOString();
fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(record, null, 2));
console.log(JSON.stringify(record, null, 2));
