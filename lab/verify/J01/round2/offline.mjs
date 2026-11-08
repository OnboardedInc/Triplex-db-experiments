// [CX-VJ01] Why: compare baseline/off statement bytes and exercise adversarial values independently. Rejected: tests that only assert compact is a filtered copy of itself.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Effect } from 'effect';
import * as core from '../../../../packages/core/dist/index.js';
import * as x from './trees/candidate/xtdb/XtdbStorageAdapter.ts';
import * as q from './trees/candidate/qlever/QleverStorageAdapter.ts';
import * as rdf from './trees/candidate/qlever/rdf.ts';
import * as bx from './trees/main/xtdb/XtdbStorageAdapter.ts';
import * as bq from './trees/main/qlever/QleverStorageAdapter.ts';
import * as brdf from './trees/main/qlever/rdf.ts';
const out={cases:[],observations:[]};
const exact=v=>JSON.stringify(v,(_k,v)=>typeof v==='number'&&Object.is(v,-0)?{$number:'-0'}:v);
const normalize=v=>exact(v).replace(/urn:triplex:operation:[A-Za-z0-9_-]+/g,'urn:triplex:operation:<uuid>').replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g,'<uuid>');
const hash=s=>createHash('sha256').update(s).digest('hex');
const values=[core.number(-0),core.number(0),core.number(Number.MIN_VALUE),core.number(-Number.MIN_VALUE),core.number(Number.MAX_VALUE),core.number(0.1),core.number(1.0000000000000002),core.number(Number.MAX_SAFE_INTEGER),core.number(-Number.MAX_SAFE_INTEGER),core.number(2**53), ...['-9223372036854775808','9223372036854775807','-576460752303423488','576460752303423487','9007199254740993','-9007199254740993'].map(core.integer),core.string('12345678901234567890.123456789012345678'),core.string('x'.repeat(65536)+'\n"\\𝄞\u2028'),core.boolean(false),core.datetime(-8640000000000000),core.datetime(8640000000000000),core.ref(core.EntityId.make('v:ref')),core.json({decimal:'0.1000000000000000000000001',nested:[0.1,Number.MAX_SAFE_INTEGER,null]}),core.blob('sha256:example','text/plain',Number.MAX_SAFE_INTEGER,'🧪.txt')];
const inputs=values.map((value,i)=>({entityId:core.EntityId.make('verify:offline'),attribute:`:verify/v${i}`,value,validFrom:0,validTo:100,entityType:'Verify'}));
const capture=async(lane,make,encoding)=>{
 const calls=[];let committed=false;
 const client={close:async()=>{},submit:async ss=>{calls.push(ss);committed=true;},update:async s=>{calls.push(s);committed=true;},query:async s=>{
  if(lane==='xtdb')return s.includes('SELECT operation_id')&&committed?[{operation_id:'exists'}]:[];
  return s.includes('SELECT ?attempt')&&committed?[{attempt:{value:'exists'}}]:[];
 }};
 const a=make(client,'verify-offline',encoding===undefined?{}:{commitEncoding:encoding});
 const rows=await Effect.runPromise(a.withTransaction(Effect.gen(function*(){
  const p=yield* a.nextCommitPosition();yield* a.claimCommand('cmd,"\\\nNULL{}𝄞','verify:tx',42);
  const rows=yield* a.batchInsert(inputs,'verify:tx',42,inputs.map((_,i)=>`id:${i}`),p);
  assert.equal(yield* a.retract('id:0',43,'verify:retract',p),true);
  return rows;
 })));
 return {calls:normalize(calls),rows};
};
for(const [lane,current,baseline] of [['xtdb',x.makeXtdbStorageAdapter,bx.makeXtdbStorageAdapter],['qlever',q.makeQleverStorageAdapter,bq.makeQleverStorageAdapter]]){
 const main=await capture(lane,baseline),off=await capture(lane,current),explicit=await capture(lane,current,'a0'),on=await capture(lane,current,'compact');
 assert.equal(main.calls,off.calls);assert.equal(main.calls,explicit.calls);assert.deepEqual(off.rows,on.rows);
 out.cases.push({name:`${lane}: main/default-off/explicit-a0 statement equality`,passed:true,normalizedSha256:hash(main.calls),bytes:Buffer.byteLength(main.calls),valueCases:inputs.length});
 out.cases.push({name:`${lane}: staged compact/a0 rows exact`,passed:true,rows:inputs.length});
}
for(const [i,v] of values.entries()){
 const base={id:`row:${i}`,entity_id:'v:e',attribute:':v/value',...rdf.packValue(v),recorded_at:42,recorded_position:2,valid_from:0,valid_to:100,created_by:'v:actor',retracted_at:null,retracted_position:null,retract_tx_id:null,entity_type:'Verify',schema_version:1,tx_id:'v:tx'};
 for(const row of [base,{...base,retracted_at:50,retracted_position:3,retract_tx_id:'v:retract'}]){
  assert.deepEqual(brdf.rowFields(row),rdf.encodedRowFields(row));
  const compact=new Map(rdf.encodedRowFields(row,'compact'));
  const old=brdf.decodeRow(JSON.parse(new Map(brdf.rowFields(row)).get('_row')));
  assert.deepEqual(rdf.decodeRow(JSON.parse(compact.get('_row'))),old);
  assert.equal(exact(old),exact(row));
 }
}
out.cases.push({name:'QLever persisted channels and _row roundtrip versus main across asserted/retracted shapes',passed:true,rows:values.length*2});
// The public model cannot encode a decimal or erase today. This is a qualification gap, not a new compact regression.
out.observations.push({decimal:'No decimal TripleValue kind; decimal strings and scaled integers tested. No native decimal semantic claim.',erasure:'TransactOp only assert/retract/retract-pattern; no erase operation or ErasedValue kind in this candidate. Markers and physical erasure cannot be verified.'});
fs.writeFileSync('lab/verify/J01/round2/offline.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
