// Freezes O-HAM v2 expectations for the O-REPLAY self-check.
// Usage (repo root): node lab/oracles/replay/selfcheck_fixtures/freeze-ham-reference.mjs > lab/oracles/replay/selfcheck_fixtures/ham-v2-reference.json
// Imports only the O-HAM v2 oracle, which itself imports only node:assert/strict.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { EVENTS, SAME_TIME_EVENTS, CASES, lifetime, expectedSnapshot } from '../../../../qualification/capacity/historical-assertion-metadata-v2/oracle.mjs';

const source = new URL('../../../../qualification/capacity/historical-assertion-metadata-v2/oracle.mjs', import.meta.url);
const sha256 = createHash('sha256').update(readFileSync(source)).digest('hex');
const sameTime = [1, 2].map(p => ({ capturedUpperP: p, recordedAt: 2000.25, validAt: 20.25 }));
const out = {
  format: 'o-replay-selfcheck/ham-v2-reference/1',
  source: 'qualification/capacity/historical-assertion-metadata-v2/oracle.mjs',
  sourceSha256: sha256,
  events: EVENTS,
  sameTimeEvents: SAME_TIME_EVENTS,
  lifetime: lifetime(EVENTS),
  cases: CASES.map(c => ({ ...c, expected: expectedSnapshot(EVENTS, c) })),
  sameTimeCases: sameTime.map(c => ({ ...c, expected: expectedSnapshot(SAME_TIME_EVENTS, c) })),
  openEnded: [10.124, 10.125, 1e12].map(v => ({ validAt: v, expected: expectedSnapshot([{ position: 1, recordedAt: 1000.25, txId: 'open-tx', assert: [{ id: 'open', entityId: 'metadata:open', attribute: ':metadata/label', value: { type: 'string', value: 'open' }, entityType: 'MetadataProbe', validFrom: 10.125, validTo: null, createdBy: 'metadata-fixture', schemaVersion: 1 }], retract: [] }], { capturedUpperP: 1, recordedAt: 1000.25, validAt: v }) })),
};
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
