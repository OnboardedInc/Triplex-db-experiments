// [EXP-E01] Why: retain exact reference-call agreement as a reviewable receipt. Rejected: inferring agreement from exit zero.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { admitCore, canonText, coreContext } from '../../bin/claim.mjs';
import { buildFixtures, evaluateLab, evaluateReference } from '../../bin/test/claim-fixtures.mjs';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tx2-e01-replay-'));
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const dec = v => object(v) && Object.keys(v).length === 1 && '$bytes' in v ? Buffer.from(v.$bytes, 'base64') : Array.isArray(v) ? v.map(dec) : object(v) ? Object.fromEntries(Object.entries(v).map(([k,x]) => [k,dec(x)])) : v;
const compiledOnly = ['definitionSha256','needsNewOracle','status','verifierMode'];
const enc = v => Buffer.isBuffer(v) ? {$bytes:v.toString('base64')} : v === undefined ? null : Array.isArray(v) ? v.map(enc) : object(v) ? Object.fromEntries(Object.entries(v).filter(([k]) => !('closure' in v && 'id' in v && compiledOnly.includes(k))).map(([k,x]) => [k,enc(x)])) : v;
try {
  const built = buildFixtures(root), ref = evaluateReference(built);
  const contract = JSON.parse(fs.readFileSync(new URL('../../acceptance/obligations.json',import.meta.url)));
  const load = JSON.parse(fs.readFileSync(new URL('../../acceptance/load-contract.json',import.meta.url)));
  const disagree = []; let calls = 0;
  for (const f of ref.contractFixtures) {
    let i = 0;
    const fn = name => (...args) => {
      const c = f.ev.calls[i++];
      if (!c || c.fn !== name || canonText(enc(args)) !== canonText(c.args)) throw new Error(`call ${i}: ${name} differs`);
      return dec(c.result);
    };
    const ev = f.ev ? {slots:f.ev.slots,...Object.fromEntries(f.ev.keys.map(k => [k,fn(k)]))} : null;
    try {
      const r = admitCore(f.claim,ev,coreContext(contract,{pins:f.pins,w0:f.w0,a0:f.a0,verifiers:f.verifiers,pinned:f.pinned,overrides:f.overrides},load));
      if (r.verdict !== f.verdict || i !== (f.ev?.calls.length ?? 0)) disagree.push({line:f.line,expected:f.verdict,actual:r.verdict,calls:i,expectedCalls:f.ev?.calls.length ?? 0});
    } catch(e) { disagree.push({line:f.line,error:e.message}); }
    calls += f.ev?.calls.length ?? 0;
  }
  const documents = built.fixtures.map(f => ({id:f.id,reference:ref.documents[f.id].verdict,lab:evaluateLab(f,built.objects).verdict}));
  const receipt = {contractVersion:contract.version,selfCheckErrors:ref.selfCheckErrors,fixtures:ref.contractFixtures.length,executorCalls:calls,agree:ref.contractFixtures.length-disagree.length,disagree,documents};
  process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
  if (disagree.length || ref.selfCheckErrors.length || documents.some(d => d.reference !== d.lab)) process.exitCode = 1;
} finally { fs.rmSync(root,{recursive:true,force:true}); }
