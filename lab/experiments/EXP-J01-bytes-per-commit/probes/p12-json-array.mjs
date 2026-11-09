// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking; runtime-populated records, option bags, or branch-specific union members; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-J01] Why: F3's original JSON arm double-encoded ids; compare correctly bound
// JSON arrays with that retained negative control. Rejected: inferring semantics from OID alone.
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const ownerPath = '/Users/sam/projects/triplex-db-2/lab/locks/xtdb-dev/owner.json';
const ownerBytes = fs.readFileSync(ownerPath);
const owner = JSON.parse(ownerBytes);
const url = process.env.XTDB_URL;
if (url !== owner.endpoint || owner.lane !== 'xtdb') throw new Error('Endpoint must match retained owner');
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {}, connect_timeout: 10 });
const scope = `j01-r2-json-${randomUUID()}`;
const present = randomUUID(), foreign = randomUUID();
const fresh = Array.from({ length: 24 }, () => randomUUID());
const receipt = { startedAt: new Date().toISOString(), endpoint: url, scope,
  ownerPath, ownerSha256: digest(ownerBytes), owner,
  probeSha256: digest(fs.readFileSync(new URL(import.meta.url))),
  driverTypesSha256: digest(fs.readFileSync(new URL('../../../../packages/xtdb/node_modules/postgres/src/types.js', import.meta.url))),
  compactEnabled: false, results: [] };
const attempt = async (statement, params) => {
  try {
    await sql.unsafe('BEGIN READ WRITE');
    await sql.unsafe(statement, params);
    await sql.unsafe('COMMIT SYNC');
    return { outcome: 'passed' };
  } catch (error) {
    try { await sql.unsafe('ROLLBACK'); } catch {}
    return { outcome: /j01-found/.test(error.message) ? 'rejected' : 'error',
      error: { message: error.message, code: error.code, detail: error.detail } };
  }
};
try {
  const setup = await attempt('INSERT INTO j01_ids (_id, scope_key, id) VALUES ($1, $2, $3), ($4, $5, $6)',
    [sql.typed(randomUUID(), 25), sql.typed(scope, 25), sql.typed(present, 25),
      sql.typed(randomUUID(), 25), sql.typed(`${scope}-other`, 25), sql.typed(foreign, 25)]);
  if (setup.outcome !== 'passed') throw new Error(JSON.stringify(setup));
  for (const predicate of ['id = ANY($2)', 'id IN (SELECT x FROM UNNEST($2) AS t (x))']) {
    for (const doubleEncoded of [false, true]) {
      for (const [name, ids, expected] of [
        ['fresh', fresh, 'passed'], ['existing', [...fresh.slice(1), present], 'rejected'],
        ['other-scope', [foreign], 'passed'], ['empty', [], 'passed'],
      ]) {
        const value = doubleEncoded ? JSON.stringify(ids) : ids;
        const statement = `ASSERT NOT EXISTS (SELECT 1 FROM j01_ids WHERE scope_key = $1 AND ${predicate}), 'j01-found'`;
        const result = await attempt(statement, [sql.typed(scope, 25), sql.typed(value, 114)]);
        receipt.results.push({ predicate, doubleEncoded, name, ids, expected,
          serializedParameter: JSON.stringify(value), statement, ...result });
      }
    }
  }
  receipt.correctJsonArraysWork = receipt.results.filter(r => !r.doubleEncoded)
    .every(r => r.outcome === r.expected);
  receipt.ownerUnchanged = digest(fs.readFileSync(ownerPath)) === receipt.ownerSha256;
  if (!receipt.correctJsonArraysWork || !receipt.ownerUnchanged) process.exitCode = 1;
} catch (error) { receipt.failure = String(error.stack); process.exitCode = 1; }
finally {
  await sql.end({ timeout: 5 });
  receipt.endedAt = new Date().toISOString();
  console.log(JSON.stringify(receipt, null, 2));
}
