import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { admitCore, coreContext } from '../../../bin/claim.mjs';
const root = new URL('../../../../', import.meta.url);
const contract = JSON.parse(fs.readFileSync(new URL('lab/acceptance/obligations.json', root)));
const load = JSON.parse(fs.readFileSync(new URL('lab/acceptance/load-contract.json', root)));
const ctx = () => coreContext(contract, { overrides: { buildSpec: { argv: ['true'], outputs: ['out'], run: ['true'] } } }, load);
test('Q94e refuses every GS kind before any engine or build can grant admission', () => {
  for (const o of contract.obligations.filter(o => o.id.startsWith('GS.'))) {
    for (const kind of ['comparison', 'comparative', 'screening']) {
      const r = admitCore({ obligations: [o.id], kind }, {}, ctx());
      assert.equal(r.verdict, 'DIAGNOSTIC');
      assert.ok(r.reasons.some(v => v.code === 'GS-DIAGNOSTIC'), JSON.stringify(r));
    }
  }
});
test('Q94e also refuses mixed executing claims, without changing document-only structural checks', () => {
  const r = admitCore({ obligations: ['NS.P2','GS.05'], kind: 'comparison' }, {}, ctx());
  assert.equal(r.verdict, 'DIAGNOSTIC');
  assert.ok(r.reasons.some(v => v.code === 'GS-DIAGNOSTIC'));
});
test('Q93/Q91 policy projections and Q94 held acceptance size stay explicit', () => {
  assert.deepEqual(load.freezeProtocol,contract.freezeProtocol);
  assert.equal(contract.qleverEvidencePolicy.deltaOnly,'DIAGNOSTIC');
  assert.equal(contract.goldenScenarioPolicy.acceptanceSize,'Q94a pending; TARGETS unchanged');
});
