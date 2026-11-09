// [CX-VRT01-R3] Why: overlap reads and physical publications and remember the first successful bytes per complete request. Rejected: sequential adjacent-pair comparisons or treating a refusal as an empty answer.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {makeOfflineRouteFixture,generateRouteHistory,canonicalRouteRows,canonicalRouteValue,replayRouteAnswer,routeRow,runNamedTimeSchedule} from '../../../../packages/testkit/src/route.js';
const out=process.argv[2]??'lab/verify/RT01/round3/model-property/attempt2/';
const results:any[]=[];
for(const lane of ['xtdb','qlever'] as const)for(let seed=101;seed<=116;seed++){
 const full=generateRouteHistory(seed,36);let state=seed>>>0;const random=()=>state=(Math.imul(state,1664525)+1013904223)>>>0;
 const groups:any[][]=[];
 for(const commit of full.commits){const previous=groups.at(-1)?.[0];if(previous?.nested&&commit.nested?.callback===previous.nested.callback)groups.at(-1)!.push(commit);else groups.push([commit]);}
 const ids=makeOfflineRouteFixture(lane).routes.map(r=>r.id);
 for(const id of ids){
  const fixture=makeOfflineRouteFixture(lane);fixture.routes=fixture.routes.filter(r=>r.id===id);const route=fixture.routes[0]!;
  const prefix=(count:number)=>{const commits=groups.slice(0,count).flat();const ids=new Set(commits.map(c=>c.receipt?.attemptId));return{...full,commits,attempts:full.attempts?.filter(a=>ids.has(a.id))};};
  await fixture.reset(prefix(1));await route.force();
  const requests=[...new Set(full.commits.map(c=>c.instant))].flatMap(recordedAt=>[{basis:{recordedAt,validAt:full.now}},{entityId:'subject',basis:{recordedAt,validAt:full.now}}]);
  const served=new Map<string,string>();let reads=0,pairs=0,refusals=0;const violations:any[]=[];let published=1;
  const read=async(request:any)=>{
   for(let n=random()%3;n;n--)await Promise.resolve();
   try{route.force();const answer=await route.read(request);reads++;assert.equal(answer.taken,id);const bytes=canonicalRouteRows(answer.rows);const expected=canonicalRouteRows(replayRouteAnswer(full,request,'snapshot'));if(bytes!==expected)violations.push({kind:'content',request});
    const key=canonicalRouteValue(request);if(served.has(key)){pairs++;if(served.get(key)!==bytes)violations.push({kind:'pair',request});}else served.set(key,bytes);
   }catch(e){const tag=(e as any)._tag;if(!route.refusals.includes(tag))throw e;refusals++;}
  };
  for(let g=1;g<groups.length;g++){
   const pending=Array.from({length:12},()=>read(requests[random()%requests.length]));
   if(g%2)await Promise.resolve();
   if(groups[g].length===1)await fixture.append(groups[g][0]);else await fixture.reset(prefix(g+1));published=g+1;
   await route.force();await Promise.all(pending);
   for(const request of requests.filter(r=>r.basis.recordedAt<=groups[g].at(-1).instant))await read(request);
  }
  await Promise.all(requests.flatMap(request=>[read(request),read(request)]));
  results.push({lane,seed,route:id,physicalGroups:published,reads,pairs,refusals,violations});
 }
}
const control=await runNamedTimeSchedule({fixture:makeOfflineRouteFixture('xtdb'),seed:1,history:{seed:17,now:2000,commits:[{position:1,stagedAt:1001,instant:1001,writes:[]},{position:2,stagedAt:1000,instant:1000,writes:[{op:'assert',row:routeRow('late','subject','late')}]}]}});
assert.ok(control.violations.some(v=>v.rule==='HE-5'));
writeFileSync(out+'results.json',JSON.stringify({results,negativeControl:control},null,2)+'\n');
assert.ok(results.every(r=>r.violations.length===0&&r.pairs>0));console.log(JSON.stringify({histories:results.length,reads:results.reduce((n,r)=>n+r.reads,0),pairs:results.reduce((n,r)=>n+r.pairs,0),refusals:results.reduce((n,r)=>n+r.refusals,0),violations:results.reduce((n,r)=>n+r.violations.length,0)}));
