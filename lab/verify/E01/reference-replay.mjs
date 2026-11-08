// V-E01 check 7: replay every admit_claim call of the contract's self-check (claim_ref.py over build_contract.py 0.3.9) through
// claim.mjs admitCore, and count calls, verdicts, executor calls and disagreements. Usage: node lab/verify/E01/reference-replay.mjs
// The replay logic is the same as lab/bin/test/claim.test.mjs test 1, restated here so the counts are printed, not just asserted.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { admitCore, canonText, coreContext } from '../../bin/claim.mjs';
import { buildFixtures, evaluateReference } from '../../bin/test/claim-fixtures.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-ve01-ref-'));
const built = buildFixtures(root);
const ref = evaluateReference(built);
const CONTRACT = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../acceptance/obligations.json'), 'utf8'));
const LOAD = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../acceptance/load-contract.json'), 'utf8'));
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const dec = v => isObj(v) && Object.keys(v).length === 1 && '$bytes' in v ? Buffer.from(v.$bytes, 'base64') : Array.isArray(v) ? v.map(dec) : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)])) : v;
const COMPILED_ONLY = ['definitionSha256', 'needsNewOracle', 'status', 'verifierMode'];
const enc = v => Buffer.isBuffer(v) ? { $bytes: v.toString('base64') } : v === undefined ? null : Array.isArray(v) ? v.map(enc)
  : isObj(v) ? Object.fromEntries(Object.entries(v).filter(([k]) => !('closure' in v && 'id' in v && COMPILED_ONLY.includes(k))).map(([k, x]) => [k, enc(x)])) : v;
function replay(rec) {
  let i = 0;
  const fn = name => (...args) => {
    const c = rec.calls[i];
    if (!c || c.fn !== name || canonText(enc(args)) !== canonText(c.args)) throw new Error(`call ${i}: admitCore made ${name}, the contract ${c?.fn ?? 'no further call'}`);
    i++;
    return dec(c.result);
  };
  return { ev: { slots: rec.slots, ...Object.fromEntries(rec.keys.map(k => [k, fn(k)])) }, made: () => i };
}
const out = { contractVersion: ref.contractVersion ?? CONTRACT.version, selfCheckErrors: ref.selfCheckErrors, fixtures: 0, byVerdict: {}, executorCalls: 0, agree: 0, disagree: [], withKind: [], documents: { n: 0, diagnostic: 0 } };
for (const f of ref.contractFixtures) {
  const r_ = f.ev && replay(f.ev);
  let r;
  try { r = admitCore(f.claim, r_?.ev ?? null, coreContext(CONTRACT, { pins: f.pins, w0: f.w0, a0: f.a0, verifiers: f.verifiers, pinned: f.pinned, overrides: f.overrides }, LOAD)); } catch (error) { r = { verdict: 'DIVERGED', reasons: [{ detail: error.message }] }; }
  out.fixtures++;
  out.byVerdict[f.verdict] = (out.byVerdict[f.verdict] ?? 0) + 1;
  out.executorCalls += f.ev?.calls.length ?? 0;
  if (f.claim && Object.prototype.hasOwnProperty.call(f.claim, 'kind')) out.withKind.push({ line: f.line, kind: f.claim.kind, verdict: f.verdict });
  if (r.verdict === f.verdict && (!r_ || r_.made() === f.ev.calls.length)) out.agree++;
  else out.disagree.push({ line: f.line, label: f.label, contract: f.verdict, admitCore: r.verdict, detail: r.reasons[0]?.detail?.slice(0, 200) });
}
for (const v of Object.values(ref.documents)) { out.documents.n++; if (v.verdict === 'DIAGNOSTIC') out.documents.diagnostic++; }
console.log(JSON.stringify(out, null, 2));
fs.rmSync(root, { recursive: true, force: true });
