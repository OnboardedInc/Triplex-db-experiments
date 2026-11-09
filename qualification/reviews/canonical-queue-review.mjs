// @ts-nocheck -- [EXP-CHECKJS] runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing; option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openContext } from '../devloop/state.mjs';
import { loadRun, calibrate, compare, promotionVerify } from '../devloop/compare.mjs';
import { hashFile } from '../devloop/io.mjs';
const root = path.resolve(import.meta.dirname, '../..');
const id = randomUUID(), alternate = `.artifacts/canonical-queue-review-${id}`;
await assert.rejects(openContext(root, { stateDirectory: alternate }), { code: 'PRODUCTION_QUEUE' });
await assert.rejects(fs.stat(path.join(root, alternate)), { code: 'ENOENT' });
const context = await openContext(root, { stateDirectory: alternate, testPolicy: { format: 'triplex-devloop-policy/1', maximumHeavyTrials: 3, memoryPoolBytes: 64 * 1024 ** 2, cpuPoolUnits: 1, lanes: { 'qlever-native': 'qlever' }, promotion: {} } });
await assert.rejects(loadRun(context, 'missing/0001'), { code: 'COMPONENT_ONLY' });
await assert.rejects(calibrate(context, ['missing/0001'], alternate + '/forbidden.json'), { code: 'COMPONENT_ONLY' });
await assert.rejects(compare(context, ['missing/0001'], ['missing/0002'], alternate + '/forbidden.json'), { code: 'COMPONENT_ONLY' });
await assert.rejects(promotionVerify(context, { candidate: 'missing/0001' }), { code: 'COMPONENT_ONLY' });
const receipt = { format: 'triplex-independent-canonical-queue-review/1', reviewer: 'qlever-agent', author: 'duckdb-agent', status: 'PASS_COMPONENT_ONLY', checks: ['Production alternate queue refused before directory creation', 'Explicit component metadata retained', 'Component loadRun refused', 'Component calibration refused', 'Component comparison refused', 'Component promotion refused'], sourceHashes: Object.fromEntries(await Promise.all(['qualification/devloop/state.mjs', 'qualification/devloop/compare.mjs', 'qualification/reviews/canonical-queue-review.mjs'].map(async file => [file, await hashFile(path.join(root, file))]))), engineQualification: 'NOT_CLAIMED' };
const output = path.join(root, alternate, 'review.json');await fs.writeFile(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });console.log(JSON.stringify({ output, status: receipt.status, checks: receipt.checks.length }));
