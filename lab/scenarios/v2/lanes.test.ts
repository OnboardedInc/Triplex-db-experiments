import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { memoryComposition } from '../../bench/lib/memory.ts';
import { portableSweep } from '../../bench/lib/w0-public.ts';
import { openScenarioLane, requireLayout, type LaneBinding } from './lanes.ts';
import { V_W0 } from '../../bench/lib/w0-world.ts';
const root = new URL('../../../', import.meta.url).pathname;
const binding = (lane: 'datomic' | 'qlever'): LaneBinding => { const scope = randomUUID(); return { lane, scope, endpoint: `memory://${scope}`, attempt: randomUUID(), sourceSha256: 'source-of-this-attempt' }; };
test('D lane selection opens D, records receipts and reopens the same source', async () => {
  const b = binding('datomic'), calls: string[] = [];
  const port = await openScenarioLane(b, { root, open: async (lane, scope) => { calls.push(lane); return memoryComposition(lane, scope); } });
  const r = await port.comp.transact([{ op: 'assert', entityId: 'pl:a', attribute: 'weeklyMinutes', value: { type: 'integer', value: '2400' }, validFrom: V_W0 }], { commandId: 'd-command' });
  assert(r.ok); if (!r.ok) return;
  const reopened = await openScenarioLane(b, { root, open: async (lane, scope) => memoryComposition(lane, scope) });
  assert.equal((await reopened.comp.transactionByCommand('d-command')).ok, true);
  assert.equal((await reopened.comp.sweepPage(['pl:a'], { position: r.value.position, validAt: V_W0 })).rows[0].value.value, '2400');
  assert.deepEqual(calls, ['datomic']);
  await assert.rejects(openScenarioLane(b, { root, open: async (_lane, scope) => memoryComposition('xtdb', scope) }), /differs/);
});
test('Q broker factory receives explicit selection and fresh base/delta observations are bound in receipt', async t => {
  const fixture = fs.mkdtempSync(root + '.w02-lane-test-');
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const fixtureRoot = fixture + '/';
  fs.mkdirSync(fixtureRoot + 'runs', { recursive: true });
  const b = binding('qlever'); let measured = 0;
  const port = await openScenarioLane(b, { root: fixtureRoot, brokerDirectory: fixtureRoot + 'runs/W02-r2/broker',
    open: async (lane, scope, env) => { assert.equal(env.QLEVER_COMMIT_PATH, 'broker'); assert(env.QLEVER_BROKER_DIR.endsWith('/broker')); return memoryComposition(lane, scope); },
    layoutReader: async current => { measured++; return { binding: { ...current }, counts: { baseTriples: 10000000, deltaTriples: measured, touchedBlockDelta: 1, rebuildThreshold: 1000, baseGeneration: 'built-g1' } }; } });
  assert.equal(port.initialLayout!.deltaTriples, 1);
  assert.equal((await port.layout())!.deltaTriples, 2);
  assert.equal(port.initialLayout!.brokerDirectory, fixtureRoot + 'runs/W02-r2/broker');
  for (const counts of [{ baseTriples: 1, deltaTriples: 1, touchedBlockDelta: 1, rebuildThreshold: 2 }, { baseTriples: 10, deltaTriples: 3, touchedBlockDelta: 1, rebuildThreshold: 2 }])
    assert.throws(() => requireLayout({ binding: b, counts: { ...counts, baseGeneration: 'g' } }, b), /Q91a/);
  assert.throws(() => requireLayout({ binding: { ...b, attempt: 'old' }, counts: port.initialLayout! }, b), /stale/);
});
test('D/Q portable read adapter passes position to storage and refuses a future row', async () => {
  const bases: any[] = [];
  const handle: any = { scope: 'd', run: async (x: any) => x, triples: {}, storage: {
    currentCommitPosition: () => 3,
    getByEntities: (_entities: any, b: any) => { bases.push(b); return new Map([['pl:a', [{ id: '1', entity_id: 'pl:a', attribute: 'weeklyMinutes', value_type: 'integer', value_string: '2400', recorded_position: b.recordedPosition, valid_from: V_W0 }]]]); },
  } };
  const sweep = portableSweep(handle);
  const r = await sweep.page(['pl:a'], { position: 2, validAt: V_W0 });
  assert.equal(r.rows[0].position, 2); assert.equal(bases[0].recordedPosition, 2);
  await assert.rejects(sweep.page(['pl:a'], { position: 4, validAt: V_W0 }), /explicit available/);
  handle.storage.getByEntities = () => new Map([['pl:a', [{ recorded_position: 3 }]]]);
  await assert.rejects(sweep.page(['pl:a'], { position: 2, validAt: V_W0 }), /outside/);
});
