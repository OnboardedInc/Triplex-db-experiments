// [EXP-A01-0312] Why: a complete parser pin accepted for screening is insufficient acceptance authority. Rejected: treating pin existence as verifier recollection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { coreContext, contractBlockers } from '../../../bin/claim.mjs';

const contract = JSON.parse(fs.readFileSync(new URL('../../../acceptance/obligations.json', import.meta.url)));
const obligation = contract.obligations.find(o => o.oracles.includes('O-OBS'));
test('real O-OBS screening pin remains diagnostic despite complete runner hashes', () => {
  const reasons = contractBlockers([obligation], [], false, coreContext(contract));
  assert.ok(reasons.some(r => r.code === 'ORACLE-SCREENING-ONLY' && r.detail.includes('O-OBS')));
  assert.ok(!reasons.some(r => r.code === 'ORACLE-RUNNER-UNPINNED' && r.detail.includes('O-OBS')));
});
test('screening restriction follows explicit pin scope rather than oracle label', () => {
  const fixture = structuredClone(contract);
  fixture.oraclePins['O-OBS'].acceptanceLevel = 'fixture-full';
  const reasons = contractBlockers([obligation], [], false, coreContext(fixture));
  assert.ok(!reasons.some(r => r.code === 'ORACLE-SCREENING-ONLY'));
});
test('incomplete transitive O-OBS runner pin refuses independently of screening scope', () => {
  const fixture = structuredClone(contract);
  delete fixture.oraclePins['O-OBS'].sha256['lab/oracles/replay/cli.py'];
  const reasons = contractBlockers([obligation], [], false, coreContext(fixture));
  assert.ok(reasons.some(r => r.code === 'ORACLE-RUNNER-UNPINNED' && r.detail.includes('O-OBS')));
  assert.ok(reasons.some(r => r.code === 'ORACLE-SCREENING-ONLY'));
});
