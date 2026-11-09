// [CX-VP2B-R2] Why: independently reproduce the prior receipt and WAL failures at controlled real SQLite boundaries. Rejected: adopting builder PASS counters or timing-only overlap guesses.
import {it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {Worker} from 'node:worker_threads';
import {Effect,Layer,ManagedRuntime} from 'effect';
import {Triples,string} from '@triplex-build/triplex';
import {Runtime,StorageAdapter,QueryExecutor,DatabaseScope,Capabilities} from '@triplex-build/triplex/runtime';
import {HostBroker} from '../../../../packages/broker/src/broker.js';
import {makeBrokerStorageAdapter} from '../../../../packages/broker/src/StorageAdapter.js';
import {MemoryBrokerReplica} from '../../../../packages/broker/src/memory.js';
import {snapshotRows} from '../../../../packages/broker/src/snapshot.js';
import {BrokerReadService} from '../../../../packages/broker/src/reader-service.js';
import {LogFeed} from '../../../../packages/broker/src/feed.js';
const req=createRequire(import.meta.url),root='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2B/round2';
const attempt='independent-'+randomUUID(),out=path.join(root,attempt);fs.mkdirSync(out,{recursive:true});
const observations:any[]=[];
const note=(name:string,data:any)=>{observations.push({name,data});fs.writeFileSync(path.join(out,'observations.json'),JSON.stringify({attempt,candidate:'e9f0014b0181ec536ffba599551a68a3f5bdb5cd',node:process.version,observations},null,2)+'\n');};
const open=(name:string,extra={})=>HostBroker.open({dir:path.join(out,name),scopeKey:'review-r2',decisionStamp:true,autoApply:false,minFreeBytes:5*1024**3,...extra});
const row=(id:string,value=id)=>({id,entity_id:'subject',attribute:':review',value_type:'string' as const,value_string:value,value_number:null,value_boolean:null,value_datetime:null,value_json:null,recorded_at:1,recorded_position:-1,valid_from:0,valid_to:null,created_by:null,retracted_at:null,retracted_position:null,retract_tx_id:null,entity_type:null,schema_version:1,tx_id:id});
const tx=(id:string,rows:any[],sourceK=0)=>({operationId:id,attemptId:id,sourceK,reads:{entities:new Set<string>(),scopeWide:false},claims:[],placeholders:[-1],rows,priors:new Map(),newIds:new Set(rows.filter(r=>r.recorded_position<0).map(r=>r.id))});
const send=async(b:HostBroker,id:string,rows:any[])=>{const result=await b.submit(tx(id,rows,b.head()));if(result.kind!=='committed')throw Error('Unexpected conflict');return result;};
const pos=(r:any)=>[...r.positions.values()][0] as number;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const until=async(f:()=>boolean)=>{const end=performance.now()+20000;while(!f()){if(performance.now()>end)throw Error('Control gate timed out');await sleep(2);}};
const outcome=(p:Promise<any>)=>p.then(value=>({value}),error=>({error}));
const worker=async(b:HostBroker)=>{
 const gate=new Int32Array(new SharedArrayBuffer(8)),w=new Worker(path.resolve('lab/verify/P2B/round2/read-worker.cjs'),{workerData:{file:b.segmentPath,watermark:b.readerWatermark.buffer,gate:gate.buffer,tsx:req.resolve('tsx/cjs'),source:path.resolve('packages/broker/src/reader-service.ts')}});
 const pending=new Map<number,any>();let serial=0;
 w.on('message',p=>{const waiter=pending.get(p.id);if(waiter){pending.delete(p.id);p.error?waiter.reject(Object.assign(Error(p.error.message),p.error)):waiter.resolve(p.result);}});
 await new Promise<void>((resolve,reject)=>{w.once('message',p=>p.ready?resolve():reject(Error('Worker not ready')));w.once('error',reject);});
 const call=(op:string,args={})=>new Promise<any>((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});w.postMessage({id,op,...args});});
 const release=()=>{Atomics.store(gate,1,1);Atomics.notify(gate,1);};
 return{gate,call,release,close:async()=>{release();await call('close');await w.terminate();}};
};
const runtime=(b:HostBroker,replica:MemoryBrokerReplica,duplicateWaitMs:number)=>{
 const adapter=makeBrokerStorageAdapter(replica,'review-r2',b,{basisWaitMs:0,duplicateWaitMs});
 const refused=()=>Effect.die(Error('No Datalog in offline review'));
 return ManagedRuntime.make(Runtime.define({name:'r2-review',storage:Layer.succeed(StorageAdapter,adapter),queries:Layer.succeed(QueryExecutor,{execute:refused,executePage:refused,explain:refused,explainPage:refused})}).layer({scope:DatabaseScope.test('review-r2'),capabilities:Capabilities.none}));
};

it('F1 original callback reproduction waits through a concurrent checkpoint and returns the exact original public receipt',async()=>{
 const replica=new MemoryBrokerReplica(),b=await open('duplicate-checkpoint',{replica}),normal=runtime(b,replica,2000),short=runtime(b,replica,30);
 let release!:()=>void,reached!:()=>void,first:any,retry:any;
 const gate=new Promise<void>(r=>release=r),at=new Promise<void>(r=>reached=r),log=(b as any).log,append=log.append.bind(log);
 log.append=async(...args:any[])=>{const result=await append(...args);reached();await gate;return result;};
 try{
  const triples=await normal.runPromise(Triples),fast=await short.runPromise(Triples);
  const write=(value:string)=>[{op:'assert' as const,entityId:'subject' as any,attribute:':review/f1' as any,value:string(value)}];
  first=normal.runPromise(triples.transact(write('original'),{commandId:'shared-command'}));await at;
  expect(b.head()).toBe(0);expect(b.readerWatermark.read().position).toBe(0);
  const started=performance.now();
  await expect(short.runPromise(fast.transact(write('timeout'),{commandId:'shared-command'}))).rejects.toMatchObject({reason:'duplicate-publication-timeout'});
  expect(performance.now()-started).toBeLessThan(1500);
  let settled=false;retry=normal.runPromise(triples.transact(write('retry'),{commandId:'shared-command'})).then(()=>{throw Error('Duplicate executed');},e=>{settled=true;return e;});
  const checkpoint=await b.checkpoint();await sleep(40);expect(settled).toBe(false);
  release();const original=await first,error=await retry;
  expect(error).toMatchObject({_tag:'CommandAlreadyCommittedError',transactionId:original.txId});
  const originalReceipt=await normal.runPromise(triples.transaction(original.txId));
  expect(await normal.runPromise(triples.transaction(error.transactionId))).toEqual(originalReceipt);
  expect(originalReceipt).toMatchObject({txId:original.txId,position:original.position,instant:original.instant,commandId:'shared-command'});
  expect(b.stats().commits).toBe(1);
  note('F1-checkpoint',{checkpoint,original,receipt:originalReceipt,timeoutElapsedMs:performance.now()-started});
 }finally{release();if(first)await first;if(retry)await retry;await normal.dispose();await short.dispose();await b.close();}
});

it('F1 same-operation lost-ACK retry stays pending with a behind watermark and replays exact identity after publication',async()=>{
 const b=await open('lost-ack-behind');let release!:()=>void,reached!:()=>void,first:any,retry:any;
 const gate=new Promise<void>(r=>release=r),at=new Promise<void>(r=>reached=r),log=(b as any).log,publish=log.publishWatermarkAsync.bind(log);
 log.publishWatermarkAsync=async(mark:any)=>{reached();await gate;return publish(mark);};
 const input={...tx('lost-ack',[row('original')]),claims:[{commandId:'lost-command',txId:'original-tx'}]};
 try{
  first=b.submit(input);await at;
  const newHead=b.head();expect(newHead).toBeGreaterThan(0);expect(b.readerWatermark.read().position).toBe(0);
  await expect(b.claimAsync('lost-command',25)).rejects.toMatchObject({reason:'duplicate-publication-timeout'});
  let settled=false;retry=b.submit({...input,attemptId:'retry'}).then(r=>{settled=true;return r;});
  const checkpoint=await b.checkpoint();await sleep(35);expect(settled).toBe(false);
  release();const a=await first,c=await retry;expect(c).toMatchObject({kind:'committed',replayed:true,lsn:a.lsn,epoch:a.epoch,positions:a.positions,stamp:a.stamp});
  expect(await b.claimAsync('lost-command',50)).toEqual({txId:'original-tx',position:newHead});
  const feed=new LogFeed(path.dirname(b.segmentPath)),page=await feed.poll(feed.start());
  expect(page.resolutions.filter(r=>r.kind==='commit').flatMap(r=>r.transacts.map(t=>t.position))).toEqual([newHead]);
  expect(b.stats().commits).toBe(1);note('F1-lost-ack-behind',{checkpoint,first:a,retry:c,published:b.readerWatermark.read(),feed:page});
 }finally{release();if(first)await first;if(retry)await retry;await b.close();}
});

it('F2 prior post-marker descheduling holds no snapshot; checkpoint and writes progress before the worker resumes',async()=>{
 const b=await open('post-marker',{maxWalBytes:128*1024**2});let w:any,held:any;
 try{
  const seed=await send(b,'seed',[row('seed')]);const original=(await b.pullAt(pos(seed),{})).rows;w=await worker(b);
  held=outcome(w.call('pull',{basis:pos(seed),pause:'probe'}));await until(()=>Atomics.load(w.gate,0)===1);
  let refused=0;const sizes=[];
  for(let i=0;i<48;i++){
   const input=tx(`large-${i}`,[row(`large-${i}`,'x'.repeat(512*1024))],b.head());
   const result=await outcome(b.submit(input));
   if(result.error){expect(result.error).toMatchObject({reason:'wal-capacity-exceeded'});refused++;expect((await b.checkpoint()).events.at(-1)?.outcome).toBe('complete');expect((await b.submit(input)).kind).toBe('committed');}
   sizes.push(fs.statSync(b.segmentPath+'-wal').size);expect(sizes.at(-1)).toBeLessThanOrEqual(128*1024**2);
  }
  const checkpoint=await b.checkpoint();expect(checkpoint.events.at(-1)?.outcome).toBe('complete');expect(fs.statSync(b.segmentPath+'-wal').size).toBe(0);
  expect(Atomics.load(w.gate,1)).toBe(0);w.release();const result=await held;
  expect(result.error).toMatchObject({reason:'read-operation-limit'});
  expect(snapshotRows((await w.call('pull',{basis:pos(seed),selection:{id:'seed'}})).rows,pos(seed))).toEqual(original);
  note('F2-post-marker',{writes:48,refused,peakWal:Math.max(...sizes),sizes,checkpoint,heldResult:result.error?.reason});
 }finally{if(w){w.release();if(held)await held;await w.close();}await b.close();}
});

it('F2 a reader stopped inside a native statement holds an actual snapshot but WAL admission refuses and recovers with the identical command',async()=>{
 const cap=16*1024**2,b=await open('inside-native',{maxWalBytes:cap});let w:any,held:any;
 try{
  const seed=await send(b,'seed',[row('seed')]);const original=(await b.pullAt(pos(seed),{})).rows;
  w=await worker(b);held=outcome(w.call('pull',{basis:pos(seed),pause:'native'}));await until(()=>Atomics.load(w.gate,0)===1);
  let failed:any;const sizes=[];
  for(let i=0;i<30;i++){
   const input=tx(`native-${i}`,[row(`native-${i}`,'x'.repeat(512*1024))],b.head()),result=await outcome(b.submit(input));
   sizes.push(fs.statSync(b.segmentPath+'-wal').size);expect(sizes.at(-1)).toBeLessThanOrEqual(cap);
   if(result.error){failed={input,error:result.error};break;}
  }
  expect(failed?.error).toMatchObject({reason:'wal-capacity-exceeded'});const before=b.head();
  expect(await b.fromLogAsync(0,{id:failed.input.rows[0].id},()=>true)).toEqual([]);
  const started=performance.now(),checkpoint=await b.checkpoint();expect(performance.now()-started).toBeLessThan(2000);expect(checkpoint.events.at(-1)?.outcome).toBe('incomplete');
  await sleep(260);w.release();expect((await held).error).toMatchObject({reason:'read-operation-limit'});
  expect((await b.checkpoint()).events.at(-1)?.outcome).toBe('complete');
  const retry=await b.submit(failed.input);expect(retry.kind).toBe('committed');expect(pos(retry)).toBeGreaterThan(before);
  expect(snapshotRows((await w.call('pull',{basis:pos(seed),selection:{id:'seed'}})).rows,pos(seed))).toEqual(original);
  expect((await w.call('state')).inTransaction).toBe(false);
  note('F2-inside-native',{cap,sizes,before,refusal:failed.error.reason,retryPosition:pos(retry),identicalOperationId:failed.input.operationId,checkpoint});
 }finally{if(w){w.release();if(held)await held;await w.close();}await b.close();}
});

it('F2 a position pin survives retirement into history, purge after lease release and subsequent source fallback',async()=>{
 const b=await open('history-pin');let w:any;
 try{
  const first=await send(b,'first',[row('old','original')]),p=pos(first),before=(await b.pullAt(p,{})).rows,old=before[0]!,pin=await b.pinBasis(p,'CX-VP2B-R2');
  w=await worker(b);
  const retired=await b.submit({...tx('retire',[{...old,retracted_position:-1,retracted_at:2},row('new','replacement')],p),priors:new Map([[old.id,old]])});
  expect(retired.kind).toBe('committed');expect((await b.purgeCurrent(b.head())).h).toBe(p);
  expect(snapshotRows((await w.call('pull',{basis:p})).rows,p)).toEqual(before);
  await pin.release();const purge=await b.purgeCurrent(b.head());expect(purge.removed).toBe(1);
  expect((await w.call('pull',{basis:p})).eligible).toBe(false);
  const rows=await w.call('source',{selection:{id:'old'}});expect(snapshotRows(rows,p)).toEqual(before);
  note('F2-history-pin',{pin:p,current:b.head(),purge,expected:before,fallback:snapshotRows(rows,p)});
 }finally{if(w)await w.close();await b.close();}
});

// [CX-VP2B-R2] Why: issue the duplicate after checkpoint dispatch, in addition to holding a duplicate across maintenance. Rejected: assuming the opposite request order covers this schedule.
it('a duplicate arriving after checkpoint request dispatch still resolves its original readable receipt',async()=>{
 const replica=new MemoryBrokerReplica(),b=await open('duplicate-after-checkpoint',{replica}),managed=runtime(b,replica,2000);
 try{
  const triples=await managed.runPromise(Triples),ops=[{op:'assert' as const,entityId:'subject' as any,attribute:':review/checkpoint' as any,value:string('original')}];
  const original=await managed.runPromise(triples.transact(ops,{commandId:'checkpoint-command'})),before=await managed.runPromise(triples.transaction(original.txId));
  const dispatchedNs=process.hrtime.bigint(),checkpointPending=b.checkpoint();
  const duplicateIssuedNs=process.hrtime.bigint(),duplicate=outcome(managed.runPromise(triples.transact(ops,{commandId:'checkpoint-command'})));
  const [checkpoint,retry]=await Promise.all([checkpointPending,duplicate]);
  expect(retry.error).toMatchObject({_tag:'CommandAlreadyCommittedError',transactionId:original.txId});
  expect(await managed.runPromise(triples.transaction(retry.error.transactionId))).toEqual(before);
  expect(b.stats().commits).toBe(1);expect(checkpoint.events.at(-1)?.outcome).toBe('complete');
  note('F1-arrival-after-checkpoint-dispatch',{dispatchedNs:dispatchedNs.toString(),duplicateIssuedNs:duplicateIssuedNs.toString(),observedDoneNs:process.hrtime.bigint().toString(),checkpoint,receipt:before});
 }finally{await managed.dispose();await b.close();}
});
