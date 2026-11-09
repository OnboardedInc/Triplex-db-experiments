#!/usr/bin/env node
import { parseLatencyReceipt } from "../receipts/parse.ts";
// lab/bin/scorecard.mjs [--ref main] [--dry-run]
// Rebuilds the G0-G2 rows of the "Gates by lane" table in lab/SCORECARD.md from the newest
// committed receipt per gate/lane on <ref> (default main). The goal table and the G3-G7 rows are
// left as they are (the orchestrator owns them).
// [EXP-000] Why: read receipts from the git ref, not the working tree, so an uncommitted or
// branch-local receipt cannot promote a cell. Rejected: newest file mtime (not what main holds).
import fs from 'node:fs';
import path from 'node:path';
import { REPO, fail, git, main, parseArgs } from './lib.mjs';

const ROWS = { G0: '| G0 pure |', G1: '| G1 unchanged44 |', G2: '| G2 native142 |' };

function cell(receipt, receiptPath, column) {
  if (!receipt) return 'OPEN';
  const link = `(${receiptPath.replace(/^lab\//, '')})`;
  const c = receipt.counts ?? {};
  if (receipt.gate === 'G2' && receipt.lane === 'xtdb') {
    const language = column === 'xtql' ? 'xtql' : 'xtdb-sql';
    const pure = receipt.languages?.answer?.[language] ?? 0;
    const passed = receipt.languages?.passByAnswer?.[language] ?? 0;
    if (receipt.verdict === 'PASS' && pure === 142 && passed === 142) return `PASS@full ${link}`;
    return `PARTIAL(${language}-pure ${pure}/142 executions, ${passed} pass; run ${receipt.verdict} ${c.pass ?? 0}/${c.expected ?? '?'} on ${receipt.scope}) ${link}`;
  }
  if (receipt.verdict === 'PASS') return `PASS@${receipt.scope} ${link}`;
  if (receipt.verdict === 'PASS_SUBSET') return `PARTIAL(${receipt.scope}, all pass) ${link}`;
  return `FAIL(${c.pass ?? 0}/${c.expected ?? c.executed ?? '?'} pass on ${receipt.scope}) ${link}`;
}

main(async () => {
  const { options } = parseArgs(process.argv.slice(2));
  const ref = options.ref ?? 'main';
  const sha = git(['rev-parse', ref]);
  const files = (git(['ls-tree', '-r', '--name-only', ref, '--', 'lab/runs'], { allowFail: true }) ?? '').split('\n').filter(f => f.endsWith('.json'));
  const newest = {};
  for (const file of files) {
    let receipt;
    try { receipt = parseLatencyReceipt(git(['show', `${ref}:${file}`]), { source: file }); } catch { continue; }
    if (receipt.format !== 'tx2-gate-receipt/1') continue;
    const key = `${receipt.gate}/${receipt.lane}`;
    if (!newest[key] || receipt.startedAt > newest[key].receipt.startedAt) newest[key] = { receipt, file };
  }
  const get = (gate, lane) => newest[`${gate}/${lane}`] ?? {};
  const x = gate => get(gate, 'xtdb'), q = gate => get(gate, 'qlever');
  const rows = {
    G0: `| G0 pure | ${cell(x('G0').receipt, x('G0').file ?? '', 'xtql')} | ${cell(x('G0').receipt, x('G0').file ?? '', 'sql')} | ${cell(q('G0').receipt, q('G0').file ?? '', 'q')} |`,
    G1: `| G1 unchanged44 | ${cell(x('G1').receipt, x('G1').file ?? '', 'xtql')} | (shared foundation) | ${cell(q('G1').receipt, q('G1').file ?? '', 'q')} |`,
    G2: `| G2 native142 | ${cell(x('G2').receipt, x('G2').file ?? '', 'xtql')} | ${cell(x('G2').receipt, x('G2').file ?? '', 'sql')} | ${cell(q('G2').receipt, q('G2').file ?? '', 'q')} |`,
  };
  const file = path.join(REPO, 'lab/SCORECARD.md');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const heading = lines.indexOf('## Gates by lane');
  if (heading < 0) fail('SCORECARD', 'no "## Gates by lane" heading in lab/SCORECARD.md');
  const stamp = `<!-- G0-G2 rows rebuilt by lab/bin/scorecard.mjs from ${ref}@${sha.slice(0, 12)} (${files.length} receipt files) -->`;
  if (lines[heading + 1]?.startsWith('<!-- G0-G2 rows rebuilt')) lines[heading + 1] = stamp; else lines.splice(heading + 1, 0, stamp);
  for (const [gate, prefix] of Object.entries(ROWS)) {
    const index = lines.findIndex((line, i) => i > heading && line.startsWith(prefix));
    if (index < 0) fail('SCORECARD', `row "${prefix}" not found under Gates by lane`);
    lines[index] = rows[gate];
  }
  const text = lines.join('\n');
  if (options['dry-run']) { process.stdout.write(text.slice(text.indexOf('## Gates by lane'))); return; }
  fs.writeFileSync(file, text);
  console.log(Object.values(rows).join('\n'));
});
