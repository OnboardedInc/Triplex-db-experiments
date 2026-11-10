// [DX-B8-C] Why: compare every raced pinned answer with a separate gateway whose parsed/revision caches are disabled.
// Rejected: comparing two requests through the same cache, or allowing either reader to drift to a newer cut.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {Effect,Layer,ManagedRuntime} from 'effect';
import {Triples} from '../../core/dist/index.js';
import {Runtime,StorageAdapter,QueryExecutor,DatabaseScope,Capabilities} from '../../core/dist/runtime/index.js';
import {DatomicClient,makeDatomicStorageAdapter,makeDatomicQueryExecutor} from '../dist/index.js';
const write=process.env.DATOMIC_URL,read=process.env.DATOMIC_READ_URLS.split(',')[0],uncached=process.env.B8_UNCACHED_URL;
assert.ok(write&&read&&uncached);
const report={kind:'cached versus independent uncached gateway exactness race',layouts:[]};
for(const layout of ['legacy','lean']){
 const scope=DatabaseScope.test(`b8-report-race-${layout}-${randomUUID()}`),clients=[];
 const make=url=>{const client=new DatomicClient(url,35000),adapter=makeDatomicStorageAdapter(client,scope,{layout});clients.push(client);return{client,adapter};};
 const transcript=`/driver/report-revision-race-${layout}.ndjson`;fs.writeFileSync(transcript,'',{flag:'wx'});
 const record=value=>fs.appendFileSync(transcript,JSON.stringify(value)+'\n');
 const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const w=make(write),runtime=ManagedRuntime.make(Runtime.define({name:'b8-report-race',storage:Layer.succeed(StorageAdapter,w.adapter),queries:Layer.succeed(QueryExecutor,makeDatomicQueryExecutor(w.client,scope))}).layer({scope,capabilities:Capabilities.none}));
 try{
  const triples=await runtime.runPromise(Triples),ops=[];
  for(let i=0;i<8;i++){
   ops.push({op:'assert',entityId:'root',attribute:':b8/link',value:{type:'ref',value:`e${i}`},validFrom:0});
   ops.push({op:'assert',entityId:`e${i}`,attribute:':b8/value',value:{type:'string',value:'initial'},validFrom:0});
   ops.push({op:'assert',entityId:'root',attribute:':b8/fixed',value:{type:'ref',value:`fixed${i}`},validFrom:0});
   ops.push({op:'assert',entityId:`fixed${i}`,attribute:':b8/value',value:{type:'string',value:'fixed'},validFrom:0});
  }
  const seed=await runtime.runPromise(triples.transact(ops));record({kind:"seed",scope,ops,receipt:seed});let newest=seed.position,running=true;
  const old=seed.position,ids=new Map(seed.triples.filter(t=>t.attribute===':b8/value'&&t.entityId.startsWith('e')).map(t=>[t.entityId,t.id]));
  const readers=Array.from({length:8},()=>({cached:make(read),oracle:make(uncached),comparisons:0}));
  for(const r of readers){const result=await Effect.runPromise(r.cached.adapter.getReachTriples('root',{validAt:0,recordedPosition:old}));assert.ok(result);}
  const writer=(async()=>{
   try{for(let i=0;i<1200;i++){
    const entity=`e${i%8}`,changes=[{op:'retract',id:ids.get(entity)},{op:'assert',entityId:entity,attribute:':b8/value',value:{type:'string',value:`version-${i}`},validFrom:0}];
    if(i%3===0)changes.push({op:'assert',entityId:'append-only',attribute:':b8/value',value:{type:'integer',value:String(i)},validFrom:0});
    const receipt=await runtime.runPromise(triples.transact(changes));assert.equal(receipt.position,newest+1);record({kind:"commit",scope,i,changes,receipt});ids.set(entity,receipt.triples.find(t=>t.entityId===entity&&t.attribute===':b8/value').id);newest=receipt.position;
   }}finally{running=false;}
  })();
  await Promise.all([writer,...readers.map(async(r,index)=>{
   let i=0;
   while(running||i<1000){
    const cut=i%5===0?old:newest,root=i%7===0?'append-only':i%11===0?'absent':'root';
    const basis={validAt:i%2===0?0:Date.now(),recordedPosition:cut};
    const [actual,expected]=await Promise.all([Effect.runPromise(r.cached.adapter.getReachTriples(root,basis)),Effect.runPromise(r.oracle.adapter.getReachTriples(root,basis))]);
    assert.ok(actual);assert.ok(expected);assert.deepEqual(actual,expected,JSON.stringify({scope,layout,index,i,root,basis}));record({kind:"comparison",scope,index,i,root,basis,actualSha256:digest(actual),expectedSha256:digest(expected)});r.comparisons++;i++;
   }
  })]);
  const c=(await(await fetch(read+'/v2/admin/scan-stats')).json()).entityCache;
  const o=(await(await fetch(uncached+'/v2/admin/scan-stats')).json()).entityCache;
  assert.equal(c.verify,true);assert.ok(c.recentHits>0);assert.equal(c.recentVerified,c.recentHits);assert.equal(c.verificationErrors,0);assert.ok(c.verified>=c.hits+c.revisionHits+c.recentHits);assert.ok(c.bytes<=c.budgetBytes);assert.equal(o.budgetBytes,0);assert.equal(o.bytes,0);assert.equal(o.hits,0);assert.equal(o.revisionHits,0);assert.equal(o.recentHits,0);
  const row={layout,scope,seedPosition:old,finalPosition:newest,writerCommits:1200,comparisons:readers.reduce((n,r)=>n+r.comparisons,0),cached:c,uncached:o};report.layouts.push(row);console.log(JSON.stringify(row));
 }finally{await runtime.dispose();await w.client.delete(scope);for(const c of clients)c.close();}
}
fs.writeFileSync('/driver/report-revision-race.json',JSON.stringify(report));
