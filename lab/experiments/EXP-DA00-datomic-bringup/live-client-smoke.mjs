// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-DA00] Why: prove the built TS client reaches the actual gateway and test-only lifecycle fencing. Rejected: mock-only transport evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatomicClient, DatomicHttpError } from '../../../packages/datomic/dist/index.js';
const measurements = JSON.parse(fs.readFileSync(new URL('./receipts/measurements-1.json', import.meta.url), 'utf8'));
const client = new DatomicClient('http://127.0.0.1:8470');
const result = {};
try {
  result.health = await client.health();
  assert.equal(result.health.datomicVersion, '1.0.7745');
  result.basis = await client.basis(measurements.retention.kept.db);
  assert.deepEqual(result.basis, measurements.basisAfterPark);
  const scope = JSON.stringify(['triplex-scope-v1', 'prod', 'generic', 'fenced', '1']);
  for (const action of ['create', 'delete']) {
    await assert.rejects(client[action](scope), error => error instanceof DatomicHttpError && error.status === 400);
  }
  result.productionScopeFenced = true; result.maxSockets = client.agent.maxSockets; result.passed = true;
} finally {
  client.close(); fs.writeFileSync(new URL('./receipts/live-client-smoke.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
}
