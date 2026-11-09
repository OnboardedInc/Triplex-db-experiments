#!/usr/bin/env node
// [EXP-002] Server-side latency from a QLever 0.6.0 server log (docker logs of tx2-qlever-dev):
// per-update and per-query "total time" lines, plus the delta size the update responses report in
// the log. Diagnostic for North-star P2 (small commit latency) and P1 (reads while writes run); it is
// single-client gate traffic, not a concurrency benchmark.
// Usage: node qlever-log-latency.mjs [--connection-mode EXPECTED] [--since ISO] [--until ISO] < mode-bearing-log-receipt.json
import { readLatencyRun } from "../../receipts/parse.ts";
import { qleverLatencyReceipt, requireQleverConnectionMode } from '../../receipts/latency.mjs';

const args = process.argv.slice(2);
const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const since = opt('--since'), until = opt('--until');
// [EXP-QNODELAY] Why: raw log text has no transport identity. Rejected: a CLI
// attribution that could add metadata to mode-less observations before comparison.
const receipt = readLatencyRun("/dev/stdin", { lane: "qlever", expectedWriter: "qlever-server-log/1" }).unwrap().data;
const qleverConnectionMode = receipt.qleverConnectionMode;
if (opt('--connection-mode') !== undefined && requireQleverConnectionMode(opt('--connection-mode')) !== qleverConnectionMode)
  throw new TypeError("expected mode differs from server-log receipt");
if (typeof receipt.log !== "string") throw new TypeError("server-log receipt requires log text");
const text = receipt.log;
const updates = [], queries = [], planning = [];
for (const line of text.split('\n')) {
  const m = /^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+) - INFO: (.*)$/.exec(line);
  if (!m) continue;
  const at = m[1].replace(' ', 'T') + 'Z';
  if ((since && at < since) || (until && at > until)) continue;
  let x;
  if ((x = /^Done processing update, total time was ([\d,]+) ms/.exec(m[2]))) updates.push(Number(x[1].replaceAll(",", "")));
  else if ((x = /^Done processing query and sending result, total time was ([\d,]+) ms/.exec(m[2]))) queries.push(Number(x[1].replaceAll(",", "")));
  else if ((x = /^Query planning done in ([\d,]+) ms/.exec(m[2]))) planning.push(Number(x[1].replaceAll(",", "")));
}
const stats = values => {
  if (!values.length) return { n: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return { n: sorted.length, p50: q(0.5), p90: q(0.9), p99: q(0.99), max: sorted.at(-1), sumMs: sorted.reduce((s, v) => s + v, 0) };
};
console.log(JSON.stringify(qleverLatencyReceipt({ qleverConnectionMode, modeEvidence: "recorded receipt metadata; server log alone does not prove transport", since: since ?? null, until: until ?? null, updateMs: stats(updates), queryMs: stats(queries), planningMs: stats(planning) }), null, 2));
