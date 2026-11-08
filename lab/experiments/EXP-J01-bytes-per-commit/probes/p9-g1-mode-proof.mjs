// EXP-J01 probe 9: which commit encoding a G1 run actually wrote (the gate receipt does not bind
// TRIPLEX_COMMIT_ENCODING). Reads the scopes from the run's raw G1 report and checks the engine:
//   QLever: count triples of the omitted channels (`recorded_at_native`, `schema_version`) in each scope's
//           graph: A0 writes them for every fact, compact never does.
//   XTDB:   the rows are identical in both encodings, so read the run's source-log records (xt.txs ids in the
//           run's system-time window) and count guard statements by spelling: A0's
//           'triplex-assertion-identity-conflict' or compact's 'triplex-identity-conflict', only in records
//           that carry one of the run's scope keys.
// Usage: node p9-g1-mode-proof.mjs <raw g1-report.json> --lane xtdb|qlever
import fs from 'node:fs';
import postgres from '../../../../packages/xtdb/node_modules/postgres/src/index.js';

const [reportPath] = process.argv.slice(2);
const lane = process.argv[process.argv.indexOf('--lane') + 1];
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const scopes = [...new Set([...report.executions.map((e) => e.scope), report.suite?.scope].filter(Boolean))];
const out = { report: reportPath, lane, scopes: scopes.length, startedAt: report.startedAt };
if (lane === 'qlever') {
  const counts = { recordedAtNative: 0, schemaVersion: 0, rows: 0 };
  for (const scope of scopes) {
    const graph = `<urn:triplex:scope:${Buffer.from(scope).toString('base64url')}>`;
    const q = `SELECT (COUNT(?r) AS ?rows) (COUNT(?n) AS ?native) (COUNT(?v) AS ?version) WHERE { GRAPH ${graph} { ?s <urn:triplex:field:_row> ?r . OPTIONAL { ?s <urn:triplex:field:recorded_at_native> ?n } OPTIONAL { ?s <urn:triplex:field:schema_version> ?v } } }`;
    const url = new URL(report.endpoint);
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/sparql-query', Accept: 'application/sparql-results+json' }, body: q });
    const b = (await response.json()).results.bindings[0];
    counts.rows += Number(b.rows.value); counts.recordedAtNative += Number(b.native.value); counts.schemaVersion += Number(b.version.value);
  }
  out.counts = counts;
  out.encoding = counts.rows > 0 && counts.recordedAtNative === 0 && counts.schemaVersion === 0 ? 'compact' : counts.recordedAtNative === counts.rows ? 'a0' : 'mixed';
} else {
  const sql = postgres(report.endpoint, { max: 1, prepare: false, onnotice: () => {} });
  const finished = report.endedAt ?? new Date().toISOString();
  const lit = (iso) => `TIMESTAMP WITH TIME ZONE '${new Date(iso).toISOString()}'`;
  const txs = await sql.unsafe(`SELECT _id FROM xt.txs WHERE system_time >= ${lit(report.startedAt)} AND system_time <= ${lit(finished)} ORDER BY _id`);
  const ids = txs.map((t) => Number(t._id));
  const counts = { recordsScanned: 0, runRecords: 0, a0Guards: 0, compactGuards: 0 };
  // The database name (lab-g1-<lane>-<phase>-<uuid>) appears verbatim in put-docs text and as UTF-8 hex
  // inside ASSERT argument bytes; the full scope key would appear with escaped quotes.
  const names = scopes.map((s) => JSON.parse(s)[3]);
  const hexNames = names.map((n) => Buffer.from(n).toString('hex'));
  // Read records one at a time, skipping large ones (other agents' bulk loads reach 1.3 MB; a G1 commit
  // is 10-100 KB), so the probe stays light on the shared resident. Record size = next tx id - own id.
  const small = ids.slice(0, -1).map((id, k) => ({ id, bytes: ids[k + 1] - id })).filter((r) => r.bytes < 150_000);
  const step = Math.max(1, Math.floor(small.length / 400));
  for (let k = 0; k < small.length; k += step) {
    const { id } = small[k];
    const [m] = await sql.unsafe(`SELECT msg_id, tx_ops FROM xt.source_log_msgs WHERE msg_id BETWEEN ${id} AND ${id}`);
    if (!m) continue;
    counts.recordsScanned++;
    const text = String(m.tx_ops);
    if (!names.some((n) => text.includes(n)) && !hexNames.some((h) => text.includes(h))) continue;
    counts.runRecords++;
    if (text.includes("'triplex-assertion-identity-conflict'")) counts.a0Guards++;
    if (text.includes("'triplex-identity-conflict'")) counts.compactGuards++;
  }
  counts.windowTransactions = ids.length;
  await sql.end();
  out.counts = counts;
  out.encoding = counts.compactGuards > 0 && counts.a0Guards === 0 ? 'compact' : counts.a0Guards > 0 && counts.compactGuards === 0 ? 'a0' : 'undetermined';
}
console.log(JSON.stringify(out, null, 1));
