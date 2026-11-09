import { parseLatencyReceipt } from "../../receipts/parse.ts";
// [EXP-W02] Why: all three lanes share the GS floor; unqualified metadata cannot grant admission.
// Rejected: assuming a health probe, directory string or a delta-only count proves world content.
import path from 'node:path';
import fs from 'node:fs';
export const GS_LANES = ['xtdb', 'qlever', 'datomic'];
export function brokerEnv(lane, directory, root) {
  if (lane !== 'qlever') return {};
  if (!directory) throw Error('lane Q GS requires --broker-dir (an owned per-run directory)');
  const dir = path.resolve(directory), owned = fs.realpathSync(root);
  let parent = dir;
  while (!fs.existsSync(parent)) parent = path.dirname(parent);
  const realParent = fs.realpathSync(parent);
  if (!dir.startsWith(path.resolve(root) + path.sep) || !(realParent === owned || realParent.startsWith(owned + path.sep)))
    throw Error('GS broker directory must remain inside runs/ (including symlink targets)');
  return { QLEVER_COMMIT_PATH: 'broker', QLEVER_BROKER_DIR: dir };
}
export function gsRefusals(report, contractVersion) {
  parseLatencyReceipt(report, { source: "GS report" });
  const reasons = [];
  if (!/^0\.(?:[4-9]|[1-9]\d+)\./.test(contractVersion ?? '')) reasons.push('Q94e: pre-0.4.0 GS evidence is DIAGNOSTIC');
  if (report.generator !== 'W02/1') reasons.push('Q94b/c: W0 v2 live generator not active');
  if (report.world?.admission?.status !== 'MATCHING') reasons.push('Q93a/Q94d: missing in-process content admission');
  if (!Object.keys(report.world?.countsStart ?? {}).length || !Object.keys(report.world?.countsEnd ?? {}).length) reasons.push('Q94d: missing store counts at start/end');
  if (report.lane === 'qlever') {
    const q = report.qlever;
    if (q?.commitPath !== 'broker' || !q?.brokerDirectory) reasons.push('lane Q GS must bind its broker path');
    if (!Number.isSafeInteger(q?.baseTriples) || q.baseTriples < 2 || !Number.isSafeInteger(q?.deltaTriples) || q.deltaTriples < 0 ||
        !Number.isSafeInteger(q?.touchedBlockDelta) || q.touchedBlockDelta < 0 || !Number.isSafeInteger(q?.rebuildThreshold) || q.rebuildThreshold < 0 || q.deltaTriples > q.rebuildThreshold)
      reasons.push('Q91a: missing built-base, bounded-delta or touched-block counts');
  }
  for (const s of report.scenarios ?? []) {
    if (s.verdict === 'PASS' && (!s.domainRequests?.length || s.domainRequests.some(d => d.status !== 'PASS')))
      reasons.push(`GS.${s.scenario}: missing fresh O-DOMAIN comparisons`);
  }
  return reasons;
}
