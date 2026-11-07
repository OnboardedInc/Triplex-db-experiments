// EXP-P2X probe 4: which parameter shapes does xt.source_log_msgs accept for its msg_id bounds?
// Run from packages/xtdb: XTDB_URL=... node --experimental-strip-types ../../lab/experiments/EXP-P2X-xtdb-commit-feed/probes/p4-log-params.ts
import { makeXtdbClient } from "../../../../packages/xtdb/dist/index.js";

const client = makeXtdbClient(process.env["XTDB_URL"]!);
const [{ _id }] = await client.query("SELECT _id FROM xt.txs ORDER BY _id DESC LIMIT 1 OFFSET 3");
const lower = Number(_id);
const variants: [string, string, unknown[]][] = [
  ["params lower+upper+limit", "SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN ? AND ? LIMIT ?", [lower, 2 ** 48 - 1, 10]],
  ["params lower+upper, literal limit", "SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN ? AND ? LIMIT 10", [lower, 2 ** 48 - 1]],
  ["params lower+upper small", "SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN ? AND ?", [lower, lower + 1e9]],
  ["params lower, literal upper", `SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN ? AND ${2 ** 48 - 1}`, [lower]],
  ["literal both", `SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN ${lower} AND ${2 ** 48 - 1} LIMIT 10`, []],
  ["literal upper 2^47", `SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN ${lower} AND ${2 ** 47} LIMIT 10`, []],
  ["literal upper lower+1e12", `SELECT msg_id FROM xt.source_log_msgs WHERE msg_id BETWEEN ${lower} AND ${lower + 1e12} LIMIT 10`, []],
  [">= and <=", `SELECT msg_id FROM xt.source_log_msgs WHERE msg_id >= ? AND msg_id <= ? LIMIT 10`, [lower, lower + 1e12]],
];
for (const [label, sql, params] of variants) {
  try {
    const rows = await client.query(sql, params);
    console.log(label, rows.length, rows.slice(0, 3).map((r) => r["msg_id"]));
  } catch (e) {
    console.log(label, "ERR", String((e as Error).message).slice(0, 160));
  }
}
await client.close();
