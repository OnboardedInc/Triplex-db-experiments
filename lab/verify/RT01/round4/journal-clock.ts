// [CX-VRT01-R4] Why: independently probe every logical journal method and distinct explicit business times, including a reader behind stagedAt. Rejected: relying on a negative control whose validAt equals the runtime clock.
import {Effect,Layer} from 'effect';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Triples,EntityId,string,journalBasis} from '../../../../packages/core/dist/index.js';
import {KvTriplesLive} from '../../../../packages/core/dist/kv/layers/KvTriplesLive.js';
import {KvBackend} from '../../../../packages/core/dist/kv/kv/KvBackend.js';
import {makeTestKvBackend} from '../../../../packages/core/dist/kv/kv/InMemoryKvBackend.js';
import {TripleStoreRuntime} from '../../../../packages/core/dist/store/TripleStoreRuntime.js';
import {makeA0RecordTimeSuite} from '../../../../packages/testkit/dist/index.js';
import {makeXtdbStorageAdapter} from '../../../../packages/xtdb/src/XtdbStorageAdapter.js';
import {makeXtdbQueryExecutor} from '../../../../packages/xtdb/src/XtdbQueryExecutor.js';
import {makeQleverStorageAdapter} from '../../../../packages/qlever/src/QleverStorageAdapter.js';
import {makeRecordTimeClient as qTransport} from '../../../../packages/qlever/test/fixtures/record-time-client.js';
import {sqlTransport} from './sql-transport.js';
const out=process.argv[2];mkdirSync(out,{recursive:true});
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const transportSource=sha('lab/verify/RT01/round4/sql-transport.ts');
const results:any[]=[];
for(const lane of ['xtdb','qlever','kv'])for(const commitEncoding of (lane==='kv'?['kv']:['a0','compact']) as any[]){
 let clock=1000,id=0;const scope='review-r4-'+lane+'-'+commitEncoding;
 const transport:any=lane==='xtdb'?sqlTransport():lane==='qlever'?qTransport():undefined;
 const adapter=lane==='xtdb'?makeXtdbStorageAdapter(transport.client,scope,{commitEncoding}):lane==='qlever'?makeQleverStorageAdapter(transport.client,scope,{commitEncoding}):undefined;
 const executor=lane==='xtdb'?makeXtdbQueryExecutor(transport.client,scope):{} as any;
 const suite=adapter?makeA0RecordTimeSuite(adapter,executor,scope,{loseNextAck:()=>{}}):undefined;
 const layer=suite?.layer??KvTriplesLive.pipe(Layer.provide(Layer.succeed(KvBackend,makeTestKvBackend())),Layer.provide(Layer.succeed(TripleStoreRuntime,{scope,now:Effect.sync(()=>clock),nextTxId:Effect.sync(()=>'_tx/'+String(++id).padStart(26,'0')),nextTripleId:Effect.sync(()=>String(++id).padStart(26,'0') as any)})));
 const set=(v:number)=>{clock=v;suite?.clock.set(v);};
 const observed=await Effect.runPromise(Effect.gen(function*(){
  const t=yield* Triples;const subject=EntityId.make('subject');
  const ops=(value:string,from:number,to:number)=>[{op:'assert' as const,entityId:subject,attribute:':value',value:string(value),validFrom:from,validTo:to}];
  set(1000);const first=yield* t.transact(ops('first',1000,2000),{commandId:'first'});
  const original=yield* t.transaction(first.txId);assert.ok(original);assert.equal(original.position,first.position);assert.equal(original.instant,first.instant);assert.equal(original.changes.length,1);assert.equal(original.changes[0].validFrom,1000);
  const initial=lane!=='qlever'?yield* t.transactionsForEntity(subject,{snapshotPosition:first.position}):undefined;
  const samples:any[]=[];for(const value of [900,0,1000]){set(value);const record=yield* t.transaction(first.txId),command=yield* t.transactionByCommand('first'),feed=yield* t.transactions();assert.deepEqual(record,original);assert.deepEqual(command,original);assert.deepEqual(feed.transactions,[original]);const page=lane!=='qlever'?yield* t.transactionsForEntity(subject,{snapshotPosition:first.position}):undefined;if(page)assert.deepEqual(page,initial);samples.push({clock:value,record,command,feed,page});}
  set(5000);const ahead=yield* t.transact(ops('ahead',5000,6000),{commandId:'ahead'});const latest=yield* t.transaction(ahead.txId);assert.ok(latest);assert.equal(latest.instant,ahead.instant);
  const page=lane!=='qlever'?yield* t.transactionsForEntity(subject,{snapshotPosition:ahead.position,limit:1}):undefined;
  const after:any[]=[];for(const value of [800,0,1000,5000,7000]){set(value);const a=yield* t.transaction(ahead.txId),f=yield* t.transactions(),c=yield* t.transactionByCommand('ahead'),tail=yield* t.transactions({after:first.position});assert.deepEqual(a,latest);assert.deepEqual(c,latest);assert.deepEqual(f.transactions,[original,latest]);assert.deepEqual(tail.transactions,[latest]);let p:any,next:any,old:any;if(page){p=yield* t.transactionsForEntity(subject,{snapshotPosition:ahead.position,limit:1});assert.deepEqual(p,page);assert.equal(p.transactions[0].txId,ahead.txId);assert.equal(p.nextBeforePosition,ahead.position);next=yield* t.transactionsForEntity(subject,{snapshotPosition:ahead.position,beforePosition:p.nextBeforePosition,limit:1});assert.deepEqual(next.transactions,[original]);old=yield* t.transactionsForEntity(subject,{snapshotPosition:first.position});assert.deepEqual(old,initial);}after.push({clock:value,record:a,command:c,feed:f,tail,page:p,next,old});}
  set(800);const normal:any[]=[];
  for(const validAt of [0,900,1000,1500,1999,2000,4999,5000,5999,6000,7000]){
   const expected=validAt>=1000&&validAt<2000?['first']:validAt>=5000&&validAt<6000?['ahead']:[];const b={validAt,recordedAt:ahead.instant};
   const check=(rows:any[])=>assert.deepEqual(rows.map(r=>r.value.value).sort(),expected);
   const entity=yield* t.entity(subject,b),match=yield* t.match({entityId:subject,attribute:':value'},b),entities=yield* t.entities([subject],b);check(entity);check(match);check(entities[0]);
   const leaked=yield* t.entity(subject,{...b,allValidTime:true} as any);check(leaked);
   let query:any,raw:any;if(lane!=='qlever'){query=yield* t.queryAll({find:['?v'],where:[[subject,':value','?v']]},{basis:b});assert.deepEqual(query.results.map(r=>r['?v']).sort(),expected);}
   if(adapter){raw=yield* adapter.query({entityId:subject},{...b,recordedPosition:ahead.position});assert.deepEqual(raw.map(r=>r.value_string).sort(),expected);}
   normal.push({validAt,expected,entity,match,entities,query,raw});
  }
  const all=adapter?yield* adapter.query({entityId:subject},journalBasis(ahead.position)):undefined;if(all)assert.equal(all.length,2);
  return{scope,lane,commitEncoding,first,ahead,original,latest,initial,samples,after,normal,transportSource};
 }).pipe(Effect.provide(layer)));
 const name=lane+'-'+commitEncoding;writeFileSync(out+'/'+name+'-observed.json',JSON.stringify(observed,null,2)+'\n');
 if(transport)writeFileSync(out+'/'+name+'-transport.json',JSON.stringify(transport.calls,null,2)+'\n');
 results.push({name,clockReads:observed.samples.length+observed.after.length,validAtCuts:observed.normal.length,fullJournalPage:lane!=='qlever'});
 transport?.db?.close();console.log(name,'matched');
}
assert.equal(transportSource,sha('lab/verify/RT01/round4/sql-transport.ts'));
writeFileSync(out+'/summary.json',JSON.stringify(results,null,2)+'\n');
