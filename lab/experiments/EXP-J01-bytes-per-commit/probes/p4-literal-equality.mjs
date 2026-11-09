// EXP-J01 probe 4: does an XTDB 2.2 SQL string literal (single quotes doubled, nothing else escaped)
// compare equal to the same text bound as a parameter? For each tricky value: insert it as a parameter,
// then (a) an ASSERT NOT EXISTS with the literal must be rejected (the row is found), and (b) the same
// ASSERT with the value plus one character must pass. Also reads the value back by literal.
// Run: XTDB_URL=... node p4-literal-equality.mjs
import { randomUUID } from 'node:crypto';
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';

const sql = postgres(process.env.XTDB_URL, { max: 1, prepare: false, onnotice: () => {} });
const lit = (s) => `'${s.replaceAll("'", "''")}'`;
const values = [
  "plain", "it's", "''", "back\\slash", "\\'", "new\nline", "tab\tchar", "?", "$1", "-- comment", "/* block */", "\"double\"",
  "ünïcødé ✓ 𝄞", "  ", "E'x'", "%_", ";", "a".repeat(1024), JSON.stringify(['triplex-scope-v1', 'test', "o'k", 'x\\y', 0]),
];
const scope = `j01-p4-${randomUUID()}`;
const results = [];
for (const value of values) {
  const id = randomUUID();
  await sql.unsafe('BEGIN READ WRITE');
  await sql.unsafe('INSERT INTO j01_literal (_id, scope_key, v) VALUES ($1, $2, $3)', [sql.typed(id, 25), sql.typed(scope, 25), sql.typed(value, 25)]);
  await sql.unsafe('COMMIT SYNC');
  const assertWith = async (text) => {
    try {
      await sql.unsafe('BEGIN READ WRITE');
      await sql.unsafe(`ASSERT NOT EXISTS (SELECT 1 FROM j01_literal WHERE scope_key = ${lit(scope)} AND v = ${lit(text)}), 'j01-found'`);
      await sql.unsafe('COMMIT SYNC');
      return 'passed';
    } catch (error) {
      try { await sql.unsafe('ROLLBACK'); } catch {}
      return /j01-found/.test(String(error.message)) ? 'rejected' : `error: ${String(error.message).slice(0, 120)}`;
    }
  };
  const exact = await assertWith(value);
  const near = await assertWith(value + 'x');
  let readBack;
  try {
    const read = await sql.unsafe(`SELECT v FROM j01_literal WHERE scope_key = ${lit(scope)} AND v = ${lit(value)}`);
    readBack = read.length === 1 && read[0].v === value;
  } catch (error) { readBack = `error: ${String(error.message).slice(0, 100)}`; }
  results.push({ value: value.length > 40 ? `${value.slice(0, 20)}... (${value.length} chars)` : JSON.stringify(value), exactMatchAssert: exact, nearMissAssert: near, readBack });
}
const ok = results.every((r) => r.exactMatchAssert === 'rejected' && r.nearMissAssert === 'passed' && r.readBack);
console.log(JSON.stringify({ ok, results }, null, 1));
await sql.end();
