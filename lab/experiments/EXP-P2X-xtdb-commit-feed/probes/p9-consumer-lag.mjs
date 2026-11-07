// EXP-P2X probe 9: how far behind the log tip each consumer's durable checkpoint is (bytes of log).
// Run: XTDB_URL=... node p9-consumer-lag.mjs
import { makeXtdbClient } from '../../../../packages/xtdb/dist/index.js';

const c = makeXtdbClient(process.env.XTDB_URL);
const [tip] = await c.query('SELECT _id FROM xt.txs ORDER BY _id DESC LIMIT 1');
const checkpoints = await c.query('SELECT consumer, msg_id FROM tx_feed_checkpoints FOR ALL VALID_TIME');
console.log(JSON.stringify({ tip: Number(tip._id), consumers: checkpoints.map((r) => ({ consumer: r.consumer, msgId: Number(r.msg_id), behindBytes: Number(tip._id) - Number(r.msg_id) })) }));
await c.close();
