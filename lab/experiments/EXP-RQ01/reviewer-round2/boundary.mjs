// [EXP-RQ01-QA2] Why: show that the missing real purge cuts can hide an actual route disagreement.
// Rejected: relying only on structural booleans without a wrong-answer witness.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {generateRouteHistory,generateRouteBases,makeRouteEquivalenceCases,runRouteEquivalence,routeHead,routeRow} from '../../../../packages/testkit/src/route-equivalence.ts';
import {makeOfflineRouteFixture} from '../../../../packages/testkit/src/offline-route-fixtures.ts';
const out='lab/verify/RQ01/round2/boundary-a1';fs.mkdirSync(out,{recursive:false});
const files=['packages/testkit/src/route-equivalence.ts','packages/testkit/src/route-coverage.ts','packages/testkit/src/offline-route-fixtures.ts',import.meta.filename];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const before=hashes();const started=new Date().toISOString();
const history=generateRouteHistory(42),h=routeHead(history)+4096;
const extension={position:h,instant:1100,writes:[{op:'assert',row:routeRow('boundary-extension','extension','new')}]};
const broken=()=>{
 const f=makeOfflineRouteFixture('xtdb');
 return {...f,routes:f.routes.map((r,i)=>i===0?{...r,read:async request=>{
   const answer=await r.read(request);
   return [h,h-1].includes(request.basis.recordedPosition)?{...answer,rows:answer.rows.slice(1)}:answer;
 }}:r)};
};
const requests=generateRouteBases(history);
const falsePass=await makeRouteEquivalenceCases({fixture:broken(),history,extension,requests})[0].run();
assert.equal(falsePass.violations.length,0);
const actualPurge=falsePass.events.find(e=>e.event==='purge');assert.equal(actualPurge.context.horizon,h);
assert(!falsePass.observations.some(o=>[h,h-1].includes(o.request.basis.recordedPosition)));
const completeRequests=[...requests,...[h,h-1].map(recordedPosition=>({basis:{validAt:2000,recordedPosition}}))];
const clean=await runRouteEquivalence({fixture:makeOfflineRouteFixture('xtdb'),history,extension,requests:completeRequests});
assert.equal(clean.violations.length,0);
const caught=await runRouteEquivalence({fixture:broken(),history,extension,requests:completeRequests});
assert(caught.violations.some(v=>v.rule==='HE-1'&&v.route==='X1-all-valid-time'));
assert(caught.violations.some(v=>v.rule==='HE-2'));
assert(caught.violations.every(v=>[h,h-1].includes(v.request.basis.recordedPosition)));
const after=hashes();const binding=JSON.stringify(before)===JSON.stringify(after);assert(binding);
const result={started,completed:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),slot:'offline/no engine; CX-VRQ01-round2-boundary-a1',before,after,binding,horizon:h,wrongRouteAcceptedByQualification:true,qualifiedObservations:falsePass.observations.length,actualPurge,cleanCompleteViolations:clean.violations.length,caughtViolations:caught.violations,sourceStable:true};
fs.writeFileSync(`${out}/receipt.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({wrongRouteAcceptedByQualification:true,horizon:h,caughtWhenRealCutsRequested:caught.violations.length,binding}));
