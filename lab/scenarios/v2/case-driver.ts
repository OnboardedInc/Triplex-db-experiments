// [EXP-W02-R2] Why: every CS-GS member resolves to authored inputs and executable observations.
// Rejected: an inventory entry whose witness selector is never run or whose missing capability counts as PASS.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { memoryComposition } from '../../bench/lib/memory.ts';
import { W0, canonical, V_W0 } from '../../bench/lib/w0-world.ts';
import { Probe, rows, baseFacts, decision } from './probe.ts';
import { reconcileClaim, affectedClaim, dashboardClaim } from './claims.ts';
import { consumerFault, lostAck, FeedReplica } from './faults.ts';
import { openScenarioLane } from './lanes.ts';
import { probeSourceIdentity } from './probe.ts';
import type { Lane } from '../../bench/lib/triplex.ts';
// @ts-ignore -- manifest authoring is deterministic ESM JavaScript.
import { caseManifest } from './cases.mjs';
const base = new URL('../../../', import.meta.url).pathname;
const semantic = (world: any) => canonical(world.facts.map((f: any) => [f.e, f.a, f.v]).sort((a: any, b: any) => canonical(a).localeCompare(canonical(b))));
export async function runCase(id: string, lane: Lane, dir: string) {
  const manifest = caseManifest(), entry = manifest.cases.find((c: any) => c.id === id);
  if (!entry) throw Error('unknown CS-GS member: ' + id);
  const scope = 'W02-case-' + randomUUID(), reopen = () => memoryComposition(lane, scope);
  fs.mkdirSync(path.join(base, 'runs'), { recursive: true });
  let layoutRead = 0;
  const lanePort = await openScenarioLane({ lane, scope, endpoint: `memory://${scope}`, attempt: randomUUID(), sourceSha256: probeSourceIdentity() }, {
    root: base, brokerDirectory: path.join(base, 'runs/W02-r2/broker', scope), open: async (selected, key) => memoryComposition(selected, key),
    layoutReader: async binding => ({ binding: { ...binding }, counts: { baseTriples: 1024, deltaTriples: ++layoutRead, touchedBlockDelta: 1, rebuildThreshold: 100, baseGeneration: 'OFFLINE-FAKE-g1' } }),
  });
  const p = new Probe(lanePort.comp, path.join(dir, id, 'replay'));
  let status = 'OFFLINE-MATCH', reason: string | null = null;
  const details: any = {};
  try {
    assert.equal(entry.fixture.validAt, V_W0);
    await p.commit(rows(entry.fixture.initialFacts));
    const beforeP = await p.state('pl:p'), beforeN = await p.state('pl:n');
    const scenario = entry.scenario ?? ({ 'GS-06B-SHARED-REFERENCE': 6, 'GS-04B-INDEX-PARTITION': 4, 'GS-19B-OUTBOX-CRASH': 19, 'GS-10-11-COMMON-BASIS': 10 } as Record<string, number>)[id];
    if (id === 'GS-03-SUPERSEDED-REVISION') {
      // W0-1.1.2 has no signal-ack operation: exercise the refusal, preserve the expected result.
      assert(!W0.OPS.includes('signal-ack' as any)); status = 'BLOCKED'; reason = 'W0-1.2 signal-ack is not available';
    } else if (id === 'GS-NUM-RANGE-1650' || id === 'GS-NUM-HOURS-40') {
      const rate = id === 'GS-NUM-RANGE-1650';
      await p.set('jur:a', 'stateMinWageCents', 1650);
      for (const value of rate ? entry.fixture.parameters.wageSamples : entry.fixture.parameters.minutesSamples) {
        await p.set('pl:p', rate ? 'payRateCents' : 'weeklyMinutes', value);
        const output = await p.domain('pl:p');
        const fires = output.flags.some((f: any) => f.rule === (rate ? 'MINWAGE' : 'OT')) || output.tasks.some((t: any) => t.rule === (rate ? 'MINWAGE' : 'OT')) || output.workItems.some((w: any) => w.rule === (rate ? 'MINWAGE' : 'OT'));
        assert.equal(fires, rate ? value < 1650 : value > 2400);
      }
    } else if (id === 'GS-NUM-UNHOLDABLE') {
      const P = await p.comp.currentPosition();
      const r = await p.commit([{ op: 'assert', entityId: 'pl:p', attribute: 'payRateCents', value: { type: 'integer', value: entry.fixture.parameters.invalidInt64 }, validFrom: V_W0 }]);
      assert(!r.ok); if (!r.ok) assert.equal(r.tag, 'InvalidTripleError');
      assert.equal(await p.comp.currentPosition(), P); await p.state('pl:p');
    } else if (id === 'GS-15-STORAGE-ACCESS') {
      const other = memoryComposition(lane, scope + '-other');
      assert.equal((await other.sweepPage(['pl:p'], { position: 0, validAt: V_W0 })).rows.length, 0);
      p.equal(id, other.scopeName === p.comp.scopeName, false);
      details.limit = 'separate memory stores; physical engine tenant isolation remains live-only';
    } else if (id === 'GS-15-SLOW-TENANT') {
      const slow = memoryComposition(lane, scope + '-slow'); let fastKnown = 0, slowKnown = 0;
      for (let tick = 1; tick <= 20; tick++) {
        await p.set('pl:p', 'weeklyMinutes', tick); await slow.transact(rows([{ e: 'pl:s', a: 'weeklyMinutes', v: tick }]), { commandId: 'slow-' + tick });
        fastKnown = (await p.comp.feedPage(fastKnown, 1000)).transactions.at(-1)!.position;
        if (tick % 10 === 0) slowKnown = (await slow.feedPage(slowKnown, 1)).transactions.at(-1)!.position;
        assert.equal(fastKnown, await p.comp.currentPosition());
      }
      assert.equal(slowKnown, 2); details.limit = 'logical 10x schedule; no latency bar asserted';
    } else if (scenario === 16) {
      status = 'BLOCKED'; reason = 'memory/source API has no physical erasure, rebuild/restore or crypto-shredding capability';
    } else {
      switch (scenario) {
        case 1: case 2:
          await p.commit(rows([{ e: 'pl:p', a: 'section1AttestedAt', v: W0.POPULATION_VALID_TIME }, { e: 'pl:p', a: 'ssn', v: '123456789' }]));
          await reconcileClaim(p, 1, 'pl:p'); break;
        case 3: await p.set('pl:p', 'everifyStatus', 'authorized'); details.supersession = 'BLOCKED-W0-1.2'; break;
        case 4:
          details.lostAck = await lostAck(p, reopen, rows([{ e: 'pl:p', a: 'everifySubmitResult', v: 'accepted' }]));
          if (id === 'GS-04B-INDEX-PARTITION') {
            const replica = new FeedReplica(p.comp); await replica.rebuild();
            await p.set('pl:p', 'weeklyMinutes', 3000);
            const P = await p.comp.currentPosition(); await replica.read('pl:p', P);
            assert(replica.events.some(e => e.kind === 'fallback')); await replica.rebuild(); assert.equal(replica.watermark, P);
            details.maintenance = replica.events;
          }
          break;
        case 5: await p.set('pl:p', 'bgcStatus', 'clear'); await reconcileClaim(p, 5, 'pl:p'); break;
        case 6:
          await p.set('jur:a', 'stateMinWageCents', 1850);
          assert.deepEqual((await affectedClaim(p, ['pl:p', 'pl:n'], [['jur:a', 'stateMinWageCents']])).affected, ['pl:p']);
          await reconcileClaim(p, 6, 'pl:p'); break;
        case 7: {
          const page = await p.comp.sweepPage(['pl:p'], { position: await p.comp.currentPosition(), validAt: V_W0 });
          const meta = { preconditions: [{ _tag: 'EntityState', entityId: 'pl:p', tripleIds: page.rows.filter(r => r.entityId === 'pl:p').map(r => r.id) }] };
          const a = await p.commit(decision('pl:p', 'review1', 'person'), 'review1', meta);
          const b = await p.commit(decision('pl:p', 'review2', 'person'), 'review2', meta);
          assert(a.ok && !b.ok); if (!b.ok) assert.equal(b.tag, 'TransactionConflictError'); break;
        }
        case 8: await p.set('pl:p', 'payRateCents', 1750, V_W0 - 30 * 86400000); await p.state('pl:p', beforeP.P); break;
        case 9: await p.set('pl:p', 'startDate', '2026-11-16'); await reconcileClaim(p, 9, 'pl:p'); break;
        case 10: case 11: {
          const P = await p.comp.currentPosition();
          const preview = await p.domain('pl:p', 'R2', P);
          await p.set('gs:release', 'activation', canonical({ recordedPosition: P, release: 'R2' }));
          const sweep = await p.domain('pl:p', 'R2', P);
          assert.notDeepEqual((await p.domain('pl:p', 'R1', P)).obligations, preview.obligations);
          assert.deepEqual(preview, sweep); details.basis = { recordedPosition: P, validAt: V_W0 }; break;
        }
        case 12: await p.set('pl:p', 'payRateCents', 1750); assert.equal(semantic((await p.state('pl:p', beforeP.P)).observed), semantic(beforeP.observed)); break;
        case 13: await p.commit(rows(Array.from({ length: 10 }, (_, n) => [{ e: 'pl:p', a: 'answers', v: `pl:p/ans:bulk${n}` }, { e: `pl:p/ans:bulk${n}`, a: 'value', v: String(n) }]).flat())); break;
        case 14: case 15: await p.set('pl:p', 'weeklyMinutes', 3000); break;
        case 17:
          await p.commit(decision('pl:p', 'agent', 'agent'));
          assert((await reconcileClaim(p, 17, 'pl:p')).output.tasks.some((t: any) => t.rule === 'I9S2')); break;
        case 18: await p.commit(decision('pl:p', 'human', 'person')); await dashboardClaim(p, ['pl:p', 'pl:n'], Date.UTC(2026, 10, 10)); break;
        case 19: details.fault = await consumerFault(p, 'after-effect-before-checkpoint', reopen); break;
        case 20: {
          await p.commit(rows([{ e: 'pl:p', a: 'documents', v: 'pl:p/doc:a' }, { e: 'pl:p/doc:a', a: 'docType', v: 'ead' }, { e: 'pl:p/doc:a', a: 'expiresOn', v: '2026-11-05' }]));
          const before = await p.domain('pl:p', 'R1', -1, V_W0), after = await p.domain('pl:p', 'R1', -1, Date.UTC(2026, 10, 6));
          assert.notDeepEqual(before.tasks.filter((t: any) => t.rule === 'DOCEXP'), after.tasks.filter((t: any) => t.rule === 'DOCEXP')); break;
        }
        default: throw Error('case has no executable schedule: ' + id);
      }
      const afterP = await p.state('pl:p'), afterN = await p.state('pl:n');
      if (entry.kind === 'witness' && entry.polarity === 'negative') assert.equal(semantic(afterN.observed), semantic(beforeN.observed));
      if (entry.kind === 'witness' && entry.polarity === 'positive' && ![10, 11, 19].includes(scenario)) assert.notEqual(semantic(afterP.observed), semantic(beforeP.observed));
    }
    p.finish();
  } catch (error) { status = 'FAIL'; reason = String((error as Error).stack ?? error); }
  return { id, lane, scope, attempt: p.attempt, sourceSha256: p.sourceSha256, classification: 'OFFLINE-DIAGNOSTIC', status, reason, details, outcomes: p.outcomes, domainClaims: p.claims, checks: p.checks, oracleCases: p.oracleCases,
    qlever: lane === 'qlever' ? { kind: 'OFFLINE-FAKE', before: lanePort.initialLayout, after: await lanePort.layout() } : null,
    coverage: 'authored fixture state/domain/fault only; not expected-load GS acceptance' };
}
export async function runCases(lane: Lane, output: string, selected?: string) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const entries = caseManifest().cases.filter((c: any) => !selected || c.id === selected), cases: any[] = [];
  if (!entries.length) throw Error('no selected cases');
  for (const entry of entries) cases.push(await runCase(entry.id, lane, path.dirname(output)));
  const report = { format: 'tx2-gs-offline-cases/2', classification: 'OFFLINE-DIAGNOSTIC', lane, cases,
    matched: cases.filter(c => c.status === 'OFFLINE-MATCH').length, blocked: cases.filter(c => c.status === 'BLOCKED').length, failed: cases.filter(c => c.status === 'FAIL').length };
  fs.writeFileSync(output, JSON.stringify(report, null, 1) + '\n'); return report;
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const a = process.argv.slice(2), get = (k: string, d: string) => a.includes(k) ? a[a.indexOf(k) + 1] : d;
  const lane = get('--lane', 'xtdb') as Lane;
  if (!['xtdb', 'qlever', 'datomic'].includes(lane)) throw Error('unknown lane');
  const output = path.resolve(get('--output', path.join(base, 'runs/W02-r2/cases.json')));
  if (!output.startsWith(path.join(base, 'runs') + path.sep) && !output.startsWith(path.join(base, 'lab/experiments/EXP-W02/evidence') + path.sep)) throw Error('output outside owned evidence paths');
  const report = await runCases(lane, output, a.includes('--case') ? get('--case', '') : undefined);
  console.log(JSON.stringify({ matched: report.matched, blocked: report.blocked, failed: report.failed, total: report.cases.length, output }));
  if (report.failed) process.exitCode = 1;
}
