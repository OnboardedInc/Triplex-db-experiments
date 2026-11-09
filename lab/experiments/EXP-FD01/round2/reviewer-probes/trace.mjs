// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const mode = process.argv[2];
await import(mode === 'mutant' ? './mutant-hook.mjs' : './source-hook.mjs');
const { SqliteConsumerStore } = await import('@triplex-build/triplex-host/feed');
// [CX-VFD01] Why: observe executed transaction statements, proving the injected implementation really loads.
// Rejected: inferring mutation execution solely from a configured transform plugin.
const dir = `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VFD01/trace-${mode}-${randomUUID()}`;
fs.mkdirSync(dir, { recursive: true });
const store = new SqliteConsumerStore(dir + '/consumer.db');
const statements = [];
const exec = DatabaseSync.prototype.exec;
DatabaseSync.prototype.exec = function (sql) { statements.push(sql); return exec.call(this, sql); };
store.apply('c', null, { entries: [], cursor: { source: 'generic-test/source', token: '0' } }, []);
DatabaseSync.prototype.exec = exec;
store.close();
assert.deepEqual(statements, mode === 'mutant' ? ['BEGIN IMMEDIATE', 'COMMIT; BEGIN IMMEDIATE', 'COMMIT'] : ['BEGIN IMMEDIATE', 'COMMIT']);
const result = { mode, dir, statements, applyFunctionSha256: createHash('sha256').update(SqliteConsumerStore.prototype.apply.toString()).digest('hex') };
fs.writeFileSync(dir + '/result.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
