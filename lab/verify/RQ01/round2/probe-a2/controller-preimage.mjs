// [EXP-RQ01-QA2] Why: independently rerun the original fault ledger under explicit Q89i contracts and measure coverage witnesses.
// Rejected: treating a passing builder test or a coverage boolean as proof of actual input content.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { generateRouteHistory, generateRouteBases, routeHead, routeRow, routeShape, RouteRefusal, runRouteEquivalence, makeRouteEquivalenceCases } from '../../../../packages/testkit/src/route-equivalence.ts';
import { measureRouteCoverage, requireRouteCoverage } from '../../../../packages/testkit/src/route-coverage.ts';
import { makeOfflineRouteFixture } from '../../../../packages/testkit/src/offline-route-fixtures.ts';
const out = 'lab/verify/RQ01/round2/probe-a2';
fs.mkdirSync(out, { recursive: false });
const save = (name, content) => fs.writeFileSync(`${out}/${name}`, JSON.stringify(content, null, 2) + '\n');
const files = ['packages/testkit/src/route-equivalence.ts','packages/testkit/src/route-coverage.ts','packages/testkit/src/offline-route-fixtures.ts','packages/testkit/test/route-equivalence.test.ts','lab/verify/RQ01/round2/probe.mjs','lab/verify/RQ01/source-loader.mjs','lab/verify/RQ01/content-shim.mjs','pnpm-lock.yaml'];
const hashes = () => Object.fromEntries(files.map(f => [f, createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const before = hashes();
const summary = { started: new Date().toISOString(), head: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), slot:'offline/no engine; heavy label CX-VRQ01-round2-probe-a1', before, results: [] };
const modelRows = (history, request, mode = '') => {
  const ledger = new Map();
  for (const commit of history.commits) {
    if (mode === 'ignore-real-valid-edit' && commit.writes.some(a => a.op === 'assert' && a.row.valid_to !== null && commit.writes.some(r => r.op === 'retract' && ledger.get(r.id)?.entity_id === a.row.entity_id && ledger.get(r.id)?.attribute === a.row.attribute))) continue;
    for (const write of commit.writes) {
      if (mode === 'ignore-correction' && commit.position === 2048) continue;
      if (write.op === 'assert') ledger.set(write.row.id, { ...write.row, recorded_at: commit.instant, recorded_position: commit.position });
      else if (mode !== 'drop-retraction') Object.assign(ledger.get(write.id), { retracted_at: commit.instant, retracted_position: commit.position, retract_tx_id: `tx:${commit.position}` });
    }
  }
  const p = request.basis.recordedPosition ?? history.commits.at(-1).position;
  const t = request.basis.recordedAt ?? Infinity;
  const v = request.basis.validAt ?? history.now;
  return [...ledger.values()].filter(r =>
    (request.entityId === undefined || r.entity_id === request.entityId) &&
    r.recorded_position <= p && r.recorded_at <= t &&
    !(mode === 'drop-same-ms-tie' && r.id === 'tie:B') &&
    (request.history || ((!((r.retracted_position ?? Infinity) <= p && (r.retracted_at ?? Infinity) <= t)) && r.valid_from <= v && (r.valid_to === null || v < r.valid_to)))
  );
};
const modelFixture = (mode = '', contract = 'snapshot') => {
  let history;
  return {
    lane: 'CX-VRQ01-independent-model', reset: h => { history = structuredClone(h); },
    append: c => { history.commits.push(structuredClone(c)); }, event: () => ({ status: 'model-applied', reason: 'Independent in-memory event; no engine assertion' }),
    routes: ['control', 'injected'].map(id => ({
      id, contract, eligible: (r, h) => (r.basis.recordedPosition ?? 0) <= routeHead(h),
      refusals: ['BasisNotAvailable'], force: () => {},
      read: async request => {
        const activeMode = id === 'injected' ? mode : '';
        if (activeMode === 'empty-ineligible') return { rows: [], eligible: false, taken: id, basis: request.basis };
        if ((request.basis.recordedPosition ?? 0) > routeHead(history) && activeMode !== 'future-old-data')
          throw new RouteRefusal('BasisNotAvailable', 'Future position');
        const p = request.basis.recordedPosition ?? routeHead(history);
        const t = request.basis.recordedAt ?? Infinity;
        const rows = modelRows(history, request, activeMode).map(r => contract === 'snapshot' && r.retracted_position !== null && (r.retracted_position > p || r.retracted_at > t) ? { ...r, retracted_at: null, retracted_position: null, retract_tx_id: null } : r);
        return { rows, taken: id, basis: request.basis };
      },
    })),
  };
};
const row = (id, subject = 's', value = id, from = 0, to = null) => ({ op: 'assert', row: routeRow(id, subject, value, from, to) });
const base = commits => ({ seed: 89001, now: 2000, commits });
const retractHistory = base([
  { position: 1024, instant: 1000, writes: [row('retracted')] },
  { position: 2048, instant: 1001, writes: [{ op: 'retract', id: 'retracted' }] },
]);
const tieHistory = base([
  { position: 1024, instant: 1000, writes: [row('tie:A')] },
  { position: 2048, instant: 1000, writes: [row('tie:B')] },
]);
const correctionHistory = base([
  { position: 1024, instant: 1000, writes: [row('old')] },
  { position: 2048, instant: 1001, writes: [{ op: 'retract', id: 'old' }, row('corrected', 's', 'new', 10, 20)] },
]);
const faultCases = [
  ['drop-retraction', retractHistory, { basis: { validAt: 2000, recordedPosition: 2048 } }, ['HE-1', 'HE-2']],
  ['drop-same-ms-tie', tieHistory, { basis: { validAt: 2000, recordedAt: 1000 } }, ['HE-1', 'HE-2']],
  ['future-old-data', tieHistory, { basis: { validAt: 2000, recordedPosition: 999999 } }, ['HE-1', 'HE-3']],
  ['empty-ineligible', tieHistory, { basis: { validAt: 2000, recordedPosition: 999999 } }, ['HE-1', 'HE-3', 'HE-6']],
  ['ignore-correction', correctionHistory, { basis: { validAt: 15, recordedPosition: 2048 } }, ['HE-1', 'HE-2']],
];
for (const [mode, history, request, required] of faultCases) {
  const clean = await runRouteEquivalence({ fixture: modelFixture(), history, requests: [request], scope: { shapes: [routeShape(request)] } });
  assert.equal(clean.violations.length, 0, `${mode}: clean control must pass`);
  const broken = await runRouteEquivalence({ fixture: modelFixture(mode), history, requests: [request], scope: { shapes: [routeShape(request)] } });
  for (const rule of required) assert(broken.violations.some(v => v.rule === rule && (v.route === 'injected' || v.route === '*')), `${mode}: missing ${rule}`);
  assert(!broken.violations.some(v => v.route === 'control'), 'Correct route must remain clean');
  save(`${mode}.json`, { clean, broken });
  summary.results.push({ test: mode, caught: true, cleanViolations: clean.violations.length, violations: broken.violations.length, rules: [...new Set(broken.violations.map(v => v.rule))] });
}

// [EXP-RQ01-QA2] Why: infer semantic operation counts from writes, and separately validate the claimed physical nesting.
// Rejected: copying the builder's coverage booleans into the verifier receipt.
const measured = [];
for (const seed of [1,42,890,89,891]) {
  const history = generateRouteHistory(seed);
  const ledger = new Map();
  let replacements = 0, corrections = 0;
  const badEdits = [];
  for (const c of history.commits) {
    for (const r of c.writes.filter(w => w.op === 'retract')) {
      const prior = ledger.get(r.id);
      for (const a of c.writes.filter(w => w.op === 'assert')) {
        if (a.row.id === r.id) continue;
        if (prior) {
          if (prior.entity_id !== a.row.entity_id || prior.attribute !== a.row.attribute) badEdits.push({ position: c.position, prior, asserted:a.row });
          else { replacements++; if (a.row.valid_to !== null) corrections++; }
        }
      }
    }
    for (const w of c.writes) { if (w.op === 'assert') ledger.set(w.row.id,w.row); else ledger.delete(w.id); }
  }
  assert.equal(badEdits.length,0);
  assert(replacements > 0 && corrections > 0);
  const nested = [...new Set(history.commits.filter(c => c.nested).map(c => c.nested.callback))].map(callback => {
    const members = history.commits.filter(c => c.nested?.callback === callback);
    return { callback, positions: members.map(c=>c.position), declaredOrdinals: members.map(c=>c.nested.ordinal), consecutiveIntegerPositions: members.every((c,i)=> i===0 || c.position===members[i-1].position+1) };
  });
  const structural = requireRouteCoverage(history);
  const actual = await runRouteEquivalence({ fixture: modelFixture(), history });
  assert.equal(actual.violations.length,0);
  const eventCuts = actual.events.filter(e=>e.event.startsWith('purge')).map(e=>({event:e.event,context:e.context, requested:[e.context.horizon,e.context.horizon-1].map(p=>actual.observations.some(o=>routeShape(o.request)==='P' && o.request.basis.recordedPosition===p))}));
  const record = { seed, replacements, corrections, badEdits, nested, builderMeasured: structural, actualShapes: actual.coverage, eventCuts, observations: actual.observations.length, violations:actual.violations.length };
  measured.push(record);
}
save('coverage.json',measured);
summary.results.push({test:'coverage',seeds:measured.map(r=>({seed:r.seed,replacements:r.replacements,corrections:r.corrections,nested:r.nested,shapeCounts:r.actualShapes.shapes}))});

// [EXP-RQ01-QA2] Why: check the wrapper against the actual custom purge context, not a separately regenerated default.
// Rejected: asserting coverage for cuts that were not requested in the executed case.
const history = generateRouteHistory(42);
const requests = generateRouteBases(history);
const customHorizon = routeHead(history)+4096;
const custom = await makeRouteEquivalenceCases({ fixture:modelFixture(), history, requests, extension:{position:customHorizon,instant:1100,writes:[row('custom-extension','extension')]} })[0].run();
assert.equal(custom.violations.length,0);
const missingActualCuts = [customHorizon,customHorizon-1].filter(p=>!custom.observations.some(o=>routeShape(o.request)==='P' && o.request.basis.recordedPosition===p));
assert.equal(missingActualCuts.length,2);
save('custom-horizon-false-pass.json',{ actualEvent:custom.events.find(e=>e.event==='purge'), missingActualCuts, observedShapes:custom.coverage, observations:custom.observations.length, violations:custom.violations, defaultManifest:requireRouteCoverage(history,requests) });
summary.results.push({test:'custom-horizon',unexpectedlyPassed:true,missingActualCuts});

const initial = base([{position:1024,instant:1000,writes:[row('metadata')]}]);
const retirement = {position:2048,instant:1001,writes:[{op:'retract',id:'metadata'}]};
const oldRequests = [{basis:{validAt:2000,recordedPosition:1024}},{basis:{validAt:2000,recordedAt:1000}},{basis:{validAt:2000,recordedAt:1000,recordedPosition:1024}},{history:true,basis:{recordedPosition:1024}}];
for (const contract of ['snapshot','raw-lifetime']) {
  const result = await runRouteEquivalence({fixture:modelFixture('',contract),history:initial,extension:retirement,requests:oldRequests,scope:{shapes:['P','T','TP','H']}});
  assert.equal(result.violations.length,0);
  save(`retirement-${contract}.json`,result);
  summary.results.push({test:`retirement-${contract}`,violations:result.violations.length,observations:result.observations.length});
}

let resets=0,reads=0;
for (const requests of [[],generateRouteBases(history).filter(()=>false)]) {
  const f=modelFixture();
  const fixture={...f,reset:h=>{resets++;return f.reset(h);},routes:f.routes.map(r=>({...r,read:request=>{reads++;return r.read(request);}}))};
  await assert.rejects(()=>makeRouteEquivalenceCases({fixture,history,requests})[0].run(),/nonempty requests/);
}
assert.equal(resets,0);assert.equal(reads,0);
summary.results.push({test:'empty-and-filtered-empty',rejected:true,resets,reads});

const dc1Options={history:base([{position:1024,instant:1001,writes:[row('B','Y')]}]),requests:[{entityId:'X',basis:{validAt:2000,recordedAt:1001}}],scope:{shapes:['T']},extension:{position:2048,instant:1000,writes:[row('A','X')]}};
const dc1=await runRouteEquivalence({fixture:makeOfflineRouteFixture('qlever'),...dc1Options});
assert(dc1.violations.length>0 && dc1.violations.every(v=>v.rule==='HE-5'));
assert.deepEqual([...new Set(dc1.violations.map(v=>v.route))].sort(),makeOfflineRouteFixture('qlever').routes.map(r=>r.id).sort());
await assert.rejects(()=>makeRouteEquivalenceCases({fixture:makeOfflineRouteFixture('qlever'),...dc1Options})[0].run());
save('dc1-Q89a.json',dc1);
summary.results.push({test:'D-C1-Q89a',rules:['HE-5'],violations:dc1.violations.length,positiveWrapperRejected:true});
const after=hashes();
summary.after=after; summary.sourceStillMatches=JSON.stringify(before)===JSON.stringify(after);
assert(summary.sourceStillMatches);
summary.completed=new Date().toISOString();summary.probesCompleted=true;
save('receipt.json',summary);
console.log(JSON.stringify(summary.results,null,2));
