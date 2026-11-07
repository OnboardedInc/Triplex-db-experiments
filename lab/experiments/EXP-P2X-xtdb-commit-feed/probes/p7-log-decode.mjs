// EXP-P2X probe 7: find source-log records that xt.source_log_msgs cannot decode. Reads one record
// at a time over the last N transactions (record starts come from xt.txs ids) and reports failures.
// Run: XTDB_URL=... node p7-log-decode.mjs [lastN]
import { makeXtdbClient } from '../../../../packages/xtdb/dist/index.js';

const c = makeXtdbClient(process.env.XTDB_URL);
const lastN = Number(process.argv[2] ?? 400);
const txs = (await c.query(`SELECT _id, committed, user_metadata FROM xt.txs ORDER BY _id DESC LIMIT ${lastN}`)).reverse();
let ok = 0;
const failures = [];
for (let i = 0; i < txs.length; i++) {
  const id = Number(txs[i]._id);
  const nextId = i + 1 < txs.length ? Number(txs[i + 1]._id) : id + 1;
  try {
    await c.query('SELECT msg_id, msg_type FROM xt.source_log_msgs WHERE msg_id BETWEEN ? AND ?', [id, id]);
    ok++;
  } catch (e) {
    failures.push({ msgId: id, recordBytes: nextId - id, committed: txs[i].committed, meta: JSON.stringify(txs[i].user_metadata).slice(0, 160), error: String(e.message).slice(0, 120) });
  }
}
const sizes = txs.slice(0, -1).map((t, i) => Number(txs[i + 1]._id) - Number(t._id));
console.log(JSON.stringify({ scanned: txs.length, ok, failures: failures.length, sample: failures.slice(0, 5), maxRecordBytes: Math.max(...sizes), okMaxBytes: Math.max(...sizes.filter((_s, i) => !failures.some((f) => f.msgId === Number(txs[i]._id)))) }, null, 1));
await c.close();
