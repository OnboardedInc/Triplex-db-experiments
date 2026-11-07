#!/usr/bin/env node
// lab/bin/status.mjs [--ref main | (working tree)] [--tree SOURCE-TREE-ID] [--json]
// Evaluates the obligations lab/bin gates can produce receipts for (G1.found.unchanged44,
// PKT.full142) against lab/acceptance/obligations.json, per ACCEPTANCE.md 5.1 (V1-V16) and 5.3.
// Every other obligation is reported OPEN (no producing gate yet). Read-only.
// [EXP-000] Why: closure must be computed from receipts by rule, not read off a status flag.
// Rejected: trusting receipt.verdict (it is the gate's own opinion; the contract decides).
import fs from 'node:fs';
import path from 'node:path';
import { REPO, git, loadSlots, main, parseArgs, sourceIdentity } from './lib.mjs';
import { GATE_OBLIGATIONS } from './receipt.mjs';

const LANE_LANGUAGE = { 'xtdb-xtql': 'xtql', 'xtdb-sql': 'xtdb-sql', 'qlever-sparql': 'sparql-1.1' };
const GATE_OF = Object.fromEntries(Object.entries(GATE_OBLIGATIONS).map(([gate, id]) => [id, gate]));

/** Validity of one receipt for obligation o and lane L on tree T. Returns failing rule notes. */
export function validity({ receipt, file, o, lane, tree, contract, pins, receipts }) {
  const bad = [];
  const engine = contract.engineOfLane[lane];
  if (!/^lab\/runs\/G\d\/[^/]+\.json$/.test(file) || receipt.format !== 'tx2-gate-receipt/1' || path.basename(file, '.json') !== receipt.runId) bad.push('V1');
  if (receipt.git?.sourceTreeId !== tree) bad.push('V2 tree differs');
  if (!receipt.build?.manifestSha256 || !receipt.build?.packages) bad.push('V3');
  if (!receipt.lockfileSha256 || !receipt.toolchain?.node || !receipt.toolchain?.pnpm) bad.push('V4');
  if (receipt.engine?.imageId !== pins[engine] || !receipt.engine?.configSha256) bad.push('V5');
  if (!receipt.contactedEndpoint || receipt.contactedEndpoint !== receipt.engine?.endpoint || /:(15442|17019)\b/.test(receipt.contactedEndpoint)) bad.push('V6');
  bad.push('V7 unenforceable: contract pins no gate/oracle/case-set hashes and no oracle is ACCEPTED');
  if (!receipt.scopes?.fresh || (receipt.gate === 'G2' && !receipt.packet?.sha256)) bad.push('V8');
  if (!(receipt.objects ?? []).some(entry => entry.role === 'raw-outcome')) bad.push('V9');
  const c = receipt.counts ?? {};
  if (c.executed !== o.cases.executions || c.skip !== 0 || (c.statuses?.UNSUPPORTED_PUBLIC_API ?? 0) !== 0) bad.push(`V10 executed ${c.executed}/${o.cases.executions}, skip ${c.skip}`);
  if (o.receiptScope === 'lane') {
    const want = LANE_LANGUAGE[lane];
    const impure = (receipt.cases ?? []).filter(k => !k.languages?.length || k.languages.some(l => l !== want)).length;
    if (impure) bad.push(`V11 ${impure} executions with a substep not in ${want}`);
  }
  if (receipt.runKind !== 'acceptance') bad.push(`V12 runKind ${receipt.runKind}`);
  const verified = receipts.some(r => r.receipt.runKind === 'verifier' && r.receipt.git?.sourceTreeId === tree && r.receipt.gate === receipt.gate
    && r.receipt.lane === receipt.lane && r.receipt.verdict === 'PASS' && r.receipt.engine?.holder !== receipt.engine?.holder);
  if (!verified) bad.push('V13 no verifier receipt from a different holder');
  const claim = (receipt.obligations ?? []).find(item => item.id === o.id);
  if (!claim || claim.definitionSha256 !== o.definitionSha256 || !claim.lanes.includes(lane)) bad.push('V14');
  if (!receipt.engine || !receipt.containers || !receipt.coRunning || !receipt.diskAfter) bad.push('V15');
  const failedBefore = receipts.some(r => r.receipt.runKind === 'acceptance' && r.receipt.git?.sourceTreeId === tree
    && (r.receipt.obligations ?? []).some(item => item.id === o.id && item.lanes.includes(lane)) && r.receipt.verdict !== 'PASS');
  if (failedBefore) bad.push('V16 a failing acceptance receipt exists on this tree');
  return bad;
}

export function passAll({ receipt, o }) {
  const modes = o.closure.params?.modes ?? ['current'];
  const cases = receipt.cases ?? [];
  const ids = new Set(cases.map(k => k.caseId));
  const complete = cases.length === o.cases.executions && cases.length === ids.size * modes.length
    && modes.every(mode => cases.filter(k => k.mode === mode).length === ids.size);
  return complete && cases.every(k => k.status === 'PASS');
}

main(async () => {
  const { options } = parseArgs(process.argv.slice(2));
  const read = options.ref
    ? (file => git(['show', `${options.ref}:${file}`]))
    : (file => fs.readFileSync(path.join(REPO, file), 'utf8'));
  const contract = JSON.parse(read('lab/acceptance/obligations.json'));
  const list = options.ref
    ? (git(['ls-tree', '-r', '--name-only', options.ref, '--', 'lab/runs']) ?? '').split('\n')
    : fs.existsSync(path.join(REPO, 'lab/runs')) ? fs.readdirSync(path.join(REPO, 'lab/runs')).flatMap(g => fs.readdirSync(path.join(REPO, 'lab/runs', g)).map(f => `lab/runs/${g}/${f}`)) : [];
  const receipts = list.filter(f => f.endsWith('.json')).map(file => { try { return { file, receipt: JSON.parse(read(file)) }; } catch { return null; } }).filter(Boolean);
  const tree = options.tree ?? sourceIdentity().sourceTreeId;
  const slots = loadSlots();
  const pins = Object.fromEntries(Object.entries(slots.lanes).map(([lane, conf]) => [lane, conf.imageId]));
  const rows = [];
  for (const o of contract.obligations) for (const lane of o.lanes) {
    const gate = GATE_OF[o.id];
    if (!gate) { rows.push({ obligation: o.id, lane, status: 'OPEN', why: 'no lab/bin gate produces receipts for it yet' }); continue; }
    const engine = contract.engineOfLane[lane];
    const candidates = receipts.filter(r => r.receipt.gate === gate && r.receipt.lane === engine);
    let best = null;
    for (const r of candidates) {
      const bad = validity({ receipt: r.receipt, file: r.file, o, lane, tree, contract, pins, receipts });
      if (!passAll({ receipt: r.receipt, o })) bad.push('CR-PASS-ALL');
      if (!best || bad.length < best.bad.length) best = { file: r.file, bad };
    }
    const closed = best && best.bad.length === 0 && o.grounding !== 'policy-pending';
    rows.push({ obligation: o.id, lane, status: closed ? 'CLOSED' : 'OPEN',
      why: best ? `${best.file}: ${best.bad.join('; ')}` : `no ${gate} ${engine} receipt`, });
  }
  if (options.json) { console.log(JSON.stringify({ contractVersion: contract.version, tree, rows }, null, 2)); return; }
  console.log(`contract ${contract.version} (${contract.status.split(':')[0]}), candidate tree ${tree.slice(0, 16)}, ${receipts.length} receipts${options.ref ? ' on ' + options.ref : ' in the working tree'}`);
  const closed = rows.filter(r => r.status === 'CLOSED').length;
  console.log(`closed ${closed} of ${rows.length} obligation-lane pairs`);
  for (const row of rows.filter(r => GATE_OF[r.obligation])) console.log(`  ${row.status.padEnd(6)} ${row.obligation} ${row.lane}: ${row.why}`);
  console.log(`  OPEN   ${rows.filter(r => !GATE_OF[r.obligation]).length} other obligation-lane pairs: no producing gate yet`);
});
