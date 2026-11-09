import './source-hook.mjs';
import fs from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
const { runFeedCrashConformance } = await import('@triplex-build/triplex-testkit/feed');
// [CX-VFD01] Why: inject visible duplicates using actual stop/restart deliveries, not invented booleans.
// Rejected: treating an at-least-once delivery alone as a defect (only duplicate visible effects are forbidden).
const dir = `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VFD01/duplicates-${randomUUID()}`;
fs.mkdirSync(dir, { recursive: true });
const page = { cursor: { source: 'generic-test/source', token: '1' }, entries: [] };
const affected = [{ epoch: '1', position: '1', subject: 'subject' }];
const input = dir + '/input.json'; fs.writeFileSync(input, JSON.stringify({ page, affected }));
const child = fileURLToPath(new URL('./split-child.mjs', import.meta.url));
const sources = Object.fromEntries(['duplicate-probe.mjs', 'split-child.mjs', 'source-hook.mjs', '../../../packages/testkit/src/feed/index.ts'].map((p) => [p, createHash('sha256').update(fs.readFileSync(new URL(p, import.meta.url))).digest('hex')]));
const observations = [];
let rejection;
try {
  await runFeedCrashConformance(async (point, attempt, arm) => {
    const file = `${dir}/${arm}-${point}-${attempt}.db`;
    for (const p of [point, 'resume']) {
      // Both labelled arms deliberately use an UNKEYED implementation under test.
      const result = spawnSync(process.execPath, [child, file, input, 'unkeyed-split', p], { encoding: 'utf8' });
      assert.equal(result.status, p === 'resume' ? 0 : 77, result.stderr);
    }
    const db = new DatabaseSync(file);
    const effects = db.prepare('SELECT epoch,position,subject FROM effects').all();
    const gotAffected = db.prepare('SELECT epoch,position,subject FROM affected').all();
    const gotCheckpoint = db.prepare('SELECT source,token FROM checkpoint').get();
    db.close();
    const keys = effects.map((e) => JSON.stringify(e));
    const observation = { crashed: true, gaps: affected.filter((a) => !keys.includes(JSON.stringify(a))).length,
      duplicateEffects: keys.length - new Set(keys).size, affectedMatches: JSON.stringify(gotAffected) === JSON.stringify(affected),
      checkpointMatches: JSON.stringify(gotCheckpoint) === JSON.stringify(page.cursor),
      resumeBytesMatch: fs.readFileSync(input, 'utf8') === JSON.stringify({ page, affected }) };
    observations.push({ point, attempt, arm, observation });
    return observation;
  });
} catch (e) { rejection = String(e); }
assert.equal(rejection, 'Error: Keyed crash failed: after-effect/0');
assert.equal(observations.at(-1).observation.duplicateEffects, 1);
const result = { dir, sources, rejection, actualCrashes: observations.length, actualRestarts: observations.length, last: observations.at(-1), engines: false, slot: null };
fs.writeFileSync(dir + '/observations.json', JSON.stringify(observations, null, 2));
fs.writeFileSync(dir + '/result.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
