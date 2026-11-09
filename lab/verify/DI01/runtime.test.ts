// [CX-VDI01] Why: hand-authored feed pages and raw worlds exercise restart/overlap/refusal independently of DI01 Replay. Rejected: rebuilding both candidate and expectation through the same helper.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {DependencyIndex} from '../../../packages/host/dist/feed/index.js';
import {dependencyPlans,resolveActivation,storageReferenceReader,memoryReferenceReader} from '../../bench/lib/di01-refs.ts';
import * as W0 from '../../../packages/w0/dist/index.js';
const root=process.env.CX_VDI01_RUNTIME!; assert(root); fs.mkdirSync(root,{recursive:true});
const V=Date.parse(W0.POPULATION_VALID_TIME), source='review/DI01';
const page=(p:number,pairs:[string,string][])=>({cursor:{source,token:String(p)},entries:[{kind:'commit',stream:'s',epoch:'0',offset:String(p),transactions:[{positions:[String(p)],txIds:['tx'+p],commandIds:['cmd'+p],operationId:'op'+p,stamp:null,stampStatus:'pending-RT01',changes:pairs.map(([entity,attribute],i)=>({op:'assert',entity,attribute,assertionId:`a${p}-${i}`,position:String(p),validFrom:V,validTo:null}))}]}]}) as any;
const oracle=(worlds:any[],writes:[string,string][],tx:number)=>{
 const input={worlds,writes,release:'R1',basis:{tx,validTime:W0.POPULATION_VALID_TIME}};
 const r=spawnSync('python3',['-B','lab/oracles/domain/cli.py','affected','-'],{input:JSON.stringify(input),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr); const result=JSON.parse(r.stdout); assert(!result.error); return result.affected;
};
const row=(entity:string,attribute:string,value:string,position:number)=>({entity,attribute,value,position,validFrom:V});
const fixed=[row('pl:a','location','loc:a',1),row('loc:a','jurisdiction','jur:a',1)];
const histories:any={1:fixed,2:[row('loc:a','jurisdiction','jur:b',2)],5:[row('pl:a','location','loc:b',5)]};
let expired=false, reads:number[]=[];
class Expired extends Error {readonly _tag='BasisNotAvailable';}
const open=(name:string)=>new DependencyIndex(path.join(root,name+'.db'),{consumer:'c',validAt:V,initialRelease:W0.R1.hash,plans:dependencyPlans(),resolveActivation,readRefs:async(_,p)=>{reads.push(p); if(expired)throw new Expired('retained basis expired');return histories[p]??[];}});
const snap=(d:DependencyIndex)=>({checkpoint:d.checkpoint('c'),deps:d.dependencySnapshot('c'),effects:d.effects('c'),affected:d.affected('c')});
test('restart, before-state shared-hop change, duplicate and overlapping deliveries preserve exact dependency answers',async()=>{
 let d=open('restart'); const p1=page(1,[['pl:a','location'],['loc:a','jurisdiction']]); await d.consume(null,p1); d.close();
 d=open('restart'); assert.deepEqual(d.reach([['jur:a','stateMinWageCents']],W0.R1.hash),['pl:a']);
 const before=[{subject:'pl:a',facts:[{e:'pl:a',a:'location',v:'loc:a',tx:1},{e:'loc:a',a:'jurisdiction',v:'jur:a',tx:1}]}];
 const writes:[string,string][]=[['loc:a','jurisdiction'],['jur:b','stateMinWageCents']];
 const p2=page(2,writes); await d.consume(d.checkpoint('c'),p2); assert.deepEqual(d.affectedAt('c','0','2'),oracle(before,writes,1));
 const p3=page(3,[['jur:a','stateMinWageCents']]); await d.consume(d.checkpoint('c'),p3); assert.deepEqual(d.affectedAt('c','0','3'),[]);
 const at3=snap(d); await d.consume(d.checkpoint('c'),p3); assert.deepEqual(snap(d),at3); d.close();
 d=open('restart'); const p4=page(4,[['jur:b','stateMinWageCents']]); const overlap={entries:[...p2.entries,...p3.entries,...p4.entries],cursor:p4.cursor};
 await d.consume(d.checkpoint('c'),overlap); assert.deepEqual(d.affectedAt('c','0','4'),['pl:a']); assert.deepEqual(d.affectedAt('c','0','3'),[]);
 const final=snap(d); await d.consume(d.checkpoint('c'),overlap); assert.deepEqual(snap(d),final); assert.equal(d.effects('c').length,3); d.close();
 const baseline=open('baseline'); for(const p of [p1,p2,p3,p4])await baseline.consume(baseline.checkpoint('c'),p); assert.deepEqual(snap(baseline),final); baseline.close();
 fs.writeFileSync(path.join(root,'restart-state.json'),JSON.stringify({final,reads},null,2));
});
test('typed pinned-read expiry survives reopen and refuses without advancing any durable table, then retries same position',async()=>{
 let d=open('expiry'); const p1=page(1,[['pl:a','location'],['loc:a','jurisdiction']]); await d.consume(null,p1); d.close();d=open('expiry');
 const before=snap(d),next=page(5,[['pl:a','location']]); expired=true;
 await assert.rejects(d.consume(d.checkpoint('c'),next),(e:any)=>e._tag==='BasisNotAvailable'); assert.deepEqual(snap(d),before); d.close();
 expired=false;d=open('expiry'); assert.deepEqual(snap(d),before);await d.consume(d.checkpoint('c'),next);assert.deepEqual(d.reach([['loc:b','jurisdiction']],W0.R1.hash),['pl:a']);assert.equal(d.checkpoint('c')!.token,'5');d.close();
});

// [CX-VDI01] Why: test the shipped readers' own refusal paths, rather than injecting an already typed callback error. Rejected: counting propagation of a test-created error as typed adapter-refusal coverage.
test('GAP: shipped reference readers emit plain Error for an unavailable requested basis',async()=>{
 const errors:any[]=[];
 const reader=storageReferenceReader({storage:{currentCommitPosition:()=>5,getByEntities:()=>{throw Error('must not read');}},run:async(e:any)=>e},true);
 try{await reader(['pl:a'],1,V);assert.fail('expected unavailable historical basis');}catch(e){errors.push(e);}
 const memory=memoryReferenceReader({sweepPage:async()=>({rows:[],reportedBasis:{position:5,validAt:V}})} as any);
 try{await memory(['pl:a'],1,V);assert.fail('expected unavailable memory basis');}catch(e){errors.push(e);}
 assert.equal(errors[0].message,'BasisNotAvailable');assert.equal(errors[1].message,'Memory reference basis unavailable');
 for(const e of errors){assert.equal(e.name,'Error');assert.equal(e._tag,undefined);assert.equal(e.reason,undefined);}
 fs.writeFileSync(path.join(root,'untyped-refusal.json'),JSON.stringify(errors.map(e=>({name:e.name,message:e.message,tag:e._tag??null,reason:e.reason??null})),null,2));
});
