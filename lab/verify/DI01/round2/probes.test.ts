// [CX-VDI01-R2] Why: verify all fixed guards and the consumer's independent basis validator through shipped readers. Rejected: accepting helper-only typing while the final guard still returns plain Error.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {DependencyIndex} from '../../../../packages/host/dist/feed/index.js';
import {BasisNotAvailable,dependencyPlans,resolveActivation,memoryReferenceReader,storageReferenceReader} from '../../../bench/lib/di01-refs.ts';
import * as W0 from '../../../../packages/w0/dist/index.js';
const root=process.env.CX_VDI01_R2!;assert(root);fs.mkdirSync(root,{recursive:true});
const V=Date.parse(W0.POPULATION_VALID_TIME),run=async(e:any)=>e;
const serialize=(e:any)=>({name:e.name,message:e.message,tag:e._tag??null,reason:e.reason??null,requested:e.requested??null,availableHead:e.availableHead??null,reportedBasis:e.reportedBasis??null,detail:e.detail??null});
const fixed:any[]=[];
const check=async(reader:any,reason:string,extra:any)=>{
 await assert.rejects(reader(['pl:a'],5,V),(e:any)=>{assert(e instanceof BasisNotAvailable);assert.equal(e._tag,'BasisNotAvailable');assert.equal(e.reason,reason);assert.deepEqual(e.requested,{position:5,validAt:V});for(const [k,v]of Object.entries(extra))assert.deepEqual(e[k],v);fixed.push(serialize(e));return true;});
};
test('four former guards carry the shared refusal and requested/known basis; backend errors keep identity',async()=>{
 await check(memoryReferenceReader({sweepPage:async()=>({rows:[],reportedBasis:{position:6,validAt:V+1}})} as any),'reported-basis-mismatch',{reportedBasis:{position:6,validAt:V+1}});
 await check(storageReferenceReader({storage:{currentCommitPosition:()=>6,getByEntities:()=>{throw Error('must not read');}},run},true),'head-moved',{availableHead:6});
 let calls=0;await check(storageReferenceReader({storage:{currentCommitPosition:()=>++calls===1?5:6,getByEntities:()=>new Map()},run},true),'head-moved',{availableHead:6});
 await check(storageReferenceReader({storage:{currentCommitPosition:()=>7,getByEntities:()=>new Map([['pl:a',[{entity_id:'pl:a',attribute:'location',value_string:'loc:a',recorded_position:6,valid_from:V}]]])},run}),'row-outside-basis',{availableHead:7});
 const error=Object.assign(new Error('expiry witness'),{_tag:'RetentionExpired',retentionFloor:9});
 for(const reader of [memoryReferenceReader({sweepPage:async()=>{throw error;}} as any),storageReferenceReader({storage:{currentCommitPosition:()=>10,getByEntities:()=>Promise.reject(error)},run})])await assert.rejects(reader(['pl:a'],5,V),(e:any)=>e===error);
 fs.writeFileSync(path.join(root,'four-guards.json'),JSON.stringify(fixed,null,2));
});
test('GAP: consumer prepare still emits plain Error for a future reference row, with unchanged durable state and same-page recovery',async()=>{
 let future=true;const file=path.join(root,'remaining-basis.db');
 const reader=memoryReferenceReader({sweepPage:async(_:any,basis:any)=>({reportedBasis:basis,rows:[{entityId:'pl:a',attribute:'location',value:{type:'ref',value:'loc:a'},position:future?2:1,validFrom:V}]})} as any);
 const open=()=>new DependencyIndex(file,{consumer:'c',validAt:V,initialRelease:W0.R1.hash,plans:dependencyPlans(),resolveActivation,readRefs:reader});
 const snapshot=(d:DependencyIndex)=>({checkpoint:d.checkpoint('c'),dependencies:d.dependencySnapshot('c'),effects:d.effects('c'),affected:d.affected('c')});
 const page:any={cursor:{source:'review/DI01/r2',token:'1'},entries:[{kind:'commit',stream:'s',epoch:'0',offset:'1',transactions:[{positions:['1'],txIds:['tx1'],commandIds:['cmd1'],operationId:'op1',stamp:null,stampStatus:'pending-RT01',changes:[{op:'assert',entity:'pl:a',attribute:'location',assertionId:'a1',position:'1',validFrom:V,validTo:null}]}]}]};
 let d=open();const before=snapshot(d);let observed:any;
 await assert.rejects(d.consume(null,page),(e:any)=>{observed=serialize(e);assert.equal(e.message,'Pinned reference reader returned invalid basis');assert.equal(e.name,'Error');assert.equal(e._tag,undefined);assert.equal(e.reason,undefined);assert.equal(e.requested,undefined);return true;});
 assert.deepEqual(snapshot(d),before);d.close();d=open();assert.deepEqual(snapshot(d),before);future=false;await d.consume(null,page);assert.equal(d.checkpoint('c')!.token,'1');assert.deepEqual(d.reach([['loc:a','jurisdiction']],W0.R1.hash),['pl:a']);
 fs.writeFileSync(path.join(root,'remaining-basis-guard.json'),JSON.stringify({requested:{position:1,validAt:V},observedRowPosition:2,error:observed,before,afterRetry:snapshot(d)},null,2));d.close();
});
