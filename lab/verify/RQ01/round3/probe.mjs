// [EXP-RQ01-QA3] Why: independently exercise grammar admission, actual driver policies and all six wrong-answer probes.
// Rejected: counting only labels or reusing historical reviewer PASS data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {generateRouteHistory,generateRouteBases,routeHead,routeRow,routeShape,RouteRefusal,runRouteEquivalence,makeRouteEquivalenceCases,makeRouteExecutionPlan,foldRouteHistory,canonicalRouteValue} from '../../../../packages/testkit/src/route-equivalence.ts';
import {validateRouteHistory} from '../../../../packages/testkit/src/route-history-grammar.ts';
import {measureRouteCoverage,requireRouteCoverage} from '../../../../packages/testkit/src/route-coverage.ts';
import {makeOfflineRouteFixture} from '../../../../packages/testkit/src/offline-route-fixtures.ts';
import {heavyAdmission,sameAdmission} from '../../../experiments/EXP-RQ01/attempt-io.mjs';
const out='lab/verify/RQ01/round3/probe-a1';fs.mkdirSync(out,{recursive:false});
const admission=heavyAdmission(),started=Date.now();
const save=(n,v)=>fs.writeFileSync(`${out}/${n}`,JSON.stringify(v,null,2)+'\n');
const inputFiles=['packages/testkit/src/route-equivalence.ts','packages/testkit/src/route-coverage.ts','packages/testkit/src/route-history-grammar.ts','packages/testkit/src/offline-route-fixtures.ts',import.meta.filename,'lab/verify/RQ01/source-loader.mjs','lab/verify/RQ01/content-shim.mjs','pnpm-lock.yaml'];
const hashes=()=>Object.fromEntries(inputFiles.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const before=hashes();
const summary={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),started,admission,before,results:[]};
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
    append: c => { history.commits.push(structuredClone(c)); }, event: (event,context) => ['index-job','flush','compaction'].includes(event) ? {status:'pending',reason:'No physical engine'} : ({ status: 'model-applied', reason: 'Independent in-memory event; no engine assertion', ...(['purge','purge-pinned'].includes(event) ? {retirement:{horizon:context.horizon,pinned:context.pinned}} : {}) }),
    routes: ['control', 'injected'].map(id => ({
      id, contract, retention: { kind: 'complete', plan: (h,e) => [{id:'qa-pin',event:'purge-pinned',horizon:h.commits[Math.floor(h.commits.length/2)].position,pinned:true},{id:'qa-unpin',event:'purge',horizon:e.position,pinned:false}] }, eligible: (r, h) => (r.basis.recordedPosition ?? 0) <= routeHead(h),
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

// [EXP-RQ01-QA3] Why: test every profile length through repeated nested boundaries, with a known independent rejection rule.
// Rejected: assuming that five default successful lengths prove all generator returns are validated.
const generated=[];
for(const seed of [1,42,890,89,891])for(let count=16;count<=96;count++){
 const partial=count%16===9;
 try{
  const h=generateRouteHistory(seed,count);assert(!partial,'A truncated group was returned');validateRouteHistory(h,true);
  for(const callback of new Set(h.commits.filter(c=>c.nested).map(c=>c.nested.callback))){
   const members=h.commits.filter(c=>c.nested?.callback===callback);
   assert.equal(members.length,members[0].nested.size);
   assert(members.every((c,i)=>c.nested.ordinal===i+1&&(i===0||c.position===members[i-1].position+1)));
  }
  generated.push({seed,count,status:'validated'});
 }catch(error){if(!partial||!/incomplete nested group/.test(String(error)))throw error;generated.push({seed,count,status:'rejected-partial-group'});}
}
assert.equal(generated.length,405);save('generated-grammar.json',generated);
summary.results.push({test:'all-generated-profile-lengths',profiles:405,validated:generated.filter(x=>x.status==='validated').length,rejectedPartial:generated.filter(x=>x.status!=='validated').length});

const original=generateRouteHistory(42);
const mutate=fn=>{const h=structuredClone(original);fn(h);return h;};
const mutations=[
 ['old-nested-gap',h=>{const c=h.commits[9];c.position+=1024;c.receipt.position=c.position;h.attempts.find(a=>a.id===c.receipt.attemptId).position=c.position;}],
 ['partial-group',h=>{const c=h.commits[9];h.commits.splice(9,1);h.attempts=h.attempts.filter(a=>a.id!==c.receipt.attemptId);}],
 ['bad-ordinal',h=>{h.commits[9].nested.ordinal=1;}],
 ['wrong-size',h=>{h.commits[9].nested.size=3;}],
 ['missing-receipt',h=>{delete h.commits[0].receipt;}],
 ['wrong-receipt',h=>{h.commits[0].receipt.instant+=1;}],
 ['missing-attempt',h=>{h.attempts.shift();}],
 ['bad-retract-target',h=>{h.commits[1].writes[0].id='not-present';}],
 ['duplicate-assertion',h=>{h.commits[0].writes[1].row.id=h.commits[0].writes[0].row.id;}],
 ['invalid-valid-interval',h=>{h.commits[0].writes[0].row.valid_to=0;}],
 ['bad-attempt-order',h=>{h.attempts[0].decidedOrder=h.attempts[1].decidedOrder;}],
 ['abort-became-committed',h=>{h.attempts.find(a=>a.status==='aborted').status='committed';}],
];
const rejected=[];
for(const[name,fn]of mutations){
 const bad=mutate(fn);let resets=0,reads=0;
 const f=modelFixture();const fixture={...f,reset:h=>{resets++;return f.reset(h);},routes:f.routes.map(r=>({...r,read:q=>{reads++;return r.read(q);}}))};
 const methods=[['validate',()=>validateRouteHistory(bad)],['fold',()=>foldRouteHistory(bad)],['bases',()=>generateRouteBases(bad)],['coverage',()=>measureRouteCoverage(bad)],['plan',()=>makeRouteExecutionPlan({history:bad,fixture})]];
 for(const[method,call]of methods)assert.throws(call,/Invalid route history/,`${name}/${method}`);
 await assert.rejects(()=>runRouteEquivalence({history:bad,fixture}),/Invalid route history/);
 assert.equal(resets,0);assert.equal(reads,0);rejected.push({name,methods:methods.map(x=>x[0]).concat('run'),resets,reads});
}
save('invalid-history-admission.json',rejected);summary.results.push({test:'invalid-history-pre-use',cases:rejected.length,entryPoints:6,fixtureCalls:0});

const coverage=[];
for(const seed of [1,42,890,89,891]){
 const history=generateRouteHistory(seed),fixture=modelFixture();
 const result=await makeRouteEquivalenceCases({history,fixture})[0].run();
 assert.equal(result.violations.length,0);
 const measured=requireRouteCoverage(result.plan.history,result.plan.requests,result.plan);
 assert(measured.complete);assert.equal(measured.kinds.replacement,6);assert.equal(measured.kinds.boundedCorrection,3);
 assert(measured.retentionBoundaries.every(c=>c.requested&&result.events.some(e=>e.context.routes.includes(c.route)&&e.context.cutId===c.id&&e.context.horizon===c.horizon&&e.outcome.retirement.horizon===c.horizon&&e.outcome.retirement.pinned===c.pinned)));
 assert(Object.isFrozen(result.plan)&&Object.isFrozen(result.plan.policies[0].cuts)&&Object.isFrozen(result.plan.requests[0].basis));
 assert.throws(()=>requireRouteCoverage(history),/exact execution plan/);
 assert.equal(measureRouteCoverage(history).complete,false);
 assert.throws(()=>requireRouteCoverage(result.plan.history,result.plan.requests.slice(1),result.plan),/binding mismatch/);
 coverage.push({seed,...measured,observations:result.observations.length,events:result.events});
}
save('coverage.json',coverage);summary.results.push({test:'coverage-five-seeds',complete:coverage.every(c=>c.complete),seeds:coverage.map(c=>c.seed)});

// [EXP-RQ01-QA3] Why: activate the sixth wrong-answer fault only after its own declared custom event.
// Rejected: activating on another route's event (would conflate owner binding and answer exactness).
const history=generateRouteHistory(42),h=routeHead(history)+4096;
const extension={position:h,instant:1100,writes:[row('qa-boundary-extension','extension')]};
const boundaryFixture=(broken=false)=>{
 const f=makeOfflineRouteFixture('xtdb'),retired=new Set();
 return {...f,event:async(event,context)=>{
  const outcome=await f.event(event,context);
  if(context?.cutId==='qa-custom-A'&&context.routes.includes('X1-all-valid-time')){retired.add(context.horizon);retired.add(context.horizon-1);}
  return outcome;
 },routes:f.routes.map((r,i)=>({...r,retention:i<2?{kind:'position-retired',plan:()=>[{id:i===0?'qa-custom-A':'qa-custom-B',event:'purge',horizon:h-i*512,pinned:false}]}:r.retention,
 read:async q=>{const a=await r.read(q);return broken&&i===0&&retired.has(q.basis.recordedPosition)?{...a,rows:a.rows.slice(1)}:a;}}))};
};
let resets=0;
const missingFixture=boundaryFixture();const missing={...missingFixture,reset:()=>{resets++;}};
await assert.rejects(()=>makeRouteEquivalenceCases({history,extension,requests:generateRouteBases(history),fixture:missing})[0].run(),/Missing retention boundary/);assert.equal(resets,0);
const clean=await makeRouteEquivalenceCases({history,extension,fixture:boundaryFixture()})[0].run();assert.equal(clean.violations.length,0);
const broken=await runRouteEquivalence({history,extension,fixture:boundaryFixture(true)});
assert(broken.violations.some(v=>v.rule==='HE-1'&&v.route==='X1-all-valid-time'));assert(broken.violations.some(v=>v.rule==='HE-2'));
assert(broken.violations.every(v=>[h,h-1].includes(v.request.basis.recordedPosition)&&(v.route==='X1-all-valid-time'||v.route==='*')));
await assert.rejects(()=>makeRouteEquivalenceCases({history,extension,fixture:boundaryFixture(true)})[0].run());
const customCoverage=requireRouteCoverage(clean.plan.history,clean.plan.requests,clean.plan);
for(const p of [h,h-1,h-512,h-513])assert(clean.observations.some(o=>routeShape(o.request)==='P'&&o.request.basis.recordedPosition===p));
save('custom-cut-fault.json',{missingCutsRejected:true,missingFixtureResets:resets,cleanViolations:clean.violations,plan:clean.plan,events:clean.events,coverage:customCoverage,violations:broken.violations,cleanObservationCount:clean.observations.length});
summary.results.push({test:'custom-cut-dropped-row',caught:true,cleanViolations:0,missingCutsRejected:true,violations:broken.violations.length,rules:[...new Set(broken.violations.map(v=>v.rule))]});
for(const[name,outcome]of [['pending',{status:'pending',reason:'not executed'}],['wrong-horizon',{status:'model-applied',reason:'bad echo',retirement:{horizon:1,pinned:false}}],['wrong-pin',{status:'model-applied',reason:'bad pin',retirement:{horizon:h,pinned:true}}]]){
 await assert.rejects(()=>runRouteEquivalence({history,extension,fixture:{...boundaryFixture(),event:()=>outcome}}),/did not confirm/);
 summary.results.push({test:`retirement-${name}`,rejected:true});
}
const policyCases=[
 ['missing-policy',f=>({...f,routes:f.routes.map(r=>({...r,retention:undefined}))})],
 ['empty-retired-policy',f=>({...f,routes:f.routes.map(r=>({...r,retention:{kind:'position-retired',plan:()=>[]}}))})],
 ['duplicate-cut-id',f=>({...f,routes:f.routes.map(r=>({...r,retention:{kind:'position-retired',plan:()=>[{id:'x',event:'purge',horizon:h,pinned:false},{id:'x',event:'purge',horizon:h-1,pinned:false}]}}))})],
];
for(const[name,change]of policyCases)assert.throws(()=>makeRouteExecutionPlan({history,extension,fixture:change(boundaryFixture())}),/retention policy|retirement cuts|Duplicate retention/);
summary.results.push({test:'invalid-driver-policies',cases:3,rejected:true});

const initial=base([{position:1024,instant:1000,writes:[row('metadata')]}]);
const retirement={position:2048,instant:1001,writes:[{op:'retract',id:'metadata'}]};
const oldRequests=[{basis:{validAt:2000,recordedPosition:1024}},{basis:{validAt:2000,recordedAt:1000}},{basis:{validAt:2000,recordedAt:1000,recordedPosition:1024}},{history:true,basis:{recordedPosition:1024}}];
for(const contract of ['snapshot','raw-lifetime']){
 const result=await runRouteEquivalence({fixture:modelFixture('',contract),history:initial,extension:retirement,requests:oldRequests,scope:{shapes:['P','T','TP','H']}});assert.equal(result.violations.length,0);save(`retirement-${contract}.json`,result);summary.results.push({test:`retirement-${contract}`,violations:0});
}
for(const requests of [[],generateRouteBases(history).filter(()=>false)])await assert.rejects(()=>makeRouteEquivalenceCases({fixture:modelFixture(),history,requests})[0].run(),/nonempty requests/);
summary.results.push({test:'empty-filtered-empty',rejected:true});
const ignored=await runRouteEquivalence({fixture:modelFixture('ignore-real-valid-edit'),history});assert(ignored.violations.some(v=>v.rule==='HE-1'));summary.results.push({test:'generated-correction-mutant',caught:true,violations:ignored.violations.length});
const dc1Options={history:base([{position:1024,instant:1001,writes:[row('B','Y')]}]),requests:[{entityId:'X',basis:{validAt:2000,recordedAt:1001}}],scope:{shapes:['T']},extension:{position:2048,instant:1000,writes:[row('A','X')]}};
const dc1=await runRouteEquivalence({fixture:makeOfflineRouteFixture('qlever'),...dc1Options});assert(dc1.violations.length>0&&dc1.violations.every(v=>v.rule==='HE-5'));assert.equal(new Set(dc1.violations.map(v=>v.route)).size,5);await assert.rejects(()=>makeRouteEquivalenceCases({fixture:makeOfflineRouteFixture('qlever'),...dc1Options})[0].run());save('dc1-Q89a.json',dc1);summary.results.push({test:'D-C1-Q89a',violations:dc1.violations.length,rules:['HE-5'],positiveWrapperRejected:true});
summary.after=hashes();summary.sourceStillMatches=canonicalRouteValue(before)===canonicalRouteValue(summary.after);summary.admissionStillMatches=sameAdmission(admission);assert(summary.sourceStillMatches&&summary.admissionStillMatches);summary.completed=Date.now();summary.probesCompleted=true;save('receipt.json',summary);console.log(JSON.stringify(summary.results));
