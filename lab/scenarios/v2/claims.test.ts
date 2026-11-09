import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after } from 'node:test';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { memoryComposition } from '../../bench/lib/memory.ts';
import { canonical, V_W0 } from '../../bench/lib/w0-world.ts';
import { Probe, PROBES, rows, baseFacts, decision } from './probe.ts';
import { reconcileClaim, affectedClaim, dashboardClaim } from './claims.ts';
const make = () => new Probe(memoryComposition('xtdb', 'W02-r2-' + randomUUID()), new URL('../../../runs/W02-r2/replay/', import.meta.url).pathname);
const has = (o: any, rule: string) => o.tasks.some((t: any) => t.rule === rule);
test('GS01 next task is checked at the submit receipt; old basis remains unchanged', async () => {
  const p = make(); await p.commit(rows(baseFacts('pl:a')));
  const old = await p.comp.currentPosition();
  assert(has((await reconcileClaim(p, 1, 'pl:a', old)).output, 'I9S1'));
  const r = await p.commit(rows([{ e: 'pl:a', a: 'section1AttestedAt', v: '2026-11-04T12:00:00.000000Z' }, { e: 'pl:a', a: 'ssn', v: '123456789' }]));
  assert(r.ok); if (!r.ok) return;
  const after = await reconcileClaim(p, 1, 'pl:a', r.value.position);
  assert(!has(after.output, 'I9S1')); assert(has(after.output, 'I9S2'));
  assert(has(await p.domain('pl:a', 'R1', old), 'I9S1'));
});
test('GS05 changed subject background obligation clears and negative witness stays unchanged', async () => {
  const p = make(); await p.commit(rows(baseFacts('pl:a'))); await p.commit(rows(baseFacts('pl:b', 'loc:b')));
  const before = await p.domain('pl:b');
  assert(has((await p.domain('pl:a')), 'BGC'));
  await p.set('pl:a', 'bgcStatus', 'clear');
  assert(!has((await reconcileClaim(p, 5, 'pl:a')).output, 'BGC'));
  const after = await p.domain('pl:b');
  assert.deepEqual(after.tasks, before.tasks);
});
test('GS06 exact two-hop affected set is persisted with checkpoint and all subjects rerun', async () => {
  const p = make(); await p.commit(rows(baseFacts('pl:a'))); await p.commit(rows(baseFacts('pl:b', 'loc:b')));
  await p.set('jur:a', 'stateMinWageCents', 1850);
  const result = await affectedClaim(p, ['pl:a', 'pl:b'], [['jur:a', 'stateMinWageCents']]);
  assert.deepEqual(result.affected, ['pl:a']);
  assert(has((await reconcileClaim(p, 6, 'pl:a')).output, 'MINWAGE'));
  assert(!has(await p.domain('pl:b'), 'MINWAGE'));
});
test('GS09 obligations move and persisted next boundary recomputes', async () => {
  const p = make(); await p.commit(rows(baseFacts('pl:a')));
  const before = await reconcileClaim(p, 9, 'pl:a');
  await p.set('pl:a', 'startDate', '2026-11-16');
  const after = await reconcileClaim(p, 9, 'pl:a');
  assert.notDeepEqual(after.output.obligations, before.output.obligations);
  const stored = await p.state('gs:dependency:pl:a');
  assert.equal(JSON.parse(stored.observed.facts[0].v as string).nextTemporalBoundary, '2026-11-16T00:00:00.000000Z');
});
test('GS17 agent proposal cannot resolve I9; a subsequent human decision can', async () => {
  const p = make(); await p.commit(rows(baseFacts('pl:a')));
  await p.commit(decision('pl:a', 'agent', 'agent'));
  assert(has((await reconcileClaim(p, 17, 'pl:a')).output, 'I9S2'));
  await p.commit(decision('pl:a', 'human', 'person'));
  assert(!has((await reconcileClaim(p, 17, 'pl:a')).output, 'I9S2'));
});
test('GS18 persisted overdue projection has stable paging at a named basis during writes', async () => {
  const p = make(); await p.commit(rows(baseFacts('pl:a'))); await p.commit(rows(baseFacts('pl:b', 'loc:b')));
  await p.commit(decision('pl:b', 'human', 'person'));
  const V = Date.UTC(2026, 10, 10), result = await dashboardClaim(p, ['pl:a', 'pl:b'], V);
  assert.deepEqual(result.projection.subjects, ['pl:a']);
  await p.commit(decision('pl:a', 'human', 'person'));
  await dashboardClaim(p, ['pl:a', 'pl:b'], V);
  const old = await p.state('gs:dashboard', result.pin);
  assert.equal(old.observed.facts[0].v, canonical(result.projection));
});
test('state comparator rejects changed memory value rather than agreeing on the same wrong world', async () => {
  const p = make(); await p.commit(rows(baseFacts('pl:a')));
  const original = p.comp.sweepPage;
  p.comp.sweepPage = async (...args) => { const page = await original(...args); return { ...page, rows: page.rows.map(r => r.attribute === 'payRateCents' ? { ...r, value: { type: 'integer', value: '9999' } } : r) }; };
  await assert.rejects(p.domain('pl:a'), /observed content differs/);
});

test('an invalid tail operation rejects atomically before a position or first assertion is published', async () => {
  const p = make(); await p.commit(rows(baseFacts('pl:a'))); const P = await p.comp.currentPosition();
  const result = await p.commit([
    ...rows([{ e: 'pl:a', a: 'weeklyMinutes', v: 3000 }]),
    { op: 'assert', entityId: 'pl:a', attribute: 'payRateCents', value: { type: 'integer', value: '9223372036854775808' }, validFrom: V_W0 },
  ]);
  assert(!result.ok); if (!result.ok) assert.equal(result.tag, 'InvalidTripleError');
  assert.equal(await p.comp.currentPosition(), P); await p.state('pl:a');
});

test('a valid command rejected by the source fails even when the old-position snapshot still matches', async () => {
  const p = make(); await p.commit(rows(baseFacts('pl:a')));
  p.comp.transact = async () => ({ ok: false, tag: 'WriteError', error: { _tag: 'WriteError' } });
  await p.set('pl:a', 'bgcStatus', 'clear');
  await assert.rejects(p.state('pl:a'), /command-outcome/);
});

after(() => { PROBES.forEach(p => p.finish()); if (process.env.TX2_W02_PROBE_REPORT) fs.writeFileSync(process.env.TX2_W02_PROBE_REPORT, JSON.stringify(PROBES.map(p => ({ attempt: p.attempt, scope: p.comp.scopeName, endpoint: p.comp.backend.url, commands: p.commands, outcomes: p.outcomes, checks: p.checks, claims: p.claims, oracleCases: p.oracleCases })), null, 1)); });
