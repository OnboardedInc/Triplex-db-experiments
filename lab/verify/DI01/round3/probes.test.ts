// [CX-VDI01-R3] Why: invert the exact R2-F1 reproduction and measure that every row-refusal occurs before BEGIN. Rejected: accepting a tagged payload without checking durable state, class identity, and same-page recovery.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {DependencyIndex,BasisNotAvailable as HostRefusal} from '../../../../packages/host/dist/feed/index.js';
import {BasisNotAvailable as LabRefusal,dependencyPlans,resolveActivation,memoryReferenceReader} from '../../../bench/lib/di01-refs.ts';
import * as W0 from '../../../../packages/w0/dist/index.js';
const root=process.env.CX_VDI01_R3!;assert(root);fs.mkdirSync(root,{recursive:true});
const V=Date.parse(W0.POPULATION_VALID_TIME);
const page:any={cursor:{source:'review/DI01/r3',token:'1'},entries:[{kind:'commit',stream:'s',epoch:'0',offset:'1',transactions:[{positions:['1'],txIds:['tx1'],commandIds:['cmd1'],operationId:'op1',stamp:null,stampStatus:'pending-RT01',changes:[{op:'assert',entity:'pl:a',attribute:'location',assertionId:'a1',position:'1',validFrom:V,validTo:null}]}]}]};
const open=(name:string,readRefs:any)=>new DependencyIndex(path.join(root,name+'.db'),{consumer:'c',validAt:V,initialRelease:W0.R1.hash,plans:dependencyPlans(),resolveActivation,readRefs});
const snapshot=(d:DependencyIndex)=>({checkpoint:d.checkpoint('c'),dependencies:d.dependencySnapshot('c'),effects:d.effects('c'),affected:d.affected('c')});
const row={entity:'pl:a',attribute:'location',value:'loc:a',position:1,validFrom:V};
const observed=(r:any)=>Object.fromEntries(['entity','attribute','position','retractedPosition','validFrom','validTo'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
const errorView=(e:any)=>({name:e.name,tag:e._tag,reason:e.reason,requested:e.requested,observedRow:e.observedRow,detail:e.detail});
async function beforeBegin(action:()=>Promise<void>){
 const exec=DatabaseSync.prototype.exec;let begins=0;
 DatabaseSync.prototype.exec=function(sql:string){if(/\bBEGIN\s+IMMEDIATE\b/i.test(sql))begins++;return exec.call(this,sql);};
 try{await action();assert.equal(begins,0,'refusal must precede the write transaction');}finally{DatabaseSync.prototype.exec=exec;}
 return begins;
}
test('host and lab export the identical class; exact R2 GAP is now tagged, unchanged after reopen, then identical page succeeds',async()=>{
 assert.equal(HostRefusal,LabRefusal);let future=true;
 const reader=memoryReferenceReader({sweepPage:async(_:any,basis:any)=>({reportedBasis:basis,rows:[{entityId:'pl:a',attribute:'location',value:{type:'ref',value:'loc:a'},position:future?2:1,validFrom:V}]})} as any);
 let d=open('exact-gap',reader);const before=snapshot(d);let error:any;
 const begins=await beforeBegin(()=>assert.rejects(d.consume(null,page),(e:any)=>{assert(e instanceof HostRefusal);assert(e instanceof LabRefusal);assert.equal(e._tag,'BasisNotAvailable');assert.equal(e.reason,'row-outside-basis');assert.deepEqual(e.requested,{position:1,validAt:V});assert.deepEqual(e.observedRow,observed({...row,position:2}));error=errorView(e);return true;}));
 assert.deepEqual(snapshot(d),before);d.close();d=open('exact-gap',reader);assert.deepEqual(snapshot(d),before);future=false;await d.consume(null,page);assert.equal(d.checkpoint('c')!.token,'1');assert.deepEqual(d.reach([['loc:a','jurisdiction']],W0.R1.hash),['pl:a']);
 fs.writeFileSync(path.join(root,'exact-gap.json'),JSON.stringify({error,beginImmediateCallsDuringRefusal:begins,before,afterRetry:snapshot(d)},null,2));d.close();
});
test('all five row-condition groups return requested and complete observed coordinates before BEGIN; reader error identity survives',async()=>{
 const cases:[string,any][]=[['unrequested',{...row,entity:'pl:other'}],['future-position',{...row,position:2}],['zero-position',{...row,position:0}],['fractional-position',{...row,position:1.5}],['retracted',{...row,retractedPosition:1}],['future-valid-from',{...row,validFrom:V+1}],['bounded-valid-to',{...row,validTo:V+1000}]];
 const records:any[]=[];
 for(const [name,bad]of cases){const d=open(name,async()=>[bad]),before=snapshot(d);let error:any;
  const begins=await beforeBegin(()=>assert.rejects(d.consume(null,page),(e:any)=>{assert(e instanceof HostRefusal);assert.equal(e._tag,'BasisNotAvailable');assert.equal(e.reason,'row-outside-basis');assert.deepEqual(e.requested,{position:1,validAt:V});assert.deepEqual(e.observedRow,observed(bad));assert.equal(e.observedRow.attribute,'location');error=errorView(e);return true;}));
  assert.deepEqual(snapshot(d),before);d.close();const reopened=open(name,async()=>[bad]);assert.deepEqual(snapshot(reopened),before);reopened.close();records.push({name,error,beginImmediateCallsDuringRefusal:begins});
 }
 const original=Object.assign(new Error('expiry witness'),{_tag:'RetentionExpired',retentionFloor:7});const d=open('backend-error',async()=>{throw original;}),before=snapshot(d);
 await beforeBegin(()=>assert.rejects(d.consume(null,page),(e:any)=>e===original));assert.deepEqual(snapshot(d),before);d.close();
 fs.writeFileSync(path.join(root,'row-matrix.json'),JSON.stringify({records,backendErrorIdentityPreserved:true},null,2));
});
