import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test, after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { memoryComposition } from '../../bench/lib/memory.ts';
import { Probe, PROBES, rows, baseFacts } from './probe.ts';
import { CRASH_POINTS, consumerFault, FeedReplica, lostAck } from './faults.ts';
import { canonical, V_W0 } from '../../bench/lib/w0-world.ts';
const make = () => { const scope = randomUUID(), reopen = () => memoryComposition('datomic', scope); return { p: new Probe(reopen(), new URL('../../../runs/W02-r2/replay/', import.meta.url).pathname), reopen }; };
const schedules: any[] = [];
for (const point of CRASH_POINTS) test('offline consumer fault executes and resumes: ' + point, async () => {
  const { p, reopen } = make(); const result = await consumerFault(p, point, reopen);
  schedules.push(result); assert(result.events.some(e => e.point === point && e.phase === 'first')); assert(result.effects > 0);
});
test('lost ACK after publication resolves original receipt after client replacement', async () => {
  const { p, reopen } = make(); const r = await lostAck(p, reopen, rows(baseFacts('pl:a')));
  schedules.push({ kind: 'lost-ack', ...r }); assert.equal(r.first, r.resolved); await p.state('pl:a');
});
test('offline maintenance rebuild does real replay work, pins old reads and routes stale index to source', async () => {
  const { p } = make(); await p.commit(rows(baseFacts('pl:a')));
  const old = await p.comp.currentPosition(), index = new FeedReplica(p.comp);
  await index.rebuild();
  const before = canonical(await index.read('pl:a', old));
  await index.rebuild(async () => { await p.set('pl:a', 'payRateCents', 1850); });
  assert.equal(canonical(await index.read('pl:a', old)), before);
  const head = await p.comp.currentPosition();
  const fallback = await index.read('pl:a', head);
  assert.equal(fallback.find(r => r.attribute === 'payRateCents')!.value.value, '1850');
  assert(index.events.some(e => e.kind === 'fallback' && e.waitedMs <= 10));
  await index.rebuild(); assert.equal(index.watermark, head);
  const fresh = await index.read('pl:a', head);
  assert.deepEqual(fresh.map(r => [r.entityId, r.attribute, r.value]), fallback.map(r => [r.entityId, r.attribute, r.value]));
  assert(index.events.filter(e => e.kind === 'memory-index-rebuild').every(e => e.assertions > 0));
  schedules.push({ kind: 'maintenance', events: index.events });
  await p.state('pl:a', head);
});

after(() => { PROBES.forEach(p => p.finish()); if (process.env.TX2_W02_PROBE_REPORT) fs.writeFileSync(path.join(path.dirname(process.env.TX2_W02_PROBE_REPORT), 'fault-probes.json'), JSON.stringify({ schedules, probes: PROBES.map(p => ({ attempt: p.attempt, scope: p.comp.scopeName, sourceSha256: p.sourceSha256, commands: p.commands, checks: p.checks, oracleCases: p.oracleCases })) }, null, 1)); });
