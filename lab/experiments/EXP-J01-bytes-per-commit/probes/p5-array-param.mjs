// EXP-J01 probe 5: can the assertion-identity guard bind all new ids as ONE parameter (constant SQL
// text, one Arrow column) instead of one parameter per id? Tries several XTDB 2.2 spellings with a
// text[] or JSON parameter; each must reject when one id exists and pass when none does. Also sizes
// the source-log record of each working form against the per-id-parameter form.
// Run: XTDB_URL=... node p5-array-param.mjs
import { randomUUID } from 'node:crypto';
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';

const sql = postgres(process.env.XTDB_URL, { max: 1, prepare: false, onnotice: () => {} });
const scope = `j01-p5-${randomUUID()}`;
const present = randomUUID();
await sql.unsafe('BEGIN READ WRITE');
await sql.unsafe('INSERT INTO j01_ids (_id, scope_key, id) VALUES ($1, $2, $3)', [sql.typed(randomUUID(), 25), sql.typed(scope, 25), sql.typed(present, 25)]);
await sql.unsafe('COMMIT SYNC');
const fresh = Array.from({ length: 24 }, () => randomUUID());
const size = async (id) => {
  await sql.unsafe('BEGIN READ WRITE');
  await sql.unsafe('INSERT INTO j01_fence (_id, at) VALUES ($1, $2)', [sql.typed(randomUUID(), 25), sql.typed(Date.now(), 20)]);
  await sql.unsafe('COMMIT SYNC');
  const fence = Number((await sql.unsafe('SHOW LATEST_SUBMITTED_TX'))[0].tx_id);
  const msgs = await sql.unsafe(`SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN ${id} AND ${fence}`);
  return msgs.map((m) => Number(m.msg_id)).sort((a, b) => a - b).find((x) => x > id) - id;
};
const attempt = async (text, params) => {
  try {
    await sql.unsafe('BEGIN READ WRITE');
    await sql.unsafe(text, params);
    await sql.unsafe('COMMIT SYNC');
    const id = Number((await sql.unsafe('SHOW LATEST_SUBMITTED_TX'))[0].tx_id);
    return { outcome: 'passed', recordBytes: await size(id) };
  } catch (error) {
    try { await sql.unsafe('ROLLBACK'); } catch {}
    return { outcome: /j01-found/.test(String(error.message)) ? 'rejected' : `error: ${String(error.message).slice(0, 160)}` };
  }
};
const forms = {
  'per-id parameters (A0 form)': (ids) => [`ASSERT NOT EXISTS (SELECT 1 FROM j01_ids WHERE scope_key = $1 AND id IN (${ids.map((_v, i) => `$${i + 2}`).join(', ')})), 'j01-found'`, [sql.typed(scope, 25), ...ids.map((x) => sql.typed(x, 25))]],
  'text[] parameter, = ANY': (ids) => [`ASSERT NOT EXISTS (SELECT 1 FROM j01_ids WHERE scope_key = $1 AND id = ANY($2)), 'j01-found'`, [sql.typed(scope, 25), sql.typed(ids, 1009)]],
  'text[] parameter, IN UNNEST': (ids) => [`ASSERT NOT EXISTS (SELECT 1 FROM j01_ids WHERE scope_key = $1 AND id IN (SELECT x FROM UNNEST($2) AS t (x))), 'j01-found'`, [sql.typed(scope, 25), sql.typed(ids, 1009)]],
  'json parameter, IN UNNEST': (ids) => [`ASSERT NOT EXISTS (SELECT 1 FROM j01_ids WHERE scope_key = $1 AND id IN (SELECT x FROM UNNEST($2) AS t (x))), 'j01-found'`, [sql.typed(scope, 25), sql.typed(JSON.stringify(ids), 114)]],
};
const out = {};
for (const [name, form] of Object.entries(forms)) {
  const none = await attempt(...form(fresh));
  const one = await attempt(...form([...fresh.slice(1), present]));
  out[name] = { allFresh: none, onePresent: one, works: none.outcome === 'passed' && one.outcome === 'rejected' };
}
console.log(JSON.stringify(out, null, 1));
await sql.end();
